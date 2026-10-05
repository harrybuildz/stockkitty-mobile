import { create } from 'zustand';

import { api, ApiError } from '@/api/client';
import { CACHE_KEYS, readCache, writeCache } from '@/lib/storage-cache';

type WatchlistState = {
  tickers: string[]; // newest first, as the server returns them
  loaded: boolean;
  loading: boolean;
  error: unknown;
  fetch: () => Promise<void>;
  toggle: (ticker: string) => Promise<void>;
  reset: () => void;
};

// Server-side watchlist (GET/POST/DELETE /api/watchlist), shared with the
// web app. Toggles are optimistic; a failure undoes only that one change
// (re-add or remove the ticker) rather than restoring a whole-list snapshot,
// so a second toggle made while the first was in flight isn't clobbered.
//
// `generation` is bumped on reset (sign-out): a request that started under
// the previous session drops its result instead of writing it into the next
// user's state.
let generation = 0;

export const useWatchlist = create<WatchlistState>((set, get) => ({
  tickers: [],
  loaded: false,
  loading: false,
  error: null,

  fetch: async () => {
    if (get().loading) return;
    const gen = generation;
    set({ loading: true, error: null });
    // Cold start: last session's stars while the network answers. The
    // cache is cleared on sign-out (auth store), so it's always this
    // account's list. `loaded` stays false — cache isn't confirmation.
    if (!get().loaded && !get().tickers.length) {
      const cached = await readCache<string[]>(CACHE_KEYS.watchlist);
      if (gen === generation && cached?.length && !get().tickers.length) {
        set({ tickers: cached });
      }
    }
    try {
      const tickers = await api<string[]>('/api/watchlist');
      if (gen === generation) {
        set({ tickers, loaded: true });
        writeCache(CACHE_KEYS.watchlist, tickers);
      }
    } catch (error) {
      if (gen === generation) set({ error });
    } finally {
      if (gen === generation) set({ loading: false });
    }
  },

  toggle: async (ticker) => {
    const adding = !get().tickers.includes(ticker);
    const apply = (add: boolean) => {
      set((s) => ({
        tickers: add
          ? [ticker, ...s.tickers.filter((t) => t !== ticker)]
          : s.tickers.filter((t) => t !== ticker),
      }));
      writeCache(CACHE_KEYS.watchlist, get().tickers);
    };

    const gen = generation;
    apply(adding);
    try {
      await api(`/api/watchlist/${encodeURIComponent(ticker)}`, { method: adding ? 'POST' : 'DELETE' });
    } catch (e) {
      // A 404 on DELETE means the server never had it — the view already matches.
      if (!adding && e instanceof ApiError && e.status === 404) return;
      if (gen !== generation) return;
      apply(!adding);
      set({ error: e });
    }
  },

  reset: () => {
    generation += 1;
    set({ tickers: [], loaded: false, loading: false, error: null });
  },
}));
