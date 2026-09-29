import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ItemForm } from '@/components/form/ItemForm';
import { Icon, Text } from '@/components/ui';
import { emptyDraft } from '@/domain/types';
import { useI18n } from '@/i18n';
import { requestNotificationPermission, scheduleExpirySync } from '@/notifications/notifications';
import { persistAttachment } from '@/services/attachments';
import { useDraftStore } from '@/state/drafts';
import { useItemsStore } from '@/state/items';
import { useSettings } from '@/state/settings';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * New card form. With `?review=1` it shows a prefilled draft coming from a
 * receipt scan, link or share, highlighting low-confidence fields.
 */
export default function NewItemScreen() {
  const { review, store } = useLocalSearchParams<{ review?: string; store?: string }>();
  const { t } = useI18n();
  const { colors } = useTheme();
  const settings = useSettings();
  const create = useItemsStore((s) => s.create);
  const pending = useDraftStore((s) => s.pending);
  const setPending = useDraftStore((s) => s.setPending);
  const isReview = review === '1' && !!pending;

  const initial = useMemo(
    () => (isReview ? pending!.draft : emptyDraft({ currency: settings.defaultCurrency, storeName: store ?? '' })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isReview],
  );

  const sourceLabel = pending ? t(`scan.source.${pending.extractionSource}`) : '';

  return (
    <>
      <Stack.Screen options={{ title: isReview ? t('form.titleReview') : t('form.titleNew') }} />
      <ItemForm
        key={isReview ? 'review' : 'new'}
        mode={isReview ? 'review' : 'new'}
        initial={initial}
        lowConfidence={isReview ? pending!.lowConfidence : []}
        attachments={isReview ? pending!.attachments : []}
        banner={
          isReview && (pending!.message || pending!.extractionSource !== 'none') ? (
            <View style={styles.banner}>
              <Icon
                name={pending!.extractionSource === 'ai' ? 'sparkles-outline' : 'information-circle-outline'}
                size={16}
                color={colors.textSecondary}
              />
              <Text variant="footnote" tone="secondary" style={styles.flex}>
                {pending!.message ?? t('scan.readVia', { source: sourceLabel })}
              </Text>
            </View>
          ) : null
        }
        onSubmit={async (draft) => {
          const attachments = isReview ? await Promise.all(pending!.attachments.map(persistAttachment)) : [];
          const item = await create(draft, attachments);
          setPending(null);
          // Ask for notification permission in context: the first time a card with an expiry date is saved.
          if (draft.expiryDate && settings.expiryRemindersEnabled) requestNotificationPermission().then((ok) => ok && scheduleExpirySync());
          router.dismissAll();
          router.push(`/item/${item.id}`);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  flex: { flex: 1 },
});
