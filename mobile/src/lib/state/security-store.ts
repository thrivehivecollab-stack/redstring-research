import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';

// ─── SecureStore adapter for Zustand persist ──────────────────────────────────
const secureStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(name);
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(name, value);
    } catch {
      // silently fail — security store write errors should not crash app
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(name);
    } catch {
      // silently fail
    }
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────
export type AppLockMethod = 'biometric' | 'pin' | 'both';
export type HiddenEntryMethod = 'logo_tap' | 'decoy_pin' | 'tap_sequence' | 'shake';

export interface SecurityState {
  screenshotBlocked: boolean;
  screenRecordBlocked: boolean;
  appLockEnabled: boolean;
  appLockMethod: AppLockMethod;
  appPinHash: string | null;
  hiddenEntryMethod: HiddenEntryMethod;
  hiddenEntryConfigured: boolean;
  decoyPinHash: string | null;
  sessionUnlocked: boolean;
}

interface SecurityStore extends SecurityState {
  setScreenshotBlocked: (blocked: boolean) => void;
  setScreenRecordBlocked: (blocked: boolean) => void;
  setAppLock: (enabled: boolean, method?: AppLockMethod, pinHash?: string | null) => void;
  setHiddenEntryMethod: (method: HiddenEntryMethod, configured?: boolean, decoyPinHash?: string | null) => void;
  unlockSession: () => void;
  lockSession: () => void;
}

const DEFAULTS: SecurityState = {
  screenshotBlocked: true,
  screenRecordBlocked: true,
  appLockEnabled: false,
  appLockMethod: 'biometric',
  appPinHash: null,
  hiddenEntryMethod: 'logo_tap',
  hiddenEntryConfigured: false,
  decoyPinHash: null,
  sessionUnlocked: false,
};

const useSecurityStore = create<SecurityStore>()(
  persist(
    (set) => ({
      ...DEFAULTS,

      setScreenshotBlocked: (blocked) => set({ screenshotBlocked: blocked }),
      setScreenRecordBlocked: (blocked) => set({ screenRecordBlocked: blocked }),

      setAppLock: (enabled, method, pinHash) =>
        set((s) => ({
          appLockEnabled: enabled,
          appLockMethod: method ?? s.appLockMethod,
          appPinHash: pinHash !== undefined ? pinHash : s.appPinHash,
        })),

      setHiddenEntryMethod: (method, configured, decoyPinHash) =>
        set((s) => ({
          hiddenEntryMethod: method,
          hiddenEntryConfigured: configured ?? s.hiddenEntryConfigured,
          decoyPinHash: decoyPinHash !== undefined ? decoyPinHash : s.decoyPinHash,
        })),

      unlockSession: () => set({ sessionUnlocked: true }),

      lockSession: () => set({ sessionUnlocked: false }),
    }),
    {
      name: 'security-storage',
      storage: createJSONStorage(() => secureStorage),
      // sessionUnlocked must never be persisted — it resets on every cold start
      partialize: (state) => {
        const { sessionUnlocked: _su, ...rest } = state as SecurityStore;
        return rest;
      },
    }
  )
);

export default useSecurityStore;
