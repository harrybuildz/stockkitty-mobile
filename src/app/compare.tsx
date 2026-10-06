import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { ScreenerRow } from '@/api/types';
import { Muted } from '@/components/ui';
import { track } from '@/lib/analytics';
import { extremes, formatValue, METRICS } from '@/lib/compare';
import { useScreener } from '@/store/screener';
import { colors, radius, spacing } from '@/theme';

const MAX = 5;
const LABEL_W = 132;
const COL_W = 78;

export default function Compare() {
  const params = useLocalSearchParams<{ tickers?: string }>();
  const { rows, fetch } = useScreener();
  const [tickers, setTickers] = useState<string[]>(() =>
    (params.tickers ?? '')
      .split(',')
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean)
      .slice(0, MAX),
  );
  const [query, setQuery] = useState('');

  useEffect(() => {
    track('page_view', { detail: '/compare' });
    if (!useScreener.getState().rows.length) void fetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const byTicker = useMemo(() => new Map(rows.map((r) => [r.ticker, r])), [rows]);
  const selected = tickers.map((t) => ({ ticker: t, row: byTicker.get(t) ?? null }));

  const suggestions = useMemo(() => {
    const q = query.trim().toUpperCase();
    if (q.length < 1) return [];
    return rows
      .filter((r) => !tickers.includes(r.ticker))
      .filter((r) => r.ticker.startsWith(q) || (r.company_name ?? '').toUpperCase().includes(q))
      .slice(0, 6);
  }, [rows, query, tickers]);

  const add = (ticker: string) => {
    if (tickers.length >= MAX || tickers.includes(ticker)) return;
    setTickers([...tickers, ticker]);
    setQuery('');
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Compare' }} />
      <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
        <View style={styles.chips}>
          {selected.map(({ ticker }) => (
            <Pressable
              key={ticker}
              style={styles.chip}
              accessibilityLabel={`Remove ${ticker}`}
              onPress={() => setTickers(tickers.filter((t) => t !== ticker))}>
              <Text style={styles.chipText}>{ticker} ✕</Text>
            </Pressable>
          ))}
        </View>
        {tickers.length < MAX ? (
          <TextInput
            style={styles.search}
            placeholder={tickers.length ? 'Add another ticker' : 'Add 2–5 tickers to compare'}
            placeholderTextColor={colors.textFaint}
            autoCapitalize="characters"
            autoCorrect={false}
            value={query}
            onChangeText={setQuery}
          />
        ) : (
          <Muted>Maximum 5 tickers.</Muted>
        )}
        {suggestions.map((r) => (
          <Pressable key={r.ticker} style={styles.suggestion} onPress={() => add(r.ticker)}>
            <Text style={styles.suggestionTicker}>{r.ticker}</Text>
            <Text style={styles.suggestionName} numberOfLines={1}>
              {r.company_name ?? ''}
            </Text>
          </Pressable>
        ))}

        {selected.length >= 2 && <Table selected={selected} />}
        {selected.length < 2 && (
          <Text style={styles.hint}>
            Pick at least two companies — cells highlight the best (green) and worst (red) value
            per row where direction is meaningful.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

function Table({ selected }: { selected: { ticker: string; row: ScreenerRow | null }[] }) {
  const rowsOnly = selected.map((s) => s.row);
  const metricRows = METRICS.map((metric, i) => ({
    metric,
    groupHeader: i === 0 || METRICS[i - 1].group !== metric.group ? metric.group : null,
  }));
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.md }}>
      <View>
        <View style={styles.tr}>
          <View style={{ width: LABEL_W }} />
          {selected.map(({ ticker, row }) => (
            <Pressable
              key={ticker}
              style={{ width: COL_W }}
              onPress={() => router.push({ pathname: '/company/[ticker]', params: { ticker } })}>
              <Text style={styles.colTicker}>{ticker}</Text>
              <Text style={styles.colName} numberOfLines={1}>
                {row ? (row.company_name ?? '') : 'Not in screener'}
              </Text>
            </Pressable>
          ))}
        </View>
        {metricRows.map(({ metric, groupHeader }) => {
          const { best, worst } = extremes(metric, rowsOnly);
          return (
            <View key={metric.key}>
              {groupHeader && <Text style={styles.group}>{groupHeader}</Text>}
              <View style={[styles.tr, styles.trBorder]}>
                <Text style={[styles.metricLabel, { width: LABEL_W }]}>{metric.label}</Text>
                {rowsOnly.map((row, i) => (
                  <Text
                    key={selected[i].ticker}
                    style={[
                      styles.cell,
                      { width: COL_W },
                      best.has(i) && { color: colors.positive, fontWeight: '600' },
                      worst.has(i) && { color: colors.negative },
                      formatValue(metric, row) === '—' && { color: colors.textFaint },
                    ]}
                    numberOfLines={1}>
                    {formatValue(metric, row)}
                  </Text>
                ))}
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: spacing.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  chip: {
    backgroundColor: colors.panelRaised,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
  },
  chipText: { color: colors.text, fontSize: 13, fontWeight: '600' },
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
  suggestion: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  suggestionTicker: { color: colors.text, fontSize: 14, fontWeight: '700' },
  suggestionName: { color: colors.textMuted, fontSize: 12, flex: 1 },
  hint: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: spacing.lg },
  tr: { flexDirection: 'row', alignItems: 'baseline' },
  trBorder: { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
  colTicker: { color: colors.accentSoft, fontSize: 13, fontWeight: '700', textAlign: 'right' },
  colName: { color: colors.textFaint, fontSize: 9, textAlign: 'right' },
  group: {
    color: colors.textFaint,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.md,
    marginBottom: 2,
  },
  metricLabel: { color: colors.textMuted, fontSize: 12, paddingVertical: spacing.sm },
  cell: {
    color: '#d1d5db',
    fontSize: 12,
    textAlign: 'right',
    paddingVertical: spacing.sm,
    fontVariant: ['tabular-nums'],
  },
});
