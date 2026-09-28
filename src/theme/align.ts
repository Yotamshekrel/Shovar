import { Platform, type TextStyle } from 'react-native';

/**
 * Logical text alignment. On iOS/Android, React Native treats `left` as
 * "start" and flips it in RTL layouts; react-native-web needs the CSS logical
 * values instead.
 */
export const textStart: TextStyle['textAlign'] = Platform.OS === 'web' ? ('start' as TextStyle['textAlign']) : 'left';
export const textEnd: TextStyle['textAlign'] = Platform.OS === 'web' ? ('end' as TextStyle['textAlign']) : 'right';
