// expo-secure-store has no web implementation. On web, fall back to
// localStorage — the same place the stockkitty web app keeps its tokens.
// The `typeof` guard keeps static rendering (Node, no localStorage) safe.
const ACCESS_KEY = 'sk_token';
const REFRESH_KEY = 'sk_refresh';

const store = typeof localStorage === 'undefined' ? null : localStorage;

export async function getAccessToken(): Promise<string | null> {
  return store?.getItem(ACCESS_KEY) ?? null;
}

export async function getRefreshToken(): Promise<string | null> {
  return store?.getItem(REFRESH_KEY) ?? null;
}

export async function setAccessToken(token: string): Promise<void> {
  store?.setItem(ACCESS_KEY, token);
}

export async function setTokens(access: string, refresh?: string | null): Promise<void> {
  store?.setItem(ACCESS_KEY, access);
  if (refresh) store?.setItem(REFRESH_KEY, refresh);
}

export async function clearTokens(): Promise<void> {
  store?.removeItem(ACCESS_KEY);
  store?.removeItem(REFRESH_KEY);
}
