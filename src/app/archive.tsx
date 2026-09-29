import { router } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ItemCard } from '@/components/item/ItemCard';
import { EmptyState } from '@/components/ui';
import { isActive } from '@/domain/status';
import { useI18n } from '@/i18n';
import { useItemsStore } from '@/state/items';
import { useTheme } from '@/theme/ThemeProvider';

/** Used and expired items. */
export default function ArchiveScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const items = useItemsStore((s) => s.items);
  const counts = useItemsStore((s) => s.attachmentCounts);
  const archived = useMemo(() => items.filter((i) => !isActive(i)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [items]);

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <FlatList
        data={archived}
        keyExtractor={(i) => i.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        renderItem={({ item }) => (
          <ItemCard item={item} compact hasAttachment={(counts[item.id] ?? 0) > 0} onPress={(i) => router.push(`/item/${i.id}`)} />
        )}
        ListEmptyComponent={<EmptyState icon="archive-outline" title={t('archive.title')} body={t('archive.empty')} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: 16 },
  sep: { height: 12 },
});
