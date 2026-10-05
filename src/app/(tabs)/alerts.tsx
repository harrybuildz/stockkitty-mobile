import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/api/client';
import { Button, Centered, ErrorText, Muted, Screen } from '@/components/ui';
import { relativeAge } from '@/lib/format';
import { getPushPermissionStatus, pushSupported, registerForAlertPush } from '@/lib/push';
import { useAlerts } from '@/store/alerts';
import { colors, radius, spacing } from '@/theme';
import type { FiredAlert } from '@/api/types';

// Mirrors ALERT_TYPE_META in the web app's AlertsBell.jsx (Tailwind color
// names resolved to hex). Keep the two in sync when alert types change.
const ALERT_TYPE_META: Record<string, { icon: string; color: string; label: string }> = {
  mos_dropped: { icon: '↘', color: '#fb7185', label: 'MoS turned negative' },
  fscore_dropped: { icon: '↓', color: '#fbbf24', label: 'F-Score deterioration' },
  newly_flagged: { icon: '⚠', color: '#eab308', label: 'Newly flagged' },
  new_qv_candidate: { icon: '★', color: '#34d399', label: 'New QV candidate' },
  price_moved: { icon: '⚡', color: '#38bdf8', label: 'Big price move' },
  news_spike: { icon: '◉', color: '#38bdf8', label: 'News coverage spike' },
  sentiment_swing: { icon: '↕', color: '#c084fc', label: 'Sentiment swing' },
};

export default function Alerts() {
  const { alerts, loading, error, fetch, acknowledge, acknowledgeAll } = useAlerts();

  useEffect(() => {
    if (alerts == null) void fetch();
  }, [alerts, fetch]);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Alerts</Text>
        {!!alerts?.length && (
          <Pressable onPress={() => void acknowledgeAll()} hitSlop={8}>
            <Text style={styles.markAll}>Mark all read</Text>
          </Pressable>
        )}
      </View>
      {error != null && (
        <ErrorText>{error instanceof ApiError ? (error.detail ?? error.message) : String(error)}</ErrorText>
      )}
      <PushBanner />
      <FlatList
        data={alerts ?? []}
        keyExtractor={(a) => String(a.id)}
        renderItem={({ item }) => <Row alert={item} onAcknowledge={() => void acknowledge(item.id)} />}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetch} tintColor={colors.textMuted} />
        }
        ListEmptyComponent={
          alerts == null ? null : (
            <Centered>
              <Muted>
                No new alerts. Alerts fire for watched companies and custom-portfolio holdings
                after each data refresh.
              </Muted>
            </Centered>
          )
        }
      />
    </Screen>
  );
}

// "Enabled" is simply OS permission granted — no separate app flag to
// drift out of sync. When granted, silently re-register on mount so the
// server sees fresh tokens; otherwise offer the one-tap enable.
function PushBanner() {
  const [state, setState] = useState<'checking' | 'prompt' | 'enabled'>(
    pushSupported ? 'checking' : 'enabled',
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!pushSupported) return;
    let current = true;
    void getPushPermissionStatus().then((status) => {
      if (!current) return;
      if (status === 'granted') {
        setState('enabled');
        void registerForAlertPush().catch(() => {});
      } else {
        setState('prompt');
      }
    });
    return () => {
      current = false;
    };
  }, []);

  if (state !== 'prompt') return null;
  return (
    <View style={styles.banner}>
      <Text style={styles.bannerText}>
        Get a notification when alerts fire for your watched companies — once a day at most,
        after the data refresh.
      </Text>
      {message != null && <Text style={styles.bannerError}>{message}</Text>}
      <Button
        label="Enable notifications"
        loading={busy}
        onPress={() => {
          setBusy(true);
          setMessage(null);
          registerForAlertPush()
            .then(() => setState('enabled'))
            .catch((e) => setMessage(e instanceof Error ? e.message : 'Could not enable notifications.'))
            .finally(() => setBusy(false));
        }}
      />
    </View>
  );
}

function Row({ alert, onAcknowledge }: { alert: FiredAlert; onAcknowledge: () => void }) {
  const meta = ALERT_TYPE_META[alert.alert_type] ?? {
    icon: '·',
    color: colors.textMuted,
    label: alert.alert_type,
  };
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.panel }]}
      onPress={() => router.push({ pathname: '/company/[ticker]', params: { ticker: alert.ticker } })}>
      <Text style={[styles.icon, { color: meta.color }]}>{meta.icon}</Text>
      <View style={styles.rowMain}>
        <View style={styles.rowTop}>
          <Text style={styles.ticker}>{alert.ticker}</Text>
          <Text style={[styles.label, { color: meta.color }]}>{meta.label}</Text>
        </View>
        <Text style={styles.message}>{alert.message}</Text>
        <Text style={styles.age}>{relativeAge(alert.fired_at)}</Text>
      </View>
      <Pressable accessibilityLabel="Mark alert read" onPress={onAcknowledge} hitSlop={10} style={styles.ack}>
        <Text style={styles.ackText}>✓</Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: { color: colors.text, fontSize: 24, fontWeight: '700' },
  markAll: { color: colors.accentSoft, fontSize: 14 },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  row: { flexDirection: 'row', paddingVertical: spacing.md, gap: spacing.md },
  icon: { fontSize: 18, width: 24, textAlign: 'center', marginTop: 1 },
  rowMain: { flex: 1, minWidth: 0 },
  rowTop: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  ticker: { color: colors.text, fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  label: { fontSize: 12, fontWeight: '600' },
  message: { color: colors.textMuted, fontSize: 13, marginTop: 2, lineHeight: 18 },
  age: { color: colors.textFaint, fontSize: 11, marginTop: 4 },
  ack: { alignSelf: 'center', paddingLeft: spacing.sm, paddingVertical: spacing.xs },
  ackText: { color: colors.textFaint, fontSize: 16 },
  banner: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  bannerText: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  bannerError: { color: colors.negative, fontSize: 12 },
});
