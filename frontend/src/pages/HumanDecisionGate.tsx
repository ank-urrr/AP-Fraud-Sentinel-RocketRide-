import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCase, approveCase, rejectCase } from '../api/client';
import type { FraudCaseDetail } from '../types';
import { Spinner, ErrorState } from '../components/StatusBadges';

export default function HumanDecisionGate() {
  const { caseId } = useParams<{ caseId: string }>();
  const [caseData, setCaseData] = useState<FraudCaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewer, setReviewer] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const navigate = useNavigate();

  const load = async () => {
    if (!caseId) return;
    setLoading(true);
    try {
      setCaseData(await getCase(caseId));
    } catch (e: unknown) {
      const err = e as { error?: string };
      setError(err?.error || 'Case not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [caseId]);

  const handleApprove = async () => {
    if (!caseId || !reviewer.trim()) { setActionError('Reviewer name is required'); return; }
    setSubmitting(true);
    setActionError(null);
    try {
      await approveCase(caseId, reviewer, notes || undefined);
      navigate(`/audit/${caseId}`);
    } catch (e: unknown) {
      const err = e as { error?: string };
      setActionError(err?.error || 'Approval failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!caseId || !reviewer.trim()) { setActionError('Reviewer name is required'); return; }
    setSubmitting(true);
    setActionError(null);
    try {
      await rejectCase(caseId, reviewer, notes || undefined);
      navigate(`/audit/${caseId}`);
    } catch (e: unknown) {
      const err = e as { error?: string };
      setActionError(err?.error || 'Rejection failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  if (error) return <ErrorState error={error} onRetry={load} />;
  if (!caseData) return null;

  const c = caseData;
  const call = c.verification_call;
  const isAlreadyDecided = ['RELEASE_APPROVED', 'REJECTED'].includes(c.payment_status);

  return (
    <main className="flex-1 flex flex-col md:flex-row w-full max-w-[1440px] mx-auto overflow-hidden">
      <div className="crt-scan" />

      {/* Left: Evidence */}
      <section className="flex-1 overflow-y-auto p-margin-mobile md:p-gutter flex flex-col gap-6 pb-32 md:pb-gutter">
        <div className="flex flex-col gap-2">
          {!isAlreadyDecided && (
            <div className="inline-flex items-center gap-2 text-error font-label-caps text-label-caps">
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
              {c.risk_level} FRAUD ALERT
            </div>
          )}
          <h2 className="font-display-lg text-display-lg text-on-background">{c.vendor_name}</h2>
          <p className="font-mono-data text-[12px] text-on-surface-variant">CASE ID: {c.case_id}</p>
        </div>

        {/* Bento evidence */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Risk */}
          <div className="bg-surface-container-low/70 backdrop-blur-sm border border-outline-variant/40 p-6 rounded-xl flex flex-col gap-4">
            <h3 className="font-label-caps text-label-caps text-on-surface-variant border-b border-outline-variant pb-2">RISK ASSESSMENT</h3>
            <div className="flex justify-between items-end">
              <div>
                <span className="font-body-sm text-body-sm text-on-surface-variant">AI Confidence</span>
                <p className={`font-headline-lg text-headline-lg ${c.risk_score >= 80 ? 'text-error' : 'text-tertiary'}`}>
                  {c.ai_confidence ? `${Math.round(c.ai_confidence * 100)}%` : `${c.risk_score}/100`}
                </p>
              </div>
              <div className={`${c.risk_score >= 80 ? 'bg-error-container/20 border-error text-error' : 'bg-tertiary-container/20 border-tertiary text-tertiary'} border px-3 py-1 rounded font-label-caps text-label-caps flex items-center gap-2`}>
                <span className="material-symbols-outlined text-sm">block</span>
                {c.risk_level}
              </div>
            </div>
          </div>

          {/* Verification call result */}
          {call && (
            <div className="bg-surface-container-low/70 backdrop-blur-sm border border-outline-variant/40 p-6 rounded-xl flex flex-col gap-4">
              <h3 className="font-label-caps text-label-caps text-on-surface-variant border-b border-outline-variant pb-2">VERIFICATION CALL</h3>
              <div className="flex flex-col gap-2">
                <div className={`flex items-center gap-2 ${call.outcome === 'CONTRADICTED' ? 'text-error' : call.outcome === 'CONFIRMED' ? 'text-green-400' : 'text-tertiary'}`}>
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>record_voice_over</span>
                  <span className="font-headline-md text-headline-md">{call.outcome}</span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant">{call.ai_summary}</p>
              </div>
            </div>
          )}

          {/* Transaction details */}
          <div className="bg-surface-container-low/70 backdrop-blur-sm border border-outline-variant/40 p-6 rounded-xl flex flex-col gap-4 md:col-span-2">
            <h3 className="font-label-caps text-label-caps text-on-surface-variant border-b border-outline-variant pb-2">TRANSACTION DETAILS</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex flex-col gap-1">
                <span className="font-label-caps text-label-caps text-on-surface-variant">AMOUNT</span>
                <span className="font-mono-data text-[14px] text-on-background">₹{c.amount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-label-caps text-label-caps text-on-surface-variant">INVOICE ID</span>
                <span className="font-mono-data text-[12px] text-on-background">{c.invoice_id}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-label-caps text-label-caps text-on-surface-variant">KNOWN ROUTING</span>
                <span className="font-mono-data text-[14px] text-on-background">From vendor record</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-label-caps text-label-caps text-error">REQUESTED ROUTING</span>
                <span className="font-mono-data text-[14px] text-error">{c.bank_account}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Fraud flags */}
        <div className="flex flex-wrap gap-2">
          {c.fraud_flags.map((f, i) => (
            <span key={i} className="font-label-caps text-label-caps text-[10px] border border-error/50 bg-error-container/10 text-error px-2 py-1 rounded">
              {f.split(':')[0]}
            </span>
          ))}
        </div>

        <div className="p-4 border border-outline-variant rounded-lg bg-surface-container-low flex items-start gap-3">
          <span className="material-symbols-outlined text-primary mt-0.5">info</span>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            The final payment release always requires a human. Review evidence thoroughly before overriding AI recommendation.
          </p>
        </div>
      </section>

      {/* Right: Decision Gateway */}
      <section className="w-full md:w-96 bg-surface-container-low border-l border-outline-variant p-margin-mobile md:p-gutter flex flex-col justify-between fixed md:relative bottom-0 left-0 z-40 rounded-t-xl md:rounded-none shadow-[0_-8px_32px_rgba(0,0,0,0.5)] md:shadow-none">
        {isAlreadyDecided ? (
          <div className="flex flex-col gap-4">
            <h2 className="font-headline-md text-headline-md text-on-background border-b border-outline-variant pb-4">Decision Recorded</h2>
            <div className={`p-4 rounded-lg border flex items-center gap-3 ${
              c.payment_status === 'RELEASE_APPROVED' ? 'bg-green-500/10 border-green-500 text-green-400' : 'bg-error-container/20 border-error text-error'
            }`}>
              <span className="material-symbols-outlined">{c.payment_status === 'RELEASE_APPROVED' ? 'task_alt' : 'cancel'}</span>
              <span className="font-body-md text-body-md font-bold">
                {c.payment_status === 'RELEASE_APPROVED' ? 'PAYMENT APPROVED' : 'PAYMENT REJECTED'}
              </span>
            </div>
            {c.latest_decision && (
              <div className="flex flex-col gap-1 font-body-sm text-body-sm text-on-surface-variant">
                <span>Reviewed by: <strong className="text-on-background">{c.latest_decision.reviewer}</strong></span>
                {c.latest_decision.notes && <span>Notes: {c.latest_decision.notes}</span>}
              </div>
            )}
            <button onClick={() => navigate(`/audit/${caseId}`)} className="w-full bg-surface-container-high border border-outline text-on-background font-label-caps text-label-caps py-3 rounded flex justify-center items-center gap-2 hover:bg-surface-bright transition-colors">
              <span className="material-symbols-outlined text-sm">history</span>VIEW AUDIT TRAIL
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="hidden md:flex flex-col gap-6 mb-4">
              <h2 className="font-headline-md text-headline-md text-on-background border-b border-outline-variant pb-4">Decision Gateway</h2>
              {c.ai_reasoning && c.ai_reasoning.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="font-label-caps text-label-caps text-on-surface-variant">AI RECOMMENDATION</span>
                  <div className="p-4 bg-error-container/20 border border-error rounded-lg flex items-center gap-3">
                    <span className="material-symbols-outlined text-error">gavel</span>
                    <span className="font-body-md text-body-md text-error font-bold">REJECT AND BLOCK PAYMENT</span>
                  </div>
                </div>
              )}
            </div>

            {/* Reviewer input */}
            <div className="flex flex-col gap-2">
              <label className="font-label-caps text-label-caps text-on-surface-variant">REVIEWER NAME *</label>
              <input
                type="text"
                value={reviewer}
                onChange={(e) => setReviewer(e.target.value)}
                placeholder="Finance Director..."
                className="bg-background border border-outline-variant text-on-background font-body-sm text-body-sm px-3 py-2 rounded focus:border-primary outline-none transition-colors"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-label-caps text-label-caps text-on-surface-variant">DECISION NOTES</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Reason for decision..."
                rows={3}
                className="bg-background border border-outline-variant text-on-background font-body-sm text-body-sm px-3 py-2 rounded focus:border-primary outline-none transition-colors resize-none"
              />
            </div>

            {actionError && (
              <p className="text-error font-body-sm text-body-sm">{actionError}</p>
            )}

            <h3 className="font-label-caps text-label-caps text-error text-center animate-pulse">HUMAN REVIEW REQUIRED</h3>

            <button
              onClick={handleReject}
              disabled={submitting}
              className="w-full bg-error hover:bg-error/90 text-on-error font-label-caps text-label-caps py-4 rounded-lg flex justify-center items-center gap-2 transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined">cancel</span>
              <span className="font-bold">{submitting ? 'PROCESSING...' : 'REJECT PAYMENT'}</span>
            </button>

            <button
              onClick={() => navigate(`/cases/${caseId}`)}
              disabled={submitting}
              className="w-full bg-transparent border border-outline hover:bg-surface-container-highest text-on-background font-body-md py-3 rounded-lg flex justify-center items-center gap-2 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">pause</span>
              KEEP ON HOLD
            </button>

            <button
              onClick={handleApprove}
              disabled={submitting}
              className="w-full bg-transparent text-on-surface-variant hover:text-on-background font-body-sm py-2 flex justify-center items-center gap-2 transition-colors opacity-60 hover:opacity-100 disabled:opacity-30"
            >
              <span className="material-symbols-outlined text-sm">check_circle</span>
              APPROVE RELEASE
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
