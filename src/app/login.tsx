import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { api, ApiError } from '@/api/client';
import { Button, ErrorText, Screen } from '@/components/ui';
import { API_BASE_URL } from '@/config';
import { useAuth } from '@/store/auth';
import { colors, radius, spacing } from '@/theme';

export default function Login() {
  const login = useAuth((s) => s.login);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Launch switch: once self-serve signup opens, a store-acquired user
  // with no account gets a real path instead of a dead-end login form.
  const [regOpen, setRegOpen] = useState(false);
  useEffect(() => {
    api<{ open: boolean }>('/api/auth/registration')
      .then((r) => setRegOpen(Boolean(r.open)))
      .catch(() => {});
  }, []);

  async function submit() {
    if (!username.trim() || !password) {
      setError('Enter your username and password.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
      // The root layout's Stack.Protected swaps to the app on success.
    } catch (e) {
      if (e instanceof ApiError && e.status === 429) {
        setError('Too many sign-in attempts. Wait a minute and try again.');
      } else if (e instanceof ApiError) {
        setError(e.detail ?? 'Sign-in failed.');
      } else {
        setError(`Can't reach StockKitty at ${API_BASE_URL}. Check your connection.`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.form}>
          <Text style={styles.brand}>StockKitty</Text>
          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor={colors.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            textContentType="username"
            value={username}
            onChangeText={setUsername}
            returnKeyType="next"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.textFaint}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            value={password}
            onChangeText={setPassword}
            returnKeyType="go"
            onSubmitEditing={submit}
          />
          {error && <ErrorText>{error}</ErrorText>}
          <Button label="Sign in" onPress={submit} loading={loading} />
          {regOpen && (
            <Button
              label="New to StockKitty? Create your free account"
              variant="secondary"
              onPress={() => void WebBrowser.openBrowserAsync(`${API_BASE_URL}/register`)}
            />
          )}
          {/* Invite sign-up and security-question recovery stay on the web
              for now; invite links will deep-link into the app later. */}
          <Pressable onPress={() => WebBrowser.openBrowserAsync(`${API_BASE_URL}/login`)}>
            <Text style={styles.link}>Forgot password or have an invite? Continue on the web</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  form: { flex: 1, justifyContent: 'center', gap: spacing.md },
  brand: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  input: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  link: { color: colors.accentSoft, fontSize: 13, textAlign: 'center', marginTop: spacing.sm },
});
