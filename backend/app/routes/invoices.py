"""
Invoice batch ingestion and analysis routes.
POST /invoices/batch  — accept CSV or JSON batch
POST /analyze         — run AI analysis on a case
"""
import uuid
import csv
import io
import json
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session

from app.models.db import get_db
from app.models.database import (
    Invoice, Vendor, FraudCase, AuditLog, PaymentHistory,
    RiskLevel, PaymentStatus, AuditEventType
)
from app.models.schemas import BatchResult, InvoiceResult
from app.services.fraud_engine import run_fraud_checks
from app.services.seed_data import INVOICES as DEMO_INVOICES
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

REQUIRED_INVOICE_FIELDS = (
    "invoice_id",
    "vendor_id",
    "amount",
    "bank_account",
    "ifsc",
)


def _validate_invoice_batch(raw_invoices: object) -> list[dict]:
    """Reject non-invoice datasets before they can be screened or persisted."""
    if not isinstance(raw_invoices, list) or not raw_invoices:
        raise HTTPException(400, "Invoice batch must be a non-empty JSON array or CSV with a header row")

    first_row = raw_invoices[0]
    if not isinstance(first_row, dict):
        raise HTTPException(422, "Each invoice must be an object with the required invoice fields")

    missing = [field for field in REQUIRED_INVOICE_FIELDS if field not in first_row]
    if missing:
        required = ", ".join(REQUIRED_INVOICE_FIELDS)
        raise HTTPException(
            422,
            f"Invalid invoice file. Missing required columns: {', '.join(missing)}. "
            f"Required columns: {required}.",
        )

    return raw_invoices


def _invoice_to_result(inv: Invoice, db: Session) -> InvoiceResult:
    vendor = db.query(Vendor).filter(Vendor.vendor_id == inv.vendor_id).first()
    case = db.query(FraudCase).filter(FraudCase.invoice_id == inv.invoice_id).first()
    return InvoiceResult(
        invoice_id=inv.invoice_id,
        vendor_id=inv.vendor_id,
        vendor_name=vendor.vendor_name if vendor else None,
        amount=inv.amount,
        bank_account=inv.bank_account,
        ifsc=inv.ifsc,
        approver=inv.approver,
        description=inv.description,
        timestamp=inv.timestamp,
        risk_score=inv.risk_score,
        risk_level=inv.risk_level.value if inv.risk_level else None,
        payment_status=inv.payment_status.value if inv.payment_status else "PENDING",
        fraud_flags=inv.fraud_flags or [],
        case_id=case.case_id if case else None,
    )


def _process_invoice(invoice_data: dict, batch_id: str, db: Session) -> InvoiceResult:
    """Run deterministic fraud checks on one invoice and persist results."""
    invoice_id = str(invoice_data.get("invoice_id", ""))
    vendor_id = str(invoice_data.get("vendor_id", ""))
    amount = float(invoice_data.get("amount", 0))
    bank_account = str(invoice_data.get("bank_account", ""))
    ifsc = str(invoice_data.get("ifsc", ""))
    approver = invoice_data.get("approver")
    description = invoice_data.get("description")
    timestamp_raw = invoice_data.get("timestamp")

    if isinstance(timestamp_raw, str):
        try:
            timestamp = datetime.fromisoformat(timestamp_raw)
        except Exception:
            timestamp = datetime.utcnow()
    elif isinstance(timestamp_raw, datetime):
        timestamp = timestamp_raw
    else:
        timestamp = datetime.utcnow()

    vendor = db.query(Vendor).filter(Vendor.vendor_id == vendor_id).first()
    known_vendor = vendor is not None

    existing_ids = [r[0] for r in db.query(Invoice.invoice_id).filter(
        Invoice.invoice_id != invoice_id
    ).all()]

    recent_amounts = [
        r[0] for r in db.query(PaymentHistory.amount).filter(
            PaymentHistory.vendor_id == vendor_id
        ).limit(10).all()
    ] if vendor else []

    check_result = run_fraud_checks(
        invoice_id=invoice_id,
        vendor_id=vendor_id,
        amount=amount,
        bank_account=bank_account,
        ifsc=ifsc,
        approver=approver,
        description=description,
        known_vendor=known_vendor,
        known_bank_account=vendor.known_bank_account if vendor else None,
        known_ifsc=vendor.known_ifsc if vendor else None,
        usual_invoice_min=vendor.usual_invoice_min if vendor else 0,
        usual_invoice_max=vendor.usual_invoice_max if vendor else 1_000_000,
        known_approvers=vendor.known_approvers if vendor else [],
        existing_invoice_ids=existing_ids,
        recent_payment_amounts=recent_amounts,
    )

    payment_status = (
        PaymentStatus.HELD if check_result.score >= settings.HOLD_THRESHOLD_SCORE
        else PaymentStatus.CLEARED
    )

    existing_inv = db.query(Invoice).filter(Invoice.invoice_id == invoice_id).first()
    if existing_inv:
        existing_inv.risk_score = check_result.score
        existing_inv.risk_level = check_result.risk_level
        existing_inv.payment_status = payment_status
        existing_inv.fraud_flags = check_result.flags
        existing_inv.batch_id = batch_id
        inv = existing_inv
    else:
        inv = Invoice(
            invoice_id=invoice_id,
            vendor_id=vendor_id,
            amount=amount,
            bank_account=bank_account,
            ifsc=ifsc,
            approver=approver,
            description=description,
            timestamp=timestamp,
            batch_id=batch_id,
            risk_score=check_result.score,
            risk_level=check_result.risk_level,
            payment_status=payment_status,
            fraud_flags=check_result.flags,
        )
        db.add(inv)

    db.flush()

    db.add(AuditLog(
        case_id=None,
        invoice_id=invoice_id,
        event_type=AuditEventType.INVOICE_RECEIVED,
        description=f"Invoice {invoice_id} received in batch {batch_id}",
        event_metadata={"batch_id": batch_id, "vendor_id": vendor_id, "amount": amount},
        occurred_at=timestamp,
    ))

    if payment_status == PaymentStatus.HELD:
        existing_case = db.query(FraudCase).filter(FraudCase.invoice_id == invoice_id).first()
        if not existing_case:
            case_id = f"CASE-{uuid.uuid4().hex[:8].upper()}"
            fraud_case = FraudCase(
                case_id=case_id,
                invoice_id=invoice_id,
                vendor_id=vendor_id,
                risk_score=check_result.score,
                risk_level=check_result.risk_level,
                fraud_flags=check_result.flags,
                ai_reasoning=[],
                ai_confidence=None,
                verification_required=True,
                payment_status=PaymentStatus.HELD,
            )
            db.add(fraud_case)
            db.flush()

            db.add(AuditLog(
                case_id=case_id,
                invoice_id=invoice_id,
                event_type=AuditEventType.PAYMENT_HELD,
                description=f"Payment HELD: risk score {check_result.score} ({check_result.risk_level.value})",
                event_metadata={"flags": check_result.flags, "risk_score": check_result.score},
            ))
        else:
            existing_case.risk_score = check_result.score
            existing_case.risk_level = check_result.risk_level
            existing_case.fraud_flags = check_result.flags
    else:
        db.add(AuditLog(
            case_id=None,
            invoice_id=invoice_id,
            event_type=AuditEventType.PAYMENT_CLEARED,
            description=f"Invoice {invoice_id} cleared: score {check_result.score} ({check_result.risk_level.value})",
            event_metadata={"risk_score": check_result.score},
        ))

    return _invoice_to_result(inv, db)


@router.post("/invoices/batch", response_model=BatchResult)
async def ingest_batch(
    file: Optional[UploadFile] = File(None),
    invoices_json: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    """
    Accept a batch of invoices as CSV or JSON.
    Returns computed batch statistics — nothing hardcoded.
    """
    batch_id = f"BATCH-{uuid.uuid4().hex[:8].upper()}"
    raw_invoices = []

    if file and file.filename:
        content = await file.read()
        if file.filename.endswith(".csv"):
            reader = csv.DictReader(io.StringIO(content.decode("utf-8")))
            raw_invoices = list(reader)
        elif file.filename.endswith(".json"):
            raw_invoices = json.loads(content)
        else:
            raise HTTPException(400, "Only .csv or .json files are supported")
    elif invoices_json:
        raw_invoices = json.loads(invoices_json)
    else:
        # Use demo data if no file provided
        raw_invoices = [
            {k: str(v) if not isinstance(v, (int, float, datetime)) else v
             for k, v in inv.items()}
            for inv in DEMO_INVOICES
        ]

    raw_invoices = _validate_invoice_batch(raw_invoices)

    results = []
    for inv_data in raw_invoices:
        try:
            result = _process_invoice(inv_data, batch_id, db)
            results.append(result)
        except Exception as e:
            logger.error(f"Error processing invoice {inv_data.get('invoice_id', '?')}: {e}")
            continue

    db.commit()

    low = sum(1 for r in results if r.risk_level == "LOW")
    medium = sum(1 for r in results if r.risk_level == "MEDIUM")
    high = sum(1 for r in results if r.risk_level == "HIGH")
    critical = sum(1 for r in results if r.risk_level == "CRITICAL")
    held = sum(1 for r in results if r.payment_status == "HELD")
    cleared = sum(1 for r in results if r.payment_status == "CLEARED")
    ver_required = sum(1 for r in results if r.risk_level in ("HIGH", "CRITICAL"))

    return BatchResult(
        batch_id=batch_id,
        total=len(raw_invoices),
        processed=len(results),
        low_risk=low,
        medium_risk=medium,
        high_risk=high,
        critical=critical,
        held=held,
        cleared=cleared,
        verification_required=ver_required,
        verification_completed=0,
        human_review_required=held,
        invoices=results,
    )


@router.post("/analyze")
async def analyze_case(
    case_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Trigger AI analysis on a HIGH/CRITICAL fraud case (cost control)."""
    case = db.query(FraudCase).filter(FraudCase.case_id == case_id).first()
    if not case:
        raise HTTPException(404, f"Case {case_id} not found")

    if case.risk_level not in (RiskLevel.HIGH, RiskLevel.CRITICAL):
        return {
            "message": f"Case {case_id} has {case.risk_level.value} risk — AI analysis not required",
            "case_id": case_id,
        }

    background_tasks.add_task(_run_ai_analysis, case_id, db)
    return {"message": "AI analysis queued", "case_id": case_id}


async def _run_ai_analysis(case_id: str, db: Session):
    """Background task: run AI fraud analysis pipeline."""
    from app.services.rocketride_service import run_fraud_analysis

    case = db.query(FraudCase).filter(FraudCase.case_id == case_id).first()
    if not case:
        return

    invoice = db.query(Invoice).filter(Invoice.invoice_id == case.invoice_id).first()
    case_data = {
        "invoice_id": case.invoice_id,
        "vendor_id": case.vendor_id,
        "amount": invoice.amount if invoice else 0,
        "risk_score": case.risk_score,
        "risk_level": case.risk_level.value,
        "fraud_flags": case.fraud_flags or [],
        "description": invoice.description if invoice else "",
        "bank_account": invoice.bank_account if invoice else "",
    }

    try:
        result = await run_fraud_analysis(case_data)
        case.ai_reasoning = result.reasoning
        case.ai_confidence = result.confidence
        case.verification_required = result.verification_required
        case.updated_at = datetime.utcnow()

        db.add(AuditLog(
            case_id=case_id,
            invoice_id=case.invoice_id,
            event_type=AuditEventType.AI_ANALYSIS_COMPLETED,
            description=f"AI analysis: {result.risk_level}, confidence {result.confidence:.0%}",
            event_metadata={"reasoning": result.reasoning, "confidence": result.confidence},
        ))
        db.commit()
    except Exception as e:
        logger.error(f"AI analysis failed for case {case_id}: {e}")
        db.add(AuditLog(
            case_id=case_id,
            invoice_id=case.invoice_id,
            event_type=AuditEventType.ERROR,
            description=f"AI analysis failed: {str(e)}",
            event_metadata={"error": str(e)},
        ))
        db.commit()
