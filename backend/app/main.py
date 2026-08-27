"""
AP Payment Fraud Sentinel — FastAPI Application

Product story: INGEST → ANALYZE → HOLD → VERIFY → HUMAN RELEASE

RocketRide orchestrates:
  - Fraud Analysis Agent (ap_fraud_analysis.pipe)
  - Vendor Verification Agent with AI calling (ap_vendor_verification.pipe)
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.models.db import create_tables, SessionLocal
from app.services.seed_data import seed_database
from app.routes import invoices, cases, vendors

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: create tables and seed demo data."""
    logger.info("[STARTUP] AP Payment Fraud Sentinel starting up...")
    create_tables()
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    logger.info(f"[OK] Ready | CALLING_MODE={settings.CALLING_MODE} | DB={settings.DATABASE_URL}")
    yield
    logger.info("[SHUTDOWN] Shutting down AP Sentinel")


app = FastAPI(
    title="AP Payment Fraud Sentinel",
    description="""
## AP Payment Fraud Sentinel

Finance security system that monitors invoices and vendor bank-detail changes.

### Product Flow
**INGEST → ANALYZE → HOLD → VERIFY → HUMAN RELEASE**

### RocketRide Pipelines
- `ap_fraud_analysis.pipe` — AI Fraud Analyst agent
- `ap_vendor_verification.pipe` — Verification Agent + AI calling

### Cost Control
Deterministic rules screen 100% of invoices. AI runs only on HIGH/CRITICAL cases.
""",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Global error handlers ─────────────────────────────────────────────────────

@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(
        status_code=404,
        content={"error": "Not found", "code": "NOT_FOUND", "detail": str(exc.detail)},
    )


@app.exception_handler(422)
async def validation_error_handler(request: Request, exc):
    return JSONResponse(
        status_code=422,
        content={"error": "Validation error", "code": "VALIDATION_ERROR", "detail": str(exc)},
    )


@app.exception_handler(500)
async def internal_error_handler(request: Request, exc):
    logger.error(f"Internal error: {exc}")
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "code": "INTERNAL_ERROR", "detail": "An unexpected error occurred"},
    )


# ── Routes ────────────────────────────────────────────────────────────────────
app.include_router(invoices.router, tags=["Invoices"])
app.include_router(cases.router, tags=["Cases & Verification"])
app.include_router(vendors.router, tags=["Vendors & Metrics"])


@app.get("/", tags=["Root"])
def root():
    return {
        "app": settings.APP_NAME,
        "version": "1.0.0",
        "status": "running",
        "calling_mode": settings.CALLING_MODE,
        "docs": "/docs",
    }
