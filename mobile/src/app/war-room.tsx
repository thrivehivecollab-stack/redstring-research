import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
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
  Radio,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  FadeOut,
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
import type { CanvasNode, TagColor } from '@/lib/types';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const C = {
  bg: '#1A1614',
  surface: '#231F1C',
  surfaceAlt: '#2A2522',
  red: '#C41E3A',
  pin: '#D4A574',
  text: '#E8DCC8',
  muted: '#6B5B4F',
  border: '#3D332C',
  green: '#22C55E',
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

function NodeTypeIcon({ type }: { type: string }) {
  const color = C.muted;
  const size = 12;
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

  // Room state
  const [roomInfo, setRoomInfo] = useState<WarRoom | null>(null);
  const [meetingToken, setMeetingToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Controls
  const [micMuted, setMicMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [boardSharing, setBoardSharing] = useState(false);
  const [activePanel, setActivePanel] = useState<Panel>('none');

  // Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [unreadChat, setUnreadChat] = useState(0);
  const chatScrollRef = useRef<ScrollView>(null);

  // Notes
  const [noteText, setNoteText] = useState('');

  // Board pan/zoom (simplified read-only)
  const boardOffsetX = useSharedValue(0);
  const boardOffsetY = useSharedValue(0);
  const boardScale = useSharedValue(0.6);

  // Requests badge
  const [requestsBadge, setRequestsBadge] = useState(0);

  // WebView ref for Daily iframe
  const webviewRef = useRef<WebView>(null);

  // Initialize room
  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const warRoomId = params.warRoomId;
        if (!warRoomId) {
          setError('No war room specified.');
          setIsLoading(false);
          return;
        }
        const room = await api.get<WarRoom>(`/api/warroom/rooms/${warRoomId}`);
        if (!room) {
          setError('Room not found.');
          setIsLoading(false);
          return;
        }
        setRoomInfo(room);

        const tokenData = await api.post<{ token: string }>(`/api/warroom/rooms/${warRoomId}/token`, {});
        setMeetingToken(tokenData?.token ?? null);
      } catch (e: any) {
        const msg = e?.message ?? 'Failed to load war room';
        if (msg.includes('DAILY_NOT_CONFIGURED')) {
          setError('War Room requires Daily.co setup — contact your admin');
        } else {
          setError(msg);
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, [params.warRoomId]);

  // Poll data requests for owner
  const { data: dataRequests } = useQuery({
    queryKey: ['war-room-requests', roomInfo?.id],
    queryFn: () => api.get<DataRequest[]>(`/api/warroom/rooms/${roomInfo!.id}/data-requests`),
    enabled: !!roomInfo?.isOwner && !!roomInfo?.id,
    refetchInterval: 5000,
  });

  useEffect(() => {
    const pending = (dataRequests ?? []).filter((r) => r.status === 'pending').length;
    setRequestsBadge(pending);
  }, [dataRequests]);

  const approveMutation = useMutation({
    mutationFn: ({ reqId }: { reqId: string }) =>
      api.post<{ id: string; status: string; nodeSnapshot: string; requesterId: string }>(
        `/api/warroom/rooms/${roomInfo!.id}/data-request/${reqId}/approve`,
        {}
      ),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['war-room-requests', roomInfo?.id] });
      // Simulate sending approval via chat message (in real app would use Daily sendAppMessage)
      const approvedMsg: ChatMessage = {
        id: Date.now().toString(),
        senderName: 'System',
        participantId: 'system',
        type: 'system',
        text: `Node request approved`,
        timestamp: Date.now(),
      };
      setChatMessages((prev) => [...prev, approvedMsg]);
    },
  });

  const requestNodeMutation = useMutation({
    mutationFn: ({ nodeId, nodeTitle, nodeSnapshot }: { nodeId: string; nodeTitle: string; nodeSnapshot: string }) =>
      api.post(`/api/warroom/rooms/${roomInfo!.id}/data-request`, { nodeId, nodeTitle, nodeSnapshot }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const msg: ChatMessage = {
        id: Date.now().toString(),
        senderName: 'System',
        participantId: 'system',
        type: 'system',
        text: 'Node request sent to room owner',
        timestamp: Date.now(),
      };
      setChatMessages((prev) => [...prev, msg]);
    },
  });

  const endRoomMutation = useMutation({
    mutationFn: () => api.post(`/api/warroom/rooms/${roomInfo!.id}/end`, {}),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    },
  });

  // Handle WebView messages from Daily iframe
  const handleWebViewMessage = useCallback((event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'chat') {
        const chatMsg: ChatMessage = {
          id: Date.now().toString() + Math.random(),
          senderName: msg.senderName ?? 'Unknown',
          participantId: msg.participantId ?? '',
          type: 'chat',
          text: msg.text,
          timestamp: msg.timestamp ?? Date.now(),
        };
        setChatMessages((prev) => [...prev, chatMsg]);
        if (activePanel !== 'chat') setUnreadChat((n) => n + 1);
      } else if (msg.type === 'file') {
        const fileMsg: ChatMessage = {
          id: Date.now().toString() + Math.random(),
          senderName: msg.senderName ?? 'Unknown',
          participantId: msg.participantId ?? '',
          type: 'file',
          fileName: msg.fileName,
          fileData: msg.data,
          mimeType: msg.mimeType,
          timestamp: Date.now(),
        };
        setChatMessages((prev) => [...prev, fileMsg]);
        if (activePanel !== 'chat') setUnreadChat((n) => n + 1);
      }
    } catch {}
  }, [activePanel]);

  const sendChatMessage = useCallback(() => {
    if (!chatInput.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const userName = sessionData?.user?.name ?? 'You';
    const msg: ChatMessage = {
      id: Date.now().toString(),
      senderName: userName,
      participantId: sessionData?.user?.id ?? 'local',
      type: 'chat',
      text: chatInput.trim(),
      timestamp: Date.now(),
    };
    setChatMessages((prev) => [...prev, msg]);
    // Inject into Daily webview
    webviewRef.current?.injectJavaScript(`
      if (window.daily) {
        window.daily.sendAppMessage({
          type: 'chat',
          text: ${JSON.stringify(chatInput.trim())},
          senderName: ${JSON.stringify(userName)},
          participantId: ${JSON.stringify(sessionData?.user?.id ?? 'local')},
          timestamp: ${Date.now()}
        }, '*');
      }
    `);
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
      const fileMsg: ChatMessage = {
        id: Date.now().toString(),
        senderName: userName,
        participantId: sessionData?.user?.id ?? 'local',
        type: 'file',
        fileName: asset.name,
        fileData: base64,
        mimeType: asset.mimeType ?? 'application/octet-stream',
        timestamp: Date.now(),
      };
      setChatMessages((prev) => [...prev, fileMsg]);
      webviewRef.current?.injectJavaScript(`
        if (window.daily) {
          window.daily.sendAppMessage({
            type: 'file',
            senderName: ${JSON.stringify(userName)},
            participantId: ${JSON.stringify(sessionData?.user?.id ?? 'local')},
            data: ${JSON.stringify(base64)},
            fileName: ${JSON.stringify(asset.name)},
            mimeType: ${JSON.stringify(asset.mimeType ?? 'application/octet-stream')}
          }, '*');
        }
      `);
    } catch {}
  }, [sessionData]);

  const downloadFile = useCallback(async (msg: ChatMessage) => {
    if (!msg.fileData || !msg.fileName) return;
    try {
      const fileUri = `${FileSystem.documentDirectory}${msg.fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, msg.fileData, { encoding: FileSystem.EncodingType.Base64 });
      Alert.alert('Saved', `${msg.fileName} saved to documents`);
    } catch {
      Alert.alert('Error', 'Failed to save file');
    }
  }, []);

  const shareNote = useCallback(() => {
    if (!noteText.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const userName = sessionData?.user?.name ?? 'You';
    const msg: ChatMessage = {
      id: Date.now().toString(),
      senderName: userName,
      participantId: sessionData?.user?.id ?? 'local',
      type: 'chat',
      text: `📋 Note: ${noteText.trim()}`,
      timestamp: Date.now(),
    };
    setChatMessages((prev) => [...prev, msg]);
    setActivePanel('chat');
  }, [noteText, sessionData]);

  const togglePanel = useCallback((panel: Panel) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActivePanel((prev) => (prev === panel ? 'none' : panel));
    if (panel === 'chat') setUnreadChat(0);
  }, []);

  // Build the Daily.co iframe HTML
  const buildDailyHtml = useCallback(() => {
    if (!roomInfo?.dailyRoomUrl || !meetingToken) return null;
    const url = `${roomInfo.dailyRoomUrl}?t=${meetingToken}`;
    return `<!DOCTYPE html>
<html style="margin:0;padding:0;background:#1A1614;height:100%;">
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { background:#1A1614; height:100%; overflow:hidden; }
iframe { width:100%; height:100%; border:none; }
</style>
</head>
<body>
<iframe
  id="daily-frame"
  src="${url}"
  allow="camera; microphone; fullscreen; display-capture; autoplay"
  allowfullscreen
></iframe>
<script>
// Listen for app messages from Daily iframe
window.addEventListener('message', function(e) {
  try {
    var d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
    if (d && (d.type === 'chat' || d.type === 'file')) {
      window.ReactNativeWebView.postMessage(JSON.stringify(d));
    }
  } catch(err) {}
});
// Expose daily helper
window.daily = {
  sendAppMessage: function(msg, to) {
    document.getElementById('daily-frame').contentWindow.postMessage(
      JSON.stringify({ action: 'send-app-message', data: msg }), '*'
    );
  }
};
</script>
</body>
</html>`;
  }, [roomInfo, meetingToken]);

  const boardAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: boardOffsetX.value },
      { translateY: boardOffsetY.value },
      { scale: boardScale.value },
    ],
  }));

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.red} size="large" />
        <Text style={{ color: C.muted, marginTop: 16, fontSize: 14 }}>Connecting to War Room...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
            <Pressable onPress={() => router.back()} style={({ pressed }) => ({ width: 36, height: 36, borderRadius: 18, backgroundColor: pressed ? C.border : C.surface, alignItems: 'center', justifyContent: 'center', marginRight: 12 })}>
              <ArrowLeft size={18} color={C.text} strokeWidth={2} />
            </Pressable>
            <Text style={{ color: C.text, fontSize: 17, fontWeight: '800' }}>War Room</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(196,30,58,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <Radio size={28} color={C.red} strokeWidth={2} />
            </View>
            <Text style={{ color: C.text, fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 12 }}>War Room Unavailable</Text>
            <Text style={{ color: C.muted, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>{error}</Text>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => ({ marginTop: 32, backgroundColor: pressed ? '#A3162E' : C.red, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32 })}
            >
              <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '700' }}>Go Back</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const dailyHtml = buildDailyHtml();

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* LAYER 1: Investigation board (read-only) */}
      <View style={{ position: 'absolute', inset: 0 }}>
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
                <View
                  key={str.id}
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: Math.min(x1, x2),
                    top: Math.min(y1, y2),
                    width: Math.abs(x2 - x1) || 1,
                    height: Math.abs(y2 - y1) || 1,
                    borderTopWidth: 1.5,
                    borderTopColor: str.color ?? C.red,
                    opacity: 0.5,
                  }}
                />
              );
            })}
            {/* Nodes */}
            {(activeInvestigation?.nodes ?? []).map((node) => {
              const color = node.color ? (TAG_COLORS[node.color] ?? C.red) : C.red;
              const isOwner = roomInfo?.isOwner ?? false;
              return (
                <View
                  key={node.id}
                  style={{
                    position: 'absolute',
                    left: node.position.x + 500,
                    top: node.position.y + 500,
                    width: 140,
                    backgroundColor: C.surface,
                    borderRadius: 10,
                    borderWidth: 1.5,
                    borderColor: color + '60',
                    borderLeftWidth: 3,
                    borderLeftColor: color,
                    padding: 8,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                    <NodeTypeIcon type={node.type} />
                    <Text style={{ color: C.muted, fontSize: 9, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', flex: 1 }} numberOfLines={1}>
                      {node.type}
                    </Text>
                  </View>
                  <Text style={{ color: C.text, fontSize: 11, fontWeight: '700', lineHeight: 14 }} numberOfLines={2}>
                    {node.title}
                  </Text>
                  {!isOwner ? (
                    <Pressable
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        requestNodeMutation.mutate({
                          nodeId: node.id,
                          nodeTitle: node.title,
                          nodeSnapshot: JSON.stringify(node),
                        });
                      }}
                      style={({ pressed }) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 3,
                        marginTop: 6,
                        backgroundColor: pressed ? 'rgba(212,165,116,0.2)' : 'rgba(212,165,116,0.1)',
                        borderRadius: 4,
                        paddingHorizontal: 6,
                        paddingVertical: 3,
                        alignSelf: 'flex-start',
                      })}
                    >
                      <Download size={10} color={C.pin} strokeWidth={2.5} />
                      <Text style={{ color: C.pin, fontSize: 9, fontWeight: '700' }}>Request</Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </Animated.View>

          {/* Board overlay label */}
          {!activeInvestigation?.nodes?.length ? (
            <View style={{ position: 'absolute', top: '40%', left: 0, right: 0, alignItems: 'center' }}>
              <Text style={{ color: C.border, fontSize: 13, fontWeight: '600' }}>No active investigation board</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* LAYER 2: Daily.co video call (floating top-right) */}
      {dailyHtml ? (
        <Animated.View
          entering={FadeIn.duration(600)}
          style={{
            position: 'absolute',
            top: 60,
            right: 16,
            width: 160,
            height: 120,
            borderRadius: 14,
            overflow: 'hidden',
            borderWidth: 1.5,
            borderColor: C.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.5,
            shadowRadius: 8,
            elevation: 12,
            zIndex: 10,
          }}
        >
          <WebView
            ref={webviewRef}
            source={{ html: dailyHtml }}
            style={{ flex: 1, backgroundColor: C.bg }}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            onMessage={handleWebViewMessage}
            javaScriptEnabled
            domStorageEnabled
            originWhitelist={['*']}
          />
          <View style={{ position: 'absolute', bottom: 6, left: 8 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.green }} />
          </View>
        </Animated.View>
      ) : null}

      {/* Safe area container for controls */}
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']} pointerEvents="box-none">
        {/* Header */}
        <View
          pointerEvents="box-none"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingTop: 4,
            paddingBottom: 8,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: pressed ? C.border : C.surface + 'CC',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: C.border,
            })}
          >
            <ArrowLeft size={16} color={C.text} strokeWidth={2} />
          </Pressable>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={{ color: C.text, fontSize: 14, fontWeight: '800', letterSpacing: 0.3 }} numberOfLines={1}>
              {roomInfo?.title ?? 'War Room'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.red }} />
              <Text style={{ color: C.muted, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 }}>LIVE</Text>
            </View>
          </View>
        </View>

        {/* Spacer to push controls to bottom */}
        <View style={{ flex: 1 }} pointerEvents="none" />

        {/* Panel overlays */}
        {activePanel === 'chat' ? (
          <Animated.View
            entering={SlideInDown.duration(300).springify()}
            exiting={SlideOutDown.duration(250)}
            style={{
              position: 'absolute',
              bottom: 80,
              left: 0,
              right: 0,
              height: SCREEN_H * 0.45,
              backgroundColor: C.surface + 'F5',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              borderTopWidth: 1,
              borderTopColor: C.border,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border }}>
              <MessageSquare size={15} color={C.pin} strokeWidth={2} />
              <Text style={{ color: C.text, fontSize: 14, fontWeight: '800', marginLeft: 8, flex: 1 }}>Chat</Text>
              <Pressable onPress={() => setActivePanel('none')}>
                <ChevronDown size={20} color={C.muted} strokeWidth={2} />
              </Pressable>
            </View>
            <ScrollView
              ref={chatScrollRef}
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 12, gap: 8 }}
              onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: false })}
            >
              {chatMessages.map((msg, idx) => {
                const colorIdx = Math.abs(msg.participantId.charCodeAt(0)) % PARTICIPANT_COLORS.length;
                const nameColor = msg.type === 'system' ? C.muted : PARTICIPANT_COLORS[colorIdx];
                const isMine = msg.participantId === (sessionData?.user?.id ?? 'local');
                return (
                  <View key={msg.id + idx} style={{ alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                    {msg.type === 'system' ? (
                      <Text style={{ color: C.muted, fontSize: 11, fontStyle: 'italic', alignSelf: 'center' }}>{msg.text}</Text>
                    ) : msg.type === 'file' ? (
                      <View style={{ backgroundColor: C.surfaceAlt, borderRadius: 10, padding: 10, maxWidth: SCREEN_W * 0.7 }}>
                        <Text style={{ color: nameColor, fontSize: 10, fontWeight: '700', marginBottom: 4 }}>{msg.senderName}</Text>
                        <Pressable
                          onPress={() => downloadFile(msg)}
                          style={({ pressed }) => ({
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            backgroundColor: pressed ? C.border : C.surface,
                            borderRadius: 8,
                            paddingHorizontal: 10,
                            paddingVertical: 8,
                          })}
                        >
                          <Download size={14} color={C.pin} strokeWidth={2} />
                          <Text style={{ color: C.text, fontSize: 12, fontWeight: '600', flex: 1 }} numberOfLines={1}>{msg.fileName}</Text>
                        </Pressable>
                        <Text style={{ color: C.muted, fontSize: 10, marginTop: 4 }}>{formatTime(msg.timestamp)}</Text>
                      </View>
                    ) : (
                      <View style={{ backgroundColor: isMine ? C.red + '30' : C.surfaceAlt, borderRadius: 10, padding: 10, maxWidth: SCREEN_W * 0.72, borderWidth: 1, borderColor: isMine ? C.red + '40' : C.border }}>
                        {!isMine ? <Text style={{ color: nameColor, fontSize: 10, fontWeight: '700', marginBottom: 3 }}>{msg.senderName}</Text> : null}
                        <Text style={{ color: C.text, fontSize: 13 }}>{msg.text}</Text>
                        <Text style={{ color: C.muted, fontSize: 10, marginTop: 3, textAlign: 'right' }}>{formatTime(msg.timestamp)}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
              {chatMessages.length === 0 ? (
                <Text style={{ color: C.muted, fontSize: 13, textAlign: 'center', marginTop: 20 }}>No messages yet</Text>
              ) : null}
            </ScrollView>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 8, borderTopWidth: 1, borderTopColor: C.border }}>
                <Pressable onPress={sendFileMessage} style={({ pressed }) => ({ width: 34, height: 34, borderRadius: 17, backgroundColor: pressed ? C.border : C.surfaceAlt, alignItems: 'center', justifyContent: 'center' })}>
                  <Paperclip size={15} color={C.muted} strokeWidth={2} />
                </Pressable>
                <TextInput
                  value={chatInput}
                  onChangeText={setChatInput}
                  placeholder="Message..."
                  placeholderTextColor={C.muted}
                  style={{ flex: 1, backgroundColor: C.surfaceAlt, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, color: C.text, fontSize: 14, borderWidth: 1, borderColor: C.border }}
                  onSubmitEditing={sendChatMessage}
                  returnKeyType="send"
                />
                <Pressable
                  onPress={sendChatMessage}
                  style={({ pressed }) => ({ width: 34, height: 34, borderRadius: 17, backgroundColor: chatInput.trim() ? (pressed ? '#A3162E' : C.red) : C.surfaceAlt, alignItems: 'center', justifyContent: 'center' })}
                >
                  <Send size={15} color={chatInput.trim() ? '#FFF' : C.muted} strokeWidth={2.5} />
                </Pressable>
              </View>
            </KeyboardAvoidingView>
          </Animated.View>
        ) : null}

        {activePanel === 'notes' ? (
          <Animated.View
            entering={SlideInDown.duration(300).springify()}
            exiting={SlideOutDown.duration(250)}
            style={{
              position: 'absolute',
              bottom: 80,
              left: 0,
              right: 0,
              height: SCREEN_H * 0.28,
              backgroundColor: C.surface + 'F5',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              borderTopWidth: 1,
              borderTopColor: C.border,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border }}>
              <FileText size={15} color={C.pin} strokeWidth={2} />
              <Text style={{ color: C.text, fontSize: 14, fontWeight: '800', marginLeft: 8, flex: 1 }}>Private Scratchpad</Text>
              <Pressable
                onPress={shareNote}
                style={({ pressed }) => ({ backgroundColor: pressed ? '#A3162E' : C.red, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, marginRight: 8 })}
              >
                <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>Share Note</Text>
              </Pressable>
              <Pressable onPress={() => setActivePanel('none')}>
                <ChevronDown size={20} color={C.muted} strokeWidth={2} />
              </Pressable>
            </View>
            <Text style={{ color: C.muted, fontSize: 10, paddingHorizontal: 16, paddingTop: 8, fontStyle: 'italic' }}>
              Private — only you can see this
            </Text>
            <TextInput
              value={noteText}
              onChangeText={setNoteText}
              placeholder="Write your private notes..."
              placeholderTextColor={C.muted}
              multiline
              style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 8, color: C.text, fontSize: 14, textAlignVertical: 'top' }}
            />
          </Animated.View>
        ) : null}

        {activePanel === 'participants' ? (
          <Animated.View
            entering={SlideInRight.duration(300).springify()}
            exiting={SlideOutRight.duration(250)}
            style={{
              position: 'absolute',
              top: 0,
              bottom: 80,
              right: 0,
              width: SCREEN_W * 0.65,
              backgroundColor: C.surface + 'F5',
              borderLeftWidth: 1,
              borderLeftColor: C.border,
            }}
          >
            <SafeAreaView edges={['top']} style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border }}>
                <Users size={15} color={C.pin} strokeWidth={2} />
                <Text style={{ color: C.text, fontSize: 14, fontWeight: '800', marginLeft: 8, flex: 1 }}>Participants</Text>
                <Pressable onPress={() => setActivePanel('none')}>
                  <X size={18} color={C.muted} strokeWidth={2} />
                </Pressable>
              </View>
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12 }}>
                {/* Owner row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.surfaceAlt, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: C.border }}>
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(196,30,58,0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                    <Text style={{ color: C.red, fontSize: 13, fontWeight: '800' }}>
                      {(sessionData?.user?.name ?? '?')[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.text, fontSize: 13, fontWeight: '700' }}>
                      {sessionData?.user?.name ?? 'You'}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: micMuted ? C.red : C.green }} />
                      <Text style={{ color: C.muted, fontSize: 10 }}>{micMuted ? 'Muted' : 'Live'}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {micMuted ? <MicOff size={14} color={C.red} strokeWidth={2} /> : <Mic size={14} color={C.green} strokeWidth={2} />}
                    {camOff ? <VideoOff size={14} color={C.red} strokeWidth={2} /> : <Video size={14} color={C.green} strokeWidth={2} />}
                  </View>
                </View>
                <Text style={{ color: C.muted, fontSize: 11, textAlign: 'center', marginTop: 8 }}>
                  Other participants visible in the video feed
                </Text>
              </ScrollView>
            </SafeAreaView>
          </Animated.View>
        ) : null}

        {activePanel === 'requests' && roomInfo?.isOwner ? (
          <Animated.View
            entering={SlideInDown.duration(300).springify()}
            exiting={SlideOutDown.duration(250)}
            style={{
              position: 'absolute',
              bottom: 80,
              left: 0,
              right: 0,
              height: SCREEN_H * 0.5,
              backgroundColor: C.surface + 'F5',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              borderTopWidth: 1,
              borderTopColor: C.border,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border }}>
              <Download size={15} color={C.pin} strokeWidth={2} />
              <Text style={{ color: C.text, fontSize: 14, fontWeight: '800', marginLeft: 8, flex: 1 }}>Data Requests</Text>
              <Pressable onPress={() => setActivePanel('none')}>
                <ChevronDown size={20} color={C.muted} strokeWidth={2} />
              </Pressable>
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12, gap: 10 }}>
              {(dataRequests ?? []).filter((r) => r.status === 'pending').map((req) => {
                let parsedNode: any = {};
                try { parsedNode = JSON.parse(req.nodeSnapshot); } catch {}
                const nodeColor = parsedNode.color ? (TAG_COLORS[parsedNode.color as TagColor] ?? C.red) : C.red;
                return (
                  <View key={req.id} style={{ backgroundColor: C.surfaceAlt, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.border }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: nodeColor, marginRight: 8 }} />
                      <NodeTypeIcon type={parsedNode.type ?? 'note'} />
                      <Text style={{ color: C.text, fontSize: 13, fontWeight: '700', marginLeft: 6, flex: 1 }} numberOfLines={1}>
                        {req.nodeTitle}
                      </Text>
                    </View>
                    <Text style={{ color: C.muted, fontSize: 11, marginBottom: 10 }}>
                      Requested by participant
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Pressable
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          approveMutation.mutate({ reqId: req.id });
                        }}
                        style={({ pressed }) => ({ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: pressed ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.1)', borderRadius: 8, paddingVertical: 9, borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)' })}
                      >
                        <Check size={14} color={C.green} strokeWidth={2.5} />
                        <Text style={{ color: C.green, fontSize: 12, fontWeight: '700' }}>Approve</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        style={({ pressed }) => ({ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: pressed ? 'rgba(196,30,58,0.2)' : 'rgba(196,30,58,0.08)', borderRadius: 8, paddingVertical: 9, borderWidth: 1, borderColor: 'rgba(196,30,58,0.25)' })}
                      >
                        <X size={14} color={C.red} strokeWidth={2.5} />
                        <Text style={{ color: C.red, fontSize: 12, fontWeight: '700' }}>Decline</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
              {(dataRequests ?? []).filter((r) => r.status === 'pending').length === 0 ? (
                <Text style={{ color: C.muted, fontSize: 13, textAlign: 'center', marginTop: 24 }}>No pending requests</Text>
              ) : null}
            </ScrollView>
          </Animated.View>
        ) : null}

        {/* Control bar */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-around',
            paddingHorizontal: 8,
            paddingVertical: 10,
            paddingBottom: 4,
            backgroundColor: C.surface + 'EE',
            borderTopWidth: 1,
            borderTopColor: C.border,
          }}
        >
          {/* Mic */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setMicMuted((v) => !v);
              webviewRef.current?.injectJavaScript(`
                if(window.daily && window.daily.setLocalAudio) window.daily.setLocalAudio(${micMuted});
              `);
            }}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: micMuted ? 'rgba(196,30,58,0.2)' : (pressed ? C.border : C.surfaceAlt),
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: micMuted ? 'rgba(196,30,58,0.4)' : C.border,
            })}
          >
            {micMuted ? <MicOff size={18} color={C.red} strokeWidth={2} /> : <Mic size={18} color={C.text} strokeWidth={2} />}
          </Pressable>

          {/* Camera */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setCamOff((v) => !v);
              webviewRef.current?.injectJavaScript(`
                if(window.daily && window.daily.setLocalVideo) window.daily.setLocalVideo(${camOff});
              `);
            }}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: camOff ? 'rgba(196,30,58,0.2)' : (pressed ? C.border : C.surfaceAlt),
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: camOff ? 'rgba(196,30,58,0.4)' : C.border,
            })}
          >
            {camOff ? <VideoOff size={18} color={C.red} strokeWidth={2} /> : <Video size={18} color={C.text} strokeWidth={2} />}
          </Pressable>

          {/* Share board */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setBoardSharing((v) => !v);
            }}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: boardSharing ? 'rgba(212,165,116,0.2)' : (pressed ? C.border : C.surfaceAlt),
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: boardSharing ? 'rgba(212,165,116,0.4)' : C.border,
            })}
          >
            <Monitor size={18} color={boardSharing ? C.pin : C.text} strokeWidth={2} />
          </Pressable>

          {/* Chat */}
          <Pressable
            onPress={() => togglePanel('chat')}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: activePanel === 'chat' ? 'rgba(212,165,116,0.2)' : (pressed ? C.border : C.surfaceAlt),
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: activePanel === 'chat' ? 'rgba(212,165,116,0.4)' : C.border,
            })}
          >
            <MessageSquare size={18} color={activePanel === 'chat' ? C.pin : C.text} strokeWidth={2} />
            {unreadChat > 0 ? (
              <View style={{ position: 'absolute', top: 4, right: 4, width: 16, height: 16, borderRadius: 8, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#FFF', fontSize: 9, fontWeight: '800' }}>{unreadChat}</Text>
              </View>
            ) : null}
          </Pressable>

          {/* Notes */}
          <Pressable
            onPress={() => togglePanel('notes')}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: activePanel === 'notes' ? 'rgba(212,165,116,0.2)' : (pressed ? C.border : C.surfaceAlt),
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: activePanel === 'notes' ? 'rgba(212,165,116,0.4)' : C.border,
            })}
          >
            <FileText size={18} color={activePanel === 'notes' ? C.pin : C.text} strokeWidth={2} />
          </Pressable>

          {/* Participants */}
          <Pressable
            onPress={() => togglePanel('participants')}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: activePanel === 'participants' ? 'rgba(212,165,116,0.2)' : (pressed ? C.border : C.surfaceAlt),
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: activePanel === 'participants' ? 'rgba(212,165,116,0.4)' : C.border,
            })}
          >
            <Users size={18} color={activePanel === 'participants' ? C.pin : C.text} strokeWidth={2} />
          </Pressable>

          {/* Requests (owner only) */}
          {roomInfo?.isOwner ? (
            <Pressable
              onPress={() => togglePanel('requests')}
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: activePanel === 'requests' ? 'rgba(212,165,116,0.2)' : (pressed ? C.border : C.surfaceAlt),
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: activePanel === 'requests' ? 'rgba(212,165,116,0.4)' : C.border,
              })}
            >
              <Download size={18} color={activePanel === 'requests' ? C.pin : C.text} strokeWidth={2} />
              {requestsBadge > 0 ? (
                <View style={{ position: 'absolute', top: 4, right: 4, width: 16, height: 16, borderRadius: 8, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#FFF', fontSize: 9, fontWeight: '800' }}>{requestsBadge}</Text>
                </View>
              ) : null}
            </Pressable>
          ) : null}

          {/* End / Leave */}
          <Pressable
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              Alert.alert(
                roomInfo?.isOwner ? 'End War Room?' : 'Leave War Room?',
                roomInfo?.isOwner
                  ? 'This will end the session for all participants.'
                  : 'You will leave the video call.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: roomInfo?.isOwner ? 'End Session' : 'Leave',
                    style: 'destructive',
                    onPress: () => {
                      if (roomInfo?.isOwner) {
                        endRoomMutation.mutate();
                      } else {
                        router.back();
                      }
                    },
                  },
                ]
              );
            }}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: pressed ? 'rgba(196,30,58,0.3)' : 'rgba(196,30,58,0.15)',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: 'rgba(196,30,58,0.4)',
            })}
          >
            {roomInfo?.isOwner
              ? <PhoneOff size={18} color={C.red} strokeWidth={2} />
              : <LogOut size={18} color={C.red} strokeWidth={2} />
            }
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
