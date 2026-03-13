import React from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Radio, Mic, Video, Users, Wifi } from 'lucide-react-native';
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

export default function LiveBroadcastScreen() {
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    BebasNeue_400Regular,
    CourierPrime_400Regular,
    CourierPrime_700Bold,
  });

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }} testID="live-broadcast-screen">
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
            testID="live-broadcast-back-button"
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
              START{' '}
              <Text style={{ color: C.red }}>BROADCAST</Text>
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.red }} />
              <Text
                style={{
                  color: C.red,
                  fontSize: 9,
                  fontFamily: fontsLoaded ? 'CourierPrime_700Bold' : undefined,
                  letterSpacing: 1.5,
                }}
              >
                COMING SOON
              </Text>
            </View>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48 }}
        >
          {/* Camera preview placeholder */}
          <View
            style={{
              height: 220,
              borderRadius: 16,
              backgroundColor: '#0D0B09',
              borderWidth: 1.5,
              borderColor: C.border,
              marginTop: 24,
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {/* Corner brackets for camera feel */}
            <View style={{ position: 'absolute', top: 12, left: 12, width: 20, height: 20, borderTopWidth: 2, borderLeftWidth: 2, borderColor: C.red, borderTopLeftRadius: 4 }} />
            <View style={{ position: 'absolute', top: 12, right: 12, width: 20, height: 20, borderTopWidth: 2, borderRightWidth: 2, borderColor: C.red, borderTopRightRadius: 4 }} />
            <View style={{ position: 'absolute', bottom: 12, left: 12, width: 20, height: 20, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: C.red, borderBottomLeftRadius: 4 }} />
            <View style={{ position: 'absolute', bottom: 12, right: 12, width: 20, height: 20, borderBottomWidth: 2, borderRightWidth: 2, borderColor: C.red, borderBottomRightRadius: 4 }} />

            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: 'rgba(196,30,58,0.12)',
                borderWidth: 1.5,
                borderColor: 'rgba(196,30,58,0.3)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <Video size={28} color={C.red} strokeWidth={1.5} />
            </View>
            <Text
              style={{
                color: C.muted,
                fontSize: 12,
                fontFamily: fontsLoaded ? 'CourierPrime_400Regular' : undefined,
                letterSpacing: 0.5,
              }}
            >
              Camera preview will appear here
            </Text>
          </View>

          {/* Broadcast details form (placeholder) */}
          <View style={{ marginTop: 24 }}>
            <Text
              style={{
                color: C.muted,
                fontSize: 9,
                fontFamily: fontsLoaded ? 'CourierPrime_700Bold' : undefined,
                letterSpacing: 2,
                marginBottom: 10,
              }}
            >
              BROADCAST DETAILS
            </Text>

            {/* Title field placeholder */}
            <View
              style={{
                backgroundColor: C.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: C.border,
                padding: 14,
                marginBottom: 10,
              }}
            >
              <Text
                style={{
                  color: C.muted,
                  fontSize: 13,
                  fontFamily: fontsLoaded ? 'CourierPrime_400Regular' : undefined,
                }}
              >
                Broadcast title...
              </Text>
            </View>

            {/* Description field placeholder */}
            <View
              style={{
                backgroundColor: C.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: C.border,
                padding: 14,
                minHeight: 76,
                marginBottom: 20,
              }}
            >
              <Text
                style={{
                  color: C.muted,
                  fontSize: 13,
                  fontFamily: fontsLoaded ? 'CourierPrime_400Regular' : undefined,
                }}
              >
                Tell your audience what this broadcast is about...
              </Text>
            </View>
          </View>

          {/* Feature cards */}
          <Text
            style={{
              color: C.muted,
              fontSize: 9,
              fontFamily: fontsLoaded ? 'CourierPrime_700Bold' : undefined,
              letterSpacing: 2,
              marginBottom: 12,
            }}
          >
            UPCOMING FEATURES
          </Text>

          {[
            {
              icon: <Radio size={20} color={C.red} strokeWidth={1.5} />,
              title: 'Live streaming',
              desc: 'Broadcast your investigation board in real-time to followers',
            },
            {
              icon: <Mic size={20} color={C.red} strokeWidth={1.5} />,
              title: 'Voice commentary',
              desc: 'Add live audio commentary as you connect the evidence',
            },
            {
              icon: <Users size={20} color={C.red} strokeWidth={1.5} />,
              title: 'Viewer interaction',
              desc: 'Accept questions and tips from your live audience',
            },
            {
              icon: <Wifi size={20} color={C.red} strokeWidth={1.5} />,
              title: 'Multi-platform',
              desc: 'Simultaneously stream to YouTube, Rumble, and more',
            },
          ].map((feat, i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 14,
                backgroundColor: C.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: C.border,
                padding: 14,
                marginBottom: 10,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
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
                    fontSize: 14,
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
                    lineHeight: 16,
                  }}
                >
                  {feat.desc}
                </Text>
              </View>
            </View>
          ))}

          {/* Start button (disabled) */}
          <View
            style={{
              marginTop: 20,
              borderRadius: 14,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                paddingVertical: 16,
                backgroundColor: 'rgba(196,30,58,0.15)',
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: 'rgba(196,30,58,0.3)',
              }}
            >
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.red }} />
              <Text
                style={{
                  color: C.red,
                  fontSize: 15,
                  fontFamily: fontsLoaded ? 'CourierPrime_700Bold' : undefined,
                  letterSpacing: 1,
                }}
              >
                GO LIVE — COMING SOON
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
