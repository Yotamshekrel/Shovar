import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { I18nManager, Platform } from 'react-native';

import { useI18n } from '@/i18n';

import { useTheme } from '@/theme/ThemeProvider';

export type IconName = ComponentProps<typeof Ionicons>['name'];

const DIRECTIONAL = new Set<string>(['chevron-forward', 'chevron-back', 'arrow-forward', 'arrow-back', 'open-outline']);

export function Icon({ name, size = 22, color, flipInRtl }: { name: IconName; size?: number; color?: string; flipInRtl?: boolean }) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();
  // Native layouts flip via I18nManager; the web preview follows the chosen language.
  const rtl = Platform.OS === 'web' ? isRTL : I18nManager.isRTL;
  const flip = (flipInRtl ?? DIRECTIONAL.has(name)) && rtl;
  return (
    <Ionicons
      name={name}
      size={size}
      color={color ?? colors.text}
      style={flip ? { transform: [{ scaleX: -1 }] } : undefined}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
