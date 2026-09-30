import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

const light = {
  dark: false,
  bg: '#F3F8FD',
  bgAlt: '#E8F2FB',
  card: '#FFFFFF',
  cardAlt: '#F6FAFE',
  ink: '#0B2540',
  inkSoft: '#3A5470',
  muted: '#7C91A8',
  line: '#E1ECF6',
  brand: '#0073B1',
  brandDeep: '#1F75BE',
  sky: '#03ADEE',
  skySoft: '#E1F4FD',
  danger: '#E5484D',
  dangerSoft: '#FDECEC',
  success: '#16A34A',
  successSoft: '#E6F7EC',
  warn: '#D97706',
  warnSoft: '#FFF4DE',
  white: '#FFFFFF',
  overlay: 'rgba(6, 24, 44, 0.5)',
  heroA: '#0B5DA6',
  heroB: '#05A9EA',
  shadow: '#0B4A7A',
};

export type Palette = typeof light;

const dark: Palette = {
  dark: true,
  bg: '#06101C',
  bgAlt: '#0A1827',
  card: '#0F1E30',
  cardAlt: '#142740',
  ink: '#EAF3FB',
  inkSoft: '#B8C9DB',
  muted: '#7F95AD',
  line: '#1B2E45',
  brand: '#4CC3F5',
  brandDeep: '#1F75BE',
  sky: '#22B8F0',
  skySoft: '#0D2A42',
  danger: '#FF6B6F',
  dangerSoft: '#3A171A',
  success: '#34D399',
  successSoft: '#0C2E23',
  warn: '#FBBF24',
  warnSoft: '#33270B',
  white: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.62)',
  heroA: '#0A4C8A',
  heroB: '#0790CC',
  shadow: '#000000',
};

export type ThemePref = 'system' | 'light' | 'dark';

interface ThemeValue {
  t: Palette;
  pref: ThemePref;
  setPref: (p: ThemePref) => void;
}

const ThemeContext = createContext<ThemeValue>({ t: light, pref: 'system', setPref: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [pref, setPref] = useState<ThemePref>('system');
  const isDark = pref === 'dark' || (pref === 'system' && system === 'dark');
  const value = useMemo(() => ({ t: isDark ? dark : light, pref, setPref }), [isDark, pref]);
  return React.createElement(ThemeContext.Provider, { value }, children);
}

export const useTheme = () => useContext(ThemeContext);

/** Memoized, theme-aware StyleSheet: `const s = useStyles(makeStyles)`. */
export function useStyles<T>(factory: (t: Palette) => T): T {
  const { t } = useTheme();
  return useMemo(() => factory(t), [factory, t]);
}

export function shadow(t: Palette, level: 1 | 2 = 1) {
  return {
    shadowColor: t.shadow,
    shadowOpacity: t.dark ? 0.45 : level === 1 ? 0.08 : 0.16,
    shadowRadius: level === 1 ? 12 : 22,
    shadowOffset: { width: 0, height: level === 1 ? 4 : 10 },
    elevation: level === 1 ? 3 : 8,
  };
}

/** Accent colors a user can give to each clone. */
export const cloneColors = [
  '#03ADEE',
  '#1F75BE',
  '#7C5CFF',
  '#FF5C8A',
  '#FF8A3D',
  '#22C55E',
  '#14B8A6',
  '#F5B301',
];

export const radius = { sm: 12, md: 18, lg: 26, xl: 34 };

/** Apps people most often want a second account of — surfaced first in the picker. */
export const popularPackages = [
  'com.whatsapp',
  'com.whatsapp.w4b',
  'org.telegram.messenger',
  'com.instagram.android',
  'com.facebook.katana',
  'com.facebook.orca',
  'com.zhiliaoapp.musically',
  'com.ss.android.ugc.trill',
  'com.snapchat.android',
  'com.twitter.android',
  'com.viber.voip',
  'com.discord',
  'com.linkedin.android',
  'com.facebook.lite',
  'com.instagram.barcelona',
];
