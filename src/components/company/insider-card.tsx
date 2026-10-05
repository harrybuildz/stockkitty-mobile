import { StyleSheet, Text, View } from 'react-native';

import { usdCompact } from '@/lib/format';
import { useCompanyData } from '@/hooks/use-company-data';
import { colors, spacing } from '@/theme';
import type { InsiderActivity } from '@/api/types';

import { DataCard, MetricRow } from './card';

const TX_LIMIT = 8;

// SEC Form 4 insider activity (trailing year): summary line + the most
// recent filings. Hidden entirely when the server has no Polygon key.
export function InsiderCard({ ticker }: { ticker: string }) {
  const state = useCompanyData<InsiderActivity>(
    `/api/company/${encodeURIComponent(ticker)}/insider`,
  );
  if (state.kind === 'ready' && !state.data.available) return null;
  return (
    <DataCard title="Insider activity (1y)" state={state}>
      {(ins) => {
        const { summary } = ins;
        const net = summary.net_value;
        return (
          <>
            <MetricRow
              label={`${summary.buyer_count} buyer${summary.buyer_count === 1 ? '' : 's'} · ${summary.seller_count} seller${summary.seller_count === 1 ? '' : 's'} · ${summary.tx_count} filings`}
              value={`net ${usdCompact(net)}`}
              color={net > 0 ? colors.positive : net < 0 ? colors.negative : undefined}
              last={!ins.transactions.length}
            />
            {!ins.transactions.length && (
              <Text style={styles.empty}>No insider filings in the past year.</Text>
            )}
            {ins.transactions.slice(0, TX_LIMIT).map((t, i, shown) => (
              <View
                key={`${t.date}-${t.insider}-${i}`}
                style={[styles.tx, i === shown.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.insider} numberOfLines={1}>
                    {t.insider}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {t.role ? `${t.role} · ` : ''}
                    {t.date}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text
                    style={[
                      styles.action,
                      { color: t.is_buy ? colors.positive : t.is_sell ? colors.negative : colors.textMuted },
                    ]}>
                    {t.is_buy ? 'Buy' : t.is_sell ? 'Sell' : t.action}
                  </Text>
                  <Text style={styles.value}>{t.value ? usdCompact(t.value) : `${t.shares.toLocaleString()} sh`}</Text>
                </View>
              </View>
            ))}
          </>
        );
      }}
    </DataCard>
  );
}

const styles = StyleSheet.create({
  empty: { color: colors.textFaint, fontSize: 13, padding: spacing.md },
  tx: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  insider: { color: colors.text, fontSize: 13 },
  meta: { color: colors.textFaint, fontSize: 11, marginTop: 1 },
  action: { fontSize: 12, fontWeight: '700' },
  value: { color: colors.textMuted, fontSize: 12, fontVariant: ['tabular-nums'], marginTop: 1 },
});
