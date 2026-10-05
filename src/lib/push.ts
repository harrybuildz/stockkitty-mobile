import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { api } from '@/api/client';

// The web target ships without push — expo-notifications doesn't support
// it there, and the web app in a browser tab is the web client anyway.
export const pushSupported = Platform.OS !== 'web';

// Foreground presentation: show the banner even with the app open — an
// alert push with the screener in front of you is still worth seeing.
if (pushSupported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function getPushPermissionStatus(): Promise<Notifications.PermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

async function getExpoToken(): Promise<string> {
  const projectId: string | undefined = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) throw new Error('Missing EAS projectId in app config.');
  return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}

/**
 * Ask for permission (if needed) and register this device's Expo token
 * with the backend. Throws with a user-presentable message on failure.
 * Safe to call repeatedly — re-registering keeps the server's
 * last_seen_at fresh and follows token rotation.
 */
export async function registerForAlertPush(): Promise<void> {
  if (!pushSupported || !Device.isDevice) {
    throw new Error('Push notifications need the app on a physical device.');
  }
  if (Platform.OS === 'android') {
    // Android 8+ requires a channel to exist before the permission prompt.
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Alerts',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    ({ status } = await Notifications.requestPermissionsAsync());
  }
  if (status !== 'granted') {
    throw new Error('Notifications are off for StockKitty — enable them in system settings.');
  }
  const token = await getExpoToken();
  await api('/api/push/register', { json: { token, platform: Platform.OS } });
}

/**
 * Best-effort unregister, called on sign-out while the session is still
 * valid. Never throws — a device that can't produce its token right now
 * (permission revoked, Expo Go) gets pruned server-side later via
 * DeviceNotRegistered receipts anyway.
 */
export async function unregisterPush(): Promise<void> {
  try {
    if (!pushSupported || !Device.isDevice) return;
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;
    const token = await getExpoToken();
    await api('/api/push/unregister', { json: { token } });
  } catch {
    // Best-effort by contract.
  }
}
