import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestPermissionsAsync } from 'expo-notifications';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  FadeInDown,
  FadeIn,
} from 'react-native-reanimated';

const C = {
  bg: '#0F0D0B',
  surface: '#1A1714',
  surface2: '#211E1A',
  red: '#C41E3A',
  pin: '#C8934A',
  text: '#EDE0CC',
  muted: '#6B5D4F',
  border: '#272320',
} as const;

const NOTIF_KEY = 'notification_permission_shown';

function PulsingBell() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 900 }),
        withTiming(1, { duration: 900 })
      ),
      -1,
      false
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 900 }),
        withTiming(0.15, { duration: 900 })
      ),
      -1,
      false
    );
  }, [scale, opacity]);

  const bellStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 120, height: 120 }}>
      {/* Glow ring */}
      <Animated.View
        style={[
          glowStyle,
          {
            position: 'absolute',
            width: 110,
            height: 110,
            borderRadius: 55,
            backgroundColor: C.red,
          },
        ]}
      />
      {/* Icon container */}
      <Animated.View
        style={[
          bellStyle,
          {
            width: 88,
            height: 88,
            borderRadius: 44,
            backgroundColor: C.surface,
            borderWidth: 1,
            borderColor: C.border,
            alignItems: 'center',
            justifyContent: 'center',
          },
        ]}
      >
        <Text style={{ fontSize: 40 }}>🔔</Text>
      </Animated.View>
    </View>
  );
}

export default function NotificationPermissionsScreen() {
  const router = useRouter();

  const markShownAndNavigate = async () => {
    await AsyncStorage.setItem(NOTIF_KEY, 'true').catch(() => {});
    router.replace('/sign-in' as any);
  };

  const handleEnable = async () => {
    try {
      await requestPermissionsAsync();
    } catch {
      // permission denied or error — proceed anyway
    }
    await markShownAndNavigate();
  };

  const handleNotNow = async () => {
    await markShownAndNavigate();
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }} testID="notification-permissions-screen">
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        {/* Bell */}
        <Animated.View entering={FadeIn.duration(600)} style={{ marginBottom: 40 }}>
          <PulsingBell />
        </Animated.View>

        {/* Text */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)} style={{ alignItems: 'center', marginBottom: 48 }}>
          <Text
            style={{
              color: C.text,
              fontSize: 28,
              fontWeight: '900',
              textAlign: 'center',
              letterSpacing: -0.5,
              marginBottom: 14,
            }}
          >
            Stay informed
          </Text>
          <Text
            style={{
              color: C.muted,
              fontSize: 15,
              textAlign: 'center',
              lineHeight: 22,
              maxWidth: 300,
            }}
          >
            Get notified when someone views your investigation, submits a tip, or shares your work.
          </Text>
        </Animated.View>

        {/* Buttons */}
        <Animated.View entering={FadeInDown.delay(350).duration(500)} style={{ width: '100%', gap: 12 }}>
          <Pressable
            testID="enable-notifications-button"
            onPress={handleEnable}
            style={({ pressed }) => ({
              backgroundColor: pressed ? '#a01830' : C.red,
              borderRadius: 16,
              paddingVertical: 18,
              alignItems: 'center',
              shadowColor: C.red,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.4,
              shadowRadius: 12,
              elevation: 8,
            })}
          >
            <Text style={{ color: '#FFF', fontSize: 17, fontWeight: '900', letterSpacing: 0.3 }}>
              Enable Notifications
            </Text>
          </Pressable>

          <Pressable
            testID="not-now-button"
            onPress={handleNotNow}
            style={{ paddingVertical: 14, alignItems: 'center' }}
          >
            <Text style={{ color: C.muted, fontSize: 15, fontWeight: '600' }}>Not Now</Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}
