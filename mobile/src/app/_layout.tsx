import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useEffect } from 'react';
import useSubscriptionStore from '@/lib/state/subscription-store';
import { useSession } from '@/lib/auth/use-session';

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

function RootLayoutNav() {
  const checkSubscription = useSubscriptionStore((s) => s.checkSubscription);
  const { data: session, isLoading } = useSession();

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  // Keep splash screen visible while loading session
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
          <Stack.Screen name="live-broadcast" options={{ headerShown: false, presentation: 'modal' }} />
          <Stack.Screen name="live-streams" options={{ headerShown: false, presentation: 'modal' }} />
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
