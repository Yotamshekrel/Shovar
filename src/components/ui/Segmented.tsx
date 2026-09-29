import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { tapFeedback } from './haptics';
import { Text } from './Text';

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  highlighted,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  highlighted?: boolean;
}) {
  const { colors, radii } = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      style={[
        styles.wrap,
        {
          backgroundColor: highlighted ? colors.highlight : colors.surfaceAlt,
          borderRadius: radii.md,
          borderColor: highlighted ? colors.highlightBorder : 'transparent',
        },
      ]}
    >
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={o.label}
            onPress={() => {
              tapFeedback();
              onChange(o.value);
            }}
            style={[
              styles.option,
              { borderRadius: radii.sm + 2, backgroundColor: selected ? colors.surface : 'transparent' },
              selected ? styles.shadow : null,
            ]}
          >
            <Text variant="caption" tone={selected ? 'default' : 'secondary'} weight={selected ? '600' : '500'} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', padding: 3, gap: 3, borderWidth: 1.5 },
  option: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 38, paddingHorizontal: 8 },
  shadow: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
});
