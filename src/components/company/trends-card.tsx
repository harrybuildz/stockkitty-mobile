import { StyleSheet, Text, View } from 'react-native';

import { BarChart } from '@/components/charts';
import { usdCompact } from '@/lib/format';
import { colors, radius, spacing } from '@/theme';
import type { Financials } from '@/api/types';

// Annual revenue from the financials already fetched for the valuation —
// no extra request. Series arrive oldest-first from the backend.
export function TrendsCard({ financials }: { financials: Financials }) {
  const revenue = asNumbers(financials.revenue);
  if (revenue.length < 2) return null;
  const years = asStrings(financials.financialYears, revenue.length);

  return (
    <>
      <Text style={styles.section}>Revenue trend</Text>
      <View style={styles.card}>
        <BarChart values={revenue} labels={years} format={usdCompact} />
      </View>
    </>
  );
}

function asNumbers(raw: unknown): number[] {
  return Array.isArray(raw) ? raw.filter((v): v is number => Number.isFinite(v)) : [];
}

function asStrings(raw: unknown, n: number): string[] {
  const years = Array.isArray(raw) ? raw.map(String) : [];
  // FY labels like "2023" can arrive longer ("FY2023-09"); keep the year.
  const trimmed = years.map((y) => (y.match(/\d{4}/)?.[0] ?? y).slice(0, 4));
  return trimmed.length === n ? trimmed : Array.from({ length: n }, (_, i) => `Yr ${i + 1}`);
}

const styles = StyleSheet.create({
  section: { color: colors.text, fontSize: 16, fontWeight: '600', marginTop: spacing.md },
  card: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
});
