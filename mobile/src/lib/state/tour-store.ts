import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface TourState {
  hasCompletedTour: boolean;
  isRunning: boolean;
  currentStep: number;
  isDemoMode: boolean;
  sessionStartedAt: number | null;

  startTour: () => void;
  startTourFromStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  completeTour: () => void;
  startDemoMode: () => void;
  exitDemoMode: () => void;
  setSessionStart: () => void;
}

const TOTAL_STEPS = 18;

const useTourStore = create<TourState>()(
  persist(
    (set) => ({
      hasCompletedTour: false,
      isRunning: false,
      currentStep: 0,
      isDemoMode: false,
      sessionStartedAt: null,

      startTour: () =>
        set({ isRunning: true, currentStep: 0 }),

      startTourFromStep: (step: number) =>
        set({ isRunning: true, currentStep: step }),

      nextStep: () =>
        set((state) => {
          const next = state.currentStep + 1;
          if (next >= TOTAL_STEPS) {
            return { isRunning: false, hasCompletedTour: true, currentStep: 0 };
          }
          return { currentStep: next };
        }),

      prevStep: () =>
        set((state) => ({
          currentStep: Math.max(0, state.currentStep - 1),
        })),

      skipTour: () =>
        set({ isRunning: false, hasCompletedTour: true, currentStep: 0 }),

      completeTour: () =>
        set({ isRunning: false, hasCompletedTour: true, currentStep: 0 }),

      startDemoMode: () => set({ isDemoMode: true }),

      exitDemoMode: () => set({ isDemoMode: false }),

      setSessionStart: () => set({ sessionStartedAt: Date.now() }),
    }),
    {
      name: 'tour-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        hasCompletedTour: state.hasCompletedTour,
        isDemoMode: state.isDemoMode,
      }),
    }
  )
);

export default useTourStore;
