import Constants from 'expo-constants';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Linking, StyleSheet, View } from 'react-native';

import { ShovarLogo } from '@/components/brand/ShovarBrand';
import { SettingsPage } from '@/components/settings/SettingsPage';
import { Divider, ListRow, Section, Text } from '@/components/ui';
import { PRIVACY_POLICY_URL, SUPPORT_EMAIL } from '@/config/legal';
import { useI18n } from '@/i18n';

export default function AboutSettingsScreen() {
  const { t } = useI18n();
  return (
    <SettingsPage>
      <View style={styles.brand}>
        <ShovarLogo />
      </View>
      <Section>
        <ListRow
          icon="shield-checkmark-outline"
          title={t('settings.privacyPolicy')}
          onPress={() => WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL)}
          chevron
          testID="settings-privacy-policy"
        />
        <Divider inset={60} />
        <ListRow
          icon="document-text-outline"
          title={t('settings.legal')}
          onPress={() => router.push('/settings/legal')}
          chevron
          testID="settings-legal"
        />
        <Divider inset={60} />
        <ListRow
          icon="mail-outline"
          title={t('settings.contact')}
          value={SUPPORT_EMAIL}
          onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
          testID="settings-contact"
        />
      </Section>

      <Text variant="footnote" tone="tertiary" align="center">
        {t('settings.version', { version: Constants.expoConfig?.version ?? '1.0.0' })}
      </Text>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  brand: { alignItems: 'center', paddingTop: 8 },
});
