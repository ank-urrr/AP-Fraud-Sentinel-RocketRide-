import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCase, verifyCase, getVerification } from '../api/client';
import type { FraudCaseDetail, VerificationCallDetail } from '../types';
import { Spinner, ErrorState } from '../components/StatusBadges';
import { useAppStore } from '../context/store';

type Phase = 'loading' | 'calling' | 'completed' | 'failed';

export default function VerificationCall() {
  const { caseId } = useParams<{ caseId: string }>();
  const [caseData, setCaseData] = useState<FraudCaseDetail | null>(null);
  const [call, setCall] = useState<VerificationCallDetail | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [error, setError] = useState<string | null>(null);
  const [statusText, setStatusText] = useState('INITIATING...');
  const { callingMode, addSystemError } = useAppStore();
  const navigate = useNavigate();
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runVerification = async () => {
    if (!caseId) return;
    setPhase('loading');
    setError(null);

    try {
      const caseDetail = await getCase(caseId);
      setCaseData(caseDetail);

      // If there's already a completed call, show it
      if (caseDetail.verification_call?.status === 'COMPLETED') {
        setCall(caseDetail.verification_call);
        setPhase('completed');
        return;
      }

      // Start verification
      setPhase('calling');
      setStatusText('QUEUED → INITIATING CALL...');

      const callResult = await verifyCase(caseId);
      setCall(callResult);

      // Simulate status progression for visual effect if mock
      if (callResult.status === 'COMPLETED') {
        setStatusText('CALLING...');
        await new Promise(r => setTimeout(r, 800));
        setStatusText('CONNECTED → AI CALLING...');
        await new Promise(r => setTimeout(r, 1200));
        setStatusText('PROCESSING RESPONSE...');
        await new Promise(r => setTimeout(r, 600));
        setPhase('completed');
      } else {
        // Live mode: poll for completion
        poll(callResult.call_id);
      }
    } catch (e: unknown) {
      const err = e as { error?: string; code?: string };
      setError(err?.error || 'Verification call failed');
      setPhase('failed');
      addSystemError({
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        code: err?.code || 'CALL_FAILED',
        message: err?.error || 'Verification call failed',
        context: `Case ${caseId}`,
      });
    }
  };

  const poll = (callId: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const status = await getVerification(callId);
        setCall(status);
        setStatusText(`${status.status}...`);
        if (['COMPLETED', 'FAILED'].includes(status.status)) {
          clearInterval(pollRef.current!);
          setPhase(status.status === 'COMPLETED' ? 'completed' : 'failed');
        }
      } catch {
        clearInterval(pollRef.current!);
      }
    }, 2000);
  };

  useEffect(() => {
    runVerification();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [caseId]);

  const outcomeConfig = {
    CONTRADICTED: { color: 'text-error', icon: 'gavel', borderColor: 'border-error', label: 'CONTRADICTED' },
    CONFIRMED: { color: 'text-green-400', icon: 'check_circle', borderColor: 'border-green-500', label: 'CONFIRMED' },
    INCONCLUSIVE: { color: 'text-tertiary', icon: 'help', borderColor: 'border-tertiary', label: 'INCONCLUSIVE' },
    NO_ANSWER: { color: 'text-on-surface-variant', icon: 'phone_missed', borderColor: 'border-outline', label: 'NO ANSWER' },
    FAILED: { color: 'text-error', icon: 'error', borderColor: 'border-error', label: 'FAILED' },
  };

  if (phase === 'loading' && !error) {
    return (
      <div className="flex-grow flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="font-label-caps text-label-caps text-on-surface-variant">INITIATING VERIFICATION...</p>
        </div>
      </div>
    );
  }

  if (phase === 'failed' && error) {
    return (
      <div className="flex-grow flex items-center justify-center px-4">
        <div className="w-full max-w-2xl bg-surface-container rounded-xl border border-error/30 p-8 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-error-container/20 flex items-center justify-center mb-6 border border-error/50">
            <span className="material-symbols-outlined text-error text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-background mb-4">Verification Incomplete</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-lg mb-8">{error}</p>
          <div className="flex flex-col sm:flex-row gap-4 w-full">
            <button onClick={runVerification} className="flex-1 py-3 px-6 rounded bg-surface-container-high border border-outline text-on-background font-label-caps text-label-caps flex items-center justify-center gap-2 hover:bg-surface-variant transition-colors">
              <span className="material-symbols-outlined text-lg">refresh</span>Retry Call
            </button>
            <button onClick={() => navigate(`/cases/${caseId}`)} className="flex-1 py-3 px-6 rounded bg-error-container text-on-error-container font-label-caps text-label-caps flex items-center justify-center gap-2 hover:opacity-90">
              <span className="material-symbols-outlined text-lg">back_hand</span>Keep on Hold
            </button>
            <button onClick={() => navigate(`/invoices/${caseId}/decide`)} className="flex-1 py-3 px-6 rounded bg-primary text-on-primary font-label-caps text-label-caps flex items-center justify-center gap-2 hover:opacity-90">
              <span className="material-symbols-outlined text-lg">assignment_ind</span>Human Review
            </button>
          </div>
        </div>
      </div>
    );
  }

  const outcome = call?.outcome ? outcomeConfig[call.outcome] : null;

  return (
    <div className="flex-grow flex items-center justify-center overflow-hidden relative px-4 py-8">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

      <main className="relative z-10 w-full max-w-[800px]">
        <div className="bg-surface-container border border-outline-variant rounded-xl shadow-[0_12px_48px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col relative">
          {/* Scanning line during call */}
          {phase === 'calling' && <div className="scanning-line" />}

          {/* Header */}
          <header className="bg-surface-container-high border-b border-outline-variant px-gutter py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>shield_person</span>
              <h1 className="font-headline-md text-headline-md text-on-background">Verifying via Trusted Channel</h1>
            </div>
            <div className="font-label-caps text-label-caps text-on-surface-variant flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full inline-block ${phase === 'calling' ? 'bg-primary animate-pulse' : phase === 'completed' ? 'bg-green-500' : 'bg-error'}`} />
              <span>{phase === 'calling' ? 'OUT-OF-BAND SECURE' : phase === 'completed' ? 'SESSION CLOSED' : 'ERROR'}</span>
            </div>
          </header>

          <div className="p-gutter flex flex-col gap-6">
            {/* Vendor info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-surface-container-low border border-outline-variant rounded-lg p-4 flex flex-col gap-1">
                <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Target Vendor</span>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-on-surface-variant">store</span>
                  <span className="font-body-lg text-body-lg text-on-background font-medium">{caseData?.vendor_name}</span>
                </div>
              </div>
              <div className="bg-surface-container-low border border-outline-variant rounded-lg p-4 flex flex-col gap-1 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-surface-variant px-2 py-1 rounded-bl-lg border-l border-b border-outline-variant">
                  <span className="font-label-caps text-label-caps text-primary text-[10px]">TRUSTED RECORD</span>
                </div>
                <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Contact Number</span>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-on-surface-variant">call</span>
                  <span className="font-mono-data text-[14px] text-on-background">
                    {call?.phone_number?.replace(/(\d{2})\d+(\d{2})/, '$1****$2') || '●●●● ●●●●●●'}
                  </span>
                </div>
              </div>
            </div>

            {/* Mock badge */}
            {callingMode === 'mock' && (
              <div className="flex items-center gap-2 bg-tertiary-container/20 border border-tertiary px-3 py-2 rounded-lg">
                <span className="material-symbols-outlined text-tertiary text-sm">science</span>
                <span className="font-label-caps text-label-caps text-tertiary">MOCK VERIFICATION — No real phone call made</span>
              </div>
            )}

            {/* Calling animation / result */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg h-48 flex flex-col items-center justify-center relative overflow-hidden">
              {phase === 'calling' ? (
                <div className="flex flex-col items-center justify-center w-full h-full">
                  <div className="font-label-caps text-label-caps text-primary mb-4 tracking-widest animate-pulse">{statusText}</div>
                  <svg className="overflow-visible" height="60" viewBox="0 0 200 60" width="200">
                    <defs>
                      <linearGradient id="waveColor" x1="0%" x2="100%" y1="0%" y2="0%">
                        <stop offset="0%" stopColor="#2a3a4f" />
                        <stop offset="50%" stopColor="#bec6e0" />
                        <stop offset="100%" stopColor="#2a3a4f" />
                      </linearGradient>
                    </defs>
                    <g stroke="url(#waveColor)" strokeLinecap="round" strokeWidth="4">
                      {[20,40,60,80,100,120,140,160,180].map((x, i) => (
                        <line key={x} className="wave-bar" style={{ animationDelay: `${i * 0.15}s` }} x1={x} x2={x} y1={30 - (i < 4 ? i * 6 : (8 - i) * 6)} y2={30 + (i < 4 ? i * 6 : (8 - i) * 6)} />
                      ))}
                    </g>
                  </svg>
                </div>
              ) : phase === 'completed' && outcome ? (
                <div className="flex flex-col items-center justify-center w-full h-full text-center px-6">
                  <div className={`inline-flex items-center gap-2 bg-surface-container-high ${outcome.borderColor} border text-sm px-3 py-1 rounded-full mb-3 ${outcome.color}`}>
                    <span className="material-symbols-outlined text-[16px]">{outcome.icon}</span>
                    <span className="font-label-caps text-label-caps font-bold">{outcome.label}</span>
                  </div>
                  <h2 className="font-headline-md text-headline-md text-on-background mb-1">Verification Completed</h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">The out-of-band channel has closed with a definitive outcome.</p>
                </div>
              ) : null}
            </div>

            {/* Analysis panel — shown after completion */}
            {phase === 'completed' && call && (
              <div className={`bg-surface-container-low border-l-4 ${outcome?.borderColor || 'border-outline'} p-4 rounded-r-lg flex flex-col md:flex-row gap-4 items-start md:items-center justify-between`}>
                <div className="flex flex-col gap-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[18px]">psychology</span>
                    <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">AI Summary</span>
                  </div>
                  <p className="font-body-md text-body-md text-on-background leading-relaxed">"{call.ai_summary}"</p>
                </div>
                <div className="flex flex-col items-center justify-center bg-surface-container border border-outline-variant rounded-lg p-3 min-w-[100px]">
                  <span className="font-label-caps text-label-caps text-on-surface-variant mb-1">CONFIDENCE</span>
                  <div className={`font-display-lg text-display-lg ${outcome?.color || 'text-on-background'} flex items-baseline`}>
                    {call.confidence ? Math.round(call.confidence * 100) : '--'}
                    <span className="font-headline-md text-headline-md text-on-surface-variant">%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Transcript */}
            {phase === 'completed' && call?.transcript && (
              <details className="bg-surface-container-lowest border border-outline-variant rounded-lg">
                <summary className="p-4 font-label-caps text-label-caps text-on-surface-variant cursor-pointer hover:text-primary transition-colors">
                  CALL TRANSCRIPT ▼
                </summary>
                <div className="p-4 pt-0 border-t border-outline-variant">
                  <pre className="font-mono-data text-[12px] text-on-surface-variant whitespace-pre-wrap leading-relaxed">
                    {call.transcript}
                  </pre>
                </div>
              </details>
            )}
          </div>

          {/* Footer action */}
          <footer className="bg-surface-container-high border-t border-outline-variant p-gutter flex justify-end gap-3">
            {phase === 'completed' ? (
              <>
                <button
                  onClick={() => navigate(`/audit/${caseId}`)}
                  className="bg-surface-container-highest border border-outline-variant text-on-surface-variant font-label-caps text-label-caps px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-surface-bright hover:text-on-background transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">history</span>
                  AUDIT TRAIL
                </button>
                <button
                  onClick={() => navigate(`/invoices/${caseId}/decide`)}
                  className="bg-primary-container border border-primary text-on-primary-container font-label-caps text-label-caps px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-primary hover:text-on-primary cursor-pointer transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">find_in_page</span>
                  REVIEW EVIDENCE &amp; DECIDE
                </button>
              </>
            ) : (
              <button disabled className="bg-surface-variant text-on-surface-variant border border-outline-variant font-label-caps text-label-caps px-6 py-3 rounded-lg flex items-center gap-2 cursor-not-allowed">
                <span className="material-symbols-outlined text-[18px]">lock_clock</span>
                AWAITING RESOLUTION...
              </button>
            )}
          </footer>
        </div>
      </main>
    </div>
  );
}
