import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TopNav, BottomNav } from './components/Navigation';
import Dashboard from './pages/Dashboard';
import InvoiceScreening from './pages/InvoiceScreening';
import CasesList from './pages/CasesList';
import CaseDetail from './pages/CaseDetail';
import TrustedVendorProfile from './pages/TrustedVendorProfile';
import VerificationCall from './pages/VerificationCall';
import HumanDecisionGate from './pages/HumanDecisionGate';
import SecurityAuditTrail from './pages/SecurityAuditTrail';
import SystemStatusErrors from './pages/SystemStatusErrors';
import VendorsList from './pages/VendorsList';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-background text-on-background overflow-x-hidden">
        {/* CRT scan ambient effect */}
        <div className="crt-scan" />

        <TopNav />

        <div className="flex-1 flex flex-col md:pb-0 pb-20">
          <Routes>
            {/* Dashboard */}
            <Route path="/" element={<Dashboard />} />

            {/* Invoice Screening */}
            <Route path="/invoices" element={<InvoiceScreening />} />

            {/* Case routes — /invoices/:caseId is the case detail view */}
            <Route path="/invoices/:caseId/vendor" element={<TrustedVendorProfile />} />
            <Route path="/invoices/:caseId/verify" element={<VerificationCall />} />
            <Route path="/invoices/:caseId/decide" element={<HumanDecisionGate />} />

            {/* Cases list and detail */}
            <Route path="/cases" element={<CasesList />} />
            <Route path="/cases/:caseId" element={<CaseDetail />} />

            {/* Vendors */}
            <Route path="/vendors" element={<VendorsList />} />
            <Route path="/vendors/:vendorId" element={<TrustedVendorProfile />} />

            {/* Audit trail */}
            <Route path="/audit" element={<CasesList />} />
            <Route path="/audit/:caseId" element={<SecurityAuditTrail />} />

            {/* System status */}
            <Route path="/status" element={<SystemStatusErrors />} />

            {/* 404 */}
            <Route path="*" element={
              <div className="flex-grow flex items-center justify-center flex-col gap-4 py-20">
                <span className="material-symbols-outlined text-[#9CA3AF] text-6xl">search_off</span>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F5F5F5]">Page Not Found</h1>
                <a href="/" className="font-mono text-xs font-semibold text-primary hover:underline uppercase tracking-wider">← Back to Dashboard</a>
              </div>
            } />
          </Routes>
        </div>

        <BottomNav />
      </div>
    </BrowserRouter>
  );
}
