import { router } from 'expo-router';
import { useIncomingShare } from 'expo-sharing';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ReadingView } from '@/components/scan/ReadingView';
import { Button, EmptyState, Text } from '@/components/ui';
import { normalizeExtraction } from '@/extraction/normalize';
import { parseReceiptText } from '@/extraction/textHeuristics';
import { useReceiptImport } from '@/extraction/useReceiptImport';
import { useI18n } from '@/i18n';
import { firstUrl } from '@/links/analyzeLink';
import { useLinkImport } from '@/links/useLinkImport';
import { useDraftStore } from '@/state/drafts';
import { getSettings } from '@/state/settings';
import { useTheme } from '@/theme/ThemeProvider';

type Status = 'waiting' | 'working' | 'nothing' | 'unsupported';

/**
 * Receives content shared into Shvar from WhatsApp, email, a browser or the
 * photo gallery:
 *  - a link (or a message containing one) → link import,
 *  - an image or PDF → receipt extraction,
 *  - plain text → rule-based parsing of the message.
 * Always lands on the review screen so nothing is saved without confirmation.
 */
export default function HandleShareScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { sharedPayloads, resolvedSharedPayloads, isResolving, clearSharedPayloads } = useIncomingShare();
  const { importLink } = useLinkImport();
  const { reading, importAttachment, cancel } = useReceiptImport();
  const setPending = useDraftStore((s) => s.setPending);
  const [status, setStatus] = useState<Status>('waiting');
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    const texts = sharedPayloads.filter((p) => (p.shareType ?? 'text') === 'text' || p.shareType === 'url').map((p) => p.value ?? '');
    const joined = texts.join('\n').trim();

    // Text / links are available immediately; no need to wait for resolution.
    if (joined) {
      handled.current = true;
      setStatus('working');
      clearSharedPayloads();
      const url = firstUrl(joined);
      if (url) {
        importLink(url, joined === url ? null : joined, 'share').catch(() => setStatus('unsupported'));
      } else {
        const result = normalizeExtraction(parseReceiptText(joined), { defaultCurrency: getSettings().defaultCurrency, source: 'share' });
        setPending({
          draft: { ...result.draft, notes: result.draft.notes ?? joined.slice(0, 200) },
          lowConfidence: result.lowConfidence,
          attachments: [],
          extractionSource: 'text',
        });
        router.replace({ pathname: '/new', params: { review: '1' } });
      }
      return;
    }

    if (isResolving) return;
    const file = resolvedSharedPayloads.find((p) => p.contentUri && (p.contentType === 'image' || p.contentType === 'file'));
    if (file?.contentUri) {
      const mimeType = file.contentMimeType ?? file.mimeType ?? (file.contentType === 'image' ? 'image/jpeg' : 'application/octet-stream');
      if (!mimeType.startsWith('image/') && mimeType !== 'application/pdf') {
        handled.current = true;
        clearSharedPayloads();
        setStatus('unsupported');
        return;
      }
      handled.current = true;
      clearSharedPayloads();
      setStatus('working');
      importAttachment({
        uri: file.contentUri,
        mimeType,
        kind: mimeType === 'application/pdf' ? 'document' : 'screenshot',
        sizeBytes: file.contentSize ?? null,
      });
      return;
    }

    if (sharedPayloads.length === 0 && resolvedSharedPayloads.length === 0) setStatus('nothing');
    else setStatus('unsupported');
  }, [sharedPayloads, resolvedSharedPayloads, isResolving, clearSharedPayloads, importLink, importAttachment, setPending]);

  if (reading) return <ReadingView uri={reading.mimeType.startsWith('image/') ? reading.uri : null} onCancel={cancel} />;

  if (status === 'nothing' || status === 'unsupported') {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="share-outline"
          title={t('share.title')}
          body={status === 'nothing' ? t('share.nothing') : t('share.unsupported')}
        />
        <View style={styles.actions}>
          <Button title={t('common.close')} variant="secondary" onPress={() => router.replace('/')} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.flex, styles.center, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={colors.primary} />
      <Text tone="secondary">{t('link.detecting')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  actions: { alignItems: 'center' },
});
