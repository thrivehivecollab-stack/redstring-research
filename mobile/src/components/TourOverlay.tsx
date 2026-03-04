import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import useTourStore from '@/lib/state/tour-store';
import { TOUR_STEPS, TOTAL_TOUR_STEPS } from '@/lib/tourSteps';

const C = {
  bg: '#1A1614',
  surface: '#231F1C',
  red: '#C41E3A',
  amber: '#D4A574',
  text: '#E8DCC8',
  muted: '#9B8B7E',
  border: '#3D332C',
} as const;

export default function TourOverlay() {
  const isRunning = useTourStore((s) => s.isRunning);
  const currentStep = useTourStore((s) => s.currentStep);
  const nextStep = useTourStore((s) => s.nextStep);
  const prevStep = useTourStore((s) => s.prevStep);
  const skipTour = useTourStore((s) => s.skipTour);
  const completeTour = useTourStore((s) => s.completeTour);

  const { width: screenW, height: screenH } = useWindowDimensions();

  const step = TOUR_STEPS[currentStep];

  // Tooltip animation values
  const tooltipTranslateX = useSharedValue(0);
  const tooltipOpacity = useSharedValue(0);
  const tooltipScale = useSharedValue(0.92);

  // Backdrop opacity
  const backdropOpacity = useSharedValue(0);

  // Tap indicator pulse
  const tapScale = useSharedValue(1);
  const tapOpacity = useSharedValue(0.8);

  // Track previous step to animate direction
  const prevStepRef = useRef(currentStep);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isRunning) {
      backdropOpacity.value = withTiming(1, { duration: 300 });
      tooltipOpacity.value = withTiming(1, { duration: 300 });
      tooltipScale.value = withSpring(1, { damping: 18, stiffness: 220 });
    } else {
      backdropOpacity.value = withTiming(0, { duration: 200 });
      tooltipOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [isRunning, backdropOpacity, tooltipOpacity, tooltipScale]);

  useEffect(() => {
    if (!isRunning) return;
    if (isFirstRender.current) {
      isFirstRender.current = false;
      tooltipTranslateX.value = 0;
      return;
    }
    const direction = currentStep > prevStepRef.current ? 1 : -1;
    prevStepRef.current = currentStep;

    // Slide out old, slide in new
    tooltipOpacity.value = withTiming(0, { duration: 120 }, () => {
      tooltipTranslateX.value = -direction * 40;
      tooltipOpacity.value = withTiming(1, { duration: 200 });
      tooltipTranslateX.value = withSpring(0, { damping: 20, stiffness: 280 });
    });
    tooltipScale.value = withSequence(
      withTiming(0.95, { duration: 80 }),
      withSpring(1, { damping: 18, stiffness: 220 })
    );
  }, [currentStep, isRunning, tooltipOpacity, tooltipTranslateX, tooltipScale]);

  // Tap pulse animation
  useEffect(() => {
    if (!isRunning || !step?.action || step.action !== 'tap') {
      tapOpacity.value = 0;
      return;
    }
    tapOpacity.value = 0.8;
    tapScale.value = withRepeat(
      withSequence(
        withTiming(1.4, { duration: 600 }),
        withTiming(1, { duration: 600 })
      ),
      -1,
      false
    );
  }, [currentStep, isRunning, step, tapScale, tapOpacity]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const tooltipStyle = useAnimatedStyle(() => ({
    opacity: tooltipOpacity.value,
    transform: [
      { translateX: tooltipTranslateX.value },
      { scale: tooltipScale.value },
    ],
  }));

  const tapIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ scale: tapScale.value }],
    opacity: tapOpacity.value,
  }));

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep >= TOTAL_TOUR_STEPS - 1) {
      completeTour();
    } else {
      nextStep();
    }
  };

  const handlePrev = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    prevStep();
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    skipTour();
  };

  if (!isRunning || !step) return null;

  const isLastStep = currentStep >= TOTAL_TOUR_STEPS - 1;
  const isFirstStep = currentStep === 0;
  const tooltipAtTop = step.tooltipPosition === 'top';
  const tooltipBottom = !tooltipAtTop;

  return (
    <Modal
      visible={isRunning}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleSkip}
    >
      {/* Backdrop */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.78)',
          },
          backdropStyle,
        ]}
        pointerEvents="none"
      />

      {/* Tap indicator (for steps with action: 'tap') */}
      {step.action === 'tap' ? (
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: screenH * 0.15,
              alignSelf: 'center',
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: (step.highlightColor ?? C.amber) + '33',
              borderWidth: 2,
              borderColor: step.highlightColor ?? C.amber,
              alignItems: 'center',
              justifyContent: 'center',
            },
            tapIndicatorStyle,
          ]}
          pointerEvents="none"
        >
          <View
            style={{
              width: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: step.highlightColor ?? C.amber,
              opacity: 0.9,
            }}
          />
        </Animated.View>
      ) : null}

      {/* Dismiss area (allows tapping outside tooltip to advance) */}
      <Pressable
        style={{ flex: 1 }}
        onPress={handleNext}
      />

      {/* Tooltip Card */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: 16,
            right: 16,
            ...(tooltipAtTop ? { top: 100 } : { bottom: 110 }),
          },
          tooltipStyle,
        ]}
        pointerEvents="box-none"
      >
        <Pressable onPress={() => {}} style={{ pointerEvents: 'auto' }}>
          <View
            style={{
              backgroundColor: C.surface,
              borderRadius: 18,
              borderTopWidth: 3,
              borderTopColor: C.red,
              borderWidth: 1,
              borderColor: C.border,
              padding: 22,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.5,
              shadowRadius: 24,
              elevation: 20,
            }}
          >
            {/* Step dots */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 14,
              }}
            >
              <View style={{ flexDirection: 'row', gap: 5, flexWrap: 'wrap', flex: 1 }}>
                {TOUR_STEPS.map((_, i) => {
                  const isDone = i < currentStep;
                  const isCurrent = i === currentStep;
                  return (
                    <View
                      key={i}
                      style={{
                        width: isCurrent ? 16 : 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: isCurrent
                          ? C.red
                          : isDone
                          ? C.red + '66'
                          : C.border,
                      }}
                    />
                  );
                })}
              </View>
              <Text
                style={{
                  color: C.muted,
                  fontSize: 12,
                  fontWeight: '600',
                  marginLeft: 8,
                }}
              >
                {currentStep + 1}/{TOTAL_TOUR_STEPS}
              </Text>
            </View>

            {/* Title */}
            <Text
              style={{
                color: C.text,
                fontSize: 20,
                fontWeight: '700',
                marginBottom: 8,
                letterSpacing: 0.3,
              }}
            >
              {step.title}
            </Text>

            {/* Description */}
            <Text
              style={{
                color: C.muted,
                fontSize: 15,
                lineHeight: 22,
                marginBottom: 20,
              }}
            >
              {step.description}
            </Text>

            {/* Buttons */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {/* Back */}
              {!isFirstStep ? (
                <Pressable
                  testID="tour-back-button"
                  onPress={handlePrev}
                  style={({ pressed }) => ({
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: C.border,
                    backgroundColor: pressed ? C.border : 'transparent',
                  })}
                >
                  <Text style={{ color: C.muted, fontSize: 14, fontWeight: '600' }}>
                    Back
                  </Text>
                </Pressable>
              ) : null}

              {/* Spacer */}
              <View style={{ flex: 1 }} />

              {/* Skip */}
              {!isLastStep ? (
                <Pressable
                  testID="tour-skip-button"
                  onPress={handleSkip}
                  style={({ pressed }) => ({
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    opacity: pressed ? 0.5 : 1,
                  })}
                >
                  <Text style={{ color: C.muted, fontSize: 14 }}>
                    Skip
                  </Text>
                </Pressable>
              ) : null}

              {/* Next / Finish */}
              <Pressable
                testID="tour-next-button"
                onPress={handleNext}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? '#A3162E' : C.red,
                  borderRadius: 22,
                  paddingVertical: 11,
                  paddingHorizontal: 24,
                  shadowColor: C.red,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.35,
                  shadowRadius: 8,
                  elevation: 6,
                })}
              >
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: 15,
                    fontWeight: '700',
                    letterSpacing: 0.3,
                  }}
                >
                  {isLastStep ? 'Start Investigating' : 'Next'}
                </Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}
