import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';
import type { CompanyData } from '@/hooks/use-company-data';

/**
 * Shared chrome for the company-page data cards: section title + panel,
 * with the fetch lifecycle rendered uniformly. `missing` hides the card
 * entirely by default (batch hasn't covered this ticker) — pass
 * missingText to say something instead.
 */
export function DataCard<T>({
  title,
  state,
  missingText,
  children,
}: {
  title: string;
  state: CompanyData<T>;
  missingText?: string;
  children: (data: T) => React.ReactNode;
}) {
  if (state.kind === 'missing' && !missingText) return null;
  return (
    <>
      <Text style={styles.section}>{title}</Text>
      <View style={styles.card}>
        {state.kind === 'loading' && (
          <ActivityIndicator style={styles.pad} color={colors.textMuted} />
        )}
        {state.kind === 'error' && <Text style={[styles.pad, styles.dim]}>{state.message}</Text>}
        {state.kind === 'missing' && <Text style={[styles.pad, styles.dim]}>{missingText}</Text>}
        {state.kind === 'ready' && children(state.data)}
      </View>
    </>
  );
}

/** A label/value line inside a card. */
export function MetricRow({
  label,
  value,
  color,
  last,
}: {
  label: string;
  value: string;
  color?: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { color: colors.text, fontSize: 16, fontWeight: '600', marginTop: spacing.md },
  card: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  pad: { padding: spacing.md },
  dim: { color: colors.textFaint, fontSize: 13 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: { color: colors.textMuted, fontSize: 13, flexShrink: 1 },
  rowValue: { color: colors.text, fontSize: 13, fontVariant: ['tabular-nums'] },
});
