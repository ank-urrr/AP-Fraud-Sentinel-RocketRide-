import type { RiskLevel, PaymentStatus, VerificationStatus } from '../types';

interface RiskBadgeProps {
  level: RiskLevel;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

const RISK_CONFIG: Record<RiskLevel, { color: string; icon: string; label: string }> = {
  LOW: { color: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400', icon: 'check_circle', label: 'Low Risk' },
  MEDIUM: { color: 'border-amber-500/30 bg-amber-500/10 text-amber-300', icon: 'warning', label: 'Medium Risk' },
  HIGH: { color: 'border-orange-500/30 bg-orange-500/10 text-orange-400', icon: 'crisis_alert', label: 'High Risk' },
  CRITICAL: { color: 'border-red-500/30 bg-red-500/10 text-red-400', icon: 'crisis_alert', label: 'Critical Risk' },
};

export function RiskBadge({ level, showIcon = true, size = 'md' }: RiskBadgeProps) {
  const cfg = RISK_CONFIG[level];
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border font-mono ${size === 'sm' ? 'text-[10px]' : 'text-[11px]'} font-medium uppercase tracking-wider ${cfg.color}`}>
      {showIcon && (
        <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>
          {cfg.icon}
        </span>
      )}
      {cfg.label}
    </div>
  );
}

// ── Payment Status Pill ───────────────────────────────────────────────────────

const STATUS_CONFIG: Record<PaymentStatus, { color: string; icon: string; label: string }> = {
  PENDING: { color: 'border-white/15 bg-white/[0.04] text-[#9CA3AF]', icon: 'schedule', label: 'Pending' },
  CLEARED: { color: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400', icon: 'check_circle', label: 'Cleared' },
  HELD: { color: 'border-amber-500/30 bg-amber-500/10 text-amber-300', icon: 'front_hand', label: 'HELD' },
  RELEASE_APPROVED: { color: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400', icon: 'task_alt', label: 'Released' },
  REJECTED: { color: 'border-red-500/30 bg-red-500/10 text-red-400', icon: 'cancel', label: 'Rejected' },
};

export function StatusPill({ status }: { status: PaymentStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border font-mono text-[11px] font-medium tracking-wide ${cfg.color}`}>
      <span className="material-symbols-outlined text-[13px]">{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}

// ── Verification Status ───────────────────────────────────────────────────────

const VCALL_CONFIG: Record<VerificationStatus, { color: string; icon: string; label: string }> = {
  NOT_STARTED: { color: 'text-on-surface-variant', icon: 'radio_button_unchecked', label: 'Not Started' },
  QUEUED: { color: 'text-primary', icon: 'hourglass_empty', label: 'Queued' },
  CALLING: { color: 'text-tertiary', icon: 'phone_in_talk', label: 'Calling...' },
  CONNECTED: { color: 'text-tertiary', icon: 'call', label: 'Connected' },
  COMPLETED: { color: 'text-green-400', icon: 'call_end', label: 'Completed' },
  FAILED: { color: 'text-error', icon: 'call_missed', label: 'Failed' },
};

export function VerificationStatusBadge({ status }: { status: VerificationStatus }) {
  const cfg = VCALL_CONFIG[status];
  const isActive = ['QUEUED', 'CALLING', 'CONNECTED'].includes(status);
  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider ${cfg.color}`}>
      <span className={`material-symbols-outlined text-[14px] ${isActive ? 'animate-pulse' : ''}`}>
        {cfg.icon}
      </span>
      {cfg.label}
    </span>
  );
}

// ── Loading spinner ───────────────────────────────────────────────────────────

export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6';
  return (
    <div className={`${s} border-2 border-white/20 border-t-primary rounded-full animate-spin`} />
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────

export function EmptyState({ icon, title, message }: { icon: string; title: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div className="w-14 h-14 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center shadow-inner">
        <span className="material-symbols-outlined text-[#9CA3AF] text-2xl">{icon}</span>
      </div>
      <h3 className="text-lg sm:text-xl font-bold text-[#F5F5F5]">{title}</h3>
      <p className="text-xs sm:text-sm text-[#9CA3AF] max-w-sm">{message}</p>
    </div>
  );
}

// ── Error State ───────────────────────────────────────────────────────────────

export function ErrorState({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center shadow-inner">
        <span className="material-symbols-outlined text-red-400 text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
      </div>
      <p className="font-mono text-xs text-red-400 font-medium">{error}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 bg-white/[0.04] border border-white/15 text-[#E5E7EB] hover:bg-white/[0.08] hover:border-white/25 font-mono text-xs font-semibold tracking-wider px-5 py-2.5 rounded-full transition-all"
        >
          <span className="material-symbols-outlined text-sm">refresh</span>
          <span>RETRY</span>
        </button>
      )}
    </div>
  );
}

// ── Amount formatter ─────────────────────────────────────────────────────────

export function Amount({ value }: { value: number }) {
  return <span className="font-mono font-semibold">{formatUsd(value)}</span>;
}

export function formatUsd(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}
