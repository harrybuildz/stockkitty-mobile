import * as WebBrowser from 'expo-web-browser';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Screen, Title } from '@/components/ui';
import { API_BASE_URL } from '@/config';
import { useAuth } from '@/store/auth';
import { colors, radius, spacing } from '@/theme';

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
});
