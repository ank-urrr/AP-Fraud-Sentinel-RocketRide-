# AP Payment Fraud Sentinel 🛡️

> Built for RocketRide Buildathon — Problem Statement #4

---

## The Problem

Finance teams processing hundreds of vendor invoices are vulnerable to:
- **Business Email Compromise (BEC)** — fake invoices from impersonated vendors
- **Bank detail changes** — fraudsters redirect payments to new accounts
- **Duplicate invoices** — same invoice submitted multiple times
- **Inflated amounts** — invoices far above normal vendor range

These attacks succeed because payment approvals are often fast and under pressure ("URGENT — please update bank details immediately").

## The Solution

**AP Payment Fraud Sentinel** screens every incoming invoice against trusted vendor records, automatically holds suspicious payments, verifies through the vendor's **known trusted phone number** (never a phone from the suspicious request), and requires **human sign-off** before any held payment is released.

```
INGEST → ANALYZE → HOLD → VERIFY → HUMAN RELEASE
```

No held payment ever releases automatically. Every approval is logged.

---

## Why RocketRide

RocketRide orchestrates the two core AI agents:

| Pipeline | Purpose |
|---|---|
| `ap_fraud_analysis.pipe` | AI Fraud Analyst — explains why a case is suspicious without inventing evidence |
| `ap_vendor_verification.pipe` | Verification Agent + AI Calling Tool — makes outbound call to trusted vendor number |

The official PS #4 explicitly requires out-of-band phone verification. RocketRide's calling tool integration is the engine that makes this work.

**Cost control**: Deterministic rules screen 100% of invoices at zero LLM cost. Only HIGH/CRITICAL cases (typically ~10–20%) are escalated to the AI agent.

---

## Architecture

```
React Frontend (Vite + TS + Tailwind)
        ↓
FastAPI Backend
        ↓
SQLite Database (system memory)
        ↓
Fraud Rules Engine (deterministic, free)
        ↓
RocketRide Pipeline #1 — Fraud Analysis Agent (HIGH/CRITICAL only)
        ↓
RocketRide Pipeline #2 — Verification Agent + Calling Tool
        ↓
Human Approval Gate
        ↓
Audit Log
```

---

## Fraud Detection Rules

Every invoice is checked against:

1. **Known vendor?** — Unknown vendor = +40 points
2. **Bank account matches?** — Mismatch = +35 points
3. **IFSC matches?** — Mismatch = +25 points
4. **Amount unusual?** — > 150% of normal range = +20 points
5. **Approver recognized?** — Unknown approver = +15 points
6. **Duplicate invoice?** — +30 points
7. **Urgency language?** — "URGENT", "immediately", "new account" = +10–20 points
8. **Payment history anomaly?** — > 2.5x average = +15 points

**Score → Risk Level:**
- 0–29: LOW (cleared automatically)
- 30–59: MEDIUM
- 60–79: HIGH (held, AI analysis)
- 80–100: CRITICAL (held, AI analysis, verification call)

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
cp .env.example .env            # Edit as needed
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local      # Edit VITE_API_BASE_URL if needed
npm run dev
```

Open: http://localhost:5173

---

## Demo (2-Minute Judge Flow)

### Step 1 — Upload batch
Navigate to **Invoices** → click **"RUN DEMO — 50 INVOICE BATCH"**

### Step 2 — See results
```
50 invoices received
42 cleared
~5 medium risk
3 HELD (critical/high)
```

### Step 3 — Click a CRITICAL case
See:
- Risk score: 85/100
- Flags: BANK_ACCOUNT_MISMATCH, AMOUNT_UNUSUALLY_HIGH, URGENCY_LANGUAGE
- Payment status: HELD

### Step 4 — Trusted vendor profile
Click **"VIEW TRUSTED VENDOR PROFILE"** → see the known phone number, bank account, IFSC — trusted record vs. suspicious invoice.

### Step 5 — Verify vendor
Click **"VERIFY VENDOR"** → RocketRide verification pipeline runs → AI calls the **trusted phone** → see status progression: QUEUED → CALLING → CONNECTED → COMPLETED

If `CALLING_MODE=mock`, a **"MOCK VERIFICATION"** badge is shown clearly.

### Step 6 — See call result
```
CONTRADICTED — 94% confidence
"Vendor confirmed that no bank-account change was requested."
```

### Step 7 — Human decision
Click **"REVIEW EVIDENCE & DECIDE"** → enter reviewer name → click **"REJECT PAYMENT"** or **"APPROVE RELEASE"**

### Step 8 — Audit trail
Automatically redirects to the full audit timeline:
- Invoice received → Risk assessed → Payment held → Verification started → Call completed → Human rejected

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | System health + calling mode |
| POST | `/invoices/batch` | Upload CSV/JSON batch |
| POST | `/analyze` | Trigger AI analysis on a case |
| GET | `/cases` | List fraud cases |
| GET | `/cases/{id}` | Case detail |
| POST | `/cases/{id}/verify` | Trigger verification call |
| GET | `/verification/{call_id}` | Poll call status |
| POST | `/cases/{id}/approve` | Human approve |
| POST | `/cases/{id}/reject` | Human reject |
| GET | `/audit/{id}` | Audit trail |
| GET | `/metrics` | System metrics + cost estimate |
| GET | `/vendors` | Vendor registry |
| GET | `/vendors/{id}` | Vendor profile |

---

## RocketRide Pipelines

### `ap_fraud_analysis.pipe`
```
webhook_intake → fraud_analyst_agent → fraud_output_validator → fraud_response
```
Nodes: `webhook`, `agent` (gpt-4o-mini), `transform` (validator), `response`

### `ap_vendor_verification.pipe`
```
verification_webhook → verification_agent → calling_tool → call_result_analyzer → verification_validator → verification_response
```
Nodes: `webhook`, `agent`, `calling` (bland_ai), `agent`, `transform`, `response`

**SDK Pattern:**
```python
from rocketride import RocketRideClient
client = RocketRideClient(uri=ROCKETRIDE_URI, auth=ROCKETRIDE_APIKEY)
client.use(pipeline)
result = await client.send(payload)
client.terminate()  # Always terminate — no orphaned executions
```

---

## Environment Variables

See `backend/.env.example` and `frontend/.env.example`.

Key variables:
- `CALLING_MODE=mock` — no real calls (demo-safe)
- `CALLING_MODE=live` — requires `ROCKETRIDE_APIKEY` + `BLAND_API_KEY`
- `ROCKETRIDE_URI` — local or cloud RocketRide endpoint
- `DATABASE_URL` — SQLite default, swap for Postgres in production

---

## Cost Per Run (Approximate)

For a typical 50-invoice batch:

| Step | Count | Cost |
|---|---|---|
| Deterministic rules | 50 invoices | $0.00 |
| AI analysis (gpt-4o-mini) | ~5 cases | ~$0.01 |
| Verification calls (Bland AI) | ~2–3 calls | ~$0.20–0.30 |
| **Total** | | **~$0.30/batch** |

> Deterministic rules run free on every invoice. AI and calling costs are bounded by the number of HIGH/CRITICAL cases, which is typically a small fraction of the batch.

---

## Limitations

- Vendor data and fraud thresholds are prototype-level demo data
- Fraud scoring is rule-based, not ML-trained
- AI agent uses mock mode by default — live mode requires RocketRide + Bland AI credentials
- Designed for demo scale (50–500 invoices/batch); production would need async workers

---

## Running Tests

```bash
cd backend
pip install -r requirements.txt
pytest tests/ -v
```

Tests cover: batch ingestion, fraud rules, risk scoring, hold decision, RocketRide mocked execution, malformed AI output, verification, duplicate call protection, human approval/rejection, audit trail, end-to-end 50-invoice workflow.
