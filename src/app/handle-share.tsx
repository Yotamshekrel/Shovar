import { router } from 'expo-router';
import { useIncomingShare } from 'expo-sharing';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ReadingView } from '@/components/scan/ReadingView';
import { Button, EmptyState, Text } from '@/components/ui';
import { normalizeExtraction } from '@/extraction/normalize';
import { parseReceiptText } from '@/extraction/textHeuristics';
import { useReceiptImport } from '@/extraction/useReceiptImport';
import { useI18n } from '@/i18n';
import { decideShare } from '@/links/shareDecision';
import { useLinkImport } from '@/links/useLinkImport';
import { useDraftStore } from '@/state/drafts';
import { getSettings } from '@/state/settings';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Receives content shared into Shovar from WhatsApp, email, a browser or the
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
  const [failed, setFailed] = useState(false);
  const handled = useRef(false);

  const decision = useMemo(
    () => decideShare(sharedPayloads, resolvedSharedPayloads, isResolving),
    [sharedPayloads, resolvedSharedPayloads, isResolving],
  );

  useEffect(() => {
    if (handled.current) return;
    if (decision.kind === 'text') {
      handled.current = true;
      if (decision.url) {
        importLink(decision.url, decision.text === decision.url ? null : decision.text, 'share')
          .catch(() => setFailed(true))
          .finally(clearSharedPayloads);
      } else {
        const result = normalizeExtraction(parseReceiptText(decision.text), {
          defaultCurrency: getSettings().defaultCurrency,
          source: 'share',
        });
        setPending({
          draft: { ...result.draft, notes: result.draft.notes ?? decision.text.slice(0, 200) },
          lowConfidence: result.lowConfidence,
          attachments: [],
          extractionSource: 'text',
        });
        clearSharedPayloads();
        router.replace({ pathname: '/new', params: { review: '1' } });
      }
    } else if (decision.kind === 'file') {
      handled.current = true;
      importAttachment(decision.attachment).finally(clearSharedPayloads);
    }
  }, [decision, clearSharedPayloads, importLink, importAttachment, setPending]);

  if (reading) return <ReadingView uri={reading.mimeType.startsWith('image/') ? reading.uri : null} onCancel={cancel} />;

  if (failed || decision.kind === 'nothing' || decision.kind === 'unsupported') {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="share-outline"
          title={t('share.title')}
          body={decision.kind === 'nothing' ? t('share.nothing') : t('share.unsupported')}
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
