import { Pressable, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { tapFeedback } from './haptics';
import { Icon, type IconName } from './Icon';

export function IconButton({
  icon,
  onPress,
  label,
  size = 44,
  iconSize = 22,
  tone = 'default',
  style,
  testID,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  size?: number;
  iconSize?: number;
  tone?: 'default' | 'filled' | 'plain';
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { colors } = useTheme();
  const bg = tone === 'filled' ? colors.surfaceAlt : 'transparent';
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pressed ? colors.surfacePressed : bg,
        },
        style,
      ]}
    >
      <Icon name={icon} size={iconSize} color={colors.text} />
    </Pressable>
  );
}
