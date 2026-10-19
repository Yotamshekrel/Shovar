import { useEffect, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { Button, Chip, Divider, ListRow, Section, Text } from '@/components/ui';

import { FieldBlock } from './FieldBlock';
import { useI18n } from '@/i18n';
import { notificationPermission, requestNotificationPermission, scheduleExpirySync } from '@/notifications/notifications';
import { useSettings, useSettingsStore } from '@/state/settings';

const DAY_OPTIONS = [30, 14, 7, 3, 1, 0];

export function ExpiryReminderSection() {
  const { t } = useI18n();
  const settings = useSettings();
  const patch = useSettingsStore((s) => s.patch);
  const [permission, setPermission] = useState<'granted' | 'denied' | 'undetermined'>('granted');

  useEffect(() => {
    notificationPermission()
      .then(setPermission)
      .catch(() => {});
  }, [settings.expiryRemindersEnabled]);

  const toggle = async (on: boolean) => {
    patch({ expiryRemindersEnabled: on });
    if (on) {
      const ok = await requestNotificationPermission();
      setPermission(ok ? 'granted' : 'denied');
      scheduleExpirySync();
    }
  };

  const toggleDay = (d: number) => {
    const set = new Set(settings.expiryReminderDays);
    if (set.has(d)) set.delete(d);
    else set.add(d);
    if (set.size === 0) return; // keep at least one reminder
    patch({ expiryReminderDays: [...set] });
  };

  return (
    <Section title={t('settings.notifications')}>
      <ListRow
        icon="notifications-outline"
        title={t('settings.expiryEnabled')}
        toggle={{ value: settings.expiryRemindersEnabled, onChange: toggle }}
        testID="settings-expiry-toggle"
      />
      {settings.expiryRemindersEnabled ? (
        <>
          <Divider inset={60} />
          <FieldBlock icon="calendar-outline" label={t('settings.expiryDays')}>
            <View style={styles.chips}>
              {DAY_OPTIONS.map((d) => (
                <Chip
                  key={d}
                  accent
                  label={
                    d === 0 ? t('settings.expiryDayOf') : d === 1 ? t('settings.expiryOneDay') : t('settings.expiryDaysValue', { days: d })
                  }
                  selected={settings.expiryReminderDays.includes(d)}
                  onPress={() => toggleDay(d)}
                />
              ))}
            </View>
          </FieldBlock>
          {permission === 'denied' ? (
            <View style={styles.block}>
              <Text variant="footnote" tone="warning">
                {t('settings.notificationsDenied')}
              </Text>
              <Button title={t('scan.openSettings')} size="sm" variant="secondary" onPress={() => Linking.openSettings()} />
            </View>
          ) : null}
        </>
      ) : null}
    </Section>
  );
}

const styles = StyleSheet.create({
  block: { padding: 16, gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
