import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCase, getVendor } from '../api/client';
import type { VendorProfile, FraudCaseDetail } from '../types';
import { Spinner, ErrorState } from '../components/StatusBadges';

export default function TrustedVendorProfilePage() {
  const { caseId } = useParams<{ caseId: string }>();
  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [caseData, setCaseData] = useState<FraudCaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const load = async () => {
    if (!caseId) return;
    setLoading(true);
    setError(null);
    try {
      const caseDetail = await getCase(caseId);
      setCaseData(caseDetail);
      const vendorData = await getVendor(caseDetail.vendor_id);
      setVendor(vendorData);
    } catch (e: unknown) {
      const err = e as { error?: string };
      setError(err?.error || 'Vendor not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [caseId]);

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  if (error) return <ErrorState error={error} onRetry={load} />;
  if (!vendor) return null;

  return (
    <main className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-8 md:py-12 mb-24 md:mb-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4 text-on-surface-variant font-label-caps text-label-caps uppercase">
        <span className="material-symbols-outlined text-[16px]">store</span>
        <span>Vendors</span>
        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
        <span className="text-primary">Trusted Vendor Profile</span>
        {caseId && (
          <>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <button onClick={() => navigate(`/cases/${caseId}`)} className="text-on-surface-variant hover:text-primary transition-colors">{caseId}</button>
          </>
        )}
      </div>

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 border-b border-outline-variant pb-6">
        <div>
          <h1 className="font-display-lg text-display-lg text-on-background mb-2">{vendor.vendor_name}</h1>
          <div className="flex items-center gap-3">
            <span className="bg-surface-container-high border border-outline-variant text-on-background font-label-caps text-label-caps px-3 py-1 rounded-full flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px] text-green-500" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
              Trusted Record
            </span>
            <span className="text-on-surface-variant font-mono-data text-[12px]">ID: {vendor.vendor_id}</span>
          </div>
        </div>
        {caseId && (
          <button
            onClick={() => navigate(`/invoices/${caseId}/verify`)}
            className="bg-primary-container border border-primary text-on-primary-container font-label-caps text-label-caps px-4 py-2 rounded hover:bg-primary hover:text-on-primary transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">phone_in_talk</span>
            VERIFY THIS VENDOR
          </button>
        )}
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Contact & Security */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Trusted Contact */}
          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-container opacity-10 rounded-bl-full pointer-events-none" />
            <h2 className="font-headline-md text-headline-md mb-6 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">contact_mail</span>
              Trusted Contact Information
            </h2>
            <div className="space-y-4 mb-6">
              {vendor.known_phone && (
                <div className="flex justify-between items-center py-3 border-b border-outline-variant/50">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-on-surface-variant">phone</span>
                    <div>
                      <p className="font-label-caps text-label-caps text-on-surface-variant mb-1">Verified Phone</p>
                      <p className="font-mono-data text-[14px] text-on-background">{vendor.known_phone}</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-green-500" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                </div>
              )}
              <div className="flex justify-between items-center py-3 border-b border-outline-variant/50">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-on-surface-variant">account_balance</span>
                  <div>
                    <p className="font-label-caps text-label-caps text-on-surface-variant mb-1">Verified Bank</p>
                    <p className="font-mono-data text-[14px] text-on-background">{vendor.known_bank_account} / {vendor.known_ifsc}</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-green-500" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              </div>
              {vendor.known_email && (
                <div className="flex justify-between items-center py-3">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-on-surface-variant">mail</span>
                    <div>
                      <p className="font-label-caps text-label-caps text-on-surface-variant mb-1">Verified Email</p>
                      <p className="font-mono-data text-[13px] text-on-background">{vendor.known_email}</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-green-500" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                </div>
              )}
            </div>

            {/* Security warning */}
            <div className="bg-error-container/20 border border-error-container p-4 rounded-lg flex items-start gap-3">
              <span className="material-symbols-outlined text-error mt-0.5">warning</span>
              <div>
                <p className="font-label-caps text-label-caps text-error mb-1">SECURITY PROTOCOL</p>
                <p className="font-body-sm text-body-sm text-on-error-container">
                  Do not use contact information supplied by the suspicious request.
                  Always verify against this trusted record.
                </p>
              </div>
            </div>
          </div>

          {/* Known Approvers */}
          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-6">
            <h2 className="font-headline-md text-headline-md mb-4 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">how_to_reg</span>
              Known Approvers
            </h2>
            <div className="flex flex-wrap gap-2">
              {vendor.known_approvers.map((a, i) => (
                <span key={i} className="bg-surface-container border border-outline-variant text-on-background font-label-caps text-label-caps px-3 py-1 rounded-full text-[11px]">
                  {a}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Payment Behavior */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-6 shadow-sm">
            <h2 className="font-headline-md text-headline-md mb-6 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">monitoring</span>
              Payment Behavior Analysis
            </h2>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-surface-container border border-outline-variant rounded-lg p-4">
                <p className="font-label-caps text-label-caps text-on-surface-variant mb-2">Normal Invoice Range</p>
                <p className="font-headline-md text-headline-md text-on-background">
                  ₹{(vendor.usual_invoice_min / 1000).toFixed(0)}k – ₹{(vendor.usual_invoice_max / 1000).toFixed(0)}k
                </p>
              </div>
              <div className="bg-surface-container border border-outline-variant rounded-lg p-4">
                <p className="font-label-caps text-label-caps text-on-surface-variant mb-2">Recent Payments</p>
                <p className="font-headline-md text-headline-md text-on-background">{vendor.recent_payments.length}</p>
              </div>
            </div>

            {/* Recent transactions */}
            {vendor.recent_payments.length > 0 && (
              <div>
                <h3 className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-4">Recent Cleared Activity</h3>
                <div className="space-y-2">
                  {vendor.recent_payments.map((p, i) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-surface-container rounded-lg border border-outline-variant/30 hover:bg-surface-container-highest transition-colors">
                      <div className="flex items-center gap-4">
                        <span className="material-symbols-outlined text-green-500 p-2 bg-green-500/10 rounded-full" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                        <div>
                          <p className="font-mono-data text-[13px] text-on-background">{p.invoice_id}</p>
                          <p className="font-body-sm text-body-sm text-on-surface-variant">
                            {p.paid_at ? new Date(p.paid_at).toLocaleDateString('en-IN') : '—'}
                          </p>
                        </div>
                      </div>
                      <span className="font-mono-data text-[14px] text-on-background">₹{p.amount.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Case context if opened from a case */}
            {caseData && (
              <div className="mt-6 p-4 bg-error-container/10 border border-error/30 rounded-lg">
                <p className="font-label-caps text-label-caps text-error mb-2">ACTIVE FRAUD CASE</p>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Invoice <strong className="text-on-background font-mono-data">{caseData.invoice_id}</strong> for{' '}
                  <strong className="text-error">₹{caseData.amount.toLocaleString('en-IN')}</strong> to account{' '}
                  <strong className="text-error font-mono-data">{caseData.bank_account}</strong> (does not match trusted record above).
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
