import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  FlatList,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  useAnimatedProps,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  Headphones,
  Radio,
  Rss,
  Bookmark,
  BookmarkCheck,
  Plus,
  Circle,
  Activity,
  Hash,
} from 'lucide-react-native';

// ─── Colors ─────────────────────────────────────────────────────────────────
const C = {
  bg: '#1A1614',
  surface: '#231F1C',
  card: '#F5ECD7',
  red: '#C41E3A',
  pin: '#D4A574',
  textLight: '#E8DCC8',
  muted: '#6B5B4F',
  border: '#3D332C',
  cardText: '#2C1810',
};

// ─── Types ───────────────────────────────────────────────────────────────────
interface Podcast {
  id: string;
  show: string;
  host: string;
  latestEpisode: string;
  hasNew: boolean;
  pinned: boolean;
  category: string;
}

interface LiveItem {
  id: string;
  title: string;
  channel: string;
  isLive: boolean;
  scheduledTime?: string;
  viewers?: string;
}

interface Keyword {
  id: string;
  tag: string;
}

// ─── Mock Data ───────────────────────────────────────────────────────────────
const INITIAL_PODCASTS: Podcast[] = [
  {
    id: '1',
    show: 'Casefile True Crime',
    host: 'Anonymous',
    latestEpisode: 'Case 251: The Zodiac Files',
    hasNew: true,
    pinned: false,
    category: 'True Crime',
  },
  {
    id: '2',
    show: 'Crime Junkie',
    host: 'Ashley Flowers',
    latestEpisode: 'SUSPECT: The Black Dahlia',
    hasNew: true,
    pinned: false,
    category: 'True Crime',
  },
  {
    id: '3',
    show: 'Your Own Backyard',
    host: 'Chris Lambert',
    latestEpisode: 'Ep 72: New Evidence',
    hasNew: false,
    pinned: true,
    category: 'Investigation',
  },
  {
    id: '4',
    show: 'Conspirituality',
    host: 'Various',
    latestEpisode: 'Ep 234: Digital Misinformation',
    hasNew: false,
    pinned: false,
    category: 'Analysis',
  },
  {
    id: '5',
    show: 'The Intercepted',
    host: 'Jeremy Scahill',
    latestEpisode: 'Surveillance State 2025',
    hasNew: true,
    pinned: false,
    category: 'Journalism',
  },
];

const LIVE_NOW: LiveItem[] = [
  {
    id: 'l1',
    title: 'Congressional Hearing - AI Surveillance',
    channel: 'C-SPAN',
    isLive: true,
    viewers: '14.2K',
  },
  {
    id: 'l2',
    title: 'Press Conference: Classified Documents Release',
    channel: 'Reuters',
    isLive: true,
    viewers: '8.7K',
  },
];

const SCHEDULED: LiveItem[] = [
  {
    id: 's1',
    title: 'Senate Intelligence Committee Briefing',
    channel: 'C-SPAN 2',
    isLive: false,
    scheduledTime: 'Today 3:00 PM',
  },
  {
    id: 's2',
    title: 'Independent Journalist Panel: Leaks & Ethics',
    channel: 'Democracy Now',
    isLive: false,
    scheduledTime: 'Today 5:30 PM',
  },
  {
    id: 's3',
    title: 'Whistleblower Protection Act Review',
    channel: 'PBS NewsHour',
    isLive: false,
    scheduledTime: 'Tomorrow 7:00 PM',
  },
];

const INITIAL_KEYWORDS: Keyword[] = [
  { id: 'k1', tag: '#operation_deepstate' },
  { id: 'k2', tag: '#whistleblower' },
  { id: 'k3', tag: '#classified' },
  { id: 'k4', tag: '#foia_request' },
  { id: 'k5', tag: '#surveillance' },
];

// ─── Pulsing Live Dot ─────────────────────────────────────────────────────────
function PulsingDot() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  React.useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.6, { duration: 700 }),
        withTiming(1, { duration: 700 })
      ),
      -1,
      false
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 700 }),
        withTiming(1, { duration: 700 })
      ),
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
      translateY.value = withTiming(0, { duration: 300 });
      opacityVal.value = withTiming(1, { duration: 300 });
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
      <BookmarkCheck size={16} color={C.red} strokeWidth={2} />
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
}

// ─── Podcast Card ─────────────────────────────────────────────────────────────
function PodcastCard({
  item,
  onPin,
  onAddToInvestigation,
}: {
  item: Podcast;
  onPin: (id: string) => void;
  onAddToInvestigation: (show: string) => void;
}) {
  return (
    <View style={styles.podcastCard}>
      <View style={styles.podcastCardHeader}>
        <View style={styles.podcastIconWrap}>
          <Headphones size={18} color={C.red} strokeWidth={2} />
        </View>
        <View style={styles.podcastInfo}>
          <View style={styles.podcastTitleRow}>
            <Text style={styles.podcastShowName} numberOfLines={1}>
              {item.show}
            </Text>
            {item.hasNew ? (
              <View style={styles.newBadge}>
                <Circle size={6} color={C.red} fill={C.red} />
                <Text style={styles.newBadgeText}>NEW</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.podcastHost}>by {item.host}</Text>
          <Text style={styles.podcastEpisode} numberOfLines={1}>
            {item.latestEpisode}
          </Text>
        </View>
        <Pressable
          testID={`pin-podcast-${item.id}`}
          onPress={() => onPin(item.id)}
          style={styles.pinButton}
          hitSlop={8}>
          {item.pinned ? (
            <BookmarkCheck size={20} color={C.pin} strokeWidth={2} />
          ) : (
            <Bookmark size={20} color={C.muted} strokeWidth={2} />
          )}
        </Pressable>
      </View>
      <View style={styles.podcastCardFooter}>
        <View style={styles.categoryChip}>
          <Text style={styles.categoryChipText}>{item.category}</Text>
        </View>
        <Pressable
          testID={`add-investigation-${item.id}`}
          onPress={() => onAddToInvestigation(item.show)}
          style={styles.addInvestigationBtn}>
          <Plus size={13} color={C.red} strokeWidth={2.5} />
          <Text style={styles.addInvestigationText}>Add to Investigation</Text>
        </Pressable>
      </View>
    </View>
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
  return (
    <View style={[styles.liveCard, item.isLive ? styles.liveCardActive : null]}>
      {item.isLive ? <View style={styles.liveCardGlow} /> : null}
      <View style={styles.liveCardContent}>
        <View style={styles.liveCardLeft}>
          {item.isLive ? (
            <View style={styles.liveIndicatorRow}>
              <PulsingDot />
              <Text style={styles.liveBadgeText}>LIVE</Text>
            </View>
          ) : (
            <View style={styles.scheduledIndicator}>
              <Activity size={12} color={C.pin} strokeWidth={2} />
              <Text style={styles.scheduledText}>{item.scheduledTime}</Text>
            </View>
          )}
          <Text style={styles.liveTitle} numberOfLines={2}>
            {item.title}
          </Text>
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
            <BookmarkCheck size={20} color={C.pin} strokeWidth={2} />
          ) : (
            <Bookmark size={20} color={C.muted} strokeWidth={2} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PodcastScreen() {
  const [activeTab, setActiveTab] = useState<'podcasts' | 'live'>('podcasts');
  const [podcasts, setPodcasts] = useState<Podcast[]>(INITIAL_PODCASTS);
  const [keywords, setKeywords] = useState<Keyword[]>(INITIAL_KEYWORDS);
  const [pinnedLive, setPinnedLive] = useState<Set<string>>(new Set());
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [addPodcastVisible, setAddPodcastVisible] = useState(false);
  const [addKeywordVisible, setAddKeywordVisible] = useState(false);
  const [podcastUrl, setPodcastUrl] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tabIndicatorX = useSharedValue(0);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tabIndicatorX.value }],
  }));

  const switchTab = (tab: 'podcasts' | 'live') => {
    setActiveTab(tab);
    tabIndicatorX.value = withTiming(tab === 'podcasts' ? 0 : 1, { duration: 250 });
    Haptics.selectionAsync();
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setToastVisible(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 2500);
  };

  const handlePinPodcast = (id: string) => {
    setPodcasts(prev =>
      prev.map(p => {
        if (p.id === id) {
          const willPin = !p.pinned;
          if (willPin) showToast('Added to investigation board');
          return { ...p, pinned: willPin };
        }
        return p;
      })
    );
  };

  const handleAddToInvestigation = (show: string) => {
    showToast(`"${show}" added to board`);
  };

  const handlePinLive = (id: string) => {
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
  };

  const handleAddPodcast = () => {
    if (!podcastUrl.trim()) return;
    const newPodcast: Podcast = {
      id: Date.now().toString(),
      show: podcastUrl.trim(),
      host: 'Unknown',
      latestEpisode: 'Loading...',
      hasNew: false,
      pinned: false,
      category: 'Custom',
    };
    setPodcasts(prev => [...prev, newPodcast]);
    setPodcastUrl('');
    setAddPodcastVisible(false);
    showToast('Podcast added to feed');
  };

  const handleAddKeyword = () => {
    const raw = newKeyword.trim();
    if (!raw) return;
    const tag = raw.startsWith('#') ? raw : `#${raw}`;
    setKeywords(prev => [...prev, { id: Date.now().toString(), tag }]);
    setNewKeyword('');
    setAddKeywordVisible(false);
    showToast('Keyword added to monitor');
  };

  const handleRemoveKeyword = (id: string) => {
    setKeywords(prev => prev.filter(k => k.id !== id));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* ── Header ──────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>LIVE & PODCASTS</Text>
            <Text style={styles.headerSubtitle}>RESEARCH FEED</Text>
          </View>
          <View style={styles.headerIcon}>
            <Radio size={22} color={C.red} strokeWidth={2} />
          </View>
        </View>

        {/* ── Tab Switcher ─────────────────────────────── */}
        <View style={styles.tabSwitcher}>
          <Pressable
            testID="tab-podcasts"
            style={styles.tabButton}
            onPress={() => switchTab('podcasts')}>
            <Headphones
              size={15}
              color={activeTab === 'podcasts' ? C.textLight : C.muted}
              strokeWidth={2}
            />
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'podcasts' && styles.tabButtonTextActive,
              ]}>
              Podcasts
            </Text>
          </Pressable>
          <Pressable
            testID="tab-live"
            style={styles.tabButton}
            onPress={() => switchTab('live')}>
            <Radio
              size={15}
              color={activeTab === 'live' ? C.textLight : C.muted}
              strokeWidth={2}
            />
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'live' && styles.tabButtonTextActive,
              ]}>
              Live Feed
            </Text>
          </Pressable>
          {/* Animated underline */}
          <View style={styles.tabIndicatorTrack}>
            <Animated.View
              style={[
                styles.tabIndicator,
                indicatorStyle,
                {
                  width: '50%',
                },
              ]}
            />
          </View>
        </View>

        {/* ── Content ─────────────────────────────────── */}
        {activeTab === 'podcasts' ? (
          <FlatList<Podcast>
            testID="podcasts-list"
            data={podcasts}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <View style={styles.sectionHeader}>
                <Rss size={14} color={C.pin} strokeWidth={2} />
                <Text style={styles.sectionTitle}>TRACKED SHOWS</Text>
                <Text style={styles.sectionCount}>{podcasts.length}</Text>
              </View>
            }
            renderItem={({ item }) => (
              <PodcastCard
                item={item}
                onPin={handlePinPodcast}
                onAddToInvestigation={handleAddToInvestigation}
              />
            )}
            ListFooterComponent={
              <Pressable
                testID="add-podcast-button"
                onPress={() => {
                  setAddPodcastVisible(true);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }}
                style={styles.addSourceBtn}>
                <Rss size={16} color={C.textLight} strokeWidth={2} />
                <Text style={styles.addSourceBtnText}>Add Podcast</Text>
              </Pressable>
            }
          />
        ) : (
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
              <LiveCard
                key={item.id}
                item={item}
                onPin={handlePinLive}
                pinned={pinnedLive.has(item.id)}
              />
            ))}

            {/* Scheduled */}
            <View style={[styles.sectionHeader, { marginTop: 24 }]}>
              <Activity size={14} color={C.pin} strokeWidth={2} />
              <Text style={styles.sectionTitle}>SCHEDULED</Text>
            </View>
            {SCHEDULED.map(item => (
              <LiveCard
                key={item.id}
                item={item}
                onPin={handlePinLive}
                pinned={pinnedLive.has(item.id)}
              />
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
                    <Hash size={10} color={C.red} strokeWidth={2.5} />
                    <Text style={styles.keywordChipText}>
                      {kw.tag.replace('#', '')}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.keywordHint}>Long-press to remove</Text>
              <Pressable
                testID="add-keyword-button"
                onPress={() => {
                  setAddKeywordVisible(true);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={styles.addKeywordBtn}>
                <Plus size={14} color={C.textLight} strokeWidth={2.5} />
                <Text style={styles.addKeywordBtnText}>Add Keyword</Text>
              </Pressable>
            </View>
          </ScrollView>
        )}

        {/* ── FAB ─────────────────────────────────────── */}
        <Pressable
          testID="fab-add"
          onPress={() => {
            if (activeTab === 'podcasts') {
              setAddPodcastVisible(true);
            } else {
              setAddKeywordVisible(true);
            }
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }}
          style={styles.fab}>
          <Plus size={24} color="#FFFFFF" strokeWidth={2.5} />
        </Pressable>

        {/* ── Toast ───────────────────────────────────── */}
        <Toast visible={toastVisible} message={toastMessage} />

        {/* ── Add Podcast Modal ────────────────────────── */}
        <Modal
          visible={addPodcastVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setAddPodcastVisible(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}>
            <Pressable
              style={styles.modalBackdrop}
              onPress={() => setAddPodcastVisible(false)}
            />
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Rss size={20} color={C.red} strokeWidth={2} />
                <Text style={styles.modalTitle}>Add Podcast</Text>
              </View>
              <Text style={styles.modalSubtitle}>
                Enter a podcast name, URL, or RSS feed
              </Text>
              <TextInput
                testID="podcast-url-input"
                value={podcastUrl}
                onChangeText={setPodcastUrl}
                placeholder="e.g. https://rss.show/feed or Show Name"
                placeholderTextColor={C.muted}
                style={styles.modalInput}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleAddPodcast}
              />
              <View style={styles.modalActions}>
                <Pressable
                  onPress={() => setAddPodcastVisible(false)}
                  style={styles.modalCancelBtn}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  testID="confirm-add-podcast"
                  onPress={handleAddPodcast}
                  style={[
                    styles.modalConfirmBtn,
                    !podcastUrl.trim() && styles.modalConfirmBtnDisabled,
                  ]}>
                  <Text style={styles.modalConfirmText}>Track Podcast</Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* ── Add Keyword Modal ────────────────────────── */}
        <Modal
          visible={addKeywordVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setAddKeywordVisible(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}>
            <Pressable
              style={styles.modalBackdrop}
              onPress={() => setAddKeywordVisible(false)}
            />
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Hash size={20} color={C.red} strokeWidth={2} />
                <Text style={styles.modalTitle}>Monitor Keyword</Text>
              </View>
              <Text style={styles.modalSubtitle}>
                Track this term across live feeds and social media
              </Text>
              <TextInput
                testID="keyword-input"
                value={newKeyword}
                onChangeText={setNewKeyword}
                placeholder="#keyword or phrase"
                placeholderTextColor={C.muted}
                style={styles.modalInput}
                autoFocus
                returnKeyType="done"
                autoCapitalize="none"
                onSubmitEditing={handleAddKeyword}
              />
              <View style={styles.modalActions}>
                <Pressable
                  onPress={() => setAddKeywordVisible(false)}
                  style={styles.modalCancelBtn}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  testID="confirm-add-keyword"
                  onPress={handleAddKeyword}
                  style={[
                    styles.modalConfirmBtn,
                    !newKeyword.trim() && styles.modalConfirmBtnDisabled,
                  ]}>
                  <Text style={styles.modalConfirmText}>Add Keyword</Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.bg,
  },
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerLeft: {
    gap: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: C.red,
    letterSpacing: 2,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: C.muted,
    letterSpacing: 3,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  // Tab switcher
  tabSwitcher: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: C.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    position: 'relative',
    overflow: 'hidden',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    zIndex: 2,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.muted,
    letterSpacing: 0.5,
  },
  tabButtonTextActive: {
    color: C.textLight,
  },
  tabIndicatorTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: C.border,
  },
  tabIndicator: {
    height: 2,
    backgroundColor: C.red,
    borderRadius: 2,
  },
  // List
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 120,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: C.muted,
    letterSpacing: 2,
    flex: 1,
  },
  sectionCount: {
    fontSize: 11,
    fontWeight: '600',
    color: C.muted,
    backgroundColor: C.surface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  liveCount: {
    fontSize: 11,
    fontWeight: '600',
    color: C.red,
    backgroundColor: '#3D0A14',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.red,
  },
  // Podcast Card
  podcastCard: {
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 10,
    overflow: 'hidden',
  },
  podcastCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    gap: 12,
  },
  podcastIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#3D0A14',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.red,
    flexShrink: 0,
  },
  podcastInfo: {
    flex: 1,
    gap: 3,
  },
  podcastTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  podcastShowName: {
    fontSize: 15,
    fontWeight: '700',
    color: C.textLight,
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  newBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#3D0A14',
    paddingHorizontal: 6,
    paddingVertical: 2,
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
  podcastHost: {
    fontSize: 12,
    color: C.muted,
    fontWeight: '500',
  },
  podcastEpisode: {
    fontSize: 12,
    color: C.pin,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  pinButton: {
    padding: 2,
    flexShrink: 0,
  },
  podcastCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 8,
  },
  categoryChip: {
    backgroundColor: C.bg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.border,
  },
  categoryChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: C.muted,
    letterSpacing: 0.5,
  },
  addInvestigationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#3D0A14',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.red,
  },
  addInvestigationText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.red,
    letterSpacing: 0.3,
  },
  // Add source button
  addSourceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    borderStyle: 'dashed',
    backgroundColor: C.surface,
  },
  addSourceBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textLight,
    letterSpacing: 0.5,
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
  liveCardActive: {
    borderColor: C.red,
  },
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
    padding: 14,
    gap: 12,
  },
  liveCardLeft: {
    flex: 1,
    gap: 6,
  },
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
    fontSize: 14,
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
    fontSize: 11,
    fontWeight: '600',
    color: C.muted,
  },
  viewersText: {
    fontSize: 11,
    color: C.muted,
    marginLeft: 6,
  },
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
    backgroundColor: '#3D0A14',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.red,
  },
  keywordChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.red,
    letterSpacing: 0.3,
  },
  keywordHint: {
    fontSize: 10,
    color: C.muted,
    fontStyle: 'italic',
    letterSpacing: 0.3,
  },
  addKeywordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    borderStyle: 'dashed',
  },
  addKeywordBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textLight,
  },
  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.red,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.red,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
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
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalSheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: C.border,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 44 : 24,
    gap: 12,
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: C.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: C.textLight,
    letterSpacing: 0.3,
  },
  modalSubtitle: {
    fontSize: 13,
    color: C.muted,
    lineHeight: 18,
  },
  modalInput: {
    backgroundColor: C.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: C.textLight,
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    backgroundColor: C.bg,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.muted,
  },
  modalConfirmBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: C.red,
    alignItems: 'center',
  },
  modalConfirmBtnDisabled: {
    opacity: 0.5,
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  // Pulsing dot
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
