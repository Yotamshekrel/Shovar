import { Text as RNText, type TextProps, type TextStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import type { Palette, TypographyVariant } from '@/theme/tokens';

export type TextTone = 'default' | 'secondary' | 'tertiary' | 'primary' | 'danger' | 'warning' | 'success' | 'inverse';

export interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  tone?: TextTone;
  color?: string;
  align?: 'start' | 'center' | 'end';
  weight?: TextStyle['fontWeight'];
}

const toneKey: Record<TextTone, keyof Palette> = {
  default: 'text',
  secondary: 'textSecondary',
  tertiary: 'textTertiary',
  primary: 'primary',
  danger: 'danger',
  warning: 'warning',
  success: 'success',
  inverse: 'textOnPrimary',
};

/**
 * Themed text. `align="start"` maps to textAlign "left", which React Native
 * flips automatically in RTL layouts.
 */
export function Text({ variant = 'body', tone = 'default', color, align = 'start', weight, style, ...rest }: AppTextProps) {
  const { colors, typography } = useTheme();
  const textAlign: TextStyle['textAlign'] = align === 'center' ? 'center' : align === 'end' ? 'right' : 'left';
  return (
    <RNText
      maxFontSizeMultiplier={variant === 'display' || variant === 'title' ? 1.6 : 2}
      {...rest}
      style={[typography[variant], { color: color ?? colors[toneKey[tone]], textAlign }, weight ? { fontWeight: weight } : null, style]}
    />
  );
}
