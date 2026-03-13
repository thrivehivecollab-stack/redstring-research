// ─── Red String Research — Central Theme System ───────────────────────────────

export const accentColors = {
  crimson: '#C41E3A',
  navy: '#1E3A5F',
  forest: '#1A4731',
  amber: '#C47A1E',
  slate: '#3A4A5C',
} as const;

export type AccentColorKey = keyof typeof accentColors;

// ─── Master color palette (all hardcoded values from index.tsx + two.tsx) ─────
export const COLORS = {
  // Backgrounds
  background: '#1A1614',
  surface: '#231F1C',
  surface2: '#2D2825',
  card: '#F5ECD7',

  // Reds
  red: '#C41E3A',
  redDark: '#A3162E',
  redLight: '#E8445A',

  // Pins & gold
  pin: '#C8934A',
  pinDark: '#9B6020',
  pinLegacy: '#D4A574', // original warm tone kept for card accents
  gold: '#F0C060',

  // Text
  textLight: '#E8DCC8',
  muted: '#6B5B4F',
  cardText: '#2C1810',

  // Border
  border: '#3D332C',

  // Tag / accent shades
  blue: '#3B82F6',
  green: '#22C55E',
  amber: '#F59E0B',
  purple: '#A855F7',
  teal: '#14B8A6',
  orange: '#F97316',
  pink: '#EC4899',

  // Cork texture tones
  corkLight: '#D4B896',
  corkMid: '#B8966A',
  corkDark: '#8C6E40',

  // Tape variants
  tapeBeige: '#D4C5A9',
  tapeRed: '#C41E3A',
  tapeBlue: '#3B82F6',
  tapeYellow: '#F59E0B',
  tapePink: '#EC4899',
  tapeBlack: '#1A1A1A',

  // Accent map
  accentColors,
} as const;

// ─── Fonts ────────────────────────────────────────────────────────────────────
export const FONTS = {
  display: 'BebasNeue_400Regular',
  mono: 'CourierPrime_400Regular',
  monoBold: 'CourierPrime_700Bold',
} as const;

// ─── Hero title font system ───────────────────────────────────────────────────
export type HeroTitleFont =
  | 'playfair'
  | 'abril'
  | 'specialElite'
  | 'fjalla'
  | 'crimsonPro'
  | 'libreBaskerville'
  | 'teko';

export const HERO_FONTS: Record<HeroTitleFont, string> = {
  playfair: 'PlayfairDisplay_700Bold',
  abril: 'AbrilFatface_400Regular',
  specialElite: 'SpecialElite_400Regular',
  fjalla: 'FjallaOne_400Regular',
  crimsonPro: 'CrimsonPro_700Bold',
  libreBaskerville: 'LibreBaskerville_700Bold',
  teko: 'Teko_600SemiBold',
};

// ─── Appearance prefs (matches appearance-store shape) ───────────────────────
export interface AppearancePrefs {
  heroFont: HeroTitleFont;
  themeMode: 'dark' | 'sepia' | 'light';
  accentColor: AccentColorKey;
  corkIntensity: 0 | 1 | 2 | 3;
  tapeColor: string;
  pushpinColor: string;
  highlighterColor: string;
  fineLinkerColor: string;
}

// ─── Theme object shape ───────────────────────────────────────────────────────
export interface Theme {
  bg: string;
  surface: string;
  surface2: string;
  card: string;
  text: string;
  muted: string;
  border: string;
  cardText: string;
  accent: string;
  pin: string;
  tape: string;
  red: string;
  redDark: string;
  heroFontFamily: string;
  corkOpacity: number;
  colors: typeof COLORS;
  fonts: typeof FONTS;
}

const DARK_BASE: Omit<Theme, 'accent' | 'pin' | 'tape' | 'red' | 'redDark' | 'heroFontFamily' | 'corkOpacity' | 'colors' | 'fonts'> = {
  bg: '#1A1614',
  surface: '#231F1C',
  surface2: '#2D2825',
  card: '#F5ECD7',
  text: '#E8DCC8',
  muted: '#6B5B4F',
  border: '#3D332C',
  cardText: '#2C1810',
};

const SEPIA_BASE: typeof DARK_BASE = {
  bg: '#2B2318',
  surface: '#352B1F',
  surface2: '#3E3226',
  card: '#F0E6CC',
  text: '#D4C8A8',
  muted: '#7A6A55',
  border: '#4A3C2C',
  cardText: '#2C1810',
};

const LIGHT_BASE: typeof DARK_BASE = {
  bg: '#F5ECD7',
  surface: '#EDE3CB',
  surface2: '#E5D9C0',
  card: '#FFFFFF',
  text: '#2C1810',
  muted: '#8C7B6A',
  border: '#D4C5A9',
  cardText: '#2C1810',
};

const CORK_OPACITY_MAP: Record<0 | 1 | 2 | 3, number> = {
  0: 0,
  1: 0.08,
  2: 0.18,
  3: 0.32,
};

export function getTheme(prefs: AppearancePrefs): Theme {
  const base =
    prefs.themeMode === 'sepia'
      ? SEPIA_BASE
      : prefs.themeMode === 'light'
      ? LIGHT_BASE
      : DARK_BASE;

  const accent = accentColors[prefs.accentColor] ?? COLORS.red;

  return {
    ...base,
    accent,
    red: accent,
    redDark: accent + 'CC',
    pin: prefs.pushpinColor ?? COLORS.pin,
    tape: prefs.tapeColor ?? COLORS.tapeBeige,
    heroFontFamily: HERO_FONTS[prefs.heroFont] ?? FONTS.display,
    corkOpacity: CORK_OPACITY_MAP[prefs.corkIntensity],
    colors: COLORS,
    fonts: FONTS,
  };
}
