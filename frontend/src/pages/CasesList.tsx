import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listCases } from '../api/client';
import type { FraudCaseSummary } from '../types';
import { RiskBadge, StatusPill, Spinner, EmptyState, ErrorState, formatUsd } from '../components/StatusBadges';

export default function CasesList() {
  const [cases, setCases] = useState<FraudCaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('');
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listCases(filter ? { status: filter } : undefined);
      setCases(data);
    } catch (e: unknown) {
      const err = e as { error?: string };
      setError(err?.error || 'Failed to load cases');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter]);

  return (
    <main className="flex-grow w-full max-w-container-max mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8 pb-32 md:pb-8 flex flex-col gap-6">
      {/* Header & Filter Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-2">
        <div className="flex flex-col gap-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-md shadow-[0_0_15px_rgba(255,255,255,0.03)] w-fit">
            <span className="material-symbols-outlined text-[14px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
              gavel
            </span>
            <span className="font-mono text-[11px] font-medium tracking-wide text-[#E5E7EB] uppercase">
              Fraud Case Management
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#F5F5F5]">
            Fraud Cases
          </h1>
          <p className="text-xs sm:text-sm text-[#9CA3AF]">
            {cases.length} case{cases.length !== 1 ? 's' : ''} requiring review and human decision governance
          </p>
        </div>

        {/* Segmented Filter Control */}
        <div className="flex items-center gap-1.5 p-1 bg-[#050c1a] border border-white/10 rounded-full max-w-full overflow-x-auto shadow-inner">
          {['', 'HELD', 'RELEASE_APPROVED', 'REJECTED'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`font-mono text-[11px] uppercase tracking-wider px-3.5 py-1.5 rounded-full transition-all duration-150 whitespace-nowrap ${
                filter === s
                  ? 'bg-[#F5F5F5] text-[#0A0D14] font-semibold shadow-[0_0_12px_rgba(255,255,255,0.2)]'
                  : 'bg-transparent text-[#9CA3AF] hover:text-[#F5F5F5] hover:bg-white/[0.04]'
              }`}
            >
              {s || 'ALL'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : error ? (
        <ErrorState error={error} onRetry={load} />
      ) : cases.length === 0 ? (
        <EmptyState
          icon="gavel"
          title="No Cases Found"
          message="No fraud cases match the current filter. Upload an invoice batch to start screening."
        />
      ) : (
        <div className="bg-[#050c1a] border border-white/10 rounded-2xl overflow-hidden shadow-xl flex flex-col">
          {/* Table Header (Desktop) */}
          <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b border-white/[0.08] bg-white/[0.02] font-mono text-[11px] text-[#9CA3AF] uppercase tracking-wider">
            <div className="col-span-2">Case ID</div>
            <div className="col-span-3">Vendor / Entity</div>
            <div className="col-span-2">Amount</div>
            <div className="col-span-2">Risk Level</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-1 text-right">Score</div>
          </div>

          {cases.map((c, i) => (
            <div
              key={c.case_id}
              className={`grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 p-4 hover:bg-white/[0.03] transition-colors items-center cursor-pointer ${
                i < cases.length - 1 ? 'border-b border-white/[0.06]' : ''
              }`}
              onClick={() => navigate(`/cases/${c.case_id}`)}
            >
              {/* Case ID */}
              <div className="md:col-span-2 flex items-center justify-between md:justify-start">
                <span className="md:hidden font-mono text-xs text-[#9CA3AF]">Case ID:</span>
                <span className="font-mono text-xs text-primary font-medium tracking-wide">{c.case_id}</span>
              </div>

              {/* Vendor & Invoice */}
              <div className="md:col-span-3 flex flex-col">
                <span className="text-sm font-semibold text-[#F5F5F5]">{c.vendor_name}</span>
                <span className="font-mono text-[11px] text-[#9CA3AF]">{c.invoice_id}</span>
              </div>

              {/* Amount */}
              <div className="md:col-span-2 flex md:block justify-between items-center">
                <span className="md:hidden font-mono text-xs text-[#9CA3AF]">Amount:</span>
                <span className="font-mono text-sm font-semibold text-[#F5F5F5]">
                  {formatUsd(c.amount)}
                </span>
              </div>

              {/* Risk Level */}
              <div className="md:col-span-2 flex md:block justify-between items-center">
                <span className="md:hidden font-mono text-xs text-[#9CA3AF]">Risk Level:</span>
                <RiskBadge level={c.risk_level} size="sm" />
              </div>

              {/* Status */}
              <div className="md:col-span-2 flex md:block justify-between items-center">
                <span className="md:hidden font-mono text-xs text-[#9CA3AF]">Status:</span>
                <StatusPill status={c.payment_status} />
              </div>

              {/* Score */}
              <div className="md:col-span-1 flex md:justify-end justify-between items-center">
                <span className="md:hidden font-mono text-xs text-[#9CA3AF]">Risk Score:</span>
                <span className={`inline-flex items-center justify-center font-mono text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                  c.risk_score >= 80 ? 'border-red-500/30 bg-red-500/10 text-red-400' :
                  c.risk_score >= 60 ? 'border-orange-500/30 bg-orange-500/10 text-orange-400' :
                  c.risk_score >= 30 ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' :
                  'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                }`}>
                  {c.risk_score}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
