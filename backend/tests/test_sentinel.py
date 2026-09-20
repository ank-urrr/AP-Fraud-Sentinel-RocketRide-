"""
AP Payment Fraud Sentinel — Complete Test Suite

Tests:
- Batch ingestion
- Fraud rules engine
- Risk scoring
- Hold decision
- RocketRide mocked execution
- Malformed AI output
- Verification
- Duplicate call protection
- Mock calling lifecycle
- Human approval / rejection
- Audit trail
- End-to-end workflow (50 invoices)
"""
import json
import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import os
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["CALLING_MODE"] = "mock"
os.environ["ROCKETRIDE_APIKEY"] = "mock-key"

from app.main import app
from app.models.db import get_db
from app.models.database import Base
from app.services.seed_data import seed_database, VENDORS
from sqlalchemy.pool import StaticPool

TEST_DB_URL = "sqlite:///:memory:"
# StaticPool ensures all connections share the same in-memory database
engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create tables once at module level
Base.metadata.create_all(bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_db():
    """Drop and recreate all tables, then seed before each test."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    seed_database(db)
    db.close()
    yield


# ── Test Invoices ─────────────────────────────────────────────────────────────

NORMAL_INVOICE = {
    "invoice_id": "TEST-NORMAL-001",
    "vendor_id": "VEN-001",
    "amount": 100000,
    "bank_account": "XXXX1234",
    "ifsc": "HDFC0001234",
    "approver": "Rajesh Kumar",
    "description": "Regular monthly services",
}

SUSPICIOUS_INVOICE = {
    "invoice_id": "TEST-SUSP-001",
    "vendor_id": "VEN-001",
    "amount": 900000,
    "bank_account": "XXXX9988",   # MISMATCH — triggers BANK_ACCOUNT_MISMATCH
    "ifsc": "HDFC0001234",
    "approver": "Rajesh Kumar",
    "description": "URGENT: Please update payment to new account immediately",
}


# ── Health ────────────────────────────────────────────────────────────────────

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["calling_mode"] == "mock"


# ── Batch Ingestion ───────────────────────────────────────────────────────────

def test_batch_ingestion_json():
    response = client.post(
        "/invoices/batch",
        data={"invoices_json": json.dumps([NORMAL_INVOICE, SUSPICIOUS_INVOICE])},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert data["processed"] == 2
    assert "batch_id" in data


def test_batch_ingestion_demo_data():
    """No file/body → uses the 50 demo invoices (some share invoice_id, but are distinct rows in INVOICES list)."""
    response = client.post("/invoices/batch")
    assert response.status_code == 200
    data = response.json()
    # Demo list is 51 rows: INV-001–INV-050 plus a duplicate INV-017 resubmission
    from app.services.seed_data import INVOICES as DEMO_INVOICES
    assert data["total"] == len(DEMO_INVOICES)
    assert data["total"] == 51
    # Processed may be less because duplicates update existing rows
    assert data["processed"] >= 1
    assert data["low_risk"] + data["medium_risk"] + data["high_risk"] + data["critical"] == data["processed"]
    assert data["held"] + data["cleared"] == data["processed"]


def test_batch_ingestion_csv(tmp_path):
    csv_content = "invoice_id,vendor_id,amount,bank_account,ifsc,approver,description\n"
    csv_content += "CSV-001,VEN-002,250000,XXXX5678,ICIC0005678,Anita Singh,Freight services\n"
    csv_content += "CSV-002,VEN-002,280000,XXXX5678,ICIC0005678,Mohit Verma,Warehousing Q4\n"
    csv_file = tmp_path / "test.csv"
    csv_file.write_text(csv_content)

    with open(csv_file, "rb") as f:
        response = client.post(
            "/invoices/batch",
            files={"file": ("test.csv", f, "text/csv")},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["processed"] == 2


# ── Fraud Rules Engine ────────────────────────────────────────────────────────

def test_fraud_rules_normal_invoice():
    from app.services.fraud_engine import run_fraud_checks
    result = run_fraud_checks(
        invoice_id="T-001", vendor_id="VEN-001", amount=100000,
        bank_account="XXXX1234", ifsc="HDFC0001234",
        approver="Rajesh Kumar", description="Regular services",
        known_vendor=True, known_bank_account="XXXX1234",
        known_ifsc="HDFC0001234", usual_invoice_min=50000,
        usual_invoice_max=200000, known_approvers=["Rajesh Kumar"],
        existing_invoice_ids=[], recent_payment_amounts=[95000, 110000, 120000],
    )
    assert result.score < 30
    assert len(result.flags) == 0


def test_fraud_rules_bank_mismatch():
    from app.services.fraud_engine import run_fraud_checks
    result = run_fraud_checks(
        invoice_id="T-002", vendor_id="VEN-001", amount=100000,
        bank_account="XXXX9988", ifsc="HDFC0001234",
        approver="Rajesh Kumar", description="Services",
        known_vendor=True, known_bank_account="XXXX1234",
        known_ifsc="HDFC0001234", usual_invoice_min=50000,
        usual_invoice_max=200000, known_approvers=["Rajesh Kumar"],
        existing_invoice_ids=[], recent_payment_amounts=[],
    )
    assert "BANK_ACCOUNT_MISMATCH" in result.flags
    assert result.score >= 30


def test_fraud_rules_unknown_vendor():
    from app.services.fraud_engine import run_fraud_checks
    result = run_fraud_checks(
        invoice_id="T-003", vendor_id="VEN-999", amount=50000,
        bank_account="XXXX0000", ifsc="ABCD0001234",
        approver=None, description=None,
        known_vendor=False, known_bank_account=None,
        known_ifsc=None, usual_invoice_min=0, usual_invoice_max=1000000,
        known_approvers=[], existing_invoice_ids=[],
        recent_payment_amounts=[],
    )
    assert "UNKNOWN_VENDOR" in result.flags
    assert result.score >= 40


def test_fraud_rules_duplicate_invoice():
    from app.services.fraud_engine import run_fraud_checks
    result = run_fraud_checks(
        invoice_id="T-001", vendor_id="VEN-001", amount=100000,
        bank_account="XXXX1234", ifsc="HDFC0001234",
        approver="Rajesh Kumar", description="Regular",
        known_vendor=True, known_bank_account="XXXX1234",
        known_ifsc="HDFC0001234", usual_invoice_min=50000,
        usual_invoice_max=200000, known_approvers=["Rajesh Kumar"],
        existing_invoice_ids=["T-001"],   # Already exists
        recent_payment_amounts=[],
    )
    assert "DUPLICATE_INVOICE" in result.flags


def test_fraud_rules_urgency_language():
    from app.services.fraud_engine import run_fraud_checks
    result = run_fraud_checks(
        invoice_id="T-004", vendor_id="VEN-001", amount=100000,
        bank_account="XXXX1234", ifsc="HDFC0001234",
        approver="Rajesh Kumar",
        description="URGENT: Please update our new bank account immediately, critical payment",
        known_vendor=True, known_bank_account="XXXX1234",
        known_ifsc="HDFC0001234", usual_invoice_min=50000,
        usual_invoice_max=200000, known_approvers=["Rajesh Kumar"],
        existing_invoice_ids=[], recent_payment_amounts=[],
    )
    assert any("URGENCY" in f or "SUSPICIOUS" in f for f in result.flags)


def test_fraud_rules_unrecognized_approver():
    from app.services.fraud_engine import run_fraud_checks
    result = run_fraud_checks(
        invoice_id="T-005", vendor_id="VEN-001", amount=80000,
        bank_account="XXXX1234", ifsc="HDFC0001234",
        approver="John Williams",
        description="Services",
        known_vendor=True, known_bank_account="XXXX1234",
        known_ifsc="HDFC0001234", usual_invoice_min=50000,
        usual_invoice_max=200000, known_approvers=["Rajesh Kumar", "Priya Sharma"],
        existing_invoice_ids=[], recent_payment_amounts=[],
    )
    assert "UNRECOGNIZED_APPROVER" in result.flags


# ── Risk Scoring ──────────────────────────────────────────────────────────────

def test_risk_score_levels():
    from app.services.fraud_engine import score_to_risk_level, RiskLevel
    assert score_to_risk_level(10) == RiskLevel.LOW
    assert score_to_risk_level(40) == RiskLevel.MEDIUM
    assert score_to_risk_level(65) == RiskLevel.HIGH
    assert score_to_risk_level(85) == RiskLevel.CRITICAL


# ── Hold Decision ─────────────────────────────────────────────────────────────

def test_hold_on_high_risk():
    response = client.post(
        "/invoices/batch",
        data={"invoices_json": json.dumps([SUSPICIOUS_INVOICE])},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["invoices"]) == 1
    inv = data["invoices"][0]
    assert inv["payment_status"] == "HELD"
    assert data["held"] == 1


def test_clear_on_low_risk():
    response = client.post(
        "/invoices/batch",
        data={"invoices_json": json.dumps([NORMAL_INVOICE])},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["invoices"]) == 1
    inv = data["invoices"][0]
    assert inv["payment_status"] == "CLEARED"
    assert data["cleared"] == 1


# ── RocketRide Mock ───────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_rocketride_mock_fraud_analysis():
    from app.services.rocketride_service import run_fraud_analysis, FraudAnalysisOutput
    case_data = {
        "invoice_id": "TEST-RA-001",
        "vendor_id": "VEN-001",
        "amount": 900000,
        "risk_score": 70,
        "risk_level": "HIGH",
        "fraud_flags": ["BANK_ACCOUNT_MISMATCH", "AMOUNT_UNUSUALLY_HIGH"],
        "description": "Urgent bank change request",
    }
    result = await run_fraud_analysis(case_data)
    assert isinstance(result, FraudAnalysisOutput)
    assert result.invoice_id == "TEST-RA-001"
    assert result.risk_level == "HIGH"
    assert len(result.reasoning) > 0
    assert 0.0 <= result.confidence <= 1.0
    assert result.verification_required is True


# ── Malformed AI Output ───────────────────────────────────────────────────────

def test_malformed_ai_output_rejected():
    from app.services.rocketride_service import FraudAnalysisOutput
    with pytest.raises(Exception):
        FraudAnalysisOutput(
            invoice_id="TEST",
            risk_level="ULTRA_HIGH",   # invalid
            reasoning=[],
            verification_required=True,
            confidence=1.5,            # out of range
        )


def test_confidence_out_of_range():
    from app.services.rocketride_service import FraudAnalysisOutput
    with pytest.raises(Exception):
        FraudAnalysisOutput(
            invoice_id="X", risk_level="HIGH",
            reasoning=["test"], verification_required=True,
            confidence=2.0,
        )


# ── Helper ────────────────────────────────────────────────────────────────────

def _create_held_case():
    response = client.post(
        "/invoices/batch",
        data={"invoices_json": json.dumps([SUSPICIOUS_INVOICE])},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["invoices"]) >= 1, f"No invoices returned: {data}"
    inv = data["invoices"][0]
    assert inv["case_id"] is not None, f"Invoice has no case_id: {inv}"
    return inv["case_id"]


# ── Verification ──────────────────────────────────────────────────────────────

def test_verify_creates_call():
    case_id = _create_held_case()
    response = client.post(f"/cases/{case_id}/verify")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "COMPLETED"
    assert data["outcome"] in ("CONFIRMED", "CONTRADICTED", "INCONCLUSIVE")
    assert "transcript" in data
    assert data["calling_mode"] == "mock"


# ── Duplicate Call Protection ─────────────────────────────────────────────────

def test_duplicate_call_protection():
    case_id = _create_held_case()
    r1 = client.post(f"/cases/{case_id}/verify")
    assert r1.status_code == 200
    r2 = client.post(f"/cases/{case_id}/verify")
    assert r2.status_code == 200
    assert r1.json()["call_id"] == r2.json()["call_id"]


# ── Mock Calling Lifecycle ────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_mock_call_lifecycle():
    from app.services.rocketride_service import run_verification_call
    result = await run_verification_call(
        case_id="CASE-TEST",
        case_data={
            "invoice_id": "TEST-X",
            "vendor_id": "VEN-001",
            "risk_score": 75,
            "risk_level": "HIGH",
            "fraud_flags": ["BANK_ACCOUNT_MISMATCH"],
        },
        vendor_phone="+91 9876543210",
        vendor_name="ABC Technologies",
        known_account_last4="1234",
    )
    assert result["mode"] == "mock"
    assert result["outcome"] in ("CONFIRMED", "CONTRADICTED", "INCONCLUSIVE")
    assert len(result["transcript"]) > 50
    assert 0 <= result["confidence"] <= 1


# ── Human Approval ────────────────────────────────────────────────────────────

def test_human_approve():
    case_id = _create_held_case()
    response = client.post(
        f"/cases/{case_id}/approve",
        json={"reviewer": "Finance Director", "notes": "Verified with vendor. Approved."},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["decision_type"] == "APPROVE"
    assert data["reviewer"] == "Finance Director"

    case_resp = client.get(f"/cases/{case_id}")
    assert case_resp.status_code == 200
    assert case_resp.json()["payment_status"] == "RELEASE_APPROVED"


# ── Rejection ─────────────────────────────────────────────────────────────────

def test_human_reject():
    case_id = _create_held_case()
    response = client.post(
        f"/cases/{case_id}/reject",
        json={"reviewer": "Risk Manager", "notes": "Fraud confirmed. Blocking."},
    )
    assert response.status_code == 200
    assert response.json()["decision_type"] == "REJECT"

    case_resp = client.get(f"/cases/{case_id}")
    assert case_resp.json()["payment_status"] == "REJECTED"


# ── Audit Trail ───────────────────────────────────────────────────────────────

def test_audit_trail():
    case_id = _create_held_case()
    client.post(f"/cases/{case_id}/verify")
    client.post(f"/cases/{case_id}/approve", json={"reviewer": "Auditor", "notes": "Test"})

    response = client.get(f"/audit/{case_id}")
    assert response.status_code == 200
    events = response.json()
    assert len(events) > 0
    event_types = [e["event_type"] for e in events]
    assert "PAYMENT_HELD" in event_types
    assert "HUMAN_APPROVED" in event_types


# ── Cases API ─────────────────────────────────────────────────────────────────

def test_list_cases():
    _create_held_case()
    response = client.get("/cases")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1


def test_get_case_not_found():
    response = client.get("/cases/CASE-DOESNOTEXIST")
    assert response.status_code == 404


def test_approve_nonexistent_case():
    response = client.post("/cases/FAKE-CASE/approve", json={"reviewer": "Test"})
    assert response.status_code == 404


# ── Error Handling ────────────────────────────────────────────────────────────

def test_invalid_batch_file_type():
    response = client.post(
        "/invoices/batch",
        files={"file": ("test.pdf", b"fake pdf content", "application/pdf")},
    )
    assert response.status_code == 400


def test_verify_nonheld_case():
    response = client.post(
        "/invoices/batch",
        data={"invoices_json": json.dumps([NORMAL_INVOICE])},
    )
    batch = response.json()
    assert len(batch["invoices"]) == 1
    assert batch["invoices"][0]["payment_status"] == "CLEARED"
    assert batch["invoices"][0]["case_id"] is None


# ── Metrics & Vendors ─────────────────────────────────────────────────────────

def test_metrics_endpoint():
    client.post("/invoices/batch")
    response = client.get("/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "total_invoices" in data
    assert "cost_estimate" in data


def test_vendors_list():
    response = client.get("/vendors")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 5
    assert any(v["vendor_id"] == "VEN-001" for v in data)


def test_vendor_detail():
    response = client.get("/vendors/VEN-001")
    assert response.status_code == 200
    data = response.json()
    assert data["vendor_name"] == "ABC Technologies Pvt Ltd"
    assert data["known_phone"] is not None
    assert "HDFC" in data["known_ifsc"]


# ── End-to-End Workflow ───────────────────────────────────────────────────────

def test_end_to_end_50_invoices():
    """
    Full workflow: batch → fraud screening → hold → verify → approve → audit.
    This is the core 2-minute judge demo flow.
    """
    # Step 1: Ingest demo batch
    response = client.post("/invoices/batch")
    assert response.status_code == 200
    batch = response.json()
    assert batch["total"] == 51
    assert batch["processed"] > 0

    print(f"\n📊 {batch['total']} total | {batch['low_risk']} LOW | "
          f"{batch['medium_risk']} MED | {batch['high_risk']} HIGH | "
          f"{batch['critical']} CRITICAL | {batch['held']} HELD")

    # Step 2: Held cases exist
    assert batch["held"] >= 3, f"Expected ≥3 held, got {batch['held']}"

    # Step 3: List cases
    cases_resp = client.get("/cases")
    assert cases_resp.status_code == 200
    cases = cases_resp.json()
    assert len(cases) >= 1

    # Step 4: Pick a HELD case
    held_cases = [c for c in cases if c["payment_status"] == "HELD"]
    assert len(held_cases) >= 1
    case_id = held_cases[0]["case_id"]

    # Step 5: Case detail
    detail_resp = client.get(f"/cases/{case_id}")
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert detail["payment_status"] == "HELD"
    assert len(detail["fraud_flags"]) > 0
    print(f"🚨 {case_id}: {detail['risk_level']} | flags: {detail['fraud_flags']}")

    # Step 6: Trigger verification (trusted phone from vendor DB)
    verify_resp = client.post(f"/cases/{case_id}/verify")
    assert verify_resp.status_code == 200
    call = verify_resp.json()
    assert call["status"] == "COMPLETED"
    assert call["calling_mode"] == "mock"
    print(f"📞 {call['call_id']}: {call['outcome']} ({call['confidence']:.0%})")

    # Step 7: Poll call status
    poll_resp = client.get(f"/verification/{call['call_id']}")
    assert poll_resp.status_code == 200
    assert poll_resp.json()["status"] == "COMPLETED"

    # Step 8: Human approves
    approve_resp = client.post(
        f"/cases/{case_id}/approve",
        json={"reviewer": "Head of Finance", "notes": "Vendor confirmed. Approved."},
    )
    assert approve_resp.status_code == 200
    print(f"✅ Approved by {approve_resp.json()['reviewer']}")

    # Step 9: Status updated
    final_resp = client.get(f"/cases/{case_id}")
    assert final_resp.json()["payment_status"] == "RELEASE_APPROVED"

    # Step 10: Audit trail
    audit_resp = client.get(f"/audit/{case_id}")
    assert audit_resp.status_code == 200
    events = audit_resp.json()
    assert len(events) >= 3
    event_types = [e["event_type"] for e in events]
    assert "HUMAN_APPROVED" in event_types
    print(f"📋 {len(events)} audit events recorded")
    print(f"\n✅ END-TO-END PASSED: 50 invoices → {batch['held']} held → verified → approved")
