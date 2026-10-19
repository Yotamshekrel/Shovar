import Constants from 'expo-constants';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ShovarMark, ShovarWordmark } from '@/components/brand/ShovarBrand';
import { SettingsPage } from '@/components/settings/SettingsPage';
import { Divider, ListRow, Section, Text } from '@/components/ui';
import { useI18n } from '@/i18n';
import { useSettings } from '@/state/settings';
import { useTheme } from '@/theme/ThemeProvider';

/** Settings hub: the app's identity on top, then one row per area, each opening its own page. */
export default function SettingsScreen() {
  const { t } = useI18n();
  const { colors, radii } = useTheme();
  const settings = useSettings();
  const reminders = settings.expiryRemindersEnabled || settings.locationEnabled;

  return (
    <SettingsPage>
      <View style={[styles.hero, { backgroundColor: colors.primarySoft, borderRadius: radii.card }]}>
        <ShovarMark size={56} />
        <View style={styles.heroTexts}>
          <ShovarWordmark height={20} />
          <Text variant="footnote" tone="secondary">
            {t('settings.version', { version: Constants.expoConfig?.version ?? '1.0.0' })}
          </Text>
        </View>
      </View>

      <Section>
        <ListRow
          icon="options-outline"
          title={t('settings.general')}
          subtitle={t('settings.generalHint')}
          onPress={() => router.push('/settings/general')}
          chevron
          testID="settings-general"
        />
        <Divider inset={60} />
        <ListRow
          icon="notifications-outline"
          title={t('settings.reminders')}
          subtitle={t('settings.remindersHint')}
          value={reminders ? t('settings.valueOn') : t('settings.valueOff')}
          onPress={() => router.push('/settings/reminders')}
          chevron
          testID="settings-reminders"
        />
        <Divider inset={60} />
        <ListRow
          icon="lock-closed-outline"
          title={t('settings.securityAdvanced')}
          subtitle={t('settings.securityAdvancedHint')}
          value={settings.biometricLock ? t('settings.valueOn') : undefined}
          onPress={() => router.push('/settings/security')}
          chevron
          testID="settings-security"
        />
        <Divider inset={60} />
        <ListRow
          icon="information-circle-outline"
          title={t('settings.about')}
          subtitle={t('settings.aboutHint')}
          onPress={() => router.push('/settings/about')}
          chevron
          testID="settings-about"
        />
      </Section>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  heroTexts: { gap: 6 },
});
