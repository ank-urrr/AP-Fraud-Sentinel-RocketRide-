"""
Seed data for AP Payment Fraud Sentinel demo.
Deterministic mix of 50 invoices including:
  - normal invoices
  - suspicious new bank account
  - mismatched vendor details
  - unusual amount
  - suspicious approver
  - urgent wording
  - duplicate invoice
"""
from datetime import datetime, timedelta
from app.models.database import (
    Vendor, PaymentHistory, Invoice, PaymentStatus
)


# ── Vendor master records (trusted data) ──────────────────────────────────────

VENDORS = [
    {
        "vendor_id": "VEN-001",
        "vendor_name": "ABC Technologies Pvt Ltd",
        "known_phone": "+91 9876543210",
        "known_bank_account": "XXXX1234",
        "known_ifsc": "HDFC0001234",
        "known_email": "finance@abctech.in",
        "usual_invoice_min": 50000.0,
        "usual_invoice_max": 200000.0,
        "known_approvers": ["Rajesh Kumar", "Priya Sharma"],
    },
    {
        "vendor_id": "VEN-002",
        "vendor_name": "Global Logistics Corp",
        "known_phone": "+91 9123456789",
        "known_bank_account": "XXXX5678",
        "known_ifsc": "ICIC0005678",
        "known_email": "accounts@globallogistics.com",
        "usual_invoice_min": 100000.0,
        "usual_invoice_max": 500000.0,
        "known_approvers": ["Anita Singh", "Mohit Verma"],
    },
    {
        "vendor_id": "VEN-003",
        "vendor_name": "Nexus Marketing Solutions",
        "known_phone": "+91 9988776655",
        "known_bank_account": "XXXX9012",
        "known_ifsc": "AXIS0009012",
        "known_email": "billing@nexusmarketing.co",
        "usual_invoice_min": 20000.0,
        "usual_invoice_max": 80000.0,
        "known_approvers": ["Sanjay Mehta"],
    },
    {
        "vendor_id": "VEN-004",
        "vendor_name": "TechSupplies India",
        "known_phone": "+91 8877665544",
        "known_bank_account": "XXXX3456",
        "known_ifsc": "SBIN0003456",
        "known_email": "invoices@techsupplies.in",
        "usual_invoice_min": 10000.0,
        "usual_invoice_max": 150000.0,
        "known_approvers": ["Deepa Nair", "Kiran Rao"],
    },
    {
        "vendor_id": "VEN-005",
        "vendor_name": "Sunrise Consulting",
        "known_phone": "+91 7766554433",
        "known_bank_account": "XXXX7890",
        "known_ifsc": "KOTAK0007890",
        "known_email": "finance@sunriseconsult.com",
        "usual_invoice_min": 75000.0,
        "usual_invoice_max": 300000.0,
        "known_approvers": ["Vikram Joshi", "Neha Patel"],
    },
]

# ── Invoice batch — 50 deterministic invoices ─────────────────────────────────

def _dt(days_ago: int) -> datetime:
    return datetime.utcnow() - timedelta(days=days_ago)


INVOICES = [
    # ── VEN-001 NORMAL (5 invoices) ──────────────────────────────────────
    {"invoice_id": "INV-001", "vendor_id": "VEN-001", "amount": 125000, "bank_account": "XXXX1234", "ifsc": "HDFC0001234", "approver": "Rajesh Kumar",    "description": "Monthly IT support services - Oct 2024", "timestamp": _dt(30)},
    {"invoice_id": "INV-002", "vendor_id": "VEN-001", "amount": 98000,  "bank_account": "XXXX1234", "ifsc": "HDFC0001234", "approver": "Priya Sharma",    "description": "Software license renewal Q3",            "timestamp": _dt(25)},
    {"invoice_id": "INV-003", "vendor_id": "VEN-001", "amount": 150000, "bank_account": "XXXX1234", "ifsc": "HDFC0001234", "approver": "Rajesh Kumar",    "description": "Hardware maintenance contract",           "timestamp": _dt(20)},
    {"invoice_id": "INV-004", "vendor_id": "VEN-001", "amount": 75000,  "bank_account": "XXXX1234", "ifsc": "HDFC0001234", "approver": "Priya Sharma",    "description": "Network infrastructure upgrade",          "timestamp": _dt(15)},
    {"invoice_id": "INV-005", "vendor_id": "VEN-001", "amount": 180000, "bank_account": "XXXX1234", "ifsc": "HDFC0001234", "approver": "Rajesh Kumar",    "description": "Annual support services renewal",         "timestamp": _dt(10)},

    # ── VEN-001 SUSPICIOUS — BANK ACCOUNT CHANGED (CRITICAL) ─────────────
    {"invoice_id": "INV-006", "vendor_id": "VEN-001", "amount": 842000, "bank_account": "XXXX9988", "ifsc": "HDFC0001234", "approver": "Rajesh Kumar",    "description": "URGENT: Please update payment to new account XXXX9988. Immediate processing required.", "timestamp": _dt(1)},

    # ── VEN-002 NORMAL (4 invoices) ──────────────────────────────────────
    {"invoice_id": "INV-007", "vendor_id": "VEN-002", "amount": 250000, "bank_account": "XXXX5678", "ifsc": "ICIC0005678", "approver": "Anita Singh",     "description": "Freight services November 2024",          "timestamp": _dt(28)},
    {"invoice_id": "INV-008", "vendor_id": "VEN-002", "amount": 380000, "bank_account": "XXXX5678", "ifsc": "ICIC0005678", "approver": "Mohit Verma",     "description": "Warehousing and distribution Q4",         "timestamp": _dt(22)},
    {"invoice_id": "INV-009", "vendor_id": "VEN-002", "amount": 195000, "bank_account": "XXXX5678", "ifsc": "ICIC0005678", "approver": "Anita Singh",     "description": "Cold storage services October",           "timestamp": _dt(14)},
    {"invoice_id": "INV-010", "vendor_id": "VEN-002", "amount": 420000, "bank_account": "XXXX5678", "ifsc": "ICIC0005678", "approver": "Anita Singh",     "description": "Cross-border shipment handling",          "timestamp": _dt(7)},

    # ── VEN-002 SUSPICIOUS — BANK + IFSC MISMATCH (HIGH) ─────────────────
    {"invoice_id": "INV-011", "vendor_id": "VEN-002", "amount": 1250000,"bank_account": "XXXX4410", "ifsc": "SBIN0004410", "approver": "Anita Singh",     "description": "Logistics services - kindly update payment to our new bank details as per attached letter", "timestamp": _dt(2)},

    # ── VEN-003 NORMAL (4 invoices) ──────────────────────────────────────
    {"invoice_id": "INV-012", "vendor_id": "VEN-003", "amount": 45000,  "bank_account": "XXXX9012", "ifsc": "AXIS0009012", "approver": "Sanjay Mehta",    "description": "Digital marketing campaign October",      "timestamp": _dt(29)},
    {"invoice_id": "INV-013", "vendor_id": "VEN-003", "amount": 62000,  "bank_account": "XXXX9012", "ifsc": "AXIS0009012", "approver": "Sanjay Mehta",    "description": "Social media management Q4",              "timestamp": _dt(21)},
    {"invoice_id": "INV-014", "vendor_id": "VEN-003", "amount": 38000,  "bank_account": "XXXX9012", "ifsc": "AXIS0009012", "approver": "Sanjay Mehta",    "description": "SEO optimization services",               "timestamp": _dt(16)},
    {"invoice_id": "INV-015", "vendor_id": "VEN-003", "amount": 55000,  "bank_account": "XXXX9012", "ifsc": "AXIS0009012", "approver": "Sanjay Mehta",    "description": "Content creation - November batch",       "timestamp": _dt(8)},

    # ── VEN-003 SUSPICIOUS — UNUSUAL AMOUNT + UNRECOGNIZED APPROVER (HIGH) ─
    {"invoice_id": "INV-016", "vendor_id": "VEN-003", "amount": 450000, "bank_account": "XXXX9012", "ifsc": "AXIS0009012", "approver": "John Williams",   "description": "Marketing campaign - please process immediately, board approved", "timestamp": _dt(3)},

    # ── VEN-004 NORMAL (5 invoices) ──────────────────────────────────────
    {"invoice_id": "INV-017", "vendor_id": "VEN-004", "amount": 85000,  "bank_account": "XXXX3456", "ifsc": "SBIN0003456", "approver": "Deepa Nair",      "description": "Office supplies batch order September",   "timestamp": _dt(27)},
    {"invoice_id": "INV-018", "vendor_id": "VEN-004", "amount": 42000,  "bank_account": "XXXX3456", "ifsc": "SBIN0003456", "approver": "Kiran Rao",       "description": "IT equipment procurement",                "timestamp": _dt(23)},
    {"invoice_id": "INV-019", "vendor_id": "VEN-004", "amount": 115000, "bank_account": "XXXX3456", "ifsc": "SBIN0003456", "approver": "Deepa Nair",      "description": "Server components - Q4 refresh",          "timestamp": _dt(17)},
    {"invoice_id": "INV-020", "vendor_id": "VEN-004", "amount": 67000,  "bank_account": "XXXX3456", "ifsc": "SBIN0003456", "approver": "Kiran Rao",       "description": "Networking equipment order",              "timestamp": _dt(11)},
    {"invoice_id": "INV-021", "vendor_id": "VEN-004", "amount": 130000, "bank_account": "XXXX3456", "ifsc": "SBIN0003456", "approver": "Deepa Nair",      "description": "Annual hardware maintenance contract",    "timestamp": _dt(5)},

    # ── VEN-004 SUSPICIOUS — DUPLICATE (MEDIUM) ───────────────────────────
    {"invoice_id": "INV-017", "vendor_id": "VEN-004", "amount": 85000,  "bank_account": "XXXX3456", "ifsc": "SBIN0003456", "approver": "Deepa Nair",      "description": "Office supplies batch order September - RESUBMISSION", "timestamp": _dt(2)},

    # ── VEN-005 NORMAL (5 invoices) ──────────────────────────────────────
    {"invoice_id": "INV-022", "vendor_id": "VEN-005", "amount": 185000, "bank_account": "XXXX7890", "ifsc": "KOTAK0007890", "approver": "Vikram Joshi",   "description": "Strategic advisory services Q3",          "timestamp": _dt(26)},
    {"invoice_id": "INV-023", "vendor_id": "VEN-005", "amount": 240000, "bank_account": "XXXX7890", "ifsc": "KOTAK0007890", "approver": "Neha Patel",     "description": "Business process consulting October",     "timestamp": _dt(19)},
    {"invoice_id": "INV-024", "vendor_id": "VEN-005", "amount": 150000, "bank_account": "XXXX7890", "ifsc": "KOTAK0007890", "approver": "Vikram Joshi",   "description": "Management consulting November",          "timestamp": _dt(12)},
    {"invoice_id": "INV-025", "vendor_id": "VEN-005", "amount": 275000, "bank_account": "XXXX7890", "ifsc": "KOTAK0007890", "approver": "Neha Patel",     "description": "Organizational restructuring advisory",   "timestamp": _dt(6)},
    {"invoice_id": "INV-026", "vendor_id": "VEN-005", "amount": 210000, "bank_account": "XXXX7890", "ifsc": "KOTAK0007890", "approver": "Vikram Joshi",   "description": "Digital transformation consulting",       "timestamp": _dt(4)},

    # ── VEN-005 SUSPICIOUS — BANK MISMATCH + URGENT (CRITICAL) ──────────
    {"invoice_id": "INV-027", "vendor_id": "VEN-005", "amount": 890000, "bank_account": "XXXX2233", "ifsc": "KOTAK0007890", "approver": "Neha Patel",     "description": "CRITICAL: Changed account details - new bank XXXX2233. Please wire transfer immediately, overdue payment", "timestamp": _dt(1)},

    # ── More normal invoices from existing vendors ────────────────────────
    {"invoice_id": "INV-028", "vendor_id": "VEN-001", "amount": 110000, "bank_account": "XXXX1234", "ifsc": "HDFC0001234", "approver": "Rajesh Kumar",    "description": "Cloud infrastructure services",           "timestamp": _dt(18)},
    {"invoice_id": "INV-029", "vendor_id": "VEN-002", "amount": 310000, "bank_account": "XXXX5678", "ifsc": "ICIC0005678", "approver": "Mohit Verma",     "description": "Bulk freight handling Q3",                "timestamp": _dt(13)},
    {"invoice_id": "INV-030", "vendor_id": "VEN-003", "amount": 71000,  "bank_account": "XXXX9012", "ifsc": "AXIS0009012", "approver": "Sanjay Mehta",    "description": "Brand consulting services",               "timestamp": _dt(9)},
    {"invoice_id": "INV-031", "vendor_id": "VEN-004", "amount": 93000,  "bank_account": "XXXX3456", "ifsc": "SBIN0003456", "approver": "Deepa Nair",      "description": "Printer and copier supplies",             "timestamp": _dt(24)},
    {"invoice_id": "INV-032", "vendor_id": "VEN-005", "amount": 195000, "bank_account": "XXXX7890", "ifsc": "KOTAK0007890", "approver": "Vikram Joshi",   "description": "Risk assessment consulting",              "timestamp": _dt(15)},
    {"invoice_id": "INV-033", "vendor_id": "VEN-001", "amount": 88000,  "bank_account": "XXXX1234", "ifsc": "HDFC0001234", "approver": "Priya Sharma",    "description": "Cybersecurity assessment Q4",             "timestamp": _dt(20)},
    {"invoice_id": "INV-034", "vendor_id": "VEN-002", "amount": 445000, "bank_account": "XXXX5678", "ifsc": "ICIC0005678", "approver": "Anita Singh",     "description": "International logistics November",        "timestamp": _dt(10)},
    {"invoice_id": "INV-035", "vendor_id": "VEN-003", "amount": 28000,  "bank_account": "XXXX9012", "ifsc": "AXIS0009012", "approver": "Sanjay Mehta",    "description": "Email marketing campaign batch",          "timestamp": _dt(7)},
    {"invoice_id": "INV-036", "vendor_id": "VEN-004", "amount": 122000, "bank_account": "XXXX3456", "ifsc": "SBIN0003456", "approver": "Kiran Rao",       "description": "Data center cooling equipment",           "timestamp": _dt(3)},
    {"invoice_id": "INV-037", "vendor_id": "VEN-005", "amount": 165000, "bank_account": "XXXX7890", "ifsc": "KOTAK0007890", "approver": "Neha Patel",     "description": "Financial analysis consulting",           "timestamp": _dt(6)},

    # ── MEDIUM risk invoices (single suspicious flag) ─────────────────────
    {"invoice_id": "INV-038", "vendor_id": "VEN-001", "amount": 310000, "bank_account": "XXXX1234", "ifsc": "HDFC0001234", "approver": "Rajesh Kumar",    "description": "Large one-time infrastructure project",   "timestamp": _dt(2)},  # amount above range
    {"invoice_id": "INV-039", "vendor_id": "VEN-003", "amount": 55000,  "bank_account": "XXXX9012", "ifsc": "AXIS0009012", "approver": "External Auditor","description": "Audit services November 2024",            "timestamp": _dt(4)},  # unrecognized approver
    {"invoice_id": "INV-040", "vendor_id": "VEN-004", "amount": 145000, "bank_account": "XXXX3456", "ifsc": "SBIN0003456", "approver": "Deepa Nair",      "description": "IT refresh - urgent please process by EOD","timestamp": _dt(1)},  # urgency language

    # ── More clean invoices to reach 50 ──────────────────────────────────
    {"invoice_id": "INV-041", "vendor_id": "VEN-001", "amount": 95000,  "bank_account": "XXXX1234", "ifsc": "HDFC0001234", "approver": "Priya Sharma",    "description": "Data backup services Q4",                 "timestamp": _dt(8)},
    {"invoice_id": "INV-042", "vendor_id": "VEN-002", "amount": 285000, "bank_account": "XXXX5678", "ifsc": "ICIC0005678", "approver": "Mohit Verma",     "description": "Reverse logistics services",              "timestamp": _dt(11)},
    {"invoice_id": "INV-043", "vendor_id": "VEN-003", "amount": 49000,  "bank_account": "XXXX9012", "ifsc": "AXIS0009012", "approver": "Sanjay Mehta",    "description": "Influencer marketing campaign",           "timestamp": _dt(16)},
    {"invoice_id": "INV-044", "vendor_id": "VEN-004", "amount": 78000,  "bank_account": "XXXX3456", "ifsc": "SBIN0003456", "approver": "Kiran Rao",       "description": "Office furniture procurement",            "timestamp": _dt(22)},
    {"invoice_id": "INV-045", "vendor_id": "VEN-005", "amount": 220000, "bank_account": "XXXX7890", "ifsc": "KOTAK0007890", "approver": "Vikram Joshi",   "description": "Compliance consulting services",          "timestamp": _dt(28)},
    {"invoice_id": "INV-046", "vendor_id": "VEN-001", "amount": 145000, "bank_account": "XXXX1234", "ifsc": "HDFC0001234", "approver": "Rajesh Kumar",    "description": "Firewall and security services",          "timestamp": _dt(19)},
    {"invoice_id": "INV-047", "vendor_id": "VEN-002", "amount": 370000, "bank_account": "XXXX5678", "ifsc": "ICIC0005678", "approver": "Anita Singh",     "description": "Supply chain management Q4",              "timestamp": _dt(14)},
    {"invoice_id": "INV-048", "vendor_id": "VEN-003", "amount": 63000,  "bank_account": "XXXX9012", "ifsc": "AXIS0009012", "approver": "Sanjay Mehta",    "description": "PR campaign management October",          "timestamp": _dt(9)},
    {"invoice_id": "INV-049", "vendor_id": "VEN-004", "amount": 108000, "bank_account": "XXXX3456", "ifsc": "SBIN0003456", "approver": "Deepa Nair",      "description": "Cloud storage solutions",                 "timestamp": _dt(5)},
    {"invoice_id": "INV-050", "vendor_id": "VEN-005", "amount": 255000, "bank_account": "XXXX7890", "ifsc": "KOTAK0007890", "approver": "Neha Patel",     "description": "Strategy & operations consulting",        "timestamp": _dt(2)},
]

# Payment history (used for anomaly detection)
PAYMENT_HISTORY = [
    {"vendor_id": "VEN-001", "invoice_id": "INV-H001", "amount": 120000, "bank_account": "XXXX1234", "ifsc": "HDFC0001234"},
    {"vendor_id": "VEN-001", "invoice_id": "INV-H002", "amount": 95000,  "bank_account": "XXXX1234", "ifsc": "HDFC0001234"},
    {"vendor_id": "VEN-001", "invoice_id": "INV-H003", "amount": 175000, "bank_account": "XXXX1234", "ifsc": "HDFC0001234"},
    {"vendor_id": "VEN-002", "invoice_id": "INV-H004", "amount": 280000, "bank_account": "XXXX5678", "ifsc": "ICIC0005678"},
    {"vendor_id": "VEN-002", "invoice_id": "INV-H005", "amount": 350000, "bank_account": "XXXX5678", "ifsc": "ICIC0005678"},
    {"vendor_id": "VEN-003", "invoice_id": "INV-H006", "amount": 48000,  "bank_account": "XXXX9012", "ifsc": "AXIS0009012"},
    {"vendor_id": "VEN-003", "invoice_id": "INV-H007", "amount": 55000,  "bank_account": "XXXX9012", "ifsc": "AXIS0009012"},
    {"vendor_id": "VEN-004", "invoice_id": "INV-H008", "amount": 85000,  "bank_account": "XXXX3456", "ifsc": "SBIN0003456"},
    {"vendor_id": "VEN-004", "invoice_id": "INV-H009", "amount": 110000, "bank_account": "XXXX3456", "ifsc": "SBIN0003456"},
    {"vendor_id": "VEN-005", "invoice_id": "INV-H010", "amount": 190000, "bank_account": "XXXX7890", "ifsc": "KOTAK0007890"},
    {"vendor_id": "VEN-005", "invoice_id": "INV-H011", "amount": 225000, "bank_account": "XXXX7890", "ifsc": "KOTAK0007890"},
]


def seed_database(db) -> None:
    """Populate the database with demo data if empty."""
    from app.models.database import Vendor as VendorModel, PaymentHistory as PhModel

    if db.query(VendorModel).count() > 0:
        return  # already seeded

    # Insert vendors
    for v in VENDORS:
        vendor = VendorModel(**v)
        db.add(vendor)

    # Insert payment history
    for ph in PAYMENT_HISTORY:
        record = PhModel(**ph)
        db.add(record)

    db.commit()
    print("[OK] Database seeded with demo vendors and payment history.")
