import { create } from 'zustand';

import { api } from '@/api/client';
import type { FiredAlert } from '@/api/types';

type AlertsState = {
  /** Unacknowledged alerts, newest first. null until the first fetch. */
  alerts: FiredAlert[] | null;
  loading: boolean;
  error: unknown;
  fetch: () => Promise<void>;
  acknowledge: (alertId: number) => Promise<void>;
  acknowledgeAll: () => Promise<void>;
  reset: () => void;
};

export const useAlerts = create<AlertsState>((set, get) => ({
  alerts: null,
  loading: false,
  error: null,

  fetch: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      set({ alerts: await api<FiredAlert[]>('/api/alerts') });
    } catch (error) {
      set({ error });
    } finally {
      set({ loading: false });
    }
  },

  // Optimistic removal with rollback, same contract as the watchlist store.
  acknowledge: async (alertId) => {
    const prev = get().alerts;
    if (prev == null) return;
    set({ alerts: prev.filter((a) => a.id !== alertId) });
    try {
      await api(`/api/alerts/${alertId}/acknowledge`, { method: 'POST' });
    } catch (error) {
      set({ alerts: prev, error });
    }
  },

  acknowledgeAll: async () => {
    const prev = get().alerts;
    if (!prev?.length) return;
    set({ alerts: [] });
    try {
      await api('/api/alerts/acknowledge-all', { method: 'POST' });
    } catch (error) {
      set({ alerts: prev, error });
    }
  },

  reset: () => set({ alerts: null, loading: false, error: null }),
}));
