/**
 * AP Sentinel API Client
 * Single source of truth for all backend calls.
 * Base URL set via VITE_API_BASE_URL env var.
 */
import axios, { AxiosError } from 'axios';
import type {
  BatchResult, FraudCaseSummary, FraudCaseDetail,
  VerificationCallDetail, DecisionDetail, VendorProfile,
  AuditEvent, MetricsResponse,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Global error interceptor — surfaces structured errors to the frontend
api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    const detail = (error.response?.data as Record<string, string>)?.detail || error.message;
    const code = (error.response?.data as Record<string, string>)?.code || 'UNKNOWN_ERROR';
    return Promise.reject({ error: detail, code, status: error.response?.status });
  }
);

// ── Invoice APIs ──────────────────────────────────────────────────────────────

export async function uploadBatch(file: File): Promise<BatchResult> {
  const form = new FormData();
  form.append('file', file);
  const res = await api.post<BatchResult>('/invoices/batch', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function uploadDemoBatch(): Promise<BatchResult> {
  // POST with no body → uses demo data
  const res = await api.post<BatchResult>('/invoices/batch');
  return res.data;
}

// ── Cases APIs ────────────────────────────────────────────────────────────────

export async function listCases(filters?: {
  status?: string;
  risk_level?: string;
}): Promise<FraudCaseSummary[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.risk_level) params.append('risk_level', filters.risk_level);
  const res = await api.get<FraudCaseSummary[]>(`/cases?${params}`);
  return res.data;
}

export async function getCase(caseId: string): Promise<FraudCaseDetail> {
  const res = await api.get<FraudCaseDetail>(`/cases/${caseId}`);
  return res.data;
}

export async function verifyCase(caseId: string): Promise<VerificationCallDetail> {
  const res = await api.post<VerificationCallDetail>(`/cases/${caseId}/verify`);
  return res.data;
}

export async function approveCase(
  caseId: string,
  reviewer: string,
  notes?: string
): Promise<DecisionDetail> {
  const res = await api.post<DecisionDetail>(`/cases/${caseId}/approve`, {
    reviewer,
    notes,
  });
  return res.data;
}

export async function rejectCase(
  caseId: string,
  reviewer: string,
  notes?: string
): Promise<DecisionDetail> {
  const res = await api.post<DecisionDetail>(`/cases/${caseId}/reject`, {
    reviewer,
    notes,
  });
  return res.data;
}

// ── Verification APIs ─────────────────────────────────────────────────────────

export async function getVerification(callId: string): Promise<VerificationCallDetail> {
  const res = await api.get<VerificationCallDetail>(`/verification/${callId}`);
  return res.data;
}

// ── Vendor APIs ───────────────────────────────────────────────────────────────

export async function listVendors(): Promise<VendorProfile[]> {
  const res = await api.get<VendorProfile[]>('/vendors');
  return res.data;
}

export async function getVendor(vendorId: string): Promise<VendorProfile> {
  const res = await api.get<VendorProfile>(`/vendors/${vendorId}`);
  return res.data;
}

// ── Audit APIs ────────────────────────────────────────────────────────────────

export async function getAuditTrail(caseId: string): Promise<AuditEvent[]> {
  const res = await api.get<AuditEvent[]>(`/audit/${caseId}`);
  return res.data;
}

// ── Metrics & Health ──────────────────────────────────────────────────────────

export async function getMetrics(): Promise<MetricsResponse> {
  const res = await api.get<MetricsResponse>('/metrics');
  return res.data;
}

export async function getHealth(): Promise<{ status: string; calling_mode: string }> {
  const res = await api.get('/health');
  return res.data;
}
