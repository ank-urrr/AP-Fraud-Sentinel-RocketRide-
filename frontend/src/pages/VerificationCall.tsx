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
          <p className="font-mono text-xs uppercase tracking-wider text-[#9CA3AF]">INITIATING VERIFICATION...</p>
        </div>
      </div>
    );
  }

  if (phase === 'failed' && error) {
    return (
      <div className="flex-grow flex items-center justify-center px-4">
        <div className="w-full max-w-2xl bg-[#050c1a] rounded-2xl border border-red-500/30 p-8 flex flex-col items-center text-center shadow-xl">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/30">
            <span className="material-symbols-outlined text-red-400 text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F5F5F5] mb-2">Verification Incomplete</h1>
          <p className="text-sm text-[#9CA3AF] max-w-lg mb-8">{error}</p>
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <button onClick={runVerification} className="flex-1 py-3 px-6 rounded-full bg-white/[0.04] border border-white/15 text-[#E5E7EB] font-mono text-xs font-semibold tracking-wider flex items-center justify-center gap-2 hover:bg-white/[0.08] transition-all">
              <span className="material-symbols-outlined text-base">refresh</span>Retry Call
            </button>
            <button onClick={() => navigate(`/cases/${caseId}`)} className="flex-1 py-3 px-6 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-xs font-semibold tracking-wider flex items-center justify-center gap-2 hover:bg-red-500/20 transition-all">
              <span className="material-symbols-outlined text-base">back_hand</span>Keep on Hold
            </button>
            <button onClick={() => navigate(`/invoices/${caseId}/decide`)} className="flex-1 py-3 px-6 rounded-full bg-[#F5F5F5] text-[#0A0D14] font-mono text-xs font-bold tracking-wider flex items-center justify-center gap-2 hover:bg-white transition-all shadow-[0_0_15px_rgba(255,255,255,0.2)]">
              <span className="material-symbols-outlined text-base">assignment_ind</span>Human Review
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
      <div className="absolute inset-0 bg-[#030914]/80 backdrop-blur-sm" />

      <main className="relative z-10 w-full max-w-[800px]">
        <div className="bg-[#050c1a] border border-white/10 rounded-2xl shadow-[0_12px_48px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col relative">
          {/* Scanning line during call */}
          {phase === 'calling' && <div className="scanning-line" />}

          {/* Header */}
          <header className="bg-white/[0.02] border-b border-white/[0.08] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>shield_person</span>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[#F5F5F5]">Verifying via Trusted Channel</h1>
            </div>
            <div className="font-mono text-xs text-[#9CA3AF] flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full inline-block ${phase === 'calling' ? 'bg-primary animate-pulse' : phase === 'completed' ? 'bg-emerald-400' : 'bg-red-400'}`} />
              <span>{phase === 'calling' ? 'OUT-OF-BAND SECURE' : phase === 'completed' ? 'SESSION CLOSED' : 'ERROR'}</span>
            </div>
          </header>

          <div className="p-6 flex flex-col gap-5">
            {/* Vendor info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4 flex flex-col gap-1">
                <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-wider text-[#9CA3AF]">Target Vendor</span>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#9CA3AF] text-base">store</span>
                  <span className="text-sm sm:text-base font-semibold text-[#F5F5F5]">{caseData?.vendor_name}</span>
                </div>
              </div>
              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4 flex flex-col gap-1 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-white/[0.04] px-2.5 py-0.5 rounded-bl-lg border-l border-b border-white/10">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-primary font-medium">TRUSTED RECORD</span>
                </div>
                <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-wider text-[#9CA3AF]">Contact Number</span>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#9CA3AF] text-base">call</span>
                  <span className="font-mono text-xs sm:text-sm font-semibold text-[#F5F5F5]">
                    {call?.phone_number?.replace(/(\d{2})\d+(\d{2})/, '$1****$2') || '●●●● ●●●●●●'}
                  </span>
                </div>
              </div>
            </div>

            {/* Mock badge */}
            {callingMode === 'mock' && (
              <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3 py-2 rounded-xl">
                <span className="material-symbols-outlined text-amber-300 text-sm">science</span>
                <span className="font-mono text-[11px] uppercase tracking-wider text-amber-300">MOCK VERIFICATION — No real phone call made</span>
              </div>
            )}

            {/* Calling animation / result */}
            <div className="bg-black/30 border border-white/10 rounded-xl h-48 flex flex-col items-center justify-center relative overflow-hidden">
              {phase === 'calling' ? (
                <div className="flex flex-col items-center justify-center w-full h-full">
                  <div className="font-mono text-xs uppercase tracking-widest text-primary mb-4 animate-pulse">{statusText}</div>
                  <svg className="overflow-visible" height="60" viewBox="0 0 200 60" width="200">
                    <defs>
                      <linearGradient id="waveColor" x1="0%" y1="0%" x2="100%" y2="0%">
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
                  <div className={`inline-flex items-center gap-2 bg-white/[0.04] ${outcome.borderColor} border text-xs px-3 py-1 rounded-full mb-3 ${outcome.color}`}>
                    <span className="material-symbols-outlined text-[15px]">{outcome.icon}</span>
                    <span className="font-mono font-bold uppercase tracking-wider">{outcome.label}</span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-[#F5F5F5] mb-1">Verification Completed</h2>
                  <p className="text-xs sm:text-sm text-[#9CA3AF]">The out-of-band channel has closed with a definitive outcome.</p>
                </div>
              ) : null}
            </div>

            {/* Analysis panel — shown after completion */}
            {phase === 'completed' && call && (
              <div className={`bg-white/[0.02] border-l-4 ${outcome?.borderColor || 'border-white/20'} p-4 rounded-r-xl flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border border-white/10`}>
                <div className="flex flex-col gap-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[18px]">psychology</span>
                    <span className="font-mono text-[11px] uppercase tracking-wider text-[#9CA3AF]">AI Summary</span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#F5F5F5] leading-relaxed">"{call.ai_summary}"</p>
                </div>
                <div className="flex flex-col items-center justify-center bg-white/[0.03] border border-white/10 rounded-xl p-3 min-w-[100px]">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#9CA3AF] mb-1">CONFIDENCE</span>
                  <div className={`text-2xl sm:text-3xl font-mono font-bold ${outcome?.color || 'text-[#F5F5F5]'} flex items-baseline`}>
                    {call.confidence ? Math.round(call.confidence * 100) : '--'}
                    <span className="text-sm text-[#9CA3AF] font-normal">%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Transcript */}
            {phase === 'completed' && call?.transcript && (
              <details className="bg-black/20 border border-white/10 rounded-xl">
                <summary className="p-4 font-mono text-xs font-semibold text-[#9CA3AF] cursor-pointer hover:text-[#F5F5F5] transition-colors">
                  CALL TRANSCRIPT ▼
                </summary>
                <div className="p-4 pt-0 border-t border-white/10">
                  <pre className="font-mono text-xs text-[#9CA3AF] whitespace-pre-wrap leading-relaxed">
                    {call.transcript}
                  </pre>
                </div>
              </details>
            )}
          </div>

          {/* Footer action */}
          <footer className="bg-white/[0.02] border-t border-white/[0.08] p-6 flex flex-col sm:flex-row justify-end gap-3">
            {phase === 'completed' ? (
              <>
                <button
                  onClick={() => navigate(`/audit/${caseId}`)}
                  className="px-6 py-3 rounded-full bg-white/[0.03] border border-white/15 text-[#E5E7EB] font-mono text-xs font-semibold tracking-wider hover:bg-white/[0.08] hover:border-white/25 transition-all flex items-center justify-center gap-2 min-h-[44px]"
                >
                  <span className="material-symbols-outlined text-[18px]">history</span>
                  <span>AUDIT TRAIL</span>
                </button>
                <button
                  onClick={() => navigate(`/invoices/${caseId}/decide`)}
                  className="px-6 py-3 rounded-full bg-[#F5F5F5] text-[#0A0D14] font-mono text-xs font-bold tracking-wider hover:bg-white transition-all shadow-[0_0_16px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2 min-h-[44px]"
                >
                  <span className="material-symbols-outlined text-[18px]">find_in_page</span>
                  <span>REVIEW EVIDENCE &amp; DECIDE</span>
                </button>
              </>
            ) : (
              <button disabled className="px-6 py-3 rounded-full bg-white/[0.04] text-[#9CA3AF] border border-white/10 font-mono text-xs font-medium tracking-wider flex items-center justify-center gap-2 cursor-not-allowed min-h-[44px]">
                <span className="material-symbols-outlined text-[18px]">lock_clock</span>
                <span>AWAITING RESOLUTION...</span>
              </button>
            )}
          </footer>
        </div>
      </main>
    </div>
  );
}
