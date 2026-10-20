import { Image } from 'expo-image';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Icon, IconButton, Text } from '@/components/ui';
import type { Attachment } from '@/domain/types';
import { useI18n } from '@/i18n';
import { attachmentUri } from '@/services/attachments';
import type { PendingAttachment } from '@/state/drafts';
import { useTheme } from '@/theme/ThemeProvider';

async function openDocument(uri: string) {
  if (Platform.OS === 'web') {
    window.open(uri, '_blank');
    return;
  }
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
  else await Linking.openURL(uri);
}

export function AttachmentStrip({
  attachments,
  onAdd,
  onRemove,
}: {
  attachments: Attachment[];
  onAdd?: () => void;
  onRemove?: (a: Attachment) => void;
}) {
  const { colors, radii } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [viewing, setViewing] = useState<Attachment | null>(null);

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
        {attachments.map((a) => {
          const uri = attachmentUri(a.fileName);
          const isImage = a.mimeType.startsWith('image/');
          return (
            <Pressable
              key={a.id}
              accessibilityRole="imagebutton"
              accessibilityLabel={isImage ? t('detail.attachments') : 'PDF'}
              onPress={() => (isImage ? setViewing(a) : openDocument(uri))}
              style={[styles.thumb, { borderRadius: radii.md, backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
            >
              {isImage ? (
                <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
              ) : (
                <View style={styles.doc}>
                  <Icon name="document-text-outline" size={30} color={colors.textSecondary} />
                  <Text variant="footnote" tone="secondary">
                    PDF
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
        {onAdd ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('detail.addAttachment')}
            onPress={onAdd}
            style={[styles.thumb, styles.add, { borderRadius: radii.md, borderColor: colors.borderStrong }]}
          >
            <Icon name="add" size={26} color={colors.textSecondary} />
            <Text variant="footnote" tone="secondary" align="center">
              {t('detail.addAttachment')}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <Modal
        visible={!!viewing}
        animationType="fade"
        onRequestClose={() => setViewing(null)}
        transparent={false}
        statusBarTranslucent
      >
        <View style={[styles.viewer, { paddingTop: insets.top, backgroundColor: colors.background }]}>
          <View style={styles.viewerBar}>
            <IconButton icon="close" label={t('common.close')} onPress={() => setViewing(null)} />
            {viewing && onRemove ? (
              <IconButton
                icon="trash-outline"
                label={t('common.delete')}
                onPress={() => {
                  const a = viewing;
                  setViewing(null);
                  onRemove(a);
                }}
              />
            ) : null}
          </View>
          {viewing ? (
            <ScrollView maximumZoomScale={4} minimumZoomScale={1} contentContainerStyle={styles.zoom} centerContent>
              <Image source={{ uri: attachmentUri(viewing.fileName) }} style={styles.full} contentFit="contain" />
            </ScrollView>
          ) : null}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  strip: { gap: 10, paddingHorizontal: 16, paddingVertical: 4 },
  thumb: { width: 92, height: 120, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  doc: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  add: { alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', borderWidth: 1.5, gap: 4, padding: 6 },
  viewer: { flex: 1 },
  viewerBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 4 },
  previewTitle: { paddingHorizontal: 16, paddingBottom: 12 },
  previewBox: { flex: 1, marginHorizontal: 16, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  previewActions: { padding: 16, gap: 10 },
  zoom: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  full: { width: '100%', height: '100%', minHeight: 500 },
});

/** Shows the file the user just picked and asks them to confirm it before it is attached to the card. */
export function AttachmentPreview({
  pending,
  busy,
  onConfirm,
  onChooseAnother,
  onCancel,
}: {
  pending: PendingAttachment | null;
  busy?: boolean;
  onConfirm: () => void;
  onChooseAnother: () => void;
  onCancel: () => void;
}) {
  const { colors, radii } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const isImage = !!pending && pending.mimeType.startsWith('image/');
  return (
    <Modal visible={!!pending} animationType="slide" onRequestClose={onCancel} statusBarTranslucent>
      <View style={[styles.viewer, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <View style={styles.viewerBar}>
          <IconButton icon="close" label={t('common.cancel')} onPress={onCancel} />
        </View>
        <Text variant="title" align="center" style={styles.previewTitle}>
          {t('attachment.previewTitle')}
        </Text>
        <View style={[styles.previewBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, borderRadius: radii.card }]}>
          {pending && isImage ? (
            <Image source={{ uri: pending.uri }} style={StyleSheet.absoluteFill} contentFit="contain" />
          ) : (
            <View style={styles.doc}>
              <Icon name="document-text-outline" size={56} color={colors.textSecondary} />
              <Text variant="callout" tone="secondary">
                PDF
              </Text>
            </View>
          )}
        </View>
        <View style={[styles.previewActions, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Button title={t('attachment.use')} icon="checkmark" onPress={onConfirm} loading={busy} fullWidth />
          <Button title={t('attachment.another')} variant="secondary" onPress={onChooseAnother} disabled={busy} fullWidth />
        </View>
      </View>
    </Modal>
  );
}
