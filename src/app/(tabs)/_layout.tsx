import { Tabs } from 'expo-router/js-tabs';
import { StyleSheet, Text, View, type ColorValue } from 'react-native';

import { badgeLabel, useAlertBadgePolling } from '@/hooks/use-alert-badge';
import { useAlerts } from '@/store/alerts';
import { colors } from '@/theme';

// Text-only tabs for the scaffold; icons arrive with the store-submission
// polish pass.
export default function TabsLayout() {
  useAlertBadgePolling();
  const unread = useAlerts((s) => s.unackedCount);

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
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          // tabBarBadge renders inside the icon slot, which these text-only
          // tabs hide, so the unread count lives in the label instead.
          tabBarLabel: ({ color }) => <AlertsLabel color={color} count={unread} />,
          tabBarAccessibilityLabel: unread > 0 ? `Alerts, ${unread} unread` : 'Alerts',
        }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

function AlertsLabel({ color, count }: { color: ColorValue; count: number }) {
  const badge = badgeLabel(count);
  return (
    <View style={styles.labelRow}>
      <Text style={[styles.label, { color }]}>Alerts</Text>
      {badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  label: { fontSize: 11, fontWeight: '600' },
  badge: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: colors.negative,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.text, fontSize: 10, fontWeight: '700' },
});
