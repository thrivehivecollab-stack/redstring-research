import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  X,
  ChevronRight,
  LogOut,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { useSession, useInvalidateSession } from '@/lib/auth/use-session';
import { authClient } from '@/lib/auth/auth-client';
import useSubscriptionStore from '@/lib/state/subscription-store';
import { api } from '@/lib/api/api';

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

type MenuItem = {
  emoji: string;
  label: string;
  sub?: string;
  onPress: () => void;
  danger?: boolean;
  isLoading?: boolean;
};

export default function HamburgerModal() {
  const router = useRouter();
  const { data: session } = useSession();
  const invalidateSession = useInvalidateSession();
  const tier = useSubscriptionStore((s) => s.tier);
  const isPremium = tier === 'pro' || tier === 'plus';
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isOpeningWarRoom, setIsOpeningWarRoom] = useState(false);

  const close = () => router.back();

  const handleSignOut = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setIsSigningOut(true);
    try {
      await authClient.signOut();
      invalidateSession();
      router.replace('/sign-in' as any);
    } catch {
      setIsSigningOut(false);
    }
  };

  const handleWarRoom = async () => {
    setIsOpeningWarRoom(true);
    try {
      const timestamp = new Date(Date.now()).toISOString().toLowerCase().replace(/[:.]/g, '-').replace('t', '-').slice(0, 19);
      const title = `war-room-${timestamp}`;
      const result = await api.post<{ roomUrl: string }>('/api/warroom/rooms', { title });
      close();
      await WebBrowser.openBrowserAsync(result.roomUrl);
    } catch (err: any) {
      if (err?.message?.includes('DAILY_NOT_CONFIGURED') || err?.code === 'DAILY_NOT_CONFIGURED') {
        Alert.alert(
          'Daily.co Not Configured',
          'To use War Room video collaboration, add your DAILY_API_KEY in the ENV tab.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', err?.message ?? 'Failed to open War Room');
      }
    } finally {
      setIsOpeningWarRoom(false);
    }
  };

  const sections: { title: string; items: MenuItem[] }[] = [
    {
      title: 'COLLABORATE',
      items: [
        {
          emoji: '📡',
          label: 'Start a Broadcast',
          sub: 'Go live to your audience',
          onPress: () => { close(); router.push('/live-broadcast' as any); },
        },
        {
          emoji: '🔴',
          label: 'Live Stream',
          sub: 'Stream to YouTube, Twitch & TikTok',
          onPress: () => { close(); router.push('/live-stream' as any); },
        },
        {
          emoji: '🎥',
          label: isOpeningWarRoom ? 'Opening...' : 'War Room',
          sub: 'Video collaboration',
          onPress: handleWarRoom,
          isLoading: isOpeningWarRoom,
        },
        {
          emoji: '👥',
          label: 'Collaborations',
          sub: 'Active sessions',
          onPress: () => { close(); router.push('/collab' as any); },
        },
      ],
    },
    {
      title: 'ACCOUNT',
      items: [
        {
          emoji: '👤',
          label: 'Account',
          sub: session?.user?.name ?? session?.user?.email ?? 'Signed in',
          onPress: () => {},
        },
        {
          emoji: '🔒',
          label: 'Security',
          sub: 'Locks, PIN & screenshot',
          onPress: () => { close(); router.push('/security' as any); },
        },
        {
          emoji: '🔔',
          label: 'Notifications',
          sub: 'Tips & alerts',
          onPress: () => { close(); router.push('/tip-inbox' as any); },
        },
        {
          emoji: '⭐',
          label: 'Subscription',
          sub: isPremium ? 'Premium active' : 'Upgrade to Premium',
          onPress: () => { close(); router.push('/paywall'); },
        },
      ],
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
      <View
        style={{
          backgroundColor: C.bg,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderTopWidth: 1,
          borderTopColor: C.border,
          maxHeight: '85%',
        }}
      >
        <SafeAreaView edges={['bottom']}>
          {/* Grabber */}
          <View
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: C.border,
              alignSelf: 'center',
              marginTop: 12,
              marginBottom: 4,
            }}
          />

          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: C.border,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.red, fontSize: 17, fontWeight: '900', letterSpacing: 2.5 }}>
                RED STRING
              </Text>
              <Text style={{ color: C.muted, fontSize: 11, fontWeight: '600', letterSpacing: 1.5, marginTop: 1 }}>
                MENU
              </Text>
            </View>
            <Pressable
              testID="hamburger-modal-close"
              onPress={close}
              style={({ pressed }) => ({
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: pressed ? C.surface2 : C.surface,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: C.border,
              })}
            >
              <X size={16} color={C.muted} strokeWidth={2} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 8 }}
          >
            {sections.map((section) => (
              <View key={section.title} style={{ paddingTop: 20, paddingHorizontal: 16 }}>
                <Text
                  style={{
                    color: C.muted,
                    fontSize: 10,
                    fontWeight: '800',
                    letterSpacing: 2,
                    marginBottom: 8,
                    paddingLeft: 4,
                  }}
                >
                  {section.title}
                </Text>
                <View
                  style={{
                    backgroundColor: C.surface,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: C.border,
                    overflow: 'hidden',
                  }}
                >
                  {section.items.map((item, idx) => (
                    <Pressable
                      key={item.label}
                      testID={`menu-item-${item.label.toLowerCase().replace(/\s/g, '-')}`}
                      disabled={item.isLoading}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        item.onPress();
                      }}
                      style={({ pressed }) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        backgroundColor: pressed ? C.surface2 : 'transparent',
                        borderTopWidth: idx > 0 ? 1 : 0,
                        borderTopColor: C.border,
                        opacity: item.isLoading ? 0.6 : 1,
                      })}
                    >
                      <Text style={{ fontSize: 22, marginRight: 14 }}>{item.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: item.danger ? C.red : C.text, fontSize: 15, fontWeight: '600' }}>
                          {item.label}
                        </Text>
                        {item.sub ? (
                          <Text style={{ color: C.muted, fontSize: 12, marginTop: 1 }} numberOfLines={1}>
                            {item.sub}
                          </Text>
                        ) : null}
                      </View>
                      <ChevronRight size={16} color={C.muted} strokeWidth={2} />
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}

            {/* Sign Out */}
            <View style={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12 }}>
              <Pressable
                testID="sign-out-button"
                onPress={handleSignOut}
                disabled={isSigningOut}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  backgroundColor: pressed ? 'rgba(196,30,58,0.15)' : 'rgba(196,30,58,0.08)',
                  borderRadius: 14,
                  paddingVertical: 14,
                  borderWidth: 1,
                  borderColor: 'rgba(196,30,58,0.25)',
                  opacity: isSigningOut ? 0.6 : 1,
                })}
              >
                <LogOut size={17} color={C.red} strokeWidth={2} />
                <Text style={{ color: C.red, fontSize: 15, fontWeight: '700' }}>
                  {isSigningOut ? 'Signing out...' : 'Sign Out'}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </View>
  );
}
