import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getAuditTrail, getCase } from '../api/client';
import type { AuditEvent, FraudCaseDetail } from '../types';
import { Spinner, ErrorState } from '../components/StatusBadges';

const EVENT_CONFIG: Record<string, { icon: string; iconColor: string; bgColor: string; borderColor: string }> = {
  INVOICE_RECEIVED: { icon: 'receipt_long', iconColor: 'text-on-surface-variant', bgColor: 'bg-surface-container-highest', borderColor: 'border-outline-variant' },
  RISK_ASSESSED: { icon: 'analytics', iconColor: 'text-primary', bgColor: 'bg-surface-container-highest', borderColor: 'border-outline-variant' },
  PAYMENT_HELD: { icon: 'block', iconColor: 'text-error', bgColor: 'bg-[#3F1014]', borderColor: 'border-[#93000A]' },
  PAYMENT_CLEARED: { icon: 'check_circle', iconColor: 'text-green-400', bgColor: 'bg-green-900/30', borderColor: 'border-green-700' },
  VERIFICATION_STARTED: { icon: 'contact_phone', iconColor: 'text-primary', bgColor: 'bg-surface-container-highest', borderColor: 'border-outline-variant' },
  VERIFICATION_COMPLETED: { icon: 'smart_toy', iconColor: 'text-on-surface-variant', bgColor: 'bg-surface-container-highest', borderColor: 'border-outline-variant' },
  VERIFICATION_FAILED: { icon: 'call_missed', iconColor: 'text-error', bgColor: 'bg-error-container/30', borderColor: 'border-error' },
  HUMAN_APPROVED: { icon: 'task_alt', iconColor: 'text-primary', bgColor: 'bg-primary-container', borderColor: 'border-primary' },
  HUMAN_REJECTED: { icon: 'cancel', iconColor: 'text-error', bgColor: 'bg-error-container/30', borderColor: 'border-error' },
  AI_ANALYSIS_COMPLETED: { icon: 'analytics', iconColor: 'text-primary', bgColor: 'bg-surface-container-highest', borderColor: 'border-outline-variant' },
  ERROR: { icon: 'error', iconColor: 'text-error', bgColor: 'bg-error-container/20', borderColor: 'border-error' },
};

const EVENT_LABEL_COLOR: Record<string, string> = {
  PAYMENT_HELD: 'text-error',
  VERIFICATION_FAILED: 'text-error',
  HUMAN_REJECTED: 'text-error',
  ERROR: 'text-error',
  PAYMENT_CLEARED: 'text-green-400',
  HUMAN_APPROVED: 'text-primary',
  VERIFICATION_COMPLETED: 'text-on-background',
};

export default function SecurityAuditTrail() {
  const { caseId } = useParams<{ caseId: string }>();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [caseData, setCaseData] = useState<FraudCaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const load = async () => {
    if (!caseId) return;
    setLoading(true);
    setError(null);
    try {
      const [trail, detail] = await Promise.all([
        getAuditTrail(caseId),
        getCase(caseId),
      ]);
      setEvents(trail);
      setCaseData(detail);
    } catch (e: unknown) {
      const err = e as { error?: string };
      setError(err?.error || 'Failed to load audit trail');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [caseId]);

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  if (error) return <ErrorState error={error} onRetry={load} />;

  return (
    <main className="flex-grow w-full max-w-container-max mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8 pb-32 md:pb-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1.5 pb-2">
        <button
          onClick={() => navigate(`/cases/${caseId}`)}
          className="inline-flex items-center gap-2 text-xs font-mono text-[#9CA3AF] hover:text-[#F5F5F5] transition-colors w-fit group mb-1"
        >
          <span className="material-symbols-outlined text-sm group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
          <span>BACK TO CASE {caseId}</span>
        </button>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#F5F5F5]">
          Audit Trail Timeline
        </h1>
        <p className="text-xs sm:text-sm text-[#9CA3AF]">
          Chronological security log for Case <span className="font-mono text-primary">{caseId}</span>
          {caseData && ` — ${caseData.vendor_name}`}. All events recorded immutably in UTC.
        </p>
      </div>

      {/* Timeline */}
      <div className="rounded-2xl bg-[#050c1a] border border-white/10 p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col">
          {events.length === 0 ? (
            <p className="text-center text-[#9CA3AF] text-sm py-12">No audit events recorded for this case.</p>
          ) : (
            events.map((event, i) => {
              const cfg = EVENT_CONFIG[event.event_type] || EVENT_CONFIG.RISK_ASSESSED;
              const labelColor = EVENT_LABEL_COLOR[event.event_type] || 'text-[#F5F5F5]';
              const isLast = i === events.length - 1;

              return (
                <div key={event.id} className={`timeline-item relative flex gap-5 sm:gap-6 ${isLast ? '' : 'pb-8'}`}>
                  <div className="timeline-line relative flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full ${cfg.bgColor} border ${cfg.borderColor} flex items-center justify-center z-10 shrink-0 shadow-md`}>
                      <span className={`material-symbols-outlined ${cfg.iconColor} text-lg`} style={{ fontVariationSettings: "'FILL' 1" }}>
                        {cfg.icon}
                      </span>
                    </div>
                  </div>

                  <div className="flex-grow pt-1">
                    <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                      <h3 className={`text-sm sm:text-base font-semibold ${labelColor}`}>{event.description}</h3>
                      <span className="font-mono text-xs text-[#9CA3AF] shrink-0">
                        {new Date(event.occurred_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>

                    {Object.keys(event.event_metadata || {}).length > 0 && (
                      <div className="bg-white/[0.02] rounded-xl p-3.5 border border-white/[0.06] mt-2">
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(event.event_metadata).map(([k, v]) => (
                            <span key={k} className="font-mono text-[11px] bg-white/[0.03] border border-white/10 text-[#9CA3AF] px-2.5 py-0.5 rounded-md">
                              <span className="text-[#E5E7EB] font-medium">{k}:</span> {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {caseData && (
        <div className="flex gap-3 pt-1">
          {['HELD'].includes(caseData.payment_status) && (
            <Link
              to={`/invoices/${caseId}/decide`}
              className="px-6 py-3 rounded-full bg-red-500 text-white hover:bg-red-600 font-mono text-xs font-bold tracking-wider shadow-[0_0_18px_rgba(239,68,68,0.4)] transition-all flex items-center gap-2 min-h-[44px]"
            >
              <span className="material-symbols-outlined text-sm">gavel</span>
              <span>MAKE DECISION</span>
            </Link>
          )}
        </div>
      )}
    </main>
  );
}
