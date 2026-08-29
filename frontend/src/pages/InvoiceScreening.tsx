import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadBatch, uploadDemoBatch } from '../api/client';
import { useAppStore } from '../context/store';
import type { BatchResult } from '../types';
import { RiskBadge, StatusPill, Spinner, formatUsd } from '../components/StatusBadges';

type Phase = 'upload' | 'processing' | 'results';

export default function InvoiceScreening() {
  const [phase, setPhase] = useState<Phase>('upload');
  const [batch, setBatch] = useState<BatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const { setLastBatch, addSystemError } = useAppStore();
  const navigate = useNavigate();

  const runBatch = async (file?: File) => {
    setPhase('processing');
    setError(null);
    setProgress(0);

    // Animate progress
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + 15, 90));
    }, 400);

    try {
      const result = file ? await uploadBatch(file) : await uploadDemoBatch();
      clearInterval(interval);
      setProgress(100);
      setBatch(result);
      setLastBatch(result);
      setPhase('results');
    } catch (e: unknown) {
      clearInterval(interval);
      const err = e as { error?: string; code?: string };
      setError(err?.error || 'Batch processing failed');
      addSystemError({
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        code: err?.code || 'BATCH_ERROR',
        message: err?.error || 'Batch processing failed',
        context: 'Invoice Screening',
      });
      setPhase('upload');
    }
  };

  const handleFile = (file: File) => {
    if (!file.name.match(/\.(csv|json)$/i)) {
      setError('Only .csv or .json files are accepted');
      return;
    }
    setError(null);
    runBatch(file);
  };

  return (
    <main className="flex-grow flex flex-col items-center justify-center p-4 sm:p-6 md:p-10 w-full max-w-container-max mx-auto">
      <div className="w-full max-w-3xl flex flex-col gap-6 sm:gap-8">
        {/* Header */}
        <div className="text-center flex flex-col items-center gap-2.5">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-md shadow-[0_0_15px_rgba(255,255,255,0.03)]">
            <span className="material-symbols-outlined text-[14px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
              receipt_long
            </span>
            <span className="font-mono text-[11px] font-medium tracking-wide text-[#E5E7EB] uppercase">
              Batch Ingestion & Analysis
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#F5F5F5]">
            Invoice Screening
          </h1>
          <p className="text-sm sm:text-base text-[#9CA3AF] font-normal max-w-md">
            Automated fraud detection, duplicate flagging, and vendor profile verification.
          </p>
        </div>

        {/* Main Panel */}
        <div className="bg-[#050c1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden relative">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-96 h-48 bg-primary/10 blur-3xl pointer-events-none rounded-full" />

          <div className="p-6 sm:p-10 md:p-12 flex flex-col items-center justify-center min-h-[400px] gap-6 relative z-10">

            {/* ── Upload Phase ── */}
            {phase === 'upload' && (
              <div className="w-full flex flex-col items-center gap-6">
                <div
                  className={`w-full border-2 border-dashed rounded-xl p-8 sm:p-12 flex flex-col items-center gap-4 cursor-pointer transition-all duration-200 group ${
                    dragging
                      ? 'border-primary bg-primary/10 shadow-[0_0_24px_rgba(190,198,224,0.15)]'
                      : 'border-white/15 bg-white/[0.02] hover:border-primary/50 hover:bg-white/[0.04]'
                  }`}
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    const f = e.dataTransfer.files[0];
                    if (f) handleFile(f);
                  }}
                >
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-primary group-hover:border-primary/40 transition-colors shadow-inner">
                    <span className="material-symbols-outlined text-3xl sm:text-4xl text-primary">upload_file</span>
                  </div>
                  <div className="text-center space-y-1.5">
                    <h3 className="text-lg sm:text-xl font-bold text-[#F5F5F5] tracking-tight">Upload Invoice Batch</h3>
                    <p className="text-xs sm:text-sm text-[#9CA3AF] max-w-sm leading-relaxed">
                      Upload CSV or JSON with invoice_id, vendor_id, amount, bank_account, and ifsc columns.
                    </p>
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,.json"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                  />
                </div>

                {error && (
                  <div className="w-full p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2.5 text-red-400 font-mono text-xs">
                    <span className="material-symbols-outlined text-base">error</span>
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex items-center gap-4 w-full my-1">
                  <div className="flex-1 h-px bg-white/[0.08]" />
                  <span className="font-mono text-[11px] uppercase tracking-widest text-[#9CA3AF]/70 font-medium">OR</span>
                  <div className="flex-1 h-px bg-white/[0.08]" />
                </div>

                <button
                  onClick={() => runBatch()}
                  className="w-full min-h-[48px] px-6 py-3.5 rounded-full bg-white/[0.03] border border-white/15 hover:bg-white/[0.08] hover:border-white/25 text-[#E5E7EB] font-mono text-xs sm:text-sm font-semibold tracking-wider transition-all duration-200 flex items-center justify-center gap-2.5 shadow-sm active:scale-[0.99]"
                >
                  <span className="material-symbols-outlined text-primary text-base">rocket_launch</span>
                  <span>RUN DEMO — 50 INVOICE BATCH</span>
                </button>
              </div>
            )}

            {/* ── Processing Phase ── */}
            {phase === 'processing' && (
              <div className="w-full flex flex-col gap-8">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary animate-spin text-xl">sync</span>
                    <h3 className="text-lg sm:text-xl font-bold text-[#F5F5F5] tracking-tight">Analysis in Progress...</h3>
                  </div>
                  <span className="font-mono text-xs text-[#9CA3AF] bg-white/[0.04] border border-white/10 px-2.5 py-1 rounded-full">RocketRide Pipeline</span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-white/[0.06] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(190,198,224,0.5)]"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                {/* Steps */}
                <div className="space-y-4 font-mono text-xs sm:text-sm">
                  {[
                    { label: 'Screening invoices', done: progress > 20 },
                    { label: 'Checking vendor records', done: progress > 40 },
                    { label: 'Running fraud rules engine', done: progress > 60 },
                    { label: 'Detecting anomalies', done: progress > 80 },
                    { label: 'Generating batch report', done: progress >= 100 },
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-4 text-[#F5F5F5]">
                      {step.done ? (
                        <span className="material-symbols-outlined text-emerald-400 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      ) : progress > (i * 20 - 10) ? (
                        <span className="material-symbols-outlined text-amber-300 animate-spin text-lg">refresh</span>
                      ) : (
                        <span className="material-symbols-outlined text-[#9CA3AF]/50 text-lg">schedule</span>
                      )}
                      <span className={step.done ? 'text-[#F5F5F5]' : 'text-[#9CA3AF]'}>{step.label}</span>
                      <span className={`ml-auto font-mono text-[11px] ${step.done ? 'text-emerald-400' : 'text-amber-300 animate-pulse'}`}>
                        {step.done ? 'DONE' : progress > (i * 20 - 10) ? 'IN PROGRESS' : 'PENDING'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Results Phase ── */}
            {phase === 'results' && batch && (
              <div className="w-full flex flex-col gap-6">
                {/* Summary bar */}
                <div className="p-6 bg-white/[0.02] border border-white/10 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex flex-col gap-2">
                    <span className="font-mono text-xs text-[#9CA3AF] uppercase tracking-wider">
                      Batch {batch.batch_id} — {batch.processed} Processed
                    </span>
                    <div className="flex flex-wrap items-center gap-3 text-lg sm:text-xl font-bold">
                      <span className="text-emerald-400">{batch.cleared} Cleared</span>
                      <span className="text-white/20">|</span>
                      <span className="text-amber-300">{batch.medium_risk} Medium</span>
                      <span className="text-white/20">|</span>
                      <span className="text-red-400">{batch.held} Held</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      onClick={() => { setPhase('upload'); setBatch(null); }}
                      className="px-4 py-2 rounded-full bg-white/[0.04] border border-white/15 text-[#E5E7EB] hover:bg-white/[0.08] hover:border-white/25 font-mono text-xs font-medium transition-all flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">refresh</span>
                      NEW BATCH
                    </button>
                    {batch.held > 0 && (
                      <button
                        onClick={() => navigate('/cases')}
                        className="px-4 py-2 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all font-mono text-xs font-semibold flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-sm">warning</span>
                        VIEW {batch.held} HELD CASES
                      </button>
                    )}
                  </div>
                </div>

                {/* Invoice list */}
                <div className="bg-[#050c1a] border border-white/10 rounded-2xl overflow-hidden">
                  <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b border-white/[0.08] bg-white/[0.02] font-mono text-[11px] text-[#9CA3AF] uppercase tracking-wider">
                    <div className="col-span-3">Invoice ID</div>
                    <div className="col-span-3">Vendor</div>
                    <div className="col-span-2">Amount</div>
                    <div className="col-span-2">Risk</div>
                    <div className="col-span-2">Status</div>
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    {batch.invoices.map((inv, i) => (
                      <div
                        key={`${inv.invoice_id}-${i}`}
                        className={`grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 p-4 hover:bg-white/[0.03] transition-colors items-center cursor-pointer ${
                          i < batch.invoices.length - 1 ? 'border-b border-white/[0.06]' : ''
                        }`}
                        onClick={() => inv.case_id && navigate(`/cases/${inv.case_id}`)}
                      >
                        <div className="md:col-span-3">
                          <span className="font-mono text-xs text-[#F5F5F5]">{inv.invoice_id}</span>
                        </div>
                        <div className="md:col-span-3">
                          <span className="text-sm font-medium text-[#F5F5F5]">{inv.vendor_name || inv.vendor_id}</span>
                        </div>
                        <div className="md:col-span-2">
                          <span className="font-mono text-xs font-semibold text-[#F5F5F5]">
                            {formatUsd(inv.amount)}
                          </span>
                        </div>
                        <div className="md:col-span-2">
                          {inv.risk_level && <RiskBadge level={inv.risk_level} size="sm" />}
                        </div>
                        <div className="md:col-span-2">
                          <StatusPill status={inv.payment_status} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
