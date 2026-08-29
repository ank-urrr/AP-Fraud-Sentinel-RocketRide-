import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listVendors } from '../api/client';
import type { VendorProfile } from '../types';
import { Spinner, ErrorState, EmptyState, formatUsd } from '../components/StatusBadges';

export default function VendorsList() {
  const [vendors, setVendors] = useState<VendorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setVendors(await listVendors());
    } catch (e: unknown) {
      const err = e as { error?: string };
      setError(err?.error || 'Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <main className="flex-grow w-full max-w-container-max mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8 pb-32 md:pb-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1.5 pb-2">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-md shadow-[0_0_15px_rgba(255,255,255,0.03)] w-fit">
          <span className="material-symbols-outlined text-[14px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
            store
          </span>
          <span className="font-mono text-[11px] font-medium tracking-wide text-[#E5E7EB] uppercase">
            Verified Entity Directory
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#F5F5F5]">
          Trusted Vendor Registry
        </h1>
        <p className="text-xs sm:text-sm text-[#9CA3AF]">
          {vendors.length} verified vendor{vendors.length !== 1 ? 's' : ''} on record. These represent the baseline truth for fraud detection.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : error ? (
        <ErrorState error={error} onRetry={load} />
      ) : vendors.length === 0 ? (
        <EmptyState icon="store" title="No Vendors" message="No vendors in the registry." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {vendors.map((v) => (
            <div
              key={v.vendor_id}
              className="rounded-2xl bg-[#050c1a] border border-white/10 p-6 flex flex-col justify-between gap-4 shadow-lg hover:border-white/25 hover:bg-[#071124] transition-all duration-200 cursor-pointer group"
              onClick={() => navigate(`/vendors/${v.vendor_id}`)}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] pb-4">
                <div className="flex flex-col">
                  <h2 className="text-base sm:text-lg font-bold text-[#F5F5F5] tracking-tight group-hover:text-white transition-colors">
                    {v.vendor_name}
                  </h2>
                  <span className="font-mono text-xs text-primary font-medium tracking-wider mt-0.5">
                    {v.vendor_id}
                  </span>
                </div>
                <div className="w-7 h-7 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)] shrink-0">
                  <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    verified
                  </span>
                </div>
              </div>

              {/* 2x2 Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-wider text-[#9CA3AF]">
                    VERIFIED PHONE
                  </span>
                  <span className="font-mono text-xs sm:text-sm font-semibold text-[#F5F5F5]">
                    {v.known_phone || 'Not set'}
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-wider text-[#9CA3AF]">
                    BANK ACCOUNT
                  </span>
                  <span className="font-mono text-xs sm:text-sm font-semibold text-[#F5F5F5] truncate">
                    {v.known_bank_account}
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-wider text-[#9CA3AF]">
                    INVOICE RANGE
                  </span>
                  <span className="font-mono text-xs sm:text-sm font-semibold text-[#F5F5F5]">
                    {formatUsd(v.usual_invoice_min)} – {formatUsd(v.usual_invoice_max)}
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-wider text-[#9CA3AF]">
                    APPROVERS
                  </span>
                  <span className="font-mono text-xs sm:text-sm font-semibold text-[#F5F5F5] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    {v.known_approvers.length} known
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
