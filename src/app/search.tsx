import { router } from 'expo-router';
import { useDeferredValue, useMemo, useRef, useState } from 'react';
import { FlatList, Keyboard, Pressable, StyleSheet, TextInput, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { expiryLabel } from '@/components/item/labels';
import { StoreAvatar } from '@/components/item/StoreAvatar';
import { Button, Icon, IconButton, Text, tapFeedback } from '@/components/ui';
import { formatMoney } from '@/domain/money';
import { expiryTone, isActive, sortItems } from '@/domain/status';
import type { Item } from '@/domain/types';
import { useI18n } from '@/i18n';
import { buildIndex, searchItems, type SearchResult } from '@/search/searchIndex';
import { useItemsStore } from '@/state/items';
import { textStart } from '@/theme/align';
import { useTheme } from '@/theme/ThemeProvider';

import { useNearbyCredit } from '@/location/useNearbyCredit';

/**
 * "Do I have credit here?" — opens with the keyboard up, matches as you type
 * (typos, partial names, Hebrew/English spellings) and shows balance + expiry
 * at a glance. One tap on "Use" jumps straight to the checkout code.
 */
export default function SearchScreen() {
  const { colors, radii, typography } = useTheme();
  const { t, locale } = useI18n();
  const insets = useSafeAreaInsets();
  const items = useItemsStore((s) => s.items);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const inputRef = useRef<TextInput>(null);
  const nearby = useNearbyCredit();

  const index = useMemo(() => buildIndex(items), [items]);
  const results = useMemo<SearchResult[]>(() => searchItems(index, deferredQuery, { limit: 30 }), [index, deferredQuery]);
  const activeItems = useMemo(
    () =>
      sortItems(
        items.filter((i) => isActive(i)),
        'store',
        locale,
      ),
    [items, locale],
  );
  const hasQuery = deferredQuery.trim().length > 0;

  const open = (item: Item) => {
    Keyboard.dismiss();
    router.push(`/item/${item.id}`);
  };

  const use = (item: Item) => {
    Keyboard.dismiss();
    router.push(`/item/${item.id}/checkout`);
  };

  const renderRow = ({ item: r }: { item: SearchResult | { item: Item; active: boolean; matched?: string; score?: number } }) => {
    const item = r.item;
    const tone = expiryTone(item.expiryDate);
    const matchedAlias = 'matched' in r && r.matched && r.matched !== item.storeName && (r.score ?? 0) >= 0.6 ? r.matched : null;
    return (
      <View style={[styles.row, { backgroundColor: colors.surface, borderRadius: radii.lg, opacity: r.active ? 1 : 0.6 }]}>
        <Pressable
          testID={`search-result-${item.id}`}
          accessibilityRole="button"
          accessibilityLabel={`${item.storeName}, ${item.balanceMinor != null ? formatMoney(item.balanceMinor, item.currency, locale) : ''}, ${expiryLabel(t, item.expiryDate, locale)}`}
          onPress={() => {
            tapFeedback();
            open(item);
          }}
          style={({ pressed }) => [styles.rowMain, { opacity: pressed ? 0.6 : 1 }]}
        >
          <StoreAvatar name={item.storeName} logoUri={item.storeLogoUri} size={44} />
          <View style={styles.rowTexts}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {item.storeName}
            </Text>
            <Text variant="footnote" tone="secondary" numberOfLines={1}>
              {matchedAlias ? `${matchedAlias} · ` : ''}
              {r.active ? t(`type.${item.type}`) : t('search.archivedMatch')}
            </Text>
          </View>
          <View style={styles.rowRight}>
            <Text variant="headline" numberOfLines={1}>
              {item.balanceMinor != null ? formatMoney(item.balanceMinor, item.currency, locale) : '—'}
            </Text>
            <Text
              variant="footnote"
              tone={!r.active ? 'tertiary' : tone === 'urgent' ? 'danger' : tone === 'soon' ? 'warning' : 'tertiary'}
              numberOfLines={1}
            >
              {r.active ? expiryLabel(t, item.expiryDate, locale) : t(`status.${item.status}`)}
            </Text>
          </View>
        </Pressable>
        {r.active ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t('detail.useNow')} — ${item.storeName}`}
            hitSlop={6}
            onPress={() => {
              tapFeedback();
              use(item);
            }}
            style={({ pressed }) => [styles.useBtn, { backgroundColor: pressed ? colors.primaryPressed : colors.primary }]}
            testID={`search-use-${item.id}`}
          >
            <Icon name="barcode-outline" size={20} color={colors.textOnPrimary} />
          </Pressable>
        ) : null}
      </View>
    );
  };

  const listData = hasQuery ? results : activeItems.map((item) => ({ item, active: true }));

  return (
    <View style={[styles.flex, { backgroundColor: colors.background, paddingTop: insets.top + 8 }]}>
      <View style={styles.searchBar}>
        <IconButton icon="arrow-back" label={t('common.back')} onPress={() => router.back()} testID="search-back" />
        <View style={[styles.inputWrap, { backgroundColor: colors.surface, borderRadius: radii.lg, borderColor: colors.primary }]}>
          <Icon name="search" size={20} color={colors.textSecondary} />
          <TextInput
            ref={inputRef}
            testID="search-input"
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder={t('search.placeholder')}
            placeholderTextColor={colors.textTertiary}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="never"
            onSubmitEditing={() => {
              const top = results[0];
              if (top) open(top.item);
            }}
            accessibilityLabel={t('search.placeholder')}
            style={[
              typography.body,
              styles.input,
              { color: colors.text, textAlign: textStart },
              Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null,
            ]}
          />
          {query ? (
            <Pressable accessibilityRole="button" accessibilityLabel={t('form.clear')} hitSlop={10} onPress={() => setQuery('')}>
              <Icon name="close-circle" size={20} color={colors.textTertiary} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <FlatList
        data={listData}
        keyExtractor={(r) => r.item.id}
        renderItem={renderRow}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListHeaderComponent={
          !hasQuery ? (
            <View style={styles.headerBlock}>
              {nearby.length > 0 ? (
                <View style={styles.nearby}>
                  <Text variant="caption" tone="secondary" style={styles.sectionTitle}>
                    {t('search.nearby').toUpperCase()}
                  </Text>
                  {nearby.map((n) => (
                    <Pressable
                      key={n.item.id}
                      onPress={() => open(n.item)}
                      accessibilityRole="button"
                      style={[styles.nearbyRow, { backgroundColor: colors.primarySoft, borderRadius: radii.lg }]}
                    >
                      <Icon name="location" size={18} color={colors.primary} />
                      <Text variant="bodyStrong" style={styles.flex} numberOfLines={1}>
                        {n.item.storeName}
                      </Text>
                      <Text variant="callout" tone="secondary">
                        {n.distanceLabel}
                      </Text>
                      <Text variant="bodyStrong">
                        {n.item.balanceMinor != null ? formatMoney(n.item.balanceMinor, n.item.currency, locale) : ''}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              {activeItems.length > 0 ? (
                <Text variant="caption" tone="secondary" style={styles.sectionTitle}>
                  {t('search.recent').toUpperCase()}
                </Text>
              ) : null}
            </View>
          ) : null
        }
        ListEmptyComponent={
          hasQuery ? (
            <View style={styles.empty} testID="search-empty">
              <Icon name="search-outline" size={36} color={colors.textTertiary} />
              <Text variant="headline" align="center">
                {t('search.noResults', { query: deferredQuery.trim() })}
              </Text>
              <Text tone="secondary" align="center">
                {t('search.noResultsHint')}
              </Text>
              <Button
                title={t('search.addFor', { query: deferredQuery.trim() })}
                icon="add"
                variant="secondary"
                size="md"
                onPress={() => router.replace({ pathname: '/new', params: { store: deferredQuery.trim() } })}
              />
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingBottom: 8 },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    height: 50,
    borderWidth: 1.5,
    marginEnd: 8,
  },
  input: { flex: 1, height: 48 },
  list: { paddingHorizontal: 16, paddingTop: 8 },
  sep: { height: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowTexts: { flex: 1, gap: 2 },
  rowRight: { alignItems: 'flex-end', gap: 2, maxWidth: '40%' },
  useBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerBlock: { gap: 12, marginBottom: 8 },
  sectionTitle: { paddingHorizontal: 4, letterSpacing: 0.4 },
  nearby: { gap: 8 },
  nearbyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 48, paddingHorizontal: 24 },
});
