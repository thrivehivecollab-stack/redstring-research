import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, Image, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, FadeIn, FadeOut, SlideInDown, SlideInUp, SlideOutUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Radio, ArrowLeft, Users, Wifi, WifiOff, AlertTriangle, Eye } from 'lucide-react-native';

const C = { bg: '#1A1614', surface: '#231F1C', surfaceAlt: '#2A2522', red: '#C41E3A', pin: '#D4A574', text: '#E8DCC8', muted: '#6B5B4F', border: '#3D332C', green: '#22C55E' } as const;
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? '';
const BACKEND_WS = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');
const REACTION_EMOJIS = ['🔴', '💡', '🕵️', '🚨', '👀', '🤯', '⚡', '🎯'];

interface BroadcastMeta { id: string; hostName: string; title: string; description: string; startedAt: number; viewerCount: number; }
interface FloatingReaction { key: string; emoji: string; }
interface HostMessage { id: string; text: string; ts: number; }

function LiveDot() {
  const opacity = useSharedValue(1);
  useEffect(() => { opacity.value = withRepeat(withSequence(withTiming(0.25, { duration: 550 }), withTiming(1, { duration: 550 })), -1, true); }, [opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.red }, style]} />;
}

export default function LiveViewerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const [joinId, setJoinId] = useState(params.id ?? '');
  const [phase, setPhase] = useState<'join' | 'connecting' | 'watching' | 'ended' | 'error'>(params.id ? 'connecting' : 'join');
  const [meta, setMeta] = useState<BroadcastMeta | null>(null);
  const [thumb, setThumb] = useState<string | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [hostMessages, setHostMessages] = useState<HostMessage[]>([]);
  const [liveSeconds, setLiveSeconds] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const connect = useCallback((id: string) => {
    const trimmed = id.trim().toUpperCase();
    if (!trimmed) return;
    setPhase('connecting');
    setErrorMsg('');
    const ws = new WebSocket(`${BACKEND_WS}/api/broadcast/${trimmed}/view-ws`);
    ws.onopen = () => { setIsConnected(true); };
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        switch (msg.type) {
          case 'joined':
            setMeta(msg.meta);
            setViewerCount(msg.meta?.viewerCount ?? 0);
            if (msg.thumb) setThumb(msg.thumb);
            setPhase('watching');
            if (msg.meta?.startedAt) setLiveSeconds(Math.floor((Date.now() - msg.meta.startedAt) / 1000));
            timerRef.current = setInterval(() => setLiveSeconds((s) => s + 1), 1000);
            break;
          case 'snapshot':
            if (msg.thumb) setThumb(msg.thumb);
            break;
          case 'host_message':
            setHostMessages((prev) => [...prev.slice(-4), { id: Math.random().toString(36), text: msg.text, ts: msg.ts }]);
            setTimeout(() => setHostMessages((prev) => prev.filter((m) => m.ts !== msg.ts)), 5000);
            break;
          case 'reaction':
            setReactions((prev) => [...prev.slice(-10), { key: Math.random().toString(36), emoji: msg.emoji }]);
            setTimeout(() => setReactions((prev) => prev.slice(1)), 2500);
            break;
          case 'stream_ended':
            setPhase('ended');
            if (timerRef.current) clearInterval(timerRef.current);
            break;
        }
      } catch { }
    };
    ws.onclose = () => { setIsConnected(false); };
    ws.onerror = () => { setIsConnected(false); setPhase('error'); setErrorMsg('Could not connect. Check the ID and try again.'); };
    wsRef.current = ws;
  }, []);

  useEffect(() => {
    if (params.id) connect(params.id);
    return () => { wsRef.current?.close(); if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const sendReaction = useCallback((emoji: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify({ type: 'reaction', emoji }));
  }, []);

  if (phase === 'join' || phase === 'error') {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border }}>
              <Pressable onPress={() => router.back()} style={({ pressed }) => ({ width: 36, height: 36, borderRadius: 18, backgroundColor: pressed ? C.border : C.surface, alignItems: 'center', justifyContent: 'center' })}>
                <ArrowLeft size={18} color={C.text} strokeWidth={2} />
              </Pressable>
              <Text style={{ color: C.text, fontSize: 18, fontWeight: '900', letterSpacing: 1.5 }}>JOIN BROADCAST</Text>
            </View>
            <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
              <Animated.View entering={FadeIn.duration(400)} style={{ alignItems: 'center', marginBottom: 40 }}>
                <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(196,30,58,0.1)', borderWidth: 2, borderColor: 'rgba(196,30,58,0.3)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <Radio size={36} color={C.red} strokeWidth={1.5} />
                </View>
                <Text style={{ color: C.text, fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 8 }}>Watch Live</Text>
                <Text style={{ color: C.muted, fontSize: 14, textAlign: 'center', lineHeight: 21 }}>Enter a broadcast ID to watch another{'\n'}investigator's corkboard live.</Text>
              </Animated.View>
              {phase === 'error' ? (
                <Animated.View entering={SlideInDown.springify()} style={{ flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: 'rgba(196,30,58,0.1)', borderRadius: 12, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(196,30,58,0.3)' }}>
                  <AlertTriangle size={16} color={C.red} strokeWidth={2} />
                  <Text style={{ color: C.text, fontSize: 13, flex: 1 }}>{errorMsg}</Text>
                </Animated.View>
              ) : null}
              <Text style={{ color: C.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10 }}>BROADCAST ID</Text>
              <TextInput value={joinId} onChangeText={(t) => setJoinId(t.toUpperCase())} placeholder="e.g. A3K9WXZ" placeholderTextColor={C.muted} autoCapitalize="characters" autoCorrect={false} returnKeyType="go" onSubmitEditing={() => connect(joinId)} style={{ backgroundColor: C.surface, borderRadius: 14, padding: 16, color: C.text, fontSize: 18, fontWeight: '700', letterSpacing: 3, borderWidth: 1.5, borderColor: joinId.length > 0 ? 'rgba(196,30,58,0.5)' : C.border, textAlign: 'center', marginBottom: 24 }} />
              <Pressable onPress={() => connect(joinId)} disabled={joinId.trim().length < 4} style={({ pressed }) => ({ backgroundColor: joinId.trim().length >= 4 ? (pressed ? '#A3162E' : C.red) : C.border, borderRadius: 14, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10, shadowColor: C.red, shadowOffset: { width: 0, height: 6 }, shadowOpacity: joinId.trim().length >= 4 ? 0.35 : 0, shadowRadius: 12, elevation: 8 })}>
                <Eye size={18} color="#FFF" strokeWidth={2.5} />
                <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 }}>Watch Live</Text>
              </Pressable>
              <Text style={{ color: C.muted, fontSize: 12, textAlign: 'center', marginTop: 20, lineHeight: 18 }}>Get the broadcast ID from the investigator{'\n'}or from a shared invite link.</Text>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    );
  }

  if (phase === 'connecting') {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.red} size="large" />
        <Text style={{ color: C.muted, fontSize: 14, marginTop: 16 }}>Connecting to broadcast…</Text>
      </View>
    );
  }

  if (phase === 'ended') {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Animated.View entering={FadeIn.springify()} style={{ alignItems: 'center' }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(196,30,58,0.1)', borderWidth: 1, borderColor: 'rgba(196,30,58,0.3)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <Radio size={32} color={C.red} strokeWidth={1.5} />
          </View>
          <Text style={{ color: C.text, fontSize: 22, fontWeight: '800', marginBottom: 10 }}>Broadcast Ended</Text>
          <Text style={{ color: C.muted, fontSize: 14, marginBottom: 8 }}>{meta?.title ?? ''}</Text>
          <Text style={{ color: C.muted, fontSize: 13, marginBottom: 36 }}>Watched for {formatTime(liveSeconds)}</Text>
          <Pressable onPress={() => router.back()} style={({ pressed }) => ({ backgroundColor: pressed ? '#A3162E' : C.red, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 40 })}>
            <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '700' }}>Back</Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border }}>
          <Pressable onPress={() => { wsRef.current?.close(); router.back(); }} style={({ pressed }) => ({ width: 34, height: 34, borderRadius: 17, backgroundColor: pressed ? C.border : C.surface, alignItems: 'center', justifyContent: 'center' })}>
            <ArrowLeft size={16} color={C.text} strokeWidth={2} />
          </Pressable>
          <LiveDot />
          <Text style={{ color: C.red, fontSize: 11, fontWeight: '900', letterSpacing: 1.5 }}>LIVE</Text>
          <Text style={{ color: C.pin, fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'], marginLeft: 4 }}>{formatTime(liveSeconds)}</Text>
          <Text numberOfLines={1} style={{ flex: 1, color: C.text, fontSize: 14, fontWeight: '700' }}>{meta?.title ?? ''}</Text>
          {isConnected ? <Wifi size={14} color={C.green} strokeWidth={2} /> : <WifiOff size={14} color={C.red} strokeWidth={2} />}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Users size={13} color={C.muted} strokeWidth={2} />
            <Text style={{ color: C.muted, fontSize: 12, fontWeight: '600' }}>{viewerCount}</Text>
          </View>
        </View>

        {meta ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: C.surfaceAlt, borderBottomWidth: 1, borderBottomColor: C.border }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(196,30,58,0.2)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 13 }}>🕵️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.text, fontSize: 13, fontWeight: '700' }}>{meta.hostName}</Text>
              {meta.description ? <Text style={{ color: C.muted, fontSize: 11 }} numberOfLines={1}>{meta.description}</Text> : null}
            </View>
          </View>
        ) : null}

        <View style={{ flex: 1, position: 'relative' }}>
          {thumb ? (
            <View style={{ flex: 1, margin: 12, borderRadius: 12, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(196,30,58,0.4)', shadowColor: C.red, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 10 }}>
              <Image source={{ uri: thumb }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
              <View style={{ position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(26,22,20,0.85)', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(196,30,58,0.4)' }}>
                <LiveDot />
                <Text style={{ color: C.red, fontSize: 11, fontWeight: '900', letterSpacing: 1.5 }}>LIVE</Text>
              </View>
            </View>
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surfaceAlt, borderRadius: 12, margin: 12 }}>
              <Radio size={32} color={C.muted} strokeWidth={1.5} />
              <Text style={{ color: C.muted, fontSize: 13, marginTop: 10 }}>Waiting for broadcast…</Text>
            </View>
          )}

          <View style={{ position: 'absolute', right: 20, bottom: 20, alignItems: 'flex-end', pointerEvents: 'none' }}>
            {reactions.map((r) => (
              <Animated.Text key={r.key} entering={SlideInUp.springify().damping(14)} exiting={FadeOut.duration(600)} style={{ fontSize: 28, marginBottom: 4 }}>{r.emoji}</Animated.Text>
            ))}
          </View>

          <View style={{ position: 'absolute', top: 0, left: 12, right: 12, pointerEvents: 'none' }}>
            {hostMessages.map((m) => (
              <Animated.View key={m.id} entering={SlideInDown.springify().damping(18)} exiting={SlideOutUp.duration(300)} style={{ backgroundColor: 'rgba(26,22,20,0.95)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(212,165,116,0.4)', marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 14 }}>📢</Text>
                <Text style={{ color: C.text, fontSize: 13, flex: 1, lineHeight: 18 }}>{m.text}</Text>
              </Animated.View>
            ))}
          </View>
        </View>

        <SafeAreaView edges={['bottom']} style={{ backgroundColor: C.surface }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.border, gap: 8 }}>
            <Text style={{ color: C.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 }}>REACT</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}>
              {REACTION_EMOJIS.map((emoji) => (
                <Pressable key={emoji} onPress={() => sendReaction(emoji)} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, backgroundColor: pressed ? 'rgba(196,30,58,0.2)' : C.surfaceAlt, borderWidth: 1, borderColor: pressed ? 'rgba(196,30,58,0.4)' : C.border, alignItems: 'center', justifyContent: 'center' })}>
                  <Text style={{ fontSize: 22 }}>{emoji}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </SafeAreaView>
      </SafeAreaView>
    </View>
  );
}
