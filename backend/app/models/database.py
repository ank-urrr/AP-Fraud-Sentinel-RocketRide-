"""
Database models for AP Payment Fraud Sentinel.
This is the system's persistent memory.
"""
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    Column, String, Float, Integer, Boolean, DateTime, Text,
    ForeignKey, Enum as SAEnum, JSON
)
from sqlalchemy.orm import relationship, DeclarativeBase
import enum


class Base(DeclarativeBase):
    pass


# ── Enumerations ──────────────────────────────────────────────────────────────

class RiskLevel(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class PaymentStatus(str, enum.Enum):
    PENDING = "PENDING"
    CLEARED = "CLEARED"
    HELD = "HELD"
    RELEASE_APPROVED = "RELEASE_APPROVED"
    REJECTED = "REJECTED"


class VerificationStatus(str, enum.Enum):
    NOT_STARTED = "NOT_STARTED"
    QUEUED = "QUEUED"
    CALLING = "CALLING"
    CONNECTED = "CONNECTED"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class VerificationOutcome(str, enum.Enum):
    CONFIRMED = "CONFIRMED"
    CONTRADICTED = "CONTRADICTED"
    INCONCLUSIVE = "INCONCLUSIVE"
    NO_ANSWER = "NO_ANSWER"
    FAILED = "FAILED"


class DecisionType(str, enum.Enum):
    APPROVE = "APPROVE"
    REJECT = "REJECT"
    HOLD = "HOLD"


class AuditEventType(str, enum.Enum):
    INVOICE_RECEIVED = "INVOICE_RECEIVED"
    RISK_ASSESSED = "RISK_ASSESSED"
    PAYMENT_HELD = "PAYMENT_HELD"
    PAYMENT_CLEARED = "PAYMENT_CLEARED"
    VERIFICATION_STARTED = "VERIFICATION_STARTED"
    VERIFICATION_COMPLETED = "VERIFICATION_COMPLETED"
    VERIFICATION_FAILED = "VERIFICATION_FAILED"
    HUMAN_APPROVED = "HUMAN_APPROVED"
    HUMAN_REJECTED = "HUMAN_REJECTED"
    AI_ANALYSIS_COMPLETED = "AI_ANALYSIS_COMPLETED"
    ERROR = "ERROR"


# ── ORM Models ────────────────────────────────────────────────────────────────

class Vendor(Base):
    __tablename__ = "vendors"

    vendor_id = Column(String, primary_key=True, index=True)
    vendor_name = Column(String, nullable=False)
    known_phone = Column(String, nullable=True)
    known_bank_account = Column(String, nullable=False)
    known_ifsc = Column(String, nullable=False)
    known_email = Column(String, nullable=True)
    usual_invoice_min = Column(Float, default=0.0)
    usual_invoice_max = Column(Float, default=1_000_000.0)
    known_approvers = Column(JSON, default=list)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    invoices = relationship("Invoice", back_populates="vendor")
    payment_history = relationship("PaymentHistory", back_populates="vendor")
    fraud_cases = relationship("FraudCase", back_populates="vendor")


class PaymentHistory(Base):
    __tablename__ = "payment_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    vendor_id = Column(String, ForeignKey("vendors.vendor_id"), nullable=False)
    invoice_id = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    bank_account = Column(String, nullable=False)
    ifsc = Column(String, nullable=False)
    status = Column(String, default="COMPLETED")
    paid_at = Column(DateTime, default=datetime.utcnow)

    vendor = relationship("Vendor", back_populates="payment_history")


class Invoice(Base):
    __tablename__ = "invoices"

    invoice_id = Column(String, primary_key=True, index=True)
    vendor_id = Column(String, ForeignKey("vendors.vendor_id"), nullable=False)
    amount = Column(Float, nullable=False)
    bank_account = Column(String, nullable=False)
    ifsc = Column(String, nullable=False)
    approver = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    batch_id = Column(String, nullable=True)

    risk_score = Column(Integer, nullable=True)
    risk_level = Column(SAEnum(RiskLevel), nullable=True)
    payment_status = Column(SAEnum(PaymentStatus), default=PaymentStatus.PENDING)
    fraud_flags = Column(JSON, default=list)

    vendor = relationship("Vendor", back_populates="invoices")
    fraud_case = relationship("FraudCase", back_populates="invoice", uselist=False)


class FraudCase(Base):
    __tablename__ = "fraud_cases"

    case_id = Column(String, primary_key=True, index=True)
    invoice_id = Column(String, ForeignKey("invoices.invoice_id"), nullable=False)
    vendor_id = Column(String, ForeignKey("vendors.vendor_id"), nullable=False)
    risk_score = Column(Integer, nullable=False)
    risk_level = Column(SAEnum(RiskLevel), nullable=False)
    fraud_flags = Column(JSON, default=list)
    ai_reasoning = Column(JSON, default=list)
    ai_confidence = Column(Float, nullable=True)
    verification_required = Column(Boolean, default=False)
    payment_status = Column(SAEnum(PaymentStatus), default=PaymentStatus.HELD)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    invoice = relationship("Invoice", back_populates="fraud_case")
    vendor = relationship("Vendor", back_populates="fraud_cases")
    verification_calls = relationship("VerificationCall", back_populates="fraud_case")
    decisions = relationship("Decision", back_populates="fraud_case")
    audit_logs = relationship("AuditLog", back_populates="fraud_case")


class VerificationCall(Base):
    __tablename__ = "verification_calls"

    call_id = Column(String, primary_key=True, index=True)
    case_id = Column(String, ForeignKey("fraud_cases.case_id"), nullable=False)
    phone_number = Column(String, nullable=False)
    calling_mode = Column(String, default="mock")
    status = Column(SAEnum(VerificationStatus), default=VerificationStatus.QUEUED)
    outcome = Column(SAEnum(VerificationOutcome), nullable=True)
    transcript = Column(Text, nullable=True)
    ai_summary = Column(Text, nullable=True)
    confidence = Column(Float, nullable=True)
    external_call_id = Column(String, nullable=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)

    fraud_case = relationship("FraudCase", back_populates="verification_calls")


class Decision(Base):
    __tablename__ = "decisions"

    decision_id = Column(String, primary_key=True, index=True)
    case_id = Column(String, ForeignKey("fraud_cases.case_id"), nullable=False)
    decision_type = Column(SAEnum(DecisionType), nullable=False)
    reviewer = Column(String, nullable=False)
    notes = Column(Text, nullable=True)
    decided_at = Column(DateTime, default=datetime.utcnow)

    fraud_case = relationship("FraudCase", back_populates="decisions")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    case_id = Column(String, ForeignKey("fraud_cases.case_id"), nullable=True)
    invoice_id = Column(String, nullable=True)
    event_type = Column(SAEnum(AuditEventType), nullable=False)
    description = Column(Text, nullable=False)
    event_metadata = Column(JSON, default=dict)   # 'metadata' is reserved by SQLAlchemy
    occurred_at = Column(DateTime, default=datetime.utcnow)

    fraud_case = relationship("FraudCase", back_populates="audit_logs")
