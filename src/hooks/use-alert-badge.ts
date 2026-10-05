import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useAlerts } from '@/store/alerts';

const POLL_MS = 60_000; // same cadence as the web app's alerts bell

// Keeps the unread-alerts count fresh while the app is in the foreground:
// refresh on launch and on every return to the app, then once a minute.
// Polling stops in the background to save battery and data.
export function useAlertBadgePolling() {
  const refresh = useAlerts((s) => s.refreshCount);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer) return;
      void refresh();
      timer = setInterval(() => void refresh(), POLL_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };

    if (AppState.currentState === 'active') start();
    const sub = AppState.addEventListener('change', (state) => (state === 'active' ? start() : stop()));
    return () => {
      sub.remove();
      stop();
    };
  }, [refresh]);
}

export function badgeLabel(count: number): string | undefined {
  if (count <= 0) return undefined;
  return count >= 100 ? '99+' : String(count);
}
