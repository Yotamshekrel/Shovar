import { Text as RNText, type TextProps, type TextStyle } from 'react-native';

import { textEnd, textStart } from '@/theme/align';
import { useTheme } from '@/theme/ThemeProvider';
import type { Palette, TypographyVariant } from '@/theme/tokens';

export type TextTone = 'default' | 'secondary' | 'tertiary' | 'primary' | 'danger' | 'warning' | 'success' | 'inverse';

export interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  tone?: TextTone;
  color?: string;
  align?: 'start' | 'center' | 'end';
  weight?: TextStyle['fontWeight'];
  /** Fixed-width digits so amounts don't jitter when they change. */
  numeric?: boolean;
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
 * Themed text. `align` is logical (start/end), so it follows the layout
 * direction in Hebrew (RTL) and English.
 */
export function Text({ variant = 'body', tone = 'default', color, align = 'start', weight, numeric, style, ...rest }: AppTextProps) {
  const { colors, typography } = useTheme();
  const textAlign: TextStyle['textAlign'] = align === 'center' ? 'center' : align === 'end' ? textEnd : textStart;
  return (
    <RNText
      maxFontSizeMultiplier={variant === 'display' || variant === 'title' ? 1.6 : 2}
      {...rest}
      style={[
        typography[variant],
        { color: color ?? colors[toneKey[tone]], textAlign },
        weight ? { fontWeight: weight } : null,
        numeric ? { fontVariant: ['tabular-nums'] } : null,
        style,
      ]}
    />
  );
}
