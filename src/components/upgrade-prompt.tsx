import * as WebBrowser from 'expo-web-browser';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/api/client';
import { API_BASE_URL } from '@/config';
import { colors, radius, spacing } from '@/theme';

/** The server's 402 detail string when a plan gate fired, else null.
 * Gated endpoints phrase their details as user-facing copy. */
export function upgradeMessage(e: unknown): string | null {
  if (e instanceof ApiError && e.status === 402) {
    return e.detail ?? 'This feature needs a paid plan.';
  }
  return null;
}

// Plan-gate surface: the server's message plus a link to the web pricing
// page. Purchases deliberately happen on the web (no IAP) — revisit the
// wording against App Store external-link rules at store-submission time.
export function UpgradePrompt({ message, bare }: { message: string; bare?: boolean }) {
  return (
    <View style={[styles.wrap, !bare && styles.card]}>
      <Text style={styles.message}>{message}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => void WebBrowser.openBrowserAsync(`${API_BASE_URL}/pricing`)}
        hitSlop={8}>
        <Text style={styles.link}>View plans →</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  card: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  message: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  link: { color: colors.accentSoft, fontSize: 14, fontWeight: '600' },
});
