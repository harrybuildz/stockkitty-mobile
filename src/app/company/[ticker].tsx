import {
  buildValuationInputs,
  deriveAssumptions,
  runValuation,
  type Assumptions,
  type ValuationResult,
} from '@stockkitty/valuation';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { api, ApiError } from '@/api/client';
import type { Financials } from '@/api/types';
import { AssumptionsEditor } from '@/components/assumptions-editor';
import { Centered, ErrorText } from '@/components/ui';
import { pct, usd } from '@/lib/format';
import { useWatchlist } from '@/store/watchlist';
import { colors, radius, spacing } from '@/theme';

// Result is tagged with the ticker it belongs to; any mismatch with the
// current route param renders as loading.
type Loaded =
  | { ticker: string; kind: 'error'; message: string }
  | { ticker: string; kind: 'ready'; financials: Financials };

function errorMessage(e: unknown, ticker: string): string {
  if (e instanceof ApiError) {
    if (e.detail) return e.detail;
    if (e.status === 404) return `No data found for ${ticker}.`;
    if (e.status === 502) return 'The data provider is temporarily unavailable. Try again in a moment.';
  }
  return `Failed to load data for ${ticker}.`;
}

export default function Company() {
  const { ticker } = useLocalSearchParams<{ ticker: string }>();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const state = loaded?.ticker === ticker ? loaded : ({ kind: 'loading' } as const);

  useEffect(() => {
    // Stale-response guard (same rule as the web store): if the ticker
    // changes while this request is in flight, drop its result.
    let current = true;
    api<Financials>(`/api/company/${encodeURIComponent(ticker)}/financials`)
      .then((financials) => {
        if (current) setLoaded({ ticker, kind: 'ready', financials });
      })
      .catch((e) => {
        if (current) setLoaded({ ticker, kind: 'error', message: errorMessage(e, ticker) });
      });
    return () => {
      current = false;
    };
  }, [ticker]);

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{ title: ticker, headerRight: () => <WatchStar ticker={ticker} /> }}
      />
      {state.kind === 'loading' && (
        <Centered>
          <ActivityIndicator color={colors.textMuted} />
        </Centered>
      )}
      {state.kind === 'error' && (
        <View style={styles.pad}>
          <ErrorText>{state.message}</ErrorText>
        </View>
      )}
      {/* Keyed by ticker so edited assumptions never carry over to another company. */}
      {state.kind === 'ready' && <Valuation key={ticker} financials={state.financials} />}
    </View>
  );
}

// Watchlist star in the header. Tickers are stored uppercase server-side,
// and routes are pushed with uppercase tickers, so a plain includes() match
// is safe. Hidden until the watchlist has loaded — a star of unknown state
// that flips on first render reads as a glitch.
function WatchStar({ ticker }: { ticker: string }) {
  const { tickers, fetch, toggle } = useWatchlist();

  useEffect(() => {
    if (tickers == null) void fetch();
  }, [tickers, fetch]);

  if (tickers == null) return null;
  const watched = tickers.includes(ticker);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={watched ? `Remove ${ticker} from watchlist` : `Add ${ticker} to watchlist`}
      onPress={() => void toggle(ticker)}
      hitSlop={12}>
      <Text style={{ color: watched ? colors.warning : colors.textFaint, fontSize: 22 }}>
        {watched ? '★' : '☆'}
      </Text>
    </Pressable>
  );
}

function Valuation({ financials }: { financials: Financials }) {
  const defaults = useMemo(() => deriveAssumptions(financials), [financials]);
  const [assumptions, setAssumptions] = useState<Assumptions>(defaults);

  // Live recompute on-device through the shared package — the same
  // deriveAssumptions / buildValuationInputs / runValuation path as the web
  // company page, so an edit here moves the numbers exactly as it would there.
  const result = useMemo<ValuationResult | null>(() => {
    try {
      return runValuation(buildValuationInputs(financials, assumptions));
    } catch {
      return null;
    }
  }, [financials, assumptions]);

  return (
    <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
      {financials.companyName ? <Text style={styles.name}>{financials.companyName}</Text> : null}
      {result ? <Summary result={result} /> : <ErrorText>These assumptions don’t produce a valuation.</ErrorText>}
      <Text style={styles.section}>Assumptions</Text>
      <AssumptionsEditor value={assumptions} defaults={defaults} onChange={setAssumptions} />
      <Text style={styles.footnote}>
        Edits recalculate on this device and aren’t saved. AI suggestions, DDM, quality and
        sentiment are on the web app for now.
      </Text>
    </ScrollView>
  );
}

function Summary({ result }: { result: ValuationResult }) {
  const { summary } = result;
  const mos = summary.marginOfSafety;
  return (
    <>
      <View style={styles.hero}>
        <Stat label="Market price" value={usd(summary.currentMarketPrice)} />
        <Stat label="Intrinsic value" value={usd(summary.avgIntrinsicValue || null)} />
        <Stat
          label="Margin of safety"
          value={pct(mos)}
          color={mos == null ? colors.textFaint : mos > 0 ? colors.positive : colors.negative}
        />
      </View>
      <Text style={styles.section}>Models</Text>
      <View style={styles.card}>
        <ModelRow label="Free cash flow" value={result.fcf.pricePerShare} />
        <ModelRow label="Excess profit" value={result.ep.pricePerShare} />
        <ModelRow label="Residual earnings" value={result.re.pricePerShare} last />
      </View>
    </>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

function ModelRow({ label, value, last }: { label: string; value: number | null; last?: boolean }) {
  return (
    <View style={[styles.modelRow, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.modelLabel}>{label}</Text>
      <Text style={styles.modelValue}>{usd(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: spacing.lg, gap: spacing.md },
  name: { color: colors.textMuted, fontSize: 15 },
  hero: { flexDirection: 'row', gap: spacing.sm },
  stat: {
    flex: 1,
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  statLabel: { color: colors.textFaint, fontSize: 11 },
  statValue: { color: colors.text, fontSize: 17, fontWeight: '700', marginTop: 4, fontVariant: ['tabular-nums'] },
  section: { color: colors.text, fontSize: 16, fontWeight: '600', marginTop: spacing.md },
  card: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  modelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modelLabel: { color: colors.textMuted, fontSize: 14 },
  modelValue: { color: colors.text, fontSize: 14, fontVariant: ['tabular-nums'] },
  footnote: { color: colors.textFaint, fontSize: 12, lineHeight: 17, marginTop: spacing.md },
});
