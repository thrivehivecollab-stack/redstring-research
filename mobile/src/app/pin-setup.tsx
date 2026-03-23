import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  FadeInRight,
  FadeOutLeft,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, CheckCircle2, Eye, EyeOff } from 'lucide-react-native';
import useSecurityStore from '@/lib/state/security-store';

const C = {
  bg: '#0F0D0B',
  surface: '#1A1714',
  surface2: '#211E1A',
  red: '#C41E3A',
  redDim: 'rgba(196,30,58,0.12)',
  gold: '#C8934A',
  goldDim: 'rgba(200,147,74,0.12)',
  green: '#22C55E',
  text: '#EDE0CC',
  text2: '#C4B49A',
  muted: '#6B5D4F',
  border: '#272320',
  border2: '#322D28',
  dot: '#3D3530',
  dotReal: '#C41E3A',
  dotDecoy: '#C8934A',
} as const;

type Step = 'real_enter' | 'real_confirm' | 'decoy_enter' | 'decoy_confirm' | 'done';

const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', '⌫'],
];

async function hashPin(pin: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `red-string-security-v1:${pin}`
  );
}

const STEP_CONFIG: Record<Step, { title: string; subtitle: string; dotColor: string; accent: string }> = {
  real_enter: {
    title: 'Set Your Real PIN',
    subtitle: 'Choose a 6-digit PIN to unlock the app',
    dotColor: C.dotReal,
    accent: C.red,
  },
  real_confirm: {
    title: 'Confirm Real PIN',
    subtitle: 'Enter the same PIN again to confirm',
    dotColor: C.dotReal,
    accent: C.red,
  },
  decoy_enter: {
    title: 'Set a Decoy PIN',
    subtitle: 'A second PIN that opens the app with no investigations visible',
    dotColor: C.dotDecoy,
    accent: C.gold,
  },
  decoy_confirm: {
    title: 'Confirm Decoy PIN',
    subtitle: 'Enter the decoy PIN again to confirm',
    dotColor: C.dotDecoy,
    accent: C.gold,
  },
  done: {
    title: 'All Set',
    subtitle: 'Your PINs are saved securely',
    dotColor: C.green,
    accent: C.green,
  },
};

export default function PinSetupScreen() {
  const router = useRouter();
  const setAppPinHash = useSecurityStore((s) => s.setAppPinHash);
  const setDecoyPinHash = useSecurityStore((s) => s.setDecoyPinHash);
  const setPinEnabled = useSecurityStore((s) => s.setPinEnabled);
  const setAppLockEnabled = useSecurityStore((s) => s.setAppLockEnabled);

  const [step, setStep] = useState<Step>('real_enter');
  const [pin, setPin] = useState('');
  const [realPin, setRealPin] = useState('');
  const [decoyPin, setDecoyPin] = useState('');
  const [error, setError] = useState('');
  const [skipDecoy, setSkipDecoy] = useState(false);

  const shakeAnim = useSharedValue(0);
  const dotFlash = useSharedValue(1);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeAnim.value }] }));
  const dotStyle = useAnimatedStyle(() => ({ opacity: dotFlash.value }));

  const triggerError = useCallback((msg: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    dotFlash.value = withSequence(
      withTiming(0.2, { duration: 70 }), withTiming(1, { duration: 70 }),
      withTiming(0.2, { duration: 70 }), withTiming(1, { duration: 70 }),
    );
    shakeAnim.value = withSequence(
      withTiming(-10, { duration: 55 }), withTiming(10, { duration: 55 }),
      withTiming(-7, { duration: 55 }), withTiming(7, { duration: 55 }),
      withTiming(0, { duration: 55 }),
    );
    setError(msg);
    setTimeout(() => { setPin(''); setError(''); }, 750);
  }, [shakeAnim, dotFlash]);

  const handleKey = useCallback(async (key: string) => {
    if (key === '') return;
    if (key === '⌫') { setPin((p) => p.slice(0, -1)); setError(''); return; }
    const newPin = pin + key;
    setPin(newPin);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (newPin.length < 6) return;

    // 6 digits entered — process based on step
    if (step === 'real_enter') {
      setRealPin(newPin);
      setPin('');
      setStep('real_confirm');
    } else if (step === 'real_confirm') {
      if (newPin !== realPin) {
        triggerError("PINs don't match — try again");
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setPin('');
        setStep('decoy_enter');
      }
    } else if (step === 'decoy_enter') {
      if (newPin === realPin) {
        triggerError('Decoy PIN must differ from real PIN');
      } else {
        setDecoyPin(newPin);
        setPin('');
        setStep('decoy_confirm');
      }
    } else if (step === 'decoy_confirm') {
      if (newPin !== decoyPin) {
        triggerError("PINs don't match — try again");
      } else {
        // All done — hash and save
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const [rHash, dHash] = await Promise.all([hashPin(realPin), hashPin(decoyPin)]);
        setAppPinHash(rHash);
        setDecoyPinHash(dHash);
        setPinEnabled(true);
        setAppLockEnabled(true);
        setPin('');
        setStep('done');
      }
    }
  }, [pin, step, realPin, decoyPin, triggerError, setAppPinHash, setDecoyPinHash, setPinEnabled, setAppLockEnabled]);

  const handleSkipDecoy = useCallback(async () => {
    // Save only the real PIN
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSkipDecoy(true);
    const rHash = await hashPin(realPin);
    setAppPinHash(rHash);
    setDecoyPinHash(null);
    setPinEnabled(true);
    setAppLockEnabled(true);
    setStep('done');
  }, [realPin, setAppPinHash, setDecoyPinHash, setPinEnabled, setAppLockEnabled]);

  const cfg = STEP_CONFIG[step];
  const stepNumber = step === 'real_enter' ? 1 : step === 'real_confirm' ? 2 : step === 'decoy_enter' ? 3 : step === 'decoy_confirm' ? 4 : 5;
  const totalSteps = 4;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>

        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 16, paddingTop: 8, paddingBottom: 14,
          borderBottomWidth: 1, borderBottomColor: C.border,
        }}>
          <Pressable
            onPress={() => {
              if (step === 'done') { router.back(); return; }
              if (step === 'real_enter') { router.back(); return; }
              // Go back a step
              setPin('');
              setError('');
              if (step === 'real_confirm') setStep('real_enter');
              else if (step === 'decoy_enter') setStep('real_confirm');
              else if (step === 'decoy_confirm') setStep('decoy_enter');
            }}
            style={({ pressed }) => ({
              width: 40, height: 40, borderRadius: 12,
              backgroundColor: pressed ? C.surface2 : C.surface,
              alignItems: 'center', justifyContent: 'center',
              borderWidth: 1, borderColor: C.border2, marginRight: 12,
            })}
          >
            <ChevronLeft size={20} color={C.text} strokeWidth={2} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{
              color: C.text, fontSize: 18, fontWeight: '800', letterSpacing: 1.5,
              fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
            }}>
              PIN SETUP
            </Text>
          </View>
          {step !== 'done' ? (
            <Text style={{ color: C.muted, fontSize: 12 }}>
              {Math.min(stepNumber, totalSteps)}/{totalSteps}
            </Text>
          ) : null}
        </View>

        {/* Progress bar */}
        {step !== 'done' ? (
          <View style={{ height: 2, backgroundColor: C.border }}>
            <View style={{
              height: 2,
              backgroundColor: cfg.accent,
              width: `${(Math.min(stepNumber, totalSteps) / totalSteps) * 100}%`,
            }} />
          </View>
        ) : null}

        {/* Done state */}
        {step === 'done' ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
            <Animated.View entering={FadeInRight.duration(300)}>
              <View style={{
                width: 80, height: 80, borderRadius: 40,
                backgroundColor: 'rgba(34,197,94,0.12)',
                borderWidth: 2, borderColor: 'rgba(34,197,94,0.3)',
                alignItems: 'center', justifyContent: 'center',
                marginBottom: 24, alignSelf: 'center',
              }}>
                <CheckCircle2 size={40} color={C.green} strokeWidth={1.8} />
              </View>
              <Text style={{
                color: C.text, fontSize: 22, fontWeight: '800', textAlign: 'center',
                marginBottom: 10,
              }}>
                PIN Lock Active
              </Text>
              <Text style={{ color: C.muted, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 8 }}>
                Your real PIN unlocks the app normally.
              </Text>
              {!skipDecoy ? (
                <Text style={{ color: C.muted, fontSize: 14, textAlign: 'center', lineHeight: 22 }}>
                  Your decoy PIN opens an empty app — no investigations visible.
                </Text>
              ) : (
                <Text style={{ color: C.muted, fontSize: 14, textAlign: 'center', lineHeight: 22 }}>
                  No decoy PIN set. You can add one from Security settings anytime.
                </Text>
              )}

              <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => ({
                  marginTop: 36,
                  backgroundColor: pressed ? 'rgba(196,30,58,0.18)' : C.redDim,
                  borderWidth: 1, borderColor: 'rgba(196,30,58,0.3)',
                  borderRadius: 14, paddingVertical: 16, paddingHorizontal: 40,
                  alignItems: 'center',
                })}
              >
                <Text style={{ color: C.red, fontSize: 16, fontWeight: '700', letterSpacing: 0.5 }}>Done</Text>
              </Pressable>
            </Animated.View>
          </View>
        ) : (
          /* PIN entry UI */
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>

            {/* Step context card */}
            <View style={{
              backgroundColor: C.surface,
              borderWidth: 1, borderColor: C.border,
              borderLeftWidth: 3, borderLeftColor: cfg.accent,
              borderRadius: 12, padding: 14,
              width: '100%', maxWidth: 320, marginBottom: 36,
            }}>
              <Text style={{ color: C.text, fontSize: 17, fontWeight: '700', marginBottom: 4 }}>
                {cfg.title}
              </Text>
              <Text style={{ color: C.muted, fontSize: 13, lineHeight: 18 }}>
                {cfg.subtitle}
              </Text>
            </View>

            {/* Dot indicators */}
            <Animated.View style={[{ flexDirection: 'row', gap: 18, marginBottom: 10 }, shakeStyle, dotStyle]}>
              {Array.from({ length: 6 }).map((_, i) => (
                <View key={i} style={{
                  width: 16, height: 16, borderRadius: 8,
                  backgroundColor: i < pin.length ? cfg.dotColor : C.dot,
                  borderWidth: i < pin.length ? 0 : 1,
                  borderColor: C.border2,
                  shadowColor: i < pin.length ? cfg.dotColor : 'transparent',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: i < pin.length ? 0.7 : 0,
                  shadowRadius: 6,
                }} />
              ))}
            </Animated.View>

            <View style={{ height: 20, justifyContent: 'center', marginBottom: 4 }}>
              {error ? (
                <Text style={{ color: C.red, fontSize: 12, letterSpacing: 0.3 }}>{error}</Text>
              ) : null}
            </View>

            {/* Keypad */}
            <View style={{ marginTop: 16, gap: 10, width: '100%', maxWidth: 300 }}>
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

            {/* Skip decoy option */}
            {step === 'decoy_enter' ? (
              <Pressable
                onPress={handleSkipDecoy}
                style={{ marginTop: 24, paddingVertical: 10, paddingHorizontal: 20 }}
              >
                <Text style={{ color: C.muted, fontSize: 13, textAlign: 'center' }}>
                  Skip decoy PIN (not recommended)
                </Text>
              </Pressable>
            ) : null}

          </View>
        )}

      </SafeAreaView>
    </View>
  );
}
