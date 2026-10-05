import { create } from 'zustand';

import { api } from '@/api/client';
import type { Portfolio } from '@/api/types';

type PortfoliosState = {
  portfolios: Portfolio[];
  loading: boolean;
  error: unknown;
  fetch: () => Promise<void>;
};

export const usePortfolios = create<PortfoliosState>((set, get) => ({
  portfolios: [],
  loading: false,
  error: null,
  fetch: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      set({ portfolios: await api<Portfolio[]>('/api/portfolios') });
    } catch (error) {
      set({ error });
    } finally {
      set({ loading: false });
    }
  },
}));
