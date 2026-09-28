import { router } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ItemCard } from '@/components/item/ItemCard';
import { Chip, EmptyState, Icon, IconButton, Text, tapFeedback } from '@/components/ui';
import { formatMoney, sumByCurrency } from '@/domain/money';
import { type FilterKey, type SortKey, filterItems, isActive, isExpiringSoon, sortItems } from '@/domain/status';
import type { Item } from '@/domain/types';
import { useI18n } from '@/i18n';
import { useItemsStore } from '@/state/items';
import { useSettings, useSettingsStore } from '@/state/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { create } from 'zustand';

const FILTERS: FilterKey[] = ['all', 'gift_card', 'store_credit', 'expiring'];
const SORTS: SortKey[] = ['expiry', 'store', 'balance', 'recent'];

// Filter selection is UI state only; keep it across navigation but not on disk.
const useHomeFilter = create<{ filter: FilterKey; setFilter: (f: FilterKey) => void }>((set) => ({
  filter: 'all',
  setFilter: (filter) => set({ filter }),
}));

export default function HomeScreen() {
  const { colors, radii } = useTheme();
  const { t, locale } = useI18n();
  const insets = useSafeAreaInsets();
  const items = useItemsStore((s) => s.items);
  const attachmentCounts = useItemsStore((s) => s.attachmentCounts);
  const { sort } = useSettings();
  const patchSettings = useSettingsStore((s) => s.patch);
  const { filter, setFilter } = useHomeFilter();

  const active = useMemo(() => items.filter((i) => isActive(i)), [items]);
  const visible = useMemo(() => sortItems(filterItems(active, filter), sort, locale), [active, filter, sort, locale]);
  const totals = useMemo(() => sumByCurrency(active), [active]);
  const expiringCount = useMemo(() => active.filter((i) => isExpiringSoon(i)).length, [active]);
  const archivedCount = items.length - active.length;

  const openItem = (item: Item) => router.push(`/item/${item.id}`);
  const cycleSort = () => {
    const next = SORTS[(SORTS.indexOf(sort) + 1) % SORTS.length];
    patchSettings({ sort: next });
  };

  const header = (
    <View style={styles.header}>
      <View style={styles.topBar}>
        <Text variant="title" accessibilityRole="header">
          {t('app.name')}
        </Text>
        <View style={styles.topActions}>
          {archivedCount > 0 ? (
            <IconButton icon="archive-outline" label={t('home.archive')} onPress={() => router.push('/archive')} testID="open-archive" />
          ) : null}
          <IconButton icon="settings-outline" label={t('home.settings')} onPress={() => router.push('/settings')} testID="open-settings" />
        </View>
      </View>

      <View style={[styles.totalCard, { backgroundColor: colors.surface, borderRadius: radii.card, borderColor: colors.border }]}>
        <Text variant="caption" tone="secondary">
          {t('home.totalLabel')}
        </Text>
        <Text variant="display" testID="total-value" adjustsFontSizeToFit numberOfLines={1}>
          {totals.length > 0 ? formatMoney(totals[0].totalMinor, totals[0].currency, locale) : formatMoney(0, 'ILS', locale)}
        </Text>
        <View style={styles.totalMeta}>
          {totals.slice(1).map((x) => (
            <Text key={x.currency} variant="callout" tone="secondary">
              + {formatMoney(x.totalMinor, x.currency, locale)}
            </Text>
          ))}
          <Text variant="callout" tone="secondary">
            {active.length === 1 ? t('home.itemsCountOne') : t('home.itemsCount', { count: active.length })}
          </Text>
          {expiringCount > 0 ? (
            <Pressable onPress={() => setFilter('expiring')} accessibilityRole="button" style={[styles.warnPill, { backgroundColor: colors.warningSoft }]}>
              <Icon name="time-outline" size={14} color={colors.warning} />
              <Text variant="footnote" tone="warning" weight="600">
                {t('home.expiringBanner', { count: expiringCount })}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <Pressable
        testID="home-search"
        accessibilityRole="search"
        accessibilityLabel={t('home.searchPlaceholder')}
        onPress={() => {
          tapFeedback();
          router.push('/search');
        }}
        style={({ pressed }) => [
          styles.search,
          { backgroundColor: pressed ? colors.surfacePressed : colors.surface, borderRadius: radii.lg, borderColor: colors.border },
        ]}
      >
        <Icon name="search" size={20} color={colors.textSecondary} />
        <Text variant="body" tone="tertiary" style={styles.flex}>
          {t('home.searchPlaceholder')}
        </Text>
      </Pressable>

      {active.length > 0 ? (
        <View style={styles.chipsRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.flex} contentContainerStyle={styles.chips}>
            {FILTERS.map((f) => (
              <Chip key={f} label={t(`home.filter.${f}`)} selected={filter === f} onPress={() => setFilter(f)} testID={`filter-${f}`} />
            ))}
          </ScrollView>
          <Pressable onPress={cycleSort} accessibilityRole="button" hitSlop={8} style={styles.sortBtn} testID="sort-toggle">
            <Icon name="swap-vertical" size={16} color={colors.textSecondary} />
            <Text variant="caption" tone="secondary">
              {t(`home.sort.${sort}`)}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <FlatList
        data={visible}
        keyExtractor={(i) => i.id}
        contentContainerStyle={[styles.list, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 110 }]}
        ListHeaderComponent={header}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        renderItem={({ item }) => <ItemCard item={item} onPress={openItem} hasAttachment={(attachmentCounts[item.id] ?? 0) > 0} />}
        ListEmptyComponent={
          active.length === 0 ? (
            <EmptyState
              icon="wallet-outline"
              title={t('home.empty.title')}
              body={t('home.empty.body')}
              actionTitle={t('home.empty.cta')}
              onAction={() => router.push('/add')}
            />
          ) : (
            <Text tone="secondary" align="center" style={styles.emptyFilter}>
              {t('home.emptyFilter')}
            </Text>
          )
        }
      />
      <Pressable
        testID="fab-add"
        accessibilityRole="button"
        accessibilityLabel={t('home.add')}
        onPress={() => {
          tapFeedback();
          router.push('/add');
        }}
        style={({ pressed }) => [
          styles.fab,
          { bottom: insets.bottom + 24, backgroundColor: pressed ? colors.primaryPressed : colors.primary, shadowColor: colors.shadow },
        ]}
      >
        <Icon name="add" size={32} color={colors.textOnPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { paddingHorizontal: 16 },
  header: { gap: 16, marginBottom: 16 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingStart: 4 },
  topActions: { flexDirection: 'row', gap: 4 },
  totalCard: { padding: 18, gap: 2, borderWidth: StyleSheet.hairlineWidth },
  totalMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 6 },
  warnPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, height: 54, borderWidth: 1 },
  chipsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chips: { gap: 8, paddingEnd: 8 },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 8 },
  sep: { height: 12 },
  emptyFilter: { paddingVertical: 40 },
  fab: {
    position: 'absolute',
    end: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});
