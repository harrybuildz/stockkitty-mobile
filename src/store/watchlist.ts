import { create } from 'zustand';

import { api, ApiError } from '@/api/client';

type WatchlistState = {
  /** null until the first successful fetch — "unknown", not "empty", so
   * screens and the company-page star know to hold back until loaded. */
  tickers: string[] | null;
  loading: boolean;
  error: unknown;
  fetch: () => Promise<void>;
  toggle: (ticker: string) => Promise<void>;
  reset: () => void;
};

export const useWatchlist = create<WatchlistState>((set, get) => ({
  tickers: null,
  loading: false,
  error: null,

  fetch: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      set({ tickers: await api<string[]>('/api/watchlist') });
    } catch (error) {
      set({ error });
    } finally {
      set({ loading: false });
    }
  },

  // Optimistic flip with rollback — the star on the company page and the
  // remove button on the tab both go through here, so a failed request
  // never leaves the UI claiming a state the server doesn't have.
  toggle: async (ticker) => {
    const prev = get().tickers;
    if (prev == null) return; // not loaded yet; callers disable the control
    const watched = prev.includes(ticker);
    set({ tickers: watched ? prev.filter((t) => t !== ticker) : [...prev, ticker] });
    try {
      await api(`/api/watchlist/${encodeURIComponent(ticker)}`, {
        method: watched ? 'DELETE' : 'POST',
      });
    } catch (error) {
      // 404 on delete means the server already lost the row (e.g. removed
      // on web while this screen was open) — the optimistic state is right.
      if (watched && error instanceof ApiError && error.status === 404) return;
      set({ tickers: prev, error });
    }
  },

  reset: () => set({ tickers: null, loading: false, error: null }),
}));
