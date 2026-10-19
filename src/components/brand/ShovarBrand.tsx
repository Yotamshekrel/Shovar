import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { BRAND, WORDMARK_EN, WORDMARK_HE } from '@/brand/paths';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';

const TILE = 64;

/** App icon: the tilted gift card on the green gradient (same artwork as assets/brand/mark.svg). */
export function ShovarMark({ size = 34 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${TILE} ${TILE}`}>
      <Defs>
        <LinearGradient id="shovarMarkGradient" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={BRAND.gradientFrom} />
          <Stop offset="1" stopColor={BRAND.gradientTo} />
        </LinearGradient>
      </Defs>
      <Rect width={TILE} height={TILE} rx={16} fill="url(#shovarMarkGradient)" />
      <G transform="rotate(-14 32 32)">
        <Path d="M14 22a3 3 0 0 1 3-3h30a3 3 0 0 1 3 3v6a4 4 0 0 0 0 8v6a3 3 0 0 1-3 3H17a3 3 0 0 1-3-3v-6a4 4 0 0 0 0-8z" fill="#fff" />
        <Path d="M19 27h14" stroke={BRAND.green} strokeWidth={3.2} strokeLinecap="round" />
        <Path d="M19 33h9" stroke="#8FC9B5" strokeWidth={3.2} strokeLinecap="round" />
        <Circle cx={44.5} cy={32} r={3.6} fill={BRAND.green} />
      </G>
    </Svg>
  );
}

/**
 * The wordmark: "shovar" in Unbounded Bold, or שובר in Rubik Bold when the app is in Hebrew.
 * Both are outlined paths, so no font has to load. `height` is the height of the artwork's box.
 */
export function ShovarWordmark({ height = 22, color }: { height?: number; color?: string }) {
  const { lang } = useI18n();
  const { colors } = useTheme();
  const art = lang === 'he' ? WORDMARK_HE : WORDMARK_EN;
  const label = lang === 'he' ? 'שובר' : 'Shovar';
  return (
    <Svg
      height={height}
      width={(height * art.width) / art.height}
      viewBox={`0 0 ${art.width} ${art.height}`}
      accessibilityLabel={label}
      role="img"
    >
      <Path d={art.d} fill={color ?? colors.primary} />
    </Svg>
  );
}

/** Icon + wordmark, used as the home screen title. */
export function ShovarLogo({ color }: { color?: string }) {
  const { lang } = useI18n();
  return (
    <View style={styles.row} accessibilityRole="header" accessibilityLabel={lang === 'he' ? 'שובר' : 'Shovar'}>
      <ShovarMark size={34} />
      <ShovarWordmark height={lang === 'he' ? 18 : 22} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
