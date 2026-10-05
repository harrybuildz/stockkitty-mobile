import { useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useWatchlist } from '@/store/watchlist';
import { colors, spacing } from '@/theme';

// Header toggle for the company page. Loads the watchlist once if no screen
// has yet, so the star shows the right state on a cold deep link.
export function WatchStar({ ticker }: { ticker: string }) {
  const watched = useWatchlist((s) => s.tickers.includes(ticker));
  const loaded = useWatchlist((s) => s.loaded);
  const fetch = useWatchlist((s) => s.fetch);
  const toggle = useWatchlist((s) => s.toggle);

  useEffect(() => {
    if (!loaded) void fetch();
  }, [loaded, fetch]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={watched ? `Remove ${ticker} from watchlist` : `Add ${ticker} to watchlist`}
      accessibilityState={{ selected: watched }}
      hitSlop={8}
      disabled={!loaded}
      onPress={() => void toggle(ticker)}
      style={({ pressed }) => [styles.button, (pressed || !loaded) && { opacity: 0.5 }]}>
      <Text style={[styles.star, watched && { color: colors.warning }]}>{watched ? '★' : '☆'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { paddingHorizontal: spacing.sm },
  star: { color: colors.textMuted, fontSize: 22 },
});
