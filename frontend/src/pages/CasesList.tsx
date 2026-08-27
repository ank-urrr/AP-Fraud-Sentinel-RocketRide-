import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listCases } from '../api/client';
import type { FraudCaseSummary } from '../types';
import { RiskBadge, StatusPill, Spinner, EmptyState, ErrorState } from '../components/StatusBadges';

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
    <main className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-8 pb-32 md:pb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-background">Fraud Cases</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
            {cases.length} case{cases.length !== 1 ? 's' : ''} requiring attention
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {['', 'HELD', 'RELEASE_APPROVED', 'REJECTED'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`font-label-caps text-label-caps px-3 py-1.5 rounded border transition-colors ${
                filter === s
                  ? 'bg-primary-container border-primary text-on-primary-container'
                  : 'border-outline-variant text-on-surface-variant hover:border-primary'
              }`}
            >
              {s || 'ALL'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : error ? (
        <ErrorState error={error} onRetry={load} />
      ) : cases.length === 0 ? (
        <EmptyState
          icon="gavel"
          title="No Cases Found"
          message="No fraud cases match the current filter. Upload an invoice batch to start screening."
        />
      ) : (
        <div className="bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden">
          {/* Header */}
          <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b border-outline-variant bg-surface-container-lowest/50 font-label-caps text-label-caps text-on-surface-variant uppercase">
            <div className="col-span-2">Case ID</div>
            <div className="col-span-3">Vendor</div>
            <div className="col-span-2">Amount</div>
            <div className="col-span-2">Risk</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-1">Score</div>
          </div>

          {cases.map((c, i) => (
            <div
              key={c.case_id}
              className={`grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 p-4 hover:bg-surface-container-highest/30 transition-colors items-center cursor-pointer ${i < cases.length - 1 ? 'border-b border-outline-variant' : ''}`}
              onClick={() => navigate(`/cases/${c.case_id}`)}
            >
              <div className="md:col-span-2">
                <span className="font-mono-data text-[11px] text-on-surface-variant">{c.case_id}</span>
              </div>
              <div className="md:col-span-3 flex flex-col">
                <span className="font-body-md text-body-md text-on-background font-semibold">{c.vendor_name}</span>
                <span className="font-mono-data text-[11px] text-on-surface-variant">{c.invoice_id}</span>
              </div>
              <div className="md:col-span-2">
                <span className="font-mono-data text-[13px] text-on-background">
                  ₹{c.amount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="md:col-span-2">
                <RiskBadge level={c.risk_level} size="sm" />
              </div>
              <div className="md:col-span-2">
                <StatusPill status={c.payment_status} />
              </div>
              <div className="md:col-span-1">
                <span className={`font-mono-data text-[13px] font-bold ${
                  c.risk_score >= 80 ? 'text-error' :
                  c.risk_score >= 60 ? 'text-orange-400' :
                  c.risk_score >= 30 ? 'text-tertiary' : 'text-green-400'
                }`}>{c.risk_score}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
