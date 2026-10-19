import { StyleSheet, View } from 'react-native';

import { FieldBlock } from '@/components/settings/FieldBlock';
import { SettingsPage } from '@/components/settings/SettingsPage';
import { Chip, Divider, ListRow, Section, Segmented } from '@/components/ui';
import { SUPPORTED_CURRENCIES, currencySymbol } from '@/domain/money';
import { isRtlLanguage, resolveLanguage, useI18n } from '@/i18n';
import { applyLayoutDirection, restartApp } from '@/services/bootstrap';
import { type LanguagePref, type ThemePref, useSettings, useSettingsStore } from '@/state/settings';
import { confirm } from '@/utils/dialogs';

export default function GeneralSettingsScreen() {
  const { t, lang } = useI18n();
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

  return (
    <SettingsPage>
      <Section>
        <FieldBlock icon="language-outline" label={t('settings.language')}>
          <Segmented<LanguagePref>
            accent
            options={[
              { value: 'system', label: t('settings.language.system') },
              { value: 'en', label: t('settings.language.en') },
              { value: 'he', label: t('settings.language.he') },
            ]}
            value={settings.language}
            onChange={changeLanguage}
          />
        </FieldBlock>
        <Divider />
        <FieldBlock icon="contrast-outline" label={t('settings.theme')}>
          <Segmented<ThemePref>
            accent
            options={[
              { value: 'system', label: t('settings.theme.system') },
              { value: 'light', label: t('settings.theme.light') },
              { value: 'dark', label: t('settings.theme.dark') },
            ]}
            value={settings.theme}
            onChange={(theme) => patch({ theme })}
          />
        </FieldBlock>
        <Divider />
        <FieldBlock icon="cash-outline" label={t('settings.currency')}>
          <View style={styles.chips}>
            {SUPPORTED_CURRENCIES.map((c) => (
              <Chip
                key={c}
                accent
                label={`${currencySymbol(c)} ${c}`}
                selected={settings.defaultCurrency === c}
                onPress={() => patch({ defaultCurrency: c })}
              />
            ))}
          </View>
        </FieldBlock>
      </Section>

      <Section title={t('settings.storeLists')} footer={t('settings.storeListsHint')}>
        <ListRow
          icon="cloud-download-outline"
          title={t('settings.storeListsUpdate')}
          toggle={{ value: settings.catalogUpdatesEnabled, onChange: (v) => patch({ catalogUpdatesEnabled: v }) }}
          testID="settings-catalog-toggle"
        />
      </Section>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
