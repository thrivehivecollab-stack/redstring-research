import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, TextInput, Modal, KeyboardAvoidingView, Platform, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, FadeIn, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { captureRef } from 'react-native-view-shot';
import * as Haptics from 'expo-haptics';
import { Radio, X, Users, Send, Share2, Eye, Wifi, WifiOff } from 'lucide-react-native';
import { authClient } from '@/lib/auth/auth-client';

const C = { bg: '#1A1614', surface: '#231F1C', red: '#C41E3A', pin: '#D4A574', text: '#E8DCC8', muted: '#6B5B4F', border: '#3D332C', green: '#22C55E' } as const;
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? '';
const BACKEND_WS = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');
type Phase = 'setup' | 'live' | 'ended';

interface Props {
  investigationTitle: string;
  investigationId: string;
  canvasRef: React.RefObject<View>;
  onClose: () => void;
}

export default function BroadcasterOverlay({ investigationTitle, investigationId, canvasRef, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('setup');
  const [title, setTitle] = useState(investigationTitle);
  const [desc, setDesc] = useState('');
  const [broadcastId, setBroadcastId] = useState<string | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const [hostMsg, setHostMsg] = useState('');
  const [elapsedSec, setElapsedSec] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const snapshotInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const dotOpacity = useSharedValue(1);

  useEffect(() => {
    dotOpacity.value = withRepeat(withSequence(withTiming(0.2, { duration: 550 }), withTiming(1, { duration: 550 })), -1, true);
  }, [dotOpacity]);
  const dotStyle = useAnimatedStyle(() => ({ opacity: dotOpacity.value }));
  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const sendSnapshot = useCallback(async () => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;
    if (!canvasRef.current) return;
    try {
      const b64 = await captureRef(canvasRef, { format: 'jpg', quality: 0.35, result: 'base64' });
      wsRef.current.send(JSON.stringify({ type: 'snapshot', thumb: `data:image/jpeg;base64,${b64}` }));
    } catch { }
  }, [canvasRef]);

  const cleanup = useCallback(() => {
    wsRef.current?.close();
    if (snapshotInterval.current) clearInterval(snapshotInterval.current);
    if (timerInterval.current) clearInterval(timerInterval.current);
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const connectWs = useCallback((id: string) => {
    const ws = new WebSocket(`${BACKEND_WS}/api/broadcast/${id}/host-ws`);
    ws.onopen = () => {
      setConnected(true);
      setTimeout(sendSnapshot, 400);
      snapshotInterval.current = setInterval(sendSnapshot, 3000);
    };
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (['pong', 'viewer_joined', 'viewer_left'].includes(msg.type)) setViewerCount(msg.viewerCount ?? 0);
      } catch { }
    };
    ws.onclose = () => { setConnected(false); if (snapshotInterval.current) clearInterval(snapshotInterval.current); };
    wsRef.current = ws;
  }, [sendSnapshot]);

  const handleGoLive = useCallback(async () => {
    if (!title.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      const cookie = authClient.getCookie();
      const res = await fetch(`${BACKEND_URL}/api/broadcast/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
        credentials: 'include',
        body: JSON.stringify({ investigationId, title: title.trim(), description: desc.trim() }),
      });
      const json = (await res.json()) as { data: { broadcastId: string } };
      const id = json.data.broadcastId;
      setBroadcastId(id);
      setPhase('live');
      connectWs(id);
      timerInterval.current = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    } catch { }
  }, [title, desc, investigationId, connectWs]);

  const handleEnd = useCallback(async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    if (broadcastId) {
      const cookie = authClient.getCookie();
      await fetch(`${BACKEND_URL}/api/broadcast/${broadcastId}/end`, { method: 'POST', headers: cookie ? { Cookie: cookie } : {}, credentials: 'include' }).catch(() => {});
    }
    cleanup();
    setPhase('ended');
  }, [broadcastId, cleanup]);

  const handleShare = useCallback(() => {
    if (!broadcastId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Share.share({ message: `I'm broadcasting live on Red String!\n\nOpen Red String → "Watch Live" and enter:\n\n  ${broadcastId}\n\n👁 ${title}` });
  }, [broadcastId, title]);

  const handleSend = useCallback(() => {
    if (!hostMsg.trim() || wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'host_message', text: hostMsg.trim() }));
    setHostMsg('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [hostMsg]);

  if (phase === 'setup') {
    return (
      <Modal transparent animationType="none" onRequestClose={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }} onPress={onClose}>
            <Animated.View entering={SlideInDown.springify().damping(22)} exiting={SlideOutDown.duration(220)}>
              <Pressable onPress={() => {}} style={{ backgroundColor: C.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 24, paddingBottom: 36, borderWidth: 1, borderColor: C.border }}>
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 20 }} />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(196,30,58,0.12)', borderWidth: 1, borderColor: 'rgba(196,30,58,0.3)', alignItems: 'center', justifyContent: 'center' }}>
                    <Radio size={22} color={C.red} strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.text, fontSize: 19, fontWeight: '900' }}>Go Live</Text>
                    <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>Broadcast your corkboard to viewers in real-time</Text>
                  </View>
                  <Pressable onPress={onClose}><X size={20} color={C.muted} strokeWidth={2} /></Pressable>
                </View>
                <Text style={{ color: C.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 8 }}>BROADCAST TITLE</Text>
                <TextInput value={title} onChangeText={setTitle} placeholder="What are you investigating today?" placeholderTextColor={C.muted} style={{ backgroundColor: C.bg, borderRadius: 12, padding: 14, color: C.text, fontSize: 15, borderWidth: 1, borderColor: C.border, marginBottom: 16 }} />
                <Text style={{ color: C.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 8 }}>DESCRIPTION (optional)</Text>
                <TextInput value={desc} onChangeText={setDesc} placeholder="Give viewers context…" placeholderTextColor={C.muted} multiline numberOfLines={2} style={{ backgroundColor: C.bg, borderRadius: 12, padding: 14, color: C.text, fontSize: 14, borderWidth: 1, borderColor: C.border, marginBottom: 20, minHeight: 72, textAlignVertical: 'top' }} />
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: 'rgba(196,30,58,0.07)', borderRadius: 12, padding: 14, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(196,30,58,0.18)' }}>
                  <Eye size={15} color={C.red} strokeWidth={2} style={{ marginTop: 1 }} />
                  <Text style={{ color: C.muted, fontSize: 12, flex: 1, lineHeight: 18 }}>Viewers inside Red String will see your corkboard update live every few seconds. Share your broadcast ID so they can join.</Text>
                </View>
                <Pressable onPress={handleGoLive} disabled={!title.trim()} style={({ pressed }) => ({ backgroundColor: title.trim() ? (pressed ? '#A3162E' : C.red) : C.border, borderRadius: 14, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: C.red, shadowOffset: { width: 0, height: 8 }, shadowOpacity: title.trim() ? 0.45 : 0, shadowRadius: 14, elevation: 10 })}>
                  <Radio size={18} color="#FFF" strokeWidth={2.5} />
                  <Text style={{ color: title.trim() ? '#FFF' : C.muted, fontSize: 16, fontWeight: '900', letterSpacing: 0.5 }}>Start Broadcasting</Text>
                </Pressable>
              </Pressable>
            </Animated.View>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    );
  }

  if (phase === 'ended') {
    return (
      <Modal transparent animationType="fade" onRequestClose={onClose}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', justifyContent: 'center', alignItems: 'center', padding: 28 }}>
          <Animated.View entering={FadeIn.springify()} style={{ backgroundColor: C.surface, borderRadius: 24, padding: 32, width: '100%', maxWidth: 360, borderWidth: 1, borderColor: C.border, alignItems: 'center' }}>
            <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: 'rgba(196,30,58,0.1)', borderWidth: 1.5, borderColor: 'rgba(196,30,58,0.3)', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
              <Radio size={30} color={C.red} strokeWidth={1.8} />
            </View>
            <Text style={{ color: C.text, fontSize: 21, fontWeight: '900', marginBottom: 6 }}>Broadcast Ended</Text>
            <Text style={{ color: C.muted, fontSize: 14, marginBottom: 4 }}>Duration — {formatTime(elapsedSec)}</Text>
            <Text style={{ color: C.muted, fontSize: 14, marginBottom: 30 }}>Peak viewers — {viewerCount}</Text>
            <Pressable onPress={onClose} style={({ pressed }) => ({ backgroundColor: pressed ? '#A3162E' : C.red, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 44 })}>
              <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800' }}>Done</Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    );
  }

  return (
    <>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 999, pointerEvents: 'box-none' }}>
        <SafeAreaView edges={['top']} style={{ pointerEvents: 'box-none' }}>
          <Animated.View entering={FadeIn.duration(350)} style={{ margin: 10, backgroundColor: 'rgba(26,22,20,0.96)', borderRadius: 16, borderWidth: 1.5, borderColor: C.red, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 8, shadowColor: C.red, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 14, elevation: 20, pointerEvents: 'auto' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.red }, dotStyle]} />
              <Text style={{ color: C.red, fontSize: 11, fontWeight: '900', letterSpacing: 1.5 }}>LIVE</Text>
            </View>
            <Text style={{ color: C.pin, fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{formatTime(elapsedSec)}</Text>
            <View style={{ flex: 1 }} />
            {connected ? <Wifi size={13} color={C.green} strokeWidth={2} /> : <WifiOff size={13} color={C.red} strokeWidth={2} />}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Users size={13} color={C.text} strokeWidth={2} />
              <Text style={{ color: C.text, fontSize: 12, fontWeight: '700' }}>{viewerCount}</Text>
            </View>
            <Pressable onPress={handleShare} style={({ pressed }) => ({ width: 30, height: 30, borderRadius: 15, backgroundColor: pressed ? C.border : 'rgba(212,165,116,0.15)', borderWidth: 1, borderColor: 'rgba(212,165,116,0.3)', alignItems: 'center', justifyContent: 'center' })}>
              <Share2 size={13} color={C.pin} strokeWidth={2} />
            </Pressable>
            <Pressable onPress={handleEnd} style={({ pressed }) => ({ backgroundColor: pressed ? '#7a1122' : C.red, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 })}>
              <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '900' }}>END</Text>
            </Pressable>
          </Animated.View>
          {broadcastId ? (
            <View style={{ marginHorizontal: 10, marginTop: -2, backgroundColor: 'rgba(26,22,20,0.88)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: C.border, alignSelf: 'flex-start' }}>
              <Text style={{ color: C.muted, fontSize: 10, fontWeight: '600', letterSpacing: 0.5 }}>ID: <Text style={{ color: C.pin, fontWeight: '900', letterSpacing: 2 }}>{broadcastId}</Text>{'  '}· share with viewers</Text>
            </View>
          ) : null}
        </SafeAreaView>
      </View>
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 999, pointerEvents: 'box-none' }}>
        <SafeAreaView edges={['bottom']} style={{ pointerEvents: 'box-none' }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ pointerEvents: 'box-none' }}>
            <View style={{ flexDirection: 'row', gap: 8, marginHorizontal: 10, marginBottom: 8, pointerEvents: 'auto' }}>
              <TextInput value={hostMsg} onChangeText={setHostMsg} placeholder="Say something to viewers…" placeholderTextColor={C.muted} returnKeyType="send" onSubmitEditing={handleSend} style={{ flex: 1, backgroundColor: 'rgba(26,22,20,0.96)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, color: C.text, fontSize: 14, borderWidth: 1, borderColor: C.border }} />
              <Pressable onPress={handleSend} disabled={!hostMsg.trim()} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, backgroundColor: hostMsg.trim() ? (pressed ? '#A3162E' : C.red) : C.border, alignItems: 'center', justifyContent: 'center' })}>
                <Send size={18} color="#FFF" strokeWidth={2} />
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </>
  );
}
