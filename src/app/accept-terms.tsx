import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/api/client';
import { Button, ErrorText, Muted, Screen, Title } from '@/components/ui';
import { API_BASE_URL } from '@/config';
import { useAuth } from '@/store/auth';
import { colors, spacing } from '@/theme';

// Blocking gate shown when /api/auth/me reports terms_accepted: false —
// either a new account or a material terms update (TERMS_VERSION bump).
export default function AcceptTerms() {
  const acceptTerms = useAuth((s) => s.acceptTerms);
  const logout = useAuth((s) => s.logout);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setLoading(true);
    setError(null);
    try {
      await acceptTerms();
    } catch (e) {
      setError(e instanceof ApiError && e.detail ? e.detail : 'Could not record your acceptance. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <View style={styles.body}>
        <Title>Updated Terms</Title>
        <Muted>
          Please review the StockKitty Terms of Service and Privacy Policy. You need to accept the
          current terms to keep using the app.
        </Muted>
        <View style={styles.links}>
          <Pressable onPress={() => WebBrowser.openBrowserAsync(`${API_BASE_URL}/terms`)}>
            <Text style={styles.link}>Read the Terms of Service</Text>
          </Pressable>
          <Pressable onPress={() => WebBrowser.openBrowserAsync(`${API_BASE_URL}/privacy`)}>
            <Text style={styles.link}>Read the Privacy Policy</Text>
          </Pressable>
        </View>
        {error && <ErrorText>{error}</ErrorText>}
        <Button label="I accept" onPress={accept} loading={loading} />
        <Button label="Sign out" variant="danger" onPress={() => void logout()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, justifyContent: 'center', gap: spacing.lg },
  links: { gap: spacing.sm, alignItems: 'center' },
  link: { color: colors.accentSoft, fontSize: 15 },
});
