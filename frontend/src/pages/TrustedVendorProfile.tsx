import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getCase, getVendor } from '../api/client';
import type { VendorProfile, FraudCaseDetail } from '../types';
import { Spinner, ErrorState, EmptyState, formatUsd } from '../components/StatusBadges';

export default function TrustedVendorProfilePage() {
  const { vendorId, caseId } = useParams<{ vendorId?: string; caseId?: string }>();
  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [caseData, setCaseData] = useState<FraudCaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const load = async () => {
    const id = vendorId || caseId;
    if (!id) {
      setError('No vendor or case identifier provided');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (vendorId) {
        // Direct vendor detail route: /vendors/:vendorId
        const vendorData = await getVendor(vendorId);
        setVendor(vendorData);
      } else if (caseId) {
        // Case-related vendor route: /invoices/:caseId/vendor
        const caseDetail = await getCase(caseId);
        setCaseData(caseDetail);
        const vendorData = await getVendor(caseDetail.vendor_id);
        setVendor(vendorData);
      }
    } catch (e: unknown) {
      const err = e as { error?: string; status?: number };
      setError(err?.error || 'Vendor not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [vendorId, caseId]);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (error) return <ErrorState error={error} onRetry={load} />;
  if (!vendor) {
    return (
      <main className="flex-grow w-full max-w-container-max mx-auto px-4 sm:px-6 lg:px-10 py-8">
        <EmptyState
          icon="store"
          title="Vendor Not Found"
          message={`Vendor ${vendorId || caseId || ''} does not exist in the registry.`}
        />
      </main>
    );
  }

  return (
    <main className="flex-grow w-full max-w-container-max mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8 pb-32 md:pb-8 flex flex-col gap-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-mono text-[#9CA3AF]">
        <Link to="/vendors" className="hover:text-[#F5F5F5] transition-colors flex items-center gap-1">
          <span className="material-symbols-outlined text-[15px]">store</span>
          <span>Vendors</span>
        </Link>
        <span className="text-white/30">/</span>
        <span className="text-[#F5F5F5] font-medium">{vendor.vendor_id}</span>
        {caseId && (
          <>
            <span className="text-white/30">/</span>
            <button
              onClick={() => navigate(`/cases/${caseId}`)}
              className="text-primary hover:text-white transition-colors"
            >
              Case {caseId}
            </button>
          </>
        )}
      </div>

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-mono text-[11px] font-semibold uppercase tracking-wider w-fit">
            <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              verified
            </span>
            <span>Trusted Registry Record</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#F5F5F5]">
            {vendor.vendor_name}
          </h1>
          <p className="font-mono text-xs text-[#9CA3AF]">
            VENDOR ID: <span className="text-primary font-medium tracking-wider">{vendor.vendor_id}</span>
          </p>
        </div>
        {caseId && (
          <button
            onClick={() => navigate(`/invoices/${caseId}/verify`)}
            className="px-6 py-3 rounded-full bg-[#F5F5F5] text-[#0A0D14] hover:bg-white font-mono text-xs font-bold tracking-wider shadow-[0_0_16px_rgba(255,255,255,0.2)] transition-all duration-200 flex items-center justify-center gap-2 min-h-[44px]"
          >
            <span className="material-symbols-outlined text-sm">phone_in_talk</span>
            <span>VERIFY THIS VENDOR</span>
          </button>
        )}
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Left Column: Contact & Security */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* Trusted Contact */}
          <div className="rounded-2xl bg-[#050c1a] border border-white/10 p-6 flex flex-col gap-5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-[#E5E7EB] flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">contact_mail</span>
                Trusted Contact Information
              </h2>
            </div>

            <div className="space-y-3">
              {vendor.known_phone && (
                <div className="flex justify-between items-center p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#9CA3AF] text-lg">phone</span>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-[#9CA3AF]">Verified Phone</p>
                      <p className="font-mono text-sm font-semibold text-[#F5F5F5]">{vendor.known_phone}</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-emerald-400 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                </div>
              )}

              <div className="flex justify-between items-center p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#9CA3AF] text-lg">account_balance</span>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-[#9CA3AF]">Verified Bank Account &amp; IFSC</p>
                    <p className="font-mono text-sm font-semibold text-[#F5F5F5]">{vendor.known_bank_account} / {vendor.known_ifsc}</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-emerald-400 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              </div>

              {vendor.known_email && (
                <div className="flex justify-between items-center p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#9CA3AF] text-lg">mail</span>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-[#9CA3AF]">Verified Email</p>
                      <p className="font-mono text-xs sm:text-sm font-semibold text-[#F5F5F5]">{vendor.known_email}</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-emerald-400 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                </div>
              )}
            </div>

            {/* Security Protocol Alert */}
            <div className="bg-red-500/[0.04] border border-red-500/25 p-4 rounded-xl flex items-start gap-3">
              <span className="material-symbols-outlined text-red-400 text-lg mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
              <div className="flex flex-col gap-0.5">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-red-400">SECURITY PROTOCOL</p>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  Do not use contact information supplied in invoice headers or email requests. Always verify against this immutable registry record.
                </p>
              </div>
            </div>
          </div>

          {/* Known Approvers */}
          <div className="rounded-2xl bg-[#050c1a] border border-white/10 p-6 flex flex-col gap-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-[#E5E7EB] flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">how_to_reg</span>
                Authorized Approvers
              </h2>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {vendor.known_approvers.map((a, i) => (
                <span key={i} className="bg-white/[0.03] border border-white/10 text-[#E5E7EB] font-mono text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {a}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Payment Behavior */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          <div className="rounded-2xl bg-[#050c1a] border border-white/10 p-6 shadow-lg flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-[#E5E7EB] flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">monitoring</span>
                Disbursement Behavior &amp; History
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4 flex flex-col gap-1">
                <p className="font-mono text-[11px] uppercase tracking-wider text-[#9CA3AF]">Normal Invoice Range</p>
                <p className="font-mono text-xl sm:text-2xl font-bold text-[#F5F5F5]">
                  {formatUsd(vendor.usual_invoice_min)} – {formatUsd(vendor.usual_invoice_max)}
                </p>
              </div>
              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4 flex flex-col gap-1">
                <p className="font-mono text-[11px] uppercase tracking-wider text-[#9CA3AF]">Historical Payments</p>
                <p className="font-mono text-xl sm:text-2xl font-bold text-[#F5F5F5]">
                  {vendor.recent_payments.length} Cleared
                </p>
              </div>
            </div>

            {/* Recent Cleared Activity */}
            {vendor.recent_payments.length > 0 && (
              <div className="flex flex-col gap-3 pt-2">
                <h3 className="font-mono text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">
                  Recent Cleared Invoices
                </h3>
                <div className="space-y-2">
                  {vendor.recent_payments.map((p, i) => (
                    <div key={i} className="flex justify-between items-center p-3.5 bg-white/[0.02] rounded-xl border border-white/[0.06] hover:bg-white/[0.04] transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-emerald-400 p-1.5 bg-emerald-500/10 rounded-full text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                          check
                        </span>
                        <div>
                          <p className="font-mono text-xs font-semibold text-[#F5F5F5]">{p.invoice_id}</p>
                          <p className="font-mono text-[11px] text-[#9CA3AF]">
                            {p.paid_at ? new Date(p.paid_at).toLocaleDateString('en-IN') : '—'}
                          </p>
                        </div>
                      </div>
                      <span className="font-mono text-sm font-bold text-[#F5F5F5]">
                        {formatUsd(p.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Case context if opened from a case */}
            {caseData && (
              <div className="mt-2 p-4 bg-red-500/[0.04] border border-red-500/25 rounded-xl flex flex-col gap-1.5">
                <p className="font-mono text-[11px] font-semibold text-red-400 uppercase tracking-wider">ACTIVE FRAUD CASE CONTEXT</p>
                <p className="text-xs sm:text-sm text-[#9CA3AF] leading-relaxed">
                  Invoice <strong className="text-[#F5F5F5] font-mono">{caseData.invoice_id}</strong> was requested for{' '}
                  <strong className="text-red-400 font-mono">{formatUsd(caseData.amount)}</strong> to account{' '}
                  <strong className="text-red-400 font-mono">{caseData.bank_account}</strong> (mismatches registered bank account <span className="font-mono text-[#F5F5F5]">{vendor.known_bank_account}</span>).
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
