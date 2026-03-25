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
  withTiming,
  withSequence,
  FadeInDown,
  FadeIn,
} from "react-native-reanimated";
import Svg, { Circle, Line, G } from "react-native-svg";
import { authClient } from "@/lib/auth/auth-client";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";

WebBrowser.maybeCompleteAuthSession();

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

const COLORS = {
  bg: "#1A1614",
  surface: "#231F1C",
  red: "#C41E3A",
  redDark: "#8B1428",
  amber: "#D4A574",
  text: "#E8DCC8",
  muted: "#6B5B4F",
  border: "#272320",
} as const;

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
      {positions.map((n, i) => (
        <G key={i}>
          <Circle cx={n.x} cy={n.y} r={6} fill="#C41E3A" opacity={0.15} />
          <Circle cx={n.x} cy={n.y} r={3} fill="#C41E3A" opacity={0.4} />
        </G>
      ))}
    </Svg>
  );
}

function RedStringLogo() {
  return (
    <Svg width={64} height={64} viewBox="0 0 64 64">
      <Circle cx={32} cy={32} r={28} stroke="#C41E3A" strokeWidth={1.5} fill="none" opacity={0.6} />
      <Circle cx={32} cy={14} r={4} fill="#C41E3A" opacity={0.9} />
      <Circle cx={50} cy={44} r={4} fill="#C41E3A" opacity={0.9} />
      <Circle cx={14} cy={44} r={4} fill="#C41E3A" opacity={0.9} />
      <Line x1={32} y1={14} x2={50} y2={44} stroke="#C41E3A" strokeWidth={1.5} opacity={0.7} />
      <Line x1={50} y1={44} x2={14} y2={44} stroke="#C41E3A" strokeWidth={1.5} opacity={0.7} />
      <Line x1={14} y1={44} x2={32} y2={14} stroke="#C41E3A" strokeWidth={1.5} opacity={0.7} />
      <Circle cx={32} cy={34} r={5} fill="#D4A574" opacity={0.9} />
    </Svg>
  );
}

function formatPhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  const hasPlus = input.trimStart().startsWith("+");
  if (hasPlus) return "+" + digits;
  return "+1" + digits;
}

export default function SignInScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [socialMessage, setSocialMessage] = useState<string | null>(null);

  const buttonScale = useSharedValue(1);
  const buttonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  // Google OAuth via expo-auth-session
  const [googleRequest, googleResponse, googlePromptAsync] = Google.useAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
  });

  // Handle Google OAuth response
  useEffect(() => {
    if (googleResponse?.type === "success" && googleResponse.authentication) {
      const { idToken, accessToken } = googleResponse.authentication;
      const tokenToSend = idToken ?? accessToken;
      if (tokenToSend) {
        handleGoogleToken(tokenToSend, !!idToken);
      }
    }
  }, [googleResponse]);

  const handleGoogleToken = async (token: string, isIdToken: boolean) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await (authClient as any).signIn.social({
        provider: "google",
        ...(isIdToken ? { idToken: { token } } : { accessToken: { token } }),
      });
      if (result?.error) {
        setSocialMessage("Google Sign-In failed. Please try phone number.");
        setTimeout(() => setSocialMessage(null), 3000);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace("/(tabs)" as any);
      }
    } catch {
      setSocialMessage("Google Sign-In is not configured yet. Use phone number.");
      setTimeout(() => setSocialMessage(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      setIsLoading(true);
      // Use the auth client social sign-in for Apple.
      // On a real device with expo-apple-authentication linked natively,
      // Better Auth will handle the native credential flow server-side.
      const result = await (authClient as any).signIn.social({
        provider: "apple",
      });
      if (result?.error) {
        setSocialMessage("Apple Sign-In failed. Please try phone number.");
        setTimeout(() => setSocialMessage(null), 3000);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace("/(tabs)" as any);
      }
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED") {
        setSocialMessage("Apple Sign-In is not configured yet. Use phone number.");
        setTimeout(() => setSocialMessage(null), 3000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!googleRequest) {
      setSocialMessage("Google Sign-In is not configured yet. Use phone number.");
      setTimeout(() => setSocialMessage(null), 3000);
      return;
    }
    await googlePromptAsync();
  };

  const handleSendCode = async () => {
    const trimmed = phone.trim();
    const digits = trimmed.replace(/\D/g, "");
    if (!trimmed || digits.length < 10) {
      setError("Please enter a valid phone number (at least 10 digits).");
      return;
    }
    const formattedPhone = formatPhone(trimmed);
    setError(null);
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    buttonScale.value = withSequence(
      withTiming(0.95, { duration: 80 }),
      withTiming(1, { duration: 80 })
    );
    try {
      const result = await authClient.phoneNumber.sendOtp({ phoneNumber: formattedPhone });
      if (result.error) {
        setError(result.error.message ?? "Failed to send code. Please try again.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.push({ pathname: "/verify-otp", params: { phone: formattedPhone } });
      }
    } catch {
      setError("Network error. Please check your connection.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const isValidPhone = phone.trim().replace(/\D/g, "").length >= 10;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <CorkPattern />
      <AnimatedStringNodes />
      <LinearGradient
        colors={["#1A1614", "transparent"]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 200 }}
      />
      <LinearGradient
        colors={["transparent", "#1A1614"]}
        style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 300 }}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
          <View style={{ flex: 1, justifyContent: "flex-end", paddingHorizontal: 32, paddingBottom: 40 }}>
            {/* Logo & title */}
            <Animated.View
              entering={FadeInDown.delay(100).duration(600).springify()}
              style={{ alignItems: "center", marginBottom: 40 }}
            >
              <View
                style={{
                  width: 88, height: 88, borderRadius: 44,
                  backgroundColor: COLORS.surface, alignItems: "center", justifyContent: "center",
                  marginBottom: 24, borderWidth: 1, borderColor: COLORS.border,
                  shadowColor: COLORS.red, shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.3, shadowRadius: 16, elevation: 12,
                }}
              >
                <RedStringLogo />
              </View>
              <Text style={{ fontSize: 32, fontWeight: "900", color: COLORS.red, letterSpacing: 3.2, textAlign: "center", marginBottom: 4 }}>
                RED STRING
              </Text>
              <Text style={{ fontSize: 13, fontWeight: "700", color: COLORS.amber, letterSpacing: 6.2, textAlign: "center", marginBottom: 16 }}>
                RESEARCH
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                <View style={{ height: 1, width: 32, backgroundColor: COLORS.border }} />
                <Text style={{ fontSize: 13, color: COLORS.muted, fontStyle: "italic", letterSpacing: 0.7 }}>
                  Every thread leads somewhere.
                </Text>
                <View style={{ height: 1, width: 32, backgroundColor: COLORS.border }} />
              </View>
            </Animated.View>

            {/* Social sign-in — ABOVE phone form */}
            <Animated.View entering={FadeInDown.delay(250).duration(500)} style={{ gap: 10, marginBottom: 20 }}>
              {/* Apple Sign In — shown on iOS only */}
              {Platform.OS === "ios" ? (
                <Pressable
                  testID="apple-sign-in-button"
                  onPress={handleAppleSignIn}
                  disabled={isLoading}
                  style={({ pressed }) => ({
                    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
                    backgroundColor: pressed ? "#111" : "#000",
                    borderRadius: 12, paddingVertical: 14,
                    borderWidth: 1, borderColor: "#333",
                    opacity: isLoading ? 0.7 : 1,
                  })}
                >
                  <View style={{ width: 20, height: 20, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: "#FFF", fontSize: 16, fontWeight: "900" }}></Text>
                  </View>
                  <Text style={{ color: "#FFF", fontSize: 16, fontWeight: "700" }}>Continue with Apple</Text>
                </Pressable>
              ) : null}

              {/* Google Sign In */}
              <Pressable
                testID="google-sign-in-button"
                onPress={handleGoogleSignIn}
                disabled={isLoading}
                style={({ pressed }) => ({
                  flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
                  backgroundColor: pressed ? "#2A2421" : COLORS.surface,
                  borderRadius: 12, paddingVertical: 14,
                  borderWidth: 1, borderColor: COLORS.border,
                  opacity: isLoading ? 0.7 : 1,
                })}
              >
                {/* Colorful 2x2 Google G tile */}
                <View style={{ width: 20, height: 20, borderRadius: 10, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", width: 14, height: 14 }}>
                    <View style={{ width: 7, height: 7, backgroundColor: "#4285F4" }} />
                    <View style={{ width: 7, height: 7, backgroundColor: "#34A853" }} />
                    <View style={{ width: 7, height: 7, backgroundColor: "#FBBC05" }} />
                    <View style={{ width: 7, height: 7, backgroundColor: "#EA4335" }} />
                  </View>
                </View>
                <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: "600" }}>Continue with Google</Text>
              </Pressable>
            </Animated.View>

            {/* OR divider */}
            <Animated.View
              entering={FadeInDown.delay(350).duration(400)}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 }}
            >
              <View style={{ flex: 1, height: 1, backgroundColor: COLORS.border }} />
              <Text style={{ color: COLORS.muted, fontSize: 13, fontWeight: "600", letterSpacing: 1.2 }}>OR</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: COLORS.border }} />
            </Animated.View>

            {/* Phone form */}
            <Animated.View entering={FadeInDown.delay(400).duration(600).springify()}>
              <View
                style={{
                  backgroundColor: COLORS.surface, borderRadius: 20, padding: 24,
                  borderWidth: 1, borderColor: COLORS.border,
                  shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.3, shadowRadius: 16, elevation: 10,
                }}
              >
                <Text style={{ fontSize: 20, fontWeight: "700", color: COLORS.text, marginBottom: 4 }}>
                  Access your files
                </Text>
                <Text style={{ fontSize: 13, color: COLORS.muted, marginBottom: 20, lineHeight: 18 }}>
                  Enter your phone number and we'll send a verification code via SMS.
                </Text>
                <Text style={{ fontSize: 13, fontWeight: "700", color: COLORS.muted, letterSpacing: 1.6, marginBottom: 8 }}>
                  PHONE NUMBER
                </Text>
                <TextInput
                  testID="phone-input"
                  value={phone}
                  onChangeText={(t) => { setPhone(t); if (error) setError(null); }}
                  placeholder="+1 (555) 000-0000"
                  placeholderTextColor={COLORS.muted}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="tel"
                  returnKeyType="send"
                  onSubmitEditing={handleSendCode}
                  style={{
                    backgroundColor: COLORS.bg, borderRadius: 12, padding: 16,
                    color: COLORS.text, fontSize: 16, borderWidth: 1,
                    borderColor: error ? COLORS.red : COLORS.border,
                    marginBottom: error ? 8 : 24,
                  }}
                />
                {error ? (
                  <Text style={{ fontSize: 13, color: COLORS.red, marginBottom: 16, lineHeight: 16 }}>
                    {error}
                  </Text>
                ) : null}
                <Animated.View style={buttonAnimStyle}>
                  <Pressable
                    testID="send-code-button"
                    onPress={handleSendCode}
                    disabled={isLoading}
                    style={{ borderRadius: 12, overflow: "hidden", opacity: isLoading ? 0.8 : 1 }}
                  >
                    <LinearGradient
                      colors={isValidPhone ? ["#D42240", "#C41E3A", "#A3162E"] : [COLORS.border, COLORS.border]}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      style={{
                        paddingVertical: 16, alignItems: "center", justifyContent: "center",
                        borderRadius: 12, shadowColor: COLORS.red,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: isValidPhone ? 0.4 : 0, shadowRadius: 8,
                      }}
                    >
                      <Text style={{ fontSize: 16, fontWeight: "800", color: isValidPhone ? "#FFFFFF" : COLORS.muted, letterSpacing: 0.7 }}>
                        {isLoading ? "Sending Code..." : "Send Verification Code"}
                      </Text>
                    </LinearGradient>
                  </Pressable>
                </Animated.View>
              </View>
            </Animated.View>

            {/* Social message toast */}
            {socialMessage ? (
              <Animated.View
                entering={FadeInDown.duration(300)}
                style={{
                  marginTop: 12, backgroundColor: COLORS.surface, borderRadius: 10, padding: 12,
                  borderWidth: 1, borderColor: COLORS.border, borderLeftWidth: 3, borderLeftColor: COLORS.amber,
                }}
              >
                <Text style={{ color: COLORS.text, fontSize: 13, textAlign: "center" }}>{socialMessage}</Text>
              </Animated.View>
            ) : null}

            <Animated.View entering={FadeIn.delay(600).duration(400)} style={{ alignItems: "center", marginTop: 24 }}>
              <Text style={{ fontSize: 13, color: COLORS.muted, textAlign: "center", lineHeight: 18 }}>
                No password needed. We keep your investigations secure{"\n"}with one-time SMS codes.
              </Text>
            </Animated.View>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}
