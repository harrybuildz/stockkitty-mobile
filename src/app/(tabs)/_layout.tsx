import { Tabs } from 'expo-router/js-tabs';

import { colors } from '@/theme';

// Text-only tabs for the scaffold; icons arrive with the store-submission
// polish pass.
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.panel, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarIconStyle: { display: 'none' },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Screener' }} />
      <Tabs.Screen name="portfolios" options={{ title: 'Portfolios' }} />
      <Tabs.Screen name="watchlist" options={{ title: 'Watchlist' }} />
      <Tabs.Screen name="alerts" options={{ title: 'Alerts' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
