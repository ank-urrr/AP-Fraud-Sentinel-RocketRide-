/**
 * Global state store using Zustand.
 * Keeps batch summary, selected case, and system errors in sync.
 */
import { create } from 'zustand';
import type { BatchResult, FraudCaseSummary, MetricsResponse } from '../types';

interface AppState {
  // Last batch result
  lastBatch: BatchResult | null;
  setLastBatch: (batch: BatchResult) => void;

  // Fraud cases list
  cases: FraudCaseSummary[];
  setCases: (cases: FraudCaseSummary[]) => void;

  // Metrics
  metrics: MetricsResponse | null;
  setMetrics: (m: MetricsResponse) => void;

  // System errors for the /status screen
  systemErrors: SystemError[];
  addSystemError: (e: SystemError) => void;
  clearErrors: () => void;

  // Calling mode (surfaced from health endpoint)
  callingMode: 'mock' | 'live';
  setCallingMode: (m: 'mock' | 'live') => void;
}

export interface SystemError {
  id: string;
  timestamp: string;
  code: string;
  message: string;
  context?: string;
}

export const useAppStore = create<AppState>((set) => ({
  lastBatch: null,
  setLastBatch: (batch) => set({ lastBatch: batch }),

  cases: [],
  setCases: (cases) => set({ cases }),

  metrics: null,
  setMetrics: (m) => set({ metrics: m }),

  systemErrors: [],
  addSystemError: (e) =>
    set((state) => ({ systemErrors: [e, ...state.systemErrors].slice(0, 20) })),
  clearErrors: () => set({ systemErrors: [] }),

  callingMode: 'mock',
  setCallingMode: (m) => set({ callingMode: m }),
}));
