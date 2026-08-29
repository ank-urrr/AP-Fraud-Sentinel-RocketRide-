import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getCase } from '../api/client';
import type { FraudCaseDetail } from '../types';
import { RiskBadge, StatusPill, Spinner, ErrorState, formatUsd } from '../components/StatusBadges';

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
    <main className="flex-grow w-full max-w-container-max mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8 pb-32 md:pb-8 flex flex-col gap-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/cases')}
        className="inline-flex items-center gap-2 text-xs font-mono text-[#9CA3AF] hover:text-[#F5F5F5] transition-colors w-fit group"
      >
        <span className="material-symbols-outlined text-sm group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
        <span>BACK TO CASES</span>
      </button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-red-500/30 bg-red-500/10 text-red-400 font-mono text-[11px] font-semibold uppercase tracking-wider w-fit">
            <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
            <span>{c.risk_level} FRAUD ALERT</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#F5F5F5]">
            {c.vendor_name}
          </h1>
          <p className="font-mono text-xs text-[#9CA3AF]">
            CASE ID: <span className="text-primary font-medium tracking-wider">{c.case_id}</span>
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <RiskBadge level={c.risk_level} />
          <StatusPill status={c.payment_status} />
        </div>
      </div>

      {/* Bento Evidence Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {/* Risk Panel */}
        <div className="rounded-2xl bg-[#050c1a] border border-white/10 p-6 flex flex-col justify-between gap-4 shadow-lg hover:border-white/20 transition-all">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-[#E5E7EB]">RISK ASSESSMENT</h3>
            <span className="material-symbols-outlined text-sm text-[#9CA3AF]">analytics</span>
          </div>
          <div className="flex justify-between items-end pt-2">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-[#9CA3AF]">Risk Severity Score</span>
              <span className={`text-4xl sm:text-5xl font-mono font-bold tracking-tight ${
                c.risk_score >= 80 ? 'text-red-400' : c.risk_score >= 60 ? 'text-orange-400' : 'text-amber-300'
              }`}>
                {c.risk_score}<span className="text-base sm:text-lg text-[#9CA3AF]/60 font-normal">/100</span>
              </span>
            </div>
            {c.ai_confidence !== null && c.ai_confidence !== undefined && (
              <div className="flex flex-col items-end gap-1">
                <span className="text-xs text-[#9CA3AF]">AI Confidence</span>
                <span className="text-2xl sm:text-3xl font-mono font-bold text-[#F5F5F5]">
                  {Math.round(c.ai_confidence * 100)}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Transaction Details */}
        <div className="rounded-2xl bg-[#050c1a] border border-white/10 p-6 flex flex-col gap-4 shadow-lg hover:border-white/20 transition-all">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-[#E5E7EB]">TRANSACTION DETAILS</h3>
            <span className="material-symbols-outlined text-sm text-[#9CA3AF]">receipt</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#9CA3AF]">AMOUNT</span>
              <span className="font-mono text-sm sm:text-base font-semibold text-[#F5F5F5]">
                {formatUsd(c.amount)}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#9CA3AF]">INVOICE ID</span>
              <span className="font-mono text-xs sm:text-sm text-[#F5F5F5]">{c.invoice_id}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#9CA3AF]">BANK ACCOUNT</span>
              <span className="font-mono text-xs sm:text-sm font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-md w-fit">
                {c.bank_account}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#9CA3AF]">IFSC</span>
              <span className="font-mono text-xs sm:text-sm text-[#F5F5F5]">{c.ifsc}</span>
            </div>
          </div>
        </div>

        {/* Fraud Flags */}
        <div className="rounded-2xl bg-[#050c1a] border border-white/10 p-6 flex flex-col gap-4 shadow-lg hover:border-white/20 transition-all">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-[#E5E7EB]">
              FRAUD FLAGS ({c.fraud_flags.length})
            </h3>
            <span className="material-symbols-outlined text-sm text-red-400">flag</span>
          </div>
          <div className="flex flex-col gap-2.5 pt-1">
            {c.fraud_flags.map((flag, i) => (
              <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-red-500/[0.04] border border-red-500/20 text-red-400 font-mono text-xs">
                <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>flag</span>
                <span className="font-semibold">{flag}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Reasoning */}
        {c.ai_reasoning && c.ai_reasoning.length > 0 && (
          <div className="rounded-2xl bg-[#050c1a] border border-white/10 p-6 flex flex-col gap-4 shadow-lg hover:border-white/20 transition-all">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-[#E5E7EB]">AI REASONING</h3>
              <span className="material-symbols-outlined text-sm text-primary">psychology</span>
            </div>
            <div className="flex flex-col gap-2.5 pt-1">
              {c.ai_reasoning.map((reason, i) => (
                <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-[#E5E7EB] text-xs sm:text-sm leading-relaxed">
                  <span className="material-symbols-outlined text-primary text-base mt-0.5">check</span>
                  <span>{reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {c.description && (
          <div className="md:col-span-2 rounded-2xl bg-red-500/[0.03] border border-red-500/25 p-6 shadow-lg">
            <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-red-400 mb-2">
              SUSPICIOUS DESCRIPTION
            </h3>
            <p className="text-sm sm:text-base text-[#F5F5F5]/90 italic leading-relaxed">
              "{c.description}"
            </p>
          </div>
        )}
      </div>

      {/* Disclaimer / Info Banner */}
      <div className="p-4 sm:p-5 border border-white/10 rounded-2xl bg-white/[0.02] flex items-start gap-3 text-xs sm:text-sm text-[#9CA3AF] shadow-sm">
        <span className="material-symbols-outlined text-primary text-lg mt-0.5">info</span>
        <p className="leading-relaxed">
          The final payment release always requires a human. Review evidence thoroughly before making a decision.
        </p>
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-1">
        <Link
          to={`/invoices/${c.case_id}/vendor`}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white/[0.03] border border-white/15 hover:bg-white/[0.08] hover:border-white/25 text-[#E5E7EB] font-mono text-xs font-semibold tracking-wider transition-all duration-200 min-h-[44px]"
        >
          <span className="material-symbols-outlined text-sm">store</span>
          <span>VIEW TRUSTED VENDOR PROFILE</span>
        </Link>

        {c.payment_status === 'HELD' && !c.verification_call && (
          <Link
            to={`/invoices/${c.case_id}/verify`}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#F5F5F5] text-[#0A0D14] hover:bg-white font-mono text-xs font-bold tracking-wider shadow-[0_0_16px_rgba(255,255,255,0.2)] transition-all duration-200 min-h-[44px]"
          >
            <span className="material-symbols-outlined text-sm">phone_in_talk</span>
            <span>VERIFY VENDOR</span>
          </Link>
        )}

        {c.verification_call?.status === 'COMPLETED' && c.payment_status === 'HELD' && (
          <Link
            to={`/invoices/${c.case_id}/decide`}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-red-500 text-white hover:bg-red-600 font-mono text-xs font-bold tracking-wider shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:shadow-[0_0_28px_rgba(239,68,68,0.6)] transition-all duration-200 min-h-[44px]"
          >
            <span className="material-symbols-outlined text-sm">gavel</span>
            <span>HUMAN DECISION REQUIRED</span>
          </Link>
        )}

        <Link
          to={`/audit/${c.case_id}`}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white/[0.03] border border-white/15 hover:bg-white/[0.08] hover:border-white/25 text-[#E5E7EB] font-mono text-xs font-semibold tracking-wider transition-all duration-200 min-h-[44px]"
        >
          <span className="material-symbols-outlined text-sm">history</span>
          <span>AUDIT TRAIL</span>
        </Link>
      </div>
    </main>
  );
}
