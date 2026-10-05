import { create } from 'zustand';

import { api } from '@/api/client';
import { CACHE_KEYS, readCache, writeCache } from '@/lib/storage-cache';
import type { Portfolio } from '@/api/types';

type PortfoliosState = {
  portfolios: Portfolio[];
  loading: boolean;
  error: unknown;
  fetch: () => Promise<void>;
  reset: () => void;
};

// Same session guard as the watchlist/alerts stores: bumped on sign-out so
// a request from the previous session can't write into the next user's state.
let generation = 0;

export const usePortfolios = create<PortfoliosState>((set, get) => ({
  portfolios: [],
  loading: false,
  error: null,
  fetch: async () => {
    if (get().loading) return;
    const gen = generation;
    set({ loading: true, error: null });
    // Cold start: last session's list while the network answers.
    if (!get().portfolios.length) {
      const cached = await readCache<Portfolio[]>(CACHE_KEYS.portfolios);
      if (gen === generation && cached?.length && !get().portfolios.length) {
        set({ portfolios: cached });
      }
    }
    try {
      const portfolios = await api<Portfolio[]>('/api/portfolios');
      if (gen === generation) {
        set({ portfolios });
        writeCache(CACHE_KEYS.portfolios, portfolios);
      }
    } catch (error) {
      if (gen === generation) set({ error });
    } finally {
      if (gen === generation) set({ loading: false });
    }
  },
  reset: () => {
    generation += 1;
    set({ portfolios: [], loading: false, error: null });
  },
}));
