import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/api/client';
import type { Portfolio } from '@/api/types';
import { Centered, ErrorText, Muted, Screen, Title } from '@/components/ui';
import { track } from '@/lib/analytics';
import { usePortfolios } from '@/store/portfolios';
import { colors, radius, spacing } from '@/theme';

export default function Portfolios() {
  const { portfolios, loading, error, fetch } = usePortfolios();

  useEffect(() => {
    if (!portfolios.length) void fetch();
  }, [portfolios.length, fetch]);

  useFocusEffect(useCallback(() => track('page_view', { detail: '/portfolios' }), []));

  return (
    <Screen>
      <Title>Portfolios</Title>
      {error != null && (
        <ErrorText>{error instanceof ApiError ? (error.detail ?? error.message) : String(error)}</ErrorText>
      )}
      <FlatList
        data={portfolios}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => <Card portfolio={item} />}
        contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xl }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetch} tintColor={colors.textMuted} />
        }
        ListEmptyComponent={
          loading ? null : (
            <Centered>
              <Muted>No portfolios yet.</Muted>
            </Centered>
          )
        }
      />
    </Screen>
  );
}

function Card({ portfolio }: { portfolio: Portfolio }) {
  const count = portfolio.holding_count ?? portfolio.holdings.length;
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { backgroundColor: colors.panelRaised }]}
      onPress={() => router.push({ pathname: '/portfolio/[id]', params: { id: portfolio.id } })}>
      <View style={styles.cardHead}>
        <Text style={styles.name}>{portfolio.name}</Text>
        {!portfolio.is_account && (
          <Text style={styles.count}>
            {count} {count === 1 ? 'holding' : 'holdings'}
          </Text>
        )}
      </View>
      <Text style={styles.subtitle} numberOfLines={2}>
        {portfolio.subtitle}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.md },
  name: { color: colors.text, fontSize: 16, fontWeight: '700', flexShrink: 1 },
  count: { color: colors.textFaint, fontSize: 12 },
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs, lineHeight: 18 },
});
