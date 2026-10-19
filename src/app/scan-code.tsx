import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, IconButton, Text, successFeedback } from '@/components/ui';
import type { BarcodeFormat } from '@/domain/types';
import { useI18n } from '@/i18n';
import { useScannedCode } from '@/state/scannedCode';

const TYPES = [
  'qr',
  'code128',
  'code39',
  'code93',
  'ean13',
  'ean8',
  'upc_a',
  'upc_e',
  'itf14',
  'codabar',
  'pdf417',
  'datamatrix',
  'aztec',
] as const;

/** Live barcode / QR reader: hands the code back to whichever form opened it. */
export default function ScanCodeScreen() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const done = useRef(false);

  const onScanned = (r: BarcodeScanningResult) => {
    if (done.current || !r.data) return;
    done.current = true;
    successFeedback();
    const format: BarcodeFormat = r.type === 'qr' ? 'qr' : 'code128';
    useScannedCode.getState().set({ data: r.data, format });
    router.back();
  };

  const close = () => router.back();

  if (!permission) return <View style={styles.dark} />;

  if (!permission.granted) {
    return (
      <View style={[styles.dark, styles.center, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
        <Text color="#FFFFFF" align="center" style={styles.permissionText}>
          {t('scanCode.permission')}
        </Text>
        <Button
          title={t('scanCode.allow')}
          icon="camera-outline"
          onPress={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings())}
          testID="scan-code-allow"
        />
        <Button title={t('scanCode.cancel')} variant="ghost" onPress={close} />
      </View>
    );
  }

  return (
    <View style={styles.dark}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: [...TYPES] }}
        onBarcodeScanned={onScanned}
      />
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <IconButton icon="close" label={t('scanCode.cancel')} onPress={close} tone="filled" testID="scan-code-close" />
        <Text variant="headline" color="#FFFFFF" accessibilityRole="header">
          {t('scanCode.title')}
        </Text>
        <IconButton
          icon={torch ? 'flash' : 'flash-outline'}
          label={t('scanCode.torch')}
          onPress={() => setTorch((v) => !v)}
          tone="filled"
        />
      </View>
      <View pointerEvents="none" style={styles.frameWrap}>
        <View style={styles.frame} />
      </View>
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 24 }]}>
        <Text color="#FFFFFF" align="center">
          {t('scanCode.hint')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dark: { flex: 1, backgroundColor: '#000000' },
  center: { alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 32 },
  permissionText: { marginBottom: 8 },
  top: {
    position: 'absolute',
    top: 0,
    start: 0,
    end: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  frameWrap: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  frame: { width: '78%', aspectRatio: 1.6, borderRadius: 20, borderWidth: 3, borderColor: 'rgba(255,255,255,0.9)' },
  bottom: { position: 'absolute', bottom: 0, start: 0, end: 0, paddingHorizontal: 32 },
});
