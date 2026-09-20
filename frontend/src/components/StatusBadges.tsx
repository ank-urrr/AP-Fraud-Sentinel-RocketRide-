import type { RiskLevel, PaymentStatus, VerificationStatus } from '../types';

interface RiskBadgeProps {
  level: RiskLevel;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

const RISK_CONFIG: Record<RiskLevel, { color: string; icon: string; label: string }> = {
  LOW: { color: 'border-green-500 bg-green-500/10 text-green-400', icon: 'check_circle', label: 'Low Risk' },
  MEDIUM: { color: 'border-tertiary bg-tertiary/10 text-tertiary', icon: 'warning', label: 'Medium Risk' },
  HIGH: { color: 'border-orange-400 bg-orange-400/10 text-orange-400', icon: 'crisis_alert', label: 'High Risk' },
  CRITICAL: { color: 'border-error bg-error/10 text-error', icon: 'crisis_alert', label: 'Critical Risk' },
};

export function RiskBadge({ level, showIcon = true, size = 'md' }: RiskBadgeProps) {
  const cfg = RISK_CONFIG[level];
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border font-label-caps ${size === 'sm' ? 'text-[10px]' : 'text-label-caps'} ${cfg.color}`}>
      {showIcon && (
        <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
          {cfg.icon}
        </span>
      )}
      {cfg.label}
    </div>
  );
}

// ── Payment Status Pill ───────────────────────────────────────────────────────

const STATUS_CONFIG: Record<PaymentStatus, { color: string; icon: string; label: string }> = {
  PENDING: { color: 'border-outline text-on-surface-variant', icon: 'schedule', label: 'Pending' },
  CLEARED: { color: 'border-green-500 text-green-400', icon: 'check_circle', label: 'Cleared' },
  HELD: { color: 'border-tertiary text-tertiary', icon: 'front_hand', label: 'HELD' },
  RELEASE_APPROVED: { color: 'border-green-500 text-green-400', icon: 'task_alt', label: 'Released' },
  REJECTED: { color: 'border-error text-error', icon: 'cancel', label: 'Rejected' },
};

export function StatusPill({ status }: { status: PaymentStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-label-caps text-label-caps ${cfg.color}`}>
      <span className="material-symbols-outlined text-[12px]">{cfg.icon}</span>
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
    <span className={`inline-flex items-center gap-1.5 font-label-caps text-label-caps ${cfg.color}`}>
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
    <div className={`${s} border-2 border-outline border-t-primary rounded-full animate-spin`} />
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────

export function EmptyState({ icon, title, message }: { icon: string; title: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center">
        <span className="material-symbols-outlined text-on-surface-variant text-3xl">{icon}</span>
      </div>
      <h3 className="font-headline-md text-headline-md text-on-background">{title}</h3>
      <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm">{message}</p>
    </div>
  );
}

// ── Error State ───────────────────────────────────────────────────────────────

export function ErrorState({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div className="w-16 h-16 rounded-full bg-error-container/20 border border-error/50 flex items-center justify-center">
        <span className="material-symbols-outlined text-error text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
      </div>
      <p className="font-data-mono text-data-mono text-error">{error}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 bg-surface-container-high border border-outline text-on-background font-label-caps text-label-caps px-4 py-2 rounded hover:bg-surface-bright transition-colors"
        >
          <span className="material-symbols-outlined text-sm">refresh</span>
          RETRY
        </button>
      )}
    </div>
  );
}

// ── Amount formatter ─────────────────────────────────────────────────────────

export function Amount({ value }: { value: number }) {
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
  return <span className="font-mono-data">{formatted}</span>;
}
