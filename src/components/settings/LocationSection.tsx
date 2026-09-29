import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { Chip, Divider, ListRow, Section, Text } from '@/components/ui';
import { useI18n } from '@/i18n';
import {
  LOCATION_STATUS_KEY,
  type LocationStatus,
  locationPermissions,
  refreshGeofences,
  stopGeofences,
} from '@/location/locationService';
import { getServices } from '@/services/database';
import { useSettings, useSettingsStore } from '@/state/settings';

const RADII = [100, 150, 250, 400];
const COOLDOWNS = [4, 12, 24, 72];

export function LocationSection() {
  const { t } = useI18n();
  const settings = useSettings();
  const patch = useSettingsStore((s) => s.patch);
  const [status, setStatus] = useState<LocationStatus | null>(null);
  const [background, setBackground] = useState(true);

  const [statusKey, setStatusKey] = useState(0);
  const reloadStatus = () => setStatusKey((k) => k + 1);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { kv } = await getServices();
      const [st, perms] = await Promise.all([kv.get<LocationStatus>(LOCATION_STATUS_KEY), locationPermissions()]);
      if (!alive) return;
      setStatus(st);
      setBackground(perms.background);
    })().catch(() => {});
    return () => {
      alive = false;
    };
  }, [settings.locationEnabled, statusKey]);

  const toggle = async (on: boolean) => {
    if (on) {
      router.push('/settings/location');
      return;
    }
    patch({ locationEnabled: false });
    await stopGeofences();
  };

  const supported = Platform.OS === 'ios' || Platform.OS === 'android';

  return (
    <Section title={t('settings.location')} footer={t('settings.locationHint')}>
      <ListRow
        icon="location-outline"
        title={t('settings.locationEnabled')}
        subtitle={
          settings.locationEnabled
            ? !background
              ? t('locationPerm.backgroundDenied')
              : status
                ? t('settings.locationStatus', { count: status.storeRegions })
                : undefined
            : undefined
        }
        toggle={{ value: settings.locationEnabled, onChange: toggle, disabled: !supported }}
        testID="settings-location-toggle"
      />
      {settings.locationEnabled ? (
        <>
          <Divider inset={16} />
          <View style={styles.block}>
            <Text variant="caption" tone="secondary">
              {t('settings.locationRadius')}
            </Text>
            <View style={styles.chips}>
              {RADII.map((m) => (
                <Chip
                  key={m}
                  label={t('settings.meters', { meters: m })}
                  selected={settings.locationRadiusM === m}
                  onPress={() => patch({ locationRadiusM: m })}
                />
              ))}
            </View>
          </View>
          <Divider inset={16} />
          <View style={styles.block}>
            <Text variant="caption" tone="secondary">
              {t('settings.locationCooldown')}
            </Text>
            <View style={styles.chips}>
              {COOLDOWNS.map((h) => (
                <Chip
                  key={h}
                  label={t('settings.hours', { hours: h })}
                  selected={settings.locationCooldownHours === h}
                  onPress={() => patch({ locationCooldownHours: h })}
                />
              ))}
            </View>
          </View>
          <Divider inset={60} />
          <ListRow
            icon="refresh-outline"
            title={t('settings.locationRefresh')}
            onPress={async () => {
              await refreshGeofences('manual', { foreground: true });
              reloadStatus();
            }}
          />
        </>
      ) : null}
    </Section>
  );
}

const styles = StyleSheet.create({
  block: { padding: 16, gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
