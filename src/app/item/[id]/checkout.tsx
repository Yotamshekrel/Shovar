import * as Brightness from 'expo-brightness';
import * as Clipboard from 'expo-clipboard';
import { useKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CodeDisplay } from '@/components/item/CodeDisplay';
import { Button, Icon, IconButton, Segmented, Text, successFeedback } from '@/components/ui';
import { formatMoney } from '@/domain/money';
import type { BarcodeFormat } from '@/domain/types';
import { useI18n } from '@/i18n';
import { getServices } from '@/services/database';
import { unlockForSecrets } from '@/services/security';
import { useItem, useItemsStore } from '@/state/items';
import { useTheme } from '@/theme/ThemeProvider';

/** Brightness boost while a code is on screen, restored afterwards. */
function useBrightScreen() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let previous: number | null = null;
    let cancelled = false;
    (async () => {
      try {
        previous = await Brightness.getBrightnessAsync();
        if (!cancelled) await Brightness.setBrightnessAsync(1);
      } catch {
        // brightness is best-effort
      }
    })();
    return () => {
      cancelled = true;
      if (Platform.OS === 'android') Brightness.restoreSystemBrightnessAsync().catch(() => {});
      else if (previous != null) Brightness.setBrightnessAsync(previous).catch(() => {});
    };
  }, []);
}

/** Large, high-contrast view of the code/link for use at the register. */
export default function CheckoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = useItem(id);
  const update = useItemsStore((s) => s.update);
  const { colors } = useTheme();
  const { t, locale } = useI18n();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [secrets, setSecrets] = useState<{ code: string | null; pin: string | null } | null>(null);
  const [format, setFormat] = useState<BarcodeFormat>(item?.barcodeFormat ?? 'code128');
  const [copied, setCopied] = useState(false);
  const [showPin, setShowPin] = useState(false);
  useKeepAwake();
  useBrightScreen();

  useEffect(() => {
    (async () => {
      if (!(await unlockForSecrets())) {
        router.back();
        return;
      }
      const { items } = await getServices();
      const full = await items.getItem(id);
      setSecrets({ code: full?.code ?? null, pin: full?.pin ?? null });
    })().catch(() => setSecrets({ code: null, pin: null }));
  }, [id]);

  if (!item) return null;

  const changeFormat = (f: BarcodeFormat) => {
    setFormat(f);
    update(item.id, { barcodeFormat: f }).catch(() => {});
  };

  const copy = async () => {
    if (!secrets?.code) return;
    await Clipboard.setStringAsync(secrets.code);
    successFeedback();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const panelWidth = Math.min(width - 48, 420);

  return (
    <View style={[styles.flex, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <IconButton icon="close" label={t('common.close')} onPress={() => router.back()} tone="filled" testID="checkout-close" />
        <View style={styles.titleCol}>
          <Text variant="headline" align="center" numberOfLines={1}>
            {item.storeName}
          </Text>
          {item.balanceMinor != null ? (
            <Text variant="callout" tone="secondary" align="center">
              {formatMoney(item.balanceMinor, item.currency, locale)}
            </Text>
          ) : null}
        </View>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        {secrets === null ? null : secrets.code ? (
          <>
            <View style={[styles.panel, { width: panelWidth }]}>
              {format !== 'text' ? <CodeDisplay code={secrets.code} format={format} width={panelWidth - 32} /> : null}
              <Pressable onPress={copy} accessibilityRole="button" accessibilityLabel={`${t('common.copy')} ${secrets.code}`} testID="checkout-code">
                <Text
                  variant="mono"
                  align="center"
                  color="#0E1116"
                  selectable
                  style={format === 'text' ? styles.bigCode : undefined}
                  adjustsFontSizeToFit
                  numberOfLines={format === 'text' ? 3 : 2}
                >
                  {secrets.code}
                </Text>
              </Pressable>
              <View style={styles.copyHint}>
                <Icon name={copied ? 'checkmark' : 'copy-outline'} size={14} color={copied ? '#157F3B' : '#555D6B'} />
                <Text variant="footnote" color={copied ? '#157F3B' : '#555D6B'}>
                  {copied ? t('common.copied') : t('checkout.tapToCopy')}
                </Text>
              </View>
              {secrets.pin ? (
                <Pressable onPress={() => setShowPin((s) => !s)} style={styles.pinRow} accessibilityRole="button">
                  <Text variant="caption" color="#555D6B">
                    {t('detail.pin')}
                  </Text>
                  <Text variant="headline" color="#0E1116" style={styles.pin}>
                    {showPin ? secrets.pin : '• • • •'}
                  </Text>
                  <Icon name={showPin ? 'eye-off-outline' : 'eye-outline'} size={18} color="#555D6B" />
                </Pressable>
              ) : null}
            </View>
            <View style={{ width: panelWidth }}>
              <Segmented
                options={[
                  { value: 'code128', label: t('form.barcode.code128') },
                  { value: 'qr', label: t('form.barcode.qr') },
                  { value: 'text', label: t('form.barcode.text') },
                ]}
                value={format}
                onChange={changeFormat}
              />
            </View>
            {Platform.OS !== 'web' ? (
              <View style={styles.brightNote}>
                <Icon name="sunny-outline" size={14} color={colors.textTertiary} />
                <Text variant="footnote" tone="tertiary">
                  {t('checkout.brightness')}
                </Text>
              </View>
            ) : null}
          </>
        ) : (
          <View style={styles.noCode}>
            <Text tone="secondary" align="center">
              {t('checkout.noCode')}
            </Text>
            <Button title={t('checkout.addCode')} variant="secondary" size="md" onPress={() => router.replace(`/item/${item.id}/edit`)} />
          </View>
        )}

        {item.linkUrl ? (
          <View style={{ width: panelWidth }}>
            <Button title={t('detail.openLink')} icon="open-outline" onPress={() => Linking.openURL(item.linkUrl!)} fullWidth variant={secrets?.code ? 'secondary' : 'primary'} />
          </View>
        ) : null}
        {item.balanceMinor != null ? (
          <View style={{ width: panelWidth }}>
            <Button title={t('detail.logUsage')} icon="remove-circle-outline" variant="ghost" onPress={() => router.replace(`/item/${item.id}/balance`)} fullWidth />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 },
  titleCol: { flex: 1, gap: 2 },
  spacer: { width: 44 },
  content: { alignItems: 'center', gap: 18, paddingTop: 12, paddingHorizontal: 24 },
  panel: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 16, gap: 14, alignItems: 'stretch', borderWidth: 1, borderColor: '#E1E4E9' },
  bigCode: { fontSize: 34, lineHeight: 44, paddingVertical: 24 },
  copyHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  pinRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E1E4E9' },
  pin: { letterSpacing: 4, fontFamily: 'monospace' },
  brightNote: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  noCode: { gap: 14, alignItems: 'center', paddingVertical: 40 },
});
