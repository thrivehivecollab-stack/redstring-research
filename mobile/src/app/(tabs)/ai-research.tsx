import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Mic,
  Send,
  Brain,
  Zap,
  BookOpen,
  Pin,
  X,
  MessageCircle,
  Highlighter,
  Trash2,
  RotateCcw,
  ChevronDown,
  Volume2,
  VolumeX,
  Headphones,
  Check,
  ShieldCheck,
  AlertTriangle,
  Copy,
  ThumbsUp,
  ThumbsDown,
  StopCircle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import Animated, {
  FadeInDown,
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  SlideInUp,
  SlideOutDown,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api/api';
import useInvestigationStore from '@/lib/state/investigation-store';
import type { ChatHistoryMessage } from '@/lib/types';

// ─── Color constants ────────────────────────────────────────────────────────
const COLORS = {
  background: '#0F0D0B',
  surface: '#1A1714',
  red: '#C41E3A',
  pin: '#D4A574',
  textLight: '#E8DCC8',
  muted: '#6B5B4F',
  border: '#3D332C',
} as const;

// ─── Highlight categories ───────────────────────────────────────────────────
interface HighlightCategory {
  id: string;
  color: string;
  name: string;
}

const HIGHLIGHT_CATEGORIES: HighlightCategory[] = [
  { id: 'critical', color: '#C41E3A', name: 'Critical Evidence' },
  { id: 'lead', color: '#D4A574', name: 'Key Lead' },
  { id: 'confirmed', color: '#22C55E', name: 'Confirmed Fact' },
  { id: 'background', color: '#3B82F6', name: 'Background Info' },
  { id: 'suspect', color: '#A855F7', name: 'Suspect/Person' },
  { id: 'timeline', color: '#F97316', name: 'Timeline Event' },
];

// ─── Voice types ────────────────────────────────────────────────────────────
interface Voice {
  id: string;
  name: string;
  description: string;
  persona?: string;
}

// ─── Types ──────────────────────────────────────────────────────────────────
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: Date;
  pinned?: boolean;
  highlight?: HighlightCategory;
  autoTag?: string;
  feedback?: 'up' | 'down' | null;
}

interface AIChatResponse {
  message: string;
}

interface TranscribeResponse {
  text: string;
}

// ─── Quick actions ──────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { label: 'Analyze Evidence', icon: Zap, immediate: true, text: 'Analyze Evidence', isVerify: false },
  { label: 'Find Connections', icon: Brain, immediate: true, text: 'Find Connections', isVerify: false },
  { label: 'Verify Info', icon: ShieldCheck, immediate: false, text: 'Verify this claim: ', isVerify: true },
  { label: 'Debunk This', icon: AlertTriangle, immediate: false, text: 'Debunk this claim: ', isVerify: true },
  { label: 'Research Topic', icon: BookOpen, immediate: false, text: 'Research this topic: ', isVerify: false },
  { label: 'Summarize Case', icon: MessageCircle, immediate: true, text: 'Give me a case summary based on our conversation so far', isVerify: false },
];

// ─── ThinkingDots ───────────────────────────────────────────────────────────
function ThinkingDots() {
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    const bounce = (sv: Animated.SharedValue<number>, delayMs: number) => {
      setTimeout(() => {
        sv.value = withRepeat(
          withSequence(
            withTiming(-6, { duration: 350 }),
            withTiming(0, { duration: 350 })
          ),
          -1,
          false
        );
      }, delayMs);
    };
    bounce(dot1, 0);
    bounce(dot2, 180);
    bounce(dot3, 360);
  }, []);

  const s1 = useAnimatedStyle(() => ({ transform: [{ translateY: dot1.value }] }));
  const s2 = useAnimatedStyle(() => ({ transform: [{ translateY: dot2.value }] }));
  const s3 = useAnimatedStyle(() => ({ transform: [{ translateY: dot3.value }] }));

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 10 }}>
      {[s1, s2, s3].map((style, i) => (
        <Animated.View
          key={i}
          style={[{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: COLORS.pin }, style]}
        />
      ))}
    </View>
  );
}

// ─── Highlight Action Sheet ─────────────────────────────────────────────────
function HighlightSheet({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (cat: HighlightCategory) => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}
        onPress={onClose}
      >
        <Pressable onPress={() => null}>
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              borderTopWidth: 1,
              borderTopColor: COLORS.border,
              paddingTop: 8,
              paddingBottom: 36,
            }}
          >
            {/* Grabber */}
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: COLORS.border,
                alignSelf: 'center',
                marginBottom: 16,
                marginTop: 4,
              }}
            />

            {/* Title */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingHorizontal: 20,
                marginBottom: 18,
              }}
            >
              <Highlighter size={18} color={COLORS.pin} strokeWidth={2} />
              <Text
                style={{
                  color: COLORS.textLight,
                  fontSize: 16,
                  fontWeight: '800',
                  letterSpacing: 1,
                }}
              >
                HIGHLIGHT AS
              </Text>
            </View>

            {/* Color options */}
            <View style={{ paddingHorizontal: 16, gap: 10 }}>
              {HIGHLIGHT_CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.id}
                  testID={`highlight-${cat.id}`}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    onSelect(cat);
                  }}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 14,
                    backgroundColor: pressed
                      ? `${cat.color}22`
                      : `${cat.color}11`,
                    borderRadius: 14,
                    paddingHorizontal: 16,
                    paddingVertical: 13,
                    borderLeftWidth: 4,
                    borderLeftColor: cat.color,
                    borderWidth: 1,
                    borderColor: `${cat.color}33`,
                  })}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: cat.color,
                    }}
                  />
                  <Text
                    style={{
                      color: COLORS.textLight,
                      fontSize: 15,
                      fontWeight: '700',
                      flex: 1,
                    }}
                  >
                    {cat.name}
                  </Text>
                  <View
                    style={{
                      backgroundColor: `${cat.color}33`,
                      borderRadius: 6,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                    }}
                  >
                    <Text style={{ color: cat.color, fontSize: 10, fontWeight: '800' }}>
                      TAG
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>

            {/* Cancel */}
            <Pressable
              onPress={onClose}
              style={({ pressed }) => ({
                marginHorizontal: 16,
                marginTop: 14,
                backgroundColor: pressed ? 'rgba(255,255,255,0.05)' : 'transparent',
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: COLORS.border,
              })}
            >
              <Text style={{ color: COLORS.muted, fontSize: 15, fontWeight: '600' }}>
                Cancel
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Highlights Panel Modal ─────────────────────────────────────────────────
function HighlightsPanel({
  visible,
  onClose,
  highlighted,
  onClearAll,
}: {
  visible: boolean;
  onClose: () => void;
  highlighted: Message[];
  onClearAll: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
        onPress={onClose}
      >
        <Pressable onPress={() => null}>
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              borderTopWidth: 1,
              borderTopColor: COLORS.border,
              paddingTop: 8,
              maxHeight: 560,
            }}
          >
            {/* Grabber */}
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: COLORS.border,
                alignSelf: 'center',
                marginBottom: 12,
                marginTop: 4,
              }}
            />

            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingBottom: 14,
                borderBottomWidth: 1,
                borderBottomColor: COLORS.border,
                gap: 8,
              }}
            >
              <Highlighter size={18} color={COLORS.pin} strokeWidth={2} />
              <Text
                style={{
                  color: COLORS.textLight,
                  fontSize: 16,
                  fontWeight: '800',
                  letterSpacing: 1,
                  flex: 1,
                }}
              >
                HIGHLIGHTS ({highlighted.length})
              </Text>
              {highlighted.length > 0 ? (
                <Pressable
                  testID="clear-all-highlights"
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                    onClearAll();
                  }}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    backgroundColor: pressed ? 'rgba(196,30,58,0.2)' : 'rgba(196,30,58,0.1)',
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                  })}
                >
                  <Trash2 size={12} color={COLORS.red} strokeWidth={2.5} />
                  <Text style={{ color: COLORS.red, fontSize: 12, fontWeight: '700' }}>
                    Clear All
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                testID="close-highlights-panel"
                onPress={onClose}
                style={{ marginLeft: 4, padding: 4 }}
              >
                <X size={18} color={COLORS.muted} strokeWidth={2} />
              </Pressable>
            </View>

            {/* List */}
            {highlighted.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                <Highlighter size={32} color={COLORS.border} strokeWidth={1.5} />
                <Text
                  style={{
                    color: COLORS.muted,
                    fontSize: 14,
                    marginTop: 12,
                    textAlign: 'center',
                  }}
                >
                  No highlights yet.{'\n'}Long-press an AI message to highlight it.
                </Text>
              </View>
            ) : (
              <ScrollView
                style={{ maxHeight: 400 }}
                contentContainerStyle={{ padding: 16, gap: 10 }}
                showsVerticalScrollIndicator={false}
              >
                {highlighted.map((msg) => (
                  <View
                    key={msg.id}
                    style={{
                      borderRadius: 12,
                      borderLeftWidth: 4,
                      borderLeftColor: msg.highlight?.color ?? COLORS.pin,
                      backgroundColor: COLORS.background,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      gap: 6,
                    }}
                  >
                    {/* Category badge */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 5,
                          backgroundColor: msg.highlight?.color,
                        }}
                      />
                      <Text
                        style={{
                          color: msg.highlight?.color,
                          fontSize: 10,
                          fontWeight: '800',
                          letterSpacing: 0.8,
                        }}
                      >
                        {msg.highlight?.name?.toUpperCase()}
                      </Text>
                    </View>

                    {/* Auto-tag */}
                    {msg.autoTag ? (
                      <Text style={{ color: COLORS.pin, fontSize: 12, fontWeight: '700' }}>
                        {msg.autoTag}
                      </Text>
                    ) : null}

                    {/* Preview */}
                    <Text
                      style={{ color: COLORS.muted, fontSize: 13, lineHeight: 18 }}
                      numberOfLines={2}
                    >
                      {msg.text.slice(0, 120)}
                      {msg.text.length > 120 ? '...' : null}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            )}

            <View style={{ height: 24 }} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Confirm New Conversation Modal ────────────────────────────────────────
function ConfirmNewConvoModal({
  visible,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.6)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 32,
        }}
      >
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 20,
            padding: 24,
            width: '100%',
            borderWidth: 1,
            borderColor: COLORS.border,
          }}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: 'rgba(196,30,58,0.15)',
              alignItems: 'center',
              justifyContent: 'center',
              alignSelf: 'center',
              marginBottom: 16,
            }}
          >
            <RotateCcw size={22} color={COLORS.red} strokeWidth={2} />
          </View>
          <Text
            style={{
              color: COLORS.textLight,
              fontSize: 18,
              fontWeight: '800',
              textAlign: 'center',
              marginBottom: 8,
            }}
          >
            New Conversation?
          </Text>
          <Text
            style={{
              color: COLORS.muted,
              fontSize: 14,
              textAlign: 'center',
              lineHeight: 20,
              marginBottom: 24,
            }}
          >
            This will permanently clear the conversation history for this investigation. This cannot
            be undone.
          </Text>
          <Pressable
            testID="confirm-new-convo"
            onPress={onConfirm}
            style={({ pressed }) => ({
              backgroundColor: pressed ? '#A3162E' : COLORS.red,
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: 'center',
              marginBottom: 10,
            })}
          >
            <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800' }}>
              Start Fresh
            </Text>
          </Pressable>
          <Pressable
            testID="cancel-new-convo"
            onPress={onCancel}
            style={({ pressed }) => ({
              backgroundColor: pressed ? 'rgba(255,255,255,0.05)' : 'transparent',
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: COLORS.border,
            })}
          >
            <Text style={{ color: COLORS.muted, fontSize: 15, fontWeight: '600' }}>
              Keep Going
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ─── Voice Picker Modal ─────────────────────────────────────────────────────
function VoicePickerModal({
  visible,
  onClose,
  voices,
  selectedVoiceId,
  onSelectVoice,
  onPreviewVoice,
  previewingVoiceId,
}: {
  visible: boolean;
  onClose: () => void;
  voices: Voice[];
  selectedVoiceId: string;
  onSelectVoice: (voice: Voice) => void;
  onPreviewVoice: (voice: Voice) => void;
  previewingVoiceId: string | null;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
        onPress={onClose}
      >
        <Pressable onPress={() => null}>
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              borderTopWidth: 1,
              borderTopColor: COLORS.border,
              paddingTop: 8,
              paddingBottom: 36,
            }}
          >
            {/* Grabber */}
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: COLORS.border,
                alignSelf: 'center',
                marginBottom: 16,
                marginTop: 4,
              }}
            />

            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 20,
                marginBottom: 18,
                gap: 8,
              }}
            >
              <Volume2 size={18} color={COLORS.red} strokeWidth={2} />
              <Text
                style={{
                  color: COLORS.textLight,
                  fontSize: 16,
                  fontWeight: '800',
                  letterSpacing: 1,
                  flex: 1,
                }}
              >
                CHOOSE VOICE
              </Text>
              <Pressable onPress={onClose} style={{ padding: 4 }}>
                <X size={18} color={COLORS.muted} strokeWidth={2} />
              </Pressable>
            </View>

            {/* Voice list */}
            <View style={{ paddingHorizontal: 16, gap: 10 }}>
              {voices.map((voice) => {
                const isSelected = voice.id === selectedVoiceId;
                const isPreviewing = previewingVoiceId === voice.id;
                return (
                  <Pressable
                    key={voice.id}
                    testID={`voice-option-${voice.id}`}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      onSelectVoice(voice);
                    }}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      backgroundColor: isSelected
                        ? 'rgba(196,30,58,0.15)'
                        : pressed
                        ? 'rgba(255,255,255,0.05)'
                        : 'rgba(255,255,255,0.02)',
                      borderRadius: 14,
                      paddingHorizontal: 16,
                      paddingVertical: 13,
                      borderWidth: 1,
                      borderColor: isSelected ? 'rgba(196,30,58,0.5)' : COLORS.border,
                      borderLeftWidth: isSelected ? 4 : 1,
                      borderLeftColor: isSelected ? COLORS.red : COLORS.border,
                    })}
                  >
                    {/* Voice avatar */}
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: isSelected
                          ? 'rgba(196,30,58,0.2)'
                          : 'rgba(255,255,255,0.06)',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: isSelected
                          ? 'rgba(196,30,58,0.4)'
                          : COLORS.border,
                      }}
                    >
                      <Volume2
                        size={16}
                        color={isSelected ? COLORS.red : COLORS.muted}
                        strokeWidth={2}
                      />
                    </View>

                    {/* Name + description */}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: isSelected ? COLORS.textLight : COLORS.textLight,
                          fontSize: 15,
                          fontWeight: '700',
                        }}
                      >
                        {voice.name}
                      </Text>
                      <Text
                        style={{
                          color: COLORS.muted,
                          fontSize: 12,
                          marginTop: 2,
                        }}
                      >
                        {voice.description}
                      </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: voice.persona === 'detective' ? '#C41E3A' : voice.persona === 'interrogator' ? '#F97316' : voice.persona === 'analyst' ? '#3B82F6' : voice.persona === 'journalist' ? '#22C55E' : voice.persona === 'archivist' ? '#A855F7' : '#D4A574' }} />
                          <Text style={{ color: '#6B5B4F', fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>{voice.persona}</Text>
                        </View>
                    </View>

                    {/* Preview button */}
                    <Pressable
                      testID={`preview-voice-${voice.id}`}
                      onPress={(e) => {
                        e.stopPropagation();
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onPreviewVoice(voice);
                      }}
                      style={({ pressed }) => ({
                        backgroundColor: isPreviewing
                          ? 'rgba(196,30,58,0.2)'
                          : pressed
                          ? 'rgba(196,30,58,0.15)'
                          : 'rgba(196,30,58,0.08)',
                        borderRadius: 8,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderWidth: 1,
                        borderColor: isPreviewing
                          ? 'rgba(196,30,58,0.5)'
                          : 'rgba(196,30,58,0.25)',
                      })}
                    >
                      {isPreviewing ? (
                        <ActivityIndicator size="small" color={COLORS.red} />
                      ) : (
                        <Text
                          style={{
                            color: COLORS.red,
                            fontSize: 11,
                            fontWeight: '700',
                          }}
                        >
                          Preview
                        </Text>
                      )}
                    </Pressable>

                    {/* Checkmark */}
                    {isSelected ? (
                      <Check size={16} color={COLORS.red} strokeWidth={2.5} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            {/* Done button */}
            <Pressable
              onPress={onClose}
              style={({ pressed }) => ({
                marginHorizontal: 16,
                marginTop: 16,
                backgroundColor: pressed ? '#A3162E' : COLORS.red,
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: 'center',
              })}
            >
              <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800' }}>Done</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── MessageBubble ──────────────────────────────────────────────────────────
function MessageBubble({
  message,
  index,
  onPin,
  onLongPress,
  onSpeak,
  isSpeaking,
  onCopy,
  onFeedback,
  onNativeSpeak,
  isNativeSpeaking,
}: {
  message: Message;
  index: number;
  onPin: (id: string) => void;
  onLongPress: (id: string) => void;
  onSpeak: (text: string) => void;
  isSpeaking: boolean;
  onCopy: (text: string) => void;
  onFeedback: (id: string, feedback: 'up' | 'down') => void;
  onNativeSpeak: (text: string, id: string) => void;
  isNativeSpeaking: boolean;
}) {
  const isUser = message.role === 'user';
  const timeStr = message.timestamp.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  // Subtle pulse on avatar when speaking
  const avatarScale = useSharedValue(1);
  useEffect(() => {
    if (isSpeaking) {
      avatarScale.value = withRepeat(
        withSequence(withTiming(1.15, { duration: 500 }), withTiming(0.92, { duration: 500 })),
        -1,
        true
      );
    } else {
      avatarScale.value = withSpring(1);
    }
  }, [isSpeaking]);

  const avatarAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: avatarScale.value }],
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(0).duration(320).springify()}
      style={{
        flexDirection: isUser ? 'row-reverse' : 'row',
        marginHorizontal: 16,
        marginBottom: 16,
        alignItems: 'flex-end',
        gap: 8,
      }}
    >
      {/* AI avatar */}
      {!isUser ? (
        <Animated.View style={avatarAnimStyle}>
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: isSpeaking ? 'rgba(196,30,58,0.3)' : 'rgba(196,30,58,0.15)',
              borderWidth: 1,
              borderColor: isSpeaking ? 'rgba(196,30,58,0.7)' : 'rgba(196,30,58,0.35)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 2,
            }}
          >
            <Brain size={14} color={COLORS.red} strokeWidth={2} />
          </View>
        </Animated.View>
      ) : null}

      {/* Bubble wrapper */}
      <View style={{ maxWidth: '78%' }}>
        {/* AI top row: badge + timestamp + highlight indicator */}
        {!isUser ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              marginBottom: 5,
              flexWrap: 'wrap',
            }}
          >
            <View
              style={{
                backgroundColor: COLORS.red,
                borderRadius: 4,
                paddingHorizontal: 6,
                paddingVertical: 2,
              }}
            >
              <Text style={{ color: '#FFF', fontSize: 9, fontWeight: '800', letterSpacing: 1 }}>
                AI
              </Text>
            </View>
            <Text style={{ color: COLORS.muted, fontSize: 11 }}>{timeStr}</Text>
            {message.highlight ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: `${message.highlight.color}22`,
                  borderRadius: 6,
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                  borderWidth: 1,
                  borderColor: `${message.highlight.color}44`,
                }}
              >
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: message.highlight.color,
                  }}
                />
                <Text
                  style={{
                    color: message.highlight.color,
                    fontSize: 9,
                    fontWeight: '800',
                    letterSpacing: 0.5,
                  }}
                >
                  {message.highlight.name.toUpperCase()}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Bubble body */}
        {isUser ? (
          <Pressable
            testID={`message-bubble-${message.id}`}
          >
            <View
              style={{
                backgroundColor: COLORS.red,
                borderRadius: 18,
                borderBottomRightRadius: 4,
                borderBottomLeftRadius: 18,
                paddingHorizontal: 14,
                paddingVertical: 14,
                borderWidth: 0,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 6,
                elevation: 3,
              }}
            >
              <Text
                style={{
                  color: '#FFF',
                  fontSize: 15,
                  lineHeight: 24,
                  fontWeight: '400',
                }}
              >
                {message.text}
              </Text>
            </View>
          </Pressable>
        ) : (
          <View
            testID={`message-bubble-${message.id}`}
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 18,
              borderBottomRightRadius: 18,
              borderBottomLeftRadius: 4,
              paddingHorizontal: 16,
              paddingVertical: 16,
              borderWidth: message.highlight ? 0 : 1,
              borderColor: COLORS.border,
              borderLeftWidth: message.highlight ? 4 : 1,
              borderLeftColor:
                message.highlight ? message.highlight.color : COLORS.border,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 6,
              elevation: 3,
            }}
          >
            <Text
              selectable={true}
              style={{
                color: COLORS.textLight,
                fontSize: 15,
                lineHeight: 24,
                fontWeight: '400',
              }}
            >
              {message.text}
            </Text>
          </View>
        )}

        {/* User timestamp */}
        {isUser ? (
          <Text
            style={{
              color: COLORS.muted,
              fontSize: 11,
              marginTop: 4,
              textAlign: 'right',
            }}
          >
            {timeStr}
          </Text>
        ) : null}

        {/* Action row for AI messages */}
        {!isUser ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              marginTop: 7,
              flexWrap: 'wrap',
            }}
          >
            {/* Auto-tag badge */}
            {message.autoTag ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: 'rgba(212,165,116,0.1)',
                  borderRadius: 6,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderWidth: 1,
                  borderColor: 'rgba(212,165,116,0.25)',
                }}
              >
                <Pin size={9} color={COLORS.pin} strokeWidth={2.5} />
                <Text style={{ color: COLORS.pin, fontSize: 10, fontWeight: '700' }}>
                  {message.autoTag}
                </Text>
              </View>
            ) : null}

            {/* Thumbs up */}
            <Pressable
              testID={`thumbs-up-${message.id}`}
              onPress={() => onFeedback(message.id, 'up')}
              style={({ pressed }) => ({
                width: 30,
                height: 30,
                backgroundColor: message.feedback === 'up'
                  ? 'rgba(34,197,94,0.2)'
                  : pressed ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: message.feedback === 'up' ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.1)',
                alignItems: 'center',
                justifyContent: 'center',
              })}
            >
              <ThumbsUp
                size={13}
                color={message.feedback === 'up' ? '#22C55E' : COLORS.muted}
                strokeWidth={2.5}
                fill={message.feedback === 'up' ? '#22C55E' : 'none'}
              />
            </Pressable>

            {/* Thumbs down */}
            <Pressable
              testID={`thumbs-down-${message.id}`}
              onPress={() => onFeedback(message.id, 'down')}
              style={({ pressed }) => ({
                width: 30,
                height: 30,
                backgroundColor: message.feedback === 'down'
                  ? 'rgba(196,30,58,0.2)'
                  : pressed ? 'rgba(196,30,58,0.1)' : 'rgba(255,255,255,0.04)',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: message.feedback === 'down' ? 'rgba(196,30,58,0.5)' : 'rgba(255,255,255,0.1)',
                alignItems: 'center',
                justifyContent: 'center',
              })}
            >
              <ThumbsDown
                size={13}
                color={message.feedback === 'down' ? COLORS.red : COLORS.muted}
                strokeWidth={2.5}
                fill={message.feedback === 'down' ? COLORS.red : 'none'}
              />
            </Pressable>

            {/* Copy */}
            <Pressable
              testID={`copy-message-${message.id}`}
              onPress={() => onCopy(message.text)}
              style={({ pressed }) => ({
                width: 30,
                height: 30,
                backgroundColor: pressed ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.1)',
                alignItems: 'center',
                justifyContent: 'center',
              })}
            >
              <Copy size={13} color={COLORS.muted} strokeWidth={2.5} />
            </Pressable>

            {/* Speak (native expo-speech) */}
            <Pressable
              testID={`native-speak-${message.id}`}
              onPress={() => onNativeSpeak(message.text, message.id)}
              style={({ pressed }) => ({
                width: 30,
                height: 30,
                backgroundColor: isNativeSpeaking
                  ? 'rgba(196,30,58,0.18)'
                  : pressed ? 'rgba(196,30,58,0.1)' : 'rgba(255,255,255,0.04)',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: isNativeSpeaking ? 'rgba(196,30,58,0.5)' : 'rgba(255,255,255,0.1)',
                alignItems: 'center',
                justifyContent: 'center',
              })}
            >
              {isNativeSpeaking ? (
                <StopCircle size={13} color={COLORS.red} strokeWidth={2.5} />
              ) : (
                <Volume2 size={13} color={COLORS.muted} strokeWidth={2.5} />
              )}
            </Pressable>

            {/* ElevenLabs voice pin button (existing) */}
            <Pressable
              testID={`pin-message-${message.id}`}
              onPress={() => onPin(message.id)}
              style={({ pressed }) => ({
                width: 30,
                height: 30,
                backgroundColor: message.pinned
                  ? 'rgba(212,165,116,0.18)'
                  : pressed ? 'rgba(212,165,116,0.12)' : 'rgba(212,165,116,0.07)',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: message.pinned ? 'rgba(212,165,116,0.5)' : 'rgba(212,165,116,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
              })}
            >
              <Pin size={13} color={COLORS.pin} strokeWidth={2.5} />
            </Pressable>

            {/* ElevenLabs speak button (voice-enabled feature) */}
            <Pressable
              testID={`speak-message-${message.id}`}
              onPress={() => onSpeak(message.text)}
              style={({ pressed }) => ({
                width: 30,
                height: 30,
                backgroundColor: isSpeaking
                  ? 'rgba(196,30,58,0.18)'
                  : pressed ? 'rgba(196,30,58,0.1)' : 'rgba(212,165,116,0.06)',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: isSpeaking ? 'rgba(196,30,58,0.5)' : 'rgba(212,165,116,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
              })}
            >
              <Headphones size={13} color={isSpeaking ? COLORS.red : COLORS.pin} strokeWidth={2.5} />
            </Pressable>
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

// ─── Verify Modal ────────────────────────────────────────────────────────────
function VerifyModal({
  visible,
  loading,
  result,
  onClose,
}: {
  visible: boolean;
  loading: boolean;
  result: { analysis: string; verdict: string; confidence: number } | null;
  onClose: () => void;
}) {
  const verdictColor = result?.verdict === 'LIKELY TRUE' ? '#22C55E'
    : result?.verdict === 'LIKELY FALSE' ? '#C41E3A'
    : result?.verdict === 'MISLEADING' ? '#F59E0B'
    : result?.verdict === 'DISPUTED' ? '#A855F7'
    : '#6B5B4F';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }} onPress={onClose}>
        <Pressable onPress={() => null}>
          <View style={{
            backgroundColor: '#231F1C',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderTopWidth: 1,
            borderTopColor: '#3D332C',
            paddingTop: 8,
            paddingBottom: 36,
            maxHeight: 600,
          }}>
            {/* Grabber */}
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#3D332C', alignSelf: 'center', marginBottom: 16, marginTop: 4 }} />

            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16, gap: 10 }}>
              <ShieldCheck size={20} color={verdictColor} strokeWidth={2} />
              <Text style={{ color: '#E8DCC8', fontSize: 16, fontWeight: '800', letterSpacing: 1, flex: 1 }}>FACT CHECK</Text>
              <Pressable onPress={onClose} style={{ padding: 4 }}>
                <X size={18} color="#6B5B4F" strokeWidth={2} />
              </Pressable>
            </View>

            {loading ? (
              <View style={{ alignItems: 'center', paddingVertical: 48, gap: 14 }}>
                <ActivityIndicator size="large" color="#C41E3A" />
                <Text style={{ color: '#6B5B4F', fontSize: 14, fontWeight: '600' }}>Analyzing claim...</Text>
              </View>
            ) : result ? (
              <ScrollView style={{ maxHeight: 480 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20, gap: 16 }} showsVerticalScrollIndicator={false}>
                {/* Verdict badge */}
                <View style={{
                  backgroundColor: `${verdictColor}18`,
                  borderRadius: 14,
                  borderWidth: 2,
                  borderColor: `${verdictColor}55`,
                  padding: 16,
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <Text style={{ color: verdictColor, fontSize: 20, fontWeight: '900', letterSpacing: 1.5 }}>
                    {result.verdict}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%' }}>
                    <View style={{ flex: 1, height: 6, backgroundColor: '#3D332C', borderRadius: 3, overflow: 'hidden' }}>
                      <View style={{ width: `${result.confidence}%`, height: '100%', backgroundColor: verdictColor, borderRadius: 3 }} />
                    </View>
                    <Text style={{ color: verdictColor, fontSize: 12, fontWeight: '800' }}>{result.confidence}%</Text>
                  </View>
                </View>

                {/* Full analysis */}
                <Text style={{ color: '#E8DCC8', fontSize: 13, lineHeight: 21 }}>
                  {result.analysis}
                </Text>
              </ScrollView>
            ) : null}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Main screen ────────────────────────────────────────────────────────────
export default function AIResearchScreen() {
  const router = useRouter();
  // Investigation context — defined BEFORE all useState calls so WELCOME and
  // the lazy initialiser for messages can reference activeInvestigation.
  const activeInvestigationId = useInvestigationStore((s) => s.activeInvestigationId);
  const investigations = useInvestigationStore((s) => s.investigations);
  const activeInvestigation = investigations.find((i) => i.id === activeInvestigationId);
  const saveChatMessage = useInvestigationStore((s) => s.saveChatMessage);
  const updateMessageFeedback = useInvestigationStore((s) => s.updateMessageFeedback);
  const updateChatMessage = useInvestigationStore((s) => s.updateChatMessage);
  const clearChatHistory = useInvestigationStore((s) => s.clearChatHistory);
  const addNode = useInvestigationStore((s) => s.addNode);

  const WELCOME: Message = {
    id: 'welcome',
    role: 'ai',
    text: activeInvestigation
      ? `Welcome back, Investigator. I'm your AI research assistant for "${activeInvestigation.title}". Ask me to analyze evidence, find connections, research topics, or summarize your case. Long-press any of my responses to highlight and categorize them. What are we uncovering today?`
      : "Welcome, Investigator. I'm your AI research assistant. Ask me anything — analyze evidence, find connections, research topics, or build a case summary. Long-press any of my responses to highlight and categorize them. What are we uncovering today?",
    timestamp: new Date(),
  };

  const [messages, setMessages] = useState<Message[]>(() => {
    const history = activeInvestigation?.chatHistory ?? [];
    if (history.length === 0) return [WELCOME];
    return history.map((m): Message => ({
      id: m.id,
      role: m.role === 'assistant' ? 'ai' : 'user',
      text: m.content,
      timestamp: new Date(m.timestamp),
      pinned: m.pinned,
      highlight: m.highlight as HighlightCategory | undefined,
      autoTag: m.autoTag,
      feedback: m.feedback,
    }));
  });

  const [inputText, setInputText] = useState<string>('');
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  // Native expo-speech speaking state
  const [nativeSpeakingId, setNativeSpeakingId] = useState<string | null>(null);

  // Voice picker state
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('pNInz6obpgDQGcFmaJgB');
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('The Detective');
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);
  const [voicePickerVisible, setVoicePickerVisible] = useState<boolean>(false);
  const [availableVoices, setAvailableVoices] = useState<Voice[]>([]);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);

  // Hands-free mode
  const [handsFreeActive, setHandsFreeActive] = useState<boolean>(false);
  const handsFreeRef = useRef<boolean>(false);

  // Modals
  const [highlightSheetVisible, setHighlightSheetVisible] = useState<boolean>(false);
  const [targetMessageId, setTargetMessageId] = useState<string | null>(null);
  const [highlightsPanelVisible, setHighlightsPanelVisible] = useState<boolean>(false);
  const [confirmNewConvoVisible, setConfirmNewConvoVisible] = useState<boolean>(false);

  // Pin title modal
  const [showPinTitleModal, setShowPinTitleModal] = useState<boolean>(false);
  const [pinTitleDraft, setPinTitleDraft] = useState<string>('');
  const [pendingPinMessageId, setPendingPinMessageId] = useState<string | null>(null);

  // Verify modal state
  const [verifyResult, setVerifyResult] = useState<{ analysis: string; verdict: string; confidence: number } | null>(null);
  const [verifyLoading, setVerifyLoading] = useState<boolean>(false);
  const [showVerifyModal, setShowVerifyModal] = useState<boolean>(false);

  // Toast
  const [toastVisible, setToastVisible] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  const flatListRef = useRef<FlatList<Message>>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const currentSoundRef = useRef<Audio.Sound | null>(null);

  // Mic animation
  const micPulse = useSharedValue(1);
  const micOpacity = useSharedValue(1);
  const micAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: micPulse.value }],
    opacity: micOpacity.value,
  }));

  // Hands-free pulsing dot animation
  const hfDotOpacity = useSharedValue(1);
  useEffect(() => {
    if (handsFreeActive) {
      hfDotOpacity.value = withRepeat(
        withSequence(withTiming(0.2, { duration: 600 }), withTiming(1, { duration: 600 })),
        -1,
        true
      );
    } else {
      hfDotOpacity.value = withTiming(1);
    }
  }, [handsFreeActive]);
  const hfDotStyle = useAnimatedStyle(() => ({ opacity: hfDotOpacity.value }));

  // ─── Reload history when active investigation changes ──────────────────
  useEffect(() => {
    const history = activeInvestigation?.chatHistory ?? [];
    if (history.length === 0) {
      setMessages([{ ...WELCOME, timestamp: new Date() }]);
    } else {
      setMessages(
        history.map((m): Message => ({
          id: m.id,
          role: m.role === 'assistant' ? 'ai' : 'user',
          text: m.content,
          timestamp: new Date(m.timestamp),
          pinned: m.pinned,
          highlight: m.highlight as HighlightCategory | undefined,
          autoTag: m.autoTag,
          feedback: m.feedback,
        }))
      );
    }
  }, [activeInvestigationId]); // eslint-disable-line react-hooks/exhaustive-deps

  const startMicAnimation = useCallback(() => {
    micPulse.value = withRepeat(
      withSequence(withTiming(1.12, { duration: 600 }), withTiming(0.94, { duration: 600 })),
      -1,
      true
    );
    micOpacity.value = withRepeat(
      withSequence(withTiming(0.7, { duration: 600 }), withTiming(1, { duration: 600 })),
      -1,
      true
    );
  }, [micPulse, micOpacity]);

  const stopMicAnimation = useCallback(() => {
    micPulse.value = withSpring(1);
    micOpacity.value = withTiming(1);
  }, [micPulse, micOpacity]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setToastVisible(true);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastVisible(false), 2600);
  }, []);

  // ─── Build rich investigation context ─────────────────────────────────
  const buildInvestigationContext = useCallback(() => {
    if (!activeInvestigation) return undefined;
    const desc = activeInvestigation.description ? `\nDescription: ${activeInvestigation.description}` : '';
    const nodesSummary = activeInvestigation.nodes
      .slice(0, 20)
      .map((n) => {
        const parts = [`[${n.type.toUpperCase()}] ${n.title}`];
        if (n.color) parts.push(`Color: ${n.color}`);
        if (n.content) parts.push(`Content: ${n.content.slice(0, 200)}`);
        else if (n.description) parts.push(`Notes: ${n.description.slice(0, 200)}`);
        return parts.join(' | ');
      })
      .join('\n');
    const stringsSummary = (activeInvestigation.strings ?? []).length > 0
      ? `\n\nConnections:\n${(activeInvestigation.strings ?? []).slice(0, 15).map((s) => {
          const from = activeInvestigation.nodes.find((n) => n.id === s.fromNodeId)?.title ?? '?';
          const to = activeInvestigation.nodes.find((n) => n.id === s.toNodeId)?.title ?? '?';
          return `${from} → ${to}${s.label ? ` (${s.label})` : ''}`;
        }).join('\n')}`
      : '';
    return `Investigation: "${activeInvestigation.title}"${desc}\n\nEvidence Board (${activeInvestigation.nodes.length} nodes):\n${nodesSummary}${stringsSummary}`;
  }, [activeInvestigation]);

  // ─── Handle verify / fact-check a claim ───────────────────────────────
  const handleVerifyClaim = useCallback(async (claim: string) => {
    if (!claim.trim()) return;
    setVerifyLoading(true);
    setShowVerifyModal(true);
    setVerifyResult(null);
    try {
      const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
      const res = await fetch(`${BACKEND_URL}/api/ai/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claim,
          context: buildInvestigationContext(),
        }),
      });
      const json = await res.json();
      if (json.data) {
        setVerifyResult(json.data);
      }
    } catch {
      showToast('Verification failed. Please try again.');
      setShowVerifyModal(false);
    } finally {
      setVerifyLoading(false);
    }
  }, [buildInvestigationContext, showToast]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  // ─── Stop currently playing audio ─────────────────────────────────────
  const stopCurrentAudio = useCallback(async () => {
    if (currentSoundRef.current) {
      try {
        await currentSoundRef.current.stopAsync();
        await currentSoundRef.current.unloadAsync();
      } catch {
        // ignore cleanup errors
      }
      currentSoundRef.current = null;
    }
    setIsSpeaking(false);
    setSpeakingMessageId(null);
  }, []);

  // ─── Load voices on mount ──────────────────────────────────────────────
  useEffect(() => {
    const loadVoices = async () => {
      try {
        const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
        const res = await fetch(`${BACKEND_URL}/api/ai/voices`);
        if (res.ok) {
          const json = await res.json();
          const voices: Voice[] = json.data ?? [];
          setAvailableVoices(voices);
        }
      } catch {
        // silently fail, voices will be empty
      }
    };
    loadVoices();
  }, []);

  // ─── TTS playback (returns a promise that resolves when done) ──────────
  const speakTextInternal = useCallback(
    async (text: string, messageId?: string, voiceIdOverride?: string): Promise<void> => {
      await stopCurrentAudio();

      try {
        setIsSpeaking(true);
        if (messageId) setSpeakingMessageId(messageId);

        const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
        const response = await fetch(`${BACKEND_URL}/api/ai/tts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            voice_id: voiceIdOverride ?? selectedVoiceId,
          }),
        });

        if (!response.ok) {
          throw new Error('TTS request failed');
        }

        const blob = await response.blob();

        await new Promise<void>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = async () => {
            try {
              const uri = reader.result as string;
              const { sound } = await Audio.Sound.createAsync({ uri });
              currentSoundRef.current = sound;
              await sound.playAsync();
              sound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                  sound.unloadAsync();
                  currentSoundRef.current = null;
                  setIsSpeaking(false);
                  setSpeakingMessageId(null);
                  resolve();
                }
              });
            } catch (err) {
              reject(err);
            }
          };
          reader.onerror = () => reject(new Error('FileReader error'));
          reader.readAsDataURL(blob);
        });
      } catch {
        setIsSpeaking(false);
        setSpeakingMessageId(null);
        showToast('Could not play voice response');
      }
    },
    [stopCurrentAudio, showToast, selectedVoiceId]
  );

  const speakText = useCallback(
    (text: string, messageId?: string) => speakTextInternal(text, messageId),
    [speakTextInternal]
  );

  // ─── Hands-free: start recording cycle ───────────────────────────────
  const startHandsFreeRecording = useCallback(async () => {
    if (!handsFreeRef.current) return;

    // Stop any playing audio so user can speak
    await stopCurrentAudio();

    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      showToast('Microphone permission required for hands-free mode.');
      setHandsFreeActive(false);
      handsFreeRef.current = false;
      return;
    }

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      setIsListening(true);
      startMicAnimation();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {
      showToast('Could not start recording in hands-free mode.');
    }
  }, [showToast, startMicAnimation, stopCurrentAudio]);

  // Build the history array for the AI from messages (exclude welcome for brevity if large)
  const buildHistory = useCallback(
    (currentMessages: Message[]): ChatMessage[] => {
      return currentMessages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({
          role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
          content: m.text,
        }));
    },
    []
  );

  // ─── Send message (real AI) ────────────────────────────────────────────
  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isThinking) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setInputText('');

      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        text: trimmed,
        timestamp: new Date(),
      };

      // Save user message to investigation store
      if (activeInvestigationId) {
        saveChatMessage(activeInvestigationId, {
          id: userMsg.id,
          role: 'user',
          content: userMsg.text,
          timestamp: userMsg.timestamp.getTime(),
        });
      }

      // If this looks like a verify/debunk request, also run structured verification
      if (trimmed.toLowerCase().startsWith('verify this claim:') || trimmed.toLowerCase().startsWith('debunk this claim:')) {
        const claimText = trimmed.replace(/^(verify this claim:|debunk this claim:)\s*/i, '');
        if (claimText.trim()) {
          handleVerifyClaim(claimText.trim());
        }
      }

      setMessages((prev) => {
        const next = [...prev, userMsg];
        return next;
      });
      setIsThinking(true);
      scrollToBottom();

      // Build conversation history for context
      setMessages((prev) => {
        const history = buildHistory(prev);

        // Fire the API call asynchronously using the built history
        const doFetch = async (hist: ChatMessage[]) => {
          try {
            const response = await api.post<AIChatResponse>('/api/ai/chat', {
              messages: [
                ...hist,
                { role: 'user', content: trimmed },
              ],
              investigationContext: buildInvestigationContext(),
              persona: selectedVoice?.persona,
            });

            const aiText =
              response?.message ??
              "I couldn't process that request. Please try again.";

            const aiMsgId = `ai-${Date.now()}`;
            const aiMsg: Message = {
              id: aiMsgId,
              role: 'ai',
              text: aiText,
              timestamp: new Date(),
            };

            // Save AI response to investigation store
            if (activeInvestigationId) {
              saveChatMessage(activeInvestigationId, {
                id: aiMsgId,
                role: 'assistant',
                content: aiText,
                timestamp: aiMsg.timestamp.getTime(),
              });
            }

            setIsThinking(false);
            setMessages((p) => [...p, aiMsg]);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            scrollToBottom();

            // Auto-speak if voice is enabled
            if (voiceEnabled) {
              await speakTextInternal(aiText, aiMsgId);
              // After speaking, if hands-free still active, restart recording
              if (handsFreeRef.current) {
                startHandsFreeRecording();
              }
            } else if (handsFreeRef.current) {
              // Hands-free without voice: restart recording immediately
              startHandsFreeRecording();
            }
          } catch (err) {
            const errMsg: Message = {
              id: `ai-err-${Date.now()}`,
              role: 'ai',
              text: "I encountered an error processing your request. Please check your connection and try again.",
              timestamp: new Date(),
            };
            setIsThinking(false);
            setMessages((p) => [...p, errMsg]);
            scrollToBottom();
            // In hands-free, still try to restart
            if (handsFreeRef.current) {
              startHandsFreeRecording();
            }
          }
        };

        doFetch(history);
        return prev;
      });
    },
    [isThinking, scrollToBottom, buildHistory, buildInvestigationContext, handleVerifyClaim,
     voiceEnabled, speakTextInternal, startHandsFreeRecording, activeInvestigationId, saveChatMessage,
     selectedVoice]
  );

  const handleSend = useCallback(() => {
    sendMessage(inputText);
  }, [inputText, sendMessage]);

  // ─── Mic: record + transcribe ────────────────────────────────────────
  const handleMicPress = useCallback(async () => {
    if (isListening) {
      // Stop recording
      setIsListening(false);
      stopMicAnimation();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (!recordingRef.current) return;

      setIsTranscribing(true);
      try {
        await recordingRef.current.stopAndUnloadAsync();
        const uri = recordingRef.current.getURI();
        recordingRef.current = null;

        await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

        if (!uri) {
          showToast('Recording failed. Please try again.');
          setIsTranscribing(false);
          return;
        }

        const fetchResponse = await fetch(uri);
        const blob = await fetchResponse.blob();
        const filename = uri.split('/').pop() ?? 'recording.m4a';
        const fd = new FormData();
        fd.append('file', blob, filename);

        const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
        const res = await fetch(`${BACKEND_URL}/api/ai/transcribe`, {
          method: 'POST',
          body: fd,
        });

        if (!res.ok) {
          throw new Error('Transcription failed');
        }

        const json = await res.json();
        const transcribedText: string = json.data?.text ?? '';

        if (transcribedText.trim()) {
          setInputText(transcribedText.trim());
          // In hands-free mode, auto-send immediately
          if (handsFreeRef.current) {
            sendMessage(transcribedText.trim());
          }
        } else {
          showToast('Could not transcribe audio. Please try again.');
          // In hands-free, try recording again
          if (handsFreeRef.current) {
            startHandsFreeRecording();
          }
        }
      } catch {
        showToast('Transcription failed. Please try again.');
        recordingRef.current = null;
        if (handsFreeRef.current) {
          startHandsFreeRecording();
        }
      } finally {
        setIsTranscribing(false);
      }
    } else {
      // Stop any playing audio so user can speak
      await stopCurrentAudio();
      // Request permissions and start recording
      const { status } = await Audio.requestPermissionsAsync();

      if (status !== 'granted') {
        showToast('Microphone permission is required. Please enable it in Settings.');
        return;
      }

      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );

        recordingRef.current = recording;
        setIsListening(true);
        startMicAnimation();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch {
        showToast('Could not start recording. Please try again.');
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      }
    }
  }, [isListening, startMicAnimation, stopMicAnimation, showToast, sendMessage, startHandsFreeRecording]);

  // ─── Quick actions ───────────────────────────────────────────────────────
  const handleQuickAction = useCallback(
    (action: (typeof QUICK_ACTIONS)[number]) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (action.immediate) {
        sendMessage(action.text);
      } else {
        setInputText(action.text);
      }
    },
    [sendMessage]
  );

  // ─── Pin ─────────────────────────────────────────────────────────────────
  const handlePinMessage = useCallback(
    (id: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const msg = messages.find((m) => m.id === id);
      if (!msg) return;
      const alreadyPinned = msg.pinned;
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, pinned: !m.pinned } : m))
      );
      if (activeInvestigationId) {
        updateChatMessage(activeInvestigationId, id, { pinned: !alreadyPinned });
      }
      if (!alreadyPinned && activeInvestigationId && msg.role === 'ai') {
        // Prompt for title before pinning
        const defaultTitle = msg.text.slice(0, 40).trim() + (msg.text.length > 40 ? '…' : '');
        setPinTitleDraft(defaultTitle);
        setPendingPinMessageId(id);
        setShowPinTitleModal(true);
      } else if (alreadyPinned) {
        showToast('Unpinned');
      }
    },
    [messages, activeInvestigationId, updateChatMessage, showToast]
  );

  const handleConfirmPin = useCallback((navigateToBoard = false) => {
    if (!pendingPinMessageId || !activeInvestigationId) return;
    const msg = messages.find((m) => m.id === pendingPinMessageId);
    if (!msg) return;
    const title = pinTitleDraft.trim() || msg.text.slice(0, 40);
    const colorMap: Record<string, string> = { critical: 'red', lead: 'amber', confirmed: 'green', background: 'blue', suspect: 'red', timeline: 'amber' };
    const nodeColor = msg.highlight ? (colorMap[msg.highlight.id] ?? 'teal') : 'teal';

    // Find a position that avoids overlap (≥180px from all existing nodes)
    const existingNodes = useInvestigationStore.getState().investigations.find((i) => i.id === activeInvestigationId)?.nodes ?? [];
    let px = 100 + Math.random() * 300;
    let py = 100 + Math.random() * 300;
    let attempts = 0;
    while (attempts < 20) {
      const tooClose = existingNodes.some((n) => Math.hypot(n.position.x - px, n.position.y - py) < 180);
      if (!tooClose) break;
      px = 100 + Math.random() * 500;
      py = 100 + Math.random() * 500;
      attempts++;
    }

    addNode(activeInvestigationId, 'note', title, { x: px, y: py }, {
      content: msg.text,
      color: nodeColor as any,
      sources: [{ id: Date.now().toString(), sourceType: 'other', sourceName: 'Red String AI', contentType: 'article', contentSummary: title, credibility: 'unverified', addedAt: Date.now() }],
    });
    showToast('📌 Added to board — tap Canvas tab to view');
    setShowPinTitleModal(false);
    setPendingPinMessageId(null);
    setPinTitleDraft('');
    if (navigateToBoard) {
      router.push('/(tabs)/two');
    }
  }, [pendingPinMessageId, activeInvestigationId, messages, pinTitleDraft, addNode, showToast, router]);

  // ─── Highlight long-press ─────────────────────────────────────────────
  const handleLongPress = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setTargetMessageId(id);
    setHighlightSheetVisible(true);
  }, []);

  const handleHighlightSelect = useCallback(
    (cat: HighlightCategory) => {
      setHighlightSheetVisible(false);
      if (!targetMessageId) return;

      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== targetMessageId) return m;
          const firstWords = m.text.split(' ').slice(0, 8).join(' ');
          const autoTag = `${firstWords}... [${cat.name}]`;
          return { ...m, highlight: cat, autoTag, pinned: true };
        })
      );

      if (activeInvestigationId && targetMessageId) {
        const msg = messages.find((m) => m.id === targetMessageId);
        if (msg) {
          updateChatMessage(activeInvestigationId, targetMessageId, {
            highlight: cat,
            autoTag: `${msg.text.split(' ').slice(0, 8).join(' ')}... [${cat.name}]`,
            pinned: true,
          });
        }
      }

      showToast(`Highlighted as "${cat.name}" — Pinned to Board`);
      setTargetMessageId(null);
    },
    [targetMessageId, showToast, activeInvestigationId, messages, updateChatMessage]
  );

  // ─── Highlights panel ────────────────────────────────────────────────
  const highlightedMessages = messages.filter((m) => m.highlight);

  const handleClearAllHighlights = useCallback(() => {
    setMessages((prev) =>
      prev.map((m) => ({ ...m, highlight: undefined, autoTag: undefined }))
    );
    setHighlightsPanelVisible(false);
    showToast('All highlights cleared');
  }, [showToast]);

  // ─── New conversation ────────────────────────────────────────────────
  const handleNewConversation = useCallback(() => {
    const nonWelcome = messages.filter((m) => m.id !== 'welcome');
    if (nonWelcome.length > 3) {
      setConfirmNewConvoVisible(true);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setMessages([{ ...WELCOME, timestamp: new Date() }]);
    }
  }, [messages]);

  const handleConfirmNewConvo = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setConfirmNewConvoVisible(false);
    stopCurrentAudio();
    if (activeInvestigationId) {
      clearChatHistory(activeInvestigationId);
    }
    setMessages([{ ...WELCOME, timestamp: new Date() }]);
    showToast('New conversation started');
  }, [showToast, stopCurrentAudio, activeInvestigationId, clearChatHistory]);

  // ─── Handle speak for a specific message ─────────────────────────────
  const handleSpeakMessage = useCallback(
    (text: string, messageId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (isSpeaking && speakingMessageId === messageId) {
        stopCurrentAudio();
      } else {
        speakText(text, messageId);
      }
    },
    [isSpeaking, speakingMessageId, stopCurrentAudio, speakText]
  );

  // ─── Toggle voice output ──────────────────────────────────────────────
  const handleToggleVoice = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setVoiceEnabled((prev) => {
      const next = !prev;
      if (!next) stopCurrentAudio();
      showToast(next ? 'Voice responses enabled' : 'Voice responses disabled');
      return next;
    });
  }, [stopCurrentAudio, showToast]);

  // ─── Long-press voice button: open voice picker ───────────────────────
  const handleVoiceButtonLongPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setVoicePickerVisible(true);
  }, []);

  // ─── Voice picker: select voice ───────────────────────────────────────
  const handleSelectVoice = useCallback((voice: Voice) => {
    setSelectedVoiceId(voice.id);
    setSelectedVoiceName(voice.name);
    setSelectedVoice(voice);
  }, []);

  // ─── Voice picker: preview voice ──────────────────────────────────────
  const handlePreviewVoice = useCallback(
    async (voice: Voice) => {
      if (previewingVoiceId === voice.id) return;
      setPreviewingVoiceId(voice.id);
      try {
        await speakTextInternal(
          'Ready to investigate. I\'m your AI research assistant.',
          undefined,
          voice.id
        );
      } finally {
        setPreviewingVoiceId(null);
      }
    },
    [previewingVoiceId, speakTextInternal]
  );

  // ─── Toggle hands-free mode ────────────────────────────────────────────
  const handleToggleHandsFree = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (handsFreeActive) {
      // Turn off
      handsFreeRef.current = false;
      setHandsFreeActive(false);
      // Stop any recording/speaking
      if (isListening) {
        setIsListening(false);
        stopMicAnimation();
        if (recordingRef.current) {
          try {
            await recordingRef.current.stopAndUnloadAsync();
          } catch {
            // ignore
          }
          recordingRef.current = null;
          await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
        }
      }
      stopCurrentAudio();
      showToast('Hands-free mode OFF');
    } else {
      // Turn on
      handsFreeRef.current = true;
      setHandsFreeActive(true);
      showToast('Hands-free mode ON — speak to begin');
      // Start the first recording
      await startHandsFreeRecording();
    }
  }, [handsFreeActive, isListening, stopMicAnimation, stopCurrentAudio, showToast, startHandsFreeRecording]);

  // ─── Copy message handler ─────────────────────────────────────────────
  const handleCopyMessage = useCallback(async (text: string) => {
    await Clipboard.setStringAsync(text);
    showToast('Copied to clipboard');
  }, [showToast]);

  // ─── Feedback handler ─────────────────────────────────────────────────
  const handleFeedback = useCallback(
    (messageId: string, feedback: 'up' | 'down') => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          const newFeedback = m.feedback === feedback ? null : feedback;
          if (activeInvestigationId) {
            updateMessageFeedback(activeInvestigationId, messageId, newFeedback);
          }
          return { ...m, feedback: newFeedback };
        })
      );
    },
    [activeInvestigationId, updateMessageFeedback]
  );

  // ─── Native expo-speech handler ───────────────────────────────────────
  const handleNativeSpeak = useCallback(
    (text: string, messageId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (nativeSpeakingId === messageId) {
        Speech.stop();
        setNativeSpeakingId(null);
      } else {
        Speech.stop();
        setNativeSpeakingId(messageId);
        Speech.speak(text, {
          onDone: () => setNativeSpeakingId(null),
          onError: () => setNativeSpeakingId(null),
          onStopped: () => setNativeSpeakingId(null),
        });
      }
    },
    [nativeSpeakingId]
  );

  // ─── Render message ──────────────────────────────────────────────────
  const renderMessage = useCallback(
    ({ item, index }: { item: Message; index: number }) => (
      <MessageBubble
        message={item}
        index={index}
        onPin={handlePinMessage}
        onLongPress={handleLongPress}
        onSpeak={(text) => handleSpeakMessage(text, item.id)}
        isSpeaking={!!(isSpeaking && speakingMessageId === item.id)}
        onCopy={handleCopyMessage}
        onFeedback={handleFeedback}
        onNativeSpeak={handleNativeSpeak}
        isNativeSpeaking={nativeSpeakingId === item.id}
      />
    ),
    [handlePinMessage, handleLongPress, handleSpeakMessage, isSpeaking, speakingMessageId,
     handleCopyMessage, handleFeedback, handleNativeSpeak, nativeSpeakingId]
  );

  const keyExtractor = useCallback((item: Message) => item.id, []);

  const messageCount = messages.filter((m) => m.id !== 'welcome').length;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }} testID="ai-research-screen">
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>

        {/* ── Header ─────────────────────────────────────────────────── */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 14,
            borderBottomWidth: 1,
            borderBottomColor: COLORS.border,
            gap: 12,
          }}
        >
          {/* Brain icon */}
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              backgroundColor: 'rgba(196,30,58,0.15)',
              borderWidth: 1,
              borderColor: 'rgba(196,30,58,0.3)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Brain size={20} color={COLORS.red} strokeWidth={1.8} />
          </View>

          {/* Title block */}
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: COLORS.red,
                fontSize: 18,
                fontWeight: '900',
                letterSpacing: 2.5,
              }}
            >
              AI RESEARCH
            </Text>
            <Text
              style={{
                color: COLORS.muted,
                fontSize: 10,
                fontWeight: '700',
                letterSpacing: 2.5,
                marginTop: 1,
              }}
            >
              {messageCount > 0
                ? `${messageCount} MESSAGE${messageCount === 1 ? '' : 'S'}`
                : 'ASSISTANT'}
            </Text>
          </View>

          {/* Hands-free toggle */}
          <Pressable
            testID="hands-free-toggle"
            onPress={handleToggleHandsFree}
            style={({ pressed }) => ({
              width: 34,
              height: 34,
              borderRadius: 10,
              backgroundColor: handsFreeActive
                ? pressed
                  ? 'rgba(196,30,58,0.35)'
                  : 'rgba(196,30,58,0.2)'
                : pressed
                ? 'rgba(255,255,255,0.08)'
                : 'rgba(255,255,255,0.04)',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: handsFreeActive ? 'rgba(196,30,58,0.6)' : COLORS.border,
            })}
          >
            <Headphones
              size={15}
              color={handsFreeActive ? COLORS.red : COLORS.muted}
              strokeWidth={2}
            />
          </Pressable>

          {/* Voice toggle button (long-press opens picker) */}
          <Pressable
            testID="voice-toggle-button"
            onPress={handleToggleVoice}
            onLongPress={handleVoiceButtonLongPress}
            delayLongPress={400}
            style={({ pressed }) => ({
              borderRadius: 12,
              backgroundColor: voiceEnabled
                ? pressed
                  ? 'rgba(196,30,58,0.25)'
                  : 'rgba(196,30,58,0.15)'
                : pressed
                ? 'rgba(255,255,255,0.08)'
                : 'rgba(255,255,255,0.04)',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: voiceEnabled ? 'rgba(196,30,58,0.5)' : COLORS.border,
              paddingHorizontal: 14,
              paddingVertical: 8,
            })}
          >
            {voiceEnabled ? (
              <Volume2 size={15} color={COLORS.red} strokeWidth={2} />
            ) : (
              <VolumeX size={15} color={COLORS.muted} strokeWidth={2} />
            )}
            {voiceEnabled ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: selectedVoice?.persona === 'detective' ? '#C41E3A' : selectedVoice?.persona === 'interrogator' ? '#F97316' : selectedVoice?.persona === 'analyst' ? '#3B82F6' : selectedVoice?.persona === 'journalist' ? '#22C55E' : selectedVoice?.persona === 'archivist' ? '#A855F7' : '#D4A574', marginRight: 5 }} />
                <Text style={{ color: '#E8DCC8', fontSize: 13, fontWeight: '800', letterSpacing: 0.5 }}>{selectedVoiceName.toUpperCase()}</Text>
              </View>
            ) : null}
          </Pressable>

          {/* Highlights button */}
          <Pressable
            testID="open-highlights-panel"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setHighlightsPanelVisible(true);
            }}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              backgroundColor: pressed
                ? 'rgba(212,165,116,0.18)'
                : highlightedMessages.length > 0
                ? 'rgba(212,165,116,0.12)'
                : 'rgba(212,165,116,0.06)',
              borderRadius: 10,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderWidth: 1,
              borderColor:
                highlightedMessages.length > 0
                  ? 'rgba(212,165,116,0.4)'
                  : 'rgba(212,165,116,0.2)',
            })}
          >
            <Highlighter size={13} color={COLORS.pin} strokeWidth={2.2} />
            <Text style={{ color: COLORS.pin, fontSize: 12, fontWeight: '700' }}>
              {highlightedMessages.length > 0
                ? `Highlights (${highlightedMessages.length})`
                : 'Highlights'}
            </Text>
          </Pressable>

          {/* New conversation */}
          <Pressable
            testID="new-conversation"
            onPress={handleNewConversation}
            style={({ pressed }) => ({
              width: 34,
              height: 34,
              borderRadius: 10,
              backgroundColor: pressed
                ? 'rgba(255,255,255,0.08)'
                : 'rgba(255,255,255,0.04)',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: COLORS.border,
            })}
          >
            <RotateCcw size={15} color={COLORS.muted} strokeWidth={2} />
          </Pressable>
        </View>

        {/* ── Messages + Input ────────────────────────────────────────── */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <FlatList
            ref={flatListRef}
            testID="messages-list"
            data={messages}
            renderItem={renderMessage}
            keyExtractor={keyExtractor}
            contentContainerStyle={{ paddingTop: 20, paddingBottom: 12 }}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={scrollToBottom}
            ListHeaderComponent={
              handsFreeActive ? (
                <Animated.View
                  entering={FadeIn.duration(200)}
                  exiting={FadeOut.duration(200)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    marginHorizontal: 16,
                    marginBottom: 14,
                    backgroundColor: 'rgba(196,30,58,0.12)',
                    borderRadius: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 9,
                    borderWidth: 1,
                    borderColor: 'rgba(196,30,58,0.4)',
                  }}
                >
                  <Animated.View
                    style={[
                      {
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: COLORS.red,
                      },
                      hfDotStyle,
                    ]}
                  />
                  <Headphones size={13} color={COLORS.red} strokeWidth={2.2} />
                  <Text
                    style={{
                      color: COLORS.red,
                      fontSize: 12,
                      fontWeight: '800',
                      letterSpacing: 1.5,
                      flex: 1,
                    }}
                  >
                    HANDS-FREE
                  </Text>
                  <Text style={{ color: COLORS.muted, fontSize: 11, fontWeight: '600' }}>
                    Speak to respond
                  </Text>
                </Animated.View>
              ) : null
            }
            ListFooterComponent={
              isThinking ? (
                <Animated.View
                  entering={FadeIn.duration(200)}
                  exiting={FadeOut.duration(200)}
                  style={{
                    flexDirection: 'row',
                    marginHorizontal: 16,
                    marginBottom: 16,
                    alignItems: 'flex-end',
                    gap: 8,
                  }}
                >
                  <View
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 15,
                      backgroundColor: 'rgba(196,30,58,0.15)',
                      borderWidth: 1,
                      borderColor: 'rgba(196,30,58,0.35)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Brain size={14} color={COLORS.red} strokeWidth={2} />
                  </View>
                  <View
                    style={{
                      backgroundColor: COLORS.surface,
                      borderRadius: 16,
                      borderBottomLeftRadius: 4,
                      paddingHorizontal: 16,
                      paddingVertical: 4,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                    }}
                  >
                    <ThinkingDots />
                  </View>
                </Animated.View>
              ) : null
            }
          />

          {/* ── Input area ──────────────────────────────────────────── */}
          <View
            style={{
              backgroundColor: COLORS.background,
              borderTopWidth: 1,
              borderTopColor: COLORS.border,
              paddingBottom: 10,
            }}
          >
            {/* Quick action chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0 }}
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingTop: 12,
                paddingBottom: 10,
                gap: 8,
              }}
            >
              {QUICK_ACTIONS.map(({ label, icon: Icon, ...rest }) => (
                <Pressable
                  key={label}
                  testID={`quick-action-${label.toLowerCase().replace(/\s+/g, '-')}`}
                  onPress={() =>
                    handleQuickAction({ label, icon: Icon, ...rest } as (typeof QUICK_ACTIONS)[number])
                  }
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: pressed
                      ? 'rgba(196,30,58,0.18)'
                      : 'rgba(196,30,58,0.09)',
                    borderRadius: 20,
                    paddingHorizontal: 13,
                    paddingVertical: 7,
                    borderWidth: 1,
                    borderColor: pressed
                      ? 'rgba(196,30,58,0.5)'
                      : 'rgba(196,30,58,0.25)',
                  })}
                >
                  <Icon size={13} color={COLORS.red} strokeWidth={2.2} />
                  <Text
                    style={{
                      color: COLORS.textLight,
                      fontSize: 12,
                      fontWeight: '600',
                    }}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Listening banner */}
            {isListening ? (
              <Animated.View
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(200)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  marginHorizontal: 16,
                  marginBottom: 10,
                  backgroundColor: 'rgba(196,30,58,0.1)',
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 9,
                  borderWidth: 1,
                  borderColor: 'rgba(196,30,58,0.3)',
                }}
              >
                <View
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 3.5,
                    backgroundColor: COLORS.red,
                  }}
                />
                <Text
                  style={{ color: COLORS.red, fontSize: 13, fontWeight: '700', flex: 1 }}
                >
                  Listening...
                </Text>
                <Pressable onPress={handleMicPress}>
                  <X size={16} color={COLORS.muted} strokeWidth={2} />
                </Pressable>
              </Animated.View>
            ) : null}

            {/* Transcribing banner */}
            {isTranscribing ? (
              <Animated.View
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(200)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  marginHorizontal: 16,
                  marginBottom: 10,
                  backgroundColor: 'rgba(212,165,116,0.08)',
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 9,
                  borderWidth: 1,
                  borderColor: 'rgba(212,165,116,0.25)',
                }}
              >
                <ActivityIndicator size="small" color={COLORS.pin} />
                <Text style={{ color: COLORS.pin, fontSize: 13, fontWeight: '700', flex: 1 }}>
                  Transcribing...
                </Text>
              </Animated.View>
            ) : null}

            {/* Input row */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-end',
                paddingHorizontal: 16,
                gap: 10,
              }}
            >
              {/* Mic */}
              <Animated.View style={micAnimStyle}>
                <Pressable
                  testID="mic-button"
                  onPress={handleMicPress}
                  disabled={isTranscribing}
                  style={({ pressed }) => ({
                    width: 52,
                    height: 52,
                    borderRadius: 26,
                    backgroundColor: isListening
                      ? COLORS.red
                      : isTranscribing
                      ? 'rgba(212,165,116,0.15)'
                      : pressed
                      ? 'rgba(196,30,58,0.2)'
                      : COLORS.surface,
                    borderWidth: 2,
                    borderColor: isListening
                      ? COLORS.red
                      : isTranscribing
                      ? 'rgba(212,165,116,0.4)'
                      : 'rgba(196,30,58,0.35)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: isListening ? COLORS.red : '#000',
                    shadowOffset: { width: 0, height: isListening ? 4 : 2 },
                    shadowOpacity: isListening ? 0.5 : 0.2,
                    shadowRadius: isListening ? 10 : 4,
                    elevation: isListening ? 8 : 3,
                  })}
                >
                  {isTranscribing ? (
                    <ActivityIndicator size="small" color={COLORS.pin} />
                  ) : (
                    <Mic
                      size={20}
                      color={isListening ? '#FFF' : COLORS.red}
                      strokeWidth={2}
                    />
                  )}
                </Pressable>
              </Animated.View>

              {/* Text input */}
              <View
                style={{
                  flex: 1,
                  backgroundColor: COLORS.surface,
                  borderRadius: 24,
                  borderWidth: 1,
                  borderColor:
                    inputText.length > 0 ? 'rgba(196,30,58,0.4)' : COLORS.border,
                  paddingHorizontal: 18,
                  paddingTop: 12,
                  paddingBottom: 12,
                  minHeight: 52,
                  maxHeight: 120,
                  justifyContent: 'center',
                }}
              >
                <TextInput
                  testID="message-input"
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="Ask your research assistant..."
                  placeholderTextColor={COLORS.muted}
                  multiline
                  style={{
                    color: COLORS.textLight,
                    fontSize: 16,
                    lineHeight: 20,
                    margin: 0,
                    padding: 0,
                  }}
                  onSubmitEditing={handleSend}
                  blurOnSubmit={false}
                />
              </View>

              {/* Send */}
              <Pressable
                testID="send-button"
                onPress={handleSend}
                disabled={!inputText.trim() || isThinking}
                style={({ pressed }) => ({
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor:
                    inputText.trim() && !isThinking
                      ? pressed
                        ? '#A3162E'
                        : COLORS.red
                      : COLORS.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor:
                    inputText.trim() && !isThinking ? COLORS.red : COLORS.border,
                  shadowColor: inputText.trim() ? COLORS.red : '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: inputText.trim() ? 0.4 : 0.1,
                  shadowRadius: 6,
                  elevation: inputText.trim() ? 5 : 1,
                })}
              >
                <Send
                  size={18}
                  color={inputText.trim() && !isThinking ? '#FFF' : COLORS.muted}
                  strokeWidth={2.2}
                />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* ── Toast ─────────────────────────────────────────────────────── */}
      {toastVisible ? (
        <Animated.View
          entering={SlideInUp.springify().damping(22)}
          exiting={SlideOutDown.duration(200)}
          style={{
            position: 'absolute',
            bottom: 110,
            left: 20,
            right: 20,
            backgroundColor: COLORS.surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: COLORS.border,
            borderLeftWidth: 4,
            borderLeftColor: COLORS.pin,
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 13,
            paddingHorizontal: 16,
            gap: 10,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.35,
            shadowRadius: 12,
            elevation: 12,
          }}
          testID="toast-notification"
        >
          <Pin size={16} color={COLORS.pin} strokeWidth={2.5} />
          <Text style={{ color: COLORS.textLight, fontSize: 13, fontWeight: '600', flex: 1 }}>
            {toastMessage}
          </Text>
          <Pressable onPress={() => setToastVisible(false)}>
            <ChevronDown size={16} color={COLORS.muted} strokeWidth={2} />
          </Pressable>
        </Animated.View>
      ) : null}

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      <HighlightSheet
        visible={highlightSheetVisible}
        onClose={() => {
          setHighlightSheetVisible(false);
          setTargetMessageId(null);
        }}
        onSelect={handleHighlightSelect}
      />

      <HighlightsPanel
        visible={highlightsPanelVisible}
        onClose={() => setHighlightsPanelVisible(false)}
        highlighted={highlightedMessages}
        onClearAll={handleClearAllHighlights}
      />

      <ConfirmNewConvoModal
        visible={confirmNewConvoVisible}
        onConfirm={handleConfirmNewConvo}
        onCancel={() => setConfirmNewConvoVisible(false)}
      />

      <VoicePickerModal
        visible={voicePickerVisible}
        onClose={() => setVoicePickerVisible(false)}
        voices={availableVoices}
        selectedVoiceId={selectedVoiceId}
        onSelectVoice={handleSelectVoice}
        onPreviewVoice={handlePreviewVoice}
        previewingVoiceId={previewingVoiceId}
      />

      <VerifyModal
        visible={showVerifyModal}
        loading={verifyLoading}
        result={verifyResult}
        onClose={() => { setShowVerifyModal(false); setVerifyResult(null); }}
      />

      {/* Pin Title Modal */}
      <Modal
        visible={showPinTitleModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => { setShowPinTitleModal(false); setPendingPinMessageId(null); }}
      >
        <View style={{
          flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
          justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32,
        }}>
          <View style={{
            backgroundColor: COLORS.surface, borderRadius: 20, padding: 24,
            width: '100%', borderWidth: 1, borderColor: COLORS.border,
          }}>
            <Text style={{ color: COLORS.textLight, fontSize: 16, fontWeight: '800', marginBottom: 6 }}>
              NAME THIS NODE
            </Text>
            <Text style={{ color: COLORS.muted, fontSize: 13, marginBottom: 16 }}>
              Edit the title before pinning to the board.
            </Text>
            <TextInput
              value={pinTitleDraft}
              onChangeText={setPinTitleDraft}
              placeholder="Node title..."
              placeholderTextColor={COLORS.muted}
              style={{
                backgroundColor: COLORS.background, borderRadius: 10, padding: 14,
                color: COLORS.textLight, fontSize: 15, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16,
              }}
              autoFocus
            />
            <View style={{ gap: 10 }}>
              <Pressable
                onPress={() => handleConfirmPin(false)}
                style={({ pressed }) => ({
                  paddingVertical: 13, borderRadius: 10, alignItems: 'center',
                  backgroundColor: pressed ? '#A3162E' : COLORS.red,
                })}
              >
                <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700' }}>📌 Pin to Board</Text>
              </Pressable>
              <Pressable
                onPress={() => handleConfirmPin(true)}
                style={({ pressed }) => ({
                  paddingVertical: 11, borderRadius: 10, alignItems: 'center',
                  backgroundColor: pressed ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
                  borderWidth: 1, borderColor: COLORS.border,
                })}
              >
                <Text style={{ color: COLORS.muted, fontSize: 13, fontWeight: '600' }}>Pin & View on Board →</Text>
              </Pressable>
              <Pressable
                onPress={() => { setShowPinTitleModal(false); setPendingPinMessageId(null); }}
                style={({ pressed }) => ({
                  paddingVertical: 10, borderRadius: 10, alignItems: 'center',
                  backgroundColor: 'transparent',
                })}
              >
                <Text style={{ color: COLORS.muted, fontSize: 13, fontWeight: '500' }}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
