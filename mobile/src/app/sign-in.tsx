import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  FadeInDown,
  FadeIn,
} from "react-native-reanimated";
import Svg, { Circle, Line, G } from "react-native-svg";
import { authClient } from "@/lib/auth/auth-client";
import * as Haptics from "expo-haptics";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

const COLORS = {
  bg: "#1A1614",
  surface: "#231F1C",
  red: "#C41E3A",
  redDark: "#8B1428",
  amber: "#D4A574",
  text: "#E8DCC8",
  muted: "#6B5B4F",
  border: "#3D332C",
} as const;

// Animated cork dots pattern
function CorkPattern() {
  const ROWS = 12;
  const COLS = 8;
  const spacing = SCREEN_W / COLS;
  return (
    <Svg
      width={SCREEN_W}
      height={SCREEN_H}
      style={{ position: "absolute", top: 0, left: 0 }}
      pointerEvents="none"
    >
      {Array.from({ length: ROWS }, (_, r) =>
        Array.from({ length: COLS }, (_, c) => (
          <Circle
            key={`${r}-${c}`}
            cx={c * spacing + spacing / 2}
            cy={r * (SCREEN_H / ROWS) + SCREEN_H / ROWS / 2}
            r={1.5}
            fill="#F5ECD7"
            opacity={0.04}
          />
        ))
      )}
    </Svg>
  );
}

// Animated red string nodes in background
type StringNode = { x: number; y: number; dx: number; dy: number };
function AnimatedStringNodes() {
  const nodes = useRef<StringNode[]>(
    Array.from({ length: 6 }, () => ({
      x: Math.random() * SCREEN_W,
      y: Math.random() * SCREEN_H * 0.6,
      dx: (Math.random() - 0.5) * 0.3,
      dy: (Math.random() - 0.5) * 0.3,
    }))
  );
  const [positions, setPositions] = useState<StringNode[]>(nodes.current);

  useEffect(() => {
    let frame: ReturnType<typeof setTimeout>;
    const animate = () => {
      nodes.current = nodes.current.map((n) => {
        let nx = n.x + n.dx;
        let ny = n.y + n.dy;
        let ndx = n.dx;
        let ndy = n.dy;
        if (nx < 20 || nx > SCREEN_W - 20) ndx = -ndx;
        if (ny < 20 || ny > SCREEN_H * 0.6) ndy = -ndy;
        return { x: nx, y: ny, dx: ndx, dy: ndy };
      });
      setPositions([...nodes.current]);
      frame = setTimeout(animate, 50);
    };
    animate();
    return () => clearTimeout(frame);
  }, []);

  return (
    <Svg
      width={SCREEN_W}
      height={SCREEN_H * 0.6}
      style={{ position: "absolute", top: 0, left: 0 }}
      pointerEvents="none"
    >
      {/* Draw lines between nearby nodes */}
      {positions.map((n, i) =>
        positions.slice(i + 1).map((m, j) => {
          const dist = Math.hypot(n.x - m.x, n.y - m.y);
          if (dist > 200) return null;
          return (
            <Line
              key={`${i}-${j}`}
              x1={n.x}
              y1={n.y}
              x2={m.x}
              y2={m.y}
              stroke="#C41E3A"
              strokeWidth={0.8}
              opacity={Math.max(0, (1 - dist / 200) * 0.35)}
            />
          );
        })
      )}
      {/* Draw node circles */}
      {positions.map((n, i) => (
        <G key={i}>
          <Circle cx={n.x} cy={n.y} r={6} fill="#C41E3A" opacity={0.15} />
          <Circle cx={n.x} cy={n.y} r={3} fill="#C41E3A" opacity={0.4} />
        </G>
      ))}
    </Svg>
  );
}

// Red string logo icon
function RedStringLogo() {
  return (
    <Svg width={64} height={64} viewBox="0 0 64 64">
      {/* Outer circle */}
      <Circle cx={32} cy={32} r={28} stroke="#C41E3A" strokeWidth={1.5} fill="none" opacity={0.6} />
      {/* Inner nodes */}
      <Circle cx={32} cy={14} r={4} fill="#C41E3A" opacity={0.9} />
      <Circle cx={50} cy={44} r={4} fill="#C41E3A" opacity={0.9} />
      <Circle cx={14} cy={44} r={4} fill="#C41E3A" opacity={0.9} />
      {/* Strings connecting nodes */}
      <Line x1={32} y1={14} x2={50} y2={44} stroke="#C41E3A" strokeWidth={1.5} opacity={0.7} />
      <Line x1={50} y1={44} x2={14} y2={44} stroke="#C41E3A" strokeWidth={1.5} opacity={0.7} />
      <Line x1={14} y1={44} x2={32} y2={14} stroke="#C41E3A" strokeWidth={1.5} opacity={0.7} />
      {/* Center node */}
      <Circle cx={32} cy={34} r={5} fill="#D4A574" opacity={0.9} />
    </Svg>
  );
}

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const buttonScale = useSharedValue(1);
  const buttonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handleSendCode = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Please enter your email address.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }

    setError(null);
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Button press animation
    buttonScale.value = withSequence(
      withTiming(0.95, { duration: 80 }),
      withTiming(1, { duration: 80 })
    );

    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email: trimmed,
        type: "sign-in",
      });
      if (result.error) {
        setError(result.error.message ?? "Failed to send code. Please try again.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.push({ pathname: "/verify-otp", params: { email: trimmed } });
      }
    } catch {
      setError("Network error. Please check your connection.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const isValidEmail = email.trim().length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      {/* Background layers */}
      <CorkPattern />
      <AnimatedStringNodes />

      {/* Top gradient fade */}
      <LinearGradient
        colors={["#1A1614", "transparent"]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 200 }}
      />

      {/* Bottom gradient fade */}
      <LinearGradient
        colors={["transparent", "#1A1614"]}
        style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 300 }}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
          {/* Top spacer + hero */}
          <View style={{ flex: 1, justifyContent: "flex-end", paddingHorizontal: 32, paddingBottom: 40 }}>
            {/* Logo & title area */}
            <Animated.View
              entering={FadeInDown.delay(100).duration(600).springify()}
              style={{ alignItems: "center", marginBottom: 48 }}
            >
              {/* Logo */}
              <View
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: 44,
                  backgroundColor: COLORS.surface,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 24,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  shadowColor: COLORS.red,
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.3,
                  shadowRadius: 16,
                  elevation: 12,
                }}
              >
                <RedStringLogo />
              </View>

              {/* App name */}
              <Text
                style={{
                  fontSize: 32,
                  fontWeight: "900",
                  color: COLORS.red,
                  letterSpacing: 3,
                  textAlign: "center",
                  marginBottom: 4,
                }}
              >
                RED STRING
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: COLORS.amber,
                  letterSpacing: 6,
                  textAlign: "center",
                  marginBottom: 16,
                }}
              >
                RESEARCH
              </Text>

              {/* Tagline */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 4,
                }}
              >
                <View style={{ height: 1, width: 32, backgroundColor: COLORS.border }} />
                <Text
                  style={{
                    fontSize: 13,
                    color: COLORS.muted,
                    fontStyle: "italic",
                    letterSpacing: 0.5,
                  }}
                >
                  Every thread leads somewhere.
                </Text>
                <View style={{ height: 1, width: 32, backgroundColor: COLORS.border }} />
              </View>
            </Animated.View>

            {/* Form card */}
            <Animated.View entering={FadeInDown.delay(300).duration(600).springify()}>
              <View
                style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 20,
                  padding: 24,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.3,
                  shadowRadius: 16,
                  elevation: 10,
                }}
              >
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: COLORS.text,
                    marginBottom: 4,
                  }}
                >
                  Access your files
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: COLORS.muted,
                    marginBottom: 20,
                    lineHeight: 18,
                  }}
                >
                  Enter your email and we'll send a verification code.
                </Text>

                {/* Email input */}
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: COLORS.muted,
                    letterSpacing: 1.2,
                    marginBottom: 8,
                  }}
                >
                  EMAIL ADDRESS
                </Text>
                <TextInput
                  testID="email-input"
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    if (error) setError(null);
                  }}
                  placeholder="detective@example.com"
                  placeholderTextColor={COLORS.muted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  returnKeyType="send"
                  onSubmitEditing={handleSendCode}
                  style={{
                    backgroundColor: COLORS.bg,
                    borderRadius: 12,
                    padding: 16,
                    color: COLORS.text,
                    fontSize: 16,
                    borderWidth: 1,
                    borderColor: error ? COLORS.red : COLORS.border,
                    marginBottom: error ? 8 : 24,
                  }}
                />

                {/* Error message */}
                {error ? (
                  <Text
                    style={{
                      fontSize: 12,
                      color: COLORS.red,
                      marginBottom: 16,
                      lineHeight: 16,
                    }}
                  >
                    {error}
                  </Text>
                ) : null}

                {/* Send code button */}
                <Animated.View style={buttonAnimStyle}>
                  <Pressable
                    testID="send-code-button"
                    onPress={handleSendCode}
                    disabled={isLoading}
                    style={({ pressed }) => ({
                      borderRadius: 12,
                      overflow: "hidden",
                      opacity: isLoading ? 0.8 : 1,
                    })}
                  >
                    <LinearGradient
                      colors={
                        isValidEmail
                          ? ["#D42240", "#C41E3A", "#A3162E"]
                          : [COLORS.border, COLORS.border]
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        paddingVertical: 16,
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 12,
                        shadowColor: COLORS.red,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: isValidEmail ? 0.4 : 0,
                        shadowRadius: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "800",
                          color: isValidEmail ? "#FFFFFF" : COLORS.muted,
                          letterSpacing: 0.5,
                        }}
                      >
                        {isLoading ? "Sending Code..." : "Send Verification Code"}
                      </Text>
                    </LinearGradient>
                  </Pressable>
                </Animated.View>
              </View>
            </Animated.View>

            {/* Footer text */}
            <Animated.View
              entering={FadeIn.delay(600).duration(400)}
              style={{ alignItems: "center", marginTop: 24 }}
            >
              <Text
                style={{
                  fontSize: 12,
                  color: COLORS.muted,
                  textAlign: "center",
                  lineHeight: 18,
                }}
              >
                No password needed. We keep your investigations secure{"\n"}with one-time access codes.
              </Text>
            </Animated.View>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}
