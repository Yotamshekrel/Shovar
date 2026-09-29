import { router } from 'expo-router';
import { useCallback, useState } from 'react';

import { useDraftStore } from '@/state/drafts';
import { getSettings } from '@/state/settings';

import { analyzeLink } from './analyzeLink';
import { fetchPageMeta } from './fetchPageMeta';

/** Link (or shared message with a link) → prefilled review screen. */
export function useLinkImport() {
  const setPending = useDraftStore((s) => s.setPending);
  const [busy, setBusy] = useState(false);

  const importLink = useCallback(
    async (url: string, sharedText?: string | null, source: 'link' | 'share' = 'link') => {
      setBusy(true);
      try {
        const page = await fetchPageMeta(url);
        const result = analyzeLink({ url, sharedText, page, defaultCurrency: getSettings().defaultCurrency, source });
        setPending({
          draft: result.draft,
          lowConfidence: result.lowConfidence,
          attachments: [],
          extractionSource: 'link',
          message: null,
        });
        router.replace({ pathname: '/new', params: { review: '1' } });
      } finally {
        setBusy(false);
      }
    },
    [setPending],
  );

  return { busy, importLink };
}
