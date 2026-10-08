// Reanimated needs the native worklets runtime, which jest's node environment lacks.
// Tests only need the API shape, so stub it with plain React Native components.
import { View } from 'react-native';

const identity = <T>(x: T) => x;

module.exports = {
  __esModule: true,
  default: { View, createAnimatedComponent: identity },
  useSharedValue: (value: unknown) => ({ value }),
  useAnimatedStyle: () => ({}),
  useReducedMotion: () => false,
  withSpring: identity,
  withTiming: identity,
  FadeInDown: { delay: () => ({ springify: () => ({ dampingRatio: () => ({ duration: () => ({}) }) }) }) },
};
