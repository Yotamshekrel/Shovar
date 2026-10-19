import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Icon, Text } from '@/components/ui';
import type { Item } from '@/domain/types';
import { useI18n } from '@/i18n';
import { getNetworkDef, networkIdFor, networkLabel, networkStoreName, networkStores, type NetworkStore } from '@/networks/registry';
import { prepareName, prepareQuery, scoreName } from '@/search/fuzzy';
import { textStart } from '@/theme/align';
import { useTheme } from '@/theme/ThemeProvider';

import { StoreAvatar } from './StoreAvatar';

const COLLAPSED = 12;
/** Tile lists this long are unreadable; search is the way to find a store beyond this. */
const EXPANDED = 150;
const MAX_RESULTS = 60;
const MIN_SCORE = 0.6;

/** "Where you can use it" for multi-store cards (BuyMe, Tav Zahav, …); renders nothing for plain cards. */
export function AcceptedStores({ item }: { item: Item }) {
  const { t, lang } = useI18n();
  const { colors, radii, typography } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const networkId = networkIdFor(item);
  const def = getNetworkDef(networkId);

  const stores = networkStores(networkId)
    .filter((s) => s.physical)
    .sort((a, b) => b.popularity - a.popularity || a.name.localeCompare(b.name));
  // Each store is searchable by every spelling (Hebrew and English), so "zara" finds "זארה" too.
  const prepared = stores.map((s) => [s.name, s.nameEn, ...s.names].filter((n): n is string => !!n).map((n) => prepareName(n)));

  const q = query.trim();
  let results: NetworkStore[] | null = null;
  if (q) {
    const pq = prepareQuery(q);
    const scored: { index: number; score: number }[] = [];
    prepared.forEach((names, index) => {
      let score = 0;
      for (const n of names) score = Math.max(score, scoreName(pq, n));
      if (score >= MIN_SCORE) scored.push({ index, score });
    });
    scored.sort((a, b) => b.score - a.score || a.index - b.index);
    results = scored.slice(0, MAX_RESULTS).map((r) => stores[r.index]);
  }

  if (!def || stores.length === 0) return null;
  const searching = results !== null;
  const shown = results ?? stores.slice(0, expanded ? EXPANDED : COLLAPSED);

  return (
    <View style={styles.wrap}>
      <Text variant="caption" tone="secondary" style={styles.title}>
        {t('detail.acceptedAt').toUpperCase()}
      </Text>
      <View style={[styles.box, { backgroundColor: colors.surface, borderRadius: radii.lg }]}>
        <View style={styles.header}>
          <View style={[styles.headerIcon, { backgroundColor: colors.primarySoft }]}>
            <Icon name="storefront-outline" size={18} color={colors.primary} />
          </View>
          <View style={styles.flex}>
            <Text variant="bodyStrong">{networkLabel(def, lang)}</Text>
            <Text variant="footnote" tone="secondary">
              {t('detail.acceptedStoresCount', { count: stores.length })}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.search,
            {
              backgroundColor: colors.surfaceAlt,
              borderRadius: radii.pill,
              borderColor: focused ? colors.primary : 'transparent',
            },
          ]}
        >
          <Icon name="search" size={18} color={focused ? colors.primary : colors.textTertiary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={t('detail.acceptedSearch')}
            placeholderTextColor={colors.textTertiary}
            selectionColor={colors.primary}
            accessibilityLabel={t('detail.acceptedSearch')}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            autoComplete="off"
            textContentType="none"
            importantForAutofill="no"
            style={[styles.input, typography.body, { color: colors.text, textAlign: textStart }]}
          />
          {query ? (
            <Pressable accessibilityRole="button" accessibilityLabel={t('common.clear')} onPress={() => setQuery('')} hitSlop={10}>
              <Icon name="close-circle" size={18} color={colors.textTertiary} />
            </Pressable>
          ) : null}
        </View>

        {searching ? (
          <Text variant="footnote" tone="secondary" style={styles.status}>
            {shown.length > 0 ? t('detail.acceptedResults', { count: shown.length }) : t('detail.acceptedNoResults', { query: q })}
          </Text>
        ) : null}

        {shown.length > 0 ? (
          <View style={styles.grid}>
            {shown.map((s) => (
              <View key={s.key} style={[styles.tile, { backgroundColor: colors.surfaceAlt, borderRadius: radii.md }]}>
                <StoreAvatar name={s.name} names={[s.nameEn]} size={32} />
                <Text variant="callout" numberOfLines={2} style={styles.storeName}>
                  {networkStoreName(s, lang)}
                </Text>
              </View>
            ))}
          </View>
        ) : searching ? (
          <View style={styles.empty}>
            <Icon name="search-outline" size={28} color={colors.textTertiary} />
            <Text variant="footnote" tone="tertiary" style={styles.emptyText}>
              {t('detail.acceptedNoResultsHint')}
            </Text>
          </View>
        ) : null}

        {!searching && stores.length > COLLAPSED ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setExpanded((v) => !v)}
            hitSlop={8}
            style={[styles.more, { backgroundColor: colors.primarySoft, borderRadius: radii.pill }]}
          >
            <Text variant="callout" color={colors.primary}>
              {expanded ? t('detail.showLess') : t('detail.showAllCount', { count: stores.length })}
            </Text>
            <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.primary} />
          </Pressable>
        ) : null}
        {!searching && expanded && stores.length > EXPANDED ? (
          <Text variant="footnote" tone="tertiary">
            {t('detail.acceptedHint')}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  flex: { flex: 1 },
  title: { paddingHorizontal: 4, letterSpacing: 0.4 },
  box: { padding: 14, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, minHeight: 44, borderWidth: 1.5 },
  input: { flex: 1, paddingVertical: 8 },
  status: { paddingHorizontal: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 },
  tile: { width: '48.5%', flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, minHeight: 48 },
  storeName: { flex: 1 },
  empty: { alignItems: 'center', gap: 6, paddingVertical: 16 },
  emptyText: { textAlign: 'center' },
  more: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10 },
});
