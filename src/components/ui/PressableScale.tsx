import { useState } from 'react';
import { Pressable, type GestureResponderEvent, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Critically damped (no overshoot): a press is a response to touch, not a flick.
const SPRING = { dampingRatio: 1, duration: 260 } as const;

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
  /** Scale while pressed. Larger surfaces should move less than small controls. */
  pressedScale?: number;
}

/**
 * Pressable that responds on touch-down (not on release) with a spring that
 * starts from its current value, so a quick re-tap or a cancelled press never
 * jumps. Reduced motion swaps the scale for a plain dim.
 */
export function PressableScale({ style, pressedScale = 0.97, onPressIn, onPressOut, ...rest }: PressableScaleProps) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(0);
  const [pressed, setPressed] = useState(false);

  const animated = useAnimatedStyle(() => ({
    transform: reduced ? [] : [{ scale: 1 + (pressedScale - 1) * progress.value }],
    opacity: reduced ? 1 - 0.15 * progress.value : 1,
  }));

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e: GestureResponderEvent) => {
        progress.value = withSpring(1, SPRING);
        setPressed(true);
        onPressIn?.(e);
      }}
      onPressOut={(e: GestureResponderEvent) => {
        progress.value = withSpring(0, SPRING);
        setPressed(false);
        onPressOut?.(e);
      }}
      style={[typeof style === 'function' ? style({ pressed }) : style, animated]}
    />
  );
}
