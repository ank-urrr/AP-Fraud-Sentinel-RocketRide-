"""
Deterministic Fraud Rules Engine.

ARCHITECTURE: Every invoice passes through cheap deterministic checks first.
Only HIGH/CRITICAL cases are escalated to the AI agent (cost control).

Scoring:
  0-29  → LOW
  30-59 → MEDIUM
  60-79 → HIGH
  80-100 → CRITICAL
"""
from dataclasses import dataclass, field
from typing import Optional
from app.models.database import RiskLevel


URGENCY_KEYWORDS = [
    "urgent", "asap", "immediately", "critical", "emergency",
    "overdue", "final notice", "please update", "bank change",
    "new account", "routing change", "account update",
]

SUSPICIOUS_PATTERNS = [
    "kindly update", "new bank details", "changed account",
    "transfer immediately", "wire transfer now",
]


@dataclass
class FraudCheckResult:
    score: int = 0
    flags: list[str] = field(default_factory=list)
    risk_level: RiskLevel = RiskLevel.LOW

    def add_flag(self, flag: str, points: int) -> None:
        self.flags.append(flag)
        self.score = min(100, self.score + points)

    def compute_risk_level(self) -> None:
        if self.score >= 80:
            self.risk_level = RiskLevel.CRITICAL
        elif self.score >= 60:
            self.risk_level = RiskLevel.HIGH
        elif self.score >= 30:
            self.risk_level = RiskLevel.MEDIUM
        else:
            self.risk_level = RiskLevel.LOW


def run_fraud_checks(
    invoice_id: str,
    vendor_id: Optional[str],
    amount: float,
    bank_account: str,
    ifsc: str,
    approver: Optional[str],
    description: Optional[str],
    # vendor record fields
    known_vendor: bool,
    known_bank_account: Optional[str],
    known_ifsc: Optional[str],
    usual_invoice_min: float,
    usual_invoice_max: float,
    known_approvers: list[str],
    # existing invoices for duplicate check
    existing_invoice_ids: list[str],
    # payment history amounts for anomaly detection
    recent_payment_amounts: list[float],
) -> FraudCheckResult:
    """
    Run deterministic pre-checks on a single invoice.
    Returns a FraudCheckResult with score, flags, and risk level.
    """
    result = FraudCheckResult()

    # ── Check 1: Known vendor? ─────────────────────────────────────────────
    if not known_vendor:
        result.add_flag("UNKNOWN_VENDOR", 40)
        # If vendor unknown, remaining bank checks can't be performed
        result.compute_risk_level()
        return result

    # ── Check 2: Bank account matches known record? ───────────────────────
    if known_bank_account and bank_account.strip() != known_bank_account.strip():
        result.add_flag("BANK_ACCOUNT_MISMATCH", 35)

    # ── Check 3: IFSC matches known record? ───────────────────────────────
    if known_ifsc and ifsc.strip().upper() != known_ifsc.strip().upper():
        result.add_flag("IFSC_MISMATCH", 25)

    # ── Check 4: Amount within usual range? ──────────────────────────────
    if amount > usual_invoice_max * 1.5:
        result.add_flag("AMOUNT_UNUSUALLY_HIGH", 20)
    elif amount > usual_invoice_max:
        result.add_flag("AMOUNT_ABOVE_NORMAL_RANGE", 10)
    elif amount < usual_invoice_min * 0.5 and usual_invoice_min > 0:
        result.add_flag("AMOUNT_UNUSUALLY_LOW", 5)

    # ── Check 5: Approver recognized? ─────────────────────────────────────
    if approver and known_approvers:
        normalized_approvers = [a.lower().strip() for a in known_approvers]
        if approver.lower().strip() not in normalized_approvers:
            result.add_flag("UNRECOGNIZED_APPROVER", 15)

    # ── Check 6: Duplicate invoice? ───────────────────────────────────────
    if invoice_id in existing_invoice_ids:
        result.add_flag("DUPLICATE_INVOICE", 30)

    # ── Check 7: Suspicious urgency language? ─────────────────────────────
    if description:
        desc_lower = description.lower()
        urgency_hits = [kw for kw in URGENCY_KEYWORDS if kw in desc_lower]
        pattern_hits = [p for p in SUSPICIOUS_PATTERNS if p in desc_lower]
        if pattern_hits:
            result.add_flag(f"SUSPICIOUS_LANGUAGE:{','.join(pattern_hits[:2])}", 20)
        elif urgency_hits:
            result.add_flag(f"URGENCY_LANGUAGE:{','.join(urgency_hits[:2])}", 10)

    # ── Check 8: Payment history anomaly ──────────────────────────────────
    if recent_payment_amounts and len(recent_payment_amounts) >= 3:
        avg = sum(recent_payment_amounts) / len(recent_payment_amounts)
        if avg > 0 and amount > avg * 2.5:
            result.add_flag("PAYMENT_HISTORY_ANOMALY", 15)

    result.compute_risk_level()
    return result


def score_to_risk_level(score: int) -> RiskLevel:
    if score >= 80:
        return RiskLevel.CRITICAL
    elif score >= 60:
        return RiskLevel.HIGH
    elif score >= 30:
        return RiskLevel.MEDIUM
    return RiskLevel.LOW
