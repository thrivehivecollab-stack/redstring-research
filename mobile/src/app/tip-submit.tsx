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
