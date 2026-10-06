import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  BUILTIN_PRESETS,
  COLUMN_FILTERS,
  FLAG_CATEGORY_LABELS,
  type FlagCategory,
} from '@/lib/screener-filters';
import { useScreenerFilters } from '@/store/screener-filters';
import { colors, radius, spacing } from '@/theme';

const CATEGORIES = Object.keys(FLAG_CATEGORY_LABELS) as FlagCategory[];

export function FilterSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const s = useScreenerFilters();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close filters" />
      <SafeAreaView edges={['bottom']} style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.title}>Filters</Text>
          <Pressable onPress={s.reset} hitSlop={8}>
            <Text style={styles.link}>Reset</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.sectionLabel}>Presets</Text>
          <View style={styles.presets}>
            {BUILTIN_PRESETS.map((preset) => (
              <Pressable
                key={preset.id}
                style={({ pressed }) => [styles.preset, pressed && { opacity: 0.7 }]}
                onPress={() => s.applyPreset(preset)}>
                <Text style={styles.presetText}>{preset.name}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Screens</Text>
          {COLUMN_FILTERS.map((filter) => {
            const value = s.active[filter.key];
            const on = value != null;
            return (
              <View key={filter.key} style={styles.row}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.rowLabel}>{filter.label}</Text>
                  {on && filter.threshold && (
                    <Stepper
                      value={typeof value === 'number' ? value : filter.threshold.default}
                      config={filter.threshold}
                      onChange={(v) => s.setThreshold(filter.key, v)}
                    />
                  )}
                </View>
                <Switch
                  value={on}
                  onValueChange={() => s.toggleFilter(filter.key)}
                  trackColor={{ true: colors.accent, false: colors.border }}
                  thumbColor={colors.text}
                />
              </View>
            );
          })}

          <Text style={styles.sectionLabel}>Hidden rows</Text>
          {CATEGORIES.map((cat) => (
            <View key={cat} style={styles.row}>
              <Text style={[styles.rowLabel, { flex: 1 }]}>{FLAG_CATEGORY_LABELS[cat]}</Text>
              <Switch
                value={s.hiddenCats.includes(cat)}
                onValueChange={() => s.toggleHiddenCat(cat)}
                trackColor={{ true: colors.accent, false: colors.border }}
                thumbColor={colors.text}
              />
            </View>
          ))}
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { flex: 1 }]}>Watchlist only</Text>
            <Switch
              value={s.watchlistOnly}
              onValueChange={s.setWatchlistOnly}
              trackColor={{ true: colors.accent, false: colors.border }}
              thumbColor={colors.text}
            />
          </View>
        </ScrollView>
        <Pressable style={({ pressed }) => [styles.done, pressed && { opacity: 0.8 }]} onPress={onClose}>
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      </SafeAreaView>
    </Modal>
  );
}

function Stepper({
  value,
  config,
  onChange,
}: {
  value: number;
  config: { min: number; max: number; step: number; format: (v: number) => string };
  onChange: (v: number) => void;
}) {
  // Float steps accumulate error (0.1 + 0.1 + ...); snap to the step grid.
  const snap = (v: number) => Math.round(v / config.step) * config.step;
  const dec = () => onChange(Math.max(config.min, snap(value - config.step)));
  const inc = () => onChange(Math.min(config.max, snap(value + config.step)));
  return (
    <View style={styles.stepper}>
      <Pressable onPress={dec} hitSlop={8} style={styles.stepBtn} accessibilityLabel="Decrease threshold">
        <Text style={styles.stepBtnText}>−</Text>
      </Pressable>
      <Text style={styles.stepValue}>{config.format(value)}</Text>
      <Pressable onPress={inc} hitSlop={8} style={styles.stepBtn} accessibilityLabel="Increase threshold">
        <Text style={styles.stepBtnText}>＋</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: colors.panel,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: '700' },
  link: { color: colors.accentSoft, fontSize: 14 },
  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  sectionLabel: {
    color: colors.textFaint,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  preset: {
    backgroundColor: colors.panelRaised,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  presetText: { color: colors.text, fontSize: 13 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: { color: colors.text, fontSize: 14 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.panelRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: { color: colors.text, fontSize: 16 },
  stepValue: { color: colors.textMuted, fontSize: 13, fontVariant: ['tabular-nums'], minWidth: 64 },
  done: {
    backgroundColor: colors.accent,
    margin: spacing.lg,
    marginTop: spacing.sm,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  doneText: { color: colors.text, fontSize: 15, fontWeight: '600' },
});
