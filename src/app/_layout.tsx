import * as Notifications from 'expo-notifications';
import { DarkTheme, router, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { pushSupported } from '@/lib/push';
import { useAuth } from '@/store/auth';
import { colors } from '@/theme';

void SplashScreen.preventAutoHideAsync();

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.panel, border: colors.border, primary: colors.accentSoft },
};

export default function RootLayout() {
  const status = useAuth((s) => s.status);
  const user = useAuth((s) => s.user);
  const hydrate = useAuth((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (status !== 'loading') void SplashScreen.hideAsync();
  }, [status]);

  // Alert pushes land on the Alerts tab. Covers both a tap with the app
  // running and a cold start from the notification (the listener fires
  // for the launching response once the JS is up).
  useEffect(() => {
    if (status !== 'signedIn' || !pushSupported) return;
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      router.push('/(tabs)/alerts');
    });
    return () => sub.remove();
  }, [status]);

  if (status === 'loading') return null;

  const signedIn = status === 'signedIn';
  // Until /me answers, assume accepted so a slow boot doesn't flash the
  // gate; once it answers false, the app is blocked behind it — same rule
  // as the web app's acceptance gate (the server only reports the flag).
  const termsOk = user?.terms_accepted !== false;

  return (
    <ThemeProvider value={theme}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Protected guard={signedIn && termsOk}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="company/[ticker]"
            options={{ headerShown: true, title: '', headerBackTitle: 'Back' }}
          />
          <Stack.Screen
            name="portfolio/[id]"
            options={{ headerShown: true, title: '', headerBackTitle: 'Back' }}
          />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && !termsOk}>
          <Stack.Screen name="accept-terms" />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="login" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
