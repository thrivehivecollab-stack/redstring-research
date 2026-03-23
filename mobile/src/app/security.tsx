import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  ChevronRight,
  Camera,
  Fingerprint,
  Shield,
  Lock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import useSecurityStore from '@/lib/state/security-store';

const C = {
  bg: '#0F0D0B',
  surface: '#1A1714',
  surface2: '#211E1A',
  surface3: '#2A2520',
  red: '#C41E3A',
  redDim: 'rgba(196,30,58,0.1)',
  gold: '#C8934A',
  goldDim: 'rgba(200,147,74,0.1)',
  green: '#22C55E',
  greenDim: 'rgba(34,197,94,0.1)',
  text: '#EDE0CC',
  text2: '#C4B49A',
  muted: '#6B5D4F',
  border: '#272320',
  border2: '#322D28',
} as const;

// Dynamic require for biometric module
let LocalAuth: {
  hasHardwareAsync: () => Promise<boolean>;
  isEnrolledAsync: () => Promise<boolean>;
} | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  LocalAuth = require('expo-local-authentication');
} catch {
  LocalAuth = null;
}

function SectionHeader({ title }: { title: string }) {
  return (
    <Text style={{
      color: C.muted, fontSize: 9, fontWeight: '800', letterSpacing: 2.5,
      fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
      textTransform: 'uppercase',
      marginTop: 28, marginBottom: 10, paddingHorizontal: 4,
    }}>
      {title}
    </Text>
  );
}

function SettingRow({
  icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  right,
  onPress,
  topRadius,
  bottomRadius,
  borderBottom = true,
}: {
  icon: React.ReactNode;
  iconColor?: string;
  iconBg?: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  topRadius?: boolean;
  bottomRadius?: boolean;
  borderBottom?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: pressed && onPress ? C.surface2 : C.surface,
        paddingHorizontal: 16, paddingVertical: 14,
        borderTopLeftRadius: topRadius ? 14 : 0,
        borderTopRightRadius: topRadius ? 14 : 0,
        borderBottomLeftRadius: bottomRadius ? 14 : 0,
        borderBottomRightRadius: bottomRadius ? 14 : 0,
        borderBottomWidth: borderBottom ? 1 : 0,
        borderColor: C.border,
      })}
    >
      <View style={{
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: iconBg ?? C.surface2,
        alignItems: 'center', justifyContent: 'center',
        marginRight: 14,
      }}>
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.text, fontSize: 15, fontWeight: '600' }}>{title}</Text>
        {subtitle ? (
          <Text style={{ color: C.muted, fontSize: 12, marginTop: 2, lineHeight: 16 }}>{subtitle}</Text>
        ) : null}
      </View>
      {right ?? null}
    </Pressable>
  );
}

export default function SecurityScreen() {
  const router = useRouter();

  const screenshotBlocked = useSecurityStore((s) => s.screenshotBlocked);
  const setScreenshotBlocked = useSecurityStore((s) => s.setScreenshotBlocked);

  const biometricEnabled = useSecurityStore((s) => s.biometricEnabled);
  const setBiometricEnabled = useSecurityStore((s) => s.setBiometricEnabled);

  const pinEnabled = useSecurityStore((s) => s.pinEnabled);
  const setPinEnabled = useSecurityStore((s) => s.setPinEnabled);
  const appPinHash = useSecurityStore((s) => s.appPinHash);
  const decoyPinHash = useSecurityStore((s) => s.decoyPinHash);

  const appLockEnabled = useSecurityStore((s) => s.appLockEnabled);
  const setAppLockEnabled = useSecurityStore((s) => s.setAppLockEnabled);
  const setAppPinHash = useSecurityStore((s) => s.setAppPinHash);
  const setDecoyPinHash = useSecurityStore((s) => s.setDecoyPinHash);

  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricChecked, setBiometricChecked] = useState(false);

  useEffect(() => {
    if (!LocalAuth || Platform.OS === 'web') {
      setBiometricChecked(true);
      return;
    }
    (async () => {
      const hasHw = await LocalAuth!.hasHardwareAsync();
      const enrolled = await LocalAuth!.isEnrolledAsync();
      setBiometricAvailable(hasHw && enrolled);
      setBiometricChecked(true);
    })();
  }, []);

  const handleScreenshotToggle = useCallback((val: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setScreenshotBlocked(val);
  }, [setScreenshotBlocked]);

  const handleBiometricToggle = useCallback((val: boolean) => {
    if (!biometricAvailable) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBiometricEnabled(val);
    // Update app lock method
    if (val) {
      setAppLockEnabled(true);
    } else if (!pinEnabled) {
      setAppLockEnabled(false);
    }
  }, [biometricAvailable, setBiometricEnabled, setAppLockEnabled, pinEnabled]);

  const handlePinToggle = useCallback((val: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (val) {
      // Navigate to PIN setup
      router.push('/pin-setup' as any);
    } else {
      // Confirm disable
      Alert.alert(
        'Disable PIN Lock?',
        'This will remove your PIN and decoy PIN. Are you sure?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: () => {
              setPinEnabled(false);
              setAppPinHash(null);
              setDecoyPinHash(null);
              if (!biometricEnabled) setAppLockEnabled(false);
            },
          },
        ]
      );
    }
  }, [router, setPinEnabled, setAppPinHash, setDecoyPinHash, biometricEnabled, setAppLockEnabled]);

  const pinConfigured = !!appPinHash;
  const hasDecoy = !!decoyPinHash;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>

        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 16, paddingTop: 8, paddingBottom: 14,
          borderBottomWidth: 1, borderBottomColor: C.border,
        }}>
          <Pressable
            onPress={() => router.back()}
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
              color: C.text, fontSize: 20, fontWeight: '800', letterSpacing: 2,
              fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
            }}>
              SECURITY
            </Text>
            <Text style={{ color: C.muted, fontSize: 11, letterSpacing: 0.5, marginTop: 1 }}>
              Locks, biometrics & privacy
            </Text>
          </View>
          <View style={{
            paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
            backgroundColor: appLockEnabled ? 'rgba(34,197,94,0.12)' : C.surface2,
            borderWidth: 1,
            borderColor: appLockEnabled ? 'rgba(34,197,94,0.3)' : C.border2,
          }}>
            <Text style={{
              color: appLockEnabled ? C.green : C.muted,
              fontSize: 10, fontWeight: '700', letterSpacing: 1,
            }}>
              {appLockEnabled ? 'ACTIVE' : 'OFF'}
            </Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 60 }}
        >

          {/* ── PRIVACY ── */}
          <SectionHeader title="PRIVACY" />

          <SettingRow
            topRadius
            bottomRadius
            borderBottom={false}
            icon={<Camera size={18} color={C.red} strokeWidth={1.8} />}
            iconBg={C.redDim}
            title="Screenshot & Recording Block"
            subtitle="Prevents screenshots and screen recordings on investigation canvases and node content"
            right={
              <Switch
                value={screenshotBlocked}
                onValueChange={handleScreenshotToggle}
                trackColor={{ false: C.border2, true: 'rgba(196,30,58,0.5)' }}
                thumbColor={screenshotBlocked ? C.red : C.muted}
              />
            }
          />

          {/* ── APP LOCK ── */}
          <SectionHeader title="APP LOCK" />

          {/* Biometric */}
          <SettingRow
            topRadius
            borderBottom
            icon={<Fingerprint size={18} color={biometricAvailable ? C.gold : C.muted} strokeWidth={1.8} />}
            iconBg={biometricAvailable ? C.goldDim : C.surface2}
            title="Biometric Lock"
            subtitle={
              !biometricChecked
                ? 'Checking availability…'
                : !LocalAuth
                ? 'Not available on this device'
                : !biometricAvailable
                ? 'Face ID / Touch ID not enrolled'
                : 'Face ID or fingerprint on launch and after 2 min in background'
            }
            right={
              <Switch
                value={!!(biometricEnabled && biometricAvailable)}
                onValueChange={handleBiometricToggle}
                disabled={!biometricAvailable}
                trackColor={{ false: C.border2, true: 'rgba(200,147,74,0.5)' }}
                thumbColor={biometricEnabled && biometricAvailable ? C.gold : C.muted}
              />
            }
          />

          {/* PIN Lock */}
          <SettingRow
            borderBottom={false}
            bottomRadius={!pinConfigured}
            icon={<Lock size={18} color={C.text2} strokeWidth={1.8} />}
            iconBg={C.surface2}
            title="PIN Lock"
            subtitle={
              pinConfigured
                ? `6-digit PIN active${hasDecoy ? ' · Decoy PIN set' : ''}`
                : '6-digit PIN with optional decoy mode'
            }
            right={
              <Switch
                value={!!(pinEnabled && pinConfigured)}
                onValueChange={handlePinToggle}
                trackColor={{ false: C.border2, true: 'rgba(196,30,58,0.5)' }}
                thumbColor={pinEnabled && pinConfigured ? C.red : C.muted}
              />
            }
          />

          {/* PIN status/setup CTA */}
          {pinEnabled || pinConfigured ? (
            <Pressable
              onPress={() => router.push('/pin-setup' as any)}
              style={({ pressed }) => ({
                backgroundColor: pressed ? C.surface2 : C.surface,
                borderBottomLeftRadius: 14, borderBottomRightRadius: 14,
                borderTopWidth: 1, borderColor: C.border,
                flexDirection: 'row', alignItems: 'center',
                paddingHorizontal: 16, paddingVertical: 13,
              })}
            >
              <View style={{ flex: 1 }}>
                {pinConfigured ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <CheckCircle2 size={14} color={C.green} strokeWidth={2} />
                    <Text style={{ color: C.green, fontSize: 13, fontWeight: '600' }}>PIN configured</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <AlertCircle size={14} color={C.gold} strokeWidth={2} />
                    <Text style={{ color: C.gold, fontSize: 13, fontWeight: '600' }}>PIN not set up</Text>
                  </View>
                )}
                <Text style={{ color: C.muted, fontSize: 12 }}>
                  {pinConfigured ? 'Tap to change your PINs' : 'Tap to set up your PIN and decoy PIN'}
                </Text>
              </View>
              <ChevronRight size={16} color={C.muted} strokeWidth={2} />
            </Pressable>
          ) : null}

          {/* ── HOW IT WORKS ── */}
          <SectionHeader title="HOW LOCKS WORK" />
          <View style={{
            backgroundColor: C.surface, borderRadius: 14,
            borderWidth: 1, borderColor: C.border,
            borderLeftWidth: 3, borderLeftColor: C.red,
            padding: 16, gap: 10,
          }}>
            {[
              { icon: '🚀', text: 'Lock triggers on launch and after 2 minutes in background' },
              { icon: '🔐', text: 'Biometric authentication runs first; PIN is always the fallback' },
              { icon: '🎭', text: 'Decoy PIN opens the app with no investigations — looks completely normal to anyone watching' },
            ].map((item) => (
              <View key={item.icon} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                <Text style={{ fontSize: 16, lineHeight: 20 }}>{item.icon}</Text>
                <Text style={{ color: C.text2, fontSize: 13, lineHeight: 19, flex: 1 }}>{item.text}</Text>
              </View>
            ))}
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
