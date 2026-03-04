import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

interface FeatureCard {
  emoji: string;
  iconBg: string;
  name: string;
  description: string;
  accentColor: string;
}

const FEATURES: FeatureCard[] = [
  {
    emoji: '🗂️',
    iconBg: 'rgba(196,30,58,0.18)',
    name: 'Investigation Canvas',
    description:
      'Your digital corkboard. Pin evidence, notes, images, and links as nodes. Arrange them freely across an infinite workspace.',
    accentColor: COLORS.red,
  },
  {
    emoji: '🔴',
    iconBg: 'rgba(196,30,58,0.18)',
    name: 'Red String Connections',
    description:
      'Draw connections between any two nodes. The string follows the truth — tag each link with context, weight, and confidence.',
    accentColor: COLORS.red,
  },
  {
    emoji: '🕐',
    iconBg: 'rgba(212,165,116,0.18)',
    name: 'Timeline View',
    description:
      'Every clue has a timestamp. See your investigation unfold chronologically and spot patterns hiding in plain sight.',
    accentColor: COLORS.amber,
  },
  {
    emoji: '🔐',
    iconBg: 'rgba(212,165,116,0.18)',
    name: 'Collaborate Securely',
    description:
      'Invite trusted investigators with granular permissions: viewer, contributor, or co-investigator. Your board, your rules.',
    accentColor: COLORS.amber,
  },
  {
    emoji: '📬',
    iconBg: 'rgba(196,30,58,0.18)',
    name: 'Tip Inbox',
    description:
      'Receive anonymous tips from sources. AI vets credibility automatically so you focus on the leads that matter.',
    accentColor: COLORS.red,
  },
];

const CARD_WIDTH = SCREEN_WIDTH - 48;
const CARD_PADDING = 24;

function FeatureCardItem({ feature, index }: { feature: FeatureCard; index: number }) {
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 60).duration(400)}
      style={{
        width: CARD_WIDTH,
        marginHorizontal: CARD_PADDING / 2,
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
        elevation: 10,
      }}
    >
      {/* Card body */}
      <View style={{ padding: 28, flex: 1 }}>
        {/* Icon circle */}
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: feature.iconBg,
            borderWidth: 1.5,
            borderColor: `${feature.accentColor}40`,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 22,
          }}
        >
          <Text style={{ fontSize: 34 }}>{feature.emoji}</Text>
        </View>

        {/* Feature name */}
        <Text
          style={{
            color: COLORS.textLight,
            fontSize: 22,
            fontWeight: '900',
            letterSpacing: 0.2,
            marginBottom: 12,
            lineHeight: 28,
          }}
        >
          {feature.name}
        </Text>

        {/* Description */}
        <Text
          style={{
            color: COLORS.muted,
            fontSize: 15,
            lineHeight: 23,
            fontWeight: '400',
            letterSpacing: 0.1,
          }}
        >
          {feature.description}
        </Text>
      </View>

      {/* Bottom accent bar */}
      <View
        style={{
          height: 3,
          backgroundColor: feature.accentColor,
          opacity: 0.7,
        }}
      />
    </Animated.View>
  );
}

export default function VideoOnboardingModal({ visible, onClose }: Props) {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const scrollRef = useRef<ScrollView>(null);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (CARD_WIDTH + CARD_PADDING));
    if (index !== activeIndex && index >= 0 && index < FEATURES.length) {
      setActiveIndex(index);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View
        style={{ flex: 1, backgroundColor: COLORS.background }}
      >
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          <Animated.View
            entering={FadeIn.duration(350)}
            style={{ flex: 1 }}
          >
            {/* Top row: close button */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
                paddingHorizontal: 20,
                paddingTop: 8,
                paddingBottom: 4,
              }}
            >
              <Pressable
                testID="video-onboarding-close"
                onPress={onClose}
                style={({ pressed }) => ({
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: pressed ? COLORS.border : 'rgba(61,51,44,0.8)',
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                })}
              >
                <X size={16} color={COLORS.muted} strokeWidth={2.5} />
              </Pressable>
            </View>

            {/* Header */}
            <View style={{ alignItems: 'center', paddingHorizontal: 24, paddingBottom: 28, paddingTop: 8 }}>
              {/* RS logo mark */}
              <View
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 16,
                  backgroundColor: 'rgba(196,30,58,0.14)',
                  borderWidth: 1.5,
                  borderColor: 'rgba(196,30,58,0.38)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                  shadowColor: COLORS.red,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.25,
                  shadowRadius: 10,
                  elevation: 6,
                }}
              >
                <Text
                  style={{
                    color: COLORS.red,
                    fontSize: 24,
                    fontWeight: '900',
                    letterSpacing: -1,
                  }}
                >
                  RS
                </Text>
              </View>

              <Text
                style={{
                  color: COLORS.textLight,
                  fontSize: 18,
                  fontWeight: '900',
                  letterSpacing: 3,
                  marginBottom: 6,
                  textAlign: 'center',
                }}
              >
                RED STRING RESEARCH
              </Text>

              <Text
                style={{
                  color: COLORS.amber,
                  fontSize: 13,
                  fontWeight: '600',
                  letterSpacing: 1.2,
                  textAlign: 'center',
                  fontStyle: 'italic',
                }}
              >
                Every thread leads somewhere.
              </Text>
            </View>

            {/* Feature cards carousel */}
            <ScrollView
              ref={scrollRef}
              horizontal
              pagingEnabled={false}
              snapToInterval={CARD_WIDTH + CARD_PADDING}
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              contentContainerStyle={{
                paddingHorizontal: CARD_PADDING / 2,
              }}
              style={{ flexGrow: 0 }}
            >
              {FEATURES.map((feature, index) => (
                <FeatureCardItem key={feature.name} feature={feature} index={index} />
              ))}
            </ScrollView>

            {/* Dot indicators */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 7,
                paddingTop: 20,
                paddingBottom: 12,
              }}
            >
              {FEATURES.map((_, i) => (
                <View
                  key={i}
                  style={{
                    width: i === activeIndex ? 20 : 7,
                    height: 7,
                    borderRadius: 4,
                    backgroundColor: i === activeIndex ? COLORS.red : COLORS.border,
                    opacity: i === activeIndex ? 1 : 0.7,
                  }}
                />
              ))}
            </View>

            {/* Swipe hint */}
            <Text
              style={{
                color: COLORS.muted,
                fontSize: 12,
                textAlign: 'center',
                letterSpacing: 0.5,
                marginBottom: 20,
                fontWeight: '500',
              }}
            >
              Swipe to explore features
            </Text>

            {/* Get Started button */}
            <View style={{ paddingHorizontal: 24, paddingBottom: 8 }}>
              <Pressable
                testID="video-onboarding-get-started"
                onPress={onClose}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? '#A3162E' : COLORS.red,
                  borderRadius: 16,
                  paddingVertical: 17,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: COLORS.red,
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.4,
                  shadowRadius: 14,
                  elevation: 8,
                })}
              >
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: 17,
                    fontWeight: '900',
                    letterSpacing: 1,
                  }}
                >
                  Get Started
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
