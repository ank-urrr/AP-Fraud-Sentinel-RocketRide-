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
    <header className="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop h-16 bg-background border-b border-outline-variant sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
        <span className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-md md:text-headline-md font-bold text-on-background tracking-tight">
          AP Sentinel
        </span>
        {callingMode === 'mock' && (
          <span className="hidden md:inline-flex items-center gap-1 bg-tertiary-container border border-tertiary text-tertiary font-label-caps text-label-caps px-2 py-0.5 rounded ml-2">
            <span className="material-symbols-outlined text-xs">science</span>
            MOCK MODE
          </span>
        )}
      </div>

      {/* Desktop nav */}
      <nav className="hidden md:flex items-center gap-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-1.5 font-label-caps text-label-caps px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary-container text-on-primary-container'
                  : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-highest'
              }`}
            >
              <span className="material-symbols-outlined text-sm">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-surface-container-highest border border-outline-variant flex items-center justify-center">
          <span className="material-symbols-outlined text-on-surface-variant text-sm">person</span>
        </div>
      </div>
    </header>
  );
}

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 py-3 bg-surface-container border-t border-outline-variant rounded-t-xl shadow-lg">
      {navItems.slice(0, 5).map((item) => {
        const isActive = location.pathname === item.path ||
          (item.path !== '/' && location.pathname.startsWith(item.path));
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center justify-center px-2 transition-all ${
              isActive
                ? 'bg-primary-container text-on-primary-container rounded-full px-4 py-1 scale-90'
                : 'text-on-surface-variant'
            }`}
          >
            <span className="material-symbols-outlined" style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}>
              {item.icon}
            </span>
            <span className="font-label-caps text-[10px] mt-1">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
