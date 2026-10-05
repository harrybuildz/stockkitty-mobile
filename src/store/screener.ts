import { create } from 'zustand';

import { api } from '@/api/client';
import type { ScreenerRow } from '@/api/types';

type ScreenerState = {
  rows: ScreenerRow[];
  loading: boolean;
  error: unknown;
  fetch: () => Promise<void>;
};

export const useScreener = create<ScreenerState>((set, get) => ({
  rows: [],
  loading: false,
  error: null,
  fetch: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      // Server returns rows already sorted by margin of safety, desc.
      set({ rows: await api<ScreenerRow[]>('/api/screener') });
    } catch (error) {
      set({ error });
    } finally {
      set({ loading: false });
    }
  },
}));
