import { create } from 'zustand';

import { api } from '@/api/client';
import { CACHE_KEYS, readCache, writeCache } from '@/lib/storage-cache';
import type { ScreenerRow } from '@/api/types';

type ScreenerState = {
  rows: ScreenerRow[];
  loading: boolean;
  error: unknown;
  fetch: () => Promise<void>;
  clearError: () => void;
};

export const useScreener = create<ScreenerState>((set, get) => ({
  rows: [],
  loading: false,
  error: null,
  fetch: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });
    // Cold start: show the previous session's rows while the network
    // answers. Screener data isn't per-user, so the cache survives
    // sign-out. The guard re-checks rows so a fast network response (or
    // a concurrent hydrate) is never overwritten with older cache.
    if (!get().rows.length) {
      const cached = await readCache<ScreenerRow[]>(CACHE_KEYS.screener);
      if (cached?.length && !get().rows.length) set({ rows: cached });
    }
    try {
      // Server returns rows already sorted by margin of safety, desc.
      const rows = await api<ScreenerRow[]>('/api/screener');
      set({ rows });
      writeCache(CACHE_KEYS.screener, rows);
    } catch (error) {
      set({ error });
    } finally {
      set({ loading: false });
    }
  },
  // Sign-out keeps the rows (screener data isn't per-user) but must drop
  // the error: the screen only refetches when it has no rows, so a stale
  // "session expired" would otherwise outlive the next sign-in.
  clearError: () => set({ error: null }),
}));
