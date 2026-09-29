import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ItemForm } from '@/components/form/ItemForm';
import { Text } from '@/components/ui';
import type { Item, ItemDraft } from '@/domain/types';
import { useI18n } from '@/i18n';
import { getServices } from '@/services/database';
import { useItemsStore } from '@/state/items';

export default function EditItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useI18n();
  const update = useItemsStore((s) => s.update);
  const [item, setItem] = useState<Item | null | undefined>(undefined);

  useEffect(() => {
    // Load with secrets decrypted (the in-memory list never holds codes).
    getServices()
      .then(({ items }) => items.getItem(id))
      .then(setItem)
      .catch(() => setItem(null));
  }, [id]);

  if (item === undefined) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }
  if (item === null) {
    return (
      <View style={styles.center}>
        <Text tone="secondary">{t('detail.notFound')}</Text>
      </View>
    );
  }

  const initial: ItemDraft = {
    type: item.type,
    storeName: item.storeName,
    storeCategory: item.storeCategory,
    amountMinor: item.initialAmountMinor,
    balanceMinor: item.balanceMinor,
    currency: item.currency,
    expiryDate: item.expiryDate,
    purchaseDate: item.purchaseDate,
    code: item.code,
    pin: item.pin,
    barcodeFormat: item.barcodeFormat,
    linkUrl: item.linkUrl,
    notes: item.notes,
    source: item.source,
  };

  return (
    <ItemForm
      mode="edit"
      initial={initial}
      onSubmit={async (draft) => {
        await update(item.id, {
          ...draft,
          // An empty balance field in edit mode means "same as amount" only for untouched items.
          balanceMinor: draft.balanceMinor,
        });
        router.back();
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
