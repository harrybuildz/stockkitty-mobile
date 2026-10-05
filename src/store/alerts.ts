import { create } from 'zustand';

import { api, ApiError } from '@/api/client';
import type { Alert } from '@/api/types';

// Badge counts above this read as "99+"; one request covers it.
const COUNT_LIMIT = 100;

type AlertsState = {
  alerts: Alert[]; // the list view: unacknowledged only, or all when showAll
  showAll: boolean;
  unackedCount: number; // drives the tab badge
  loaded: boolean;
  loading: boolean;
  error: unknown;
  fetch: () => Promise<void>;
  refreshCount: () => Promise<void>;
  setShowAll: (showAll: boolean) => Promise<void>;
  acknowledge: (id: number) => Promise<void>;
  acknowledgeAll: () => Promise<void>;
  reset: () => void;
};

const isAcked = (a: Alert) => Boolean(a.acknowledged);

// Same session guard as the watchlist store: bumped on sign-out so a request
// from the previous session can't write into the next user's state.
let generation = 0;

export const useAlerts = create<AlertsState>((set, get) => ({
  alerts: [],
  showAll: false,
  unackedCount: 0,
  loaded: false,
  loading: false,
  error: null,

  fetch: async () => {
    const gen = generation;
    const showAll = get().showAll;
    set({ loading: true, error: null });
    try {
      const alerts = await api<Alert[]>(`/api/alerts?only_unacked=${!showAll}&limit=50`);
      if (gen !== generation || get().showAll !== showAll) return;
      set({ alerts, loaded: true });
      // The unacknowledged list is the badge's source of truth when it fits
      // in one page; otherwise ask for the count separately.
      if (!showAll && alerts.length < 50) set({ unackedCount: alerts.length });
      else void get().refreshCount();
    } catch (error) {
      if (gen === generation) set({ error });
    } finally {
      if (gen === generation) set({ loading: false });
    }
  },

  refreshCount: async () => {
    const gen = generation;
    try {
      const unacked = await api<Alert[]>(`/api/alerts?only_unacked=true&limit=${COUNT_LIMIT}`);
      if (gen === generation) set({ unackedCount: unacked.length });
    } catch {
      // Badge polling is best-effort; the list view surfaces real errors.
    }
  },

  setShowAll: async (showAll) => {
    if (showAll === get().showAll) return;
    set({ showAll, alerts: [], loaded: false });
    await get().fetch();
  },

  acknowledge: async (id) => {
    const gen = generation;
    const alert = get().alerts.find((a) => a.id === id);
    if (!alert || isAcked(alert)) return;

    // Optimistic: drop it from the "new" view, or mark it read in "all".
    set((s) => ({
      alerts: s.showAll
        ? s.alerts.map((a) => (a.id === id ? { ...a, acknowledged: 1 } : a))
        : s.alerts.filter((a) => a.id !== id),
      unackedCount: Math.max(0, s.unackedCount - 1),
    }));
    try {
      await api(`/api/alerts/${id}/acknowledge`, { method: 'POST' });
    } catch (e) {
      // 404: already gone server-side (acknowledged elsewhere) — keep the view.
      if (e instanceof ApiError && e.status === 404) return;
      if (gen !== generation) return;
      // Undo just this alert, wherever the list is now.
      set((s) => {
        const without = s.alerts.filter((a) => a.id !== id);
        const restored = [...without, alert].sort((a, b) => b.fired_at.localeCompare(a.fired_at));
        return { alerts: restored, unackedCount: s.unackedCount + 1, error: e };
      });
    }
  },

  acknowledgeAll: async () => {
    const gen = generation;
    set((s) => ({
      alerts: s.showAll ? s.alerts.map((a) => ({ ...a, acknowledged: 1 })) : [],
      unackedCount: 0,
    }));
    try {
      await api('/api/alerts/acknowledge-all', { method: 'POST' });
    } catch (e) {
      if (gen !== generation) return;
      set({ error: e });
      await get().fetch(); // resync with the server rather than guess
    }
  },

  reset: () => {
    generation += 1;
    set({ alerts: [], showAll: false, unackedCount: 0, loaded: false, loading: false, error: null });
  },
}));
