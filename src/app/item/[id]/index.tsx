import { router, Stack, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AttachmentStrip } from '@/components/item/Attachments';
import { HistoryList } from '@/components/item/HistoryList';
import { expiryLabel } from '@/components/item/labels';
import { SecretRow } from '@/components/item/SecretRow';
import { StoreAvatar } from '@/components/item/StoreAvatar';
import { Button, Divider, EmptyState, IconButton, ListRow, Section, Text, successFeedback } from '@/components/ui';
import { formatDate } from '@/domain/dates';
import { formatMoney } from '@/domain/money';
import { effectiveStatus } from '@/domain/status';
import type { Attachment, BalanceEvent } from '@/domain/types';
import { useI18n } from '@/i18n';
import { deleteAttachmentFile, persistAttachment } from '@/services/attachments';
import { getServices } from '@/services/database';
import { pickDocument } from '@/services/pickers';
import { pinCurrentLocation } from '@/location/locationService';
import { unlockForSecrets } from '@/services/security';
import { useItem, useItemsStore } from '@/state/items';
import { readableOn, shade, storeColor } from '@/theme/color';
import { useTheme } from '@/theme/ThemeProvider';
import { confirm, notify } from '@/utils/dialogs';

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = useItem(id);
  const { colors, radii } = useTheme();
  const { t, locale } = useI18n();
  const insets = useSafeAreaInsets();
  const store = useItemsStore();
  const [secrets, setSecrets] = useState<{ code: string | null; pin: string | null }>({ code: null, pin: null });
  const [events, setEvents] = useState<BalanceEvent[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const load = useCallback(async () => {
    const { items } = await getServices();
    const [full, ev, att] = await Promise.all([items.getItem(id), items.listEvents(id), items.listAttachments(id)]);
    setSecrets({ code: full?.code ?? null, pin: full?.pin ?? null });
    setEvents(ev);
    setAttachments(att);
  }, [id]);

  // Reload whenever the item changes (balance update, edit, ...).
  useEffect(() => {
    load().catch((e) => console.warn(e));
  }, [load, item?.updatedAt]);

  if (!item) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <EmptyState icon="alert-circle-outline" title={t('detail.notFound')} />
      </View>
    );
  }

  const status = effectiveStatus(item);
  const archived = status !== 'active';
  const base = archived ? '#5C6370' : storeColor(item.storeName);
  const fg = readableOn(base);
  const hasBalance = item.balanceMinor != null;
  const partiallyUsed = hasBalance && item.initialAmountMinor != null && item.initialAmountMinor !== item.balanceMinor;
  const canCheckout = !!secrets.code || !!item.linkUrl;

  const onDelete = async () => {
    const ok = await confirm({
      title: t('detail.deleteConfirmTitle'),
      message: t('detail.deleteConfirmBody'),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    for (const a of attachments) deleteAttachmentFile(a.fileName);
    await store.remove(item.id);
    router.back();
  };

  const onMarkUsed = async () => {
    const ok = await confirm({
      title: t('detail.markUsed'),
      message: t('detail.markUsedConfirm'),
      confirmText: t('detail.markUsed'),
      cancelText: t('common.cancel'),
    });
    if (ok) await store.markUsed(item.id);
  };

  const onAddAttachment = async () => {
    const res = await pickDocument('receipt');
    if (res.status !== 'picked') return;
    const saved = await persistAttachment(res.attachment);
    await store.addAttachment(item.id, saved);
    await load();
  };

  const onPinLocation = async () => {
    const pos = await pinCurrentLocation();
    if (!pos) {
      notify(t('detail.pinFailed'));
      return;
    }
    await store.update(item.id, { pinnedLat: pos.lat, pinnedLng: pos.lng });
    successFeedback();
  };

  const onRemoveAttachment = async (a: Attachment) => {
    const ok = await confirm({
      title: t('common.delete'),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    await store.removeAttachment(item.id, a.id);
    deleteAttachmentFile(a.fileName);
    await load();
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <View style={styles.headerActions}>
              <IconButton
                icon="create-outline"
                label={t('common.edit')}
                onPress={() => router.push(`/item/${item.id}/edit`)}
                testID="detail-edit"
              />
              <IconButton icon="trash-outline" label={t('common.delete')} onPress={onDelete} testID="detail-delete" />
            </View>
          ),
        }}
      />
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
      >
        <LinearGradient
          colors={[shade(base, 0.12), shade(base, -0.2)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { borderRadius: radii.card }]}
        >
          <View style={styles.heroTop}>
            <StoreAvatar name={item.storeName} logoUri={item.storeLogoUri} size={48} inverted />
            <View style={styles.flex}>
              <Text variant="title" color={fg} numberOfLines={2} accessibilityRole="header">
                {item.storeName}
              </Text>
              <Text variant="callout" color={fg} style={styles.muted}>
                {t(`type.${item.type}`)}
                {item.storeCategory ? ` · ${t(`category.${item.storeCategory}` as never)}` : ''}
              </Text>
            </View>
          </View>
          <View style={styles.heroBalance}>
            <Text variant="caption" color={fg} style={styles.muted}>
              {t('detail.balance')}
            </Text>
            <Text variant="display" color={fg} testID="detail-balance" adjustsFontSizeToFit numberOfLines={1}>
              {hasBalance ? formatMoney(item.balanceMinor, item.currency, locale) : t('balance.unknown')}
            </Text>
            {partiallyUsed ? (
              <Text variant="callout" color={fg} style={styles.muted}>
                {t('detail.of', { amount: formatMoney(item.initialAmountMinor, item.currency, locale) })}
              </Text>
            ) : null}
          </View>
          <View style={styles.pill}>
            <Text variant="footnote" weight="600" color={fg}>
              {archived ? t(`status.${status}`) : expiryLabel(t, item.expiryDate, locale)}
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.actions}>
          {!archived && canCheckout ? (
            <Button
              title={t('detail.useNow')}
              icon="barcode-outline"
              onPress={() => router.push(`/item/${item.id}/checkout`)}
              fullWidth
              testID="detail-checkout"
            />
          ) : null}
          {item.linkUrl ? (
            <Button
              title={t('detail.openLink')}
              icon="open-outline"
              variant={!archived && canCheckout && secrets.code ? 'secondary' : 'primary'}
              onPress={() => Linking.openURL(item.linkUrl!)}
              fullWidth
              testID="detail-open-link"
            />
          ) : null}
          {archived ? (
            <Button
              title={t('detail.reactivate')}
              icon="refresh"
              variant="secondary"
              onPress={() => store.reactivate(item.id)}
              fullWidth
              testID="detail-reactivate"
            />
          ) : (
            <View style={styles.row}>
              {hasBalance ? (
                <Button
                  title={t('detail.updateBalance')}
                  icon="remove-circle-outline"
                  variant="secondary"
                  size="md"
                  onPress={() => router.push(`/item/${item.id}/balance`)}
                  style={styles.flex}
                  testID="detail-balance-update"
                />
              ) : null}
              <Button
                title={t('detail.markUsed')}
                icon="checkmark-done"
                variant="secondary"
                size="md"
                onPress={onMarkUsed}
                style={styles.flex}
                testID="detail-mark-used"
              />
            </View>
          )}
        </View>

        {secrets.code || secrets.pin ? (
          <Section>
            {secrets.code ? (
              <SecretRow label={t('detail.code')} value={secrets.code} onReveal={unlockForSecrets} testID="detail-code" />
            ) : null}
            {secrets.code && secrets.pin ? <Divider inset={16} /> : null}
            {secrets.pin ? <SecretRow label={t('detail.pin')} value={secrets.pin} onReveal={unlockForSecrets} /> : null}
          </Section>
        ) : null}

        <Section>
          <ListRow
            icon="calendar-outline"
            title={t('form.expiry')}
            value={item.expiryDate ? formatDate(item.expiryDate, locale) : t('expiry.none')}
          />
          {item.purchaseDate ? (
            <>
              <Divider inset={60} />
              <ListRow icon="receipt-outline" title={t('form.purchaseDate')} value={formatDate(item.purchaseDate, locale)} />
            </>
          ) : null}
          {item.linkUrl ? (
            <>
              <Divider inset={60} />
              <ListRow
                icon="link-outline"
                title={t('detail.link')}
                value={item.linkUrl.replace(/^https?:\/\//, '')}
                onPress={() => Linking.openURL(item.linkUrl!)}
              />
            </>
          ) : null}
          <Divider inset={60} />
          <ListRow
            icon={item.locationMuted ? 'notifications-off-outline' : 'location-outline'}
            title={t('detail.locationReminders')}
            subtitle={t('detail.locationRemindersHint')}
            toggle={{ value: !item.locationMuted, onChange: (v) => store.update(item.id, { locationMuted: !v }) }}
            testID="detail-location-toggle"
          />
          {!archived && !item.locationMuted ? (
            <>
              <Divider inset={60} />
              <ListRow
                icon={item.pinnedLat != null ? 'pin' : 'pin-outline'}
                title={t('detail.pinLocation')}
                subtitle={item.pinnedLat != null ? t('detail.pinnedLocation') : t('detail.pinLocationHint')}
                onPress={onPinLocation}
                testID="detail-pin-location"
              />
            </>
          ) : null}
        </Section>

        {item.notes ? (
          <Section title={t('detail.notes')}>
            <Text variant="body" style={styles.notes}>
              {item.notes}
            </Text>
          </Section>
        ) : null}

        <View style={styles.gapSm}>
          <Text variant="caption" tone="secondary" style={styles.sectionTitle}>
            {t('detail.attachments').toUpperCase()}
          </Text>
          <AttachmentStrip attachments={attachments} onAdd={onAddAttachment} onRemove={onRemoveAttachment} />
        </View>

        {events.length > 0 ? (
          <Section title={t('detail.history')}>
            <HistoryList events={events} currency={item.currency} />
          </Section>
        ) : null}

        <Text variant="footnote" tone="tertiary" align="center">
          {t('detail.added', { date: formatDate(item.createdAt.slice(0, 10), locale) })}
        </Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, gap: 20 },
  headerActions: { flexDirection: 'row' },
  hero: { padding: 20, gap: 18, minHeight: 200 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroBalance: { gap: 2 },
  muted: { opacity: 0.85 },
  pill: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.2)' },
  actions: { gap: 10 },
  row: { flexDirection: 'row', gap: 10 },
  notes: { padding: 16 },
  gapSm: { gap: 8, marginHorizontal: -16 },
  sectionTitle: { paddingHorizontal: 32, letterSpacing: 0.4 },
});
