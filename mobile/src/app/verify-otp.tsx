import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import Animated, {
  FadeInDown,
  FadeIn,
} from "react-native-reanimated";
import { OtpInput } from "react-native-otp-entry";
import { ArrowLeft } from "lucide-react-native";
import { authClient } from "@/lib/auth/auth-client";
import { useInvalidateSession } from "@/lib/auth/use-session";
import * as Haptics from "expo-haptics";

const COLORS = {
  bg: "#1A1614",
  surface: "#231F1C",
  red: "#C41E3A",
  amber: "#D4A574",
  text: "#E8DCC8",
  muted: "#6B5B4F",
  border: "#3D332C",
} as const;

export default function VerifyOtpScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const invalidateSession = useInvalidateSession();

  const [otp, setOtp] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [resendSuccess, setResendSuccess] = useState<boolean>(false);
  const [devOtpCode, setDevOtpCode] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!__DEV__) return;
    const trimmedPhone = (phone ?? "").trim();
    if (!trimmedPhone) return;

    const poll = async () => {
      try {
        const res = await fetch(
          `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/dev/last-otp`
        );
        if (!res.ok) return;
        const json = await res.json() as { data: { code: string | null; phone: string | null } };
        const { code, phone: otpPhone } = json.data;
        if (code && otpPhone === trimmedPhone) {
          setDevOtpCode(code);
          if (intervalRef.current !== null) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      } catch {
        // silently ignore network errors during polling
      }
    };

    intervalRef.current = setInterval(poll, 2000);
    // Run immediately on mount too
    poll();

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [phone]);

  const handleVerify = async (code: string) => {
    const trimmedPhone = (phone ?? "").trim();
    if (!trimmedPhone || code.length < 6) return;

    setError(null);
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const result = await authClient.phoneNumber.verify({
        phoneNumber: trimmedPhone,
        code,
      });
      if (result.error) {
        setError(result.error.message ?? "Invalid code. Please try again.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await invalidateSession();
      }
    } catch {
      setError("Network error. Please check your connection.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    const trimmedPhone = (phone ?? "").trim();
    if (!trimmedPhone || isResending) return;

    setIsResending(true);
    setError(null);
    setResendSuccess(false);

    try {
      const result = await authClient.phoneNumber.sendOtp({
        phoneNumber: trimmedPhone,
      });
      if (result.error) {
        setError(result.error.message ?? "Failed to resend. Please try again.");
      } else {
        setResendSuccess(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => setResendSuccess(false), 3000);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  const handleOtpFilled = (code: string) => {
    setOtp(code);
    handleVerify(code);
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }} testID="verify-otp-screen">
      {/* Background gradient */}
      <LinearGradient
        colors={["#231F1C", "#1A1614", "#1A1614"]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />

      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        {/* Back button */}
        <Pressable
          testID="back-button"
          onPress={() => router.back()}
          style={({ pressed }) => ({
            margin: 16,
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: pressed ? COLORS.border : COLORS.surface,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: COLORS.border,
            alignSelf: "flex-start",
          })}
        >
          <ArrowLeft size={18} color={COLORS.text} strokeWidth={2} />
        </Pressable>

        <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 32, paddingBottom: 60 }}>
          {/* Header */}
          <Animated.View
            entering={FadeInDown.delay(50).duration(500).springify()}
            style={{ marginBottom: 40 }}
          >
            {/* Lock / key icon area */}
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: COLORS.surface,
                borderWidth: 1,
                borderColor: COLORS.border,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 24,
                shadowColor: COLORS.red,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.2,
                shadowRadius: 12,
                elevation: 8,
              }}
            >
              <Text style={{ fontSize: 28 }}>🔐</Text>
            </View>

            <Text
              style={{
                fontSize: 26,
                fontWeight: "900",
                color: COLORS.text,
                marginBottom: 8,
                letterSpacing: 0.5,
              }}
            >
              Enter your code
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: COLORS.muted,
                lineHeight: 20,
              }}
            >
              Code sent to{" "}
              <Text style={{ color: COLORS.amber, fontWeight: "600" }}>
                {phone}
              </Text>
            </Text>
          </Animated.View>

          {/* OTP Input */}
          <Animated.View
            entering={FadeInDown.delay(150).duration(500).springify()}
            style={{ marginBottom: 12 }}
          >
            <View testID="otp-input">
              <OtpInput
                numberOfDigits={6}
                onFilled={handleOtpFilled}
                onTextChange={(text) => {
                  setOtp(text);
                  if (error) setError(null);
                }}
                disabled={isLoading}
                focusColor={COLORS.red}
                theme={{
                  containerStyle: {
                    gap: 8,
                  },
                  pinCodeContainerStyle: {
                    backgroundColor: COLORS.surface,
                    borderColor: COLORS.border,
                    borderRadius: 12,
                    borderWidth: 1,
                    width: 44,
                    height: 54,
                  },
                  pinCodeTextStyle: {
                    color: COLORS.text,
                    fontSize: 22,
                    fontWeight: "700",
                  },
                  focusedPinCodeContainerStyle: {
                    borderColor: COLORS.red,
                    borderWidth: 2,
                    shadowColor: COLORS.red,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.3,
                    shadowRadius: 6,
                  },
                }}
              />
            </View>

            {/* Dev mode hint */}
            {__DEV__ && !devOtpCode ? (
              <Text style={{ fontSize: 12, color: '#D4A574', textAlign: 'center', marginTop: 10, fontWeight: '600' }}>
                ⏳ Waiting for dev code — it will appear below automatically
              </Text>
            ) : null}

            {/* Dev mode OTP display box */}
            {__DEV__ && devOtpCode ? (
              <View
                style={{
                  marginTop: 16,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#D4A574",
                  backgroundColor: "#231F1C",
                  paddingVertical: 14,
                  paddingHorizontal: 20,
                  alignItems: "center",
                  shadowColor: "#D4A574",
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.6,
                  shadowRadius: 12,
                  elevation: 12,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    color: COLORS.muted,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  DEV MODE — Your code:
                </Text>
                <Text
                  style={{
                    fontSize: 32,
                    fontWeight: "900",
                    color: "#D4A574",
                    letterSpacing: 8,
                  }}
                >
                  {devOtpCode}
                </Text>
              </View>
            ) : null}
          </Animated.View>

          {/* Error message */}
          {error ? (
            <Animated.View entering={FadeIn.duration(200)} style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 13,
                  color: COLORS.red,
                  textAlign: "center",
                  lineHeight: 18,
                }}
              >
                {error}
              </Text>
            </Animated.View>
          ) : null}

          {/* Verify button */}
          <Animated.View
            entering={FadeInDown.delay(250).duration(500).springify()}
            style={{ marginBottom: 20 }}
          >
            <Pressable
              testID="verify-button"
              onPress={() => handleVerify(otp)}
              disabled={isLoading || otp.length < 6}
              style={({ pressed }) => ({
                borderRadius: 12,
                overflow: "hidden",
                opacity: otp.length < 6 || isLoading ? 0.6 : pressed ? 0.9 : 1,
              })}
            >
              <LinearGradient
                colors={
                  otp.length === 6
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
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "800",
                    color: otp.length === 6 ? "#FFFFFF" : COLORS.muted,
                    letterSpacing: 0.5,
                  }}
                >
                  {isLoading ? "Verifying..." : "Verify Code"}
                </Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>

          {/* Resend link */}
          <Animated.View
            entering={FadeIn.delay(400).duration(400)}
            style={{ alignItems: "center" }}
          >
            {resendSuccess ? (
              <Text style={{ fontSize: 13, color: "#22C55E" }}>
                New code sent successfully.
              </Text>
            ) : (
              <Pressable
                testID="resend-button"
                onPress={handleResend}
                disabled={isResending}
                style={({ pressed }) => ({ opacity: pressed || isResending ? 0.6 : 1 })}
              >
                <Text
                  style={{
                    fontSize: 13,
                    color: COLORS.muted,
                  }}
                >
                  Didn't receive a code?{" "}
                  <Text style={{ color: COLORS.amber, fontWeight: "600" }}>
                    {isResending ? "Sending..." : "Resend"}
                  </Text>
                </Text>
              </Pressable>
            )}
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}
