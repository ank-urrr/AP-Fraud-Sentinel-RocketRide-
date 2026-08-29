import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '../context/store';

const navItems = [
  { label: 'OVERVIEW', path: '/', icon: 'dashboard' },
  { label: 'INVOICES', path: '/invoices', icon: 'description' },
  { label: 'CASES', path: '/cases', icon: 'gavel' },
  { label: 'VENDORS', path: '/vendors', icon: 'store' },
  { label: 'AUDIT', path: '/audit', icon: 'analytics' },
  { label: 'STATUS', path: '/status', icon: 'health_and_safety' },
];

export function TopNav() {
  const location = useLocation();
  const callingMode = useAppStore((s) => s.callingMode);

  return (
    <header className="sticky top-0 z-50 w-full h-16 bg-[#030914]/80 backdrop-blur-xl border-b border-white/[0.08] flex items-center justify-between px-4 sm:px-6 lg:px-10 transition-all">
      {/* Brand / Logo */}
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center shadow-[0_0_16px_rgba(190,198,224,0.15)] group-hover:border-primary/50 transition-all">
            <span className="material-symbols-outlined text-primary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
          </div>
          <span className="text-base sm:text-lg font-bold text-[#F5F5F5] tracking-tight group-hover:text-white transition-colors">
            AP Sentinel
          </span>
        </Link>
        {callingMode === 'mock' && (
          <span className="hidden sm:inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/25 text-amber-300 font-mono text-[10px] uppercase px-2.5 py-0.5 rounded-full tracking-wider">
            <span className="material-symbols-outlined text-xs">science</span>
            MOCK MODE
          </span>
        )}
      </div>

      {/* Desktop nav links */}
      <nav className="hidden md:flex items-center gap-1 bg-white/[0.02] border border-white/[0.06] rounded-full p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider px-3.5 py-1.5 rounded-full transition-all duration-150 ${
                isActive
                  ? 'bg-white/[0.1] text-[#F5F5F5] font-semibold border border-white/10 shadow-[0_1px_3px_rgba(0,0,0,0.4)]'
                  : 'text-[#9CA3AF] hover:text-[#F5F5F5] hover:bg-white/[0.04]'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Right actions */}
      <div className="max-md:absolute max-md:right-4 flex shrink-0 items-center gap-1.5 sm:gap-2 lg:gap-3">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link
            to="/invoices"
            aria-label="Portal"
            title="Portal"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.04] border border-white/15 text-[#E5E7EB] hover:bg-white/[0.08] hover:border-white/25 transition-all duration-200 lg:h-auto lg:w-auto lg:px-3.5 lg:py-1.5 lg:text-xs lg:font-medium"
          >
            <span className="material-symbols-outlined text-[18px] lg:hidden">apps</span>
            <span className="sr-only lg:not-sr-only">Portal</span>
          </Link>
          <Link
            to="/invoices"
            aria-label="New Batch"
            title="New Batch"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F5F5F5] text-[#0A0D14] hover:bg-white shadow-[0_0_12px_rgba(255,255,255,0.2)] transition-all duration-200 lg:h-auto lg:w-auto lg:px-3.5 lg:py-1.5 lg:text-xs lg:font-semibold"
          >
            <span className="material-symbols-outlined text-[18px] lg:hidden">add</span>
            <span className="sr-only lg:not-sr-only">New Batch</span>
          </Link>
        </div>
        <div className="relative flex items-center">
          <div className="w-10 h-10 lg:w-8 lg:h-8 rounded-full bg-white/[0.05] border border-white/15 flex items-center justify-center text-[#E5E7EB] hover:border-white/30 transition-all cursor-pointer">
            <span className="material-symbols-outlined text-sm text-[#9CA3AF]">person</span>
          </div>
          <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-[#030914]" />
        </div>
      </div>
    </header>
  );
}

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 py-2.5 bg-[#030914]/95 backdrop-blur-xl border-t border-white/[0.08] shadow-[0_-4px_24px_rgba(0,0,0,0.6)]">
      {navItems.slice(0, 5).map((item) => {
        const isActive = location.pathname === item.path ||
          (item.path !== '/' && location.pathname.startsWith(item.path));
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center justify-center px-2 py-1 transition-all rounded-lg ${
              isActive
                ? 'text-[#F5F5F5] bg-white/[0.08] border border-white/10'
                : 'text-[#9CA3AF] hover:text-[#F5F5F5]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]" style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}>
              {item.icon}
            </span>
            <span className="font-mono text-[9px] tracking-wider mt-0.5">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
