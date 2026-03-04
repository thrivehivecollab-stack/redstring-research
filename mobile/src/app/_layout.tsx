import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useEffect } from 'react';
import useSubscriptionStore from '@/lib/state/subscription-store';

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

export default function RootLayout() {
  const checkSubscription = useSubscriptionStore((s) => s.checkSubscription);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider>
          <StatusBar style="light" />
          <ThemeProvider value={CorkboardTheme}>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="paywall" options={{ presentation: 'modal', headerShown: false }} />
            </Stack>
          </ThemeProvider>
        </KeyboardProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
