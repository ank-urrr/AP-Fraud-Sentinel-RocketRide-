"""
Fraud cases routes.
GET  /cases            — list all cases
GET  /cases/{id}       — case detail
POST /cases/{id}/verify
POST /cases/{id}/approve
POST /cases/{id}/reject
GET  /audit/{id}       — audit trail
GET  /verification/{call_id}
"""
import uuid
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.models.db import get_db
from app.models.database import (
    FraudCase, Invoice, Vendor, VerificationCall, Decision, AuditLog,
    RiskLevel, PaymentStatus, VerificationStatus, VerificationOutcome,
    DecisionType, AuditEventType
)
from app.models.schemas import (
    FraudCaseSummary, FraudCaseDetail, VerificationCallDetail,
    DecisionDetail, ApproveRequest, RejectRequest, AuditEvent
)
from app.services.rocketride_service import run_verification_call
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


def _build_case_summary(case: FraudCase, db: Session) -> FraudCaseSummary:
    invoice = db.query(Invoice).filter(Invoice.invoice_id == case.invoice_id).first()
    vendor = db.query(Vendor).filter(Vendor.vendor_id == case.vendor_id).first()
    return FraudCaseSummary(
        case_id=case.case_id,
        invoice_id=case.invoice_id,
        vendor_id=case.vendor_id,
        vendor_name=vendor.vendor_name if vendor else None,
        amount=invoice.amount if invoice else 0,
        risk_score=case.risk_score,
        risk_level=case.risk_level.value,
        payment_status=case.payment_status.value,
        verification_required=case.verification_required,
        ai_confidence=case.ai_confidence,
        created_at=case.created_at,
        updated_at=case.updated_at,
    )


def _build_case_detail(case: FraudCase, db: Session) -> FraudCaseDetail:
    invoice = db.query(Invoice).filter(Invoice.invoice_id == case.invoice_id).first()
    vendor = db.query(Vendor).filter(Vendor.vendor_id == case.vendor_id).first()

    vcall = (
        db.query(VerificationCall)
        .filter(VerificationCall.case_id == case.case_id)
        .order_by(VerificationCall.started_at.desc())
        .first()
    )
    vcall_detail = None
    if vcall:
        vcall_detail = VerificationCallDetail(
            call_id=vcall.call_id,
            case_id=vcall.case_id,
            phone_number=vcall.phone_number,
            calling_mode=vcall.calling_mode,
            status=vcall.status.value,
            outcome=vcall.outcome.value if vcall.outcome else None,
            transcript=vcall.transcript,
            ai_summary=vcall.ai_summary,
            confidence=vcall.confidence,
            started_at=vcall.started_at,
            completed_at=vcall.completed_at,
            error_message=vcall.error_message,
        )

    decision = (
        db.query(Decision)
        .filter(Decision.case_id == case.case_id)
        .order_by(Decision.decided_at.desc())
        .first()
    )
    decision_detail = None
    if decision:
        decision_detail = DecisionDetail(
            decision_id=decision.decision_id,
            case_id=decision.case_id,
            decision_type=decision.decision_type.value,
            reviewer=decision.reviewer,
            notes=decision.notes,
            decided_at=decision.decided_at,
        )

    return FraudCaseDetail(
        case_id=case.case_id,
        invoice_id=case.invoice_id,
        vendor_id=case.vendor_id,
        vendor_name=vendor.vendor_name if vendor else None,
        amount=invoice.amount if invoice else 0,
        risk_score=case.risk_score,
        risk_level=case.risk_level.value,
        payment_status=case.payment_status.value,
        verification_required=case.verification_required,
        ai_confidence=case.ai_confidence,
        created_at=case.created_at,
        updated_at=case.updated_at,
        fraud_flags=case.fraud_flags or [],
        ai_reasoning=case.ai_reasoning or [],
        bank_account=invoice.bank_account if invoice else "",
        ifsc=invoice.ifsc if invoice else "",
        approver=invoice.approver if invoice else None,
        description=invoice.description if invoice else None,
        verification_call=vcall_detail,
        latest_decision=decision_detail,
    )


@router.get("/cases", response_model=list[FraudCaseSummary])
def list_cases(
    status: str = None,
    risk_level: str = None,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    query = db.query(FraudCase).order_by(FraudCase.created_at.desc())

    if status:
        try:
            ps = PaymentStatus(status.upper())
            query = query.filter(FraudCase.payment_status == ps)
        except ValueError:
            raise HTTPException(400, f"Invalid status: {status}")

    if risk_level:
        try:
            rl = RiskLevel(risk_level.upper())
            query = query.filter(FraudCase.risk_level == rl)
        except ValueError:
            raise HTTPException(400, f"Invalid risk_level: {risk_level}")

    cases = query.limit(limit).all()
    return [_build_case_summary(c, db) for c in cases]


@router.get("/cases/{case_id}", response_model=FraudCaseDetail)
def get_case(case_id: str, db: Session = Depends(get_db)):
    case = db.query(FraudCase).filter(FraudCase.case_id == case_id).first()
    if not case:
        raise HTTPException(404, f"Case {case_id} not found")
    return _build_case_detail(case, db)


@router.post("/cases/{case_id}/verify", response_model=VerificationCallDetail)
async def verify_vendor(case_id: str, db: Session = Depends(get_db)):
    """
    Trigger out-of-band vendor verification call.
    Phone number ALWAYS comes from vendor DB — never from the suspicious invoice.
    Duplicate call protection: returns the existing call if one is already in progress or completed.
    """
    case = db.query(FraudCase).filter(FraudCase.case_id == case_id).first()
    if not case:
        raise HTTPException(404, f"Case {case_id} not found")

    if case.payment_status not in (PaymentStatus.HELD,):
        raise HTTPException(400, f"Case {case_id} is not in HELD status — verification not applicable")

    # ── Duplicate call protection ─────────────────────────────────────────────
    active_call = (
        db.query(VerificationCall)
        .filter(
            VerificationCall.case_id == case_id,
            VerificationCall.status.in_([
                VerificationStatus.QUEUED,
                VerificationStatus.CALLING,
                VerificationStatus.CONNECTED,
                VerificationStatus.COMPLETED,
            ])
        )
        .first()
    )
    if active_call:
        logger.info(f"Duplicate call blocked for case {case_id} — returning existing call {active_call.call_id}")
        return VerificationCallDetail(
            call_id=active_call.call_id,
            case_id=active_call.case_id,
            phone_number=active_call.phone_number,
            calling_mode=active_call.calling_mode,
            status=active_call.status.value,
            outcome=active_call.outcome.value if active_call.outcome else None,
            transcript=active_call.transcript,
            ai_summary=active_call.ai_summary,
            confidence=active_call.confidence,
            started_at=active_call.started_at,
            completed_at=active_call.completed_at,
            error_message=active_call.error_message,
        )

    # ── Get vendor trusted phone — never from suspicious invoice ─────────────
    vendor = db.query(Vendor).filter(Vendor.vendor_id == case.vendor_id).first()
    if not vendor:
        raise HTTPException(404, f"Vendor {case.vendor_id} not found")

    if not vendor.known_phone:
        db.add(AuditLog(
            case_id=case_id,
            invoice_id=case.invoice_id,
            event_type=AuditEventType.ERROR,
            description=f"Verification failed: no trusted phone number on record for vendor {case.vendor_id}",
            event_metadata={"error_code": "MISSING_PHONE"},
        ))
        db.commit()
        raise HTTPException(
            422,
            detail={
                "error": "Missing trusted phone number",
                "code": "MISSING_PHONE",
                "detail": f"Vendor {vendor.vendor_name} has no verified phone number on record.",
            }
        )

    invoice = db.query(Invoice).filter(Invoice.invoice_id == case.invoice_id).first()

    # Create pending call record
    call_id_placeholder = f"call-{uuid.uuid4().hex[:8]}"
    vcall = VerificationCall(
        call_id=call_id_placeholder,
        case_id=case_id,
        phone_number=vendor.known_phone,  # TRUSTED PHONE — from vendor DB only
        calling_mode=settings.CALLING_MODE,
        status=VerificationStatus.QUEUED,
    )
    db.add(vcall)

    db.add(AuditLog(
        case_id=case_id,
        invoice_id=case.invoice_id,
        event_type=AuditEventType.VERIFICATION_STARTED,
        description=f"Verification call initiated to trusted number for {vendor.vendor_name}",
        event_metadata={"phone_masked": vendor.known_phone[:3] + "****", "mode": settings.CALLING_MODE},
    ))
    db.commit()

    vcall.status = VerificationStatus.CALLING
    db.commit()

    case_data = {
        "invoice_id": case.invoice_id,
        "vendor_id": case.vendor_id,
        "risk_score": case.risk_score,
        "risk_level": case.risk_level.value,
        "fraud_flags": case.fraud_flags or [],
    }

    known_account_last4 = vendor.known_bank_account[-4:] if vendor.known_bank_account else "XXXX"

    try:
        vcall.status = VerificationStatus.CONNECTED
        db.commit()

        call_result = await run_verification_call(
            case_id=case_id,
            case_data=case_data,
            vendor_phone=vendor.known_phone,
            vendor_name=vendor.vendor_name,
            known_account_last4=known_account_last4,
        )

        vcall.call_id = call_result["call_id"]
        vcall.status = VerificationStatus.COMPLETED
        vcall.outcome = VerificationOutcome(call_result["outcome"])
        vcall.transcript = call_result["transcript"]
        vcall.ai_summary = call_result["summary"]
        vcall.confidence = call_result["confidence"]
        vcall.completed_at = datetime.utcnow()

        db.add(AuditLog(
            case_id=case_id,
            invoice_id=case.invoice_id,
            event_type=AuditEventType.VERIFICATION_COMPLETED,
            description=f"Verification call completed: {call_result['outcome']} (confidence: {call_result['confidence']:.0%})",
            event_metadata={
                "outcome": call_result["outcome"],
                "confidence": call_result["confidence"],
                "mode": call_result["mode"],
            },
        ))
        db.commit()

        return VerificationCallDetail(
            call_id=vcall.call_id,
            case_id=vcall.case_id,
            phone_number=vcall.phone_number,
            calling_mode=vcall.calling_mode,
            status=vcall.status.value,
            outcome=vcall.outcome.value if vcall.outcome else None,
            transcript=vcall.transcript,
            ai_summary=vcall.ai_summary,
            confidence=vcall.confidence,
            started_at=vcall.started_at,
            completed_at=vcall.completed_at,
            error_message=vcall.error_message,
        )

    except Exception as e:
        logger.error(f"Verification call failed for case {case_id}: {e}")
        vcall.status = VerificationStatus.FAILED
        vcall.error_message = str(e)
        vcall.completed_at = datetime.utcnow()

        db.add(AuditLog(
            case_id=case_id,
            invoice_id=case.invoice_id,
            event_type=AuditEventType.VERIFICATION_FAILED,
            description=f"Verification call failed: {str(e)}",
            event_metadata={"error": str(e), "error_code": "CALL_FAILED"},
        ))
        db.commit()

        raise HTTPException(
            502,
            detail={
                "error": "Verification call failed",
                "code": "CALL_FAILED",
                "detail": str(e),
            }
        )


@router.get("/verification/{call_id}", response_model=VerificationCallDetail)
def get_verification(call_id: str, db: Session = Depends(get_db)):
    """Poll verification call status."""
    call = db.query(VerificationCall).filter(VerificationCall.call_id == call_id).first()
    if not call:
        raise HTTPException(404, f"Call {call_id} not found")

    return VerificationCallDetail(
        call_id=call.call_id,
        case_id=call.case_id,
        phone_number=call.phone_number,
        calling_mode=call.calling_mode,
        status=call.status.value,
        outcome=call.outcome.value if call.outcome else None,
        transcript=call.transcript,
        ai_summary=call.ai_summary,
        confidence=call.confidence,
        started_at=call.started_at,
        completed_at=call.completed_at,
        error_message=call.error_message,
    )


@router.post("/cases/{case_id}/approve", response_model=DecisionDetail)
def approve_case(
    case_id: str,
    body: ApproveRequest,
    db: Session = Depends(get_db),
):
    """Human approval gate — ONLY humans can release held payments."""
    case = db.query(FraudCase).filter(FraudCase.case_id == case_id).first()
    if not case:
        raise HTTPException(404, f"Case {case_id} not found")

    if case.payment_status == PaymentStatus.RELEASE_APPROVED:
        raise HTTPException(400, f"Case {case_id} is already approved")
    if case.payment_status == PaymentStatus.REJECTED:
        raise HTTPException(400, f"Case {case_id} is already rejected")

    case.payment_status = PaymentStatus.RELEASE_APPROVED
    case.updated_at = datetime.utcnow()

    invoice = db.query(Invoice).filter(Invoice.invoice_id == case.invoice_id).first()
    if invoice:
        invoice.payment_status = PaymentStatus.RELEASE_APPROVED

    decision_id = f"DEC-{uuid.uuid4().hex[:8].upper()}"
    decision = Decision(
        decision_id=decision_id,
        case_id=case_id,
        decision_type=DecisionType.APPROVE,
        reviewer=body.reviewer,
        notes=body.notes,
    )
    db.add(decision)

    db.add(AuditLog(
        case_id=case_id,
        invoice_id=case.invoice_id,
        event_type=AuditEventType.HUMAN_APPROVED,
        description=f"Payment APPROVED by {body.reviewer}",
        event_metadata={"reviewer": body.reviewer, "notes": body.notes},
    ))
    db.commit()

    return DecisionDetail(
        decision_id=decision.decision_id,
        case_id=decision.case_id,
        decision_type=decision.decision_type.value,
        reviewer=decision.reviewer,
        notes=decision.notes,
        decided_at=decision.decided_at,
    )


@router.post("/cases/{case_id}/reject", response_model=DecisionDetail)
def reject_case(
    case_id: str,
    body: RejectRequest,
    db: Session = Depends(get_db),
):
    """Human rejects the payment."""
    case = db.query(FraudCase).filter(FraudCase.case_id == case_id).first()
    if not case:
        raise HTTPException(404, f"Case {case_id} not found")

    if case.payment_status == PaymentStatus.REJECTED:
        raise HTTPException(400, f"Case {case_id} is already rejected")

    case.payment_status = PaymentStatus.REJECTED
    case.updated_at = datetime.utcnow()

    invoice = db.query(Invoice).filter(Invoice.invoice_id == case.invoice_id).first()
    if invoice:
        invoice.payment_status = PaymentStatus.REJECTED

    decision_id = f"DEC-{uuid.uuid4().hex[:8].upper()}"
    decision = Decision(
        decision_id=decision_id,
        case_id=case_id,
        decision_type=DecisionType.REJECT,
        reviewer=body.reviewer,
        notes=body.notes,
    )
    db.add(decision)

    db.add(AuditLog(
        case_id=case_id,
        invoice_id=case.invoice_id,
        event_type=AuditEventType.HUMAN_REJECTED,
        description=f"Payment REJECTED by {body.reviewer}",
        event_metadata={"reviewer": body.reviewer, "notes": body.notes},
    ))
    db.commit()

    return DecisionDetail(
        decision_id=decision.decision_id,
        case_id=decision.case_id,
        decision_type=decision.decision_type.value,
        reviewer=decision.reviewer,
        notes=decision.notes,
        decided_at=decision.decided_at,
    )


@router.get("/audit/{case_id}", response_model=list[AuditEvent])
def get_audit_trail(case_id: str, db: Session = Depends(get_db)):
    """Full audit trail for a case, chronological."""
    case = db.query(FraudCase).filter(FraudCase.case_id == case_id).first()
    if not case:
        raise HTTPException(404, f"Case {case_id} not found")

    events = (
        db.query(AuditLog)
        .filter(AuditLog.case_id == case_id)
        .order_by(AuditLog.occurred_at.asc())
        .all()
    )

    return [
        AuditEvent(
            id=e.id,
            case_id=e.case_id,
            invoice_id=e.invoice_id,
            event_type=e.event_type.value,
            description=e.description,
            event_metadata=e.event_metadata or {},
            occurred_at=e.occurred_at,
        )
        for e in events
    ]
