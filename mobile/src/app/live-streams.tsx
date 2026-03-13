import React from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Tv, Users, Eye } from 'lucide-react-native';
import {
  useFonts,
  BebasNeue_400Regular,
} from '@expo-google-fonts/bebas-neue';
import {
  CourierPrime_400Regular,
  CourierPrime_700Bold,
} from '@expo-google-fonts/courier-prime';

const C = {
  bg: '#1A1614',
  surface: '#231F1C',
  surface2: '#2D2825',
  text: '#E8DCC8',
  muted: '#6B5B4F',
  border: '#3D332C',
  red: '#C41E3A',
  redDark: '#A3162E',
} as const;

// Mock live stream data for UI demonstration
const MOCK_STREAMS: {
  id: string;
  broadcaster: string;
  title: string;
  viewers: number;
  category: string;
  avatarLetter: string;
}[] = [];

export default function LiveStreamsScreen() {
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    BebasNeue_400Regular,
    CourierPrime_400Regular,
    CourierPrime_700Bold,
  });

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }} testID="live-streams-screen">
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 14,
            borderBottomWidth: 1,
            borderBottomColor: C.border,
          }}
        >
          <Pressable
            testID="live-streams-back-button"
            onPress={() => router.back()}
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: pressed ? C.surface2 : C.surface,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: C.border,
              marginRight: 12,
            })}
          >
            <ChevronLeft size={20} color={C.text} strokeWidth={2} />
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: fontsLoaded ? 'BebasNeue_400Regular' : undefined,
                fontSize: 22,
                letterSpacing: 3,
                color: C.text,
                lineHeight: 24,
              }}
            >
              LIVE{' '}
              <Text style={{ color: C.red }}>STREAMS</Text>
            </Text>
            <Text
              style={{
                color: C.muted,
                fontSize: 10,
                fontFamily: fontsLoaded ? 'CourierPrime_400Regular' : undefined,
                letterSpacing: 1,
                marginTop: 1,
              }}
            >
              Who's broadcasting right now
            </Text>
          </View>

          {/* Live indicator pill */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              backgroundColor: 'rgba(196,30,58,0.12)',
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderWidth: 1,
              borderColor: 'rgba(196,30,58,0.25)',
            }}
          >
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.red }} />
            <Text
              style={{
                color: C.red,
                fontSize: 9,
                fontFamily: fontsLoaded ? 'CourierPrime_700Bold' : undefined,
                letterSpacing: 1,
              }}
            >
              {MOCK_STREAMS.length} LIVE
            </Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48 }}
        >
          {MOCK_STREAMS.length > 0 ? (
            <>
              <Text
                style={{
                  color: C.muted,
                  fontSize: 9,
                  fontFamily: fontsLoaded ? 'CourierPrime_700Bold' : undefined,
                  letterSpacing: 2,
                  marginBottom: 12,
                  marginTop: 20,
                }}
              >
                CURRENTLY LIVE
              </Text>
              {MOCK_STREAMS.map((stream) => (
                <Pressable
                  key={stream.id}
                  testID={`live-stream-${stream.id}`}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 14,
                    backgroundColor: pressed ? C.surface2 : C.surface,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: C.border,
                    padding: 14,
                    marginBottom: 10,
                  })}
                >
                  {/* Avatar */}
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: C.red,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '800' }}>
                      {stream.avatarLetter}
                    </Text>
                  </View>
                  {/* Info */}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: C.text,
                        fontSize: 14,
                        fontWeight: '600',
                        marginBottom: 2,
                      }}
                      numberOfLines={1}
                    >
                      {stream.title}
                    </Text>
                    <Text
                      style={{
                        color: C.muted,
                        fontSize: 11,
                        fontFamily: fontsLoaded ? 'CourierPrime_400Regular' : undefined,
                        marginBottom: 4,
                      }}
                    >
                      {stream.broadcaster}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View
                        style={{
                          backgroundColor: 'rgba(196,30,58,0.12)',
                          borderRadius: 5,
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderWidth: 1,
                          borderColor: 'rgba(196,30,58,0.25)',
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 3,
                        }}
                      >
                        <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: C.red }} />
                        <Text
                          style={{
                            color: C.red,
                            fontSize: 9,
                            fontFamily: fontsLoaded ? 'CourierPrime_700Bold' : undefined,
                            letterSpacing: 0.5,
                          }}
                        >
                          LIVE
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Eye size={11} color={C.muted} strokeWidth={2} />
                        <Text
                          style={{
                            color: C.muted,
                            fontSize: 10,
                            fontFamily: fontsLoaded ? 'CourierPrime_400Regular' : undefined,
                          }}
                        >
                          {stream.viewers.toLocaleString()}
                        </Text>
                      </View>
                      <Text
                        style={{
                          color: C.muted,
                          fontSize: 10,
                          fontFamily: fontsLoaded ? 'CourierPrime_400Regular' : undefined,
                        }}
                      >
                        {stream.category}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </>
          ) : (
            /* Empty state */
            <View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                paddingTop: 80,
                paddingHorizontal: 32,
              }}
              testID="live-streams-empty"
            >
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: C.surface,
                  borderWidth: 1.5,
                  borderColor: C.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 20,
                }}
              >
                <Tv size={34} color={C.muted} strokeWidth={1.5} />
              </View>

              <Text
                style={{
                  color: C.text,
                  fontSize: 17,
                  fontWeight: '700',
                  textAlign: 'center',
                  marginBottom: 8,
                }}
              >
                No live streams right now
              </Text>
              <Text
                style={{
                  color: C.muted,
                  fontSize: 12,
                  fontFamily: fontsLoaded ? 'CourierPrime_400Regular' : undefined,
                  textAlign: 'center',
                  lineHeight: 18,
                  marginBottom: 40,
                }}
              >
                When investigators go live, their broadcasts will appear here. Check back soon or start your own broadcast.
              </Text>

              {/* Divider */}
              <View
                style={{
                  width: '100%',
                  height: 1,
                  backgroundColor: C.border,
                  marginBottom: 32,
                }}
              />

              {/* Upcoming section */}
              <Text
                style={{
                  color: C.muted,
                  fontSize: 9,
                  fontFamily: fontsLoaded ? 'CourierPrime_700Bold' : undefined,
                  letterSpacing: 2,
                  marginBottom: 16,
                  alignSelf: 'flex-start',
                }}
              >
                PLATFORM FEATURES
              </Text>

              {[
                {
                  icon: <Tv size={18} color={C.red} strokeWidth={1.5} />,
                  title: 'Live investigations',
                  desc: 'Watch other researchers connect evidence in real-time',
                },
                {
                  icon: <Users size={18} color={C.red} strokeWidth={1.5} />,
                  title: 'Community streams',
                  desc: 'Follow investigators and get notified when they go live',
                },
              ].map((feat, i) => (
                <View
                  key={i}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: 12,
                    backgroundColor: C.surface,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: C.border,
                    padding: 14,
                    marginBottom: 10,
                    width: '100%',
                  }}
                >
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      backgroundColor: 'rgba(196,30,58,0.1)',
                      borderWidth: 1,
                      borderColor: 'rgba(196,30,58,0.2)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {feat.icon}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: C.text,
                        fontSize: 13,
                        fontWeight: '600',
                        marginBottom: 3,
                      }}
                    >
                      {feat.title}
                    </Text>
                    <Text
                      style={{
                        color: C.muted,
                        fontSize: 11,
                        fontFamily: fontsLoaded ? 'CourierPrime_400Regular' : undefined,
                        lineHeight: 15,
                      }}
                    >
                      {feat.desc}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
