// AP Payment Fraud Sentinel — TypeScript type definitions
// These must match the backend enums exactly to avoid string-matching bugs

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type PaymentStatus = 'PENDING' | 'CLEARED' | 'HELD' | 'RELEASE_APPROVED' | 'REJECTED';
export type VerificationStatus = 'NOT_STARTED' | 'QUEUED' | 'CALLING' | 'CONNECTED' | 'COMPLETED' | 'FAILED';
export type VerificationOutcome = 'CONFIRMED' | 'CONTRADICTED' | 'INCONCLUSIVE' | 'NO_ANSWER' | 'FAILED';
export type DecisionType = 'APPROVE' | 'REJECT' | 'HOLD';
export type AuditEventType =
  | 'INVOICE_RECEIVED'
  | 'RISK_ASSESSED'
  | 'PAYMENT_HELD'
  | 'PAYMENT_CLEARED'
  | 'VERIFICATION_STARTED'
  | 'VERIFICATION_COMPLETED'
  | 'VERIFICATION_FAILED'
  | 'HUMAN_APPROVED'
  | 'HUMAN_REJECTED'
  | 'AI_ANALYSIS_COMPLETED'
  | 'ERROR';

export interface InvoiceResult {
  invoice_id: string;
  vendor_id: string;
  vendor_name: string | null;
  amount: number;
  bank_account: string;
  ifsc: string;
  approver: string | null;
  description: string | null;
  timestamp: string | null;
  risk_score: number | null;
  risk_level: RiskLevel | null;
  payment_status: PaymentStatus;
  fraud_flags: string[];
  case_id: string | null;
}

export interface BatchResult {
  batch_id: string;
  total: number;
  processed: number;
  low_risk: number;
  medium_risk: number;
  high_risk: number;
  critical: number;
  held: number;
  cleared: number;
  verification_required: number;
  verification_completed: number;
  human_review_required: number;
  invoices: InvoiceResult[];
}

export interface FraudCaseSummary {
  case_id: string;
  invoice_id: string;
  vendor_id: string;
  vendor_name: string | null;
  amount: number;
  risk_score: number;
  risk_level: RiskLevel;
  payment_status: PaymentStatus;
  verification_required: boolean;
  ai_confidence: number | null;
  created_at: string;
  updated_at: string;
}

export interface VerificationCallDetail {
  call_id: string;
  case_id: string;
  phone_number: string;
  calling_mode: string;
  status: VerificationStatus;
  outcome: VerificationOutcome | null;
  transcript: string | null;
  ai_summary: string | null;
  confidence: number | null;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
}

export interface DecisionDetail {
  decision_id: string;
  case_id: string;
  decision_type: DecisionType;
  reviewer: string;
  notes: string | null;
  decided_at: string;
}

export interface FraudCaseDetail extends FraudCaseSummary {
  fraud_flags: string[];
  ai_reasoning: string[];
  bank_account: string;
  ifsc: string;
  approver: string | null;
  description: string | null;
  verification_call: VerificationCallDetail | null;
  latest_decision: DecisionDetail | null;
}

export interface VendorProfile {
  vendor_id: string;
  vendor_name: string;
  known_phone: string | null;
  known_bank_account: string;
  known_ifsc: string;
  known_email: string | null;
  usual_invoice_min: number;
  usual_invoice_max: number;
  known_approvers: string[];
  recent_payments: Array<{
    invoice_id: string;
    amount: number;
    status: string;
    paid_at: string | null;
  }>;
}

export interface AuditEvent {
  id: number;
  case_id: string | null;
  invoice_id: string | null;
  event_type: AuditEventType;
  description: string;
  event_metadata: Record<string, unknown>;
  occurred_at: string;
}

export interface MetricsResponse {
  total_invoices: number;
  total_cases: number;
  cases_held: number;
  cases_cleared: number;
  cases_rejected: number;
  verification_calls_made: number;
  human_approvals: number;
  human_rejections: number;
  avg_risk_score: number;
  cost_estimate: Record<string, unknown>;
}

export interface ApiError {
  error: string;
  code: string;
  detail?: string;
}
