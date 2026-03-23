import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Crypto from 'expo-crypto';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  FadeIn,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Fingerprint } from 'lucide-react-native';
import useSecurityStore from '@/lib/state/security-store';

const C = {
  bg: '#0A0907',
  surface: '#161311',
  surface2: '#1E1A17',
  red: '#C41E3A',
  text: '#EDE0CC',
  text2: '#C4B49A',
  muted: '#6B5D4F',
  border: '#272320',
  border2: '#322D28',
  dot: '#3D3530',
  dotFilled: '#C41E3A',
} as const;

// Dynamically load expo-local-authentication — it may not be installed
let LocalAuth: {
  hasHardwareAsync: () => Promise<boolean>;
  isEnrolledAsync: () => Promise<boolean>;
  authenticateAsync: (opts: {
    promptMessage: string;
    fallbackLabel: string;
    disableDeviceFallback: boolean;
  }) => Promise<{ success: boolean }>;
} | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  LocalAuth = require('expo-local-authentication');
} catch {
  LocalAuth = null;
}

async function hashPin(pin: string): Promise<string> {
  const salt = 'red-string-security-v1';
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${pin}`
  );
}

const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', '⌫'],
];

export default function AppLockOverlay() {
  const appLockEnabled = useSecurityStore((s) => s.appLockEnabled);
  const sessionUnlocked = useSecurityStore((s) => s.sessionUnlocked);
  const biometricEnabled = useSecurityStore((s) => s.biometricEnabled);
  const pinEnabled = useSecurityStore((s) => s.pinEnabled);
  const appPinHash = useSecurityStore((s) => s.appPinHash);
  const decoyPinHash = useSecurityStore((s) => s.decoyPinHash);
  const unlockSession = useSecurityStore((s) => s.unlockSession);
  const setIsDecoyMode = useSecurityStore((s) => s.setIsDecoyMode);

  const [pin, setPin] = useState('');
  const [showPinPad, setShowPinPad] = useState(false);
  const [error, setError] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  const shakeAnim = useSharedValue(0);
  const dotFlash = useSharedValue(1);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeAnim.value }],
  }));
  const dotStyle = useAnimatedStyle(() => ({ opacity: dotFlash.value }));

  useEffect(() => {
    if (Platform.OS === 'web' || !LocalAuth) return;
    (async () => {
      const hasHw = await LocalAuth!.hasHardwareAsync();
      const enrolled = await LocalAuth!.isEnrolledAsync();
      setBiometricAvailable(hasHw && enrolled);
    })();
  }, []);

  const triggerBiometric = useCallback(async () => {
    if (!biometricAvailable || !biometricEnabled || !LocalAuth) {
      setShowPinPad(true);
      return;
    }
    try {
      const result = await LocalAuth.authenticateAsync({
        promptMessage: 'Unlock Red String',
        fallbackLabel: 'Use PIN',
        disableDeviceFallback: false,
      });
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setIsDecoyMode(false);
        unlockSession();
      } else {
        setShowPinPad(true);
      }
    } catch {
      setShowPinPad(true);
    }
  }, [biometricAvailable, biometricEnabled, unlockSession, setIsDecoyMode]);

  // On mount: auto-trigger biometric or show PIN
  useEffect(() => {
    if (!appLockEnabled || sessionUnlocked) return;
    if (biometricEnabled && biometricAvailable) {
      const t = setTimeout(() => triggerBiometric(), 400);
      return () => clearTimeout(t);
    } else {
      setShowPinPad(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appLockEnabled, sessionUnlocked, biometricEnabled, biometricAvailable]);

  const handleKey = useCallback(async (key: string) => {
    if (key === '') return;
    if (key === '⌫') {
      setPin((p) => p.slice(0, -1));
      setError('');
      return;
    }
    const newPin = pin + key;
    setPin(newPin);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (newPin.length === 6) {
      const entered = await hashPin(newPin);

      if (appPinHash && entered === appPinHash) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setIsDecoyMode(false);
        setPin('');
        unlockSession();
      } else if (decoyPinHash && entered === decoyPinHash) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setIsDecoyMode(true);
        setPin('');
        unlockSession();
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        dotFlash.value = withSequence(
          withTiming(0.3, { duration: 80 }),
          withTiming(1, { duration: 80 }),
          withTiming(0.3, { duration: 80 }),
          withTiming(1, { duration: 80 }),
        );
        shakeAnim.value = withSequence(
          withTiming(-10, { duration: 60 }),
          withTiming(10, { duration: 60 }),
          withTiming(-8, { duration: 60 }),
          withTiming(8, { duration: 60 }),
          withTiming(0, { duration: 60 }),
        );
        setError('Incorrect PIN');
        setTimeout(() => { setPin(''); setError(''); }, 700);
      }
    }
  }, [pin, appPinHash, decoyPinHash, unlockSession, setIsDecoyMode, shakeAnim, dotFlash]);

  if (!appLockEnabled || sessionUnlocked) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      style={StyleSheet.absoluteFillObject}
    >
      <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: C.bg }}>
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>

          {/* Header */}
          <View style={{ alignItems: 'center', paddingTop: 52, paddingBottom: 8 }}>
            <View style={{
              width: 64, height: 64, borderRadius: 18,
              backgroundColor: C.surface2, borderWidth: 1.5, borderColor: C.border2,
              alignItems: 'center', justifyContent: 'center', marginBottom: 20,
              shadowColor: C.red, shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.25, shadowRadius: 18,
            }}>
              <Text style={{ fontSize: 32 }}>🔴</Text>
            </View>
            <Text style={{
              color: C.text, fontSize: 20, fontWeight: '800', letterSpacing: 3,
              fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
              marginBottom: 4,
            }}>
              RED STRING
            </Text>
            <Text style={{ color: C.muted, fontSize: 11, letterSpacing: 1.5 }}>
              {showPinPad ? 'ENTER YOUR PIN' : 'APP LOCKED'}
            </Text>
          </View>

          {/* Biometric prompt */}
          {!showPinPad && biometricEnabled && biometricAvailable ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Pressable
                onPress={triggerBiometric}
                style={({ pressed }) => ({
                  width: 96, height: 96, borderRadius: 48,
                  backgroundColor: pressed ? 'rgba(196,30,58,0.18)' : C.surface2,
                  borderWidth: 2, borderColor: pressed ? C.red : C.border2,
                  alignItems: 'center', justifyContent: 'center',
                  shadowColor: C.red, shadowOpacity: 0.3, shadowRadius: 20,
                  shadowOffset: { width: 0, height: 0 },
                })}
              >
                <Fingerprint size={44} color={C.red} strokeWidth={1.5} />
              </Pressable>
              <Text style={{ color: C.muted, fontSize: 13, marginTop: 20, letterSpacing: 0.5 }}>
                Touch to authenticate
              </Text>
              {pinEnabled && appPinHash ? (
                <Pressable
                  onPress={() => setShowPinPad(true)}
                  style={{ marginTop: 28, paddingVertical: 10, paddingHorizontal: 20 }}
                >
                  <Text style={{ color: C.text2, fontSize: 13 }}>Use PIN instead</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {/* PIN pad */}
          {showPinPad ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>

              {/* Dots indicator */}
              <Animated.View style={[{ flexDirection: 'row', gap: 18, marginBottom: 10 }, shakeStyle, dotStyle]}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <View key={i} style={{
                    width: 16, height: 16, borderRadius: 8,
                    backgroundColor: i < pin.length ? C.dotFilled : C.dot,
                    borderWidth: i < pin.length ? 0 : 1,
                    borderColor: C.border2,
                    shadowColor: i < pin.length ? C.red : 'transparent',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: i < pin.length ? 0.6 : 0,
                    shadowRadius: 6,
                  }} />
                ))}
              </Animated.View>

              <View style={{ height: 20, justifyContent: 'center' }}>
                {error ? (
                  <Text style={{ color: C.red, fontSize: 12, letterSpacing: 0.5 }}>{error}</Text>
                ) : null}
              </View>

              {/* Keypad */}
              <View style={{ marginTop: 24, gap: 10, width: '100%', maxWidth: 300 }}>
                {KEYS.map((row, rowIdx) => (
                  <View key={rowIdx} style={{ flexDirection: 'row', gap: 10, justifyContent: 'center' }}>
                    {row.map((key, colIdx) => {
                      const isEmpty = key === '';
                      const isBack = key === '⌫';
                      return (
                        <Pressable
                          key={`${rowIdx}-${colIdx}`}
                          onPress={() => handleKey(key)}
                          disabled={isEmpty}
                          style={({ pressed }) => ({
                            width: 84, height: 72, borderRadius: 18,
                            backgroundColor: isEmpty || isBack
                              ? 'transparent'
                              : pressed ? C.surface2 : C.surface,
                            alignItems: 'center', justifyContent: 'center',
                            borderWidth: isEmpty || isBack ? 0 : 1,
                            borderColor: C.border2,
                          })}
                        >
                          {isBack ? (
                            <Text style={{ color: C.text2, fontSize: 22 }}>⌫</Text>
                          ) : isEmpty ? null : (
                            <Text style={{
                              color: C.text, fontSize: 28, fontWeight: '300',
                              fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-light',
                            }}>
                              {key}
                            </Text>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </View>

              {biometricEnabled && biometricAvailable ? (
                <Pressable
                  onPress={triggerBiometric}
                  style={{ marginTop: 28, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 }}
                >
                  <Fingerprint size={18} color={C.muted} strokeWidth={1.5} />
                  <Text style={{ color: C.muted, fontSize: 13 }}>Use biometrics</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

        </SafeAreaView>
      </View>
    </Animated.View>
  );
}
