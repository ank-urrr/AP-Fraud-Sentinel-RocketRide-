import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHealth, getMetrics } from '../api/client';
import { useAppStore, type SystemError } from '../context/store';
import { Spinner } from '../components/StatusBadges';

export default function SystemStatusErrors() {
  const [health, setHealth] = useState<{ status: string; calling_mode: string } | null>(null);
  const [metrics, setMetrics] = useState<Record<string, unknown> | null>(null);
  const [backendOnline, setBackendOnline] = useState(true);
  const [loading, setLoading] = useState(true);
  const { systemErrors, clearErrors } = useAppStore();
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const [h, m] = await Promise.all([getHealth(), getMetrics()]);
      setHealth(h);
      setMetrics(m as unknown as Record<string, unknown>);
      setBackendOnline(true);
    } catch {
      setBackendOnline(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const errorTypeConfig: Record<string, { icon: string; color: string }> = {
    CALL_FAILED: { icon: 'call_missed', color: 'text-error' },
    MISSING_PHONE: { icon: 'phone_disabled', color: 'text-tertiary' },
    BATCH_ERROR: { icon: 'error', color: 'text-error' },
    VALIDATION_ERROR: { icon: 'rule', color: 'text-tertiary' },
    AI_SVC_TIMEOUT_504: { icon: 'timer_off', color: 'text-error' },
    DUPLICATE_CALL: { icon: 'content_copy', color: 'text-tertiary' },
    NOT_FOUND: { icon: 'search_off', color: 'text-on-surface-variant' },
    UNKNOWN_ERROR: { icon: 'bug_report', color: 'text-error' },
  };

  return (
    <main className="flex-grow w-full max-w-container-max mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8 pb-32 md:pb-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1.5 pb-2">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-md shadow-[0_0_15px_rgba(255,255,255,0.03)] w-fit">
          <span className="material-symbols-outlined text-[14px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
            health_and_safety
          </span>
          <span className="font-mono text-[11px] font-medium tracking-wide text-[#E5E7EB] uppercase">
            System Diagnostics
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#F5F5F5]">
          System Status &amp; Telemetry
        </h1>
        <p className="text-xs sm:text-sm text-[#9CA3AF]">
          Real-time error monitoring, node availability, and agent pipeline health.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* System health cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
            <div className={`rounded-2xl bg-[#050c1a] border p-6 flex flex-col gap-3 shadow-lg ${backendOnline ? 'border-emerald-500/30' : 'border-red-500/40'}`}>
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <span className="font-mono text-[11px] uppercase tracking-wider text-[#9CA3AF]">BACKEND SERVICE</span>
                <span className={`material-symbols-outlined text-lg ${backendOnline ? 'text-emerald-400' : 'text-red-400'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                  {backendOnline ? 'cloud_done' : 'cloud_off'}
                </span>
              </div>
              <span className={`text-2xl font-mono font-bold tracking-tight ${backendOnline ? 'text-emerald-400' : 'text-red-400'}`}>
                {backendOnline ? 'ONLINE' : 'OFFLINE'}
              </span>
              {health && (
                <span className="text-xs text-[#9CA3AF] font-mono">Status: {health.status}</span>
              )}
            </div>

            <div className={`rounded-2xl bg-[#050c1a] border p-6 flex flex-col gap-3 shadow-lg ${health?.calling_mode === 'mock' ? 'border-amber-500/30' : 'border-emerald-500/30'}`}>
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <span className="font-mono text-[11px] uppercase tracking-wider text-[#9CA3AF]">CALLING MODE</span>
                <span className={`material-symbols-outlined text-lg ${health?.calling_mode === 'mock' ? 'text-amber-300' : 'text-emerald-400'}`}>
                  {health?.calling_mode === 'mock' ? 'science' : 'phone_in_talk'}
                </span>
              </div>
              <span className={`text-2xl font-mono font-bold tracking-tight ${health?.calling_mode === 'mock' ? 'text-amber-300' : 'text-emerald-400'}`}>
                {(health?.calling_mode || '—').toUpperCase()}
              </span>
              <span className="text-xs text-[#9CA3AF]">
                {health?.calling_mode === 'mock' ? 'Simulated AI phone verification' : 'Live calls via Bland AI / Twilio'}
              </span>
            </div>

            <div className="rounded-2xl bg-[#050c1a] border border-white/10 p-6 flex flex-col gap-3 shadow-lg">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <span className="font-mono text-[11px] uppercase tracking-wider text-[#9CA3AF]">DATABASE NODE</span>
                <span className="material-symbols-outlined text-primary text-lg">database</span>
              </div>
              <span className="text-2xl font-mono font-bold text-[#F5F5F5]">
                {metrics ? `${(metrics.total_invoices as number) || 0} Invoices` : 'Connected'}
              </span>
              <span className="text-xs text-[#9CA3AF] font-mono">SQLite / persistent store</span>
            </div>
          </div>

          {/* Cost estimate */}
          {metrics?.cost_estimate != null && (
            <div className="rounded-2xl bg-[#050c1a] border border-white/10 p-6 shadow-lg flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <h2 className="text-base sm:text-lg font-bold text-[#F5F5F5] flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-lg">payments</span>
                  Cost &amp; Consumption Estimate (Current Run)
                </h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-1">
                {Object.entries(metrics.cost_estimate as Record<string, unknown>)
                  .filter(([k]) => k !== 'note')
                  .map(([k, v]) => (
                    <div key={k} className="flex flex-col gap-1 bg-white/[0.02] border border-white/[0.06] rounded-xl p-3.5">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-[#9CA3AF]">{k.replace(/_/g, ' ').toUpperCase()}</span>
                      <span className="font-mono text-sm font-semibold text-[#F5F5F5]">{String(v)}</span>
                    </div>
                  ))}
              </div>
              {(metrics.cost_estimate as Record<string, string>).note && (
                <p className="text-xs text-[#9CA3AF] mt-2 border-t border-white/[0.08] pt-3 leading-relaxed">
                  💡 {(metrics.cost_estimate as Record<string, string>).note}
                </p>
              )}
            </div>
          )}

          {/* Session errors */}
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h2 className="text-base sm:text-lg font-bold text-[#F5F5F5] flex items-center gap-2">
                <span className="material-symbols-outlined text-red-400 text-lg">error_outline</span>
                <span>Session Diagnostics Log</span>
                {systemErrors.length > 0 && (
                  <span className="bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-[10px] px-2 py-0.5 rounded-full font-bold">
                    {systemErrors.length}
                  </span>
                )}
              </h2>
              {systemErrors.length > 0 && (
                <button
                  onClick={clearErrors}
                  className="font-mono text-xs font-semibold text-[#9CA3AF] hover:text-red-400 transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">clear_all</span>
                  <span>CLEAR LOG</span>
                </button>
              )}
            </div>

            {systemErrors.length === 0 ? (
              <div className="rounded-2xl bg-[#050c1a] border border-white/10 p-8 text-center flex flex-col items-center gap-2 shadow-lg">
                <span className="material-symbols-outlined text-emerald-400 text-3xl">check_circle</span>
                <p className="text-sm text-[#9CA3AF]">Zero runtime errors detected in this session.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {systemErrors.map((err: SystemError) => {
                  const cfg = errorTypeConfig[err.code] || errorTypeConfig.UNKNOWN_ERROR;
                  return (
                    <div key={err.id} className="bg-[#050c1a] border border-red-500/25 rounded-xl p-4 flex items-start gap-4 shadow-sm">
                      <span className={`material-symbols-outlined mt-0.5 ${cfg.color}`}>{cfg.icon}</span>
                      <div className="flex-1 flex flex-col gap-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className={`font-mono text-xs font-semibold uppercase tracking-wider ${cfg.color}`}>{err.code}</span>
                          <span className="font-mono text-[11px] text-[#9CA3AF]">
                            {new Date(err.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-[#F5F5F5]">{err.message}</p>
                        {err.context && (
                          <p className="font-mono text-xs text-[#9CA3AF]">Context: {err.context}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick links */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => navigate('/invoices')}
              className="px-6 py-3 rounded-full bg-[#F5F5F5] text-[#0A0D14] font-mono text-xs font-bold tracking-wider hover:bg-white transition-all shadow-[0_0_16px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2 min-h-[44px]"
            >
              <span className="material-symbols-outlined text-sm">upload_file</span>
              <span>NEW BATCH</span>
            </button>
            <button
              onClick={load}
              className="px-6 py-3 rounded-full bg-white/[0.03] border border-white/15 text-[#E5E7EB] font-mono text-xs font-semibold tracking-wider hover:bg-white/[0.08] hover:border-white/25 transition-all flex items-center justify-center gap-2 min-h-[44px]"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              <span>REFRESH STATUS</span>
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
