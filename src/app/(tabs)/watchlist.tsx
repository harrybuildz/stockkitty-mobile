import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/api/client';
import type { ScreenerRow } from '@/api/types';
import { Centered, ErrorText, Muted, Screen, Title } from '@/components/ui';
import { upgradeMessage, UpgradePrompt } from '@/components/upgrade-prompt';
import { track } from '@/lib/analytics';
import { pct, usd } from '@/lib/format';
import { useScreener } from '@/store/screener';
import { useWatchlist } from '@/store/watchlist';
import { colors, spacing } from '@/theme';

export default function Watchlist() {
  const { tickers, loaded, loading, error, fetch, toggle } = useWatchlist();
  const { rows, fetch: fetchScreener } = useScreener();

  // Refetch whenever the tab comes into view, so stars added on the web app
  // (or another device) show up without restarting the app.
  useFocusEffect(
    useCallback(() => {
      track('page_view', { detail: '/watchlist' });
      void fetch();
      if (!useScreener.getState().rows.length) void fetchScreener();
    }, [fetch, fetchScreener]),
  );

  const byTicker = useMemo(() => new Map(rows.map((r) => [r.ticker, r])), [rows]);

  return (
    <Screen>
      <Title>Watchlist</Title>
      {upgradeMessage(error) != null ? (
        <UpgradePrompt message={upgradeMessage(error)!} />
      ) : (
        error != null && (
          <ErrorText>{error instanceof ApiError ? (error.detail ?? error.message) : String(error)}</ErrorText>
        )
      )}
      <FlatList
        data={tickers}
        keyExtractor={(t) => t}
        renderItem={({ item }) => <Row ticker={item} row={byTicker.get(item)} onRemove={() => toggle(item)} />}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetch} tintColor={colors.textMuted} />}
        ListEmptyComponent={
          loaded ? (
            <Centered>
              <Muted>Nothing here yet. Tap ☆ on a company page to watch it. It syncs with the web app.</Muted>
            </Centered>
          ) : null
        }
      />
    </Screen>
  );
}

function Row({ ticker, row, onRemove }: { ticker: string; row?: ScreenerRow; onRemove: () => void }) {
  const mos = row?.margin_of_safety ?? null;
  return (
    <View style={styles.row}>
      <Pressable
        style={({ pressed }) => [styles.main, pressed && { opacity: 0.7 }]}
        onPress={() => router.push({ pathname: '/company/[ticker]', params: { ticker } })}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.ticker}>{ticker}</Text>
          <Text style={styles.name} numberOfLines={1}>
            {row?.company_name ?? 'Not in screener'}
          </Text>
        </View>
        {row && (
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.price}>{usd(row.market_price)}</Text>
            <Text
              style={[
                styles.mos,
                { color: mos == null ? colors.textFaint : mos > 0 ? colors.positive : colors.negative },
              ]}>
              {pct(mos)}
            </Text>
          </View>
        )}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Remove ${ticker} from watchlist`}
        hitSlop={8}
        onPress={onRemove}
        style={({ pressed }) => [styles.star, pressed && { opacity: 0.6 }]}>
        <Text style={styles.starText}>★</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, gap: spacing.md },
  ticker: { color: colors.text, fontSize: 16, fontWeight: '700' },
  name: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  price: { color: colors.text, fontSize: 15, fontVariant: ['tabular-nums'] },
  mos: { fontSize: 13, marginTop: 2, fontVariant: ['tabular-nums'] },
  star: { padding: spacing.sm },
  starText: { color: colors.warning, fontSize: 20 },
});
