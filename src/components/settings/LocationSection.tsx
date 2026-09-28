import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { Chip, Divider, ListRow, Section, Text } from '@/components/ui';
import { env } from '@/config/env';
import { useI18n } from '@/i18n';
import {
  LOCATION_STATUS_KEY,
  type LocationStatus,
  PLACES_KEY_SECRET,
  locationPermissions,
  refreshGeofences,
  sendTestNearbyReminder,
  stopGeofences,
} from '@/location/locationService';
import { getServices } from '@/services/database';
import { useSettings, useSettingsStore } from '@/state/settings';
import { notify } from '@/utils/dialogs';

import { SecretKeyRow } from './SecretKeyRow';

const RADII = [100, 150, 250, 400];
const COOLDOWNS = [4, 12, 24, 72];

export function LocationSection() {
  const { t } = useI18n();
  const settings = useSettings();
  const patch = useSettingsStore((s) => s.patch);
  const [status, setStatus] = useState<LocationStatus | null>(null);
  const [background, setBackground] = useState(true);

  const loadStatus = useCallback(async () => {
    const { kv } = await getServices();
    setStatus(await kv.get<LocationStatus>(LOCATION_STATUS_KEY));
    setBackground((await locationPermissions()).background);
  }, []);

  useEffect(() => {
    loadStatus().catch(() => {});
  }, [loadStatus, settings.locationEnabled]);

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
              await loadStatus();
            }}
          />
          <Divider inset={60} />
          <ListRow
            icon="notifications-outline"
            title={t('settings.locationTest')}
            onPress={async () => {
              const sent = await sendTestNearbyReminder();
              if (!sent) notify(t('settings.locationTestNone'));
            }}
            testID="settings-location-test"
          />
        </>
      ) : null}
      <Divider inset={60} />
      <SecretKeyRow
        secretName={PLACES_KEY_SECRET}
        title={t('settings.placesKey')}
        hint={t('settings.placesKeyHint')}
        envConfigured={!!env.googlePlacesApiKey}
        onChange={() => refreshGeofences('places-key', { foreground: true })}
      />
    </Section>
  );
}

const styles = StyleSheet.create({
  block: { padding: 16, gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
