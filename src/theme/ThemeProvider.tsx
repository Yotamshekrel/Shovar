import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { useSettings } from '@/state/settings';

import { darkPalette, lightPalette, radii, spacing, typography, type Palette } from './tokens';

export interface Theme {
  dark: boolean;
  colors: Palette;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
}

const ThemeContext = createContext<Theme>({
  dark: false,
  colors: lightPalette,
  spacing,
  radii,
  typography,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const { theme: pref } = useSettings();
  const dark = pref === 'system' ? system === 'dark' : pref === 'dark';
  const value = useMemo<Theme>(
    () => ({ dark, colors: dark ? darkPalette : lightPalette, spacing, radii, typography }),
    [dark],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
