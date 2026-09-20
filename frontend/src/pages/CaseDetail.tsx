import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getCase } from '../api/client';
import type { FraudCaseDetail } from '../types';
import { RiskBadge, StatusPill, Spinner, ErrorState } from '../components/StatusBadges';

export default function CaseDetail() {
  const { caseId } = useParams<{ caseId: string }>();
  const [caseData, setCaseData] = useState<FraudCaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const load = async () => {
    if (!caseId) return;
    setLoading(true);
    try {
      const data = await getCase(caseId);
      setCaseData(data);
    } catch (e: unknown) {
      const err = e as { error?: string };
      setError(err?.error || 'Case not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [caseId]);

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  if (error) return <ErrorState error={error} onRetry={load} />;
  if (!caseData) return null;

  const c = caseData;

  return (
    <main className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-8 pb-32 md:pb-8 flex flex-col gap-6">
      {/* Back */}
      <button onClick={() => navigate('/cases')} className="flex items-center gap-2 text-on-surface-variant hover:text-primary font-label-caps text-label-caps transition-colors w-fit">
        <span className="material-symbols-outlined text-sm">arrow_back</span>
        BACK TO CASES
      </button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-outline-variant pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2 text-error font-label-caps text-label-caps">
            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
            {c.risk_level} FRAUD ALERT
          </div>
          <h1 className="font-display-lg text-display-lg text-on-background">{c.vendor_name}</h1>
          <p className="font-mono-data text-[12px] text-on-surface-variant mt-1">CASE ID: {c.case_id}</p>
        </div>
        <div className="flex items-center gap-3">
          <RiskBadge level={c.risk_level} />
          <StatusPill status={c.payment_status} />
        </div>
      </div>

      {/* Bento Evidence Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Risk panel */}
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-6 flex flex-col gap-4">
          <h3 className="font-label-caps text-label-caps text-on-surface-variant border-b border-outline-variant pb-2">RISK ASSESSMENT</h3>
          <div className="flex justify-between items-end">
            <div className="flex flex-col">
              <span className="font-body-sm text-body-sm text-on-surface-variant">Risk Score</span>
              <span className={`font-headline-lg text-headline-lg font-bold ${
                c.risk_score >= 80 ? 'text-error' : c.risk_score >= 60 ? 'text-orange-400' : 'text-tertiary'
              }`}>{c.risk_score}/100</span>
            </div>
            {c.ai_confidence !== null && c.ai_confidence !== undefined && (
              <div className="flex flex-col items-end">
                <span className="font-body-sm text-body-sm text-on-surface-variant">AI Confidence</span>
                <span className="font-headline-md text-headline-md text-on-background">{Math.round(c.ai_confidence * 100)}%</span>
              </div>
            )}
          </div>
        </div>

        {/* Transaction details */}
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-6 flex flex-col gap-4">
          <h3 className="font-label-caps text-label-caps text-on-surface-variant border-b border-outline-variant pb-2">TRANSACTION DETAILS</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <span className="font-label-caps text-label-caps text-on-surface-variant">AMOUNT</span>
              <span className="font-mono-data text-[14px] text-on-background">₹{c.amount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-label-caps text-label-caps text-on-surface-variant">INVOICE ID</span>
              <span className="font-mono-data text-[12px] text-on-background">{c.invoice_id}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-label-caps text-label-caps text-on-surface-variant">BANK ACCOUNT</span>
              <span className="font-mono-data text-[14px] text-error">{c.bank_account}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-label-caps text-label-caps text-on-surface-variant">IFSC</span>
              <span className="font-mono-data text-[14px] text-on-background">{c.ifsc}</span>
            </div>
          </div>
        </div>

        {/* Fraud flags */}
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-6 flex flex-col gap-4">
          <h3 className="font-label-caps text-label-caps text-on-surface-variant border-b border-outline-variant pb-2">
            FRAUD FLAGS ({c.fraud_flags.length})
          </h3>
          <div className="flex flex-col gap-2">
            {c.fraud_flags.map((flag, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="material-symbols-outlined text-error text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>flag</span>
                <span className="font-mono-data text-[12px] text-error">{flag}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Reasoning */}
        {c.ai_reasoning && c.ai_reasoning.length > 0 && (
          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-6 flex flex-col gap-4">
            <h3 className="font-label-caps text-label-caps text-on-surface-variant border-b border-outline-variant pb-2">AI REASONING</h3>
            <div className="flex flex-col gap-2">
              {c.ai_reasoning.map((reason, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-primary text-sm mt-0.5">psychology</span>
                  <span className="font-body-sm text-body-sm text-on-background">{reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {c.description && (
          <div className="md:col-span-2 bg-error-container/10 border border-error/30 rounded-xl p-6">
            <h3 className="font-label-caps text-label-caps text-error mb-2">SUSPICIOUS DESCRIPTION</h3>
            <p className="font-body-sm text-body-sm text-on-background italic">"{c.description}"</p>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="p-4 border border-outline-variant rounded-lg bg-surface-container-low flex items-start gap-3">
        <span className="material-symbols-outlined text-primary mt-0.5">info</span>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          The final payment release always requires a human. Review evidence thoroughly before making a decision.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          to={`/invoices/${c.case_id}/vendor`}
          className="flex items-center justify-center gap-2 bg-surface-container-high border border-outline text-on-background font-label-caps text-label-caps px-6 py-3 rounded hover:bg-surface-bright transition-all"
        >
          <span className="material-symbols-outlined text-sm">store</span>
          VIEW TRUSTED VENDOR PROFILE
        </Link>

        {c.payment_status === 'HELD' && !c.verification_call && (
          <Link
            to={`/invoices/${c.case_id}/verify`}
            className="flex items-center justify-center gap-2 bg-primary-container border border-primary text-on-primary-container font-label-caps text-label-caps px-6 py-3 rounded hover:bg-primary hover:text-on-primary transition-all"
          >
            <span className="material-symbols-outlined text-sm">phone_in_talk</span>
            VERIFY VENDOR
          </Link>
        )}

        {c.verification_call?.status === 'COMPLETED' && c.payment_status === 'HELD' && (
          <Link
            to={`/invoices/${c.case_id}/decide`}
            className="flex items-center justify-center gap-2 bg-error-container border border-error text-on-error-container font-label-caps text-label-caps px-6 py-3 rounded hover:opacity-90 transition-all"
          >
            <span className="material-symbols-outlined text-sm">gavel</span>
            HUMAN DECISION REQUIRED
          </Link>
        )}

        <Link
          to={`/audit/${c.case_id}`}
          className="flex items-center justify-center gap-2 bg-surface-container-high border border-outline text-on-background font-label-caps text-label-caps px-6 py-3 rounded hover:bg-surface-bright transition-all"
        >
          <span className="material-symbols-outlined text-sm">history</span>
          AUDIT TRAIL
        </Link>
      </div>
    </main>
  );
}
