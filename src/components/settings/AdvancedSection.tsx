import { useState } from 'react';

import { Divider, ListRow, Section } from '@/components/ui';
import { env } from '@/config/env';
import { USER_KEY_SECRET } from '@/extraction/aiConfig';
import { useI18n } from '@/i18n';
import { PLACES_KEY_SECRET, refreshGeofences } from '@/location/locationService';

import { SecretKeyRow } from './SecretKeyRow';

/** Collapsed by default: optional API keys most people never need. */
export function AdvancedSection() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <Section title={t('settings.advanced')} footer={open ? t('settings.advancedHint') : undefined}>
      <ListRow
        icon="construct-outline"
        title={t('settings.advancedToggle')}
        value={open ? t('settings.advancedHide') : t('settings.advancedShow')}
        onPress={() => setOpen((o) => !o)}
        testID="settings-advanced"
      />
      {open ? (
        <>
          <Divider inset={60} />
          <SecretKeyRow
            secretName={USER_KEY_SECRET}
            title={t('settings.aiKey')}
            hint={t('settings.aiKeyHint')}
            explainTitle={t('settings.aiKeyWhyTitle')}
            explain={t('settings.aiKeyWhy')}
            envConfigured={!!(env.anthropicApiKey || env.anthropicBaseUrl)}
            testID="settings-ai-key"
          />
          <Divider inset={60} />
          <SecretKeyRow
            secretName={PLACES_KEY_SECRET}
            title={t('settings.placesKey')}
            hint={t('settings.placesKeyHint')}
            explainTitle={t('settings.placesKeyWhyTitle')}
            explain={t('settings.placesKeyWhy')}
            envConfigured={!!env.googlePlacesApiKey}
            onChange={() => refreshGeofences('places-key', { foreground: true })}
            testID="settings-places-key"
          />
        </>
      ) : null}
    </Section>
  );
}
