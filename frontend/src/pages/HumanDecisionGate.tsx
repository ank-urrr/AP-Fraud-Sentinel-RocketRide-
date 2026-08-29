import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCase, approveCase, rejectCase } from '../api/client';
import type { FraudCaseDetail } from '../types';
import { Spinner, ErrorState, formatUsd } from '../components/StatusBadges';

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
    <main className="flex-1 flex flex-col md:flex-row w-full max-w-container-max mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8 pb-32 md:pb-8 gap-6">
      {/* Left: Evidence */}
      <section className="flex-1 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          {!isAlreadyDecided && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-red-500/30 bg-red-500/10 text-red-400 font-mono text-[11px] font-semibold uppercase tracking-wider w-fit">
              <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
              <span>{c.risk_level} FRAUD ALERT</span>
            </div>
          )}
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#F5F5F5]">{c.vendor_name}</h2>
          <p className="font-mono text-xs text-[#9CA3AF]">
            CASE ID: <span className="text-primary font-medium tracking-wider">{c.case_id}</span>
          </p>
        </div>

        {/* Bento evidence */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {/* Risk */}
          <div className="bg-[#050c1a] border border-white/10 p-6 rounded-2xl flex flex-col gap-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-[#E5E7EB]">RISK ASSESSMENT</h3>
              <span className="material-symbols-outlined text-sm text-[#9CA3AF]">analytics</span>
            </div>
            <div className="flex justify-between items-end pt-1">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-[#9CA3AF]">AI Confidence / Severity</span>
                <p className={`text-3xl sm:text-4xl font-mono font-bold tracking-tight ${c.risk_score >= 80 ? 'text-red-400' : 'text-amber-300'}`}>
                  {c.ai_confidence ? `${Math.round(c.ai_confidence * 100)}%` : `${c.risk_score}/100`}
                </p>
              </div>
              <div className={`${c.risk_score >= 80 ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-300'} border px-3 py-1 rounded-full font-mono text-xs font-semibold flex items-center gap-1.5`}>
                <span className="material-symbols-outlined text-sm">block</span>
                <span>{c.risk_level}</span>
              </div>
            </div>
          </div>

          {/* Verification call result */}
          {call && (
            <div className="bg-[#050c1a] border border-white/10 p-6 rounded-2xl flex flex-col gap-4 shadow-lg">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-[#E5E7EB]">VERIFICATION CALL</h3>
                <span className="material-symbols-outlined text-sm text-primary">phone_in_talk</span>
              </div>
              <div className="flex flex-col gap-2 pt-1">
                <div className={`flex items-center gap-2 ${call.outcome === 'CONTRADICTED' ? 'text-red-400' : call.outcome === 'CONFIRMED' ? 'text-emerald-400' : 'text-amber-300'}`}>
                  <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>record_voice_over</span>
                  <span className="text-lg font-mono font-bold uppercase">{call.outcome}</span>
                </div>
                <p className="text-xs sm:text-sm text-[#9CA3AF] leading-relaxed">{call.ai_summary}</p>
              </div>
            </div>
          )}

          {/* Transaction details */}
          <div className="bg-[#050c1a] border border-white/10 p-6 rounded-2xl flex flex-col gap-4 shadow-lg md:col-span-2">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-[#E5E7EB]">TRANSACTION DETAILS</h3>
              <span className="material-symbols-outlined text-sm text-[#9CA3AF]">receipt</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-1">
              <div className="flex flex-col gap-1">
                <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-wider text-[#9CA3AF]">AMOUNT</span>
                <span className="font-mono text-sm sm:text-base font-semibold text-[#F5F5F5]">{formatUsd(c.amount)}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-wider text-[#9CA3AF]">INVOICE ID</span>
                <span className="font-mono text-xs sm:text-sm text-[#F5F5F5]">{c.invoice_id}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-wider text-[#9CA3AF]">KNOWN ROUTING</span>
                <span className="font-mono text-xs sm:text-sm text-[#F5F5F5]">From vendor record</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-wider text-red-400 font-semibold">REQUESTED ROUTING</span>
                <span className="font-mono text-xs sm:text-sm font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded w-fit">{c.bank_account}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Fraud flags */}
        <div className="flex flex-wrap gap-2">
          {c.fraud_flags.map((f, i) => (
            <span key={i} className="font-mono text-xs font-semibold border border-red-500/30 bg-red-500/10 text-red-400 px-3 py-1 rounded-full flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>flag</span>
              <span>{f.split(':')[0]}</span>
            </span>
          ))}
        </div>

        <div className="p-4 sm:p-5 border border-white/10 rounded-2xl bg-white/[0.02] flex items-start gap-3 shadow-sm">
          <span className="material-symbols-outlined text-primary text-lg mt-0.5">info</span>
          <p className="text-xs sm:text-sm text-[#9CA3AF] leading-relaxed">
            The final payment release always requires a human. Review evidence thoroughly before overriding AI recommendation.
          </p>
        </div>
      </section>

      {/* Right: Decision Gateway */}
      <section className="w-full md:w-96 bg-[#050c1a] border border-white/10 p-6 rounded-2xl flex flex-col justify-between shadow-xl">
        {isAlreadyDecided ? (
          <div className="flex flex-col gap-5">
            <h2 className="text-lg font-bold text-[#F5F5F5] border-b border-white/[0.08] pb-4">Decision Recorded</h2>
            <div className={`p-4 rounded-xl border flex items-center gap-3 ${
              c.payment_status === 'RELEASE_APPROVED' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
              <span className="material-symbols-outlined text-xl">{c.payment_status === 'RELEASE_APPROVED' ? 'task_alt' : 'cancel'}</span>
              <span className="font-mono text-sm font-bold uppercase tracking-wider">
                {c.payment_status === 'RELEASE_APPROVED' ? 'PAYMENT APPROVED' : 'PAYMENT REJECTED'}
              </span>
            </div>
            {c.latest_decision && (
              <div className="flex flex-col gap-1.5 text-xs text-[#9CA3AF]">
                <span>Reviewed by: <strong className="text-[#F5F5F5] font-mono">{c.latest_decision.reviewer}</strong></span>
                {c.latest_decision.notes && <span>Notes: <span className="text-[#E5E7EB]">{c.latest_decision.notes}</span></span>}
              </div>
            )}
            <button
              onClick={() => navigate(`/audit/${caseId}`)}
              className="w-full bg-white/[0.03] border border-white/15 text-[#E5E7EB] hover:bg-white/[0.08] font-mono text-xs font-semibold tracking-wider py-3 rounded-full flex justify-center items-center gap-2 transition-all min-h-[44px]"
            >
              <span className="material-symbols-outlined text-sm">history</span>
              <span>VIEW AUDIT TRAIL</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 mb-2">
              <h2 className="text-lg font-bold text-[#F5F5F5] border-b border-white/[0.08] pb-3">Decision Gateway</h2>
              {c.ai_reasoning && c.ai_reasoning.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#9CA3AF]">AI RECOMMENDATION</span>
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2.5 text-red-400 font-mono text-xs font-bold">
                    <span className="material-symbols-outlined text-base">gavel</span>
                    <span>REJECT AND BLOCK PAYMENT</span>
                  </div>
                </div>
              )}
            </div>

            {/* Reviewer input */}
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] uppercase tracking-wider text-[#9CA3AF]">REVIEWER NAME *</label>
              <input
                type="text"
                value={reviewer}
                onChange={(e) => setReviewer(e.target.value)}
                placeholder="Finance Director..."
                className="bg-black/30 border border-white/15 text-[#F5F5F5] font-mono text-xs px-3.5 py-2.5 rounded-xl focus:border-primary outline-none transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] uppercase tracking-wider text-[#9CA3AF]">DECISION NOTES</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Reason for decision..."
                rows={3}
                className="bg-black/30 border border-white/15 text-[#F5F5F5] text-xs px-3.5 py-2.5 rounded-xl focus:border-primary outline-none transition-colors resize-none leading-relaxed"
              />
            </div>

            {actionError && (
              <p className="text-red-400 font-mono text-xs">{actionError}</p>
            )}

            <div className="font-mono text-[11px] font-semibold text-red-400 text-center uppercase tracking-wider animate-pulse pt-1">
              HUMAN REVIEW REQUIRED
            </div>

            <button
              onClick={handleReject}
              disabled={submitting}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-mono text-xs font-bold tracking-wider py-3.5 rounded-full flex justify-center items-center gap-2 shadow-[0_0_18px_rgba(239,68,68,0.4)] transition-all disabled:opacity-50 min-h-[44px]"
            >
              <span className="material-symbols-outlined text-base">cancel</span>
              <span>{submitting ? 'PROCESSING...' : 'REJECT PAYMENT'}</span>
            </button>

            <button
              onClick={() => navigate(`/cases/${caseId}`)}
              disabled={submitting}
              className="w-full bg-white/[0.03] border border-white/15 hover:bg-white/[0.08] text-[#E5E7EB] font-mono text-xs font-semibold tracking-wider py-3 rounded-full flex justify-center items-center gap-2 transition-all min-h-[44px]"
            >
              <span className="material-symbols-outlined text-sm">pause</span>
              <span>KEEP ON HOLD</span>
            </button>

            <button
              onClick={handleApprove}
              disabled={submitting}
              className="w-full bg-transparent text-[#9CA3AF] hover:text-[#F5F5F5] font-mono text-xs font-semibold py-2 flex justify-center items-center gap-2 transition-colors opacity-70 hover:opacity-100 disabled:opacity-30"
            >
              <span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span>
              <span>APPROVE RELEASE</span>
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
