import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadBatch, uploadDemoBatch } from '../api/client';
import { useAppStore } from '../context/store';
import type { BatchResult } from '../types';
import { RiskBadge, StatusPill, Spinner } from '../components/StatusBadges';

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
    <main className="flex-grow flex flex-col items-center justify-center p-gutter md:p-margin-desktop w-full max-w-container-max mx-auto">
      <div className="w-full max-w-3xl flex flex-col gap-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="font-display-lg text-display-lg text-on-background">Invoice Screening</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant">Batch Upload &amp; Analysis</p>
        </div>

        {/* Main Panel */}
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl shadow-[0_12px_24px_rgba(0,0,0,0.5)] overflow-hidden relative">
          <div className="absolute inset-0 pointer-events-none border border-white/5 rounded-xl" />

          <div className="p-8 md:p-12 flex flex-col items-center justify-center min-h-[400px] gap-8">

            {/* ── Upload Phase ── */}
            {phase === 'upload' && (
              <div className="w-full flex flex-col items-center gap-6">
                <div
                  className={`w-full border-2 border-dashed rounded-xl p-12 flex flex-col items-center gap-4 cursor-pointer transition-colors ${
                    dragging ? 'border-primary bg-primary/5' : 'border-outline-variant hover:border-primary hover:bg-surface-container-highest/30'
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
                  <div className="w-20 h-20 rounded-full bg-surface-container flex items-center justify-center border border-outline-variant">
                    <span className="material-symbols-outlined text-4xl text-on-surface-variant">upload_file</span>
                  </div>
                  <div className="text-center space-y-1">
                    <h3 className="font-headline-md text-headline-md text-on-background">Upload Invoice Batch</h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Drag and drop CSV or JSON files here, or click to browse.
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
                  <div className="w-full p-3 bg-error-container/20 border border-error rounded-lg flex items-center gap-2 text-error font-body-sm text-body-sm">
                    <span className="material-symbols-outlined text-sm">error</span>
                    {error}
                  </div>
                )}

                <div className="flex items-center gap-4 w-full">
                  <div className="flex-1 h-px bg-outline-variant" />
                  <span className="font-label-caps text-label-caps text-on-surface-variant">OR</span>
                  <div className="flex-1 h-px bg-outline-variant" />
                </div>

                <button
                  onClick={() => runBatch()}
                  className="w-full bg-primary-container border border-primary text-on-primary-container font-label-caps text-label-caps py-4 rounded-lg hover:bg-primary hover:text-on-primary transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">rocket_launch</span>
                  RUN DEMO — 50 INVOICE BATCH
                </button>
              </div>
            )}

            {/* ── Processing Phase ── */}
            {phase === 'processing' && (
              <div className="w-full flex flex-col gap-8">
                <div className="flex items-center justify-between border-b border-[#334155] pb-4">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-tertiary animate-spin">sync</span>
                    <h3 className="font-headline-md text-headline-md text-on-background">Analysis in Progress...</h3>
                  </div>
                  <span className="font-mono-data text-[12px] text-on-surface-variant">RocketRide Pipeline</span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-surface-container-lowest h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                {/* Steps */}
                <div className="space-y-4 font-body-md text-body-md">
                  {[
                    { label: 'Screening invoices', done: progress > 20 },
                    { label: 'Checking vendor records', done: progress > 40 },
                    { label: 'Running fraud rules engine', done: progress > 60 },
                    { label: 'Detecting anomalies', done: progress > 80 },
                    { label: 'Generating batch report', done: progress >= 100 },
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-4 text-on-background">
                      {step.done ? (
                        <span className="material-symbols-outlined text-green-400" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      ) : progress > (i * 20 - 10) ? (
                        <span className="material-symbols-outlined text-tertiary animate-spin">refresh</span>
                      ) : (
                        <span className="material-symbols-outlined text-on-surface-variant opacity-50">schedule</span>
                      )}
                      <span className={step.done ? '' : 'opacity-60'}>{step.label}</span>
                      <span className={`ml-auto font-label-caps text-label-caps ${step.done ? 'text-on-surface-variant' : 'text-tertiary animate-pulse'}`}>
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
                <div className="p-6 bg-surface-container-low/50 border border-outline-variant rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex flex-col gap-2">
                    <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                      Batch {batch.batch_id} — {batch.processed} Processed
                    </span>
                    <div className="flex flex-wrap gap-3 font-headline-md text-headline-md">
                      <span className="text-green-400">{batch.cleared} Cleared</span>
                      <span className="text-on-surface-variant">|</span>
                      <span className="text-tertiary">{batch.medium_risk} Medium</span>
                      <span className="text-on-surface-variant">|</span>
                      <span className="text-error">{batch.held} Held</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setPhase('upload'); setBatch(null); }}
                      className="bg-surface-container-highest border border-outline-variant text-on-background font-label-caps text-label-caps py-2 px-4 rounded hover:bg-surface-bright transition-colors flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">refresh</span>
                      NEW BATCH
                    </button>
                    {batch.held > 0 && (
                      <button
                        onClick={() => navigate('/cases')}
                        className="bg-error-container/20 border border-error text-error font-label-caps text-label-caps py-2 px-4 rounded hover:bg-error/20 transition-colors flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-sm">warning</span>
                        VIEW {batch.held} HELD CASES
                      </button>
                    )}
                  </div>
                </div>

                {/* Invoice list */}
                <div className="bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden">
                  <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b border-outline-variant bg-surface-container-lowest/50 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
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
                        className={`grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 p-4 hover:bg-surface-container-highest/30 transition-colors items-center cursor-pointer ${
                          i < batch.invoices.length - 1 ? 'border-b border-outline-variant' : ''
                        }`}
                        onClick={() => inv.case_id && navigate(`/cases/${inv.case_id}`)}
                      >
                        <div className="md:col-span-3">
                          <span className="font-mono-data text-[12px] text-on-background">{inv.invoice_id}</span>
                        </div>
                        <div className="md:col-span-3">
                          <span className="font-body-sm text-body-sm text-on-background">{inv.vendor_name || inv.vendor_id}</span>
                        </div>
                        <div className="md:col-span-2">
                          <span className="font-mono-data text-[13px] text-on-background">
                            ₹{inv.amount.toLocaleString('en-IN')}
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
