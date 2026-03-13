import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { HeroTitleFont, AccentColorKey } from '@/lib/theme';

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

const DEFAULTS: AppearancePrefs = {
  heroFont: 'playfair',
  themeMode: 'dark',
  accentColor: 'crimson',
  corkIntensity: 3,
  tapeColor: '#D4C5A9',
  pushpinColor: '#C8934A',
  highlighterColor: '#F59E0B',
  fineLinkerColor: '#C41E3A',
};

interface AppearanceStore extends AppearancePrefs {
  setHeroFont: (font: HeroTitleFont) => void;
  setThemeMode: (mode: 'dark' | 'sepia' | 'light') => void;
  setAccentColor: (color: AccentColorKey) => void;
  setCorkIntensity: (intensity: 0 | 1 | 2 | 3) => void;
  setTapeColor: (color: string) => void;
  setPushpinColor: (color: string) => void;
  setHighlighterColor: (color: string) => void;
  setFineLinkerColor: (color: string) => void;
  resetToDefaults: () => void;
}

const useAppearanceStore = create<AppearanceStore>()(
  persist(
    (set) => ({
      ...DEFAULTS,

      setHeroFont: (font) => set({ heroFont: font }),
      setThemeMode: (mode) => set({ themeMode: mode }),
      setAccentColor: (color) => set({ accentColor: color }),
      setCorkIntensity: (intensity) => set({ corkIntensity: intensity }),
      setTapeColor: (color) => set({ tapeColor: color }),
      setPushpinColor: (color) => set({ pushpinColor: color }),
      setHighlighterColor: (color) => set({ highlighterColor: color }),
      setFineLinkerColor: (color) => set({ fineLinkerColor: color }),
      resetToDefaults: () => set({ ...DEFAULTS }),
    }),
    {
      name: 'appearance-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useAppearanceStore;
