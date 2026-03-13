import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Mic, MicOff, Video, VideoOff, Monitor, MessageSquare,
  FileText, Users, PhoneOff, LogOut, Download, Send,
  Paperclip, ChevronDown, X, Check, ArrowLeft,
  Radio, Signal,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  FadeIn,
  SlideInDown,
  SlideOutDown,
  SlideInRight,
  SlideOutRight,
} from 'react-native-reanimated';
import { WebView } from 'react-native-webview';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/api';
import { useSession } from '@/lib/auth/use-session';
import useInvestigationStore from '@/lib/state/investigation-store';
import type { TagColor } from '@/lib/types';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const C = {
  bg: '#0F0D0B',
  surface: '#1C1815',
  surfaceAlt: '#242018',
  red: '#C41E3A',
  redGlow: 'rgba(196,30,58,0.4)',
  pin: '#D4A574',
  pinGlow: 'rgba(212,165,116,0.3)',
  text: '#E8DCC8',
  muted: '#6B5B4F',
  border: '#2E2520',
  green: '#22C55E',
  overlay: 'rgba(15,13,11,0.85)',
};

const TAG_COLORS: Record<TagColor, string> = {
  red: '#C41E3A',
  blue: '#3B82F6',
  green: '#22C55E',
  amber: '#F59E0B',
  purple: '#A855F7',
  teal: '#14B8A6',
};

const PARTICIPANT_COLORS = ['#C41E3A', '#3B82F6', '#22C55E', '#F59E0B', '#A855F7', '#14B8A6', '#F97316', '#EC4899'];

interface WarRoom {
  id: string;
  dailyRoomName: string;
  dailyRoomUrl: string;
  sessionId: string | null;
  ownerId: string;
  title: string;
  status: string;
  createdAt: string;
  isOwner: boolean;
}

interface DataRequest {
  id: string;
  warRoomId: string;
  requesterId: string;
  nodeId: string;
  nodeTitle: string;
  nodeSnapshot: string;
  status: string;
  createdAt: string;
}

interface ChatMessage {
  id: string;
  senderName: string;
  participantId: string;
  text?: string;
  type: 'chat' | 'file' | 'system';
  fileName?: string;
  fileData?: string;
  mimeType?: string;
  timestamp: number;
}

type Panel = 'none' | 'chat' | 'notes' | 'participants' | 'requests';

function NodeTypeIcon({ type, size = 16 }: { type: string; size?: number }) {
  const color = C.muted;
  switch (type) {
    case 'investigation': return <Radio size={size} color={color} strokeWidth={2} />;
    case 'link': return <Monitor size={size} color={color} strokeWidth={2} />;
    case 'image': return <Video size={size} color={color} strokeWidth={2} />;
    default: return <FileText size={size} color={color} strokeWidth={2} />;
  }
}

function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Pulsing dot for LIVE indicator
function PulsingDot() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(withSequence(withTiming(1.5, { duration: 700 }), withTiming(1, { duration: 700 })), -1);
    opacity.value = withRepeat(withSequence(withTiming(0.4, { duration: 700 }), withTiming(1, { duration: 700 })), -1);
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: opacity.value }));
  return (
    <Animated.View style={[{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: C.red }, style]} />
  );
}

// Control button component
function CtrlBtn({
  onPress,
  icon,
  label,
  active = false,
  danger = false,
  badge,
}: {
  onPress: () => void;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  danger?: boolean;
  badge?: number;
}) {
  const bg = danger
    ? 'rgba(196,30,58,0.18)'
    : active
    ? 'rgba(212,165,116,0.15)'
    : C.surface;
  const borderCol = danger
    ? 'rgba(196,30,58,0.5)'
    : active
    ? 'rgba(212,165,116,0.35)'
    : C.border;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        gap: 5,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 18,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1.5,
          borderColor: borderCol,
          shadowColor: danger ? C.red : active ? C.pin : '#000',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: danger || active ? 0.35 : 0.2,
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        {icon}
        {badge != null && badge > 0 ? (
          <View
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              minWidth: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: C.red,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 3,
              borderWidth: 1.5,
              borderColor: C.bg,
            }}
          >
            <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '800' }}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={{ color: danger ? '#FF6B6B' : active ? C.pin : C.muted, fontSize: 12, fontWeight: '600', letterSpacing: 0.5 }}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function WarRoomScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ warRoomId?: string; collabSessionId?: string }>();
  const { data: sessionData } = useSession();
  const queryClient = useQueryClient();

  const investigations = useInvestigationStore((s) => s.investigations);
  const activeId = useInvestigationStore((s) => s.activeInvestigationId);
  const addNode = useInvestigationStore((s) => s.addNode);
  const addSource = useInvestigationStore((s) => s.addSource);

  const activeInvestigation = investigations.find((i) => i.id === activeId) ?? investigations[0];

  const [roomInfo, setRoomInfo] = useState<WarRoom | null>(null);
  const [meetingToken, setMeetingToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [micMuted, setMicMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [boardSharing, setBoardSharing] = useState(false);
  const [activePanel, setActivePanel] = useState<Panel>('none');

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [unreadChat, setUnreadChat] = useState(0);
  const chatScrollRef = useRef<ScrollView>(null);

  const [noteText, setNoteText] = useState('');

  const boardOffsetX = useSharedValue(0);
  const boardOffsetY = useSharedValue(0);
  const boardScale = useSharedValue(0.58);

  const [requestsBadge, setRequestsBadge] = useState(0);

  const webviewRef = useRef<WebView>(null);

  // Loading pulse animation
  const loadingGlow = useSharedValue(0.3);
  useEffect(() => {
    loadingGlow.value = withRepeat(withSequence(withTiming(1, { duration: 900 }), withTiming(0.3, { duration: 900 })), -1);
  }, []);
  const loadingGlowStyle = useAnimatedStyle(() => ({ opacity: loadingGlow.value }));

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const warRoomId = params.warRoomId;
        if (!warRoomId) { setError('No war room specified.'); setIsLoading(false); return; }
        const room = await api.get<WarRoom>(`/api/warroom/rooms/${warRoomId}`);
        if (!room) { setError('Room not found.'); setIsLoading(false); return; }
        setRoomInfo(room);
        const tokenData = await api.post<{ token: string }>(`/api/warroom/rooms/${warRoomId}/token`, {});
        setMeetingToken(tokenData?.token ?? null);
      } catch (e: any) {
        const msg = e?.message ?? 'Failed to load war room';
        setError(msg.includes('DAILY_NOT_CONFIGURED') ? 'War Room requires Daily.co setup — contact your admin to configure DAILY_API_KEY' : msg);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [params.warRoomId]);

  const { data: dataRequests } = useQuery({
    queryKey: ['war-room-requests', roomInfo?.id],
    queryFn: () => api.get<DataRequest[]>(`/api/warroom/rooms/${roomInfo!.id}/data-requests`),
    enabled: !!roomInfo?.isOwner && !!roomInfo?.id,
    refetchInterval: 5000,
  });

  useEffect(() => {
    setRequestsBadge((dataRequests ?? []).filter((r) => r.status === 'pending').length);
  }, [dataRequests]);

  const approveMutation = useMutation({
    mutationFn: ({ reqId }: { reqId: string }) =>
      api.post<{ id: string; status: string; nodeSnapshot: string; requesterId: string }>(
        `/api/warroom/rooms/${roomInfo!.id}/data-request/${reqId}/approve`, {}
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['war-room-requests', roomInfo?.id] });
      setChatMessages((prev) => [...prev, { id: Date.now().toString(), senderName: 'System', participantId: 'system', type: 'system', text: 'Node request approved', timestamp: Date.now() }]);
    },
  });

  const requestNodeMutation = useMutation({
    mutationFn: ({ nodeId, nodeTitle, nodeSnapshot }: { nodeId: string; nodeTitle: string; nodeSnapshot: string }) =>
      api.post(`/api/warroom/rooms/${roomInfo!.id}/data-request`, { nodeId, nodeTitle, nodeSnapshot }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setChatMessages((prev) => [...prev, { id: Date.now().toString(), senderName: 'System', participantId: 'system', type: 'system', text: 'Node request sent to room owner', timestamp: Date.now() }]);
    },
  });

  const endRoomMutation = useMutation({
    mutationFn: () => api.post(`/api/warroom/rooms/${roomInfo!.id}/end`, {}),
    onSuccess: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); router.back(); },
  });

  const handleWebViewMessage = useCallback((event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'chat') {
        setChatMessages((prev) => [...prev, { id: Date.now().toString() + Math.random(), senderName: msg.senderName ?? 'Unknown', participantId: msg.participantId ?? '', type: 'chat', text: msg.text, timestamp: msg.timestamp ?? Date.now() }]);
        if (activePanel !== 'chat') setUnreadChat((n) => n + 1);
      } else if (msg.type === 'file') {
        setChatMessages((prev) => [...prev, { id: Date.now().toString() + Math.random(), senderName: msg.senderName ?? 'Unknown', participantId: msg.participantId ?? '', type: 'file', fileName: msg.fileName, fileData: msg.data, mimeType: msg.mimeType, timestamp: Date.now() }]);
        if (activePanel !== 'chat') setUnreadChat((n) => n + 1);
      }
    } catch {}
  }, [activePanel]);

  const sendChatMessage = useCallback(() => {
    if (!chatInput.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const userName = sessionData?.user?.name ?? 'You';
    setChatMessages((prev) => [...prev, { id: Date.now().toString(), senderName: userName, participantId: sessionData?.user?.id ?? 'local', type: 'chat', text: chatInput.trim(), timestamp: Date.now() }]);
    webviewRef.current?.injectJavaScript(`if(window.daily){window.daily.sendAppMessage({type:'chat',text:${JSON.stringify(chatInput.trim())},senderName:${JSON.stringify(userName)},participantId:${JSON.stringify(sessionData?.user?.id ?? 'local')},timestamp:${Date.now()}},'*');}`);
    setChatInput('');
    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [chatInput, sessionData]);

  const sendFileMessage = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
      const userName = sessionData?.user?.name ?? 'You';
      setChatMessages((prev) => [...prev, { id: Date.now().toString(), senderName: userName, participantId: sessionData?.user?.id ?? 'local', type: 'file', fileName: asset.name, fileData: base64, mimeType: asset.mimeType ?? 'application/octet-stream', timestamp: Date.now() }]);
    } catch {}
  }, [sessionData]);

  const downloadFile = useCallback(async (msg: ChatMessage) => {
    if (!msg.fileData || !msg.fileName) return;
    try {
      await FileSystem.writeAsStringAsync(`${FileSystem.documentDirectory}${msg.fileName}`, msg.fileData, { encoding: FileSystem.EncodingType.Base64 });
      Alert.alert('Saved', `${msg.fileName} saved to documents`);
    } catch { Alert.alert('Error', 'Failed to save file'); }
  }, []);

  const shareNote = useCallback(() => {
    if (!noteText.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const userName = sessionData?.user?.name ?? 'You';
    setChatMessages((prev) => [...prev, { id: Date.now().toString(), senderName: userName, participantId: sessionData?.user?.id ?? 'local', type: 'chat', text: `📋 Note: ${noteText.trim()}`, timestamp: Date.now() }]);
    setActivePanel('chat');
  }, [noteText, sessionData]);

  const togglePanel = useCallback((panel: Panel) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActivePanel((prev) => (prev === panel ? 'none' : panel));
    if (panel === 'chat') setUnreadChat(0);
  }, []);

  const buildDailyHtml = useCallback(() => {
    if (!roomInfo?.dailyRoomUrl || !meetingToken) return null;
    const url = `${roomInfo.dailyRoomUrl}?t=${meetingToken}`;
    return `<!DOCTYPE html><html style="margin:0;padding:0;background:#0F0D0B;height:100%;"><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0F0D0B;height:100%;overflow:hidden}iframe{width:100%;height:100%;border:none}</style></head><body><iframe id="daily-frame" src="${url}" allow="camera;microphone;fullscreen;display-capture;autoplay" allowfullscreen></iframe><script>window.addEventListener('message',function(e){try{var d=typeof e.data==='string'?JSON.parse(e.data):e.data;if(d&&(d.type==='chat'||d.type==='file')){window.ReactNativeWebView.postMessage(JSON.stringify(d))}}catch(err){}});window.daily={sendAppMessage:function(msg,to){document.getElementById('daily-frame').contentWindow.postMessage(JSON.stringify({action:'send-app-message',data:msg}),'*')}};</script></body></html>`;
  }, [roomInfo, meetingToken]);

  const boardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: boardOffsetX.value }, { translateY: boardOffsetY.value }, { scale: boardScale.value }],
  }));

  // --- LOADING SCREEN ---
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={[{ width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(196,30,58,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 28, borderWidth: 1.5, borderColor: 'rgba(196,30,58,0.3)' }, loadingGlowStyle]}>
          <Radio size={44} color={C.red} strokeWidth={1.5} />
        </Animated.View>
        <Text style={{ color: C.text, fontSize: 18, fontWeight: '800', letterSpacing: 0.7, marginBottom: 8 }}>War Room</Text>
        <Text style={{ color: C.muted, fontSize: 13, letterSpacing: 0.5 }}>Connecting to secure channel...</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 28 }}>
          <ActivityIndicator color={C.red} size="small" />
          <Text style={{ color: C.muted, fontSize: 13 }}>Establishing encrypted session</Text>
        </View>
      </View>
    );
  }

  // --- ERROR SCREEN ---
  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
            <Pressable onPress={() => router.back()} style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, backgroundColor: pressed ? C.border : C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border })}>
              <ArrowLeft size={20} color={C.text} strokeWidth={2} />
            </Pressable>
            <Text style={{ color: C.text, fontSize: 17, fontWeight: '800', marginLeft: 12 }}>War Room</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
            <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(196,30,58,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 24, borderWidth: 1.5, borderColor: 'rgba(196,30,58,0.25)' }}>
              <Signal size={38} color={C.red} strokeWidth={1.5} />
            </View>
            <Text style={{ color: C.text, fontSize: 20, fontWeight: '900', textAlign: 'center', marginBottom: 12, letterSpacing: 0.3 }}>War Room Unavailable</Text>
            <Text style={{ color: C.muted, fontSize: 14, textAlign: 'center', lineHeight: 22 }}>{error}</Text>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => ({ marginTop: 36, backgroundColor: pressed ? '#A3162E' : C.red, borderRadius: 14, paddingVertical: 15, paddingHorizontal: 40, shadowColor: C.red, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 })}
            >
              <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800' }}>Go Back</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const dailyHtml = buildDailyHtml();
  const CTRL_BAR_H = 84;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* BOARD LAYER */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        {/* Grid dot background */}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.18 }}>
          {Array.from({ length: 30 }).map((_, row) =>
            Array.from({ length: 20 }).map((_, col) => (
              <View
                key={`${row}-${col}`}
                style={{ position: 'absolute', width: 2, height: 2, borderRadius: 1, backgroundColor: C.muted, left: col * (SCREEN_W / 20), top: row * (SCREEN_H / 30) }}
              />
            ))
          )}
        </View>

        <View style={{ flex: 1, overflow: 'hidden' }}>
          <Animated.View style={[{ position: 'absolute', width: 3000, height: 3000, top: -500, left: -500 }, boardAnimStyle]}>
            {/* Strings */}
            {(activeInvestigation?.strings ?? []).map((str) => {
              const from = activeInvestigation?.nodes.find((n) => n.id === str.fromNodeId);
              const to = activeInvestigation?.nodes.find((n) => n.id === str.toNodeId);
              if (!from || !to) return null;
              const x1 = from.position.x + 500 + 80;
              const y1 = from.position.y + 500 + 50;
              const x2 = to.position.x + 500 + 80;
              const y2 = to.position.y + 500 + 50;
              return (
                <View key={str.id} pointerEvents="none" style={{ position: 'absolute', left: Math.min(x1, x2), top: Math.min(y1, y2), width: Math.abs(x2 - x1) || 1, height: Math.abs(y2 - y1) || 1, borderTopWidth: 2, borderTopColor: str.color ?? C.red, opacity: 0.6 }} />
              );
            })}
            {/* Nodes */}
            {(activeInvestigation?.nodes ?? []).map((node) => {
              const color = node.color ? (TAG_COLORS[node.color] ?? C.red) : C.red;
              const isOwner = roomInfo?.isOwner ?? false;
              return (
                <View key={node.id} style={{ position: 'absolute', left: node.position.x + 500, top: node.position.y + 500, width: 160, backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: color + '50', borderLeftWidth: 4, borderLeftColor: color, padding: 11, shadowColor: color, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                    <NodeTypeIcon type={node.type} size={15} />
                    <Text style={{ color: color, fontSize: 9, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', flex: 1 }} numberOfLines={1}>{node.type}</Text>
                  </View>
                  <Text style={{ color: C.text, fontSize: 13, fontWeight: '700', lineHeight: 17 }} numberOfLines={2}>{node.title}</Text>
                  {!isOwner ? (
                    <Pressable
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); requestNodeMutation.mutate({ nodeId: node.id, nodeTitle: node.title, nodeSnapshot: JSON.stringify(node) }); }}
                      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, backgroundColor: pressed ? 'rgba(212,165,116,0.25)' : 'rgba(212,165,116,0.12)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(212,165,116,0.25)' })}
                    >
                      <Download size={15} color={C.pin} strokeWidth={2.5} />
                      <Text style={{ color: C.pin, fontSize: 12, fontWeight: '800' }}>Request</Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </Animated.View>

          {!activeInvestigation?.nodes?.length ? (
            <View style={{ position: 'absolute', top: '42%', left: 0, right: 0, alignItems: 'center', gap: 8 }}>
              <FileText size={32} color={C.border} strokeWidth={1.5} />
              <Text style={{ color: C.border, fontSize: 13, fontWeight: '600' }}>No active investigation board</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* VIDEO PIP */}
      {dailyHtml ? (
        <Animated.View
          entering={FadeIn.duration(800)}
          style={{
            position: 'absolute',
            top: 72,
            right: 16,
            width: 180,
            height: 135,
            borderRadius: 16,
            overflow: 'hidden',
            borderWidth: 2,
            borderColor: 'rgba(196,30,58,0.5)',
            shadowColor: C.red,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.5,
            shadowRadius: 16,
            elevation: 16,
            zIndex: 10,
          }}
        >
          <WebView ref={webviewRef} source={{ html: dailyHtml }} style={{ flex: 1, backgroundColor: C.bg }} allowsInlineMediaPlayback mediaPlaybackRequiresUserAction={false} onMessage={handleWebViewMessage} javaScriptEnabled domStorageEnabled originWhitelist={['*']} />
          {/* LIVE badge */}
          <View style={{ position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(15,13,11,0.75)', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 }}>
            <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: C.red }} />
            <Text style={{ color: '#FFF', fontSize: 9, fontWeight: '800', letterSpacing: 1.2 }}>LIVE</Text>
          </View>
        </Animated.View>
      ) : null}

      {/* SAFE AREA WRAPPER */}
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']} pointerEvents="box-none">
        {/* Header */}
        <View pointerEvents="box-none" style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 2, paddingBottom: 10 }}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, backgroundColor: pressed ? C.border : 'rgba(28,24,21,0.85)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: C.border })}
          >
            <ArrowLeft size={18} color={C.text} strokeWidth={2} />
          </Pressable>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ color: C.text, fontSize: 16, fontWeight: '900', letterSpacing: 0.3 }} numberOfLines={1}>
              {roomInfo?.title ?? 'War Room'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
              <PulsingDot />
              <Text style={{ color: C.red, fontSize: 10, fontWeight: '800', letterSpacing: 1.4 }}>LIVE SESSION</Text>
            </View>
          </View>
        </View>

        <View style={{ flex: 1 }} pointerEvents="none" />

        {/* PANELS */}

        {/* Chat panel */}
        {activePanel === 'chat' ? (
          <Animated.View entering={SlideInDown.duration(280).springify()} exiting={SlideOutDown.duration(220)}
            style={{ position: 'absolute', bottom: CTRL_BAR_H, left: 0, right: 0, height: SCREEN_H * 0.46, backgroundColor: C.surface + 'F8', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderTopColor: C.border }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(212,165,116,0.12)', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                <MessageSquare size={17} color={C.pin} strokeWidth={2} />
              </View>
              <Text style={{ color: C.text, fontSize: 15, fontWeight: '800', flex: 1 }}>Chat</Text>
              <Pressable onPress={() => setActivePanel('none')} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                <ChevronDown size={20} color={C.muted} strokeWidth={2} />
              </Pressable>
            </View>
            <ScrollView ref={chatScrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 14, gap: 10 }} onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: false })}>
              {chatMessages.map((msg, idx) => {
                const colorIdx = Math.abs(msg.participantId.charCodeAt(0)) % PARTICIPANT_COLORS.length;
                const nameColor = msg.type === 'system' ? C.muted : PARTICIPANT_COLORS[colorIdx];
                const isMine = msg.participantId === (sessionData?.user?.id ?? 'local');
                return (
                  <View key={msg.id + idx} style={{ alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                    {msg.type === 'system' ? (
                      <View style={{ backgroundColor: C.surfaceAlt, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5 }}>
                        <Text style={{ color: C.muted, fontSize: 12, fontStyle: 'italic' }}>{msg.text}</Text>
                      </View>
                    ) : msg.type === 'file' ? (
                      <View style={{ backgroundColor: C.surfaceAlt, borderRadius: 14, padding: 12, maxWidth: SCREEN_W * 0.72, borderWidth: 1, borderColor: C.border }}>
                        <Text style={{ color: nameColor, fontSize: 12, fontWeight: '700', marginBottom: 6 }}>{msg.senderName}</Text>
                        <Pressable onPress={() => downloadFile(msg)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: pressed ? C.border : C.bg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 })}>
                          <Download size={16} color={C.pin} strokeWidth={2} />
                          <Text style={{ color: C.text, fontSize: 13, fontWeight: '600', flex: 1 }} numberOfLines={1}>{msg.fileName}</Text>
                        </Pressable>
                        <Text style={{ color: C.muted, fontSize: 12, marginTop: 5 }}>{formatTime(msg.timestamp)}</Text>
                      </View>
                    ) : (
                      <View style={{ backgroundColor: isMine ? 'rgba(196,30,58,0.2)' : C.surfaceAlt, borderRadius: 14, padding: 12, maxWidth: SCREEN_W * 0.74, borderWidth: 1, borderColor: isMine ? 'rgba(196,30,58,0.35)' : C.border }}>
                        {!isMine ? <Text style={{ color: nameColor, fontSize: 12, fontWeight: '800', marginBottom: 4 }}>{msg.senderName}</Text> : null}
                        <Text style={{ color: C.text, fontSize: 14, lineHeight: 20 }}>{msg.text}</Text>
                        <Text style={{ color: C.muted, fontSize: 12, marginTop: 4, textAlign: 'right' }}>{formatTime(msg.timestamp)}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
              {chatMessages.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                  <MessageSquare size={28} color={C.border} strokeWidth={1.5} />
                  <Text style={{ color: C.muted, fontSize: 13, marginTop: 8 }}>No messages yet</Text>
                </View>
              ) : null}
            </ScrollView>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 10, borderTopWidth: 1, borderTopColor: C.border }}>
                <Pressable onPress={sendFileMessage} style={({ pressed }) => ({ width: 38, height: 38, borderRadius: 19, backgroundColor: pressed ? C.border : C.surfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border })}>
                  <Paperclip size={17} color={C.muted} strokeWidth={2} />
                </Pressable>
                <TextInput value={chatInput} onChangeText={setChatInput} placeholder="Message the team..." placeholderTextColor={C.muted} style={{ flex: 1, backgroundColor: C.surfaceAlt, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: C.text, fontSize: 14, borderWidth: 1, borderColor: C.border }} onSubmitEditing={sendChatMessage} returnKeyType="send" />
                <Pressable onPress={sendChatMessage} style={({ pressed }) => ({ width: 38, height: 38, borderRadius: 19, backgroundColor: chatInput.trim() ? (pressed ? '#A3162E' : C.red) : C.surfaceAlt, alignItems: 'center', justifyContent: 'center', shadowColor: chatInput.trim() ? C.red : 'transparent', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 6 })}>
                  <Send size={17} color={chatInput.trim() ? '#FFF' : C.muted} strokeWidth={2.5} />
                </Pressable>
              </View>
            </KeyboardAvoidingView>
          </Animated.View>
        ) : null}

        {/* Notes panel */}
        {activePanel === 'notes' ? (
          <Animated.View entering={SlideInDown.duration(280).springify()} exiting={SlideOutDown.duration(220)}
            style={{ position: 'absolute', bottom: CTRL_BAR_H, left: 0, right: 0, height: SCREEN_H * 0.3, backgroundColor: C.surface + 'F8', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderTopColor: C.border }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(212,165,116,0.12)', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                <FileText size={17} color={C.pin} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontSize: 15, fontWeight: '800' }}>Private Scratchpad</Text>
                <Text style={{ color: C.muted, fontSize: 12, marginTop: 1 }}>Only visible to you</Text>              </View>
              <Pressable onPress={shareNote} style={({ pressed }) => ({ backgroundColor: pressed ? '#A3162E' : C.red, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, marginRight: 8, shadowColor: C.red, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 5 })}>
                <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>Share</Text>
              </Pressable>
              <Pressable onPress={() => setActivePanel('none')} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                <ChevronDown size={20} color={C.muted} strokeWidth={2} />
              </Pressable>
            </View>
            <TextInput value={noteText} onChangeText={setNoteText} placeholder="Write private notes here..." placeholderTextColor={C.muted} multiline style={{ flex: 1, paddingHorizontal: 20, paddingVertical: 12, color: C.text, fontSize: 14, lineHeight: 22, textAlignVertical: 'top' }} />
          </Animated.View>
        ) : null}

        {/* Participants panel */}
        {activePanel === 'participants' ? (
          <Animated.View entering={SlideInRight.duration(280).springify()} exiting={SlideOutRight.duration(220)}
            style={{ position: 'absolute', top: 0, bottom: CTRL_BAR_H, right: 0, width: SCREEN_W * 0.68, backgroundColor: C.surface + 'F8', borderLeftWidth: 1, borderLeftColor: C.border }}
          >
            <SafeAreaView edges={['top']} style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(212,165,116,0.12)', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                  <Users size={17} color={C.pin} strokeWidth={2} />
                </View>
                <Text style={{ color: C.text, fontSize: 15, fontWeight: '800', flex: 1 }}>Participants</Text>
                <Pressable onPress={() => setActivePanel('none')} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                  <X size={18} color={C.muted} strokeWidth={2} />
                </Pressable>
              </View>
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14 }}>
                <View style={{ backgroundColor: C.surfaceAlt, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(196,30,58,0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                      <Text style={{ color: C.red, fontSize: 15, fontWeight: '900' }}>{(sessionData?.user?.name ?? '?')[0].toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: C.text, fontSize: 14, fontWeight: '700' }}>{sessionData?.user?.name ?? 'You'}</Text>
                      <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{roomInfo?.isOwner ? 'Room Owner' : 'Participant'}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: micMuted ? 'rgba(196,30,58,0.12)' : 'rgba(34,197,94,0.1)', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5, borderWidth: 1, borderColor: micMuted ? 'rgba(196,30,58,0.25)' : 'rgba(34,197,94,0.2)' }}>
                      {micMuted ? <MicOff size={15} color={C.red} strokeWidth={2} /> : <Mic size={15} color={C.green} strokeWidth={2} />}
                      <Text style={{ color: micMuted ? C.red : C.green, fontSize: 12, fontWeight: '700' }}>{micMuted ? 'Muted' : 'Live'}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: camOff ? 'rgba(196,30,58,0.12)' : 'rgba(34,197,94,0.1)', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5, borderWidth: 1, borderColor: camOff ? 'rgba(196,30,58,0.25)' : 'rgba(34,197,94,0.2)' }}>
                      {camOff ? <VideoOff size={15} color={C.red} strokeWidth={2} /> : <Video size={15} color={C.green} strokeWidth={2} />}
                      <Text style={{ color: camOff ? C.red : C.green, fontSize: 12, fontWeight: '700' }}>{camOff ? 'Off' : 'On'}</Text>
                    </View>
                  </View>
                </View>
                <Text style={{ color: C.muted, fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 18 }}>Remote participants are visible in the video panel</Text>
              </ScrollView>
            </SafeAreaView>
          </Animated.View>
        ) : null}

        {/* Requests panel */}
        {activePanel === 'requests' && roomInfo?.isOwner ? (
          <Animated.View entering={SlideInDown.duration(280).springify()} exiting={SlideOutDown.duration(220)}
            style={{ position: 'absolute', bottom: CTRL_BAR_H, left: 0, right: 0, height: SCREEN_H * 0.52, backgroundColor: C.surface + 'F8', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderTopColor: C.border }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(212,165,116,0.12)', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                <Download size={17} color={C.pin} strokeWidth={2} />
              </View>
              <Text style={{ color: C.text, fontSize: 15, fontWeight: '800', flex: 1 }}>Data Requests</Text>
              <Pressable onPress={() => setActivePanel('none')} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                <ChevronDown size={20} color={C.muted} strokeWidth={2} />
              </Pressable>
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, gap: 12 }}>
              {(dataRequests ?? []).filter((r) => r.status === 'pending').map((req) => {
                let parsedNode: any = {};
                try { parsedNode = JSON.parse(req.nodeSnapshot); } catch {}
                const nodeColor = parsedNode.color ? (TAG_COLORS[parsedNode.color as TagColor] ?? C.red) : C.red;
                return (
                  <View key={req.id} style={{ backgroundColor: C.surfaceAlt, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border, borderLeftWidth: 3, borderLeftColor: nodeColor }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: nodeColor, marginRight: 8 }} />
                      <NodeTypeIcon type={parsedNode.type ?? 'note'} size={14} />
                      <Text style={{ color: C.text, fontSize: 14, fontWeight: '800', marginLeft: 6, flex: 1 }} numberOfLines={1}>{req.nodeTitle}</Text>
                    </View>
                    <Text style={{ color: C.muted, fontSize: 13, marginBottom: 12 }}>Participant is requesting this node</Text>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); approveMutation.mutate({ reqId: req.id }); }} style={({ pressed }) => ({ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: pressed ? 'rgba(34,197,94,0.25)' : 'rgba(34,197,94,0.12)', borderRadius: 10, paddingVertical: 11, borderWidth: 1, borderColor: 'rgba(34,197,94,0.35)' })}>
                        <Check size={16} color={C.green} strokeWidth={2.5} />
                        <Text style={{ color: C.green, fontSize: 13, fontWeight: '800' }}>Approve</Text>
                      </Pressable>
                      <Pressable onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)} style={({ pressed }) => ({ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: pressed ? 'rgba(196,30,58,0.25)' : 'rgba(196,30,58,0.1)', borderRadius: 10, paddingVertical: 11, borderWidth: 1, borderColor: 'rgba(196,30,58,0.3)' })}>
                        <X size={16} color={C.red} strokeWidth={2.5} />
                        <Text style={{ color: C.red, fontSize: 13, fontWeight: '800' }}>Decline</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
              {(dataRequests ?? []).filter((r) => r.status === 'pending').length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                  <Download size={30} color={C.border} strokeWidth={1.5} />
                  <Text style={{ color: C.muted, fontSize: 13, marginTop: 10 }}>No pending requests</Text>
                </View>
              ) : null}
            </ScrollView>
          </Animated.View>
        ) : null}

        {/* CONTROL BAR */}
        <View style={{ backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12, paddingBottom: 4, paddingHorizontal: 12 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4 }}>
            <CtrlBtn
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMicMuted((v) => !v); }}
              icon={micMuted ? <MicOff size={22} color={C.red} strokeWidth={2} /> : <Mic size={22} color={C.text} strokeWidth={2} />}
              label={micMuted ? 'Unmute' : 'Mute'}
              active={micMuted}
              danger={micMuted}
            />
            <CtrlBtn
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCamOff((v) => !v); }}
              icon={camOff ? <VideoOff size={22} color={C.red} strokeWidth={2} /> : <Video size={22} color={C.text} strokeWidth={2} />}
              label={camOff ? 'Start Cam' : 'Camera'}
              active={camOff}
              danger={camOff}
            />
            <CtrlBtn
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setBoardSharing((v) => !v); }}
              icon={<Monitor size={22} color={boardSharing ? C.pin : C.text} strokeWidth={2} />}
              label="Board"
              active={boardSharing}
            />
            <CtrlBtn
              onPress={() => togglePanel('chat')}
              icon={<MessageSquare size={22} color={activePanel === 'chat' ? C.pin : C.text} strokeWidth={2} />}
              label="Chat"
              active={activePanel === 'chat'}
              badge={unreadChat}
            />
            <CtrlBtn
              onPress={() => togglePanel('notes')}
              icon={<FileText size={22} color={activePanel === 'notes' ? C.pin : C.text} strokeWidth={2} />}
              label="Notes"
              active={activePanel === 'notes'}
            />
            <CtrlBtn
              onPress={() => togglePanel('participants')}
              icon={<Users size={22} color={activePanel === 'participants' ? C.pin : C.text} strokeWidth={2} />}
              label="People"
              active={activePanel === 'participants'}
            />
            {roomInfo?.isOwner ? (
              <CtrlBtn
                onPress={() => togglePanel('requests')}
                icon={<Download size={22} color={activePanel === 'requests' ? C.pin : C.text} strokeWidth={2} />}
                label="Requests"
                active={activePanel === 'requests'}
                badge={requestsBadge}
              />
            ) : null}
            <CtrlBtn
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                Alert.alert(
                  roomInfo?.isOwner ? 'End War Room?' : 'Leave War Room?',
                  roomInfo?.isOwner ? 'This will end the session for all participants.' : 'You will leave the video call.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: roomInfo?.isOwner ? 'End Session' : 'Leave', style: 'destructive', onPress: () => { if (roomInfo?.isOwner) { endRoomMutation.mutate(); } else { router.back(); } } },
                  ]
                );
              }}
              icon={roomInfo?.isOwner ? <PhoneOff size={22} color={C.red} strokeWidth={2} /> : <LogOut size={22} color={C.red} strokeWidth={2} />}
              label={roomInfo?.isOwner ? 'End' : 'Leave'}
              danger
            />
          </ScrollView>
        </View>
      </SafeAreaView>
    </View>
  );
}
