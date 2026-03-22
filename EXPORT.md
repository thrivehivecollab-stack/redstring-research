# mobile/src/app/(tabs)/_layout.tsx

import React from 'react';
import { View, Text } from 'react-native';
import { Tabs } from 'expo-router';
import {
  useFonts,
  CourierPrime_400Regular,
} from '@expo-google-fonts/courier-prime';

const COLORS = {
  background: '#1A1614',
  border: '#3D332C',
  red: '#C41E3A',
  muted: '#6B5B4F',
  textLight: '#E8DCC8',
} as const;

type TabIconProps = {
  color: string;
  focused: boolean;
  label: string;
  emoji: string;
};

function TabItem({ color, focused, label, emoji }: TabIconProps) {
  const [fontsLoaded] = useFonts({ CourierPrime_400Regular });

  return (
    <View style={{ alignItems: 'center', gap: 3 }}>
      <Text style={{ fontSize: 23 }}>{emoji}</Text>
      <Text
        style={{
          color,
          fontSize: 9,
          fontFamily: fontsLoaded ? 'CourierPrime_400Regular' : undefined,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
      {focused ? (
        <View
          style={{
            width: 20,
            height: 2,
            backgroundColor: COLORS.red,
            borderRadius: 1,
            marginTop: 1,
            shadowColor: COLORS.red,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: 4,
            elevation: 4,
          }}
        />
      ) : (
        <View style={{ width: 20, height: 2 }} />
      )}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1A1614',
          borderTopColor: '#3D332C',
          borderTopWidth: 1,
          height: 88,
          paddingBottom: 12,
          paddingTop: 8,
        },
        tabBarActiveTintColor: COLORS.red,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabItem color={color} focused={focused} label="Cases" emoji="🗂️" />
          ),
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabItem color={color} focused={focused} label="Canvas" emoji="📌" />
          ),
        }}
      />
      <Tabs.Screen
        name="ai-research"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabItem color={color} focused={focused} label="AI" emoji="🤖" />
          ),
        }}
      />
      <Tabs.Screen
        name="podcast"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabItem color={color} focused={focused} label="Live" emoji="📡" />
          ),
        }}
      />
      <Tabs.Screen
        name="scripts"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabItem color={color} focused={focused} label="Pods" emoji="🎙️" />
          ),
        }}
      />
      {/* Hidden tabs - accessible via hamburger menu */}
      <Tabs.Screen name="tips" options={{ href: null }} />
      <Tabs.Screen name="collab-tab" options={{ href: null }} />
      <Tabs.Screen name="bookmarks" options={{ href: null }} />
      <Tabs.Screen name="prompt-history" options={{ href: null }} />
    </Tabs>
  );
}


# mobile/src/app/(tabs)/ai-research.tsx

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
import { api } from '@/lib/api/api';
import useInvestigationStore from '@/lib/state/investigation-store';
import type { ChatHistoryMessage } from '@/lib/types';

// ─── Color constants ────────────────────────────────────────────────────────
const COLORS = {
  background: '#1A1614',
  surface: '#231F1C',
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
    const nodesSummary = activeInvestigation.nodes
      .map((n) => {
        const parts = [`[${n.type.toUpperCase()}] ${n.title}`];
        if (n.content) parts.push(`Content: ${n.content.slice(0, 300)}`);
        if (n.description) parts.push(`Notes: ${n.description.slice(0, 200)}`);
        if (n.timestamp) parts.push(`Date: ${new Date(n.timestamp).toLocaleDateString()}`);
        return parts.join(' | ');
      })
      .join('\n');
    const stringsSummary = (activeInvestigation.strings ?? []).length > 0
      ? `\nConnections: ${(activeInvestigation.strings ?? []).map((s) => {
          const from = activeInvestigation.nodes.find((n) => n.id === s.fromNodeId)?.title ?? '?';
          const to = activeInvestigation.nodes.find((n) => n.id === s.toNodeId)?.title ?? '?';
          return `${from} → ${to}${s.label ? ` (${s.label})` : ''}`;
        }).join(', ')}`
      : '';
    return `Investigation: "${activeInvestigation.title}"\n\nEvidence Board:\n${nodesSummary}${stringsSummary}`;
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
        const title = msg.text.split(' ').slice(0, 8).join(' ') + (msg.text.split(' ').length > 8 ? '…' : '');
        const colorMap: Record<string, string> = { critical: 'red', lead: 'amber', confirmed: 'green', background: 'blue', suspect: 'red', timeline: 'amber' };
        const nodeColor = msg.highlight ? (colorMap[msg.highlight.id] ?? 'teal') : 'teal';
        addNode(activeInvestigationId, 'note', title, { x: 100 + Math.random() * 200, y: 100 + Math.random() * 200 }, { content: msg.text, color: nodeColor as any, sources: [{ id: Date.now().toString(), sourceType: 'other', sourceName: 'Red String AI', contentType: 'article', contentSummary: title, credibility: 'unverified', addedAt: Date.now() }] });
        showToast('📌 Added to investigation board');
      } else if (alreadyPinned) {
        showToast('Unpinned');
      }
    },
    [messages, activeInvestigationId, addNode, showToast, updateChatMessage]
  );

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
    </View>
  );
}


# mobile/src/app/(tabs)/bookmarks.tsx

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  TextInput,
  ScrollView,
  Modal,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Bookmark,
  Globe,
  FileText,
  Film,
  Rss,
  Plus,
  Search,
  Filter,
  Check,
  X,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn, FadeOut } from 'react-native-reanimated';
import * as DocumentPicker from 'expo-document-picker';

const COLORS = {
  background: '#1A1614',
  surface: '#231F1C',
  card: '#F5ECD7',
  red: '#C41E3A',
  pin: '#D4A574',
  textLight: '#E8DCC8',
  muted: '#6B5B4F',
  border: '#3D332C',
  cardText: '#2C1810',
} as const;

type BookmarkCategory = 'Article' | 'Tweet' | 'Video' | 'PDF';
type FilterTab = 'All' | 'Articles' | 'Tweets' | 'Videos' | 'PDFs';

interface BookmarkItem {
  id: string;
  title: string;
  domain: string;
  dateImported: string;
  category: BookmarkCategory;
  platform: 'x' | 'browser' | 'pocket' | 'instapaper';
}

interface ImportSource {
  id: string;
  name: string;
  platform: 'x' | 'browser' | 'pocket' | 'instapaper';
  connected: boolean;
  bookmarkCount?: number;
}

const MOCK_BOOKMARKS: BookmarkItem[] = [
  {
    id: '1',
    title: 'Leaked NSA Documents Detail Domestic Surveillance Program',
    domain: 'nytimes.com',
    dateImported: 'Mar 2, 2026',
    category: 'Article',
    platform: 'browser',
  },
  {
    id: '2',
    title: 'Thread on CIA involvement in Operation Mockingbird',
    domain: 'twitter.com/@investigator',
    dateImported: 'Mar 1, 2026',
    category: 'Tweet',
    platform: 'x',
  },
  {
    id: '3',
    title: 'Shadow Government: Inside the Deep State',
    domain: 'youtube.com',
    dateImported: 'Feb 28, 2026',
    category: 'Video',
    platform: 'browser',
  },
  {
    id: '4',
    title: 'FOIA Release: 500 pages on JFK Assassination',
    domain: 'archives.gov',
    dateImported: 'Feb 27, 2026',
    category: 'PDF',
    platform: 'pocket',
  },
  {
    id: '5',
    title: 'How Social Media Platforms Censor Investigative Journalists',
    domain: 'substack.com',
    dateImported: 'Feb 26, 2026',
    category: 'Article',
    platform: 'instapaper',
  },
  {
    id: '6',
    title: 'Whistleblower testimony transcript - Senate Hearing 2024',
    domain: 'congress.gov',
    dateImported: 'Feb 25, 2026',
    category: 'PDF',
    platform: 'browser',
  },
];

const MOCK_INVESTIGATIONS = [
  'Operation Deep Throat',
  'Surveillance State Files',
  'JFK Declassified',
];

const INITIAL_SOURCES: ImportSource[] = [
  { id: 'x', name: 'X / Twitter Bookmarks', platform: 'x', connected: false },
  { id: 'browser', name: 'Browser Bookmarks', platform: 'browser', connected: true, bookmarkCount: 2847 },
  { id: 'pocket', name: 'Pocket', platform: 'pocket', connected: false },
];

const FILTER_TABS: FilterTab[] = ['All', 'Articles', 'Tweets', 'Videos', 'PDFs'];

function categoryMatches(category: BookmarkCategory, filter: FilterTab): boolean {
  if (filter === 'All') return true;
  if (filter === 'Articles' && category === 'Article') return true;
  if (filter === 'Tweets' && category === 'Tweet') return true;
  if (filter === 'Videos' && category === 'Video') return true;
  if (filter === 'PDFs' && category === 'PDF') return true;
  return false;
}

function CategoryBadge({ category }: { category: BookmarkCategory }) {
  const colorMap: Record<BookmarkCategory, string> = {
    Article: '#2563EB',
    Tweet: '#0EA5E9',
    Video: '#DC2626',
    PDF: '#D97706',
  };
  return (
    <View style={{ backgroundColor: colorMap[category] + '22', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5, borderWidth: 1, borderColor: colorMap[category] + '55' }}>
      <Text style={{ color: colorMap[category], fontSize: 13, fontWeight: '700', letterSpacing: 0.7 }}>
        {category.toUpperCase()}
      </Text>
    </View>
  );
}

function PlatformIcon({ platform, size = 14 }: { platform: ImportSource['platform']; size?: number }) {
  if (platform === 'x') {
    return (
      <View style={{ width: size + 4, height: size + 4, borderRadius: 4, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#FFF', fontSize: size - 2, fontWeight: '900' }}>X</Text>
      </View>
    );
  }
  if (platform === 'browser') return <Globe size={size} color={COLORS.muted} strokeWidth={2} />;
  if (platform === 'pocket') return <Rss size={size} color="#EF4444" strokeWidth={2} />;
  if (platform === 'instapaper') return <FileText size={size} color={COLORS.muted} strokeWidth={2} />;
  return null;
}

function SourceIcon({ platform }: { platform: ImportSource['platform'] }) {
  if (platform === 'x') {
    return (
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '900' }}>X</Text>
      </View>
    );
  }
  if (platform === 'browser') {
    return (
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#1E40AF22', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#2563EB44' }}>
        <Globe size={20} color="#3B82F6" strokeWidth={2} />
      </View>
    );
  }
  if (platform === 'pocket') {
    return (
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#EF444422', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#EF444444' }}>
        <Rss size={20} color="#EF4444" strokeWidth={2} />
      </View>
    );
  }
  return (
    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.border, alignItems: 'center', justifyContent: 'center' }}>
      <FileText size={20} color={COLORS.muted} strokeWidth={2} />
    </View>
  );
}

function parseBrowserBookmarks(html: string): Array<{url: string, title: string}> {
  const results: Array<{url: string, title: string}> = [];
  const regex = /<A\s+HREF="([^"]+)"[^>]*>([^<]+)<\/A>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const url = match[1];
    const title = match[2].trim();
    if (url.startsWith('http')) {
      results.push({ url, title });
    }
  }
  return results;
}

function guessCategory(url: string): BookmarkCategory {
  if (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com')) {
    return 'Video';
  }
  if (url.includes('twitter.com') || url.includes('x.com')) {
    return 'Tweet';
  }
  if (url.endsWith('.pdf') || url.includes('/pdf/') || url.includes('?pdf=')) {
    return 'PDF';
  }
  return 'Article';
}

function extractDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export default function BookmarksScreen() {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>(MOCK_BOOKMARKS);
  const [sources, setSources] = useState<ImportSource[]>(INITIAL_SOURCES);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [connectModalSource, setConnectModalSource] = useState<ImportSource | null>(null);
  const [addToInvestigationBookmark, setAddToInvestigationBookmark] = useState<BookmarkItem | null>(null);
  const [selectedInvestigation, setSelectedInvestigation] = useState<string>(MOCK_INVESTIGATIONS[0]);
  const [addMode, setAddMode] = useState<'note' | 'link'>('link');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [importFileModalVisible, setImportFileModalVisible] = useState<boolean>(false);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  const filteredBookmarks = bookmarks.filter((b) => {
    const matchesFilter = categoryMatches(b.category, activeFilter);
    const matchesSearch = searchQuery.trim() === '' || b.title.toLowerCase().includes(searchQuery.toLowerCase()) || b.domain.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleDeleteBookmark = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
    setDeleteConfirmId(null);
    showToast('Bookmark removed.');
  }, [showToast]);

  const handleAddToInvestigation = useCallback(() => {
    if (!addToInvestigationBookmark) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast(`Pinned to ${selectedInvestigation}!`);
    setAddToInvestigationBookmark(null);
  }, [addToInvestigationBookmark, selectedInvestigation, showToast]);

  const renderBookmark = useCallback(({ item }: { item: BookmarkItem }) => (
    <Pressable
      testID={`bookmark-item-${item.id}`}
      onLongPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setDeleteConfirmId(item.id);
      }}
      style={{ marginHorizontal: 16, marginBottom: 12 }}
    >
      {/* Pushpin */}
      <View style={{ position: 'absolute', top: -8, left: 20, zIndex: 10, alignItems: 'center' }}>
        <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.pin, borderWidth: 1.5, borderColor: '#A0784A' }} />
        <View style={{ width: 2, height: 10, backgroundColor: '#A0784A', marginTop: -1 }} />
      </View>
      <View style={{
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 18,
        paddingTop: 18,
        borderWidth: 1,
        borderColor: '#D4C5A9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 4,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={{ color: COLORS.cardText, fontSize: 16, fontWeight: '800', lineHeight: 20, marginBottom: 4 }} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <PlatformIcon platform={item.platform} size={20} />
              <Text style={{ color: COLORS.muted, fontSize: 13 }}>{item.domain}</Text>
              <Text style={{ color: '#C5B69A', fontSize: 13 }}>•</Text>
              <Text style={{ color: COLORS.muted, fontSize: 13 }}>{item.dateImported}</Text>
            </View>
          </View>
          <CategoryBadge category={item.category} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 }}>
          <Pressable
            testID={`add-to-investigation-${item.id}`}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setAddToInvestigationBookmark(item);
            }}
            style={({ pressed }) => ({
              flexDirection: 'row', alignItems: 'center', gap: 5,
              backgroundColor: pressed ? '#9B1530' : COLORS.red,
              borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Plus size={20} color="#FFF" strokeWidth={2.5} />
            <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '800' }}>Add to Investigation</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  ), []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      {/* Header */}
      <Animated.View entering={FadeInDown.delay(50).duration(400)} style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 }}>
          <Bookmark size={28} color={COLORS.red} strokeWidth={2} />
          <Text style={{ color: COLORS.red, fontSize: 22, fontWeight: '900', letterSpacing: 3 }}>BOOKMARKS</Text>
        </View>
        <Text style={{ color: COLORS.pin, fontSize: 12, fontWeight: '700', letterSpacing: 4.2, marginLeft: 32 }}>IMPORT</Text>
      </Animated.View>

      {/* Search bar */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)} style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 10,
          backgroundColor: COLORS.surface, borderRadius: 12,
          borderWidth: 1, borderColor: COLORS.border,
          paddingHorizontal: 14, paddingVertical: 10,
        }}>
          <Search size={22} color={COLORS.muted} strokeWidth={2} />
          <TextInput
            testID="bookmark-search-input"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search bookmarks..."
            placeholderTextColor={COLORS.muted}
            style={{ flex: 1, color: COLORS.textLight, fontSize: 14 }}
          />
          {searchQuery.length > 0 ? (
            <Pressable onPress={() => setSearchQuery('')}>
              <X size={16} color={COLORS.muted} strokeWidth={2} />
            </Pressable>
          ) : null}
        </View>
      </Animated.View>

      {/* Filter tabs */}
      <Animated.View entering={FadeInDown.delay(150).duration(400)}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12, gap: 8 }}
        >
          {FILTER_TABS.map((tab) => (
            <Pressable
              key={tab}
              testID={`filter-tab-${tab.toLowerCase()}`}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveFilter(tab);
              }}
              style={{
                backgroundColor: activeFilter === tab ? COLORS.red : COLORS.surface,
                borderRadius: 20, paddingHorizontal: 18, paddingVertical: 9,
                borderWidth: 1, borderColor: activeFilter === tab ? COLORS.red : COLORS.border,
              }}
            >
              <Text style={{ color: activeFilter === tab ? '#FFF' : COLORS.muted, fontSize: 13, fontWeight: '600' }}>
                {tab}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </Animated.View>

      <FlatList
        testID="bookmarks-list"
        data={filteredBookmarks}
        keyExtractor={(item) => item.id}
        renderItem={renderBookmark}
        ListHeaderComponent={
          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            {/* Connect Sources section */}
            <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Filter size={22} color={COLORS.pin} strokeWidth={2} />
                <Text style={{ color: COLORS.pin, fontSize: 13, fontWeight: '700', letterSpacing: 1.7 }}>CONNECT SOURCES</Text>
              </View>
              <View style={{ gap: 8 }}>
                {sources.map((source) => (
                  <View key={source.id} style={{
                    flexDirection: 'row', alignItems: 'center',
                    backgroundColor: COLORS.surface, borderRadius: 12,
                    borderWidth: 1, borderColor: COLORS.border,
                    padding: 16, gap: 12,
                  }}>
                    <SourceIcon platform={source.platform} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: COLORS.textLight, fontSize: 15, fontWeight: '600' }}>{source.name}</Text>
                      {source.connected && source.bookmarkCount != null ? (
                        <Text style={{ color: COLORS.muted, fontSize: 13, marginTop: 2 }}>{source.bookmarkCount.toLocaleString()} bookmarks</Text>
                      ) : (
                        <Text style={{ color: COLORS.muted, fontSize: 13, marginTop: 2 }}>Not connected</Text>
                      )}
                    </View>
                    {source.platform === 'browser' ? (
                      <Pressable
                        testID={`import-json-${source.id}`}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setImportFileModalVisible(true);
                        }}
                        style={({ pressed }) => ({
                          backgroundColor: pressed ? '#1A3A6B' : '#1E40AF22',
                          borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
                          borderWidth: 1, borderColor: '#2563EB55',
                        })}
                      >
                        <Text style={{ color: '#3B82F6', fontSize: 13, fontWeight: '700' }}>Import JSON</Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        testID={`connect-source-${source.id}`}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setConnectModalSource(source);
                        }}
                        style={({ pressed }) => ({
                          backgroundColor: pressed ? '#9B1530' : COLORS.red,
                          borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
                          opacity: pressed ? 0.85 : 1,
                        })}
                      >
                        <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>Connect</Text>
                      </Pressable>
                    )}
                  </View>
                ))}
              </View>
            </View>

            {/* Bookmarks section header */}
            <View style={{ paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Bookmark size={22} color={COLORS.pin} strokeWidth={2} />
                <Text style={{ color: COLORS.pin, fontSize: 13, fontWeight: '700', letterSpacing: 1.7 }}>IMPORTED BOOKMARKS</Text>
              </View>
              <Text style={{ color: COLORS.muted, fontSize: 13 }}>{filteredBookmarks.length} items</Text>
            </View>
          </Animated.View>
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 32 }}>
            <Bookmark size={40} color={COLORS.muted} strokeWidth={1.5} />
            <Text style={{ color: COLORS.muted, fontSize: 15, fontWeight: '600', marginTop: 12, textAlign: 'center' }}>No bookmarks found</Text>
            <Text style={{ color: COLORS.muted, fontSize: 13, marginTop: 6, textAlign: 'center' }}>Try a different filter or search term</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        windowSize={10}
        removeClippedSubviews={true}
      />

      {/* Import from File button (bottom) */}
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingHorizontal: 16, paddingBottom: 30, paddingTop: 12,
        backgroundColor: COLORS.background,
        borderTopWidth: 1, borderTopColor: COLORS.border,
      }}>
        <Pressable
          testID="import-file-button"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setImportFileModalVisible(true);
          }}
          style={({ pressed }) => ({
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
            backgroundColor: pressed ? '#9B1530' : COLORS.red,
            borderRadius: 14, padding: 16,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Plus size={26} color="#FFF" strokeWidth={2.5} />
          <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 }}>Import from File</Text>
        </Pressable>
      </View>

      {/* Toast */}
      {toastMessage ? (
        <Animated.View
          entering={FadeInDown.duration(300)}
          exiting={FadeOut.duration(300)}
          style={{
            position: 'absolute', bottom: 110, left: 20, right: 20,
            backgroundColor: COLORS.surface, borderRadius: 12, padding: 14,
            borderWidth: 1, borderColor: COLORS.border,
            borderLeftWidth: 3, borderLeftColor: COLORS.pin,
            shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
            flexDirection: 'row', alignItems: 'center', gap: 10,
          }}
        >
          <Check size={16} color={COLORS.pin} strokeWidth={2.5} />
          <Text style={{ color: COLORS.textLight, fontSize: 14, fontWeight: '600', flex: 1 }}>{toastMessage}</Text>
        </Animated.View>
      ) : null}

      {/* Connect Source Modal */}
      <Modal
        visible={connectModalSource !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setConnectModalSource(null)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' }}
          onPress={() => setConnectModalSource(null)}
        >
          <Pressable
            style={{
              backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
              padding: 24, borderWidth: 1, borderColor: COLORS.border, borderBottomWidth: 0,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            {connectModalSource != null ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <SourceIcon platform={connectModalSource.platform} />
                  <View>
                    <Text style={{ color: COLORS.textLight, fontSize: 18, fontWeight: '800' }}>
                      {connectModalSource.name}
                    </Text>
                    <Text style={{ color: COLORS.muted, fontSize: 13, marginTop: 2 }}>Import Instructions</Text>
                  </View>
                </View>
                <View style={{ gap: 10, marginBottom: 24 }}>
                  {[
                    `Go to ${connectModalSource.name} on web`,
                    'Navigate to your bookmarks or saved items',
                    'Export your bookmarks as JSON or CSV',
                    "Tap 'Import File' below to add them",
                  ].map((step, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                      <View style={{
                        width: 24, height: 24, borderRadius: 12,
                        backgroundColor: COLORS.red + '33', borderWidth: 1, borderColor: COLORS.red + '55',
                        alignItems: 'center', justifyContent: 'center', marginTop: 1,
                      }}>
                        <Text style={{ color: COLORS.red, fontSize: 12, fontWeight: '800' }}>{i + 1}</Text>
                      </View>
                      <Text style={{ color: COLORS.textLight, fontSize: 14, lineHeight: 22, flex: 1 }}>{step}</Text>
                    </View>
                  ))}
                </View>
                <View style={{ gap: 10 }}>
                  <Pressable
                    testID="connect-modal-import-button"
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setConnectModalSource(null);
                      setImportFileModalVisible(true);
                    }}
                    style={({ pressed }) => ({
                      backgroundColor: pressed ? '#9B1530' : COLORS.red,
                      borderRadius: 12, padding: 15, alignItems: 'center',
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800' }}>Import File</Text>
                  </Pressable>
                  <Pressable
                    testID="connect-modal-dismiss-button"
                    onPress={() => setConnectModalSource(null)}
                    style={{ padding: 12, alignItems: 'center' }}
                  >
                    <Text style={{ color: COLORS.muted, fontSize: 14, fontWeight: '600' }}>Dismiss</Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Add to Investigation Modal */}
      <Modal
        visible={addToInvestigationBookmark !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setAddToInvestigationBookmark(null)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' }}
          onPress={() => setAddToInvestigationBookmark(null)}
        >
          <Pressable
            style={{
              backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
              padding: 24, borderWidth: 1, borderColor: COLORS.border, borderBottomWidth: 0,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={{ color: COLORS.textLight, fontSize: 18, fontWeight: '800', marginBottom: 6 }}>
              Add to Investigation
            </Text>
            {addToInvestigationBookmark != null ? (
              <Text style={{ color: COLORS.muted, fontSize: 13, marginBottom: 20, lineHeight: 18 }} numberOfLines={2}>
                {addToInvestigationBookmark.title}
              </Text>
            ) : null}

            {/* Add Mode Toggle */}
            <View style={{ flexDirection: 'row', gap: 0, marginBottom: 20, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border }}>
              {(['link', 'note'] as const).map((mode) => (
                <Pressable
                  key={mode}
                  testID={`add-mode-${mode}`}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setAddMode(mode);
                  }}
                  style={{
                    flex: 1, padding: 12, alignItems: 'center',
                    backgroundColor: addMode === mode ? COLORS.red : 'transparent',
                  }}
                >
                  <Text style={{ color: addMode === mode ? '#FFF' : COLORS.muted, fontSize: 14, fontWeight: '700' }}>
                    {mode === 'link' ? 'Add as Link' : 'Add as Note'}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Investigation picker */}
            <Text style={{ color: COLORS.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1.2, marginBottom: 10 }}>
              SELECT INVESTIGATION
            </Text>
            <View style={{ gap: 8, marginBottom: 24 }}>
              {MOCK_INVESTIGATIONS.map((inv) => (
                <Pressable
                  key={inv}
                  testID={`investigation-${inv.toLowerCase().replace(/\s+/g, '-')}`}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedInvestigation(inv);
                  }}
                  style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    backgroundColor: selectedInvestigation === inv ? COLORS.red + '22' : COLORS.background,
                    borderRadius: 10, padding: 14,
                    borderWidth: 1, borderColor: selectedInvestigation === inv ? COLORS.red + '66' : COLORS.border,
                  }}
                >
                  <Text style={{ color: selectedInvestigation === inv ? COLORS.textLight : COLORS.muted, fontSize: 14, fontWeight: '600' }}>
                    {inv}
                  </Text>
                  {selectedInvestigation === inv ? (
                    <Check size={16} color={COLORS.red} strokeWidth={2.5} />
                  ) : null}
                </Pressable>
              ))}
            </View>

            <Pressable
              testID="confirm-add-to-investigation-button"
              onPress={handleAddToInvestigation}
              style={({ pressed }) => ({
                backgroundColor: pressed ? '#9B1530' : COLORS.red,
                borderRadius: 12, padding: 15, alignItems: 'center',
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800' }}>Confirm</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Import File Instructions Modal */}
      <Modal
        visible={importFileModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setImportFileModalVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' }}
          onPress={() => setImportFileModalVisible(false)}
        >
          <Pressable
            style={{
              backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
              padding: 24, borderWidth: 1, borderColor: COLORS.border, borderBottomWidth: 0,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.red + '22', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.red + '55' }}>
                <FileText size={20} color={COLORS.red} strokeWidth={2} />
              </View>
              <View>
                <Text style={{ color: COLORS.textLight, fontSize: 18, fontWeight: '800' }}>Import Bookmarks</Text>
                <Text style={{ color: COLORS.muted, fontSize: 13, marginTop: 2 }}>Supported formats: JSON, CSV, HTML</Text>
              </View>
            </View>
            <View style={{ gap: 10, marginBottom: 24 }}>
              {[
                'Export bookmarks from your browser or app',
                'Supported: Chrome, Firefox, Safari, Pocket',
                'Tap the button below to select your export file',
                'We\'ll parse and import all bookmarks automatically',
              ].map((step, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  <View style={{
                    width: 24, height: 24, borderRadius: 12,
                    backgroundColor: COLORS.pin + '33', borderWidth: 1, borderColor: COLORS.pin + '55',
                    alignItems: 'center', justifyContent: 'center', marginTop: 1,
                  }}>
                    <Text style={{ color: COLORS.pin, fontSize: 12, fontWeight: '800' }}>{i + 1}</Text>
                  </View>
                  <Text style={{ color: COLORS.textLight, fontSize: 14, lineHeight: 22, flex: 1 }}>{step}</Text>
                </View>
              ))}
            </View>
            <View style={{ gap: 10 }}>
              <Pressable
                testID="select-file-button"
                onPress={async () => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  try {
                    const result = await DocumentPicker.getDocumentAsync({
                      type: ['text/html', 'application/octet-stream', '*/*'],
                      copyToCacheDirectory: true,
                    });
                    if (result.canceled) return;
                    const asset = result.assets[0];
                    const html = await fetch(asset.uri).then((r) => r.text());
                    const parsed = parseBrowserBookmarks(html);
                    if (parsed.length === 0) {
                      setImportFileModalVisible(false);
                      showToast('No bookmarks found in file. Make sure it\'s a browser bookmark HTML export.');
                      return;
                    }
                    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    const newBookmarks: BookmarkItem[] = parsed.map((b) => ({
                      id: String(Date.now()) + Math.random().toString(36).slice(2),
                      title: b.title,
                      domain: extractDomain(b.url),
                      dateImported: today,
                      category: guessCategory(b.url),
                      platform: 'browser' as const,
                    }));
                    setBookmarks((prev) => [...newBookmarks, ...prev]);
                    setImportFileModalVisible(false);
                    showToast(`Imported ${parsed.length} bookmarks`);
                  } catch (err) {
                    setImportFileModalVisible(false);
                    showToast('Failed to read file. Please try again.');
                  }
                }}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? '#9B1530' : COLORS.red,
                  borderRadius: 12, padding: 15, alignItems: 'center',
                  flexDirection: 'row', justifyContent: 'center', gap: 8,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Plus size={22} color="#FFF" strokeWidth={2.5} />
                <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800' }}>Select File</Text>
              </Pressable>
              <Pressable
                testID="import-modal-dismiss-button"
                onPress={() => setImportFileModalVisible(false)}
                style={{ padding: 12, alignItems: 'center' }}
              >
                <Text style={{ color: COLORS.muted, fontSize: 14, fontWeight: '600' }}>Dismiss</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        visible={deleteConfirmId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteConfirmId(null)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: '#00000088', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}
          onPress={() => setDeleteConfirmId(null)}
        >
          <Pressable
            style={{
              backgroundColor: COLORS.surface, borderRadius: 20,
              padding: 24, borderWidth: 1, borderColor: COLORS.border, width: '100%',
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={{ color: COLORS.textLight, fontSize: 18, fontWeight: '800', marginBottom: 8 }}>Remove Bookmark?</Text>
            <Text style={{ color: COLORS.muted, fontSize: 14, lineHeight: 20, marginBottom: 24 }}>
              This bookmark will be removed from your list. This action cannot be undone.
            </Text>
            <View style={{ gap: 10 }}>
              <Pressable
                testID="confirm-delete-button"
                onPress={() => deleteConfirmId !== null && handleDeleteBookmark(deleteConfirmId)}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? '#9B1530' : COLORS.red,
                  borderRadius: 12, padding: 14, alignItems: 'center',
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800' }}>Remove</Text>
              </Pressable>
              <Pressable
                testID="cancel-delete-button"
                onPress={() => setDeleteConfirmId(null)}
                style={{ padding: 12, alignItems: 'center' }}
              >
                <Text style={{ color: COLORS.muted, fontSize: 14, fontWeight: '600' }}>Cancel</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}


# mobile/src/app/(tabs)/collab-tab.tsx

import React, { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFonts, BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import {
  CourierPrime_400Regular,
  CourierPrime_700Bold,
} from '@expo-google-fonts/courier-prime';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import useCollabStore, { CollabSession } from '@/lib/state/collab-store';

const C = {
  bg: '#1A1614',
  surface: '#231F1C',
  surfaceAlt: '#2A2522',
  red: '#C41E3A',
  amber: '#D4A574',
  text: '#E8DCC8',
  muted: '#6B5B4F',
  border: '#3D332C',
} as const;

const SessionCard = React.memo(function SessionCard({ session, index }: { session: CollabSession; index: number }) {
  const memberCount = session.members?.length ?? 0;

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(300)}>
      <View
        testID={`collab-session-card-${session.id}`}
        style={{
          marginHorizontal: 16,
          marginBottom: 10,
          backgroundColor: C.surface,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: C.border,
          overflow: 'hidden',
          flexDirection: 'row',
        }}
      >
        {/* Accent bar */}
        <View style={{ width: 4, backgroundColor: C.red }} />

        <View style={{ flex: 1, padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <Text
              style={{
                flex: 1,
                color: C.text,
                fontSize: 16,
                fontWeight: '800',
                lineHeight: 20,
              }}
              numberOfLines={1}
            >
              {session.title}
            </Text>
            {session.pendingCount > 0 ? (
              <View
                style={{
                  backgroundColor: C.red,
                  borderRadius: 10,
                  minWidth: 22,
                  height: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 6,
                }}
              >
                <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '800' }}>
                  {session.pendingCount}
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>
            Investigation ID: {session.investigationId}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 }}>
            <View
              style={{
                backgroundColor: C.red + '22',
                borderRadius: 10,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderWidth: 1,
                borderColor: C.red + '44',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Text style={{ fontSize: 12 }}>👥</Text>
              <Text style={{ color: C.text, fontSize: 11, fontWeight: '700' }}>
                {memberCount} {memberCount === 1 ? 'member' : 'members'}
              </Text>
            </View>

            {session.pendingCount > 0 ? (
              <View
                style={{
                  backgroundColor: C.amber + '22',
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderWidth: 1,
                  borderColor: C.amber + '44',
                }}
              >
                <Text style={{ color: C.amber, fontSize: 11, fontWeight: '700' }}>
                  {session.pendingCount} pending
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </Animated.View>
  );
});

function EmptyState() {
  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
        paddingTop: 60,
      }}
    >
      <Text style={{ fontSize: 56, marginBottom: 16 }}>👥</Text>
      <Text
        style={{
          color: C.text,
          fontSize: 18,
          fontWeight: '800',
          marginBottom: 8,
          textAlign: 'center',
          letterSpacing: 0.5,
        }}
      >
        No active collaborations
      </Text>
      <Text
        style={{
          color: C.muted,
          fontSize: 13,
          lineHeight: 20,
          textAlign: 'center',
        }}
      >
        Start a collaboration from any investigation
      </Text>
    </Animated.View>
  );
}

export default function CollabTabScreen() {
  const router = useRouter();
  const sessions = useCollabStore((s) => s.sessions);
  const fetchSessions = useCollabStore((s) => s.fetchSessions);

  const [fontsLoaded] = useFonts({ BebasNeue_400Regular, CourierPrime_400Regular, CourierPrime_700Bold });

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const renderItem = ({ item, index }: { item: CollabSession; index: number }) => (
    <SessionCard session={item} index={index} />
  );

  const keyExtractor = (item: CollabSession) => item.id;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }} testID="collab-tab-screen">
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 14,
            borderBottomWidth: 1,
            borderBottomColor: C.border,
          }}
        >
          <Text
            style={{
              color: C.text,
              fontSize: 34,
              fontFamily: fontsLoaded ? 'BebasNeue_400Regular' : undefined,
              letterSpacing: 2,
              lineHeight: 36,
            }}
          >
            COLLABORATIONS
          </Text>
          <Text
            style={{
              color: C.muted,
              fontSize: 11,
              fontFamily: fontsLoaded ? 'CourierPrime_400Regular' : undefined,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              marginTop: 2,
            }}
          >
            shared investigations
          </Text>
        </View>

        {/* Sessions list */}
        <FlatList
          testID="collab-sessions-list"
          data={sessions}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={{
            paddingTop: 12,
            paddingBottom: 100,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
          windowSize={10}
          removeClippedSubviews={true}
          ListEmptyComponent={<EmptyState />}
        />

        {/* War Room button */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            paddingHorizontal: 20,
            paddingBottom: 20,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: C.border,
            backgroundColor: C.bg,
          }}
        >
          <Pressable
            testID="war-room-button"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/collab');
            }}
            style={({ pressed }) => ({
              backgroundColor: pressed ? '#A3162E' : C.red,
              borderRadius: 14,
              paddingVertical: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            })}
          >
            <Text style={{ fontSize: 18 }}>🚨</Text>
            <Text
              style={{
                color: '#FFF',
                fontSize: 15,
                fontWeight: '800',
                fontFamily: fontsLoaded ? 'CourierPrime_700Bold' : undefined,
                letterSpacing: 0.5,
              }}
            >
              War Room
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}


# mobile/src/app/(tabs)/index.tsx

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Plus,
  FileText,
  Cable,
  ChevronRight,
  Trash2,
  Search,
  Lock,
  Users,
  User,
  LogOut,
  HelpCircle,
  Play,
  Inbox,
  Mail,
  ScrollText,
  Radio,
  Menu,
  X,
  Mic,
  Tv,
  Podcast,
  Bell,
  Palette,
  Star,
  Rss,
  ChevronDown,
  Activity,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import WarRoomEntry from '@/components/WarRoomEntry';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
  SlideInDown,
  SlideOutDown,
  SlideInLeft,
  SlideOutLeft,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import useInvestigationStore from '@/lib/state/investigation-store';
import useSubscriptionStore from '@/lib/state/subscription-store';
import useCollabStore from '@/lib/state/collab-store';
import useTourStore from '@/lib/state/tour-store';
import { useSession } from '@/lib/auth/use-session';
import { useInvalidateSession } from '@/lib/auth/use-session';
import { authClient } from '@/lib/auth/auth-client';
import CollabSheet from '@/components/CollabSheet';
import TourOverlay from '@/components/TourOverlay';
import WhatsNewModal, { shouldShowWhatsNew, markWhatsNewSeen } from '@/components/WhatsNewModal';
import VideoOnboardingModal from '@/components/VideoOnboardingModal';
import { createDemoInvestigation } from '@/lib/demoData';
import type { Investigation } from '@/lib/types';
import type { CollabSession } from '@/lib/state/collab-store';
import useAppearanceStore from '@/lib/state/appearance-store';
import {
  useFonts,
  BebasNeue_400Regular,
} from '@expo-google-fonts/bebas-neue';
import {
  CourierPrime_400Regular,
  CourierPrime_700Bold,
} from '@expo-google-fonts/courier-prime';

const COLORS = {
  background: '#0F0D0B',
  surface: '#1A1714',
  surface2: '#211E1A',
  surface3: '#2A2520',
  card: '#F2E8D5',
  cardDark: '#E8D9BE',
  red: '#C41E3A',
  redDim: 'rgba(196,30,58,0.12)',
  pin: '#C8934A',
  gold: '#D4A832',
  text: '#EDE0CC',
  text2: '#C4B49A',
  muted: '#6B5D4F',
  border: '#272320',
  border2: '#322D28',
  cardText: '#1C1008',
  // Aliases for modal compatibility
  redDark: '#A3162E',
  textLight: '#EDE0CC',
  blue: '#3B82F6',
  green: '#22C55E',
} as const;

const SWIPE_THRESHOLD = 120;

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getBoardColor(inv: Investigation): string {
  if (inv.filingTabColor) return inv.filingTabColor;
  if (inv.boardStyle === 'mindmap') return COLORS.blue;
  if (inv.boardStyle === 'timeline') return '#F59E0B';
  if (inv.boardStyle === 'casefile') return '#14B8A6';
  return COLORS.red; // corkboard default
}

// ──────────────────────────────────────────────
// GRID CARD — new 3-col icon grid item
// ──────────────────────────────────────────────
function GridCard({
  investigation,
  index,
  cellSize,
  onPress,
  onLongPress,
}: {
  investigation: Investigation;
  index: number;
  cellSize: number;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const icon = (investigation as any).icon ?? '📁';
  const hasNotif = false;

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(300).springify()}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        style={({ pressed }) => ({
          width: cellSize,
          height: cellSize + 28,
          alignItems: 'center',
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.95 : 1 }],
        })}
      >
        <View
          style={{
            width: cellSize - 8,
            height: cellSize - 8,
            borderRadius: 18,
            backgroundColor: COLORS.surface2,
            borderWidth: 1,
            borderColor: COLORS.border2,
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.25,
            shadowRadius: 6,
            elevation: 4,
          }}
        >
          <View
            style={{
              position: 'absolute',
              top: -5,
              alignSelf: 'center',
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: COLORS.pin,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.4,
              shadowRadius: 2,
              elevation: 3,
            }}
          />
          {hasNotif ? (
            <View
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: COLORS.red,
                borderWidth: 1.5,
                borderColor: COLORS.background,
              }}
            />
          ) : null}
          <Text style={{ fontSize: 32 }}>{icon}</Text>
        </View>
        <Text
          numberOfLines={2}
          style={{
            color: COLORS.text2,
            fontSize: 11,
            fontWeight: '600',
            textAlign: 'center',
            marginTop: 6,
            lineHeight: 14,
            paddingHorizontal: 2,
          }}
        >
          {investigation.title}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// ──────────────────────────────────────────────
// SWIPE-DELETE CARD (kept for legacy renderItem)
// ──────────────────────────────────────────────
function InvestigationCard({
  investigation,
  index,
  collabSession,
  onPress,
  onLongPress,
  onCollabPress,
  onDelete,
}: {
  investigation: Investigation;
  index: number;
  collabSession: CollabSession | null;
  onPress: () => void;
  onLongPress: () => void;
  onCollabPress: () => void;
  onDelete: () => void;
}) {
  const nodeCount = investigation.nodes.length;
  const stringCount = (investigation.strings ?? []).length;
  const memberCount = collabSession?.members.length ?? 0;

  const translateX = useSharedValue(0);
  const isDeletingRef = useRef(false);

  const triggerDelete = useCallback(() => {
    if (!isDeletingRef.current) {
      isDeletingRef.current = true;
      onDelete();
    }
  }, [onDelete]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-15, 15])
    .onUpdate((e) => {
      if (e.translationX < 0) translateX.value = e.translationX;
    })
    .onEnd((e) => {
      if (e.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withTiming(-500, { duration: 250 }, () => runOnJS(triggerDelete)());
      } else {
        translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
    });

  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const trashRevealStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, -40, 0], [1, 0.6, 0], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(translateX.value, [-SWIPE_THRESHOLD, -40, 0], [1, 0.8, 0.6], Extrapolation.CLAMP) }],
  }));

  return (
    <View style={{ marginHorizontal: 16, marginBottom: 12 }}>
      <View
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: 70,
          borderRadius: 14,
          backgroundColor: 'rgba(196,30,58,0.12)',
          borderWidth: 1,
          borderColor: 'rgba(196,30,58,0.25)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Animated.View style={trashRevealStyle}>
          <Trash2 size={22} color={COLORS.red} strokeWidth={2} />
        </Animated.View>
      </View>

      <GestureDetector gesture={panGesture}>
        <Animated.View entering={FadeInDown.delay(index * 60).duration(350).springify()} style={cardAnimStyle}>
          <Pressable
            testID={`investigation-card-${investigation.id}`}
            onPress={onPress}
            onLongPress={onLongPress}
            style={({ pressed }) => ({
              backgroundColor: COLORS.card,
              borderRadius: 14,
              padding: 16,
              opacity: pressed ? 0.92 : 1,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.28,
              shadowRadius: 10,
              elevation: 5,
              transform: [{ scale: pressed ? 0.985 : 1 }],
              overflow: 'hidden',
            })}
          >
            <View
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: 4,
                backgroundColor: getBoardColor(investigation),
              }}
            />
            <View
              style={{
                position: 'absolute',
                top: -7,
                left: 24,
                width: 14,
                height: 14,
                borderRadius: 7,
                backgroundColor: COLORS.pin,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 2,
                elevation: 3,
                zIndex: 1,
              }}
            />
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={{ color: COLORS.cardText, fontSize: 17, fontWeight: '800', marginBottom: 3 }} numberOfLines={1}>
                  {investigation.title}
                </Text>
                {investigation.description ? (
                  <Text style={{ color: COLORS.muted, fontSize: 12, fontFamily: 'CourierPrime_400Regular', lineHeight: 17 }} numberOfLines={2}>
                    {investigation.description}
                  </Text>
                ) : null}
              </View>
              <ChevronRight size={20} color={COLORS.muted} strokeWidth={2} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <FileText size={15} color={COLORS.muted} strokeWidth={2} />
                <Text style={{ color: COLORS.muted, fontSize: 11, fontFamily: 'CourierPrime_400Regular' }}>
                  {nodeCount} nodes
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Cable size={15} color={COLORS.red} strokeWidth={2} />
                <Text style={{ color: COLORS.muted, fontSize: 11, fontFamily: 'CourierPrime_400Regular' }}>
                  {stringCount} strings
                </Text>
              </View>
              <View style={{ flex: 1 }} />
              {collabSession ? (
                <Pressable
                  testID={`collab-badge-${investigation.id}`}
                  onPress={(e) => { e.stopPropagation?.(); onCollabPress(); }}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    backgroundColor: pressed ? 'rgba(196,30,58,0.2)' : 'rgba(196,30,58,0.1)',
                    borderRadius: 7,
                    paddingHorizontal: 6,
                    paddingVertical: 3,
                    borderWidth: 1,
                    borderColor: 'rgba(196,30,58,0.3)',
                  })}
                >
                  <Users size={14} color={COLORS.red} strokeWidth={2.5} />
                  <Text style={{ color: COLORS.red, fontSize: 10, fontWeight: '700' }}>{memberCount}</Text>
                </Pressable>
              ) : null}
              <Text style={{ color: COLORS.muted, fontSize: 10, fontFamily: 'CourierPrime_400Regular' }}>
                {formatDate(investigation.updatedAt)}
              </Text>
            </View>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

function DemoCard({ onLaunch }: { onLaunch: () => void }) {
  return (
    <Animated.View entering={FadeInDown.duration(400).springify()} style={{ marginHorizontal: 16, marginBottom: 16 }}>
      <Pressable
        testID="demo-card"
        onPress={onLaunch}
        style={({ pressed }) => ({
          borderRadius: 14,
          padding: 16,
          opacity: pressed ? 0.92 : 1,
          backgroundColor: COLORS.surface,
          borderWidth: 1.5,
          borderColor: pressed ? COLORS.red : 'rgba(196,30,58,0.5)',
          shadowColor: COLORS.red,
          shadowOffset: { width: 0, height: 5 },
          shadowOpacity: pressed ? 0.35 : 0.18,
          shadowRadius: 10,
          elevation: 7,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        })}
      >
        <View style={{ position: 'absolute', top: 10, right: 12, backgroundColor: COLORS.red, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 }}>
          <Text style={{ color: '#FFF', fontSize: 9, fontWeight: '800', letterSpacing: 1, fontFamily: 'CourierPrime_700Bold' }}>DEMO</Text>
        </View>
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(196,30,58,0.12)', borderWidth: 1, borderColor: 'rgba(196,30,58,0.25)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
          <Play size={16} color={COLORS.red} strokeWidth={2} />
        </View>
        <Text style={{ color: COLORS.textLight, fontSize: 16, fontWeight: '700', marginBottom: 3 }}>
          Operation: Shadow Network
        </Text>
        <Text style={{ color: COLORS.muted, fontSize: 12, fontFamily: 'CourierPrime_400Regular', marginBottom: 12, lineHeight: 17 }}>
          Explore all features with a pre-loaded investigation
        </Text>
        <View style={{ backgroundColor: COLORS.red, borderRadius: 9, paddingVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 7 }}>
          <Play size={13} color="#FFF" strokeWidth={2.5} />
          <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700', letterSpacing: 0.3 }}>Launch Demo</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function EmptyState() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingBottom: 60 }}>
      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
        <Search size={32} color={COLORS.muted} strokeWidth={1.5} />
      </View>
      <Text style={{ color: COLORS.textLight, fontSize: 16, fontWeight: '600', textAlign: 'center', marginBottom: 7 }}>
        No investigations yet
      </Text>
      <Text style={{ color: COLORS.muted, fontSize: 12, fontFamily: 'CourierPrime_400Regular', textAlign: 'center', lineHeight: 18 }}>
        Every conspiracy begins with a single thread. Tap the button above to start your first investigation.
      </Text>
    </View>
  );
}

// ══════════════════════════════════════════════
// MAIN SCREEN
// ══════════════════════════════════════════════
export default function InvestigationsDashboard() {
  const router = useRouter();

  const { width: SCREEN_W } = useWindowDimensions();
  const CELL_SIZE = Math.floor((SCREEN_W - 44 - 16) / 3);

  const investigations = useInvestigationStore((s) => s.investigations);
  const createInvestigation = useInvestigationStore((s) => s.createInvestigation);
  const deleteInvestigation = useInvestigationStore((s) => s.deleteInvestigation);
  const restoreInvestigation = useInvestigationStore((s) => s.restoreInvestigation);
  const setActiveInvestigation = useInvestigationStore((s) => s.setActiveInvestigation);
  const addDemoInvestigation = useInvestigationStore((s) => s.addDemoInvestigation);
  const removeDemoInvestigation = useInvestigationStore((s) => s.removeDemoInvestigation);

  const tier = useSubscriptionStore((s) => s.tier);
  const maxInvestigationsCount = tier === 'plus' ? Infinity : tier === 'pro' ? 25 : 3;

  const sessions = useCollabStore((s) => s.sessions);

  const { data: session } = useSession();
  const invalidateSession = useInvalidateSession();

  const hasCompletedTour = useTourStore((s) => s.hasCompletedTour);
  const isDemoMode = useTourStore((s) => s.isDemoMode);
  const startTour = useTourStore((s) => s.startTour);
  const completeTour = useTourStore((s) => s.completeTour);
  const startTourFromStep = useTourStore((s) => s.startTourFromStep);
  const startDemoMode = useTourStore((s) => s.startDemoMode);
  const exitDemoMode = useTourStore((s) => s.exitDemoMode);
  const setSessionStart = useTourStore((s) => s.setSessionStart);
  const sessionStartedAt = useTourStore((s) => s.sessionStartedAt);

  const [showLimitModal, setShowLimitModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [showAccountModal, setShowAccountModal] = useState<boolean>(false);
  const [showHelpMenu, setShowHelpMenu] = useState<boolean>(false);
  const [showVideoOnboarding, setShowVideoOnboarding] = useState<boolean>(false);
  const [showWhatsNew, setShowWhatsNew] = useState<boolean>(false);
  const [showExitDemoConfirm, setShowExitDemoConfirm] = useState<boolean>(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetTitle, setDeleteTargetTitle] = useState<string>('');
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');
  const [isSigningOut, setIsSigningOut] = useState<boolean>(false);

  const [undoItem, setUndoItem] = useState<Investigation | null>(null);
  const [showUndoToast, setShowUndoToast] = useState<boolean>(false);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [collabSheetInvestigationId, setCollabSheetInvestigationId] = useState<string | null>(null);
  const [collabSheetVisible, setCollabSheetVisible] = useState<boolean>(false);

  // Menu state
  const [menuOpen, setMenuOpen] = useState(false);
  const menuAnim = useSharedValue(0);

  const openMenu = useCallback(() => {
    setMenuOpen(true);
    menuAnim.value = withSpring(1, { damping: 22, stiffness: 200 });
  }, [menuAnim]);

  const closeMenu = useCallback(() => {
    menuAnim.value = withTiming(0, { duration: 220 });
    setTimeout(() => setMenuOpen(false), 220);
  }, [menuAnim]);

  const menuOverlayStyle = useAnimatedStyle(() => ({
    opacity: menuAnim.value * 0.7,
  }));

  const menuPanelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(menuAnim.value, [0, 1], [-320, 0]) }],
  }));

  // Appearance prefs (kept for font loading side effect)
  const heroFont = useAppearanceStore((s) => s.heroFont);
  const themeMode = useAppearanceStore((s) => s.themeMode);
  const accentColor = useAppearanceStore((s) => s.accentColor);
  const corkIntensity = useAppearanceStore((s) => s.corkIntensity);
  const tapeColor = useAppearanceStore((s) => s.tapeColor);
  const pushpinColor = useAppearanceStore((s) => s.pushpinColor);
  const highlighterColor = useAppearanceStore((s) => s.highlighterColor);
  const fineLinkerColor = useAppearanceStore((s) => s.fineLinkerColor);

  // Font loading
  const [fontsLoaded] = useFonts({
    BebasNeue_400Regular,
    CourierPrime_400Regular,
    CourierPrime_700Bold,
  });

  useEffect(() => {
    if (!session?.user) return;
    if (!sessionStartedAt) {
      setSessionStart();
      return;
    }
    const secondsSinceStart = (Date.now() - sessionStartedAt) / 1000;
    if (!hasCompletedTour && secondsSinceStart < 60) {
      const timer = setTimeout(() => startTour(), 1200);
      return () => clearTimeout(timer);
    }
  }, [session?.user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    shouldShowWhatsNew().then((show) => {
      if (show) {
        const timer = setTimeout(() => {
          setShowWhatsNew(true);
          markWhatsNewSeen();
        }, 2000);
        return () => clearTimeout(timer);
      }
    });
  }, []);

  const sortedInvestigations = React.useMemo(
    () => [...investigations].filter((inv) => !inv.isDemo).sort((a, b) => b.updatedAt - a.updatedAt),
    [investigations]
  );

  const collabSessionMap = React.useMemo(() => {
    const map = new Map<string, CollabSession>();
    for (const s of sessions) map.set(s.investigationId, s);
    return map;
  }, [sessions]);

  const handleNewInvestigationPress = useCallback(() => {
    const nonDemoCount = investigations.filter((inv) => !inv.isDemo).length;
    if (nonDemoCount >= maxInvestigationsCount) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setShowLimitModal(true);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/new-case');
  }, [investigations, maxInvestigationsCount, router]);

  const handleCardPress = useCallback(
    (id: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setActiveInvestigation(id);
      router.push('/(tabs)/two');
    },
    [setActiveInvestigation, router]
  );

  const handleCardLongPress = useCallback((id: string, title: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setDeleteTargetId(id);
    setDeleteTargetTitle(title);
    setShowDeleteModal(true);
  }, []);

  const handleDelete = useCallback(() => {
    if (!deleteTargetId) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    deleteInvestigation(deleteTargetId);
    setDeleteTargetId(null);
    setDeleteTargetTitle('');
    setShowDeleteModal(false);
  }, [deleteTargetId, deleteInvestigation]);

  const handleSwipeDelete = useCallback((investigation: Investigation) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    deleteInvestigation(investigation.id);
    setUndoItem(investigation);
    setShowUndoToast(true);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => {
      setShowUndoToast(false);
      setUndoItem(null);
    }, 4000);
  }, [deleteInvestigation]);

  const handleUndo = useCallback(() => {
    if (undoItem) {
      restoreInvestigation(undoItem);
      setUndoItem(null);
      setShowUndoToast(false);
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [undoItem, restoreInvestigation]);

  const handleCollabPress = useCallback((investigationId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCollabSheetInvestigationId(investigationId);
    setCollabSheetVisible(true);
  }, []);

  const handleSignOut = useCallback(async () => {
    setIsSigningOut(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await authClient.signOut();
      await invalidateSession();
      setShowAccountModal(false);
    } finally {
      setIsSigningOut(false);
    }
  }, [invalidateSession]);

  const handleLaunchDemo = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowHelpMenu(false);
    const demo = createDemoInvestigation();
    startDemoMode();
    addDemoInvestigation(demo);
    router.push('/(tabs)/two');
    setTimeout(() => startTourFromStep(5), 1000);
  }, [startDemoMode, addDemoInvestigation, router, startTourFromStep]);

  const handleExitDemo = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    exitDemoMode();
    removeDemoInvestigation();
    setShowExitDemoConfirm(false);
  }, [exitDemoMode, removeDemoInvestigation]);

  const renderItem = useCallback(
    ({ item, index }: { item: Investigation; index: number }) => (
      <InvestigationCard
        investigation={item}
        index={index}
        collabSession={collabSessionMap.get(item.id) ?? null}
        onPress={() => handleCardPress(item.id)}
        onLongPress={() => handleCardLongPress(item.id, item.title)}
        onCollabPress={() => handleCollabPress(item.id)}
        onDelete={() => handleSwipeDelete(item)}
      />
    ),
    [handleCardPress, handleCardLongPress, handleCollabPress, handleSwipeDelete, collabSessionMap]
  );

  const keyExtractor = useCallback((item: Investigation) => item.id, []);

  const tierLabel = tier === 'free' ? 'FREE' : tier === 'pro' ? 'PRO' : 'PLUS';
  const tierColor = tier === 'free' ? COLORS.muted : tier === 'pro' ? COLORS.pin : COLORS.gold;

  const activeCollabSession = collabSheetInvestigationId
    ? (collabSessionMap.get(collabSheetInvestigationId) ?? null)
    : null;

  const nonDemoInvestigationCount = investigations.filter((inv) => !inv.isDemo).length;

  const emailPrefix = session?.user?.email?.split('@')[0] ?? 'investigator';
  const avatarLetter = (session?.user?.email?.[0] ?? 'R').toUpperCase();

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }} testID="investigations-screen">

      {/* Demo Mode Banner */}
      {isDemoMode ? (
        <Pressable
          testID="demo-mode-banner"
          onPress={() => setShowExitDemoConfirm(true)}
          style={{ backgroundColor: COLORS.red, height: 36, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }}
        >
          <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 }}>
            DEMO MODE — This is sample data. Tap to exit.
          </Text>
        </Pressable>
      ) : null}

      <SafeAreaView style={{ flex: 1 }} edges={isDemoMode ? [] : ['top']}>

        {/* ── HEADER ── */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12,
          borderBottomWidth: 1, borderBottomColor: COLORS.border,
        }}>
          {/* Hamburger button */}
          <Pressable
            testID="hamburger-button"
            onPress={openMenu}
            style={({ pressed }) => ({
              width: 40, height: 40, borderRadius: 12,
              backgroundColor: pressed ? COLORS.surface2 : COLORS.surface,
              borderWidth: 1, borderColor: COLORS.border2,
              alignItems: 'center', justifyContent: 'center', marginRight: 12,
            })}
          >
            <View style={{ gap: 5 }}>
              <View style={{ width: 18, height: 2, borderRadius: 1, backgroundColor: COLORS.text }} />
              <View style={{ width: 14, height: 2, borderRadius: 1, backgroundColor: COLORS.red }} />
              <View style={{ width: 18, height: 2, borderRadius: 1, backgroundColor: COLORS.text }} />
            </View>
          </Pressable>

          {/* Brand title */}
          <View style={{ flex: 1 }}>
            <Text style={{
              color: COLORS.red, fontSize: 26, fontWeight: '900',
              letterSpacing: 3, lineHeight: 28,
            }}>
              RED STRING
            </Text>
            <Text style={{
              color: COLORS.muted, fontSize: 9,
              fontFamily: 'Courier New', letterSpacing: 2.5,
              textTransform: 'uppercase', marginTop: 1,
            }}>
              RESEARCH
            </Text>
          </View>

          {/* Avatar / account button */}
          <Pressable
            testID="account-button"
            onPress={() => setShowAccountModal(true)}
            style={({ pressed }) => ({
              width: 38, height: 38, borderRadius: 19,
              backgroundColor: pressed ? COLORS.surface2 : COLORS.surface,
              borderWidth: 1.5, borderColor: COLORS.border2,
              alignItems: 'center', justifyContent: 'center',
            })}
          >
            <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '800' }}>
              {session?.user?.name?.charAt(0)?.toUpperCase() ?? '?'}
            </Text>
          </Pressable>
        </View>

        {/* ── SCROLLABLE CONTENT ── */}
        <FlatList
          testID="investigations-list"
          data={sortedInvestigations}
          keyExtractor={keyExtractor}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          numColumns={3}
          columnWrapperStyle={{ gap: 8, paddingHorizontal: 22, marginBottom: 8 }}
          renderItem={({ item, index }) => (
            <GridCard
              investigation={item}
              index={index}
              cellSize={CELL_SIZE}
              onPress={() => handleCardPress(item.id)}
              onLongPress={() => handleCardLongPress(item.id, item.title)}
            />
          )}
          ListHeaderComponent={
            <View>
              {/* Hero card — most recent investigation */}
              {sortedInvestigations.length > 0 ? (
                <Pressable
                  onPress={() => handleCardPress(sortedInvestigations[0].id)}
                  style={({ pressed }) => ({
                    marginHorizontal: 20, marginTop: 16, marginBottom: 20,
                    backgroundColor: COLORS.card,
                    borderRadius: 20, overflow: 'hidden',
                    opacity: pressed ? 0.92 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.3, shadowRadius: 16, elevation: 10,
                  })}
                >
                  {/* Red tape strip top */}
                  <View style={{ height: 4, backgroundColor: COLORS.red, opacity: 0.8 }} />
                  {/* Gold pushpin */}
                  <View style={{
                    position: 'absolute', top: 10, left: 22,
                    width: 14, height: 14, borderRadius: 7,
                    backgroundColor: COLORS.pin,
                    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.4, shadowRadius: 3, elevation: 4,
                    zIndex: 2,
                  }} />
                  <View style={{ padding: 20, paddingTop: 24 }}>
                    {/* ACTIVE CASE label */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.red }} />
                      <Text style={{
                        color: COLORS.red, fontSize: 9, fontWeight: '800',
                        letterSpacing: 2.5, fontFamily: 'Courier New',
                      }}>
                        ACTIVE CASE
                      </Text>
                    </View>
                    {/* Investigation title */}
                    <Text style={{
                      color: COLORS.cardText, fontSize: 22, fontWeight: '900',
                      lineHeight: 26, marginBottom: 6,
                    }} numberOfLines={2}>
                      {sortedInvestigations[0].title}
                    </Text>
                    {sortedInvestigations[0].description ? (
                      <Text style={{
                        color: 'rgba(44,24,16,0.6)', fontSize: 12,
                        fontFamily: 'Courier New', lineHeight: 18, marginBottom: 12,
                      }} numberOfLines={2}>
                        {sortedInvestigations[0].description}
                      </Text>
                    ) : null}
                    {/* Stats pills */}
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {[
                        `${sortedInvestigations[0].nodes.length} nodes`,
                        `${(sortedInvestigations[0].strings ?? []).length} strings`,
                        formatDate(sortedInvestigations[0].updatedAt),
                      ].map(label => (
                        <View key={label} style={{
                          backgroundColor: 'rgba(44,24,16,0.08)',
                          borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
                          borderWidth: 1, borderColor: 'rgba(44,24,16,0.1)',
                        }}>
                          <Text style={{
                            color: 'rgba(44,24,16,0.55)', fontSize: 10,
                            fontWeight: '700', fontFamily: 'Courier New',
                          }}>
                            {label}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </Pressable>
              ) : null}

              {/* Section label above grid */}
              {sortedInvestigations.length > 0 ? (
                <View style={{
                  flexDirection: 'row', alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 22, marginBottom: 12,
                }}>
                  <Text style={{
                    color: COLORS.muted, fontSize: 9, fontWeight: '800',
                    letterSpacing: 2.5, fontFamily: 'Courier New',
                    textTransform: 'uppercase',
                  }}>
                    ALL CASES
                  </Text>
                  <Text style={{ color: COLORS.muted, fontSize: 10 }}>
                    {nonDemoInvestigationCount}/{maxInvestigationsCount === Infinity ? '∞' : maxInvestigationsCount}
                  </Text>
                </View>
              ) : null}
            </View>
          }
          ListFooterComponent={
            <View style={{ paddingHorizontal: 22, paddingTop: 8 }}>
              {/* + New Case cell */}
              <Pressable
                testID="new-investigation-button"
                onPress={handleNewInvestigationPress}
                style={({ pressed }) => ({
                  width: CELL_SIZE - 8,
                  height: CELL_SIZE - 8,
                  borderRadius: 18,
                  borderWidth: 1.5, borderStyle: 'dashed',
                  borderColor: pressed ? COLORS.red : COLORS.border2,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: pressed ? COLORS.redDim : 'transparent',
                })}
              >
                <Text style={{ color: COLORS.muted, fontSize: 28 }}>+</Text>
                <Text style={{
                  color: COLORS.muted, fontSize: 10, fontWeight: '600',
                  marginTop: 2, fontFamily: 'Courier New',
                }}>NEW</Text>
              </Pressable>
            </View>
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 }}>
              <Text style={{ fontSize: 48, marginBottom: 16 }}>🕵️</Text>
              <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: '800', marginBottom: 8, textAlign: 'center' }}>
                No cases yet
              </Text>
              <Text style={{ color: COLORS.muted, fontSize: 13, textAlign: 'center', lineHeight: 20 }}>
                Every conspiracy begins with a single thread.
              </Text>
            </View>
          }
        />
      </SafeAreaView>

      {/* ── HAMBURGER MENU OVERLAY ── */}
      {menuOpen ? (
        <>
          {/* Dim backdrop */}
          <Animated.View
            style={[{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000',
            }, menuOverlayStyle]}
          >
            <Pressable style={{ flex: 1 }} onPress={closeMenu} />
          </Animated.View>

          {/* Slide-in panel */}
          <Animated.View style={[{
            position: 'absolute', top: 0, left: 0, bottom: 0, width: 300,
            backgroundColor: COLORS.surface,
            borderRightWidth: 1, borderRightColor: COLORS.border2,
            shadowColor: '#000', shadowOffset: { width: 8, height: 0 },
            shadowOpacity: 0.5, shadowRadius: 20, elevation: 20,
          }, menuPanelStyle]}>
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
              {/* Menu header */}
              <View style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingHorizontal: 20, paddingVertical: 16,
                borderBottomWidth: 1, borderBottomColor: COLORS.border,
              }}>
                <Text style={{ color: COLORS.red, fontSize: 22, fontWeight: '900', letterSpacing: 2 }}>
                  RED STRING
                </Text>
                <Pressable onPress={closeMenu} style={{
                  width: 32, height: 32, borderRadius: 8,
                  backgroundColor: COLORS.surface2, alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ color: COLORS.muted, fontSize: 18 }}>✕</Text>
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ paddingBottom: 30 }}>

                  {/* SECTION: LIVE OPERATIONS */}
                  <Text style={{
                    color: COLORS.muted, fontSize: 9, fontWeight: '800', letterSpacing: 2.5,
                    fontFamily: 'Courier New', paddingHorizontal: 20,
                    marginTop: 20, marginBottom: 8,
                  }}>LIVE OPERATIONS</Text>

                  {[
                    { emoji: '📡', label: 'Start a Broadcast', sub: 'Go live', live: true,
                      onPress: () => { closeMenu(); router.push('/live-broadcast'); } },
                    { emoji: '🎥', label: 'War Room', sub: 'Video collaboration',
                      onPress: () => { closeMenu(); router.push('/war-room'); } },
                    { emoji: '👥', label: 'Collaborations', sub: 'Active sessions',
                      onPress: () => { closeMenu(); router.push('/collab'); } },
                  ].map(item => (
                    <Pressable key={item.label} onPress={item.onPress}
                      style={({ pressed }) => ({
                        flexDirection: 'row', alignItems: 'center', gap: 12,
                        paddingHorizontal: 20, paddingVertical: 13,
                        backgroundColor: pressed ? COLORS.surface2 : 'transparent',
                      })}
                    >
                      <View style={{
                        width: 36, height: 36, borderRadius: 10,
                        backgroundColor: COLORS.surface2,
                        borderWidth: 1, borderColor: COLORS.border2,
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Text style={{ fontSize: 18 }}>{item.emoji}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '700' }}>
                            {item.label}
                          </Text>
                          {item.live ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.red }} />
                              <Text style={{ color: COLORS.red, fontSize: 9, fontWeight: '800' }}>LIVE</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={{ color: COLORS.muted, fontSize: 11 }}>{item.sub}</Text>
                      </View>
                    </Pressable>
                  ))}

                  {/* SECTION: PODCASTS & CHANNELS */}
                  <Text style={{
                    color: COLORS.muted, fontSize: 9, fontWeight: '800', letterSpacing: 2.5,
                    fontFamily: 'Courier New', paddingHorizontal: 20,
                    marginTop: 20, marginBottom: 8,
                  }}>PODCASTS & CHANNELS</Text>

                  {[
                    { emoji: '🔴', label: 'Tucker Carlson Network', live: true },
                    { emoji: '🎙️', label: 'Candace Owens' },
                    { emoji: '🎙️', label: 'Baron Coleman' },
                    { emoji: '🏋️', label: 'Coach Colin' },
                    { emoji: '🎯', label: 'Ian Carroll' },
                    { emoji: '📺', label: 'Megyn Kelly' },
                    { emoji: '🎙️', label: 'The Charlie Kirk Show' },
                    { emoji: '🏛️', label: 'The White House' },
                    { emoji: '📰', label: 'Major News Outlets' },
                  ].map(item => (
                    <Pressable key={item.label}
                      onPress={() => {}}
                      style={({ pressed }) => ({
                        flexDirection: 'row', alignItems: 'center', gap: 12,
                        paddingHorizontal: 20, paddingVertical: 10,
                        backgroundColor: pressed ? COLORS.surface2 : 'transparent',
                      })}
                    >
                      <Text style={{ fontSize: 18, width: 30, textAlign: 'center' }}>{item.emoji}</Text>
                      <Text style={{ color: COLORS.text2, fontSize: 13, fontWeight: '600', flex: 1 }}>
                        {item.label}
                      </Text>
                      {item.live ? (
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.red }} />
                      ) : null}
                    </Pressable>
                  ))}

                  <Pressable
                    style={({ pressed }) => ({
                      flexDirection: 'row', alignItems: 'center', gap: 10,
                      paddingHorizontal: 20, paddingVertical: 10,
                      backgroundColor: pressed ? COLORS.surface2 : 'transparent',
                    })}
                  >
                    <Text style={{ fontSize: 16, width: 30, textAlign: 'center' }}>➕</Text>
                    <Text style={{ color: COLORS.muted, fontSize: 13, fontWeight: '600' }}>
                      Add Podcast or Channel
                    </Text>
                  </Pressable>

                  {/* SECTION: ACCOUNT & SETTINGS */}
                  <Text style={{
                    color: COLORS.muted, fontSize: 9, fontWeight: '800', letterSpacing: 2.5,
                    fontFamily: 'Courier New', paddingHorizontal: 20,
                    marginTop: 20, marginBottom: 8,
                  }}>ACCOUNT & SETTINGS</Text>

                  {[
                    { emoji: '👤', label: 'Profiles', sub: '2 signed in',
                      onPress: () => { closeMenu(); setShowAccountModal(true); } },
                    { emoji: '🔔', label: 'Notifications', sub: '',
                      onPress: () => {} },
                    { emoji: '🎨', label: 'Appearance', sub: 'Fonts, themes, colors',
                      onPress: () => { closeMenu(); router.push('/appearance'); } },
                    { emoji: '⭐', label: 'Subscription', sub: tierLabel,
                      onPress: () => { closeMenu(); router.push('/paywall'); } },
                  ].map(item => (
                    <Pressable key={item.label} onPress={item.onPress}
                      style={({ pressed }) => ({
                        flexDirection: 'row', alignItems: 'center', gap: 12,
                        paddingHorizontal: 20, paddingVertical: 13,
                        backgroundColor: pressed ? COLORS.surface2 : 'transparent',
                      })}
                    >
                      <View style={{
                        width: 36, height: 36, borderRadius: 10,
                        backgroundColor: COLORS.surface2,
                        borderWidth: 1, borderColor: COLORS.border2,
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Text style={{ fontSize: 18 }}>{item.emoji}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '700' }}>
                          {item.label}
                        </Text>
                        {item.sub ? (
                          <Text style={{ color: COLORS.muted, fontSize: 11 }}>{item.sub}</Text>
                        ) : null}
                      </View>
                    </Pressable>
                  ))}

                </View>
              </ScrollView>
            </SafeAreaView>
          </Animated.View>
        </>
      ) : null}

      {/* ── UNDO TOAST ── */}
      {showUndoToast ? (
        <Animated.View
          entering={SlideInDown.springify().damping(20)}
          exiting={SlideOutDown.duration(200)}
          style={{
            position: 'absolute', bottom: 90, left: 16, right: 16,
            backgroundColor: COLORS.surface, borderRadius: 14,
            borderWidth: 1, borderColor: COLORS.border,
            borderLeftWidth: 4, borderLeftColor: COLORS.red,
            flexDirection: 'row', alignItems: 'center',
            paddingVertical: 14, paddingHorizontal: 16,
            shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.35, shadowRadius: 12, elevation: 12,
          }}
          testID="undo-toast"
        >
          <Trash2 size={18} color={COLORS.red} strokeWidth={2} />
          <Text style={{
            flex: 1, color: COLORS.text, fontSize: 14, fontWeight: '600', marginLeft: 10,
          }}>Investigation deleted</Text>
          <Pressable
            testID="undo-button"
            onPress={handleUndo}
            style={({ pressed }) => ({
              backgroundColor: pressed ? 'rgba(200,147,74,0.2)' : 'rgba(200,147,74,0.12)',
              borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7,
              borderWidth: 1, borderColor: 'rgba(200,147,74,0.35)',
            })}
          >
            <Text style={{ color: COLORS.pin, fontSize: 13, fontWeight: '700' }}>Undo</Text>
          </Pressable>
        </Animated.View>
      ) : null}

      {/* ── HELP MENU MODAL ── */}
      <Modal visible={showHelpMenu} transparent animationType="fade" onRequestClose={() => setShowHelpMenu(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 }} onPress={() => setShowHelpMenu(false)}>
          <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 340, backgroundColor: COLORS.surface, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border }}>
            <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
              <Text style={{ color: COLORS.textLight, fontSize: 17, fontWeight: '800', letterSpacing: 0.3 }}>Help & Explore</Text>
            </View>
            <Pressable
              testID="help-start-tour"
              onPress={() => { setShowHelpMenu(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setTimeout(() => startTour(), 200); }}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 13, padding: 15, backgroundColor: pressed ? COLORS.border : 'transparent', borderBottomWidth: 1, borderBottomColor: COLORS.border })}
            >
              <View style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: 'rgba(196,30,58,0.12)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(196,30,58,0.25)' }}>
                <Play size={17} color={COLORS.red} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: COLORS.textLight, fontSize: 14, fontWeight: '700' }}>Take the Tour</Text>
                <Text style={{ color: COLORS.muted, fontSize: 11, marginTop: 1, fontFamily: 'CourierPrime_400Regular' }}>18-step guided walkthrough</Text>
              </View>
              {!hasCompletedTour ? (<View style={{ backgroundColor: COLORS.red, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 }}><Text style={{ color: '#FFF', fontSize: 9, fontWeight: '700' }}>NEW</Text></View>) : null}
            </Pressable>
            <Pressable
              testID="help-load-demo"
              onPress={handleLaunchDemo}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 13, padding: 15, backgroundColor: pressed ? COLORS.border : 'transparent', borderBottomWidth: 1, borderBottomColor: COLORS.border })}
            >
              <View style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: 'rgba(212,165,116,0.12)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(212,165,116,0.25)' }}>
                <Play size={17} color={COLORS.pin} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: COLORS.textLight, fontSize: 14, fontWeight: '700' }}>Load Demo Investigation</Text>
                <Text style={{ color: COLORS.muted, fontSize: 11, marginTop: 1, fontFamily: 'CourierPrime_400Regular' }}>15 nodes, 12 strings, full data</Text>
              </View>
            </Pressable>
            <Pressable
              testID="help-whats-new"
              onPress={() => { setShowHelpMenu(false); setTimeout(() => setShowWhatsNew(true), 200); }}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 13, padding: 15, backgroundColor: pressed ? COLORS.border : 'transparent' })}
            >
              <View style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: 'rgba(34,197,94,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)' }}>
                <Inbox size={17} color="#22C55E" strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: COLORS.textLight, fontSize: 14, fontWeight: '700' }}>What's New</Text>
                <Text style={{ color: COLORS.muted, fontSize: 11, marginTop: 1, fontFamily: 'CourierPrime_400Regular' }}>v2.0 — Bezier strings, timeline & more</Text>
              </View>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── EXIT DEMO CONFIRM ── */}
      <Modal visible={showExitDemoConfirm} transparent animationType="fade" onRequestClose={() => setShowExitDemoConfirm(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 }} onPress={() => setShowExitDemoConfirm(false)}>
          <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 360, backgroundColor: COLORS.surface, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: COLORS.border }}>
            <Text style={{ color: COLORS.textLight, fontSize: 17, fontWeight: '700', marginBottom: 10 }}>Exit Demo Mode?</Text>
            <Text style={{ color: COLORS.muted, fontSize: 13, lineHeight: 20, marginBottom: 22 }}>Your real investigations are safe. The demo data will be removed.</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable onPress={() => setShowExitDemoConfirm(false)} style={({ pressed }) => ({ flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center', backgroundColor: pressed ? COLORS.border : 'transparent', borderWidth: 1, borderColor: COLORS.border })}>
                <Text style={{ color: COLORS.muted, fontSize: 14, fontWeight: '600' }}>Cancel</Text>
              </Pressable>
              <Pressable testID="confirm-exit-demo-button" onPress={handleExitDemo} style={({ pressed }) => ({ flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center', backgroundColor: pressed ? COLORS.redDark : COLORS.red })}>
                <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700' }}>Exit Demo</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── ACCOUNT MODAL ── */}
      <Modal visible={showAccountModal} transparent animationType="fade" onRequestClose={() => setShowAccountModal(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 }} onPress={() => setShowAccountModal(false)}>
          <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 360, backgroundColor: COLORS.surface, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: COLORS.border }}>
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <LinearGradient colors={[COLORS.red, COLORS.redDark]} style={{ width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Text style={{ color: '#FFF', fontSize: 26, fontWeight: '800' }}>{avatarLetter}</Text>
              </LinearGradient>
              <Text style={{ color: COLORS.textLight, fontSize: 16, fontWeight: '700' }}>{session?.user?.name || 'Investigator'}</Text>
              <Text style={{ color: COLORS.muted, fontSize: 12, marginTop: 2, fontFamily: 'CourierPrime_400Regular' }}>{session?.user?.email || ''}</Text>
            </View>
            <View style={{ backgroundColor: tierColor + '15', borderRadius: 10, padding: 12, marginBottom: 20, borderWidth: 1, borderColor: tierColor + '33', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Text style={{ color: tierColor, fontSize: 12, fontWeight: '700', letterSpacing: 1 }}>{tierLabel} PLAN</Text>
              {tier === 'free' ? (
                <Pressable onPress={() => { setShowAccountModal(false); router.push('/paywall'); }}>
                  <Text style={{ color: COLORS.red, fontSize: 11, fontWeight: '600' }}>Upgrade</Text>
                </Pressable>
              ) : null}
            </View>
            <Pressable
              testID="sign-out-button"
              onPress={handleSignOut}
              disabled={isSigningOut}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: pressed ? 'rgba(196,30,58,0.15)' : 'rgba(196,30,58,0.08)', borderWidth: 1, borderColor: 'rgba(196,30,58,0.25)', opacity: isSigningOut ? 0.7 : 1 })}
            >
              <LogOut size={15} color={COLORS.red} strokeWidth={2} />
              <Text style={{ color: COLORS.red, fontSize: 14, fontWeight: '700' }}>{isSigningOut ? 'Signing out...' : 'Sign Out'}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── LIMIT MODAL ── */}
      <Modal visible={showLimitModal} transparent animationType="fade" onRequestClose={() => setShowLimitModal(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 }} onPress={() => setShowLimitModal(false)}>
          <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 400, backgroundColor: COLORS.surface, borderRadius: 20, padding: 28, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' }}>
            <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(196,30,58,0.14)', alignItems: 'center', justifyContent: 'center', marginBottom: 15 }}>
              <Lock size={22} color={COLORS.red} strokeWidth={2} />
            </View>
            <Text style={{ color: COLORS.textLight, fontSize: 18, fontWeight: '800', marginBottom: 8, textAlign: 'center' }}>Investigation Limit Reached</Text>
            <Text style={{ color: COLORS.muted, fontSize: 12, fontFamily: 'CourierPrime_400Regular', lineHeight: 19, marginBottom: 22, textAlign: 'center' }}>
              {tier === 'free' ? `Free accounts are limited to ${maxInvestigationsCount} investigations. Upgrade to Pro for up to 25, or Plus for unlimited.` : `You've reached the ${maxInvestigationsCount} investigation limit for your plan. Upgrade to Plus for unlimited investigations.`}
            </Text>
            <Pressable testID="upgrade-from-limit-button" onPress={() => { setShowLimitModal(false); router.push('/paywall'); }} style={({ pressed }) => ({ width: '100%', paddingVertical: 13, borderRadius: 12, alignItems: 'center', backgroundColor: pressed ? COLORS.redDark : COLORS.red, marginBottom: 11, shadowColor: COLORS.red, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 })}>
              <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '800' }}>Upgrade Now</Text>
            </Pressable>
            <Pressable testID="dismiss-limit-modal-button" onPress={() => setShowLimitModal(false)} style={({ pressed }) => ({ paddingVertical: 9, opacity: pressed ? 0.6 : 1 })}>
              <Text style={{ color: COLORS.muted, fontSize: 13 }}>Not now</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── DELETE MODAL ── */}
      <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 }} onPress={() => setShowDeleteModal(false)}>
          <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 400, backgroundColor: COLORS.surface, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: COLORS.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(196,30,58,0.13)', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={18} color={COLORS.red} strokeWidth={2} />
              </View>
              <Text style={{ color: COLORS.textLight, fontSize: 17, fontWeight: '800' }}>Delete Investigation</Text>
            </View>
            <Text style={{ color: COLORS.muted, fontSize: 12, fontFamily: 'CourierPrime_400Regular', lineHeight: 19, marginBottom: 22 }}>
              Are you sure you want to delete "{deleteTargetTitle}"? All nodes and connections will be permanently removed.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable testID="cancel-delete-button" onPress={() => { setDeleteTargetId(null); setDeleteTargetTitle(''); setShowDeleteModal(false); }} style={({ pressed }) => ({ flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center', backgroundColor: pressed ? COLORS.border : 'transparent', borderWidth: 1, borderColor: COLORS.border })}>
                <Text style={{ color: COLORS.muted, fontSize: 14, fontWeight: '600' }}>Cancel</Text>
              </Pressable>
              <Pressable testID="confirm-delete-button" onPress={handleDelete} style={({ pressed }) => ({ flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center', backgroundColor: pressed ? COLORS.redDark : COLORS.red })}>
                <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700' }}>Delete</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── COLLAB SHEET ── */}
      <CollabSheet
        investigationId={collabSheetInvestigationId ?? ''}
        session={activeCollabSession}
        visible={collabSheetVisible}
        onClose={() => setCollabSheetVisible(false)}
        currentUserId={session?.user?.id}
      />

      {/* ── TOUR OVERLAY ── */}
      <TourOverlay />

      {/* ── VIDEO ONBOARDING ── */}
      <VideoOnboardingModal
        visible={showVideoOnboarding}
        onClose={() => { setShowVideoOnboarding(false); completeTour(); }}
      />

      {/* ── WHAT'S NEW ── */}
      <WhatsNewModal visible={showWhatsNew} onClose={() => setShowWhatsNew(false)} />

    </View>
  );
}


# mobile/src/app/(tabs)/podcast.tsx

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  FlatList,
  Modal,
  ActivityIndicator,
  Platform,
  StyleSheet,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  Radio,
  Pin,
  Brain,
  Share2,
  Play,
  X,
  Activity,
  Hash,
  Plus,
  BookmarkCheck,
  CheckCircle2,
} from 'lucide-react-native';
import { api } from '@/lib/api/api';
import useInvestigationStore from '@/lib/state/investigation-store';

// ─── Colors ─────────────────────────────────────────────────────────────────
const C = {
  bg: '#1A1614',
  surface: '#231F1C',
  card: '#2C2420',
  red: '#C41E3A',
  pin: '#D4A574',
  textLight: '#E8DCC8',
  muted: '#6B5B4F',
  border: '#3D332C',
  cardText: '#2C1810',
  redDim: '#3D0A14',
};

// ─── Data ─────────────────────────────────────────────────────────────────────
const PODCAST_SHOWS = [
  {
    id: 'casefile',
    name: 'Casefile True Crime',
    description: "Anonymous Australian host covers real, often unsolved crimes.",
    category: 'True Crime',
    imageColor: '#8B1A1A',
    initials: 'CF',
  },
  {
    id: 'crimejunkie',
    name: 'Crime Junkie',
    description: "Ashley Flowers covers a new crime story every Monday.",
    category: 'True Crime',
    imageColor: '#1A3A8B',
    initials: 'CJ',
  },
  {
    id: 'intercepted',
    name: 'Intercepted',
    description: "The Intercept's weekly podcast on politics and national security.",
    category: 'Investigation',
    imageColor: '#1A5C2A',
    initials: 'IN',
  },
  {
    id: 'conspirituality',
    name: 'Conspirituality',
    description: "Examining the overlap between conspiracy theories and wellness culture.",
    category: 'Investigation',
    imageColor: '#4A1A8B',
    initials: 'CO',
  },
  {
    id: 'backyard',
    name: 'Your Own Backyard',
    description: "Chris Lambert investigates the disappearance of Kristin Smart.",
    category: 'Cold Case',
    imageColor: '#5C3A1A',
    initials: 'YB',
  },
];

interface Episode {
  id: string;
  showId: string;
  title: string;
  description: string;
  pubDate: string;
  duration: string;
  isNew?: boolean;
  url?: string;
}

const ALL_EPISODES: Episode[] = [
  // Casefile
  { id: 'cf1', showId: 'casefile', title: 'Case 301: The Beaumont Children', description: "On Australia Day 1966, three children vanished from Glenelg Beach. The Beaumont children case remains one of Australia's most haunting unsolved disappearances.", pubDate: '2024-12-15', duration: '58:22', isNew: true, url: 'https://casefile.com.au/episodes' },
  { id: 'cf2', showId: 'casefile', title: 'Case 299: The Grimes Sisters', description: "Two Chicago teenagers disappeared on New Year's Eve 1956. Their bodies were found weeks later under mysterious circumstances.", pubDate: '2024-12-01', duration: '51:44', isNew: true, url: 'https://casefile.com.au/episodes' },
  { id: 'cf3', showId: 'casefile', title: 'Case 297: Operation Yewtree', description: "A landmark investigation into institutional abuse by British celebrities and public figures that changed the landscape of UK justice.", pubDate: '2024-11-15', duration: '1:04:11', url: 'https://casefile.com.au/episodes' },
  { id: 'cf4', showId: 'casefile', title: 'Case 295: The Suffolk Strangler', description: "In late 2006, five women were found murdered near Ipswich, England. Police raced to catch a killer before more lives were lost.", pubDate: '2024-11-01', duration: '47:38', url: 'https://casefile.com.au/episodes' },
  // Crime Junkie
  { id: 'cj1', showId: 'crimejunkie', title: 'MURDERED: Alissa Turney', description: "For years, Michael Turney maintained his stepdaughter ran away. The truth was far darker — and it took her sister two decades to prove it.", pubDate: '2024-12-16', duration: '42:18', isNew: true, url: 'https://www.crimejunkiepodcast.com' },
  { id: 'cj2', showId: 'crimejunkie', title: 'MISSING: The Sodder Children', description: "On Christmas Eve 1945, five of the Sodder children disappeared during a house fire. Their parents never believed they died.", pubDate: '2024-12-09', duration: '38:55', isNew: true, url: 'https://www.crimejunkiepodcast.com' },
  { id: 'cj3', showId: 'crimejunkie', title: 'CONSPIRACY: The Zodiac Cipher', description: "New forensic analysis of the 340 cipher has researchers questioning everything we thought we knew about the Zodiac Killer's identity.", pubDate: '2024-12-02', duration: '44:07', url: 'https://www.crimejunkiepodcast.com' },
  { id: 'cj4', showId: 'crimejunkie', title: 'MURDERED: Hae Min Lee', description: "The case that captivated millions via Serial podcast — but what do the documents say that the podcast left out?", pubDate: '2024-11-25', duration: '51:02', url: 'https://www.crimejunkiepodcast.com' },
  // Intercepted
  { id: 'in1', showId: 'intercepted', title: "The NSA's Secret Surveillance Network", description: "New documents reveal a domestic surveillance apparatus far broader than what Edward Snowden exposed in 2013. Investigative reporter James Risen joins.", pubDate: '2024-12-18', duration: '1:02:44', isNew: true, url: 'https://theintercept.com/podcasts/intercepted' },
  { id: 'in2', showId: 'intercepted', title: 'Pentagon Black Budgets Exposed', description: "A leaked spreadsheet reveals $52 billion in classified programs the public has never heard of. What are they funding?", pubDate: '2024-12-11', duration: '55:30', isNew: true, url: 'https://theintercept.com/podcasts/intercepted' },
  { id: 'in3', showId: 'intercepted', title: "The CIA's Media Infiltration", description: "Operation Mockingbird never ended — it evolved. Former intelligence officers speak on the record about ongoing media relationships.", pubDate: '2024-12-04', duration: '48:22', url: 'https://theintercept.com/podcasts/intercepted' },
  { id: 'in4', showId: 'intercepted', title: 'Whistleblower Protection Is a Myth', description: "Daniel Ellsberg, Tom Drake, and John Kiriakou all faced prosecution. The system is designed to punish, not protect.", pubDate: '2024-11-27', duration: '1:08:15', url: 'https://theintercept.com/podcasts/intercepted' },
  // Conspirituality
  { id: 'co1', showId: 'conspirituality', title: 'The "Med Bed" Grift Targeting Veterans', description: "QAnon-adjacent wellness influencers are selling fake healing technology to desperate veterans. We trace the money.", pubDate: '2024-12-17', duration: '1:22:08', isNew: true, url: 'https://conspirituality.net' },
  { id: 'co2', showId: 'conspirituality', title: 'How Big Pharma Created Anti-Vax Culture', description: "The evidence is clear: the modern anti-vaccine movement has corporate fingerprints all over it. Follow the funding.", pubDate: '2024-12-10', duration: '1:15:44', isNew: true, url: 'https://conspirituality.net' },
  { id: 'co3', showId: 'conspirituality', title: 'Inside the MAHA-Industrial Complex', description: "Make America Healthy Again sounds good. But the movement's funding sources reveal a different agenda.", pubDate: '2024-12-03', duration: '1:18:22', url: 'https://conspirituality.net' },
  { id: 'co4', showId: 'conspirituality', title: "The Supplement Industry's Hidden Crimes", description: "Unregulated, often dangerous, and wildly profitable. The $50 billion supplement industry operates in a legal grey zone.", pubDate: '2024-11-26', duration: '58:50', url: 'https://conspirituality.net' },
  // Your Own Backyard
  { id: 'yb1', showId: 'backyard', title: 'Season 3 Ep 8: The Phone Call', description: "A newly discovered witness account changes the timeline of Kristin's last known movements. Was there a second vehicle?", pubDate: '2024-12-14', duration: '1:11:33', isNew: true, url: 'https://www.yourowbackyardpodcast.com' },
  { id: 'yb2', showId: 'backyard', title: 'Season 3 Ep 7: Campus Security Records', description: "Records obtained via FOIA reveal significant gaps in Cal Poly's security coverage on the night Kristin disappeared.", pubDate: '2024-11-30', duration: '1:04:22', url: 'https://www.yourowbackyardpodcast.com' },
  { id: 'yb3', showId: 'backyard', title: "Season 3 Ep 6: The Neighbor's Story", description: "A neighbor who has never spoken publicly comes forward with information that contradicts Paul Flores' alibi.", pubDate: '2024-11-16', duration: '58:44', url: 'https://www.yourowbackyardpodcast.com' },
  { id: 'yb4', showId: 'backyard', title: 'Season 3 Ep 5: DNA Evidence Revisited', description: "Independent forensic analysts review the DNA evidence that convicted Paul Flores. Their findings are disturbing.", pubDate: '2024-11-02', duration: '1:16:08', url: 'https://www.yourowbackyardpodcast.com' },
];

interface LiveItem {
  id: string;
  title: string;
  channel: string;
  isLive: boolean;
  scheduledTime?: string;
  viewers?: string;
  topic: string;
  url?: string;
}

interface Keyword {
  id: string;
  tag: string;
}

const LIVE_NOW: LiveItem[] = [
  { id: 'l1', title: 'Congressional Hearing — AI Surveillance & Civil Liberties', channel: 'C-SPAN', isLive: true, viewers: '14.2K', topic: 'Surveillance', url: 'https://www.c-span.org/networks/' },
  { id: 'l2', title: 'Press Conference: Classified Documents Release', channel: 'Reuters Live', isLive: true, viewers: '8.7K', topic: 'Intelligence', url: 'https://www.reuters.com/video/' },
  { id: 'l3', title: 'Breaking: FBI Director Senate Confirmation Hearing', channel: 'CSPAN2', isLive: true, viewers: '22.1K', topic: 'Justice', url: 'https://www.c-span.org/networks/' },
];

const SCHEDULED: LiveItem[] = [
  { id: 's1', title: 'Senate Intelligence Committee Briefing', channel: 'C-SPAN 2', isLive: false, scheduledTime: 'Today 3:00 PM', topic: 'Intel', url: 'https://www.c-span.org/networks/' },
  { id: 's2', title: 'Independent Journalist Panel: Leaks & Ethics', channel: 'Democracy Now', isLive: false, scheduledTime: 'Today 5:30 PM', topic: 'Media', url: 'https://www.democracynow.org/live' },
  { id: 's3', title: 'Whistleblower Protection Act Review', channel: 'PBS NewsHour', isLive: false, scheduledTime: 'Tomorrow 7:00 PM', topic: 'Law', url: 'https://www.pbs.org/newshour/live' },
  { id: 's4', title: 'FOIA Transparency Summit — Panel Discussion', channel: 'Lawfare', isLive: false, scheduledTime: 'Tomorrow 9:00 AM', topic: 'FOIA', url: 'https://www.lawfaremedia.org' },
];

const INITIAL_KEYWORDS: Keyword[] = [
  { id: 'k1', tag: 'operation_deepstate' },
  { id: 'k2', tag: 'whistleblower' },
  { id: 'k3', tag: 'classified' },
  { id: 'k4', tag: 'foia_request' },
  { id: 'k5', tag: 'surveillance' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getShowById(id: string) {
  return PODCAST_SHOWS.find(s => s.id === id);
}

function hasNewEpisodes(showId: string): boolean {
  return ALL_EPISODES.some(e => e.showId === showId && e.isNew);
}

// ─── Pulsing Dot ─────────────────────────────────────────────────────────────
function PulsingDot() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  React.useEffect(() => {
    scale.value = withRepeat(
      withSequence(withTiming(1.6, { duration: 700 }), withTiming(1, { duration: 700 })),
      -1,
      false
    );
    opacity.value = withRepeat(
      withSequence(withTiming(0.3, { duration: 700 }), withTiming(1, { duration: 700 })),
      -1,
      false
    );
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={styles.pulsingContainer}>
      <Animated.View style={[styles.pulsingRing, ringStyle]} />
      <View style={styles.pulsingCore} />
    </View>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ visible, message }: { visible: boolean; message: string }) {
  const translateY = useSharedValue(80);
  const opacityVal = useSharedValue(0);

  React.useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 20 });
      opacityVal.value = withTiming(1, { duration: 200 });
    } else {
      translateY.value = withTiming(80, { duration: 300 });
      opacityVal.value = withTiming(0, { duration: 300 });
    }
  }, [visible]);

  const toastStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacityVal.value,
  }));

  return (
    <Animated.View style={[styles.toast, toastStyle]}>
      <CheckCircle2 size={16} color={C.red} strokeWidth={2} />
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
}

// ─── AI Summary Modal ─────────────────────────────────────────────────────────
interface AISummaryModalProps {
  visible: boolean;
  episode: Episode | null;
  summary: string;
  loading: boolean;
  onClose: () => void;
  onPinAsEvidence: () => void;
}

function AISummaryModal({ visible, episode, summary, loading, onClose, onPinAsEvidence }: AISummaryModalProps) {
  if (!episode) return null;
  const show = getShowById(episode.showId);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.summarySheet}>
          <View style={styles.modalHandle} />
          {/* Header */}
          <View style={styles.summaryHeader}>
            <View style={styles.summaryHeaderLeft}>
              <View style={[styles.showAvatar, { backgroundColor: show?.imageColor ?? C.surface }]}>
                <Text style={styles.showAvatarText}>{show?.initials ?? '??'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryShowName} numberOfLines={1}>{show?.name ?? ''}</Text>
                <Text style={styles.summaryEpisodeTitle} numberOfLines={2}>{episode.title}</Text>
              </View>
            </View>
            <Pressable onPress={onClose} style={styles.summaryCloseBtn} hitSlop={8}>
              <X size={18} color={C.muted} strokeWidth={2} />
            </Pressable>
          </View>

          {/* AI Badge */}
          <View style={styles.aiBadgeRow}>
            <Brain size={13} color={C.red} strokeWidth={2} />
            <Text style={styles.aiBadgeText}>AI SUMMARY</Text>
          </View>

          {/* Content */}
          <ScrollView style={styles.summaryScrollArea} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={styles.summaryLoadingContainer}>
                <ActivityIndicator size="large" color={C.red} />
                <Text style={styles.summaryLoadingText}>Analyzing episode...</Text>
              </View>
            ) : (
              <Text style={styles.summaryText}>{summary}</Text>
            )}
          </ScrollView>

          {/* Actions */}
          {!loading && summary.length > 0 ? (
            <Pressable
              testID="pin-as-evidence-button"
              onPress={onPinAsEvidence}
              style={styles.pinEvidenceBtn}>
              <Pin size={16} color="#FFFFFF" strokeWidth={2} />
              <Text style={styles.pinEvidenceBtnText}>Pin as Evidence</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

// ─── Episode Card ─────────────────────────────────────────────────────────────
interface EpisodeCardProps {
  episode: Episode;
  onAddToBoard: (ep: Episode) => void;
  onAISummary: (ep: Episode) => void;
  onShare: (ep: Episode) => void;
  onPlay: (ep: Episode) => void;
}

function EpisodeCard({ episode, onAddToBoard, onAISummary, onShare, onPlay }: EpisodeCardProps) {
  const show = getShowById(episode.showId);
  const scale = useSharedValue(1);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSequence(withTiming(0.98, { duration: 80 }), withSpring(1));
  };

  return (
    <Animated.View style={[styles.episodeCard, cardStyle]}>
      <Pressable onPress={handlePress} style={styles.episodeCardInner}>
        {/* Top row: show avatar + meta */}
        <View style={styles.episodeTopRow}>
          <View style={[styles.showAvatarSmall, { backgroundColor: show?.imageColor ?? C.surface }]}>
            <Text style={styles.showAvatarSmallText}>{show?.initials ?? '??'}</Text>
          </View>
          <View style={styles.episodeMeta}>
            <Text style={styles.episodeShowLabel} numberOfLines={1}>{show?.name ?? ''}</Text>
            <View style={styles.episodeMetaRow}>
              <Text style={styles.episodeDate}>{formatDate(episode.pubDate)}</Text>
              <View style={styles.metaDot} />
              <Text style={styles.episodeDuration}>{episode.duration}</Text>
            </View>
          </View>
          {episode.isNew ? (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          ) : null}
        </View>

        {/* Title */}
        <Text style={styles.episodeTitle}>{episode.title}</Text>

        {/* Description */}
        <Text style={styles.episodeDesc} numberOfLines={2}>{episode.description}</Text>

        {/* Action row */}
        <View style={styles.episodeActions}>
          <Pressable
            testID={`add-board-${episode.id}`}
            onPress={() => onAddToBoard(episode)}
            style={styles.actionBtn}>
            <Pin size={20} color={C.pin} strokeWidth={2} />
            <Text style={styles.actionBtnText}>Add to Board</Text>
          </Pressable>

          <Pressable
            testID={`ai-summary-${episode.id}`}
            onPress={() => onAISummary(episode)}
            style={[styles.actionBtn, styles.actionBtnAI]}>
            <Brain size={20} color={C.red} strokeWidth={2} />
            <Text style={[styles.actionBtnText, { color: C.red }]}>AI Summary</Text>
          </Pressable>

          <Pressable
            testID={`share-${episode.id}`}
            onPress={() => onShare(episode)}
            style={styles.actionBtn}>
            <Share2 size={20} color={C.muted} strokeWidth={2} />
            <Text style={styles.actionBtnText}>Share</Text>
          </Pressable>

          <Pressable
            testID={`play-${episode.id}`}
            onPress={() => onPlay(episode)}
            style={styles.playBtn}>
            <Play size={13} color="#FFFFFF" fill="#FFFFFF" strokeWidth={0} />
            <Text style={styles.playBtnText}>Play</Text>
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Live Card ────────────────────────────────────────────────────────────────
function LiveCard({
  item,
  onPin,
  pinned,
}: {
  item: LiveItem;
  onPin: (id: string) => void;
  pinned: boolean;
}) {
  const handleOpen = () => {
    if (item.url) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Linking.openURL(item.url);
    }
  };

  return (
    <Pressable onPress={handleOpen} style={[styles.liveCard, item.isLive ? styles.liveCardActive : null]}>
      {item.isLive ? <View style={styles.liveCardGlow} /> : null}
      <View style={styles.liveCardContent}>
        <View style={styles.liveCardLeft}>
          {item.isLive ? (
            <View style={styles.liveIndicatorRow}>
              <PulsingDot />
              <Text style={styles.liveBadgeText}>LIVE</Text>
              <View style={styles.topicChip}>
                <Text style={styles.topicChipText}>{item.topic}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.scheduledIndicator}>
              <Activity size={12} color={C.pin} strokeWidth={2} />
              <Text style={styles.scheduledText}>{item.scheduledTime}</Text>
              <View style={[styles.topicChip, { borderColor: C.border }]}>
                <Text style={[styles.topicChipText, { color: C.muted }]}>{item.topic}</Text>
              </View>
            </View>
          )}
          <Text style={styles.liveTitle} numberOfLines={2}>{item.title}</Text>
          <View style={styles.liveChannelRow}>
            <Radio size={12} color={C.muted} strokeWidth={2} />
            <Text style={styles.liveChannelText}>{item.channel}</Text>
            {item.viewers ? (
              <Text style={styles.viewersText}>{item.viewers} watching</Text>
            ) : null}
          </View>
        </View>
        <Pressable
          testID={`pin-live-${item.id}`}
          onPress={() => onPin(item.id)}
          style={styles.pinButton}
          hitSlop={8}>
          {pinned ? (
            <BookmarkCheck size={22} color={C.pin} strokeWidth={2} />
          ) : (
            <Pin size={20} color={C.muted} strokeWidth={2} />
          )}
        </Pressable>
      </View>
    </Pressable>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PodcastScreen() {
  const [activeTab, setActiveTab] = useState<'podcasts' | 'live'>('podcasts');
  const [selectedShowId, setSelectedShowId] = useState<string | null>(null);
  const [pinnedLive, setPinnedLive] = useState<Set<string>>(new Set());
  const [keywords, setKeywords] = useState<Keyword[]>(INITIAL_KEYWORDS);

  // Toast
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // AI Summary
  const [summaryVisible, setSummaryVisible] = useState(false);
  const [summaryEpisode, setSummaryEpisode] = useState<Episode | null>(null);
  const [summaryText, setSummaryText] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Investigation store
  const addNode = useInvestigationStore(s => s.addNode);
  const activeInvestigationId = useInvestigationStore(s => s.activeInvestigationId);
  const createInvestigation = useInvestigationStore(s => s.createInvestigation);

  // Tab animation
  const tabIndicatorX = useSharedValue(0);
  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tabIndicatorX.value }],
  }));

  const switchTab = (tab: 'podcasts' | 'live') => {
    setActiveTab(tab);
    tabIndicatorX.value = withTiming(tab === 'podcasts' ? 0 : 1, { duration: 250 });
    Haptics.selectionAsync();
  };

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setToastVisible(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 2500);
  }, []);

  // Filtered episodes
  const displayedEpisodes = selectedShowId
    ? ALL_EPISODES.filter(e => e.showId === selectedShowId)
    : ALL_EPISODES;

  // Handlers
  const handleAddToBoard = useCallback((ep: Episode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const show = getShowById(ep.showId);
    let invId = activeInvestigationId;
    if (!invId) {
      invId = createInvestigation('My Investigation');
    }
    const randX = 100 + Math.random() * 200;
    const randY = 100 + Math.random() * 200;
    addNode(invId, 'note', ep.title, { x: randX, y: randY }, {
      description: `${show?.name ?? ''} — ${ep.pubDate}\n\n${ep.description}`,
    });
    showToast('Added to investigation board');
  }, [activeInvestigationId, addNode, createInvestigation, showToast]);

  const handleAISummary = useCallback(async (ep: Episode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSummaryEpisode(ep);
    setSummaryText('');
    setSummaryLoading(true);
    setSummaryVisible(true);

    try {
      const show = getShowById(ep.showId);
      const prompt = `Summarize this podcast episode in 2-3 short paragraphs for a researcher's investigation board. Focus on key facts, evidence, and investigative angles.\n\nShow: ${show?.name ?? ''}\nEpisode: ${ep.title}\nDescription: ${ep.description}`;
      const result = await api.post<{ reply?: string; message?: string; text?: string }>('/api/ai/chat', {
        message: prompt,
      });
      const text = (result as Record<string, string>)?.reply
        ?? (result as Record<string, string>)?.message
        ?? (result as Record<string, string>)?.text
        ?? 'Could not generate summary. Please try again.';
      setSummaryText(text);
    } catch {
      setSummaryText('Unable to generate summary. Check your connection and try again.');
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const handlePinSummaryAsEvidence = useCallback(() => {
    if (!summaryEpisode) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const show = getShowById(summaryEpisode.showId);
    let invId = activeInvestigationId;
    if (!invId) {
      invId = createInvestigation('My Investigation');
    }
    addNode(invId, 'note', `AI Summary: ${summaryEpisode.title}`, { x: 120, y: 120 }, {
      description: `${show?.name ?? ''}\n\n${summaryText}`,
    });
    setSummaryVisible(false);
    showToast('Summary pinned as evidence');
  }, [summaryEpisode, summaryText, activeInvestigationId, addNode, createInvestigation, showToast]);

  const handleShare = useCallback((ep: Episode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (ep.url) {
      import('react-native').then(({ Share }) => {
        Share.share({ message: `${ep.title} - ${ep.url}`, url: ep.url });
      });
    } else {
      showToast('Share link copied');
    }
  }, [showToast]);

  const handlePlay = useCallback((ep: Episode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (ep.url) {
      Linking.openURL(ep.url);
    } else {
      showToast(`Playing: ${ep.title}`);
    }
  }, [showToast]);

  const handlePinLive = useCallback((id: string) => {
    setPinnedLive(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        showToast('Added to investigation board');
      }
      return next;
    });
  }, [showToast]);

  const handleRemoveKeyword = (id: string) => {
    setKeywords(prev => prev.filter(k => k.id !== id));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* ── Header ──────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>LIVE & PODCASTS</Text>
            <Text style={styles.headerSubtitle}>RESEARCH FEED</Text>
          </View>
          <View style={styles.headerIcon}>
            <Radio size={28} color={C.red} strokeWidth={2} />
          </View>
        </View>

        {/* ── Tab Switcher ─────────────────────────────── */}
        <View style={styles.tabSwitcher}>
          <Pressable testID="tab-podcasts" style={styles.tabButton} onPress={() => switchTab('podcasts')}>
            <Text style={[styles.tabButtonText, activeTab === 'podcasts' && styles.tabButtonTextActive]}>
              Episodes
            </Text>
          </Pressable>
          <Pressable testID="tab-live" style={styles.tabButton} onPress={() => switchTab('live')}>
            <View style={styles.tabButtonLiveRow}>
              {activeTab === 'live' ? <PulsingDot /> : null}
              <Text style={[styles.tabButtonText, activeTab === 'live' && styles.tabButtonTextActive]}>
                Live Feed
              </Text>
            </View>
          </Pressable>
          <View style={styles.tabIndicatorTrack}>
            <Animated.View style={[styles.tabIndicator, indicatorStyle, { width: '50%' }]} />
          </View>
        </View>

        {/* ── Podcasts Tab ─────────────────────────────── */}
        {activeTab === 'podcasts' ? (
          <>
            {/* Show Selector */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0 }}
              contentContainerStyle={styles.showSelectorContent}>
              {/* "All" pill */}
              <Pressable
                testID="show-filter-all"
                onPress={() => {
                  setSelectedShowId(null);
                  Haptics.selectionAsync();
                }}
                style={[styles.showPill, selectedShowId === null && styles.showPillActive]}>
                <Text style={[styles.showPillText, selectedShowId === null && styles.showPillTextActive]}>
                  All
                </Text>
                <View style={[styles.showPillCount, selectedShowId === null && styles.showPillCountActive]}>
                  <Text style={[styles.showPillCountText, selectedShowId === null && styles.showPillCountTextActive]}>
                    {ALL_EPISODES.length}
                  </Text>
                </View>
              </Pressable>

              {PODCAST_SHOWS.map(show => {
                const isSelected = selectedShowId === show.id;
                const showHasNew = hasNewEpisodes(show.id);
                const count = ALL_EPISODES.filter(e => e.showId === show.id).length;
                return (
                  <Pressable
                    testID={`show-filter-${show.id}`}
                    key={show.id}
                    onPress={() => {
                      setSelectedShowId(isSelected ? null : show.id);
                      Haptics.selectionAsync();
                    }}
                    style={[styles.showPill, isSelected && styles.showPillActive]}>
                    <View style={[styles.showPillAvatar, { backgroundColor: show.imageColor }]}>
                      <Text style={styles.showPillAvatarText}>{show.initials}</Text>
                    </View>
                    <Text style={[styles.showPillText, isSelected && styles.showPillTextActive]} numberOfLines={1}>
                      {show.name}
                    </Text>
                    {showHasNew ? (
                      <View style={styles.showNewDot} />
                    ) : null}
                    <View style={[styles.showPillCount, isSelected && styles.showPillCountActive]}>
                      <Text style={[styles.showPillCountText, isSelected && styles.showPillCountTextActive]}>
                        {count}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Episode List */}
            <FlatList<Episode>
              testID="episodes-list"
              data={displayedEpisodes}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                <View style={styles.episodeListHeader}>
                  <Text style={styles.episodeListHeaderText}>
                    {selectedShowId
                      ? (getShowById(selectedShowId)?.name ?? '')
                      : 'All Episodes'}
                  </Text>
                  <Text style={styles.episodeListHeaderCount}>{displayedEpisodes.length} eps</Text>
                </View>
              }
              renderItem={({ item }) => (
                <EpisodeCard
                  episode={item}
                  onAddToBoard={handleAddToBoard}
                  onAISummary={handleAISummary}
                  onShare={handleShare}
                  onPlay={handlePlay}
                />
              )}
            />
          </>
        ) : (
          // ── Live Feed Tab ────────────────────────────────
          <ScrollView
            testID="live-feed-scroll"
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}>
            {/* Live Now */}
            <View style={styles.sectionHeader}>
              <PulsingDot />
              <Text style={styles.sectionTitle}>LIVE NOW</Text>
              <Text style={styles.liveCount}>{LIVE_NOW.length}</Text>
            </View>
            {LIVE_NOW.map(item => (
              <LiveCard key={item.id} item={item} onPin={handlePinLive} pinned={pinnedLive.has(item.id)} />
            ))}

            {/* Scheduled */}
            <View style={[styles.sectionHeader, { marginTop: 24 }]}>
              <Activity size={14} color={C.pin} strokeWidth={2} />
              <Text style={styles.sectionTitle}>SCHEDULED</Text>
            </View>
            {SCHEDULED.map(item => (
              <LiveCard key={item.id} item={item} onPin={handlePinLive} pinned={pinnedLive.has(item.id)} />
            ))}

            {/* Monitoring Keywords */}
            <View style={[styles.sectionHeader, { marginTop: 24 }]}>
              <Hash size={14} color={C.pin} strokeWidth={2} />
              <Text style={styles.sectionTitle}>MONITORING KEYWORDS</Text>
            </View>
            <View style={styles.keywordsCard}>
              <View style={styles.keywordsGrid}>
                {keywords.map(kw => (
                  <Pressable
                    key={kw.id}
                    testID={`keyword-${kw.id}`}
                    onLongPress={() => handleRemoveKeyword(kw.id)}
                    style={styles.keywordChip}>
                    <Hash size={16} color={C.red} strokeWidth={2.5} />
                    <Text style={styles.keywordChipText}>{kw.tag}</Text>
                  </Pressable>
                ))}
                <Pressable
                  testID="add-keyword-inline"
                  onPress={() => {
                    const tag = `keyword_${Date.now()}`;
                    setKeywords(prev => [...prev, { id: Date.now().toString(), tag }]);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={styles.keywordAddChip}>
                  <Plus size={16} color={C.muted} strokeWidth={2.5} />
                  <Text style={styles.keywordAddChipText}>Add</Text>
                </Pressable>
              </View>
              <Text style={styles.keywordHint}>Long-press to remove a keyword</Text>
            </View>
          </ScrollView>
        )}

        {/* ── Toast ───────────────────────────────────── */}
        <Toast visible={toastVisible} message={toastMessage} />

        {/* ── AI Summary Modal ────────────────────────── */}
        <AISummaryModal
          visible={summaryVisible}
          episode={summaryEpisode}
          summary={summaryText}
          loading={summaryLoading}
          onClose={() => setSummaryVisible(false)}
          onPinAsEvidence={handlePinSummaryAsEvidence}
        />
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  container: { flex: 1, backgroundColor: C.bg },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: C.red,
    letterSpacing: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: C.muted,
    letterSpacing: 3.2,
    marginTop: 1,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },

  // Tab Switcher
  tabSwitcher: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 12,
    backgroundColor: C.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    position: 'relative',
    overflow: 'hidden',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    zIndex: 2,
  },
  tabButtonLiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.muted,
    letterSpacing: 0.7,
  },
  tabButtonTextActive: { color: C.textLight },
  tabIndicatorTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: C.border,
  },
  tabIndicator: { height: 2, backgroundColor: C.red, borderRadius: 2 },

  // Show Selector
  showSelectorContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  showPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  showPillActive: {
    backgroundColor: C.redDim,
    borderColor: C.red,
  },
  showPillAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  showPillAvatarText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  showPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.muted,
    maxWidth: 110,
  },
  showPillTextActive: { color: C.textLight },
  showNewDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.red,
  },
  showPillCount: {
    backgroundColor: C.bg,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: C.border,
    minWidth: 20,
    alignItems: 'center',
  },
  showPillCountActive: {
    backgroundColor: C.red,
    borderColor: C.red,
  },
  showPillCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.muted,
  },
  showPillCountTextActive: { color: '#FFFFFF' },

  // Episode list header
  episodeListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  episodeListHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.muted,
    letterSpacing: 1.7,
    textTransform: 'uppercase',
  },
  episodeListHeaderCount: {
    fontSize: 12,
    fontWeight: '600',
    color: C.muted,
    backgroundColor: C.surface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },

  // List
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 120,
  },

  // Episode Card
  episodeCard: {
    marginBottom: 10,
    borderRadius: 16,
    overflow: 'hidden',
  },
  episodeCardInner: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    gap: 10,
  },
  episodeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  showAvatarSmall: {
    width: 40,
    height: 40,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  showAvatarSmallText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.7,
  },
  episodeMeta: { flex: 1, gap: 2 },
  episodeShowLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: C.muted,
    letterSpacing: 0.5,
  },
  episodeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  episodeDate: { fontSize: 11, color: C.muted, fontWeight: '500' },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: C.muted,
  },
  episodeDuration: { fontSize: 11, color: C.pin, fontWeight: '600' },
  newBadge: {
    backgroundColor: C.redDim,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.red,
  },
  newBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: C.red,
    letterSpacing: 1,
  },
  episodeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.textLight,
    lineHeight: 21,
    letterSpacing: 0.1,
  },
  episodeDesc: {
    fontSize: 14,
    color: C.muted,
    lineHeight: 18,
    letterSpacing: 0.1,
  },

  // Action Buttons
  episodeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 2,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.card,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  actionBtnAI: {
    backgroundColor: C.redDim,
    borderColor: C.red,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.muted,
    letterSpacing: 0.2,
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.red,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 10,
    marginLeft: 'auto',
  },
  playBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // Section headers (live tab)
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: C.muted,
    letterSpacing: 2,
    flex: 1,
  },
  liveCount: {
    fontSize: 11,
    fontWeight: '600',
    color: C.red,
    backgroundColor: C.redDim,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.red,
  },

  // Live Card
  liveCard: {
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 10,
    overflow: 'hidden',
  },
  liveCardActive: { borderColor: C.red },
  liveCardGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: C.red,
  },
  liveCardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    gap: 12,
  },
  liveCardLeft: { flex: 1, gap: 7 },
  liveIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: C.red,
    letterSpacing: 2,
  },
  topicChip: {
    backgroundColor: C.redDim,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: C.red,
  },
  topicChipText: {
    fontSize: 9,
    fontWeight: '700',
    color: C.red,
    letterSpacing: 0.5,
  },
  scheduledIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  scheduledText: {
    fontSize: 11,
    fontWeight: '600',
    color: C.pin,
    letterSpacing: 0.5,
  },
  liveTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.textLight,
    lineHeight: 20,
    letterSpacing: 0.2,
  },
  liveChannelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveChannelText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.muted,
  },
  viewersText: {
    fontSize: 11,
    color: C.muted,
    marginLeft: 4,
  },
  pinButton: { padding: 2, flexShrink: 0 },

  // Keywords
  keywordsCard: {
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    gap: 12,
  },
  keywordsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  keywordChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.redDim,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.red,
  },
  keywordChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.red,
    letterSpacing: 0.3,
  },
  keywordAddChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.bg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    borderStyle: 'dashed',
  },
  keywordAddChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.muted,
  },
  keywordHint: {
    fontSize: 12,
    color: C.muted,
    fontStyle: 'italic',
    letterSpacing: 0.3,
  },

  // Toast
  toast: {
    position: 'absolute',
    bottom: 90,
    left: 20,
    right: 20,
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  toastText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textLight,
    flex: 1,
    letterSpacing: 0.2,
  },

  // AI Summary Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  summarySheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: C.border,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 48 : 28,
    maxHeight: '82%',
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: C.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  summaryHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  showAvatar: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  showAvatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  summaryShowName: {
    fontSize: 11,
    fontWeight: '600',
    color: C.muted,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  summaryEpisodeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.textLight,
    lineHeight: 20,
  },
  summaryCloseBtn: {
    padding: 4,
    marginTop: 2,
  },
  aiBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: C.red,
    letterSpacing: 2,
  },
  summaryScrollArea: {
    maxHeight: 280,
    marginBottom: 16,
  },
  summaryLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 14,
  },
  summaryLoadingText: {
    fontSize: 13,
    color: C.muted,
    letterSpacing: 0.5,
  },
  summaryText: {
    fontSize: 14,
    color: C.textLight,
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  pinEvidenceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.red,
    paddingVertical: 14,
    borderRadius: 12,
  },
  pinEvidenceBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // Pulsing Dot
  pulsingContainer: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulsingRing: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: C.red,
    opacity: 0.4,
  },
  pulsingCore: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.red,
  },
});


# mobile/src/app/(tabs)/prompt-history.tsx

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Copy, ClipboardList, CheckCheck } from 'lucide-react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
} from 'react-native-reanimated';

const COLORS = {
  background: '#1A1614',
  surface: '#231F1C',
  card: '#2A2320',
  red: '#C41E3A',
  pin: '#D4A574',
  textLight: '#F5ECD7',
  muted: '#6B5B4F',
  border: '#3D332C',
  accent: '#8B6A4F',
  success: '#4A7C59',
} as const;

const PROMPTS: { id: number; text: string }[] = [
  {
    id: 1,
    text: 'Build unified Visual Investigation Canvas — single canvas combining node-based web structure, red string connections between nodes, and corkboard aesthetic. Not separate graph and corkboard modes.',
  },
  {
    id: 2,
    text: "Can u try the last prompt again i think you got stuck",
  },
  {
    id: 3,
    text: "What is the payment structure and pricing? How do i test it and what are my financial responsibilities for publishing, operation and maintenance of the app?",
  },
  {
    id: 4,
    text: "I don't have any other associated costs? When do i receive payment when someone subscribes? How does that work? Id like to increase the cost a bit… but i want to stay competitive… im curious as to how that works",
  },
  {
    id: 5,
    text: "Yes, please provide me a detailed list of features with a short description of each followed by a list of any suggestions to improve the apps functionality, visual appeal, ease of use for user. I want it ALL",
  },
  {
    id: 6,
    text: "I love every single feature you listed!!!!! I'm so hype! Yes to ALL of it! Is this really possible!? Wow. I love the ai being able to do deep research for and with the user, i want the ai to sound natural…",
  },
  {
    id: 7,
    text: "WOW. Yesss to ALL of it! Broadcasting in app!? Could it be broadcast via youtube even though i'm in app?! The interactive ai board that zooms to the info for me in real time? I'm literally speechless…",
  },
  {
    id: 8,
    text: "I like the idea of there being suggestions for color coding as you suggested",
  },
  {
    id: 9,
    text: "Any info i pull into my investigation, i'd like to ensure credit is given to wherever i got it from. So a website, an X user, etc… id like each investigation to have a running log of sources for everything",
  },
  {
    id: 10,
    text: "Can u make a video demo (tutorial) to use for marketing and promotion and to demonstrate ALL the features of red string",
  },
  {
    id: 11,
    text: "Go max! Do both video tour first please!!!!",
  },
  {
    id: 12,
    text: "Please go back to unfinished tasks, finish them and test the app in its entirety to confirm whether or not each link, sign in, feature aspect etc is fully and properly operational and functioning as intended",
  },
  {
    id: 13,
    text: "What is the error",
  },
  {
    id: 14,
    text: "Nevermind just send me the onboarding video please if u can lol",
  },
  {
    id: 15,
    text: "I went to sign up and the code couldn't be sent please fix it that doesn't make me feel good about the app if the first thing is signing up and it's not working 😭",
  },
  {
    id: 16,
    text: "Can u run all other aspects and components and test them to ensure everything is working properly with no issues like this?",
  },
  {
    id: 17,
    text: "Make login with a phone number not email is that possible",
  },
  {
    id: 18,
    text: "Test each edit after to ensure proper functioning",
  },
  {
    id: 19,
    text: "@logs",
  },
  {
    id: 20,
    text: "I don't see anything in the logs resembling a numerical code",
  },
  {
    id: 21,
    text: "Failed to send code message upon entering my phone number. I want to cry bc if this is this problematic JUST signing in, there's likely a ton more issues with the app itself and i was so excited",
  },
  {
    id: 22,
    text: "Still no code in logs or received",
  },
  {
    id: 23,
    text: "I want you to create a video that showcases the app and its features",
  },
  {
    id: 24,
    text: "I don't have a video",
  },
  {
    id: 25,
    text: "What was the original function of the question mark? I was reporting two separate issues — the video and the question mark were unrelated so im confused",
  },
  {
    id: 26,
    text: "Ok and to my understanding, i was asking for a video showcasing the app and there was supposed to be a demo mode and a virtual onboarding video demo for marketing or promo no?",
  },
  {
    id: 27,
    text: "I need to run through it and test it out… podcast features, live features and whatnot",
  },
  {
    id: 28,
    text: "Anything that is clicked on should be able to be dragged to the trash like a folder or node… any info should be able to be undone or deleted etc",
  },
  {
    id: 29,
    text: "Where is the area for the social sign in for bookmark imports, the podcast area for live, scripts, the ai chat and voice area for research… many things are missing no?",
  },
  {
    id: 30,
    text: "I want all of them done",
  },
  {
    id: 31,
    text: "Hmm idk what instapaper is, i didn't say anything about tracking other podcasts but we can leave it… i don't want simulation i want interactive ai conversation thru text and voice with the model…",
  },
  {
    id: 32,
    text: "How do i add what's missing and needs to be added externally",
  },
  {
    id: 33,
    text: "Ok",
  },
  {
    id: 34,
    text: "GOOGLE-GEMINI GPT-5-MINI GPT-5 NANO-BANANA IDEOGRAM-3 ELEVENLABS-TTS ELEVENLABS-SPEECH-TO-SPEECH GPT-4O-TRANSCRIBE ANTHROPIC-AGENT-SDK SORA-2 ELEVENLABS-TTS ELEVENLABS-SPEECH-TO-SPEECH GPT-4O-TRANSCRIBE (list of AI APIs requested to be integrated)",
  },
  {
    id: 35,
    text: "Can user talk to ai using the mic and ai talk back?",
  },
  {
    id: 36,
    text: "Yes! Plz test all features and fill me in on what's next",
  },
  {
    id: 37,
    text: "1-no 2-yes 3-where can i hear them to see what i like? What about the live streaming and podcast scripting and ai screen controlled by voice thing u mentioned a while back?",
  },
  {
    id: 38,
    text: "All of it baby!",
  },
  {
    id: 39,
    text: "Ok can u provide me a detailed description broken down into an easy to read paragraph format of all features",
  },
  {
    id: 40,
    text: "None of the links in live feed work",
  },
  {
    id: 41,
    text: "I gave the ai the info to research and it appears it can't access the internet or research anything externally",
  },
  {
    id: 42,
    text: "Please fix the following errors: Cannot read property 'length' of undefined (codeFrame error in investigations store)",
  },
  {
    id: 43,
    text: "Cannot add anything to timeline, can only seem to create it, and the beginning date isn't accurately reflected on the timeline",
  },
  {
    id: 44,
    text: "The string feature isn't working and the automations aren't either",
  },
  {
    id: 45,
    text: "There is no string, when i go to pinch two nodes nothing happens, none of the automations we discussed pertaining to any new information that is input is in place",
  },
  {
    id: 46,
    text: "What about the ai helping debunk or verify the info input",
  },
  {
    id: 47,
    text: "The red string is not functioning",
  },
  {
    id: 48,
    text: "i'd like a copy of every prompt i've given from the beginning of this apps creation so i can decide what i'd like to change, what needs to be fixed, what's working correctly etc and the entire history isn't accessible for me",
  },
  {
    id: 49,
    text: "i can't see the suggestions you made or my initial prompts that first kicked off the app concept",
  },
  {
    id: 50,
    text: "how can i copy this?",
  },
];

function buildAllPromptsText(): string {
  return PROMPTS.map((p) => `[${p.id}] ${p.text}`).join('\n\n');
}

function PromptCard({
  prompt,
  index,
}: {
  prompt: { id: number; text: string };
  index: number;
}) {
  const [copied, setCopied] = useState<boolean>(false);
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleCopy = useCallback(() => {
    Clipboard.setString(prompt.text);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scale.value = withSequence(
      withTiming(0.95, { duration: 80 }),
      withTiming(1, { duration: 120 })
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }, [prompt.text, scale]);

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 30).duration(300).springify()}
      style={[
        {
          marginHorizontal: 16,
          marginBottom: 12,
          backgroundColor: COLORS.card,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: COLORS.border,
          overflow: 'hidden',
        },
      ]}
      testID={`prompt-card-${prompt.id}`}
    >
      {/* Number strip */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 14,
          paddingTop: 12,
          paddingBottom: 8,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.border,
          gap: 8,
        }}
      >
        <View
          style={{
            backgroundColor: 'rgba(196,30,58,0.15)',
            borderRadius: 6,
            paddingHorizontal: 7,
            paddingVertical: 2,
            borderWidth: 1,
            borderColor: 'rgba(196,30,58,0.3)',
          }}
        >
          <Text
            style={{
              color: COLORS.red,
              fontSize: 11,
              fontWeight: '800',
              letterSpacing: 0.5,
            }}
          >
            #{prompt.id}
          </Text>
        </View>
        <View style={{ flex: 1 }} />
        <Animated.View style={animStyle}>
          <Pressable
            testID={`copy-prompt-${prompt.id}`}
            onPress={handleCopy}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 8,
              backgroundColor: copied
                ? 'rgba(74,124,89,0.2)'
                : pressed
                ? 'rgba(212,165,116,0.2)'
                : 'rgba(212,165,116,0.1)',
              borderWidth: 1,
              borderColor: copied
                ? 'rgba(74,124,89,0.4)'
                : 'rgba(212,165,116,0.3)',
            })}
          >
            {copied ? (
              <CheckCheck size={12} color="#4A7C59" strokeWidth={2.5} />
            ) : (
              <Copy size={12} color={COLORS.pin} strokeWidth={2.5} />
            )}
            <Text
              style={{
                color: copied ? '#4A7C59' : COLORS.pin,
                fontSize: 11,
                fontWeight: '700',
              }}
            >
              {copied ? 'Copied!' : 'Copy'}
            </Text>
          </Pressable>
        </Animated.View>
      </View>

      {/* Prompt text */}
      <View style={{ padding: 14 }}>
        <Text
          style={{
            color: COLORS.textLight,
            fontSize: 14,
            lineHeight: 22,
            letterSpacing: 0.1,
          }}
          selectable
        >
          {prompt.text}
        </Text>
      </View>
    </Animated.View>
  );
}

export default function PromptHistoryScreen() {
  const router = useRouter();
  const [allCopied, setAllCopied] = useState<boolean>(false);

  const handleCopyAll = useCallback(() => {
    Clipboard.setString(buildAllPromptsText());
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 2500);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }} testID="prompt-history-screen">
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingTop: 6,
            paddingBottom: 14,
            borderBottomWidth: 1,
            borderBottomColor: COLORS.border,
            gap: 12,
          }}
        >
          <Pressable
            testID="back-button"
            onPress={() => router.back()}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: pressed ? COLORS.border : COLORS.surface,
              borderWidth: 1,
              borderColor: COLORS.border,
              alignItems: 'center',
              justifyContent: 'center',
            })}
          >
            <ArrowLeft size={18} color={COLORS.textLight} strokeWidth={2} />
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: COLORS.textLight,
                fontSize: 18,
                fontWeight: '800',
                letterSpacing: 0.3,
              }}
            >
              Prompt History
            </Text>
            <Text style={{ color: COLORS.muted, fontSize: 12, marginTop: 1 }}>
              {PROMPTS.length} prompts from app creation
            </Text>
          </View>

          {/* Copy All button */}
          <Pressable
            testID="copy-all-button"
            onPress={handleCopyAll}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 10,
              backgroundColor: allCopied
                ? 'rgba(74,124,89,0.2)'
                : pressed
                ? 'rgba(196,30,58,0.2)'
                : 'rgba(196,30,58,0.12)',
              borderWidth: 1,
              borderColor: allCopied
                ? 'rgba(74,124,89,0.4)'
                : 'rgba(196,30,58,0.35)',
            })}
          >
            {allCopied ? (
              <CheckCheck size={14} color="#4A7C59" strokeWidth={2.5} />
            ) : (
              <ClipboardList size={14} color={COLORS.red} strokeWidth={2} />
            )}
            <Text
              style={{
                color: allCopied ? '#4A7C59' : COLORS.red,
                fontSize: 12,
                fontWeight: '700',
              }}
            >
              {allCopied ? 'Copied!' : 'Copy All'}
            </Text>
          </Pressable>
        </View>

        {/* Intro banner */}
        <Animated.View
          entering={FadeInDown.duration(400).springify()}
          style={{
            marginHorizontal: 16,
            marginTop: 14,
            marginBottom: 16,
            backgroundColor: 'rgba(196,30,58,0.08)',
            borderRadius: 12,
            padding: 14,
            borderWidth: 1,
            borderColor: 'rgba(196,30,58,0.2)',
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 10,
          }}
        >
          <ClipboardList size={18} color={COLORS.red} strokeWidth={2} style={{ marginTop: 1 }} />
          <Text style={{ color: COLORS.muted, fontSize: 13, lineHeight: 20, flex: 1 }}>
            Every prompt you gave during the creation of Red String, in chronological order. Tap{' '}
            <Text style={{ color: COLORS.pin, fontWeight: '600' }}>Copy</Text> on any card to copy
            it, or use{' '}
            <Text style={{ color: COLORS.red, fontWeight: '600' }}>Copy All</Text> above to grab the
            full history at once.
          </Text>
        </Animated.View>

        {/* Prompt list */}
        <ScrollView
          testID="prompt-list"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {PROMPTS.map((prompt, index) => (
            <PromptCard key={prompt.id} prompt={prompt} index={index} />
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}


# mobile/src/app/(tabs)/scripts.tsx

import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TextInput,
  Pressable,
  Modal,
  Share,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  FileText,
  Edit2,
  Copy,
  Plus,
  Search,
  Check,
  X,
  BookOpen,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SCRIPTS_KEY = '@red_string_scripts';

const COLORS = {
  background: '#1A1614',
  surface: '#231F1C',
  card: '#F5ECD7',
  red: '#C41E3A',
  pin: '#D4A574',
  textLight: '#E8DCC8',
  muted: '#6B5B4F',
  border: '#3D332C',
  cardText: '#2C1810',
};

const CATEGORY_COLORS: Record<string, string> = {
  Interview: '#1E3A5F',
  FOIA: '#2D4A1E',
  'Source Contact': '#4A2D1E',
  Evidence: '#3A1E4A',
  Custom: '#1E3A3A',
};

const CATEGORIES = ['All', 'Interview', 'FOIA', 'Source Contact', 'Evidence', 'Custom'];

type Script = {
  id: string;
  title: string;
  category: string;
  body: string;
  variables: string[];
};

const INITIAL_SCRIPTS: Script[] = [
  {
    id: '1',
    title: 'Initial Contact - Whistleblower',
    category: 'Source Contact',
    body: 'My name is [YOUR_NAME] and I am a researcher investigating [TOPIC]. I came across your [PLATFORM] post about [SUBJECT] and wanted to reach out confidentially. Everything you share with me will be kept strictly off the record unless you give explicit permission.',
    variables: ['YOUR_NAME', 'TOPIC', 'PLATFORM', 'SUBJECT'],
  },
  {
    id: '2',
    title: 'FOIA Request Template',
    category: 'FOIA',
    body: 'Pursuant to the Freedom of Information Act (5 U.S.C. § 552), I am requesting records concerning [SUBJECT_MATTER] from [DATE_START] to [DATE_END]. Please provide all responsive documents in electronic format. I am willing to pay reasonable duplication fees.',
    variables: ['SUBJECT_MATTER', 'DATE_START', 'DATE_END'],
  },
  {
    id: '3',
    title: 'Interview - Government Official',
    category: 'Interview',
    body: "Thank you for agreeing to speak with me. I want to be transparent that I am documenting [INVESTIGATION_TOPIC]. Can you confirm your role at [AGENCY] and how long you have been in that position? Everything said here will be attributed to you by name unless otherwise agreed.",
    variables: ['INVESTIGATION_TOPIC', 'AGENCY'],
  },
  {
    id: '4',
    title: 'Evidence Documentation',
    category: 'Evidence',
    body: 'Item #[ITEM_NUMBER]: Obtained [DATE] from [SOURCE]. Description: [DESCRIPTION]. Chain of custody: [CUSTODY_NOTES]. This item has been photographed, logged, and stored in the secure evidence archive.',
    variables: ['ITEM_NUMBER', 'DATE', 'SOURCE', 'DESCRIPTION', 'CUSTODY_NOTES'],
  },
  {
    id: '5',
    title: 'Social Media Source Contact',
    category: 'Source Contact',
    body: 'Hi [USERNAME], I noticed your [POST_TYPE] about [TOPIC]. I\'m a researcher working on a [PUBLICATION_TYPE] piece. Would you be open to a brief conversation? All sources are kept confidential unless they choose otherwise.',
    variables: ['USERNAME', 'POST_TYPE', 'TOPIC', 'PUBLICATION_TYPE'],
  },
  {
    id: '6',
    title: 'On-Record Statement Request',
    category: 'Interview',
    body: 'For the record, I am asking [NAME] for an official statement regarding [SUBJECT] on [DATE]. Are you willing to provide an on-record comment? Your statement will be published in full with attribution.',
    variables: ['NAME', 'SUBJECT', 'DATE'],
  },
];

function detectVariables(text: string): string[] {
  const matches = text.match(/\[([A-Z_]+)\]/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.replace(/[\[\]]/g, '')))];
}

function renderPreview(body: string, vars: Record<string, string>): string {
  let result = body;
  Object.entries(vars).forEach(([key, value]) => {
    result = result.replace(new RegExp(`\\[${key}\\]`, 'g'), value || `[${key}]`);
  });
  return result;
}

// ---- Category Badge ----
function CategoryBadge({ category }: { category: string }) {
  const bg = CATEGORY_COLORS[category] ?? '#3D332C';
  return (
    <View style={{ backgroundColor: bg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' }}>
      <Text style={{ color: COLORS.textLight, fontSize: 13, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>
        {category}
      </Text>
    </View>
  );
}

// ---- Pushpin ----
function Pushpin({ color = COLORS.pin }: { color?: string }) {
  return (
    <View style={{ alignItems: 'center', position: 'absolute', top: -10, right: 18 }}>
      <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: color, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 2, elevation: 4 }} />
      <View style={{ width: 2, height: 8, backgroundColor: color, opacity: 0.7 }} />
    </View>
  );
}

// ---- Script Card ----
const ScriptCard = React.memo(function ScriptCard({
  script,
  onEdit,
  onCopy,
  onUse,
}: {
  script: Script;
  onEdit: () => void;
  onCopy: () => void;
  onUse: () => void;
}) {
  const preview = script.body.length > 90 ? script.body.slice(0, 90) + '…' : script.body;

  return (
    <View style={{ marginHorizontal: 16, marginBottom: 20, position: 'relative' }}>
      <Pushpin color={COLORS.pin} />
      <View
        testID={`script-card-${script.id}`}
        style={{
          backgroundColor: COLORS.card,
          borderRadius: 14,
          padding: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 6,
          elevation: 6,
          borderTopWidth: 3,
          borderTopColor: COLORS.pin,
        }}>
        {/* Title row */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
          <FileText size={16} color={COLORS.red} strokeWidth={2} style={{ marginTop: 1, marginRight: 8 }} />
          <Text style={{ flex: 1, color: COLORS.cardText, fontSize: 16, fontWeight: '800', lineHeight: 20, letterSpacing: 0.2 }}>
            {script.title}
          </Text>
        </View>

        {/* Badge + variable count */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <CategoryBadge category={script.category} />
          <Text style={{ color: COLORS.muted, fontSize: 13, fontWeight: '600' }}>
            {script.variables.length} variable{script.variables.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Preview text */}
        <Text style={{ color: '#5C4033', fontSize: 14, lineHeight: 18, fontStyle: 'italic', marginBottom: 14, borderLeftWidth: 2, borderLeftColor: COLORS.muted, paddingLeft: 8 }}>
          {preview}
        </Text>

        {/* Action buttons */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            testID={`edit-btn-${script.id}`}
            onPress={onEdit}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 14, borderRadius: 10, backgroundColor: 'rgba(44,24,16,0.08)', borderWidth: 1, borderColor: 'rgba(44,24,16,0.15)' }}>
            <Edit2 size={16} color={COLORS.cardText} strokeWidth={2} />
            <Text style={{ color: COLORS.cardText, fontSize: 14, fontWeight: '700' }}>Edit</Text>
          </Pressable>
          <Pressable
            testID={`copy-btn-${script.id}`}
            onPress={onCopy}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 14, borderRadius: 10, backgroundColor: 'rgba(44,24,16,0.08)', borderWidth: 1, borderColor: 'rgba(44,24,16,0.15)' }}>
            <Copy size={16} color={COLORS.cardText} strokeWidth={2} />
            <Text style={{ color: COLORS.cardText, fontSize: 14, fontWeight: '700' }}>Copy</Text>
          </Pressable>
          <Pressable
            testID={`use-btn-${script.id}`}
            onPress={onUse}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 14, borderRadius: 10, backgroundColor: COLORS.red }}>
            <BookOpen size={16} color='#fff' strokeWidth={2} />
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Use</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
});

// ---- Variable Use Modal ----
function UseScriptModal({
  script,
  visible,
  onClose,
}: {
  script: Script | null;
  visible: boolean;
  onClose: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    if (script) {
      const initial: Record<string, string> = {};
      script.variables.forEach((v) => { initial[v] = ''; });
      setValues(initial);
      setCopied(false);
    }
  }, [script]);

  if (!script) return null;

  const preview = renderPreview(script.body, values);

  const handleCopy = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await Share.share({ message: preview });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Render body with highlighted variables
  const renderHighlighted = () => {
    const parts: React.ReactNode[] = [];
    let idx = 0;
    const varRegex = /\[([A-Z_]+)\]/g;
    let match;
    let lastIndex = 0;
    varRegex.lastIndex = 0;
    while ((match = varRegex.exec(script.body)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <Text key={`t-${idx++}`} style={{ color: COLORS.cardText, fontSize: 13, lineHeight: 20 }}>
            {script.body.slice(lastIndex, match.index)}
          </Text>
        );
      }
      const varName = match[1];
      const filled = values[varName];
      parts.push(
        <Text key={`v-${idx++}`} style={{ color: filled ? '#006400' : COLORS.red, fontWeight: '700', fontSize: 13, lineHeight: 20 }}>
          {filled ? filled : match[0]}
        </Text>
      );
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < script.body.length) {
      parts.push(
        <Text key={`t-${idx++}`} style={{ color: COLORS.cardText, fontSize: 13, lineHeight: 20 }}>
          {script.body.slice(lastIndex)}
        </Text>
      );
    }
    return parts;
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
          <Pressable testID="use-modal-close" onPress={onClose} style={{ padding: 4, marginRight: 12 }}>
            <X size={20} color={COLORS.muted} strokeWidth={2.5} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: COLORS.red, fontSize: 12, fontWeight: '800', letterSpacing: 1.7, textTransform: 'uppercase' }}>Use Script</Text>
            <Text style={{ color: COLORS.textLight, fontSize: 15, fontWeight: '700', marginTop: 1 }} numberOfLines={1}>{script.title}</Text>
          </View>
          <CategoryBadge category={script.category} />
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
          {/* Script preview with highlights */}
          <View style={{ backgroundColor: COLORS.card, borderRadius: 10, padding: 14, marginBottom: 20, borderLeftWidth: 3, borderLeftColor: COLORS.red }}>
            <Text style={{ color: COLORS.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>Script Preview</Text>
            <Text style={{ lineHeight: 20 }}>{renderHighlighted()}</Text>
          </View>

          {/* Variable inputs */}
          {script.variables.length > 0 && (
            <View style={{ marginBottom: 20 }}>
              <Text style={{ color: COLORS.textLight, fontSize: 13, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12 }}>
                Fill Variables
              </Text>
              {script.variables.map((varName) => (
                <View key={varName} style={{ marginBottom: 12 }}>
                  <Text style={{ color: COLORS.red, fontSize: 12, fontWeight: '700', letterSpacing: 0.7, marginBottom: 5 }}>
                    [{varName}]
                  </Text>
                  <TextInput
                    testID={`var-input-${varName}`}
                    value={values[varName] ?? ''}
                    onChangeText={(t) => setValues((prev) => ({ ...prev, [varName]: t }))}
                    placeholder={`Enter ${varName.replace(/_/g, ' ').toLowerCase()}`}
                    placeholderTextColor={COLORS.muted}
                    style={{
                      backgroundColor: COLORS.surface,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      color: COLORS.textLight,
                      fontSize: 14,
                    }}
                  />
                </View>
              ))}
            </View>
          )}

          {/* Live preview */}
          <View style={{ backgroundColor: '#0D1F0D', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#1E3A1E' }}>
            <Text style={{ color: '#4CAF50', fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>Live Preview</Text>
            <Text style={{ color: '#B8E6B8', fontSize: 14, lineHeight: 22 }}>{preview}</Text>
          </View>
        </ScrollView>

        {/* Bottom actions */}
        <View style={{ flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 32, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.background }}>
          <Pressable
            testID="copy-to-clipboard-btn"
            onPress={handleCopy}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 10, backgroundColor: copied ? '#1E4A1E' : COLORS.surface, borderWidth: 1, borderColor: copied ? '#2E6A2E' : COLORS.border }}>
            {copied ? <Check size={16} color='#4CAF50' strokeWidth={2.5} /> : <Copy size={16} color={COLORS.textLight} strokeWidth={2} />}
            <Text style={{ color: copied ? '#4CAF50' : COLORS.textLight, fontSize: 14, fontWeight: '700' }}>
              {copied ? 'Shared!' : 'Share / Copy'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---- Edit Script Modal ----
function EditScriptModal({
  script,
  visible,
  onClose,
  onSave,
}: {
  script: Script | null;
  visible: boolean;
  onClose: () => void;
  onSave: (s: Script) => void;
}) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Custom');
  const [body, setBody] = useState('');

  React.useEffect(() => {
    if (script) {
      setTitle(script.title);
      setCategory(script.category);
      setBody(script.body);
    }
  }, [script]);

  if (!script) return null;

  const detectedVars = detectVariables(body);

  const handleSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave({ ...script, title, category, body, variables: detectedVars });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
          <Pressable testID="edit-modal-close" onPress={onClose} style={{ padding: 4, marginRight: 12 }}>
            <X size={20} color={COLORS.muted} strokeWidth={2.5} />
          </Pressable>
          <Text style={{ flex: 1, color: COLORS.textLight, fontSize: 18, fontWeight: '800' }}>Edit Script</Text>
          <Pressable testID="edit-save-btn" onPress={handleSave} style={{ paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.red, borderRadius: 12 }}>
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Save</Text>
          </Pressable>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
          <Text style={{ color: COLORS.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>Title</Text>
          <TextInput
            testID="edit-title-input"
            value={title}
            onChangeText={setTitle}
            placeholder="Script title..."
            placeholderTextColor={COLORS.muted}
            style={{ backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: COLORS.textLight, fontSize: 15, marginBottom: 16 }}
          />

          <Text style={{ color: COLORS.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                <Pressable
                  key={cat}
                  testID={`edit-cat-${cat}`}
                  onPress={() => setCategory(cat)}
                  style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 6, backgroundColor: category === cat ? COLORS.red : COLORS.surface, borderWidth: 1, borderColor: category === cat ? COLORS.red : COLORS.border }}>
                  <Text style={{ color: category === cat ? '#fff' : COLORS.muted, fontSize: 12, fontWeight: '700' }}>{cat}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <Text style={{ color: COLORS.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>
            Script Body — use [VARIABLE_NAME] for variables
          </Text>
          <TextInput
            testID="edit-body-input"
            value={body}
            onChangeText={setBody}
            placeholder="Write your script here. Use [VARIABLE_NAME] for placeholders..."
            placeholderTextColor={COLORS.muted}
            multiline
            numberOfLines={8}
            textAlignVertical="top"
            style={{ backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: COLORS.textLight, fontSize: 14, lineHeight: 21, minHeight: 160, marginBottom: 16 }}
          />

          {detectedVars.length > 0 && (
            <View style={{ backgroundColor: COLORS.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: COLORS.border }}>
              <Text style={{ color: COLORS.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>Detected Variables</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {detectedVars.map((v) => (
                  <View key={v} style={{ backgroundColor: '#3A1010', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 }}>
                    <Text style={{ color: COLORS.red, fontSize: 12, fontWeight: '700' }}>[{v}]</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---- Create Script Modal ----
function CreateScriptModal({
  visible,
  onClose,
  onCreate,
}: {
  visible: boolean;
  onClose: () => void;
  onCreate: (s: Script) => void;
}) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Custom');
  const [body, setBody] = useState('');

  const reset = () => { setTitle(''); setCategory('Custom'); setBody(''); };

  const detectedVars = detectVariables(body);

  const handleCreate = () => {
    if (!title.trim() || !body.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onCreate({
      id: Date.now().toString(),
      title: title.trim(),
      category,
      body: body.trim(),
      variables: detectedVars,
    });
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { reset(); onClose(); }}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
          <Pressable testID="create-modal-close" onPress={() => { reset(); onClose(); }} style={{ padding: 4, marginRight: 12 }}>
            <X size={20} color={COLORS.muted} strokeWidth={2.5} />
          </Pressable>
          <Text style={{ flex: 1, color: COLORS.textLight, fontSize: 18, fontWeight: '800' }}>New Script</Text>
          <Pressable
            testID="create-save-btn"
            onPress={handleCreate}
            style={{ paddingHorizontal: 16, paddingVertical: 14, backgroundColor: title.trim() && body.trim() ? COLORS.red : COLORS.muted, borderRadius: 12 }}>
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Create</Text>
          </Pressable>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Text style={{ color: COLORS.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>Title</Text>
          <TextInput
            testID="create-title-input"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Follow-up Contact Template"
            placeholderTextColor={COLORS.muted}
            style={{ backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: COLORS.textLight, fontSize: 15, marginBottom: 16 }}
          />

          <Text style={{ color: COLORS.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                <Pressable
                  key={cat}
                  testID={`create-cat-${cat}`}
                  onPress={() => setCategory(cat)}
                  style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 6, backgroundColor: category === cat ? COLORS.red : COLORS.surface, borderWidth: 1, borderColor: category === cat ? COLORS.red : COLORS.border }}>
                  <Text style={{ color: category === cat ? '#fff' : COLORS.muted, fontSize: 12, fontWeight: '700' }}>{cat}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <Text style={{ color: COLORS.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>
            Script Body
          </Text>
          <Text style={{ color: COLORS.muted, fontSize: 12, marginBottom: 8 }}>
            Wrap variable names in brackets: [YOUR_NAME], [TOPIC], etc.
          </Text>
          <TextInput
            testID="create-body-input"
            value={body}
            onChangeText={setBody}
            placeholder="Write your script here. Use [VARIABLE_NAME] for dynamic placeholders..."
            placeholderTextColor={COLORS.muted}
            multiline
            numberOfLines={8}
            textAlignVertical="top"
            style={{ backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: COLORS.textLight, fontSize: 14, lineHeight: 21, minHeight: 180, marginBottom: 16 }}
          />

          {detectedVars.length > 0 && (
            <View style={{ backgroundColor: COLORS.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: COLORS.border }}>
              <Text style={{ color: COLORS.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>Auto-Detected Variables ({detectedVars.length})</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {detectedVars.map((v) => (
                  <View key={v} style={{ backgroundColor: '#3A1010', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 }}>
                    <Text style={{ color: COLORS.red, fontSize: 12, fontWeight: '700' }}>[{v}]</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---- Main Screen ----
export default function ScriptsScreen() {
  const [scripts, setScripts] = useState<Script[]>(INITIAL_SCRIPTS);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [useScript, setUseScript] = useState<Script | null>(null);
  const [editScript, setEditScript] = useState<Script | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // Load from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem(SCRIPTS_KEY).then((stored) => {
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as Script[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            setScripts(parsed);
          }
        } catch {
          // If parse fails, keep INITIAL_SCRIPTS
        }
      }
    });
  }, []);

  // Save to AsyncStorage whenever scripts change
  useEffect(() => {
    AsyncStorage.setItem(SCRIPTS_KEY, JSON.stringify(scripts));
  }, [scripts]);

  const filtered = useMemo(() => {
    return scripts.filter((s) => {
      const matchCategory = activeCategory === 'All' || s.category === activeCategory;
      const matchSearch = search.trim() === '' || s.title.toLowerCase().includes(search.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [scripts, search, activeCategory]);

  const handleEdit = (script: Script) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditScript(script);
  };

  const handleCopy = async (script: Script) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await Share.share({ message: script.body, title: script.title });
  };

  const handleUse = (script: Script) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setUseScript(script);
  };

  const handleSaveEdit = (updated: Script) => {
    setScripts((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  const handleCreate = (newScript: Script) => {
    setScripts((prev) => [newScript, ...prev]);
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ color: COLORS.red, fontSize: 32, fontWeight: '900', letterSpacing: 2, lineHeight: 36 }}>
              SCRIPTS
            </Text>
            <Text style={{ color: COLORS.pin, fontSize: 13, fontWeight: '700', letterSpacing: 3, marginTop: 1 }}>
              &amp; TEMPLATES
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: COLORS.muted, fontSize: 12, fontWeight: '600' }}>{filtered.length} scripts</Text>
          </View>
        </View>
        {/* Red underline */}
        <View style={{ height: 2, backgroundColor: COLORS.red, marginTop: 10, borderRadius: 1, opacity: 0.6 }} />
      </View>

      {/* Search bar */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.border, gap: 8 }}>
          <Search size={18} color={COLORS.muted} strokeWidth={2} />
          <TextInput
            testID="scripts-search-input"
            value={search}
            onChangeText={setSearch}
            placeholder="Search scripts..."
            placeholderTextColor={COLORS.muted}
            style={{ flex: 1, color: COLORS.textLight, fontSize: 14 }}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} testID="search-clear-btn">
              <X size={15} color={COLORS.muted} strokeWidth={2.5} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 12 }}>
        {CATEGORIES.map((cat) => {
          const active = cat === activeCategory;
          return (
            <Pressable
              key={cat}
              testID={`category-tab-${cat}`}
              onPress={() => {
                Haptics.selectionAsync();
                setActiveCategory(cat);
              }}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 9,
                borderRadius: 20,
                backgroundColor: active ? COLORS.red : COLORS.surface,
                borderWidth: 1,
                borderColor: active ? COLORS.red : COLORS.border,
              }}>
              <Text style={{ color: active ? '#fff' : COLORS.muted, fontSize: 13, fontWeight: '700', letterSpacing: 0.5 }}>
                {cat}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Script list */}
      <FlatList
        testID="scripts-list"
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        windowSize={10}
        removeClippedSubviews={true}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 60 }}>
            <FileText size={40} color={COLORS.muted} strokeWidth={1.5} />
            <Text style={{ color: COLORS.muted, fontSize: 15, fontWeight: '600', marginTop: 12 }}>No scripts found</Text>
            <Text style={{ color: COLORS.muted, fontSize: 13, marginTop: 4, opacity: 0.7 }}>Try a different search or category</Text>
          </View>
        }
        renderItem={({ item }) => (
          <ScriptCard
            script={item}
            onEdit={() => handleEdit(item)}
            onCopy={() => handleCopy(item)}
            onUse={() => handleUse(item)}
          />
        )}
      />

      {/* FAB - Create new script */}
      <Pressable
        testID="create-script-fab"
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setShowCreate(true);
        }}
        style={{
          position: 'absolute',
          bottom: 100,
          right: 20,
          width: 60,
          height: 60,
          borderRadius: 30,
          backgroundColor: COLORS.red,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: COLORS.red,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.5,
          shadowRadius: 8,
          elevation: 8,
        }}>
        <Plus size={28} color='#fff' strokeWidth={2.5} />
      </Pressable>

      {/* Modals */}
      <UseScriptModal
        script={useScript}
        visible={useScript !== null}
        onClose={() => setUseScript(null)}
      />
      <EditScriptModal
        script={editScript}
        visible={editScript !== null}
        onClose={() => setEditScript(null)}
        onSave={handleSaveEdit}
      />
      <CreateScriptModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
      />
    </SafeAreaView>
  );
}


# mobile/src/app/(tabs)/tips.tsx

import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  Share,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFonts, BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import {
  CourierPrime_400Regular,
  CourierPrime_700Bold,
} from '@expo-google-fonts/courier-prime';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { api } from '@/lib/api/api';
import { useSession } from '@/lib/auth/use-session';
import type { Tip, TipStatus } from '@/lib/types';

const C = {
  bg: '#1A1614',
  surface: '#231F1C',
  surfaceAlt: '#2A2522',
  red: '#C41E3A',
  amber: '#D4A574',
  text: '#E8DCC8',
  muted: '#6B5B4F',
  border: '#3D332C',
  green: '#22C55E',
} as const;

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

function TipCard({ tip, index, onPress }: { tip: Tip; index: number; onPress: () => void }) {
  const accentColor = statusAccentColor(tip.status);
  const isUnread = tip.status === 'unread';

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(300)}>
      <Pressable
        testID={`tips-tab-card-${tip.id}`}
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
        <View style={{ width: 4, backgroundColor: accentColor }} />
        <View style={{ flex: 1, padding: 16 }}>
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
                fontSize: 16,
                fontWeight: '800',
                lineHeight: 20,
              }}
              numberOfLines={1}
            >
              {tip.subject}
            </Text>
            <Text style={{ color: C.muted, fontSize: 11 }}>{timeAgo(tip.submittedAt)}</Text>
          </View>

          <Text style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>
            {tip.isAnonymous
              ? 'Anonymous'
              : tip.tipperHandle
              ? `@${tip.tipperHandle}`
              : tip.tipperName ?? 'Unknown'}
          </Text>

          <Text
            style={{ color: C.text, fontSize: 13, lineHeight: 18, marginTop: 6, opacity: 0.7 }}
            numberOfLines={2}
          >
            {tip.content}
          </Text>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 10,
            }}
          >
            <View
              style={{
                backgroundColor: accentColor + '22',
                borderRadius: 10,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderWidth: 1,
                borderColor: accentColor + '44',
              }}
            >
              <Text style={{ color: accentColor, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>
                {statusLabel(tip.status)}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function EmptyState() {
  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingTop: 60 }}
    >
      <Text style={{ fontSize: 56, marginBottom: 16 }}>📬</Text>
      <Text
        style={{
          color: C.text,
          fontSize: 18,
          fontWeight: '800',
          marginBottom: 8,
          textAlign: 'center',
          letterSpacing: 0.5,
        }}
      >
        No tips yet
      </Text>
      <Text
        style={{
          color: C.muted,
          fontSize: 13,
          lineHeight: 20,
          textAlign: 'center',
        }}
      >
        Share your tip link to start receiving anonymous submissions
      </Text>
    </Animated.View>
  );
}

export default function TipsTabScreen() {
  const router = useRouter();
  const { data: session } = useSession();
  const userId = session?.user?.id ?? '';

  const [fontsLoaded] = useFonts({ BebasNeue_400Regular, CourierPrime_400Regular, CourierPrime_700Bold });

  const { data: tips, isLoading, refetch, isRefetching } = useQuery<Tip[]>({
    queryKey: ['tips'],
    queryFn: () => api.get<Tip[]>('/api/tips'),
    enabled: !!userId,
  });

  const unreadCount = React.useMemo(
    () => (tips ?? []).filter((t) => t.status === 'unread').length,
    [tips]
  );

  const handleTipPress = useCallback(
    (tip: Tip) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push('/tip-inbox');
    },
    [router]
  );

  const handleShareLink = useCallback(async () => {
    if (!userId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const tipLink = `${process.env.EXPO_PUBLIC_BACKEND_URL}/tip-submit?for=${userId}`;
    try {
      await Share.share({
        message: tipLink,
        title: 'Submit a tip to my investigation',
      });
    } catch {
      // ignore
    }
  }, [userId]);

  const renderItem = useCallback(
    ({ item, index }: { item: Tip; index: number }) => (
      <TipCard tip={item} index={index} onPress={() => handleTipPress(item)} />
    ),
    [handleTipPress]
  );

  const keyExtractor = useCallback((item: Tip) => item.id, []);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }} testID="tips-tab-screen">
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 14,
            borderBottomWidth: 1,
            borderBottomColor: C.border,
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
          }}
        >
          <View>
            <Text
              style={{
                color: C.text,
                fontSize: 34,
                fontFamily: fontsLoaded ? 'BebasNeue_400Regular' : undefined,
                letterSpacing: 2,
                lineHeight: 36,
              }}
            >
              TIP INBOX
            </Text>
            <Text
              style={{
                color: C.muted,
                fontSize: 11,
                fontFamily: fontsLoaded ? 'CourierPrime_400Regular' : undefined,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                marginTop: 2,
              }}
            >
              anonymous submissions
            </Text>
          </View>

          {unreadCount > 0 ? (
            <View
              style={{
                backgroundColor: C.red,
                borderRadius: 12,
                minWidth: 28,
                height: 28,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 8,
                marginBottom: 4,
              }}
            >
              <Text
                style={{
                  color: '#FFF',
                  fontSize: 13,
                  fontWeight: '800',
                  fontFamily: fontsLoaded ? 'CourierPrime_700Bold' : undefined,
                }}
              >
                {unreadCount}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={C.red} size="large" />
            <Text style={{ color: C.muted, fontSize: 13, marginTop: 12 }}>Loading tips...</Text>
          </View>
        ) : (
          <FlatList
            testID="tips-tab-list"
            data={tips ?? []}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={{
              paddingTop: 12,
              paddingBottom: 100,
              flexGrow: 1,
            }}
            showsVerticalScrollIndicator={false}
            windowSize={10}
            removeClippedSubviews={true}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={() => refetch()}
                tintColor={C.red}
              />
            }
            ListEmptyComponent={<EmptyState />}
          />
        )}

        {/* My Tip Link button */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            paddingHorizontal: 20,
            paddingBottom: 20,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: C.border,
            backgroundColor: C.bg,
          }}
        >
          <Pressable
            testID="my-tip-link-button"
            onPress={handleShareLink}
            style={({ pressed }) => ({
              backgroundColor: pressed ? '#A3162E' : C.red,
              borderRadius: 14,
              paddingVertical: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            })}
          >
            <Text style={{ fontSize: 18 }}>📬</Text>
            <Text
              style={{
                color: '#FFF',
                fontSize: 15,
                fontWeight: '800',
                fontFamily: fontsLoaded ? 'CourierPrime_700Bold' : undefined,
                letterSpacing: 0.5,
              }}
            >
              My Tip Link
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}


# mobile/src/app/(tabs)/two.tsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  AppState,
  useWindowDimensions,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  runOnJS,
  Easing,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, {
  Path,
  Circle as SvgCircle,
  Text as SvgText,
  Defs,
  Filter,
  FeGaussianBlur,
  FeComposite,
} from 'react-native-svg';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import BroadcasterOverlay from '@/components/BroadcasterOverlay';
import {
  ArrowLeft,
  Plus,
  Cable,
  Radio,
  FileText,
  Link2,
  Image as ImageIcon,
  Folder,
  Database,
  Search,
  Trash2,
  X,
  Lock,
  LayoutGrid,
  Network,
  BookOpen,
  Calendar,
  Users,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import useInvestigationStore from '@/lib/state/investigation-store';
import useSubscriptionStore from '@/lib/state/subscription-store';
import useTourStore from '@/lib/state/tour-store';
import type { CanvasNode, NodeType, TagColor, Timeline, RedString } from '@/lib/types';
import TimelinePanel from '@/components/TimelinePanel';
import MindMapCanvas from '@/components/MindMapCanvas';
import ColorLegend from '@/components/ColorLegend';
import ColorSuggestionSheet from '@/components/ColorSuggestionSheet';
import TourOverlay from '@/components/TourOverlay';
import { useAutomationEngine } from '@/components/AutomationEngine';
import * as burnt from 'burnt';

// ---- Color constants ----
const C = {
  bg: '#1A1614',
  surface: '#231F1C',
  card: '#F5ECD7',
  red: '#C41E3A',
  redLight: '#E8445A',
  pin: '#D4A574',
  text: '#E8DCC8',
  muted: '#6B5B4F',
  border: '#3D332C',
  cardText: '#2C1810',
} as const;

const NODE_W = 180;
const NODE_H = 110;

const TAG_COLORS: Record<TagColor, string> = {
  red: '#C41E3A',
  blue: '#3B82F6',
  green: '#22C55E',
  amber: '#F59E0B',
  purple: '#A855F7',
  teal: '#14B8A6',
};

// String color palette for the color picker
const STRING_COLORS = [
  '#C41E3A', '#3B82F6', '#22C55E', '#F59E0B',
  '#A855F7', '#14B8A6', '#F97316', '#EC4899',
  '#E8DCC8', '#FFFFFF',
];

type IconComponent = React.ComponentType<{ size: number; color: string; strokeWidth: number }>;

const NODE_ICONS: Record<NodeType, IconComponent> = {
  note: FileText,
  link: Link2,
  image: ImageIcon,
  folder: Folder,
  dataset: Database,
  investigation: Search,
};

// ---- Bezier path helper ----
function makeBezierPath(
  fx: number,
  fy: number,
  tx: number,
  ty: number
): string {
  const dx = tx - fx;
  const dy = ty - fy;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  // For mostly horizontal connections, control points push curve up/down
  // For mostly vertical, push left/right
  let cp1x: number, cp1y: number, cp2x: number, cp2y: number;
  if (absDx >= absDy) {
    // Horizontal bias
    const offset = absDy * 0.3 + 20;
    cp1x = fx + dx * 0.4;
    cp1y = fy - offset;
    cp2x = tx - dx * 0.4;
    cp2y = ty - offset;
  } else {
    // Vertical bias
    const offset = absDx * 0.3 + 20;
    cp1x = fx + offset;
    cp1y = fy + dy * 0.4;
    cp2x = tx + offset;
    cp2y = ty - dy * 0.4;
  }

  return `M ${fx} ${fy} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${tx} ${ty}`;
}

// Cubic bezier midpoint at t=0.5
function bezierMidpoint(
  fx: number,
  fy: number,
  tx: number,
  ty: number
): { x: number; y: number } {
  const dx = tx - fx;
  const dy = ty - fy;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  let cp1x: number, cp1y: number, cp2x: number, cp2y: number;
  if (absDx >= absDy) {
    const offset = absDy * 0.3 + 20;
    cp1x = fx + dx * 0.4;
    cp1y = fy - offset;
    cp2x = tx - dx * 0.4;
    cp2y = ty - offset;
  } else {
    const offset = absDx * 0.3 + 20;
    cp1x = fx + offset;
    cp1y = fy + dy * 0.4;
    cp2x = tx + offset;
    cp2y = ty - dy * 0.4;
  }
  // B(0.5) = (1-t)^3*P0 + 3(1-t)^2*t*P1 + 3(1-t)*t^2*P2 + t^3*P3 at t=0.5
  const t = 0.5;
  const mt = 1 - t;
  const x = mt * mt * mt * fx + 3 * mt * mt * t * cp1x + 3 * mt * t * t * cp2x + t * t * t * tx;
  const y = mt * mt * mt * fy + 3 * mt * mt * t * cp1y + 3 * mt * t * t * cp2y + t * t * t * ty;
  return { x, y };
}

// ---- Node card component ----
function NodeCard({
  node,
  scaleVal,
  tX,
  tY,
  connectMode,
  connectingFromId,
  onTap,
  onDragEnd,
  onDragStart,
  onDragMove,
  onDragEndPosition,
}: {
  node: CanvasNode;
  scaleVal: Animated.SharedValue<number>;
  tX: Animated.SharedValue<number>;
  tY: Animated.SharedValue<number>;
  connectMode: boolean;
  connectingFromId: string | null;
  onTap: (id: string) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  onDragStart: (id: string) => void;
  onDragMove: (id: string, screenY: number) => void;
  onDragEndPosition: (id: string, screenX: number, screenY: number) => void;
}) {
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const isDragging = useSharedValue(false);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!connectMode)
        .onStart(() => {
          isDragging.value = true;
          runOnJS(onDragStart)(node.id);
        })
        .onUpdate((e) => {
          offsetX.value = e.translationX / scaleVal.value;
          offsetY.value = e.translationY / scaleVal.value;
          runOnJS(onDragMove)(node.id, e.absoluteY);
        })
        .onEnd((e) => {
          isDragging.value = false;
          const finalX = node.position.x + offsetX.value;
          const finalY = node.position.y + offsetY.value;
          offsetX.value = 0;
          offsetY.value = 0;
          runOnJS(onDragEndPosition)(node.id, e.absoluteX, e.absoluteY);
          runOnJS(onDragEnd)(node.id, finalX, finalY);
        }),
    [connectMode, node.id, node.position.x, node.position.y, scaleVal, onDragEnd, onDragStart, onDragMove, onDragEndPosition, offsetX, offsetY, isDragging]
  );

  const tapGesture = useMemo(
    () =>
      Gesture.Tap().onEnd(() => {
        runOnJS(onTap)(node.id);
      }),
    [node.id, onTap]
  );

  const composed = useMemo(() => {
    if (connectMode) return tapGesture;
    return Gesture.Race(tapGesture, panGesture);
  }, [connectMode, tapGesture, panGesture]);

  const animStyle = useAnimatedStyle(() => {
    const sx = (node.position.x + offsetX.value) * scaleVal.value + tX.value;
    const sy = (node.position.y + offsetY.value) * scaleVal.value + tY.value;
    return {
      position: 'absolute' as const,
      left: sx,
      top: sy,
      width: NODE_W * scaleVal.value,
      transform: [{ scale: isDragging.value ? 1.05 : 1 }],
    };
  });

  const Icon = NODE_ICONS[node.type] ?? FileText;
  const pinColor = node.color ? TAG_COLORS[node.color] : C.pin;
  const leftBorderColor = node.color ? TAG_COLORS[node.color] : 'transparent';
  const isFrom = connectingFromId === node.id;

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={animStyle}>
        <View
          style={[
            styles.nodeCard,
            node.color ? {
              backgroundColor: pinColor + '14',
              borderWidth: 1,
              borderColor: pinColor + '66',
            } : undefined,
            connectMode
              ? {
                  borderWidth: node.id === connectingFromId ? 2 : 1,
                  borderColor: node.id === connectingFromId ? C.red : 'rgba(196,30,58,0.4)',
                  shadowColor: node.id === connectingFromId ? C.red : 'transparent',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: node.id === connectingFromId ? 0.9 : 0,
                  shadowRadius: node.id === connectingFromId ? 12 : 0,
                }
              : isFrom ? { borderWidth: 2, borderColor: C.red } : undefined,
          ]}
        >
          {/* Colored left category stripe */}
          {node.color ? (
            <View
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: 4,
                backgroundColor: leftBorderColor,
                borderTopLeftRadius: 8,
                borderBottomLeftRadius: 8,
                opacity: 0.85,
              }}
            />
          ) : null}
          <View style={[styles.pushpin, { backgroundColor: pinColor }]} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, paddingLeft: node.color ? 6 : 0 }}>
            <Icon size={18} color={C.muted} strokeWidth={2} />
            <Text
              style={{ color: C.cardText, flex: 1, fontSize: 14, fontWeight: '800' }}
              numberOfLines={2}
            >
              {node.title}
            </Text>
          </View>
          {node.tags.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6, paddingLeft: node.color ? 6 : 0 }}>
              {node.tags.slice(0, 3).map((tag) => (
                <View
                  key={tag.id}
                  style={{
                    backgroundColor: TAG_COLORS[tag.color] + '22',
                    borderRadius: 4,
                    paddingHorizontal: 5,
                    paddingVertical: 1,
                  }}
                >
                  <Text style={{ color: TAG_COLORS[tag.color], fontSize: 9, fontWeight: '600' }}>
                    {tag.label}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

// ---- Corkboard SVG strings layer ----
function StringsLayer({
  strings,
  nodeMap,
  scaleVal,
  tX,
  tY,
  selectedStringId,
  canvasVersion,
}: {
  strings: Array<{ id: string; fromNodeId: string; toNodeId: string; label?: string; color: string; thickness?: number; style?: 'solid' | 'dashed' | 'dotted' }>;
  nodeMap: Map<string, CanvasNode>;
  scaleVal: Animated.SharedValue<number>;
  tX: Animated.SharedValue<number>;
  tY: Animated.SharedValue<number>;
  selectedStringId: string | null;
  canvasVersion: number;
}) {
  const [canvasState, setCanvasState] = useState<{ scale: number; tx: number; ty: number }>({
    scale: 1,
    tx: 0,
    ty: 0,
  });

  // Sync canvas transform whenever canvasVersion bumps (pan/zoom) or strings change
  useEffect(() => {
    setCanvasState({
      scale: scaleVal.value,
      tx: tX.value,
      ty: tY.value,
    });
  }, [canvasVersion, strings, scaleVal, tX, tY]);

  const curScale = canvasState.scale;
  const curTX = canvasState.tx;
  const curTY = canvasState.ty;

  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <Filter id="stringGlow" x="-20%" y="-20%" width="140%" height="140%">
          <FeGaussianBlur stdDeviation="2" result="blur" />
          <FeComposite in="SourceGraphic" in2="blur" operator="over" />
        </Filter>
      </Defs>
      {strings.map((s) => {
        const fromN = nodeMap.get(s.fromNodeId);
        const toN = nodeMap.get(s.toNodeId);
        if (!fromN || !toN) return null;
        const fx = fromN.position.x * curScale + curTX + (NODE_W * curScale) / 2;
        const fy = fromN.position.y * curScale + curTY + (NODE_H * curScale) / 2;
        const tx2 = toN.position.x * curScale + curTX + (NODE_W * curScale) / 2;
        const ty2 = toN.position.y * curScale + curTY + (NODE_H * curScale) / 2;
        const pathD = makeBezierPath(fx, fy, tx2, ty2);
        const mid = bezierMidpoint(fx, fy, tx2, ty2);
        const color = s.color ?? C.red;
        const thickness = s.thickness ?? 2;
        const isSelected = selectedStringId === s.id;

        return (
          <React.Fragment key={s.id}>
            {/* Glow layer */}
            <Path
              d={pathD}
              stroke={color}
              strokeWidth={(thickness + 2) * curScale}
              fill="none"
              opacity={0.2}
            />
            {/* Main bezier string */}
            <Path
              d={pathD}
              stroke={color}
              strokeWidth={(isSelected ? thickness + 1.5 : thickness) * curScale}
              fill="none"
              opacity={isSelected ? 1 : 0.85}
              strokeDasharray={
                s.style === 'dashed'
                  ? `${6 * curScale},${4 * curScale}`
                  : s.style === 'dotted'
                  ? `${2 * curScale},${4 * curScale}`
                  : undefined
              }
            />
            {/* Endpoint circles */}
            <SvgCircle cx={fx} cy={fy} r={4 * curScale} fill={color} opacity={0.9} />
            <SvgCircle cx={tx2} cy={ty2} r={4 * curScale} fill={color} opacity={0.9} />
            {/* Label at bezier midpoint */}
            {s.label ? (
              <SvgText
                x={mid.x}
                y={mid.y - 6 * curScale}
                fill={C.text}
                fontSize={10 * curScale}
                textAnchor="middle"
              >
                {s.label}
              </SvgText>
            ) : null}
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

// ---- Trash Zone component ----
function TrashZone({
  visible,
  isActive,
}: {
  visible: Animated.SharedValue<boolean>;
  isActive: Animated.SharedValue<boolean>;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: withTiming(visible.value ? 1 : 0, { duration: 200 }),
    transform: [{ translateY: withTiming(visible.value ? 0 : 80, { duration: 200 }) }],
  }));
  const innerStyle = useAnimatedStyle(() => ({
    backgroundColor: isActive.value ? 'rgba(196,30,58,0.35)' : 'rgba(196,30,58,0.12)',
    borderColor: isActive.value ? '#C41E3A' : 'rgba(196,30,58,0.4)',
    transform: [{ scale: withTiming(isActive.value ? 1.06 : 1, { duration: 150 }) }],
  }));
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          bottom: 100,
          left: 0,
          right: 0,
          alignItems: 'center',
          zIndex: 999,
          pointerEvents: 'none',
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 24,
            paddingVertical: 14,
            borderRadius: 40,
            borderWidth: 1.5,
          },
          innerStyle,
        ]}
      >
        <Trash2 size={18} color="#C41E3A" strokeWidth={2} />
        <Text style={{ color: '#C41E3A', fontSize: 14, fontWeight: '700', letterSpacing: 0.5 }}>
          Drop to delete
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

// ---- Main Canvas Screen ----
export default function InvestigationCanvas() {
  const router = useRouter();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const canvasViewRef = React.useRef<View>(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [showCollabSheet, setShowCollabSheet] = useState(false);
  const [collabSessions, setCollabSessions] = useState<any[]>([]);
  const [collabLoading, setCollabLoading] = useState(false);

  // Store selectors
  const activeId = useInvestigationStore((s) => s.activeInvestigationId);
  const selectedNodeId = useInvestigationStore((s) => s.selectedNodeId);
  const connectingFromId = useInvestigationStore((s) => s.connectingFromId);
  const investigations = useInvestigationStore((s) => s.investigations);
  const canvasMode = useInvestigationStore((s) => s.canvasMode);

  const setActiveInvestigation = useInvestigationStore((s) => s.setActiveInvestigation);
  const setSelectedNode = useInvestigationStore((s) => s.setSelectedNode);
  const setConnectingFrom = useInvestigationStore((s) => s.setConnectingFrom);
  const setCanvasMode = useInvestigationStore((s) => s.setCanvasMode);
  const storeAddNode = useInvestigationStore((s) => s.addNode);
  const storeUpdateNode = useInvestigationStore((s) => s.updateNode);
  const storeDeleteNode = useInvestigationStore((s) => s.deleteNode);
  const storeMoveNode = useInvestigationStore((s) => s.moveNode);
  const storeAddString = useInvestigationStore((s) => s.addString);
  const storeUpdateString = useInvestigationStore((s) => s.updateString);
  const storeDeleteString = useInvestigationStore((s) => s.deleteString);
  const storeAddTimeline = useInvestigationStore((s) => s.addTimeline);
  const storeUpdateTimeline = useInvestigationStore((s) => s.updateTimeline);
  const storeDeleteTimeline = useInvestigationStore((s) => s.deleteTimeline);
  const storeToggleTimelineMinimized = useInvestigationStore((s) => s.toggleTimelineMinimized);

  // Subscription store
  const maxNodesPerInvestigation = useSubscriptionStore((s) => s.maxNodesPerInvestigation);
  const tier = useSubscriptionStore((s) => s.tier);
  const maxNodes = maxNodesPerInvestigation();

  // Tour/demo store
  const isDemoMode = useTourStore((s) => s.isDemoMode);

  // Canvas version counter — increments on every pan/zoom to force StringsLayer re-render
  const [canvasVersion, setCanvasVersion] = useState<number>(0);
  const bumpCanvas = useCallback(() => setCanvasVersion((v) => v + 1), []);

  // Automation engine — auto-tags and auto-connects nodes on save
  useAutomationEngine(activeId, (msg) => {
    if (typeof burnt !== 'undefined') {
      burnt.toast({ title: msg, preset: 'done' });
    }
  });

  // Derive active investigation
  const investigation = useMemo(
    () => investigations.find((inv) => inv.id === activeId),
    [investigations, activeId]
  );

  const nodes = investigation?.nodes ?? [];
  const strings = investigation?.strings ?? [];
  const timelines = investigation?.timelines ?? [];

  // Local UI state
  const [connectMode, setConnectMode] = useState<boolean>(false);
  const [showAddMenu, setShowAddMenu] = useState<boolean>(false);
  const [showStylePicker, setShowStylePicker] = useState<boolean>(false);
  const [showNodeLimitModal, setShowNodeLimitModal] = useState<boolean>(false);
  const [selectedStringId, setSelectedStringId] = useState<string | null>(null);
  const [showSuggestionSheet, setShowSuggestionSheet] = useState<boolean>(false);
  const [colorToast, setColorToast] = useState<string | null>(null);
  const colorToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Undo state for drag-to-trash
  const [undoNode, setUndoNode] = useState<{ node: CanvasNode; strings: RedString[] } | null>(null);
  const [showUndoToast, setShowUndoToast] = useState<boolean>(false);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Shared values for trash zone
  const nodeIsDragging = useSharedValue(false);
  const nodeIsOverTrash = useSharedValue(false);

  // ---- Screenshot / background protection ----
  const [showPrivacyOverlay, setShowPrivacyOverlay] = useState<boolean>(false);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'inactive' || nextState === 'background') {
        setShowPrivacyOverlay(true);
      } else if (nextState === 'active') {
        // Keep overlay visible for 2 seconds after returning, then fade
        const t = setTimeout(() => setShowPrivacyOverlay(false), 2000);
        return () => clearTimeout(t);
      }
    });
    return () => sub.remove();
  }, []);

  // Cleanup color toast timer
  useEffect(() => {
    return () => {
      if (colorToastTimer.current) clearTimeout(colorToastTimer.current);
    };
  }, []);

  const showColorToastMessage = useCallback((message: string) => {
    setColorToast(message);
    if (colorToastTimer.current) clearTimeout(colorToastTimer.current);
    colorToastTimer.current = setTimeout(() => setColorToast(null), 2000);
  }, []);

  // Bottom sheet
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['45%', '80%'], []);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editContent, setEditContent] = useState<string>('');
  const [editDate, setEditDate] = useState<string>(''); // "YYYY-MM-DD" or free text like "Nov 1963"

  // Canvas shared values
  const tX = useSharedValue(0);
  const tY = useSharedValue(0);
  const scaleVal = useSharedValue(1);
  const savedTX = useSharedValue(0);
  const savedTY = useSharedValue(0);
  const savedScale = useSharedValue(1);

  // Canvas gestures
  const canvasPan = useMemo(
    () =>
      Gesture.Pan()
        .minPointers(2)
        .onStart(() => {
          savedTX.value = tX.value;
          savedTY.value = tY.value;
        })
        .onUpdate((e) => {
          tX.value = savedTX.value + e.translationX;
          tY.value = savedTY.value + e.translationY;
          runOnJS(bumpCanvas)();
        }),
    [tX, tY, savedTX, savedTY, bumpCanvas]
  );

  const canvasPinch = useMemo(
    () =>
      Gesture.Pinch()
        .onStart(() => {
          savedScale.value = scaleVal.value;
        })
        .onUpdate((e) => {
          const next = savedScale.value * e.scale;
          scaleVal.value = Math.min(Math.max(next, 0.3), 3.0);
          runOnJS(bumpCanvas)();
        }),
    [scaleVal, savedScale, bumpCanvas]
  );

  const canvasGesture = useMemo(
    () => Gesture.Simultaneous(canvasPan, canvasPinch),
    [canvasPan, canvasPinch]
  );

  // Node tap handler
  const handleNodeTap = useCallback(
    (nodeId: string) => {
      if (!activeId) return;
      if (connectMode) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Read fresh from store to avoid stale closure
        const freshConnectingFrom = useInvestigationStore.getState().connectingFromId;
        if (!freshConnectingFrom) {
          setConnectingFrom(nodeId);
        } else if (freshConnectingFrom !== nodeId) {
          storeAddString(activeId, freshConnectingFrom, nodeId);
          setConnectingFrom(null);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const nd = nodes.find((n) => n.id === nodeId);
        if (nd) {
          setEditTitle(nd.title);
          setEditContent(nd.content ?? nd.description ?? '');
          // Populate date field from existing timestamp
          if (nd.timestamp) {
            const d = new Date(nd.timestamp);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            setEditDate(`${yyyy}-${mm}-${dd}`);
          } else {
            setEditDate('');
          }
        }
        setSelectedNode(nodeId);
        bottomSheetRef.current?.snapToIndex(0);
      }
    },
    [activeId, connectMode, storeAddString, nodes, setSelectedNode, setConnectingFrom]
  );

  // Node drag handler
  const handleNodeDragEnd = useCallback(
    (nodeId: string, x: number, y: number) => {
      if (!activeId) return;
      storeMoveNode(activeId, nodeId, { x, y });
    },
    [activeId, storeMoveNode]
  );

  // Trash zone threshold — trash zone starts 180px above screen bottom
  const TRASH_ZONE_TOP = screenH - 180;

  const handleNodeDragStart = useCallback((_nodeId: string) => {
    nodeIsDragging.value = true;
  }, [nodeIsDragging]);

  const handleNodeDragMove = useCallback((_nodeId: string, screenY: number) => {
    nodeIsOverTrash.value = screenY > TRASH_ZONE_TOP;
  }, [nodeIsOverTrash, TRASH_ZONE_TOP]);

  const handleNodeDragEndPosition = useCallback((nodeId: string, _screenX: number, screenY: number) => {
    nodeIsDragging.value = false;
    const overTrash = screenY > TRASH_ZONE_TOP;
    nodeIsOverTrash.value = false;
    if (overTrash && activeId) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      const nodeToDelete = nodes.find((n) => n.id === nodeId);
      const stringsToDelete = strings.filter((s) => s.fromNodeId === nodeId || s.toNodeId === nodeId);
      if (nodeToDelete) {
        storeDeleteNode(activeId, nodeId);
        if (undoTimer.current) clearTimeout(undoTimer.current);
        setUndoNode({ node: nodeToDelete, strings: stringsToDelete });
        setShowUndoToast(true);
        undoTimer.current = setTimeout(() => {
          setShowUndoToast(false);
          setUndoNode(null);
        }, 4000);
      }
    }
  }, [activeId, nodes, strings, storeDeleteNode, nodeIsDragging, nodeIsOverTrash, TRASH_ZONE_TOP]);

  const handleUndoDelete = useCallback(() => {
    if (!undoNode || !activeId) return;
    if (undoTimer.current) clearTimeout(undoTimer.current);
    // Restore the node at its original position with all its properties
    storeAddNode(activeId, undoNode.node.type, undoNode.node.title, undoNode.node.position, {
      id: undoNode.node.id,
      content: undoNode.node.content,
      description: undoNode.node.description,
      color: undoNode.node.color,
      tags: undoNode.node.tags,
      size: undoNode.node.size,
      createdAt: undoNode.node.createdAt,
    });
    // Restore connected strings
    undoNode.strings.forEach((s) => {
      storeAddString(activeId, s.fromNodeId, s.toNodeId, s.label, s.color);
    });
    setShowUndoToast(false);
    setUndoNode(null);
  }, [undoNode, activeId, storeAddNode, storeAddString]);

  // Add node
  const handleAddNode = useCallback(
    (type: NodeType) => {
      if (!activeId) return;
      if (nodes.length >= maxNodes) {
        setShowAddMenu(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setShowNodeLimitModal(true);
        return;
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const centerX = (-tX.value + screenW / 2) / scaleVal.value - NODE_W / 2;
      const centerY = (-tY.value + screenH / 2) / scaleVal.value - NODE_H / 2;
      const typeLabels: Record<NodeType, string> = {
        note: 'New Note',
        link: 'New Link',
        image: 'New Image',
        folder: 'New Folder',
        dataset: 'New Dataset',
        investigation: 'Sub-Investigation',
      };
      storeAddNode(activeId, type, typeLabels[type], { x: centerX, y: centerY });
      setShowAddMenu(false);
    },
    [activeId, nodes.length, maxNodes, tX, tY, scaleVal, screenW, screenH, storeAddNode]
  );

  // Toggle connect mode
  const toggleConnectMode = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setConnectMode((prev) => {
      if (prev) setConnectingFrom(null);
      return !prev;
    });
  }, [setConnectingFrom]);

  // Toggle canvas mode
  const toggleCanvasMode = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCanvasMode(canvasMode === 'corkboard' ? 'mindmap' : 'corkboard');
  }, [canvasMode, setCanvasMode]);

  // Save node edits
  const handleSaveNode = useCallback(() => {
    if (!activeId || !selectedNodeId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Parse date string into unix timestamp
    let timestamp: number | undefined = undefined;
    if (editDate.trim()) {
      const parsed = new Date(editDate.trim());
      if (!isNaN(parsed.getTime())) {
        timestamp = parsed.getTime();
      }
    }
    storeUpdateNode(activeId, selectedNodeId, {
      title: editTitle,
      content: editContent,
      description: editContent,
      timestamp,
    });
    bottomSheetRef.current?.close();
    setSelectedNode(null);
  }, [activeId, selectedNodeId, editTitle, editContent, editDate, storeUpdateNode, setSelectedNode]);

  // Delete node
  const handleDeleteNode = useCallback(() => {
    if (!activeId || !selectedNodeId) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    storeDeleteNode(activeId, selectedNodeId);
    bottomSheetRef.current?.close();
    setSelectedNode(null);
  }, [activeId, selectedNodeId, storeDeleteNode, setSelectedNode]);

  // Go back
  const handleGoBack = useCallback(() => {
    setActiveInvestigation(null);
    router.push('/(tabs)');
  }, [setActiveInvestigation, router]);

  // Backdrop
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    []
  );

  // Selected node data
  const selectedNode = useMemo(
    () => (selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : undefined),
    [selectedNodeId, nodes]
  );

  const selectedNodeStrings = useMemo(
    () =>
      selectedNodeId
        ? strings.filter((s) => s.fromNodeId === selectedNodeId || s.toNodeId === selectedNodeId)
        : [],
    [selectedNodeId, strings]
  );

  const handleOpenCollabSheet = useCallback(async () => {
    if (!selectedNode) {
      burnt.toast({ title: 'Select a node on the board first', preset: 'error' });
      return;
    }
    setShowCollabSheet(true);
    setCollabLoading(true);
    try {
      const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? '';
      const res = await fetch(`${BACKEND_URL}/api/collab/sessions`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (res.ok) {
        const json = await res.json();
        const allSessions: any[] = json.data ?? [];
        const filtered = allSessions.filter((s: any) => s.investigationId === activeId);
        setCollabSessions(filtered);
      }
    } catch {}
    finally {
      setCollabLoading(false);
    }
  }, [selectedNode, activeId]);

  const isAtNodeLimit = maxNodes !== Infinity && nodes.length >= maxNodes;

  // ---- No active investigation ----
  if (!investigation) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: C.bg }}
        testID="canvas-empty"
      >
        <SafeAreaView className="flex-1 items-center justify-center" edges={['top', 'bottom']}>
          <Search size={48} color={C.muted} strokeWidth={1.5} />
          <Text
            className="text-lg font-semibold"
            style={{ color: C.text, marginTop: 16, marginBottom: 8 }}
          >
            Select an investigation to begin
          </Text>
          <Pressable
            testID="go-back-button"
            onPress={handleGoBack}
            style={({ pressed }) => ({
              backgroundColor: pressed ? '#A3162E' : C.red,
              borderRadius: 10,
              paddingHorizontal: 24,
              paddingVertical: 12,
              marginTop: 8,
            })}
          >
            <Text className="text-base font-bold" style={{ color: '#FFF' }}>
              Go to Investigations
            </Text>
          </Pressable>
        </SafeAreaView>
      </View>
    );
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Tab bar height estimate (88) + safe area bottom
  const tabBarH = 88;
  const bottomOffset = tabBarH;

  return (
    <View ref={canvasViewRef} className="flex-1" style={{ backgroundColor: C.bg }} testID="canvas-screen">
      {/* Demo Mode Banner */}
      {isDemoMode ? (
        <View
          testID="canvas-demo-banner"
          style={{
            backgroundColor: C.red,
            height: 36,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 }}>
            DEMO MODE — Sample investigation data
          </Text>
        </View>
      ) : null}
      {/* ---- CANVAS AREA ---- */}
      <View style={{ flex: 1, marginBottom: 0 }}>
        {canvasMode === 'corkboard' ? (
          /* ---- CORKBOARD MODE ---- */
          <GestureDetector gesture={canvasGesture}>
            <View style={StyleSheet.absoluteFill}>
              {/* Cork texture dots */}
              <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
                {Array.from({ length: 40 }, (_, r) =>
                  Array.from({ length: 60 }, (_, col) => (
                    <SvgCircle
                      key={`d${r}-${col}`}
                      cx={r * 24 + 12}
                      cy={col * 24 + 12}
                      r={1.5}
                      fill="#F5ECD7"
                      opacity={0.06}
                    />
                  ))
                )}
              </Svg>

              {/* Bezier string connections */}
              <StringsLayer
                strings={strings}
                nodeMap={nodeMap}
                scaleVal={scaleVal}
                tX={tX}
                tY={tY}
                selectedStringId={selectedStringId}
                canvasVersion={canvasVersion}
              />

              {/* Node cards */}
              {nodes.map((node) => (
                <NodeCard
                  key={node.id}
                  node={node}
                  scaleVal={scaleVal}
                  tX={tX}
                  tY={tY}
                  connectMode={connectMode}
                  connectingFromId={connectingFromId}
                  onTap={handleNodeTap}
                  onDragEnd={handleNodeDragEnd}
                  onDragStart={handleNodeDragStart}
                  onDragMove={handleNodeDragMove}
                  onDragEndPosition={handleNodeDragEndPosition}
                />
              ))}
            </View>
          </GestureDetector>
        ) : (
          /* ---- MIND MAP MODE ---- */
          <MindMapCanvas
            nodes={nodes}
            strings={strings}
            selectedNodeId={selectedNodeId}
            onSelectNode={(id) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              const nd = nodes.find((n) => n.id === id);
              if (nd) {
                setEditTitle(nd.title);
                setEditContent(nd.content ?? nd.description ?? '');
              }
              setSelectedNode(id);
              bottomSheetRef.current?.snapToIndex(0);
            }}
          />
        )}
      </View>

      {/* ---- TRASH ZONE (appears while dragging a node) ---- */}
      <TrashZone visible={nodeIsDragging} isActive={nodeIsOverTrash} />

      {/* ---- CONNECT MODE BANNER ---- */}
      {connectMode ? (
        <Animated.View
          entering={SlideInDown.springify().damping(18)}
          exiting={SlideOutDown.duration(200)}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 200, paddingTop: 8, paddingHorizontal: 12, pointerEvents: 'none' }}
        >
          <View style={{ backgroundColor: 'rgba(196,30,58,0.95)', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFF' }} />
            <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '800', flex: 1 }}>
              {connectingFromId ? '✓ Node selected — tap another to connect' : 'String Mode — tap a node to start'}
            </Text>
            <Pressable onPress={() => { setConnectMode(false); setConnectingFrom(null); }} style={{ padding: 4, pointerEvents: 'auto' }}>
              <X size={14} color="rgba(255,255,255,0.7)" strokeWidth={2.5} />
            </Pressable>
          </View>
        </Animated.View>
      ) : null}

      {/* ---- UNDO TOAST (after drag-to-trash delete) ---- */}
      {showUndoToast && undoNode ? (
        <Animated.View
          entering={SlideInDown.duration(250)}
          exiting={SlideOutDown.duration(200)}
          style={{
            position: 'absolute',
            bottom: bottomOffset + 16,
            left: 16,
            right: 16,
            backgroundColor: C.surface,
            borderRadius: 14,
            paddingHorizontal: 16,
            paddingVertical: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderWidth: 1,
            borderColor: C.border,
            zIndex: 1000,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 10,
            elevation: 8,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.text, fontSize: 13, fontWeight: '600' }}>
              "{undoNode.node.title}" deleted
            </Text>
            <Text style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>
              Tap Undo to restore
            </Text>
          </View>
          <Pressable
            onPress={handleUndoDelete}
            style={({ pressed }) => ({
              backgroundColor: pressed ? '#A3162E' : C.red,
              borderRadius: 8,
              paddingHorizontal: 14,
              paddingVertical: 8,
              marginLeft: 12,
            })}
          >
            <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>Undo</Text>
          </Pressable>
        </Animated.View>
      ) : null}

      {/* ---- TIMELINE PANEL — sits above tab bar ---- */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: bottomOffset }}>
        <TimelinePanel
          investigationId={activeId ?? ''}
          timelines={timelines}
          nodes={nodes}
          onAddTimeline={(label) => {
            if (activeId) storeAddTimeline(activeId, label);
          }}
          onDeleteTimeline={(timelineId) => {
            if (activeId) storeDeleteTimeline(activeId, timelineId);
          }}
          onToggleMinimized={(timelineId) => {
            if (activeId) storeToggleTimelineMinimized(activeId, timelineId);
          }}
          onUpdateTimeline={(timelineId, updates) => {
            if (activeId) storeUpdateTimeline(activeId, timelineId, updates);
          }}
        />
      </View>

      {/* ---- COLOR LEGEND — left edge, vertically centered ---- */}
      {activeId ? (
        <ColorLegend
          investigationId={activeId}
          onSuggestPress={() => setShowSuggestionSheet(true)}
        />
      ) : null}

      {/* ---- COLOR TOAST ---- */}
      {colorToast ? (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(300)}
          style={{
            position: 'absolute',
            bottom: bottomOffset + 80,
            alignSelf: 'center',
            backgroundColor: 'rgba(26, 22, 20, 0.92)',
            borderRadius: 20,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderWidth: 1,
            borderColor: C.border,
            zIndex: 200,
          }}
          pointerEvents="none"
        >
          <Text style={{ color: C.text, fontSize: 13, fontWeight: '600' }}>
            {colorToast}
          </Text>
        </Animated.View>
      ) : null}

      {/* ---- TOP BAR ---- */}
      <SafeAreaView
        edges={['top']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0 }}
        pointerEvents="box-none"
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
            paddingVertical: 10,
            gap: 10,
          }}
          pointerEvents="box-none"
        >
          {/* Back */}
          <Pressable
            testID="canvas-back-button"
            onPress={handleGoBack}
            style={({ pressed }) => ({
              width: 46,
              height: 46,
              borderRadius: 23,
              backgroundColor: pressed ? C.border : C.surface,
              alignItems: 'center',
              justifyContent: 'center',
            })}
          >
            <ArrowLeft size={22} color={C.text} strokeWidth={2} />
          </Pressable>

          {/* Title */}
          <View style={{ flex: 1 }} pointerEvents="none">
            <Text
              style={{ color: C.text, fontSize: 18, fontWeight: '700' }}
              numberOfLines={1}
            >
              {investigation.title}
            </Text>
            {connectMode ? (
              <Text className="text-xs" style={{ color: C.redLight }}>
                {connectingFromId ? 'Tap second node' : 'Tap first node'}
              </Text>
            ) : maxNodes !== Infinity ? (
              <Text
                className="text-xs"
                style={{ color: isAtNodeLimit ? C.red : C.muted }}
              >
                {nodes.length}/{maxNodes} nodes{isAtNodeLimit ? ' — limit reached' : null}
              </Text>
            ) : null}
          </View>

          {/* Canvas mode toggle */}
          <Pressable
            testID="canvas-mode-toggle"
            onPress={() => setShowStylePicker(true)}
            style={({ pressed }) => ({
              width: 46,
              height: 46,
              borderRadius: 23,
              backgroundColor: pressed ? C.border : C.surface,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: C.border,
            })}
          >
            {canvasMode === 'corkboard' ? (
              <Network size={22} color={C.text} strokeWidth={2} />
            ) : (
              <LayoutGrid size={22} color={C.text} strokeWidth={2} />
            )}
          </Pressable>

          {/* Sources button */}
          <Pressable
            testID="sources-button"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push({ pathname: '/sources-panel', params: { investigationId: investigation.id } });
            }}
            style={({ pressed }) => ({
              width: 46,
              height: 46,
              borderRadius: 23,
              backgroundColor: pressed ? C.border : C.surface,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: C.border,
            })}
          >
            <BookOpen size={22} color={C.text} strokeWidth={2} />
          </Pressable>

          {/* Connect toggle (corkboard only) */}
          {canvasMode === 'corkboard' ? (
            <Pressable
              testID="connect-toggle"
              onPress={toggleConnectMode}
              style={({ pressed }) => ({
                width: 46,
                height: 46,
                borderRadius: 23,
                backgroundColor: connectMode ? C.red : pressed ? C.border : C.surface,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: connectMode ? 0 : 1,
                borderColor: C.border,
              })}
            >
              <Cable size={22} color={connectMode ? '#FFF' : C.text} strokeWidth={2} />
            </Pressable>
          ) : null}

          {/* Submit to Collab button */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              handleOpenCollabSheet();
            }}
            style={({ pressed }) => ({
              width: 46,
              height: 46,
              borderRadius: 23,
              backgroundColor: pressed ? C.border : C.surface,
              borderWidth: 1,
              borderColor: C.border,
              alignItems: 'center',
              justifyContent: 'center',
            })}
          >
            <Users size={22} color={C.text} strokeWidth={2} />
          </Pressable>

          {/* Go Live button */}
          <Pressable
            onPress={() => setIsBroadcasting(true)}
            style={({ pressed }) => ({
              width: 46,
              height: 46,
              borderRadius: 23,
              backgroundColor: isBroadcasting ? C.red : pressed ? C.border : C.surface,
              borderWidth: isBroadcasting ? 0 : 1,
              borderColor: C.border,
              alignItems: 'center',
              justifyContent: 'center',
            })}
          >
            <Radio size={22} color={isBroadcasting ? '#FFF' : C.text} strokeWidth={2} />
          </Pressable>

          {/* Add node */}
          <Pressable
            testID="add-node-button"
            onPress={() => {
              if (isAtNodeLimit) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                setShowNodeLimitModal(true);
                return;
              }
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowAddMenu(true);
            }}
            style={({ pressed }) => ({
              width: 46,
              height: 46,
              borderRadius: 23,
              backgroundColor: isAtNodeLimit ? C.border : pressed ? '#A3162E' : C.red,
              alignItems: 'center',
              justifyContent: 'center',
            })}
          >
            {isAtNodeLimit ? (
              <Lock size={20} color={C.muted} strokeWidth={2} />
            ) : (
              <Plus size={22} color="#FFF" strokeWidth={2.5} />
            )}
          </Pressable>
        </View>
      </SafeAreaView>

      {/* ---- CANVAS STYLE PICKER MODAL ---- */}
      <Modal
        visible={showStylePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStylePicker(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.85)',
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 24,
          }}
          onPress={() => setShowStylePicker(false)}
        >
          <Animated.View
            entering={SlideInDown.springify().damping(18)}
            exiting={SlideOutDown.springify()}
            style={{ width: '100%', maxWidth: 420 }}
          >
            <Pressable onPress={() => {}} style={{ width: '100%' }}>
              {/* Close button */}
              <Pressable
                onPress={() => setShowStylePicker(false)}
                style={{
                  position: 'absolute',
                  top: -8,
                  right: -8,
                  zIndex: 10,
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: C.surface,
                  borderWidth: 1,
                  borderColor: C.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={16} color={C.muted} strokeWidth={2.5} />
              </Pressable>

              {/* Header */}
              <View style={{ alignItems: 'center', marginBottom: 28 }}>
                <Text
                  style={{
                    color: C.text,
                    fontSize: 28,
                    fontWeight: '800',
                    letterSpacing: 0.3,
                    marginBottom: 8,
                  }}
                >
                  Canvas Style
                </Text>
                <Text style={{ color: C.muted, fontSize: 15, textAlign: 'center' }}>
                  Choose how your investigation is displayed
                </Text>
              </View>

              {/* Cards row */}
              <View style={{ flexDirection: 'row', gap: 16 }}>
                {/* Canvas / Corkboard card */}
                <Pressable
                  onPress={() => {
                    setCanvasMode('corkboard');
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setShowStylePicker(false);
                  }}
                  style={({ pressed }) => ({
                    flex: 1,
                    height: 180,
                    backgroundColor: canvasMode === 'corkboard'
                      ? 'rgba(212,165,116,0.12)'
                      : C.surface,
                    borderRadius: 20,
                    borderWidth: 2,
                    borderColor: canvasMode === 'corkboard' ? C.pin : C.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 20,
                    gap: 12,
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <LayoutGrid size={72} color={C.pin} strokeWidth={1.5} />
                  <View style={{ alignItems: 'center', gap: 4 }}>
                    <Text style={{ color: C.text, fontSize: 22, fontWeight: '700' }}>
                      Canvas
                    </Text>
                    <Text style={{ color: C.muted, fontSize: 14, textAlign: 'center' }}>
                      Pin notes on a corkboard
                    </Text>
                  </View>
                </Pressable>

                {/* Web / Mind Map card */}
                <Pressable
                  onPress={() => {
                    setCanvasMode('mindmap');
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setShowStylePicker(false);
                  }}
                  style={({ pressed }) => ({
                    flex: 1,
                    height: 180,
                    backgroundColor: canvasMode === 'mindmap'
                      ? 'rgba(59,130,246,0.12)'
                      : C.surface,
                    borderRadius: 20,
                    borderWidth: 2,
                    borderColor: canvasMode === 'mindmap' ? '#3B82F6' : C.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 20,
                    gap: 12,
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <Network size={72} color="#3B82F6" strokeWidth={1.5} />
                  <View style={{ alignItems: 'center', gap: 4 }}>
                    <Text style={{ color: C.text, fontSize: 22, fontWeight: '700' }}>
                      Web
                    </Text>
                    <Text style={{ color: C.muted, fontSize: 14, textAlign: 'center' }}>
                      Connect nodes in a network
                    </Text>
                  </View>
                </Pressable>
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>

      {/* ---- ADD NODE MENU ---- */}
      <Modal
        visible={showAddMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddMenu(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.6)',
            justifyContent: 'flex-end',
          }}
          onPress={() => setShowAddMenu(false)}
        >
          <Pressable onPress={() => {}} style={styles.addMenuContainer}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <Text style={{ color: C.text, fontSize: 22, fontWeight: '800' }}>
                Add Node
              </Text>
              <Pressable onPress={() => setShowAddMenu(false)}>
                <X size={20} color={C.muted} strokeWidth={2} />
              </Pressable>
            </View>
            {(
              [
                { type: 'note' as const, label: 'Note', Icon: FileText },
                { type: 'link' as const, label: 'Link', Icon: Link2 },
                { type: 'image' as const, label: 'Image', Icon: ImageIcon },
                { type: 'folder' as const, label: 'Folder', Icon: Folder },
                { type: 'dataset' as const, label: 'Dataset', Icon: Database },
              ] as const
            ).map((item) => (
              <Pressable
                key={item.type}
                testID={`add-node-${item.type}`}
                onPress={() => handleAddNode(item.type)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  paddingVertical: 14,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  backgroundColor: pressed ? C.border : 'transparent',
                })}
              >
                <View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    backgroundColor: C.bg,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <item.Icon size={26} color={C.pin} strokeWidth={2} />
                </View>
                <Text style={{ color: C.text, fontSize: 17, fontWeight: '600' }}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ---- NODE LIMIT MODAL ---- */}
      <Modal
        visible={showNodeLimitModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNodeLimitModal(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.75)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
          }}
          onPress={() => setShowNodeLimitModal(false)}
        >
          <Pressable
            onPress={() => {}}
            style={{
              width: '100%',
              maxWidth: 400,
              backgroundColor: C.surface,
              borderRadius: 20,
              padding: 28,
              borderWidth: 1,
              borderColor: C.border,
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: 'rgba(196, 30, 58, 0.15)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <Lock size={24} color={C.red} strokeWidth={2} />
            </View>
            <Text
              className="text-xl font-bold"
              style={{ color: C.text, marginBottom: 8, textAlign: 'center' }}
            >
              Node Limit Reached
            </Text>
            <Text
              className="text-sm"
              style={{ color: C.muted, lineHeight: 20, marginBottom: 24, textAlign: 'center' }}
            >
              {tier === 'free'
                ? `Free accounts are limited to ${maxNodes} nodes per investigation. Upgrade to Pro for up to 200, or Plus for unlimited.`
                : `You've reached the ${maxNodes} node limit for your plan. Upgrade to Plus for unlimited nodes.`}
            </Text>
            <Pressable
              testID="upgrade-from-node-limit-button"
              onPress={() => {
                setShowNodeLimitModal(false);
                router.push('/paywall');
              }}
              style={({ pressed }) => ({
                width: '100%',
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: 'center',
                backgroundColor: pressed ? '#A3162E' : C.red,
                marginBottom: 12,
                shadowColor: C.red,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
              })}
            >
              <Text className="text-base font-bold" style={{ color: '#FFF' }}>
                Upgrade Now
              </Text>
            </Pressable>
            <Pressable
              testID="dismiss-node-limit-button"
              onPress={() => setShowNodeLimitModal(false)}
              style={({ pressed }) => ({
                paddingVertical: 10,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text style={{ color: C.muted, fontSize: 14 }}>Not now</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ---- BOTTOM SHEET (Node Detail) ---- */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: C.surface }}
        handleIndicatorStyle={{ backgroundColor: C.muted }}
        backdropComponent={renderBackdrop}
        onChange={(index: number) => {
          if (index === -1) {
            setSelectedNode(null);
          }
        }}
      >
        <BottomSheetScrollView
          style={{ paddingHorizontal: 20 }}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {selectedNode ? (
            <>
              {/* Type badge */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <View
                  style={{
                    backgroundColor: C.bg,
                    borderRadius: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  {React.createElement(NODE_ICONS[selectedNode.type] ?? FileText, {
                    size: 12,
                    color: C.pin,
                    strokeWidth: 2,
                  })}
                  <Text
                    style={{
                      color: C.pin,
                      fontSize: 11,
                      fontWeight: '700',
                      textTransform: 'uppercase',
                    }}
                  >
                    {selectedNode.type}
                  </Text>
                </View>
              </View>

              {/* Title input */}
              <Text
                className="text-xs font-semibold"
                style={{ color: C.muted, marginBottom: 6, letterSpacing: 1 }}
              >
                TITLE
              </Text>
              <BottomSheetTextInput
                testID="node-title-input"
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="Node title"
                placeholderTextColor={C.muted}
                style={styles.sheetInput}
              />

              {/* Content input */}
              <Text
                className="text-xs font-semibold"
                style={{ color: C.muted, marginBottom: 6, marginTop: 16, letterSpacing: 1 }}
              >
                CONTENT
              </Text>
              <BottomSheetTextInput
                testID="node-content-input"
                value={editContent}
                onChangeText={setEditContent}
                placeholder="Notes, links, details..."
                placeholderTextColor={C.muted}
                multiline
                style={[styles.sheetInput, { minHeight: 100, textAlignVertical: 'top' }]}
              />

              {/* Date field */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 6, gap: 6 }}>
                <Calendar size={12} color={C.muted} strokeWidth={2} />
                <Text
                  className="text-xs font-semibold"
                  style={{ color: C.muted, letterSpacing: 1 }}
                >
                  DATE (for timeline)
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <BottomSheetTextInput
                  value={editDate}
                  onChangeText={setEditDate}
                  placeholder="e.g. 1963-11-22 or Nov 1963"
                  placeholderTextColor={C.muted}
                  style={[styles.sheetInput, { flex: 1 }]}
                />
                {editDate.trim() ? (
                  <Pressable
                    onPress={() => setEditDate('')}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: C.border,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <X size={13} color={C.muted} strokeWidth={2} />
                  </Pressable>
                ) : null}
              </View>

              {/* Tags */}
              {selectedNode.tags.length > 0 ? (
                <>
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: C.muted, marginTop: 16, marginBottom: 8, letterSpacing: 1 }}
                  >
                    TAGS
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {selectedNode.tags.map((tag) => (
                      <View
                        key={tag.id}
                        style={{
                          backgroundColor: TAG_COLORS[tag.color] + '22',
                          borderRadius: 6,
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                        }}
                      >
                        <Text
                          style={{
                            color: TAG_COLORS[tag.color],
                            fontSize: 12,
                            fontWeight: '600',
                          }}
                        >
                          {tag.label}
                        </Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : null}

              {/* ---- COLOR CODE section ---- */}
              <Text
                className="text-xs font-semibold"
                style={{ color: C.muted, marginTop: 16, marginBottom: 10, letterSpacing: 1 }}
              >
                COLOR CODE
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                {(Object.entries(TAG_COLORS) as Array<[TagColor, string]>).map(([colorKey, hex]) => {
                  const isAssigned = selectedNode.color === colorKey;
                  // Find legend label for this color
                  const legendEntry = investigation.colorLegend?.find((e) => e.color === hex);
                  return (
                    <Pressable
                      key={colorKey}
                      testID={`color-swatch-${colorKey}`}
                      onPress={() => {
                        if (!activeId || !selectedNodeId) return;
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        const newColor: TagColor | undefined = isAssigned ? undefined : colorKey;
                        storeUpdateNode(activeId, selectedNodeId, { color: newColor });
                        if (!isAssigned && legendEntry) {
                          showColorToastMessage(`Tagged as ${legendEntry.label}`);
                        }
                      }}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: hex,
                        borderWidth: isAssigned ? 3 : 1.5,
                        borderColor: isAssigned ? '#FFFFFF' : 'transparent',
                        shadowColor: isAssigned ? hex : 'transparent',
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: isAssigned ? 0.9 : 0,
                        shadowRadius: isAssigned ? 8 : 0,
                        elevation: isAssigned ? 4 : 0,
                      }}
                    />
                  );
                })}
              </View>
              {/* Legend label hint */}
              {selectedNode.color ? (
                <Text style={{ color: C.muted, fontSize: 12, marginTop: 6 }}>
                  {(() => {
                    const hex = TAG_COLORS[selectedNode.color];
                    const legendEntry = investigation.colorLegend?.find((e) => e.color === hex);
                    return legendEntry ? `${legendEntry.label}` : selectedNode.color;
                  })()}
                </Text>
              ) : null}

              {/* Connected strings with color pickers */}
              {selectedNodeStrings.length > 0 ? (
                <>
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: C.muted, marginTop: 16, marginBottom: 8, letterSpacing: 1 }}
                  >
                    CONNECTIONS ({selectedNodeStrings.length})
                  </Text>
                  {selectedNodeStrings.map((s) => {
                    const otherId =
                      s.fromNodeId === selectedNodeId ? s.toNodeId : s.fromNodeId;
                    const otherNode = nodes.find((n) => n.id === otherId);
                    return (
                      <View key={s.id} style={{ marginBottom: 12 }}>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingVertical: 8,
                            borderBottomWidth: 1,
                            borderBottomColor: C.border,
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <Text className="text-sm font-medium" style={{ color: C.text }}>
                              {otherNode?.title ?? 'Unknown'}
                            </Text>
                            {s.label ? (
                              <Text className="text-xs" style={{ color: s.color ?? C.red }}>
                                {s.label}
                              </Text>
                            ) : null}
                          </View>
                          <Pressable
                            onPress={() => {
                              if (activeId) {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                storeDeleteString(activeId, s.id);
                              }
                            }}
                          >
                            <X size={16} color={C.muted} strokeWidth={2} />
                          </Pressable>
                        </View>
                        {/* String color picker */}
                        <View
                          style={{
                            flexDirection: 'row',
                            gap: 6,
                            paddingVertical: 8,
                            flexWrap: 'wrap',
                          }}
                        >
                          {STRING_COLORS.map((col) => (
                            <Pressable
                              key={col}
                              onPress={() => {
                                if (activeId) {
                                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                  storeUpdateString(activeId, s.id, { color: col });
                                }
                              }}
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: 11,
                                backgroundColor: col,
                                borderWidth: s.color === col ? 3 : 1,
                                borderColor: s.color === col ? '#FFFFFF' : 'transparent',
                              }}
                            />
                          ))}
                        </View>
                      </View>
                    );
                  })}
                </>
              ) : null}

              {/* Actions */}
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
                <Pressable
                  testID="delete-node-button"
                  onPress={handleDeleteNode}
                  style={({ pressed }) => ({
                    flex: 1,
                    paddingVertical: 14,
                    borderRadius: 10,
                    alignItems: 'center',
                    backgroundColor: pressed ? '#3D1520' : 'rgba(196,30,58,0.12)',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: 6,
                  })}
                >
                  <Trash2 size={16} color={C.red} strokeWidth={2} />
                  <Text className="text-sm font-bold" style={{ color: C.red }}>
                    Delete
                  </Text>
                </Pressable>
                <Pressable
                  testID="save-node-button"
                  onPress={handleSaveNode}
                  style={({ pressed }) => ({
                    flex: 2,
                    paddingVertical: 14,
                    borderRadius: 10,
                    alignItems: 'center',
                    backgroundColor: pressed ? '#A3162E' : C.red,
                  })}
                >
                  <Text className="text-sm font-bold" style={{ color: '#FFF' }}>
                    Save Changes
                  </Text>
                </Pressable>
              </View>
            </>
          ) : null}
        </BottomSheetScrollView>
      </BottomSheet>

      {/* ---- COLOR SUGGESTION SHEET ---- */}
      {activeId ? (
        <ColorSuggestionSheet
          investigationId={activeId}
          isVisible={showSuggestionSheet}
          onClose={() => setShowSuggestionSheet(false)}
        />
      ) : null}

      {/* ---- PRIVACY OVERLAY (screenshot / background protection) ---- */}
      {showPrivacyOverlay ? (
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(400)}
          style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: C.bg,
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: C.surface,
              borderWidth: 1,
              borderColor: C.border,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
              shadowColor: C.red,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.25,
              shadowRadius: 16,
              elevation: 12,
            }}
          >
            <Svg width={40} height={40} viewBox="0 0 64 64">
              <SvgCircle cx={32} cy={14} r={4} fill={C.red} opacity={0.9} />
              <SvgCircle cx={50} cy={44} r={4} fill={C.red} opacity={0.9} />
              <SvgCircle cx={14} cy={44} r={4} fill={C.red} opacity={0.9} />
              <Path d="M32 14 L50 44" stroke={C.red} strokeWidth={1.5} fill="none" opacity={0.7} />
              <Path d="M50 44 L14 44" stroke={C.red} strokeWidth={1.5} fill="none" opacity={0.7} />
              <Path d="M14 44 L32 14" stroke={C.red} strokeWidth={1.5} fill="none" opacity={0.7} />
            </Svg>
          </View>
          <Text
            style={{
              fontSize: 20,
              fontWeight: '900',
              color: C.red,
              letterSpacing: 3,
              marginBottom: 4,
            }}
          >
            RED STRING
          </Text>
          <Text
            style={{
              fontSize: 11,
              fontWeight: '700',
              color: C.pin,
              letterSpacing: 5,
            }}
          >
            RESEARCH
          </Text>
        </Animated.View>
      ) : null}

      {/* Tour Overlay */}
      <TourOverlay />

      {/* Broadcaster Overlay */}
      {isBroadcasting && investigation ? (
        <BroadcasterOverlay
          investigationTitle={investigation.title}
          investigationId={investigation.id}
          canvasRef={canvasViewRef}
          onClose={() => setIsBroadcasting(false)}
        />
      ) : null}

      {/* Collab Submit Sheet */}
      <Modal visible={showCollabSheet} transparent animationType="slide" onRequestClose={() => setShowCollabSheet(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }} onPress={() => setShowCollabSheet(false)}>
          <Pressable onPress={() => {}} style={{ backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderTopWidth: 1, borderTopColor: C.border, maxHeight: '60%' }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 20 }} />
            <Text style={{ color: C.text, fontSize: 17, fontWeight: '800', letterSpacing: 0.3, marginBottom: 4 }}>Submit to Collab</Text>
            <Text style={{ color: C.muted, fontSize: 12, marginBottom: 20 }}>
              {selectedNode ? `Submitting: ${selectedNode.title}` : 'No node selected'}
            </Text>
            {collabLoading ? (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <ActivityIndicator color={C.red} />
              </View>
            ) : collabSessions.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <Text style={{ color: C.muted, fontSize: 13, textAlign: 'center', marginBottom: 16 }}>
                  No collab sessions for this investigation — create one first
                </Text>
                <Pressable
                  onPress={() => {
                    setShowCollabSheet(false);
                    router.push('/collab');
                  }}
                  style={({ pressed }) => ({ backgroundColor: pressed ? '#A3162E' : C.red, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 11 })}
                >
                  <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>Go to Collab</Text>
                </Pressable>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {collabSessions.map((s: any) => (
                  <Pressable
                    key={s.id}
                    onPress={async () => {
                      if (!selectedNode) return;
                      setShowCollabSheet(false);
                      try {
                        const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? '';
                        await fetch(`${BACKEND_URL}/api/collab/sessions/${s.id}/pending`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({ nodeData: JSON.stringify(selectedNode) }),
                        });
                        burnt.toast({ title: 'Node submitted for review', preset: 'done' });
                      } catch {
                        burnt.toast({ title: 'Failed to submit node', preset: 'error' });
                      }
                    }}
                    style={({ pressed }) => ({
                      backgroundColor: pressed ? '#2A2522' : C.bg,
                      borderRadius: 12,
                      padding: 14,
                      marginBottom: 10,
                      borderWidth: 1,
                      borderColor: C.border,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                    })}
                  >
                    <Users size={16} color={C.pin} strokeWidth={2} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: C.text, fontSize: 14, fontWeight: '600' }}>{s.title}</Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  nodeCard: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 5,
    minHeight: 60,
  },
  pushpin: {
    position: 'absolute',
    top: -8,
    left: 28,
    width: 16,
    height: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
    zIndex: 2,
  },
  addMenuContainer: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: C.border,
    borderBottomWidth: 0,
  },
  sheetInput: {
    backgroundColor: C.bg,
    borderRadius: 10,
    padding: 14,
    color: C.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
});


# mobile/src/app/+html.tsx

import { ScrollViewStyleReset } from 'expo-router/html';

// This file is web-only and used to configure the root HTML for every
// web page during static rendering.
// The contents of this function only run in Node.js environments and
// do not have access to the DOM or browser APIs.
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* 
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native. 
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />

        {/* Using raw CSS styles as an escape-hatch to ensure the background color never flickers in dark-mode. */}
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
        {/* Add any additional <head> elements that you want globally available on web... */}
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
body {
  background-color: #fff;
}
@media (prefers-color-scheme: dark) {
  body {
    background-color: #000;
  }
}`;


# mobile/src/app/+not-found.tsx

import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View testID="not-found-screen" className="flex-1 items-center justify-center bg-white p-5 dark:bg-black">
        <Text className="text-xl font-bold text-black dark:text-white">
          This screen doesn't exist.
        </Text>

        <Link href="/" testID="go-home-link" className="mt-4 py-4">
          <Text className="text-sm text-blue-500">Go to home screen!</Text>
        </Link>
      </View>
    </>
  );
}


# mobile/src/app/_layout.tsx

import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useEffect } from 'react';
import useSubscriptionStore from '@/lib/state/subscription-store';
import { useSession } from '@/lib/auth/use-session';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// Custom dark theme matching the corkboard aesthetic
const CorkboardTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#1A1614',
    card: '#231F1C',
    text: '#E8DCC8',
    border: '#3D332C',
    primary: '#C41E3A',
  },
};

function RootLayoutNav() {
  const checkSubscription = useSubscriptionStore((s) => s.checkSubscription);
  const { data: session, isLoading } = useSession();

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  // Keep splash screen visible while loading session
  if (isLoading) {
    return null;
  }

  const isAuthenticated = !!session?.user;

  return (
    <ThemeProvider value={CorkboardTheme}>
      <Stack>
        <Stack.Protected guard={isAuthenticated}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="paywall" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="tip-inbox" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="sources-panel" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="appearance" options={{ headerShown: false }} />
          <Stack.Screen name="live-broadcast" options={{ headerShown: false, presentation: 'modal' }} />
          <Stack.Screen name="live-streams" options={{ headerShown: false, presentation: 'modal' }} />
          <Stack.Screen name="new-case" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={!isAuthenticated}>
          <Stack.Screen name="sign-in" options={{ headerShown: false }} />
          <Stack.Screen name="verify-otp" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Screen name="tip-submit" options={{ presentation: 'card', headerShown: false }} />
        <Stack.Screen name="collab" options={{ headerShown: false }} />
        <Stack.Screen name="collab-session" options={{ headerShown: false }} />
        <Stack.Screen name="war-room" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider>
          <StatusBar style="light" />
          <RootLayoutNav />
        </KeyboardProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}


# mobile/src/app/appearance.tsx

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, RotateCcw } from 'lucide-react-native';
import {
  useFonts,
  BebasNeue_400Regular,
} from '@expo-google-fonts/bebas-neue';
import {
  CourierPrime_400Regular,
  CourierPrime_700Bold,
} from '@expo-google-fonts/courier-prime';
import useAppearanceStore from '@/lib/state/appearance-store';
import type { HeroTitleFont, AccentColorKey } from '@/lib/theme';

// Dark corkboard aesthetic colors
const C = {
  bg: '#1A1614',
  surface: '#231F1C',
  surface2: '#2D2825',
  text: '#E8DCC8',
  muted: '#6B5B4F',
  border: '#3D332C',
  red: '#C41E3A',
  redDark: '#A3162E',
} as const;

// ─── Hero font options ────────────────────────────────────────────────────────
const HERO_FONT_OPTIONS: { key: HeroTitleFont; label: string }[] = [
  { key: 'playfair', label: 'Playfair Display' },
  { key: 'abril', label: 'Abril Fatface' },
  { key: 'specialElite', label: 'Special Elite' },
  { key: 'fjalla', label: 'Fjalla One' },
  { key: 'crimsonPro', label: 'Crimson Pro' },
  { key: 'libreBaskerville', label: 'Libre Baskerville' },
  { key: 'teko', label: 'Teko' },
];

// ─── Accent color options ─────────────────────────────────────────────────────
const ACCENT_COLOR_OPTIONS: { key: AccentColorKey; hex: string; label: string }[] = [
  { key: 'crimson', hex: '#C41E3A', label: 'Crimson' },
  { key: 'navy', hex: '#1E3A5F', label: 'Navy' },
  { key: 'forest', hex: '#1A4731', label: 'Forest' },
  { key: 'amber', hex: '#C47A1E', label: 'Amber' },
  { key: 'slate', hex: '#3A4A5C', label: 'Slate' },
];

// ─── Tape color presets ───────────────────────────────────────────────────────
const TAPE_COLOR_OPTIONS: { hex: string; label: string }[] = [
  { hex: '#D4C5A9', label: 'Beige' },
  { hex: '#C41E3A', label: 'Red' },
  { hex: '#3B82F6', label: 'Blue' },
  { hex: '#F59E0B', label: 'Yellow' },
  { hex: '#EC4899', label: 'Pink' },
  { hex: '#1A1A1A', label: 'Black' },
];

// ─── Pushpin color presets ────────────────────────────────────────────────────
const PUSHPIN_COLOR_OPTIONS: { hex: string; label: string }[] = [
  { hex: '#C8934A', label: 'Brass' },
  { hex: '#C41E3A', label: 'Red' },
  { hex: '#3B82F6', label: 'Blue' },
  { hex: '#22C55E', label: 'Green' },
  { hex: '#F59E0B', label: 'Gold' },
  { hex: '#A855F7', label: 'Purple' },
];

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  return (
    <Text
      style={{
        color: C.muted,
        fontSize: 9,
        fontFamily: 'CourierPrime_700Bold',
        letterSpacing: 2,
        marginBottom: 10,
        marginTop: 24,
      }}
    >
      {title}
    </Text>
  );
}

// ─── Option chip button ───────────────────────────────────────────────────────
function OptionChip({
  label,
  selected,
  onPress,
  testID,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: selected ? C.red : C.border,
        backgroundColor: selected
          ? 'rgba(196,30,58,0.15)'
          : pressed
          ? C.surface2
          : C.surface,
        marginRight: 8,
        marginBottom: 8,
      })}
    >
      <Text
        style={{
          color: selected ? C.red : C.text,
          fontSize: 13,
          fontFamily: 'CourierPrime_400Regular',
          fontWeight: selected ? '700' : '400',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Color swatch ─────────────────────────────────────────────────────────────
function ColorSwatch({
  hex,
  label,
  selected,
  onPress,
  testID,
}: {
  hex: string;
  label: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={{ alignItems: 'center', marginRight: 14, marginBottom: 8 }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: hex,
          borderWidth: selected ? 2.5 : 1.5,
          borderColor: selected ? C.text : C.border,
          shadowColor: selected ? hex : 'transparent',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: selected ? 0.6 : 0,
          shadowRadius: 6,
          elevation: selected ? 4 : 0,
        }}
      />
      <Text
        style={{
          color: selected ? C.text : C.muted,
          fontSize: 9,
          fontFamily: 'CourierPrime_400Regular',
          marginTop: 4,
          letterSpacing: 0.5,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function AppearanceScreen() {
  const router = useRouter();

  // Select each store value individually to avoid infinite renders
  const heroFont = useAppearanceStore((s) => s.heroFont);
  const setHeroFont = useAppearanceStore((s) => s.setHeroFont);
  const themeMode = useAppearanceStore((s) => s.themeMode);
  const setThemeMode = useAppearanceStore((s) => s.setThemeMode);
  const accentColor = useAppearanceStore((s) => s.accentColor);
  const setAccentColor = useAppearanceStore((s) => s.setAccentColor);
  const corkIntensity = useAppearanceStore((s) => s.corkIntensity);
  const setCorkIntensity = useAppearanceStore((s) => s.setCorkIntensity);
  const tapeColor = useAppearanceStore((s) => s.tapeColor);
  const setTapeColor = useAppearanceStore((s) => s.setTapeColor);
  const pushpinColor = useAppearanceStore((s) => s.pushpinColor);
  const setPushpinColor = useAppearanceStore((s) => s.setPushpinColor);
  const resetToDefaults = useAppearanceStore((s) => s.resetToDefaults);

  const [fontsLoaded] = useFonts({
    BebasNeue_400Regular,
    CourierPrime_400Regular,
    CourierPrime_700Bold,
  });

  const CORK_OPTIONS: { value: 0 | 1 | 2 | 3; label: string }[] = [
    { value: 0, label: 'None' },
    { value: 1, label: 'Low' },
    { value: 2, label: 'Medium' },
    { value: 3, label: 'High' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }} testID="appearance-screen">
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 14,
            borderBottomWidth: 1,
            borderBottomColor: C.border,
          }}
        >
          <Pressable
            testID="appearance-back-button"
            onPress={() => router.back()}
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: pressed ? C.surface2 : C.surface,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: C.border,
              marginRight: 12,
            })}
          >
            <ChevronLeft size={20} color={C.text} strokeWidth={2} />
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: fontsLoaded ? 'BebasNeue_400Regular' : undefined,
                fontSize: 22,
                letterSpacing: 3,
                color: C.text,
                lineHeight: 24,
              }}
            >
              APPEARANCE
            </Text>
            <Text
              style={{
                color: C.muted,
                fontSize: 10,
                fontFamily: fontsLoaded ? 'CourierPrime_400Regular' : undefined,
                letterSpacing: 1,
                marginTop: 1,
              }}
            >
              Themes, fonts &amp; board style
            </Text>
          </View>

          <Pressable
            testID="appearance-reset-button"
            onPress={resetToDefaults}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              paddingHorizontal: 10,
              paddingVertical: 7,
              borderRadius: 9,
              backgroundColor: pressed ? C.surface2 : C.surface,
              borderWidth: 1,
              borderColor: C.border,
            })}
          >
            <RotateCcw size={13} color={C.muted} strokeWidth={2} />
            <Text
              style={{
                color: C.muted,
                fontSize: 11,
                fontFamily: fontsLoaded ? 'CourierPrime_400Regular' : undefined,
              }}
            >
              Reset
            </Text>
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48 }}
        >
          {/* ── Theme Mode ── */}
          <SectionHeader title="THEME MODE" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {(['dark', 'sepia', 'light'] as const).map((mode) => (
              <OptionChip
                key={mode}
                testID={`theme-mode-${mode}`}
                label={mode.charAt(0).toUpperCase() + mode.slice(1)}
                selected={themeMode === mode}
                onPress={() => setThemeMode(mode)}
              />
            ))}
          </View>

          {/* ── Hero Font ── */}
          <SectionHeader title="HERO FONT" />
          <Text
            style={{
              color: C.muted,
              fontSize: 10,
              fontFamily: fontsLoaded ? 'CourierPrime_400Regular' : undefined,
              marginBottom: 10,
            }}
          >
            Used for investigation titles and headings
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {HERO_FONT_OPTIONS.map((opt) => (
              <OptionChip
                key={opt.key}
                testID={`hero-font-${opt.key}`}
                label={opt.label}
                selected={heroFont === opt.key}
                onPress={() => setHeroFont(opt.key)}
              />
            ))}
          </View>

          {/* ── Accent Color ── */}
          <SectionHeader title="ACCENT COLOR" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
            {ACCENT_COLOR_OPTIONS.map((opt) => (
              <ColorSwatch
                key={opt.key}
                testID={`accent-color-${opt.key}`}
                hex={opt.hex}
                label={opt.label}
                selected={accentColor === opt.key}
                onPress={() => setAccentColor(opt.key)}
              />
            ))}
          </View>

          {/* ── Cork Intensity ── */}
          <SectionHeader title="CORK BOARD TEXTURE" />
          <Text
            style={{
              color: C.muted,
              fontSize: 10,
              fontFamily: fontsLoaded ? 'CourierPrime_400Regular' : undefined,
              marginBottom: 10,
            }}
          >
            Controls the background cork texture intensity
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {CORK_OPTIONS.map((opt) => (
              <OptionChip
                key={opt.value}
                testID={`cork-intensity-${opt.value}`}
                label={opt.label}
                selected={corkIntensity === opt.value}
                onPress={() => setCorkIntensity(opt.value)}
              />
            ))}
          </View>

          {/* ── Tape Color ── */}
          <SectionHeader title="TAPE COLOR" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
            {TAPE_COLOR_OPTIONS.map((opt) => (
              <ColorSwatch
                key={opt.hex}
                testID={`tape-color-${opt.label.toLowerCase()}`}
                hex={opt.hex}
                label={opt.label}
                selected={tapeColor === opt.hex}
                onPress={() => setTapeColor(opt.hex)}
              />
            ))}
          </View>

          {/* ── Pushpin Color ── */}
          <SectionHeader title="PUSHPIN COLOR" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
            {PUSHPIN_COLOR_OPTIONS.map((opt) => (
              <ColorSwatch
                key={opt.hex}
                testID={`pushpin-color-${opt.label.toLowerCase()}`}
                hex={opt.hex}
                label={opt.label}
                selected={pushpinColor === opt.hex}
                onPress={() => setPushpinColor(opt.hex)}
              />
            ))}
          </View>

          {/* Preview strip */}
          <View
            style={{
              marginTop: 28,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: C.border,
              overflow: 'hidden',
              backgroundColor: C.surface,
            }}
          >
            <View
              style={{
                height: 4,
                backgroundColor: ACCENT_COLOR_OPTIONS.find((o) => o.key === accentColor)?.hex ?? C.red,
              }}
            />
            <View style={{ padding: 16 }}>
              <Text
                style={{
                  color: C.muted,
                  fontSize: 9,
                  fontFamily: fontsLoaded ? 'CourierPrime_700Bold' : undefined,
                  letterSpacing: 2,
                  marginBottom: 6,
                }}
              >
                PREVIEW
              </Text>
              <Text
                style={{
                  color: C.text,
                  fontSize: 20,
                  letterSpacing: 0.5,
                  marginBottom: 4,
                }}
              >
                Investigation Title
              </Text>
              <Text
                style={{
                  color: C.muted,
                  fontSize: 11,
                  fontFamily: fontsLoaded ? 'CourierPrime_400Regular' : undefined,
                  lineHeight: 16,
                }}
              >
                Font: {HERO_FONT_OPTIONS.find((f) => f.key === heroFont)?.label} &middot; Theme:{' '}
                {themeMode.charAt(0).toUpperCase() + themeMode.slice(1)}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 12,
                }}
              >
                {/* Tape swatch */}
                <View
                  style={{
                    width: 32,
                    height: 8,
                    borderRadius: 3,
                    backgroundColor: tapeColor,
                    opacity: 0.75,
                  }}
                />
                {/* Pushpin dot */}
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: pushpinColor,
                    shadowColor: pushpinColor,
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.5,
                    shadowRadius: 3,
                    elevation: 2,
                  }}
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}


# mobile/src/app/collab-session.tsx

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Users, Check, X, Trash2 } from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { api } from '@/lib/api/api';
import useInvestigationStore from '@/lib/state/investigation-store';
import { useSession } from '@/lib/auth/use-session';
import WarRoomEntry from '@/components/WarRoomEntry';

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

const PERMISSION_COLORS: Record<string, string> = {
  viewer: '#6B5B4F',
  annotator: '#3B82F6',
  contributor: '#F59E0B',
  co_investigator: '#C41E3A',
};
const PERMISSION_LABELS: Record<string, string> = {
  viewer: 'VIEWER',
  annotator: 'ANNOTATOR',
  contributor: 'CONTRIBUTOR',
  co_investigator: 'CO-INVESTIGATOR',
};

const TABS = ['Members', 'Pending', 'Contributions', 'Audit'] as const;
type Tab = typeof TABS[number];

function formatRelative(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const s = ms / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hours ago`;
  return `${Math.floor(s / 86400)} days ago`;
}

const ACTION_LABELS: Record<string, string> = {
  created: 'Created session',
  invited: 'Sent an invite',
  joined: 'Joined session',
  added_node: 'Submitted a node',
  approved_node: 'Approved a contribution',
  rejected_node: 'Rejected a contribution',
  viewed: 'Viewed session',
};

interface SessionData {
  id: string;
  title: string;
  description?: string;
  isOwner: boolean;
  members: Array<{
    id: string;
    userId: string;
    permission: string;
    joinedAt?: string;
    user?: { name?: string; email?: string; username?: string };
  }>;
}

interface PendingItem {
  id: string;
  nodeData: string;
  createdAt: string;
  contributor?: { name?: string; email?: string; username?: string };
}

interface ContributionItem {
  id: string;
  nodeTitle: string;
  contributedAt: string;
  contributor?: { name?: string; email?: string; username?: string };
}

interface AuditItem {
  id: string;
  action: string;
  createdAt: string;
  user?: { name?: string; email?: string; username?: string };
}

export default function CollabSessionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const addNode = useInvestigationStore((s) => s.addNode);
  const activeId = useInvestigationStore((s) => s.activeInvestigationId);

  const [activeTab, setActiveTab] = useState<Tab>('Members');
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePermission, setInvitePermission] = useState<'viewer' | 'annotator' | 'contributor' | 'co_investigator'>('viewer');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteExpiry, setInviteExpiry] = useState<number | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [showInviteCode, setShowInviteCode] = useState(false);

  const { data: sessionData, isLoading } = useQuery({
    queryKey: ['collab-session', id],
    queryFn: async () => api.get<SessionData>(`/api/collab/sessions/${id}`),
    enabled: !!id,
  });

  const { data: pendingData } = useQuery({
    queryKey: ['collab-pending', id],
    queryFn: async () => api.get<PendingItem[]>(`/api/collab/sessions/${id}/pending`),
    enabled: !!id && (sessionData?.isOwner ?? false),
  });

  const { data: contributionsData } = useQuery({
    queryKey: ['collab-contributions', id],
    queryFn: async () => api.get<ContributionItem[]>(`/api/collab/sessions/${id}/contributions`),
    enabled: !!id,
  });

  const { data: auditData } = useQuery({
    queryKey: ['collab-audit', id],
    queryFn: async () => api.get<AuditItem[]>(`/api/collab/sessions/${id}/audit`),
    enabled: !!id && (sessionData?.isOwner ?? false),
  });

  const inviteMutation = useMutation({
    mutationFn: async () => api.post<{ inviteCode: string }>(`/api/collab/sessions/${id}/invite`, {
      email: inviteEmail.trim() || undefined,
      permission: invitePermission,
      message: inviteMessage.trim() || undefined,
      expiresInHours: inviteExpiry ?? undefined,
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['collab-session', id] });
      setInviteCode(data.inviteCode);
      setShowInviteCode(true);
      setShowInvite(false);
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ nodeId, nodeData }: { nodeId: string; nodeData: Record<string, unknown> }) =>
      api.post<unknown>(`/api/collab/sessions/${id}/pending/${nodeId}/approve`, {
        nodeId: nodeData.id,
        nodeTitle: nodeData.title,
      }),
    onSuccess: (_, { nodeData }) => {
      queryClient.invalidateQueries({ queryKey: ['collab-pending', id] });
      queryClient.invalidateQueries({ queryKey: ['collab-contributions', id] });
      if (activeId && nodeData) {
        try {
          const nodeType = (nodeData.type as string) ?? 'note';
          const nodeTitle = (nodeData.title as string) ?? 'Untitled';
          const validTypes = ['investigation', 'folder', 'note', 'link', 'image', 'dataset'] as const;
          type ValidNodeType = typeof validTypes[number];
          const safeType: ValidNodeType = validTypes.includes(nodeType as ValidNodeType)
            ? (nodeType as ValidNodeType)
            : 'note';
          addNode(activeId, safeType, nodeTitle, { x: 100, y: 100 });
        } catch {}
      }
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (nodeId: string) =>
      api.post<unknown>(`/api/collab/sessions/${id}/pending/${nodeId}/reject`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collab-pending', id] });
    },
  });

  const { mutate: approveNode } = approveMutation;
  const { mutate: rejectNode } = rejectMutation;

  const isOwner = sessionData?.isOwner ?? false;
  const members = sessionData?.members ?? [];
  const pending = pendingData ?? [];
  const contributions = contributionsData ?? [];
  const audit = auditData ?? [];

  const visibleTabs = isOwner ? TABS : TABS.filter((t) => t !== 'Pending' && t !== 'Audit');

  const renderContent = useCallback(() => {
    if (activeTab === 'Members') {
      return (
        <View style={{ padding: 20 }}>
          {isOwner ? (
            <>
              <WarRoomEntry collabSessionId={id} size="md" />
              <Pressable
                testID="invite-button"
                onPress={() => setShowInvite(true)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  backgroundColor: pressed ? '#A3162E' : C.red,
                  borderRadius: 12,
                  paddingVertical: 13,
                  marginBottom: 20,
                })}
              >
                <Users size={16} color="#FFF" strokeWidth={2.5} />
                <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700' }}>Invite Investigator</Text>
              </Pressable>
            </>
          ) : null}

          {members.map((m) => (
            <View
              key={m.id}
              testID={`member-item-${m.id}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: C.surface,
                borderRadius: 12,
                padding: 14,
                marginBottom: 10,
                borderWidth: 1,
                borderColor: C.border,
              }}
            >
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(196,30,58,0.12)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Text style={{ color: C.red, fontSize: 15, fontWeight: '800' }}>
                  {(m.user?.name ?? m.user?.email ?? '?')[0].toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontSize: 14, fontWeight: '600' }}>
                  {m.user?.name ?? m.user?.username ?? m.user?.email ?? 'Unknown'}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <View style={{ backgroundColor: (PERMISSION_COLORS[m.permission] ?? C.muted) + '20', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: (PERMISSION_COLORS[m.permission] ?? C.muted) + '40' }}>
                    <Text style={{ color: PERMISSION_COLORS[m.permission] ?? C.muted, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 }}>
                      {PERMISSION_LABELS[m.permission] ?? m.permission.toUpperCase()}
                    </Text>
                  </View>
                  {m.joinedAt ? (
                    <Text style={{ color: C.muted, fontSize: 11 }}>Joined {formatRelative(m.joinedAt)}</Text>
                  ) : null}
                </View>
              </View>
              {isOwner && m.userId !== session?.user?.id ? (
                <Pressable
                  testID={`remove-member-${m.id}`}
                  onPress={() => { /* TODO: remove member */ }}
                  style={({ pressed }) => ({ width: 32, height: 32, borderRadius: 16, backgroundColor: pressed ? 'rgba(196,30,58,0.2)' : 'transparent', alignItems: 'center', justifyContent: 'center' })}
                >
                  <Trash2 size={16} color={C.muted} strokeWidth={2} />
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
      );
    }

    if (activeTab === 'Pending') {
      return (
        <View style={{ padding: 20 }} testID="pending-tab-content">
          {pending.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <Text style={{ color: C.muted, fontSize: 14 }}>No pending contributions</Text>
            </View>
          ) : pending.map((item) => {
            let parsedNode: Record<string, unknown> = {};
            try { parsedNode = JSON.parse(item.nodeData); } catch {}
            return (
              <View key={item.id} testID={`pending-item-${item.id}`} style={{ backgroundColor: C.surface, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(212,165,116,0.12)', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                    <Text style={{ color: C.pin, fontSize: 13, fontWeight: '800' }}>
                      {(item.contributor?.name ?? item.contributor?.email ?? '?')[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.text, fontSize: 13, fontWeight: '600' }}>
                      {item.contributor?.name ?? item.contributor?.username ?? 'Unknown'}
                    </Text>
                    <Text style={{ color: C.muted, fontSize: 11 }}>{formatRelative(item.createdAt)}</Text>
                  </View>
                </View>
                <View style={{ backgroundColor: C.surfaceAlt, borderRadius: 8, padding: 10, marginBottom: 12 }}>
                  <Text style={{ color: C.muted, fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginBottom: 2 }}>NODE PREVIEW</Text>
                  <Text style={{ color: C.text, fontSize: 13, fontWeight: '600' }}>{(parsedNode.title as string) ?? 'Untitled'}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable
                    testID={`approve-button-${item.id}`}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      approveNode({ nodeId: item.id, nodeData: parsedNode });
                    }}
                    style={({ pressed }) => ({ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: pressed ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.1)', borderRadius: 10, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)' })}
                  >
                    <Check size={15} color={C.green} strokeWidth={2.5} />
                    <Text style={{ color: C.green, fontSize: 13, fontWeight: '700' }}>Approve</Text>
                  </Pressable>
                  <Pressable
                    testID={`reject-button-${item.id}`}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      rejectNode(item.id);
                    }}
                    style={({ pressed }) => ({ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: pressed ? 'rgba(196,30,58,0.2)' : 'rgba(196,30,58,0.08)', borderRadius: 10, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(196,30,58,0.25)' })}
                  >
                    <X size={15} color={C.red} strokeWidth={2.5} />
                    <Text style={{ color: C.red, fontSize: 13, fontWeight: '700' }}>Reject</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      );
    }

    if (activeTab === 'Contributions') {
      return (
        <View style={{ padding: 20 }} testID="contributions-tab-content">
          {contributions.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <Text style={{ color: C.muted, fontSize: 14 }}>No approved contributions yet</Text>
            </View>
          ) : contributions.map((item) => (
            <View key={item.id} testID={`contribution-item-${item.id}`} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(34,197,94,0.12)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Text style={{ color: C.green, fontSize: 14, fontWeight: '800' }}>
                  {(item.contributor?.name ?? item.contributor?.email ?? '?')[0].toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontSize: 13, fontWeight: '600' }}>{item.contributor?.name ?? item.contributor?.username ?? 'Unknown'}</Text>
                <Text style={{ color: C.pin, fontSize: 12, fontWeight: '600', marginTop: 1 }}>{item.nodeTitle}</Text>
                <Text style={{ color: C.muted, fontSize: 11, marginTop: 1 }}>{formatRelative(item.contributedAt)}</Text>
              </View>
            </View>
          ))}
        </View>
      );
    }

    if (activeTab === 'Audit') {
      return (
        <View style={{ padding: 20 }} testID="audit-tab-content">
          {audit.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <Text style={{ color: C.muted, fontSize: 14 }}>No audit log entries</Text>
            </View>
          ) : audit.map((item) => (
            <View key={item.id} testID={`audit-item-${item.id}`} style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginRight: 10, marginTop: 1 }}>
                <Text style={{ color: C.muted, fontSize: 11, fontWeight: '800' }}>
                  {(item.user?.name ?? item.user?.email ?? '?')[0].toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontSize: 13, fontWeight: '600' }}>{item.user?.name ?? item.user?.username ?? 'Unknown'}</Text>
                <Text style={{ color: C.muted, fontSize: 12, marginTop: 1 }}>{ACTION_LABELS[item.action] ?? item.action}</Text>
              </View>
              <Text style={{ color: C.muted, fontSize: 11 }}>{formatRelative(item.createdAt)}</Text>
            </View>
          ))}
        </View>
      );
    }

    return null;
  }, [activeTab, isOwner, members, pending, contributions, audit, session, approveNode, rejectNode]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }} testID="collab-session-screen">
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border }}>
          <Pressable
            testID="session-back-button"
            onPress={() => router.back()}
            style={({ pressed }) => ({ width: 36, height: 36, borderRadius: 18, backgroundColor: pressed ? C.border : C.surface, alignItems: 'center', justifyContent: 'center', marginRight: 14 })}
          >
            <ArrowLeft size={18} color={C.text} strokeWidth={2} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.text, fontSize: 17, fontWeight: '800', letterSpacing: 0.3 }} numberOfLines={1}>
              {sessionData?.title ?? 'Loading...'}
            </Text>
            {sessionData?.description ? (
              <Text style={{ color: C.muted, fontSize: 11, marginTop: 1 }} numberOfLines={1}>{sessionData.description}</Text>
            ) : null}
          </View>
        </View>

        {/* Tabs */}
        <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.border }}>
          {visibleTabs.map((tab) => (
            <Pressable
              key={tab}
              testID={`tab-${tab.toLowerCase()}`}
              onPress={() => setActiveTab(tab)}
              style={{ flex: 1, paddingVertical: 13, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: activeTab === tab ? C.red : 'transparent' }}
            >
              <Text style={{ color: activeTab === tab ? C.text : C.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.3 }}>{tab.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>

        {isLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} testID="loading-indicator">
            <ActivityIndicator color={C.red} />
          </View>
        ) : (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
            {renderContent()}
          </ScrollView>
        )}
      </SafeAreaView>

      {/* Invite Modal */}
      <Modal visible={showInvite} transparent animationType="slide" onRequestClose={() => setShowInvite(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }} onPress={() => setShowInvite(false)}>
            <Pressable onPress={() => {}} style={{ backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderTopWidth: 1, borderTopColor: C.border, maxHeight: '80%' }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 20 }} />
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={{ color: C.text, fontSize: 18, fontWeight: '800', marginBottom: 20 }}>Invite Investigator</Text>

                <Text style={{ color: C.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 6 }}>EMAIL (OPTIONAL)</Text>
                <TextInput
                  testID="invite-email-input"
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  placeholder="investigator@email.com"
                  placeholderTextColor={C.muted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={{ backgroundColor: C.surfaceAlt, borderRadius: 10, padding: 14, color: C.text, fontSize: 15, borderWidth: 1, borderColor: C.border, marginBottom: 16 }}
                />

                <Text style={{ color: C.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 10 }}>PERMISSION LEVEL</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                  {(['viewer', 'annotator', 'contributor', 'co_investigator'] as const).map((perm) => (
                    <Pressable
                      key={perm}
                      testID={`permission-${perm}`}
                      onPress={() => setInvitePermission(perm)}
                      style={{
                        backgroundColor: invitePermission === perm ? C.red : C.surfaceAlt,
                        borderRadius: 8,
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderWidth: 1,
                        borderColor: invitePermission === perm ? C.red : C.border,
                      }}
                    >
                      <Text style={{ color: invitePermission === perm ? '#FFF' : C.muted, fontSize: 12, fontWeight: '700' }}>
                        {PERMISSION_LABELS[perm]}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={{ color: C.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 6 }}>MESSAGE (OPTIONAL)</Text>
                <TextInput
                  testID="invite-message-input"
                  value={inviteMessage}
                  onChangeText={setInviteMessage}
                  placeholder="Add a personal message..."
                  placeholderTextColor={C.muted}
                  multiline
                  numberOfLines={2}
                  style={{ backgroundColor: C.surfaceAlt, borderRadius: 10, padding: 14, color: C.text, fontSize: 15, borderWidth: 1, borderColor: C.border, marginBottom: 16, minHeight: 60, textAlignVertical: 'top' }}
                />

                <Text style={{ color: C.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 10 }}>EXPIRY</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                  {([{ label: '24h', hours: 24 }, { label: '72h', hours: 72 }, { label: '7 days', hours: 168 }, { label: 'No expiry', hours: null }] as const).map((opt) => (
                    <Pressable
                      key={opt.label}
                      testID={`expiry-${opt.label}`}
                      onPress={() => setInviteExpiry(opt.hours)}
                      style={{
                        backgroundColor: inviteExpiry === opt.hours ? C.red : C.surfaceAlt,
                        borderRadius: 8,
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderWidth: 1,
                        borderColor: inviteExpiry === opt.hours ? C.red : C.border,
                      }}
                    >
                      <Text style={{ color: inviteExpiry === opt.hours ? '#FFF' : C.muted, fontSize: 12, fontWeight: '700' }}>{opt.label}</Text>
                    </Pressable>
                  ))}
                </View>

                <Pressable
                  testID="send-invite-button"
                  onPress={() => {
                    if (inviteMutation.isPending) return;
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    inviteMutation.mutate();
                  }}
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? '#A3162E' : C.red,
                    borderRadius: 12,
                    paddingVertical: 15,
                    alignItems: 'center',
                    marginBottom: 8,
                  })}
                >
                  {inviteMutation.isPending ? (
                    <ActivityIndicator color="#FFF" testID="invite-loading" />
                  ) : (
                    <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '700' }}>Send Invite</Text>
                  )}
                </Pressable>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Invite Code Modal */}
      <Modal visible={showInviteCode} transparent animationType="fade" onRequestClose={() => setShowInviteCode(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 }} onPress={() => setShowInviteCode(false)}>
          <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 360, backgroundColor: C.surface, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: C.border }}>
            <Text style={{ color: C.text, fontSize: 17, fontWeight: '800', marginBottom: 8 }}>Invite Created!</Text>
            <Text style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>Share this code with the investigator:</Text>
            <View style={{ backgroundColor: C.surfaceAlt, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border, alignItems: 'center' }}>
              <Text style={{ color: C.pin, fontSize: 22, fontWeight: '900', letterSpacing: 4 }} testID="invite-code-display">{inviteCode}</Text>
            </View>
            <Pressable
              testID="share-invite-button"
              onPress={async () => {
                try {
                  await Share.share({ message: `Join my Red String investigation: open the app and enter code ${inviteCode}` });
                } catch {}
              }}
              style={({ pressed }) => ({ backgroundColor: pressed ? '#A3162E' : C.red, borderRadius: 12, paddingVertical: 13, alignItems: 'center' })}
            >
              <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700' }}>Share Code</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}


# mobile/src/app/collab.tsx

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ActivityIndicator,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, Users, ChevronRight } from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { api } from '@/lib/api/api';
import useInvestigationStore from '@/lib/state/investigation-store';

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

const PERMISSION_COLORS: Record<string, string> = {
  viewer: '#6B5B4F',
  annotator: '#3B82F6',
  contributor: '#F59E0B',
  co_investigator: '#C41E3A',
};

const PERMISSION_LABELS: Record<string, string> = {
  viewer: 'VIEWER',
  annotator: 'ANNOTATOR',
  contributor: 'CONTRIBUTOR',
  co_investigator: 'CO-INVESTIGATOR',
};

interface CollabSession {
  id: string;
  title: string;
  description?: string;
  investigationId: string;
  ownerId: string;
  myPermission: string;
  isOwner: boolean;
  members?: Array<{ id: string }>;
  memberCount?: number;
  _count?: { members: number };
  createdAt: string;
}

export default function CollabScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const investigations = useInvestigationStore((s) => s.investigations);

  const [showCreate, setShowCreate] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [selectedInvId, setSelectedInvId] = useState<string | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['collab-sessions'],
    queryFn: async () => {
      const sessions = await api.get<CollabSession[]>('/api/collab/sessions');
      return sessions;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const session = await api.post<CollabSession>('/api/collab/sessions', {
        investigationId: selectedInvId ?? '',
        title: createTitle.trim(),
        description: createDesc.trim() || undefined,
        originalSnapshot: '{}',
      });
      return session;
    },
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ['collab-sessions'] });
      setShowCreate(false);
      setCreateTitle('');
      setCreateDesc('');
      setSelectedInvId(null);
      router.push({ pathname: '/collab-session', params: { id: session.id } });
    },
  });

  const sessions = data ?? [];
  const mySessions = sessions.filter((s) => s.isOwner);
  const joinedSessions = sessions.filter((s) => !s.isOwner);

  const renderSession = useCallback(({ item }: { item: CollabSession }) => (
    <Pressable
      testID={`collab-session-item-${item.id}`}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({ pathname: '/collab-session', params: { id: item.id } });
      }}
      style={({ pressed }) => ({
        backgroundColor: pressed ? C.surfaceAlt : C.surface,
        borderRadius: 16,
        padding: 18,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: C.border,
        flexDirection: 'row',
        alignItems: 'center',
      })}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.text, fontSize: 16, fontWeight: '800', marginBottom: 4 }}>
          {item.title}
        </Text>
        {item.description ? (
          <Text style={{ color: C.muted, fontSize: 14, marginBottom: 8 }} numberOfLines={1}>
            {item.description}
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(212,165,116,0.1)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(212,165,116,0.2)' }}>
            <Users size={16} color={C.pin} strokeWidth={2.5} />
            <Text style={{ color: C.pin, fontSize: 13, fontWeight: '700' }}>{item.memberCount ?? (item.members?.length ?? 0)}</Text>
          </View>
          <View style={{ backgroundColor: (PERMISSION_COLORS[item.myPermission] ?? C.muted) + '20', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: (PERMISSION_COLORS[item.myPermission] ?? C.muted) + '40' }}>
            <Text style={{ color: PERMISSION_COLORS[item.myPermission] ?? C.muted, fontSize: 11, fontWeight: '800', letterSpacing: 0.7 }}>
              {PERMISSION_LABELS[item.myPermission] ?? item.myPermission.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>
      <ChevronRight size={20} color={C.muted} strokeWidth={2} />
    </Pressable>
  ), [router]);

  const nonDemoInvestigations = investigations.filter((inv) => !inv.isDemo);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }} testID="collab-screen">
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border }}>
          <Pressable
            testID="collab-back-button"
            onPress={() => router.back()}
            style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, backgroundColor: pressed ? C.border : C.surface, alignItems: 'center', justifyContent: 'center', marginRight: 14 })}
          >
            <ArrowLeft size={20} color={C.text} strokeWidth={2} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.red, fontSize: 22, fontWeight: '900', letterSpacing: 2.2 }}>COLLABORATIONS</Text>
            <Text style={{ color: C.muted, fontSize: 13, letterSpacing: 3.2, marginTop: 1 }}>SHARED INVESTIGATIONS</Text>
          </View>
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} testID="loading-indicator">
            <ActivityIndicator color={C.red} />
          </View>
        ) : sessions.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }} testID="empty-state">
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 20, borderWidth: 1, borderColor: C.border }}>
              <Users size={36} color={C.muted} strokeWidth={1.5} />
            </View>
            <Text style={{ color: C.text, fontSize: 18, fontWeight: '700', marginBottom: 8, textAlign: 'center' }}>No collaborations yet</Text>
            <Text style={{ color: C.muted, fontSize: 14, textAlign: 'center', lineHeight: 19 }}>
              Start one to invite investigators to your board.
            </Text>
          </View>
        ) : (
          <FlatList
            testID="collab-sessions-list"
            data={[]}
            renderItem={null}
            ListHeaderComponent={
              <View style={{ padding: 20 }}>
                {mySessions.length > 0 ? (
                  <>
                    <Text style={{ color: C.muted, fontSize: 12, fontWeight: '800', letterSpacing: 1.7, marginBottom: 12 }}>MY SESSIONS</Text>
                    {mySessions.map((item) => (
                      <View key={item.id}>{renderSession({ item })}</View>
                    ))}
                  </>
                ) : null}
                {joinedSessions.length > 0 ? (
                  <>
                    <View style={{ height: mySessions.length > 0 ? 8 : 0 }} />
                    {mySessions.length > 0 ? <View style={{ height: 1, backgroundColor: C.border, marginBottom: 16 }} /> : null}
                    <Text style={{ color: C.muted, fontSize: 12, fontWeight: '800', letterSpacing: 1.7, marginBottom: 12 }}>JOINED SESSIONS</Text>
                    {joinedSessions.map((item) => (
                      <View key={item.id}>{renderSession({ item })}</View>
                    ))}
                  </>
                ) : null}
              </View>
            }
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.red} />}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        )}
      </SafeAreaView>

      {/* Floating + button */}
      <Pressable
        testID="create-session-button"
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setShowCreate(true);
        }}
        style={({ pressed }) => ({
          position: 'absolute',
          bottom: 40,
          right: 24,
          width: 60,
          height: 60,
          borderRadius: 30,
          backgroundColor: pressed ? '#A3162E' : C.red,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: C.red,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.4,
          shadowRadius: 12,
          elevation: 8,
        })}
      >
        <Plus size={26} color="#FFF" strokeWidth={2.5} />
      </Pressable>

      {/* Create Modal */}
      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }} onPress={() => setShowCreate(false)}>
            <Pressable onPress={() => {}} style={{ backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderTopWidth: 1, borderTopColor: C.border }}>
              {/* Handle */}
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 20 }} />

              <Text style={{ color: C.text, fontSize: 20, fontWeight: '800', marginBottom: 20, letterSpacing: 0.5 }}>New Collab Session</Text>

              <Text style={{ color: C.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1.2, marginBottom: 6 }}>TITLE</Text>
              <TextInput
                testID="create-title-input"
                value={createTitle}
                onChangeText={setCreateTitle}
                placeholder="Session title..."
                placeholderTextColor={C.muted}
                autoFocus
                style={{ backgroundColor: C.surfaceAlt, borderRadius: 12, padding: 14, color: C.text, fontSize: 15, borderWidth: 1, borderColor: C.border, marginBottom: 16 }}
              />

              <Text style={{ color: C.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1.2, marginBottom: 6 }}>DESCRIPTION (OPTIONAL)</Text>
              <TextInput
                testID="create-desc-input"
                value={createDesc}
                onChangeText={setCreateDesc}
                placeholder="What is this investigation about..."
                placeholderTextColor={C.muted}
                multiline
                numberOfLines={2}
                style={{ backgroundColor: C.surfaceAlt, borderRadius: 12, padding: 14, color: C.text, fontSize: 15, borderWidth: 1, borderColor: C.border, marginBottom: 16, minHeight: 70, textAlignVertical: 'top' }}
              />

              {nonDemoInvestigations.length > 0 ? (
                <>
                  <Text style={{ color: C.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1.2, marginBottom: 10 }}>LINK TO INVESTIGATION</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20, flexGrow: 0 }}>
                    {nonDemoInvestigations.map((inv) => {
                      const isSelected = selectedInvId === inv.id;
                      return (
                        <Pressable
                          key={inv.id}
                          testID={`inv-select-${inv.id}`}
                          onPress={() => setSelectedInvId(isSelected ? null : inv.id)}
                          style={{
                            backgroundColor: isSelected ? C.red : C.surfaceAlt,
                            borderRadius: 10,
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                            marginRight: 10,
                            borderWidth: 1,
                            borderColor: isSelected ? C.red : C.border,
                          }}
                        >
                          <Text style={{ color: isSelected ? '#FFF' : C.text, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
                            {inv.title}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </>
              ) : null}

              <Pressable
                testID="create-session-submit-button"
                onPress={() => {
                  if (!createTitle.trim() || createMutation.isPending) return;
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  createMutation.mutate();
                }}
                style={({ pressed }) => ({
                  backgroundColor: createTitle.trim() ? (pressed ? '#A3162E' : C.red) : C.border,
                  borderRadius: 12,
                  paddingVertical: 16,
                  alignItems: 'center',
                  marginBottom: 8,
                })}
              >
                {createMutation.isPending ? (
                  <ActivityIndicator color="#FFF" testID="create-loading" />
                ) : (
                  <Text style={{ color: createTitle.trim() ? '#FFF' : C.muted, fontSize: 16, fontWeight: '800' }}>Create Session</Text>
                )}
              </Pressable>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}


# mobile/src/app/live-broadcast.tsx

import React from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Radio, Mic, Video, Users, Wifi } from 'lucide-react-native';
import {
  useFonts,
  BebasNeue_400Regular,
} from '@expo-google-fonts/bebas-neue';
import {
  CourierPrime_400Regular,
  CourierPrime_700Bold,
} from '@expo-google-fonts/courier-prime';

const C = {
  bg: '#1A1614',
  surface: '#231F1C',
  surface2: '#2D2825',
  text: '#E8DCC8',
  muted: '#6B5B4F',
  border: '#3D332C',
  red: '#C41E3A',
  redDark: '#A3162E',
} as const;

export default function LiveBroadcastScreen() {
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    BebasNeue_400Regular,
    CourierPrime_400Regular,
    CourierPrime_700Bold,
  });

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }} testID="live-broadcast-screen">
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 14,
            borderBottomWidth: 1,
            borderBottomColor: C.border,
          }}
        >
          <Pressable
            testID="live-broadcast-back-button"
            onPress={() => router.back()}
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: pressed ? C.surface2 : C.surface,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: C.border,
              marginRight: 12,
            })}
          >
            <ChevronLeft size={20} color={C.text} strokeWidth={2} />
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: fontsLoaded ? 'BebasNeue_400Regular' : undefined,
                fontSize: 22,
                letterSpacing: 3,
                color: C.text,
                lineHeight: 24,
              }}
            >
              START{' '}
              <Text style={{ color: C.red }}>BROADCAST</Text>
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.red }} />
              <Text
                style={{
                  color: C.red,
                  fontSize: 9,
                  fontFamily: fontsLoaded ? 'CourierPrime_700Bold' : undefined,
                  letterSpacing: 1.5,
                }}
              >
                COMING SOON
              </Text>
            </View>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48 }}
        >
          {/* Camera preview placeholder */}
          <View
            style={{
              height: 220,
              borderRadius: 16,
              backgroundColor: '#0D0B09',
              borderWidth: 1.5,
              borderColor: C.border,
              marginTop: 24,
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {/* Corner brackets for camera feel */}
            <View style={{ position: 'absolute', top: 12, left: 12, width: 20, height: 20, borderTopWidth: 2, borderLeftWidth: 2, borderColor: C.red, borderTopLeftRadius: 4 }} />
            <View style={{ position: 'absolute', top: 12, right: 12, width: 20, height: 20, borderTopWidth: 2, borderRightWidth: 2, borderColor: C.red, borderTopRightRadius: 4 }} />
            <View style={{ position: 'absolute', bottom: 12, left: 12, width: 20, height: 20, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: C.red, borderBottomLeftRadius: 4 }} />
            <View style={{ position: 'absolute', bottom: 12, right: 12, width: 20, height: 20, borderBottomWidth: 2, borderRightWidth: 2, borderColor: C.red, borderBottomRightRadius: 4 }} />

            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: 'rgba(196,30,58,0.12)',
                borderWidth: 1.5,
                borderColor: 'rgba(196,30,58,0.3)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <Video size={28} color={C.red} strokeWidth={1.5} />
            </View>
            <Text
              style={{
                color: C.muted,
                fontSize: 12,
                fontFamily: fontsLoaded ? 'CourierPrime_400Regular' : undefined,
                letterSpacing: 0.5,
              }}
            >
              Camera preview will appear here
            </Text>
          </View>

          {/* Broadcast details form (placeholder) */}
          <View style={{ marginTop: 24 }}>
            <Text
              style={{
                color: C.muted,
                fontSize: 9,
                fontFamily: fontsLoaded ? 'CourierPrime_700Bold' : undefined,
                letterSpacing: 2,
                marginBottom: 10,
              }}
            >
              BROADCAST DETAILS
            </Text>

            {/* Title field placeholder */}
            <View
              style={{
                backgroundColor: C.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: C.border,
                padding: 14,
                marginBottom: 10,
              }}
            >
              <Text
                style={{
                  color: C.muted,
                  fontSize: 13,
                  fontFamily: fontsLoaded ? 'CourierPrime_400Regular' : undefined,
                }}
              >
                Broadcast title...
              </Text>
            </View>

            {/* Description field placeholder */}
            <View
              style={{
                backgroundColor: C.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: C.border,
                padding: 14,
                minHeight: 76,
                marginBottom: 20,
              }}
            >
              <Text
                style={{
                  color: C.muted,
                  fontSize: 13,
                  fontFamily: fontsLoaded ? 'CourierPrime_400Regular' : undefined,
                }}
              >
                Tell your audience what this broadcast is about...
              </Text>
            </View>
          </View>

          {/* Feature cards */}
          <Text
            style={{
              color: C.muted,
              fontSize: 9,
              fontFamily: fontsLoaded ? 'CourierPrime_700Bold' : undefined,
              letterSpacing: 2,
              marginBottom: 12,
            }}
          >
            UPCOMING FEATURES
          </Text>

          {[
            {
              icon: <Radio size={20} color={C.red} strokeWidth={1.5} />,
              title: 'Live streaming',
              desc: 'Broadcast your investigation board in real-time to followers',
            },
            {
              icon: <Mic size={20} color={C.red} strokeWidth={1.5} />,
              title: 'Voice commentary',
              desc: 'Add live audio commentary as you connect the evidence',
            },
            {
              icon: <Users size={20} color={C.red} strokeWidth={1.5} />,
              title: 'Viewer interaction',
              desc: 'Accept questions and tips from your live audience',
            },
            {
              icon: <Wifi size={20} color={C.red} strokeWidth={1.5} />,
              title: 'Multi-platform',
              desc: 'Simultaneously stream to YouTube, Rumble, and more',
            },
          ].map((feat, i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 14,
                backgroundColor: C.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: C.border,
                padding: 14,
                marginBottom: 10,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  backgroundColor: 'rgba(196,30,58,0.1)',
                  borderWidth: 1,
                  borderColor: 'rgba(196,30,58,0.2)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {feat.icon}
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: C.text,
                    fontSize: 14,
                    fontWeight: '600',
                    marginBottom: 3,
                  }}
                >
                  {feat.title}
                </Text>
                <Text
                  style={{
                    color: C.muted,
                    fontSize: 11,
                    fontFamily: fontsLoaded ? 'CourierPrime_400Regular' : undefined,
                    lineHeight: 16,
                  }}
                >
                  {feat.desc}
                </Text>
              </View>
            </View>
          ))}

          {/* Start button (disabled) */}
          <View
            style={{
              marginTop: 20,
              borderRadius: 14,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                paddingVertical: 16,
                backgroundColor: 'rgba(196,30,58,0.15)',
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: 'rgba(196,30,58,0.3)',
              }}
            >
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.red }} />
              <Text
                style={{
                  color: C.red,
                  fontSize: 15,
                  fontFamily: fontsLoaded ? 'CourierPrime_700Bold' : undefined,
                  letterSpacing: 1,
                }}
              >
                GO LIVE — COMING SOON
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}


# mobile/src/app/live-streams.tsx

import React from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Tv, Users, Eye } from 'lucide-react-native';
import {
  useFonts,
  BebasNeue_400Regular,
} from '@expo-google-fonts/bebas-neue';
import {
  CourierPrime_400Regular,
  CourierPrime_700Bold,
} from '@expo-google-fonts/courier-prime';

const C = {
  bg: '#1A1614',
  surface: '#231F1C',
  surface2: '#2D2825',
  text: '#E8DCC8',
  muted: '#6B5B4F',
  border: '#3D332C',
  red: '#C41E3A',
  redDark: '#A3162E',
} as const;

// Mock live stream data for UI demonstration
const MOCK_STREAMS: {
  id: string;
  broadcaster: string;
  title: string;
  viewers: number;
  category: string;
  avatarLetter: string;
}[] = [];

export default function LiveStreamsScreen() {
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    BebasNeue_400Regular,
    CourierPrime_400Regular,
    CourierPrime_700Bold,
  });

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }} testID="live-streams-screen">
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 14,
            borderBottomWidth: 1,
            borderBottomColor: C.border,
          }}
        >
          <Pressable
            testID="live-streams-back-button"
            onPress={() => router.back()}
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: pressed ? C.surface2 : C.surface,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: C.border,
              marginRight: 12,
            })}
          >
            <ChevronLeft size={20} color={C.text} strokeWidth={2} />
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: fontsLoaded ? 'BebasNeue_400Regular' : undefined,
                fontSize: 22,
                letterSpacing: 3,
                color: C.text,
                lineHeight: 24,
              }}
            >
              LIVE{' '}
              <Text style={{ color: C.red }}>STREAMS</Text>
            </Text>
            <Text
              style={{
                color: C.muted,
                fontSize: 10,
                fontFamily: fontsLoaded ? 'CourierPrime_400Regular' : undefined,
                letterSpacing: 1,
                marginTop: 1,
              }}
            >
              Who's broadcasting right now
            </Text>
          </View>

          {/* Live indicator pill */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              backgroundColor: 'rgba(196,30,58,0.12)',
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderWidth: 1,
              borderColor: 'rgba(196,30,58,0.25)',
            }}
          >
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.red }} />
            <Text
              style={{
                color: C.red,
                fontSize: 9,
                fontFamily: fontsLoaded ? 'CourierPrime_700Bold' : undefined,
                letterSpacing: 1,
              }}
            >
              {MOCK_STREAMS.length} LIVE
            </Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48 }}
        >
          {MOCK_STREAMS.length > 0 ? (
            <>
              <Text
                style={{
                  color: C.muted,
                  fontSize: 9,
                  fontFamily: fontsLoaded ? 'CourierPrime_700Bold' : undefined,
                  letterSpacing: 2,
                  marginBottom: 12,
                  marginTop: 20,
                }}
              >
                CURRENTLY LIVE
              </Text>
              {MOCK_STREAMS.map((stream) => (
                <Pressable
                  key={stream.id}
                  testID={`live-stream-${stream.id}`}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 14,
                    backgroundColor: pressed ? C.surface2 : C.surface,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: C.border,
                    padding: 14,
                    marginBottom: 10,
                  })}
                >
                  {/* Avatar */}
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: C.red,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '800' }}>
                      {stream.avatarLetter}
                    </Text>
                  </View>
                  {/* Info */}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: C.text,
                        fontSize: 14,
                        fontWeight: '600',
                        marginBottom: 2,
                      }}
                      numberOfLines={1}
                    >
                      {stream.title}
                    </Text>
                    <Text
                      style={{
                        color: C.muted,
                        fontSize: 11,
                        fontFamily: fontsLoaded ? 'CourierPrime_400Regular' : undefined,
                        marginBottom: 4,
                      }}
                    >
                      {stream.broadcaster}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View
                        style={{
                          backgroundColor: 'rgba(196,30,58,0.12)',
                          borderRadius: 5,
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderWidth: 1,
                          borderColor: 'rgba(196,30,58,0.25)',
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 3,
                        }}
                      >
                        <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: C.red }} />
                        <Text
                          style={{
                            color: C.red,
                            fontSize: 9,
                            fontFamily: fontsLoaded ? 'CourierPrime_700Bold' : undefined,
                            letterSpacing: 0.5,
                          }}
                        >
                          LIVE
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Eye size={11} color={C.muted} strokeWidth={2} />
                        <Text
                          style={{
                            color: C.muted,
                            fontSize: 10,
                            fontFamily: fontsLoaded ? 'CourierPrime_400Regular' : undefined,
                          }}
                        >
                          {stream.viewers.toLocaleString()}
                        </Text>
                      </View>
                      <Text
                        style={{
                          color: C.muted,
                          fontSize: 10,
                          fontFamily: fontsLoaded ? 'CourierPrime_400Regular' : undefined,
                        }}
                      >
                        {stream.category}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </>
          ) : (
            /* Empty state */
            <View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                paddingTop: 80,
                paddingHorizontal: 32,
              }}
              testID="live-streams-empty"
            >
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: C.surface,
                  borderWidth: 1.5,
                  borderColor: C.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 20,
                }}
              >
                <Tv size={34} color={C.muted} strokeWidth={1.5} />
              </View>

              <Text
                style={{
                  color: C.text,
                  fontSize: 17,
                  fontWeight: '700',
                  textAlign: 'center',
                  marginBottom: 8,
                }}
              >
                No live streams right now
              </Text>
              <Text
                style={{
                  color: C.muted,
                  fontSize: 12,
                  fontFamily: fontsLoaded ? 'CourierPrime_400Regular' : undefined,
                  textAlign: 'center',
                  lineHeight: 18,
                  marginBottom: 40,
                }}
              >
                When investigators go live, their broadcasts will appear here. Check back soon or start your own broadcast.
              </Text>

              {/* Divider */}
              <View
                style={{
                  width: '100%',
                  height: 1,
                  backgroundColor: C.border,
                  marginBottom: 32,
                }}
              />

              {/* Upcoming section */}
              <Text
                style={{
                  color: C.muted,
                  fontSize: 9,
                  fontFamily: fontsLoaded ? 'CourierPrime_700Bold' : undefined,
                  letterSpacing: 2,
                  marginBottom: 16,
                  alignSelf: 'flex-start',
                }}
              >
                PLATFORM FEATURES
              </Text>

              {[
                {
                  icon: <Tv size={18} color={C.red} strokeWidth={1.5} />,
                  title: 'Live investigations',
                  desc: 'Watch other researchers connect evidence in real-time',
                },
                {
                  icon: <Users size={18} color={C.red} strokeWidth={1.5} />,
                  title: 'Community streams',
                  desc: 'Follow investigators and get notified when they go live',
                },
              ].map((feat, i) => (
                <View
                  key={i}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: 12,
                    backgroundColor: C.surface,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: C.border,
                    padding: 14,
                    marginBottom: 10,
                    width: '100%',
                  }}
                >
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      backgroundColor: 'rgba(196,30,58,0.1)',
                      borderWidth: 1,
                      borderColor: 'rgba(196,30,58,0.2)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {feat.icon}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: C.text,
                        fontSize: 13,
                        fontWeight: '600',
                        marginBottom: 3,
                      }}
                    >
                      {feat.title}
                    </Text>
                    <Text
                      style={{
                        color: C.muted,
                        fontSize: 11,
                        fontFamily: fontsLoaded ? 'CourierPrime_400Regular' : undefined,
                        lineHeight: 15,
                      }}
                    >
                      {feat.desc}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}


# mobile/src/app/live-viewer.tsx

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


# mobile/src/app/new-case.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  useFonts,
  BebasNeue_400Regular,
} from '@expo-google-fonts/bebas-neue';
import {
  CourierPrime_400Regular,
  CourierPrime_700Bold,
} from '@expo-google-fonts/courier-prime';
import useInvestigationStore from '@/lib/state/investigation-store';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

type BoardStyle = 'corkboard' | 'mindmap' | 'timeline' | 'casefile';

// ─── Corkboard Preview ───────────────────────────────────────────
// Dark bg, two note cards side by side at top, one bottom-center,
// each with a red pushpin, red lines connecting top pins to bottom pin.
function CorkboardPreview() {
  // Pin center X positions (relative to the 120h container width ~CARD_WIDTH)
  // Top-left card: left edge ~10, width 52 → pin center at 10+26 = 36
  // Top-right card: right edge ~10, width 52 → pin center at containerWidth-10-26 = cw-36
  // Bottom-center card: centered → pin center at containerWidth/2
  // We use percentage strings for positions since we don't know exact CARD_WIDTH at render.
  // Instead, use a fixed inner width of 130 for the relative layout.

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 130, height: 100, position: 'relative' }}>

        {/* ── Red lines first (behind everything) ── */}

        {/* Line: top-left pin → bottom-center pin
            top-left pin approx at (36, 0), bottom pin approx at (65, 55)
            dx=29, dy=55 → length=sqrt(29²+55²)≈62, angle=atan2(55,29)≈62° */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 36,
            width: 62,
            height: 1.5,
            backgroundColor: '#C41E3A',
            opacity: 0.6,
            transformOrigin: 'left center',
            transform: [{ rotate: '62deg' }],
          }}
        />

        {/* Line: top-right pin → bottom-center pin
            top-right pin approx at (94, 4), bottom pin approx at (65, 55)
            dx=-29, dy=51 → angle from right pin going down-left ≈ -60deg */}
        <View
          style={{
            position: 'absolute',
            top: 4,
            left: 94,
            width: 58,
            height: 1.5,
            backgroundColor: '#C41E3A',
            opacity: 0.6,
            transformOrigin: 'left center',
            transform: [{ rotate: '-119deg' }],
          }}
        />

        {/* ── Top-left note card ── */}
        <View
          style={{
            position: 'absolute',
            top: 4,
            left: 10,
            width: 52,
            height: 40,
            backgroundColor: '#F0E6D0',
            borderRadius: 3,
            shadowColor: '#000',
            shadowOffset: { width: 1, height: 2 },
            shadowOpacity: 0.35,
            shadowRadius: 3,
            elevation: 3,
          }}
        >
          <View style={{ marginTop: 10, marginHorizontal: 6, gap: 4 }}>
            <View style={{ height: 2, backgroundColor: '#C4B59A', borderRadius: 1 }} />
            <View style={{ height: 2, backgroundColor: '#C4B59A', borderRadius: 1, width: '70%' }} />
          </View>
        </View>
        {/* Pushpin top-left — centered at top of card: left+26-4=32, top=0 */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 32,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: '#C41E3A',
            zIndex: 5,
          }}
        />

        {/* ── Top-right note card — slightly taller ── */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 68,
            width: 52,
            height: 44,
            backgroundColor: '#F0E6D0',
            borderRadius: 3,
            shadowColor: '#000',
            shadowOffset: { width: 1, height: 2 },
            shadowOpacity: 0.35,
            shadowRadius: 3,
            elevation: 3,
          }}
        >
          <View style={{ marginTop: 10, marginHorizontal: 6, gap: 4 }}>
            <View style={{ height: 2, backgroundColor: '#C4B59A', borderRadius: 1 }} />
            <View style={{ height: 2, backgroundColor: '#C4B59A', borderRadius: 1, width: '60%' }} />
            <View style={{ height: 2, backgroundColor: '#C4B59A', borderRadius: 1, width: '80%' }} />
          </View>
        </View>
        {/* Pushpin top-right — centered at top: left=68+26-4=90, top=-4 */}
        <View
          style={{
            position: 'absolute',
            top: -4,
            left: 90,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: '#C41E3A',
            zIndex: 5,
          }}
        />

        {/* ── Bottom-center note card — slightly wider ── */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 35,
            width: 60,
            height: 40,
            backgroundColor: '#F0E6D0',
            borderRadius: 3,
            shadowColor: '#000',
            shadowOffset: { width: 1, height: 2 },
            shadowOpacity: 0.35,
            shadowRadius: 3,
            elevation: 3,
          }}
        >
          <View style={{ marginTop: 10, marginHorizontal: 6, gap: 4 }}>
            <View style={{ height: 2, backgroundColor: '#C4B59A', borderRadius: 1 }} />
            <View style={{ height: 2, backgroundColor: '#C4B59A', borderRadius: 1, width: '75%' }} />
          </View>
        </View>
        {/* Pushpin bottom-center — centered at top of bottom card: left=35+30-4=61, bottom=40-4=36 */}
        <View
          style={{
            position: 'absolute',
            bottom: 36,
            left: 61,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: '#C41E3A',
            zIndex: 5,
          }}
        />
      </View>
    </View>
  );
}

// ─── Mind Map Preview ─────────────────────────────────────────────
// Central magnifying-glass circle, 4 satellite rounded-rect nodes with icons,
// thin colored lines from center to each node.
function MindMapPreview() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 120, height: 100, position: 'relative', alignItems: 'center', justifyContent: 'center' }}>

        {/* ── Connector lines (behind nodes) ── */}
        {/* Top-left line: center(60,50) → top-left node center(14,14) */}
        <View style={{
          position: 'absolute',
          top: 14,
          left: 14,
          width: 58,
          height: 1.5,
          backgroundColor: '#3B82F6',
          opacity: 0.7,
          transformOrigin: 'left center',
          transform: [{ rotate: '37deg' }],
        }} />
        {/* Top-right line: center(60,50) → top-right node center(106,14) */}
        <View style={{
          position: 'absolute',
          top: 14,
          left: 60,
          width: 58,
          height: 1.5,
          backgroundColor: '#E8DCC8',
          opacity: 0.6,
          transformOrigin: 'left center',
          transform: [{ rotate: '-37deg' }],
        }} />
        {/* Bottom-left line: center(60,50) → bottom-left node center(14,86) */}
        <View style={{
          position: 'absolute',
          top: 50,
          left: 14,
          width: 58,
          height: 1.5,
          backgroundColor: '#22C55E',
          opacity: 0.7,
          transformOrigin: 'left center',
          transform: [{ rotate: '-37deg' }],
        }} />
        {/* Bottom-right line: center(60,50) → bottom-right node center(106,86) */}
        <View style={{
          position: 'absolute',
          top: 50,
          left: 60,
          width: 58,
          height: 1.5,
          backgroundColor: '#F59E0B',
          opacity: 0.7,
          transformOrigin: 'left center',
          transform: [{ rotate: '37deg' }],
        }} />

        {/* ── Satellite nodes ── */}

        {/* Top-left: person icon (blue) */}
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 28,
          height: 28,
          borderRadius: 6,
          backgroundColor: '#1E3A5F',
          borderWidth: 1,
          borderColor: '#3B82F6',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {/* Head */}
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#3B82F6', marginBottom: 1 }} />
          {/* Body */}
          <View style={{ width: 12, height: 6, borderRadius: 3, backgroundColor: '#3B82F6' }} />
        </View>

        {/* Top-right: document icon (light) */}
        <View style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 28,
          height: 28,
          borderRadius: 6,
          backgroundColor: '#2A2520',
          borderWidth: 1,
          borderColor: '#6B5C4E',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <View style={{ width: 14, height: 18, backgroundColor: '#E8DCC8', borderRadius: 2, padding: 2 }}>
            <View style={{ height: 2, backgroundColor: '#6B5C4E', borderRadius: 1, marginBottom: 2 }} />
            <View style={{ height: 2, backgroundColor: '#6B5C4E', borderRadius: 1, marginBottom: 2, width: '80%' }} />
            <View style={{ height: 2, backgroundColor: '#6B5C4E', borderRadius: 1, width: '60%' }} />
          </View>
        </View>

        {/* Bottom-left: pin/location icon (green) */}
        <View style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: 28,
          height: 28,
          borderRadius: 6,
          backgroundColor: '#14291A',
          borderWidth: 1,
          borderColor: '#22C55E',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {/* Teardrop pin */}
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#22C55E', marginBottom: -2 }} />
          <View style={{ width: 3, height: 6, backgroundColor: '#22C55E', borderRadius: 1 }} />
        </View>

        {/* Bottom-right: link icon — two overlapping circles */}
        <View style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: 28,
          height: 28,
          borderRadius: 6,
          backgroundColor: '#2A1F0A',
          borderWidth: 1,
          borderColor: '#F59E0B',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
        }}>
          <View style={{ width: 9, height: 9, borderRadius: 4.5, borderWidth: 2, borderColor: '#F59E0B', marginRight: -3 }} />
          <View style={{ width: 9, height: 9, borderRadius: 4.5, borderWidth: 2, borderColor: '#F59E0B' }} />
        </View>

        {/* ── Central node: magnifying glass look ── */}
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: '#2A2520',
            borderWidth: 2,
            borderColor: '#6B5C4E',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.4,
            shadowRadius: 4,
            elevation: 4,
            zIndex: 10,
          }}
        >
          {/* Inner circle of magnifying glass */}
          <View style={{
            width: 14,
            height: 14,
            borderRadius: 7,
            borderWidth: 2,
            borderColor: '#E8DCC8',
            position: 'absolute',
            top: 5,
            left: 5,
          }} />
          {/* Handle line — bottom-right diagonal */}
          <View style={{
            position: 'absolute',
            bottom: 4,
            right: 4,
            width: 7,
            height: 2,
            backgroundColor: '#E8DCC8',
            borderRadius: 1,
            transform: [{ rotate: '45deg' }],
          }} />
        </View>
      </View>
    </View>
  );
}

// ─── Timeline Preview ─────────────────────────────────────────────
// Horizontal gray line, 4 colored dots sitting ON the line, year labels below.
function TimelinePreview() {
  const dots: { color: string; year: string }[] = [
    { color: '#C41E3A', year: '2019' },
    { color: '#F59E0B', year: '2021' },
    { color: '#3B82F6', year: '2022' },
    { color: '#22C55E', year: '2024' },
  ];

  return (
    <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 10 }}>
      {/* Outer container so we can absolutely position dots on the line */}
      <View style={{ height: 50, position: 'relative', justifyContent: 'center' }}>
        {/* Horizontal gray line — vertically centered at y=15 within this 50h box */}
        <View
          style={{
            position: 'absolute',
            top: 15,
            left: 0,
            right: 0,
            height: 2,
            backgroundColor: '#3D332C',
            borderRadius: 1,
          }}
        />

        {/* Dots + year labels, distributed evenly */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {dots.map((dot) => (
            <View key={dot.year} style={{ alignItems: 'center', width: 28 }}>
              {/* Dot sitting on the line: dot is 14px, line is at top=15, so marginTop = 15 - 7 = 8 */}
              <View
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 7,
                  backgroundColor: dot.color,
                  marginTop: 8,
                }}
              />
              <Text
                style={{
                  color: '#6B5C4E',
                  fontSize: 8,
                  marginTop: 4,
                }}
              >
                {dot.year}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── Case File Preview ────────────────────────────────────────────
// 4 rows: small colored dot on left, then full-width dark gray bar
function CaseFilePreview() {
  const bars: { color: string }[] = [
    { color: '#C41E3A' },
    { color: '#3B82F6' },
    { color: '#F59E0B' },
    { color: '#22C55E' },
  ];

  return (
    <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 14, gap: 10 }}>
      {bars.map((bar, i) => (
        <View
          key={i}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
        >
          {/* Colored dot */}
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: bar.color,
              flexShrink: 0,
            }}
          />
          {/* Full-width dark gray bar */}
          <View
            style={{
              flex: 1,
              height: 12,
              backgroundColor: '#2A2520',
              borderRadius: 4,
            }}
          />
        </View>
      ))}
    </View>
  );
}

// ─── Style card data ──────────────────────────────────────────────
const STYLE_CARDS: {
  id: BoardStyle;
  emoji: string;
  title: string;
  description: string;
  Preview: () => React.ReactElement;
}[] = [
  {
    id: 'corkboard',
    emoji: '🪵',
    title: 'Corkboard',
    description: 'Physical pins, red string connections. Classic detective style.',
    Preview: CorkboardPreview,
  },
  {
    id: 'mindmap',
    emoji: '🕸️',
    title: 'Mind Map',
    description: 'Web of nodes, visual connections. See the full picture.',
    Preview: MindMapPreview,
  },
  {
    id: 'timeline',
    emoji: '📅',
    title: 'Timeline',
    description: 'Chronological events, date-based investigation flow.',
    Preview: TimelinePreview,
  },
  {
    id: 'casefile',
    emoji: '📋',
    title: 'Case File',
    description: 'Structured list view. Organized, scannable, methodical.',
    Preview: CaseFilePreview,
  },
];

// ─── Main Screen ──────────────────────────────────────────────────
export default function NewCaseScreen() {
  const router = useRouter();
  const [selectedStyle, setSelectedStyle] = useState<BoardStyle>('corkboard');
  const [name, setName] = useState<string>('');

  const createInvestigation = useInvestigationStore((s) => s.createInvestigation);
  const setActiveInvestigation = useInvestigationStore((s) => s.setActiveInvestigation);
  const updateInvestigationMeta = useInvestigationStore((s) => s.updateInvestigationMeta);

  const [fontsLoaded] = useFonts({
    BebasNeue_400Regular,
    CourierPrime_400Regular,
    CourierPrime_700Bold,
  });

  const canCreate = name.trim().length > 0;

  const handleCreate = () => {
    if (!canCreate) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const id = createInvestigation(name.trim(), undefined);
    setActiveInvestigation(id);
    updateInvestigationMeta(id, {
      icon: STYLE_CARDS.find((c) => c.id === selectedStyle)?.emoji ?? '🔍',
      iconUri: undefined,
      boardStyle: selectedStyle,
      filingTabColor: undefined,
      filingTabLabel: undefined,
    });
    router.replace('/(tabs)/two');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#1A1614' }} testID="new-case-screen">
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          {/* ── Header ── */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingTop: 8,
              paddingBottom: 4,
              gap: 12,
            }}
          >
            {/* Back button — dark rounded square */}
            <Pressable
              testID="new-case-back-button"
              onPress={() => router.back()}
              style={({ pressed }) => ({
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: pressed ? '#3D332C' : '#231F1C',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: '#3D332C',
                flexShrink: 0,
              })}
            >
              <Text style={{ color: '#E8DCC8', fontSize: 20, lineHeight: 22, fontWeight: '300' }}>{'←'}</Text>
            </Pressable>

            {/* Title left-aligned */}
            <Text
              style={{
                fontFamily: fontsLoaded ? 'BebasNeue_400Regular' : undefined,
                fontSize: 28,
                letterSpacing: 4,
                color: '#E8DCC8',
              }}
            >
              NEW CASE
            </Text>
          </View>

          {/* ── Subtitle ── */}
          <Text
            style={{
              color: '#6B5C4E',
              fontSize: 12,
              fontFamily: fontsLoaded ? 'CourierPrime_400Regular' : undefined,
              textAlign: 'center',
              marginBottom: 20,
              letterSpacing: 0.5,
            }}
          >
            Choose your investigation style
          </Text>

          {/* ── Style Cards Grid ── */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
            style={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {STYLE_CARDS.map((card) => {
                const isSelected = selectedStyle === card.id;
                const { Preview } = card;
                return (
                  <Pressable
                    key={card.id}
                    testID={`style-card-${card.id}`}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedStyle(card.id);
                    }}
                    style={({ pressed }) => ({
                      width: CARD_WIDTH,
                      backgroundColor: '#231F1C',
                      borderRadius: 16,
                      borderWidth: isSelected ? 2 : 1,
                      borderColor: isSelected ? '#C41E3A' : '#3D332C',
                      overflow: 'hidden',
                      opacity: pressed ? 0.9 : 1,
                      transform: [{ scale: pressed ? 0.97 : 1 }],
                      shadowColor: isSelected ? '#C41E3A' : '#000',
                      shadowOffset: { width: 0, height: isSelected ? 4 : 2 },
                      shadowOpacity: isSelected ? 0.3 : 0.2,
                      shadowRadius: isSelected ? 8 : 4,
                      elevation: isSelected ? 6 : 3,
                    })}
                  >
                    {/* Selected checkmark overlay */}
                    {isSelected ? (
                      <View
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          backgroundColor: '#C41E3A',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 10,
                        }}
                      >
                        <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '800' }}>✓</Text>
                      </View>
                    ) : null}

                    {/* Visual preview area */}
                    <View
                      style={{
                        height: 150,
                        backgroundColor: '#1A1614',
                        borderBottomWidth: 1,
                        borderBottomColor: '#3D332C',
                      }}
                    >
                      <Preview />
                    </View>

                    {/* Card info */}
                    <View style={{ padding: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <Text style={{ fontSize: 16 }}>{card.emoji}</Text>
                        <Text
                          style={{
                            color: '#E8DCC8',
                            fontSize: 14,
                            fontFamily: fontsLoaded ? 'CourierPrime_700Bold' : undefined,
                            fontWeight: '700',
                          }}
                        >
                          {card.title}
                        </Text>
                      </View>
                      <Text
                        style={{
                          color: '#6B5C4E',
                          fontSize: 10,
                          fontFamily: fontsLoaded ? 'CourierPrime_400Regular' : undefined,
                          lineHeight: 14,
                        }}
                      >
                        {card.description}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {/* ── Bottom Section: Name input + Create button ── */}
          <View
            style={{
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: 24,
              borderTopWidth: 1,
              borderTopColor: '#3D332C',
              backgroundColor: '#1A1614',
              gap: 12,
            }}
          >
            <TextInput
              testID="new-case-name-input"
              value={name}
              onChangeText={setName}
              placeholder="Name this investigation..."
              placeholderTextColor="#4A3C30"
              style={{
                backgroundColor: '#231F1C',
                borderRadius: 28,
                paddingHorizontal: 20,
                paddingVertical: 14,
                color: '#E8DCC8',
                fontSize: 15,
                fontFamily: fontsLoaded ? 'CourierPrime_400Regular' : undefined,
                borderWidth: 1,
                borderColor: '#3D332C',
              }}
              returnKeyType="done"
              onSubmitEditing={handleCreate}
            />

            <Pressable
              testID="create-investigation-button"
              onPress={handleCreate}
              disabled={!canCreate}
              style={({ pressed }) => ({
                backgroundColor: canCreate
                  ? pressed
                    ? '#A01830'
                    : '#C41E3A'
                  : '#3D332C',
                borderRadius: 28,
                paddingVertical: 16,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: canCreate ? 1 : 0.7,
                shadowColor: canCreate ? '#C41E3A' : 'transparent',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.35,
                shadowRadius: 10,
                elevation: canCreate ? 6 : 0,
              })}
            >
              <Text
                style={{
                  color: canCreate ? '#FFF' : '#6B5C4E',
                  fontSize: 15,
                  fontFamily: fontsLoaded ? 'CourierPrime_700Bold' : undefined,
                  fontWeight: '700',
                  letterSpacing: 1,
                }}
              >
                CREATE INVESTIGATION
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}


# mobile/src/app/paywall.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X, Check, Star, Zap, Infinity as InfinityIcon, Crown } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  FadeInDown,
  FadeIn,
} from 'react-native-reanimated';
import Svg, { Line, Circle as SvgCircle } from 'react-native-svg';
import { getOfferings, purchasePackage, restorePurchases } from '@/lib/revenuecatClient';
import useSubscriptionStore from '@/lib/state/subscription-store';
import type { PurchasesPackage } from 'react-native-purchases';

// ---- Colors ----
const C = {
  bg: '#1A1614',
  surface: '#231F1C',
  surfaceAlt: '#2C2521',
  card: '#F5ECD7',
  cardDark: '#EDE0C4',
  red: '#C41E3A',
  redDark: '#A3162E',
  redGlow: 'rgba(196, 30, 58, 0.2)',
  pin: '#D4A574',
  amber: '#D4A574',
  text: '#E8DCC8',
  muted: '#6B5B4F',
  mutedLight: '#8B7B6F',
  border: '#3D332C',
  borderLight: '#4D3F38',
  gold: '#F0C060',
  proGlow: 'rgba(212, 165, 116, 0.15)',
} as const;

type BillingCycle = 'monthly' | 'annual';

// Package identifiers
const PKG = {
  proMonthly: '$rc_monthly',
  proAnnual: '$rc_annual',
  plusMonthly: '$rc_custom_plus_monthly',
  plusAnnual: '$rc_custom_plus_annual',
  lifetime: '$rc_lifetime',
} as const;

// Pricing fallbacks (shown if RevenueCat unavailable)
const PRICE_FALLBACK: Record<string, string> = {
  [PKG.proMonthly]: '$4.99/mo',
  [PKG.proAnnual]: '$39.99/yr',
  [PKG.plusMonthly]: '$9.99/mo',
  [PKG.plusAnnual]: '$79.99/yr',
  [PKG.lifetime]: '$99.99',
};

// ---- Animated red string decoration ----
function StringDecoration() {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.3, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, [opacity]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        animStyle,
        { position: 'absolute', top: 0, left: 0, right: 0, height: 120, pointerEvents: 'none' as const },
      ]}
    >
      <Svg width="100%" height="120" viewBox="0 0 400 120">
        {/* String from left to right connecting the tier dots */}
        <Line x1="60" y1="70" x2="200" y2="45" stroke={C.red} strokeWidth="1.5" opacity="0.8" />
        <Line x1="200" y1="45" x2="340" y2="70" stroke={C.red} strokeWidth="1.5" opacity="0.8" />
        {/* Pin dots */}
        <SvgCircle cx="60" cy="70" r="4" fill={C.pin} opacity="0.9" />
        <SvgCircle cx="200" cy="45" r="4" fill={C.red} opacity="0.9" />
        <SvgCircle cx="340" cy="70" r="4" fill={C.pin} opacity="0.9" />
        {/* Small detail strings */}
        <Line x1="60" y1="70" x2="40" y2="100" stroke={C.red} strokeWidth="1" opacity="0.4" />
        <Line x1="340" y1="70" x2="360" y2="100" stroke={C.red} strokeWidth="1" opacity="0.4" />
      </Svg>
    </Animated.View>
  );
}

// ---- Feature row ----
function FeatureRow({ label, free, pro, plus }: { label: string; free: string | boolean; pro: string | boolean; plus: string | boolean }) {
  const renderCell = (val: string | boolean) => {
    if (val === true) return <Check size={16} color={C.red} strokeWidth={2.5} />;
    if (val === false) return <Text style={{ color: C.muted, fontSize: 14 }}>—</Text>;
    return <Text style={{ color: C.text, fontSize: 12, fontWeight: '600', textAlign: 'center' }}>{val}</Text>;
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
      }}
    >
      <Text style={{ color: C.mutedLight, fontSize: 12, flex: 3 }}>{label}</Text>
      <View style={{ flex: 1, alignItems: 'center' }}>{renderCell(free)}</View>
      <View style={{ flex: 1, alignItems: 'center' }}>{renderCell(pro)}</View>
      <View style={{ flex: 1, alignItems: 'center' }}>{renderCell(plus)}</View>
    </View>
  );
}

// ---- Tier card ----
function TierCard({
  title,
  subtitle,
  price,
  isPopular,
  isSelected,
  features,
  onSelect,
  badgeColor,
  icon,
}: {
  title: string;
  subtitle: string;
  price: string;
  isPopular?: boolean;
  isSelected: boolean;
  features: string[];
  onSelect: () => void;
  badgeColor: string;
  icon: React.ReactNode;
}) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(() => {
    scale.value = withSequence(
      withTiming(0.97, { duration: 80 }),
      withTiming(1, { duration: 120 })
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect();
  }, [onSelect, scale]);

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={handlePress}
        testID={`tier-card-${title.toLowerCase()}`}
        style={{
          flex: 1,
          backgroundColor: isSelected ? C.surfaceAlt : C.surface,
          borderRadius: 16,
          padding: 16,
          borderWidth: isSelected ? 2 : 1,
          borderColor: isSelected ? badgeColor : C.border,
          shadowColor: isSelected ? badgeColor : 'transparent',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isSelected ? 0.3 : 0,
          shadowRadius: 12,
          elevation: isSelected ? 8 : 2,
          position: 'relative',
          overflow: 'visible',
        }}
      >
        {/* Most Popular badge */}
        {isPopular ? (
          <View
            style={{
              position: 'absolute',
              top: -12,
              alignSelf: 'center',
              backgroundColor: C.red,
              borderRadius: 20,
              paddingHorizontal: 12,
              paddingVertical: 4,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              shadowColor: C.red,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.4,
              shadowRadius: 6,
              elevation: 4,
              zIndex: 10,
            }}
          >
            <Star size={10} color="#FFF" strokeWidth={2.5} fill="#FFF" />
            <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>
              MOST POPULAR
            </Text>
          </View>
        ) : null}

        {/* Icon + title */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: isPopular ? 8 : 0, marginBottom: 8 }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: badgeColor + '22',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.text, fontSize: 15, fontWeight: '800' }}>{title}</Text>
          </View>
        </View>

        {/* Price */}
        <Text style={{ color: badgeColor, fontSize: 20, fontWeight: '900', marginBottom: 2 }}>
          {price}
        </Text>
        <Text style={{ color: C.muted, fontSize: 11, marginBottom: 12 }}>{subtitle}</Text>

        {/* Features */}
        {features.map((f) => (
          <View key={f} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 5 }}>
            <Check size={12} color={badgeColor} strokeWidth={2.5} style={{ marginTop: 1 }} />
            <Text style={{ color: C.mutedLight, fontSize: 11, flex: 1, lineHeight: 16 }}>{f}</Text>
          </View>
        ))}

        {/* Selected indicator */}
        {isSelected ? (
          <View
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: badgeColor,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Check size={11} color="#FFF" strokeWidth={3} />
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

// ---- Main Paywall Screen ----
export default function PaywallScreen() {
  const router = useRouter();
  const checkSubscription = useSubscriptionStore((s) => s.checkSubscription);

  const [billingCycle, setBillingCycle] = useState<BillingCycle>('annual');
  const [selectedTier, setSelectedTier] = useState<'pro' | 'plus'>('pro');
  const [packages, setPackages] = useState<Record<string, PurchasesPackage>>({});
  const [isPurchasing, setIsPurchasing] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [loadingPackages, setLoadingPackages] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load packages
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoadingPackages(true);
      const result = await getOfferings();
      if (!mounted) return;
      if (result.ok && result.data.current) {
        const pkgMap: Record<string, PurchasesPackage> = {};
        result.data.current.availablePackages.forEach((pkg) => {
          pkgMap[pkg.identifier] = pkg;
        });
        setPackages(pkgMap);
      }
      setLoadingPackages(false);
    };
    load();
    return () => { mounted = false; };
  }, []);

  // Get display price for a package id
  const getPrice = useCallback((pkgId: string): string => {
    const pkg = packages[pkgId];
    if (pkg) return pkg.product.priceString;
    return PRICE_FALLBACK[pkgId] ?? '—';
  }, [packages]);

  // Get price per month for annual (for savings display)
  const getAnnualMonthlyEquiv = useCallback((annualPkgId: string, monthlyPkgId: string): string => {
    const annualPkg = packages[annualPkgId];
    const monthlyPkg = packages[monthlyPkgId];
    if (annualPkg && monthlyPkg) {
      const annualMonthly = annualPkg.product.price / 12;
      const monthly = monthlyPkg.product.price;
      const savings = Math.round(((monthly - annualMonthly) / monthly) * 100);
      return `Save ${savings}%`;
    }
    return 'Save 33%';
  }, [packages]);

  // Determine which package to purchase
  const getSelectedPackageId = useCallback((): string => {
    if (selectedTier === 'pro') {
      return billingCycle === 'annual' ? PKG.proAnnual : PKG.proMonthly;
    }
    return billingCycle === 'annual' ? PKG.plusAnnual : PKG.plusMonthly;
  }, [selectedTier, billingCycle]);

  // Current price display
  const currentProPrice = billingCycle === 'annual' ? getPrice(PKG.proAnnual) : getPrice(PKG.proMonthly);
  const currentPlusPrice = billingCycle === 'annual' ? getPrice(PKG.plusAnnual) : getPrice(PKG.plusMonthly);
  const proSubtitle = billingCycle === 'annual'
    ? `${getAnnualMonthlyEquiv(PKG.proAnnual, PKG.proMonthly)} vs monthly`
    : 'billed monthly';
  const plusSubtitle = billingCycle === 'annual'
    ? `${getAnnualMonthlyEquiv(PKG.plusAnnual, PKG.plusMonthly)} vs monthly`
    : 'billed monthly';

  const handlePurchase = useCallback(async () => {
    const pkgId = getSelectedPackageId();
    const pkg = packages[pkgId];
    if (!pkg) {
      setErrorMessage('Package not available. Please try again.');
      return;
    }
    setIsPurchasing(true);
    setErrorMessage(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await purchasePackage(pkg);
    setIsPurchasing(false);
    if (result.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await checkSubscription();
      setShowSuccessModal(true);
    } else if (result.reason === 'sdk_error') {
      // User likely cancelled — don't show error
    } else {
      setErrorMessage('Purchase unavailable right now. Please try again.');
    }
  }, [getSelectedPackageId, packages, checkSubscription]);

  const handleLifetimePurchase = useCallback(async () => {
    const pkg = packages[PKG.lifetime];
    if (!pkg) {
      setErrorMessage('Lifetime package not available. Please try again.');
      return;
    }
    setIsPurchasing(true);
    setErrorMessage(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const result = await purchasePackage(pkg);
    setIsPurchasing(false);
    if (result.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await checkSubscription();
      setShowSuccessModal(true);
    } else if (result.reason !== 'sdk_error') {
      setErrorMessage('Lifetime purchase unavailable. Please try again.');
    }
  }, [packages, checkSubscription]);

  const handleRestore = useCallback(async () => {
    setIsRestoring(true);
    setErrorMessage(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await restorePurchases();
    setIsRestoring(false);
    if (result.ok) {
      await checkSubscription();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowSuccessModal(true);
    } else {
      setErrorMessage('No purchases found to restore.');
    }
  }, [checkSubscription]);

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  const handleSuccessDone = useCallback(() => {
    setShowSuccessModal(false);
    router.back();
  }, [router]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }} testID="paywall-screen">
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Close button */}
        <Pressable
          testID="paywall-close-button"
          onPress={handleClose}
          style={({ pressed }) => ({
            position: 'absolute',
            top: 52,
            right: 20,
            zIndex: 10,
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: pressed ? C.border : C.surface,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: C.border,
          })}
        >
          <X size={18} color={C.muted} strokeWidth={2} />
        </Pressable>

        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View entering={FadeIn.duration(600)} style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 }}>
            {/* String decoration above header */}
            <View style={{ height: 120, position: 'relative', marginBottom: 0 }}>
              <StringDecoration />
              {/* Header text centered */}
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 8 }}>
                <View
                  style={{
                    backgroundColor: C.red + '22',
                    borderRadius: 20,
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    marginBottom: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Crown size={12} color={C.red} strokeWidth={2} />
                  <Text style={{ color: C.red, fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>
                    UNLOCK FULL ACCESS
                  </Text>
                </View>
              </View>
            </View>
            <Text
              style={{
                color: C.text,
                fontSize: 28,
                fontWeight: '900',
                textAlign: 'center',
                letterSpacing: -0.5,
                marginBottom: 6,
              }}
            >
              Follow Every Thread
            </Text>
            <Text style={{ color: C.muted, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
              Upgrade to unravel deeper conspiracies with more investigations and nodes.
            </Text>
          </Animated.View>

          {/* Billing toggle */}
          <Animated.View entering={FadeInDown.delay(100).duration(500)} style={{ paddingHorizontal: 24, marginBottom: 20 }}>
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: C.surface,
                borderRadius: 12,
                padding: 4,
                borderWidth: 1,
                borderColor: C.border,
              }}
            >
              <Pressable
                testID="billing-monthly-toggle"
                onPress={() => setBillingCycle('monthly')}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 9,
                  alignItems: 'center',
                  backgroundColor: billingCycle === 'monthly' ? C.surfaceAlt : 'transparent',
                  borderWidth: billingCycle === 'monthly' ? 1 : 0,
                  borderColor: C.borderLight,
                }}
              >
                <Text style={{ color: billingCycle === 'monthly' ? C.text : C.muted, fontSize: 13, fontWeight: '700' }}>
                  Monthly
                </Text>
              </Pressable>
              <Pressable
                testID="billing-annual-toggle"
                onPress={() => setBillingCycle('annual')}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 9,
                  alignItems: 'center',
                  backgroundColor: billingCycle === 'annual' ? C.surfaceAlt : 'transparent',
                  borderWidth: billingCycle === 'annual' ? 1 : 0,
                  borderColor: C.borderLight,
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Text style={{ color: billingCycle === 'annual' ? C.text : C.muted, fontSize: 13, fontWeight: '700' }}>
                  Annual
                </Text>
                {billingCycle === 'annual' ? (
                  <View
                    style={{
                      backgroundColor: C.red,
                      borderRadius: 6,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                    }}
                  >
                    <Text style={{ color: '#FFF', fontSize: 9, fontWeight: '800' }}>SAVE 33%</Text>
                  </View>
                ) : (
                  <View
                    style={{
                      backgroundColor: C.border,
                      borderRadius: 6,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                    }}
                  >
                    <Text style={{ color: C.muted, fontSize: 9, fontWeight: '800' }}>SAVE 33%</Text>
                  </View>
                )}
              </Pressable>
            </View>
          </Animated.View>

          {/* Tier cards */}
          <Animated.View entering={FadeInDown.delay(200).duration(500)} style={{ paddingHorizontal: 16, flexDirection: 'row', gap: 12, marginBottom: 24 }}>
            <TierCard
              title="Pro"
              subtitle={proSubtitle}
              price={loadingPackages ? '...' : currentProPrice}
              isPopular
              isSelected={selectedTier === 'pro'}
              badgeColor={C.amber}
              icon={<Zap size={16} color={C.amber} strokeWidth={2} />}
              onSelect={() => setSelectedTier('pro')}
              features={[
                '25 investigations',
                '200 nodes each',
                'Color tags & labels',
                'Priority support',
              ]}
            />
            <TierCard
              title="Plus"
              subtitle={plusSubtitle}
              price={loadingPackages ? '...' : currentPlusPrice}
              isSelected={selectedTier === 'plus'}
              badgeColor={C.gold}
              icon={<Crown size={16} color={C.gold} strokeWidth={2} />}
              onSelect={() => setSelectedTier('plus')}
              features={[
                'Unlimited investigations',
                'Unlimited nodes',
                'Early feature access',
                'Everything in Pro',
              ]}
            />
          </Animated.View>

          {/* Feature comparison table */}
          <Animated.View
            entering={FadeInDown.delay(300).duration(500)}
            style={{
              marginHorizontal: 20,
              backgroundColor: C.surface,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: C.border,
              marginBottom: 20,
            }}
          >
            <Text style={{ color: C.text, fontSize: 13, fontWeight: '800', marginBottom: 12, letterSpacing: 0.5 }}>
              FEATURE COMPARISON
            </Text>
            {/* Column headers */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ color: C.muted, fontSize: 11, flex: 3 }}>Feature</Text>
              <Text style={{ color: C.muted, fontSize: 11, flex: 1, textAlign: 'center' }}>Free</Text>
              <Text style={{ color: C.amber, fontSize: 11, flex: 1, textAlign: 'center', fontWeight: '700' }}>Pro</Text>
              <Text style={{ color: C.gold, fontSize: 11, flex: 1, textAlign: 'center', fontWeight: '700' }}>Plus</Text>
            </View>
            <FeatureRow label="Investigations" free="3" pro="25" plus="∞" />
            <FeatureRow label="Nodes per case" free="25" pro="200" plus="∞" />
            <FeatureRow label="All node types" free={true} pro={true} plus={true} />
            <FeatureRow label="Red string connections" free={true} pro={true} plus={true} />
            <FeatureRow label="Color tags" free={false} pro={true} plus={true} />
            <FeatureRow label="Priority support" free={false} pro={true} plus={true} />
            <FeatureRow label="Early access" free={false} pro={false} plus={true} />
          </Animated.View>

          {/* Lifetime option */}
          <Animated.View entering={FadeInDown.delay(400).duration(500)} style={{ marginHorizontal: 20, marginBottom: 20 }}>
            <Pressable
              testID="lifetime-purchase-button"
              onPress={handleLifetimePurchase}
              disabled={isPurchasing}
              style={({ pressed }) => ({
                backgroundColor: pressed ? C.surfaceAlt : C.surface,
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: C.gold + '66',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              })}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  backgroundColor: C.gold + '22',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <InfinityIcon size={20} color={C.gold} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontSize: 15, fontWeight: '800' }}>Lifetime Access</Text>
                <Text style={{ color: C.muted, fontSize: 12 }}>One-time purchase, forever Plus</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: C.gold, fontSize: 18, fontWeight: '900' }}>
                  {loadingPackages ? '...' : getPrice(PKG.lifetime)}
                </Text>
                <Text style={{ color: C.muted, fontSize: 10 }}>one-time</Text>
              </View>
            </Pressable>
          </Animated.View>

          {/* Error */}
          {errorMessage ? (
            <View style={{ marginHorizontal: 20, marginBottom: 12 }}>
              <Text style={{ color: C.red, fontSize: 13, textAlign: 'center' }}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* CTA button */}
          <Animated.View entering={FadeInDown.delay(500).duration(500)} style={{ marginHorizontal: 20, marginBottom: 16 }}>
            <Pressable
              testID="purchase-button"
              onPress={handlePurchase}
              disabled={isPurchasing || isRestoring}
              style={({ pressed }) => ({
                backgroundColor: pressed ? C.redDark : C.red,
                borderRadius: 16,
                paddingVertical: 18,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: C.red,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.4,
                shadowRadius: 12,
                elevation: 8,
                opacity: isPurchasing || isRestoring ? 0.7 : 1,
              })}
            >
              {isPurchasing ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Text style={{ color: '#FFF', fontSize: 17, fontWeight: '900', letterSpacing: 0.3 }}>
                    Get {selectedTier === 'pro' ? 'Pro' : 'Plus'} —{' '}
                    {billingCycle === 'annual' ? getPrice(selectedTier === 'pro' ? PKG.proAnnual : PKG.plusAnnual) : getPrice(selectedTier === 'pro' ? PKG.proMonthly : PKG.plusMonthly)}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 }}>
                    {billingCycle === 'annual' ? 'Billed annually · Cancel anytime' : 'Billed monthly · Cancel anytime'}
                  </Text>
                </>
              )}
            </Pressable>
          </Animated.View>

          {/* Restore + legal */}
          <Animated.View entering={FadeInDown.delay(600).duration(500)} style={{ alignItems: 'center', paddingHorizontal: 24 }}>
            <Pressable
              testID="restore-purchases-button"
              onPress={handleRestore}
              disabled={isRestoring || isPurchasing}
            >
              {isRestoring ? (
                <ActivityIndicator color={C.muted} size="small" />
              ) : (
                <Text style={{ color: C.mutedLight, fontSize: 13, textDecorationLine: 'underline' }}>
                  Restore Purchases
                </Text>
              )}
            </Pressable>
            <Text style={{ color: C.muted, fontSize: 11, textAlign: 'center', marginTop: 12, lineHeight: 16 }}>
              Subscriptions auto-renew unless cancelled at least 24 hours before the end of the current period. Manage in your device Settings.
            </Text>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>

      {/* Success modal */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.8)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 32,
          }}
          onPress={handleSuccessDone}
        >
          <Animated.View
            entering={FadeInDown.duration(400).springify()}
            style={{
              backgroundColor: C.surface,
              borderRadius: 24,
              padding: 32,
              alignItems: 'center',
              width: '100%',
              maxWidth: 360,
              borderWidth: 1,
              borderColor: C.borderLight,
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: C.red + '22',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
              }}
            >
              <Check size={32} color={C.red} strokeWidth={2.5} />
            </View>
            <Text style={{ color: C.text, fontSize: 22, fontWeight: '900', marginBottom: 8, textAlign: 'center' }}>
              Access Unlocked
            </Text>
            <Text style={{ color: C.muted, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 28 }}>
              Your subscription is active. Go unravel the truth.
            </Text>
            <Pressable
              testID="success-done-button"
              onPress={handleSuccessDone}
              style={({ pressed }) => ({
                backgroundColor: pressed ? C.redDark : C.red,
                borderRadius: 12,
                paddingHorizontal: 40,
                paddingVertical: 14,
              })}
            >
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800' }}>Start Investigating</Text>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
}


# mobile/src/app/sign-in.tsx

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

function formatPhone(input: string): string {
  // Strip everything except digits and leading +
  const digits = input.replace(/\D/g, "");
  // If user typed a + at the start, preserve it
  const hasPlus = input.trimStart().startsWith("+");
  if (hasPlus) {
    return "+" + digits;
  }
  // Default to US +1
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

    // Button press animation
    buttonScale.value = withSequence(
      withTiming(0.95, { duration: 80 }),
      withTiming(1, { duration: 80 })
    );

    try {
      const result = await authClient.phoneNumber.sendOtp({
        phoneNumber: formattedPhone,
      });
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
                  letterSpacing: 3.2,
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
                  letterSpacing: 6.2,
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
                    letterSpacing: 0.7,
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
                    fontSize: 20,
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
                  Enter your phone number and we'll send a verification code via SMS.
                </Text>

                {/* Phone input */}
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: COLORS.muted,
                    letterSpacing: 1.6,
                    marginBottom: 8,
                  }}
                >
                  PHONE NUMBER
                </Text>
                <TextInput
                  testID="phone-input"
                  value={phone}
                  onChangeText={(t) => {
                    setPhone(t);
                    if (error) setError(null);
                  }}
                  placeholder="+1 (555) 000-0000"
                  placeholderTextColor={COLORS.muted}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="tel"
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
                      fontSize: 13,
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
                    style={() => ({
                      borderRadius: 12,
                      overflow: "hidden",
                      opacity: isLoading ? 0.8 : 1,
                    })}
                  >
                    <LinearGradient
                      colors={
                        isValidPhone
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
                        shadowOpacity: isValidPhone ? 0.4 : 0,
                        shadowRadius: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "800",
                          color: isValidPhone ? "#FFFFFF" : COLORS.muted,
                          letterSpacing: 0.7,
                        }}
                      >
                        {isLoading ? "Sending Code..." : "Send Verification Code"}
                      </Text>
                    </LinearGradient>
                  </Pressable>
                </Animated.View>
              </View>
            </Animated.View>

            {/* OR divider */}
            <Animated.View entering={FadeInDown.delay(400).duration(500)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20, marginBottom: 16 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: COLORS.border }} />
              <Text style={{ color: COLORS.muted, fontSize: 13, fontWeight: '600', letterSpacing: 1.2 }}>OR</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: COLORS.border }} />
            </Animated.View>

            {/* Social sign-in buttons */}
            <Animated.View entering={FadeInDown.delay(500).duration(500)} style={{ gap: 12 }}>
              {/* Google */}
              <Pressable
                onPress={async () => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  try {
                    await (authClient as any).signIn.social({ provider: 'google', callbackURL: '/dashboard' });
                  } catch {
                    setSocialMessage('Google Sign-In is not configured yet. Use phone number for now.');
                    setTimeout(() => setSocialMessage(null), 3000);
                  }
                }}
                style={({ pressed }) => ({
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
                  backgroundColor: pressed ? '#2A2421' : COLORS.surface,
                  borderRadius: 12, padding: 14,
                  borderWidth: 1, borderColor: COLORS.border,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#4285F4', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '900' }}>G</Text>
                </View>
                <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '600' }}>Continue with Google</Text>
              </Pressable>

              {/* Apple */}
              <Pressable
                onPress={async () => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  try {
                    await (authClient as any).signIn.social({ provider: 'apple', callbackURL: '/dashboard' });
                  } catch {
                    setSocialMessage('Apple Sign-In is not configured yet. Use phone number for now.');
                    setTimeout(() => setSocialMessage(null), 3000);
                  }
                }}
                style={({ pressed }) => ({
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
                  backgroundColor: pressed ? '#2A2421' : COLORS.surface,
                  borderRadius: 12, padding: 14,
                  borderWidth: 1, borderColor: COLORS.border,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#F5ECD7', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#1A1614', fontSize: 13, fontWeight: '900' }}></Text>
                </View>
                <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '600' }}>Continue with Apple</Text>
              </Pressable>
            </Animated.View>

            {/* Social message toast */}
            {socialMessage ? (
              <Animated.View entering={FadeInDown.duration(300)} style={{
                marginTop: 12, backgroundColor: COLORS.surface, borderRadius: 10, padding: 12,
                borderWidth: 1, borderColor: COLORS.border, borderLeftWidth: 3, borderLeftColor: COLORS.amber,
              }}>
                <Text style={{ color: COLORS.text, fontSize: 13, textAlign: 'center' }}>{socialMessage}</Text>
              </Animated.View>
            ) : null}

            {/* Footer text */}
            <Animated.View
              entering={FadeIn.delay(600).duration(400)}
              style={{ alignItems: "center", marginTop: 24 }}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: COLORS.muted,
                  textAlign: "center",
                  lineHeight: 18,
                }}
              >
                No password needed. We keep your investigations secure{"\n"}with one-time SMS codes.
              </Text>
            </Animated.View>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}


# mobile/src/app/sources-panel.tsx

import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  BookOpen,
  Users,
  CheckCircle,
  BarChart2,
  ChevronDown,
  ChevronUp,
  Globe,
  FileText,
  Link as LinkIcon,
  User,
  Video,
  Mic,
  File,
  Share2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import useInvestigationStore from '@/lib/state/investigation-store';
import type { NodeSource, CanvasNode } from '@/lib/types';

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

type ViewTab = 'by-source' | 'by-node';

function credibilityColor(cred: NodeSource['credibility']): string {
  switch (cred) {
    case 'confirmed': return C.green;
    case 'primary': return C.amber;
    case 'secondary': return C.blue;
    case 'unverified': return C.muted;
    case 'disputed': return C.red;
  }
}

function credibilityLabel(cred: NodeSource['credibility']): string {
  switch (cred) {
    case 'confirmed': return 'CONFIRMED';
    case 'primary': return 'PRIMARY';
    case 'secondary': return 'SECONDARY';
    case 'unverified': return 'UNVERIFIED';
    case 'disputed': return 'DISPUTED';
  }
}

function platformIcon(platform: NodeSource['platform'] | undefined): React.ReactElement {
  const size = 13;
  const color = C.muted;
  const sw = 2;
  switch (platform) {
    case 'x': return <Text style={{ color, fontSize: 11, fontWeight: '700' }}>X</Text>;
    case 'youtube': return <Video size={size} color={color} strokeWidth={sw} />;
    case 'podcast': return <Mic size={size} color={color} strokeWidth={sw} />;
    case 'website': return <Globe size={size} color={color} strokeWidth={sw} />;
    case 'facebook': return <Users size={size} color={color} strokeWidth={sw} />;
    case 'tiktok': return <Video size={size} color={color} strokeWidth={sw} />;
    case 'instagram': return <User size={size} color={color} strokeWidth={sw} />;
    default: return <Globe size={size} color={color} strokeWidth={sw} />;
  }
}

function nodeTypeIcon(type: CanvasNode['type']): React.ReactElement {
  const size = 14;
  const color = C.muted;
  const sw = 2;
  switch (type) {
    case 'link': return <LinkIcon size={size} color={color} strokeWidth={sw} />;
    case 'image': return <File size={size} color={color} strokeWidth={sw} />;
    case 'dataset': return <BarChart2 size={size} color={color} strokeWidth={sw} />;
    case 'note': return <FileText size={size} color={color} strokeWidth={sw} />;
    default: return <FileText size={size} color={color} strokeWidth={sw} />;
  }
}

function researchScoreLabel(score: number): string {
  if (score <= 20) return 'Early Research';
  if (score <= 40) return 'Growing';
  if (score <= 60) return 'Solid';
  if (score <= 80) return 'Thorough';
  return 'Exhaustive';
}

function researchScoreColor(score: number): string {
  if (score <= 20) return C.muted;
  if (score <= 40) return C.amber;
  if (score <= 60) return C.blue;
  if (score <= 80) return C.green;
  return C.amber;
}

// ---- Stat Card ----
function StatCard({
  label,
  value,
  sublabel,
  color,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  color?: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: C.surface,
        borderRadius: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: C.border,
        alignItems: 'center',
      }}
    >
      <Text style={{ color: color ?? C.text, fontSize: 22, fontWeight: '900' }}>
        {value}
      </Text>
      <Text style={{ color: C.muted, fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginTop: 2, textAlign: 'center' }}>
        {label}
      </Text>
      {sublabel ? (
        <Text style={{ color: color ?? C.muted, fontSize: 9, marginTop: 2, textAlign: 'center' }}>
          {sublabel}
        </Text>
      ) : null}
    </View>
  );
}

// ---- Source Group (by-source tab) ----
function SourceGroup({
  sourceName,
  platform,
  credibility,
  sourceUrl,
  secondarySourceName,
  nodeEntries,
  index,
}: {
  sourceName: string;
  platform: NodeSource['platform'] | undefined;
  credibility: NodeSource['credibility'];
  sourceUrl: string | undefined;
  secondarySourceName: string | undefined;
  nodeEntries: { nodeId: string; nodeTitle: string }[];
  index: number;
}) {
  const [expanded, setExpanded] = useState<boolean>(false);
  const credColor = credibilityColor(credibility);

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(300)}>
      <View
        style={{
          backgroundColor: C.surface,
          borderRadius: 12,
          marginHorizontal: 16,
          marginBottom: 10,
          borderWidth: 1,
          borderColor: C.border,
          overflow: 'hidden',
        }}
      >
        <Pressable
          onPress={() => {
            setExpanded((v) => !v);
            Haptics.selectionAsync();
          }}
          style={({ pressed }) => ({
            padding: 14,
            backgroundColor: pressed ? C.surfaceAlt : 'transparent',
          })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {platformIcon(platform)}
            <Text style={{ flex: 1, color: C.text, fontSize: 14, fontWeight: '700' }} numberOfLines={1}>
              {sourceName}
            </Text>
            <View
              style={{
                backgroundColor: credColor + '22',
                borderRadius: 5,
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderWidth: 1,
                borderColor: credColor + '44',
              }}
            >
              <Text style={{ color: credColor, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 }}>
                {credibilityLabel(credibility)}
              </Text>
            </View>
            {expanded ? (
              <ChevronUp size={14} color={C.muted} strokeWidth={2} />
            ) : (
              <ChevronDown size={14} color={C.muted} strokeWidth={2} />
            )}
          </View>

          {secondarySourceName ? (
            <Text style={{ color: C.muted, fontSize: 11, marginTop: 4 }} numberOfLines={1}>
              via {secondarySourceName}
            </Text>
          ) : null}

          <Text style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>
            {nodeEntries.length} {nodeEntries.length === 1 ? 'node' : 'nodes'}
          </Text>
        </Pressable>

        {expanded ? (
          <View
            style={{
              paddingHorizontal: 14,
              paddingBottom: 12,
              borderTopWidth: 1,
              borderTopColor: C.border,
              paddingTop: 10,
            }}
          >
            {nodeEntries.map((entry) => (
              <View
                key={entry.nodeId}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingVertical: 5,
                }}
              >
                <View
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 3,
                    backgroundColor: C.amber,
                  }}
                />
                <Text style={{ color: C.text, fontSize: 13 }} numberOfLines={1}>
                  {entry.nodeTitle}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

// ---- Node Entry (by-node tab) ----
function NodeSourceEntry({
  node,
  index,
}: {
  node: CanvasNode;
  index: number;
}) {
  const [expanded, setExpanded] = useState<boolean>(false);
  const sources = node.sources ?? [];

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(300)}>
      <View
        style={{
          backgroundColor: C.surface,
          borderRadius: 12,
          marginHorizontal: 16,
          marginBottom: 10,
          borderWidth: 1,
          borderColor: C.border,
          overflow: 'hidden',
        }}
      >
        <Pressable
          onPress={() => {
            setExpanded((v) => !v);
            Haptics.selectionAsync();
          }}
          style={({ pressed }) => ({
            padding: 14,
            backgroundColor: pressed ? C.surfaceAlt : 'transparent',
          })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {nodeTypeIcon(node.type)}
            <Text style={{ flex: 1, color: C.text, fontSize: 14, fontWeight: '700' }} numberOfLines={1}>
              {node.title}
            </Text>
            <Text style={{ color: C.muted, fontSize: 12 }}>
              {sources.length} {sources.length === 1 ? 'source' : 'sources'}
            </Text>
            {expanded ? (
              <ChevronUp size={14} color={C.muted} strokeWidth={2} />
            ) : (
              <ChevronDown size={14} color={C.muted} strokeWidth={2} />
            )}
          </View>
        </Pressable>

        {expanded ? (
          <View
            style={{
              paddingHorizontal: 14,
              paddingBottom: 12,
              borderTopWidth: 1,
              borderTopColor: C.border,
              paddingTop: 10,
              gap: 8,
            }}
          >
            {sources.map((src) => {
              const credColor = credibilityColor(src.credibility);
              return (
                <View
                  key={src.id}
                  style={{
                    backgroundColor: C.surfaceAlt,
                    borderRadius: 8,
                    padding: 10,
                    borderWidth: 1,
                    borderColor: C.border,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    {platformIcon(src.platform)}
                    <Text style={{ flex: 1, color: C.text, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
                      {src.sourceName}
                    </Text>
                    <View
                      style={{
                        backgroundColor: credColor + '22',
                        borderRadius: 5,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderWidth: 1,
                        borderColor: credColor + '44',
                      }}
                    >
                      <Text style={{ color: credColor, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 }}>
                        {credibilityLabel(src.credibility)}
                      </Text>
                    </View>
                  </View>
                  {src.contentType ? (
                    <Text style={{ color: C.muted, fontSize: 11 }}>
                      {src.contentType}
                    </Text>
                  ) : null}
                  {src.secondarySourceName ? (
                    <Text style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>
                      via {src.secondarySourceName}
                    </Text>
                  ) : null}
                  {src.sourceUrl ? (
                    <Text style={{ color: C.blue, fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                      {src.sourceUrl}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

// ---- Main Screen ----
export default function SourcesPanelScreen() {
  const router = useRouter();
  const { investigationId } = useLocalSearchParams<{ investigationId: string }>();
  const [activeTab, setActiveTab] = useState<ViewTab>('by-source');

  const investigations = useInvestigationStore((s) => s.investigations);
  const investigation = useMemo(
    () => investigations.find((inv) => inv.id === investigationId),
    [investigations, investigationId]
  );

  const nodes = investigation?.nodes ?? [];

  // Gather all sources across all nodes
  const allSources = useMemo(() => {
    const result: { source: NodeSource; nodeId: string; nodeTitle: string }[] = [];
    for (const node of nodes) {
      for (const src of node.sources ?? []) {
        result.push({ source: src, nodeId: node.id, nodeTitle: node.title });
      }
    }
    return result;
  }, [nodes]);

  // Stats
  const totalSources = allSources.length;
  const uniqueContributors = useMemo(
    () => new Set(allSources.map((s) => s.source.sourceName)).size,
    [allSources]
  );
  const verifiedCount = useMemo(
    () => allSources.filter((s) => s.source.credibility === 'confirmed').length,
    [allSources]
  );
  const researchScore = Math.min(
    100,
    totalSources * 2 + uniqueContributors * 5 + verifiedCount * 10
  );

  // Group sources by sourceName for by-source tab
  const sourceGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        sourceName: string;
        platform: NodeSource['platform'] | undefined;
        credibility: NodeSource['credibility'];
        sourceUrl: string | undefined;
        secondarySourceName: string | undefined;
        nodeEntries: { nodeId: string; nodeTitle: string }[];
      }
    >();

    for (const entry of allSources) {
      const key = entry.source.sourceName;
      if (!map.has(key)) {
        map.set(key, {
          sourceName: entry.source.sourceName,
          platform: entry.source.platform,
          credibility: entry.source.credibility,
          sourceUrl: entry.source.sourceUrl,
          secondarySourceName: entry.source.secondarySourceName,
          nodeEntries: [],
        });
      }
      map.get(key)!.nodeEntries.push({
        nodeId: entry.nodeId,
        nodeTitle: entry.nodeTitle,
      });
    }
    return Array.from(map.values());
  }, [allSources]);

  // Nodes with sources for by-node tab
  const nodesWithSources = useMemo(
    () => nodes.filter((n) => (n.sources ?? []).length > 0),
    [nodes]
  );

  const handleExportCitations = useCallback(async () => {
    if (!investigation) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const now = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const lines: string[] = [
      `RED STRING RESEARCH — ${investigation.title}`,
      'SOURCES & CITATIONS',
      `Generated: ${now}`,
      '━━━━━━━━━━━━━━━━━━',
    ];

    for (const node of nodesWithSources) {
      lines.push('');
      lines.push(`[${node.title.toUpperCase()}]`);
      for (const src of node.sources ?? []) {
        lines.push(
          `  • ${src.sourceName}${src.platform ? ` (${src.platform})` : ''}${src.contentType ? ` — ${src.contentType}` : ''}`
        );
        if (src.sourceUrl) lines.push(`    Link: ${src.sourceUrl}`);
        if (src.secondarySourceName) lines.push(`    Secondary: ${src.secondarySourceName}`);
        lines.push(`    Credibility: ${src.credibility}`);
      }
      lines.push('━━━━━━━━━━━━━━━━━━');
    }

    lines.push('');
    lines.push('Research conducted using Red String Research');

    try {
      await Share.share({
        message: lines.join('\n'),
        title: `${investigation.title} — Sources`,
      });
    } catch {
      // ignore
    }
  }, [investigation, nodesWithSources]);

  if (!investigation) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: C.muted, fontSize: 14 }}>Investigation not found.</Text>
      </View>
    );
  }

  const scoreColor = researchScoreColor(researchScore);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }} testID="sources-panel-screen">
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
            testID="sources-panel-back"
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
            <Text style={{ color: C.text, fontSize: 16, fontWeight: '900', letterSpacing: 1.5 }}>
              SOURCES & RESEARCH
            </Text>
            <Text style={{ color: C.muted, fontSize: 12 }} numberOfLines={1}>
              {investigation.title}
            </Text>
          </View>
          <BookOpen size={18} color={C.muted} strokeWidth={1.5} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Stats grid */}
          <View style={{ padding: 16, gap: 10 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <StatCard label="TOTAL SOURCES" value={totalSources} />
              <StatCard label="CONTRIBUTORS" value={uniqueContributors} color={C.amber} />
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <StatCard label="VERIFIED" value={verifiedCount} color={C.green} />
              <StatCard
                label="RESEARCH SCORE"
                value={researchScore}
                sublabel={researchScoreLabel(researchScore)}
                color={scoreColor}
              />
            </View>
          </View>

          {/* Tab switcher */}
          <View
            style={{
              flexDirection: 'row',
              marginHorizontal: 16,
              marginBottom: 16,
              backgroundColor: C.surface,
              borderRadius: 10,
              padding: 4,
              borderWidth: 1,
              borderColor: C.border,
            }}
          >
            {(['by-source', 'by-node'] as ViewTab[]).map((tab) => {
              const isActive = activeTab === tab;
              return (
                <Pressable
                  key={tab}
                  testID={`sources-tab-${tab}`}
                  onPress={() => {
                    setActiveTab(tab);
                    Haptics.selectionAsync();
                  }}
                  style={{
                    flex: 1,
                    backgroundColor: isActive ? C.red : 'transparent',
                    borderRadius: 8,
                    paddingVertical: 8,
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: isActive ? '#FFF' : C.muted,
                      fontSize: 11,
                      fontWeight: '800',
                      letterSpacing: 0.5,
                    }}
                  >
                    {tab === 'by-source' ? 'BY SOURCE' : 'BY NODE'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Empty state */}
          {allSources.length === 0 ? (
            <View style={{ alignItems: 'center', paddingHorizontal: 40, paddingTop: 40 }}>
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
                <BookOpen size={28} color={C.muted} strokeWidth={1.5} />
              </View>
              <Text style={{ color: C.text, fontSize: 16, fontWeight: '700', marginBottom: 8, textAlign: 'center' }}>
                No Sources Yet
              </Text>
              <Text style={{ color: C.muted, fontSize: 13, lineHeight: 20, textAlign: 'center' }}>
                Add sources to your nodes on the canvas to track your research here.
              </Text>
            </View>
          ) : activeTab === 'by-source' ? (
            sourceGroups.map((group, i) => (
              <SourceGroup
                key={group.sourceName}
                sourceName={group.sourceName}
                platform={group.platform}
                credibility={group.credibility}
                sourceUrl={group.sourceUrl}
                secondarySourceName={group.secondarySourceName}
                nodeEntries={group.nodeEntries}
                index={i}
              />
            ))
          ) : (
            nodesWithSources.map((node, i) => (
              <NodeSourceEntry key={node.id} node={node} index={i} />
            ))
          )}

          {/* Export button */}
          {allSources.length > 0 ? (
            <Pressable
              testID="export-citations-button"
              onPress={handleExportCitations}
              style={({ pressed }) => ({
                marginHorizontal: 16,
                marginTop: 20,
                backgroundColor: pressed ? C.surfaceAlt : C.surface,
                borderRadius: 12,
                padding: 14,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                borderWidth: 1,
                borderColor: C.border,
              })}
            >
              <Share2 size={16} color={C.amber} strokeWidth={2} />
              <Text style={{ color: C.amber, fontSize: 14, fontWeight: '700' }}>
                Export Citations
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}


# mobile/src/app/tip-inbox.tsx

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
              opacity: addToBoardMutation.isPending ? 0.7 : 1,
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


# mobile/src/app/tip-submit.tsx

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import {
  Shield,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Lock,
  CheckCircle,
  Link as LinkIcon,
} from 'lucide-react-native';
import Animated, {
  FadeIn,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api/api';

const C = {
  bg: '#0D1117',
  surface: '#161B22',
  surfaceAlt: '#1C2128',
  card: '#21262D',
  red: '#C41E3A',
  amber: '#D4A574',
  text: '#E8DCC8',
  muted: '#6B7280',
  border: '#30363D',
  green: '#22C55E',
  blue: '#3B82F6',
  textDim: '#8B949E',
} as const;

interface InvestigatorProfile {
  id: string;
  name: string;
  handle?: string;
}

interface SubmitTipPayload {
  subject: string;
  content: string;
  tipperName?: string;
  tipperEmail?: string;
  tipperHandle?: string;
  isAnonymous: boolean;
  evidenceUrls: string[];
  investigationId?: string;
}

// ---- Success Screen ----
function SuccessScreen({ hasContactInfo }: { hasContactInfo: boolean }) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    opacity.value = withSpring(1, { damping: 20 });
    scale.value = withSequence(
      withSpring(1.3, { damping: 8, stiffness: 300 }),
      withSpring(1, { damping: 12, stiffness: 200 })
    );
  }, []);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      style={{
        flex: 1,
        backgroundColor: C.bg,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
      }}
    >
      <Animated.View style={[iconStyle, { marginBottom: 28 }]}>
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: 'rgba(34,197,94,0.15)',
            borderWidth: 2,
            borderColor: 'rgba(34,197,94,0.4)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CheckCircle size={48} color={C.green} strokeWidth={1.5} />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(300).duration(400)} style={{ alignItems: 'center' }}>
        <Text
          style={{
            color: C.text,
            fontSize: 24,
            fontWeight: '800',
            textAlign: 'center',
            marginBottom: 12,
          }}
        >
          Tip Received
        </Text>
        <Text
          style={{
            color: C.muted,
            fontSize: 15,
            textAlign: 'center',
            lineHeight: 22,
            marginBottom: 12,
          }}
        >
          Your tip has been received. The investigator will review it shortly.
        </Text>
        {hasContactInfo ? (
          <Text
            style={{
              color: C.textDim,
              fontSize: 13,
              textAlign: 'center',
              lineHeight: 20,
            }}
          >
            You may be contacted if further information is needed.
          </Text>
        ) : null}

        {/* Watermark */}
        <View
          style={{
            marginTop: 48,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            opacity: 0.4,
          }}
        >
          <Shield size={12} color={C.muted} strokeWidth={2} />
          <Text style={{ color: C.muted, fontSize: 11, letterSpacing: 0.5 }}>
            RED STRING RESEARCH
          </Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

// ---- URL Input Row ----
function UrlInputRow({
  value,
  index,
  onChangeText,
  onRemove,
}: {
  value: string;
  index: number;
  onChangeText: (text: string) => void;
  onRemove: () => void;
}) {
  return (
    <Animated.View
      entering={FadeInUp.duration(250)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}
    >
      <LinkIcon size={14} color={C.muted} strokeWidth={2} />
      <TextInput
        testID={`evidence-url-${index}`}
        value={value}
        onChangeText={onChangeText}
        placeholder={`https://example.com/evidence-${index + 1}`}
        placeholderTextColor={C.muted}
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
        style={{
          flex: 1,
          backgroundColor: C.card,
          borderRadius: 8,
          padding: 10,
          color: C.text,
          fontSize: 13,
          borderWidth: 1,
          borderColor: C.border,
        }}
      />
      <Pressable
        testID={`remove-url-${index}`}
        onPress={onRemove}
        style={({ pressed }) => ({
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: pressed ? 'rgba(196,30,58,0.2)' : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        })}
      >
        <X size={14} color={C.muted} strokeWidth={2} />
      </Pressable>
    </Animated.View>
  );
}

// ---- Main Screen ----
export default function TipSubmitScreen() {
  const params = useLocalSearchParams<{ investigatorId?: string; investigationId?: string; for?: string }>();
  const investigatorId = params.investigatorId ?? params.for ?? '';
  const investigationId = params.investigationId;

  const [subject, setSubject] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [tipperName, setTipperName] = useState<string>('');
  const [tipperEmail, setTipperEmail] = useState<string>('');
  const [tipperHandle, setTipperHandle] = useState<string>('');
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [showIdentitySection, setShowIdentitySection] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);

  const { data: profile } = useQuery<InvestigatorProfile>({
    queryKey: ['investigator-profile', investigatorId],
    queryFn: () => api.get<InvestigatorProfile>(`/api/tips/profile/${investigatorId}`),
    enabled: !!investigatorId,
    retry: false,
  });

  const { mutate: submitMutate, isPending: isSubmitPending, isError: isSubmitError } = useMutation({
    mutationFn: (payload: SubmitTipPayload) =>
      api.post(`/api/tips/submit/${investigatorId}`, payload),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSubmitted(true);
    },
    onError: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  const handleSubmit = useCallback(() => {
    if (!subject.trim() || !content.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const payload: SubmitTipPayload = {
      subject: subject.trim(),
      content: content.trim(),
      isAnonymous,
      evidenceUrls: evidenceUrls.filter((u) => u.trim()),
    };

    if (!isAnonymous) {
      if (tipperName.trim()) payload.tipperName = tipperName.trim();
      if (tipperEmail.trim()) payload.tipperEmail = tipperEmail.trim();
      if (tipperHandle.trim()) payload.tipperHandle = tipperHandle.trim();
    }

    if (investigationId) {
      payload.investigationId = investigationId;
    }

    submitMutate(payload);
  }, [subject, content, isAnonymous, tipperName, tipperEmail, tipperHandle, evidenceUrls, investigationId, submitMutate]);

  const addEvidenceUrl = useCallback(() => {
    if (evidenceUrls.length >= 5) return;
    setEvidenceUrls((prev) => [...prev, '']);
  }, [evidenceUrls.length]);

  const updateUrl = useCallback((index: number, value: string) => {
    setEvidenceUrls((prev) => prev.map((u, i) => (i === index ? value : u)));
  }, []);

  const removeUrl = useCallback((index: number) => {
    setEvidenceUrls((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const hasContactInfo = !isAnonymous && (!!tipperEmail.trim() || !!tipperHandle.trim());
  const canSubmit = subject.trim().length > 0 && content.trim().length > 0;

  if (submitted) {
    return <SuccessScreen hasContactInfo={hasContactInfo} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }} testID="tip-submit-screen">
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Watermark header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 28 }}>
              <Shield size={14} color={C.red} strokeWidth={2} />
              <Text style={{ color: C.red, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 }}>
                RED STRING RESEARCH
              </Text>
            </View>

            {/* Title area */}
            <Text
              style={{
                color: C.text,
                fontSize: 28,
                fontWeight: '900',
                letterSpacing: 0.5,
                marginBottom: 6,
              }}
            >
              Submit a Tip
            </Text>
            {profile ? (
              <Text style={{ color: C.muted, fontSize: 15, marginBottom: 24 }}>
                To:{' '}
                <Text style={{ color: C.amber, fontWeight: '600' }}>
                  {profile.name}
                  {profile.handle ? ` (@${profile.handle})` : ''}
                </Text>
              </Text>
            ) : investigatorId ? (
              <Text style={{ color: C.muted, fontSize: 15, marginBottom: 24 }}>
                To: <Text style={{ color: C.muted }}>Investigator</Text>
              </Text>
            ) : (
              <View
                style={{
                  backgroundColor: 'rgba(196,30,58,0.1)',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 24,
                  borderWidth: 1,
                  borderColor: 'rgba(196,30,58,0.3)',
                }}
              >
                <Text style={{ color: C.red, fontSize: 13 }}>
                  Invalid tip link. Please use a valid investigator link.
                </Text>
              </View>
            )}

            {/* Subject */}
            <Text style={labelStyle}>SUBJECT *</Text>
            <TextInput
              testID="tip-subject-input"
              value={subject}
              onChangeText={setSubject}
              placeholder="Brief subject for your tip"
              placeholderTextColor={C.muted}
              style={inputStyle}
            />

            {/* Content */}
            <Text style={labelStyle}>YOUR TIP *</Text>
            <TextInput
              testID="tip-content-input"
              value={content}
              onChangeText={setContent}
              placeholder="Share what you know. Be as detailed as possible..."
              placeholderTextColor={C.muted}
              multiline
              numberOfLines={6}
              style={[inputStyle, { minHeight: 120, textAlignVertical: 'top' }]}
            />

            {/* Credit / Identity Section */}
            <Pressable
              testID="toggle-identity-section"
              onPress={() => {
                Haptics.selectionAsync();
                setShowIdentitySection((v) => !v);
              }}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: pressed ? C.surfaceAlt : C.surface,
                borderRadius: 10,
                padding: 14,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: C.border,
              })}
            >
              <Text style={{ color: C.textDim, fontSize: 14, fontWeight: '600' }}>
                Add your details (optional)
              </Text>
              {showIdentitySection ? (
                <ChevronUp size={16} color={C.muted} strokeWidth={2} />
              ) : (
                <ChevronDown size={16} color={C.muted} strokeWidth={2} />
              )}
            </Pressable>

            {showIdentitySection ? (
              <Animated.View entering={FadeInUp.duration(300)}>
                {/* Anonymous toggle */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: C.surface,
                    borderRadius: 10,
                    padding: 14,
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: isAnonymous ? 'rgba(34,197,94,0.3)' : C.border,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <Lock size={16} color={isAnonymous ? C.green : C.muted} strokeWidth={2} />
                    <View>
                      <Text style={{ color: C.text, fontSize: 14, fontWeight: '600' }}>
                        Submit Anonymously
                      </Text>
                      {isAnonymous ? (
                        <Text style={{ color: C.green, fontSize: 11, marginTop: 2 }}>
                          Submitting anonymously — no identity stored
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <Switch
                    testID="anonymous-toggle"
                    value={isAnonymous}
                    onValueChange={(v) => {
                      setIsAnonymous(v);
                      Haptics.selectionAsync();
                    }}
                    trackColor={{ false: C.border, true: 'rgba(34,197,94,0.4)' }}
                    thumbColor={isAnonymous ? C.green : C.muted}
                  />
                </View>

                {!isAnonymous ? (
                  <>
                    <Text style={labelStyle}>YOUR NAME / HANDLE</Text>
                    <TextInput
                      testID="tipper-name-input"
                      value={tipperName}
                      onChangeText={setTipperName}
                      placeholder="How should we credit you?"
                      placeholderTextColor={C.muted}
                      style={inputStyle}
                    />

                    <Text style={labelStyle}>EMAIL FOR FOLLOW-UP</Text>
                    <TextInput
                      testID="tipper-email-input"
                      value={tipperEmail}
                      onChangeText={setTipperEmail}
                      placeholder="your@email.com"
                      placeholderTextColor={C.muted}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={inputStyle}
                    />

                    <Text style={labelStyle}>SOCIAL HANDLE</Text>
                    <TextInput
                      testID="tipper-handle-input"
                      value={tipperHandle}
                      onChangeText={setTipperHandle}
                      placeholder="@yourhandle"
                      placeholderTextColor={C.muted}
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={inputStyle}
                    />
                  </>
                ) : null}
              </Animated.View>
            ) : null}

            {/* Evidence URLs */}
            <Text style={labelStyle}>EVIDENCE LINKS</Text>
            {evidenceUrls.map((url, i) => (
              <UrlInputRow
                key={i}
                value={url}
                index={i}
                onChangeText={(v) => updateUrl(i, v)}
                onRemove={() => removeUrl(i)}
              />
            ))}
            {evidenceUrls.length < 5 ? (
              <Pressable
                testID="add-evidence-url-button"
                onPress={addEvidenceUrl}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: pressed ? C.surfaceAlt : C.surface,
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: C.border,
                  borderStyle: 'dashed',
                })}
              >
                <Plus size={14} color={C.muted} strokeWidth={2} />
                <Text style={{ color: C.muted, fontSize: 13, fontWeight: '600' }}>
                  Add Link {evidenceUrls.length > 0 ? `(${evidenceUrls.length}/5)` : ''}
                </Text>
              </Pressable>
            ) : null}

            {/* Submit error */}
            {isSubmitError ? (
              <View
                style={{
                  backgroundColor: 'rgba(196,30,58,0.1)',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: 'rgba(196,30,58,0.3)',
                }}
              >
                <Text style={{ color: C.red, fontSize: 13 }}>
                  Failed to submit tip. Please try again.
                </Text>
              </View>
            ) : null}

            {/* Submit button */}
            <Pressable
              testID="submit-tip-button"
              onPress={handleSubmit}
              disabled={!canSubmit || isSubmitPending || !investigatorId}
              style={({ pressed }) => ({
                backgroundColor: canSubmit && investigatorId
                  ? pressed ? '#A3162E' : C.red
                  : C.surface,
                borderRadius: 12,
                padding: 16,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
                opacity: isSubmitPending ? 0.7 : 1,
                borderWidth: 1,
                borderColor: canSubmit && investigatorId ? C.red : C.border,
                marginBottom: 24,
              })}
            >
              {isSubmitPending ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : null}
              <Text
                style={{
                  color: canSubmit && investigatorId ? '#FFF' : C.muted,
                  fontSize: 15,
                  fontWeight: '800',
                  letterSpacing: 1,
                }}
              >
                {isSubmitPending ? 'SUBMITTING...' : 'SUBMIT TIP'}
              </Text>
            </Pressable>

            {/* Privacy note */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
              <Shield size={12} color={C.muted} strokeWidth={2} />
              <Text style={{ color: C.muted, fontSize: 11, textAlign: 'center' }}>
                Your submission is secure. We take tipster safety seriously.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const labelStyle = {
  color: '#6B7280',
  fontSize: 10,
  fontWeight: '700' as const,
  letterSpacing: 1,
  marginBottom: 6,
  marginTop: 4,
};

const inputStyle = {
  backgroundColor: '#21262D',
  borderRadius: 10,
  padding: 14,
  color: '#E8DCC8',
  fontSize: 15,
  borderWidth: 1,
  borderColor: '#30363D',
  marginBottom: 16,
};


# mobile/src/app/verify-otp.tsx

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
                    borderRadius: 14,
                    borderWidth: 1,
                    width: 52,
                    height: 64,
                  },
                  pinCodeTextStyle: {
                    color: COLORS.text,
                    fontSize: 28,
                    fontWeight: "800",
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
                    fontSize: 38,
                    fontWeight: "900",
                    color: "#D4A574",
                    letterSpacing: 10,
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


# mobile/src/app/war-room.tsx

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


# mobile/src/components/AddSourceSheet.tsx

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
} from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import {
  Twitter,
  Video,
  Globe,
  User,
  FileText,
  Image as ImageIcon,
  Music,
  X,
  Plus,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import type { NodeSource } from '@/lib/types';

const C = {
  bg: '#1A1614',
  surface: '#231F1C',
  red: '#C41E3A',
  pin: '#D4A574',
  text: '#E8DCC8',
  muted: '#6B5B4F',
  border: '#3D332C',
} as const;

type SourcePlatform = NonNullable<NodeSource['platform']>;
type ContentType = NonNullable<NodeSource['contentType']>;
type Credibility = NodeSource['credibility'];

interface PlatformOption {
  key: SourcePlatform | 'person' | 'document' | 'other';
  label: string;
  Icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }>;
}

const PLATFORM_OPTIONS: PlatformOption[] = [
  { key: 'x', label: 'X / Twitter', Icon: Twitter },
  { key: 'tiktok', label: 'TikTok', Icon: Video },
  { key: 'instagram', label: 'Instagram', Icon: ImageIcon },
  { key: 'youtube', label: 'YouTube', Icon: Video },
  { key: 'facebook', label: 'Facebook', Icon: Globe },
  { key: 'website', label: 'Website', Icon: Globe },
  { key: 'podcast', label: 'Podcast', Icon: Music },
  { key: 'person', label: 'Person', Icon: User },
  { key: 'document', label: 'Document', Icon: FileText },
  { key: 'other', label: 'Other', Icon: Globe },
];

const CONTENT_TYPES: { key: ContentType; label: string }[] = [
  { key: 'article', label: 'Article' },
  { key: 'video', label: 'Video' },
  { key: 'testimony', label: 'Testimony' },
  { key: 'tip', label: 'Tip' },
  { key: 'evidence', label: 'Evidence' },
  { key: 'document', label: 'Document' },
];

const CREDIBILITY_OPTIONS: { key: Credibility; label: string; color: string }[] = [
  { key: 'primary', label: 'Primary', color: '#3B82F6' },
  { key: 'secondary', label: 'Secondary', color: '#F59E0B' },
  { key: 'unverified', label: 'Unverified', color: '#6B5B4F' },
  { key: 'confirmed', label: 'Confirmed', color: '#22C55E' },
  { key: 'disputed', label: 'Disputed', color: '#C41E3A' },
];

function getNamePlaceholder(platform: SourcePlatform | 'person' | 'document' | 'other' | null): string {
  if (!platform) return 'Source name or handle';
  if (platform === 'x' || platform === 'tiktok' || platform === 'instagram') return '@username';
  if (platform === 'person') return 'Full name';
  if (platform === 'document') return 'Document title';
  return 'Publication or source name';
}

interface AddSourceSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onAdd: (source: Omit<NodeSource, 'id' | 'addedAt'>) => void;
}

export default function AddSourceSheet({ isVisible, onClose, onAdd }: AddSourceSheetProps) {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['80%', '95%'], []);

  const [selectedPlatform, setSelectedPlatform] = useState<SourcePlatform | 'person' | 'document' | 'other' | null>(null);
  const [sourceName, setSourceName] = useState<string>('');
  const [sourceUrl, setSourceUrl] = useState<string>('');
  const [secondarySource, setSecondarySource] = useState<string>('');
  const [selectedContentType, setSelectedContentType] = useState<ContentType | null>(null);
  const [contentSummary, setContentSummary] = useState<string>('');
  const [credibility, setCredibility] = useState<Credibility>('unverified');

  // Sync visibility with sheet
  React.useEffect(() => {
    if (isVisible) {
      sheetRef.current?.snapToIndex(0);
    } else {
      sheetRef.current?.close();
    }
  }, [isVisible]);

  const resetForm = useCallback(() => {
    setSelectedPlatform(null);
    setSourceName('');
    setSourceUrl('');
    setSecondarySource('');
    setSelectedContentType(null);
    setContentSummary('');
    setCredibility('unverified');
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handleAdd = useCallback(() => {
    if (!sourceName.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const platformToSourceType = (): NodeSource['sourceType'] => {
      if (selectedPlatform === 'person') return 'person';
      if (selectedPlatform === 'document') return 'document';
      if (selectedPlatform === 'x') return 'x_user';
      if (selectedPlatform === 'tiktok') return 'tiktok_user';
      if (selectedPlatform === 'instagram') return 'instagram_user';
      if (sourceUrl) return 'url';
      return 'other';
    };

    const resolvedPlatform = (): NodeSource['platform'] | undefined => {
      if (selectedPlatform === 'person' || selectedPlatform === 'document' || selectedPlatform === 'other') return 'other';
      return selectedPlatform ?? undefined;
    };

    onAdd({
      sourceType: platformToSourceType(),
      sourceName: sourceName.trim(),
      sourceUrl: sourceUrl.trim() || undefined,
      platform: resolvedPlatform(),
      contentType: selectedContentType ?? undefined,
      contentSummary: contentSummary.trim() || undefined,
      secondarySourceName: secondarySource.trim() || undefined,
      credibility,
    });

    resetForm();
    onClose();
  }, [sourceName, sourceUrl, selectedPlatform, selectedContentType, contentSummary, secondarySource, credibility, onAdd, resetForm, onClose]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
        onPress={handleClose}
      />
    ),
    [handleClose]
  );

  const canSubmit = sourceName.trim().length > 0;

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: C.surface }}
      handleIndicatorStyle={{ backgroundColor: C.muted }}
      backdropComponent={renderBackdrop}
      onChange={(index: number) => {
        if (index === -1) {
          handleClose();
        }
      }}
    >
      <BottomSheetScrollView
        style={{ paddingHorizontal: 20 }}
        contentContainerStyle={{ paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <Text style={{ color: C.text, fontSize: 18, fontWeight: '800', letterSpacing: 0.5 }}>
            Add Source
          </Text>
          <Pressable onPress={handleClose} testID="add-source-close">
            <X size={20} color={C.muted} strokeWidth={2} />
          </Pressable>
        </View>

        {/* Platform selector */}
        <Text style={{ color: C.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10 }}>
          PLATFORM
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, marginBottom: 20 }}
          contentContainerStyle={{ gap: 8, paddingRight: 8 }}
        >
          {PLATFORM_OPTIONS.map((opt) => {
            const isSelected = selectedPlatform === opt.key;
            return (
              <Pressable
                key={opt.key}
                testID={`platform-${opt.key}`}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedPlatform(isSelected ? null : opt.key as SourcePlatform);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: isSelected ? C.red : C.bg,
                  borderWidth: 1,
                  borderColor: isSelected ? C.red : C.border,
                }}
              >
                <opt.Icon size={13} color={isSelected ? '#FFF' : C.muted} strokeWidth={2} />
                <Text style={{ color: isSelected ? '#FFF' : C.muted, fontSize: 12, fontWeight: '600' }}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Source name */}
        <Text style={{ color: C.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 }}>
          NAME OR HANDLE
        </Text>
        <BottomSheetTextInput
          testID="source-name-input"
          value={sourceName}
          onChangeText={setSourceName}
          placeholder={getNamePlaceholder(selectedPlatform)}
          placeholderTextColor={C.muted}
          style={{
            backgroundColor: C.bg,
            borderRadius: 10,
            padding: 14,
            color: C.text,
            fontSize: 16,
            borderWidth: 1,
            borderColor: C.border,
            marginBottom: 16,
          }}
        />

        {/* Source URL */}
        <Text style={{ color: C.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 }}>
          LINK TO CONTENT
        </Text>
        <BottomSheetTextInput
          testID="source-url-input"
          value={sourceUrl}
          onChangeText={setSourceUrl}
          placeholder="https://..."
          placeholderTextColor={C.muted}
          autoCapitalize="none"
          keyboardType="url"
          style={{
            backgroundColor: C.bg,
            borderRadius: 10,
            padding: 14,
            color: C.text,
            fontSize: 15,
            borderWidth: 1,
            borderColor: C.border,
            marginBottom: 16,
          }}
        />

        {/* Via / Secondary source */}
        <Text style={{ color: C.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 4 }}>
          ORIGINALLY FROM (OPTIONAL)
        </Text>
        <Text style={{ color: C.muted, fontSize: 11, marginBottom: 8, lineHeight: 16 }}>
          e.g. if an X user showed you an Epoch Times article, put Epoch Times here
        </Text>
        <BottomSheetTextInput
          testID="secondary-source-input"
          value={secondarySource}
          onChangeText={setSecondarySource}
          placeholder="e.g. Epoch Times"
          placeholderTextColor={C.muted}
          style={{
            backgroundColor: C.bg,
            borderRadius: 10,
            padding: 14,
            color: C.text,
            fontSize: 15,
            borderWidth: 1,
            borderColor: C.border,
            marginBottom: 20,
          }}
        />

        {/* Content type */}
        <Text style={{ color: C.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10 }}>
          CONTENT TYPE
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {CONTENT_TYPES.map((ct) => {
            const isSelected = selectedContentType === ct.key;
            return (
              <Pressable
                key={ct.key}
                testID={`content-type-${ct.key}`}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedContentType(isSelected ? null : ct.key);
                }}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: isSelected ? C.red : C.bg,
                  borderWidth: 1,
                  borderColor: isSelected ? C.red : C.border,
                }}
              >
                <Text style={{ color: isSelected ? '#FFF' : C.muted, fontSize: 13, fontWeight: '600' }}>
                  {ct.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* What they contributed */}
        <Text style={{ color: C.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 }}>
          WHAT DID THEY CONTRIBUTE?
        </Text>
        <BottomSheetTextInput
          testID="content-summary-input"
          value={contentSummary}
          onChangeText={setContentSummary}
          placeholder="Brief description of this source's contribution..."
          placeholderTextColor={C.muted}
          multiline
          style={{
            backgroundColor: C.bg,
            borderRadius: 10,
            padding: 14,
            color: C.text,
            fontSize: 15,
            borderWidth: 1,
            borderColor: C.border,
            minHeight: 80,
            textAlignVertical: 'top',
            marginBottom: 20,
          }}
        />

        {/* Credibility */}
        <Text style={{ color: C.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10 }}>
          CREDIBILITY
        </Text>
        <View style={{ flexDirection: 'row', backgroundColor: C.bg, borderRadius: 10, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 28 }}>
          {CREDIBILITY_OPTIONS.map((opt, idx) => {
            const isSelected = credibility === opt.key;
            return (
              <Pressable
                key={opt.key}
                testID={`credibility-${opt.key}`}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setCredibility(opt.key);
                }}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  alignItems: 'center',
                  backgroundColor: isSelected ? opt.color + '30' : 'transparent',
                  borderLeftWidth: idx > 0 ? 1 : 0,
                  borderLeftColor: C.border,
                }}
              >
                <Text style={{ color: isSelected ? opt.color : C.muted, fontSize: 10, fontWeight: '700', textAlign: 'center' }}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Submit button */}
        <Pressable
          testID="add-source-submit"
          onPress={handleAdd}
          disabled={!canSubmit}
          style={({ pressed }) => ({
            backgroundColor: canSubmit ? (pressed ? '#A3162E' : C.red) : C.border,
            borderRadius: 12,
            paddingVertical: 16,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
          })}
        >
          <Plus size={18} color={canSubmit ? '#FFF' : C.muted} strokeWidth={2.5} />
          <Text style={{ color: canSubmit ? '#FFF' : C.muted, fontSize: 16, fontWeight: '800' }}>
            Add Source
          </Text>
        </Pressable>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}


# mobile/src/components/AutomationEngine.tsx

import { useEffect, useRef } from 'react';
import useInvestigationStore from '@/lib/state/investigation-store';
import type { TagColor } from '@/lib/types';

const STOPWORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
  'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his',
  'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy',
  'did', 'she', 'use', 'way', 'will', 'with', 'this', 'that', 'from',
  'they', 'know', 'want', 'been', 'good', 'much', 'some', 'time', 'very',
  'when', 'come', 'here', 'just', 'like', 'long', 'make', 'many', 'more',
  'only', 'over', 'such', 'take', 'than', 'them', 'well', 'were',
]);

// Keyword to color rules (order matters — first match wins)
const COLOR_RULES: Array<{ keywords: string[]; color: TagColor }> = [
  { keywords: ['suspect', 'person', 'individual', 'witness', 'victim', 'perpetrator', 'accomplice'], color: 'red' },
  { keywords: ['location', 'place', 'address', 'building', 'city', 'town', 'country', 'state', 'area', 'site', 'venue'], color: 'blue' },
  { keywords: ['evidence', 'document', 'file', 'proof', 'record', 'photo', 'video', 'audio', 'exhibit'], color: 'green' },
  { keywords: ['date', 'timeline', 'event', 'incident', 'occurred', 'happened', 'before', 'after'], color: 'amber' },
  { keywords: ['organization', 'company', 'group', 'agency', 'department', 'bureau', 'corp', 'inc', 'llc', 'foundation'], color: 'purple' },
  { keywords: ['source', 'tip', 'report', 'news', 'article', 'interview', 'statement', 'testimony'], color: 'teal' },
];

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

function detectColor(title: string, content: string): TagColor | null {
  const text = `${title} ${content}`.toLowerCase();
  for (const rule of COLOR_RULES) {
    if (rule.keywords.some((kw) => text.includes(kw))) {
      return rule.color;
    }
  }
  return null;
}

export function useAutomationEngine(investigationId: string | null, onAutomationRan?: (msg: string) => void) {
  const investigations = useInvestigationStore((s) => s.investigations);
  const updateNode = useInvestigationStore((s) => s.updateNode);
  const addString = useInvestigationStore((s) => s.addString);
  const processedRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!investigationId) return;
    const inv = investigations.find((i) => i.id === investigationId);
    if (!inv) return;

    const existingStringCount = (inv.strings ?? []).length;
    if (existingStringCount > 30) return;

    let taggedCount = 0;
    let connectedCount = 0;

    for (const node of inv.nodes) {
      const lastProcessed = processedRef.current[node.id] ?? 0;
      if (node.updatedAt <= lastProcessed) continue;
      processedRef.current[node.id] = node.updatedAt;

      const title = node.title ?? '';
      const content = node.content ?? node.description ?? '';

      if (!node.color) {
        const detectedColor = detectColor(title, content);
        if (detectedColor) {
          updateNode(investigationId, node.id, { color: detectedColor });
          taggedCount++;
        }
      }

      const nodeKeywords = new Set(extractKeywords(`${title} ${content}`).filter((w) => w.length >= 5));
      if (nodeKeywords.size === 0) continue;

      const existingPairs = new Set((inv.strings ?? []).map((s) => `${s.toNodeId}`));

      for (const other of inv.nodes) {
        if (other.id === node.id) continue;
        if (existingPairs.has(`${other.id}`) || existingPairs.has(`${node.id}`)) continue;

        const otherKeywords = extractKeywords(`${other.title} ${other.content ?? other.description ?? ''}`).filter((w) => w.length >= 5);
        const shared = otherKeywords.filter((k) => nodeKeywords.has(k));
        if (shared.length < 2) continue;

        const bestKeyword = shared.sort((a, b) => b.length - a.length)[0];
        addString(investigationId, node.id, other.id, `Related: ${bestKeyword}`);
        existingPairs.add(`${other.id}`);
        connectedCount++;
      }
    }

    if ((taggedCount > 0 || connectedCount > 0) && onAutomationRan) {
      const parts: string[] = [];
      if (taggedCount > 0) parts.push(`tagged ${taggedCount} node${taggedCount > 1 ? 's' : ''}`);
      if (connectedCount > 0) parts.push(`found ${connectedCount} connection${connectedCount > 1 ? 's' : ''}`);
      onAutomationRan(`🤖 Auto-${parts.join(', ')}`);
    }
  }, [investigations, investigationId, updateNode, addString, onAutomationRan]);
}


# mobile/src/components/BroadcasterOverlay.tsx

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
  canvasRef: React.RefObject<View | null>;
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


# mobile/src/components/CollabSheet.tsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import {
  Users,
  UserPlus,
  Clock,
  Award,
  Check,
  X,
  Copy,
  ChevronDown,
  UserMinus,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import useCollabStore from '@/lib/state/collab-store';
import type { CollabSession, PendingNode } from '@/lib/state/collab-store';
import useInvestigationStore from '@/lib/state/investigation-store';
import type { NodeType, Position } from '@/lib/types';

const C = {
  bg: '#1A1614',
  surface: '#231F1C',
  surfaceAlt: '#2A2522',
  red: '#C41E3A',
  amber: '#D4A574',
  text: '#E8DCC8',
  muted: '#6B5B4F',
  border: '#3D332C',
  green: '#22C55E',
} as const;

const PERMISSIONS = [
  { value: 'viewer', label: 'Viewer', desc: 'Can view only' },
  { value: 'annotator', label: 'Annotator', desc: 'Can add notes' },
  { value: 'contributor', label: 'Contributor', desc: 'Can submit nodes' },
  { value: 'co-investigator', label: 'Co-Investigator', desc: 'Full access' },
] as const;

type Permission = (typeof PERMISSIONS)[number]['value'];

type TabId = 'team' | 'invite' | 'pending' | 'credits';

interface Props {
  investigationId: string;
  session: CollabSession | null;
  visible: boolean;
  onClose: () => void;
  currentUserId?: string;
}

// Initials avatar
function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const colors = ['#C41E3A', '#3B82F6', '#22C55E', '#F59E0B', '#A855F7', '#14B8A6'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color + '33',
        borderWidth: 1.5,
        borderColor: color + '66',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color, fontSize: size * 0.36, fontWeight: '700' }}>{initials}</Text>
    </View>
  );
}

// Permission badge
function PermBadge({ permission }: { permission: string }) {
  const colors: Record<string, string> = {
    viewer: C.muted,
    annotator: '#3B82F6',
    contributor: C.amber,
    'co-investigator': C.red,
  };
  const col = colors[permission] ?? C.muted;
  return (
    <View
      style={{
        backgroundColor: col + '22',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderWidth: 1,
        borderColor: col + '55',
      }}
    >
      <Text style={{ color: col, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {permission}
      </Text>
    </View>
  );
}

// Tab button
function TabBtn({
  id,
  label,
  icon: Icon,
  active,
  badge,
  onPress,
}: {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }>;
  active: boolean;
  badge?: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderBottomWidth: 2,
        borderBottomColor: active ? C.red : 'transparent',
        flexDirection: 'row',
        gap: 4,
      }}
    >
      <Icon size={14} color={active ? C.red : C.muted} strokeWidth={2} />
      <Text
        style={{
          fontSize: 11,
          fontWeight: '700',
          color: active ? C.red : C.muted,
          letterSpacing: 0.5,
        }}
      >
        {label}
      </Text>
      {badge != null && badge > 0 ? (
        <View
          style={{
            backgroundColor: C.red,
            borderRadius: 8,
            minWidth: 16,
            height: 16,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 3,
          }}
        >
          <Text style={{ color: '#FFF', fontSize: 9, fontWeight: '800' }}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export default function CollabSheet({
  investigationId,
  session,
  visible,
  onClose,
  currentUserId,
}: Props) {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['65%', '92%'], []);

  const [activeTab, setActiveTab] = useState<TabId>('team');
  const [inviteEmail, setInviteEmail] = useState<string>('');
  const [invitePermission, setInvitePermission] = useState<Permission>('contributor');
  const [showPermPicker, setShowPermPicker] = useState<boolean>(false);
  const [isSendingInvite, setIsSendingInvite] = useState<boolean>(false);
  const [inviteResult, setInviteResult] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const sendInvite = useCollabStore((s) => s.sendInvite);
  const generateInviteLink = useCollabStore((s) => s.generateInviteLink);
  const fetchPendingNodes = useCollabStore((s) => s.fetchPendingNodes);
  const approveNode = useCollabStore((s) => s.approveNode);
  const rejectNode = useCollabStore((s) => s.rejectNode);
  const pendingNodes = useCollabStore((s) => s.activePendingNodes);

  const addNode = useInvestigationStore((s) => s.addNode);

  useEffect(() => {
    if (visible) {
      sheetRef.current?.snapToIndex(0);
      if (session?.id) {
        fetchPendingNodes(session.id);
      }
    } else {
      sheetRef.current?.close();
    }
  }, [visible, session?.id, fetchPendingNodes]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.6}
        pressBehavior="close"
      />
    ),
    []
  );

  const handleSendInvite = async () => {
    if (!session?.id || !inviteEmail.trim()) return;
    setIsSendingInvite(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const link = await sendInvite(session.id, inviteEmail.trim(), invitePermission);
      setInviteResult(link || 'Invite sent successfully!');
      setInviteEmail('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleCopyLink = async () => {
    if (!session?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const link = await generateInviteLink(session.id, invitePermission);
    if (link) {
      await Clipboard.setStringAsync(link);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleApprove = async (node: PendingNode) => {
    if (!session?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const approved = await approveNode(session.id, node.id);
    // If node data returned, add it to the local investigation canvas
    if (approved?.nodeData || node.nodeData) {
      const nd = approved?.nodeData ?? node.nodeData;
      const position: Position = nd.position ?? { x: 100, y: 100 };
      const type: NodeType = nd.type ?? 'note';
      const title: string = nd.title ?? 'Contributed Node';
      addNode(investigationId, type, title, position, {
        description: nd.description,
        content: nd.content,
        url: nd.url,
        tags: nd.tags ?? [],
      });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleReject = async (node: PendingNode) => {
    if (!session?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await rejectNode(session.id, node.id);
  };

  const members = session?.members ?? [];
  const isOwner = session?.ownerId === currentUserId;

  // ---- Render tab content ----

  const renderTeamTab = () => (
    <View>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '700',
          color: C.muted,
          letterSpacing: 1,
          marginBottom: 12,
          marginTop: 4,
        }}
      >
        TEAM MEMBERS ({members.length})
      </Text>
      {members.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 32 }}>
          <Users size={36} color={C.muted} strokeWidth={1.5} />
          <Text style={{ color: C.muted, fontSize: 13, marginTop: 12, textAlign: 'center' }}>
            No members yet.{'\n'}Invite people from the Invite tab.
          </Text>
        </View>
      ) : (
        members.map((member) => (
          <View
            key={member.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: C.border,
              gap: 12,
            }}
          >
            <Avatar name={member.user.name || member.user.email} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.text, fontSize: 14, fontWeight: '600' }} numberOfLines={1}>
                {member.user.name || member.user.email}
              </Text>
              <Text style={{ color: C.muted, fontSize: 12 }} numberOfLines={1}>
                {member.user.email}
              </Text>
            </View>
            <PermBadge permission={member.permission} />
            {isOwner && member.userId !== currentUserId ? (
              <Pressable
                onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                style={({ pressed }) => ({
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: pressed ? 'rgba(196,30,58,0.2)' : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                })}
              >
                <UserMinus size={14} color={C.muted} strokeWidth={2} />
              </Pressable>
            ) : null}
          </View>
        ))
      )}
    </View>
  );

  const renderInviteTab = () => (
    <View>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '700',
          color: C.muted,
          letterSpacing: 1,
          marginBottom: 12,
          marginTop: 4,
        }}
      >
        INVITE BY EMAIL
      </Text>

      {/* Email input */}
      <TextInput
        testID="invite-email-input"
        value={inviteEmail}
        onChangeText={setInviteEmail}
        placeholder="collaborator@example.com"
        placeholderTextColor={C.muted}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        style={{
          backgroundColor: C.bg,
          borderRadius: 10,
          padding: 14,
          color: C.text,
          fontSize: 15,
          borderWidth: 1,
          borderColor: C.border,
          marginBottom: 12,
        }}
      />

      {/* Permission picker */}
      <Pressable
        testID="permission-picker"
        onPress={() => setShowPermPicker((v) => !v)}
        style={{
          backgroundColor: C.bg,
          borderRadius: 10,
          padding: 14,
          borderWidth: 1,
          borderColor: showPermPicker ? C.amber : C.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: showPermPicker ? 0 : 16,
        }}
      >
        <View>
          <Text style={{ color: C.text, fontSize: 15, fontWeight: '600' }}>
            {PERMISSIONS.find((p) => p.value === invitePermission)?.label}
          </Text>
          <Text style={{ color: C.muted, fontSize: 12 }}>
            {PERMISSIONS.find((p) => p.value === invitePermission)?.desc}
          </Text>
        </View>
        <ChevronDown size={16} color={C.muted} strokeWidth={2} />
      </Pressable>

      {showPermPicker ? (
        <View
          style={{
            backgroundColor: C.bg,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: C.border,
            marginBottom: 16,
            overflow: 'hidden',
          }}
        >
          {PERMISSIONS.map((perm) => (
            <Pressable
              key={perm.value}
              onPress={() => {
                setInvitePermission(perm.value);
                setShowPermPicker(false);
              }}
              style={({ pressed }) => ({
                paddingVertical: 12,
                paddingHorizontal: 14,
                backgroundColor:
                  invitePermission === perm.value
                    ? C.amber + '15'
                    : pressed
                    ? C.surface
                    : 'transparent',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
              })}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: invitePermission === perm.value ? C.amber : C.border,
                }}
              />
              <View>
                <Text style={{ color: C.text, fontSize: 14, fontWeight: '600' }}>{perm.label}</Text>
                <Text style={{ color: C.muted, fontSize: 12 }}>{perm.desc}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}

      {/* Send invite button */}
      <Pressable
        testID="send-invite-button"
        onPress={handleSendInvite}
        disabled={isSendingInvite || !inviteEmail.trim()}
        style={({ pressed }) => ({
          backgroundColor:
            inviteEmail.trim() ? (pressed ? '#A3162E' : C.red) : C.border,
          borderRadius: 10,
          padding: 14,
          alignItems: 'center',
          marginBottom: 20,
          opacity: isSendingInvite ? 0.7 : 1,
        })}
      >
        {isSendingInvite ? (
          <ActivityIndicator color="#FFF" size="small" />
        ) : (
          <Text style={{ color: inviteEmail.trim() ? '#FFF' : C.muted, fontSize: 15, fontWeight: '700' }}>
            Send Invite
          </Text>
        )}
      </Pressable>

      {inviteResult ? (
        <View
          style={{
            backgroundColor: '#22C55E22',
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: '#22C55E44',
          }}
        >
          <Text style={{ color: '#22C55E', fontSize: 13 }}>Invite sent successfully.</Text>
        </View>
      ) : null}

      {/* Divider */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
        <Text style={{ color: C.muted, fontSize: 12 }}>OR</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
      </View>

      {/* Copy invite link */}
      <Pressable
        testID="copy-link-button"
        onPress={handleCopyLink}
        style={({ pressed }) => ({
          backgroundColor: pressed ? C.surface : C.surfaceAlt,
          borderRadius: 10,
          padding: 14,
          borderWidth: 1,
          borderColor: isCopied ? '#22C55E44' : C.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        })}
      >
        {isCopied ? (
          <Check size={16} color="#22C55E" strokeWidth={2.5} />
        ) : (
          <Copy size={16} color={C.amber} strokeWidth={2} />
        )}
        <Text
          style={{
            color: isCopied ? '#22C55E' : C.amber,
            fontSize: 14,
            fontWeight: '600',
          }}
        >
          {isCopied ? 'Link copied!' : 'Copy invite link'}
        </Text>
      </Pressable>
    </View>
  );

  const renderPendingTab = () => (
    <View>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '700',
          color: C.muted,
          letterSpacing: 1,
          marginBottom: 12,
          marginTop: 4,
        }}
      >
        PENDING CONTRIBUTIONS ({pendingNodes.length})
      </Text>
      {pendingNodes.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 32 }}>
          <Clock size={36} color={C.muted} strokeWidth={1.5} />
          <Text style={{ color: C.muted, fontSize: 13, marginTop: 12, textAlign: 'center' }}>
            No pending nodes.{'\n'}Contributions will appear here for your review.
          </Text>
        </View>
      ) : (
        pendingNodes.map((node) => (
          <View
            key={node.id}
            style={{
              backgroundColor: C.surfaceAlt,
              borderRadius: 12,
              padding: 14,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: C.border,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontSize: 14, fontWeight: '700' }} numberOfLines={1}>
                  {node.nodeData?.title ?? 'Untitled Node'}
                </Text>
                <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
                  by {node.contributor?.name ?? node.contributor?.email ?? 'Unknown'} •{' '}
                  {new Date(node.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: C.amber + '22',
                  borderRadius: 6,
                  paddingHorizontal: 7,
                  paddingVertical: 3,
                  borderWidth: 1,
                  borderColor: C.amber + '44',
                }}
              >
                <Text style={{ color: C.amber, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>
                  {node.nodeData?.type ?? 'node'}
                </Text>
              </View>
            </View>
            {node.nodeData?.description ? (
              <Text style={{ color: C.muted, fontSize: 12, lineHeight: 17, marginBottom: 10 }} numberOfLines={2}>
                {node.nodeData.description}
              </Text>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                testID={`reject-node-${node.id}`}
                onPress={() => handleReject(node)}
                style={({ pressed }) => ({
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 8,
                  alignItems: 'center',
                  backgroundColor: pressed ? 'rgba(196,30,58,0.2)' : 'rgba(196,30,58,0.1)',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 6,
                  borderWidth: 1,
                  borderColor: 'rgba(196,30,58,0.3)',
                })}
              >
                <X size={14} color={C.red} strokeWidth={2.5} />
                <Text style={{ color: C.red, fontSize: 13, fontWeight: '700' }}>Reject</Text>
              </Pressable>
              <Pressable
                testID={`approve-node-${node.id}`}
                onPress={() => handleApprove(node)}
                style={({ pressed }) => ({
                  flex: 2,
                  paddingVertical: 10,
                  borderRadius: 8,
                  alignItems: 'center',
                  backgroundColor: pressed ? '#16A34A' : '#22C55E',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 6,
                })}
              >
                <Check size={14} color="#FFF" strokeWidth={2.5} />
                <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>Approve & Add</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}
    </View>
  );

  const renderCreditsTab = () => (
    <View>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '700',
          color: C.muted,
          letterSpacing: 1,
          marginBottom: 12,
          marginTop: 4,
        }}
      >
        CONTRIBUTIONS
      </Text>
      {members.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 32 }}>
          <Award size={36} color={C.muted} strokeWidth={1.5} />
          <Text style={{ color: C.muted, fontSize: 13, marginTop: 12, textAlign: 'center' }}>
            No contributions yet.{'\n'}Approved nodes will be credited here.
          </Text>
        </View>
      ) : (
        members.map((member) => (
          <View
            key={member.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: C.border,
              gap: 12,
            }}
          >
            <Avatar name={member.user.name || member.user.email} size={32} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.text, fontSize: 13, fontWeight: '600' }}>
                {member.user.name || member.user.email}
              </Text>
              <Text style={{ color: C.muted, fontSize: 11 }}>
                {member.permission === 'co-investigator' ? 'Co-Investigator' : 'Collaborator'}
              </Text>
            </View>
            <Award size={14} color={C.amber} strokeWidth={2} />
          </View>
        ))
      )}
    </View>
  );

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: C.surface }}
      handleIndicatorStyle={{ backgroundColor: C.muted }}
      backdropComponent={renderBackdrop}
      onChange={(index) => {
        if (index === -1) onClose();
      }}
    >
      {/* Sheet header */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 4,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: C.border,
        }}
      >
        <Text style={{ color: C.text, fontSize: 17, fontWeight: '800', letterSpacing: 0.3 }}>
          {session?.title ?? 'Collaboration'}
        </Text>
        <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
          {members.length} {members.length === 1 ? 'member' : 'members'}
        </Text>
      </View>

      {/* Tab bar */}
      <View
        style={{
          flexDirection: 'row',
          borderBottomWidth: 1,
          borderBottomColor: C.border,
          backgroundColor: C.surface,
        }}
      >
        <TabBtn
          id="team"
          label="Team"
          icon={Users}
          active={activeTab === 'team'}
          onPress={() => setActiveTab('team')}
        />
        <TabBtn
          id="invite"
          label="Invite"
          icon={UserPlus}
          active={activeTab === 'invite'}
          onPress={() => setActiveTab('invite')}
        />
        <TabBtn
          id="pending"
          label="Pending"
          icon={Clock}
          active={activeTab === 'pending'}
          badge={pendingNodes.length}
          onPress={() => setActiveTab('pending')}
        />
        <TabBtn
          id="credits"
          label="Credits"
          icon={Award}
          active={activeTab === 'credits'}
          onPress={() => setActiveTab('credits')}
        />
      </View>

      <BottomSheetScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      >
        {activeTab === 'team' ? renderTeamTab() : null}
        {activeTab === 'invite' ? renderInviteTab() : null}
        {activeTab === 'pending' ? renderPendingTab() : null}
        {activeTab === 'credits' ? renderCreditsTab() : null}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}


# mobile/src/components/ColorLegend.tsx

import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Palette, ChevronRight, Sparkles } from 'lucide-react-native';
import useInvestigationStore from '@/lib/state/investigation-store';
import type { ColorLegendEntry } from '@/lib/types';

const C = {
  bg: 'rgba(26, 22, 20, 0.92)',
  surface: '#231F1C',
  red: '#C41E3A',
  redLight: '#E8445A',
  pin: '#D4A574',
  text: '#E8DCC8',
  muted: '#6B5B4F',
  border: '#3D332C',
} as const;

const DEFAULT_LEGEND: ColorLegendEntry[] = [
  { color: '#C41E3A', label: 'Suspects' },
  { color: '#3B82F6', label: 'Locations' },
  { color: '#22C55E', label: 'Confirmed' },
  { color: '#F59E0B', label: 'Timeline' },
  { color: '#A855F7', label: 'Organizations' },
  { color: '#14B8A6', label: 'Evidence' },
];

interface ColorLegendProps {
  investigationId: string;
  onSuggestPress: () => void;
}

export default function ColorLegend({ investigationId, onSuggestPress }: ColorLegendProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const expandWidth = useSharedValue(0);
  const chevronRotate = useSharedValue(0);

  const investigations = useInvestigationStore((s) => s.investigations);
  const updateColorLegend = useInvestigationStore((s) => s.updateColorLegend);

  const investigation = investigations.find((inv) => inv.id === investigationId);
  const legend: ColorLegendEntry[] = investigation?.colorLegend ?? DEFAULT_LEGEND;

  const toggleOpen = useCallback(() => {
    const opening = !isOpen;
    setIsOpen(opening);
    expandWidth.value = withSpring(opening ? 220 : 0, {
      damping: 18,
      stiffness: 200,
    });
    chevronRotate.value = withSpring(opening ? 1 : 0, {
      damping: 18,
      stiffness: 200,
    });
  }, [isOpen, expandWidth, chevronRotate]);

  const panelStyle = useAnimatedStyle(() => ({
    width: expandWidth.value,
    overflow: 'hidden' as const,
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotate.value * 180}deg` }],
  }));

  const handleLabelChange = useCallback(
    (index: number, newLabel: string) => {
      const updated = legend.map((entry, i) =>
        i === index ? { ...entry, label: newLabel } : entry
      );
      updateColorLegend(investigationId, updated);
    },
    [legend, investigationId, updateColorLegend]
  );

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        top: '50%',
        transform: [{ translateY: -140 }],
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 100,
      }}
      pointerEvents="box-none"
    >
      {/* Expanded panel */}
      <Animated.View style={panelStyle} pointerEvents={isOpen ? 'auto' : 'none'}>
        <View
          style={{
            width: 220,
            backgroundColor: C.bg,
            borderTopRightRadius: 12,
            borderBottomRightRadius: 12,
            borderWidth: 1,
            borderLeftWidth: 0,
            borderColor: C.red + '55',
            paddingTop: 12,
            paddingBottom: 4,
            paddingHorizontal: 12,
          }}
        >
          {/* Header */}
          <Text
            style={{
              color: C.text,
              fontSize: 10,
              fontWeight: '800',
              letterSpacing: 2,
              marginBottom: 10,
              opacity: 0.7,
            }}
          >
            COLOR CODE
          </Text>

          {/* Legend rows */}
          {legend.map((entry, index) => (
            <View
              key={entry.color}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                marginBottom: 8,
              }}
            >
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: entry.color,
                  shadowColor: entry.color,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.8,
                  shadowRadius: 4,
                  elevation: 3,
                  flexShrink: 0,
                }}
              />
              <TextInput
                value={entry.label}
                onChangeText={(text) => handleLabelChange(index, text)}
                style={{
                  flex: 1,
                  color: C.text,
                  fontSize: 13,
                  fontWeight: '500',
                  padding: 0,
                  margin: 0,
                }}
                placeholderTextColor={C.muted}
                placeholder="Label..."
                selectTextOnFocus
              />
            </View>
          ))}

          {/* Suggest button */}
          <Pressable
            testID="color-suggest-button"
            onPress={onSuggestPress}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              backgroundColor: pressed ? '#A3162E' : C.red,
              borderRadius: 8,
              paddingVertical: 8,
              marginTop: 6,
              marginBottom: 8,
            })}
          >
            <Sparkles size={13} color="#FFF" strokeWidth={2.5} />
            <Text
              style={{
                color: '#FFF',
                fontSize: 12,
                fontWeight: '700',
                letterSpacing: 0.5,
              }}
            >
              Suggest
            </Text>
          </Pressable>
        </View>
      </Animated.View>

      {/* Collapsed pill / toggle button */}
      <Pressable
        testID="color-legend-toggle"
        onPress={toggleOpen}
        style={({ pressed }) => ({
          width: 32,
          paddingVertical: 14,
          backgroundColor: pressed ? 'rgba(30, 26, 24, 0.95)' : 'rgba(26, 22, 20, 0.85)',
          borderTopRightRadius: 10,
          borderBottomRightRadius: 10,
          borderWidth: 1,
          borderLeftWidth: 0,
          borderColor: C.pin + '40',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          flexDirection: 'column',
        })}
      >
        <Palette size={15} color={C.pin} strokeWidth={2} />
        <Animated.View style={chevronStyle}>
          <ChevronRight size={11} color={C.muted} strokeWidth={2.5} />
        </Animated.View>
      </Pressable>
    </View>
  );
}


# mobile/src/components/ColorSuggestionSheet.tsx

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  withSequence,
  withTiming,
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { Sparkles, Check, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import useInvestigationStore from '@/lib/state/investigation-store';
import { generateColorSuggestions } from '@/lib/colorSuggestions';
import type { ColorSuggestion } from '@/lib/colorSuggestions';
import type { TagColor } from '@/lib/types';

const C = {
  bg: '#1A1614',
  surface: '#231F1C',
  card: '#2C2420',
  red: '#C41E3A',
  pin: '#D4A574',
  text: '#E8DCC8',
  muted: '#6B5B4F',
  border: '#3D332C',
} as const;

const TAG_COLORS: Record<TagColor, string> = {
  red: '#C41E3A',
  blue: '#3B82F6',
  green: '#22C55E',
  amber: '#F59E0B',
  purple: '#A855F7',
  teal: '#14B8A6',
};

interface ColorSuggestionSheetProps {
  investigationId: string;
  isVisible: boolean;
  onClose: () => void;
}

// Individual pulsing node highlight
function PulseNode({ color }: { color: string }) {
  const opacity = useSharedValue(0.4);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  React.useEffect(() => {
    opacity.value = withSequence(
      withTiming(1, { duration: 300 }),
      withTiming(0.4, { duration: 300 })
    );
  }, [color, opacity]);
  return (
    <Animated.View
      style={[
        {
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: color,
          marginRight: 2,
        },
        style,
      ]}
    />
  );
}

// A card for a single suggestion
function SuggestionCard({
  suggestion,
  nodeNames,
  isSelected,
  onToggle,
}: {
  suggestion: ColorSuggestion;
  nodeNames: string[];
  isSelected: boolean;
  onToggle: () => void;
}) {
  const previewNames = nodeNames.slice(0, 3);
  const extraCount = nodeNames.length - previewNames.length;

  return (
    <Pressable
      onPress={onToggle}
      testID={`suggestion-card-${suggestion.colorKey}`}
      style={({ pressed }) => ({
        backgroundColor: pressed
          ? C.surface
          : isSelected
          ? suggestion.color + '18'
          : C.card,
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1.5,
        borderColor: isSelected ? suggestion.color + '80' : C.border,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
      })}
    >
      {/* Color swatch */}
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: suggestion.color,
          shadowColor: suggestion.color,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.6,
          shadowRadius: 8,
          elevation: 4,
          flexShrink: 0,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isSelected ? <Check size={18} color="#FFF" strokeWidth={3} /> : null}
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.text, fontSize: 15, fontWeight: '700', marginBottom: 2 }}>
          {suggestion.label}
        </Text>
        <Text style={{ color: C.muted, fontSize: 12, marginBottom: 8 }}>
          {suggestion.reason}
        </Text>

        {/* Node chips */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
          {previewNames.map((name, i) => (
            <View
              key={i}
              style={{
                backgroundColor: suggestion.color + '22',
                borderRadius: 4,
                paddingHorizontal: 6,
                paddingVertical: 2,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 3,
              }}
            >
              {isSelected ? <PulseNode color={suggestion.color} /> : null}
              <Text
                style={{
                  color: suggestion.color,
                  fontSize: 10,
                  fontWeight: '600',
                }}
                numberOfLines={1}
              >
                {name.length > 18 ? name.slice(0, 18) + '...' : name}
              </Text>
            </View>
          ))}
          {extraCount > 0 ? (
            <View
              style={{
                backgroundColor: C.border,
                borderRadius: 4,
                paddingHorizontal: 6,
                paddingVertical: 2,
              }}
            >
              <Text style={{ color: C.muted, fontSize: 10, fontWeight: '600' }}>
                +{extraCount} more
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

export default function ColorSuggestionSheet({
  investigationId,
  isVisible,
  onClose,
}: ColorSuggestionSheetProps) {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['60%', '90%'], []);

  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  const investigations = useInvestigationStore((s) => s.investigations);
  const updateNode = useInvestigationStore((s) => s.updateNode);
  const updateString = useInvestigationStore((s) => s.updateString);
  const updateColorLegend = useInvestigationStore((s) => s.updateColorLegend);

  const investigation = investigations.find((inv) => inv.id === investigationId);

  const suggestions = useMemo<ColorSuggestion[]>(() => {
    if (!investigation) return [];
    return generateColorSuggestions(investigation);
  }, [investigation]);

  // Open/close the sheet when visibility changes
  React.useEffect(() => {
    if (isVisible) {
      setSelectedIndices(new Set());
      sheetRef.current?.snapToIndex(0);
    } else {
      sheetRef.current?.close();
    }
  }, [isVisible]);

  const toggleSelect = useCallback((index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selectedIndices.size === suggestions.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(suggestions.map((_, i) => i)));
    }
  }, [selectedIndices.size, suggestions]);

  const handleApply = useCallback(() => {
    if (!investigation || selectedIndices.size === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const newLegendEntries: Array<{ color: string; label: string }> = [];

    for (const idx of selectedIndices) {
      const s = suggestions[idx];
      if (!s) continue;

      // Update node colors
      for (const nodeId of s.affectedNodeIds) {
        updateNode(investigationId, nodeId, { color: s.colorKey as TagColor });
        // Add a tag for this category
        const node = investigation.nodes.find((n) => n.id === nodeId);
        if (node) {
          const alreadyTagged = node.tags.some(
            (t) => t.label === s.label && t.color === s.colorKey
          );
          if (!alreadyTagged) {
            updateNode(investigationId, nodeId, {
              tags: [
                ...node.tags,
                { id: generateId(), label: s.label, color: s.colorKey as TagColor },
              ],
            });
          }
        }
      }

      // Update string colors
      for (const stringId of s.affectedStringIds) {
        updateString(investigationId, stringId, { color: s.color });
      }

      newLegendEntries.push({ color: s.color, label: s.label });
    }

    // Merge into existing legend
    const existingLegend = investigation.colorLegend ?? [];
    const merged = [...existingLegend];
    for (const entry of newLegendEntries) {
      const exists = merged.some((e) => e.color === entry.color);
      if (!exists) merged.push(entry);
      else {
        const i = merged.findIndex((e) => e.color === entry.color);
        merged[i] = entry;
      }
    }
    updateColorLegend(investigationId, merged);

    onClose();
  }, [
    investigation,
    selectedIndices,
    suggestions,
    investigationId,
    updateNode,
    updateString,
    updateColorLegend,
    onClose,
  ]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.6}
        pressBehavior="close"
      />
    ),
    []
  );

  const allSelected = selectedIndices.size === suggestions.length && suggestions.length > 0;

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: C.surface }}
      handleIndicatorStyle={{ backgroundColor: C.muted }}
      backdropComponent={renderBackdrop}
      onChange={(index) => {
        if (index === -1) onClose();
      }}
    >
      <BottomSheetScrollView
        style={{ paddingHorizontal: 20 }}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 4,
            marginTop: 4,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Sparkles size={18} color={C.pin} strokeWidth={2} />
            <Text style={{ color: C.text, fontSize: 18, fontWeight: '800' }}>
              Color Suggestions
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
          >
            <X size={20} color={C.muted} strokeWidth={2} />
          </Pressable>
        </View>

        <Text style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>
          Based on your investigation — tap a card to select
        </Text>

        {suggestions.length === 0 ? (
          <View
            style={{
              alignItems: 'center',
              paddingVertical: 40,
            }}
          >
            <Text style={{ color: C.muted, fontSize: 14, textAlign: 'center' }}>
              Add more nodes with names, dates, and locations to get smart color suggestions.
            </Text>
          </View>
        ) : (
          <>
            {/* Select all toggle */}
            <Pressable
              onPress={handleSelectAll}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingVertical: 8,
                marginBottom: 8,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  borderWidth: 1.5,
                  borderColor: allSelected ? C.red : C.muted,
                  backgroundColor: allSelected ? C.red : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {allSelected ? <Check size={11} color="#FFF" strokeWidth={3} /> : null}
              </View>
              <Text style={{ color: C.muted, fontSize: 13 }}>
                {allSelected ? 'Deselect all' : 'Select all'}
              </Text>
            </Pressable>

            {/* Suggestion cards */}
            {suggestions.map((suggestion, index) => {
              const nodeNames = suggestion.affectedNodeIds
                .map((id) => investigation?.nodes.find((n) => n.id === id)?.title ?? '')
                .filter(Boolean);

              return (
                <SuggestionCard
                  key={suggestion.colorKey}
                  suggestion={suggestion}
                  nodeNames={nodeNames}
                  isSelected={selectedIndices.has(index)}
                  onToggle={() => toggleSelect(index)}
                />
              );
            })}

            {/* Apply / Dismiss */}
            <View style={{ gap: 10, marginTop: 8 }}>
              <Pressable
                testID="apply-suggestions-button"
                onPress={handleApply}
                style={({ pressed }) => ({
                  backgroundColor:
                    selectedIndices.size === 0
                      ? C.border
                      : pressed
                      ? '#A3162E'
                      : C.red,
                  borderRadius: 12,
                  paddingVertical: 15,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8,
                })}
              >
                <Sparkles
                  size={16}
                  color={selectedIndices.size === 0 ? C.muted : '#FFF'}
                  strokeWidth={2}
                />
                <Text
                  style={{
                    color: selectedIndices.size === 0 ? C.muted : '#FFF',
                    fontSize: 15,
                    fontWeight: '700',
                  }}
                >
                  Apply Selected{' '}
                  {selectedIndices.size > 0 ? `(${selectedIndices.size})` : null}
                </Text>
              </Pressable>

              <Pressable
                testID="dismiss-suggestions-button"
                onPress={onClose}
                style={({ pressed }) => ({
                  paddingVertical: 12,
                  alignItems: 'center',
                  opacity: pressed ? 0.5 : 1,
                })}
              >
                <Text style={{ color: C.muted, fontSize: 14 }}>Maybe Later</Text>
              </Pressable>
            </View>
          </>
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}


# mobile/src/components/MindMapCanvas.tsx

import React, { useMemo, useCallback } from 'react';
import { View, Text, Pressable, useWindowDimensions, StyleSheet } from 'react-native';
import Svg, {
  Path,
  Circle as SvgCircle,
  Text as SvgText,
  Defs,
  Filter,
  FeGaussianBlur,
  FeComposite,
} from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { CanvasNode, RedString, TagColor } from '@/lib/types';

const C = {
  bg: '#0D0F14',
  text: '#E8DCC8',
  muted: '#6B5B4F',
  border: '#2A2D38',
  red: '#C41E3A',
  pin: '#D4A574',
} as const;

const TAG_COLORS: Record<TagColor, string> = {
  red: '#C41E3A',
  blue: '#3B82F6',
  green: '#22C55E',
  amber: '#F59E0B',
  purple: '#A855F7',
  teal: '#14B8A6',
};

interface NodeLayout {
  nodeId: string;
  x: number;
  y: number;
  radius: number;
  color: string;
}

function computeMindMapLayout(
  nodes: CanvasNode[],
  strings: RedString[],
  centerX: number,
  centerY: number,
  selectedNodeId: string | null
): NodeLayout[] {
  if (nodes.length === 0) return [];

  // Build adjacency count
  const connectionCount: Record<string, number> = {};
  nodes.forEach((n) => { connectionCount[n.id] = 0; });
  strings.forEach((s) => {
    if (connectionCount[s.fromNodeId] != null) connectionCount[s.fromNodeId]++;
    if (connectionCount[s.toNodeId] != null) connectionCount[s.toNodeId]++;
  });

  // Pick center node: selectedNode, or most connected, or first
  let centerId = selectedNodeId && nodes.find((n) => n.id === selectedNodeId)
    ? selectedNodeId
    : nodes.reduce((best, n) =>
        (connectionCount[n.id] ?? 0) > (connectionCount[best] ?? 0) ? n.id : best,
        nodes[0]?.id ?? ''
      );

  if (!centerId) centerId = nodes[0]?.id ?? '';

  const layouts: NodeLayout[] = [];
  const placed = new Set<string>();

  // BFS outward from center
  const rings: string[][] = [[centerId]];
  placed.add(centerId);

  // Build adjacency map
  const adj: Record<string, string[]> = {};
  nodes.forEach((n) => { adj[n.id] = []; });
  strings.forEach((s) => {
    adj[s.fromNodeId]?.push(s.toNodeId);
    adj[s.toNodeId]?.push(s.fromNodeId);
  });

  let remaining = nodes.filter((n) => n.id !== centerId).map((n) => n.id);
  while (remaining.length > 0) {
    const lastRing = rings[rings.length - 1];
    const nextRing: string[] = [];
    lastRing.forEach((id) => {
      (adj[id] ?? []).forEach((neighborId) => {
        if (!placed.has(neighborId)) {
          placed.add(neighborId);
          nextRing.push(neighborId);
          remaining = remaining.filter((r) => r !== neighborId);
        }
      });
    });
    if (nextRing.length === 0) {
      // Disconnected nodes: place them in a ring
      const batch = remaining.slice(0, Math.max(remaining.length, 1));
      batch.forEach((id) => {
        placed.add(id);
        nextRing.push(id);
      });
      remaining = [];
    }
    if (nextRing.length > 0) rings.push(nextRing);
  }

  // Layout rings
  rings.forEach((ring, ringIdx) => {
    if (ringIdx === 0) {
      const node = nodes.find((n) => n.id === ring[0]);
      const conns = connectionCount[ring[0]] ?? 0;
      const radius = 32 + Math.min(conns * 4, 20);
      const color = node?.color ? TAG_COLORS[node.color] : C.red;
      layouts.push({ nodeId: ring[0], x: centerX, y: centerY, radius, color });
      return;
    }
    const ringRadius = ringIdx * 130;
    ring.forEach((nodeId, i) => {
      const angle = (i / ring.length) * Math.PI * 2 - Math.PI / 2;
      const x = centerX + Math.cos(angle) * ringRadius;
      const y = centerY + Math.sin(angle) * ringRadius;
      const node = nodes.find((n) => n.id === nodeId);
      const conns = connectionCount[nodeId] ?? 0;
      const radius = 22 + Math.min(conns * 3, 16);
      const color = node?.color ? TAG_COLORS[node.color] : '#3B82F6';
      layouts.push({ nodeId, x, y, radius, color });
    });
  });

  return layouts;
}

// Bezier path between two circles
function bezierPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const cp1x = x1 + dx * 0.4;
  const cp1y = y1;
  const cp2x = x2 - dx * 0.4;
  const cp2y = y2;
  return `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
}

// ---- Mind map bubble node ----
interface BubbleNodeProps {
  layout: NodeLayout;
  node: CanvasNode;
  isSelected: boolean;
  isCenter: boolean;
  onTap: (id: string) => void;
}

function BubbleNode({ layout, node, isSelected, isCenter, onTap }: BubbleNodeProps) {
  const scale = useSharedValue(1);

  const tapGesture = useMemo(
    () =>
      Gesture.Tap().onEnd(() => {
        scale.value = withSpring(0.9, { duration: 80 }, () => {
          scale.value = withSpring(1, { duration: 150 });
        });
        runOnJS(onTap)(node.id);
      }),
    [node.id, onTap, scale]
  );

  const animStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: layout.x - layout.radius,
    top: layout.y - layout.radius,
    width: layout.radius * 2,
    height: layout.radius * 2,
    transform: [{ scale: scale.value }],
  }));

  const borderColor = isSelected ? '#FFFFFF' : isCenter ? layout.color : layout.color + '88';
  const bgColor = isCenter
    ? layout.color + 'CC'
    : isSelected
    ? layout.color + 'AA'
    : layout.color + '33';

  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View style={animStyle}>
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: layout.radius,
              backgroundColor: bgColor,
              borderWidth: isSelected || isCenter ? 2 : 1,
              borderColor,
              alignItems: 'center',
              justifyContent: 'center',
              padding: 4,
            },
          ]}
        >
          <Text
            style={{
              color: isCenter ? '#FFFFFF' : C.text,
              fontSize: Math.max(8, Math.min(11, layout.radius * 0.3)),
              fontWeight: isCenter ? '700' : '600',
              textAlign: 'center',
            }}
            numberOfLines={2}
          >
            {node.title}
          </Text>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

// ---- MindMapCanvas ----
interface MindMapCanvasProps {
  nodes: CanvasNode[];
  strings: RedString[];
  selectedNodeId: string | null;
  onSelectNode: (id: string) => void;
}

export default function MindMapCanvas({
  nodes,
  strings,
  selectedNodeId,
  onSelectNode,
}: MindMapCanvasProps) {
  const { width: screenW, height: screenH } = useWindowDimensions();

  const tX = useSharedValue(0);
  const tY = useSharedValue(0);
  const savedTX = useSharedValue(0);
  const savedTY = useSharedValue(0);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .minPointers(1)
        .onStart(() => {
          savedTX.value = tX.value;
          savedTY.value = tY.value;
        })
        .onUpdate((e) => {
          tX.value = savedTX.value + e.translationX;
          tY.value = savedTY.value + e.translationY;
        }),
    [tX, tY, savedTX, savedTY]
  );

  const centerX = screenW / 2;
  const centerY = (screenH - 200) / 2;

  const layouts = useMemo(
    () => computeMindMapLayout(nodes, strings, centerX, centerY, selectedNodeId),
    [nodes, strings, centerX, centerY, selectedNodeId]
  );

  const layoutMap = useMemo(() => {
    const m: Record<string, NodeLayout> = {};
    layouts.forEach((l) => { m[l.nodeId] = l; });
    return m;
  }, [layouts]);

  const containerStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: tX.value,
    top: tY.value,
    width: screenW,
    height: screenH,
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        {/* Subtle dot grid */}
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          {Array.from({ length: 20 }, (_, r) =>
            Array.from({ length: 30 }, (_, c) => (
              <SvgCircle
                key={`d${r}-${c}`}
                cx={r * 40}
                cy={c * 40}
                r={1}
                fill="#E8DCC8"
                opacity={0.04}
              />
            ))
          )}
        </Svg>

        <Animated.View style={containerStyle}>
          {/* SVG bezier strings */}
          <Svg
            style={{ position: 'absolute', left: 0, top: 0, width: screenW * 4, height: screenH * 4 }}
            pointerEvents="none"
          >
            <Defs>
              <Filter id="glow">
                <FeGaussianBlur stdDeviation="3" result="blur" />
                <FeComposite in="SourceGraphic" in2="blur" operator="over" />
              </Filter>
            </Defs>
            {strings.map((s) => {
              const fromL = layoutMap[s.fromNodeId];
              const toL = layoutMap[s.toNodeId];
              if (!fromL || !toL) return null;
              const path = bezierPath(fromL.x, fromL.y, toL.x, toL.y);
              const color = s.color ?? C.red;
              // Midpoint for label
              const mx = (fromL.x + toL.x) / 2;
              const my = (fromL.y + toL.y) / 2;
              return (
                <React.Fragment key={s.id}>
                  {/* Glow layer */}
                  <Path
                    d={path}
                    stroke={color}
                    strokeWidth={4}
                    fill="none"
                    opacity={0.15}
                  />
                  {/* Main line */}
                  <Path
                    d={path}
                    stroke={color}
                    strokeWidth={1.5}
                    fill="none"
                    opacity={0.7}
                  />
                  {/* Endpoint dots */}
                  <SvgCircle cx={fromL.x} cy={fromL.y} r={3} fill={color} opacity={0.8} />
                  <SvgCircle cx={toL.x} cy={toL.y} r={3} fill={color} opacity={0.8} />
                  {s.label ? (
                    <SvgText
                      x={mx}
                      y={my - 6}
                      fill={C.text}
                      fontSize={10}
                      textAnchor="middle"
                      opacity={0.8}
                    >
                      {s.label}
                    </SvgText>
                  ) : null}
                </React.Fragment>
              );
            })}
          </Svg>

          {/* Bubble nodes */}
          {layouts.map((layout, idx) => {
            const node = nodes.find((n) => n.id === layout.nodeId);
            if (!node) return null;
            const isCenter = idx === 0;
            return (
              <BubbleNode
                key={layout.nodeId}
                layout={layout}
                node={node}
                isSelected={selectedNodeId === layout.nodeId}
                isCenter={isCenter}
                onTap={onSelectNode}
              />
            );
          })}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}


# mobile/src/components/SourcesPanel.tsx

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Share,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  BookOpen,
  Twitter,
  Video,
  Globe,
  User,
  FileText,
  Music,
  ChevronDown,
  ChevronRight,
  Share2,
  Bookmark,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import type { Investigation, NodeSource, CanvasNode } from '@/lib/types';

const C = {
  bg: '#1A1614',
  surface: '#231F1C',
  card: '#F5ECD7',
  red: '#C41E3A',
  pin: '#D4A574',
  text: '#E8DCC8',
  muted: '#6B5B4F',
  border: '#3D332C',
} as const;

type CredibilityKey = NodeSource['credibility'];

const CREDIBILITY_COLORS: Record<CredibilityKey, string> = {
  confirmed: '#22C55E',
  primary: '#3B82F6',
  secondary: '#F59E0B',
  unverified: '#6B5B4F',
  disputed: '#C41E3A',
};

function getPlatformIcon(source: NodeSource): React.ComponentType<{ size: number; color: string; strokeWidth: number }> {
  const p = source.platform;
  if (p === 'x') return Twitter;
  if (p === 'tiktok' || p === 'youtube') return Video;
  if (p === 'podcast') return Music;
  if (p === 'instagram' || p === 'facebook') return Globe;
  if (p === 'website') return Globe;
  if (source.sourceType === 'person') return User;
  if (source.sourceType === 'document') return FileText;
  return Globe;
}

function CredibilityBadge({ credibility }: { credibility: CredibilityKey }) {
  const color = CREDIBILITY_COLORS[credibility];
  return (
    <View style={{
      backgroundColor: color + '33',
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderWidth: 1,
      borderColor: color + '55',
    }}>
      <Text style={{ color, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {credibility}
      </Text>
    </View>
  );
}

function StatCard({ value, label }: { value: string | number; label: string }) {
  return (
    <View style={{
      flex: 1,
      backgroundColor: C.bg,
      borderRadius: 10,
      padding: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: C.border,
    }}>
      <Text style={{ color: C.text, fontSize: 22, fontWeight: '900', marginBottom: 2 }}>{value}</Text>
      <Text style={{ color: C.muted, fontSize: 9, fontWeight: '700', letterSpacing: 0.8, textAlign: 'center' }}>{label}</Text>
    </View>
  );
}

function computeStats(investigation: Investigation) {
  const allSources: NodeSource[] = [];
  for (const node of investigation.nodes) {
    for (const s of node.sources ?? []) {
      allSources.push(s);
    }
  }
  const totalSources = allSources.length;
  const uniqueContributors = new Set(allSources.map((s) => s.sourceName)).size;
  const verifiedSources = allSources.filter(
    (s) => s.credibility === 'confirmed' || s.credibility === 'primary'
  ).length;
  const score = Math.min(100, totalSources * 2 + uniqueContributors * 5 + verifiedSources * 10);
  let label = 'Early Research';
  if (score > 80) label = 'Exhaustive';
  else if (score > 60) label = 'Thorough';
  else if (score > 40) label = 'Solid';
  else if (score > 20) label = 'Growing';
  return { totalSources, uniqueContributors, verifiedSources, score, label };
}

interface SourceGroupProps {
  sourceName: string;
  sources: NodeSource[];
  nodes: CanvasNode[];
  nodeIdToTitle: Map<string, string>;
}

function SourceGroup({ sourceName, sources, nodeIdToTitle }: SourceGroupProps) {
  const [expanded, setExpanded] = useState<boolean>(true);
  const first = sources[0];
  const PlatformIcon = getPlatformIcon(first);
  const nodeIds = [...new Set(sources.map((s) => (s as any).__nodeId as string).filter(Boolean))];

  return (
    <View style={{
      backgroundColor: C.surface,
      borderRadius: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: C.border,
      overflow: 'hidden',
    }}>
      <Pressable
        onPress={() => setExpanded((p) => !p)}
        style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 }}
      >
        <View style={{
          width: 32, height: 32, borderRadius: 16,
          backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center',
        }}>
          <PlatformIcon size={15} color={C.pin} strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.text, fontSize: 14, fontWeight: '700' }}>{sourceName}</Text>
          {first.secondarySourceName ? (
            <Text style={{ color: C.muted, fontSize: 11, marginTop: 1 }}>via {first.secondarySourceName}</Text>
          ) : null}
        </View>
        <CredibilityBadge credibility={first.credibility} />
        {expanded ? (
          <ChevronDown size={16} color={C.muted} strokeWidth={2} />
        ) : (
          <ChevronRight size={16} color={C.muted} strokeWidth={2} />
        )}
      </Pressable>

      {expanded ? (
        <View style={{ paddingHorizontal: 14, paddingBottom: 12, borderTopWidth: 1, borderTopColor: C.border }}>
          <Text style={{ color: C.muted, fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginTop: 10, marginBottom: 6 }}>
            CITED IN {nodeIds.length} NODE{nodeIds.length !== 1 ? 'S' : null}
          </Text>
          {nodeIds.map((nid) => (
            <View key={nid} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Bookmark size={11} color={C.pin} strokeWidth={2} />
              <Text style={{ color: C.pin, fontSize: 12, fontWeight: '600' }}>
                {nodeIdToTitle.get(nid) ?? 'Unknown Node'}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

interface SourcesPanelProps {
  investigation: Investigation;
  onClose: () => void;
}

export default function SourcesPanel({ investigation, onClose }: SourcesPanelProps) {
  const [activeTab, setActiveTab] = useState<'bySource' | 'byNode'>('bySource');

  const stats = useMemo(() => computeStats(investigation), [investigation]);

  // Build nodeIdToTitle map
  const nodeIdToTitle = useMemo(() => {
    const map = new Map<string, string>();
    for (const n of investigation.nodes) map.set(n.id, n.title);
    return map;
  }, [investigation.nodes]);

  // Group sources by sourceName, attaching __nodeId
  const sourceGroups = useMemo(() => {
    const groups = new Map<string, (NodeSource & { __nodeId: string })[]>();
    for (const node of investigation.nodes) {
      for (const s of node.sources ?? []) {
        const tagged = { ...s, __nodeId: node.id };
        const existing = groups.get(s.sourceName) ?? [];
        existing.push(tagged);
        groups.set(s.sourceName, existing);
      }
    }
    return groups;
  }, [investigation.nodes]);

  // Nodes with sources
  const nodesWithSources = useMemo(
    () => investigation.nodes.filter((n) => (n.sources ?? []).length > 0),
    [investigation.nodes]
  );

  const handleExport = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const separator = '━'.repeat(26);

    let text = `RED STRING RESEARCH — ${investigation.title}\nSOURCES & CITATIONS\nGenerated: ${date}\n${separator}\n`;

    for (const node of nodesWithSources) {
      text += `\nNODE: ${node.title}\n`;
      for (const s of node.sources ?? []) {
        text += `  • ${s.sourceName}`;
        if (s.platform) text += ` (${s.platform})`;
        if (s.contentType) text += ` — ${s.contentType.charAt(0).toUpperCase() + s.contentType.slice(1)}`;
        text += '\n';
        if (s.sourceUrl) text += `    Source: ${s.sourceUrl}\n`;
        if (s.secondarySourceName) text += `    Secondary: ${s.secondarySourceName}\n`;
        text += `    Credibility: ${s.credibility.charAt(0).toUpperCase() + s.credibility.slice(1)}\n`;
        if (s.contentSummary) text += `    Notes: ${s.contentSummary}\n`;
      }
      text += separator + '\n';
    }

    text += '\nResearch conducted using Red String Research';

    try {
      await Share.share({ message: text, title: `${investigation.title} — Sources` });
    } catch {
      // ignore
    }
  }, [investigation, nodesWithSources]);

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20,
            paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border,
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 2 }}>
                SOURCES & RESEARCH
              </Text>
              <Text style={{ color: C.text, fontSize: 18, fontWeight: '900' }} numberOfLines={1}>
                {investigation.title}
              </Text>
            </View>
            <Pressable
              testID="sources-panel-close"
              onPress={onClose}
              style={({ pressed }) => ({
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: pressed ? C.border : C.surface,
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 1, borderColor: C.border,
              })}
            >
              <X size={18} color={C.muted} strokeWidth={2} />
            </Pressable>
          </View>

          {/* Stats bar */}
          <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingVertical: 16 }}>
            <StatCard value={stats.totalSources} label="SOURCES" />
            <StatCard value={stats.uniqueContributors} label="CONTRIBUTORS" />
            <StatCard value={stats.verifiedSources} label="VERIFIED" />
            <StatCard value={stats.label} label="RESEARCH" />
          </View>

          {/* Tabs */}
          <View style={{
            flexDirection: 'row', marginHorizontal: 20, marginBottom: 12,
            backgroundColor: C.surface, borderRadius: 10, padding: 3,
            borderWidth: 1, borderColor: C.border,
          }}>
            {([
              { key: 'bySource' as const, label: 'BY SOURCE' },
              { key: 'byNode' as const, label: 'BY NODE' },
            ]).map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  testID={`sources-tab-${tab.key}`}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setActiveTab(tab.key);
                  }}
                  style={{
                    flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8,
                    backgroundColor: isActive ? C.red : 'transparent',
                  }}
                >
                  <Text style={{ color: isActive ? '#FFF' : C.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.8 }}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Content */}
          {stats.totalSources === 0 ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
              <BookOpen size={40} color={C.muted} strokeWidth={1.5} />
              <Text style={{ color: C.text, fontSize: 16, fontWeight: '700', marginTop: 16, marginBottom: 8, textAlign: 'center' }}>
                No sources yet
              </Text>
              <Text style={{ color: C.muted, fontSize: 13, lineHeight: 20, textAlign: 'center' }}>
                Open any node on the canvas and add sources to track your research trail.
              </Text>
            </View>
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
            >
              {activeTab === 'bySource' ? (
                <>
                  {Array.from(sourceGroups.entries()).map(([name, sources]) => (
                    <SourceGroup
                      key={name}
                      sourceName={name}
                      sources={sources}
                      nodes={investigation.nodes}
                      nodeIdToTitle={nodeIdToTitle}
                    />
                  ))}
                </>
              ) : (
                <>
                  {nodesWithSources.map((node) => (
                    <View key={node.id} style={{
                      backgroundColor: C.surface, borderRadius: 12, marginBottom: 10,
                      borderWidth: 1, borderColor: C.border, overflow: 'hidden',
                    }}>
                      <View style={{
                        flexDirection: 'row', alignItems: 'center', gap: 10,
                        padding: 14, borderBottomWidth: 1, borderBottomColor: C.border,
                      }}>
                        <FileText size={16} color={C.pin} strokeWidth={2} />
                        <Text style={{ color: C.text, fontSize: 14, fontWeight: '700', flex: 1 }} numberOfLines={1}>
                          {node.title}
                        </Text>
                        <Text style={{ color: C.muted, fontSize: 11 }}>
                          {(node.sources ?? []).length} source{(node.sources ?? []).length !== 1 ? 's' : null}
                        </Text>
                      </View>
                      <View style={{ padding: 12, gap: 8 }}>
                        {(node.sources ?? []).map((s) => {
                          const PIcon = getPlatformIcon(s);
                          const credColor = CREDIBILITY_COLORS[s.credibility];
                          return (
                            <View key={s.id} style={{
                              flexDirection: 'row', alignItems: 'center', gap: 10,
                              backgroundColor: credColor + '11',
                              borderRadius: 8, padding: 10,
                              borderWidth: 1, borderColor: credColor + '33',
                            }}>
                              <PIcon size={14} color={credColor} strokeWidth={2} />
                              <View style={{ flex: 1 }}>
                                <Text style={{ color: C.text, fontSize: 13, fontWeight: '600' }}>{s.sourceName}</Text>
                                {s.secondarySourceName ? (
                                  <Text style={{ color: C.muted, fontSize: 11 }}>via {s.secondarySourceName}</Text>
                                ) : null}
                              </View>
                              <CredibilityBadge credibility={s.credibility} />
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  ))}
                </>
              )}
            </ScrollView>
          )}

          {/* Export button */}
          {stats.totalSources > 0 ? (
            <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
              <Pressable
                testID="export-citations-button"
                onPress={handleExport}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? C.surface : C.bg,
                  borderRadius: 12, paddingVertical: 14,
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                  borderWidth: 1, borderColor: C.border,
                })}
              >
                <Share2 size={16} color={C.pin} strokeWidth={2} />
                <Text style={{ color: C.pin, fontSize: 15, fontWeight: '700' }}>EXPORT CITATIONS</Text>
              </Pressable>
            </View>
          ) : null}
        </SafeAreaView>
      </View>
    </Modal>
  );
}


# mobile/src/components/Themed.tsx

/**
 * Learn more about Light and Dark modes:
 * https://docs.expo.io/guides/color-schemes/
 */

import { Text as DefaultText, View as DefaultView } from 'react-native';

export type TextProps = DefaultText['props'];
export type ViewProps = DefaultView['props'];

export function Text(props: TextProps) {
  const { className, ...otherProps } = props;
  return (
    <DefaultText
      className={`text-black dark:text-white ${className ?? ''}`}
      {...otherProps}
    />
  );
}

export function View(props: ViewProps) {
  const { className, ...otherProps } = props;
  return (
    <DefaultView
      className={`bg-white dark:bg-black ${className ?? ''}`}
      {...otherProps}
    />
  );
}


# mobile/src/components/TimelinePanel.tsx

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
  TextInput,
  StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Plus, Minus, Trash2, ChevronDown, ChevronUp, X } from 'lucide-react-native';
import type { Timeline, CanvasNode } from '@/lib/types';

const C = {
  bg: '#1A1614',
  surface: '#231F1C',
  text: '#E8DCC8',
  muted: '#6B5B4F',
  border: '#3D332C',
  red: '#C41E3A',
} as const;

const CURRENT_YEAR = new Date().getFullYear();

function getYears(start: number, end: number): number[] {
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return [start || new Date().getFullYear()];
  const years: number[] = [];
  const range = end - start;
  const step = range > 100 ? 10 : range > 30 ? 5 : 1;
  for (let y = start; y <= end; y += step) {
    years.push(y);
  }
  if (years.length > 0 && years[years.length - 1] !== end) years.push(end);
  return years;
}

export function parseFlexibleDate(input: string | number): number | null {
  if (typeof input === 'number') return input;
  const s = input.trim();
  const iso = new Date(s);
  if (!isNaN(iso.getTime())) return iso.getTime();
  const yearOnly = s.match(/^(\d{4})$/);
  if (yearOnly) return new Date(parseInt(yearOnly[1]), 0, 1).getTime();
  const monthYear = s.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (monthYear) {
    const d = new Date(`${monthYear[1]} 1, ${monthYear[2]}`);
    if (!isNaN(d.getTime())) return d.getTime();
  }
  const mmyyyy = s.match(/^(\d{1,2})\/(\d{4})$/);
  if (mmyyyy) return new Date(parseInt(mmyyyy[2]), parseInt(mmyyyy[1]) - 1, 1).getTime();
  return null;
}

function getTimelinePosition(
  timestamp: number,
  startYear: number,
  endYear: number,
  totalWidth: number
): number {
  const date = new Date(timestamp);
  const year = date.getFullYear() + date.getMonth() / 12;
  const frac = (year - startYear) / (endYear - startYear);
  return Math.max(0, Math.min(1, frac)) * totalWidth;
}

// ---- Single timeline row ----
interface TimelineRowProps {
  timeline: Timeline;
  nodes: CanvasNode[];
  isMain: boolean;
  onToggleMinimize: () => void;
  onDelete: () => void;
  onUpdateLabel: (label: string) => void;
}

function TimelineRow({
  timeline,
  nodes,
  isMain,
  onToggleMinimize,
  onDelete,
  onUpdateLabel,
}: TimelineRowProps) {
  const [editingLabel, setEditingLabel] = useState<boolean>(false);
  const [labelText, setLabelText] = useState<string>(timeline.label);
  const scrollRef = useRef<ScrollView>(null);

  // Nodes that have timestamps
  const timedNodes = useMemo(
    () => nodes.filter((n) => n.timestamp != null),
    [nodes]
  );

  // Auto-derive effective start/end from node timestamps, with padding
  const { effectiveStart, effectiveEnd } = useMemo(() => {
    if (!timedNodes || timedNodes.length === 0) {
      const s = Number.isFinite(timeline.startYear) ? timeline.startYear : new Date().getFullYear() - 5;
      const e = Number.isFinite(timeline.endYear) && timeline.endYear > s ? timeline.endYear : s + 10;
      return { effectiveStart: s, effectiveEnd: e };
    }
    const years = timedNodes.map((n) => new Date(n.timestamp!).getFullYear()).filter(Number.isFinite);
    if (years.length === 0) return { effectiveStart: new Date().getFullYear() - 5, effectiveEnd: new Date().getFullYear() + 5 };
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    const start = minYear - 5;
    const end = Math.max(maxYear + 5, CURRENT_YEAR);
    return { effectiveStart: start, effectiveEnd: end };
  }, [timedNodes, timeline.startYear, timeline.endYear]);

  const years = useMemo(
    () => getYears(effectiveStart, effectiveEnd),
    [effectiveStart, effectiveEnd]
  );

  const YEAR_WIDTH = 60;
  const totalScrollWidth = years.length * YEAR_WIDTH;

  if (timeline.isMinimized) {
    return (
      <View style={styles.rowMinimized}>
        <View style={[styles.colorSidebar, { backgroundColor: timeline.color }]} />
        <Pressable
          onPress={onToggleMinimize}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10 }}
        >
          <Text style={[styles.rowLabel, { color: timeline.color }]}>
            {timeline.label}
          </Text>
          <ChevronDown size={14} color={C.muted} strokeWidth={2} style={{ marginLeft: 6 }} />
        </Pressable>
        {!isMain ? (
          <Pressable onPress={onDelete} style={styles.deleteBtn}>
            <Trash2 size={12} color={C.muted} strokeWidth={2} />
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.rowExpanded}>
      {/* Colored left sidebar */}
      <View style={[styles.colorSidebar, { backgroundColor: timeline.color }]} />

      {/* Content */}
      <View style={{ flex: 1 }}>
        {/* Header row */}
        <View style={styles.rowHeader}>
          {editingLabel ? (
            <TextInput
              value={labelText}
              onChangeText={setLabelText}
              onBlur={() => {
                setEditingLabel(false);
                if (labelText.trim()) onUpdateLabel(labelText.trim());
              }}
              autoFocus
              style={[styles.labelInput, { color: timeline.color }]}
            />
          ) : (
            <Pressable onPress={() => !isMain && setEditingLabel(true)}>
              <Text style={[styles.rowLabel, { color: timeline.color }]}>
                {timeline.label}
              </Text>
            </Pressable>
          )}
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <Pressable onPress={onToggleMinimize} style={styles.iconBtn}>
              <ChevronUp size={13} color={C.muted} strokeWidth={2} />
            </Pressable>
            {!isMain ? (
              <Pressable onPress={onDelete} style={styles.iconBtn}>
                <Trash2 size={13} color={C.muted} strokeWidth={2} />
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Scrollable timeline track */}
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ height: 56 }}
          contentContainerStyle={{ width: totalScrollWidth, position: 'relative' }}
        >
          {/* Track line */}
          <View
            style={{
              position: 'absolute',
              top: 32,
              left: 0,
              width: totalScrollWidth,
              height: 2,
              backgroundColor: timeline.color,
              opacity: 0.5,
            }}
          />

          {/* Year notches */}
          {years.map((year, i) => (
            <View
              key={year}
              style={{
                position: 'absolute',
                left: i * YEAR_WIDTH,
                top: 0,
                width: YEAR_WIDTH,
                alignItems: 'center',
              }}
            >
              {/* Tick mark */}
              <View
                style={{
                  width: 1,
                  height: 10,
                  backgroundColor: timeline.color,
                  opacity: 0.6,
                  marginTop: 26,
                }}
              />
              <Text
                style={{
                  color: C.text,
                  fontSize: 9,
                  opacity: 0.7,
                  marginTop: 2,
                }}
              >
                {year}
              </Text>
            </View>
          ))}

          {/* Node dots on timeline */}
          {timedNodes.map((node) => {
            if (!node.timestamp) return null;
            const xPos = getTimelinePosition(
              node.timestamp,
              effectiveStart,
              effectiveEnd,
              totalScrollWidth
            );
            const dotColor = '#F59E0B'; // amber for evidence dots
            const label = node.title.length > 10 ? node.title.slice(0, 10) + '…' : node.title;
            return (
              <View
                key={node.id}
                style={{
                  position: 'absolute',
                  left: xPos - 4,
                  top: 4,
                  alignItems: 'center',
                  zIndex: 2,
                }}
              >
                <Text style={{ color: dotColor, fontSize: 7, fontWeight: '700', marginBottom: 2, width: 50, textAlign: 'center' }} numberOfLines={1}>
                  {label}
                </Text>
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: dotColor,
                    borderWidth: 1.5,
                    borderColor: C.bg,
                  }}
                />
              </View>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

// ---- Main TimelinePanel ----
interface TimelinePanelProps {
  investigationId: string;
  timelines: Timeline[];
  nodes: CanvasNode[];
  onAddTimeline: (label: string) => void;
  onDeleteTimeline: (timelineId: string) => void;
  onToggleMinimized: (timelineId: string) => void;
  onUpdateTimeline: (timelineId: string, updates: Partial<Timeline>) => void;
}

export default function TimelinePanel({
  investigationId,
  timelines,
  nodes,
  onAddTimeline,
  onDeleteTimeline,
  onToggleMinimized,
  onUpdateTimeline,
}: TimelinePanelProps) {
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newLabel, setNewLabel] = useState<string>('');

  const handleAdd = useCallback(() => {
    const label = newLabel.trim() || `Timeline ${timelines.length + 1}`;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onAddTimeline(label);
    setNewLabel('');
    setShowAddModal(false);
  }, [newLabel, timelines.length, onAddTimeline]);

  return (
    <View style={styles.panel}>
      {/* Panel header */}
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>TIMELINE</Text>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowAddModal(true);
          }}
          style={styles.addBtn}
          testID="add-timeline-button"
        >
          <Plus size={14} color={C.text} strokeWidth={2.5} />
        </Pressable>
      </View>

      {/* Timeline rows */}
      <ScrollView
        style={{ maxHeight: 200 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {timelines.map((tl, idx) => (
          <TimelineRow
            key={tl.id}
            timeline={tl}
            nodes={nodes}
            isMain={idx === 0}
            onToggleMinimize={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onToggleMinimized(tl.id);
            }}
            onDelete={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              onDeleteTimeline(tl.id);
            }}
            onUpdateLabel={(label) => onUpdateTimeline(tl.id, { label })}
          />
        ))}
      </ScrollView>

      {/* Add timeline modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowAddModal(false)}
        >
          <Pressable onPress={() => {}} style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Timeline</Text>
              <Pressable onPress={() => setShowAddModal(false)}>
                <X size={18} color={C.muted} strokeWidth={2} />
              </Pressable>
            </View>
            <TextInput
              value={newLabel}
              onChangeText={setNewLabel}
              placeholder="Timeline label (e.g. Person, Topic)"
              placeholderTextColor={C.muted}
              style={styles.modalInput}
              autoFocus
              onSubmitEditing={handleAdd}
            />
            <Pressable
              onPress={handleAdd}
              style={({ pressed }) => [
                styles.modalBtn,
                { backgroundColor: pressed ? '#A3162E' : C.red },
              ]}
            >
              <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 15 }}>
                Add Timeline
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: '#1A1614',
    borderTopWidth: 1,
    borderTopColor: '#3D332C',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#3D332C',
  },
  panelTitle: {
    color: '#6B5B4F',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  addBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3D332C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowMinimized: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#3D332C',
  },
  rowExpanded: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#3D332C',
  },
  colorSidebar: {
    width: 4,
    alignSelf: 'stretch',
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingTop: 5,
    paddingBottom: 2,
  },
  rowLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  labelInput: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    borderBottomWidth: 1,
    borderBottomColor: '#6B5B4F',
    minWidth: 80,
    paddingVertical: 0,
  },
  iconBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#3D332C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#231F1C',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#3D332C',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#E8DCC8',
    fontSize: 17,
    fontWeight: '700',
  },
  modalInput: {
    backgroundColor: '#1A1614',
    borderRadius: 10,
    padding: 14,
    color: '#E8DCC8',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#3D332C',
    marginBottom: 16,
  },
  modalBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
});


# mobile/src/components/TourOverlay.tsx

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
  runOnJS,
  ReduceMotion,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import useTourStore from '@/lib/state/tour-store';
import { TOUR_STEPS, TOTAL_TOUR_STEPS } from '@/lib/tourSteps';

const C = {
  bg: '#1A1614',
  surface: '#231F1C',
  red: '#C41E3A',
  amber: '#D4A574',
  text: '#E8DCC8',
  muted: '#9B8B7E',
  border: '#3D332C',
} as const;

export default function TourOverlay() {
  const isRunning = useTourStore((s) => s.isRunning);
  const currentStep = useTourStore((s) => s.currentStep);
  const nextStep = useTourStore((s) => s.nextStep);
  const prevStep = useTourStore((s) => s.prevStep);
  const skipTour = useTourStore((s) => s.skipTour);
  const completeTour = useTourStore((s) => s.completeTour);

  const { width: screenW, height: screenH } = useWindowDimensions();

  const step = TOUR_STEPS[currentStep];

  // Tooltip animation values
  const tooltipTranslateX = useSharedValue(0);
  const tooltipOpacity = useSharedValue(0);
  const tooltipScale = useSharedValue(0.92);

  // Backdrop opacity
  const backdropOpacity = useSharedValue(0);

  // Tap indicator pulse
  const tapScale = useSharedValue(1);
  const tapOpacity = useSharedValue(0.8);

  // Track previous step to animate direction
  const prevStepRef = useRef(currentStep);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isRunning) {
      backdropOpacity.value = withTiming(1, { duration: 300, reduceMotion: ReduceMotion.Never });
      tooltipOpacity.value = withTiming(1, { duration: 300, reduceMotion: ReduceMotion.Never });
      tooltipScale.value = withSpring(1, { damping: 18, stiffness: 220, reduceMotion: ReduceMotion.Never });
    } else {
      backdropOpacity.value = withTiming(0, { duration: 200, reduceMotion: ReduceMotion.Never });
      tooltipOpacity.value = withTiming(0, { duration: 200, reduceMotion: ReduceMotion.Never });
    }
  }, [isRunning, backdropOpacity, tooltipOpacity, tooltipScale]);

  useEffect(() => {
    if (!isRunning) return;
    if (isFirstRender.current) {
      isFirstRender.current = false;
      tooltipTranslateX.value = 0;
      return;
    }
    const direction = currentStep > prevStepRef.current ? 1 : -1;
    prevStepRef.current = currentStep;

    // Slide out old, slide in new
    tooltipOpacity.value = withTiming(0, { duration: 120, reduceMotion: ReduceMotion.Never }, () => {
      tooltipTranslateX.value = -direction * 40;
      tooltipOpacity.value = withTiming(1, { duration: 200, reduceMotion: ReduceMotion.Never });
      tooltipTranslateX.value = withSpring(0, { damping: 20, stiffness: 280, reduceMotion: ReduceMotion.Never });
    });
    tooltipScale.value = withSequence(
      withTiming(0.95, { duration: 80, reduceMotion: ReduceMotion.Never }),
      withSpring(1, { damping: 18, stiffness: 220, reduceMotion: ReduceMotion.Never })
    );
  }, [currentStep, isRunning, tooltipOpacity, tooltipTranslateX, tooltipScale]);

  // Tap pulse animation
  useEffect(() => {
    if (!isRunning || !step?.action || step.action !== 'tap') {
      tapOpacity.value = 0;
      return;
    }
    tapOpacity.value = 0.8;
    tapScale.value = withRepeat(
      withSequence(
        withTiming(1.4, { duration: 600, reduceMotion: ReduceMotion.Never }),
        withTiming(1, { duration: 600, reduceMotion: ReduceMotion.Never })
      ),
      -1,
      false
    );
  }, [currentStep, isRunning, step, tapScale, tapOpacity]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const tooltipStyle = useAnimatedStyle(() => ({
    opacity: tooltipOpacity.value,
    transform: [
      { translateX: tooltipTranslateX.value },
      { scale: tooltipScale.value },
    ],
  }));

  const tapIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ scale: tapScale.value }],
    opacity: tapOpacity.value,
  }));

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep >= TOTAL_TOUR_STEPS - 1) {
      completeTour();
    } else {
      nextStep();
    }
  };

  const handlePrev = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    prevStep();
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    skipTour();
  };

  if (!isRunning || !step) return null;

  const isLastStep = currentStep >= TOTAL_TOUR_STEPS - 1;
  const isFirstStep = currentStep === 0;
  const tooltipAtTop = step.tooltipPosition === 'top';
  const tooltipBottom = !tooltipAtTop;

  return (
    <Modal
      visible={isRunning}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleSkip}
    >
      {/* Backdrop */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.78)',
          },
          backdropStyle,
        ]}
        pointerEvents="none"
      />

      {/* Tap indicator (for steps with action: 'tap') */}
      {step.action === 'tap' ? (
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: screenH * 0.15,
              alignSelf: 'center',
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: (step.highlightColor ?? C.amber) + '33',
              borderWidth: 2,
              borderColor: step.highlightColor ?? C.amber,
              alignItems: 'center',
              justifyContent: 'center',
            },
            tapIndicatorStyle,
          ]}
          pointerEvents="none"
        >
          <View
            style={{
              width: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: step.highlightColor ?? C.amber,
              opacity: 0.9,
            }}
          />
        </Animated.View>
      ) : null}

      {/* Dismiss area (allows tapping outside tooltip to advance) */}
      <Pressable
        style={{ flex: 1 }}
        onPress={handleNext}
      />

      {/* Tooltip Card */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: 16,
            right: 16,
            ...(tooltipAtTop ? { top: 100 } : { bottom: 110 }),
          },
          tooltipStyle,
        ]}
        pointerEvents="box-none"
      >
        <Pressable onPress={() => {}} style={{ pointerEvents: 'auto' }}>
          <View
            style={{
              backgroundColor: C.surface,
              borderRadius: 18,
              borderTopWidth: 3,
              borderTopColor: C.red,
              borderWidth: 1,
              borderColor: C.border,
              padding: 22,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.5,
              shadowRadius: 24,
              elevation: 20,
            }}
          >
            {/* Step dots */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 14,
              }}
            >
              <View style={{ flexDirection: 'row', gap: 5, flexWrap: 'wrap', flex: 1 }}>
                {TOUR_STEPS.map((_, i) => {
                  const isDone = i < currentStep;
                  const isCurrent = i === currentStep;
                  return (
                    <View
                      key={i}
                      style={{
                        width: isCurrent ? 16 : 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: isCurrent
                          ? C.red
                          : isDone
                          ? C.red + '66'
                          : C.border,
                      }}
                    />
                  );
                })}
              </View>
              <Text
                style={{
                  color: C.muted,
                  fontSize: 12,
                  fontWeight: '600',
                  marginLeft: 8,
                }}
              >
                {currentStep + 1}/{TOTAL_TOUR_STEPS}
              </Text>
            </View>

            {/* Title */}
            <Text
              style={{
                color: C.text,
                fontSize: 20,
                fontWeight: '700',
                marginBottom: 8,
                letterSpacing: 0.3,
              }}
            >
              {step.title}
            </Text>

            {/* Description */}
            <Text
              style={{
                color: C.muted,
                fontSize: 15,
                lineHeight: 22,
                marginBottom: 20,
              }}
            >
              {step.description}
            </Text>

            {/* Buttons */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {/* Back */}
              {!isFirstStep ? (
                <Pressable
                  testID="tour-back-button"
                  onPress={handlePrev}
                  style={({ pressed }) => ({
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: C.border,
                    backgroundColor: pressed ? C.border : 'transparent',
                  })}
                >
                  <Text style={{ color: C.muted, fontSize: 14, fontWeight: '600' }}>
                    Back
                  </Text>
                </Pressable>
              ) : null}

              {/* Spacer */}
              <View style={{ flex: 1 }} />

              {/* Skip */}
              {!isLastStep ? (
                <Pressable
                  testID="tour-skip-button"
                  onPress={handleSkip}
                  style={({ pressed }) => ({
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    opacity: pressed ? 0.5 : 1,
                  })}
                >
                  <Text style={{ color: C.muted, fontSize: 14 }}>
                    Skip
                  </Text>
                </Pressable>
              ) : null}

              {/* Next / Finish */}
              <Pressable
                testID="tour-next-button"
                onPress={handleNext}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? '#A3162E' : C.red,
                  borderRadius: 22,
                  paddingVertical: 11,
                  paddingHorizontal: 24,
                  shadowColor: C.red,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.35,
                  shadowRadius: 8,
                  elevation: 6,
                })}
              >
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: 15,
                    fontWeight: '700',
                    letterSpacing: 0.3,
                  }}
                >
                  {isLastStep ? 'Start Investigating' : 'Next'}
                </Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}


# mobile/src/components/VideoOnboardingModal.tsx

import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  background: '#1A1614',
  surface: '#231F1C',
  red: '#C41E3A',
  amber: '#D4A574',
  textLight: '#E8DCC8',
  muted: '#6B5B4F',
  border: '#3D332C',
} as const;

interface Props {
  visible: boolean;
  onClose: () => void;
  videoUri?: string;
}

interface FeatureCard {
  emoji: string;
  iconBg: string;
  name: string;
  description: string;
  accentColor: string;
}

const FEATURES: FeatureCard[] = [
  {
    emoji: '🗂️',
    iconBg: 'rgba(196,30,58,0.18)',
    name: 'Investigation Canvas',
    description:
      'Your digital corkboard. Pin evidence, notes, images, and links as nodes. Arrange them freely across an infinite workspace.',
    accentColor: COLORS.red,
  },
  {
    emoji: '🔴',
    iconBg: 'rgba(196,30,58,0.18)',
    name: 'Red String Connections',
    description:
      'Draw connections between any two nodes. The string follows the truth — tag each link with context, weight, and confidence.',
    accentColor: COLORS.red,
  },
  {
    emoji: '🕐',
    iconBg: 'rgba(212,165,116,0.18)',
    name: 'Timeline View',
    description:
      'Every clue has a timestamp. See your investigation unfold chronologically and spot patterns hiding in plain sight.',
    accentColor: COLORS.amber,
  },
  {
    emoji: '🔐',
    iconBg: 'rgba(212,165,116,0.18)',
    name: 'Collaborate Securely',
    description:
      'Invite trusted investigators with granular permissions: viewer, contributor, or co-investigator. Your board, your rules.',
    accentColor: COLORS.amber,
  },
  {
    emoji: '📬',
    iconBg: 'rgba(196,30,58,0.18)',
    name: 'Tip Inbox',
    description:
      'Receive anonymous tips from sources. AI vets credibility automatically so you focus on the leads that matter.',
    accentColor: COLORS.red,
  },
];

const CARD_WIDTH = SCREEN_WIDTH - 48;
const CARD_PADDING = 24;

function FeatureCardItem({ feature, index }: { feature: FeatureCard; index: number }) {
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 60).duration(400)}
      style={{
        width: CARD_WIDTH,
        marginHorizontal: CARD_PADDING / 2,
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
        elevation: 10,
      }}
    >
      {/* Card body */}
      <View style={{ padding: 28, flex: 1 }}>
        {/* Icon circle */}
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: feature.iconBg,
            borderWidth: 1.5,
            borderColor: `${feature.accentColor}40`,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 22,
          }}
        >
          <Text style={{ fontSize: 34 }}>{feature.emoji}</Text>
        </View>

        {/* Feature name */}
        <Text
          style={{
            color: COLORS.textLight,
            fontSize: 22,
            fontWeight: '900',
            letterSpacing: 0.2,
            marginBottom: 12,
            lineHeight: 28,
          }}
        >
          {feature.name}
        </Text>

        {/* Description */}
        <Text
          style={{
            color: COLORS.muted,
            fontSize: 15,
            lineHeight: 23,
            fontWeight: '400',
            letterSpacing: 0.1,
          }}
        >
          {feature.description}
        </Text>
      </View>

      {/* Bottom accent bar */}
      <View
        style={{
          height: 3,
          backgroundColor: feature.accentColor,
          opacity: 0.7,
        }}
      />
    </Animated.View>
  );
}

export default function VideoOnboardingModal({ visible, onClose }: Props) {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const scrollRef = useRef<ScrollView>(null);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (CARD_WIDTH + CARD_PADDING));
    if (index !== activeIndex && index >= 0 && index < FEATURES.length) {
      setActiveIndex(index);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View
        style={{ flex: 1, backgroundColor: COLORS.background }}
      >
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          <Animated.View
            entering={FadeIn.duration(350)}
            style={{ flex: 1 }}
          >
            {/* Top row: close button */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
                paddingHorizontal: 20,
                paddingTop: 8,
                paddingBottom: 4,
              }}
            >
              <Pressable
                testID="video-onboarding-close"
                onPress={onClose}
                style={({ pressed }) => ({
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: pressed ? COLORS.border : 'rgba(61,51,44,0.8)',
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                })}
              >
                <X size={16} color={COLORS.muted} strokeWidth={2.5} />
              </Pressable>
            </View>

            {/* Header */}
            <View style={{ alignItems: 'center', paddingHorizontal: 24, paddingBottom: 28, paddingTop: 8 }}>
              {/* RS logo mark */}
              <View
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 16,
                  backgroundColor: 'rgba(196,30,58,0.14)',
                  borderWidth: 1.5,
                  borderColor: 'rgba(196,30,58,0.38)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                  shadowColor: COLORS.red,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.25,
                  shadowRadius: 10,
                  elevation: 6,
                }}
              >
                <Text
                  style={{
                    color: COLORS.red,
                    fontSize: 24,
                    fontWeight: '900',
                    letterSpacing: -1,
                  }}
                >
                  RS
                </Text>
              </View>

              <Text
                style={{
                  color: COLORS.textLight,
                  fontSize: 18,
                  fontWeight: '900',
                  letterSpacing: 3,
                  marginBottom: 6,
                  textAlign: 'center',
                }}
              >
                RED STRING RESEARCH
              </Text>

              <Text
                style={{
                  color: COLORS.amber,
                  fontSize: 13,
                  fontWeight: '600',
                  letterSpacing: 1.2,
                  textAlign: 'center',
                  fontStyle: 'italic',
                }}
              >
                Every thread leads somewhere.
              </Text>
            </View>

            {/* Feature cards carousel */}
            <ScrollView
              ref={scrollRef}
              horizontal
              pagingEnabled={false}
              snapToInterval={CARD_WIDTH + CARD_PADDING}
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              contentContainerStyle={{
                paddingHorizontal: CARD_PADDING / 2,
              }}
              style={{ flexGrow: 0 }}
            >
              {FEATURES.map((feature, index) => (
                <FeatureCardItem key={feature.name} feature={feature} index={index} />
              ))}
            </ScrollView>

            {/* Dot indicators */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 7,
                paddingTop: 20,
                paddingBottom: 12,
              }}
            >
              {FEATURES.map((_, i) => (
                <View
                  key={i}
                  style={{
                    width: i === activeIndex ? 20 : 7,
                    height: 7,
                    borderRadius: 4,
                    backgroundColor: i === activeIndex ? COLORS.red : COLORS.border,
                    opacity: i === activeIndex ? 1 : 0.7,
                  }}
                />
              ))}
            </View>

            {/* Swipe hint */}
            <Text
              style={{
                color: COLORS.muted,
                fontSize: 12,
                textAlign: 'center',
                letterSpacing: 0.5,
                marginBottom: 20,
                fontWeight: '500',
              }}
            >
              Swipe to explore features
            </Text>

            {/* Get Started button */}
            <View style={{ paddingHorizontal: 24, paddingBottom: 8 }}>
              <Pressable
                testID="video-onboarding-get-started"
                onPress={onClose}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? '#A3162E' : COLORS.red,
                  borderRadius: 16,
                  paddingVertical: 17,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: COLORS.red,
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.4,
                  shadowRadius: 14,
                  elevation: 8,
                })}
              >
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: 17,
                    fontWeight: '900',
                    letterSpacing: 1,
                  }}
                >
                  Get Started
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}


# mobile/src/components/WarRoomEntry.tsx

import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Video } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/api';
import { useSession } from '@/lib/auth/use-session';
import useInvestigationStore from '@/lib/state/investigation-store';

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

interface WarRoom {
  id: string;
  ownerId: string;
  title: string;
  status: string;
  isOwner: boolean;
  dailyRoomUrl: string;
  dailyRoomName: string;
  sessionId: string | null;
}

interface Props {
  collabSessionId?: string;
  size?: 'sm' | 'md';
}

export default function WarRoomEntry({ collabSessionId, size = 'sm' }: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const activeId = useInvestigationStore((s) => s.activeInvestigationId);
  const investigations = useInvestigationStore((s) => s.investigations);
  const activeInvestigation = investigations.find((i) => i.id === activeId) ?? investigations[0];

  const { data: existingRoom, isLoading: checkingRoom } = useQuery({
    queryKey: ['war-room-session', collabSessionId],
    queryFn: () => api.get<WarRoom | null>(`/api/warroom/rooms/session/${collabSessionId}`),
    enabled: !!collabSessionId && !!session?.user,
    retry: false,
  });

  const createRoomMutation = useMutation({
    mutationFn: () =>
      api.post<{ roomUrl: string; roomName: string; warRoomId: string }>('/api/warroom/rooms', {
        title: activeInvestigation?.title ? `${activeInvestigation.title} — War Room` : 'War Room',
        sessionId: collabSessionId ?? undefined,
      }),
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push({ pathname: '/war-room', params: { warRoomId: data.warRoomId, collabSessionId: collabSessionId ?? '' } });
    },
    onError: () => {
      router.push({ pathname: '/war-room', params: { warRoomId: 'unconfigured' } });
    },
  });

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!session?.user) return;
    if (existingRoom?.id) {
      router.push({ pathname: '/war-room', params: { warRoomId: existingRoom.id, collabSessionId: collabSessionId ?? '' } });
      return;
    }
    createRoomMutation.mutate();
  };

  const isLoading = createRoomMutation.isPending || checkingRoom;
  const label = existingRoom?.id ? 'Join War Room' : 'Open War Room';

  if (size === 'md') {
    return (
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          backgroundColor: pressed ? '#A3162E' : C.red,
          borderRadius: 14,
          paddingVertical: 15,
          marginBottom: 14,
          shadowColor: C.red,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.45,
          shadowRadius: 14,
          elevation: 8,
        })}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFF" size="small" />
        ) : (
          <>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
              <Video size={16} color="#FFF" strokeWidth={2.5} />
            </View>
            <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800', letterSpacing: 0.3 }}>{label}</Text>
            <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#FF6B6B' }} />
          </>
        )}
      </Pressable>
    );
  }

  // sm — compact header pill
  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: pressed ? '#A3162E' : C.red,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 7,
        shadowColor: C.red,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 4,
      })}
    >
      {isLoading ? (
        <ActivityIndicator color="#FFF" size="small" style={{ width: 14, height: 14 }} />
      ) : (
        <Video size={13} color="#FFF" strokeWidth={2.5} />
      )}
      <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '800', letterSpacing: 0.5 }}>WAR ROOM</Text>
    </Pressable>
  );
}


# mobile/src/components/WhatsNewModal.tsx

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { X } from 'lucide-react-native';

const C = {
  bg: '#1A1614',
  surface: '#231F1C',
  red: '#C41E3A',
  amber: '#D4A574',
  text: '#E8DCC8',
  muted: '#9B8B7E',
  border: '#3D332C',
} as const;

const APP_VERSION = '2.0';
const WHATS_NEW_SEEN_KEY = 'whats_new_seen_version';

interface FeatureEntry {
  icon: string;
  title: string;
  description: string;
}

const FEATURES: FeatureEntry[] = [
  {
    icon: '🔴',
    title: 'Curved Bezier Strings',
    description: 'Connections now flow as organic curves. Change color, thickness, and style per string.',
  },
  {
    icon: '🗺️',
    title: 'Mind Map Mode',
    description: 'Toggle to a neural network view. Nodes radiate from the most-connected center.',
  },
  {
    icon: '⏱️',
    title: 'Investigation Timeline',
    description: 'Pin evidence to exact dates. Multiple timelines per person. Expandable to minute-level precision.',
  },
  {
    icon: '🎨',
    title: 'AI Color Suggestions',
    description: 'AI analyzes your canvas and recommends a color-coding system based on people, places, and patterns.',
  },
  {
    icon: '📎',
    title: 'Source Attribution',
    description: 'Credit every source. Chain-of-custody tracking. Export full citations.',
  },
  {
    icon: '📬',
    title: 'Tip Inbox',
    description: 'Receive anonymous tips. AI vets credibility. Reply securely. Merge to canvas.',
  },
  {
    icon: '👥',
    title: 'Collaboration',
    description: 'Invite investigators with permission tiers. Approve contributions. Full attribution.',
  },
];

interface WhatsNewModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function WhatsNewModal({ visible, onClose }: WhatsNewModalProps) {
  const translateY = useSharedValue(60);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 20, stiffness: 240 });
      opacity.value = withTiming(1, { duration: 250 });
    } else {
      translateY.value = withTiming(60, { duration: 200 });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible, translateY, opacity]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.72)',
          justifyContent: 'flex-end',
        }}
        onPress={handleClose}
      >
        <Animated.View
          style={[
            {
              backgroundColor: C.surface,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              borderTopWidth: 3,
              borderTopColor: C.red,
              borderWidth: 1,
              borderColor: C.border,
              maxHeight: '88%',
              overflow: 'hidden',
            },
            sheetStyle,
          ]}
        >
          <Pressable onPress={() => {}}>
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 22,
                paddingTop: 22,
                paddingBottom: 16,
                borderBottomWidth: 1,
                borderBottomColor: C.border,
              }}
            >
              <View>
                <Text
                  style={{
                    color: C.text,
                    fontSize: 22,
                    fontWeight: '800',
                    letterSpacing: 0.3,
                  }}
                >
                  What's New in Red String
                </Text>
                <View
                  style={{
                    backgroundColor: C.red + '22',
                    borderRadius: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    alignSelf: 'flex-start',
                    marginTop: 4,
                    borderWidth: 1,
                    borderColor: C.red + '44',
                  }}
                >
                  <Text
                    style={{
                      color: C.red,
                      fontSize: 12,
                      fontWeight: '700',
                      letterSpacing: 1,
                    }}
                  >
                    v{APP_VERSION}
                  </Text>
                </View>
              </View>
              <Pressable
                testID="whats-new-close-button"
                onPress={handleClose}
                style={({ pressed }) => ({
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: pressed ? C.border : C.bg,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: C.border,
                })}
              >
                <X size={16} color={C.muted} strokeWidth={2} />
              </Pressable>
            </View>

            {/* Feature list */}
            <ScrollView
              contentContainerStyle={{ padding: 22, paddingBottom: 48 }}
              showsVerticalScrollIndicator={false}
            >
              {FEATURES.map((feature, index) => (
                <Animated.View
                  key={feature.title}
                  entering={undefined}
                  style={{
                    flexDirection: 'row',
                    gap: 14,
                    marginBottom: index < FEATURES.length - 1 ? 20 : 0,
                    alignItems: 'flex-start',
                  }}
                >
                  {/* Icon */}
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      backgroundColor: C.bg,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: C.border,
                      flexShrink: 0,
                    }}
                  >
                    <Text style={{ fontSize: 20 }}>{feature.icon}</Text>
                  </View>

                  {/* Text */}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: C.text,
                        fontSize: 15,
                        fontWeight: '700',
                        marginBottom: 4,
                      }}
                    >
                      {feature.title}
                    </Text>
                    <Text
                      style={{
                        color: C.muted,
                        fontSize: 14,
                        lineHeight: 20,
                      }}
                    >
                      {feature.description}
                    </Text>
                  </View>
                </Animated.View>
              ))}
            </ScrollView>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

export async function shouldShowWhatsNew(): Promise<boolean> {
  try {
    const seen = await AsyncStorage.getItem(WHATS_NEW_SEEN_KEY);
    return seen !== APP_VERSION;
  } catch {
    return false;
  }
}

export async function markWhatsNewSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(WHATS_NEW_SEEN_KEY, APP_VERSION);
  } catch {
    // ignore
  }
}


# mobile/src/lib/api/api.ts

import { fetch } from "expo/fetch";
import { authClient } from "../auth/auth-client";

// Response envelope type - all app routes return { data: T }
interface ApiResponse<T> {
  data: T;
}

const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL!;

const request = async <T>(
  url: string,
  options: { method?: string; body?: string } = {}
): Promise<T> => {
  const headers: Record<string, string> = {};
  if (options.body) {
    headers["Content-Type"] = "application/json";
  }
  // Attach auth cookie for authenticated requests
  const cookie = authClient.getCookie();
  if (cookie) {
    headers["Cookie"] = cookie;
  }

  const response = await fetch(`${baseUrl}${url}`, {
    ...options,
    credentials: "include",
    headers,
  });

  // 1. Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  // 2. JSON responses: parse and unwrap { data }
  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    const json = await response.json() as any;
    if (!response.ok) {
      const message = json?.error?.message ?? `Request failed with status ${response.status}`;
      throw new Error(message);
    }
    return (json as ApiResponse<T>).data;
  }

  // 3. Non-JSON: throw on error status
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return undefined as T;
};

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body: any) =>
    request<T>(url, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(url: string, body: any) =>
    request<T>(url, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(url: string) => request<T>(url, { method: "DELETE" }),
  patch: <T>(url: string, body: any) =>
    request<T>(url, { method: "PATCH", body: JSON.stringify(body) }),
};


# mobile/src/lib/auth/auth-client.ts

import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import { phoneNumberClient } from "better-auth/client/plugins";
import * as SecureStore from "expo-secure-store";

export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_BACKEND_URL! as string,
  plugins: [
    expoClient({
      scheme: "vibecode",
      storagePrefix: "vibecode",
      storage: SecureStore,
    }),
    phoneNumberClient(),
  ],
});


# mobile/src/lib/auth/use-session.ts

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "./auth-client";

export const SESSION_QUERY_KEY = ["auth-session"] as const;

export const useSession = () => {
  return useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: async () => {
      const result = await authClient.getSession();
      return result.data ?? null;
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useInvalidateSession = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
};


# mobile/src/lib/cn.ts

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}


# mobile/src/lib/colorSuggestions.ts

// Color Suggestion Engine — pure local logic, no AI needed
import type { Investigation, CanvasNode, TagColor } from './types';

export const TAG_COLORS_MAP: Record<TagColor, string> = {
  red: '#C41E3A',
  blue: '#3B82F6',
  green: '#22C55E',
  amber: '#F59E0B',
  purple: '#A855F7',
  teal: '#14B8A6',
};

// The 6 canonical colors in order — maps to TagColor keys
export const SUGGESTION_PALETTE: Array<{ hex: string; key: TagColor }> = [
  { hex: '#C41E3A', key: 'red' },
  { hex: '#3B82F6', key: 'blue' },
  { hex: '#22C55E', key: 'green' },
  { hex: '#F59E0B', key: 'amber' },
  { hex: '#A855F7', key: 'purple' },
  { hex: '#14B8A6', key: 'teal' },
];

export interface ColorSuggestion {
  color: string;         // hex
  colorKey: TagColor;
  label: string;
  reason: string;
  affectedNodeIds: string[];
  affectedStringIds: string[];
}

// Months for date detection
const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
  'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
];

// Organization suffixes
const ORG_SUFFIXES = [
  'inc', 'inc.', 'corp', 'corp.', 'llc', 'ltd', 'ltd.', 'co.', 'company',
  'organization', 'organisation', 'agency', 'department', 'dept', 'bureau',
  'foundation', 'institute', 'authority', 'commission', 'council', 'group',
  'international', 'enterprises', 'associates', 'solutions', 'services',
];

// Location indicator words
const LOCATION_WORDS = [
  'at', 'in', 'near', 'location', 'located', 'address', 'street', 'avenue',
  'road', 'drive', 'blvd', 'boulevard', 'place', 'plaza', 'building', 'floor',
  'city', 'town', 'state', 'country', 'district', 'region', 'area', 'zone',
  'north', 'south', 'east', 'west', 'downtown', 'uptown', 'suburb',
];

function getNodeText(node: CanvasNode): string {
  return [node.title, node.content, node.description].filter(Boolean).join(' ');
}

// Extract capitalized multi-word tokens (potential names/places)
function extractCapitalizedTokens(text: string): string[] {
  const tokens: string[] = [];
  // Match sequences of capitalized words (1 or more)
  const matches = text.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g);
  if (matches) {
    for (const m of matches) {
      // Skip very common capitalized words at start of sentences
      const lower = m.toLowerCase();
      if (!MONTHS.includes(lower) && m.length > 2) {
        tokens.push(m);
      }
    }
  }
  return tokens;
}

// Detect if text has date-like patterns
function hasDateContent(text: string): boolean {
  const lower = text.toLowerCase();
  // MM/DD/YYYY or YYYY-MM-DD
  if (/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/.test(text)) return true;
  // Month names
  if (MONTHS.some((m) => lower.includes(m))) return true;
  // "in 2020", "year 1999"
  if (/\b(19|20)\d{2}\b/.test(text)) return true;
  return false;
}

// Detect organization keywords
function hasOrgContent(text: string): boolean {
  const lower = text.toLowerCase();
  return ORG_SUFFIXES.some((suffix) => {
    const pattern = new RegExp(`\\b${suffix.replace('.', '\\.')}\\b`);
    return pattern.test(lower);
  });
}

// Detect location keywords
function hasLocationContent(text: string): boolean {
  const lower = text.toLowerCase();
  return LOCATION_WORDS.some((word) => lower.includes(word));
}

// BFS to find all clusters of interconnected nodes
function findClusters(
  nodes: CanvasNode[],
  strings: Investigation['strings']
): string[][] {
  const adjacency = new Map<string, Set<string>>();
  for (const node of nodes) {
    adjacency.set(node.id, new Set());
  }
  for (const s of strings) {
    adjacency.get(s.fromNodeId)?.add(s.toNodeId);
    adjacency.get(s.toNodeId)?.add(s.fromNodeId);
  }

  const visited = new Set<string>();
  const clusters: string[][] = [];

  for (const node of nodes) {
    if (visited.has(node.id)) continue;
    const cluster: string[] = [];
    const queue: string[] = [node.id];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      cluster.push(current);
      const neighbors = adjacency.get(current) ?? new Set<string>();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push(neighbor);
        }
      }
    }
    if (cluster.length >= 2) {
      clusters.push(cluster);
    }
  }

  return clusters;
}

// Find strings connecting a set of node IDs
function stringsForNodeSet(
  nodeIds: string[],
  strings: Investigation['strings']
): string[] {
  const nodeSet = new Set(nodeIds);
  return strings
    .filter((s) => nodeSet.has(s.fromNodeId) && nodeSet.has(s.toNodeId))
    .map((s) => s.id);
}

export function generateColorSuggestions(investigation: Investigation): ColorSuggestion[] {
  const { nodes, strings } = investigation;
  if (nodes.length === 0) return [];

  const suggestions: ColorSuggestion[] = [];
  const usedColorIndices = new Set<number>();
  const usedNodeIds = new Set<string>();

  function nextColor(): { hex: string; key: TagColor } | null {
    for (let i = 0; i < SUGGESTION_PALETTE.length; i++) {
      if (!usedColorIndices.has(i)) {
        usedColorIndices.add(i);
        return SUGGESTION_PALETTE[i];
      }
    }
    return null;
  }

  // ---- 1. Detect people/names ----
  // Build a frequency map of capitalized tokens across all nodes
  const tokenNodeMap = new Map<string, Set<string>>(); // token -> set of nodeIds

  for (const node of nodes) {
    const text = getNodeText(node);
    const tokens = extractCapitalizedTokens(text);
    for (const token of tokens) {
      const key = token.toLowerCase();
      if (!tokenNodeMap.has(key)) tokenNodeMap.set(key, new Set());
      tokenNodeMap.get(key)!.add(node.id);
    }
  }

  // Find tokens appearing in 2+ nodes — likely names
  const nameMatches: Array<{ name: string; nodeIds: string[] }> = [];
  for (const [token, nodeIds] of tokenNodeMap.entries()) {
    if (nodeIds.size >= 2) {
      // Reconstruct original casing from first occurrence
      let originalName = token;
      for (const node of nodes) {
        const text = getNodeText(node);
        const matches = text.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g);
        if (matches) {
          const found = matches.find((m) => m.toLowerCase() === token);
          if (found) { originalName = found; break; }
        }
      }
      nameMatches.push({ name: originalName, nodeIds: Array.from(nodeIds) });
    }
  }

  // Group overlapping name matches into person clusters
  if (nameMatches.length > 0) {
    // Collect all affected node IDs across all name matches
    const allNameNodeIds = new Set<string>();
    const nameList: string[] = [];
    for (const m of nameMatches.slice(0, 5)) {
      m.nodeIds.forEach((id) => allNameNodeIds.add(id));
      nameList.push(m.name);
    }

    const color = nextColor();
    if (color && allNameNodeIds.size >= 2) {
      const nodeIds = Array.from(allNameNodeIds);
      suggestions.push({
        color: color.hex,
        colorKey: color.key,
        label: 'People',
        reason: `Detected names: ${nameList.slice(0, 3).join(', ')}${nameList.length > 3 ? ` +${nameList.length - 3} more` : ''} — found in ${nodeIds.length} node${nodeIds.length === 1 ? '' : 's'}`,
        affectedNodeIds: nodeIds,
        affectedStringIds: stringsForNodeSet(nodeIds, strings),
      });
      nodeIds.forEach((id) => usedNodeIds.add(id));
    }
  }

  // ---- 2. Detect locations ----
  const locationNodeIds = nodes
    .filter((n) => hasLocationContent(getNodeText(n)))
    .map((n) => n.id);

  if (locationNodeIds.length >= 2) {
    const color = nextColor();
    if (color) {
      suggestions.push({
        color: color.hex,
        colorKey: color.key,
        label: 'Locations',
        reason: `Found location keywords in ${locationNodeIds.length} node${locationNodeIds.length === 1 ? '' : 's'}`,
        affectedNodeIds: locationNodeIds,
        affectedStringIds: stringsForNodeSet(locationNodeIds, strings),
      });
      locationNodeIds.forEach((id) => usedNodeIds.add(id));
    }
  }

  // ---- 3. Detect dates/timeline items ----
  const timelineNodeIds = nodes
    .filter((n) => hasDateContent(getNodeText(n)) || n.timestamp != null)
    .map((n) => n.id);

  if (timelineNodeIds.length >= 2) {
    const color = nextColor();
    if (color) {
      suggestions.push({
        color: color.hex,
        colorKey: color.key,
        label: 'Timeline Events',
        reason: `Found date references or timestamps in ${timelineNodeIds.length} node${timelineNodeIds.length === 1 ? '' : 's'}`,
        affectedNodeIds: timelineNodeIds,
        affectedStringIds: stringsForNodeSet(timelineNodeIds, strings),
      });
      timelineNodeIds.forEach((id) => usedNodeIds.add(id));
    }
  }

  // ---- 4. Detect organizations ----
  const orgNodeIds = nodes
    .filter((n) => hasOrgContent(getNodeText(n)))
    .map((n) => n.id);

  if (orgNodeIds.length >= 2) {
    const color = nextColor();
    if (color) {
      suggestions.push({
        color: color.hex,
        colorKey: color.key,
        label: 'Organizations',
        reason: `Found organization identifiers in ${orgNodeIds.length} node${orgNodeIds.length === 1 ? '' : 's'}`,
        affectedNodeIds: orgNodeIds,
        affectedStringIds: stringsForNodeSet(orgNodeIds, strings),
      });
      orgNodeIds.forEach((id) => usedNodeIds.add(id));
    }
  }

  // ---- 5. Detect node type clusters (links, images) ----
  const linkNodes = nodes.filter((n) => n.type === 'link').map((n) => n.id);
  if (linkNodes.length >= 3) {
    const color = nextColor();
    if (color) {
      suggestions.push({
        color: color.hex,
        colorKey: color.key,
        label: 'Sources & Links',
        reason: `${linkNodes.length} link-type nodes found`,
        affectedNodeIds: linkNodes,
        affectedStringIds: stringsForNodeSet(linkNodes, strings),
      });
      linkNodes.forEach((id) => usedNodeIds.add(id));
    }
  }

  const imageNodes = nodes.filter((n) => n.type === 'image').map((n) => n.id);
  if (imageNodes.length >= 3 && suggestions.length < 6) {
    const color = nextColor();
    if (color) {
      suggestions.push({
        color: color.hex,
        colorKey: color.key,
        label: 'Images & Media',
        reason: `${imageNodes.length} image-type nodes found`,
        affectedNodeIds: imageNodes,
        affectedStringIds: stringsForNodeSet(imageNodes, strings),
      });
      imageNodes.forEach((id) => usedNodeIds.add(id));
    }
  }

  // ---- 6. Detect connected clusters (BFS) — fill remaining slots ----
  if (suggestions.length < 6) {
    const clusters = findClusters(nodes, strings);
    // Sort by size descending, skip already-covered nodes
    const scoredClusters = clusters
      .map((cluster) => ({
        cluster,
        newNodes: cluster.filter((id) => !usedNodeIds.has(id)),
      }))
      .filter(({ newNodes }) => newNodes.length >= 2)
      .sort((a, b) => b.newNodes.length - a.newNodes.length);

    for (const { cluster, newNodes } of scoredClusters) {
      if (suggestions.length >= 6) break;
      const color = nextColor();
      if (!color) break;
      // Try to infer a label from tags on the cluster nodes
      const tagLabels: string[] = [];
      for (const nodeId of cluster) {
        const node = nodes.find((n) => n.id === nodeId);
        if (node) {
          for (const tag of node.tags) {
            if (!tagLabels.includes(tag.label)) tagLabels.push(tag.label);
          }
        }
      }
      const label = tagLabels.length > 0
        ? tagLabels.slice(0, 2).join(' / ')
        : `Cluster (${cluster.length} nodes)`;

      suggestions.push({
        color: color.hex,
        colorKey: color.key,
        label,
        reason: `${cluster.length} interconnected nodes — ${newNodes.length} not yet categorized`,
        affectedNodeIds: newNodes,
        affectedStringIds: stringsForNodeSet(cluster, strings),
      });
      newNodes.forEach((id) => usedNodeIds.add(id));
    }
  }

  // Sort by most nodes affected first
  return suggestions
    .sort((a, b) => b.affectedNodeIds.length - a.affectedNodeIds.length)
    .slice(0, 6);
}


# mobile/src/lib/demoData.ts

import type { Investigation, CanvasNode, RedString, Timeline, ColorLegendEntry } from '@/lib/types';

function demoId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function makeNode(overrides: Partial<CanvasNode> & {
  id: string;
  title: string;
  position: { x: number; y: number };
}): CanvasNode {
  const now = Date.now();
  return {
    type: 'note',
    description: '',
    size: { width: 160, height: 100 },
    tags: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeString(
  id: string,
  fromNodeId: string,
  toNodeId: string,
  label: string,
  color: string,
  thickness?: number,
  style?: 'solid' | 'dashed' | 'dotted'
): RedString {
  return {
    id,
    fromNodeId,
    toNodeId,
    label,
    color,
    thickness: thickness ?? 2,
    style: style ?? 'solid',
    createdAt: Date.now(),
  };
}

export function createDemoInvestigation(): Investigation {
  const now = Date.now();

  // Node IDs
  const n001 = 'demo-node-001';
  const n002 = 'demo-node-002';
  const n003 = 'demo-node-003';
  const n004 = 'demo-node-004';
  const n005 = 'demo-node-005';
  const n006 = 'demo-node-006';
  const n007 = 'demo-node-007';
  const n008 = 'demo-node-008';
  const n009 = 'demo-node-009';
  const n010 = 'demo-node-010';
  const n011 = 'demo-node-011';
  const n012 = 'demo-node-012';
  const n013 = 'demo-node-013';
  const n014 = 'demo-node-014';
  const n015 = 'demo-node-015';

  const nodes: CanvasNode[] = [
    makeNode({
      id: n001,
      type: 'note',
      title: 'John Mercer',
      content: 'Senior executive at Nexus Capital. Traveled to Geneva 3x in Q3. Known associate of Viktor Sokolov.',
      color: 'red',
      tags: [{ id: demoId(), label: 'Suspect', color: 'red' }],
      position: { x: 400, y: 300 },
      sources: [{
        id: demoId(),
        sourceType: 'x_user',
        sourceName: '@investigator_mike',
        platform: 'x',
        credibility: 'secondary',
        contentType: 'testimony',
        addedAt: now,
      }],
    }),
    makeNode({
      id: n002,
      type: 'note',
      title: 'Viktor Sokolov',
      content: 'Russian national. Shell company director. Named in 3 offshore leaks. Denied visa to UK in 2019.',
      color: 'red',
      tags: [{ id: demoId(), label: 'Suspect', color: 'red' }],
      position: { x: 750, y: 200 },
    }),
    makeNode({
      id: n003,
      type: 'note',
      title: 'Nexus Capital LLC',
      content: 'Registered in Delaware 2018. No public-facing employees. $47M in transactions traced to Cayman accounts.',
      color: 'purple',
      tags: [{ id: demoId(), label: 'Organization', color: 'purple' }],
      position: { x: 550, y: 500 },
    }),
    makeNode({
      id: n004,
      type: 'link',
      title: 'Cayman Registry Leak',
      url: 'https://example.com/leak',
      content: 'Leaked document showing Nexus Capital listed as beneficial owner of 3 shell entities.',
      color: 'green',
      tags: [{ id: demoId(), label: 'Evidence', color: 'green' }],
      position: { x: 900, y: 450 },
    }),
    makeNode({
      id: n005,
      type: 'note',
      title: 'Geneva Meeting — Sept 14',
      content: 'Mercer and Sokolov photographed outside Banque Privee Zurich. Third party unidentified.',
      color: 'amber',
      tags: [{ id: demoId(), label: 'Timeline', color: 'amber' }],
      timestamp: new Date('2024-09-14').getTime(),
      position: { x: 300, y: 600 },
    }),
    makeNode({
      id: n006,
      type: 'note',
      title: 'Media Holdings Group',
      content: 'Parent company of 4 regional news outlets. Purchased in 2020 by anonymous trust. Editorial direction shifted post-acquisition.',
      color: 'purple',
      tags: [{ id: demoId(), label: 'Organization', color: 'purple' }],
      position: { x: 1100, y: 300 },
    }),
    makeNode({
      id: n007,
      type: 'note',
      title: 'Sarah Chen — Whistleblower',
      content: 'Former compliance officer at Nexus. Claims she was fired after flagging suspicious transfers. Testimony given Oct 2024.',
      color: 'blue',
      tags: [{ id: demoId(), label: 'Source', color: 'blue' }],
      position: { x: 150, y: 450 },
      sources: [{
        id: demoId(),
        sourceType: 'person',
        sourceName: 'Sarah Chen',
        contentType: 'testimony',
        credibility: 'primary',
        addedAt: now,
      }],
    }),
    makeNode({
      id: n008,
      type: 'image',
      title: 'Financial Flow Diagram',
      content: 'Wire transfer pattern: Nexus to 3 shell companies to Media Holdings. Estimated $12M over 18 months.',
      color: 'green',
      position: { x: 700, y: 650 },
    }),
    makeNode({
      id: n009,
      type: 'note',
      title: 'Epoch Times Article — Nov 3',
      content: 'Reports unnamed sources confirming Treasury investigation into offshore flows. Mercer named as person of interest.',
      color: 'green',
      tags: [{ id: demoId(), label: 'Confirmed', color: 'green' }],
      timestamp: new Date('2024-11-03').getTime(),
      sources: [{
        id: demoId(),
        sourceType: 'url',
        sourceName: 'Epoch Times',
        platform: 'website',
        sourceUrl: 'https://example.com',
        credibility: 'secondary',
        contentType: 'article',
        addedAt: now,
      }],
      position: { x: 1000, y: 150 },
    }),
    makeNode({
      id: n010,
      type: 'note',
      title: 'Anonymous Tip — Oct 28',
      content: 'Tipper claims third person in Geneva photo is a sitting EU parliament member. Cannot verify identity yet.',
      color: 'amber',
      tags: [{ id: demoId(), label: 'Unverified', color: 'amber' }],
      sources: [{
        id: demoId(),
        sourceType: 'tip',
        sourceName: 'Anonymous',
        credibility: 'unverified',
        contentType: 'tip',
        addedAt: now,
      }],
      position: { x: 500, y: 800 },
    }),
    makeNode({
      id: n011,
      type: 'folder',
      title: 'Financial Documents',
      content: 'Folder containing all financial evidence: bank records, wire transfers, corporate registries.',
      position: { x: 1200, y: 550 },
    }),
    makeNode({
      id: n012,
      type: 'note',
      title: 'EU Parliament Connection?',
      content: 'Cross-referencing Geneva visitor logs with parliament session records for Sept 14. Gap in attendance unexplained.',
      color: 'amber',
      tags: [{ id: demoId(), label: 'Lead', color: 'amber' }],
      position: { x: 350, y: 900 },
    }),
    makeNode({
      id: n013,
      type: 'link',
      title: 'Delaware Corp Registry',
      url: 'https://example.com/delaware',
      content: 'Nexus Capital registration documents. Registered agent: Blank & Associates LLC.',
      color: 'green',
      tags: [{ id: demoId(), label: 'Evidence', color: 'green' }],
      position: { x: 900, y: 700 },
    }),
    makeNode({
      id: n014,
      type: 'dataset',
      title: 'Transaction Log Q3 2024',
      content: '47 flagged transactions. 12 over $500K. All originating from accounts linked to Sokolov-adjacent entities.',
      color: 'blue',
      tags: [{ id: demoId(), label: 'Data', color: 'blue' }],
      position: { x: 1150, y: 700 },
    }),
    makeNode({
      id: n015,
      type: 'note',
      title: 'KEY QUESTION',
      content: 'Who is the third person in the Geneva photo? This is the missing link between the financial network and political influence.',
      color: 'red',
      tags: [{ id: demoId(), label: 'Priority', color: 'red' }],
      position: { x: 650, y: 950 },
    }),
  ];

  const strings: RedString[] = [
    makeString(demoId(), n001, n002, 'Known Associates', '#C41E3A', 3),
    makeString(demoId(), n001, n003, 'Executive', '#C41E3A'),
    makeString(demoId(), n002, n003, 'Director', '#C41E3A'),
    makeString(demoId(), n003, n004, 'Beneficial Owner', '#22C55E'),
    makeString(demoId(), n003, n006, 'Funds Flow', '#F59E0B', 3, 'dashed'),
    makeString(demoId(), n001, n005, 'Attended', '#F59E0B'),
    makeString(demoId(), n002, n005, 'Attended', '#F59E0B'),
    makeString(demoId(), n007, n003, 'Reported On', '#3B82F6'),
    makeString(demoId(), n008, n003, 'Documents', '#22C55E'),
    makeString(demoId(), n009, n001, 'Named', '#22C55E'),
    makeString(demoId(), n010, n005, 'Unverified Lead', '#F59E0B', 2, 'dotted'),
    makeString(demoId(), n015, n005, 'Mystery Person', '#C41E3A', 3),
  ];

  const timelines: Timeline[] = [
    {
      id: demoId(),
      label: 'MAIN TIMELINE',
      color: '#C41E3A',
      startYear: 2018,
      endYear: 2025,
      isMinimized: false,
      createdAt: now,
    },
    {
      id: demoId(),
      label: 'JOHN MERCER',
      color: '#3B82F6',
      startYear: 2020,
      endYear: 2025,
      isMinimized: true,
      createdAt: now,
    },
  ];

  const colorLegend: ColorLegendEntry[] = [
    { color: '#C41E3A', label: 'Suspects' },
    { color: '#3B82F6', label: 'Sources' },
    { color: '#22C55E', label: 'Confirmed Evidence' },
    { color: '#F59E0B', label: 'Leads / Timeline' },
    { color: '#A855F7', label: 'Organizations' },
    { color: '#14B8A6', label: 'Unverified' },
  ];

  return {
    id: 'demo-investigation',
    title: 'Operation: Shadow Network',
    description: 'Tracking the financial connections between offshore entities, media organizations, and political figures across 3 continents.',
    nodes,
    strings,
    timelines,
    colorLegend,
    isDemo: true,
    createdAt: now,
    updatedAt: now,
  };
}


# mobile/src/lib/revenuecatClient.ts

/**
 * RevenueCat Client Module
 *
 * This module provides a centralized RevenueCat SDK wrapper that gracefully handles
 * missing configuration. The app will work fine whether or not RevenueCat is configured.
 *
 * Environment Variables:
 * - EXPO_PUBLIC_VIBECODE_REVENUECAT_TEST_KEY: Used in development/test builds (both platforms)
 * - EXPO_PUBLIC_VIBECODE_REVENUECAT_APPLE_KEY: Used in production builds (iOS)
 * - EXPO_PUBLIC_VIBECODE_REVENUECAT_GOOGLE_KEY: Used in production builds (Android)
 * These are automatically injected into the workspace by the Vibecode service once the user sets up RevenueCat in the Payments tab.
 *
 * Platform Support:
 * - iOS/Android: Fully supported via app stores
 * - Web: Disabled (RevenueCat only supports native app stores)
 *
 * The module automatically selects the correct key based on __DEV__ mode.
 * 
 * This module is used to get the current customer info, offerings, and purchase packages.
 * These exported functions are found at the bottom of the file.
 */

import { Platform } from "react-native";
import Purchases, {
  type PurchasesOfferings,
  type CustomerInfo,
  type PurchasesPackage,
} from "react-native-purchases";

// Check if running on web
const isWeb = Platform.OS === "web";

// Check for environment keys
const testKey = process.env.EXPO_PUBLIC_VIBECODE_REVENUECAT_TEST_KEY;
const appleKey = process.env.EXPO_PUBLIC_VIBECODE_REVENUECAT_APPLE_KEY;
const googleKey = process.env.EXPO_PUBLIC_VIBECODE_REVENUECAT_GOOGLE_KEY;

// Use __DEV__ and Platform to determine which key to use
const getApiKey = (): string | undefined => {
  if (isWeb) return undefined;
  if (__DEV__) return testKey;

  // Production: use platform-specific key
  return Platform.OS === "ios" ? appleKey : googleKey;
};

const apiKey = getApiKey();

// Track if RevenueCat is enabled
const isEnabled = !!apiKey && !isWeb;

const LOG_PREFIX = "[RevenueCat]";

export type RevenueCatGuardReason =
  | "web_not_supported"
  | "not_configured"
  | "sdk_error";

export type RevenueCatResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: RevenueCatGuardReason; error?: unknown };

// Internal guard to get consistent success/failure results from RevenueCat.
const guardRevenueCatUsage = async <T>(
  action: string,
  operation: () => Promise<T>,
): Promise<RevenueCatResult<T>> => {
  if (isWeb) {
    console.log(
      `${LOG_PREFIX} ${action} skipped: payments are not supported on web.`,
    );
    return { ok: false, reason: "web_not_supported" };
  }

  if (!isEnabled) {
    console.log(`${LOG_PREFIX} ${action} skipped: RevenueCat not configured`);
    return { ok: false, reason: "not_configured" };
  }

  try {
    const data = await operation();
    return { ok: true, data };
  } catch (error) {
    console.log(`${LOG_PREFIX} ${action} failed:`, error);
    return { ok: false, reason: "sdk_error", error };
  }
};

// Initialize RevenueCat if key exists
if (isEnabled) {
  try {
    // Set up custom log handler to suppress Test Store and expected errors
    // These are non-errors thrown as errors by the SDK, and will be confusing to the user.
    Purchases.setLogHandler((logLevel, message) => {

      // Log ERROR messages normally
      if (logLevel === Purchases.LOG_LEVEL.ERROR) {
        console.log(LOG_PREFIX, message);
      }
    });

    Purchases.configure({ apiKey: apiKey! });
    console.log(`${LOG_PREFIX} SDK initialized successfully`);
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to initialize:`, error);
  }
}

/**
 * Check if RevenueCat is configured and enabled
 *
 * @returns true if RevenueCat is configured with valid API keys
 *
 * @example
 * if (isRevenueCatEnabled()) {
 *   // Show subscription features
 * } else {
 *   // Hide or disable subscription UI
 * }
 */
export const isRevenueCatEnabled = (): boolean => {
  return isEnabled;
};

/**
 * Get available offerings from RevenueCat
 *
 * @returns RevenueCatResult containing PurchasesOfferings data or a failure reason
 *
 * @example
 * const offeringsResult = await getOfferings();
 * if (offeringsResult.ok && offeringsResult.data.current) {
 *   // Display packages from offeringsResult.data.current.availablePackages
 * }
 */
export const getOfferings = (): Promise<
  RevenueCatResult<PurchasesOfferings>
> => {
  return guardRevenueCatUsage("getOfferings", () => Purchases.getOfferings());
};

/**
 * Purchase a package
 *
 * @param packageToPurchase - The package to purchase
 * @returns RevenueCatResult containing CustomerInfo data or a failure reason
 *
 * @example
 * const purchaseResult = await purchasePackage(selectedPackage);
 * if (purchaseResult.ok) {
 *   // Purchase successful, check entitlements
 * }
 */
export const purchasePackage = (
  packageToPurchase: PurchasesPackage,
): Promise<RevenueCatResult<CustomerInfo>> => {
  return guardRevenueCatUsage("purchasePackage", async () => {
    const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
    return customerInfo;
  });
};

/**
 * Get current customer info including active entitlements
 *
 * @returns RevenueCatResult containing CustomerInfo data or a failure reason
 *
 * @example
 * const customerInfoResult = await getCustomerInfo();
 * if (
 *   customerInfoResult.ok &&
 *   customerInfoResult.data.entitlements.active["premium"]
 * ) {
 *   // User has active premium entitlement
 * }
 */
export const getCustomerInfo = (): Promise<RevenueCatResult<CustomerInfo>> => {
  return guardRevenueCatUsage("getCustomerInfo", () =>
    Purchases.getCustomerInfo(),
  );
};

/**
 * Restore previous purchases
 *
 * @returns RevenueCatResult containing CustomerInfo data or a failure reason
 *
 * @example
 * const restoreResult = await restorePurchases();
 * if (restoreResult.ok) {
 *   // Purchases restored successfully
 * }
 */
export const restorePurchases = (): Promise<
  RevenueCatResult<CustomerInfo>
> => {
  return guardRevenueCatUsage("restorePurchases", () =>
    Purchases.restorePurchases(),
  );
};

/**
 * Set user ID for RevenueCat (useful for cross-platform user tracking)
 *
 * @param userId - The user ID to set
 * @returns RevenueCatResult<void> describing success/failure
 *
 * @example
 * const result = await setUserId(user.id);
 * if (!result.ok) {
 *   // Handle failure case
 * }
 */
export const setUserId = (userId: string): Promise<RevenueCatResult<void>> => {
  return guardRevenueCatUsage("setUserId", async () => {
    await Purchases.logIn(userId);
  });
};

/**
 * Log out the current user
 *
 * @returns RevenueCatResult<void> describing success/failure
 *
 * @example
 * const result = await logoutUser();
 * if (!result.ok) {
 *   // Handle failure case
 * }
 */
export const logoutUser = (): Promise<RevenueCatResult<void>> => {
  return guardRevenueCatUsage("logoutUser", async () => {
    await Purchases.logOut();
  });
};

/**
 * Check if user has a specific entitlement active
 *
 * @param entitlementId - The entitlement identifier (e.g., "premium", "pro")
 * @returns RevenueCatResult<boolean> describing entitlement state or failure
 *
 * @example
 * const premiumResult = await hasEntitlement("premium");
 * if (premiumResult.ok && premiumResult.data) {
 *   // Show premium features
 * }
 */
export const hasEntitlement = async (
  entitlementId: string,
): Promise<RevenueCatResult<boolean>> => {
  const customerInfoResult = await getCustomerInfo();

  if (!customerInfoResult.ok) {
    return {
      ok: false,
      reason: customerInfoResult.reason,
      error: customerInfoResult.error,
    };
  }

  const isActive = Boolean(
    customerInfoResult.data.entitlements.active?.[entitlementId],
  );
  return { ok: true, data: isActive };
};

/**
 * Check if user has any active subscription
 *
 * @returns RevenueCatResult<boolean> describing subscription state or failure
 *
 * @example
 * const subscriptionResult = await hasActiveSubscription();
 * if (subscriptionResult.ok && subscriptionResult.data) {
 *   // User is a paying subscriber
 * }
 */
export const hasActiveSubscription = async (): Promise<
  RevenueCatResult<boolean>
> => {
  const customerInfoResult = await getCustomerInfo();

  if (!customerInfoResult.ok) {
    return {
      ok: false,
      reason: customerInfoResult.reason,
      error: customerInfoResult.error,
    };
  }

  const hasSubscription =
    Object.keys(customerInfoResult.data.entitlements.active || {}).length > 0;
  return { ok: true, data: hasSubscription };
};

/**
 * Get a specific package from the current offering
 *
 * @param packageIdentifier - The package identifier (e.g., "$rc_monthly", "$rc_annual")
 * @returns RevenueCatResult containing the package (or null) or a failure reason
 *
 * @example
 * const packageResult = await getPackage("$rc_monthly");
 * if (packageResult.ok && packageResult.data) {
 *   // Display monthly subscription option
 * }
 */
export const getPackage = async (
  packageIdentifier: string,
): Promise<RevenueCatResult<PurchasesPackage | null>> => {
  const offeringsResult = await getOfferings();

  if (!offeringsResult.ok) {
    return {
      ok: false,
      reason: offeringsResult.reason,
      error: offeringsResult.error,
    };
  }

  const pkg =
    offeringsResult.data.current?.availablePackages.find(
      (availablePackage) => availablePackage.identifier === packageIdentifier,
    ) ?? null;

  return { ok: true, data: pkg };
};


# mobile/src/lib/state/appearance-store.ts

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { HeroTitleFont, AccentColorKey } from '@/lib/theme';

export interface AppearancePrefs {
  heroFont: HeroTitleFont;
  themeMode: 'dark' | 'sepia' | 'light';
  accentColor: AccentColorKey;
  corkIntensity: 0 | 1 | 2 | 3;
  tapeColor: string;
  pushpinColor: string;
  highlighterColor: string;
  fineLinkerColor: string;
}

const DEFAULTS: AppearancePrefs = {
  heroFont: 'playfair',
  themeMode: 'dark',
  accentColor: 'crimson',
  corkIntensity: 3,
  tapeColor: '#D4C5A9',
  pushpinColor: '#C8934A',
  highlighterColor: '#F59E0B',
  fineLinkerColor: '#C41E3A',
};

interface AppearanceStore extends AppearancePrefs {
  setHeroFont: (font: HeroTitleFont) => void;
  setThemeMode: (mode: 'dark' | 'sepia' | 'light') => void;
  setAccentColor: (color: AccentColorKey) => void;
  setCorkIntensity: (intensity: 0 | 1 | 2 | 3) => void;
  setTapeColor: (color: string) => void;
  setPushpinColor: (color: string) => void;
  setHighlighterColor: (color: string) => void;
  setFineLinkerColor: (color: string) => void;
  resetToDefaults: () => void;
}

const useAppearanceStore = create<AppearanceStore>()(
  persist(
    (set) => ({
      ...DEFAULTS,

      setHeroFont: (font) => set({ heroFont: font }),
      setThemeMode: (mode) => set({ themeMode: mode }),
      setAccentColor: (color) => set({ accentColor: color }),
      setCorkIntensity: (intensity) => set({ corkIntensity: intensity }),
      setTapeColor: (color) => set({ tapeColor: color }),
      setPushpinColor: (color) => set({ pushpinColor: color }),
      setHighlighterColor: (color) => set({ highlighterColor: color }),
      setFineLinkerColor: (color) => set({ fineLinkerColor: color }),
      resetToDefaults: () => set({ ...DEFAULTS }),
    }),
    {
      name: 'appearance-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useAppearanceStore;


# mobile/src/lib/state/collab-store.ts

import { create } from 'zustand';
import { api } from '@/lib/api/api';

export interface CollabMember {
  id: string;
  userId: string;
  permission: string;
  user: { name: string; email: string };
}

export interface CollabSession {
  id: string;
  investigationId: string;
  ownerId: string;
  title: string;
  members: CollabMember[];
  pendingCount: number;
  createdAt: string;
}

export interface PendingNode {
  id: string;
  contributorId: string;
  nodeData: any;
  status: string;
  createdAt: string;
  contributor?: { name: string; email: string };
}

interface CollabState {
  sessions: CollabSession[];
  activePendingNodes: PendingNode[];

  fetchSessions: () => Promise<void>;
  createSession: (investigationId: string, title: string, description?: string) => Promise<string>;
  sendInvite: (sessionId: string, email: string, permission: string) => Promise<string>;
  generateInviteLink: (sessionId: string, permission: string) => Promise<string>;
  submitNode: (sessionId: string, nodeData: any) => Promise<void>;
  fetchPendingNodes: (sessionId: string) => Promise<void>;
  approveNode: (sessionId: string, nodeId: string) => Promise<any>;
  rejectNode: (sessionId: string, nodeId: string, reason?: string) => Promise<void>;
}

const useCollabStore = create<CollabState>()((set) => ({
  sessions: [],
  activePendingNodes: [],

  fetchSessions: async () => {
    try {
      const sessions = await api.get<CollabSession[]>('/api/collab/sessions');
      set({ sessions: sessions ?? [] });
    } catch {
      // Silently fail — backend may not have collab routes yet
    }
  },

  createSession: async (investigationId, title, description) => {
    try {
      const session = await api.post<CollabSession>('/api/collab/sessions', {
        investigationId,
        title,
        description,
      });
      set((state) => ({ sessions: [...state.sessions, session] }));
      return session.id;
    } catch {
      return '';
    }
  },

  sendInvite: async (sessionId, email, permission) => {
    try {
      const result = await api.post<{ inviteLink: string }>('/api/collab/invites', {
        sessionId,
        email,
        permission,
      });
      return result?.inviteLink ?? '';
    } catch {
      return '';
    }
  },

  generateInviteLink: async (sessionId, permission) => {
    try {
      const result = await api.post<{ inviteLink: string }>('/api/collab/invites/link', {
        sessionId,
        permission,
      });
      return result?.inviteLink ?? '';
    } catch {
      return '';
    }
  },

  submitNode: async (sessionId, nodeData) => {
    try {
      await api.post('/api/collab/nodes', { sessionId, nodeData });
    } catch {
      // Silently fail
    }
  },

  fetchPendingNodes: async (sessionId) => {
    try {
      const nodes = await api.get<PendingNode[]>(`/api/collab/sessions/${sessionId}/pending`);
      set({ activePendingNodes: nodes ?? [] });
    } catch {
      set({ activePendingNodes: [] });
    }
  },

  approveNode: async (sessionId, nodeId) => {
    try {
      const result = await api.post<any>(`/api/collab/sessions/${sessionId}/nodes/${nodeId}/approve`, {});
      set((state) => ({
        activePendingNodes: state.activePendingNodes.filter((n) => n.id !== nodeId),
      }));
      return result;
    } catch {
      return null;
    }
  },

  rejectNode: async (sessionId, nodeId, reason) => {
    try {
      await api.post(`/api/collab/sessions/${sessionId}/nodes/${nodeId}/reject`, { reason });
      set((state) => ({
        activePendingNodes: state.activePendingNodes.filter((n) => n.id !== nodeId),
      }));
    } catch {
      // Silently fail
    }
  },
}));

export default useCollabStore;


# mobile/src/lib/state/example-state.ts

// This is an example of a Zustand store, use this for async storage.
// DO NOTE USE THIS FILE, create new ones in the state folder.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface RootStore {
  someData: number;
  addSomeData: () => void;
}

// Make sure to persist the store using the persist middleware.
const useRootStore = create<RootStore>()(
  persist(
    (set, get) => ({
      someData: 0,
      addSomeData: () => set({ someData: get().someData + 1 }),
    }),
    {
      name: "root-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useRootStore;


# mobile/src/lib/state/investigation-store.ts

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Investigation, CanvasNode, RedString, Timeline, Position, NodeType, TagColor, Tag, AISuggestion, ColorLegendEntry, NodeSource, AccessLogEntry, NodeSticker, ChatHistoryMessage } from '@/lib/types';
import { api } from '@/lib/api/api';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

const TIMELINE_COLORS = [
  '#C41E3A', '#3B82F6', '#22C55E', '#F59E0B',
  '#A855F7', '#14B8A6', '#F97316', '#EC4899',
];

interface InvestigationStore {
  investigations: Investigation[];
  activeInvestigationId: string | null;
  selectedNodeId: string | null;
  connectingFromId: string | null;
  viewMode: 'canvas' | 'list';
  canvasMode: 'corkboard' | 'mindmap';

  // Investigation CRUD
  createInvestigation: (title: string, description?: string) => string;
  deleteInvestigation: (id: string) => void;
  setActiveInvestigation: (id: string | null) => void;

  // Node CRUD
  addNode: (investigationId: string, type: NodeType, title: string, position: Position, extras?: Partial<CanvasNode>) => string;
  updateNode: (investigationId: string, nodeId: string, updates: Partial<CanvasNode>) => void;
  deleteNode: (investigationId: string, nodeId: string) => void;
  moveNode: (investigationId: string, nodeId: string, position: Position) => void;

  // Source CRUD
  addSource: (investigationId: string, nodeId: string, source: Omit<NodeSource, 'id' | 'addedAt'>) => void;
  updateSource: (investigationId: string, nodeId: string, sourceId: string, updates: Partial<NodeSource>) => void;
  removeSource: (investigationId: string, nodeId: string, sourceId: string) => void;

  // Red String CRUD
  addString: (investigationId: string, fromNodeId: string, toNodeId: string, label?: string, color?: string) => string;
  updateString: (investigationId: string, stringId: string, updates: Partial<RedString>) => void;
  deleteString: (investigationId: string, stringId: string) => void;

  // Timeline CRUD
  addTimeline: (investigationId: string, label: string) => string;
  updateTimeline: (investigationId: string, timelineId: string, updates: Partial<Timeline>) => void;
  deleteTimeline: (investigationId: string, timelineId: string) => void;
  toggleTimelineMinimized: (investigationId: string, timelineId: string) => void;

  // Selection
  setSelectedNode: (nodeId: string | null) => void;
  setConnectingFrom: (nodeId: string | null) => void;
  setViewMode: (mode: 'canvas' | 'list') => void;
  setCanvasMode: (mode: 'corkboard' | 'mindmap') => void;

  // Helpers
  getActiveInvestigation: () => Investigation | undefined;

  // Color Legend
  updateColorLegend: (investigationId: string, legend: ColorLegendEntry[]) => void;

  // Demo
  addDemoInvestigation: (investigation: Investigation) => void;
  removeDemoInvestigation: () => void;

  // Undo
  restoreInvestigation: (investigation: Investigation) => void;

  // ─── New actions ──────────────────────────────────────────────────────────
  updateInvestigationMeta: (id: string, updates: Pick<Investigation, 'icon' | 'iconUri' | 'boardStyle' | 'filingTabColor' | 'filingTabLabel'>) => void;
  setInvestigationPin: (id: string, pinHash: string) => void;
  logAccess: (id: string, entry: Omit<AccessLogEntry, 'id'>) => void;
  addSticker: (investigationId: string, nodeId: string, sticker: Omit<NodeSticker, 'id'>) => void;
  removeSticker: (investigationId: string, nodeId: string, stickerId: string) => void;
  toggleInvisibleInk: (investigationId: string, nodeId: string) => void;

  // ─── Chat history ──────────────────────────────────────────────────────────
  saveChatMessage: (investigationId: string, message: ChatHistoryMessage) => void;
  updateMessageFeedback: (investigationId: string, messageId: string, feedback: 'up' | 'down' | null) => void;
  updateChatMessage: (investigationId: string, messageId: string, updates: Partial<ChatHistoryMessage>) => void;
  clearChatHistory: (investigationId: string) => void;
}

const useInvestigationStore = create<InvestigationStore>()(
  persist(
    (set, get) => ({
      investigations: [],
      activeInvestigationId: null,
      selectedNodeId: null,
      connectingFromId: null,
      viewMode: 'canvas',
      canvasMode: 'corkboard',

      createInvestigation: (title, description) => {
        const id = generateId();
        const now = Date.now();
        const currentYear = new Date().getFullYear();
        const mainTimeline: Timeline = {
          id: generateId(),
          label: 'MAIN',
          color: '#C41E3A',
          startYear: 1900,
          endYear: currentYear,
          isMinimized: false,
          createdAt: now,
        };
        const investigation: Investigation = {
          id,
          title,
          description,
          nodes: [],
          strings: [],
          timelines: [mainTimeline],
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          investigations: [...state.investigations, investigation],
          activeInvestigationId: id,
        }));
        return id;
      },

      deleteInvestigation: (id) => {
        set((state) => ({
          investigations: state.investigations.filter((inv) => inv.id !== id),
          activeInvestigationId: state.activeInvestigationId === id ? null : state.activeInvestigationId,
        }));
      },

      setActiveInvestigation: (id) => {
        set({ activeInvestigationId: id, selectedNodeId: null, connectingFromId: null });
      },

      addNode: (investigationId, type, title, position, extras) => {
        const nodeId = generateId();
        const now = Date.now();
        const node: CanvasNode = {
          id: nodeId,
          type,
          title,
          position,
          size: { width: 180, height: 110 },
          tags: [],
          createdAt: now,
          updatedAt: now,
          ...extras,
        };
        set((state) => ({
          investigations: state.investigations.map((inv) =>
            inv.id === investigationId
              ? { ...inv, nodes: [...inv.nodes, node], updatedAt: now }
              : inv
          ),
        }));
        return nodeId;
      },

      updateNode: (investigationId, nodeId, updates) => {
        const now = Date.now();
        set((state) => ({
          investigations: state.investigations.map((inv) =>
            inv.id === investigationId
              ? {
                  ...inv,
                  nodes: inv.nodes.map((n) =>
                    n.id === nodeId ? { ...n, ...updates, updatedAt: now } : n
                  ),
                  updatedAt: now,
                }
              : inv
          ),
        }));
      },

      deleteNode: (investigationId, nodeId) => {
        const now = Date.now();
        set((state) => ({
          investigations: state.investigations.map((inv) =>
            inv.id === investigationId
              ? {
                  ...inv,
                  nodes: inv.nodes.filter((n) => n.id !== nodeId),
                  strings: (inv.strings ?? []).filter(
                    (s) => s.fromNodeId !== nodeId && s.toNodeId !== nodeId
                  ),
                  updatedAt: now,
                }
              : inv
          ),
          selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
        }));
      },

      moveNode: (investigationId, nodeId, position) => {
        set((state) => ({
          investigations: state.investigations.map((inv) =>
            inv.id === investigationId
              ? {
                  ...inv,
                  nodes: inv.nodes.map((n) =>
                    n.id === nodeId ? { ...n, position } : n
                  ),
                }
              : inv
          ),
        }));
      },

      addSource: (investigationId, nodeId, source) => {
        const sourceId = generateId();
        const now = Date.now();
        const newSource: NodeSource = {
          ...source,
          id: sourceId,
          addedAt: now,
        };
        set((state) => ({
          investigations: state.investigations.map((inv) =>
            inv.id === investigationId
              ? {
                  ...inv,
                  nodes: inv.nodes.map((n) =>
                    n.id === nodeId
                      ? { ...n, sources: [...(n.sources ?? []), newSource], updatedAt: now }
                      : n
                  ),
                  updatedAt: now,
                }
              : inv
          ),
        }));
        // Fire-and-forget sync to backend
        api.post('/api/sources', {
          investigationId,
          nodeId,
          sourceType: newSource.sourceType,
          sourceName: newSource.sourceName,
          sourceHandle: newSource.sourceHandle,
          sourceUrl: newSource.sourceUrl,
          sourceProfileUrl: newSource.sourceProfileUrl,
          platform: newSource.platform,
          contentType: newSource.contentType,
          contentSummary: newSource.contentSummary,
          secondarySourceName: newSource.secondarySourceName,
          secondarySourceUrl: newSource.secondarySourceUrl,
          credibility: newSource.credibility,
        }).catch(() => {/* ignore errors */});
      },

      updateSource: (investigationId, nodeId, sourceId, updates) => {
        const now = Date.now();
        set((state) => ({
          investigations: state.investigations.map((inv) =>
            inv.id === investigationId
              ? {
                  ...inv,
                  nodes: inv.nodes.map((n) =>
                    n.id === nodeId
                      ? {
                          ...n,
                          sources: (n.sources ?? []).map((s) =>
                            s.id === sourceId ? { ...s, ...updates } : s
                          ),
                          updatedAt: now,
                        }
                      : n
                  ),
                  updatedAt: now,
                }
              : inv
          ),
        }));
      },

      removeSource: (investigationId, nodeId, sourceId) => {
        const now = Date.now();
        set((state) => ({
          investigations: state.investigations.map((inv) =>
            inv.id === investigationId
              ? {
                  ...inv,
                  nodes: inv.nodes.map((n) =>
                    n.id === nodeId
                      ? {
                          ...n,
                          sources: (n.sources ?? []).filter((s) => s.id !== sourceId),
                          updatedAt: now,
                        }
                      : n
                  ),
                  updatedAt: now,
                }
              : inv
          ),
        }));
      },

      addString: (investigationId, fromNodeId, toNodeId, label, color) => {
        const stringId = generateId();
        const now = Date.now();
        const newString: RedString = {
          id: stringId,
          fromNodeId,
          toNodeId,
          label,
          color: color ?? '#C41E3A',
          createdAt: now,
        };
        set((state) => ({
          investigations: state.investigations.map((inv) =>
            inv.id === investigationId
              ? { ...inv, strings: [...(inv.strings ?? []), newString], updatedAt: now }
              : inv
          ),
          connectingFromId: null,
        }));
        return stringId;
      },

      updateString: (investigationId, stringId, updates) => {
        set((state) => ({
          investigations: state.investigations.map((inv) =>
            inv.id === investigationId
              ? {
                  ...inv,
                  strings: (inv.strings ?? []).map((s) =>
                    s.id === stringId ? { ...s, ...updates } : s
                  ),
                }
              : inv
          ),
        }));
      },

      deleteString: (investigationId, stringId) => {
        set((state) => ({
          investigations: state.investigations.map((inv) =>
            inv.id === investigationId
              ? {
                  ...inv,
                  strings: (inv.strings ?? []).filter((s) => s.id !== stringId),
                }
              : inv
          ),
        }));
      },

      addTimeline: (investigationId, label) => {
        const timelineId = generateId();
        const now = Date.now();
        const currentYear = new Date().getFullYear();
        set((state) => {
          const inv = state.investigations.find((i) => i.id === investigationId);
          const existingCount = (inv?.timelines ?? []).length;
          const color = TIMELINE_COLORS[existingCount % TIMELINE_COLORS.length];
          const timeline: Timeline = {
            id: timelineId,
            label,
            color,
            startYear: 1900,
            endYear: currentYear,
            isMinimized: false,
            createdAt: now,
          };
          return {
            investigations: state.investigations.map((i) =>
              i.id === investigationId
                ? { ...i, timelines: [...(i.timelines ?? []), timeline], updatedAt: now }
                : i
            ),
          };
        });
        return timelineId;
      },

      updateTimeline: (investigationId, timelineId, updates) => {
        set((state) => ({
          investigations: state.investigations.map((inv) =>
            inv.id === investigationId
              ? {
                  ...inv,
                  timelines: (inv.timelines ?? []).map((t) =>
                    t.id === timelineId ? { ...t, ...updates } : t
                  ),
                }
              : inv
          ),
        }));
      },

      deleteTimeline: (investigationId, timelineId) => {
        set((state) => ({
          investigations: state.investigations.map((inv) =>
            inv.id === investigationId
              ? {
                  ...inv,
                  timelines: (inv.timelines ?? []).filter((t) => t.id !== timelineId),
                }
              : inv
          ),
        }));
      },

      toggleTimelineMinimized: (investigationId, timelineId) => {
        set((state) => ({
          investigations: state.investigations.map((inv) =>
            inv.id === investigationId
              ? {
                  ...inv,
                  timelines: (inv.timelines ?? []).map((t) =>
                    t.id === timelineId ? { ...t, isMinimized: !t.isMinimized } : t
                  ),
                }
              : inv
          ),
        }));
      },

      setSelectedNode: (nodeId) => set({ selectedNodeId: nodeId }),
      setConnectingFrom: (nodeId) => set({ connectingFromId: nodeId }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setCanvasMode: (mode) => set({ canvasMode: mode }),

      getActiveInvestigation: () => {
        const state = get();
        return state.investigations.find((inv) => inv.id === state.activeInvestigationId);
      },

      updateColorLegend: (investigationId, legend) => {
        set((state) => ({
          investigations: state.investigations.map((inv) =>
            inv.id === investigationId
              ? { ...inv, colorLegend: legend, updatedAt: Date.now() }
              : inv
          ),
        }));
      },

      addDemoInvestigation: (investigation) => {
        set((state) => ({
          investigations: [
            ...state.investigations.filter((inv) => !inv.isDemo),
            investigation,
          ],
          activeInvestigationId: investigation.id,
        }));
      },

      removeDemoInvestigation: () => {
        set((state) => ({
          investigations: state.investigations.filter((inv) => !inv.isDemo),
          activeInvestigationId:
            state.investigations.find((inv) => inv.id === state.activeInvestigationId)?.isDemo
              ? null
              : state.activeInvestigationId,
        }));
      },

      restoreInvestigation: (investigation) => {
        set((state) => ({
          investigations: [...state.investigations, investigation],
        }));
      },

      // ─── New actions ────────────────────────────────────────────────────────
      updateInvestigationMeta: (id, updates) => {
        const now = Date.now();
        set((state) => ({
          investigations: state.investigations.map((inv) =>
            inv.id === id ? { ...inv, ...updates, updatedAt: now } : inv
          ),
        }));
      },

      setInvestigationPin: (id, pinHash) => {
        const now = Date.now();
        set((state) => ({
          investigations: state.investigations.map((inv) =>
            inv.id === id ? { ...inv, investigationPin: pinHash, updatedAt: now } : inv
          ),
        }));
      },

      logAccess: (id, entry) => {
        const entryId = generateId();
        set((state) => ({
          investigations: state.investigations.map((inv) =>
            inv.id === id
              ? {
                  ...inv,
                  accessLog: [...(inv.accessLog ?? []), { ...entry, id: entryId }],
                }
              : inv
          ),
        }));
      },

      addSticker: (investigationId, nodeId, sticker) => {
        const stickerId = generateId();
        const now = Date.now();
        const newSticker: NodeSticker = { ...sticker, id: stickerId };
        set((state) => ({
          investigations: state.investigations.map((inv) =>
            inv.id === investigationId
              ? {
                  ...inv,
                  nodes: inv.nodes.map((n) =>
                    n.id === nodeId
                      ? { ...n, stickers: [...(n.stickers ?? []), newSticker], updatedAt: now }
                      : n
                  ),
                  updatedAt: now,
                }
              : inv
          ),
        }));
      },

      removeSticker: (investigationId, nodeId, stickerId) => {
        const now = Date.now();
        set((state) => ({
          investigations: state.investigations.map((inv) =>
            inv.id === investigationId
              ? {
                  ...inv,
                  nodes: inv.nodes.map((n) =>
                    n.id === nodeId
                      ? {
                          ...n,
                          stickers: (n.stickers ?? []).filter((s) => s.id !== stickerId),
                          updatedAt: now,
                        }
                      : n
                  ),
                  updatedAt: now,
                }
              : inv
          ),
        }));
      },

      toggleInvisibleInk: (investigationId, nodeId) => {
        const now = Date.now();
        set((state) => ({
          investigations: state.investigations.map((inv) =>
            inv.id === investigationId
              ? {
                  ...inv,
                  nodes: inv.nodes.map((n) =>
                    n.id === nodeId
                      ? { ...n, invisibleInk: !n.invisibleInk, updatedAt: now }
                      : n
                  ),
                  updatedAt: now,
                }
              : inv
          ),
        }));
      },

      // ─── Chat history ──────────────────────────────────────────────────────
      saveChatMessage: (investigationId, message) => {
        set((state) => ({
          investigations: state.investigations.map((inv) =>
            inv.id === investigationId
              ? { ...inv, chatHistory: [...(inv.chatHistory ?? []), message] }
              : inv
          ),
        }));
      },

      updateMessageFeedback: (investigationId, messageId, feedback) => {
        set((state) => ({
          investigations: state.investigations.map((inv) =>
            inv.id === investigationId
              ? {
                  ...inv,
                  chatHistory: (inv.chatHistory ?? []).map((m) =>
                    m.id === messageId ? { ...m, feedback } : m
                  ),
                }
              : inv
          ),
        }));
      },

      updateChatMessage: (investigationId, messageId, updates) => {
        set((state) => ({
          investigations: state.investigations.map((inv) =>
            inv.id === investigationId
              ? {
                  ...inv,
                  chatHistory: (inv.chatHistory ?? []).map((m) =>
                    m.id === messageId ? { ...m, ...updates } : m
                  ),
                }
              : inv
          ),
        }));
      },

      clearChatHistory: (investigationId) => {
        set((state) => ({
          investigations: state.investigations.map((inv) =>
            inv.id === investigationId ? { ...inv, chatHistory: [] } : inv
          ),
        }));
      },
    }),
    {
      name: 'investigation-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      migrate: (persistedState: any, _fromVersion: number) => {
        const state = persistedState as any;
        if (!state.investigations) state.investigations = [];
        state.investigations = state.investigations.map((inv: any) => ({
          ...inv,
          nodes: Array.isArray(inv.nodes) ? inv.nodes : [],
          strings: Array.isArray(inv.strings) ? inv.strings : [],
          timelines: Array.isArray(inv.timelines) ? inv.timelines : [],
          colorLegend: Array.isArray(inv.colorLegend) ? inv.colorLegend : [],
        }));
        return state;
      },
    }
  )
);

export default useInvestigationStore;


# mobile/src/lib/state/security-store.ts

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';

// ─── SecureStore adapter for Zustand persist ──────────────────────────────────
const secureStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(name);
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(name, value);
    } catch {
      // silently fail — security store write errors should not crash app
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(name);
    } catch {
      // silently fail
    }
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────
export type AppLockMethod = 'biometric' | 'pin' | 'both';
export type HiddenEntryMethod = 'logo_tap' | 'decoy_pin' | 'tap_sequence' | 'shake';

export interface SecurityState {
  screenshotBlocked: boolean;
  screenRecordBlocked: boolean;
  appLockEnabled: boolean;
  appLockMethod: AppLockMethod;
  appPinHash: string | null;
  hiddenEntryMethod: HiddenEntryMethod;
  hiddenEntryConfigured: boolean;
  decoyPinHash: string | null;
  sessionUnlocked: boolean;
}

interface SecurityStore extends SecurityState {
  setScreenshotBlocked: (blocked: boolean) => void;
  setScreenRecordBlocked: (blocked: boolean) => void;
  setAppLock: (enabled: boolean, method?: AppLockMethod, pinHash?: string | null) => void;
  setHiddenEntryMethod: (method: HiddenEntryMethod, configured?: boolean, decoyPinHash?: string | null) => void;
  unlockSession: () => void;
  lockSession: () => void;
}

const DEFAULTS: SecurityState = {
  screenshotBlocked: true,
  screenRecordBlocked: true,
  appLockEnabled: false,
  appLockMethod: 'biometric',
  appPinHash: null,
  hiddenEntryMethod: 'logo_tap',
  hiddenEntryConfigured: false,
  decoyPinHash: null,
  sessionUnlocked: false,
};

const useSecurityStore = create<SecurityStore>()(
  persist(
    (set) => ({
      ...DEFAULTS,

      setScreenshotBlocked: (blocked) => set({ screenshotBlocked: blocked }),
      setScreenRecordBlocked: (blocked) => set({ screenRecordBlocked: blocked }),

      setAppLock: (enabled, method, pinHash) =>
        set((s) => ({
          appLockEnabled: enabled,
          appLockMethod: method ?? s.appLockMethod,
          appPinHash: pinHash !== undefined ? pinHash : s.appPinHash,
        })),

      setHiddenEntryMethod: (method, configured, decoyPinHash) =>
        set((s) => ({
          hiddenEntryMethod: method,
          hiddenEntryConfigured: configured ?? s.hiddenEntryConfigured,
          decoyPinHash: decoyPinHash !== undefined ? decoyPinHash : s.decoyPinHash,
        })),

      unlockSession: () => set({ sessionUnlocked: true }),

      lockSession: () => set({ sessionUnlocked: false }),
    }),
    {
      name: 'security-storage',
      storage: createJSONStorage(() => secureStorage),
      // sessionUnlocked must never be persisted — it resets on every cold start
      partialize: (state) => {
        const { sessionUnlocked: _su, ...rest } = state as SecurityStore;
        return rest;
      },
    }
  )
);

export default useSecurityStore;


# mobile/src/lib/state/subscription-store.ts

import { create } from 'zustand';
import { hasEntitlement } from '@/lib/revenuecatClient';

export type SubscriptionTier = 'free' | 'pro' | 'plus';

interface SubscriptionStore {
  tier: SubscriptionTier;
  isLoading: boolean;
  checkSubscription: () => Promise<void>;
  maxInvestigations: () => number;
  maxNodesPerInvestigation: () => number;
}

const useSubscriptionStore = create<SubscriptionStore>()((set, get) => ({
  tier: 'free',
  isLoading: false,

  checkSubscription: async () => {
    set({ isLoading: true });
    try {
      const plusResult = await hasEntitlement('plus');
      if (plusResult.ok && plusResult.data) {
        set({ tier: 'plus', isLoading: false });
        return;
      }
      const proResult = await hasEntitlement('pro');
      if (proResult.ok && proResult.data) {
        set({ tier: 'pro', isLoading: false });
        return;
      }
      set({ tier: 'free', isLoading: false });
    } catch {
      set({ tier: 'free', isLoading: false });
    }
  },

  maxInvestigations: () => {
    const tier = get().tier;
    if (tier === 'plus') return Infinity;
    if (tier === 'pro') return 25;
    return 3;
  },

  maxNodesPerInvestigation: () => {
    const tier = get().tier;
    if (tier === 'plus') return Infinity;
    if (tier === 'pro') return 200;
    return 25;
  },
}));

export default useSubscriptionStore;


# mobile/src/lib/state/tour-store.ts

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface TourState {
  hasCompletedTour: boolean;
  isRunning: boolean;
  currentStep: number;
  isDemoMode: boolean;
  sessionStartedAt: number | null;

  startTour: () => void;
  startTourFromStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  completeTour: () => void;
  startDemoMode: () => void;
  exitDemoMode: () => void;
  setSessionStart: () => void;
}

const TOTAL_STEPS = 18;

const useTourStore = create<TourState>()(
  persist(
    (set) => ({
      hasCompletedTour: false,
      isRunning: false,
      currentStep: 0,
      isDemoMode: false,
      sessionStartedAt: null,

      startTour: () =>
        set({ isRunning: true, currentStep: 0 }),

      startTourFromStep: (step: number) =>
        set({ isRunning: true, currentStep: step }),

      nextStep: () =>
        set((state) => {
          const next = state.currentStep + 1;
          if (next >= TOTAL_STEPS) {
            return { isRunning: false, hasCompletedTour: true, currentStep: 0 };
          }
          return { currentStep: next };
        }),

      prevStep: () =>
        set((state) => ({
          currentStep: Math.max(0, state.currentStep - 1),
        })),

      skipTour: () =>
        set({ isRunning: false, hasCompletedTour: true, currentStep: 0 }),

      completeTour: () =>
        set({ isRunning: false, hasCompletedTour: true, currentStep: 0 }),

      startDemoMode: () => set({ isDemoMode: true }),

      exitDemoMode: () => set({ isDemoMode: false }),

      setSessionStart: () => set({ sessionStartedAt: Date.now() }),
    }),
    {
      name: 'tour-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        hasCompletedTour: state.hasCompletedTour,
        isDemoMode: state.isDemoMode,
      }),
    }
  )
);

export default useTourStore;


# mobile/src/lib/theme.ts

// ─── Red String Research — Central Theme System ───────────────────────────────

export const accentColors = {
  crimson: '#C41E3A',
  navy: '#1E3A5F',
  forest: '#1A4731',
  amber: '#C47A1E',
  slate: '#3A4A5C',
} as const;

export type AccentColorKey = keyof typeof accentColors;

// ─── Master color palette (all hardcoded values from index.tsx + two.tsx) ─────
export const COLORS = {
  // Backgrounds
  background: '#1A1614',
  surface: '#231F1C',
  surface2: '#2D2825',
  card: '#F5ECD7',

  // Reds
  red: '#C41E3A',
  redDark: '#A3162E',
  redLight: '#E8445A',

  // Pins & gold
  pin: '#C8934A',
  pinDark: '#9B6020',
  pinLegacy: '#D4A574', // original warm tone kept for card accents
  gold: '#F0C060',

  // Text
  textLight: '#E8DCC8',
  muted: '#6B5B4F',
  cardText: '#2C1810',

  // Border
  border: '#3D332C',

  // Tag / accent shades
  blue: '#3B82F6',
  green: '#22C55E',
  amber: '#F59E0B',
  purple: '#A855F7',
  teal: '#14B8A6',
  orange: '#F97316',
  pink: '#EC4899',

  // Cork texture tones
  corkLight: '#D4B896',
  corkMid: '#B8966A',
  corkDark: '#8C6E40',

  // Tape variants
  tapeBeige: '#D4C5A9',
  tapeRed: '#C41E3A',
  tapeBlue: '#3B82F6',
  tapeYellow: '#F59E0B',
  tapePink: '#EC4899',
  tapeBlack: '#1A1A1A',

  // Accent map
  accentColors,
} as const;

// ─── Fonts ────────────────────────────────────────────────────────────────────
export const FONTS = {
  display: 'BebasNeue_400Regular',
  mono: 'CourierPrime_400Regular',
  monoBold: 'CourierPrime_700Bold',
} as const;

// ─── Hero title font system ───────────────────────────────────────────────────
export type HeroTitleFont =
  | 'playfair'
  | 'abril'
  | 'specialElite'
  | 'fjalla'
  | 'crimsonPro'
  | 'libreBaskerville'
  | 'teko';

export const HERO_FONTS: Record<HeroTitleFont, string> = {
  playfair: 'PlayfairDisplay_700Bold',
  abril: 'AbrilFatface_400Regular',
  specialElite: 'SpecialElite_400Regular',
  fjalla: 'FjallaOne_400Regular',
  crimsonPro: 'CrimsonPro_700Bold',
  libreBaskerville: 'LibreBaskerville_700Bold',
  teko: 'Teko_600SemiBold',
};

// ─── Appearance prefs (matches appearance-store shape) ───────────────────────
export interface AppearancePrefs {
  heroFont: HeroTitleFont;
  themeMode: 'dark' | 'sepia' | 'light';
  accentColor: AccentColorKey;
  corkIntensity: 0 | 1 | 2 | 3;
  tapeColor: string;
  pushpinColor: string;
  highlighterColor: string;
  fineLinkerColor: string;
}

// ─── Theme object shape ───────────────────────────────────────────────────────
export interface Theme {
  bg: string;
  surface: string;
  surface2: string;
  card: string;
  text: string;
  muted: string;
  border: string;
  cardText: string;
  accent: string;
  pin: string;
  tape: string;
  red: string;
  redDark: string;
  heroFontFamily: string;
  corkOpacity: number;
  colors: typeof COLORS;
  fonts: typeof FONTS;
}

const DARK_BASE: Omit<Theme, 'accent' | 'pin' | 'tape' | 'red' | 'redDark' | 'heroFontFamily' | 'corkOpacity' | 'colors' | 'fonts'> = {
  bg: '#1A1614',
  surface: '#231F1C',
  surface2: '#2D2825',
  card: '#F5ECD7',
  text: '#E8DCC8',
  muted: '#6B5B4F',
  border: '#3D332C',
  cardText: '#2C1810',
};

const SEPIA_BASE: typeof DARK_BASE = {
  bg: '#2B2318',
  surface: '#352B1F',
  surface2: '#3E3226',
  card: '#F0E6CC',
  text: '#D4C8A8',
  muted: '#7A6A55',
  border: '#4A3C2C',
  cardText: '#2C1810',
};

const LIGHT_BASE: typeof DARK_BASE = {
  bg: '#F5ECD7',
  surface: '#EDE3CB',
  surface2: '#E5D9C0',
  card: '#FFFFFF',
  text: '#2C1810',
  muted: '#8C7B6A',
  border: '#D4C5A9',
  cardText: '#2C1810',
};

const CORK_OPACITY_MAP: Record<0 | 1 | 2 | 3, number> = {
  0: 0,
  1: 0.08,
  2: 0.18,
  3: 0.32,
};

export function getTheme(prefs: AppearancePrefs): Theme {
  const base =
    prefs.themeMode === 'sepia'
      ? SEPIA_BASE
      : prefs.themeMode === 'light'
      ? LIGHT_BASE
      : DARK_BASE;

  const accent = accentColors[prefs.accentColor] ?? COLORS.red;

  return {
    ...base,
    accent,
    red: accent,
    redDark: accent + 'CC',
    pin: prefs.pushpinColor ?? COLORS.pin,
    tape: prefs.tapeColor ?? COLORS.tapeBeige,
    heroFontFamily: HERO_FONTS[prefs.heroFont] ?? FONTS.display,
    corkOpacity: CORK_OPACITY_MAP[prefs.corkIntensity],
    colors: COLORS,
    fonts: FONTS,
  };
}


# mobile/src/lib/tourSteps.ts

export interface TourStep {
  id: string;
  screen: 'investigations' | 'canvas';
  title: string;
  description: string;
  targetId?: string;
  spotlightShape?: 'circle' | 'rect';
  spotlightPadding?: number;
  tooltipPosition?: 'top' | 'bottom' | 'center';
  action?: 'tap' | 'swipe' | 'none';
  highlightColor?: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    screen: 'investigations',
    title: 'Welcome to Red String Research',
    description: 'The investigation tool built for serious researchers, journalists, and truth-seekers. Let\'s take a quick tour.',
    tooltipPosition: 'center',
    action: 'none',
  },
  {
    id: 'investigations_list',
    screen: 'investigations',
    title: 'Your Investigations',
    description: 'Each case lives here. Create as many as your plan allows. Tap an investigation to open its canvas.',
    targetId: 'investigations-list',
    spotlightShape: 'rect',
    spotlightPadding: 12,
    tooltipPosition: 'top',
    action: 'tap',
  },
  {
    id: 'create_button',
    screen: 'investigations',
    title: 'Start a New Case',
    description: 'Tap + to create a new investigation. Give it a name and description.',
    targetId: 'new-investigation-button',
    spotlightShape: 'rect',
    spotlightPadding: 8,
    tooltipPosition: 'bottom',
    action: 'tap',
  },
  {
    id: 'sources_button',
    screen: 'investigations',
    title: 'Source Tracker',
    description: 'Every piece of evidence can be credited to its source — X users, articles, TikTok creators, anonymous tips. Full chain of custody.',
    tooltipPosition: 'center',
    action: 'none',
  },
  {
    id: 'tip_inbox',
    screen: 'investigations',
    title: 'Tip Inbox',
    description: 'Anyone can submit tips to you. AI vets every tip for credibility, extracts key claims, and flags red flags automatically.',
    tooltipPosition: 'center',
    action: 'none',
  },
  {
    id: 'canvas_intro',
    screen: 'canvas',
    title: 'The Investigation Canvas',
    description: 'Your corkboard. Drag anywhere, pinch to zoom, and connect evidence with red string.',
    tooltipPosition: 'center',
    action: 'none',
  },
  {
    id: 'add_node',
    screen: 'canvas',
    title: 'Add Evidence',
    description: 'Tap + to add any type of evidence: notes, links, images, folders, or datasets.',
    targetId: 'add-node-button',
    spotlightShape: 'circle',
    spotlightPadding: 10,
    tooltipPosition: 'bottom',
    action: 'tap',
    highlightColor: '#C41E3A',
  },
  {
    id: 'node_types',
    screen: 'canvas',
    title: '6 Node Types',
    description: 'Notes, Links, Images, Folders, Datasets, and nested Investigations. Every type of evidence has a home.',
    tooltipPosition: 'bottom',
    action: 'none',
  },
  {
    id: 'red_string',
    screen: 'canvas',
    title: 'Red String Connections',
    description: 'Tap the cable icon, then tap two nodes to connect them with red string. Change string color, thickness, even make it dashed.',
    targetId: 'connect-toggle',
    spotlightShape: 'circle',
    spotlightPadding: 10,
    tooltipPosition: 'bottom',
    action: 'tap',
    highlightColor: '#C41E3A',
  },
  {
    id: 'bezier_strings',
    screen: 'canvas',
    title: 'Dynamic Strings',
    description: 'Strings curve organically between nodes. They\'re flexible, colorable, and labeled — just like a real investigation board.',
    tooltipPosition: 'bottom',
    action: 'none',
  },
  {
    id: 'canvas_mode',
    screen: 'canvas',
    title: 'Corkboard vs Mind Map',
    description: 'Toggle between the classic corkboard and a neural network-style mind map. Same data, two perspectives.',
    targetId: 'canvas-mode-toggle',
    spotlightShape: 'circle',
    spotlightPadding: 10,
    tooltipPosition: 'bottom',
    action: 'tap',
  },
  {
    id: 'timeline',
    screen: 'canvas',
    title: 'Investigation Timeline',
    description: 'Every canvas has a timeline at the bottom. Add timestamps to evidence, create timelines per person, and track the full chronology.',
    tooltipPosition: 'top',
    action: 'none',
  },
  {
    id: 'color_legend',
    screen: 'canvas',
    title: 'Color Code System',
    description: 'The palette icon on the left is your color legend. Tap \'Suggest\' and AI analyzes your canvas to recommend a color-coding system.',
    tooltipPosition: 'center',
    action: 'none',
  },
  {
    id: 'color_stripe',
    screen: 'canvas',
    title: 'Color-Coded Cards',
    description: 'Each color represents a category — suspects, locations, confirmed evidence. Cards show a colored stripe so you can read your board at a glance.',
    tooltipPosition: 'bottom',
    action: 'none',
  },
  {
    id: 'node_sources',
    screen: 'canvas',
    title: 'Source Attribution',
    description: 'Tap any node, scroll to Sources, and log where that evidence came from. Credit X users, journalists, tipsters — even chain-of-custody secondary sources.',
    tooltipPosition: 'top',
    action: 'none',
  },
  {
    id: 'collab',
    screen: 'investigations',
    title: 'Collaborate Securely',
    description: 'Invite investigators with different permission levels. Contributors submit evidence to your approval queue. Every node shows who found it.',
    tooltipPosition: 'center',
    action: 'none',
  },
  {
    id: 'export',
    screen: 'canvas',
    title: 'Export Your Case',
    description: 'Generate a PDF case file, create a podcast script from your findings, or export a full citation list — all branded with Red String Research.',
    tooltipPosition: 'center',
    action: 'none',
  },
  {
    id: 'complete',
    screen: 'investigations',
    title: "You're Ready",
    description: 'Red String Research is your command center. Every thread leads somewhere. Start your first investigation.',
    tooltipPosition: 'center',
    action: 'none',
  },
];

export const TOTAL_TOUR_STEPS = TOUR_STEPS.length;


# mobile/src/lib/types.ts

// Red String Research - Core Types

export type NodeType = 'investigation' | 'folder' | 'note' | 'link' | 'image' | 'dataset';

// ─── Sticker types ────────────────────────────────────────────────────────────
export type StickerType =
  | 'classified' | 'redacted' | 'verified' | 'unconfirmed' | 'top_secret' | 'evidence'
  | 'suspect' | 'witness' | 'source' | 'person_of_interest' | 'deceased' | 'alias'
  | 'original' | 'copy' | 'leaked' | 'declassified' | 'forgery' | 'pending_review'
  | 'gps_pin' | 'date_stamp' | 'timeline_marker' | 'filing_tab' | 'case_number';

export interface NodeSticker {
  id: string;
  type: StickerType;
  position: Position; // relative to node, 0-1 normalized
  customText?: string; // for label-type stickers
}

// ─── Access log ───────────────────────────────────────────────────────────────
export interface AccessLogEntry {
  id: string;
  action: 'opened' | 'edited' | 'exported' | 'shared' | 'node_added' | 'node_deleted' | 'collab_joined';
  userId: string;
  deviceInfo?: string;
  timestamp: number;
  metadata?: Record<string, string>;
}

export type TagColor = 'red' | 'blue' | 'green' | 'amber' | 'purple' | 'teal';

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Tag {
  id: string;
  label: string;
  color: TagColor;
}

export interface NodeSource {
  id: string;
  sourceType: 'url' | 'x_user' | 'tiktok_user' | 'instagram_user' | 'person' | 'document' | 'tip' | 'other';
  sourceName: string;           // "@CanadianBacon1776" or "Epoch Times"
  sourceHandle?: string;
  sourceUrl?: string;
  sourceProfileUrl?: string;
  platform?: 'x' | 'tiktok' | 'instagram' | 'youtube' | 'facebook' | 'website' | 'podcast' | 'other';
  contentType?: 'article' | 'video' | 'testimony' | 'tip' | 'hypothesis' | 'evidence' | 'document';
  contentSummary?: string;
  secondarySourceName?: string;  // e.g. article author showed Epoch Times piece
  secondarySourceUrl?: string;
  credibility: 'primary' | 'secondary' | 'unverified' | 'disputed' | 'confirmed';
  addedAt: number;
}

export interface CanvasNode {
  id: string;
  type: NodeType;
  title: string;
  description?: string;
  position: Position;
  size: Size;
  parentId?: string; // parent investigation or folder
  tags: Tag[];
  color?: TagColor;
  url?: string; // for link type
  imageUri?: string; // for image type
  content?: string; // for note type
  timestamp?: number; // unix ms timestamp for when this evidence occurred
  sources?: NodeSource[];
  createdAt: number;
  updatedAt: number;
  // ─── New fields ─────────────────────────────────────────
  invisibleInk?: boolean;      // if true, content is hidden unless revealed
  stickers?: NodeSticker[];    // array of applied stickers
  tapeColor?: string;          // per-node tape override
  pushpinColor?: string;       // per-node pushpin override
}

export interface RedString {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  label?: string;
  notes?: string;
  color: string; // hex color, default '#C41E3A'
  thickness?: number; // 1-4, default 2
  style?: 'solid' | 'dashed' | 'dotted'; // default 'solid'
  createdAt: number;
}

export interface Timeline {
  id: string;
  label: string;
  color: string; // hex color from color spectrum
  startYear: number;
  endYear: number;
  isMinimized: boolean;
  createdAt: number;
}

export interface ColorLegendEntry {
  color: string; // hex color
  label: string;
}

export interface ChatHistoryMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  feedback?: 'up' | 'down' | null;
  pinned?: boolean;
  highlight?: { id: string; color: string; name: string };
  autoTag?: string;
}

export interface Investigation {
  id: string;
  title: string;
  description?: string;
  nodes: CanvasNode[];
  strings: RedString[];
  timelines: Timeline[];
  colorLegend?: ColorLegendEntry[];
  isDemo?: boolean;
  createdAt: number;
  updatedAt: number;
  // ─── New fields ─────────────────────────────────────────
  icon?: string;               // emoji string or 'photo'
  iconUri?: string;            // local URI if icon === 'photo'
  boardStyle?: 'corkboard' | 'mindmap' | 'timeline' | 'casefile'; // default 'corkboard'
  filingTabColor?: string;     // hex
  filingTabLabel?: string;
  investigationPin?: string;   // bcrypt hash of invisible-ink PIN for this investigation
  accessLog?: AccessLogEntry[];
  chatHistory?: ChatHistoryMessage[];
}

export interface AISuggestion {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  suggestedLabel: string;
  reason: string;
  accepted: boolean;
}

// Tip types
export type TipStatus = 'unread' | 'investigating' | 'verified' | 'dismissed';

export interface TipVetting {
  score: number; // 0-100
  summary: string;
  keyFindings: string[];
  redFlags: string[];
  strengths: string[];
  followUpQuestions: string[];
  vettedAt: number;
}

export interface TipMessage {
  id: string;
  fromInvestigator: boolean;
  text: string;
  sentAt: number;
}

export interface Tip {
  id: string;
  recipientId: string;
  investigationId?: string;
  subject: string;
  content: string;
  tipperName?: string;
  tipperEmail?: string;
  tipperHandle?: string;
  isAnonymous: boolean;
  evidenceUrls: string[];
  status: TipStatus;
  vetting?: TipVetting;
  messages: TipMessage[];
  submittedAt: number;
  updatedAt: number;
}


# mobile/src/lib/useClientOnlyValue.ts

// This function is web-only as native doesn't currently support server (or build-time) rendering.
export function useClientOnlyValue<S, C>(server: S, client: C): S | C {
  return client;
}


# mobile/src/lib/useClientOnlyValue.web.ts

import React from 'react';

// `useEffect` is not invoked during server rendering, meaning
// we can use this to determine if we're on the server or not.
export function useClientOnlyValue<S, C>(server: S, client: C): S | C {
  const [value, setValue] = React.useState<S | C>(server);
  React.useEffect(() => {
    setValue(client);
  }, [client]);

  return value;
}


# mobile/src/lib/useColorScheme.ts

export { useColorScheme } from 'react-native';


# mobile/src/lib/useColorScheme.web.ts

// NOTE: The default React Native styling doesn't support server rendering.
// Server rendered styles should not change between the first render of the HTML
// and the first render on the client. Typically, web developers will use CSS media queries
// to render different styles on the client and server, these aren't directly supported in React Native
// but can be achieved using a styling library like Nativewind.
export function useColorScheme() {
  return 'light';
}


