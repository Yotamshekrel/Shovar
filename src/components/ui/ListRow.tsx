import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { tapFeedback } from './haptics';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  icon?: IconName;
  iconColor?: string;
  value?: string;
  onPress?: () => void;
  chevron?: boolean;
  toggle?: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean };
  right?: ReactNode;
  destructive?: boolean;
  testID?: string;
}

export function ListRow({ title, subtitle, icon, iconColor, value, onPress, chevron, toggle, right, destructive, testID }: ListRowProps) {
  const { colors } = useTheme();
  const content = (
    <>
      {icon ? (
        <View style={[styles.iconWrap, { backgroundColor: colors.surfaceAlt }]}>
          <Icon name={icon} size={18} color={iconColor ?? (destructive ? colors.danger : colors.text)} />
        </View>
      ) : null}
      <View style={styles.texts}>
        <Text variant="body" tone={destructive ? 'danger' : 'default'}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="footnote" tone="secondary">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text variant="callout" tone="secondary" numberOfLines={1} style={styles.value}>
          {value}
        </Text>
      ) : null}
      {right}
      {toggle ? (
        <Switch
          value={toggle.value}
          onValueChange={toggle.onChange}
          disabled={toggle.disabled}
          trackColor={{ true: colors.primary, false: colors.borderStrong }}
          accessibilityLabel={title}
        />
      ) : null}
      {chevron || (onPress && !toggle && !right) ? <Icon name="chevron-forward" size={18} color={colors.textTertiary} /> : null}
    </>
  );

  if (!onPress) {
    return (
      <View testID={testID} style={styles.row}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={value ? `${title}, ${value}` : title}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      style={({ pressed }) => [styles.row, pressed ? { backgroundColor: colors.surfacePressed } : null]}
    >
      {content}
    </Pressable>
  );
}

export function Section({ title, children, footer }: { title?: string; children: ReactNode; footer?: string }) {
  const { colors, radii } = useTheme();
  return (
    <View style={styles.section}>
      {title ? (
        <Text variant="caption" tone="secondary" style={styles.sectionTitle}>
          {title.toUpperCase()}
        </Text>
      ) : null}
      <View style={[styles.group, { backgroundColor: colors.surface, borderRadius: radii.lg, borderColor: colors.border }]}>{children}</View>
      {footer ? (
        <Text variant="footnote" tone="tertiary" style={styles.footer}>
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

export function Divider({ inset = 0 }: { inset?: number }) {
  const { colors } = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginStart: inset }} />;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, minHeight: 52 },
  iconWrap: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, gap: 2 },
  value: { maxWidth: '45%' },
  section: { gap: 8 },
  sectionTitle: { paddingHorizontal: 16, letterSpacing: 0.4 },
  group: { overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  footer: { paddingHorizontal: 16 },
});
