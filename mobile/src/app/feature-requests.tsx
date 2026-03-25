import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X, ChevronUp, Pin } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/api';

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

type Tier = 'free' | 'researcher' | 'investigator' | 'professional';
type RequestStatus = 'submitted' | 'under_review' | 'planned' | 'in_progress' | 'shipped';

type FeatureRequest = {
  id: string;
  title: string;
  description?: string;
  username: string;
  tier: Tier;
  votes: number;
  userVoted: boolean;
  status: RequestStatus;
  ownerComment?: string;
  pinned: boolean;
  createdAt: string;
};

const TIER_LABELS: Record<Tier, string> = {
  free: 'Free',
  researcher: 'Researcher',
  investigator: 'Investigator',
  professional: 'Professional',
};

const TIER_COLORS: Record<Tier, string> = {
  free: '#6B5D4F',
  researcher: '#C8934A',
  investigator: '#C41E3A',
  professional: '#F0C060',
};

const STATUS_CONFIG: Record<RequestStatus, { label: string; color: string; bg: string }> = {
  submitted: { label: 'Submitted', color: '#6B5D4F', bg: '#6B5D4F22' },
  under_review: { label: 'Under Review', color: '#D4A574', bg: '#D4A57422' },
  planned: { label: 'Planned', color: '#6B9FD4', bg: '#6B9FD422' },
  in_progress: { label: 'In Progress', color: '#E07B39', bg: '#E07B3922' },
  shipped: { label: 'Shipped', color: '#4CAF50', bg: '#4CAF5022' },
};

const TIERS: { value: Tier; label: string }[] = [
  { value: 'free', label: 'Free' },
  { value: 'researcher', label: 'Researcher' },
  { value: 'investigator', label: 'Investigator' },
  { value: 'professional', label: 'Professional' },
];

function TierBadge({ tier }: { tier: Tier }) {
  return (
    <View
      style={{
        backgroundColor: TIER_COLORS[tier] + '22',
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
      }}
    >
      <Text style={{ color: TIER_COLORS[tier], fontSize: 10, fontWeight: '700' }}>
        {TIER_LABELS[tier].toUpperCase()}
      </Text>
    </View>
  );
}

function StatusBadge({ status }: { status: RequestStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <View
      style={{
        backgroundColor: cfg.bg,
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
      }}
    >
      <Text style={{ color: cfg.color, fontSize: 10, fontWeight: '700' }}>
        {status === 'shipped' ? `${cfg.label}` : cfg.label.toUpperCase()}
      </Text>
    </View>
  );
}

function RequestCard({
  request,
  onVote,
}: {
  request: FeatureRequest;
  onVote: (id: string) => void;
}) {
  return (
    <Animated.View entering={FadeInDown.duration(300)}>
      <View
        style={{
          backgroundColor: C.surface,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: request.pinned ? C.pin + '44' : C.border,
          padding: 16,
          marginBottom: 10,
        }}
      >
        {/* Pin indicator */}
        {request.pinned ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 }}>
            <Pin size={11} color={C.pin} strokeWidth={2} />
            <Text style={{ color: C.pin, fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>PINNED</Text>
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          {/* Vote button */}
          <Pressable
            onPress={() => onVote(request.id)}
            testID={`vote-button-${request.id}`}
            style={({ pressed }) => ({
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: request.userVoted
                ? C.red + '22'
                : pressed
                ? C.surface2
                : 'transparent',
              borderRadius: 10,
              borderWidth: 1,
              borderColor: request.userVoted ? C.red + '66' : C.border,
              paddingHorizontal: 10,
              paddingVertical: 8,
              minWidth: 44,
            })}
          >
            <ChevronUp
              size={16}
              color={request.userVoted ? C.red : C.muted}
              strokeWidth={2.5}
            />
            <Text
              style={{
                color: request.userVoted ? C.red : C.muted,
                fontSize: 13,
                fontWeight: '800',
                marginTop: 2,
              }}
            >
              {request.votes}
            </Text>
          </Pressable>

          {/* Content */}
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.text, fontSize: 15, fontWeight: '700', lineHeight: 20, marginBottom: 4 }}>
              {request.title}
            </Text>
            {request.description ? (
              <Text
                style={{ color: C.muted, fontSize: 13, lineHeight: 18, marginBottom: 8 }}
                numberOfLines={2}
              >
                {request.description}
              </Text>
            ) : null}

            {/* Meta row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text style={{ color: C.muted, fontSize: 11 }}>{request.username}</Text>
              <Text style={{ color: C.border, fontSize: 11 }}>·</Text>
              <TierBadge tier={request.tier} />
              <StatusBadge status={request.status} />
            </View>

            {/* Owner comment */}
            {request.ownerComment ? (
              <View
                style={{
                  marginTop: 10,
                  backgroundColor: C.surface2,
                  borderRadius: 10,
                  padding: 10,
                  borderLeftWidth: 3,
                  borderLeftColor: C.red,
                }}
              >
                <Text style={{ color: C.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 3 }}>
                  TEAM NOTE
                </Text>
                <Text style={{ color: C.text, fontSize: 12, lineHeight: 16 }}>{request.ownerComment}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

export default function FeatureRequestsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTier, setSelectedTier] = useState<Tier>('free');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data: requests = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['feature-requests'],
    queryFn: () => api.get<FeatureRequest[]>('/api/feature-requests'),
  });

  const { mutate: submitMutate, isPending: isSubmitPending } = useMutation({
    mutationFn: (data: { title: string; description?: string; tier: Tier }) =>
      api.post<FeatureRequest>('/api/feature-requests', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-requests'] });
      setTitle('');
      setDescription('');
      setSelectedTier('free');
      setSubmitError(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (err: Error) => {
      setSubmitError(err.message ?? 'Failed to submit. Please try again.');
    },
  });

  const { mutate: voteMutate } = useMutation({
    mutationFn: (id: string) => api.post<{ votes: number; userVoted: boolean }>(`/api/feature-requests/${id}/vote`, {}),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['feature-requests'] });
      const previous = queryClient.getQueryData<FeatureRequest[]>(['feature-requests']);
      queryClient.setQueryData<FeatureRequest[]>(['feature-requests'], (old = []) =>
        old.map((r) =>
          r.id === id
            ? { ...r, userVoted: !r.userVoted, votes: r.userVoted ? r.votes - 1 : r.votes + 1 }
            : r
        )
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['feature-requests'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-requests'] });
    },
  });

  const handleSubmit = useCallback(() => {
    if (!title.trim()) {
      setSubmitError('Please enter a title.');
      return;
    }
    setSubmitError(null);
    submitMutate({
      title: title.trim(),
      description: description.trim() || undefined,
      tier: selectedTier,
    });
  }, [title, description, selectedTier, submitMutate]);

  const handleVote = useCallback(
    (id: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      voteMutate(id);
    },
    [voteMutate]
  );

  // Sort: pinned first, then by votes, then by date
  const sorted = [...requests].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (b.votes !== a.votes) return b.votes - a.votes;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }} testID="feature-requests-screen">
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
            testID="feature-requests-back"
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
            <Text style={{ color: C.text, fontSize: 20, fontWeight: '900' }}>Feature Requests</Text>
            <Text style={{ color: C.muted, fontSize: 12, marginTop: 1 }}>Vote on what we build next</Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={C.red}
            />
          }
        >
          {/* Submit form */}
          <Animated.View
            entering={FadeInDown.duration(400)}
            style={{
              margin: 20,
              backgroundColor: C.surface,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: C.border,
              padding: 16,
            }}
          >
            <Text
              style={{
                color: C.muted,
                fontSize: 10,
                fontWeight: '800',
                letterSpacing: 2,
                marginBottom: 12,
              }}
            >
              SUGGEST A FEATURE
            </Text>

            <TextInput
              testID="feature-title-input"
              value={title}
              onChangeText={setTitle}
              placeholder="What should we build?"
              placeholderTextColor={C.muted}
              style={{
                backgroundColor: C.bg,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: C.border,
                color: C.text,
                padding: 12,
                fontSize: 14,
                marginBottom: 10,
              }}
            />

            <TextInput
              testID="feature-description-input"
              value={description}
              onChangeText={setDescription}
              placeholder="More detail (optional)..."
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
                minHeight: 70,
                textAlignVertical: 'top',
                marginBottom: 10,
              }}
            />

            {/* Tier selector */}
            <Text style={{ color: C.muted, fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 8 }}>
              I AM A
            </Text>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
              {TIERS.map((t) => (
                <Pressable
                  key={t.value}
                  testID={`tier-select-${t.value}`}
                  onPress={() => setSelectedTier(t.value)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: selectedTier === t.value ? TIER_COLORS[t.value] : C.border,
                    backgroundColor: selectedTier === t.value ? TIER_COLORS[t.value] + '22' : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      color: selectedTier === t.value ? TIER_COLORS[t.value] : C.muted,
                      fontSize: 12,
                      fontWeight: '700',
                    }}
                  >
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {submitError ? (
              <Text style={{ color: C.red, fontSize: 12, marginBottom: 8 }}>{submitError}</Text>
            ) : null}

            <Pressable
              onPress={handleSubmit}
              disabled={isSubmitPending}
              testID="feature-submit-button"
              style={({ pressed }) => ({
                backgroundColor: pressed ? '#a01830' : C.red,
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
                opacity: isSubmitPending ? 0.7 : 1,
              })}
            >
              {isSubmitPending ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '800' }}>Submit Request</Text>
              )}
            </Pressable>
          </Animated.View>

          {/* Feed */}
          <View style={{ paddingHorizontal: 20, paddingBottom: 32 }}>
            <Text
              style={{
                color: C.muted,
                fontSize: 10,
                fontWeight: '800',
                letterSpacing: 2,
                marginBottom: 12,
              }}
            >
              {sorted.length > 0 ? `${sorted.length} REQUESTS` : 'ALL REQUESTS'}
            </Text>

            {isLoading ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <ActivityIndicator color={C.red} />
              </View>
            ) : sorted.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Text style={{ fontSize: 32, marginBottom: 12 }}>💡</Text>
                <Text style={{ color: C.muted, fontSize: 14, textAlign: 'center' }}>
                  Be the first to suggest a feature!
                </Text>
              </View>
            ) : (
              sorted.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  onVote={handleVote}
                />
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
