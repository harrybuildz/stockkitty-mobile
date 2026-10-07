import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/api/client';
import type { Alert } from '@/api/types';
import { Button, Centered, ErrorText, Muted, Screen, Title } from '@/components/ui';
import { upgradeMessage, UpgradePrompt } from '@/components/upgrade-prompt';
import { track } from '@/lib/analytics';
import { getPushPermissionStatus, pushSupported, registerForAlertPush } from '@/lib/push';
import { relativeAge } from '@/lib/time';
import { useAlerts } from '@/store/alerts';
import { colors, radius, spacing } from '@/theme';

// Same types, icons and labels as the web app's AlertsBell.
const ALERT_TYPE_META: Record<string, { icon: string; color: string; label: string }> = {
  mos_dropped: { icon: '↘', color: colors.negative, label: 'MoS turned negative' },
  fscore_dropped: { icon: '↓', color: colors.warning, label: 'F-Score deterioration' },
  newly_flagged: { icon: '⚠', color: colors.warning, label: 'Newly flagged' },
  new_qv_candidate: { icon: '★', color: colors.positive, label: 'New QV candidate' },
  price_moved: { icon: '⚡', color: colors.accentSoft, label: 'Big price move' },
  news_spike: { icon: '◉', color: colors.accentSoft, label: 'News coverage spike' },
  sentiment_swing: { icon: '↕', color: '#c084fc', label: 'Sentiment swing' },
};
const FALLBACK_META = { icon: '•', color: colors.textMuted, label: 'Alert' };

export default function Alerts() {
  const { alerts, showAll, unackedCount, loaded, loading, error, fetch, setShowAll, acknowledge, acknowledgeAll } =
    useAlerts();

  useFocusEffect(
    useCallback(() => {
      // alerts_open matches the web AlertsBell's event; page_view keeps
      // the per-screen traffic picture complete.
      track('alerts_open');
      track('page_view', { detail: '/alerts' });
      void fetch();
    }, [fetch]),
  );

  return (
    <Screen>
      <View style={styles.header}>
        <Title>Alerts</Title>
        {unackedCount > 0 && (
          <Pressable accessibilityRole="button" onPress={() => void acknowledgeAll()} hitSlop={8}>
            <Text style={styles.link}>Mark all read</Text>
          </Pressable>
        )}
      </View>
      <View style={styles.segment}>
        <Segment label="New" active={!showAll} onPress={() => void setShowAll(false)} />
        <Segment label="All" active={showAll} onPress={() => void setShowAll(true)} />
      </View>
      {upgradeMessage(error) != null ? (
        <UpgradePrompt message={upgradeMessage(error)!} />
      ) : (
        error != null && (
          <ErrorText>{error instanceof ApiError ? (error.detail ?? error.message) : String(error)}</ErrorText>
        )
      )}
      <PushBanner />
      <FlatList
        data={alerts}
        keyExtractor={(a) => String(a.id)}
        renderItem={({ item }) => <Row alert={item} onAcknowledge={() => void acknowledge(item.id)} />}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetch} tintColor={colors.textMuted} />}
        ListEmptyComponent={
          loaded ? (
            <Centered>
              <Muted>
                {showAll
                  ? 'No alerts yet.'
                  : 'You’re all caught up. Alerts fire after each nightly run for your watchlist and portfolio tickers.'}
              </Muted>
            </Centered>
          ) : null
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
        // Permission granted ≠ registered: the token fetch or the server
        // call can still fail (e.g. missing FCM config). A silent catch
        // here once hid exactly that — surface failures as the banner
        // with the real error so they're visible and retryable.
        registerForAlertPush()
          .then(() => current && setState('enabled'))
          .catch((e) => {
            if (!current) return;
            setState('prompt');
            setMessage(e instanceof Error ? e.message : 'Could not register for notifications.');
          });
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

function Segment({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.segmentItem, active && styles.segmentActive]}>
      <Text style={[styles.segmentText, active && { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

function Row({ alert, onAcknowledge }: { alert: Alert; onAcknowledge: () => void }) {
  const meta = ALERT_TYPE_META[alert.alert_type] ?? FALLBACK_META;
  const acked = Boolean(alert.acknowledged);
  return (
    <View style={[styles.row, acked && { opacity: 0.55 }]}>
      <Pressable
        style={({ pressed }) => [styles.main, pressed && { opacity: 0.7 }]}
        onPress={() => router.push({ pathname: '/company/[ticker]', params: { ticker: alert.ticker } })}>
        <Text style={[styles.icon, { color: meta.color }]}>{meta.icon}</Text>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={styles.line}>
            <Text style={styles.ticker}>{alert.ticker}</Text>
            <Text style={[styles.type, { color: meta.color }]} numberOfLines={1}>
              {meta.label}
            </Text>
          </View>
          <Text style={styles.message}>{alert.message}</Text>
          <Text style={styles.age}>{relativeAge(alert.fired_at)}</Text>
        </View>
      </Pressable>
      {!acked && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Mark ${alert.ticker} alert as read`}
          hitSlop={8}
          onPress={onAcknowledge}
          style={({ pressed }) => [styles.ack, pressed && { opacity: 0.6 }]}>
          <Text style={styles.ackText}>✓</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  link: { color: colors.accentSoft, fontSize: 14 },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.panel,
    borderRadius: radius.md,
    padding: 3,
    marginBottom: spacing.md,
    alignSelf: 'flex-start',
  },
  segmentItem: { paddingVertical: 6, paddingHorizontal: spacing.lg, borderRadius: radius.sm },
  segmentActive: { backgroundColor: colors.panelRaised },
  segmentText: { color: colors.textFaint, fontSize: 13, fontWeight: '600' },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  main: { flex: 1, flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.md },
  icon: { fontSize: 18, width: 22, textAlign: 'center', marginTop: 1 },
  line: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  ticker: { color: colors.text, fontSize: 15, fontWeight: '700' },
  type: { fontSize: 12, flexShrink: 1 },
  message: { color: colors.textMuted, fontSize: 13, lineHeight: 18, marginTop: 2 },
  age: { color: colors.textFaint, fontSize: 11, marginTop: 4 },
  ack: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ackText: { color: colors.textMuted, fontSize: 15 },
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
