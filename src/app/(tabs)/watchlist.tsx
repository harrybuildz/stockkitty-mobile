import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/api/client';
import { Centered, ErrorText, Muted, Screen, Title } from '@/components/ui';
import { pct, usd } from '@/lib/format';
import { useScreener } from '@/store/screener';
import { useWatchlist } from '@/store/watchlist';
import { colors, spacing } from '@/theme';
import type { ScreenerRow } from '@/api/types';

type Entry = { ticker: string; row: ScreenerRow | null };

export default function Watchlist() {
  const { tickers, loading, error, fetch, toggle } = useWatchlist();
  const screener = useScreener();

  useEffect(() => {
    if (tickers == null) void fetch();
  }, [tickers, fetch]);
  useEffect(() => {
    if (!screener.rows.length) void screener.fetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screener.rows.length]);

  // Watchlist is just tickers; prices and MoS come from the screener rows
  // already in memory, so this tab costs no extra requests.
  const entries = useMemo<Entry[]>(() => {
    const byTicker = new Map(screener.rows.map((r) => [r.ticker, r]));
    return [...(tickers ?? [])]
      .sort()
      .map((ticker) => ({ ticker, row: byTicker.get(ticker) ?? null }));
  }, [tickers, screener.rows]);

  return (
    <Screen>
      <Title>Watchlist</Title>
      {error != null && (
        <ErrorText>{error instanceof ApiError ? (error.detail ?? error.message) : String(error)}</ErrorText>
      )}
      <FlatList
        data={entries}
        keyExtractor={(e) => e.ticker}
        renderItem={({ item }) => <Row entry={item} onRemove={() => void toggle(item.ticker)} />}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetch} tintColor={colors.textMuted} />
        }
        ListEmptyComponent={
          tickers == null ? null : (
            <Centered>
              <Muted>
                Nothing watched yet. Open a company and tap the star — alerts fire for watched
                companies after each data refresh.
              </Muted>
            </Centered>
          )
        }
        ListHeaderComponent={
          entries.length ? (
            <Text style={styles.count}>{entries.length} watched · synced with the web app</Text>
          ) : null
        }
      />
    </Screen>
  );
}

function Row({ entry, onRemove }: { entry: Entry; onRemove: () => void }) {
  const mos = entry.row?.margin_of_safety ?? null;
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.panel }]}
      onPress={() => router.push({ pathname: '/company/[ticker]', params: { ticker: entry.ticker } })}>
      <View style={styles.rowMain}>
        <Text style={styles.ticker}>{entry.ticker}</Text>
        <Text style={styles.name} numberOfLines={1}>
          {entry.row?.company_name ?? 'Not in screener'}
        </Text>
      </View>
      <View style={styles.rowNums}>
        <Text style={styles.price}>{usd(entry.row?.market_price)}</Text>
        <Text
          style={[
            styles.mos,
            { color: mos == null ? colors.textFaint : mos > 0 ? colors.positive : colors.negative },
          ]}>
          {pct(mos)}
        </Text>
      </View>
      <Pressable accessibilityLabel={`Remove ${entry.ticker} from watchlist`} onPress={onRemove} hitSlop={10} style={styles.remove}>
        <Text style={styles.removeText}>✕</Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  count: { color: colors.textFaint, fontSize: 12, paddingVertical: spacing.sm },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, gap: spacing.md },
  rowMain: { flex: 1, minWidth: 0 },
  ticker: { color: colors.text, fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  name: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  rowNums: { alignItems: 'flex-end' },
  price: { color: colors.text, fontSize: 15, fontVariant: ['tabular-nums'] },
  mos: { fontSize: 13, marginTop: 2, fontVariant: ['tabular-nums'] },
  remove: { paddingLeft: spacing.sm, paddingVertical: spacing.xs },
  removeText: { color: colors.textFaint, fontSize: 16 },
});
