"""
Pydantic schemas for API request/response validation.
These define the integration contract between frontend and backend.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


# ── Invoice Schemas ───────────────────────────────────────────────────────────

class InvoiceInput(BaseModel):
    invoice_id: str
    vendor_id: str
    amount: float = Field(gt=0)
    bank_account: str
    ifsc: str
    approver: Optional[str] = None
    description: Optional[str] = None
    timestamp: Optional[datetime] = None


class InvoiceResult(BaseModel):
    invoice_id: str
    vendor_id: str
    vendor_name: Optional[str]
    amount: float
    bank_account: str
    ifsc: str
    approver: Optional[str]
    description: Optional[str]
    timestamp: Optional[datetime]
    risk_score: Optional[int]
    risk_level: Optional[str]
    payment_status: str
    fraud_flags: list[str]
    case_id: Optional[str] = None


class BatchResult(BaseModel):
    batch_id: str
    total: int
    processed: int
    low_risk: int
    medium_risk: int
    high_risk: int
    critical: int
    held: int
    cleared: int
    verification_required: int
    verification_completed: int
    human_review_required: int
    invoices: list[InvoiceResult]


# ── Fraud Case Schemas ────────────────────────────────────────────────────────

class FraudCaseSummary(BaseModel):
    case_id: str
    invoice_id: str
    vendor_id: str
    vendor_name: Optional[str]
    amount: float
    risk_score: int
    risk_level: str
    payment_status: str
    verification_required: bool
    ai_confidence: Optional[float]
    created_at: datetime
    updated_at: datetime


class VerificationCallDetail(BaseModel):
    call_id: str
    case_id: str
    phone_number: str
    calling_mode: str
    status: str
    outcome: Optional[str]
    transcript: Optional[str]
    ai_summary: Optional[str]
    confidence: Optional[float]
    started_at: datetime
    completed_at: Optional[datetime]
    error_message: Optional[str]


class DecisionDetail(BaseModel):
    decision_id: str
    case_id: str
    decision_type: str
    reviewer: str
    notes: Optional[str]
    decided_at: datetime


class FraudCaseDetail(FraudCaseSummary):
    fraud_flags: list[str]
    ai_reasoning: list[str]
    bank_account: str
    ifsc: str
    approver: Optional[str]
    description: Optional[str]
    verification_call: Optional[VerificationCallDetail] = None
    latest_decision: Optional[DecisionDetail] = None


# ── Vendor Schemas ────────────────────────────────────────────────────────────

class VendorProfile(BaseModel):
    vendor_id: str
    vendor_name: str
    known_phone: Optional[str]
    known_bank_account: str
    known_ifsc: str
    known_email: Optional[str]
    usual_invoice_min: float
    usual_invoice_max: float
    known_approvers: list[str]
    recent_payments: list[dict] = []


# ── Request Schemas ───────────────────────────────────────────────────────────

class VerifyRequest(BaseModel):
    """No body required — all data comes from the fraud case + vendor DB."""
    pass


class ApproveRequest(BaseModel):
    reviewer: str = Field(min_length=2, max_length=100)
    notes: Optional[str] = Field(default=None, max_length=1000)


class RejectRequest(BaseModel):
    reviewer: str = Field(min_length=2, max_length=100)
    notes: Optional[str] = Field(default=None, max_length=1000)


# ── Audit Schemas ─────────────────────────────────────────────────────────────

class AuditEvent(BaseModel):
    id: int
    case_id: Optional[str]
    invoice_id: Optional[str]
    event_type: str
    description: str
    event_metadata: dict
    occurred_at: datetime


# ── System / Metrics Schemas ──────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str = "ok"
    app: str
    version: str = "1.0.0"
    calling_mode: str
    database: str = "connected"


class MetricsResponse(BaseModel):
    total_invoices: int
    total_cases: int
    cases_held: int
    cases_cleared: int
    cases_rejected: int
    verification_calls_made: int
    human_approvals: int
    human_rejections: int
    avg_risk_score: float
    cost_estimate: dict


class ErrorResponse(BaseModel):
    error: str
    code: str
    detail: Optional[str] = None
