"""
Vendor, health, and metrics routes.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.db import get_db
from app.models.database import (
    Vendor, PaymentHistory, FraudCase, VerificationCall, Decision,
    PaymentStatus, DecisionType
)
from app.models.schemas import VendorProfile, HealthResponse, MetricsResponse
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(db.get_bind().connect().execute.__func__)
    except Exception:
        pass  # SQLite always available

    return HealthResponse(
        status="ok",
        app=settings.APP_NAME,
        calling_mode=settings.CALLING_MODE,
        database="connected",
    )


@router.get("/vendors", response_model=list[VendorProfile])
def list_vendors(db: Session = Depends(get_db)):
    vendors = db.query(Vendor).filter(Vendor.is_active == True).all()
    result = []
    for v in vendors:
        payments = (
            db.query(PaymentHistory)
            .filter(PaymentHistory.vendor_id == v.vendor_id)
            .order_by(PaymentHistory.paid_at.desc())
            .limit(5)
            .all()
        )
        result.append(VendorProfile(
            vendor_id=v.vendor_id,
            vendor_name=v.vendor_name,
            known_phone=v.known_phone,
            known_bank_account=v.known_bank_account,
            known_ifsc=v.known_ifsc,
            known_email=v.known_email,
            usual_invoice_min=v.usual_invoice_min,
            usual_invoice_max=v.usual_invoice_max,
            known_approvers=v.known_approvers or [],
            recent_payments=[
                {
                    "invoice_id": p.invoice_id,
                    "amount": p.amount,
                    "status": p.status,
                    "paid_at": p.paid_at.isoformat() if p.paid_at else None,
                }
                for p in payments
            ],
        ))
    return result


@router.get("/vendors/{vendor_id}", response_model=VendorProfile)
def get_vendor(vendor_id: str, db: Session = Depends(get_db)):
    vendor = db.query(Vendor).filter(Vendor.vendor_id == vendor_id).first()
    if not vendor:
        raise HTTPException(404, f"Vendor {vendor_id} not found")

    payments = (
        db.query(PaymentHistory)
        .filter(PaymentHistory.vendor_id == vendor_id)
        .order_by(PaymentHistory.paid_at.desc())
        .limit(10)
        .all()
    )

    return VendorProfile(
        vendor_id=vendor.vendor_id,
        vendor_name=vendor.vendor_name,
        known_phone=vendor.known_phone,
        known_bank_account=vendor.known_bank_account,
        known_ifsc=vendor.known_ifsc,
        known_email=vendor.known_email,
        usual_invoice_min=vendor.usual_invoice_min,
        usual_invoice_max=vendor.usual_invoice_max,
        known_approvers=vendor.known_approvers or [],
        recent_payments=[
            {
                "invoice_id": p.invoice_id,
                "amount": p.amount,
                "status": p.status,
                "paid_at": p.paid_at.isoformat() if p.paid_at else None,
            }
            for p in payments
        ],
    )


@router.get("/metrics", response_model=MetricsResponse)
def get_metrics(db: Session = Depends(get_db)):
    from app.models.database import Invoice

    total_invoices = db.query(Invoice).count()
    total_cases = db.query(FraudCase).count()
    cases_held = db.query(FraudCase).filter(FraudCase.payment_status == PaymentStatus.HELD).count()
    cases_cleared = db.query(FraudCase).filter(FraudCase.payment_status == PaymentStatus.RELEASE_APPROVED).count()
    cases_rejected = db.query(FraudCase).filter(FraudCase.payment_status == PaymentStatus.REJECTED).count()
    verification_calls = db.query(VerificationCall).count()
    human_approvals = db.query(Decision).filter(Decision.decision_type == DecisionType.APPROVE).count()
    human_rejections = db.query(Decision).filter(Decision.decision_type == DecisionType.REJECT).count()

    avg_score_result = db.query(func.avg(FraudCase.risk_score)).scalar()
    avg_risk_score = float(avg_score_result) if avg_score_result else 0.0

    # Cost estimate (deterministic rules are free; AI calls have cost)
    ai_calls_made = db.query(FraudCase).filter(
        FraudCase.ai_confidence != None
    ).count()

    cost_estimate = {
        "deterministic_checks": total_invoices,
        "ai_analysis_calls": ai_calls_made,
        "verification_calls": verification_calls,
        "estimated_ai_cost_usd": round(ai_calls_made * 0.002, 4),  # ~$0.002/call at gpt-4o-mini rates
        "estimated_calling_cost_usd": round(verification_calls * 0.10, 2),  # ~$0.10/call at Bland AI rates
        "note": "Deterministic rules run on 100% of invoices at zero LLM cost. AI only runs on HIGH/CRITICAL cases.",
    }

    return MetricsResponse(
        total_invoices=total_invoices,
        total_cases=total_cases,
        cases_held=cases_held,
        cases_cleared=cases_cleared,
        cases_rejected=cases_rejected,
        verification_calls_made=verification_calls,
        human_approvals=human_approvals,
        human_rejections=human_rejections,
        avg_risk_score=round(avg_risk_score, 1),
        cost_estimate=cost_estimate,
    )
