import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, Text, successFeedback } from '@/components/ui';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';

export function maskSecret(value: string): string {
  const clean = value.replace(/\s+/g, '');
  if (clean.length <= 4) return '•'.repeat(clean.length);
  return `${'•'.repeat(Math.min(8, clean.length - 4))} ${clean.slice(-4)}`;
}

/** Masked secret with tap-to-reveal and copy. `onReveal` can gate on biometrics. */
export function SecretRow({
  label,
  value,
  onReveal,
  testID,
}: {
  label: string;
  value: string;
  onReveal?: () => Promise<boolean>;
  testID?: string;
}) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const toggle = async () => {
    if (!revealed && onReveal && !(await onReveal())) return;
    setRevealed((r) => !r);
  };

  const copy = async () => {
    if (onReveal && !revealed && !(await onReveal())) return;
    await Clipboard.setStringAsync(value);
    successFeedback();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <View style={styles.row} testID={testID}>
      <Pressable style={styles.texts} onPress={toggle} accessibilityRole="button" accessibilityLabel={`${label}: ${revealed ? value : t('detail.tapToReveal')}`}>
        <Text variant="caption" tone="secondary">
          {label}
        </Text>
        <Text variant="bodyStrong" style={styles.mono} selectable={revealed}>
          {revealed ? value : maskSecret(value)}
        </Text>
      </Pressable>
      <Pressable onPress={toggle} hitSlop={8} accessibilityRole="button" accessibilityLabel={revealed ? t('common.hide') : t('common.show')} style={styles.btn}>
        <Icon name={revealed ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSecondary} />
      </Pressable>
      <Pressable onPress={copy} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('common.copy')} style={styles.btn}>
        <Icon name={copied ? 'checkmark' : 'copy-outline'} size={20} color={copied ? colors.success : colors.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  texts: { flex: 1, gap: 2 },
  mono: { fontFamily: 'monospace', letterSpacing: 1 },
  btn: { padding: 6 },
});
