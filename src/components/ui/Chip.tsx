import { Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { tapFeedback } from './haptics';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export function Chip({
  label,
  selected,
  onPress,
  icon,
  testID,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  testID?: string;
}) {
  const { colors, radii } = useTheme();
  return (
    <Pressable
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
          backgroundColor: selected ? colors.text : pressed ? colors.surfacePressed : colors.surface,
          borderColor: selected ? colors.text : colors.border,
        },
      ]}
    >
      {icon ? <Icon name={icon} size={15} color={selected ? colors.background : colors.textSecondary} /> : null}
      <Text variant="caption" color={selected ? colors.background : colors.text} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 36, borderWidth: 1 },
});
