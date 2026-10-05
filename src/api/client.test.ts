import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, string>();
vi.mock('expo-secure-store', () => ({
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'afu',
  getItemAsync: async (k: string) => store.get(k) ?? null,
  setItemAsync: async (k: string, v: string) => void store.set(k, v),
  deleteItemAsync: async (k: string) => void store.delete(k),
}));

const { api, ApiError, setAuthFailureHandler } = await import('./client');

type Call = { path: string; auth: string | undefined; body: string | undefined };
let calls: Call[];
let validToken: string;
let refreshBehavior: 'ok' | 'fail';
let refreshCount: number;

function json(status: number, data: unknown) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Minimal fake backend: protected routes accept only `validToken`;
// /api/auth/refresh mints a new one after a short delay so concurrent
// callers genuinely overlap.
function fakeFetch(input: string, init: RequestInit = {}) {
  const path = input.replace(/^https?:\/\/[^/]+/, '');
  const auth = (init.headers as Record<string, string>)?.Authorization;
  calls.push({ path, auth, body: init.body as string | undefined });

  if (path === '/api/auth/login') {
    return Promise.resolve(json(401, { detail: 'Incorrect username or password' }));
  }
  if (path === '/api/auth/refresh') {
    refreshCount += 1;
    return new Promise<Response>((resolve) =>
      setTimeout(() => {
        if (refreshBehavior === 'fail') return resolve(json(401, { detail: 'expired' }));
        validToken = `access-${refreshCount}`;
        resolve(json(200, { access_token: validToken, token_type: 'bearer' }));
      }, 20),
    );
  }
  if (auth === `Bearer ${validToken}`) return Promise.resolve(json(200, { path }));
  return Promise.resolve(json(401, { detail: 'Not authenticated' }));
}

beforeEach(() => {
  store.clear();
  store.set('sk_token', 'expired');
  store.set('sk_refresh', 'refresh-1');
  calls = [];
  validToken = 'access-0';
  refreshBehavior = 'ok';
  refreshCount = 0;
  vi.stubGlobal('fetch', vi.fn(fakeFetch));
});

describe('api client refresh-on-401', () => {
  it('dedupes concurrent 401s into one refresh and retries each request', async () => {
    const results = await Promise.all([
      api<{ path: string }>('/api/screener'),
      api<{ path: string }>('/api/portfolios'),
      api<{ path: string }>('/api/alerts'),
    ]);
    expect(results.map((r) => r.path)).toEqual(['/api/screener', '/api/portfolios', '/api/alerts']);
    expect(refreshCount).toBe(1);
    expect(store.get('sk_token')).toBe('access-1');
    expect(JSON.parse(calls.find((c) => c.path === '/api/auth/refresh')!.body!)).toEqual({
      refresh_token: 'refresh-1',
    });
  });

  it('reuses a token another request already refreshed instead of refreshing again', async () => {
    // The request leaves with the expired token; while it's in flight a
    // different request completes a refresh. Its 401 should retry with the
    // newly stored token rather than start a second refresh.
    (fetch as unknown as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
      store.set('sk_token', 'access-9');
      validToken = 'access-9';
      return Promise.resolve(json(401, { detail: 'Not authenticated' }));
    });
    await expect(api<{ path: string }>('/api/portfolios')).resolves.toEqual({ path: '/api/portfolios' });
    expect(refreshCount).toBe(0);
    expect(calls.at(-1)?.auth).toBe('Bearer access-9');
  });

  it('signs out when the refresh token is rejected', async () => {
    refreshBehavior = 'fail';
    const onFail = vi.fn();
    setAuthFailureHandler(onFail);
    await expect(api('/api/screener')).rejects.toMatchObject({ status: 401 });
    expect(onFail).toHaveBeenCalledOnce();
    expect(store.has('sk_token')).toBe(false);
    expect(store.has('sk_refresh')).toBe(false);
  });

  it('retries only once, then signs out, when the server keeps returning 401', async () => {
    const onFail = vi.fn();
    setAuthFailureHandler(onFail);
    let screenerCalls = 0;
    (fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation((input: string, init: RequestInit) => {
      if (input.endsWith('/api/auth/refresh')) return fakeFetch(input, init);
      screenerCalls += 1;
      return Promise.resolve(json(401, { detail: 'Account disabled' }));
    });
    await expect(api('/api/screener')).rejects.toBeInstanceOf(ApiError);
    expect(screenerCalls).toBe(2); // original + exactly one retry
    expect(refreshCount).toBe(1);
    expect(onFail).toHaveBeenCalledOnce();
  });

  it('surfaces a wrong-password 401 from login without refreshing or signing out', async () => {
    const onFail = vi.fn();
    setAuthFailureHandler(onFail);
    await expect(
      api('/api/auth/login', { form: { username: 'a', password: 'b' } }),
    ).rejects.toMatchObject({ status: 401, detail: 'Incorrect username or password' });
    expect(refreshCount).toBe(0);
    expect(onFail).not.toHaveBeenCalled();
    expect(calls[0].body).toBe('username=a&password=b');
  });
});
