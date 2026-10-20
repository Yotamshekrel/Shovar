import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

export const WALLET_W = 112;
export const WALLET_H = 76;

export interface WalletHit {
  /** Bumped on every catch so the same kind twice in a row still animates. */
  n: number;
  kind: 'good' | 'tax';
}

/**
 * The game's wallet: a leather wallet with a stitched flap, a gold clasp and a banknote peeking out.
 * It leans into the direction it is dragged, squashes when it swallows a coin and shakes red on a tax.
 */
export function CoinWallet({ x, hit, symbol }: { x: number; hit: WalletHit; symbol: string }) {
  const tilt = useSharedValue(0);
  const squash = useSharedValue(1);
  const hop = useSharedValue(0);
  const shake = useSharedValue(0);
  const flash = useSharedValue(0);
  const prevX = useRef(x);

  useEffect(() => {
    const dx = x - prevX.current;
    prevX.current = x;
    if (Math.abs(dx) < 0.5) return;
    const lean = Math.max(-16, Math.min(16, dx * 1.1));
    tilt.value = withSequence(withTiming(lean, { duration: 60 }), withSpring(0, { damping: 7, stiffness: 140 }));
  }, [x, tilt]);

  useEffect(() => {
    if (hit.n === 0) return;
    if (hit.kind === 'good') {
      squash.value = withSequence(withTiming(0.84, { duration: 70 }), withSpring(1, { damping: 4, stiffness: 220 }));
      hop.value = withSequence(withTiming(-7, { duration: 70 }), withSpring(0, { damping: 6, stiffness: 240 }));
    } else {
      shake.value = withSequence(
        withTiming(-9, { duration: 45 }),
        withTiming(9, { duration: 70 }),
        withTiming(-6, { duration: 60 }),
        withTiming(0, { duration: 50 }),
      );
      flash.value = withSequence(withTiming(0.55, { duration: 60 }), withTiming(0, { duration: 380 }));
    }
  }, [hit, squash, hop, shake, flash]);

  const body = useAnimatedStyle(() => ({
    transform: [
      { translateX: shake.value },
      { translateY: hop.value },
      { rotate: `${tilt.value}deg` },
      { scaleY: squash.value },
      { scaleX: 1 + (1 - squash.value) * 0.6 },
    ],
  }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));

  return (
    <Animated.View style={[styles.root, body]}>
      <Svg width={WALLET_W} height={WALLET_H} viewBox="0 0 112 76">
        <Defs>
          <LinearGradient id="leather" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#9A6330" />
            <Stop offset="1" stopColor="#5C3516" />
          </LinearGradient>
          <LinearGradient id="flap" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#B5773A" />
            <Stop offset="1" stopColor="#8A5524" />
          </LinearGradient>
          <LinearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FFE08A" />
            <Stop offset="1" stopColor="#D49A1E" />
          </LinearGradient>
        </Defs>

        <Ellipse cx="56" cy="73" rx="44" ry="3.5" fill="#000" opacity="0.18" />

        {/* Banknote sticking out of the top. */}
        <G rotation="-6" origin="42, 22">
          <Rect x="24" y="2" width="46" height="28" rx="3.5" fill="#86D08F" stroke="#4E9F5B" strokeWidth="1.5" />
          <Circle cx="47" cy="16" r="8" fill="none" stroke="#4E9F5B" strokeWidth="1.5" />
          <SvgText x="47" y="20.5" fontSize="12" fontWeight="700" fill="#3C8548" textAnchor="middle">
            {symbol}
          </SvgText>
        </G>

        {/* Leather body and the dark inside of the opening. */}
        <Rect x="3" y="18" width="106" height="54" rx="15" fill="url(#leather)" />
        <Path d="M3 33 Q3 18 18 18 H94 Q109 18 109 33 Z" fill="#3A210C" opacity="0.55" />

        {/* Front flap with stitching. */}
        <Path d="M3 34 Q3 27 11 27 H101 Q109 27 109 34 V50 Q109 58 101 58 H11 Q3 58 3 50 Z" fill="url(#flap)" />
        <Path
          d="M9 34 Q9 31 12 31 H100 Q103 31 103 34 V50 Q103 54 100 54 H12 Q9 54 9 50 Z"
          fill="none"
          stroke="#F0CF98"
          strokeWidth="1.3"
          strokeDasharray="3.5 3"
          strokeLinecap="round"
        />

        {/* Clasp. */}
        <Circle cx="94" cy="42" r="8.5" fill="url(#gold)" stroke="#A8761A" strokeWidth="1.2" />
        <Circle cx="94" cy="42" r="3.4" fill="#A8761A" opacity="0.55" />

        {/* Soft gloss along the top edge. */}
        <Path d="M12 30 H78" stroke="#fff" strokeOpacity="0.28" strokeWidth="2.2" strokeLinecap="round" />
      </Svg>
      <Animated.View pointerEvents="none" style={[styles.flash, flashStyle]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { width: WALLET_W, height: WALLET_H },
  flash: {
    position: 'absolute',
    left: 3,
    top: 18,
    width: 106,
    height: 54,
    borderRadius: 15,
    backgroundColor: '#E5313A',
  },
});
