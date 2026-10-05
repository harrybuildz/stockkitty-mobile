import type { Assumptions } from '@stockkitty/valuation';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

type Format = 'pct' | 'num2';

// Same fields, labels and order as the web AssumptionsPanel.
const FIELDS: { key: keyof Assumptions; label: string; fmt: Format }[] = [
  { key: 'salesGrowth', label: 'Sales Growth', fmt: 'pct' },
  { key: 'longTermGrowth', label: 'Long-Term Growth', fmt: 'pct' },
  { key: 'beta', label: 'Beta', fmt: 'num2' },
  { key: 'rf', label: 'Risk-Free Rate (rf)', fmt: 'pct' },
  { key: 'rm', label: 'Market Return (rm)', fmt: 'pct' },
  { key: 'rd', label: 'Cost of Debt (rd)', fmt: 'pct' },
  { key: 'taxRate', label: 'Tax Rate', fmt: 'pct' },
  { key: 'roic', label: 'ROIC', fmt: 'pct' },
  { key: 'roe', label: 'ROE', fmt: 'pct' },
  { key: 'payoutRatio', label: 'Payout Ratio', fmt: 'pct' },
  { key: 'capExpEfficiency', label: 'CapEx Efficiency', fmt: 'num2' },
];

// Steppers move percentages by half a point and plain numbers by 0.05.
const STEP: Record<Format, number> = { pct: 0.005, num2: 0.05 };

const display = (v: number, fmt: Format) => (fmt === 'pct' ? (v * 100).toFixed(2) : v.toFixed(2));
// Rounding keeps repeated steps from accumulating float noise (0.30000000000000004).
const tidy = (v: number) => Math.round(v * 1e6) / 1e6;

export function AssumptionsEditor({
  value,
  defaults,
  onChange,
}: {
  value: Assumptions;
  defaults: Assumptions;
  onChange: (next: Assumptions) => void;
}) {
  const edited = FIELDS.some((f) => value[f.key] !== defaults[f.key]);
  return (
    <View style={styles.card}>
      {FIELDS.map((f, i) => (
        // Keyed by value so the text box resets whenever the committed value
        // changes (a step, a reset, or a parsed edit).
        <FieldRow
          key={`${f.key}:${value[f.key]}`}
          label={f.label}
          fmt={f.fmt}
          value={value[f.key]}
          changed={value[f.key] !== defaults[f.key]}
          last={i === FIELDS.length - 1}
          onCommit={(v) => onChange({ ...value, [f.key]: tidy(v) })}
        />
      ))}
      {edited && (
        <Pressable style={styles.reset} onPress={() => onChange(defaults)}>
          <Text style={styles.resetText}>Reset to defaults</Text>
        </Pressable>
      )}
    </View>
  );
}

function FieldRow({
  label,
  fmt,
  value,
  changed,
  last,
  onCommit,
}: {
  label: string;
  fmt: Format;
  value: number;
  changed: boolean;
  last: boolean;
  onCommit: (v: number) => void;
}) {
  const [draft, setDraft] = useState(display(value, fmt));

  function commit() {
    const n = Number.parseFloat(draft.replace(',', '.'));
    if (!Number.isFinite(n)) {
      setDraft(display(value, fmt)); // reject: restore the committed value
      return;
    }
    const next = fmt === 'pct' ? n / 100 : n;
    if (next !== value) onCommit(next);
  }

  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={[styles.label, changed && { color: colors.accentSoft }]} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.controls}>
        <Stepper symbol="−" accessibilityLabel={`Decrease ${label}`} onPress={() => onCommit(value - STEP[fmt])} />
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          onEndEditing={commit}
          onSubmitEditing={commit}
          keyboardType="numbers-and-punctuation"
          returnKeyType="done"
          selectTextOnFocus
          accessibilityLabel={label}
        />
        <Text style={styles.unit}>{fmt === 'pct' ? '%' : ''}</Text>
        <Stepper symbol="+" accessibilityLabel={`Increase ${label}`} onPress={() => onCommit(value + STEP[fmt])} />
      </View>
    </View>
  );
}

function Stepper({ symbol, onPress, accessibilityLabel }: { symbol: string; onPress: () => void; accessibilityLabel: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [styles.stepper, pressed && { backgroundColor: colors.borderStrong }]}>
      <Text style={styles.stepperText}>{symbol}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  rowBorder: { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
  label: { color: colors.textMuted, fontSize: 13, flex: 1 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  input: {
    color: colors.text,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
    width: 72,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
  },
  unit: { color: colors.textFaint, fontSize: 12, width: 12 },
  stepper: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: colors.panelRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperText: { color: colors.text, fontSize: 18, lineHeight: 20 },
  reset: { padding: spacing.md, alignItems: 'center', borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
  resetText: { color: colors.accentSoft, fontSize: 14 },
});
