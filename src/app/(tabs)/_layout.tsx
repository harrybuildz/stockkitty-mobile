import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import type { ColorValue } from 'react-native';

import { badgeLabel, useAlertBadgePolling } from '@/hooks/use-alert-badge';
import { useAlerts } from '@/store/alerts';
import { colors } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

function TabIcon({ name, color }: { name: IconName; color: ColorValue }) {
  return <Ionicons name={name} size={22} color={color} />;
}

export default function TabsLayout() {
  useAlertBadgePolling();
  const unread = useAlerts((s) => s.unackedCount);
  const badge = badgeLabel(unread);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.panel, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Screener',
          tabBarIcon: ({ color }) => <TabIcon name="list" color={color} />,
        }}
      />
      <Tabs.Screen
        name="portfolios"
        options={{
          title: 'Portfolios',
          tabBarIcon: ({ color }) => <TabIcon name="pie-chart" color={color} />,
        }}
      />
      <Tabs.Screen
        name="watchlist"
        options={{
          title: 'Watchlist',
          tabBarIcon: ({ color }) => <TabIcon name="star" color={color} />,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color }) => <TabIcon name="notifications" color={color} />,
          tabBarBadge: badge ?? undefined,
          tabBarBadgeStyle: { backgroundColor: colors.negative, color: colors.text, fontSize: 10 },
          tabBarAccessibilityLabel: unread > 0 ? `Alerts, ${unread} unread` : 'Alerts',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabIcon name="person" color={color} />,
        }}
      />
    </Tabs>
  );
}
