import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Linking,
  Share,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Inbox,
  Mail,
  MailOpen,
  Search,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronRight,
  Send,
  Share2,
  Brain,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  MapPin,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/api';
import { useSession } from '@/lib/auth/use-session';
import type { Tip, TipStatus, TipMessage } from '@/lib/types';
import useInvestigationStore from '@/lib/state/investigation-store';

const C = {
  bg: '#1A1614',
  surface: '#231F1C',
  surfaceAlt: '#2A2522',
  card: '#F5ECD7',
  red: '#C41E3A',
  amber: '#D4A574',
  text: '#E8DCC8',
  muted: '#6B5B4F',
  border: '#3D332C',
  green: '#22C55E',
  blue: '#3B82F6',
} as const;

type FilterTab = 'all' | TipStatus;

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'investigating', label: 'Investigating' },
  { id: 'verified', label: 'Verified' },
  { id: 'dismissed', label: 'Dismissed' },
];

function statusAccentColor(status: TipStatus): string {
  switch (status) {
    case 'unread': return C.red;
    case 'investigating': return C.amber;
    case 'verified': return C.green;
    case 'dismissed': return C.muted;
  }
}

function statusLabel(status: TipStatus): string {
  switch (status) {
    case 'unread': return 'UNREAD';
    case 'investigating': return 'INVESTIGATING';
    case 'verified': return 'VERIFIED';
    case 'dismissed': return 'DISMISSED';
  }
}

function credibilityColor(score: number): string {
  if (score < 40) return C.red;
  if (score < 70) return C.amber;
  return C.green;
}

function timeAgo(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function SafeJsonParse(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // ignore
    }
  }
  return [];
}

// ---- Tip card ----
function TipCard({
  tip,
  index,
  onPress,
}: {
  tip: Tip;
  index: number;
  onPress: () => void;
}) {
  const accentColor = statusAccentColor(tip.status);
  const isUnread = tip.status === 'unread';
  const score = tip.vetting?.score;

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(300)}>
      <Pressable
        testID={`tip-card-${tip.id}`}
        onPress={onPress}
        style={({ pressed }) => ({
          marginHorizontal: 16,
          marginBottom: 10,
          backgroundColor: pressed ? C.surfaceAlt : C.surface,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: C.border,
          flexDirection: 'row',
          overflow: 'hidden',
          opacity: pressed ? 0.95 : 1,
        })}
      >
        {/* Accent bar */}
        <View style={{ width: 4, backgroundColor: accentColor }} />

        {/* Content */}
        <View style={{ flex: 1, padding: 18 }}>
          {/* Top row */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            {isUnread ? (
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: C.red,
                  marginTop: 5,
                  flexShrink: 0,
                }}
              />
            ) : null}
            <Text
              style={{
                flex: 1,
                color: C.text,
                fontSize: 17,
                fontWeight: '800',
                lineHeight: 20,
              }}
              numberOfLines={1}
            >
              {tip.subject}
            </Text>
            <Text style={{ color: C.muted, fontSize: 11 }}>{timeAgo(tip.submittedAt)}</Text>
          </View>

          {/* Identity row */}
          <Text style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>
            {tip.isAnonymous
              ? 'Anonymous'
              : tip.tipperHandle
              ? `@${tip.tipperHandle}`
              : tip.tipperName ?? 'Unknown'}
          </Text>

          {/* Credibility bar */}
          {score != null ? (
            <View style={{ marginTop: 8 }}>
              <View
                style={{
                  height: 3,
                  borderRadius: 2,
                  backgroundColor: C.border,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    width: `${score}%`,
                    height: '100%',
                    backgroundColor: credibilityColor(score),
                    borderRadius: 2,
                  }}
                />
              </View>
              <Text style={{ color: C.muted, fontSize: 10, marginTop: 2 }}>
                AI Credibility: {score}/100
              </Text>
            </View>
          ) : null}

          {/* Status badge */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <View
              style={{
                backgroundColor: accentColor + '22',
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderWidth: 1,
                borderColor: accentColor + '44',
              }}
            >
              <Text style={{ color: accentColor, fontSize: 13, fontWeight: '800', letterSpacing: 0.5 }}>
                {statusLabel(tip.status)}
              </Text>
            </View>
            <ChevronRight size={14} color={C.muted} strokeWidth={2} />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ---- AI Vetting section ----
function AIVettingSection({ vetting }: { vetting: NonNullable<Tip['vetting']> }) {
  const scoreColor = credibilityColor(vetting.score);
  const keyFindings = SafeJsonParse(vetting.keyFindings);
  const redFlags = SafeJsonParse(vetting.redFlags);
  const strengths = SafeJsonParse(vetting.strengths);
  const followUp = SafeJsonParse(vetting.followUpQuestions);

  return (
    <View
      style={{
        backgroundColor: C.surfaceAlt,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: C.border,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Brain size={16} color={C.amber} strokeWidth={2} />
        <Text style={{ color: C.amber, fontSize: 12, fontWeight: '800', letterSpacing: 1 }}>
          AI VETTING REPORT
        </Text>
      </View>

      {/* Big score */}
      <View style={{ alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ color: scoreColor, fontSize: 48, fontWeight: '900', lineHeight: 52 }}>
          {vetting.score}
        </Text>
        <Text style={{ color: C.muted, fontSize: 12 }}>Credibility Score / 100</Text>
        <View
          style={{
            width: '80%',
            height: 6,
            backgroundColor: C.border,
            borderRadius: 3,
            marginTop: 8,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: `${vetting.score}%`,
              height: '100%',
              backgroundColor: scoreColor,
              borderRadius: 3,
            }}
          />
        </View>
      </View>

      {/* Summary */}
      {vetting.summary ? (
        <Text style={{ color: C.text, fontSize: 13, lineHeight: 20, marginBottom: 12 }}>
          {vetting.summary}
        </Text>
      ) : null}

      {/* Key Findings */}
      {keyFindings.length > 0 ? (
        <View style={{ marginBottom: 10 }}>
          <Text style={{ color: C.amber, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6 }}>
            KEY FINDINGS
          </Text>
          {keyFindings.map((item, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
              <Text style={{ color: C.amber, fontSize: 13 }}>•</Text>
              <Text style={{ color: C.text, fontSize: 12, flex: 1, lineHeight: 18 }}>{item}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Red Flags */}
      {redFlags.length > 0 ? (
        <View style={{ marginBottom: 10 }}>
          <Text style={{ color: C.red, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6 }}>
            RED FLAGS
          </Text>
          {redFlags.map((item, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
              <AlertTriangle size={12} color={C.red} strokeWidth={2} style={{ marginTop: 2 }} />
              <Text style={{ color: C.text, fontSize: 12, flex: 1, lineHeight: 18 }}>{item}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Strengths */}
      {strengths.length > 0 ? (
        <View style={{ marginBottom: 10 }}>
          <Text style={{ color: C.green, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6 }}>
            STRENGTHS
          </Text>
          {strengths.map((item, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
              <CheckCircle size={12} color={C.green} strokeWidth={2} style={{ marginTop: 2 }} />
              <Text style={{ color: C.text, fontSize: 12, flex: 1, lineHeight: 18 }}>{item}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Follow-up questions */}
      {followUp.length > 0 ? (
        <View>
          <Text style={{ color: C.blue, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6 }}>
            SUGGESTED FOLLOW-UP
          </Text>
          {followUp.map((item, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
              <Text style={{ color: C.blue, fontSize: 13 }}>?</Text>
              <Text style={{ color: C.text, fontSize: 12, flex: 1, lineHeight: 18 }}>{item}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

// ---- Share tip link section ----
function ShareLinkSection({ userId }: { userId: string }) {
  const [expanded, setExpanded] = useState<boolean>(false);
  const tipLink = `${process.env.EXPO_PUBLIC_BACKEND_URL}/tip-submit?for=${userId}`;

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: tipLink,
        title: 'Submit a tip to my investigation',
      });
    } catch {
      // ignore
    }
  };

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 16,
        backgroundColor: C.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: C.border,
        overflow: 'hidden',
      }}
    >
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          padding: 14,
          backgroundColor: pressed ? C.surfaceAlt : 'transparent',
          gap: 10,
        })}
      >
        <Share2 size={16} color={C.amber} strokeWidth={2} />
        <Text style={{ flex: 1, color: C.text, fontSize: 14, fontWeight: '600' }}>
          Share Your Tip Link
        </Text>
        {expanded ? (
          <ChevronUp size={16} color={C.muted} strokeWidth={2} />
        ) : (
          <ChevronDown size={16} color={C.muted} strokeWidth={2} />
        )}
      </Pressable>

      {expanded ? (
        <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
          <Text style={{ color: C.muted, fontSize: 12, marginBottom: 10, lineHeight: 17 }}>
            Share this link so others can submit tips directly to you.
          </Text>
          <View
            style={{
              backgroundColor: C.bg,
              borderRadius: 8,
              padding: 10,
              marginBottom: 10,
              borderWidth: 1,
              borderColor: C.border,
            }}
          >
            <Text style={{ color: C.muted, fontSize: 11 }} numberOfLines={2} selectable>
              {tipLink}
            </Text>
          </View>
          <Pressable
            testID="share-tip-link-button"
            onPress={handleShare}
            style={({ pressed }) => ({
              backgroundColor: pressed ? '#A3162E' : C.red,
              borderRadius: 10,
              padding: 12,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
            })}
          >
            <Share2 size={14} color="#FFF" strokeWidth={2} />
            <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700' }}>Share Tip Link</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

// ---- Tip Detail View ----
function TipDetail({
  tip,
  onBack,
  onRefresh,
}: {
  tip: Tip;
  onBack: () => void;
  onRefresh: () => void;
}) {
  const queryClient = useQueryClient();
  const [replyText, setReplyText] = useState<string>('');
  const [messages, setMessages] = useState<TipMessage[]>(tip.messages ?? []);

  const addNode = useInvestigationStore((s) => s.addNode);
  const investigations = useInvestigationStore((s) => s.investigations);
  const activeInvestigationId = useInvestigationStore((s) => s.activeInvestigationId);

  const addToBoardMutation = useMutation({
    mutationFn: () => api.post<{ suggestedNode: any }>(`/api/tips/${tip.id}/merge`, {}),
    onSuccess: (result) => {
      if (!activeInvestigationId) {
        Alert.alert(
          'No Active Investigation',
          'Open an investigation on the board first, then come back to add this tip.',
          [{ text: 'OK' }]
        );
        return;
      }
      if (result?.suggestedNode && activeInvestigationId) {
        const n = result.suggestedNode;
        addNode(activeInvestigationId, n.type ?? 'note', n.title, { x: 120 + Math.random() * 200, y: 120 + Math.random() * 200 }, { content: n.content, tags: n.tags ?? [], color: 'amber' });
      }
      queryClient.invalidateQueries({ queryKey: ['tips'] });
      onRefresh();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const vetMutation = useMutation({
    mutationFn: () => api.post<Tip>(`/api/tips/${tip.id}/vet`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tips'] });
      onRefresh();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const dismissMutation = useMutation({
    mutationFn: () => api.patch<Tip>(`/api/tips/${tip.id}`, { status: 'dismissed' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tips'] });
      onRefresh();
      onBack();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    },
  });

  const sendReplyMutation = useMutation({
    mutationFn: (text: string) =>
      api.post<TipMessage>(`/api/tips/${tip.id}/messages`, { content: text }),
    onSuccess: (msg) => {
      if (msg) {
        setMessages((prev) => [...prev, msg]);
      }
      setReplyText('');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
  });

  const hasVetting = !!tip.vetting;
  const accentColor = statusAccentColor(tip.status);

  return (
    <View style={{ flex: 1 }}>
      {/* Sub-header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: C.border,
        }}
      >
        <Pressable
          testID="tip-detail-back"
          onPress={onBack}
          style={({ pressed }) => ({
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: pressed ? C.border : C.surface,
            alignItems: 'center',
            justifyContent: 'center',
          })}
        >
          <ArrowLeft size={18} color={C.text} strokeWidth={2} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.text, fontSize: 15, fontWeight: '700' }} numberOfLines={1}>
            {tip.subject}
          </Text>
          <Text style={{ color: C.muted, fontSize: 12 }}>
            {tip.isAnonymous
              ? 'Anonymous'
              : tip.tipperHandle
              ? `@${tip.tipperHandle}`
              : tip.tipperName ?? 'Unknown'}
            {' · '}
            {timeAgo(tip.submittedAt)}
          </Text>
        </View>
        <View
          style={{
            backgroundColor: accentColor + '22',
            borderRadius: 6,
            paddingHorizontal: 7,
            paddingVertical: 3,
            borderWidth: 1,
            borderColor: accentColor + '44',
          }}
        >
          <Text style={{ color: accentColor, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 }}>
            {statusLabel(tip.status)}
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Tip content */}
        <View
          style={{
            backgroundColor: C.surface,
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: C.border,
          }}
        >
          <Text style={{ color: C.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 }}>
            TIP CONTENT
          </Text>
          <Text style={{ color: C.text, fontSize: 14, lineHeight: 22 }}>{tip.content}</Text>
        </View>

        {/* Attachment URLs */}
        {tip.evidenceUrls && tip.evidenceUrls.length > 0 ? (
          <View
            style={{
              backgroundColor: C.surface,
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: C.border,
            }}
          >
            <Text style={{ color: C.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 }}>
              EVIDENCE LINKS
            </Text>
            {tip.evidenceUrls.map((url, i) => (
              <Pressable
                key={i}
                onPress={() => Linking.openURL(url)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingVertical: 8,
                  opacity: pressed ? 0.7 : 1,
                  borderBottomWidth: i < tip.evidenceUrls.length - 1 ? 1 : 0,
                  borderBottomColor: C.border,
                })}
              >
                <ExternalLink size={14} color={C.blue} strokeWidth={2} />
                <Text style={{ color: C.blue, fontSize: 13, flex: 1 }} numberOfLines={1}>
                  {url}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {/* AI Vetting Section */}
        {hasVetting && tip.vetting ? (
          <AIVettingSection vetting={tip.vetting} />
        ) : null}

        {/* Action Buttons */}
        <View style={{ gap: 10, marginBottom: 20 }}>
          {!hasVetting ? (
            <Pressable
              testID="vet-with-ai-button"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                vetMutation.mutate();
              }}
              disabled={vetMutation.isPending}
              style={({ pressed }) => ({
                backgroundColor: pressed ? '#7C3AED' : '#8B5CF6',
                borderRadius: 14,
                paddingVertical: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                opacity: vetMutation.isPending ? 0.7 : 1,
              })}
            >
              {vetMutation.isPending ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Brain size={16} color="#FFF" strokeWidth={2} />
              )}
              <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800' }}>
                {vetMutation.isPending ? 'Vetting...' : 'Vet with AI'}
              </Text>
            </Pressable>
          ) : null}

          <Pressable
            testID="add-to-board-button"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              addToBoardMutation.mutate();
            }}
            disabled={addToBoardMutation.isPending}
            style={({ pressed }) => ({
              backgroundColor: pressed ? '#A3162E' : '#D4A574',
              borderRadius: 14,
              paddingVertical: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              opacity: addToBoardMutation.isPending ? 0.7 : activeInvestigationId ? 1 : 0.5,
            })}
          >
            {addToBoardMutation.isPending ? (
              <ActivityIndicator color="#1A1614" size="small" />
            ) : (
              <MapPin size={16} color="#1A1614" strokeWidth={2} />
            )}
            <Text style={{ color: '#1A1614', fontSize: 15, fontWeight: '800' }}>
              {addToBoardMutation.isPending ? 'Adding…' : 'Add to Board'}
            </Text>
          </Pressable>

          <Pressable
            testID="dismiss-tip-button"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              dismissMutation.mutate();
            }}
            disabled={dismissMutation.isPending || tip.status === 'dismissed'}
            style={({ pressed }) => ({
              backgroundColor: 'transparent',
              borderRadius: 14,
              paddingVertical: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              borderWidth: 1,
              borderColor: pressed ? C.red : C.border,
              opacity: dismissMutation.isPending || tip.status === 'dismissed' ? 0.5 : 1,
            })}
          >
            <XCircle size={16} color={C.muted} strokeWidth={2} />
            <Text style={{ color: C.muted, fontSize: 15, fontWeight: '800' }}>
              {tip.status === 'dismissed' ? 'Dismissed' : 'Dismiss Tip'}
            </Text>
          </Pressable>
        </View>

        {/* Message Thread */}
        <View
          style={{
            backgroundColor: C.surface,
            borderRadius: 12,
            padding: 16,
            borderWidth: 1,
            borderColor: C.border,
          }}
        >
          <Text style={{ color: C.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 }}>
            MESSAGE THREAD
          </Text>

          {messages.length === 0 ? (
            <Text style={{ color: C.muted, fontSize: 13, textAlign: 'center', paddingVertical: 16 }}>
              No messages yet. Start a conversation with the tipper.
            </Text>
          ) : (
            messages.map((msg) => (
              <View
                key={msg.id}
                style={{
                  marginBottom: 10,
                  alignItems: ((msg as any).isFromInvestigator ?? msg.fromInvestigator) ? 'flex-end' : 'flex-start',
                }}
              >
                <View
                  style={{
                    maxWidth: '80%',
                    backgroundColor: ((msg as any).isFromInvestigator ?? msg.fromInvestigator) ? C.red : C.surfaceAlt,
                    borderRadius: 12,
                    padding: 10,
                    borderWidth: 1,
                    borderColor: ((msg as any).isFromInvestigator ?? msg.fromInvestigator) ? C.red : C.border,
                  }}
                >
                  <Text style={{ color: ((msg as any).isFromInvestigator ?? msg.fromInvestigator) ? '#FFF' : C.text, fontSize: 13, lineHeight: 18 }}>
                    {(msg as any).content ?? msg.text}
                  </Text>
                  <Text style={{ color: ((msg as any).isFromInvestigator ?? msg.fromInvestigator) ? 'rgba(255,255,255,0.6)' : C.muted, fontSize: 10, marginTop: 4 }}>
                    {timeAgo(msg.sentAt)}
                  </Text>
                </View>
              </View>
            ))
          )}

          {/* Reply input */}
          <View
            style={{
              flexDirection: 'row',
              gap: 8,
              marginTop: 12,
              borderTopWidth: 1,
              borderTopColor: C.border,
              paddingTop: 12,
            }}
          >
            <TextInput
              testID="reply-input"
              value={replyText}
              onChangeText={setReplyText}
              placeholder="Reply to tipper..."
              placeholderTextColor={C.muted}
              multiline
              style={{
                flex: 1,
                backgroundColor: C.bg,
                borderRadius: 10,
                padding: 10,
                color: C.text,
                fontSize: 13,
                borderWidth: 1,
                borderColor: C.border,
                maxHeight: 80,
              }}
            />
            <Pressable
              testID="send-reply-button"
              onPress={() => {
                if (!replyText.trim()) return;
                sendReplyMutation.mutate(replyText.trim());
              }}
              disabled={sendReplyMutation.isPending || !replyText.trim()}
              style={({ pressed }) => ({
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: replyText.trim() ? (pressed ? '#A3162E' : C.red) : C.border,
                alignItems: 'center',
                justifyContent: 'center',
                alignSelf: 'flex-end',
                opacity: sendReplyMutation.isPending ? 0.7 : 1,
              })}
            >
              {sendReplyMutation.isPending ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Send size={16} color={replyText.trim() ? '#FFF' : C.muted} strokeWidth={2} />
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ---- Main Screen ----
export default function TipInboxScreen() {
  const router = useRouter();
  const { data: session } = useSession();
  const userId = session?.user?.id ?? '';

  const [filter, setFilter] = useState<FilterTab>('all');
  const [selectedTip, setSelectedTip] = useState<Tip | null>(null);

  const { data: tips, isLoading, refetch, isRefetching } = useQuery<Tip[]>({
    queryKey: ['tips'],
    queryFn: () => api.get<Tip[]>('/api/tips'),
    enabled: !!userId,
  });

  const filteredTips = React.useMemo(() => {
    if (!tips) return [];
    if (filter === 'all') return tips;
    return tips.filter((t) => t.status === filter);
  }, [tips, filter]);

  const unreadCount = React.useMemo(
    () => (tips ?? []).filter((t) => t.status === 'unread').length,
    [tips]
  );

  const handleSelectTip = useCallback((tip: Tip) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTip(tip);
  }, []);

  const handleRefresh = useCallback(() => {
    refetch();
    if (selectedTip) {
      // Update selected tip from cache if refreshed
      const updatedTip = tips?.find((t) => t.id === selectedTip.id);
      if (updatedTip) setSelectedTip(updatedTip);
    }
  }, [refetch, selectedTip, tips]);

  const renderItem = useCallback(
    ({ item, index }: { item: Tip; index: number }) => (
      <TipCard tip={item} index={index} onPress={() => handleSelectTip(item)} />
    ),
    [handleSelectTip]
  );

  const keyExtractor = useCallback((item: Tip) => item.id, []);

  if (selectedTip) {
    // Find the latest version of this tip
    const liveTip = tips?.find((t) => t.id === selectedTip.id) ?? selectedTip;
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <TipDetail
            tip={liveTip}
            onBack={() => setSelectedTip(null)}
            onRefresh={handleRefresh}
          />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }} testID="tip-inbox-screen">
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: C.border,
            gap: 12,
          }}
        >
          <Pressable
            testID="tip-inbox-back"
            onPress={() => router.back()}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: pressed ? C.border : C.surface,
              alignItems: 'center',
              justifyContent: 'center',
            })}
          >
            <ArrowLeft size={18} color={C.text} strokeWidth={2} />
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text style={{ color: C.text, fontSize: 18, fontWeight: '900', letterSpacing: 2 }}>
              TIP INBOX
            </Text>
          </View>

          {unreadCount > 0 ? (
            <View
              style={{
                backgroundColor: C.red,
                borderRadius: 12,
                minWidth: 24,
                height: 24,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 6,
              }}
            >
              <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '800' }}>
                {unreadCount}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Filter tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
        >
          {FILTER_TABS.map((tab) => {
            const isActive = filter === tab.id;
            return (
              <Pressable
                key={tab.id}
                testID={`filter-tab-${tab.id}`}
                onPress={() => {
                  Haptics.selectionAsync();
                  setFilter(tab.id);
                }}
                style={{
                  backgroundColor: isActive ? C.red : C.surface,
                  borderRadius: 20,
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderWidth: 1,
                  borderColor: isActive ? C.red : C.border,
                }}
              >
                <Text
                  style={{
                    color: isActive ? '#FFF' : C.muted,
                    fontSize: 12,
                    fontWeight: '700',
                  }}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Tips list */}
        {isLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={C.red} size="large" />
            <Text style={{ color: C.muted, fontSize: 13, marginTop: 12 }}>Loading tips...</Text>
          </View>
        ) : (
          <FlatList
            testID="tips-list"
            data={filteredTips}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={{ paddingTop: 8, paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
            windowSize={10}
            removeClippedSubviews={true}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={handleRefresh}
                tintColor={C.red}
              />
            }
            ListEmptyComponent={
              <Animated.View
                entering={FadeIn.duration(300)}
                style={{ alignItems: 'center', paddingHorizontal: 40, paddingTop: 60 }}
              >
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: C.surface,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                  }}
                >
                  <Inbox size={28} color={C.muted} strokeWidth={1.5} />
                </View>
                <Text style={{ color: C.text, fontSize: 16, fontWeight: '700', marginBottom: 8, textAlign: 'center' }}>
                  {filter === 'all' ? 'No tips yet' : `No ${filter} tips`}
                </Text>
                <Text style={{ color: C.muted, fontSize: 13, lineHeight: 20, textAlign: 'center' }}>
                  {filter === 'all'
                    ? 'Share your tip link to start receiving submissions.'
                    : `You have no tips with status "${filter}".`}
                </Text>
              </Animated.View>
            }
            ListFooterComponent={
              userId ? <ShareLinkSection userId={userId} /> : null
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
}
