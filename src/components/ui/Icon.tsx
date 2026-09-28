import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { I18nManager } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

export type IconName = ComponentProps<typeof Ionicons>['name'];

const DIRECTIONAL = new Set<string>(['chevron-forward', 'chevron-back', 'arrow-forward', 'arrow-back', 'open-outline']);

export function Icon({ name, size = 22, color, flipInRtl }: { name: IconName; size?: number; color?: string; flipInRtl?: boolean }) {
  const { colors } = useTheme();
  const flip = (flipInRtl ?? DIRECTIONAL.has(name)) && I18nManager.isRTL;
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
