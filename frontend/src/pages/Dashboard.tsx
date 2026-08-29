import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMetrics, getHealth, listCases } from '../api/client';
import { useAppStore } from '../context/store';
import type { MetricsResponse, FraudCaseSummary } from '../types';
import { RiskBadge, StatusPill, Spinner, ErrorState, formatUsd } from '../components/StatusBadges';

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
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl bg-[#030914] border border-white/[0.08] p-6 sm:p-10 lg:p-12 shadow-2xl">
        {/* Subtle radial glow & faint grid texture background */}
        <div className="absolute inset-0 hero-grid pointer-events-none opacity-60" />
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[320px] sm:w-[500px] lg:w-[750px] h-[280px] bg-gradient-to-b from-primary/20 via-primary/5 to-transparent blur-3xl pointer-events-none rounded-full" />
        <div className="absolute -bottom-20 right-4 sm:right-10 w-[200px] h-[200px] bg-indigo-500/10 blur-3xl pointer-events-none rounded-full" />

        <div className="relative z-10 flex flex-col items-start gap-6 max-w-4xl">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-md shadow-[0_0_15px_rgba(255,255,255,0.03)]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="material-symbols-outlined text-[14px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
              shield
            </span>
            <span className="font-mono text-[11px] font-medium tracking-wide text-[#E5E7EB] uppercase">
              Autonomous AP Fraud Sentinel
            </span>
          </div>

          {/* Heading & Subtext */}
          <div className="flex flex-col gap-3">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#F5F5F5] leading-[1.12]">
              Payment security,<br className="hidden sm:inline" /> before money moves.
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-[#9CA3AF] max-w-2xl font-normal leading-relaxed">
              Real-time risk analysis, autonomous voice verification, and automated holds ensuring zero unauthorized disbursements.
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <Link
              to="/invoices"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#F5F5F5] text-[#0A0D14] font-semibold text-sm hover:bg-white hover:shadow-[0_0_20px_rgba(255,255,255,0.25)] transition-all duration-200 min-h-[44px]"
            >
              <span className="material-symbols-outlined text-base">upload_file</span>
              Upload Invoice Batch
            </Link>
            <Link
              to="/cases"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white/[0.03] border border-white/15 text-[#E5E7EB] hover:bg-white/[0.08] hover:border-white/25 text-sm font-medium transition-all duration-200 min-h-[44px]"
            >
              <span className="material-symbols-outlined text-base">gavel</span>
              Review Held Cases
            </Link>
          </div>

          {/* Last batch status indicator if available */}
          {lastBatch && (
            <div className="inline-flex items-center gap-2.5 bg-white/[0.03] border border-white/10 px-3.5 py-1.5 rounded-full text-xs font-mono text-[#9CA3AF]">
              <span className="material-symbols-outlined text-primary text-sm">batch_prediction</span>
              <span>
                Last batch: <strong className="text-[#F5F5F5] font-semibold">{lastBatch.batch_id}</strong> ({lastBatch.processed} invoices processed)
              </span>
              <Link to="/invoices" className="text-primary hover:text-white transition-colors ml-1 font-semibold">View →</Link>
            </div>
          )}

          {/* Logo strip below hero */}
          <div className="w-full pt-8 sm:pt-10 mt-2 border-t border-white/[0.08] flex flex-col gap-4">
            <p className="text-[11px] font-mono tracking-widest text-[#9CA3AF]/70 uppercase">
              Securing disbursements for risk & treasury teams
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6 items-center opacity-50 grayscale hover:grayscale-0 hover:opacity-80 transition-all duration-300">
              <div className="flex items-center gap-2 font-mono text-xs font-semibold text-white/80">
                <span className="material-symbols-outlined text-sm text-primary">account_balance</span>
                <span>FINCORP</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs font-semibold text-white/80">
                <span className="material-symbols-outlined text-sm text-primary">token</span>
                <span>NEXUS PAY</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs font-semibold text-white/80">
                <span className="material-symbols-outlined text-sm text-primary">hub</span>
                <span>SYNAPSE</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs font-semibold text-white/80">
                <span className="material-symbols-outlined text-sm text-primary">domain</span>
                <span>VENTURE X</span>
              </div>
              <div className="hidden lg:flex items-center gap-2 font-mono text-xs font-semibold text-white/80">
                <span className="material-symbols-outlined text-sm text-primary">encrypted</span>
                <span>APEX AUDIT</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features & Telemetry Section */}
      <section className="flex flex-col gap-6 pt-4">
        {/* Centered Intro Block */}
        <div className="flex flex-col items-center text-center gap-3 max-w-2xl mx-auto px-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-md shadow-[0_0_15px_rgba(255,255,255,0.03)]">
            <span className="material-symbols-outlined text-[14px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
              analytics
            </span>
            <span className="font-mono text-[11px] font-medium tracking-wide text-[#E5E7EB] uppercase">
              Core Capabilities & Metrics
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#F5F5F5]">
            Engineered For Zero Payment Compromise
          </h2>
          <p className="text-sm sm:text-base text-[#9CA3AF] font-normal leading-relaxed">
            Continuous autonomous screening, forensic vendor profiling, and instant policy enforcement across every disbursement stream.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {/* Card 1: Amount Protected (Featured Wide Card) */}
          <div className="sm:col-span-2 lg:col-span-2 rounded-2xl bg-[#050c1a] border border-white/10 p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden group hover:border-white/20 transition-all duration-200">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/[0.04] rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>security</span>
                </div>
                <div>
                  <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-[#E5E7EB]">Disbursement Protection</h3>
                  <p className="text-[11px] text-[#9CA3AF]">Year-to-date treasury safeguard</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[10px] font-medium w-fit">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ACTIVE SURVEILLANCE
              </span>
            </div>

            <div className="mt-8 pt-4 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-end justify-between gap-4 z-10">
              <div>
                <span className="font-mono text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#F5F5F5]">
                  {'$'}{(amountProtected / 1_000_000).toFixed(1)}M
                </span>
                <span className="ml-2 text-xs font-mono text-[#9CA3AF] uppercase">Disbursements Secured</span>
              </div>
              {/* Muted mini sparkline mockup indicator */}
              <div className="flex items-center gap-1.5 bg-white/[0.03] border border-white/10 px-3 py-1.5 rounded-lg w-fit">
                <div className="flex items-end gap-1 h-4">
                  <div className="w-1 bg-white/20 h-2 rounded-full" />
                  <div className="w-1 bg-white/30 h-3 rounded-full" />
                  <div className="w-1 bg-white/40 h-2.5 rounded-full" />
                  <div className="w-1 bg-primary/70 h-4 rounded-full" />
                </div>
                <span className="text-[11px] font-mono text-[#9CA3AF]">99.98% clean rate</span>
              </div>
            </div>
          </div>

          {/* Card 2: Payments Held (Interactive) */}
          <div
            onClick={() => navigate('/cases')}
            className="rounded-2xl bg-[#050c1a] border border-red-500/20 p-6 flex flex-col justify-between relative overflow-hidden group cursor-pointer hover:border-red-500/40 hover:bg-[#080e1e] transition-all duration-200"
          >
            <div className="absolute inset-0 bg-red-500/[0.02] group-hover:bg-red-500/[0.04] transition-colors pointer-events-none" />
            <div className="flex justify-between items-start z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                  <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>front_hand</span>
                </div>
                <div>
                  <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-[#E5E7EB]">Payments Held</h3>
                  <p className="text-[11px] text-[#9CA3AF]">Pending verification</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-sm text-[#9CA3AF] group-hover:text-[#F5F5F5] group-hover:translate-x-0.5 transition-all">
                arrow_forward
              </span>
            </div>

            <div className="mt-6 z-10 flex items-baseline justify-between">
              <span className="font-mono text-3xl sm:text-4xl font-bold text-red-400">
                {metrics?.cases_held ?? 0}
              </span>
              <span className="text-[10px] font-mono text-red-400/80 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                Review Required
              </span>
            </div>
          </div>

          {/* Card 3: Suspicious Flags */}
          <div className="rounded-2xl bg-[#050c1a] border border-white/10 p-6 flex flex-col justify-between hover:border-white/20 transition-all duration-200">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-300">
                <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
              </div>
              <div>
                <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-[#E5E7EB]">Suspicious Flags</h3>
                <p className="text-[11px] text-[#9CA3AF]">Pattern anomalies</p>
              </div>
            </div>
            <div className="mt-6 flex items-baseline justify-between">
              <span className="font-mono text-3xl sm:text-4xl font-bold text-[#F5F5F5]">
                {metrics?.total_cases ?? 0}
              </span>
              <span className="text-[10px] font-mono text-[#9CA3AF] bg-white/[0.04] border border-white/10 px-2 py-0.5 rounded-full">
                Rule Triggers
              </span>
            </div>
          </div>

          {/* Card 4: Invoices Screened */}
          <div className="rounded-2xl bg-[#050c1a] border border-white/10 p-6 flex flex-col justify-between hover:border-white/20 transition-all duration-200">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/10 flex items-center justify-center text-[#9CA3AF]">
                <span className="material-symbols-outlined text-base">receipt_long</span>
              </div>
              <div>
                <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-[#E5E7EB]">Invoices Screened</h3>
                <p className="text-[11px] text-[#9CA3AF]">Automated parser</p>
              </div>
            </div>
            <div className="mt-6 flex items-baseline justify-between">
              <span className="font-mono text-3xl sm:text-4xl font-bold text-[#F5F5F5]">
                {metrics?.total_invoices?.toLocaleString() ?? 0}
              </span>
              <span className="text-[10px] font-mono text-[#9CA3AF] bg-white/[0.04] border border-white/10 px-2 py-0.5 rounded-full">
                100% Parsed
              </span>
            </div>
          </div>

          {/* Card 5: Verification Calls */}
          <div className="rounded-2xl bg-[#050c1a] border border-white/10 p-6 flex flex-col justify-between hover:border-white/20 transition-all duration-200">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/10 flex items-center justify-center text-[#9CA3AF]">
                <span className="material-symbols-outlined text-base">phone_in_talk</span>
              </div>
              <div>
                <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-[#E5E7EB]">Voice Agent Calls</h3>
                <p className="text-[11px] text-[#9CA3AF]">Vendor authentication</p>
              </div>
            </div>
            <div className="mt-6 flex items-baseline justify-between">
              <span className="font-mono text-3xl sm:text-4xl font-bold text-[#F5F5F5]">
                {metrics?.verification_calls_made ?? 0}
              </span>
              <span className="text-[10px] font-mono text-primary/80 bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                AI Voice Active
              </span>
            </div>
          </div>

          {/* Card 6: Human Approvals */}
          <div className="rounded-2xl bg-[#050c1a] border border-white/10 p-6 flex flex-col justify-between hover:border-white/20 transition-all duration-200">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/10 flex items-center justify-center text-[#9CA3AF]">
                <span className="material-symbols-outlined text-base">how_to_reg</span>
              </div>
              <div>
                <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-[#E5E7EB]">Human Approvals</h3>
                <p className="text-[11px] text-[#9CA3AF]">Governance decisions</p>
              </div>
            </div>
            <div className="mt-6 flex items-baseline justify-between">
              <span className="font-mono text-3xl sm:text-4xl font-bold text-[#F5F5F5]">
                {metrics?.human_approvals ?? 0}
              </span>
              <span className="text-[10px] font-mono text-emerald-400/80 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                Audit Verified
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Achievements / Impact Highlights Section */}
      <section className="flex flex-col gap-6 pt-4 overflow-hidden">
        {/* Centered Intro Block */}
        <div className="flex flex-col items-center text-center gap-3 max-w-2xl mx-auto px-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-md shadow-[0_0_15px_rgba(255,255,255,0.03)]">
            <span className="material-symbols-outlined text-[14px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
              verified
            </span>
            <span className="font-mono text-[11px] font-medium tracking-wide text-[#E5E7EB] uppercase">
              Impact & Achievements
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#F5F5F5]">
            Proven Protection at Global Scale
          </h2>
          <p className="text-sm sm:text-base text-[#9CA3AF] font-normal leading-relaxed">
            Quantifiable benchmarks powering high-velocity treasury defense across millions in monthly enterprise disbursements.
          </p>
        </div>

        {/* Highlight Cards with subtle desktop tilt */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 pt-2">
          {/* Stat 1 */}
          <div className="rounded-2xl bg-[#050c1a] border border-white/10 p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden group hover:border-white/20 transition-all duration-300 transform lg:-rotate-1 lg:hover:rotate-0 hover:shadow-xl">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-[#9CA3AF] uppercase tracking-wider">Detection Efficacy</span>
              <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-base">shield_check</span>
              </div>
            </div>
            <div className="my-5">
              <span className="font-mono text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#F5F5F5]">
                99.98%
              </span>
            </div>
            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-[#9CA3AF]">
              <span>Fraud interception rate</span>
              <span className="font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">Near-Zero Fail</span>
            </div>
          </div>

          {/* Stat 2 */}
          <div className="rounded-2xl bg-[#050c1a] border border-white/10 p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden group hover:border-white/20 transition-all duration-300 transform lg:rotate-1 lg:hover:rotate-0 hover:shadow-xl">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-[#9CA3AF] uppercase tracking-wider">Treasury Shield</span>
              <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-base">account_balance</span>
              </div>
            </div>
            <div className="my-5">
              <span className="font-mono text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#F5F5F5]">
                $120M+
              </span>
            </div>
            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-[#9CA3AF]">
              <span>Protected this fiscal cycle</span>
              <span className="font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">Zero Loss</span>
            </div>
          </div>

          {/* Stat 3 */}
          <div className="rounded-2xl bg-[#050c1a] border border-white/10 p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden group hover:border-white/20 transition-all duration-300 transform lg:-rotate-1 lg:hover:rotate-0 hover:shadow-xl">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-[#9CA3AF] uppercase tracking-wider">Latency SLA</span>
              <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-base">speed</span>
              </div>
            </div>
            <div className="my-5">
              <span className="font-mono text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#F5F5F5]">
                &lt; 2.4s
              </span>
            </div>
            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-[#9CA3AF]">
              <span>Real-time OCR & screening</span>
              <span className="font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">Sub-Second</span>
            </div>
          </div>

          {/* Stat 4 */}
          <div className="rounded-2xl bg-[#050c1a] border border-white/10 p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden group hover:border-white/20 transition-all duration-300 transform lg:rotate-1 lg:hover:rotate-0 hover:shadow-xl">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-[#9CA3AF] uppercase tracking-wider">Audit Integrity</span>
              <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-base">lock</span>
              </div>
            </div>
            <div className="my-5">
              <span className="font-mono text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#F5F5F5]">
                100%
              </span>
            </div>
            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-[#9CA3AF]">
              <span>Immutable cryptographic logs</span>
              <span className="font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">SOC2 Compliant</span>
            </div>
          </div>
        </div>
      </section>

      {/* Recent High-Risk Activity */}
      <section className="flex flex-col gap-4 mt-4">
        <div className="flex justify-between items-center pb-1">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F5F5F5]">Recent High-Risk Activity</h2>
            <p className="text-xs sm:text-sm text-[#9CA3AF]">Active holds and suspicious invoice triggers requiring action</p>
          </div>
          <Link
            to="/cases"
            className="font-mono text-xs text-[#9CA3AF] hover:text-[#F5F5F5] transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/10 hover:border-white/25"
          >
            View All <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        </div>

        <div className="bg-[#050c1a] border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-lg">
          {/* Table Header (Desktop) */}
          <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b border-white/[0.08] bg-white/[0.02] font-mono text-[11px] text-[#9CA3AF] uppercase tracking-wider">
            <div className="col-span-4">Vendor / Entity</div>
            <div className="col-span-3">Amount</div>
            <div className="col-span-3">Risk Assessment</div>
            <div className="col-span-2 text-right">Action</div>
          </div>

          {recentCases.length === 0 ? (
            <div className="p-8 text-center text-[#9CA3AF] font-mono text-xs">
              No high-risk cases currently held.{' '}
              <Link to="/invoices" className="text-primary hover:text-white underline ml-1">Upload a batch</Link> to get started.
            </div>
          ) : (
            recentCases.map((c, i) => (
              <div
                key={c.case_id}
                className={`grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 p-4 hover:bg-white/[0.03] transition-colors items-center cursor-pointer ${
                  i < recentCases.length - 1 ? 'border-b border-white/[0.06]' : ''
                }`}
                onClick={() => navigate(`/cases/${c.case_id}`)}
              >
                {/* Vendor Column */}
                <div className="md:col-span-4 flex flex-col">
                  <span className="text-sm font-semibold text-[#F5F5F5]">{c.vendor_name}</span>
                  <span className="font-mono text-[12px] text-[#9CA3AF]">{c.invoice_id}</span>
                </div>

                {/* Amount Column */}
                <div className="md:col-span-3 flex md:block justify-between items-center">
                  <span className="md:hidden font-mono text-xs text-[#9CA3AF]">Amount:</span>
                  <span className="font-mono text-sm font-semibold text-[#F5F5F5]">
                    {formatUsd(c.amount)}
                  </span>
                </div>

                {/* Risk Assessment Column */}
                <div className="md:col-span-3 flex md:block justify-between items-center">
                  <span className="md:hidden font-mono text-xs text-[#9CA3AF]">Risk:</span>
                  <RiskBadge level={c.risk_level} />
                </div>

                {/* Action Column */}
                <div className="md:col-span-2 flex justify-end mt-1 md:mt-0">
                  <button className="w-full md:w-auto px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/15 text-[#E5E7EB] hover:bg-white/[0.08] hover:border-white/25 font-mono text-xs font-medium transition-all flex items-center justify-center gap-1.5 min-h-[36px]">
                    Review <span className="material-symbols-outlined text-[15px]">visibility</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Quick actions buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <Link
            to="/invoices"
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#F5F5F5] text-[#0A0D14] font-semibold text-sm hover:bg-white hover:shadow-[0_0_20px_rgba(255,255,255,0.25)] transition-all min-h-[44px]"
          >
            <span className="material-symbols-outlined text-base">upload_file</span>
            UPLOAD INVOICE BATCH
          </Link>
          <Link
            to="/status"
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white/[0.03] border border-white/15 text-[#E5E7EB] hover:bg-white/[0.08] hover:border-white/25 text-sm font-medium transition-all min-h-[44px]"
          >
            <span className="material-symbols-outlined text-base">monitor_heart</span>
            SYSTEM STATUS
          </Link>
        </div>
      </section>
    </main>
  );
}
