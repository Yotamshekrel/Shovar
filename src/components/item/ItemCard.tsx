import { LinearGradient } from 'expo-linear-gradient';
import { memo } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { Icon, PressableScale, Text, tapFeedback } from '@/components/ui';
import { formatMoney } from '@/domain/money';
import { effectiveStatus, expiryTone } from '@/domain/status';
import type { Item } from '@/domain/types';
import { useI18n } from '@/i18n';
import { readableOn, shade, storeColor } from '@/theme/color';
import { useTheme } from '@/theme/ThemeProvider';
import { elevation } from '@/theme/tokens';

import { expiryLabel } from './labels';
import { StoreAvatar } from './StoreAvatar';

export interface ItemCardProps {
  item: Item;
  onPress: (item: Item) => void;
  hasAttachment?: boolean;
  compact?: boolean;
  /** One slim row (search results): logo, name, balance — about a third of the full card's height. */
  thin?: boolean;
  /** Replaces the "type · expiry" line of the thin card (e.g. "via BuyMe"). */
  subtitle?: string | null;
  /** Thin card only: shows a round "use now" button that jumps straight to checkout. */
  onUse?: (item: Item) => void;
}

/** Wallet-style tile: brand-colored card with store, balance and expiry at a glance. */
export const ItemCard = memo(function ItemCard({ item, onPress, hasAttachment, compact, thin, subtitle, onUse }: ItemCardProps) {
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

  const showOpenLink = !archived && !!item.linkUrl;

  if (thin) {
    const canUse = !archived && !!onUse;
    return (
      <View>
        <PressableScale
          pressedScale={0.985}
          testID={`item-card-${item.id}`}
          accessibilityRole="button"
          accessibilityLabel={`${item.storeName}, ${t(`type.${item.type}`)}, ${balance}, ${expiry}`}
          onPress={() => {
            tapFeedback();
            onPress(item);
          }}
          style={styles.pressable}
        >
          <LinearGradient
            colors={[shade(base, 0.12), shade(base, -0.18)]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.thin, elevation.card, { borderRadius: radii.lg, shadowColor: base }, canUse ? styles.thinWithUse : null]}
          >
            <StoreAvatar name={item.storeName} logoUri={item.storeLogoUri} size={36} inverted />
            <View style={styles.titleCol}>
              <Text variant="bodyStrong" color={fg} numberOfLines={1}>
                {item.storeName}
              </Text>
              <Text variant="footnote" color={urgent ? '#FFE3A3' : fg} style={urgent ? undefined : styles.muted} numberOfLines={1}>
                {subtitle ?? `${t(`type.${item.type}`)} · ${expiry}`}
              </Text>
            </View>
            <Text variant="headline" numeric color={fg} numberOfLines={1} adjustsFontSizeToFit style={styles.thinBalance}>
              {balance}
            </Text>
            <View pointerEvents="none" style={[styles.edge, { borderRadius: radii.lg }]} />
          </LinearGradient>
        </PressableScale>
        {canUse ? (
          <Pressable
            testID={`search-use-${item.id}`}
            accessibilityRole="button"
            accessibilityLabel={`${t('detail.useNow')} — ${item.storeName}`}
            hitSlop={6}
            onPress={() => {
              tapFeedback();
              onUse(item);
            }}
            style={({ pressed }) => [styles.useBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <View style={styles.useCircle}>
              <Icon name="barcode-outline" size={20} color={fg} />
            </View>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View>
      <PressableScale
        pressedScale={0.98}
        testID={`item-card-${item.id}`}
        accessibilityRole="button"
        accessibilityLabel={`${item.storeName}, ${t(`type.${item.type}`)}, ${balance}, ${expiry}`}
        onPress={() => {
          tapFeedback();
          onPress(item);
        }}
        style={styles.pressable}
      >
        <LinearGradient
          colors={[shade(base, 0.12), shade(base, -0.18)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.card, elevation.card, { borderRadius: radii.card, minHeight: compact ? 96 : 124, shadowColor: base }]}
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
            <View style={[styles.icons, showOpenLink ? styles.iconsWithLink : null]}>
              {item.linkUrl && !showOpenLink ? <Icon name="link" size={16} color={fg} /> : null}
              {hasAttachment ? <Icon name="receipt-outline" size={16} color={fg} /> : null}
              {item.locationMuted ? <Icon name="notifications-off-outline" size={16} color={fg} /> : null}
            </View>
          </View>
          <View style={styles.bottomRow}>
            <View style={[styles.expiryPill, urgent ? (tone === 'urgent' ? styles.expiryCritical : styles.expiryUrgent) : null]}>
              {urgent ? <Icon name="time-outline" size={13} color={tone === 'urgent' ? '#7A1111' : '#5A3A00'} /> : null}
              <Text variant="footnote" weight="600" color={urgent ? (tone === 'urgent' ? '#7A1111' : '#5A3A00') : fg} numberOfLines={1}>
                {expiry}
              </Text>
            </View>
            <Text variant="title" numeric color={fg} numberOfLines={1} adjustsFontSizeToFit style={styles.balance}>
              {balance}
            </Text>
          </View>
          {/* Light catching the top edge of the card */}
          <View pointerEvents="none" style={[styles.edge, { borderRadius: radii.card }]} />
        </LinearGradient>
      </PressableScale>
      {showOpenLink ? (
        <Pressable
          testID={`item-open-link-${item.id}`}
          accessibilityRole="link"
          accessibilityLabel={`${t('detail.openLink')} — ${item.storeName}`}
          hitSlop={8}
          onPress={() => {
            tapFeedback();
            Linking.openURL(item.linkUrl!).catch(() => onPress(item));
          }}
          style={({ pressed }) => [styles.openLink, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Icon name="open-outline" size={14} color={fg} />
          <Text variant="footnote" weight="600" color={fg}>
            {t('common.open')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  pressable: { borderRadius: 20 },
  thin: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 64 },
  thinWithUse: { paddingEnd: 64 },
  thinBalance: { flexShrink: 0, maxWidth: '38%' },
  useBtn: { position: 'absolute', end: 8, top: 0, bottom: 0, width: 44, alignItems: 'center', justifyContent: 'center' },
  useCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },

  card: {
    padding: 16,
    justifyContent: 'space-between',
  },
  edge: { ...StyleSheet.absoluteFill, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titleCol: { flex: 1, gap: 1 },
  muted: { opacity: 0.8 },
  icons: { flexDirection: 'row', gap: 8, opacity: 0.85 },
  iconsWithLink: { marginEnd: 72 },
  openLink: {
    position: 'absolute',
    top: 18,
    end: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 14,
  },
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
