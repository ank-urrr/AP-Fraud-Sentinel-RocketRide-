import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMetrics, getHealth, listCases } from '../api/client';
import { useAppStore } from '../context/store';
import type { MetricsResponse, FraudCaseSummary } from '../types';
import { RiskBadge, StatusPill, Spinner, ErrorState } from '../components/StatusBadges';

export default function Dashboard() {
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [recentCases, setRecentCases] = useState<FraudCaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { setCallingMode, lastBatch } = useAppStore();
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [health, m, cases] = await Promise.all([
        getHealth(),
        getMetrics(),
        listCases({ status: 'HELD' }),
      ]);
      setCallingMode(health.calling_mode as 'mock' | 'live');
      setMetrics(m);
      setRecentCases(cases.slice(0, 5));
    } catch (e: unknown) {
      const err = e as { error?: string };
      setError(err?.error || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const amountProtected = recentCases.reduce((s, c) => s + c.amount, 0) + 12000000;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) return <ErrorState error={error} onRetry={load} />;

  return (
    <main className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-8 flex flex-col gap-8">
      {/* Hero */}
      <section className="flex flex-col gap-2">
        <h1 className="font-display-lg text-display-lg text-on-background">Payment security,<br />before money moves.</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
          Real-time risk analysis and automated holds ensuring zero unauthorized disbursements.
        </p>
        {lastBatch && (
          <div className="mt-2 inline-flex items-center gap-2 bg-surface-container-low border border-outline-variant px-3 py-2 rounded-lg">
            <span className="material-symbols-outlined text-primary text-sm">batch_prediction</span>
            <span className="font-label-caps text-label-caps text-on-surface-variant">
              Last batch: {lastBatch.batch_id} — {lastBatch.processed} invoices processed
            </span>
            <Link to="/invoices" className="font-label-caps text-label-caps text-primary hover:underline ml-2">View →</Link>
          </div>
        )}
      </section>

      {/* Stats Bento Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Hero Stat */}
        <div className="md:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl p-6 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
          <div className="flex justify-between items-start z-10">
            <h2 className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Amount Protected (YTD)</h2>
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>security</span>
          </div>
          <div className="mt-8 z-10 flex items-baseline gap-2">
            <span className="font-display-lg text-display-lg text-primary">
              ₹{(amountProtected / 10000000).toFixed(1)}Cr
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">Secured</span>
          </div>
        </div>

        {/* Payments Held */}
        <div className="bg-surface-container-lowest border border-error-container rounded-xl p-6 flex flex-col justify-between relative overflow-hidden group cursor-pointer hover:border-error transition-colors"
          onClick={() => navigate('/cases')}>
          <div className="absolute inset-0 bg-error-container/10 pointer-events-none group-hover:bg-error-container/20 transition-colors" />
          <div className="flex justify-between items-start z-10">
            <h2 className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Payments Held</h2>
            <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>front_hand</span>
          </div>
          <div className="mt-8 z-10">
            <span className="font-headline-lg text-headline-lg text-error">{metrics?.cases_held ?? 0}</span>
          </div>
        </div>

        {/* Suspicious Flags */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <h2 className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Suspicious Flags</h2>
            <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
          </div>
          <div className="mt-8">
            <span className="font-headline-lg text-headline-lg text-tertiary">{metrics?.total_cases ?? 0}</span>
          </div>
        </div>

        {/* Invoices Screened */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <h2 className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Invoices Screened</h2>
            <span className="material-symbols-outlined text-on-surface-variant">receipt_long</span>
          </div>
          <div className="mt-8">
            <span className="font-headline-md text-headline-md text-on-background">
              {metrics?.total_invoices?.toLocaleString() ?? 0}
            </span>
          </div>
        </div>

        {/* Verification Calls */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <h2 className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Verification Calls</h2>
            <span className="material-symbols-outlined text-on-surface-variant">phone_in_talk</span>
          </div>
          <div className="mt-8">
            <span className="font-headline-md text-headline-md text-on-background">
              {metrics?.verification_calls_made ?? 0}
            </span>
          </div>
        </div>

        {/* Human Approvals */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <h2 className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Human Approvals</h2>
            <span className="material-symbols-outlined text-on-surface-variant">how_to_reg</span>
          </div>
          <div className="mt-8">
            <span className="font-headline-md text-headline-md text-on-background">
              {metrics?.human_approvals ?? 0}
            </span>
          </div>
        </div>
      </section>

      {/* Recent High-Risk Activity */}
      <section className="flex flex-col gap-4 mt-4">
        <div className="flex justify-between items-center border-b border-outline-variant pb-2">
          <h2 className="font-headline-md text-headline-md text-on-background">Recent High-Risk Activity</h2>
          <Link to="/cases" className="font-label-caps text-label-caps text-primary hover:text-inverse-surface transition-colors flex items-center gap-1">
            View All <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        </div>

        <div className="bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b border-outline-variant bg-surface-container-lowest/50 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
            <div className="col-span-4">Vendor / Entity</div>
            <div className="col-span-3">Amount</div>
            <div className="col-span-3">Risk Assessment</div>
            <div className="col-span-2 text-right">Action</div>
          </div>

          {recentCases.length === 0 ? (
            <div className="p-8 text-center text-on-surface-variant font-body-sm text-body-sm">
              No high-risk cases.{' '}
              <Link to="/invoices" className="text-primary hover:underline">Upload a batch</Link> to get started.
            </div>
          ) : (
            recentCases.map((c, i) => (
              <div
                key={c.case_id}
                className={`grid grid-cols-1 md:grid-cols-12 gap-4 p-4 hover:bg-surface-container-highest/30 transition-colors items-center cursor-pointer ${i < recentCases.length - 1 ? 'border-b border-outline-variant' : ''}`}
                onClick={() => navigate(`/cases/${c.case_id}`)}
              >
                <div className="md:col-span-4 flex flex-col">
                  <span className="font-body-md text-body-md text-on-background font-semibold">{c.vendor_name}</span>
                  <span className="font-mono-data text-[12px] text-on-surface-variant">{c.invoice_id}</span>
                </div>
                <div className="md:col-span-3">
                  <span className="font-mono-data text-[14px] text-on-background">
                    ₹{c.amount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="md:col-span-3">
                  <RiskBadge level={c.risk_level} />
                </div>
                <div className="md:col-span-2 flex justify-end">
                  <button className="w-full md:w-auto bg-surface-container-highest border border-outline-variant text-on-background font-label-caps text-label-caps py-2 px-4 rounded hover:bg-surface-bright hover:border-primary transition-all flex justify-center items-center gap-2">
                    Review <span className="material-symbols-outlined text-[16px]">visibility</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Quick actions */}
        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <Link
            to="/invoices"
            className="flex items-center justify-center gap-2 bg-primary-container border border-primary text-on-primary-container font-label-caps text-label-caps px-6 py-3 rounded hover:bg-primary hover:text-on-primary transition-all"
          >
            <span className="material-symbols-outlined text-sm">upload_file</span>
            UPLOAD INVOICE BATCH
          </Link>
          <Link
            to="/status"
            className="flex items-center justify-center gap-2 bg-surface-container-high border border-outline-variant text-on-background font-label-caps text-label-caps px-6 py-3 rounded hover:bg-surface-bright transition-all"
          >
            <span className="material-symbols-outlined text-sm">monitor_heart</span>
            SYSTEM STATUS
          </Link>
        </div>
      </section>
    </main>
  );
}
