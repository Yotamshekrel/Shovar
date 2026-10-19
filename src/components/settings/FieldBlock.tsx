import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Icon, type IconName, Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';

/** A setting with several choices: icon + label on top, the choices (chips, segmented control) below. */
export function FieldBlock({ icon, label, hint, children }: { icon: IconName; label: string; hint?: string; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.block}>
      <View style={styles.head}>
        <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
          <Icon name={icon} size={18} color={colors.primary} />
        </View>
        <View style={styles.texts}>
          <Text variant="body">{label}</Text>
          {hint ? (
            <Text variant="footnote" tone="secondary">
              {hint}
            </Text>
          ) : null}
        </View>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { padding: 16, gap: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, gap: 2 },
});
