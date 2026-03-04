import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Plus, FileText, Cable, ChevronRight, Trash2, Search, Lock, Users, User, LogOut } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import useInvestigationStore from '@/lib/state/investigation-store';
import useSubscriptionStore from '@/lib/state/subscription-store';
import useCollabStore from '@/lib/state/collab-store';
import { useSession } from '@/lib/auth/use-session';
import { useInvalidateSession } from '@/lib/auth/use-session';
import { authClient } from '@/lib/auth/auth-client';
import CollabSheet from '@/components/CollabSheet';
import type { Investigation } from '@/lib/types';
import type { CollabSession } from '@/lib/state/collab-store';

// Color constants
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

function InvestigationCard({
  investigation,
  index,
  collabSession,
  onPress,
  onLongPress,
  onCollabPress,
}: {
  investigation: Investigation;
  index: number;
  collabSession: CollabSession | null;
  onPress: () => void;
  onLongPress: () => void;
  onCollabPress: () => void;
}) {
  const nodeCount = investigation.nodes.length;
  const stringCount = investigation.strings.length;
  const memberCount = collabSession?.members.length ?? 0;

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 80).duration(400).springify()}
      style={{
        marginHorizontal: 20,
        marginBottom: 16,
      }}
    >
      <Pressable
        testID={`investigation-card-${investigation.id}`}
        onPress={onPress}
        onLongPress={onLongPress}
        style={({ pressed }) => ({
          backgroundColor: COLORS.card,
          borderRadius: 12,
          padding: 16,
          opacity: pressed ? 0.92 : 1,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
          elevation: 6,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        })}
      >
        {/* Pushpin accent */}
        <View
          style={{
            position: 'absolute',
            top: -6,
            left: 24,
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: COLORS.pin,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 2,
            elevation: 4,
            zIndex: 1,
          }}
        />

        {/* Card content */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text
              className="text-lg font-bold"
              style={{ color: COLORS.cardText, marginBottom: 4 }}
              numberOfLines={1}
            >
              {investigation.title}
            </Text>
            {investigation.description ? (
              <Text
                className="text-sm"
                style={{ color: COLORS.muted, lineHeight: 20 }}
                numberOfLines={2}
              >
                {investigation.description}
              </Text>
            ) : null}
          </View>
          <ChevronRight size={20} color={COLORS.muted} strokeWidth={2} />
        </View>

        {/* Stats row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <FileText size={14} color={COLORS.muted} strokeWidth={2} />
            <Text className="text-xs font-medium" style={{ color: COLORS.muted }}>
              {nodeCount} {nodeCount === 1 ? 'node' : 'nodes'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Cable size={14} color={COLORS.red} strokeWidth={2} />
            <Text className="text-xs font-medium" style={{ color: COLORS.muted }}>
              {stringCount} {stringCount === 1 ? 'string' : 'strings'}
            </Text>
          </View>
          <View style={{ flex: 1 }} />

          {/* Collab badge */}
          {collabSession ? (
            <Pressable
              testID={`collab-badge-${investigation.id}`}
              onPress={(e) => {
                e.stopPropagation?.();
                onCollabPress();
              }}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: pressed ? 'rgba(196,30,58,0.2)' : 'rgba(196,30,58,0.1)',
                borderRadius: 8,
                paddingHorizontal: 7,
                paddingVertical: 3,
                borderWidth: 1,
                borderColor: 'rgba(196,30,58,0.3)',
              })}
            >
              <Users size={11} color={COLORS.red} strokeWidth={2.5} />
              <Text style={{ color: COLORS.red, fontSize: 10, fontWeight: '700' }}>
                {memberCount}
              </Text>
            </Pressable>
          ) : null}

          <Text className="text-xs" style={{ color: COLORS.muted }}>
            {formatDate(investigation.updatedAt)}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function EmptyState() {
  return (
    <View className="flex-1 items-center justify-center" style={{ paddingHorizontal: 40, paddingBottom: 60 }}>
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: COLORS.surface,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
        }}
      >
        <Search size={36} color={COLORS.muted} strokeWidth={1.5} />
      </View>
      <Text
        className="text-lg font-semibold text-center"
        style={{ color: COLORS.textLight, marginBottom: 8 }}
      >
        No investigations yet
      </Text>
      <Text
        className="text-sm text-center"
        style={{ color: COLORS.muted, lineHeight: 20 }}
      >
        Every conspiracy begins with a single thread. Tap the button above to start your first investigation.
      </Text>
    </View>
  );
}

export default function InvestigationsDashboard() {
  const router = useRouter();
  const investigations = useInvestigationStore((s) => s.investigations);
  const createInvestigation = useInvestigationStore((s) => s.createInvestigation);
  const deleteInvestigation = useInvestigationStore((s) => s.deleteInvestigation);
  const setActiveInvestigation = useInvestigationStore((s) => s.setActiveInvestigation);

  const tier = useSubscriptionStore((s) => s.tier);
  const maxInvestigations = useSubscriptionStore((s) => s.maxInvestigations);
  const maxInvestigationsCount = maxInvestigations();

  const sessions = useCollabStore((s) => s.sessions);

  const { data: session } = useSession();
  const invalidateSession = useInvalidateSession();

  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showLimitModal, setShowLimitModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [showAccountModal, setShowAccountModal] = useState<boolean>(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetTitle, setDeleteTargetTitle] = useState<string>('');
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');
  const [isSigningOut, setIsSigningOut] = useState<boolean>(false);

  // Collab sheet state
  const [collabSheetInvestigationId, setCollabSheetInvestigationId] = useState<string | null>(null);
  const [collabSheetVisible, setCollabSheetVisible] = useState<boolean>(false);

  // Sort investigations by most recently updated
  const sortedInvestigations = React.useMemo(
    () => [...investigations].sort((a, b) => b.updatedAt - a.updatedAt),
    [investigations]
  );

  // Map investigation id -> collab session
  const collabSessionMap = React.useMemo(() => {
    const map = new Map<string, CollabSession>();
    for (const s of sessions) {
      map.set(s.investigationId, s);
    }
    return map;
  }, [sessions]);

  const handleCreate = useCallback(() => {
    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    createInvestigation(trimmedTitle, newDescription.trim() || undefined);
    setNewTitle('');
    setNewDescription('');
    setShowCreateModal(false);
    router.push('/(tabs)/two');
  }, [newTitle, newDescription, createInvestigation, router]);

  const handleNewInvestigationPress = useCallback(() => {
    if (investigations.length >= maxInvestigationsCount) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setShowLimitModal(true);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowCreateModal(true);
  }, [investigations.length, maxInvestigationsCount]);

  const handleCardPress = useCallback(
    (id: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setActiveInvestigation(id);
      router.push('/(tabs)/two');
    },
    [setActiveInvestigation, router]
  );

  const handleCardLongPress = useCallback(
    (id: string, title: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setDeleteTargetId(id);
      setDeleteTargetTitle(title);
      setShowDeleteModal(true);
    },
    []
  );

  const handleDelete = useCallback(() => {
    if (!deleteTargetId) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    deleteInvestigation(deleteTargetId);
    setDeleteTargetId(null);
    setDeleteTargetTitle('');
    setShowDeleteModal(false);
  }, [deleteTargetId, deleteInvestigation]);

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

  const renderItem = useCallback(
    ({ item, index }: { item: Investigation; index: number }) => (
      <InvestigationCard
        investigation={item}
        index={index}
        collabSession={collabSessionMap.get(item.id) ?? null}
        onPress={() => handleCardPress(item.id)}
        onLongPress={() => handleCardLongPress(item.id, item.title)}
        onCollabPress={() => handleCollabPress(item.id)}
      />
    ),
    [handleCardPress, handleCardLongPress, handleCollabPress, collabSessionMap]
  );

  const keyExtractor = useCallback((item: Investigation) => item.id, []);

  const tierLabel = tier === 'free' ? 'FREE' : tier === 'pro' ? 'PRO' : 'PLUS';
  const tierColor = tier === 'free' ? COLORS.muted : tier === 'pro' ? COLORS.pin : '#F0C060';

  const activeCollabSession = collabSheetInvestigationId
    ? (collabSessionMap.get(collabSheetInvestigationId) ?? null)
    : null;

  return (
    <View className="flex-1" style={{ backgroundColor: COLORS.background }} testID="investigations-screen">
      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <Text
                className="text-3xl font-black"
                style={{ color: COLORS.red, letterSpacing: 2 }}
              >
                RED STRING
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {/* Account button */}
              <Pressable
                testID="account-button"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowAccountModal(true);
                }}
                style={({ pressed }) => ({
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: pressed ? COLORS.border : COLORS.surface,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                })}
              >
                <User size={15} color={COLORS.muted} strokeWidth={2} />
              </Pressable>

              {/* Plan badge */}
              <Pressable
                testID="plan-badge"
                onPress={() => router.push('/paywall')}
                style={{
                  backgroundColor: tierColor + '22',
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderWidth: 1,
                  borderColor: tierColor + '55',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Text style={{ color: tierColor, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 }}>
                  {tierLabel}
                </Text>
                {tier === 'free' ? (
                  <Lock size={10} color={tierColor} strokeWidth={2.5} />
                ) : null}
              </Pressable>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text
              className="text-sm font-semibold"
              style={{ color: COLORS.muted, letterSpacing: 4, marginTop: 2 }}
            >
              RESEARCH
            </Text>
            {maxInvestigationsCount !== Infinity ? (
              <Text style={{ color: COLORS.muted, fontSize: 11 }}>
                {investigations.length}/{maxInvestigationsCount} cases
              </Text>
            ) : null}
          </View>
        </View>

        {/* New Investigation Button */}
        <Pressable
          testID="new-investigation-button"
          onPress={handleNewInvestigationPress}
          style={({ pressed }) => ({
            marginHorizontal: 20,
            marginTop: 16,
            marginBottom: 20,
            backgroundColor: pressed ? '#A3162E' : COLORS.red,
            borderRadius: 12,
            padding: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            shadowColor: COLORS.red,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 6,
          })}
        >
          <Plus size={20} color="#FFFFFF" strokeWidth={2.5} />
          <Text className="text-base font-bold" style={{ color: '#FFFFFF', letterSpacing: 0.5 }}>
            New Investigation
          </Text>
        </Pressable>

        {/* Investigations List */}
        {sortedInvestigations.length === 0 ? (
          <EmptyState />
        ) : (
          <FlatList
            testID="investigations-list"
            data={sortedInvestigations}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={{ paddingTop: 4, paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>

      {/* Account Modal */}
      <Modal
        visible={showAccountModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAccountModal(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.7)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
          }}
          onPress={() => setShowAccountModal(false)}
        >
          <Pressable
            onPress={() => {}}
            style={{
              width: '100%',
              maxWidth: 360,
              backgroundColor: COLORS.surface,
              borderRadius: 20,
              padding: 24,
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            {/* Avatar */}
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: 'rgba(196,30,58,0.15)',
                  borderWidth: 2,
                  borderColor: 'rgba(196,30,58,0.3)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                }}
              >
                <User size={28} color={COLORS.red} strokeWidth={1.5} />
              </View>
              <Text style={{ color: COLORS.textLight, fontSize: 16, fontWeight: '700' }}>
                {session?.user?.name || 'Investigator'}
              </Text>
              <Text style={{ color: COLORS.muted, fontSize: 13, marginTop: 2 }}>
                {session?.user?.email || ''}
              </Text>
            </View>

            {/* Plan badge */}
            <View
              style={{
                backgroundColor: tierColor + '15',
                borderRadius: 10,
                padding: 12,
                marginBottom: 20,
                borderWidth: 1,
                borderColor: tierColor + '33',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Text style={{ color: tierColor, fontSize: 13, fontWeight: '700', letterSpacing: 1 }}>
                {tierLabel} PLAN
              </Text>
              {tier !== 'free' ? null : (
                <Pressable
                  onPress={() => {
                    setShowAccountModal(false);
                    router.push('/paywall');
                  }}
                >
                  <Text style={{ color: COLORS.red, fontSize: 12, fontWeight: '600' }}>
                    Upgrade
                  </Text>
                </Pressable>
              )}
            </View>

            {/* Sign out */}
            <Pressable
              testID="sign-out-button"
              onPress={handleSignOut}
              disabled={isSigningOut}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                paddingVertical: 14,
                borderRadius: 12,
                backgroundColor: pressed ? 'rgba(196,30,58,0.15)' : 'rgba(196,30,58,0.08)',
                borderWidth: 1,
                borderColor: 'rgba(196,30,58,0.25)',
                opacity: isSigningOut ? 0.7 : 1,
              })}
            >
              <LogOut size={16} color={COLORS.red} strokeWidth={2} />
              <Text style={{ color: COLORS.red, fontSize: 15, fontWeight: '700' }}>
                {isSigningOut ? 'Signing out...' : 'Sign Out'}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Create Investigation Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <Pressable
            style={{
              flex: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 24,
            }}
            onPress={() => setShowCreateModal(false)}
          >
            <Pressable
              onPress={() => {}}
              style={{
                width: '100%',
                maxWidth: 400,
                backgroundColor: COLORS.surface,
                borderRadius: 16,
                padding: 24,
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            >
              <Text
                className="text-xl font-bold"
                style={{ color: COLORS.textLight, marginBottom: 4 }}
              >
                New Investigation
              </Text>
              <Text
                className="text-sm"
                style={{ color: COLORS.muted, marginBottom: 20 }}
              >
                Start unraveling the truth
              </Text>

              <Text className="text-xs font-semibold" style={{ color: COLORS.muted, marginBottom: 6, letterSpacing: 1 }}>
                TITLE
              </Text>
              <TextInput
                testID="investigation-title-input"
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder="e.g., The Roswell Incident"
                placeholderTextColor={COLORS.muted}
                autoFocus
                style={{
                  backgroundColor: COLORS.background,
                  borderRadius: 10,
                  padding: 14,
                  color: COLORS.textLight,
                  fontSize: 16,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  marginBottom: 16,
                }}
              />

              <Text className="text-xs font-semibold" style={{ color: COLORS.muted, marginBottom: 6, letterSpacing: 1 }}>
                DESCRIPTION (OPTIONAL)
              </Text>
              <TextInput
                testID="investigation-description-input"
                value={newDescription}
                onChangeText={setNewDescription}
                placeholder="Brief overview of the case..."
                placeholderTextColor={COLORS.muted}
                multiline
                numberOfLines={3}
                style={{
                  backgroundColor: COLORS.background,
                  borderRadius: 10,
                  padding: 14,
                  color: COLORS.textLight,
                  fontSize: 16,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  marginBottom: 24,
                  minHeight: 80,
                  textAlignVertical: 'top',
                }}
              />

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Pressable
                  testID="cancel-create-button"
                  onPress={() => {
                    setNewTitle('');
                    setNewDescription('');
                    setShowCreateModal(false);
                  }}
                  style={({ pressed }) => ({
                    flex: 1,
                    paddingVertical: 14,
                    borderRadius: 10,
                    alignItems: 'center',
                    backgroundColor: pressed ? COLORS.border : 'transparent',
                    borderWidth: 1,
                    borderColor: COLORS.border,
                  })}
                >
                  <Text className="text-base font-semibold" style={{ color: COLORS.muted }}>
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  testID="confirm-create-button"
                  onPress={handleCreate}
                  style={({ pressed }) => ({
                    flex: 1,
                    paddingVertical: 14,
                    borderRadius: 10,
                    alignItems: 'center',
                    backgroundColor: newTitle.trim() ? (pressed ? '#A3162E' : COLORS.red) : COLORS.border,
                  })}
                >
                  <Text className="text-base font-bold" style={{ color: newTitle.trim() ? '#FFFFFF' : COLORS.muted }}>
                    Create
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Limit Reached Modal */}
      <Modal
        visible={showLimitModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLimitModal(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
          }}
          onPress={() => setShowLimitModal(false)}
        >
          <Pressable
            onPress={() => {}}
            style={{
              width: '100%',
              maxWidth: 400,
              backgroundColor: COLORS.surface,
              borderRadius: 20,
              padding: 28,
              borderWidth: 1,
              borderColor: COLORS.border,
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
              <Lock size={24} color={COLORS.red} strokeWidth={2} />
            </View>
            <Text className="text-xl font-bold" style={{ color: COLORS.textLight, marginBottom: 8, textAlign: 'center' }}>
              Investigation Limit Reached
            </Text>
            <Text className="text-sm" style={{ color: COLORS.muted, lineHeight: 20, marginBottom: 24, textAlign: 'center' }}>
              {tier === 'free'
                ? `Free accounts are limited to ${maxInvestigationsCount} investigations. Upgrade to Pro for up to 25, or Plus for unlimited.`
                : `You've reached the ${maxInvestigationsCount} investigation limit for your plan. Upgrade to Plus for unlimited investigations.`}
            </Text>
            <Pressable
              testID="upgrade-from-limit-button"
              onPress={() => {
                setShowLimitModal(false);
                router.push('/paywall');
              }}
              style={({ pressed }) => ({
                width: '100%',
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: 'center',
                backgroundColor: pressed ? '#A3162E' : COLORS.red,
                marginBottom: 12,
                shadowColor: COLORS.red,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
              })}
            >
              <Text className="text-base font-bold" style={{ color: '#FFFFFF' }}>
                Upgrade Now
              </Text>
            </Pressable>
            <Pressable
              testID="dismiss-limit-modal-button"
              onPress={() => setShowLimitModal(false)}
              style={({ pressed }) => ({
                paddingVertical: 10,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text style={{ color: COLORS.muted, fontSize: 14 }}>Not now</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
          }}
          onPress={() => setShowDeleteModal(false)}
        >
          <Pressable
            onPress={() => {}}
            style={{
              width: '100%',
              maxWidth: 400,
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              padding: 24,
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: 'rgba(196, 30, 58, 0.15)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Trash2 size={20} color={COLORS.red} strokeWidth={2} />
              </View>
              <Text className="text-lg font-bold" style={{ color: COLORS.textLight }}>
                Delete Investigation
              </Text>
            </View>
            <Text className="text-sm" style={{ color: COLORS.muted, lineHeight: 20, marginBottom: 24 }}>
              Are you sure you want to delete "{deleteTargetTitle}"? All nodes and connections will be permanently removed.
            </Text>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable
                testID="cancel-delete-button"
                onPress={() => {
                  setDeleteTargetId(null);
                  setDeleteTargetTitle('');
                  setShowDeleteModal(false);
                }}
                style={({ pressed }) => ({
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 10,
                  alignItems: 'center',
                  backgroundColor: pressed ? COLORS.border : 'transparent',
                  borderWidth: 1,
                  borderColor: COLORS.border,
                })}
              >
                <Text className="text-base font-semibold" style={{ color: COLORS.muted }}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                testID="confirm-delete-button"
                onPress={handleDelete}
                style={({ pressed }) => ({
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 10,
                  alignItems: 'center',
                  backgroundColor: pressed ? '#A3162E' : COLORS.red,
                })}
              >
                <Text className="text-base font-bold" style={{ color: '#FFFFFF' }}>
                  Delete
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Collab Sheet */}
      <CollabSheet
        investigationId={collabSheetInvestigationId ?? ''}
        session={activeCollabSession}
        visible={collabSheetVisible}
        onClose={() => setCollabSheetVisible(false)}
        currentUserId={session?.user?.id}
      />
    </View>
  );
}
