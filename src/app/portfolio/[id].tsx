import * as WebBrowser from 'expo-web-browser';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Portfolio, PortfolioHolding } from '@/api/types';
import { Button, Centered, Muted } from '@/components/ui';
import { API_BASE_URL } from '@/config';
import { pct } from '@/lib/format';
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
        // Accounts are real positions with cost basis, imports and drift —
        // not ported yet, so hand off to the web app.
        <View style={styles.card}>
          <Muted>Brokerage account positions are on the web app for now.</Muted>
          <View style={{ height: spacing.md }} />
          <Button
            label="Open on the web"
            variant="secondary"
            onPress={() => WebBrowser.openBrowserAsync(`${API_BASE_URL}/portfolios`)}
          />
        </View>
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
  sectorHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  sectorName: { color: colors.textMuted, fontSize: 13 },
  sectorPct: { color: colors.text, fontSize: 13, fontVariant: ['tabular-nums'] },
  track: { height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, backgroundColor: colors.accentSoft },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, gap: spacing.md },
  rowBorder: { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
  ticker: { color: colors.text, fontSize: 15, fontWeight: '700' },
  company: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  alloc: { color: colors.text, fontSize: 15, fontVariant: ['tabular-nums'] },
  mos: { fontSize: 12, marginTop: 2, fontVariant: ['tabular-nums'] },
});
