import * as SecureStore from 'expo-secure-store';

// Keychain (iOS) / Keystore-backed storage (Android). AFTER_FIRST_UNLOCK so
// a refresh can still run while the device is locked (background fetches),
// without letting entries migrate to a new device via backup.
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

const ACCESS_KEY = 'sk_token';
const REFRESH_KEY = 'sk_refresh';

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_KEY, OPTIONS);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_KEY, OPTIONS);
}

export async function setAccessToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_KEY, token, OPTIONS);
}

export async function setTokens(access: string, refresh?: string | null): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_KEY, access, OPTIONS);
  if (refresh) await SecureStore.setItemAsync(REFRESH_KEY, refresh, OPTIONS);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_KEY, OPTIONS),
    SecureStore.deleteItemAsync(REFRESH_KEY, OPTIONS),
  ]);
}
