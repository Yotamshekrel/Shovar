import { router } from 'expo-router';

import { AdvancedSection } from '@/components/settings/AdvancedSection';
import { SecuritySection } from '@/components/settings/SecuritySection';
import { SettingsPage } from '@/components/settings/SettingsPage';
import { ListRow, Section } from '@/components/ui';
import { useI18n } from '@/i18n';
import { deleteAllAttachmentFiles } from '@/services/attachments';
import { getServices } from '@/services/database';
import { useItemsStore } from '@/state/items';
import { DEFAULT_SETTINGS, useSettings, useSettingsStore } from '@/state/settings';
import { confirm } from '@/utils/dialogs';

export default function SecuritySettingsScreen() {
  const { t } = useI18n();
  const settings = useSettings();
  const patch = useSettingsStore((s) => s.patch);

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
    <SettingsPage>
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
      </Section>

      <AdvancedSection />

      <Section title={t('settings.data')}>
        <ListRow icon="trash-outline" title={t('settings.deleteAll')} onPress={onDeleteAll} destructive testID="settings-delete-all" />
      </Section>
    </SettingsPage>
  );
}
