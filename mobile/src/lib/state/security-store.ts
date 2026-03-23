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

export type AppLockMethod = 'biometric' | 'pin' | 'biometric_pin' | 'none';
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
  biometricEnabled: boolean;
  pinEnabled: boolean;

  // Hidden entry
  hiddenEntryMethod: HiddenEntryMethod;
  hiddenEntryConfigured: boolean;

  // Session (ephemeral — not persisted)
  sessionUnlocked: boolean;
  logoTapCount: number;
  isDecoyMode: boolean;
  lastBackgroundTime: number | null;

  // Actions
  setScreenshotBlocked: (val: boolean) => void;
  setScreenRecordBlocked: (val: boolean) => void;
  setAppLockEnabled: (val: boolean) => void;
  setAppLockMethod: (method: AppLockMethod) => void;
  setAppPinHash: (hash: string | null) => void;
  setDecoyPinHash: (hash: string | null) => void;
  setBiometricEnabled: (val: boolean) => void;
  setPinEnabled: (val: boolean) => void;
  setHiddenEntryMethod: (method: HiddenEntryMethod) => void;
  setHiddenEntryConfigured: (val: boolean) => void;
  unlockSession: () => void;
  lockSession: () => void;
  incrementLogoTap: () => void;
  resetLogoTap: () => void;
  setIsDecoyMode: (val: boolean) => void;
  setLastBackgroundTime: (time: number | null) => void;
}

const useSecurityStore = create<SecurityState>()(
  persist(
    (set, get) => ({
      screenshotBlocked: false,
      screenRecordBlocked: false,
      appLockEnabled: false,
      appLockMethod: 'none',
      appPinHash: null,
      decoyPinHash: null,
      biometricEnabled: false,
      pinEnabled: false,
      hiddenEntryMethod: 'none',
      hiddenEntryConfigured: false,
      sessionUnlocked: true,
      logoTapCount: 0,
      isDecoyMode: false,
      lastBackgroundTime: null,

      setScreenshotBlocked: (screenshotBlocked) => set({ screenshotBlocked }),
      setScreenRecordBlocked: (screenRecordBlocked) => set({ screenRecordBlocked }),
      setAppLockEnabled: (appLockEnabled) => set({ appLockEnabled }),
      setAppLockMethod: (appLockMethod) => set({ appLockMethod }),
      setAppPinHash: (appPinHash) => set({ appPinHash }),
      setDecoyPinHash: (decoyPinHash) => set({ decoyPinHash }),
      setBiometricEnabled: (biometricEnabled) => set({ biometricEnabled }),
      setPinEnabled: (pinEnabled) => set({ pinEnabled }),
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
      setIsDecoyMode: (isDecoyMode) => set({ isDecoyMode }),
      setLastBackgroundTime: (lastBackgroundTime) => set({ lastBackgroundTime }),
    }),
    {
      name: 'security-storage',
      storage: createJSONStorage(() => secureStorage),
      // Only persist settings, not ephemeral session state
      partialize: (state) => ({
        screenshotBlocked: state.screenshotBlocked,
        screenRecordBlocked: state.screenRecordBlocked,
        appLockEnabled: state.appLockEnabled,
        appLockMethod: state.appLockMethod,
        appPinHash: state.appPinHash,
        decoyPinHash: state.decoyPinHash,
        biometricEnabled: state.biometricEnabled,
        pinEnabled: state.pinEnabled,
        hiddenEntryMethod: state.hiddenEntryMethod,
        hiddenEntryConfigured: state.hiddenEntryConfigured,
      }),
    }
  )
);

export default useSecurityStore;
