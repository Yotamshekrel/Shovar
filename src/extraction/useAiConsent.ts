import { useCallback, useEffect, useState } from 'react';

import { useI18n } from '@/i18n';
import { useSettingsStore } from '@/state/settings';
import { confirm } from '@/utils/dialogs';

import { resolveAiConfig } from './aiConfig';

/**
 * AI extraction gate: returns whether an image may be sent to the AI service,
 * asking for consent the first time (declining turns AI reading off; it can be
 * re-enabled in Settings).
 */
export function useAiConsent() {
  const { t } = useI18n();
  const patch = useSettingsStore((s) => s.patch);
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    resolveAiConfig()
      .then((c) => alive && setConfigured(!!c))
      .catch(() => alive && setConfigured(false));
    return () => {
      alive = false;
    };
  }, []);

  const ensureConsent = useCallback(async (): Promise<boolean> => {
    const s = useSettingsStore.getState().settings;
    if (!s.aiExtractionEnabled) return false;
    if (!(await resolveAiConfig())) return false;
    if (s.aiConsentGiven) return true;
    const ok = await confirm({
      title: t('scan.consentTitle'),
      message: t('scan.consentBody', { provider: 'Anthropic Claude' }),
      confirmText: t('scan.consentAccept'),
      cancelText: t('scan.consentDecline'),
    });
    patch(ok ? { aiConsentGiven: true } : { aiExtractionEnabled: false });
    return ok;
  }, [patch, t]);

  return { configured, ensureConsent };
}
