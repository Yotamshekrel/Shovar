import { StyleSheet } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { tapFeedback } from './haptics';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export function Chip({
  label,
  selected,
  onPress,
  icon,
  accent,
  testID,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  /** Selected state in the brand green instead of black (settings). */
  accent?: boolean;
  testID?: string;
}) {
  const { colors, radii } = useTheme();
  return (
    <PressableScale
      pressedScale={0.95}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={label}
      onPress={() => {
        tapFeedback();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.chip,
        {
          borderRadius: radii.pill,
          backgroundColor: selected ? (accent ? colors.primary : colors.text) : pressed ? colors.surfacePressed : colors.surface,
          borderColor: selected ? (accent ? colors.primary : colors.text) : colors.border,
        },
      ]}
    >
      {icon ? (
        <Icon name={icon} size={15} color={selected ? (accent ? colors.textOnPrimary : colors.background) : colors.textSecondary} />
      ) : null}
      <Text
        variant="caption"
        color={selected ? (accent ? colors.textOnPrimary : colors.background) : colors.text}
        weight={selected && accent ? '600' : undefined}
        numberOfLines={1}
      >
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 36, borderWidth: 1 },
});
