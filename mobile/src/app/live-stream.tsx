import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  X,
  Copy,
  Eye,
  EyeOff,
  Radio,
  Users,
  Square,
} from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { api } from '@/lib/api/api';

const C = {
  bg: '#0F0D0B',
  surface: '#1A1714',
  surface2: '#211E1A',
  red: '#C41E3A',
  text: '#E8DCC8',
  muted: '#6B5D4F',
  border: '#272320',
  border2: '#3D332C',
} as const;

interface LiveStreamData {
  id: string;
  rtmpUrl: string;
  streamKey: string;
}

function PulsingDot() {
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 700 }),
        withTiming(1, { duration: 700 })
      ),
      -1,
      false
    );
    scale.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 700 }),
        withTiming(1, { duration: 700 })
      ),
      -1,
      false
    );
  }, [opacity, scale]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: C.red,
        },
        style,
      ]}
    />
  );
}

function CopyableField({
  label,
  value,
  monospace = true,
  blurByDefault = false,
}: {
  label: string;
  value: string;
  monospace?: boolean;
  blurByDefault?: boolean;
}) {
  const [revealed, setRevealed] = useState(!blurByDefault);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    Clipboard.setString(value);
    setCopied(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={{ marginBottom: 16 }}>
      <Text
        style={{
          color: C.muted,
          fontSize: 10,
          fontWeight: '800',
          letterSpacing: 2,
          marginBottom: 6,
        }}
      >
        {label}
      </Text>
      <View
        style={{
          backgroundColor: C.surface2,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: C.border2,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 12,
          paddingVertical: 10,
          gap: 8,
        }}
      >
        <Text
          style={{
            flex: 1,
            color: C.text,
            fontSize: 12,
            fontFamily: monospace ? 'Courier' : undefined,
            fontWeight: monospace ? '600' : '400',
          }}
          numberOfLines={revealed ? 2 : 1}
        >
          {revealed ? value : '•'.repeat(Math.min(value.length, 24))}
        </Text>
        {blurByDefault ? (
          <Pressable onPress={() => setRevealed((v) => !v)} style={{ padding: 4 }}>
            {revealed ? (
              <EyeOff size={16} color={C.muted} strokeWidth={2} />
            ) : (
              <Eye size={16} color={C.muted} strokeWidth={2} />
            )}
          </Pressable>
        ) : null}
        <Pressable
          onPress={handleCopy}
          style={({ pressed }) => ({
            backgroundColor: pressed ? C.border2 : C.surface,
            borderRadius: 6,
            padding: 6,
            borderWidth: 1,
            borderColor: C.border2,
          })}
        >
          <Copy size={14} color={copied ? '#22C55E' : C.muted} strokeWidth={2} />
        </Pressable>
      </View>
    </View>
  );
}

export default function LiveStreamScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [streamData, setStreamData] = useState<LiveStreamData | null>(null);
  const [isCreating, setIsCreating] = useState(true);
  const [createError, setCreateError] = useState<string | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [streamEnded, setStreamEnded] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [showCamera, setShowCamera] = useState(true);
  const viewerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // PiP position state
  const pipX = useSharedValue(0);
  const pipY = useSharedValue(0);
  const savedPipX = useSharedValue(0);
  const savedPipY = useSharedValue(0);

  // Request camera permission on mount
  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  // Create stream on mount
  useEffect(() => {
    const createStream = async () => {
      try {
        const result = await api.post<LiveStreamData>('/api/livestream/create', {
          title: 'Live Stream',
        });
        setStreamData(result);
      } catch (err: any) {
        setCreateError(err?.message ?? 'Failed to create live stream');
      } finally {
        setIsCreating(false);
      }
    };
    createStream();
  }, []);

  // Poll viewer count every 30 seconds
  useEffect(() => {
    if (!streamData || streamEnded) return;

    const fetchViewerCount = async () => {
      try {
        const result = await api.get<{ viewerCount: number }>(`/api/livestream/${streamData.id}/status`);
        setViewerCount(result.viewerCount ?? 0);
      } catch {
        // silently fail
      }
    };

    viewerIntervalRef.current = setInterval(fetchViewerCount, 30000);
    return () => {
      if (viewerIntervalRef.current) clearInterval(viewerIntervalRef.current);
    };
  }, [streamData, streamEnded]);

  const handleEndStream = useCallback(async () => {
    if (!streamData) return;
    setIsEnding(true);
    try {
      await api.post(`/api/livestream/${streamData.id}/end`, {});
    } catch {
      // silently continue
    } finally {
      if (viewerIntervalRef.current) clearInterval(viewerIntervalRef.current);
      setStreamEnded(true);
      setIsEnding(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [streamData]);

  const pipPanGesture = Gesture.Pan()
    .onStart(() => {
      savedPipX.value = pipX.value;
      savedPipY.value = pipY.value;
    })
    .onUpdate((e) => {
      pipX.value = savedPipX.value + e.translationX;
      pipY.value = savedPipY.value + e.translationY;
    });

  const pipStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: pipX.value },
      { translateY: pipY.value },
    ],
  }));

  if (isCreating) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.red} size="large" />
        <Text style={{ color: C.muted, fontSize: 14, marginTop: 16 }}>Setting up stream...</Text>
      </View>
    );
  }

  if (createError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Radio size={48} color={C.muted} strokeWidth={1.5} />
        <Text style={{ color: C.text, fontSize: 18, fontWeight: '700', marginTop: 16, marginBottom: 8, textAlign: 'center' }}>
          Failed to Start Stream
        </Text>
        <Text style={{ color: C.muted, fontSize: 14, textAlign: 'center', marginBottom: 32 }}>
          {createError}
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({
            backgroundColor: pressed ? '#A3162E' : C.red,
            borderRadius: 12,
            paddingHorizontal: 24,
            paddingVertical: 14,
          })}
        >
          <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '700' }}>Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (streamEnded) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: 'rgba(196,30,58,0.12)',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}
        >
          <Square size={32} color={C.red} strokeWidth={2} />
        </View>
        <Text style={{ color: C.text, fontSize: 22, fontWeight: '800', marginBottom: 8 }}>
          Stream Ended
        </Text>
        <Text style={{ color: C.muted, fontSize: 14, textAlign: 'center', marginBottom: 12 }}>
          Your live stream has ended successfully.
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: C.surface,
            borderRadius: 20,
            paddingHorizontal: 14,
            paddingVertical: 8,
            marginBottom: 32,
          }}
        >
          <Users size={14} color={C.muted} strokeWidth={2} />
          <Text style={{ color: C.muted, fontSize: 13 }}>{viewerCount} total viewers</Text>
        </View>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({
            backgroundColor: pressed ? '#A3162E' : C.red,
            borderRadius: 12,
            paddingHorizontal: 32,
            paddingVertical: 14,
          })}
        >
          <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '700' }}>Done</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: C.border,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <PulsingDot />
            <Text style={{ color: C.text, fontSize: 18, fontWeight: '800' }}>
              You're Live!
            </Text>
          </View>

          {/* Viewer count */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              backgroundColor: C.surface,
              borderRadius: 16,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderWidth: 1,
              borderColor: C.border2,
              marginRight: 10,
            }}
          >
            <Users size={13} color={C.muted} strokeWidth={2} />
            <Text style={{ color: C.text, fontSize: 12, fontWeight: '700' }}>{viewerCount}</Text>
          </View>

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: pressed ? C.surface2 : C.surface,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: C.border2,
            })}
          >
            <X size={16} color={C.muted} strokeWidth={2} />
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Recording badge */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: 'rgba(196,30,58,0.1)',
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderWidth: 1,
              borderColor: 'rgba(196,30,58,0.25)',
              marginBottom: 24,
              alignSelf: 'flex-start',
            }}
          >
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.red }} />
            <Text style={{ color: C.red, fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>
              RECORDING LOCALLY
            </Text>
          </View>

          {/* Instruction */}
          <View
            style={{
              backgroundColor: C.surface,
              borderRadius: 12,
              padding: 14,
              borderWidth: 1,
              borderColor: C.border2,
              marginBottom: 24,
            }}
          >
            <Text style={{ color: C.muted, fontSize: 13, lineHeight: 20 }}>
              Paste this RTMP URL + Stream Key into{' '}
              <Text style={{ color: C.text, fontWeight: '700' }}>Restream.io</Text>
              {' '}to go live on YouTube, Twitch, and TikTok simultaneously.
            </Text>
          </View>

          {streamData ? (
            <>
              <CopyableField
                label="RTMP URL"
                value={streamData.rtmpUrl}
                monospace
                blurByDefault={false}
              />
              <CopyableField
                label="STREAM KEY"
                value={streamData.streamKey}
                monospace
                blurByDefault
              />
            </>
          ) : null}
        </ScrollView>

        {/* End Stream button */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingBottom: 12,
            borderTopWidth: 1,
            borderTopColor: C.border,
            paddingTop: 16,
          }}
        >
          <Pressable
            testID="end-stream-button"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              Alert.alert(
                'End Stream?',
                'This will end your live stream for all viewers.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'End Stream', style: 'destructive', onPress: handleEndStream },
                ]
              );
            }}
            disabled={isEnding}
            style={({ pressed }) => ({
              backgroundColor: pressed ? '#3D1520' : 'rgba(196,30,58,0.12)',
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
              borderWidth: 1,
              borderColor: 'rgba(196,30,58,0.35)',
              opacity: isEnding ? 0.6 : 1,
            })}
          >
            {isEnding ? (
              <ActivityIndicator size="small" color={C.red} />
            ) : (
              <Square size={16} color={C.red} strokeWidth={2} />
            )}
            <Text style={{ color: C.red, fontSize: 15, fontWeight: '700' }}>
              {isEnding ? 'Ending...' : 'End Stream'}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>

      {/* Face cam PiP */}
      {showCamera && permission?.granted ? (
        <GestureDetector gesture={pipPanGesture}>
          <Animated.View
            style={[
              {
                position: 'absolute',
                bottom: 100,
                right: 20,
                width: 120,
                height: 160,
                borderRadius: 16,
                overflow: 'hidden',
                borderWidth: 2,
                borderColor: C.border2,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.5,
                shadowRadius: 12,
                elevation: 10,
              },
              pipStyle,
            ]}
          >
            <CameraView
              style={{ flex: 1 }}
              facing="front"
            />
            {/* Close PiP button */}
            <Pressable
              onPress={() => setShowCamera(false)}
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: 'rgba(0,0,0,0.6)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={12} color="#FFF" strokeWidth={2.5} />
            </Pressable>
          </Animated.View>
        </GestureDetector>
      ) : null}
    </View>
  );
}
