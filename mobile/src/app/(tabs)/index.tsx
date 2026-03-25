import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Trash2, Lock, Users, User, LogOut, HelpCircle, Play, Inbox, Mail, ScrollText } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import useInvestigationStore, { seedMockInvestigations } from '@/lib/state/investigation-store';
import useSubscriptionStore from '@/lib/state/subscription-store';
import useCollabStore from '@/lib/state/collab-store';
import useSecurityStore from '@/lib/state/security-store';
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

const C = {
  bg: '#0F0D0B',
  surface: '#1A1714',
  surface2: '#211E1A',
  surface3: '#2A2520',
  card: '#F2E8D5',
  cardText: '#1C1008',
  cardMuted: 'rgba(44,24,16,0.55)',
  red: '#C41E3A',
  redDim: 'rgba(196,30,58,0.12)',
  pin: '#C8934A',
  gold: '#D4A832',
  text: '#EDE0CC',
  text2: '#C4B49A',
  muted: '#6B5D4F',
  border: '#272320',
  border2: '#322D28',
} as const;

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getDefaultIcon(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('kirk') || t.includes('charlie')) return '🎯';
  if (t.includes('tucker') || t.includes('carlson')) return '📺';
  if (t.includes('obama') || t.includes('biden') || t.includes('trump')) return '🏛️';
  if (t.includes('media') || t.includes('news')) return '📰';
  if (t.includes('money') || t.includes('bank') || t.includes('financ')) return '💰';
  if (t.includes('health') || t.includes('pharma') || t.includes('covid')) return '💊';
  if (t.includes('tech') || t.includes(' ai ') || t.includes('data')) return '📡';
  if (t.includes('epstein') || t.includes('maxwell')) return '🔍';
  if (t.includes('election') || t.includes('vote')) return '🗳️';
  if (t.includes('military') || t.includes('weapon') || t.includes('war')) return '🎖️';
  if (t.includes('operation') || t.includes('shadow') || t.includes('network')) return '🕵️';
  return '🔍';
}

// ── Grid card (3-column icon cell) ────────────────────────────────────────────
function GridCard({
  investigation,
  cellSize,
  index,
  onPress,
  onLongPress,
}: {
  investigation: Investigation;
  cellSize: number;
  index: number;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const icon = (investigation as any).icon ?? getDefaultIcon(investigation.title);
  const iconSize = cellSize - 16;

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(280).springify()}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        style={({ pressed }) => ({
          width: cellSize,
          alignItems: 'center',
          opacity: pressed ? 0.8 : 1,
          transform: [{ scale: pressed ? 0.94 : 1 }],
          marginBottom: 16,
        })}
      >
        {/* Icon cell */}
        <View style={{
          width: iconSize,
          height: iconSize,
          borderRadius: 20,
          backgroundColor: C.surface2,
          borderWidth: 1,
          borderColor: C.border2,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 5,
        }}>
          {/* Gold pushpin */}
          <View style={{
            position: 'absolute',
            top: -5,
            alignSelf: 'center',
            width: 11,
            height: 11,
            borderRadius: 5.5,
            backgroundColor: C.pin,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.4,
            shadowRadius: 2,
            elevation: 3,
            zIndex: 2,
          }} />
          <Text style={{ fontSize: 34 }}>{icon}</Text>
          {(investigation as any).isSeeded ? (
            <View style={{
              position: 'absolute', bottom: -2, right: -2,
              backgroundColor: '#F59E0B', borderRadius: 4,
              paddingHorizontal: 4, paddingVertical: 1,
              zIndex: 3,
            }}>
              <Text style={{ color: '#000', fontSize: 8, fontWeight: '900', letterSpacing: 0.5 }}>DEMO</Text>
            </View>
          ) : null}
        </View>
        {/* Label */}
        <Text
          numberOfLines={2}
          style={{
            color: C.text2,
            fontSize: 11,
            fontWeight: '600',
            textAlign: 'center',
            marginTop: 7,
            lineHeight: 15,
            paddingHorizontal: 4,
            width: cellSize,
          }}
        >
          {investigation.title}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// ── New case cell ──────────────────────────────────────────────────────────────
function NewCaseCell({ cellSize, onPress }: { cellSize: number; onPress: () => void }) {
  const iconSize = cellSize - 16;
  return (
    <Pressable
      testID="new-investigation-button"
      onPress={onPress}
      style={({ pressed }) => ({
        width: cellSize,
        alignItems: 'center',
        marginBottom: 16,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View style={{
        width: iconSize,
        height: iconSize,
        borderRadius: 20,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: C.border2,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Text style={{ color: C.muted, fontSize: 28, lineHeight: 32 }}>+</Text>
      </View>
      <Text style={{
        color: C.muted,
        fontSize: 11,
        fontWeight: '600',
        marginTop: 7,
        fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
      }}>
        NEW
      </Text>
    </Pressable>
  );
}

// ── Hero card (most recent investigation) ──────────────────────────────────────
function HeroCard({
  investigation,
  onPress,
}: {
  investigation: Investigation;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        marginHorizontal: 20,
        marginTop: 16,
        marginBottom: 20,
        backgroundColor: C.card,
        borderRadius: 20,
        overflow: 'hidden',
        opacity: pressed ? 0.93 : 1,
        transform: [{ scale: pressed ? 0.985 : 1 }],
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
        elevation: 10,
      })}
    >
      {/* Red tape strip top */}
      <View style={{ height: 4, backgroundColor: C.red, opacity: 0.85 }} />

      {/* Gold pushpin */}
      <View style={{
        position: 'absolute',
        top: 14,
        left: 22,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: C.pin,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 3,
        elevation: 4,
        zIndex: 2,
      }} />

      <View style={{ padding: 20, paddingTop: 22 }}>
        {/* ACTIVE CASE label */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.red }} />
          <Text style={{
            color: C.red,
            fontSize: 9,
            fontWeight: '800',
            letterSpacing: 2.5,
            fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
          }}>
            ACTIVE INVESTIGATION
          </Text>
        </View>

        {/* Title */}
        <Text style={{
          color: C.cardText,
          fontSize: 22,
          fontWeight: '900',
          lineHeight: 26,
          marginBottom: 6,
        }} numberOfLines={2}>
          {investigation.title}
        </Text>

        {/* Description */}
        {investigation.description ? (
          <Text style={{
            color: C.cardMuted,
            fontSize: 12,
            fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
            lineHeight: 18,
            marginBottom: 12,
          }} numberOfLines={2}>
            {investigation.description}
          </Text>
        ) : null}

        {/* Stats pills */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {[
            `${investigation.nodes.length} nodes`,
            `${(investigation.strings ?? []).length} strings`,
            formatDate(investigation.updatedAt),
          ].map(label => (
            <View key={label} style={{
              backgroundColor: 'rgba(44,24,16,0.07)',
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderWidth: 1,
              borderColor: 'rgba(44,24,16,0.1)',
            }}>
              <Text style={{
                color: C.cardMuted,
                fontSize: 10,
                fontWeight: '700',
                fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
              }}>
                {label}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </Pressable>
  );
}

// ── Main component ────────────────────────────────────────────────────────────────
export default function InvestigationsDashboard() {
  const router = useRouter();
  const { width: SCREEN_W } = useWindowDimensions();
  const CELL_SIZE = Math.floor((SCREEN_W - 44) / 3);

  const investigations = useInvestigationStore((s) => s.investigations);
  const createInvestigation = useInvestigationStore((s) => s.createInvestigation);
  const deleteInvestigation = useInvestigationStore((s) => s.deleteInvestigation);
  const restoreInvestigation = useInvestigationStore((s) => s.restoreInvestigation);
  const setActiveInvestigation = useInvestigationStore((s) => s.setActiveInvestigation);
  const addDemoInvestigation = useInvestigationStore((s) => s.addDemoInvestigation);
  const removeDemoInvestigation = useInvestigationStore((s) => s.removeDemoInvestigation);

  const tier = useSubscriptionStore((s) => s.tier);
  const maxInvestigations = useSubscriptionStore((s) => s.maxInvestigations);
  const maxInvestigationsCount = maxInvestigations();

  const sessions = useCollabStore((s) => s.sessions);

  const isDecoyMode = useSecurityStore((s) => s.isDecoyMode);

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

  // UI state
  const [menuOpen, setMenuOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showHelpMenu, setShowHelpMenu] = useState(false);
  const [showVideoOnboarding, setShowVideoOnboarding] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [showExitDemoConfirm, setShowExitDemoConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetTitle, setDeleteTargetTitle] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [titleError, setTitleError] = useState<string>('');
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [undoItem, setUndoItem] = useState<Investigation | null>(null);
  const [showUndoToast, setShowUndoToast] = useState(false);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [collabSheetInvestigationId, setCollabSheetInvestigationId] = useState<string | null>(null);
  const [collabSheetVisible, setCollabSheetVisible] = useState(false);

  // Hamburger menu animation
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
    opacity: menuAnim.value * 0.75,
  }));

  const menuPanelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(menuAnim.value, [0, 1], [-310, 0], Extrapolation.CLAMP) }],
  }));

  // Auto-show tour on first session
  useEffect(() => {
    seedMockInvestigations();
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    if (!sessionStartedAt) { setSessionStart(); return; }
    const secs = (Date.now() - sessionStartedAt) / 1000;
    if (!hasCompletedTour && secs < 60) {
      const t = setTimeout(() => startTour(), 1200);
      return () => clearTimeout(t);
    }
  }, [session?.user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Check what's new
  useEffect(() => {
    shouldShowWhatsNew().then((show) => {
      if (show) {
        const t = setTimeout(() => { setShowWhatsNew(true); markWhatsNewSeen(); }, 2000);
        return () => clearTimeout(t);
      }
    });
  }, []);

  const sortedInvestigations = useMemo(
    () => isDecoyMode
      ? []
      : [...investigations].filter((inv) => !inv.isDemo).sort((a, b) => b.updatedAt - a.updatedAt),
    [investigations, isDecoyMode]
  );

  const collabSessionMap = useMemo(() => {
    const map = new Map<string, CollabSession>();
    for (const s of sessions) map.set(s.investigationId, s);
    return map;
  }, [sessions]);

  // Grid data: investigations + new cell
  const gridData = useMemo(() => [
    ...sortedInvestigations,
    { id: '__new__', _isNew: true } as any,
  ], [sortedInvestigations]);

  const nonDemoInvestigationCount = investigations.filter((inv) => !inv.isDemo).length;
  const tierLabel = tier === 'free' ? 'FREE' : tier === 'researcher' ? 'RESEARCHER' : tier === 'investigator' ? 'INVESTIGATOR' : tier === 'professional' || tier === 'lifetime' ? 'PROFESSIONAL' : 'FOUNDING';
  const tierColor = tier === 'free' ? C.muted : tier === 'researcher' || tier === 'founding_member' ? C.pin : C.gold;

  // ── Handlers (all preserved exactly) ──────────────────────────────────────
  const handleCreate = useCallback(() => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    const isDuplicate = investigations.some(
      (i) => i.title.toLowerCase() === trimmed.toLowerCase() && !i.isDemo
    );
    if (isDuplicate) {
      setTitleError('An investigation with this name already exists');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    createInvestigation(trimmed, newDescription.trim() || undefined);
    setNewTitle('');
    setNewDescription('');
    setTitleError('');
    setShowCreateModal(false);
    router.push('/(tabs)/two');
  }, [newTitle, newDescription, investigations, createInvestigation, router]);

  const handleNewInvestigationPress = useCallback(() => {
    const nonDemoCount = investigations.filter((inv) => !inv.isDemo).length;
    if (nonDemoCount >= maxInvestigationsCount) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setShowLimitModal(true);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowCreateModal(true);
  }, [investigations, maxInvestigationsCount]);

  const handleCardPress = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveInvestigation(id);
    router.push('/(tabs)/two');
  }, [setActiveInvestigation, router]);

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

  const handleSwipeDelete = useCallback((inv: Investigation) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    deleteInvestigation(inv.id);
    setUndoItem(inv);
    setShowUndoToast(true);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => { setShowUndoToast(false); setUndoItem(null); }, 4000);
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

  const keyExtractor = useCallback((item: any) => item.id, []);

  const activeCollabSession = collabSheetInvestigationId
    ? (collabSessionMap.get(collabSheetInvestigationId) ?? null)
    : null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }} testID="investigations-screen">

      {/* Demo banner */}
      {isDemoMode ? (
        <Pressable
          testID="demo-mode-banner"
          onPress={() => setShowExitDemoConfirm(true)}
          style={{ backgroundColor: C.red, height: 36, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 }}>
            DEMO MODE — This is sample data. Tap to exit.
          </Text>
        </Pressable>
      ) : null}

      <SafeAreaView style={{ flex: 1 }} edges={isDemoMode ? [] : ['top']}>

        {/* ── HEADER ── */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingTop: 10,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: C.border,
        }}>
          {/* Hamburger */}
          <Pressable
            testID="hamburger-button"
            onPress={openMenu}
            style={({ pressed }) => ({
              width: 40, height: 40, borderRadius: 12,
              backgroundColor: pressed ? C.surface2 : C.surface,
              borderWidth: 1, borderColor: C.border2,
              alignItems: 'center', justifyContent: 'center',
              marginRight: 14,
            })}
          >
            <View style={{ gap: 5, alignItems: 'flex-start' }}>
              <View style={{ width: 18, height: 2, borderRadius: 1, backgroundColor: C.text }} />
              <View style={{ width: 13, height: 2, borderRadius: 1, backgroundColor: C.red }} />
              <View style={{ width: 18, height: 2, borderRadius: 1, backgroundColor: C.text }} />
            </View>
          </Pressable>

          {/* Brand */}
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.red, fontSize: 26, fontWeight: '900', letterSpacing: 3, lineHeight: 28 }}>
              RED STRING
            </Text>
            <Text style={{
              color: C.muted, fontSize: 9, letterSpacing: 2.5,
              fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
              textTransform: 'uppercase', marginTop: 1,
            }}>
              RESEARCH
            </Text>
          </View>

          {/* Avatar */}
          <Pressable
            testID="account-button"
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowAccountModal(true); }}
            style={({ pressed }) => ({
              width: 38, height: 38, borderRadius: 19,
              backgroundColor: pressed ? C.surface2 : C.surface,
              borderWidth: 1.5, borderColor: C.border2,
              alignItems: 'center', justifyContent: 'center',
            })}
          >
            <Text style={{ color: C.text, fontSize: 15, fontWeight: '800' }}>
              {session?.user?.name?.charAt(0)?.toUpperCase() ?? '?'}
            </Text>
          </Pressable>
        </View>

        {/* ── GRID ── */}
        <FlatList
          testID="investigations-list"
          data={gridData}
          keyExtractor={keyExtractor}
          numColumns={3}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          columnWrapperStyle={{ paddingHorizontal: 22, gap: 0 }}
          renderItem={({ item, index }: { item: any; index: number }) => {
            if (item._isNew) {
              return <NewCaseCell cellSize={CELL_SIZE} onPress={handleNewInvestigationPress} />;
            }
            return (
              <GridCard
                investigation={item}
                cellSize={CELL_SIZE}
                index={index}
                onPress={() => handleCardPress(item.id)}
                onLongPress={() => handleCardLongPress(item.id, item.title)}
              />
            );
          }}
          ListHeaderComponent={
            <View>
              {/* Hero card */}
              {sortedInvestigations.length > 0 ? (
                <HeroCard
                  investigation={sortedInvestigations[0]}
                  onPress={() => handleCardPress(sortedInvestigations[0].id)}
                />
              ) : null}

              {/* Section label */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 22,
                marginBottom: 14,
                marginTop: sortedInvestigations.length === 0 ? 20 : 0,
              }}>
                <Text style={{
                  color: C.muted, fontSize: 9, fontWeight: '800', letterSpacing: 2.5,
                  fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
                  textTransform: 'uppercase',
                }}>
                  ALL INVESTIGATIONS
                </Text>
                <Text style={{ color: C.muted, fontSize: 10 }}>
                  {nonDemoInvestigationCount}/{maxInvestigationsCount === Infinity ? '∞' : maxInvestigationsCount}
                </Text>
              </View>
            </View>
          }
          ListEmptyComponent={null}
        />

        {/* Empty state — shown when truly no investigations */}
        {sortedInvestigations.length === 0 ? (
          <View style={{ position: 'absolute', top: '35%', left: 0, right: 0, alignItems: 'center', paddingHorizontal: 40 }}>
            <Text style={{ fontSize: 56, marginBottom: 16 }}>🔍</Text>
            <Text style={{ color: C.text, fontSize: 20, fontWeight: '900', marginBottom: 8, textAlign: 'center', letterSpacing: 0.3 }}>
              No investigations yet
            </Text>
            <Text style={{ color: C.muted, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 28 }}>
              Start connecting the dots on your first case
            </Text>
            <Pressable
              onPress={handleNewInvestigationPress}
              style={({ pressed }) => ({
                backgroundColor: pressed ? '#A01830' : C.red,
                borderRadius: 16,
                paddingHorizontal: 28,
                paddingVertical: 15,
                shadowColor: C.red,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.35,
                shadowRadius: 10,
                elevation: 6,
              })}
            >
              <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 }}>
                New Investigation
              </Text>
            </Pressable>
          </View>
        ) : null}

      </SafeAreaView>

      {/* ── HAMBURGER MENU ── */}
      {menuOpen ? (
        <>
          <Animated.View
            style={[{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: '#000',
            }, menuOverlayStyle]}
          >
            <Pressable style={{ flex: 1 }} onPress={closeMenu} />
          </Animated.View>

          <Animated.View style={[{
            position: 'absolute', top: 0, left: 0, bottom: 0, width: 300,
            backgroundColor: C.surface,
            borderRightWidth: 1, borderRightColor: C.border2,
            shadowColor: '#000', shadowOffset: { width: 8, height: 0 },
            shadowOpacity: 0.5, shadowRadius: 20, elevation: 20,
          }, menuPanelStyle]}>
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
              {/* Menu header */}
              <View style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingHorizontal: 20, paddingVertical: 16,
                borderBottomWidth: 1, borderBottomColor: C.border,
              }}>
                <Text style={{ color: C.red, fontSize: 22, fontWeight: '900', letterSpacing: 2 }}>
                  RED STRING
                </Text>
                <Pressable
                  onPress={closeMenu}
                  style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ color: C.muted, fontSize: 16, fontWeight: '700' }}>✕</Text>
                </Pressable>
              </View>

              <FlatList
                data={[]}
                renderItem={() => null}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                  <View style={{ paddingBottom: 30 }}>

                    {/* LIVE OPERATIONS */}
                    <Text style={{
                      color: C.muted, fontSize: 9, fontWeight: '800', letterSpacing: 2.5,
                      fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
                      paddingHorizontal: 20, marginTop: 20, marginBottom: 8,
                    }}>LIVE OPERATIONS</Text>

                    {[
                      { emoji: '📡', label: 'Start a Broadcast', sub: 'Go live', live: true, onPress: () => { closeMenu(); router.push('/live-broadcast' as any); } },
                      { emoji: '🎥', label: 'War Room', sub: 'Video collaboration', onPress: () => { closeMenu(); router.push('/war-room' as any); } },
                      { emoji: '👥', label: 'Collaborations', sub: 'Active sessions', onPress: () => { closeMenu(); router.push('/collab' as any); } },
                    ].map(item => (
                      <Pressable
                        key={item.label}
                        onPress={item.onPress}
                        style={({ pressed }) => ({
                          flexDirection: 'row', alignItems: 'center', gap: 12,
                          paddingHorizontal: 20, paddingVertical: 13,
                          backgroundColor: pressed ? C.surface2 : 'transparent',
                        })}
                      >
                        <View style={{
                          width: 38, height: 38, borderRadius: 11,
                          backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border2,
                          alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Text style={{ fontSize: 18 }}>{item.emoji}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={{ color: C.text, fontSize: 14, fontWeight: '700' }}>{item.label}</Text>
                            {item.live ? (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.red }} />
                                <Text style={{ color: C.red, fontSize: 9, fontWeight: '800' }}>LIVE</Text>
                              </View>
                            ) : null}
                          </View>
                          <Text style={{ color: C.muted, fontSize: 11, marginTop: 1 }}>{item.sub}</Text>
                        </View>
                      </Pressable>
                    ))}

                    {/* INTEL & SOURCES */}
                    <Text style={{
                      color: C.muted, fontSize: 9, fontWeight: '800', letterSpacing: 2.5,
                      fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
                      paddingHorizontal: 20, marginTop: 20, marginBottom: 8,
                    }}>INTEL & SOURCES</Text>

                    {[
                      { emoji: '🕸️', label: 'Webb.io', sub: 'AI document search — 3M+ files', url: 'https://www.webb.io' },
                      { emoji: '🔍', label: 'WhoKilledCK.com', sub: 'Crowdsourced investigation', url: 'https://www.whokilledck.com' },
                      { emoji: '📜', label: 'FOIA.gov', sub: 'Request public records', url: 'https://www.foia.gov' },
                      { emoji: '🏛️', label: 'NARA Document Releases', sub: 'National archives', url: 'https://www.archives.gov' },
                      { emoji: '📡', label: 'Ian Carroll', sub: 'Independent research', url: 'https://www.iancarroll.com' },
                    ].map(item => (
                      <Pressable
                        key={item.label}
                        onPress={() => { closeMenu(); Linking.openURL(item.url).catch(() => Alert.alert('Could not open link')); }}
                        style={({ pressed }) => ({
                          flexDirection: 'row', alignItems: 'center', gap: 12,
                          paddingHorizontal: 20, paddingVertical: 10,
                          backgroundColor: pressed ? C.surface2 : 'transparent',
                        })}
                      >
                        <Text style={{ fontSize: 18, width: 30, textAlign: 'center' }}>{item.emoji}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: C.text2, fontSize: 13, fontWeight: '600' }}>{item.label} ↗</Text>
                          <Text style={{ color: C.muted, fontSize: 10, marginTop: 1 }}>{item.sub}</Text>
                        </View>
                      </Pressable>
                    ))}

                    {/* ACCOUNT & SETTINGS */}
                    <Text style={{
                      color: C.muted, fontSize: 9, fontWeight: '800', letterSpacing: 2.5,
                      fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
                      paddingHorizontal: 20, marginTop: 20, marginBottom: 8,
                    }}>ACCOUNT & SETTINGS</Text>

                    {[
                      { emoji: '👤', label: 'Account', sub: session?.user?.name ?? 'Signed in', onPress: () => { closeMenu(); setShowAccountModal(true); } },
                      { emoji: '🔒', label: 'Security', sub: 'Locks, PIN & screenshot', onPress: () => { closeMenu(); router.push('/security' as any); } },
                      { emoji: '🔔', label: 'Notifications', sub: '', onPress: () => { closeMenu(); router.push('/tip-inbox' as any); } },
                      { emoji: '⭐', label: 'Subscription', sub: tierLabel, onPress: () => { closeMenu(); router.push('/paywall'); } },
                      { emoji: '❓', label: 'Help & Tour', sub: 'Guides and walkthrough', onPress: () => { closeMenu(); setShowHelpMenu(true); } },
                    ].map(item => (
                      <Pressable
                        key={item.label}
                        onPress={item.onPress}
                        style={({ pressed }) => ({
                          flexDirection: 'row', alignItems: 'center', gap: 12,
                          paddingHorizontal: 20, paddingVertical: 13,
                          backgroundColor: pressed ? C.surface2 : 'transparent',
                        })}
                      >
                        <View style={{
                          width: 38, height: 38, borderRadius: 11,
                          backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border2,
                          alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Text style={{ fontSize: 18 }}>{item.emoji}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: C.text, fontSize: 14, fontWeight: '700' }}>{item.label}</Text>
                          {item.sub ? <Text style={{ color: C.muted, fontSize: 11, marginTop: 1 }}>{item.sub}</Text> : null}
                        </View>
                      </Pressable>
                    ))}
                  </View>
                }
              />
            </SafeAreaView>
          </Animated.View>
        </>
      ) : null}

      {/* ── UNDO TOAST ── */}
      {showUndoToast ? (
        <Animated.View
          entering={SlideInDown.springify().damping(20)}
          exiting={SlideOutDown.duration(200)}
          testID="undo-toast"
          style={{
            position: 'absolute', bottom: 90, left: 16, right: 16,
            backgroundColor: C.surface, borderRadius: 14,
            borderWidth: 1, borderColor: C.border,
            borderLeftWidth: 4, borderLeftColor: C.red,
            flexDirection: 'row', alignItems: 'center',
            paddingVertical: 14, paddingHorizontal: 16,
            shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.35, shadowRadius: 12, elevation: 12,
          }}
        >
          <Trash2 size={18} color={C.red} strokeWidth={2} />
          <Text style={{ flex: 1, color: C.text, fontSize: 14, fontWeight: '600', marginLeft: 10 }}>
            Investigation deleted
          </Text>
          <Pressable
            testID="undo-button"
            onPress={handleUndo}
            style={({ pressed }) => ({
              backgroundColor: pressed ? 'rgba(200,147,74,0.2)' : 'rgba(200,147,74,0.1)',
              borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7,
              borderWidth: 1, borderColor: 'rgba(200,147,74,0.3)',
            })}
          >
            <Text style={{ color: C.pin, fontSize: 13, fontWeight: '700' }}>Undo</Text>
          </Pressable>
        </Animated.View>
      ) : null}

      {/* ── ALL EXISTING MODALS (unchanged) ── */}

      {/* Help Menu */}
      <Modal visible={showHelpMenu} transparent animationType="fade" onRequestClose={() => setShowHelpMenu(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 }} onPress={() => setShowHelpMenu(false)}>
          <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 340, backgroundColor: C.surface, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: C.border }}>
            <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: C.border }}>
              <Text style={{ color: C.text, fontSize: 18, fontWeight: '800', letterSpacing: 0.3 }}>Help & Explore</Text>
            </View>
            <Pressable testID="help-start-tour" onPress={() => { setShowHelpMenu(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setTimeout(() => startTour(), 200); }} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, backgroundColor: pressed ? C.border : 'transparent', borderBottomWidth: 1, borderBottomColor: C.border })}>
              <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(196,30,58,0.12)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(196,30,58,0.25)' }}>
                <Play size={18} color={C.red} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontSize: 15, fontWeight: '700' }}>Take the Tour</Text>
                <Text style={{ color: C.muted, fontSize: 12, marginTop: 1 }}>18-step guided walkthrough</Text>
              </View>
              {!hasCompletedTour ? (<View style={{ backgroundColor: C.red, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ color: '#FFF', fontSize: 10, fontWeight: '700' }}>NEW</Text></View>) : null}
            </Pressable>
            <Pressable testID="help-load-demo" onPress={handleLaunchDemo} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, backgroundColor: pressed ? C.border : 'transparent', borderBottomWidth: 1, borderBottomColor: C.border })}>
              <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(200,147,74,0.12)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(200,147,74,0.25)' }}>
                <Play size={18} color={C.pin} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontSize: 15, fontWeight: '700' }}>Load Demo Investigation</Text>
                <Text style={{ color: C.muted, fontSize: 12, marginTop: 1 }}>15 nodes, 12 strings, full data</Text>
              </View>
            </Pressable>
            <Pressable testID="help-whats-new" onPress={() => { setShowHelpMenu(false); setTimeout(() => setShowWhatsNew(true), 200); }} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, backgroundColor: pressed ? C.border : 'transparent' })}>
              <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(34,197,94,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)' }}>
                <Inbox size={18} color="#22C55E" strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontSize: 15, fontWeight: '700' }}>What's New</Text>
                <Text style={{ color: C.muted, fontSize: 12, marginTop: 1 }}>Latest features & updates</Text>
              </View>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Exit Demo Confirm */}
      <Modal visible={showExitDemoConfirm} transparent animationType="fade" onRequestClose={() => setShowExitDemoConfirm(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 }} onPress={() => setShowExitDemoConfirm(false)}>
          <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 360, backgroundColor: C.surface, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: C.border }}>
            <Text style={{ color: C.text, fontSize: 18, fontWeight: '700', marginBottom: 10 }}>Exit Demo Mode?</Text>
            <Text style={{ color: C.muted, fontSize: 14, lineHeight: 20, marginBottom: 24 }}>Your real investigations are safe. The demo data will be removed.</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable onPress={() => setShowExitDemoConfirm(false)} style={({ pressed }) => ({ flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center', backgroundColor: pressed ? C.border : 'transparent', borderWidth: 1, borderColor: C.border })}>
                <Text style={{ color: C.muted, fontSize: 15, fontWeight: '600' }}>Cancel</Text>
              </Pressable>
              <Pressable testID="confirm-exit-demo-button" onPress={handleExitDemo} style={({ pressed }) => ({ flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center', backgroundColor: pressed ? '#A3162E' : C.red })}>
                <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '700' }}>Exit Demo</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Account Modal */}
      <Modal visible={showAccountModal} transparent animationType="fade" onRequestClose={() => setShowAccountModal(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 }} onPress={() => setShowAccountModal(false)}>
          <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 360, backgroundColor: C.surface, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: C.border }}>
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(196,30,58,0.15)', borderWidth: 2, borderColor: 'rgba(196,30,58,0.3)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <User size={28} color={C.red} strokeWidth={1.5} />
              </View>
              <Text style={{ color: C.text, fontSize: 16, fontWeight: '700' }}>{session?.user?.name || 'Investigator'}</Text>
              <Text style={{ color: C.muted, fontSize: 13, marginTop: 2 }}>{session?.user?.email || ''}</Text>
            </View>
            <View style={{ backgroundColor: tierColor + '15', borderRadius: 10, padding: 12, marginBottom: 20, borderWidth: 1, borderColor: tierColor + '33', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Text style={{ color: tierColor, fontSize: 13, fontWeight: '700', letterSpacing: 1 }}>{tierLabel} PLAN</Text>
              {tier === 'free' ? (<Pressable onPress={() => { setShowAccountModal(false); router.push('/paywall'); }}><Text style={{ color: C.red, fontSize: 12, fontWeight: '600' }}>Upgrade</Text></Pressable>) : null}
            </View>
            <Pressable testID="sign-out-button" onPress={handleSignOut} disabled={isSigningOut} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: pressed ? 'rgba(196,30,58,0.15)' : 'rgba(196,30,58,0.08)', borderWidth: 1, borderColor: 'rgba(196,30,58,0.25)', opacity: isSigningOut ? 0.7 : 1 })}>
              <LogOut size={16} color={C.red} strokeWidth={2} />
              <Text style={{ color: C.red, fontSize: 15, fontWeight: '700' }}>{isSigningOut ? 'Signing out...' : 'Sign Out'}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Create Modal */}
      <Modal visible={showCreateModal} transparent animationType="fade" onRequestClose={() => setShowCreateModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 }} onPress={() => setShowCreateModal(false)}>
            <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 400, backgroundColor: C.surface, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: C.border }}>
              <Text style={{ color: C.text, fontSize: 20, fontWeight: '800', marginBottom: 4 }}>New Investigation</Text>
              <Text style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>Start unraveling the truth</Text>
              <Text style={{ color: C.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 6 }}>TITLE</Text>
              <TextInput testID="investigation-title-input" value={newTitle} onChangeText={(text) => { setNewTitle(text); setTitleError(''); }} placeholder="e.g., The Roswell Incident" placeholderTextColor={C.muted} autoFocus style={{ backgroundColor: C.bg, borderRadius: 10, padding: 14, color: C.text, fontSize: 16, borderWidth: 1, borderColor: titleError ? C.red : C.border, marginBottom: titleError ? 6 : 16 }} />
              {titleError ? (
                <Text style={{ color: C.red, fontSize: 13, marginBottom: 10 }}>{titleError}</Text>
              ) : null}
              <Text style={{ color: C.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 6 }}>DESCRIPTION (OPTIONAL)</Text>
              <TextInput testID="investigation-description-input" value={newDescription} onChangeText={setNewDescription} placeholder="Brief overview of the case..." placeholderTextColor={C.muted} multiline numberOfLines={3} style={{ backgroundColor: C.bg, borderRadius: 10, padding: 14, color: C.text, fontSize: 16, borderWidth: 1, borderColor: C.border, marginBottom: 24, minHeight: 80, textAlignVertical: 'top' }} />
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Pressable testID="cancel-create-button" onPress={() => { setNewTitle(''); setNewDescription(''); setTitleError(''); setShowCreateModal(false); }} style={({ pressed }) => ({ flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', backgroundColor: pressed ? C.border : 'transparent', borderWidth: 1, borderColor: C.border })}>
                  <Text style={{ color: C.muted, fontSize: 15, fontWeight: '600' }}>Cancel</Text>
                </Pressable>
                <Pressable testID="confirm-create-button" onPress={handleCreate} style={({ pressed }) => ({ flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', backgroundColor: newTitle.trim() ? (pressed ? '#A3162E' : C.red) : C.border })}>
                  <Text style={{ color: newTitle.trim() ? '#FFF' : C.muted, fontSize: 15, fontWeight: '700' }}>Create</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Limit Modal */}
      <Modal visible={showLimitModal} transparent animationType="fade" onRequestClose={() => setShowLimitModal(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 }} onPress={() => setShowLimitModal(false)}>
          <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 400, backgroundColor: C.surface, borderRadius: 20, padding: 28, borderWidth: 1, borderColor: C.border, alignItems: 'center' }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(196,30,58,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Lock size={24} color={C.red} strokeWidth={2} />
            </View>
            <Text style={{ color: C.text, fontSize: 20, fontWeight: '800', marginBottom: 8, textAlign: 'center' }}>Investigation Limit Reached</Text>
            <Text style={{ color: C.muted, fontSize: 13, lineHeight: 20, marginBottom: 24, textAlign: 'center' }}>
              {tier === 'free' ? `Free accounts are limited to ${maxInvestigationsCount} investigations. Upgrade to Pro for up to 25, or Plus for unlimited.` : `You've reached the ${maxInvestigationsCount} investigation limit. Upgrade to Plus for unlimited.`}
            </Text>
            <Pressable testID="upgrade-from-limit-button" onPress={() => { setShowLimitModal(false); router.push('/paywall'); }} style={({ pressed }) => ({ width: '100%', paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: pressed ? '#A3162E' : C.red, marginBottom: 12 })}>
              <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '700' }}>Upgrade Now</Text>
            </Pressable>
            <Pressable testID="dismiss-limit-modal-button" onPress={() => setShowLimitModal(false)} style={({ pressed }) => ({ paddingVertical: 10, opacity: pressed ? 0.6 : 1 })}>
              <Text style={{ color: C.muted, fontSize: 14 }}>Not now</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Delete Modal */}
      <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 }} onPress={() => setShowDeleteModal(false)}>
          <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 400, backgroundColor: C.surface, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: C.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(196,30,58,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={20} color={C.red} strokeWidth={2} />
              </View>
              <Text style={{ color: C.text, fontSize: 17, fontWeight: '700' }}>Delete Investigation</Text>
            </View>
            <Text style={{ color: C.muted, fontSize: 13, lineHeight: 20, marginBottom: 24 }}>
              Are you sure you want to delete "{deleteTargetTitle}"? All nodes and connections will be permanently removed.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable testID="cancel-delete-button" onPress={() => { setDeleteTargetId(null); setDeleteTargetTitle(''); setShowDeleteModal(false); }} style={({ pressed }) => ({ flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', backgroundColor: pressed ? C.border : 'transparent', borderWidth: 1, borderColor: C.border })}>
                <Text style={{ color: C.muted, fontSize: 15, fontWeight: '600' }}>Cancel</Text>
              </Pressable>
              <Pressable testID="confirm-delete-button" onPress={handleDelete} style={({ pressed }) => ({ flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', backgroundColor: pressed ? '#A3162E' : C.red })}>
                <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '700' }}>Delete</Text>
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

      {/* Tour Overlay */}
      <TourOverlay />

      {/* Video Onboarding */}
      <VideoOnboardingModal
        visible={showVideoOnboarding}
        onClose={() => { setShowVideoOnboarding(false); completeTour(); }}
      />

      {/* What's New */}
      <WhatsNewModal
        visible={showWhatsNew}
        onClose={() => setShowWhatsNew(false)}
      />

    </View>
  );
}
