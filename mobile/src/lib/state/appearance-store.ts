import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { HeroFont, CorkIntensity, AccentColor } from '../theme';

interface AppearanceState {
  heroFont: HeroFont;
  themeMode: 'dark' | 'sepia' | 'light';
  accentColor: AccentColor;
  corkIntensity: CorkIntensity;
  tapeColor: string;
  pushpinColor: string;
  highlighterColor: string;
  fineLinkerColor: string;

  setHeroFont: (font: HeroFont) => void;
  setThemeMode: (mode: 'dark' | 'sepia' | 'light') => void;
  setAccentColor: (color: AccentColor) => void;
  setCorkIntensity: (intensity: CorkIntensity) => void;
  setTapeColor: (color: string) => void;
  setPushpinColor: (color: string) => void;
  setHighlighterColor: (color: string) => void;
  setFineLinkerColor: (color: string) => void;
  resetToDefaults: () => void;
}

const DEFAULTS = {
  heroFont: 'playfair' as HeroFont,
  themeMode: 'dark' as const,
  accentColor: 'crimson' as AccentColor,
  corkIntensity: 2 as CorkIntensity,
  tapeColor: '#D4C5A9',
  pushpinColor: '#C8934A',
  highlighterColor: '#FFF176',
  fineLinkerColor: '#C41E3A',
};

const useAppearanceStore = create<AppearanceState>()(
  persist(
    (set) => ({
      ...DEFAULTS,

      setHeroFont: (heroFont) => set({ heroFont }),
      setThemeMode: (themeMode) => set({ themeMode }),
      setAccentColor: (accentColor) => set({ accentColor }),
      setCorkIntensity: (corkIntensity) => set({ corkIntensity }),
      setTapeColor: (tapeColor) => set({ tapeColor }),
      setPushpinColor: (pushpinColor) => set({ pushpinColor }),
      setHighlighterColor: (highlighterColor) => set({ highlighterColor }),
      setFineLinkerColor: (fineLinkerColor) => set({ fineLinkerColor }),
      resetToDefaults: () => set({ ...DEFAULTS }),
    }),
    {
      name: 'appearance-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useAppearanceStore;
