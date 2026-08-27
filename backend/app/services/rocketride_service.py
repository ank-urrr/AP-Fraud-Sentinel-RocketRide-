"""
RocketRide orchestration service.

Runs the .pipe pipelines for:
  1. Fraud Analysis (ap_fraud_analysis.pipe)
  2. Vendor Verification (ap_vendor_verification.pipe)

MOCK mode: deterministic responses, no external calls.
LIVE mode: Uses RocketRideClient with official SDK pattern:
  RocketRideClient(uri, auth) -> use() -> send() -> terminate()

Cost control: Only HIGH/CRITICAL cases reach this service.
"""
import json
import uuid
import asyncio
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

from pydantic import BaseModel, Field, field_validator
from app.config import settings

logger = logging.getLogger(__name__)

PIPES_DIR = Path(__file__).parent.parent / "pipelines"


# ── Pydantic output schemas (validated after every AI response) ───────────────

class FraudAnalysisOutput(BaseModel):
    invoice_id: str
    risk_level: str
    reasoning: list[str]
    verification_required: bool
    confidence: float = Field(ge=0.0, le=1.0)

    @field_validator("risk_level")
    @classmethod
    def validate_risk_level(cls, v):
        allowed = {"LOW", "MEDIUM", "HIGH", "CRITICAL"}
        if v not in allowed:
            raise ValueError(f"risk_level must be one of {allowed}, got {v!r}")
        return v

    @field_validator("reasoning")
    @classmethod
    def reasoning_not_empty(cls, v):
        if not v:
            raise ValueError("reasoning must contain at least one item")
        return v


class VerificationAnalysisOutput(BaseModel):
    outcome: str
    summary: str
    confidence: float = Field(ge=0.0, le=1.0)
    key_findings: list[str]

    @field_validator("outcome")
    @classmethod
    def validate_outcome(cls, v):
        allowed = {"CONFIRMED", "CONTRADICTED", "INCONCLUSIVE", "NO_ANSWER", "FAILED"}
        if v not in allowed:
            raise ValueError(f"outcome must be one of {allowed}")
        return v


# ── Mock deterministic responses ──────────────────────────────────────────────

def _mock_fraud_analysis(case_data: dict) -> FraudAnalysisOutput:
    """
    Generate deterministic mock AI fraud analysis based on actual flags.
    Never invents evidence — only explains what the rules found.
    """
    flags = case_data.get("fraud_flags", [])
    risk_level = case_data.get("risk_level", "MEDIUM")
    invoice_id = case_data.get("invoice_id", "UNKNOWN")
    risk_score = case_data.get("risk_score", 30)

    reasoning = []

    flag_explanations = {
        "BANK_ACCOUNT_MISMATCH": "Invoice bank account differs from the vendor's registered known account — strong indicator of social engineering or BEC attack.",
        "IFSC_MISMATCH": "IFSC code on invoice does not match the vendor's verified banking record — payment would route to an unregistered institution.",
        "AMOUNT_UNUSUALLY_HIGH": "Invoice amount exceeds 150% of the vendor's normal range — consistent with fraudulent inflation tactics.",
        "AMOUNT_ABOVE_NORMAL_RANGE": "Invoice amount is above the vendor's historical range — warrants additional scrutiny.",
        "UNRECOGNIZED_APPROVER": "Approver name is not in the vendor's known approver list — unauthorized approval chain.",
        "DUPLICATE_INVOICE": "Invoice ID already exists in the system — possible double-payment fraud attempt.",
        "UNKNOWN_VENDOR": "Vendor not found in trusted records — payment cannot be verified against known baseline.",
        "PAYMENT_HISTORY_ANOMALY": "Amount is significantly higher than the vendor's payment history average — statistical anomaly.",
    }

    for flag in flags:
        # Handle flags with extra context (e.g. "URGENCY_LANGUAGE:urgent,asap")
        base_flag = flag.split(":")[0]
        if base_flag in flag_explanations:
            reasoning.append(flag_explanations[base_flag])
        elif "URGENCY" in base_flag or "SUSPICIOUS_LANGUAGE" in base_flag:
            reasoning.append(f"Invoice description contains urgency/pressure language ({flag.split(':')[-1]}) — classic social engineering pattern to bypass verification.")

    if not reasoning:
        reasoning.append(f"Rule engine assigned risk score {risk_score}. Elevated risk detected requiring analyst review.")

    # Verification required for HIGH/CRITICAL
    verification_required = risk_level in ("HIGH", "CRITICAL")
    confidence = min(0.99, 0.5 + (risk_score / 200.0))

    return FraudAnalysisOutput(
        invoice_id=invoice_id,
        risk_level=risk_level,
        reasoning=reasoning,
        verification_required=verification_required,
        confidence=round(confidence, 2),
    )


def _mock_verification_analysis(case_data: dict, transcript: str) -> VerificationAnalysisOutput:
    """
    Generate deterministic mock verification outcome.
    BANK_ACCOUNT_MISMATCH cases always return CONTRADICTED.
    """
    flags = case_data.get("fraud_flags", [])
    has_bank_mismatch = any("BANK" in f for f in flags)

    if has_bank_mismatch:
        return VerificationAnalysisOutput(
            outcome="CONTRADICTED",
            summary="Vendor confirmed that no bank-account change was requested. The invoice details are fraudulent.",
            confidence=0.94,
            key_findings=[
                "Vendor explicitly denied requesting bank account change",
                "Vendor confirmed current registered account remains active",
                "Vendor requested immediate investigation of the fraudulent invoice",
            ],
        )
    else:
        return VerificationAnalysisOutput(
            outcome="INCONCLUSIVE",
            summary="Vendor contact answered but could not definitively confirm or deny the transaction details.",
            confidence=0.62,
            key_findings=[
                "Vendor contact was uncertain about specific invoice details",
                "Recommended escalating to vendor's finance team for confirmation",
            ],
        )


MOCK_CALL_TRANSCRIPT = """AI: Hello, I am an AI assistant calling on behalf of the AP Sentinel finance security system for a verification check. Is this {vendor_name}?
Vendor: Yes, this is correct.
AI: We have received an invoice requesting a bank account change. Did your organization request a change in banking details recently?
Vendor: No, absolutely not. We have not made any such request. Our account details remain the same as always.
AI: Can you confirm your registered bank account ends in the digits on file with us?
Vendor: Yes, our account ends in {known_account_last4}. Any invoice showing different details is fraudulent.
AI: Is the requested routing change to a new account legitimate?
Vendor: No, it is not. Please put any such payment on hold and investigate immediately.
AI: Thank you for your time. We will take appropriate action to protect your account. Goodbye.
Vendor: Thank you. Please be careful.
"""


# ── RocketRide live client (SDK pattern) ──────────────────────────────────────

async def _run_live_fraud_pipeline(case_data: dict) -> FraudAnalysisOutput:
    """
    Live mode: Use RocketRideClient to execute the fraud analysis pipeline.
    Pattern: RocketRideClient(uri, auth) -> use() -> send() -> terminate()
    """
    try:
        # Import RocketRide SDK (install: pip install rocketride)
        from rocketride import RocketRideClient  # type: ignore

        client = RocketRideClient(
            uri=settings.ROCKETRIDE_URI,
            auth=settings.ROCKETRIDE_APIKEY,
        )

        # Load pipeline definition
        pipe_path = PIPES_DIR / "ap_fraud_analysis.pipe"
        with open(pipe_path) as f:
            pipeline = json.load(f)

        # Execute pipeline
        client.use(pipeline)
        result = await client.send(case_data)
        client.terminate()  # Always terminate — no orphaned executions

        # Validate output
        return FraudAnalysisOutput(**result)

    except ImportError:
        logger.warning("RocketRide SDK not installed. Falling back to mock mode.")
        return _mock_fraud_analysis(case_data)
    except Exception as e:
        logger.error(f"RocketRide pipeline failed: {e}. Falling back to mock.")
        raise


async def _run_live_verification_pipeline(
    case_data: dict, vendor_phone: str, vendor_name: str
) -> tuple[str, VerificationAnalysisOutput]:
    """
    Live mode: Executes verification pipeline with AI calling.
    Returns (transcript, analysis).
    """
    try:
        from rocketride import RocketRideClient  # type: ignore

        client = RocketRideClient(
            uri=settings.ROCKETRIDE_URI,
            auth=settings.ROCKETRIDE_APIKEY,
        )

        pipe_path = PIPES_DIR / "ap_vendor_verification.pipe"
        with open(pipe_path) as f:
            pipeline = json.load(f)

        payload = {
            **case_data,
            "trusted_phone": vendor_phone,
            "vendor_name": vendor_name,
        }

        client.use(pipeline)
        result = await client.send(payload)
        client.terminate()

        transcript = result.get("transcript", "")
        analysis = VerificationAnalysisOutput(**result.get("analysis", {}))
        return transcript, analysis

    except ImportError:
        logger.warning("RocketRide SDK not installed. Falling back to mock calling.")
        raise
    except Exception as e:
        logger.error(f"RocketRide verification pipeline failed: {e}")
        raise


# ── Public API ─────────────────────────────────────────────────────────────────

async def run_fraud_analysis(case_data: dict) -> FraudAnalysisOutput:
    """
    Run fraud analysis pipeline (mock or live).
    Validates output with Pydantic — malformed AI output raises ValueError.
    """
    if settings.CALLING_MODE == "mock" or not settings.ROCKETRIDE_APIKEY or settings.ROCKETRIDE_APIKEY == "mock-key":
        # Simulate brief processing delay
        await asyncio.sleep(0.5)
        result = _mock_fraud_analysis(case_data)
        logger.info(f"[MOCK] Fraud analysis complete: {result.invoice_id} → {result.risk_level} ({result.confidence:.0%})")
        return result
    else:
        return await _run_live_fraud_pipeline(case_data)


async def run_verification_call(
    case_id: str,
    case_data: dict,
    vendor_phone: str,
    vendor_name: str,
    known_account_last4: str,
) -> dict:
    """
    Orchestrate verification call (mock or live).
    Returns dict with: call_id, status_sequence, transcript, analysis.

    DUPLICATE CALL PROTECTION is enforced by the caller (route layer).
    Phone number MUST come from vendor DB (enforced by caller).
    """
    call_id = f"call-{uuid.uuid4().hex[:8]}"

    if settings.CALLING_MODE == "mock" or not settings.ROCKETRIDE_APIKEY or settings.ROCKETRIDE_APIKEY == "mock-key":
        # Mock: simulate QUEUED → CALLING → CONNECTED → COMPLETED
        transcript = MOCK_CALL_TRANSCRIPT.format(
            vendor_name=vendor_name,
            known_account_last4=known_account_last4,
        )
        analysis = _mock_verification_analysis(case_data, transcript)

        logger.info(f"[MOCK] Verification call {call_id}: {analysis.outcome} ({analysis.confidence:.0%})")

        return {
            "call_id": call_id,
            "mode": "mock",
            "transcript": transcript,
            "outcome": analysis.outcome,
            "summary": analysis.summary,
            "confidence": analysis.confidence,
            "key_findings": analysis.key_findings,
        }
    else:
        # Live: use RocketRide + Bland AI
        transcript, analysis = await _run_live_verification_pipeline(
            case_data, vendor_phone, vendor_name
        )
        return {
            "call_id": call_id,
            "mode": "live",
            "transcript": transcript,
            "outcome": analysis.outcome,
            "summary": analysis.summary,
            "confidence": analysis.confidence,
            "key_findings": analysis.key_findings,
        }
