import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';

import { ApiError } from '@/api/client';
import { Centered, ErrorText, Muted, Screen, Title } from '@/components/ui';
import { pct, usd } from '@/lib/format';
import { useScreener } from '@/store/screener';
import { colors, radius, spacing } from '@/theme';
import type { ScreenerRow } from '@/api/types';

export default function ScreenerScreen() {
  const { rows, loading, error, fetch } = useScreener();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!rows.length) void fetch();
  }, [rows.length, fetch]);

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.ticker.includes(q) || (r.company_name ?? '').toUpperCase().includes(q),
    );
  }, [rows, query]);

  return (
    <Screen>
      <Title>Screener</Title>
      <TextInput
        style={styles.search}
        placeholder="Filter by ticker or name"
        placeholderTextColor={colors.textFaint}
        autoCapitalize="characters"
        autoCorrect={false}
        value={query}
        onChangeText={setQuery}
        clearButtonMode="while-editing"
      />
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
      />
    </Screen>
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
  search: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: 15,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.sm,
  },
  count: { color: colors.textFaint, fontSize: 12, paddingVertical: spacing.sm },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, gap: spacing.md },
  rowMain: { flex: 1, minWidth: 0 },
  ticker: { color: colors.text, fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  name: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  rowNums: { alignItems: 'flex-end' },
  price: { color: colors.text, fontSize: 15, fontVariant: ['tabular-nums'] },
  mos: { fontSize: 13, marginTop: 2, fontVariant: ['tabular-nums'] },
});
