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
  Dimensions,
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
import { getTheme, COLORS as BASE_COLORS, FONTS } from '@/lib/theme';
import {
  useFonts,
  BebasNeue_400Regular,
} from '@expo-google-fonts/bebas-neue';
import {
  CourierPrime_400Regular,
  CourierPrime_700Bold,
} from '@expo-google-fonts/courier-prime';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Static color fallbacks (components that can't easily use theme hook use these)
const COLORS = BASE_COLORS;

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
  if (inv.boardStyle === 'timeline') return COLORS.amber;
  if (inv.boardStyle === 'casefile') return COLORS.teal;
  return COLORS.red; // corkboard default
}

// ──────────────────────────────────────────────
// TAPE STRIP ACCENT (decorative header on hero)
// ──────────────────────────────────────────────
function TapeStrip() {
  const segments = 20;
  return (
    <View style={{ height: 3, flexDirection: 'row', overflow: 'hidden', borderRadius: 2 }}>
      {Array.from({ length: segments }).map((_, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            backgroundColor: i % 2 === 0 ? COLORS.red : COLORS.gold,
            marginHorizontal: 0.5,
          }}
        />
      ))}
    </View>
  );
}

// ──────────────────────────────────────────────
// HERO CARD — most recently updated non-demo inv
// ──────────────────────────────────────────────
function HeroCard({
  inv,
  collabSession,
  heroFontFamily,
  onPress,
  onLongPress,
  onCollabPress,
}: {
  inv: Investigation;
  collabSession: CollabSession | null;
  heroFontFamily: string;
  onPress: () => void;
  onLongPress: () => void;
  onCollabPress: () => void;
}) {
  const nodeCount = inv.nodes.length;
  const stringCount = (inv.strings ?? []).length;
  const tipCount = 0; // tips field not yet on Investigation type
  const tint = getBoardColor(inv);
  const icon = inv.icon;

  return (
    <Animated.View entering={FadeInDown.duration(400).springify()} style={{ marginHorizontal: 16, marginBottom: 20 }}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        style={({ pressed }) => ({
          backgroundColor: COLORS.surface,
          borderRadius: 18,
          overflow: 'hidden',
          opacity: pressed ? 0.95 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.45,
          shadowRadius: 18,
          elevation: 8,
          borderWidth: 1,
          borderColor: COLORS.border,
        })}
      >
        {/* Tape strip accent */}
        <TapeStrip />

        <View style={{ padding: 16 }}>
          {/* Row 1: icon + badges */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }}>
            {/* Investigation icon */}
            <View style={{ position: 'relative', marginRight: 12 }}>
              {/* Pushpin dot */}
              <View
                style={{
                  position: 'absolute',
                  top: -5,
                  left: '50%',
                  marginLeft: -5,
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: COLORS.pin,
                  zIndex: 2,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.4,
                  shadowRadius: 2,
                  elevation: 3,
                }}
              />
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 12,
                  backgroundColor: tint + '22',
                  borderWidth: 1.5,
                  borderColor: tint + '55',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 26 }}>{icon || '🔍'}</Text>
              </View>
            </View>

            {/* Badges */}
            <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingTop: 4 }}>
              <View
                style={{
                  backgroundColor: 'rgba(196,30,58,0.15)',
                  borderRadius: 6,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderWidth: 1,
                  borderColor: 'rgba(196,30,58,0.35)',
                }}
              >
                <Text style={{ color: COLORS.red, fontSize: 10, fontFamily: 'CourierPrime_700Bold', letterSpacing: 1 }}>
                  ACTIVE
                </Text>
              </View>
              {tipCount > 0 ? (
                <View
                  style={{
                    backgroundColor: 'rgba(34,197,94,0.12)',
                    borderRadius: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderWidth: 1,
                    borderColor: 'rgba(34,197,94,0.3)',
                  }}
                >
                  <Text style={{ color: COLORS.green, fontSize: 10, fontFamily: 'CourierPrime_700Bold', letterSpacing: 1 }}>
                    {tipCount} TIPS
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Chevron */}
            <ChevronRight size={18} color={COLORS.muted} strokeWidth={2} />
          </View>

          {/* Title */}
          <Text
            numberOfLines={1}
            style={{
              color: COLORS.textLight,
              fontSize: 21,
              fontFamily: heroFontFamily,
              letterSpacing: 1,
              marginBottom: 4,
            }}
          >
            {inv.title}
          </Text>

          {/* Description */}
          {inv.description ? (
            <Text
              numberOfLines={2}
              style={{
                color: COLORS.muted,
                fontSize: 11,
                fontFamily: 'CourierPrime_400Regular',
                lineHeight: 16,
                marginBottom: 12,
              }}
            >
              {inv.description}
            </Text>
          ) : <View style={{ height: 12 }} />}

          {/* Stats row */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: 'rgba(212,165,116,0.1)',
                borderRadius: 6,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderWidth: 1,
                borderColor: 'rgba(212,165,116,0.2)',
              }}
            >
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.pin }} />
              <Text style={{ color: COLORS.pin, fontSize: 10, fontFamily: 'CourierPrime_400Regular' }}>
                {nodeCount} nodes
              </Text>
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: 'rgba(196,30,58,0.08)',
                borderRadius: 6,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderWidth: 1,
                borderColor: 'rgba(196,30,58,0.2)',
              }}
            >
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.red }} />
              <Text style={{ color: COLORS.red, fontSize: 10, fontFamily: 'CourierPrime_400Regular' }}>
                {stringCount} strings
              </Text>
            </View>
            <View style={{ flex: 1 }} />
            {collabSession ? (
              <Pressable
                onPress={(e) => { e.stopPropagation?.(); onCollabPress(); }}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: pressed ? 'rgba(196,30,58,0.2)' : 'rgba(196,30,58,0.1)',
                  borderRadius: 6,
                  paddingHorizontal: 7,
                  paddingVertical: 4,
                  borderWidth: 1,
                  borderColor: 'rgba(196,30,58,0.3)',
                })}
              >
                <Users size={12} color={COLORS.red} strokeWidth={2.5} />
                <Text style={{ color: COLORS.red, fontSize: 10, fontFamily: 'CourierPrime_700Bold' }}>
                  {collabSession.members.length}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ──────────────────────────────────────────────
// GRID CELL — 3-col case grid
// ──────────────────────────────────────────────
function CaseCell({
  inv,
  index,
  hasUnreadTips,
  onPress,
  onLongPress,
}: {
  inv: Investigation;
  index: number;
  hasUnreadTips: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const tint = getBoardColor(inv);
  const icon = inv.icon;
  const imageUri = inv.iconUri;

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 60).duration(350).springify()}
      style={{ flex: 1, alignItems: 'center', marginBottom: 20, paddingHorizontal: 4 }}
    >
      <Pressable onPress={onPress} onLongPress={onLongPress} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1, alignItems: 'center' })}>
        {/* Pushpin dot */}
        <View
          style={{
            position: 'absolute',
            top: -5,
            left: '50%',
            marginLeft: -5,
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: COLORS.pin,
            zIndex: 3,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.4,
            shadowRadius: 2,
            elevation: 3,
          }}
        />

        {/* Unread dot top-right */}
        {hasUnreadTips ? (
          <View
            style={{
              position: 'absolute',
              top: -3,
              right: 0,
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: COLORS.green,
              borderWidth: 1.5,
              borderColor: COLORS.background,
              zIndex: 3,
            }}
          />
        ) : null}

        {/* Icon square */}
        <View
          style={{
            width: 82,
            height: 82,
            borderRadius: 18,
            backgroundColor: tint + '18',
            borderWidth: 1.5,
            borderColor: tint + '44',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            shadowColor: tint,
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.2,
            shadowRadius: 6,
            elevation: 4,
          }}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={{ width: 82, height: 82, borderRadius: 18 }} resizeMode="cover" />
          ) : (
            <Text style={{ fontSize: 36 }}>{icon || '🔍'}</Text>
          )}
        </View>

        {/* Label */}
        <Text
          numberOfLines={2}
          style={{
            color: COLORS.textLight,
            fontSize: 10,
            fontFamily: 'CourierPrime_400Regular',
            textAlign: 'center',
            marginTop: 6,
            lineHeight: 13,
            maxWidth: 80,
          }}
        >
          {inv.title}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// ──────────────────────────────────────────────
// ADD CELL — dashed new case button
// ──────────────────────────────────────────────
function AddCaseCell({ onPress }: { onPress: () => void }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', marginBottom: 20, paddingHorizontal: 4 }}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          width: 82,
          height: 82,
          borderRadius: 18,
          borderWidth: 2,
          borderColor: pressed ? COLORS.red : COLORS.muted,
          borderStyle: 'dashed',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pressed ? 'rgba(196,30,58,0.08)' : 'transparent',
        })}
      >
        <Text style={{ fontSize: 28, color: COLORS.muted }}>＋</Text>
      </Pressable>
      <Text
        style={{
          color: COLORS.muted,
          fontSize: 10,
          fontFamily: 'CourierPrime_400Regular',
          textAlign: 'center',
          marginTop: 6,
        }}
      >
        New Case
      </Text>
    </View>
  );
}

// ──────────────────────────────────────────────
// HAMBURGER MENU — full-screen slide-in overlay
// ──────────────────────────────────────────────
function HamburgerMenu({
  visible,
  onClose,
  session,
  sessions,
  tier,
  tierLabel,
  tierColor,
  nonDemoCount,
  setShowAccountModal,
  setCollabSheetVisible,
  router,
}: {
  visible: boolean;
  onClose: () => void;
  session: any;
  sessions: any[];
  tier: string;
  tierLabel: string;
  tierColor: string;
  nonDemoCount: number;
  setShowAccountModal: (v: boolean) => void;
  setCollabSheetVisible: (v: boolean) => void;
  router: any;
}) {
  const translateX = useSharedValue(visible ? 0 : -SCREEN_WIDTH);

  useEffect(() => {
    translateX.value = withTiming(visible ? 0 : -SCREEN_WIDTH, { duration: 280 });
  }, [visible]);

  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  if (!visible) return null;

  const emailPrefix = session?.user?.email?.split('@')[0] ?? 'investigator';
  const displayName = session?.user?.name || emailPrefix;
  const avatarLetter = (session?.user?.email?.[0] ?? 'R').toUpperCase();

  const podcastRows = [
    { icon: '🔴', title: 'Tucker Carlson Network', subtitle: 'LIVE', isLive: true },
    { icon: '🎙️', title: 'Candace Owens', subtitle: 'Latest episode' },
    { icon: '🎙️', title: 'Baron Coleman', subtitle: 'Investigative reporting' },
    { icon: '🏋️', title: 'Coach Colin', subtitle: 'Health & freedom' },
    { icon: '🎯', title: 'Ian Carroll', subtitle: 'Deep research' },
    { icon: '📺', title: 'Megyn Kelly', subtitle: 'The Megyn Kelly Show' },
    { icon: '🎙️', title: 'The Charlie Kirk Show', subtitle: 'Daily commentary' },
    { icon: '🏛️', title: 'The White House', subtitle: 'Official briefings' },
    { icon: '📰', title: 'Major News Outlets', subtitle: 'CNN · Fox · NBC · ABC · CBS' },
    { icon: '➕', title: 'Add Podcast or Channel', subtitle: 'RSS feed, YouTube, or search', isAdd: true },
  ];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <Pressable
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.65)' }}
        onPress={onClose}
      />
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: SCREEN_WIDTH * 0.85,
            backgroundColor: COLORS.surface,
            zIndex: 100,
            shadowColor: '#000',
            shadowOffset: { width: 6, height: 0 },
            shadowOpacity: 0.5,
            shadowRadius: 20,
            elevation: 20,
          },
          slideStyle,
        ]}
      >
        <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {/* Header row */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20,
                paddingTop: 16,
                paddingBottom: 16,
                borderBottomWidth: 1,
                borderBottomColor: COLORS.border,
              }}
            >
              <Text style={{ fontFamily: 'BebasNeue_400Regular', fontSize: 26, letterSpacing: 3, color: COLORS.textLight }}>
                RED{' '}
                <Text style={{ color: COLORS.red }}>STRING</Text>
              </Text>
              <Pressable
                onPress={onClose}
                style={({ pressed }) => ({
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: pressed ? COLORS.border : COLORS.background,
                  alignItems: 'center',
                  justifyContent: 'center',
                })}
              >
                <X size={18} color={COLORS.muted} strokeWidth={2} />
              </Pressable>
            </View>

            {/* Profile strip */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingVertical: 16,
                gap: 12,
                borderBottomWidth: 1,
                borderBottomColor: COLORS.border,
              }}
            >
              <LinearGradient
                colors={[COLORS.red, COLORS.redDark]}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '800' }}>{avatarLetter}</Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={{ color: COLORS.textLight, fontSize: 15, fontWeight: '700', marginBottom: 2 }}>
                  {displayName}
                </Text>
                <Text style={{ color: COLORS.muted, fontSize: 11, fontFamily: 'CourierPrime_400Regular' }}>
                  @{emailPrefix} · {tierLabel} · {nonDemoCount} cases
                </Text>
              </View>
              <Pressable
                onPress={() => { onClose(); setShowAccountModal(true); }}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? COLORS.border : COLORS.background,
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                })}
              >
                <Text style={{ color: COLORS.muted, fontSize: 11, fontFamily: 'CourierPrime_400Regular' }}>
                  Switch
                </Text>
                <ChevronDown size={12} color={COLORS.muted} strokeWidth={2} />
              </Pressable>
            </View>

            {/* Section: LIVE OPERATIONS */}
            <MenuSection title="LIVE OPERATIONS">
              <MenuRow
                icon="📡"
                iconBg="rgba(196,30,58,0.15)"
                title="Start a Broadcast"
                subtitle="Go live with your investigation"
                isLive
                onPress={() => { onClose(); router.push('/live-broadcast'); }}
              />
              <MenuRow
                icon="🎥"
                iconBg="rgba(59,130,246,0.15)"
                title="War Room"
                subtitle="Real-time collab session"
                onPress={() => { onClose(); router.push('/war-room'); }}
              />
              <MenuRow
                icon="👥"
                iconBg="rgba(212,165,116,0.15)"
                title="Collaborations"
                subtitle={`${sessions.length} active session${sessions.length !== 1 ? 's' : ''}`}
                badge={sessions.length > 0 ? String(sessions.length) : undefined}
                onPress={() => { onClose(); setCollabSheetVisible(true); }}
              />
              <MenuRow
                icon="📺"
                iconBg="rgba(168,85,247,0.15)"
                title="Current Live Streams"
                subtitle="Who's live right now"
                onPress={() => { onClose(); router.push('/live-streams'); }}
              />
            </MenuSection>

            {/* Section: PODCASTS & CHANNELS */}
            <MenuSection title="PODCASTS & CHANNELS">
              {podcastRows.map((p, i) => (
                <MenuRow
                  key={i}
                  icon={p.icon}
                  iconBg={p.isAdd ? 'rgba(212,165,116,0.1)' : 'rgba(196,30,58,0.1)'}
                  title={p.title}
                  subtitle={p.subtitle}
                  isLive={p.isLive}
                  isNew={i === 0}
                  onPress={() => { onClose(); router.push('/podcast'); }}
                />
              ))}
            </MenuSection>

            {/* Section: ACCOUNT & SETTINGS */}
            <MenuSection title="ACCOUNT & SETTINGS">
              <MenuRow
                icon="👤"
                iconBg="rgba(212,165,116,0.12)"
                title="Profiles"
                subtitle="Manage your account"
                badge="2"
                onPress={() => { onClose(); setShowAccountModal(true); }}
              />
              <MenuRow
                icon="🔔"
                iconBg="rgba(59,130,246,0.12)"
                title="Notifications"
                subtitle="Alerts and updates"
                onPress={() => {}}
              />
              <MenuRow
                icon="🎨"
                iconBg="rgba(168,85,247,0.12)"
                title="Appearance"
                subtitle="Themes and fonts"
                onPress={() => { onClose(); router.push('/appearance'); }}
              />
              <MenuRow
                icon="🔒"
                iconBg="rgba(196,30,58,0.08)"
                title="Privacy & Security"
                subtitle="Data and permissions"
                onPress={() => {}}
              />
              <MenuRow
                icon="⭐"
                iconBg="rgba(240,192,96,0.15)"
                title="Subscription"
                subtitle={`Current plan: ${tierLabel}`}
                onPress={() => { onClose(); router.push('/paywall'); }}
              />
            </MenuSection>

            <View style={{ height: 32 }} />
          </ScrollView>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
}

function MenuSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 20 }}>
      <Text
        style={{
          color: COLORS.muted,
          fontSize: 9,
          fontFamily: 'CourierPrime_700Bold',
          letterSpacing: 2,
          paddingHorizontal: 20,
          marginBottom: 8,
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function MenuRow({
  icon,
  iconBg,
  title,
  subtitle,
  badge,
  isLive,
  isNew,
  onPress,
}: {
  icon: string;
  iconBg: string;
  title: string;
  subtitle?: string;
  badge?: string;
  isLive?: boolean;
  isNew?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 20,
        paddingVertical: 11,
        backgroundColor: pressed ? COLORS.background : 'transparent',
      })}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: iconBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 18 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: COLORS.textLight, fontSize: 14, fontWeight: '600', marginBottom: 1 }}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ color: COLORS.muted, fontSize: 11, fontFamily: 'CourierPrime_400Regular' }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {isLive ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.red }} />
          <Text style={{ color: COLORS.red, fontSize: 9, fontFamily: 'CourierPrime_700Bold', letterSpacing: 1 }}>LIVE</Text>
        </View>
      ) : null}
      {badge ? (
        <View
          style={{
            backgroundColor: COLORS.red,
            borderRadius: 6,
            minWidth: 20,
            height: 20,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 5,
          }}
        >
          <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '800' }}>{badge}</Text>
        </View>
      ) : null}
      {isNew && !isLive ? (
        <View style={{ backgroundColor: COLORS.red, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 }}>
          <Text style={{ color: '#FFF', fontSize: 9, fontWeight: '700' }}>NEW</Text>
        </View>
      ) : null}
    </Pressable>
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

  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showLimitModal, setShowLimitModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [showAccountModal, setShowAccountModal] = useState<boolean>(false);
  const [showHelpMenu, setShowHelpMenu] = useState<boolean>(false);
  const [showVideoOnboarding, setShowVideoOnboarding] = useState<boolean>(false);
  const [showWhatsNew, setShowWhatsNew] = useState<boolean>(false);
  const [showExitDemoConfirm, setShowExitDemoConfirm] = useState<boolean>(false);
  const [showHamburger, setShowHamburger] = useState<boolean>(false);
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

  // Appearance prefs → theme (select primitives individually to avoid infinite re-renders)
  const heroFont = useAppearanceStore((s) => s.heroFont);
  const themeMode = useAppearanceStore((s) => s.themeMode);
  const accentColor = useAppearanceStore((s) => s.accentColor);
  const corkIntensity = useAppearanceStore((s) => s.corkIntensity);
  const tapeColor = useAppearanceStore((s) => s.tapeColor);
  const pushpinColor = useAppearanceStore((s) => s.pushpinColor);
  const highlighterColor = useAppearanceStore((s) => s.highlighterColor);
  const fineLinkerColor = useAppearanceStore((s) => s.fineLinkerColor);
  const theme = getTheme({ heroFont, themeMode, accentColor, corkIntensity, tapeColor, pushpinColor, highlighterColor, fineLinkerColor });

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

  const heroInv = sortedInvestigations[0] ?? null;
  const gridInvestigations = sortedInvestigations.slice(1);

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
    const nonDemoCount = investigations.filter((inv) => !inv.isDemo).length;
    if (nonDemoCount >= maxInvestigationsCount) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setShowLimitModal(true);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowCreateModal(true);
  }, [investigations, maxInvestigationsCount]);

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

  // Build grid data: gridInvestigations + add cell placeholder
  type GridItem = { type: 'inv'; inv: Investigation } | { type: 'add' };
  const gridData: GridItem[] = [
    ...gridInvestigations.map((inv) => ({ type: 'inv' as const, inv })),
    { type: 'add' as const },
  ];
  // Pad to multiple of 3
  while (gridData.length % 3 !== 0) gridData.push({ type: 'add' as const });

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }} testID="investigations-screen">
      {/* Demo Mode Banner */}
      {isDemoMode ? (
        <Pressable
          testID="demo-mode-banner"
          onPress={() => setShowExitDemoConfirm(true)}
          style={{ backgroundColor: COLORS.red, height: 36, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }}
        >
          <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 }}>
            DEMO MODE — This is sample data. Tap to exit.
          </Text>
        </Pressable>
      ) : null}

      <SafeAreaView style={{ flex: 1 }} edges={isDemoMode ? [] : ['top']}>
        {/* ── HEADER ── */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingTop: 10,
            paddingBottom: 12,
          }}
        >
          {/* Hamburger button */}
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowHamburger(true); }}
            style={({ pressed }) => ({
              width: 42,
              height: 42,
              borderRadius: 13,
              backgroundColor: pressed ? COLORS.border : COLORS.surface2,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 3,
            })}
          >
            {/* Custom hamburger icon with offset middle line */}
            <View style={{ gap: 4 }}>
              <View style={{ width: 18, height: 2, backgroundColor: COLORS.textLight, borderRadius: 1 }} />
              <View style={{ width: 12, height: 2, backgroundColor: COLORS.textLight, borderRadius: 1, alignSelf: 'flex-end' }} />
              <View style={{ width: 18, height: 2, backgroundColor: COLORS.textLight, borderRadius: 1 }} />
            </View>
          </Pressable>

          {/* Center wordmark */}
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text
              style={{
                fontFamily: fontsLoaded ? 'BebasNeue_400Regular' : undefined,
                fontSize: 24,
                letterSpacing: 5,
                color: COLORS.textLight,
                lineHeight: 26,
              }}
            >
              RED STRING
            </Text>
            <Text
              style={{
                fontFamily: fontsLoaded ? 'CourierPrime_400Regular' : undefined,
                fontSize: 8,
                letterSpacing: 4,
                color: COLORS.red,
                marginTop: 1,
              }}
            >
              RESEARCH PLATFORM
            </Text>
          </View>

          {/* Avatar circle */}
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowAccountModal(true); }}
            style={{ width: 42, height: 42, borderRadius: 21, overflow: 'hidden' }}
          >
            <LinearGradient
              colors={[COLORS.red, COLORS.redDark]}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: '#FFF', fontSize: 17, fontWeight: '800' }}>{avatarLetter}</Text>
            </LinearGradient>
          </Pressable>
        </View>

        {/* ── MAIN SCROLL ── */}
        <FlatList
          testID="investigations-list"
          data={[]}
          renderItem={null}
          keyExtractor={() => ''}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 30 }}
          ListHeaderComponent={
            <>
              {/* Hero Card */}
              {heroInv ? (
                <HeroCard
                  inv={heroInv}
                  collabSession={collabSessionMap.get(heroInv.id) ?? null}
                  heroFontFamily={theme.heroFontFamily}
                  onPress={() => handleCardPress(heroInv.id)}
                  onLongPress={() => handleCardLongPress(heroInv.id, heroInv.title)}
                  onCollabPress={() => handleCollabPress(heroInv.id)}
                />
              ) : !isDemoMode ? (
                <DemoCard onLaunch={handleLaunchDemo} />
              ) : null}

              {/* ALL CASES section header */}
              {sortedInvestigations.length > 0 ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    marginBottom: 16,
                    gap: 8,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fontsLoaded ? 'CourierPrime_700Bold' : undefined,
                      fontSize: 9,
                      letterSpacing: 3,
                      color: COLORS.muted,
                    }}
                  >
                    ALL CASES
                  </Text>
                  <View
                    style={{
                      backgroundColor: COLORS.surface2,
                      borderRadius: 5,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                    }}
                  >
                    <Text style={{ color: COLORS.muted, fontSize: 9, fontFamily: fontsLoaded ? 'CourierPrime_400Regular' : undefined }}>
                      {nonDemoInvestigationCount}
                    </Text>
                  </View>
                  <View style={{ flex: 1, height: 1, backgroundColor: COLORS.border }} />
                </View>
              ) : null}

              {/* 3-column grid */}
              {(() => {
                const rows: GridItem[][] = [];
                for (let i = 0; i < gridData.length; i += 3) {
                  rows.push(gridData.slice(i, i + 3));
                }
                return rows.map((row, ri) => (
                  <View key={ri} style={{ flexDirection: 'row', paddingHorizontal: 12, marginBottom: 0 }}>
                    {row.map((cell, ci) => {
                      if (cell.type === 'add') {
                        // Only show one add button — the first add cell is the real one
                        const isFirstAdd = ri * 3 + ci === gridInvestigations.length;
                        if (!isFirstAdd) {
                          return <View key={ci} style={{ flex: 1 }} />;
                        }
                        return (
                          <AddCaseCell
                            key={ci}
                            onPress={handleNewInvestigationPress}
                          />
                        );
                      }
                      const inv = cell.inv;
                      const hasUnreadTips = ((inv as any).tips ?? []).some((t: any) => t.status === 'unread');
                      return (
                        <CaseCell
                          key={inv.id}
                          inv={inv}
                          index={ri * 3 + ci}
                          hasUnreadTips={hasUnreadTips}
                          onPress={() => handleCardPress(inv.id)}
                          onLongPress={() => handleCardLongPress(inv.id, inv.title)}
                        />
                      );
                    })}
                  </View>
                ));
              })()}

              {/* Empty state when no investigations at all */}
              {sortedInvestigations.length === 0 && isDemoMode ? null : sortedInvestigations.length === 0 ? (
                <EmptyState />
              ) : null}

              {/* Demo card at bottom if there's already a hero */}
              {heroInv && !isDemoMode ? (
                <DemoCard onLaunch={handleLaunchDemo} />
              ) : null}
            </>
          }
        />
      </SafeAreaView>

      {/* ── UNDO TOAST ── */}
      {showUndoToast ? (
        <Animated.View
          entering={SlideInDown.springify().damping(20)}
          exiting={SlideOutDown.duration(200)}
          style={{
            position: 'absolute',
            bottom: 90,
            left: 16,
            right: 16,
            backgroundColor: COLORS.surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: COLORS.border,
            borderLeftWidth: 4,
            borderLeftColor: COLORS.red,
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 14,
            paddingHorizontal: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.35,
            shadowRadius: 12,
            elevation: 12,
          }}
          testID="undo-toast"
        >
          <Trash2 size={17} color={COLORS.red} strokeWidth={2} />
          <Text style={{ flex: 1, color: COLORS.textLight, fontSize: 13, fontWeight: '600', marginLeft: 10 }}>
            Investigation deleted
          </Text>
          <Pressable
            testID="undo-button"
            onPress={handleUndo}
            style={({ pressed }) => ({
              backgroundColor: pressed ? 'rgba(212,165,116,0.2)' : 'rgba(212,165,116,0.12)',
              borderRadius: 8,
              paddingHorizontal: 13,
              paddingVertical: 7,
              borderWidth: 1,
              borderColor: 'rgba(212,165,116,0.35)',
            })}
          >
            <Text style={{ color: COLORS.pin, fontSize: 12, fontWeight: '700' }}>Undo</Text>
          </Pressable>
        </Animated.View>
      ) : null}

      {/* ── HAMBURGER MENU ── */}
      <HamburgerMenu
        visible={showHamburger}
        onClose={() => setShowHamburger(false)}
        session={session}
        sessions={sessions}
        tier={tier}
        tierLabel={tierLabel}
        tierColor={tierColor}
        nonDemoCount={nonDemoInvestigationCount}
        setShowAccountModal={setShowAccountModal}
        setCollabSheetVisible={setCollabSheetVisible}
        router={router}
      />

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

      {/* ── CREATE INVESTIGATION MODAL ── */}
      <Modal visible={showCreateModal} transparent animationType="fade" onRequestClose={() => setShowCreateModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 }} onPress={() => setShowCreateModal(false)}>
            <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 400, backgroundColor: COLORS.surface, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: COLORS.border }}>
              <Text style={{ color: COLORS.textLight, fontSize: 20, fontWeight: '800', marginBottom: 4 }}>New Investigation</Text>
              <Text style={{ color: COLORS.muted, fontSize: 12, fontFamily: 'CourierPrime_400Regular', marginBottom: 20 }}>Start unraveling the truth</Text>
              <Text style={{ color: COLORS.muted, fontSize: 10, fontWeight: '600', marginBottom: 5, letterSpacing: 1, fontFamily: 'CourierPrime_700Bold' }}>TITLE</Text>
              <TextInput testID="investigation-title-input" value={newTitle} onChangeText={setNewTitle} placeholder="e.g., The Roswell Incident" placeholderTextColor={COLORS.muted} autoFocus style={{ backgroundColor: COLORS.background, borderRadius: 10, padding: 13, color: COLORS.textLight, fontSize: 15, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 }} />
              <Text style={{ color: COLORS.muted, fontSize: 10, fontWeight: '600', marginBottom: 5, letterSpacing: 1, fontFamily: 'CourierPrime_700Bold' }}>DESCRIPTION (OPTIONAL)</Text>
              <TextInput testID="investigation-description-input" value={newDescription} onChangeText={setNewDescription} placeholder="Brief overview of the case..." placeholderTextColor={COLORS.muted} multiline numberOfLines={3} style={{ backgroundColor: COLORS.background, borderRadius: 10, padding: 13, color: COLORS.textLight, fontSize: 15, borderWidth: 1, borderColor: COLORS.border, marginBottom: 22, minHeight: 76, textAlignVertical: 'top' }} />
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Pressable testID="cancel-create-button" onPress={() => { setNewTitle(''); setNewDescription(''); setShowCreateModal(false); }} style={({ pressed }) => ({ flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center', backgroundColor: pressed ? COLORS.border : 'transparent', borderWidth: 1, borderColor: COLORS.border })}>
                  <Text style={{ color: COLORS.muted, fontSize: 14, fontWeight: '600' }}>Cancel</Text>
                </Pressable>
                <Pressable testID="confirm-create-button" onPress={handleCreate} style={({ pressed }) => ({ flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center', backgroundColor: newTitle.trim() ? (pressed ? COLORS.redDark : COLORS.red) : COLORS.border })}>
                  <Text style={{ color: newTitle.trim() ? '#FFF' : COLORS.muted, fontSize: 14, fontWeight: '700' }}>Create</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
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
