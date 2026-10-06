import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';

import { api, ApiError } from '@/api/client';
import { FilterSheet } from '@/components/filter-sheet';
import { Centered, ErrorText, Muted, Screen, Title } from '@/components/ui';
import { track } from '@/lib/analytics';
import { pct, usd } from '@/lib/format';
import { activeFilterCount, applyFilters } from '@/lib/screener-filters';
import { useScreener } from '@/store/screener';
import { useScreenerFilters } from '@/store/screener-filters';
import { useWatchlist } from '@/store/watchlist';
import { colors, radius, spacing } from '@/theme';
import type { ScreenerRow, SearchResult } from '@/api/types';

export default function ScreenerScreen() {
  const { rows, loading, error, fetch } = useScreener();
  const [query, setQuery] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const filterState = useScreenerFilters();
  const watchlist = useWatchlist((s) => s.tickers);
  const filterCount = activeFilterCount(filterState);

  useEffect(() => {
    if (!rows.length) void fetch();
  }, [rows.length, fetch]);

  // "Watchlist only" is meaningless until the watchlist has loaded —
  // fetch it the moment the toggle goes on, not only when the tab opens.
  useEffect(() => {
    if (filterState.watchlistOnly && !useWatchlist.getState().loaded) {
      void useWatchlist.getState().fetch();
    }
  }, [filterState.watchlistOnly]);

  // Same detail string as the web screener ('/') so the admin analytics
  // aggregates count both clients together.
  useFocusEffect(useCallback(() => track('page_view', { detail: '/' }), []));

  const screened = useMemo(
    () =>
      applyFilters(
        rows,
        {
          active: filterState.active,
          hiddenCats: filterState.hiddenCats,
          watchlistOnly: filterState.watchlistOnly,
        },
        watchlist,
      ),
    [rows, filterState.active, filterState.hiddenCats, filterState.watchlistOnly, watchlist],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    if (!q) return screened;
    return screened.filter(
      (r) => r.ticker.includes(q) || (r.company_name ?? '').toUpperCase().includes(q),
    );
  }, [screened, query]);

  return (
    <Screen>
      <Title>Screener</Title>
      <View style={styles.controls}>
        <TextInput
          style={[styles.search, { flex: 1 }]}
          placeholder="Filter by ticker or name"
          placeholderTextColor={colors.textFaint}
          autoCapitalize="characters"
          autoCorrect={false}
          value={query}
          onChangeText={setQuery}
          clearButtonMode="while-editing"
        />
        <Pressable
          style={({ pressed }) => [
            styles.filterBtn,
            filterCount > 0 && styles.filterBtnActive,
            pressed && { opacity: 0.7 },
          ]}
          onPress={() => setSheetOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Open screener filters">
          <Text style={[styles.filterBtnText, filterCount > 0 && { color: colors.text }]}>
            Filters{filterCount > 0 ? ` (${filterCount})` : ''}
          </Text>
        </Pressable>
      </View>
      <FilterSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} />
      {error != null && <ErrorText>{error instanceof ApiError ? (error.detail ?? error.message) : String(error)}</ErrorText>}
      <FlatList
        data={filtered}
        keyExtractor={(r) => r.ticker}
        renderItem={({ item }) => <Row row={item} />}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetch} tintColor={colors.textMuted} />
        }
        initialNumToRender={20}
        windowSize={10}
        ListEmptyComponent={
          loading ? null : (
            <Centered>
              <Muted>{query ? 'No matches.' : 'No screener data yet.'}</Muted>
            </Centered>
          )
        }
        ListHeaderComponent={
          rows.length ? <Text style={styles.count}>{filtered.length} of {rows.length} companies · sorted by margin of safety</Text> : null
        }
        ListFooterComponent={
          query.trim().length >= 2 ? (
            <WiderSearch query={query.trim()} known={rows} />
          ) : null
        }
        keyboardShouldPersistTaps="handled"
      />
    </Screen>
  );
}

type SearchState =
  | { query: string; kind: 'loading' }
  | { query: string; kind: 'done'; results: SearchResult[] }
  | { query: string; kind: 'error'; message: string };

// /api/search also finds companies outside the screener universe (via the
// data provider), so it's offered as an explicit action rather than fired
// on every keystroke. State is tagged with its query; a stale answer for a
// different filter is never shown.
function WiderSearch({ query, known }: { query: string; known: ScreenerRow[] }) {
  const [state, setState] = useState<SearchState | null>(null);
  const current = state?.query === query ? state : null;

  async function run() {
    setState({ query, kind: 'loading' });
    try {
      const results = await api<SearchResult[]>(`/api/search?q=${encodeURIComponent(query)}`);
      setState({ query, kind: 'done', results });
    } catch (e) {
      setState({ query, kind: 'error', message: e instanceof ApiError && e.detail ? e.detail : 'Search failed.' });
    }
  }

  if (!current) {
    return (
      <Pressable style={styles.searchAll} onPress={run}>
        <Text style={styles.searchAllText}>Search all companies for “{query}”</Text>
      </Pressable>
    );
  }
  if (current.kind === 'loading') return <ActivityIndicator style={{ margin: spacing.lg }} color={colors.textMuted} />;
  if (current.kind === 'error') return <View style={{ marginTop: spacing.md }}><ErrorText>{current.message}</ErrorText></View>;

  const knownTickers = new Set(known.map((r) => r.ticker));
  const extra = current.results.filter((r) => !knownTickers.has(r.symbol));
  return (
    <View style={{ marginTop: spacing.md }}>
      <Text style={styles.count}>
        {extra.length ? 'Other companies' : 'No other companies found.'}
      </Text>
      {extra.map((r) => (
        <Pressable
          key={r.symbol}
          style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.panel }]}
          onPress={() => router.push({ pathname: '/company/[ticker]', params: { ticker: r.symbol } })}>
          <View style={styles.rowMain}>
            <Text style={styles.ticker}>{r.symbol}</Text>
            <Text style={styles.name} numberOfLines={1}>{r.name}</Text>
          </View>
          <Text style={styles.notScreened}>Not in screener</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Row({ row }: { row: ScreenerRow }) {
  const mos = row.margin_of_safety;
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.panel }]}
      onPress={() => router.push({ pathname: '/company/[ticker]', params: { ticker: row.ticker } })}>
      <View style={styles.rowMain}>
        <Text style={styles.ticker}>{row.ticker}</Text>
        <Text style={styles.name} numberOfLines={1}>
          {row.company_name ?? '—'}
        </Text>
      </View>
      <View style={styles.rowNums}>
        <Text style={styles.price}>{usd(row.market_price)}</Text>
        <Text
          style={[
            styles.mos,
            { color: mos == null ? colors.textFaint : mos > 0 ? colors.positive : colors.negative },
          ]}>
          {pct(mos)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  controls: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  search: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: 15,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  filterBtn: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  filterBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  filterBtnText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  count: { color: colors.textFaint, fontSize: 12, paddingVertical: spacing.sm },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, gap: spacing.md },
  rowMain: { flex: 1, minWidth: 0 },
  ticker: { color: colors.text, fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  name: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  rowNums: { alignItems: 'flex-end' },
  price: { color: colors.text, fontSize: 15, fontVariant: ['tabular-nums'] },
  mos: { fontSize: 13, marginTop: 2, fontVariant: ['tabular-nums'] },
  searchAll: { paddingVertical: spacing.lg, alignItems: 'center' },
  searchAllText: { color: colors.accentSoft, fontSize: 14 },
  notScreened: { color: colors.textFaint, fontSize: 12 },
});
