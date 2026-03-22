import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// SecureStore is not available on web
const secureStorage = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') return null;
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') return;
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web') return;
    return SecureStore.deleteItemAsync(key);
  },
};

export type AppLockMethod = 'biometric' | 'pin' | 'none';
export type HiddenEntryMethod = 'logo_tap' | 'decoy_pin' | 'shake' | 'none';

interface SecurityState {
  // Screenshot / recording protection
  screenshotBlocked: boolean;
  screenRecordBlocked: boolean;

  // App lock
  appLockEnabled: boolean;
  appLockMethod: AppLockMethod;
  appPinHash: string | null;
  decoyPinHash: string | null;

  // Hidden entry
  hiddenEntryMethod: HiddenEntryMethod;
  hiddenEntryConfigured: boolean;

  // Session
  sessionUnlocked: boolean;
  logoTapCount: number;

  // Actions
  setScreenshotBlocked: (val: boolean) => void;
  setScreenRecordBlocked: (val: boolean) => void;
  setAppLockEnabled: (val: boolean) => void;
  setAppLockMethod: (method: AppLockMethod) => void;
  setAppPinHash: (hash: string | null) => void;
  setDecoyPinHash: (hash: string | null) => void;
  setHiddenEntryMethod: (method: HiddenEntryMethod) => void;
  setHiddenEntryConfigured: (val: boolean) => void;
  unlockSession: () => void;
  lockSession: () => void;
  incrementLogoTap: () => void;
  resetLogoTap: () => void;
}

const useSecurityStore = create<SecurityState>()(
  persist(
    (set, get) => ({
      screenshotBlocked: true,
      screenRecordBlocked: true,
      appLockEnabled: false,
      appLockMethod: 'none',
      appPinHash: null,
      decoyPinHash: null,
      hiddenEntryMethod: 'none',
      hiddenEntryConfigured: false,
      sessionUnlocked: true,
      logoTapCount: 0,

      setScreenshotBlocked: (screenshotBlocked) => set({ screenshotBlocked }),
      setScreenRecordBlocked: (screenRecordBlocked) => set({ screenRecordBlocked }),
      setAppLockEnabled: (appLockEnabled) => set({ appLockEnabled }),
      setAppLockMethod: (appLockMethod) => set({ appLockMethod }),
      setAppPinHash: (appPinHash) => set({ appPinHash }),
      setDecoyPinHash: (decoyPinHash) => set({ decoyPinHash }),
      setHiddenEntryMethod: (hiddenEntryMethod) => set({ hiddenEntryMethod }),
      setHiddenEntryConfigured: (hiddenEntryConfigured) => set({ hiddenEntryConfigured }),
      unlockSession: () => set({ sessionUnlocked: true }),
      lockSession: () => set({ sessionUnlocked: false }),
      incrementLogoTap: () => {
        const count = get().logoTapCount + 1;
        set({ logoTapCount: count });
        // Reset after 2 seconds
        setTimeout(() => set({ logoTapCount: 0 }), 2000);
      },
      resetLogoTap: () => set({ logoTapCount: 0 }),
    }),
    {
      name: 'security-storage',
      storage: createJSONStorage(() => secureStorage),
      // Only persist non-session fields
      partialize: (state) => ({
        screenshotBlocked: state.screenshotBlocked,
        screenRecordBlocked: state.screenRecordBlocked,
        appLockEnabled: state.appLockEnabled,
        appLockMethod: state.appLockMethod,
        appPinHash: state.appPinHash,
        decoyPinHash: state.decoyPinHash,
        hiddenEntryMethod: state.hiddenEntryMethod,
        hiddenEntryConfigured: state.hiddenEntryConfigured,
      }),
    }
  )
);

export default useSecurityStore;
