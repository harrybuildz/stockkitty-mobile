import AsyncStorage from '@react-native-async-storage/async-storage';

// Stale-while-revalidate cache for list data: the app opens showing the
// last fetch instantly, and the normal on-focus fetches replace it. All
// operations are best-effort — a broken cache must never break the app.

export const CACHE_KEYS = {
  screener: 'sk_cache_screener', // shared data; survives sign-out
  watchlist: 'sk_cache_watchlist', // per-user; cleared on sign-out
  portfolios: 'sk_cache_portfolios', // per-user; cleared on sign-out
} as const;

export async function readCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeCache(key: string, value: unknown): void {
  void AsyncStorage.setItem(key, JSON.stringify(value)).catch(() => {});
}

export function clearUserCaches(): void {
  void AsyncStorage.multiRemove([CACHE_KEYS.watchlist, CACHE_KEYS.portfolios]).catch(() => {});
}
