import {
  buildValuationInputs,
  deriveAssumptions,
  runValuation,
  type ValuationResult,
} from '@stockkitty/valuation';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { api, ApiError } from '@/api/client';
import type { Financials } from '@/api/types';
import { Centered, ErrorText } from '@/components/ui';
import { pct, usd } from '@/lib/format';
import { colors, radius, spacing } from '@/theme';

// Result is tagged with the ticker it belongs to; any mismatch with the
// current route param renders as loading.
type Loaded =
  | { ticker: string; kind: 'error'; message: string }
  | { ticker: string; kind: 'ready'; financials: Financials; result: ValuationResult };

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
        if (!current) return;
        // Live valuation runs on-device through the shared package — the
        // same code the web company page uses.
        setLoaded({ ticker, kind: 'ready', financials, result: runValuation(buildValuationInputs(financials, deriveAssumptions(financials))) });
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
      <Stack.Screen options={{ title: ticker }} />
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
      {state.kind === 'ready' && <Valuation financials={state.financials} result={state.result} />}
    </View>
  );
}

function Valuation({ financials, result }: { financials: Financials; result: ValuationResult }) {
  const { summary } = result;
  const mos = summary.marginOfSafety;
  return (
    <ScrollView contentContainerStyle={styles.pad}>
      {financials.companyName ? <Text style={styles.name}>{financials.companyName}</Text> : null}
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
      <Text style={styles.footnote}>
        Computed on-device from default assumptions. Assumption editing, AI suggestions, DDM,
        quality and sentiment arrive in the next milestone.
      </Text>
    </ScrollView>
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
