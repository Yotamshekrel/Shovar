import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { type StringKey, useI18n } from '@/i18n';
import { type PendingAttachment, useDraftStore } from '@/state/drafts';
import { getSettings } from '@/state/settings';

import { runExtraction } from './pipeline';
import { useAiConsent } from './useAiConsent';

const AI_ERROR_KEYS: Partial<Record<string, StringKey>> = {
  not_configured: 'scan.notConfigured',
};

/**
 * Shared flow for receipt images/PDFs (scan screen and share sheet):
 * consent → extraction → prefilled review screen.
 */
export function useReceiptImport() {
  const { t } = useI18n();
  const { configured, ensureConsent } = useAiConsent();
  const setPending = useDraftStore((s) => s.setPending);
  const [reading, setReading] = useState<PendingAttachment | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const importAttachment = useCallback(
    async (attachment: PendingAttachment) => {
      const aiAllowed = await ensureConsent();
      setReading(attachment);
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const result = await runExtraction(attachment, {
          aiAllowed,
          defaultCurrency: getSettings().defaultCurrency,
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        const messageKey = result.source === 'none' ? 'scan.failed' : result.aiError ? AI_ERROR_KEYS[result.aiError] : undefined;
        setPending({
          draft: result.draft,
          lowConfidence: result.lowConfidence,
          attachments: [attachment],
          extractionSource: result.source,
          message: messageKey ? t(messageKey) : null,
        });
        router.replace({ pathname: '/new', params: { review: '1' } });
      } catch {
        if (!controller.signal.aborted) setReading(null);
      }
    },
    [ensureConsent, setPending, t],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setReading(null);
  }, []);

  return { configured, reading, importAttachment, cancel };
}
