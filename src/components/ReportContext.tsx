'use client';

import type { Analysis, Snapshot } from '@/lib/core/types';
import type { Dict, Formatters, Locale } from '@/lib/i18n';
import { createContext, useContext } from 'react';

export type HarMode = 'owned' | 'osint';

export interface ReportState {
  A: Analysis;
  t: Dict;
  locale: Locale;
  f: Formatters;
  themeKey: string;
  mode: HarMode;
  snaps: Snapshot[];
  onSnapshots: (next: Snapshot[]) => void;
  toast: (message: string) => void;
}

export const ReportContext = createContext<ReportState | null>(null);

export function useReport(): ReportState {
  const ctx = useContext(ReportContext);
  if (!ctx) throw new Error('useReport must be used inside <ReportContext.Provider>');
  return ctx;
}
