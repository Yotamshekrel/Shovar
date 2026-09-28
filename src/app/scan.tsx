import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ReadingView } from '@/components/scan/ReadingView';
import { Button, Icon, type IconName, Text, tapFeedback } from '@/components/ui';
import { useReceiptImport } from '@/extraction/useReceiptImport';
import { useI18n, type StringKey } from '@/i18n';
import { type PickResult, pickDocument, pickFromCamera, pickFromGallery } from '@/services/pickers';
import { useSettings } from '@/state/settings';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Receipt capture: camera, gallery or file → automatic extraction → review.
 * Target: from shutter to a prefilled review screen in a few seconds.
 */
export default function ScanScreen() {
  const { source } = useLocalSearchParams<{ source?: string }>();
  const { colors, radii } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const settings = useSettings();
  const { configured, reading, importAttachment, cancel } = useReceiptImport();
  const [denied, setDenied] = useState<'camera' | 'photos' | null>(null);
  const autoLaunched = useRef(false);

  const pick = async (fn: () => Promise<PickResult>, which: 'camera' | 'photos') => {
    tapFeedback();
    try {
      const res = await fn();
      if (res.status === 'picked') {
        setDenied(null);
        await importAttachment(res.attachment);
      } else if (res.status === 'denied') setDenied(which);
    } catch (e) {
      console.warn('[scan] picker failed', e);
    }
  };

  // Quick action / deep link (`/scan?source=camera`): open the camera immediately.
  useEffect(() => {
    if (source === 'camera' && configured !== null && !autoLaunched.current) {
      autoLaunched.current = true;
      pick(() => pickFromCamera('receipt'), 'camera');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, configured]);

  if (reading) {
    return <ReadingView uri={reading.mimeType.startsWith('image/') ? reading.uri : null} onCancel={cancel} />;
  }

  const options: { key: string; icon: IconName; title: StringKey; onPress: () => void; primary?: boolean }[] = [
    {
      key: 'camera',
      icon: 'camera-outline',
      title: 'scan.camera',
      onPress: () => pick(() => pickFromCamera('receipt'), 'camera'),
      primary: true,
    },
    { key: 'gallery', icon: 'images-outline', title: 'scan.gallery', onPress: () => pick(() => pickFromGallery('receipt'), 'photos') },
    { key: 'file', icon: 'document-attach-outline', title: 'scan.file', onPress: () => pick(() => pickDocument('receipt'), 'photos') },
  ];

  const aiNotice = !settings.aiExtractionEnabled
    ? t('scan.aiDisabled')
    : configured === false
      ? t('scan.notConfigured')
      : t('scan.aiNotice');

  return (
    <View style={[styles.flex, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.options}>
        {denied ? (
          <View style={[styles.denied, { backgroundColor: colors.warningSoft, borderRadius: radii.md }]}>
            <Text variant="callout">{denied === 'camera' ? t('scan.permissionCamera') : t('scan.permissionPhotos')}</Text>
            <Button title={t('scan.openSettings')} size="sm" variant="secondary" onPress={() => Linking.openSettings()} />
          </View>
        ) : null}
        {options.map((o) => (
          <Pressable
            key={o.key}
            testID={`scan-${o.key}`}
            accessibilityRole="button"
            accessibilityLabel={t(o.title)}
            onPress={o.onPress}
            style={({ pressed }) => [
              styles.option,
              {
                borderRadius: radii.card,
                backgroundColor: o.primary
                  ? pressed
                    ? colors.primaryPressed
                    : colors.primary
                  : pressed
                    ? colors.surfacePressed
                    : colors.surface,
                borderColor: colors.border,
                minHeight: o.primary ? 120 : 72,
              },
            ]}
          >
            <Icon name={o.icon} size={o.primary ? 34 : 24} color={o.primary ? colors.textOnPrimary : colors.text} />
            <Text variant={o.primary ? 'headline' : 'bodyStrong'} color={o.primary ? colors.textOnPrimary : colors.text}>
              {t(o.title)}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={[styles.notice, { backgroundColor: colors.surfaceAlt, borderRadius: radii.md }]} testID="scan-ai-notice">
        <Icon name="shield-checkmark-outline" size={18} color={colors.textSecondary} />
        <Text variant="footnote" tone="secondary" style={styles.flex}>
          {aiNotice}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  options: { padding: 16, gap: 12, flex: 1 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  notice: { flexDirection: 'row', gap: 10, padding: 14, marginHorizontal: 16, alignItems: 'flex-start' },
  denied: { padding: 14, gap: 10 },
});
