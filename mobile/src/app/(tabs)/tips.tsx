import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  Share,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFonts, BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import {
  CourierPrime_400Regular,
  CourierPrime_700Bold,
} from '@expo-google-fonts/courier-prime';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { api } from '@/lib/api/api';
import { useSession } from '@/lib/auth/use-session';
import type { Tip, TipStatus } from '@/lib/types';

const C = {
  bg: '#1A1614',
  surface: '#231F1C',
  surfaceAlt: '#2A2522',
  red: '#C41E3A',
  amber: '#D4A574',
  text: '#E8DCC8',
  muted: '#6B5B4F',
  border: '#3D332C',
  green: '#22C55E',
} as const;

function timeAgo(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function statusAccentColor(status: TipStatus): string {
  switch (status) {
    case 'unread': return C.red;
    case 'investigating': return C.amber;
    case 'verified': return C.green;
    case 'dismissed': return C.muted;
  }
}

function statusLabel(status: TipStatus): string {
  switch (status) {
    case 'unread': return 'UNREAD';
    case 'investigating': return 'INVESTIGATING';
    case 'verified': return 'VERIFIED';
    case 'dismissed': return 'DISMISSED';
  }
}

function TipCard({ tip, index, onPress }: { tip: Tip; index: number; onPress: () => void }) {
  const accentColor = statusAccentColor(tip.status);
  const isUnread = tip.status === 'unread';

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(300)}>
      <Pressable
        testID={`tips-tab-card-${tip.id}`}
        onPress={onPress}
        style={({ pressed }) => ({
          marginHorizontal: 16,
          marginBottom: 10,
          backgroundColor: pressed ? C.surfaceAlt : C.surface,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: C.border,
          flexDirection: 'row',
          overflow: 'hidden',
          opacity: pressed ? 0.95 : 1,
        })}
      >
        <View style={{ width: 4, backgroundColor: accentColor }} />
        <View style={{ flex: 1, padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            {isUnread ? (
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: C.red,
                  marginTop: 5,
                  flexShrink: 0,
                }}
              />
            ) : null}
            <Text
              style={{
                flex: 1,
                color: C.text,
                fontSize: 16,
                fontWeight: '800',
                lineHeight: 20,
              }}
              numberOfLines={1}
            >
              {tip.subject}
            </Text>
            <Text style={{ color: C.muted, fontSize: 11 }}>{timeAgo(tip.submittedAt)}</Text>
          </View>

          <Text style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>
            {tip.isAnonymous
              ? 'Anonymous'
              : tip.tipperHandle
              ? `@${tip.tipperHandle}`
              : tip.tipperName ?? 'Unknown'}
          </Text>

          <Text
            style={{ color: C.text, fontSize: 13, lineHeight: 18, marginTop: 6, opacity: 0.7 }}
            numberOfLines={2}
          >
            {tip.content}
          </Text>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 10,
            }}
          >
            <View
              style={{
                backgroundColor: accentColor + '22',
                borderRadius: 10,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderWidth: 1,
                borderColor: accentColor + '44',
              }}
            >
              <Text style={{ color: accentColor, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>
                {statusLabel(tip.status)}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function EmptyState() {
  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingTop: 60 }}
    >
      <Text style={{ fontSize: 56, marginBottom: 16 }}>📬</Text>
      <Text
        style={{
          color: C.text,
          fontSize: 18,
          fontWeight: '800',
          marginBottom: 8,
          textAlign: 'center',
          letterSpacing: 0.5,
        }}
      >
        No tips yet
      </Text>
      <Text
        style={{
          color: C.muted,
          fontSize: 13,
          lineHeight: 20,
          textAlign: 'center',
        }}
      >
        Share your tip link to start receiving anonymous submissions
      </Text>
    </Animated.View>
  );
}

export default function TipsTabScreen() {
  const router = useRouter();
  const { data: session } = useSession();
  const userId = session?.user?.id ?? '';

  const [bebasLoaded] = useFonts({ BebasNeue_400Regular });
  const [courierLoaded] = useFonts({ CourierPrime_400Regular, CourierPrime_700Bold });

  const { data: tips, isLoading, refetch, isRefetching } = useQuery<Tip[]>({
    queryKey: ['tips'],
    queryFn: () => api.get<Tip[]>('/api/tips'),
    enabled: !!userId,
  });

  const unreadCount = React.useMemo(
    () => (tips ?? []).filter((t) => t.status === 'unread').length,
    [tips]
  );

  const handleTipPress = useCallback(
    (tip: Tip) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push('/tip-inbox');
    },
    [router]
  );

  const handleShareLink = useCallback(async () => {
    if (!userId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const tipLink = `${process.env.EXPO_PUBLIC_BACKEND_URL}/tip-submit?for=${userId}`;
    try {
      await Share.share({
        message: tipLink,
        title: 'Submit a tip to my investigation',
      });
    } catch {
      // ignore
    }
  }, [userId]);

  const renderItem = useCallback(
    ({ item, index }: { item: Tip; index: number }) => (
      <TipCard tip={item} index={index} onPress={() => handleTipPress(item)} />
    ),
    [handleTipPress]
  );

  const keyExtractor = useCallback((item: Tip) => item.id, []);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }} testID="tips-tab-screen">
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 14,
            borderBottomWidth: 1,
            borderBottomColor: C.border,
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
          }}
        >
          <View>
            <Text
              style={{
                color: C.text,
                fontSize: 34,
                fontFamily: bebasLoaded ? 'BebasNeue_400Regular' : undefined,
                letterSpacing: 2,
                lineHeight: 36,
              }}
            >
              TIP INBOX
            </Text>
            <Text
              style={{
                color: C.muted,
                fontSize: 11,
                fontFamily: courierLoaded ? 'CourierPrime_400Regular' : undefined,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                marginTop: 2,
              }}
            >
              anonymous submissions
            </Text>
          </View>

          {unreadCount > 0 ? (
            <View
              style={{
                backgroundColor: C.red,
                borderRadius: 12,
                minWidth: 28,
                height: 28,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 8,
                marginBottom: 4,
              }}
            >
              <Text
                style={{
                  color: '#FFF',
                  fontSize: 13,
                  fontWeight: '800',
                  fontFamily: courierLoaded ? 'CourierPrime_700Bold' : undefined,
                }}
              >
                {unreadCount}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={C.red} size="large" />
            <Text style={{ color: C.muted, fontSize: 13, marginTop: 12 }}>Loading tips...</Text>
          </View>
        ) : (
          <FlatList
            testID="tips-tab-list"
            data={tips ?? []}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={{
              paddingTop: 12,
              paddingBottom: 100,
              flexGrow: 1,
            }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={() => refetch()}
                tintColor={C.red}
              />
            }
            ListEmptyComponent={<EmptyState />}
          />
        )}

        {/* My Tip Link button */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            paddingHorizontal: 20,
            paddingBottom: 20,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: C.border,
            backgroundColor: C.bg,
          }}
        >
          <Pressable
            testID="my-tip-link-button"
            onPress={handleShareLink}
            style={({ pressed }) => ({
              backgroundColor: pressed ? '#A3162E' : C.red,
              borderRadius: 14,
              paddingVertical: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            })}
          >
            <Text style={{ fontSize: 18 }}>📬</Text>
            <Text
              style={{
                color: '#FFF',
                fontSize: 15,
                fontWeight: '800',
                fontFamily: courierLoaded ? 'CourierPrime_700Bold' : undefined,
                letterSpacing: 0.5,
              }}
            >
              My Tip Link
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
