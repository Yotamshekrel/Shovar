import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Icon, type IconName, Text } from '@/components/ui';
import { formatMoney } from '@/domain/money';
import { useI18n, type StringKey } from '@/i18n';
import { refreshGeofences, requestLocationPermissions } from '@/location/locationService';
import { requestNotificationPermission } from '@/notifications/notifications';
import { useSettingsStore } from '@/state/settings';
import { useTheme } from '@/theme/ThemeProvider';

const POINTS: { icon: IconName; key: StringKey }[] = [
  { icon: 'battery-charging-outline', key: 'locationPerm.point1' },
  { icon: 'lock-closed-outline', key: 'locationPerm.point2' },
  { icon: 'navigate-circle-outline', key: 'locationPerm.point3' },
];

/**
 * Opt-in explainer shown before any location permission prompt: what the
 * feature does, why "Always" is needed and what never leaves the device.
 */
export default function LocationPermissionScreen() {
  const { colors, radii } = useTheme();
  const { t, locale } = useI18n();
  const insets = useSafeAreaInsets();
  const patch = useSettingsStore((s) => s.patch);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<StringKey | null>(null);

  const enable = async () => {
    setBusy(true);
    setProblem(null);
    try {
      const perms = await requestLocationPermissions();
      if (!perms.foreground) {
        setProblem('locationPerm.denied');
        return;
      }
      await requestNotificationPermission();
      patch({ locationEnabled: true });
      if (!perms.background) {
        setProblem('locationPerm.backgroundDenied');
        return;
      }
      await refreshGeofences('enabled', { foreground: true });
      router.back();
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 32 }]}>
        <View style={[styles.hero, { backgroundColor: colors.primarySoft, borderRadius: radii.card }]}>
          <Icon name="location" size={40} color={colors.primary} />
          <View style={[styles.bubble, { backgroundColor: colors.surface, borderRadius: radii.lg }]}>
            <Text variant="footnote" tone="secondary">
              Shvar
            </Text>
            <Text variant="callout">
              {t('notif.nearbyBody', {
                amount: formatMoney(12000, 'ILS', locale),
                store: 'Zara',
                distance: t('notif.meters', { meters: 150 }),
              })}
            </Text>
          </View>
        </View>
        <Text variant="title" accessibilityRole="header">
          {t('locationPerm.title')}
        </Text>
        <Text tone="secondary">{t('locationPerm.body')}</Text>
        <View style={styles.points}>
          {POINTS.map((p) => (
            <View key={p.key} style={styles.point}>
              <Icon name={p.icon} size={22} color={colors.primary} />
              <Text variant="callout" style={styles.flex}>
                {t(p.key)}
              </Text>
            </View>
          ))}
        </View>
        {problem ? (
          <View style={[styles.problem, { backgroundColor: colors.warningSoft, borderRadius: radii.md }]}>
            <Text variant="callout">{t(problem)}</Text>
            <Button title={t('scan.openSettings')} size="sm" variant="secondary" onPress={() => Linking.openSettings()} />
          </View>
        ) : null}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Button
          title={t('locationPerm.enable')}
          icon="location-outline"
          onPress={enable}
          loading={busy}
          fullWidth
          testID="location-enable"
        />
        <Button title={problem ? t('common.close') : t('locationPerm.notNow')} variant="ghost" onPress={() => router.back()} fullWidth />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 24, gap: 16 },
  hero: { alignItems: 'center', padding: 24, gap: 16 },
  bubble: { padding: 14, gap: 2, alignSelf: 'stretch' },
  points: { gap: 14, marginTop: 8 },
  point: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  problem: { padding: 14, gap: 10 },
  footer: { paddingHorizontal: 24, gap: 6 },
});
