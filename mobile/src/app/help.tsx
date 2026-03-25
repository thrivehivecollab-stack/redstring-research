import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  X,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  ThumbsDown,
  Bug,
  MessageCircle,
  Search,
  Send,
  AlertTriangle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { api } from '@/lib/api/api';
import { useSession } from '@/lib/auth/use-session';

const C = {
  bg: '#0F0D0B',
  surface: '#1A1714',
  surface2: '#211E1A',
  red: '#C41E3A',
  pin: '#C8934A',
  amber: '#D4A574',
  text: '#EDE0CC',
  muted: '#6B5D4F',
  border: '#272320',
  gold: '#F0C060',
} as const;

// ---- Types ----
type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

type FaqSection = {
  title: string;
  items: FaqItem[];
};

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
};

type Conversation = {
  id: string;
  escalated?: boolean;
};

// ---- FAQ Data ----
const FAQ_SECTIONS: FaqSection[] = [
  {
    title: 'Getting Started',
    items: [
      { id: 'gs1', question: 'How do I create my first investigation?', answer: 'Tap the "+" button on the Files tab to create a new investigation. Give it a title, choose a cover color, and tap "Create". You\'ll be taken directly to your new canvas.' },
      { id: 'gs2', question: 'What are nodes and connections?', answer: 'Nodes are the building blocks of your investigation — they can represent people, places, events, documents, or any piece of evidence. Connections (red strings) link related nodes together to show relationships.' },
      { id: 'gs3', question: 'How does the canvas work?', answer: 'The canvas is your digital corkboard. Pinch to zoom, two-finger drag to pan. Tap and hold any empty space to add a node. Drag nodes to reposition them. Tap a node to see its details and connect it to others.' },
      { id: 'gs4', question: 'Can I use Red String offline?', answer: 'Yes — your investigations are stored locally on your device. You can add nodes and connections without an internet connection. Collaboration and AI features require connectivity.' },
    ],
  },
  {
    title: 'Canvas & Nodes',
    items: [
      { id: 'cn1', question: 'How do I add a node?', answer: 'Long-press any empty area on the canvas to open the node creation menu. Choose your node type (Person, Place, Event, Document, etc.), fill in the details, and tap "Create".' },
      { id: 'cn2', question: 'How do I connect nodes with red string?', answer: 'Tap a node to select it, then tap the connection icon that appears. Drag the red string to another node and release. You can add a label to the connection to describe the relationship.' },
      { id: 'cn3', question: 'Can I customize node colors and labels?', answer: 'Yes — tap any node and select "Edit" to change its color, icon, label, and notes. Pro and higher plans have access to a full color palette.' },
      { id: 'cn4', question: 'How do I zoom and pan the canvas?', answer: 'Use a two-finger pinch gesture to zoom in or out. Drag with two fingers to pan. Double-tap to reset to the default zoom level.' },
    ],
  },
  {
    title: 'AI Features',
    items: [
      { id: 'ai1', question: 'What can the AI assistant do?', answer: 'The AI can help you brainstorm connections, summarize your investigation, suggest related nodes, analyze source credibility, and answer research questions. It has context about your current investigation.' },
      { id: 'ai2', question: 'How do I use voice commands on the canvas?', answer: 'Tap the microphone icon on the canvas toolbar. Speak naturally — for example "Add a person node named John Smith" or "Connect John to the warehouse". The AI interprets your command and acts on the canvas.' },
      { id: 'ai3', question: 'Are my conversations with AI private?', answer: 'Your AI conversations are processed by our secure servers and are not used to train AI models. Conversations are linked to your account and are not shared with third parties.' },
    ],
  },
  {
    title: 'Tips Inbox',
    items: [
      { id: 'ti1', question: 'How do tips work?', answer: 'Your unique tip link lets anyone submit anonymous tips to your investigations. Tips appear in your Tips Inbox where you can review, tag, and attach them to nodes.' },
      { id: 'ti2', question: 'Is the tip submission anonymous?', answer: 'Yes — tip submissions are anonymous by default. We do not log submitter IP addresses or personal data. Tipsters can optionally provide contact info.' },
      { id: 'ti3', question: 'How do I share my tip link?', answer: 'Open the Tips Inbox and tap "Share My Link". You can share the URL directly, generate a QR code, or copy it to your clipboard.' },
      { id: 'ti4', question: 'Are tips encrypted?', answer: 'Tips are encrypted in transit and at rest. Only you can see your tips — not even Red String staff can read tip content.' },
    ],
  },
  {
    title: 'Collaboration',
    items: [
      { id: 'co1', question: 'How do I invite someone to collaborate?', answer: 'Open an investigation, tap the collaboration icon, and select "Invite". Enter their email address and choose their permission level. They\'ll receive an email with a join link.' },
      { id: 'co2', question: 'What are the different permission levels?', answer: 'Viewer: can only read the canvas. Editor: can add and modify nodes. Admin: can manage team members and investigation settings.' },
      { id: 'co3', question: 'What is War Room?', answer: 'War Room is a live video collaboration session where your team can review the canvas together in real-time, share screens, and discuss findings via video call.' },
    ],
  },
  {
    title: 'Billing & Subscription',
    items: [
      { id: 'bi1', question: 'What are the pricing tiers?', answer: 'Free: 3 investigations, 25 nodes. Researcher ($9.99/mo): 25 investigations, 200 nodes each. Investigator ($19.99/mo): unlimited everything + collaboration. Professional ($49.99/mo): everything plus live streaming and advanced AI.' },
      { id: 'bi2', question: 'How do I cancel my subscription?', answer: 'On iOS, go to Settings > Apple ID > Subscriptions. On Android, open Play Store > Account > Subscriptions. You\'ll keep access until the end of your billing period.' },
      { id: 'bi3', question: 'Can I switch tiers?', answer: 'Yes — you can upgrade or downgrade at any time. Upgrades take effect immediately. Downgrades take effect at the end of your current billing period.' },
      { id: 'bi4', question: 'What is the Founding Member rate?', answer: 'Founding Members who joined during TestFlight beta get a locked-in rate of $7.99/mo forever — even after launch pricing increases. This offer disappears at public launch.' },
    ],
  },
  {
    title: 'Security & Privacy',
    items: [
      { id: 'sp1', question: 'Is my data encrypted?', answer: 'Yes — all data is encrypted in transit (TLS 1.3) and at rest. Investigation content is end-to-end encrypted so only you can read it.' },
      { id: 'sp2', question: 'What is App Lock?', answer: 'App Lock requires Face ID, Touch ID, or a PIN before the app opens. Enable it in Settings > Security. After 2 minutes in the background, the app locks automatically.' },
      { id: 'sp3', question: 'Does Red String store my IP address?', answer: 'We store minimal logs necessary for security. IP addresses are anonymized after 24 hours and never shared with third parties.' },
    ],
  },
  {
    title: 'Exporting & Sharing',
    items: [
      { id: 'es1', question: 'What export formats are supported?', answer: 'You can export as PNG image, PDF document, or JSON data file. PNG and PDF exports include all nodes, connections, and labels. JSON exports allow importing into other tools.' },
      { id: 'es2', question: 'How do watermarks work?', answer: 'Free exports include a small Red String watermark. Researcher and above plans can export without watermarks. Professional plans can add custom branding to exports.' },
      { id: 'es3', question: 'Can I share individual nodes?', answer: 'Yes — tap any node, open its detail view, and tap the share icon. You can share the node as an image or a deep link (for other Red String users).' },
    ],
  },
];

// ---- FAQ Accordion Item ----
function FaqAccordionItem({
  item,
  isOpen,
  onToggle,
  voted,
  onVote,
}: {
  item: FaqItem;
  isOpen: boolean;
  onToggle: () => void;
  voted: boolean | null;
  onVote: (helpful: boolean) => void;
}) {
  return (
    <View
      style={{
        borderBottomWidth: 1,
        borderBottomColor: C.border,
      }}
    >
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 14,
          backgroundColor: pressed ? C.surface2 : 'transparent',
        })}
        testID={`faq-item-${item.id}`}
      >
        <Text style={{ color: C.text, fontSize: 14, fontWeight: '600', flex: 1, lineHeight: 20 }}>
          {item.question}
        </Text>
        {isOpen
          ? <ChevronUp size={16} color={C.muted} strokeWidth={2} />
          : <ChevronDown size={16} color={C.muted} strokeWidth={2} />
        }
      </Pressable>
      {isOpen ? (
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <Text style={{ color: C.muted, fontSize: 13, lineHeight: 20 }}>
            {item.answer}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8 }}>
            <Text style={{ color: C.muted, fontSize: 11 }}>Was this helpful?</Text>
            <Pressable
              onPress={() => !voted && onVote(true)}
              disabled={voted !== null}
              style={{ padding: 4 }}
              testID={`faq-thumbsup-${item.id}`}
            >
              <ThumbsUp
                size={16}
                color={voted === true ? C.pin : C.muted}
                strokeWidth={2}
                fill={voted === true ? C.pin : 'transparent'}
              />
            </Pressable>
            <Pressable
              onPress={() => !voted && onVote(false)}
              disabled={voted !== null}
              style={{ padding: 4 }}
              testID={`faq-thumbsdown-${item.id}`}
            >
              <ThumbsDown
                size={16}
                color={voted === false ? C.red : C.muted}
                strokeWidth={2}
                fill={voted === false ? C.red : 'transparent'}
              />
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

// ---- Bug Report Modal ----
function BugReportModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [description, setDescription] = useState('');
  const [screen, setScreen] = useState('');
  const [steps, setSteps] = useState('');
  const [screenshot] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setDescription('');
    setScreen('');
    setSteps('');
    setSubmitted(false);
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleSubmit = useCallback(async () => {
    if (!description.trim()) {
      setError('Please describe the bug.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await api.post('/api/support/bug-report', {
        description: description.trim(),
        screen: screen.trim(),
        steps: steps.trim(),
        screenshot,
        appVersion: '1.0.0',
        deviceType: Platform.OS,
      });
      setSubmitted(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setError('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [description, screen, steps, screenshot]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' }}
          onPress={handleClose}
        />
        <View
          style={{
            backgroundColor: C.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderTopWidth: 1,
            borderTopColor: C.border,
            padding: 24,
            paddingBottom: 40,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
            <Bug size={20} color={C.red} strokeWidth={2} />
            <Text style={{ color: C.text, fontSize: 18, fontWeight: '800', marginLeft: 10, flex: 1 }}>
              Report a Bug
            </Text>
            <Pressable onPress={handleClose} testID="bug-modal-close">
              <X size={20} color={C.muted} strokeWidth={2} />
            </Pressable>
          </View>

          {submitted ? (
            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
              <Text style={{ fontSize: 40, marginBottom: 16 }}>📬</Text>
              <Text style={{ color: C.text, fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>
                Report received.
              </Text>
              <Text style={{ color: C.muted, fontSize: 13, textAlign: 'center', lineHeight: 20 }}>
                Jess typically replies within 24 hours.
              </Text>
              <Pressable
                onPress={handleClose}
                style={{
                  marginTop: 24,
                  backgroundColor: C.surface2,
                  borderRadius: 12,
                  paddingHorizontal: 32,
                  paddingVertical: 12,
                  borderWidth: 1,
                  borderColor: C.border,
                }}
              >
                <Text style={{ color: C.text, fontWeight: '700' }}>Done</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={{ gap: 12 }}>
                <View>
                  <Text style={{ color: C.muted, fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 6 }}>
                    DESCRIBE THE BUG *
                  </Text>
                  <TextInput
                    testID="bug-description-input"
                    value={description}
                    onChangeText={setDescription}
                    placeholder="What went wrong?"
                    placeholderTextColor={C.muted}
                    multiline
                    numberOfLines={3}
                    style={{
                      backgroundColor: C.bg,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: C.border,
                      color: C.text,
                      padding: 12,
                      fontSize: 14,
                      minHeight: 80,
                      textAlignVertical: 'top',
                    }}
                  />
                </View>

                <View>
                  <Text style={{ color: C.muted, fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 6 }}>
                    WHICH SCREEN?
                  </Text>
                  <TextInput
                    testID="bug-screen-input"
                    value={screen}
                    onChangeText={setScreen}
                    placeholder="e.g. Canvas, Files, AI Chat..."
                    placeholderTextColor={C.muted}
                    style={{
                      backgroundColor: C.bg,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: C.border,
                      color: C.text,
                      padding: 12,
                      fontSize: 14,
                    }}
                  />
                </View>

                <View>
                  <Text style={{ color: C.muted, fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 6 }}>
                    WHAT WERE YOU DOING?
                  </Text>
                  <TextInput
                    testID="bug-steps-input"
                    value={steps}
                    onChangeText={setSteps}
                    placeholder="Steps to reproduce..."
                    placeholderTextColor={C.muted}
                    multiline
                    numberOfLines={2}
                    style={{
                      backgroundColor: C.bg,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: C.border,
                      color: C.text,
                      padding: 12,
                      fontSize: 14,
                      minHeight: 60,
                      textAlignVertical: 'top',
                    }}
                  />
                </View>

                <Pressable
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? C.surface2 : C.bg,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: C.border,
                    borderStyle: 'dashed',
                    padding: 14,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: 8,
                  })}
                  testID="attach-screenshot-button"
                >
                  <Text style={{ fontSize: 16 }}>📎</Text>
                  <Text style={{ color: C.muted, fontSize: 13 }}>Attach Screenshot</Text>
                </Pressable>
              </View>

              {error ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
                  <AlertTriangle size={14} color={C.red} strokeWidth={2} />
                  <Text style={{ color: C.red, fontSize: 12 }}>{error}</Text>
                </View>
              ) : null}

              <Pressable
                onPress={handleSubmit}
                disabled={isSubmitting}
                testID="bug-submit-button"
                style={({ pressed }) => ({
                  backgroundColor: pressed ? '#a01830' : C.red,
                  borderRadius: 14,
                  paddingVertical: 16,
                  alignItems: 'center',
                  marginTop: 20,
                  opacity: isSubmitting ? 0.7 : 1,
                })}
              >
                {isSubmitting
                  ? <ActivityIndicator color="#FFF" size="small" />
                  : <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800' }}>Submit Report</Text>
                }
              </Pressable>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---- AI Support Chat ----
function AISupportChat({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEscalated, setIsEscalated] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  const initConversation = useCallback(async () => {
    if (!isLoggedIn) return;
    setIsLoading(true);
    setInitError(null);
    try {
      const conv = await api.get<Conversation>('/api/support/conversations');
      setConversationId(conv.id);
      if (conv.escalated) setIsEscalated(true);
    } catch {
      setInitError('Could not start chat. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn]);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    if (!conversationId) {
      initConversation();
    }
  }, [conversationId, initConversation]);

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || !conversationId || isLoading) return;
    const content = inputText.trim();
    setInputText('');
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    try {
      const result = await api.post<{ message: ChatMessage; escalated?: boolean }>(
        `/api/support/conversations/${conversationId}/messages`,
        { content }
      );
      setMessages((prev) => [...prev, result.message]);
      if (result.escalated) setIsEscalated(true);
    } catch {
      const errMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I had trouble responding. Please try again.',
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [inputText, conversationId, isLoading]);

  if (!isLoggedIn) {
    return null;
  }

  return (
    <>
      {/* Floating chat button */}
      <Pressable
        onPress={handleOpen}
        testID="support-chat-button"
        style={({ pressed }) => ({
          backgroundColor: pressed ? '#a01830' : C.red,
          borderRadius: 20,
          paddingHorizontal: 20,
          paddingVertical: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          shadowColor: C.red,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 12,
          elevation: 8,
        })}
      >
        <MessageCircle size={20} color="#FFF" strokeWidth={2} />
        <View>
          <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '800' }}>Chat with Support</Text>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>Usually replies in minutes</Text>
        </View>
      </Pressable>

      {/* Chat Modal */}
      <Modal visible={isOpen} animationType="slide" presentationStyle="formSheet">
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: C.bg }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <SafeAreaView edges={['top']}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: C.border,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: C.red + '22',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}
              >
                <MessageCircle size={18} color={C.red} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontSize: 16, fontWeight: '800' }}>Support Chat</Text>
                <Text style={{ color: C.muted, fontSize: 11 }}>Red String Team</Text>
              </View>
              <Pressable onPress={() => setIsOpen(false)} testID="chat-close-button">
                <X size={20} color={C.muted} strokeWidth={2} />
              </Pressable>
            </View>
          </SafeAreaView>

          {/* Escalation banner */}
          {isEscalated ? (
            <View
              style={{
                backgroundColor: C.pin + '22',
                borderBottomWidth: 1,
                borderBottomColor: C.pin + '44',
                paddingHorizontal: 20,
                paddingVertical: 10,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <AlertTriangle size={14} color={C.pin} strokeWidth={2} />
              <Text style={{ color: C.pin, fontSize: 12, fontWeight: '600' }}>
                Escalated to Jess — reply within 24 hours
              </Text>
            </View>
          ) : null}

          {/* Messages */}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              initError ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
                  <Text style={{ color: C.red, fontSize: 13, textAlign: 'center' }}>{initError}</Text>
                </View>
              ) : isLoading ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
                  <ActivityIndicator color={C.red} />
                </View>
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
                  <Text style={{ fontSize: 32, marginBottom: 12 }}>👋</Text>
                  <Text style={{ color: C.text, fontSize: 15, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>
                    Hi! How can we help?
                  </Text>
                  <Text style={{ color: C.muted, fontSize: 13, textAlign: 'center', lineHeight: 18 }}>
                    Ask anything about Red String or describe an issue.
                  </Text>
                </View>
              )
            }
            renderItem={({ item }) => (
              <View
                style={{
                  alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                  backgroundColor: item.role === 'user' ? C.red : C.surface,
                  borderRadius: 16,
                  borderBottomRightRadius: item.role === 'user' ? 4 : 16,
                  borderBottomLeftRadius: item.role === 'assistant' ? 4 : 16,
                  padding: 12,
                  borderWidth: item.role === 'assistant' ? 1 : 0,
                  borderColor: C.border,
                }}
              >
                <Text style={{ color: item.role === 'user' ? '#FFF' : C.text, fontSize: 14, lineHeight: 20 }}>
                  {item.content}
                </Text>
              </View>
            )}
          />

          {/* Typing indicator */}
          {isLoading && messages.length > 0 ? (
            <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
              <View
                style={{
                  backgroundColor: C.surface,
                  borderRadius: 16,
                  borderBottomLeftRadius: 4,
                  padding: 12,
                  alignSelf: 'flex-start',
                  borderWidth: 1,
                  borderColor: C.border,
                }}
              >
                <ActivityIndicator size="small" color={C.muted} />
              </View>
            </View>
          ) : null}

          {/* Input row */}
          <SafeAreaView edges={['bottom']}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-end',
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderTopWidth: 1,
                borderTopColor: C.border,
                gap: 10,
              }}
            >
              <TextInput
                testID="chat-input"
                value={inputText}
                onChangeText={setInputText}
                placeholder="Message support..."
                placeholderTextColor={C.muted}
                multiline
                style={{
                  flex: 1,
                  backgroundColor: C.surface,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: C.border,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  color: C.text,
                  fontSize: 14,
                  maxHeight: 100,
                }}
              />
              <Pressable
                onPress={handleSend}
                disabled={!inputText.trim() || isLoading}
                testID="chat-send-button"
                style={({ pressed }) => ({
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: inputText.trim() ? (pressed ? '#a01830' : C.red) : C.surface2,
                  alignItems: 'center',
                  justifyContent: 'center',
                })}
              >
                <Send size={18} color={inputText.trim() ? '#FFF' : C.muted} strokeWidth={2} />
              </Pressable>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

// ---- Main Help Screen ----
export default function HelpScreen() {
  const router = useRouter();
  const { data: session } = useSession();

  const [searchQuery, setSearchQuery] = useState('');
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const [votes, setVotes] = useState<Record<string, boolean | null>>({});
  const [showBugModal, setShowBugModal] = useState(false);

  const toggleItem = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOpenItems((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleVote = useCallback(async (itemId: string, helpful: boolean) => {
    setVotes((prev) => ({ ...prev, [itemId]: helpful }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await api.post('/api/support/faq-feedback', { faqItemId: itemId, helpful });
    } catch {
      // silently fail votes
    }
  }, []);

  const filteredSections = FAQ_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) =>
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((section) => section.items.length > 0);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }} testID="help-screen">
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: C.border,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            testID="help-back-button"
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: pressed ? C.surface2 : C.surface,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: C.border,
              marginRight: 14,
            })}
          >
            <X size={16} color={C.muted} strokeWidth={2} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.text, fontSize: 20, fontWeight: '900' }}>Help & Support</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Search bar */}
          <Animated.View entering={FadeInDown.duration(400)} style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: C.surface,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: C.border,
                paddingHorizontal: 14,
                gap: 10,
              }}
            >
              <Search size={16} color={C.muted} strokeWidth={2} />
              <TextInput
                testID="faq-search-input"
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search FAQ..."
                placeholderTextColor={C.muted}
                style={{
                  flex: 1,
                  color: C.text,
                  fontSize: 14,
                  paddingVertical: 12,
                }}
              />
              {searchQuery.length > 0 ? (
                <Pressable onPress={() => setSearchQuery('')}>
                  <X size={14} color={C.muted} strokeWidth={2} />
                </Pressable>
              ) : null}
            </View>
          </Animated.View>

          {/* FAQ Sections */}
          {filteredSections.length === 0 ? (
            <Animated.View entering={FadeIn.duration(300)} style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ fontSize: 32, marginBottom: 12 }}>🔍</Text>
              <Text style={{ color: C.muted, fontSize: 14, textAlign: 'center' }}>
                No results for "{searchQuery}"
              </Text>
            </Animated.View>
          ) : (
            filteredSections.map((section, sIdx) => (
              <Animated.View
                key={section.title}
                entering={FadeInDown.delay(sIdx * 50).duration(400)}
                style={{ paddingHorizontal: 20, paddingTop: 20 }}
              >
                <Text
                  style={{
                    color: C.muted,
                    fontSize: 10,
                    fontWeight: '800',
                    letterSpacing: 2,
                    marginBottom: 8,
                    paddingLeft: 4,
                  }}
                >
                  {section.title.toUpperCase()}
                </Text>
                <View
                  style={{
                    backgroundColor: C.surface,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: C.border,
                    overflow: 'hidden',
                  }}
                >
                  {section.items.map((item, iIdx) => (
                    <View key={item.id} style={{ borderTopWidth: iIdx > 0 ? 1 : 0, borderTopColor: C.border }}>
                      <FaqAccordionItem
                        item={item}
                        isOpen={!!openItems[item.id]}
                        onToggle={() => toggleItem(item.id)}
                        voted={votes[item.id] !== undefined ? votes[item.id] : null}
                        onVote={(helpful) => handleVote(item.id, helpful)}
                      />
                    </View>
                  ))}
                </View>
              </Animated.View>
            ))
          )}

          {/* Bug Report Section */}
          <Animated.View entering={FadeInDown.delay(200).duration(400)} style={{ paddingHorizontal: 20, paddingTop: 24 }}>
            <Text
              style={{
                color: C.muted,
                fontSize: 10,
                fontWeight: '800',
                letterSpacing: 2,
                marginBottom: 8,
                paddingLeft: 4,
              }}
            >
              REPORT AN ISSUE
            </Text>
            <View
              style={{
                backgroundColor: C.surface,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: C.border,
                padding: 16,
              }}
            >
              <Text style={{ color: C.text, fontSize: 14, fontWeight: '600', marginBottom: 4 }}>
                Found a bug?
              </Text>
              <Text style={{ color: C.muted, fontSize: 13, lineHeight: 18, marginBottom: 14 }}>
                Help us improve Red String by reporting issues. Jess reads every report personally.
              </Text>
              <Pressable
                onPress={() => setShowBugModal(true)}
                testID="open-bug-report-button"
                style={({ pressed }) => ({
                  backgroundColor: pressed ? C.surface2 : 'transparent',
                  borderRadius: 12,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderWidth: 1,
                  borderColor: C.red + '44',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                })}
              >
                <Bug size={16} color={C.red} strokeWidth={2} />
                <Text style={{ color: C.red, fontSize: 14, fontWeight: '700' }}>Report a Bug</Text>
              </Pressable>
            </View>
          </Animated.View>

          {/* AI Support Chat */}
          <Animated.View entering={FadeInDown.delay(250).duration(400)} style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 }}>
            <Text
              style={{
                color: C.muted,
                fontSize: 10,
                fontWeight: '800',
                letterSpacing: 2,
                marginBottom: 8,
                paddingLeft: 4,
              }}
            >
              LIVE SUPPORT
            </Text>
            <AISupportChat isLoggedIn={!!session?.user} />
            {!session?.user ? (
              <View
                style={{
                  backgroundColor: C.surface,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: C.border,
                  padding: 16,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: C.muted, fontSize: 13, textAlign: 'center' }}>
                  Sign in to access live support chat.
                </Text>
              </View>
            ) : null}
          </Animated.View>
        </ScrollView>
      </SafeAreaView>

      <BugReportModal visible={showBugModal} onClose={() => setShowBugModal(false)} />
    </View>
  );
}
