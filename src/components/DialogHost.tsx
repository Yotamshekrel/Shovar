import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Button, Icon, Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useDialogStore } from '@/utils/dialogs';

/** Renders the confirm/notice dialogs requested through `utils/dialogs`, one at a time. */
export function DialogHost() {
  const { colors, radii } = useTheme();
  const req = useDialogStore((s) => s.queue[0]);
  const settle = useDialogStore((s) => s.settle);
  if (!req) return null;

  const tone = req.destructive ? colors.danger : colors.primary;
  const soft = req.destructive ? colors.dangerSoft : colors.primarySoft;
  const icon = req.icon ?? (req.destructive ? 'trash-outline' : undefined);

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={() => settle(req.id, false)}>
      <View style={styles.center}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]}
          onPress={() => settle(req.id, false)}
          accessibilityLabel={req.cancelText}
        />
        <View
          accessibilityViewIsModal
          style={[styles.card, { backgroundColor: colors.surface, borderRadius: radii.card + 4, borderColor: colors.border }]}
          testID="dialog"
        >
          {icon ? (
            <View style={[styles.icon, { backgroundColor: soft }]}>
              <Icon name={icon} size={26} color={tone} />
            </View>
          ) : null}
          <Text variant="headline" align="center" accessibilityRole="header">
            {req.title}
          </Text>
          {req.message ? (
            <Text variant="callout" tone="secondary" align="center">
              {req.message}
            </Text>
          ) : null}
          <View style={styles.actions}>
            <Button
              testID="dialog-confirm"
              title={req.confirmText}
              variant={req.destructive ? 'danger' : 'primary'}
              onPress={() => settle(req.id, true)}
              fullWidth
            />
            {req.cancelText ? (
              <Button testID="dialog-cancel" title={req.cancelText} variant="secondary" onPress={() => settle(req.id, false)} fullWidth />
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 380, padding: 24, gap: 12, alignItems: 'center', borderWidth: StyleSheet.hairlineWidth },
  icon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  actions: { alignSelf: 'stretch', gap: 8, marginTop: 8 },
});
