import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import useSubscriptionStore from '@/lib/state/subscription-store';
import { useSession } from '@/lib/auth/use-session';
import useSecurityStore from '@/lib/state/security-store';
import AppLockOverlay from '@/components/AppLockOverlay';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// Custom dark theme matching the corkboard aesthetic
const CorkboardTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#1A1614',
    card: '#231F1C',
    text: '#E8DCC8',
    border: '#3D332C',
    primary: '#C41E3A',
  },
};

const BACKGROUND_LOCK_MS = 2 * 60 * 1000; // 2 minutes

function RootLayoutNav() {
  const checkSubscription = useSubscriptionStore((s) => s.checkSubscription);
  const { data: session, isLoading } = useSession();

  const appLockEnabled = useSecurityStore((s) => s.appLockEnabled);
  const sessionUnlocked = useSecurityStore((s) => s.sessionUnlocked);
  const lockSession = useSecurityStore((s) => s.lockSession);
  const setLastBackgroundTime = useSecurityStore((s) => s.setLastBackgroundTime);

  // Use a ref so the AppState handler always reads fresh values
  const lockRef = useRef({ appLockEnabled, lockSession, setLastBackgroundTime });
  lockRef.current = { appLockEnabled, lockSession, setLastBackgroundTime };
  const backgroundTimeRef = useRef<number | null>(null);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  // Lock on launch if app lock is enabled
  useEffect(() => {
    if (appLockEnabled) {
      lockSession();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // only on mount

  // Background → foreground: lock after 2 min away
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      const { appLockEnabled: enabled, lockSession: lock } = lockRef.current;
      if (nextState === 'background' || nextState === 'inactive') {
        backgroundTimeRef.current = Date.now();
      } else if (nextState === 'active') {
        if (enabled && backgroundTimeRef.current !== null) {
          const elapsed = Date.now() - backgroundTimeRef.current;
          if (elapsed >= BACKGROUND_LOCK_MS) {
            lock();
          }
        }
        backgroundTimeRef.current = null;
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, []);

  if (isLoading) {
    return null;
  }

  const isAuthenticated = !!session?.user;

  return (
    <ThemeProvider value={CorkboardTheme}>
      <Stack>
        <Stack.Protected guard={isAuthenticated}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="paywall" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="tip-inbox" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="sources-panel" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="appearance" options={{ headerShown: false }} />
          <Stack.Screen name="security" options={{ headerShown: false }} />
          <Stack.Screen name="pin-setup" options={{ headerShown: false }} />
          <Stack.Screen name="live-broadcast" options={{ headerShown: false, presentation: 'modal' }} />
          <Stack.Screen name="live-streams" options={{ headerShown: false, presentation: 'modal' }} />
          <Stack.Screen name="new-case" options={{ headerShown: false }} />
          <Stack.Screen name="hamburger-modal" options={{ presentation: 'transparentModal', headerShown: false, animation: 'slide_from_bottom' }} />
        </Stack.Protected>
        <Stack.Protected guard={!isAuthenticated}>
          <Stack.Screen name="sign-in" options={{ headerShown: false }} />
          <Stack.Screen name="verify-otp" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Screen name="tip-submit" options={{ presentation: 'card', headerShown: false }} />
        <Stack.Screen name="collab" options={{ headerShown: false }} />
        <Stack.Screen name="collab-session" options={{ headerShown: false }} />
        <Stack.Screen name="war-room" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
      </Stack>

      {/* App lock overlay — rendered over everything when session is locked */}
      {appLockEnabled && !sessionUnlocked ? <AppLockOverlay /> : null}
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider>
          <StatusBar style="light" />
          <RootLayoutNav />
        </KeyboardProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
