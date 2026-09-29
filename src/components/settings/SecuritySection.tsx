import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { Divider, ListRow, Section } from '@/components/ui';
import { useI18n } from '@/i18n';
import { authenticate, biometricsAvailable } from '@/services/security';
import { useSettings, useSettingsStore } from '@/state/settings';
import { notify } from '@/utils/dialogs';

export function SecuritySection() {
  const { t } = useI18n();
  const settings = useSettings();
  const patch = useSettingsStore((s) => s.patch);
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    biometricsAvailable()
      .then(setAvailable)
      .catch(() => setAvailable(false));
  }, []);

  const toggle = async (on: boolean) => {
    if (!on) {
      // Turning the lock off requires proving it's you.
      if (await authenticate()) patch({ biometricLock: false });
      return;
    }
    if (!(await biometricsAvailable())) {
      notify(t('settings.biometricUnavailable'));
      return;
    }
    if (await authenticate()) patch({ biometricLock: true });
  };

  return (
    <Section title={t('settings.security')} footer={t('settings.privacy')}>
      <ListRow
        icon="finger-print-outline"
        title={t('settings.biometric')}
        subtitle={available === false ? t('settings.biometricUnavailable') : undefined}
        toggle={{ value: settings.biometricLock, onChange: toggle, disabled: Platform.OS === 'web' || available === false }}
        testID="settings-biometric"
      />
      <Divider inset={60} />
      <ListRow icon="lock-closed-outline" title={t('settings.encryption')} subtitle={t('settings.encryptionHint')} />
    </Section>
  );
}
