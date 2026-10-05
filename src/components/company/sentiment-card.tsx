import * as WebBrowser from 'expo-web-browser';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Sparkline } from '@/components/charts';
import { pct } from '@/lib/format';
import { relativeAge } from '@/lib/time';
import { useCompanyData } from '@/hooks/use-company-data';
import { colors, spacing } from '@/theme';
import type { NewsSentiment } from '@/api/types';

import { DataCard, MetricRow } from './card';

const HEADLINE_LIMIT = 5;

const SENTIMENT_COLOR: Record<string, string> = {
  positive: colors.positive,
  negative: colors.negative,
  neutral: colors.textFaint,
};

// News & sentiment aggregates + recent headlines. Headlines open in the
// in-app browser. The web panel's sparkline and per-subreddit Reddit
// breakdown are deferred with the rest of the charts work.
export function SentimentCard({ ticker }: { ticker: string }) {
  const state = useCompanyData<NewsSentiment>(
    `/api/company/${encodeURIComponent(ticker)}/news-sentiment`,
  );
  return (
    <DataCard title="News & sentiment" state={state}>
      {(s) => (
        <>
          <MetricRow
            label={`Sentiment, 7 days (${s.news_count_7d} articles)`}
            value={pct(s.net_sentiment_7d, 0)}
            color={netColor(s.net_sentiment_7d)}
          />
          <MetricRow
            label={`Sentiment, 30 days (${s.news_count_30d} articles)`}
            value={pct(s.net_sentiment_30d, 0)}
            color={netColor(s.net_sentiment_30d)}
          />
          <MetricRow
            label="Momentum (7d vs 30d)"
            value={pct(s.sentiment_momentum, 0)}
            color={netColor(s.sentiment_momentum)}
          />
          <MetricRow label="Coverage velocity" value={`${s.velocity_7d.toFixed(1)}×`} />
          {(s.sentiment_history?.length ?? 0) >= 2 && (
            <View style={styles.spark}>
              <Text style={styles.sparkLabel}>Sentiment, last {s.sentiment_history!.length} days</Text>
              <Sparkline values={s.sentiment_history!.map((d) => d.net_sentiment)} />
            </View>
          )}
          <MetricRow
            label="Reddit mentions (24h)"
            value={s.reddit_mentions == null ? '—' : String(s.reddit_mentions)}
            last={!s.recent_headlines.length && !s.reddit_by_subreddit}
          />
          {s.reddit_by_subreddit != null &&
            Object.entries(s.reddit_by_subreddit).map(([sub, r]) => (
              <MetricRow
                key={sub}
                label={`r/${sub}`}
                value={`${r.mentions} mentions · rank #${r.rank}${
                  r.rank_change == null ? '' : ` (${r.rank_change > 0 ? '+' : ''}${r.rank_change})`
                }`}
              />
            ))}
          {s.recent_headlines.slice(0, HEADLINE_LIMIT).map((h, i, shown) => (
            <Pressable
              key={h.url}
              style={({ pressed }) => [
                styles.headline,
                i === shown.length - 1 && { borderBottomWidth: 0 },
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => void WebBrowser.openBrowserAsync(h.url)}>
              <View style={[styles.dot, { backgroundColor: SENTIMENT_COLOR[h.sentiment] ?? colors.textFaint }]} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.headlineText} numberOfLines={2}>
                  {h.headline}
                </Text>
                <Text style={styles.headlineMeta}>
                  {h.publisher} · {relativeAge(h.published_utc)}
                </Text>
              </View>
            </Pressable>
          ))}
          {s.fetch_status != null && (
            <Text style={styles.stale}>
              {s.fetch_status === 'stale'
                ? 'Providers unreachable — showing cached data.'
                : 'One provider unreachable — data may be incomplete.'}
            </Text>
          )}
        </>
      )}
    </DataCard>
  );
}

function netColor(v: number | null): string | undefined {
  if (v == null) return undefined;
  if (v > 0.05) return colors.positive;
  if (v < -0.05) return colors.negative;
  return undefined;
}

const styles = StyleSheet.create({
  spark: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sparkLabel: { color: colors.textFaint, fontSize: 11, marginBottom: 4 },
  headline: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dot: { width: 7, height: 7, borderRadius: 4, marginTop: 5 },
  headlineText: { color: colors.text, fontSize: 13, lineHeight: 18 },
  headlineMeta: { color: colors.textFaint, fontSize: 11, marginTop: 2 },
  stale: { color: colors.textFaint, fontSize: 11, padding: spacing.md, paddingTop: spacing.sm },
});
