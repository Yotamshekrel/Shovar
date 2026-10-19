import { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { WORDMARK_EN } from '@/brand/paths';
import { useTheme } from '@/theme/ThemeProvider';

import { ShovarMark } from './ShovarBrand';

const MARK = 68;
const WORD_H = 30;
const WORD_W = (WORD_H * WORDMARK_EN.width) / WORDMARK_EN.height;
const GAP = 12;
/** How long the logo lingers once it is fully drawn. */
const HOLD = 550;

/**
 * Launch screen: the app icon pops in, then slides aside as the English "shovar" name unrolls beside it.
 * Sits over the app until it is ready (and the animation has played), then fades away. The native splash is just
 * the plain background, so the hand-off is seamless.
 */
export function AnimatedSplash({ ready, onShown, onFinish }: { ready: boolean; onShown: () => void; onFinish: () => void }) {
  const { colors } = useTheme();
  const pop = useSharedValue(0);
  const reveal = useSharedValue(0);
  const fade = useSharedValue(1);
  const [played, setPlayed] = useState(false);

  useEffect(() => {
    let alive = true;
    const done = () => alive && setPlayed(true);
    const afterReveal = () => setTimeout(done, HOLD);
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (!alive) return;
        if (reduce) {
          pop.value = 1;
          reveal.value = 1;
          setTimeout(done, 600);
          return;
        }
        pop.value = withSpring(1, { damping: 11, stiffness: 150 });
        reveal.value = withDelay(
          420,
          withTiming(1, { duration: 750, easing: Easing.out(Easing.cubic) }, (finished) => {
            if (finished) runOnJS(afterReveal)();
          }),
        );
      });
    return () => {
      alive = false;
    };
  }, [pop, reveal]);

  useEffect(() => {
    if (!(played && ready)) return;
    fade.value = withTiming(0, { duration: 320 }, (finished) => {
      if (finished) runOnJS(onFinish)();
    });
  }, [played, ready, fade, onFinish]);

  const wrap = useAnimatedStyle(() => ({ opacity: fade.value }));
  const mark = useAnimatedStyle(() => ({ transform: [{ scale: 0.4 + 0.6 * pop.value }], opacity: Math.min(1, pop.value * 2) }));
  const word = useAnimatedStyle(() => ({ width: WORD_W * reveal.value, marginStart: GAP * reveal.value }));
  const wordInner = useAnimatedStyle(() => ({ opacity: reveal.value, transform: [{ translateX: -24 * (1 - reveal.value) }] }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: colors.background }, wrap]} onLayout={onShown}>
      <View style={styles.row} accessibilityRole="header" accessibilityLabel="Shovar">
        <Animated.View style={mark}>
          <ShovarMark size={MARK} />
        </Animated.View>
        <Animated.View style={[styles.word, word]}>
          <Animated.View style={wordInner}>
            <Svg width={WORD_W} height={WORD_H} viewBox={`0 0 ${WORDMARK_EN.width} ${WORDMARK_EN.height}`}>
              <Path d={WORDMARK_EN.d} fill={colors.primary} />
            </Svg>
          </Animated.View>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  // The lockup is English whatever the app language, so keep it left-to-right.
  row: { flexDirection: 'row', alignItems: 'center', direction: 'ltr' },
  word: { height: WORD_H, overflow: 'hidden', justifyContent: 'center' },
});
