import { API_BASE_URL } from '@/config';
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
} from './tokens';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly detail: string | null,
  ) {
    super(detail ?? `Request failed (${status})`);
    this.name = 'ApiError';
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  json?: unknown;
  form?: Record<string, string>;
  timeoutMs?: number;
};

// Refresh-on-401, ported from the web client's axios interceptor
// (stockkitty/frontend/src/store/index.js). Access tokens live 15 minutes;
// when one expires the next call 401s, we swap it for a fresh one via
// /api/auth/refresh, and retry the original request once. Concurrent 401s
// share one in-flight refresh via `refreshPromise` so a burst of expired
// requests doesn't stampede the refresh endpoint.
let refreshPromise: Promise<string> | null = null;

let onAuthFailure: () => void = () => {};

/** Called when the session is unrecoverable (refresh token missing,
 * expired, or revoked). The auth store wires this to its logout. */
export function setAuthFailureHandler(handler: () => void) {
  onAuthFailure = handler;
}

// Pre-auth endpoints: a 401 here is a real answer (bad password), not an
// expired session, so it must surface to the caller instead of triggering
// a refresh-then-logout.
const NO_REFRESH_PATHS = ['/api/auth/login', '/api/auth/refresh'];

async function send(path: string, opts: RequestOptions, token: string | null) {
  const headers: Record<string, string> = { Accept: 'application/json' };
  let body: string | undefined;
  if (opts.form) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    body = new URLSearchParams(opts.form).toString();
  } else if (opts.json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.json);
  }
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 30_000);
  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      method: opts.method ?? (body ? 'POST' : 'GET'),
      headers,
      body,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) throw new ApiError(401, 'Not signed in');
      const res = await send('/api/auth/refresh', { json: { refresh_token: refreshToken } }, null);
      if (!res.ok) throw new ApiError(res.status, await readDetail(res));
      const data = (await res.json()) as { access_token: string };
      await setAccessToken(data.access_token);
      return data.access_token;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function failSession(): Promise<never> {
  await clearTokens();
  onAuthFailure();
  throw new ApiError(401, 'Your session has expired. Please sign in again.');
}

async function readDetail(res: Response): Promise<string | null> {
  try {
    const data = await res.json();
    // FastAPI errors are { detail: string } or, for validation, a list.
    if (typeof data?.detail === 'string') return data.detail;
    if (Array.isArray(data?.detail)) return data.detail.map((d: { msg?: string }) => d.msg).join('; ');
  } catch {
    // Non-JSON body (proxy error page, empty 502) — fall through.
  }
  return null;
}

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const tokenUsed = await getAccessToken();
  let res = await send(path, opts, tokenUsed);

  if (res.status === 401 && !NO_REFRESH_PATHS.includes(path)) {
    // If another request already refreshed while this one was in flight,
    // the stored token has moved on — retry with it instead of refreshing
    // again.
    const current = await getAccessToken();
    let token: string;
    if (current && current !== tokenUsed) {
      token = current;
    } else {
      try {
        token = await refreshAccessToken();
      } catch {
        return failSession();
      }
    }
    // Exactly one retry. A second 401 after a successful refresh means the
    // account was disabled or the token was revoked — sign out instead of
    // looping (the web client's `_retry` flag).
    res = await send(path, opts, token);
    if (res.status === 401) return failSession();
  }

  if (!res.ok) throw new ApiError(res.status, await readDetail(res));
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
