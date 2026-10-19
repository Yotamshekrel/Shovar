import { forwardRef, useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Icon, Text } from '@/components/ui';
import { textStart } from '@/theme/align';
import { useTheme } from '@/theme/ThemeProvider';

/** The question of a wizard step on a big rounded card; the answer field (if any) sits inside it. */
export function QuestionCard({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, children ? null : styles.cardCompact, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.titles}>
        <Text variant="display" accessibilityRole="header" style={styles.title} adjustsFontSizeToFit numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text tone="secondary" style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export interface BigFieldProps extends Omit<TextInputProps, 'style'> {
  /** Text size: `lg` for names and codes, `xl` for amounts. */
  size?: 'lg' | 'xl';
  prefix?: ReactNode;
  suffix?: ReactNode;
  mono?: boolean;
  hint?: string;
  error?: string | null;
}

/** Large borderless input with an underline and a clear button — one answer per screen. */
export const BigField = forwardRef<TextInput, BigFieldProps>(function BigField(
  { size = 'lg', prefix, suffix, mono, hint, error, value, onChangeText, onFocus, onBlur, ...rest },
  ref,
) {
  const { colors, typography } = useTheme();
  const [focused, setFocused] = useState(false);
  const fontSize = size === 'xl' ? 56 : 30;
  const line = error ? colors.danger : focused ? colors.primary : colors.borderStrong;
  const font =
    mono && Platform.OS !== 'web'
      ? { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }
      : mono
        ? { fontFamily: 'monospace' }
        : null;

  return (
    <View style={styles.field}>
      <View style={styles.inputRow}>
        {prefix}
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          selectionColor={colors.primary}
          placeholderTextColor={colors.textTertiary}
          maxFontSizeMultiplier={1.2}
          style={[
            typography.title,
            styles.input,
            { fontSize, lineHeight: Math.round(fontSize * 1.2), fontWeight: '500', color: colors.text, textAlign: textStart },
            font,
            Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null,
          ]}
          {...rest}
        />
        {value ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear" hitSlop={10} onPress={() => onChangeText?.('')}>
            <Icon name="close-circle" size={26} color={colors.textTertiary} />
          </Pressable>
        ) : null}
        {suffix}
      </View>
      <View style={[styles.line, { backgroundColor: line, height: focused || error ? 2 : 1.5 }]} />
      {error ? (
        <Text variant="callout" tone="danger" style={styles.helper}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="footnote" tone="secondary" style={styles.helper}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  card: { borderRadius: 28, borderWidth: StyleSheet.hairlineWidth, padding: 24, gap: 28 },
  cardCompact: { paddingVertical: 18, gap: 0 },
  titles: { gap: 8 },
  title: { fontSize: 34, lineHeight: 40 },
  subtitle: { marginTop: 2 },
  field: { gap: 0 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: { flex: 1, minWidth: 0, paddingVertical: 8, minHeight: 56 },
  line: { borderRadius: 1 },
  helper: { marginTop: 10 },
});
