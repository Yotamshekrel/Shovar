import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  type SharedValue,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useCelebrate, type CelebrationKind } from '@/state/celebrate';
import { useTheme } from '@/theme/ThemeProvider';

import { ShovarMark } from '@/components/brand/ShovarBrand';

const COLORS = ['#16A87A', '#3DD6A3', '#F5B342', '#FF6B8B', '#4DA3FF', '#B07CFF', '#FFFFFF'];
const PIECES = 56;
const DURATION = 2300;

interface PieceSpec {
  /** Horizontal drift, as a fraction of the screen width. */
  vx: number;
  /** Launch height, as a fraction of the screen height. */
  vy: number;
  /** Fall (gravity), as a fraction of the screen height. */
  g: number;
  spin: number;
  size: number;
  round: boolean;
  color: string;
}

function makePieces(): PieceSpec[] {
  return Array.from({ length: PIECES }, () => ({
    vx: (Math.random() - 0.5) * 1.3,
    vy: 0.28 + Math.random() * 0.42,
    g: 0.95 + Math.random() * 0.5,
    spin: (Math.random() - 0.5) * 1440,
    size: 7 + Math.random() * 7,
    round: Math.random() < 0.3,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  }));
}

function Piece({ spec, progress, width, height }: { spec: PieceSpec; progress: SharedValue<number>; width: number; height: number }) {
  const style = useAnimatedStyle(() => {
    const t = progress.value;
    return {
      opacity: t < 0.72 ? 1 : Math.max(0, (1 - t) / 0.28),
      transform: [
        { translateX: spec.vx * width * t },
        { translateY: (-spec.vy * t + spec.g * t * t) * height },
        { rotate: `${spec.spin * t}deg` },
        { scaleY: Math.abs(Math.cos(t * 14 + spec.vx * 5)) * 0.7 + 0.3 },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        styles.piece,
        {
          width: spec.size,
          height: spec.round ? spec.size : spec.size * 1.6,
          backgroundColor: spec.color,
          borderRadius: spec.round ? spec.size / 2 : 2,
        },
        { left: width / 2 - spec.size / 2, top: height * 0.4 },
        style,
      ]}
    />
  );
}

function Burst({ onDone }: { onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const pieces = useMemo(() => makePieces(), []);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: DURATION, easing: Easing.out(Easing.quad) }, (finished) => {
      if (finished) runOnJS(onDone)();
    });
  }, [progress, onDone]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => (
        <Piece key={i} spec={p} progress={progress} width={width} height={height} />
      ))}
    </View>
  );
}

const SPARKS = 14;
const USED_DURATION = 1900;

function Spark({ index, progress, cx, cy }: { index: number; progress: SharedValue<number>; cx: number; cy: number }) {
  const { colors } = useTheme();
  const angle = (index / SPARKS) * Math.PI * 2;
  const far = index % 2 === 0 ? 150 : 105;
  const style = useAnimatedStyle(() => {
    const t = progress.value;
    return {
      opacity: t < 0.15 ? 0 : Math.max(0, 1 - (t - 0.15) / 0.85),
      transform: [{ translateX: Math.cos(angle) * far * t }, { translateY: Math.sin(angle) * far * t }, { scale: 1 - t * 0.6 }],
    };
  });
  return (
    <Animated.View
      style={[styles.spark, { left: cx - 5, top: cy - 5, backgroundColor: index % 3 === 0 ? '#F5B342' : colors.primary }, style]}
    />
  );
}

function Ring({ progress, delay, cx, cy }: { progress: SharedValue<number>; delay: number; cx: number; cy: number }) {
  const { colors } = useTheme();
  const style = useAnimatedStyle(() => {
    const t = Math.min(1, Math.max(0, (progress.value * 1100 - delay) / 900));
    return { opacity: (1 - t) * 0.5, transform: [{ scale: 1 + t * 2.2 }] };
  });
  return <Animated.View style={[styles.ring, { left: cx - 60, top: cy - 60, borderColor: colors.primary }, style]} />;
}

/** "Fully used" celebration: the app logo pops in with expanding rings and sparks, then fades out. */
function UsedBurst({ onDone }: { onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const cx = width / 2;
  const cy = height * 0.42;
  const pop = useSharedValue(0);
  const fade = useSharedValue(1);
  const burst = useSharedValue(0);

  useEffect(() => {
    pop.value = withSpring(1, { damping: 9, stiffness: 140 });
    burst.value = withDelay(150, withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) }));
    fade.value = withDelay(
      USED_DURATION - 450,
      withTiming(0, { duration: 450 }, (finished) => {
        if (finished) runOnJS(onDone)();
      }),
    );
  }, [pop, fade, burst, onDone]);

  const badge = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const wrap = useAnimatedStyle(() => ({ opacity: fade.value }));

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, wrap]}>
      <Ring progress={burst} delay={0} cx={cx} cy={cy} />
      <Ring progress={burst} delay={250} cx={cx} cy={cy} />
      {Array.from({ length: SPARKS }, (_, i) => (
        <Spark key={i} index={i} progress={burst} cx={cx} cy={cy} />
      ))}
      <Animated.View style={[styles.badge, { left: cx - 60, top: cy - 60 }, badge]}>
        <ShovarMark size={120} />
      </Animated.View>
    </Animated.View>
  );
}

/** Mounted once at the app root: plays a confetti burst over whatever screen is showing each time `celebrate()` is called. */
export function ConfettiHost() {
  const burst = useCelebrate((s) => s.burst);
  const [playing, setPlaying] = useState<{ id: number; kind: CelebrationKind } | null>(null);

  useEffect(() => {
    if (burst === 0) return;
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduce) => alive && !reduce && setPlaying({ id: burst, kind: useCelebrate.getState().kind }))
      .catch(() => alive && setPlaying({ id: burst, kind: useCelebrate.getState().kind }));
    return () => {
      alive = false;
    };
  }, [burst]);

  if (playing === null) return null;
  const done = () => setPlaying(null);
  return playing.kind === 'used' ? <UsedBurst key={playing.id} onDone={done} /> : <Burst key={playing.id} onDone={done} />;
}

const styles = StyleSheet.create({
  piece: { position: 'absolute' },
  spark: { position: 'absolute', width: 10, height: 10, borderRadius: 5 },
  ring: { position: 'absolute', width: 120, height: 120, borderRadius: 30, borderWidth: 4 },
  badge: { position: 'absolute', width: 120, height: 120 },
});
