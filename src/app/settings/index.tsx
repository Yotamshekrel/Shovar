import Constants from 'expo-constants';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExpiryReminderSection } from '@/components/settings/ExpiryReminderSection';
import { LocationSection } from '@/components/settings/LocationSection';
import { SecuritySection } from '@/components/settings/SecuritySection';
import { SecretKeyRow } from '@/components/settings/SecretKeyRow';
import { Chip, Divider, ListRow, Section, Segmented, Text } from '@/components/ui';
import { env } from '@/config/env';
import { USER_KEY_SECRET } from '@/extraction/aiConfig';
import { SUPPORTED_CURRENCIES, currencySymbol } from '@/domain/money';
import { isRtlLanguage, resolveLanguage, useI18n } from '@/i18n';
import { applyLayoutDirection, restartApp } from '@/services/bootstrap';
import { deleteAllAttachmentFiles } from '@/services/attachments';
import { getServices } from '@/services/database';
import { loadDemoData } from '@/services/seed';
import { useItemsStore } from '@/state/items';
import { type LanguagePref, type ThemePref, DEFAULT_SETTINGS, useSettings, useSettingsStore } from '@/state/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { confirm, notify } from '@/utils/dialogs';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const { t, lang } = useI18n();
  const insets = useSafeAreaInsets();
  const settings = useSettings();
  const patch = useSettingsStore((s) => s.patch);

  const changeLanguage = async (language: LanguagePref) => {
    const before = isRtlLanguage(lang);
    const after = isRtlLanguage(resolveLanguage(language));
    patch({ language });
    if (before !== after) {
      const needsRestart = applyLayoutDirection({ ...settings, language });
      if (needsRestart) {
        const ok = await confirm({
          title: t('settings.restartTitle'),
          message: t('settings.restartBody'),
          confirmText: t('settings.restartNow'),
          cancelText: t('common.cancel'),
        });
        // Give the settings store a moment to persist before reloading.
        if (ok) setTimeout(() => restartApp('language changed'), 400);
      }
    }
  };

  const onLoadDemo = async () => {
    const n = await loadDemoData();
    notify(t('settings.loadDemoDone'), `+${n}`);
  };

  const onDeleteAll = async () => {
    const ok = await confirm({
      title: t('settings.deleteAll'),
      message: t('settings.deleteAllConfirm'),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    const { items, kv } = await getServices();
    await items.deleteAll();
    deleteAllAttachmentFiles();
    await kv.set('settings.v1', { ...DEFAULT_SETTINGS, onboardingDone: true });
    useSettingsStore.getState().hydrate({ ...DEFAULT_SETTINGS, onboardingDone: true });
    await useItemsStore.getState().refresh();
    router.dismissAll();
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
    >
      <Section title={t('settings.general')}>
        <View style={styles.block}>
          <Text variant="caption" tone="secondary">
            {t('settings.language')}
          </Text>
          <Segmented<LanguagePref>
            options={[
              { value: 'system', label: t('settings.language.system') },
              { value: 'en', label: t('settings.language.en') },
              { value: 'he', label: t('settings.language.he') },
            ]}
            value={settings.language}
            onChange={changeLanguage}
          />
        </View>
        <Divider />
        <View style={styles.block}>
          <Text variant="caption" tone="secondary">
            {t('settings.theme')}
          </Text>
          <Segmented<ThemePref>
            options={[
              { value: 'system', label: t('settings.theme.system') },
              { value: 'light', label: t('settings.theme.light') },
              { value: 'dark', label: t('settings.theme.dark') },
            ]}
            value={settings.theme}
            onChange={(theme) => patch({ theme })}
          />
        </View>
        <Divider />
        <View style={styles.block}>
          <Text variant="caption" tone="secondary">
            {t('settings.currency')}
          </Text>
          <View style={styles.chips}>
            {SUPPORTED_CURRENCIES.map((c) => (
              <Chip
                key={c}
                label={`${currencySymbol(c)} ${c}`}
                selected={settings.defaultCurrency === c}
                onPress={() => patch({ defaultCurrency: c })}
              />
            ))}
          </View>
        </View>
      </Section>

      <ExpiryReminderSection />

      <LocationSection />

      <SecuritySection />

      <Section title={t('settings.ai')} footer={t('settings.aiHint')}>
        <ListRow
          icon="sparkles-outline"
          title={t('settings.aiEnabled')}
          toggle={{
            value: settings.aiExtractionEnabled,
            onChange: (v) => patch({ aiExtractionEnabled: v, aiConsentGiven: v ? settings.aiConsentGiven : false }),
          }}
          testID="settings-ai-toggle"
        />
        <Divider inset={60} />
        <SecretKeyRow
          secretName={USER_KEY_SECRET}
          title={t('settings.aiKey')}
          hint={t('settings.aiKeyHint')}
          envConfigured={!!(env.anthropicApiKey || env.anthropicBaseUrl)}
          testID="settings-ai-key"
        />
      </Section>

      <Section title={t('settings.data')}>
        <ListRow icon="albums-outline" title={t('settings.loadDemo')} onPress={onLoadDemo} testID="settings-load-demo" />
        <Divider inset={60} />
        <ListRow icon="trash-outline" title={t('settings.deleteAll')} onPress={onDeleteAll} destructive testID="settings-delete-all" />
      </Section>

      <Text variant="footnote" tone="tertiary" align="center">
        {t('settings.version', { version: Constants.expoConfig?.version ?? '1.0.0' })}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 24 },
  block: { padding: 16, gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
