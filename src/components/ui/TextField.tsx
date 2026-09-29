import { forwardRef, useState, type ReactNode } from 'react';
import { Platform, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { textStart } from '@/theme/align';
import { useTheme } from '@/theme/ThemeProvider';

import { Icon } from './Icon';
import { Text } from './Text';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  hint?: string;
  error?: string | null;
  /** Low-confidence value from automatic extraction — draws attention for review. */
  highlighted?: boolean;
  prefix?: ReactNode;
  suffix?: ReactNode;
  mono?: boolean;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, hint, error, highlighted, prefix, suffix, mono, multiline, onFocus, onBlur, ...rest },
  ref,
) {
  const { colors, radii, typography } = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.danger : focused ? colors.primary : highlighted ? colors.highlightBorder : colors.border;

  return (
    <View style={styles.wrap}>
      {label ? (
        <View style={styles.labelRow}>
          <Text variant="caption" tone="secondary">
            {label}
          </Text>
          {highlighted && !error ? <Icon name="alert-circle" size={14} color={colors.highlightBorder} /> : null}
        </View>
      ) : null}
      <View
        style={[
          styles.field,
          {
            borderColor,
            borderWidth: focused || highlighted || error ? 1.5 : 1,
            borderRadius: radii.md,
            backgroundColor: highlighted && !focused ? colors.highlight : colors.surface,
            minHeight: multiline ? 88 : 50,
            alignItems: multiline ? 'flex-start' : 'center',
          },
        ]}
      >
        {prefix ? <View style={styles.affix}>{prefix}</View> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.textTertiary}
          selectionColor={colors.primary}
          multiline={multiline}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          // Shovar never stores bank cards: keep system autofill (credit-card, password
          // and contact suggestions) out of every field unless a screen opts back in.
          autoComplete="off"
          textContentType="none"
          importantForAutofill="no"
          {...rest}
          style={[
            styles.input,
            typography.body,
            {
              color: colors.text,
              textAlign: textStart,
              textAlignVertical: multiline ? 'top' : 'center',
              paddingTop: multiline ? 12 : undefined,
              fontFamily: mono ? 'monospace' : undefined,
              letterSpacing: mono ? 1 : undefined,
            },
            Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null,
          ]}
        />
        {suffix ? <View style={styles.affix}>{suffix}</View> : null}
      </View>
      {error ? (
        <Text variant="footnote" tone="danger">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="footnote" tone="tertiary">
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  field: { flexDirection: 'row', paddingHorizontal: 14 },
  input: { flex: 1, paddingVertical: 12, minHeight: 48 },
  affix: { paddingHorizontal: 4 },
});
