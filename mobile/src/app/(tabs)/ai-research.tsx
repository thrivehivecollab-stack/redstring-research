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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Mic,
  Send,
  Brain,
  Zap,
  BookOpen,
  Pin,
  X,
  MessageCircle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  SlideInUp,
  SlideOutDown,
} from 'react-native-reanimated';

// ─── Color constants ───────────────────────────────────────────────────────
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

// ─── Types ─────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: Date;
  pinned?: boolean;
}

// ─── AI response templates ─────────────────────────────────────────────────
function generateAIResponse(userMessage: string): string {
  const lower = userMessage.toLowerCase();

  if (lower.includes('evidence') || lower.includes('analyze')) {
    return `Analyzing the evidence you've described. Several key patterns emerge:\n\n• The timeline suggests a coordinated sequence of events between the identified parties\n• Cross-referencing known associates reveals three degrees of separation with the primary subject\n• Anomalies in the financial records align with the 72-hour window before the incident\n\nRecommendation: Focus your next node connections on the financial thread. Shall I map the known relationships?`;
  }
  if (lower.includes('connect') || lower.includes('connection')) {
    return `Connection analysis complete. I've identified potential links worth investigating:\n\n• Subject A and Subject C share three mutual contacts not previously documented\n• The geographic overlap between events on March 4th and March 11th suggests coordinated movement\n• A digital footprint pattern matches similar cases from 2019\n\nThese threads warrant red-string connections on your board. Pin any of these to your investigation?`;
  }
  if (lower.includes('research') || lower.includes('topic')) {
    return `Research complete. Here's what the open-source intelligence reveals:\n\n• Historical precedent shows three similar incidents in the past decade, all unresolved\n• Key players in this domain have documented ties to organizations of interest\n• Recent news coverage (last 90 days) contains 7 relevant articles flagged for cross-reference\n\nI can drill deeper into any of these threads. What aspect demands closest scrutiny?`;
  }
  if (lower.includes('summar') || lower.includes('case')) {
    return `Case Summary — Current Status:\n\n**Core Hypothesis:** The primary evidence chain supports a coordinated effort involving multiple actors.\n\n**Strongest Leads:** Financial anomalies (confidence: HIGH), Timeline inconsistencies (confidence: MEDIUM), Witness corroboration gaps (confidence: HIGH)\n\n**Missing Links:** Origin point of the initial event, Identity of the unnamed third party in document set B\n\nYour investigation is approximately 34% toward a conclusive narrative. Shall I suggest next investigative steps?`;
  }
  if (lower.includes('who') || lower.includes('person') || lower.includes('suspect')) {
    return `Person-of-interest analysis initiated. Based on available data patterns:\n\n• Primary subject: Known associations suggest professional background in logistics or finance\n• Secondary subject: Digital presence shows irregular activity spikes correlating with key dates\n• Unknown actor (referenced in node #7): Behavioral signature matches documented operatives from prior cases\n\nI recommend adding a dedicated node for each identified party. Want me to draft profile summaries?`;
  }
  if (lower.includes('when') || lower.includes('timeline') || lower.includes('date')) {
    return `Timeline reconstruction in progress. Critical temporal markers identified:\n\n• T-minus 72 hours: Anomalous communications logged\n• T-zero: Inciting incident (your anchor point)\n• T+24 hours: Three parties change behavior patterns simultaneously\n• T+7 days: Cover narrative solidifies across public record\n\nThe 72-hour pre-event window is the most actionable gap. Shall I generate a timeline node cluster for your board?`;
  }

  // Generic investigative response
  const responses = [
    `Interesting line of inquiry. Cross-referencing your question against known investigation frameworks:\n\n• The pattern you've identified appears in 23% of cases with similar profiles\n• Two adjacent threads could unlock this: the financial audit trail and the communications gap around the key dates\n• I'd recommend documenting this as a node — even unconfirmed threads have investigative value\n\nWhat additional context can you provide? The more data I have, the sharper the analysis.`,
    `Running analysis on your query. Initial findings:\n\n• Your investigation touches on a well-documented category of cases where official narratives diverge from physical evidence\n• Three key investigative principles apply here: follow the money, track the timeline, identify who benefits\n• Current evidence density in your case: moderate — you have enough to form a working hypothesis\n\nShall I suggest specific questions to pursue in your next research session?`,
    `Noted, Investigator. This is a critical piece of the puzzle. My assessment:\n\n• The information you've provided adds a new vector worth tracking\n• Historical pattern matching suggests this type of detail often connects to a larger organizational structure\n• Recommend flagging this for your red string board with HIGH priority\n\nI can help you draft a research brief or identify sources to corroborate this thread. What's your next move?`,
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

// ─── Quick action chips ────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { label: 'Analyze Evidence', icon: Zap },
  { label: 'Find Connections', icon: Brain },
  { label: 'Research Topic', icon: BookOpen },
  { label: 'Summarize Case', icon: MessageCircle },
];

// ─── ThinkingDots component ────────────────────────────────────────────────
function ThinkingDots() {
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    const bounce = (sv: Animated.SharedValue<number>, delay: number) => {
      sv.value = withRepeat(
        withSequence(
          withTiming(delay, { duration: 0 }),
          withTiming(-6, { duration: 350 }),
          withTiming(0, { duration: 350 })
        ),
        -1,
        false
      );
    };
    bounce(dot1, 0);
    setTimeout(() => bounce(dot2, 0), 180);
    setTimeout(() => bounce(dot3, 0), 360);
  }, []);

  const style1 = useAnimatedStyle(() => ({ transform: [{ translateY: dot1.value }] }));
  const style2 = useAnimatedStyle(() => ({ transform: [{ translateY: dot2.value }] }));
  const style3 = useAnimatedStyle(() => ({ transform: [{ translateY: dot3.value }] }));

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 10 }}>
      {[style1, style2, style3].map((style, i) => (
        <Animated.View
          key={i}
          style={[
            {
              width: 7,
              height: 7,
              borderRadius: 3.5,
              backgroundColor: COLORS.pin,
            },
            style,
          ]}
        />
      ))}
    </View>
  );
}

// ─── MessageBubble ─────────────────────────────────────────────────────────
function MessageBubble({
  message,
  index,
  onPin,
}: {
  message: Message;
  index: number;
  onPin: (id: string) => void;
}) {
  const isUser = message.role === 'user';

  const timeStr = message.timestamp.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <Animated.View
      entering={FadeInDown.delay(index < 5 ? 0 : 0).duration(320).springify()}
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
            marginBottom: 2,
          }}
        >
          <Brain size={14} color={COLORS.red} strokeWidth={2} />
        </View>
      ) : null}

      {/* Bubble */}
      <View style={{ maxWidth: '78%' }}>
        {/* AI badge */}
        {!isUser ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              marginBottom: 5,
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
          </View>
        ) : null}

        <View
          style={{
            backgroundColor: isUser ? COLORS.red : COLORS.surface,
            borderRadius: 16,
            borderBottomRightRadius: isUser ? 4 : 16,
            borderBottomLeftRadius: isUser ? 16 : 4,
            paddingHorizontal: 14,
            paddingVertical: 11,
            borderWidth: isUser ? 0 : 1,
            borderColor: COLORS.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 6,
            elevation: 3,
          }}
        >
          <Text
            style={{
              color: isUser ? '#FFF' : COLORS.textLight,
              fontSize: 14,
              lineHeight: 21,
              fontWeight: '400',
            }}
          >
            {message.text}
          </Text>
        </View>

        {/* Timestamp + Pin button for user messages */}
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

        {/* Pin to Board button for AI messages */}
        {!isUser ? (
          <Pressable
            testID={`pin-message-${message.id}`}
            onPress={() => onPin(message.id)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              marginTop: 7,
              alignSelf: 'flex-start',
              backgroundColor: message.pinned
                ? 'rgba(212,165,116,0.18)'
                : pressed
                ? 'rgba(212,165,116,0.12)'
                : 'rgba(212,165,116,0.07)',
              borderRadius: 8,
              paddingHorizontal: 9,
              paddingVertical: 5,
              borderWidth: 1,
              borderColor: message.pinned
                ? 'rgba(212,165,116,0.5)'
                : 'rgba(212,165,116,0.2)',
            })}
          >
            <Pin size={11} color={COLORS.pin} strokeWidth={2.5} />
            <Text style={{ color: COLORS.pin, fontSize: 11, fontWeight: '700' }}>
              {message.pinned ? 'Pinned' : 'Pin to Board'}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────
export default function AIResearchScreen() {
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'ai',
      text: 'Welcome, Investigator. I\'m your research assistant. Ask me anything about your investigation, request help analyzing evidence, suggest connections, or have me research topics for you. What are we uncovering today?',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState<string>('');
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [toastVisible, setToastVisible] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  const flatListRef = useRef<FlatList<Message>>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mic pulse animation
  const micPulse = useSharedValue(1);
  const micOpacity = useSharedValue(1);

  const micAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: micPulse.value }],
    opacity: micOpacity.value,
  }));

  const startMicAnimation = useCallback(() => {
    micPulse.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 600 }),
        withTiming(0.94, { duration: 600 })
      ),
      -1,
      true
    );
    micOpacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 600 }),
        withTiming(1, { duration: 600 })
      ),
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
    toastTimerRef.current = setTimeout(() => setToastVisible(false), 2400);
  }, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text || isThinking) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInputText('');

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);
    scrollToBottom();

    setTimeout(() => {
      const aiResponse = generateAIResponse(text);
      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        role: 'ai',
        text: aiResponse,
        timestamp: new Date(),
      };
      setIsThinking(false);
      setMessages((prev) => [...prev, aiMsg]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      scrollToBottom();
    }, 1500);
  }, [inputText, isThinking, scrollToBottom]);

  const handleMicPress = useCallback(() => {
    if (isListening) {
      setIsListening(false);
      stopMicAnimation();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      // Simulate captured voice input
      const voiceCapture = 'Analyze the evidence and find connections between the key suspects';
      setInputText(voiceCapture);
    } else {
      setIsListening(true);
      startMicAnimation();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      // Auto-stop after 3 seconds
      setTimeout(() => {
        setIsListening(false);
        stopMicAnimation();
        const voiceCapture = 'Analyze the evidence and find connections between the key suspects';
        setInputText(voiceCapture);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, 3000);
    }
  }, [isListening, startMicAnimation, stopMicAnimation]);

  const handleQuickAction = useCallback(
    (label: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setInputText(label);
    },
    []
  );

  const handlePinMessage = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, pinned: !m.pinned } : m))
    );
    showToast('Pinned to investigation board');
  }, [showToast]);

  const renderMessage = useCallback(
    ({ item, index }: { item: Message; index: number }) => (
      <MessageBubble message={item} index={index} onPin={handlePinMessage} />
    ),
    [handlePinMessage]
  );

  const keyExtractor = useCallback((item: Message) => item.id, []);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }} testID="ai-research-screen">
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* ── Header ───────────────────────────────────── */}
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
          {/* Brain icon as logo */}
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
                letterSpacing: 3,
                marginTop: 1,
              }}
            >
              ASSISTANT
            </Text>
          </View>

          {/* Status dot */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View
              style={{
                width: 7,
                height: 7,
                borderRadius: 3.5,
                backgroundColor: '#22C55E',
              }}
            />
            <Text style={{ color: COLORS.muted, fontSize: 11, fontWeight: '600' }}>
              ONLINE
            </Text>
          </View>
        </View>

        {/* ── Message list ─────────────────────────────── */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
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
            ListFooterComponent={
              isThinking ? (
                <Animated.View
                  entering={FadeIn.duration(200)}
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

          {/* ── Bottom input area ─────────────────────── */}
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
              {QUICK_ACTIONS.map(({ label, icon: Icon }) => (
                <Pressable
                  key={label}
                  testID={`quick-action-${label.toLowerCase().replace(/\s+/g, '-')}`}
                  onPress={() => handleQuickAction(label)}
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
                <Text style={{ color: COLORS.red, fontSize: 13, fontWeight: '700', flex: 1 }}>
                  Listening...
                </Text>
                <Pressable onPress={handleMicPress}>
                  <X size={16} color={COLORS.muted} strokeWidth={2} />
                </Pressable>
              </Animated.View>
            ) : null}

            {/* Text input row */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-end',
                paddingHorizontal: 16,
                gap: 10,
              }}
            >
              {/* Mic button */}
              <Animated.View style={micAnimStyle}>
                <Pressable
                  testID="mic-button"
                  onPress={handleMicPress}
                  style={({pressed}) => ({
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: isListening
                      ? COLORS.red
                      : pressed
                      ? 'rgba(196,30,58,0.2)'
                      : COLORS.surface,
                    borderWidth: 2,
                    borderColor: isListening
                      ? COLORS.red
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
                  <Mic
                    size={20}
                    color={isListening ? '#FFF' : COLORS.red}
                    strokeWidth={2}
                  />
                </Pressable>
              </Animated.View>

              {/* Text input */}
              <View
                style={{
                  flex: 1,
                  backgroundColor: COLORS.surface,
                  borderRadius: 24,
                  borderWidth: 1,
                  borderColor: inputText.length > 0 ? 'rgba(196,30,58,0.4)' : COLORS.border,
                  paddingHorizontal: 16,
                  paddingTop: 12,
                  paddingBottom: 12,
                  minHeight: 48,
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
                    fontSize: 14,
                    lineHeight: 20,
                    margin: 0,
                    padding: 0,
                  }}
                  onSubmitEditing={handleSend}
                  blurOnSubmit={false}
                />
              </View>

              {/* Send button */}
              <Pressable
                testID="send-button"
                onPress={handleSend}
                disabled={!inputText.trim() || isThinking}
                style={({ pressed }) => ({
                  width: 48,
                  height: 48,
                  borderRadius: 24,
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

      {/* ── Toast notification ───────────────────────── */}
      {toastVisible ? (
        <Animated.View
          entering={SlideInUp.springify().damping(22)}
          exiting={SlideOutDown.duration(200)}
          style={{
            position: 'absolute',
            bottom: 100,
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
          testID="pin-toast"
        >
          <Pin size={16} color={COLORS.pin} strokeWidth={2.5} />
          <Text style={{ color: COLORS.textLight, fontSize: 14, fontWeight: '600', flex: 1 }}>
            {toastMessage}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
}
