import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { X } from 'lucide-react-native';

const C = {
  bg: '#1A1614',
  surface: '#231F1C',
  red: '#C41E3A',
  amber: '#D4A574',
  text: '#E8DCC8',
  muted: '#9B8B7E',
  border: '#3D332C',
} as const;

const APP_VERSION = '2.0';
const WHATS_NEW_SEEN_KEY = 'whats_new_seen_version';

interface FeatureEntry {
  icon: string;
  title: string;
  description: string;
}

const FEATURES: FeatureEntry[] = [
  {
    icon: '🔴',
    title: 'Curved Bezier Strings',
    description: 'Connections now flow as organic curves. Change color, thickness, and style per string.',
  },
  {
    icon: '🗺️',
    title: 'Mind Map Mode',
    description: 'Toggle to a neural network view. Nodes radiate from the most-connected center.',
  },
  {
    icon: '⏱️',
    title: 'Investigation Timeline',
    description: 'Pin evidence to exact dates. Multiple timelines per person. Expandable to minute-level precision.',
  },
  {
    icon: '🎨',
    title: 'AI Color Suggestions',
    description: 'AI analyzes your canvas and recommends a color-coding system based on people, places, and patterns.',
  },
  {
    icon: '📎',
    title: 'Source Attribution',
    description: 'Credit every source. Chain-of-custody tracking. Export full citations.',
  },
  {
    icon: '📬',
    title: 'Tip Inbox',
    description: 'Receive anonymous tips. AI vets credibility. Reply securely. Merge to canvas.',
  },
  {
    icon: '👥',
    title: 'Collaboration',
    description: 'Invite investigators with permission tiers. Approve contributions. Full attribution.',
  },
];

interface WhatsNewModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function WhatsNewModal({ visible, onClose }: WhatsNewModalProps) {
  const translateY = useSharedValue(60);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 20, stiffness: 240 });
      opacity.value = withTiming(1, { duration: 250 });
    } else {
      translateY.value = withTiming(60, { duration: 200 });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible, translateY, opacity]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.72)',
          justifyContent: 'flex-end',
        }}
        onPress={handleClose}
      >
        <Animated.View
          style={[
            {
              backgroundColor: C.surface,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              borderTopWidth: 3,
              borderTopColor: C.red,
              borderWidth: 1,
              borderColor: C.border,
              maxHeight: '88%',
              overflow: 'hidden',
            },
            sheetStyle,
          ]}
        >
          <Pressable onPress={() => {}}>
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 22,
                paddingTop: 22,
                paddingBottom: 16,
                borderBottomWidth: 1,
                borderBottomColor: C.border,
              }}
            >
              <View>
                <Text
                  style={{
                    color: C.text,
                    fontSize: 22,
                    fontWeight: '800',
                    letterSpacing: 0.3,
                  }}
                >
                  What's New in Red String
                </Text>
                <View
                  style={{
                    backgroundColor: C.red + '22',
                    borderRadius: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    alignSelf: 'flex-start',
                    marginTop: 4,
                    borderWidth: 1,
                    borderColor: C.red + '44',
                  }}
                >
                  <Text
                    style={{
                      color: C.red,
                      fontSize: 12,
                      fontWeight: '700',
                      letterSpacing: 1,
                    }}
                  >
                    v{APP_VERSION}
                  </Text>
                </View>
              </View>
              <Pressable
                testID="whats-new-close-button"
                onPress={handleClose}
                style={({ pressed }) => ({
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: pressed ? C.border : C.bg,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: C.border,
                })}
              >
                <X size={16} color={C.muted} strokeWidth={2} />
              </Pressable>
            </View>

            {/* Feature list */}
            <ScrollView
              contentContainerStyle={{ padding: 22, paddingBottom: 48 }}
              showsVerticalScrollIndicator={false}
            >
              {FEATURES.map((feature, index) => (
                <Animated.View
                  key={feature.title}
                  entering={undefined}
                  style={{
                    flexDirection: 'row',
                    gap: 14,
                    marginBottom: index < FEATURES.length - 1 ? 20 : 0,
                    alignItems: 'flex-start',
                  }}
                >
                  {/* Icon */}
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      backgroundColor: C.bg,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: C.border,
                      flexShrink: 0,
                    }}
                  >
                    <Text style={{ fontSize: 20 }}>{feature.icon}</Text>
                  </View>

                  {/* Text */}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: C.text,
                        fontSize: 15,
                        fontWeight: '700',
                        marginBottom: 4,
                      }}
                    >
                      {feature.title}
                    </Text>
                    <Text
                      style={{
                        color: C.muted,
                        fontSize: 14,
                        lineHeight: 20,
                      }}
                    >
                      {feature.description}
                    </Text>
                  </View>
                </Animated.View>
              ))}
            </ScrollView>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

export async function shouldShowWhatsNew(): Promise<boolean> {
  try {
    const seen = await AsyncStorage.getItem(WHATS_NEW_SEEN_KEY);
    return seen !== APP_VERSION;
  } catch {
    return false;
  }
}

export async function markWhatsNewSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(WHATS_NEW_SEEN_KEY, APP_VERSION);
  } catch {
    // ignore
  }
}
