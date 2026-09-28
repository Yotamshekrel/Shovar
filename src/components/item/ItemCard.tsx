import { LinearGradient } from 'expo-linear-gradient';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, Text, tapFeedback } from '@/components/ui';
import { formatMoney } from '@/domain/money';
import { effectiveStatus, expiryTone } from '@/domain/status';
import type { Item } from '@/domain/types';
import { useI18n } from '@/i18n';
import { readableOn, shade, storeColor } from '@/theme/color';
import { useTheme } from '@/theme/ThemeProvider';

import { expiryLabel } from './labels';
import { StoreAvatar } from './StoreAvatar';

export interface ItemCardProps {
  item: Item;
  onPress: (item: Item) => void;
  hasAttachment?: boolean;
  compact?: boolean;
}

/** Wallet-style tile: brand-colored card with store, balance and expiry at a glance. */
export const ItemCard = memo(function ItemCard({ item, onPress, hasAttachment, compact }: ItemCardProps) {
  const { t, locale } = useI18n();
  const { radii } = useTheme();
  const status = effectiveStatus(item);
  const archived = status !== 'active';
  const base = archived ? '#5C6370' : storeColor(item.storeName);
  const fg = readableOn(base);
  const tone = expiryTone(item.expiryDate);
  const balance = item.balanceMinor != null ? formatMoney(item.balanceMinor, item.currency, locale) : t('balance.unknown');
  const expiry = archived ? t(`status.${status}`) : expiryLabel(t, item.expiryDate, locale);
  const urgent = !archived && (tone === 'urgent' || tone === 'soon');

  return (
    <Pressable
      testID={`item-card-${item.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${item.storeName}, ${t(`type.${item.type}`)}, ${balance}, ${expiry}`}
      onPress={() => {
        tapFeedback();
        onPress(item);
      }}
      style={({ pressed }) => [styles.pressable, { transform: [{ scale: pressed ? 0.985 : 1 }] }]}
    >
      <LinearGradient
        colors={[shade(base, 0.12), shade(base, -0.18)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, { borderRadius: radii.card, minHeight: compact ? 96 : 124 }]}
      >
        <View style={styles.topRow}>
          <StoreAvatar name={item.storeName} logoUri={item.storeLogoUri} size={38} inverted />
          <View style={styles.titleCol}>
            <Text variant="headline" color={fg} numberOfLines={1}>
              {item.storeName}
            </Text>
            <Text variant="footnote" color={fg} style={styles.muted} numberOfLines={1}>
              {t(`type.${item.type}`)}
            </Text>
          </View>
          <View style={styles.icons}>
            {item.linkUrl ? <Icon name="link" size={16} color={fg} /> : null}
            {hasAttachment ? <Icon name="receipt-outline" size={16} color={fg} /> : null}
            {item.locationMuted ? <Icon name="notifications-off-outline" size={16} color={fg} /> : null}
          </View>
        </View>
        <View style={styles.bottomRow}>
          <View style={[styles.expiryPill, urgent ? (tone === 'urgent' ? styles.expiryCritical : styles.expiryUrgent) : null]}>
            {urgent ? <Icon name="time-outline" size={13} color={tone === 'urgent' ? '#7A1111' : '#5A3A00'} /> : null}
            <Text
              variant="footnote"
              weight="600"
              color={urgent ? (tone === 'urgent' ? '#7A1111' : '#5A3A00') : fg}
              numberOfLines={1}
            >
              {expiry}
            </Text>
          </View>
          <Text variant="title" color={fg} numberOfLines={1} adjustsFontSizeToFit style={styles.balance}>
            {balance}
          </Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  pressable: { borderRadius: 20 },
  card: {
    padding: 16,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titleCol: { flex: 1, gap: 1 },
  muted: { opacity: 0.8 },
  icons: { flexDirection: 'row', gap: 8, opacity: 0.85 },
  bottomRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginTop: 14 },
  expiryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    flexShrink: 1,
  },
  expiryUrgent: { backgroundColor: '#FFE3A3' },
  expiryCritical: { backgroundColor: '#FFD4CF' },
  balance: { flexShrink: 0, maxWidth: '60%' },
});
