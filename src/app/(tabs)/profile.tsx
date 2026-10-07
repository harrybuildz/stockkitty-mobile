import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import * as WebBrowser from 'expo-web-browser';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { Button, Screen, Title } from '@/components/ui';
import { API_BASE_URL } from '@/config';
import { useAuth } from '@/store/auth';
import { colors, radius, spacing } from '@/theme';

// Human-readable provenance of the running JS: the baked-in bundle, or
// which OTA update. This line is how we verify an `eas update` actually
// landed on a device — and the first thing to screenshot in a bug report.
function bundleLabel(): string {
  const version = Constants.expoConfig?.version ?? '?';
  if (Platform.OS === 'web') return `v${version} · web`;
  try {
    if (Updates.isEmbeddedLaunch || !Updates.updateId) return `v${version} · build bundle`;
    const when = Updates.createdAt
      ? ` · ${Updates.createdAt.toISOString().slice(0, 16).replace('T', ' ')} UTC`
      : '';
    return `v${version} · update ${Updates.updateId.slice(0, 8)}${when}`;
  } catch {
    return `v${version}`;
  }
}

export default function Profile() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);

  return (
    <Screen>
      <Title>Profile</Title>
      <View style={styles.card}>
        <Text style={styles.username}>{user?.username ?? '…'}</Text>
        {user?.is_admin && <Text style={styles.admin}>Admin</Text>}
      </View>
      <View style={styles.actions}>
        {/* Password change and security questions reuse the web flows for
            now; native screens come with the write-paths milestone. */}
        <Button
          label="Account settings (web)"
          variant="secondary"
          onPress={() => WebBrowser.openBrowserAsync(API_BASE_URL)}
        />
        <Button label="Sign out" variant="danger" onPress={() => void logout()} />
      </View>
      <Text style={styles.bundle}>{bundleLabel()}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  username: { color: colors.text, fontSize: 18, fontWeight: '600' },
  admin: { color: colors.warning, fontSize: 13, marginTop: spacing.xs },
  actions: { marginTop: spacing.xl, gap: spacing.md },
  bundle: { color: colors.textFaint, fontSize: 11, marginTop: 'auto', textAlign: 'center' },
});
