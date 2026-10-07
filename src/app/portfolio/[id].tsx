import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { AccountPosition, AccountPositionsResponse, Portfolio, PortfolioHolding } from '@/api/types';
import { Centered, ErrorText, Muted } from '@/components/ui';
import { UpgradePrompt } from '@/components/upgrade-prompt';
import { useCompanyData } from '@/hooks/use-company-data';
import { pct, usd, usdThousands } from '@/lib/format';
import { usePortfolios } from '@/store/portfolios';
import { colors, radius, spacing } from '@/theme';

export default function PortfolioDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { portfolios, loading, fetch } = usePortfolios();
  const portfolio = portfolios.find((p) => p.id === id);

  // Deep link or cold start: the list hasn't been loaded yet.
  useEffect(() => {
    if (!portfolio && !loading) void fetch();
  }, [portfolio, loading, fetch]);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: portfolio?.name ?? '' }} />
      {portfolio ? (
        <Detail portfolio={portfolio} />
      ) : (
        <Centered>
          {loading ? <ActivityIndicator color={colors.textMuted} /> : <Muted>Portfolio not found.</Muted>}
        </Centered>
      )}
    </View>
  );
}

function Detail({ portfolio }: { portfolio: Portfolio }) {
  const sectors = Object.entries(portfolio.sector_breakdown ?? {}).filter(([, w]) => w > 0);
  const holdings = [...portfolio.holdings].sort((a, b) => b.allocation - a.allocation);

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Text style={styles.subtitle}>{portfolio.subtitle}</Text>
      {portfolio.philosophy ? <Text style={styles.philosophy}>{portfolio.philosophy}</Text> : null}

      {portfolio.is_account ? (
        <AccountPositions portfolioId={portfolio.id} />
      ) : (
        <>
          {sectors.length > 0 && (
            <>
              <Text style={styles.section}>Sectors</Text>
              <View style={[styles.card, { gap: spacing.sm }]}>
                {sectors.map(([sector, weight]) => (
                  <SectorBar key={sector} sector={sector} weight={weight} />
                ))}
              </View>
            </>
          )}
          <Text style={styles.section}>Holdings</Text>
          <View style={styles.card}>
            {holdings.length ? (
              holdings.map((h, i) => <HoldingRow key={h.ticker} holding={h} last={i === holdings.length - 1} />)
            ) : (
              <Muted>No holdings pass this strategy’s screens right now.</Muted>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

// Real brokerage positions, read-only: monitoring is mobile's job; editing
// shares/cost-basis, imports, and the AI review stay on the web app.
function AccountPositions({ portfolioId }: { portfolioId: string }) {
  const state = useCompanyData<AccountPositionsResponse>(
    `/api/positions/${encodeURIComponent(portfolioId)}`,
  );

  if (state.kind === 'loading') {
    return <ActivityIndicator style={{ marginTop: spacing.lg }} color={colors.textMuted} />;
  }
  if (state.kind === 'gated') {
    return <UpgradePrompt message={state.message} />;
  }
  if (state.kind === 'error' || state.kind === 'missing') {
    return <ErrorText>{state.kind === 'error' ? state.message : 'No positions found.'}</ErrorText>;
  }

  const { positions, totals } = state.data;
  const held = positions
    .filter((p) => p.shares > 0)
    .sort((a, b) => (b.market_value ?? 0) - (a.market_value ?? 0));
  const hasTargets = positions.some((p) => p.target_weight > 0);

  return (
    <>
      <View style={styles.summary}>
        <SummaryStat label="Value" value={usdThousands(totals.market_value)} />
        {totals.cost > 0 && <SummaryStat label="Cost" value={usdThousands(totals.cost)} />}
        <SummaryStat
          label="Return"
          value={totals.return_pct == null ? '—' : `${totals.return_pct > 0 ? '+' : ''}${totals.return_pct.toFixed(2)}%`}
          color={
            totals.return_pct == null
              ? undefined
              : totals.return_pct >= 0
                ? colors.positive
                : colors.negative
          }
        />
      </View>
      <Text style={styles.section}>Positions</Text>
      <View style={styles.card}>
        {held.length ? (
          held.map((p, i) => (
            <PositionRow key={p.ticker} position={p} hasTargets={hasTargets} last={i === held.length - 1} />
          ))
        ) : (
          <Muted>No positions yet. Import or enter them on the web app.</Muted>
        )}
      </View>
      <Text style={styles.footnote}>Edit shares and cost basis on the web app.</Text>
    </>
  );
}

function SummaryStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.summaryStat}>
      <Text style={styles.summaryLabel}>{label}</Text>
      {/* Never wrap a dollar amount — "$11439.9 / 3" reads as two numbers.
          Shrink to fit the card instead. */}
      <Text
        style={[styles.summaryValue, color ? { color } : null]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}>
        {value}
      </Text>
    </View>
  );
}

function PositionRow({
  position: p,
  hasTargets,
  last,
}: {
  position: AccountPosition;
  hasTargets: boolean;
  last: boolean;
}) {
  const ret = p.return_pct;
  // Same out-of-band rule as the web table: flag drift beyond 20% of the
  // target weight, with a 0.5pp floor.
  const driftBand = Math.max(0.005, p.target_weight * 0.2);
  const driftWarn = hasTargets && p.in_strategy && Math.abs(p.drift) > driftBand;
  return (
    <Pressable
      style={({ pressed }) => [styles.row, !last && styles.rowBorder, pressed && { opacity: 0.7 }]}
      onPress={() => router.push({ pathname: '/company/[ticker]', params: { ticker: p.ticker } })}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.tickerLine}>
          <Text style={styles.ticker}>{p.ticker}</Text>
          {!p.in_strategy && hasTargets && <Text style={styles.offStrategy}>off strategy</Text>}
        </View>
        <Text style={styles.company} numberOfLines={1}>
          {p.shares % 1 === 0 ? p.shares : p.shares.toFixed(4)} sh
          {p.cost_basis != null ? ` @ ${usd(p.cost_basis)}` : ''}
        </Text>
        <Text style={styles.weights}>
          {(p.actual_weight * 100).toFixed(1)}%
          {hasTargets && p.in_strategy
            ? ` of account · target ${(p.target_weight * 100).toFixed(1)}%${
                driftWarn ? ` · drift ${p.drift > 0 ? '+' : ''}${(p.drift * 100).toFixed(1)}pp ⚠` : ''
              }`
            : ' of account'}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.value}>{usdThousands(p.market_value, 0)}</Text>
        <Text
          style={[
            styles.return,
            { color: ret == null ? colors.textFaint : ret >= 0 ? colors.positive : colors.negative },
          ]}>
          {ret == null ? '—' : `${ret > 0 ? '+' : ''}${ret.toFixed(1)}%`}
        </Text>
      </View>
    </Pressable>
  );
}

function SectorBar({ sector, weight }: { sector: string; weight: number }) {
  return (
    <View>
      <View style={styles.sectorHead}>
        <Text style={styles.sectorName}>{sector}</Text>
        <Text style={styles.sectorPct}>{(weight * 100).toFixed(1)}%</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.min(weight, 1) * 100}%` }]} />
      </View>
    </View>
  );
}

function HoldingRow({ holding, last }: { holding: PortfolioHolding; last: boolean }) {
  const mos = holding.margin_of_safety;
  return (
    <Pressable
      style={({ pressed }) => [styles.row, !last && styles.rowBorder, pressed && { opacity: 0.7 }]}
      onPress={() => router.push({ pathname: '/company/[ticker]', params: { ticker: holding.ticker } })}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.ticker}>{holding.ticker}</Text>
        <Text style={styles.company} numberOfLines={1}>
          {holding.company_name || '—'}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.alloc}>{(holding.allocation * 100).toFixed(1)}%</Text>
        <Text
          style={[
            styles.mos,
            { color: mos == null ? colors.textFaint : mos > 0 ? colors.positive : colors.negative },
          ]}>
          MoS {pct(mos)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: spacing.lg, gap: spacing.md },
  subtitle: { color: colors.textMuted, fontSize: 14 },
  philosophy: { color: colors.text, fontSize: 14, lineHeight: 21 },
  section: { color: colors.text, fontSize: 16, fontWeight: '600', marginTop: spacing.sm },
  card: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  // Sector names can be long SIC strings ("APPAREL & OTHER FINISHD PRODS
  // OF FABRICS…") — the name must flex and the percentage must never be
  // pushed off the right edge.
  sectorHead: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.md, marginBottom: 4 },
  sectorName: { color: colors.textMuted, fontSize: 13, flex: 1, minWidth: 0 },
  sectorPct: { color: colors.text, fontSize: 13, fontVariant: ['tabular-nums'], flexShrink: 0 },
  track: { height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, backgroundColor: colors.accentSoft },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, gap: spacing.md },
  rowBorder: { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
  ticker: { color: colors.text, fontSize: 15, fontWeight: '700' },
  company: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  alloc: { color: colors.text, fontSize: 15, fontVariant: ['tabular-nums'] },
  mos: { fontSize: 12, marginTop: 2, fontVariant: ['tabular-nums'] },
  summary: { flexDirection: 'row', gap: spacing.sm },
  summaryStat: {
    flex: 1,
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  summaryLabel: { color: colors.textFaint, fontSize: 11 },
  summaryValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  tickerLine: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  offStrategy: { color: colors.warning, fontSize: 10, fontWeight: '600' },
  weights: { color: colors.textFaint, fontSize: 11, marginTop: 2 },
  value: { color: colors.text, fontSize: 15, fontVariant: ['tabular-nums'] },
  return: { fontSize: 12, marginTop: 2, fontVariant: ['tabular-nums'] },
  footnote: { color: colors.textFaint, fontSize: 12 },
});
