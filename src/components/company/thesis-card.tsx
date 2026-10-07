import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { api, ApiError } from '@/api/client';
import { Button } from '@/components/ui';
import { upgradeMessage, UpgradePrompt } from '@/components/upgrade-prompt';
import { track } from '@/lib/analytics';
import { relativeAge } from '@/lib/time';
import { useCompanyData } from '@/hooks/use-company-data';
import { colors, spacing } from '@/theme';
import type { Thesis } from '@/api/types';

import { DataCard } from './card';

const SECTIONS: {
  key: 'bull_case' | 'bear_case' | 'quality_assessment' | 'peer_comparison';
  title: string;
}[] = [
  { key: 'bull_case', title: 'Bull case' },
  { key: 'bear_case', title: 'Bear case' },
  { key: 'quality_assessment', title: 'Quality' },
  { key: 'peer_comparison', title: 'Peers' },
];

// AI investment thesis. The endpoint deliberately 404s on cache miss so a
// page view never spends Anthropic credits — generation is an explicit
// user action (5–15s, counts against the shared 10/hour refresh budget).
export function ThesisCard({ ticker }: { ticker: string }) {
  const state = useCompanyData<Thesis>(`/api/company/${encodeURIComponent(ticker)}/thesis`);
  const [generated, setGenerated] = useState<Thesis | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gated, setGated] = useState<string | null>(null);

  const generate = () => {
    track('thesis_generate', { ticker });
    setBusy(true);
    setError(null);
    api<Thesis>(`/api/company/${encodeURIComponent(ticker)}/thesis?generate=true`, {
      timeoutMs: 60_000,
    })
      .then(setGenerated)
      .catch((e) => {
        setGated(upgradeMessage(e));
        setError(
          upgradeMessage(e) != null
            ? null
            : e instanceof ApiError && e.status === 429
              ? 'Refresh budget used up for now — try again in an hour.'
              : e instanceof ApiError && e.detail
                ? e.detail
                : 'Generation failed. Try again in a moment.',
        );
      })
      .finally(() => setBusy(false));
  };

  const thesis = generated ?? (state.kind === 'ready' ? state.data : null);

  if (thesis) {
    return (
      <DataCard title="AI thesis" state={{ kind: 'ready', data: thesis }}>
        {(t) => (
          <View style={styles.body}>
            {SECTIONS.map(({ key, title }) => (
              <View key={key}>
                <Text style={styles.heading}>{title}</Text>
                <Text style={styles.text}>{t[key]}</Text>
              </View>
            ))}
            <Text style={styles.meta}>
              Generated {relativeAge(t.stored_at)}
              {t.is_stale ? ' · may be out of date' : ''} · AI-written, not investment advice
            </Text>
          </View>
        )}
      </DataCard>
    );
  }

  // Plan-gated: the whole feature is paid — no CTA that would just 402.
  if (state.kind === 'gated') {
    return <DataCard title="AI thesis" state={state}>{() => null}</DataCard>;
  }
  // Cache miss (or still loading/error): the card becomes a generate CTA.
  if (state.kind === 'loading') {
    return <DataCard title="AI thesis" state={state}>{() => null}</DataCard>;
  }
  return (
    <>
      <Text style={styles.section}>AI thesis</Text>
      <View style={styles.cta}>
        <Text style={styles.text}>
          A four-part AI read on this company — bull case, bear case, quality, and how it stacks
          up against peers.
        </Text>
        {error != null && <Text style={styles.error}>{error}</Text>}
        {gated != null ? (
          <UpgradePrompt message={gated} bare />
        ) : (
          <Button label={busy ? 'Generating…' : 'Generate thesis'} loading={busy} onPress={generate} />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  section: { color: colors.text, fontSize: 16, fontWeight: '600', marginTop: spacing.md },
  body: { padding: spacing.md, gap: spacing.md },
  heading: { color: colors.text, fontSize: 13, fontWeight: '700', marginBottom: 4 },
  text: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  meta: { color: colors.textFaint, fontSize: 11, lineHeight: 16 },
  error: { color: colors.negative, fontSize: 12 },
  cta: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: spacing.md,
    gap: spacing.md,
  },
});
