import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import { BRAND } from '@/brand/paths';
import { Icon, Text } from '@/components/ui';
import { formatMoney } from '@/domain/money';
import { useI18n } from '@/i18n';
import { shade } from '@/theme/color';
import { useTheme } from '@/theme/ThemeProvider';

const RING_RADII = [34, 62, 90, 118, 146];
const RING_BOX = 300;

export interface TotalCardProps {
  totals: { currency: string; totalMinor: number }[];
  count: number;
  expiringCount: number;
  onPressExpiring: () => void;
}

/**
 * The wallet's headline number. A brand-green card with an engraved ring pattern, a soft top sheen
 * and a ticket-style perforation above the details, so it reads as the "master" card of the wallet.
 */
export function TotalCard({ totals, count, expiringCount, onPressExpiring }: TotalCardProps) {
  const { colors, radii, dark } = useTheme();
  const { t, locale } = useI18n();
  const fg = colors.textOnPrimary;
  const main = totals[0];

  return (
    <View style={[styles.shadow, { borderRadius: radii.card, backgroundColor: colors.primary, shadowColor: colors.primary }]}>
      <LinearGradient
        colors={
          dark
            ? [colors.primary, shade(colors.primary, -0.1), shade(colors.primary, -0.24)]
            : [BRAND.gradientFrom, colors.primary, BRAND.gradientTo]
        }
        locations={[0, 0.45, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, { borderRadius: radii.card }]}
      >
        {/* Engraved rings, like the guilloche on a banknote, bleeding off the top corner. */}
        <Svg pointerEvents="none" width={RING_BOX} height={RING_BOX} style={styles.rings}>
          {RING_RADII.map((r, i) => (
            <Circle
              key={r}
              cx={RING_BOX / 2}
              cy={RING_BOX / 2}
              r={r}
              stroke={fg}
              strokeOpacity={0.16 - i * 0.022}
              strokeWidth={1.2}
              fill="none"
            />
          ))}
        </Svg>
        {/* Light catching the top of the card. */}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.4 }}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.eyebrowRow}>
          <View style={[styles.eyebrowIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Icon name="wallet" size={13} color={fg} />
          </View>
          <Text variant="caption" color={fg} style={styles.eyebrow}>
            {t('home.totalLabel')}
          </Text>
        </View>

        <Text variant="display" numeric color={fg} testID="total-value" adjustsFontSizeToFit numberOfLines={1} style={styles.amount}>
          {main ? formatMoney(main.totalMinor, main.currency, locale) : formatMoney(0, 'ILS', locale)}
        </Text>

        {/* Ticket perforation with side notches cut out of the card. */}
        <View style={styles.perforation}>
          <View style={[styles.notch, styles.notchStart, { backgroundColor: colors.background }]} />
          <Svg pointerEvents="none" height={2} width="100%" style={styles.dashes}>
            <Line
              x1="0"
              x2="100%"
              y1="1"
              y2="1"
              stroke={fg}
              strokeOpacity={0.4}
              strokeWidth={1.5}
              strokeDasharray="5 6"
              strokeLinecap="round"
            />
          </Svg>
          <View style={[styles.notch, styles.notchEnd, { backgroundColor: colors.background }]} />
        </View>

        <View style={styles.meta}>
          {totals.slice(1).map((x) => (
            <Text key={x.currency} variant="callout" color={fg} style={styles.muted} numeric>
              + {formatMoney(x.totalMinor, x.currency, locale)}
            </Text>
          ))}
          <Text variant="callout" color={fg} style={styles.muted}>
            {count === 1 ? t('home.itemsCountOne') : t('home.itemsCount', { count })}
          </Text>
          {expiringCount > 0 ? (
            <Pressable
              onPress={onPressExpiring}
              accessibilityRole="button"
              style={[styles.warnPill, { backgroundColor: colors.warningSoft }]}
            >
              <Icon name="time-outline" size={14} color={colors.warning} />
              <Text variant="footnote" tone="warning" weight="600">
                {t('home.expiringBanner', { count: expiringCount })}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {/* Hairline edge, like the other cards. */}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.edge, { borderRadius: radii.card }]} />
      </LinearGradient>
    </View>
  );
}

const NOTCH = 14;

const styles = StyleSheet.create({
  shadow: { shadowOpacity: 0.3, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  card: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, overflow: 'hidden' },
  rings: { position: 'absolute', top: -RING_BOX / 2 + 20, end: -RING_BOX / 2 + 40 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyebrowIcon: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 0.8, opacity: 0.9 },
  amount: { marginTop: 2 },
  perforation: { height: NOTCH, marginTop: 8, marginHorizontal: -20, justifyContent: 'center' },
  dashes: { marginHorizontal: NOTCH + 8 },
  notch: { position: 'absolute', top: 0, width: NOTCH, height: NOTCH, borderRadius: NOTCH / 2 },
  notchStart: { start: -NOTCH / 2 },
  notchEnd: { end: -NOTCH / 2 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 6 },
  muted: { opacity: 0.86 },
  warnPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  edge: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
});
