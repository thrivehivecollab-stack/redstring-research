import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeInDown,
  FadeIn,
} from 'react-native-reanimated';

const C = {
  bg: '#0F0D0B',
  accent: '#C41E3A',
  text: '#E8DCC8',
  muted: '#6B5B4F',
  surface: '#1A1714',
  border: '#3D332C',
} as const;

const SLIDES = [
  {
    emoji: '🔴',
    secondEmoji: '🔗',
    title: 'Your Investigation\nHeadquarters',
    subtitle: 'Build cases. Connect evidence. Find truth.',
    body: 'Red String Research is a professional investigation canvas for citizen journalists, researchers, and truth-seekers.',
    accentColor: C.accent,
  },
  {
    emoji: '💌',
    secondEmoji: null,
    title: 'Your Audience\nFinds the Leads',
    subtitle: 'Share your tip URL. They submit. You investigate.',
    body: 'Accept anonymous tips from your audience, vetted by AI, delivered directly to your secure inbox.',
    accentColor: '#D4A574',
  },
  {
    emoji: '🔒',
    secondEmoji: null,
    title: 'Built for\nSerious Work',
    subtitle: 'Biometric lock. Decoy mode. Forensic watermarks.',
    body: 'Your investigations stay private. Invisible ink hides sensitive nodes. Every export is traceable.',
    accentColor: '#22C55E',
  },
];

function SlideIllustration({
  slide,
  isActive,
}: {
  slide: typeof SLIDES[number];
  isActive: boolean;
}) {
  const scale = useSharedValue(isActive ? 1 : 0.85);

  React.useEffect(() => {
    scale.value = withSpring(isActive ? 1 : 0.85, { damping: 18, stiffness: 150 });
  }, [isActive, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: withTiming(isActive ? 1 : 0.4, { duration: 300 }),
  }));

  return (
    <Animated.View
      style={[
        {
          width: 160,
          height: 160,
          borderRadius: 40,
          backgroundColor: slide.accentColor + '15',
          borderWidth: 1.5,
          borderColor: slide.accentColor + '30',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 40,
        },
        animStyle,
      ]}
    >
      {/* Corkboard visual for slide 1 */}
      {slide.secondEmoji ? (
        <View style={{ alignItems: 'center', gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
            <Text style={{ fontSize: 44 }}>{slide.emoji}</Text>
            <Text style={{ fontSize: 28 }}>{slide.secondEmoji}</Text>
          </View>
          {/* Red string visual */}
          <View style={{
            width: 80,
            height: 2,
            backgroundColor: C.accent,
            borderRadius: 1,
            opacity: 0.7,
          }} />
        </View>
      ) : (
        <Text style={{ fontSize: 64 }}>{slide.emoji}</Text>
      )}
    </Animated.View>
  );
}

export default function OnboardingScreen() {
  const { width: SCREEN_W } = useWindowDimensions();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const dotScale0 = useSharedValue(1);
  const dotScale1 = useSharedValue(0.6);
  const dotScale2 = useSharedValue(0.6);

  const dotScales = [dotScale0, dotScale1, dotScale2];

  const updateDots = (index: number) => {
    dotScales.forEach((ds, i) => {
      ds.value = withSpring(i === index ? 1 : 0.6, { damping: 15, stiffness: 200 });
    });
  };

  const goToSlide = (index: number) => {
    scrollRef.current?.scrollTo({ x: index * SCREEN_W, animated: true });
    setCurrentIndex(index);
    updateDots(index);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleScroll = (event: { nativeEvent: { contentOffset: { x: number } } }) => {
    const x = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(x / SCREEN_W);
    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
      updateDots(newIndex);
    }
  };

  const handleGetStarted = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await AsyncStorage.setItem('onboarding_seen', 'true');
    router.replace('/sign-in');
  };

  const handleSkip = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await AsyncStorage.setItem('onboarding_seen', 'true');
    router.replace('/sign-in');
  };

  const dotStyle0 = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale0.value }],
  }));

  const dotStyle1 = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale1.value }],
  }));

  const dotStyle2 = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale2.value }],
  }));

  const dotAnimStyles = [dotStyle0, dotStyle1, dotStyle2];

  const isLastSlide = currentIndex === SLIDES.length - 1;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Skip button */}
        {!isLastSlide ? (
          <Animated.View
            entering={FadeIn.duration(400)}
            style={{ position: 'absolute', top: Platform.OS === 'ios' ? 56 : 20, right: 20, zIndex: 10 }}
          >
            <Pressable
              onPress={handleSkip}
              style={({ pressed }) => ({
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: pressed ? C.surface : 'transparent',
                borderWidth: 1,
                borderColor: C.border,
              })}
            >
              <Text style={{ color: C.muted, fontSize: 14, fontWeight: '600' }}>Skip</Text>
            </Pressable>
          </Animated.View>
        ) : null}

        {/* Slides */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          scrollEventThrottle={16}
          style={{ flex: 1 }}
        >
          {SLIDES.map((slide, index) => (
            <View
              key={index}
              style={{
                width: SCREEN_W,
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 32,
                paddingTop: 60,
                paddingBottom: 40,
              }}
            >
              <SlideIllustration slide={slide} isActive={currentIndex === index} />

              <Animated.View
                entering={FadeInDown.delay(100).duration(400)}
                style={{ alignItems: 'center' }}
              >
                <Text
                  style={{
                    color: C.text,
                    fontSize: 34,
                    fontWeight: '900',
                    textAlign: 'center',
                    lineHeight: 40,
                    letterSpacing: 0.3,
                    marginBottom: 12,
                  }}
                >
                  {slide.title}
                </Text>

                <Text
                  style={{
                    color: slide.accentColor,
                    fontSize: 15,
                    fontWeight: '700',
                    textAlign: 'center',
                    marginBottom: 16,
                    letterSpacing: 0.2,
                  }}
                >
                  {slide.subtitle}
                </Text>

                <Text
                  style={{
                    color: C.muted,
                    fontSize: 15,
                    textAlign: 'center',
                    lineHeight: 23,
                    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
                  }}
                >
                  {slide.body}
                </Text>
              </Animated.View>
            </View>
          ))}
        </ScrollView>

        {/* Bottom area: dots + button */}
        <View style={{ paddingHorizontal: 32, paddingBottom: 40, alignItems: 'center', gap: 32 }}>
          {/* Dot indicators */}
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            {SLIDES.map((_, i) => (
              <Pressable key={i} onPress={() => goToSlide(i)}>
                <Animated.View
                  style={[
                    {
                      width: i === currentIndex ? 24 : 8,
                      height: 8,
                      borderRadius: 4,
                      opacity: i === currentIndex ? 1 : 0.4,
                      backgroundColor: i === currentIndex ? SLIDES[i].accentColor : C.muted,
                    },
                    dotAnimStyles[i],
                  ]}
                />
              </Pressable>
            ))}
          </View>

          {/* Navigation button */}
          {isLastSlide ? (
            <Pressable
              onPress={handleGetStarted}
              style={({ pressed }) => ({
                width: '100%',
                backgroundColor: pressed ? '#A01830' : C.accent,
                borderRadius: 20,
                paddingVertical: 18,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: C.accent,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.4,
                shadowRadius: 16,
                elevation: 8,
              })}
            >
              <Text style={{ color: '#FFF', fontSize: 17, fontWeight: '800', letterSpacing: 0.5 }}>
                Get Started
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => goToSlide(currentIndex + 1)}
              style={({ pressed }) => ({
                width: '100%',
                backgroundColor: pressed ? C.surface : '#1E1A17',
                borderRadius: 20,
                paddingVertical: 18,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: C.border,
              })}
            >
              <Text style={{ color: C.text, fontSize: 17, fontWeight: '700' }}>
                Next →
              </Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}
