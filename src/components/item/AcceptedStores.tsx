import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Chip, Text } from '@/components/ui';
import type { Item } from '@/domain/types';
import { useI18n } from '@/i18n';
import { getNetworkDef, networkIdFor, networkLabel, networkStoreName, networkStores } from '@/networks/registry';
import { useTheme } from '@/theme/ThemeProvider';

const COLLAPSED = 16;
/** Chip lists this long are unreadable; the search screen answers "does it work at X?" better. */
const EXPANDED = 150;

/** "Where you can use it" for multi-store cards (BuyMe, Tav Zahav, …); renders nothing for plain cards. */
export function AcceptedStores({ item }: { item: Item }) {
  const { t, lang } = useI18n();
  const { colors, radii } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const networkId = networkIdFor(item);
  const def = getNetworkDef(networkId);
  const stores = networkStores(networkId)
    .filter((s) => s.physical)
    .sort((a, b) => b.popularity - a.popularity || a.name.localeCompare(b.name));
  if (!def || stores.length === 0) return null;
  const shown = stores.slice(0, expanded ? EXPANDED : COLLAPSED);

  return (
    <View style={styles.wrap}>
      <Text variant="caption" tone="secondary" style={styles.title}>
        {t('detail.acceptedAt').toUpperCase()}
      </Text>
      <View style={[styles.box, { backgroundColor: colors.surface, borderRadius: radii.lg }]}>
        <Text variant="callout" tone="secondary">
          {t('detail.acceptedCount', { count: stores.length, card: networkLabel(def, lang) })}
        </Text>
        <View style={styles.chips}>
          {shown.map((s) => (
            <Chip key={s.key} label={networkStoreName(s, lang)} />
          ))}
        </View>
        {stores.length > COLLAPSED ? (
          <Pressable accessibilityRole="button" onPress={() => setExpanded((v) => !v)} hitSlop={8}>
            <Text variant="callout" color={colors.primary}>
              {expanded ? t('detail.showLess') : t('detail.showAll')}
            </Text>
          </Pressable>
        ) : null}
        {expanded && stores.length > EXPANDED ? (
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
  title: { paddingHorizontal: 4, letterSpacing: 0.4 },
  box: { padding: 14, gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
