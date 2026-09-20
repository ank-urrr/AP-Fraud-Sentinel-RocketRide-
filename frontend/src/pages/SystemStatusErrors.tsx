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
    <main className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-8 pb-32">
      <div className="mb-8">
        <h1 className="font-display-lg text-display-lg text-on-background mb-2">System Status</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">Real-time error monitoring and system health.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Spinner size="lg" /></div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* System health cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`bg-surface-container-low border rounded-xl p-6 flex flex-col gap-2 ${backendOnline ? 'border-green-500/50' : 'border-error/50'}`}>
              <div className="flex items-center gap-2">
                <span className={`material-symbols-outlined ${backendOnline ? 'text-green-400' : 'text-error'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                  {backendOnline ? 'cloud_done' : 'cloud_off'}
                </span>
                <span className="font-label-caps text-label-caps text-on-surface-variant">BACKEND</span>
              </div>
              <span className={`font-headline-md text-headline-md ${backendOnline ? 'text-green-400' : 'text-error'}`}>
                {backendOnline ? 'ONLINE' : 'OFFLINE'}
              </span>
              {health && (
                <span className="font-body-sm text-body-sm text-on-surface-variant">{health.status}</span>
              )}
            </div>

            <div className={`bg-surface-container-low border rounded-xl p-6 flex flex-col gap-2 ${health?.calling_mode === 'mock' ? 'border-tertiary/50' : 'border-green-500/50'}`}>
              <div className="flex items-center gap-2">
                <span className={`material-symbols-outlined ${health?.calling_mode === 'mock' ? 'text-tertiary' : 'text-green-400'}`}>
                  {health?.calling_mode === 'mock' ? 'science' : 'phone_in_talk'}
                </span>
                <span className="font-label-caps text-label-caps text-on-surface-variant">CALLING MODE</span>
              </div>
              <span className={`font-headline-md text-headline-md ${health?.calling_mode === 'mock' ? 'text-tertiary' : 'text-green-400'}`}>
                {(health?.calling_mode || '—').toUpperCase()}
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                {health?.calling_mode === 'mock' ? 'No real calls made' : 'Live calls via RocketRide/Bland AI'}
              </span>
            </div>

            <div className="bg-surface-container-low border border-outline-variant rounded-xl p-6 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">database</span>
                <span className="font-label-caps text-label-caps text-on-surface-variant">DATABASE</span>
              </div>
              <span className="font-headline-md text-headline-md text-on-background">
                {metrics ? `${(metrics.total_invoices as number) || 0} invoices` : 'CONNECTING'}
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">SQLite / persistent</span>
            </div>
          </div>

          {/* Cost estimate */}
          {metrics?.cost_estimate != null && (
            <div className="bg-surface-container-low border border-outline-variant rounded-xl p-6">
              <h2 className="font-headline-md text-headline-md mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">payments</span>
                Cost Estimate (Current Run)
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(metrics.cost_estimate as Record<string, unknown>)
                  .filter(([k]) => k !== 'note')
                  .map(([k, v]) => (
                    <div key={k} className="flex flex-col gap-1">
                      <span className="font-label-caps text-label-caps text-on-surface-variant">{k.replace(/_/g, ' ').toUpperCase()}</span>
                      <span className="font-mono-data text-[14px] text-on-background">{String(v)}</span>
                    </div>
                  ))}
              </div>
              {(metrics.cost_estimate as Record<string, string>).note && (
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-4 border-t border-outline-variant pt-4">
                  💡 {(metrics.cost_estimate as Record<string, string>).note}
                </p>
              )}
            </div>
          )}

          {/* Session errors */}
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h2 className="font-headline-md text-headline-md text-on-background flex items-center gap-2">
                <span className="material-symbols-outlined text-error">error_outline</span>
                Session Errors
                {systemErrors.length > 0 && (
                  <span className="bg-error-container/30 border border-error text-error font-label-caps text-label-caps px-2 py-0.5 rounded-full text-[10px]">
                    {systemErrors.length}
                  </span>
                )}
              </h2>
              {systemErrors.length > 0 && (
                <button onClick={clearErrors} className="font-label-caps text-label-caps text-on-surface-variant hover:text-error transition-colors flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">clear_all</span>
                  CLEAR ALL
                </button>
              )}
            </div>

            {systemErrors.length === 0 ? (
              <div className="bg-surface-container-low border border-outline-variant rounded-xl p-8 text-center">
                <span className="material-symbols-outlined text-green-400 text-4xl block mb-2">check_circle</span>
                <p className="font-body-md text-body-md text-on-surface-variant">No errors in this session.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {systemErrors.map((err: SystemError) => {
                  const cfg = errorTypeConfig[err.code] || errorTypeConfig.UNKNOWN_ERROR;
                  return (
                    <div key={err.id} className="bg-surface-container border border-error/30 rounded-lg p-4 flex items-start gap-4">
                      <span className={`material-symbols-outlined mt-0.5 ${cfg.color}`}>{cfg.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className={`font-label-caps text-label-caps ${cfg.color}`}>{err.code}</span>
                          <span className="font-mono-data text-[11px] text-on-surface-variant">
                            {new Date(err.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="font-body-sm text-body-sm text-on-background mt-1">{err.message}</p>
                        {err.context && (
                          <p className="font-mono-data text-[11px] text-on-surface-variant mt-1">Context: {err.context}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick links */}
          <div className="flex gap-3 flex-wrap">
            <button onClick={() => navigate('/invoices')} className="flex items-center gap-2 bg-surface-container-high border border-outline-variant text-on-background font-label-caps text-label-caps px-4 py-2 rounded hover:bg-surface-bright transition-all">
              <span className="material-symbols-outlined text-sm">upload_file</span>
              NEW BATCH
            </button>
            <button onClick={load} className="flex items-center gap-2 bg-surface-container-high border border-outline-variant text-on-background font-label-caps text-label-caps px-4 py-2 rounded hover:bg-surface-bright transition-all">
              <span className="material-symbols-outlined text-sm">refresh</span>
              REFRESH STATUS
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
