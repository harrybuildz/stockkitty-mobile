import { create } from 'zustand';

import { api, ApiError, setAuthFailureHandler } from '@/api/client';
import { clearTokens, getAccessToken, setTokens } from '@/api/tokens';
import type { Me, TokenResponse } from '@/api/types';
import { unregisterPush } from '@/lib/push';
import { clearUserCaches } from '@/lib/storage-cache';
import { useAlerts } from '@/store/alerts';
import { usePortfolios } from '@/store/portfolios';
import { useScreener } from '@/store/screener';
import { useWatchlist } from '@/store/watchlist';

type AuthState = {
  status: 'loading' | 'signedOut' | 'signedIn';
  user: Me | null;
  hydrate: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  acceptTerms: () => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuth = create<AuthState>((set, get) => ({
  status: 'loading',
  user: null,

  // App boot: a stored token means "probably signed in" — show the app
  // immediately and confirm with /me in the background. If the session is
  // dead, the client's refresh-then-fail path calls logout for us.
  hydrate: async () => {
    const token = await getAccessToken();
    if (!token) {
      set({ status: 'signedOut', user: null });
      return;
    }
    set({ status: 'signedIn' });
    try {
      set({ user: await api<Me>('/api/auth/me') });
    } catch (e) {
      // Network failure at boot: stay signed in with no user info and let
      // the next request retry. Auth failures already routed to logout.
      if (!(e instanceof ApiError)) console.warn('hydrate /me failed', e);
    }
  },

  login: async (username, password) => {
    const tokens = await api<TokenResponse>('/api/auth/login', {
      form: { username: username.trim(), password },
    });
    await setTokens(tokens.access_token, tokens.refresh_token);
    const user = await api<Me>('/api/auth/me');
    set({ status: 'signedIn', user });
    // Fresh data for the new session — the screen won't refetch on its own
    // while cached rows are present.
    void useScreener.getState().fetch();
  },

  // Mirrors the web acceptance gate: re-read /me so terms_accepted reflects
  // the server, not an optimistic guess.
  acceptTerms: async () => {
    await api('/api/auth/accept-terms', { method: 'POST' });
    set({ user: await api<Me>('/api/auth/me') });
  },

  logout: async () => {
    if (get().status === 'signedOut') return;
    // Flip status FIRST: if this logout was triggered by an auth failure,
    // the unregister call below can 401 and re-enter logout via the
    // failure handler — the guard above then stops the cycle.
    set({ status: 'signedOut', user: null });
    // Stop this device receiving the account's alert pushes while the
    // stored tokens still authenticate. Best-effort — never blocks sign-out.
    await unregisterPush();
    await clearTokens();
    useWatchlist.getState().reset();
    useAlerts.getState().reset();
    usePortfolios.getState().reset();
    useScreener.getState().clearError();
    clearUserCaches();
  },
}));

setAuthFailureHandler(() => {
  void useAuth.getState().logout();
});
