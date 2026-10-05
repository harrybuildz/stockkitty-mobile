import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '@/theme';

export function Screen({ children, style, ...rest }: ViewProps) {
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={[styles.screenInner, style]} {...rest}>
        {children}
      </View>
    </SafeAreaView>
  );
}

export function Title({ children }: { children: React.ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Muted({ children }: { children: React.ReactNode }) {
  return <Text style={styles.muted}>{children}</Text>;
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  return <Text style={styles.error}>{children}</Text>;
}

export function Button({
  label,
  onPress,
  loading,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'danger' && styles.buttonDanger,
        (pressed || loading) && { opacity: 0.7 },
      ]}>
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <Text style={[styles.buttonLabel, variant === 'danger' && { color: colors.negative }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function Centered({ children }: { children: React.ReactNode }) {
  return <View style={styles.centered}>{children}</View>;
}

export function ComingSoon({ title, detail }: { title: string; detail: string }) {
  return (
    <Screen>
      <Title>{title}</Title>
      <Centered>
        <Muted>{detail}</Muted>
      </Centered>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  screenInner: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  title: { color: colors.text, fontSize: 24, fontWeight: '700', marginBottom: spacing.md },
  muted: { color: colors.textMuted, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  error: {
    color: colors.negative,
    fontSize: 13,
    backgroundColor: 'rgba(248,113,113,0.08)',
    borderColor: 'rgba(248,113,113,0.35)',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  buttonSecondary: { backgroundColor: colors.panelRaised },
  buttonDanger: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border },
  buttonLabel: { color: colors.text, fontSize: 15, fontWeight: '600' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
});
