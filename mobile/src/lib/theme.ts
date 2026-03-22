export const COLORS = {
  // Backgrounds
  bg: '#0F0D0B',
  bg2: '#141210',
  surface: '#1A1714',
  surface2: '#211E1A',
  surface3: '#2A2520',

  // Text
  text: '#EDE0CC',
  text2: '#C4B49A',
  muted: '#6B5D4F',

  // Borders
  border: '#272320',
  border2: '#322D28',

  // Brand
  red: '#C41E3A',
  redDim: 'rgba(196,30,58,0.12)',
  redGlow: 'rgba(196,30,58,0.25)',

  // Accents
  pin: '#C8934A',
  gold: '#D4A832',
  amber: '#D4962A',

  // Card (paper/cork)
  card: '#F2E8D5',
  cardDark: '#E8D9BE',
  cardText: '#1C1008',
  cardMuted: 'rgba(44,24,16,0.5)',

  // Status
  green: '#4CAF72',
  blue: '#4A90D9',
} as const;

export type ThemeMode = 'dark';
export type AccentColor = 'crimson' | 'navy' | 'forest' | 'amber' | 'slate';
export type CorkIntensity = 0 | 1 | 2 | 3;
export type HeroFont =
  | 'playfair'
  | 'abril'
  | 'specialElite'
  | 'fjalla'
  | 'crimsonPro'
  | 'libreBaskerville'
  | 'teko';

export const HERO_FONT_STYLES: Record<HeroFont, object> = {
  playfair:         { fontWeight: '700' as const },
  abril:            { fontWeight: '900' as const, fontSize: 24 },
  specialElite:     { fontFamily: 'Courier New', fontStyle: 'italic' as const },
  fjalla:           { fontWeight: '800' as const, letterSpacing: 1 },
  crimsonPro:       { fontWeight: '700' as const, fontStyle: 'italic' as const },
  libreBaskerville: { fontWeight: '700' as const },
  teko:             { fontWeight: '900' as const, letterSpacing: 2, textTransform: 'uppercase' as const },
};

export const HERO_FONT_LABELS: Record<HeroFont, string> = {
  playfair:         'Playfair Display',
  abril:            'Abril Fatface',
  specialElite:     'Special Elite',
  fjalla:           'Fjalla One',
  crimsonPro:       'Crimson Pro',
  libreBaskerville: 'Libre Baskerville',
  teko:             'Teko Bold',
};

// Backward-compat aliases used by existing screens
export type HeroTitleFont = HeroFont;
export type AccentColorKey = AccentColor;

export const HERO_FONT_VIBES: Record<HeroFont, string> = {
  playfair:         'editorial · dramatic',
  abril:            'bold · commanding',
  specialElite:     'typewriter · gritty',
  fjalla:           'condensed · urgent',
  crimsonPro:       'elegant · case-file',
  libreBaskerville: 'authoritative · press',
  teko:             'military · all-caps',
};
