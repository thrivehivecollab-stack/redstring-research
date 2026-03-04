import React from 'react';
import { View, Text, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Play } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Video, ResizeMode } from 'expo-av';

const COLORS = {
  background: '#1A1614',
  surface: '#231F1C',
  red: '#C41E3A',
  amber: '#D4A574',
  textLight: '#E8DCC8',
  muted: '#6B5B4F',
  border: '#3D332C',
} as const;

interface Props {
  visible: boolean;
  onClose: () => void;
  videoUri?: string;
}

export default function VideoOnboardingModal({ visible, onClose, videoUri }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' }}>
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          <Animated.View
            entering={FadeIn.duration(300)}
            style={{ flex: 1, paddingHorizontal: 20 }}
          >
            {/* Close button */}
            <Pressable
              testID="video-onboarding-close"
              onPress={onClose}
              style={({ pressed }) => ({
                position: 'absolute',
                top: 12,
                right: 0,
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: pressed ? COLORS.border : 'rgba(61,51,44,0.7)',
                borderWidth: 1,
                borderColor: COLORS.border,
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
              })}
            >
              <X size={16} color={COLORS.muted} strokeWidth={2.5} />
            </Pressable>

            {/* Header */}
            <View style={{ alignItems: 'center', marginTop: 16, marginBottom: 28 }}>
              {/* Logo mark */}
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  backgroundColor: 'rgba(196,30,58,0.15)',
                  borderWidth: 1.5,
                  borderColor: 'rgba(196,30,58,0.35)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 14,
                }}
              >
                <Text style={{ color: COLORS.red, fontSize: 22, fontWeight: '900', letterSpacing: -1 }}>
                  RS
                </Text>
              </View>

              <Text
                style={{
                  color: COLORS.textLight,
                  fontSize: 20,
                  fontWeight: '900',
                  letterSpacing: 2.5,
                  marginBottom: 4,
                }}
              >
                RED STRING RESEARCH
              </Text>
              <Text
                style={{
                  color: COLORS.amber,
                  fontSize: 13,
                  fontWeight: '600',
                  letterSpacing: 1,
                }}
              >
                How it works
              </Text>
            </View>

            {/* Video area */}
            <View
              style={{
                borderRadius: 16,
                overflow: 'hidden',
                backgroundColor: COLORS.surface,
                borderWidth: 1,
                borderColor: COLORS.border,
                aspectRatio: 16 / 9,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.4,
                shadowRadius: 16,
                elevation: 12,
              }}
            >
              {videoUri ? (
                <Video
                  source={{ uri: videoUri }}
                  style={{ flex: 1 }}
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay
                  useNativeControls
                  isLooping={false}
                />
              ) : (
                /* Placeholder state */
                <View
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: COLORS.surface,
                    gap: 12,
                  }}
                >
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: 'rgba(196,30,58,0.12)',
                      borderWidth: 1.5,
                      borderColor: 'rgba(196,30,58,0.25)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Play size={22} color={COLORS.red} strokeWidth={2} />
                  </View>
                  <Text style={{ color: COLORS.muted, fontSize: 13, fontWeight: '500', letterSpacing: 0.3 }}>
                    Onboarding video coming soon
                  </Text>
                </View>
              )}
            </View>

            {/* Description */}
            <View style={{ marginTop: 20, marginBottom: 28, alignItems: 'center' }}>
              <Text
                style={{
                  color: COLORS.textLight,
                  fontSize: 15,
                  fontWeight: '600',
                  textAlign: 'center',
                  lineHeight: 22,
                  marginBottom: 6,
                }}
              >
                Connect the dots. Uncover the truth.
              </Text>
              <Text
                style={{
                  color: COLORS.muted,
                  fontSize: 13,
                  textAlign: 'center',
                  lineHeight: 19,
                }}
              >
                Build visual investigations with nodes, red strings, and timelines.
              </Text>
            </View>

            {/* Get Started button */}
            <Pressable
              testID="video-onboarding-get-started"
              onPress={onClose}
              style={({ pressed }) => ({
                backgroundColor: pressed ? '#A3162E' : COLORS.red,
                borderRadius: 14,
                paddingVertical: 16,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: COLORS.red,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.35,
                shadowRadius: 12,
                elevation: 8,
              })}
            >
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 16,
                  fontWeight: '800',
                  letterSpacing: 0.5,
                }}
              >
                Get Started
              </Text>
            </Pressable>
          </Animated.View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
