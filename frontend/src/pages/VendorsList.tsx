import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listVendors } from '../api/client';
import type { VendorProfile } from '../types';
import { Spinner, ErrorState, EmptyState } from '../components/StatusBadges';

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
    <main className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-8 pb-32 md:pb-8">
      <div className="mb-6">
        <h1 className="font-headline-lg text-headline-lg text-on-background">Trusted Vendor Registry</h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
          {vendors.length} verified vendors on record. These are the source of truth for fraud detection.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : error ? (
        <ErrorState error={error} onRetry={load} />
      ) : vendors.length === 0 ? (
        <EmptyState icon="store" title="No Vendors" message="No vendors in the registry." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vendors.map((v) => (
            <div
              key={v.vendor_id}
              className="bg-surface-container-low border border-outline-variant rounded-xl p-6 flex flex-col gap-4 hover:border-primary cursor-pointer transition-colors"
              onClick={() => navigate(`/vendors/${v.vendor_id}`)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-headline-md text-headline-md text-on-background">{v.vendor_name}</h2>
                  <p className="font-mono-data text-[11px] text-on-surface-variant mt-1">{v.vendor_id}</p>
                </div>
                <span className="material-symbols-outlined text-green-400 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="font-label-caps text-label-caps text-on-surface-variant mb-1">VERIFIED PHONE</p>
                  <p className="font-mono-data text-[12px] text-on-background">{v.known_phone || 'Not set'}</p>
                </div>
                <div>
                  <p className="font-label-caps text-label-caps text-on-surface-variant mb-1">BANK ACCOUNT</p>
                  <p className="font-mono-data text-[12px] text-on-background">{v.known_bank_account}</p>
                </div>
                <div>
                  <p className="font-label-caps text-label-caps text-on-surface-variant mb-1">INVOICE RANGE</p>
                  <p className="font-mono-data text-[12px] text-on-background">
                    ₹{(v.usual_invoice_min/1000).toFixed(0)}k–₹{(v.usual_invoice_max/1000).toFixed(0)}k
                  </p>
                </div>
                <div>
                  <p className="font-label-caps text-label-caps text-on-surface-variant mb-1">APPROVERS</p>
                  <p className="font-body-sm text-body-sm text-on-background">{v.known_approvers.length} known</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
