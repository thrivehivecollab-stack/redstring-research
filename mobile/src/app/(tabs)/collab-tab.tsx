import React, { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFonts, BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import {
  CourierPrime_400Regular,
  CourierPrime_700Bold,
} from '@expo-google-fonts/courier-prime';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import useCollabStore, { CollabSession } from '@/lib/state/collab-store';

const C = {
  bg: '#1A1614',
  surface: '#231F1C',
  surfaceAlt: '#2A2522',
  red: '#C41E3A',
  amber: '#D4A574',
  text: '#E8DCC8',
  muted: '#6B5B4F',
  border: '#3D332C',
} as const;

const SessionCard = React.memo(function SessionCard({ session, index }: { session: CollabSession; index: number }) {
  const memberCount = session.members?.length ?? 0;

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(300)}>
      <View
        testID={`collab-session-card-${session.id}`}
        style={{
          marginHorizontal: 16,
          marginBottom: 10,
          backgroundColor: C.surface,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: C.border,
          overflow: 'hidden',
          flexDirection: 'row',
        }}
      >
        {/* Accent bar */}
        <View style={{ width: 4, backgroundColor: C.red }} />

        <View style={{ flex: 1, padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
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
              {session.title}
            </Text>
            {session.pendingCount > 0 ? (
              <View
                style={{
                  backgroundColor: C.red,
                  borderRadius: 10,
                  minWidth: 22,
                  height: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 6,
                }}
              >
                <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '800' }}>
                  {session.pendingCount}
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>
            Investigation ID: {session.investigationId}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 }}>
            <View
              style={{
                backgroundColor: C.red + '22',
                borderRadius: 10,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderWidth: 1,
                borderColor: C.red + '44',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Text style={{ fontSize: 12 }}>👥</Text>
              <Text style={{ color: C.text, fontSize: 11, fontWeight: '700' }}>
                {memberCount} {memberCount === 1 ? 'member' : 'members'}
              </Text>
            </View>

            {session.pendingCount > 0 ? (
              <View
                style={{
                  backgroundColor: C.amber + '22',
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderWidth: 1,
                  borderColor: C.amber + '44',
                }}
              >
                <Text style={{ color: C.amber, fontSize: 11, fontWeight: '700' }}>
                  {session.pendingCount} pending
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </Animated.View>
  );
});

function EmptyState() {
  const router = useRouter();

  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}
    >
      <Text style={{ fontSize: 48, marginBottom: 16 }}>🤝</Text>
      <Text style={{ color: '#E8DCC8', fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 8 }}>
        Your investigation team
      </Text>
      <Text style={{ color: '#6B5B4F', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 24 }}>
        Invite a co-investigator, contributor, or viewer to join your investigation
      </Text>
      <Pressable
        onPress={() => router.push('/collab')}
        style={({ pressed }) => ({
          backgroundColor: pressed ? '#A3162E' : '#C41E3A',
          borderRadius: 12,
          paddingHorizontal: 24,
          paddingVertical: 14,
        })}
      >
        <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>Invite Someone</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function CollabTabScreen() {
  const router = useRouter();
  const sessions = useCollabStore((s) => s.sessions);
  const fetchSessions = useCollabStore((s) => s.fetchSessions);

  const [fontsLoaded] = useFonts({ BebasNeue_400Regular, CourierPrime_400Regular, CourierPrime_700Bold });

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const renderItem = ({ item, index }: { item: CollabSession; index: number }) => (
    <SessionCard session={item} index={index} />
  );

  const keyExtractor = (item: CollabSession) => item.id;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }} testID="collab-tab-screen">
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 14,
            borderBottomWidth: 1,
            borderBottomColor: C.border,
          }}
        >
          <Text
            style={{
              color: C.text,
              fontSize: 34,
              fontFamily: fontsLoaded ? 'BebasNeue_400Regular' : undefined,
              letterSpacing: 2,
              lineHeight: 36,
            }}
          >
            COLLABORATIONS
          </Text>
          <Text
            style={{
              color: C.muted,
              fontSize: 11,
              fontFamily: fontsLoaded ? 'CourierPrime_400Regular' : undefined,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              marginTop: 2,
            }}
          >
            shared investigations
          </Text>
        </View>

        {/* Sessions list */}
        <FlatList
          testID="collab-sessions-list"
          data={sessions}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={{
            paddingTop: 12,
            paddingBottom: 100,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
          windowSize={10}
          removeClippedSubviews={true}
          ListEmptyComponent={<EmptyState />}
        />

        {/* War Room button */}
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
            testID="war-room-button"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/collab');
            }}
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
            <Text style={{ fontSize: 18 }}>🚨</Text>
            <Text
              style={{
                color: '#FFF',
                fontSize: 15,
                fontWeight: '800',
                fontFamily: fontsLoaded ? 'CourierPrime_700Bold' : undefined,
                letterSpacing: 0.5,
              }}
            >
              War Room
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
