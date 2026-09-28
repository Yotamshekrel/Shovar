/**
 * Design tokens. Wallet-inspired: calm neutral canvas, colorful card tiles,
 * one confident accent for the primary action.
 */

export interface Palette {
  background: string;
  surface: string;
  surfaceAlt: string;
  surfacePressed: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  textOnPrimary: string;
  border: string;
  borderStrong: string;
  primary: string;
  primaryPressed: string;
  primarySoft: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  warningSoft: string;
  success: string;
  successSoft: string;
  highlight: string;
  highlightBorder: string;
  overlay: string;
  shadow: string;
  skeleton: string;
}

export const lightPalette: Palette = {
  background: '#F4F5F7',
  surface: '#FFFFFF',
  surfaceAlt: '#ECEEF2',
  surfacePressed: '#E2E5EA',
  text: '#0E1116',
  textSecondary: '#555D6B',
  textTertiary: '#7D8594',
  textOnPrimary: '#FFFFFF',
  border: '#E1E4E9',
  borderStrong: '#C9CED6',
  primary: '#0A7A5C',
  primaryPressed: '#07654C',
  primarySoft: '#DDF2EA',
  danger: '#C8282E',
  dangerSoft: '#FBE4E4',
  warning: '#A45F00',
  warningSoft: '#FFF1D6',
  success: '#157F3B',
  successSoft: '#DDF4E3',
  highlight: '#FFF6DF',
  highlightBorder: '#E7A93A',
  overlay: 'rgba(8, 10, 14, 0.45)',
  shadow: '#0E1116',
  skeleton: '#E4E7EC',
};

export const darkPalette: Palette = {
  background: '#0B0D10',
  surface: '#16191E',
  surfaceAlt: '#1F2329',
  surfacePressed: '#282D34',
  text: '#F3F5F8',
  textSecondary: '#AAB2BF',
  textTertiary: '#7F8896',
  textOnPrimary: '#04140F',
  border: '#262B32',
  borderStrong: '#394049',
  primary: '#3DD6A3',
  primaryPressed: '#2FB98B',
  primarySoft: '#10362B',
  danger: '#FF6B6B',
  dangerSoft: '#3A1718',
  warning: '#F5B342',
  warningSoft: '#3A2A0D',
  success: '#4ADE80',
  successSoft: '#12311D',
  highlight: '#2E2710',
  highlightBorder: '#D9A13A',
  overlay: 'rgba(0, 0, 0, 0.6)',
  shadow: '#000000',
  skeleton: '#20252C',
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  card: 20,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: '700' as const, letterSpacing: -0.5 },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700' as const, letterSpacing: -0.3 },
  headline: { fontSize: 18, lineHeight: 24, fontWeight: '600' as const },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' as const },
  bodyStrong: { fontSize: 16, lineHeight: 22, fontWeight: '600' as const },
  callout: { fontSize: 15, lineHeight: 20, fontWeight: '400' as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' as const },
  footnote: { fontSize: 12, lineHeight: 16, fontWeight: '400' as const },
  mono: { fontSize: 22, lineHeight: 30, fontWeight: '600' as const, letterSpacing: 1.5 },
} as const;

export type TypographyVariant = keyof typeof typography;

/** Deep, saturated tile colors for stores without a known brand color. */
export const TILE_COLORS = [
  '#2F4858',
  '#3D5A80',
  '#5E4B8B',
  '#1B4D3E',
  '#7F5539',
  '#8E2A3B',
  '#005F73',
  '#3A2E8C',
  '#6B2D5C',
  '#3F4E1F',
  '#264653',
  '#6D597A',
] as const;
