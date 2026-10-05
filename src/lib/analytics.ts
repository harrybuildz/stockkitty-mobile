import { AppState } from 'react-native';

import { api } from '@/api/client';
import { useAuth } from '@/store/auth';

// Port of the web app's first-party analytics queue (utils/analytics.js):
// batched fire-and-forget to /api/analytics/events, flushed on an interval
// and when the app backgrounds (the RN analog of the web's pagehide).
// Events must exist in the backend's ALLOWED_EVENTS whitelist — this file
// only uses event names the web app already registered.

type Event = { event: string; ticker: string | null; detail: string | null };

const FLUSH_INTERVAL_MS = 15_000;
const MAX_BATCH = 25;

let queue: Event[] = [];
let started = false;

function flush() {
  if (!queue.length) return;
  if (useAuth.getState().status !== 'signedIn') {
    queue = [];
    return;
  }
  const batch = queue.slice(0, MAX_BATCH);
  queue = queue.slice(MAX_BATCH);
  void api('/api/analytics/events', { json: batch }).catch(() => {});
}

export function track(event: string, opts: { ticker?: string; detail?: string } = {}) {
  if (useAuth.getState().status !== 'signedIn') return;
  queue.push({ event, ticker: opts.ticker ?? null, detail: opts.detail ?? null });
  if (queue.length >= MAX_BATCH) flush();
  if (!started) {
    started = true;
    setInterval(flush, FLUSH_INTERVAL_MS);
    AppState.addEventListener('change', (state) => {
      if (state !== 'active') flush();
    });
  }
}
