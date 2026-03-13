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
