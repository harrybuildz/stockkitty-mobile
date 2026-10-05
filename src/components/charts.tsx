import { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Line, Polyline, Rect } from 'react-native-svg';

import { colors } from '@/theme';

// Hand-rolled minimal charts on react-native-svg — a sparkline and a bar
// row are not worth a charting library's bundle and native footprint.

const H = 48;

/**
 * Sparkline with a zero axis. Points are plotted in input order and
 * scaled to the series' own min/max (symmetric around zero so positive
 * and negative read honestly against the axis line).
 */
export function Sparkline({ values, color }: { values: number[]; color?: string }) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  if (values.length < 2) return null;
  const bound = Math.max(...values.map(Math.abs), 0.01);
  const x = (i: number) => (i / (values.length - 1)) * width;
  const y = (v: number) => H / 2 - (v / bound) * (H / 2 - 2);
  const points = values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const last = values[values.length - 1];

  return (
    <View onLayout={onLayout} style={{ height: H }}>
      {width > 0 && (
        <Svg width={width} height={H}>
          <Line x1={0} y1={H / 2} x2={width} y2={H / 2} stroke={colors.border} strokeWidth={1} />
          <Polyline
            points={points}
            fill="none"
            stroke={color ?? (last >= 0 ? colors.positive : colors.negative)}
            strokeWidth={1.5}
          />
        </Svg>
      )}
    </View>
  );
}

const BAR_H = 96;
const LABEL_H = 16;

/**
 * Labeled vertical bars, scaled to the series max (negative values clamp
 * to a minimal sliver — annual revenue is the intended input, where
 * negatives don't occur but malformed data shouldn't crash the chart).
 */
export function BarChart({
  values,
  labels,
  format,
}: {
  values: number[];
  labels: string[];
  format: (v: number) => string;
}) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  if (!values.length) return null;
  const max = Math.max(...values, 0);
  if (max <= 0) return null;
  const slot = width / values.length;
  const barW = Math.min(slot * 0.6, 40);

  return (
    <View onLayout={onLayout}>
      <View style={{ height: BAR_H }}>
        {width > 0 && (
          <Svg width={width} height={BAR_H}>
            {values.map((v, i) => {
              const h = Math.max((Math.max(v, 0) / max) * (BAR_H - 4), 2);
              return (
                <Rect
                  key={i}
                  x={i * slot + (slot - barW) / 2}
                  y={BAR_H - h}
                  width={barW}
                  height={h}
                  rx={2}
                  fill={colors.accent}
                />
              );
            })}
          </Svg>
        )}
      </View>
      <View style={[styles.labels, { height: LABEL_H }]}>
        {values.map((v, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.label} numberOfLines={1}>
              {labels[i] ?? ''}
            </Text>
          </View>
        ))}
      </View>
      <View style={styles.labels}>
        {values.map((v, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.value} numberOfLines={1}>
              {format(v)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labels: { flexDirection: 'row', marginTop: 2 },
  label: { color: colors.textFaint, fontSize: 10 },
  value: { color: colors.textMuted, fontSize: 10, fontVariant: ['tabular-nums'] },
});
