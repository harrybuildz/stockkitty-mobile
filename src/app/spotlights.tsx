import { router, Stack } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Highlights } from '@/api/types';
import { Centered, ErrorText } from '@/components/ui';
import { useCompanyData } from '@/hooks/use-company-data';
import { track } from '@/lib/analytics';
import { pct, usdCompact } from '@/lib/format';
import { colors, radius, spacing } from '@/theme';

// Category tints, mirroring the web's section headers
// (green / blue / amber / rose for value / quality / contrarian / caution).
const CATEGORY_TINT: Record<string, string> = {
  value: colors.positive,
  quality: colors.accentSoft,
  contrarian: colors.warning,
  caution: colors.negative,
};

export default function Spotlights() {
  const state = useCompanyData<Highlights>('/api/highlights');

  useEffect(() => {
    track('page_view', { detail: '/spotlights' });
  }, []);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Spotlights' }} />
      {state.kind === 'loading' && (
        <Centered>
          <ActivityIndicator color={colors.textMuted} />
        </Centered>
      )}
      {(state.kind === 'error' || state.kind === 'missing') && (
        <View style={styles.pad}>
          <ErrorText>
            {state.kind === 'error' ? state.message : 'No spotlight data yet.'}
          </ErrorText>
        </View>
      )}
      {state.kind === 'ready' && <Body highlights={state.data} />}
    </View>
  );
}

function Body({ highlights }: { highlights: Highlights }) {
  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Text style={styles.intro}>
        Companies highlighted for specific, stated reasons — each with the evidence attached.
      </Text>
      {highlights.categories.map((category) => {
        const rules = highlights.rules.filter(
          (r) => r.category === category.key && r.companies.length > 0,
        );
        if (!rules.length) return null;
        const tint = CATEGORY_TINT[category.key] ?? colors.textMuted;
        return (
          <View key={category.key}>
            <Text style={[styles.category, { color: tint }]}>{category.label}</Text>
            {rules.map((rule) => (
              <View key={rule.code} style={styles.rule}>
                <Text style={styles.ruleLabel}>
                  {rule.label} <Text style={styles.ruleCount}>· {rule.total}</Text>
                </Text>
                <Text style={styles.blurb}>{rule.blurb}</Text>
                <View style={styles.card}>
                  {rule.companies.map((c, i) => (
                    <Pressable
                      key={c.ticker}
                      style={({ pressed }) => [
                        styles.row,
                        i < rule.companies.length - 1 && styles.rowBorder,
                        pressed && { opacity: 0.7 },
                      ]}
                      onPress={() =>
                        router.push({ pathname: '/company/[ticker]', params: { ticker: c.ticker } })
                      }>
                      <View style={styles.rowTop}>
                        <Text style={styles.ticker}>{c.ticker}</Text>
                        <Text style={styles.name} numberOfLines={1}>
                          {c.company_name ?? '—'}
                        </Text>
                        <Text style={[styles.mos, { color: mosColor(c.margin_of_safety) }]}>
                          {pct(c.margin_of_safety)}
                        </Text>
                      </View>
                      <Text style={styles.evidence}>{c.evidence}</Text>
                      <Text style={styles.meta}>
                        {c.sector ?? '—'} · {usdCompact(c.market_cap)}
                        {c.consensus_label ? ` · consensus ${c.consensus_label}` : ''}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {rule.total > rule.companies.length && (
                  <Text style={styles.more}>
                    +{rule.total - rule.companies.length} more — see the screener
                  </Text>
                )}
              </View>
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
}

function mosColor(mos: number | null): string {
  if (mos == null) return colors.textFaint;
  if (mos > 0.25) return colors.positive;
  if (mos > 0) return '#86efac'; // pale green, matching the web's scale
  return colors.negative;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: spacing.lg, gap: spacing.md },
  intro: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  category: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.lg,
  },
  rule: { marginTop: spacing.md },
  ruleLabel: { color: colors.text, fontSize: 16, fontWeight: '600' },
  ruleCount: { color: colors.textFaint, fontWeight: '400', fontSize: 13 },
  blurb: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 2, marginBottom: spacing.sm },
  card: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  row: { padding: spacing.md },
  rowBorder: { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
  rowTop: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  ticker: { color: colors.text, fontSize: 14, fontWeight: '700' },
  name: { color: colors.textMuted, fontSize: 12, flex: 1, minWidth: 0 },
  mos: { fontSize: 13, fontVariant: ['tabular-nums'] },
  evidence: { color: colors.text, fontSize: 13, lineHeight: 18, marginTop: 4 },
  meta: { color: colors.textFaint, fontSize: 11, marginTop: 4 },
  more: { color: colors.textFaint, fontSize: 12, marginTop: spacing.sm },
});
