import { Image } from 'expo-image';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, StyleSheet, View } from 'react-native';

import { Button, Icon, Text } from '@/components/ui';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';

/** "Reading your receipt…" state with the picked image and a scan sweep. */
export function ReadingView({ uri, onCancel }: { uri: string | null; onCancel: () => void }) {
  const { colors, radii } = useTheme();
  const { t } = useI18n();
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(sweep, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [sweep]);

  return (
    <View style={[styles.wrap, { backgroundColor: colors.background }]} testID="scan-reading" accessibilityLiveRegion="polite">
      <View style={[styles.preview, { borderRadius: radii.card, backgroundColor: colors.surfaceAlt }]}>
        {uri ? (
          <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <Icon name="document-text-outline" size={64} color={colors.textTertiary} />
        )}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.scanLine,
            {
              backgroundColor: colors.primary,
              transform: [{ translateY: sweep.interpolate({ inputRange: [0, 1], outputRange: [0, 316] }) }],
            },
          ]}
        />
      </View>
      <View style={styles.texts}>
        <View style={styles.row}>
          <ActivityIndicator color={colors.primary} />
          <Text variant="headline">{t('scan.reading')}</Text>
        </View>
        <Text tone="secondary" align="center">
          {t('scan.readingHint')}
        </Text>
      </View>
      <Button title={t('common.cancel')} variant="ghost" onPress={onCancel} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24, padding: 24 },
  preview: { width: 240, height: 320, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  scanLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 4, opacity: 0.8 },
  texts: { alignItems: 'center', gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
