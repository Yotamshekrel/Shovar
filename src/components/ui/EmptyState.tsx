import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export function EmptyState({
  icon,
  title,
  body,
  actionTitle,
  onAction,
}: {
  icon: IconName;
  title: string;
  body?: string;
  actionTitle?: string;
  onAction?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={[styles.iconCircle, { backgroundColor: colors.primarySoft }]}>
        <Icon name={icon} size={34} color={colors.primary} />
      </View>
      <Text variant="headline" align="center">
        {title}
      </Text>
      {body ? (
        <Text variant="callout" tone="secondary" align="center" style={styles.body}>
          {body}
        </Text>
      ) : null}
      {actionTitle && onAction ? <Button title={actionTitle} onPress={onAction} icon="add" style={styles.action} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingHorizontal: 32, paddingVertical: 40, gap: 10 },
  iconCircle: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  body: { maxWidth: 320 },
  action: { marginTop: 12 },
});
