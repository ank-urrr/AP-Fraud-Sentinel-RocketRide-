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
    <main className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-gutter py-8 pb-32">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2 text-on-surface-variant cursor-pointer hover:text-primary transition-colors" onClick={() => navigate(`/cases/${caseId}`)}>
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          <span className="font-label-caps text-label-caps">BACK TO CASE {caseId}</span>
        </div>
        <h1 className="font-headline-lg text-headline-lg md:font-display-lg md:text-display-lg mb-2">Audit Trail Timeline</h1>
        <p className="font-body-md text-on-surface-variant">
          Chronological security log for Case {caseId}
          {caseData && ` — ${caseData.vendor_name}`}. All events logged in UTC.
        </p>
      </div>

      {/* Timeline */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-container rounded-full blur-3xl opacity-20 -mr-20 -mt-20 pointer-events-none" />

        <div className="relative z-10 flex flex-col">
          {events.length === 0 ? (
            <p className="text-center text-on-surface-variant font-body-sm text-body-sm py-8">No audit events recorded for this case.</p>
          ) : (
            events.map((event, i) => {
              const cfg = EVENT_CONFIG[event.event_type] || EVENT_CONFIG.RISK_ASSESSED;
              const labelColor = EVENT_LABEL_COLOR[event.event_type] || 'text-on-background';
              const isLast = i === events.length - 1;

              return (
                <div key={event.id} className={`timeline-item relative flex gap-6 ${isLast ? '' : 'pb-8'}`}>
                  <div className="timeline-line relative flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full ${cfg.bgColor} border ${cfg.borderColor} flex items-center justify-center z-10 flex-shrink-0`}>
                      <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                        <span className={`material-symbols-outlined ${cfg.iconColor} text-lg`}>
                          {cfg.icon}
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="flex-grow pt-1">
                    <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                      <h3 className={`font-body-lg font-semibold ${labelColor}`}>{event.description}</h3>
                      <span className="font-mono-data text-[12px] text-on-surface-variant flex-shrink-0">
                        {new Date(event.occurred_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>

                    {Object.keys(event.event_metadata || {}).length > 0 && (
                      <div className="bg-surface-container-low rounded-lg p-3 border border-outline-variant mt-2">
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(event.event_metadata).map(([k, v]) => (
                            <span key={k} className="font-label-caps text-[10px] bg-surface-container border border-outline-variant text-on-surface-variant px-2 py-0.5 rounded">
                              {k}: {typeof v === 'object' ? JSON.stringify(v) : String(v)}
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
        <div className="mt-6 flex gap-3">
          {['HELD'].includes(caseData.payment_status) && (
            <Link to={`/invoices/${caseId}/decide`} className="flex items-center gap-2 bg-error-container/20 border border-error text-error font-label-caps text-label-caps px-4 py-2 rounded hover:opacity-90 transition-all">
              <span className="material-symbols-outlined text-sm">gavel</span>
              MAKE DECISION
            </Link>
          )}
        </div>
      )}
    </main>
  );
}
