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
            <Pin size={13} color={C.pin} strokeWidth={2} />
            <Text style={styles.actionBtnText}>Add to Board</Text>
          </Pressable>

          <Pressable
            testID={`ai-summary-${episode.id}`}
            onPress={() => onAISummary(episode)}
            style={[styles.actionBtn, styles.actionBtnAI]}>
            <Brain size={13} color={C.red} strokeWidth={2} />
            <Text style={[styles.actionBtnText, { color: C.red }]}>AI Summary</Text>
          </Pressable>

          <Pressable
            testID={`share-${episode.id}`}
            onPress={() => onShare(episode)}
            style={styles.actionBtn}>
            <Share2 size={13} color={C.muted} strokeWidth={2} />
            <Text style={styles.actionBtnText}>Share</Text>
          </Pressable>

          <Pressable
            testID={`play-${episode.id}`}
            onPress={() => onPlay(episode)}
            style={styles.playBtn}>
            <Play size={11} color="#FFFFFF" fill="#FFFFFF" strokeWidth={0} />
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
            <BookmarkCheck size={20} color={C.pin} strokeWidth={2} />
          ) : (
            <Pin size={18} color={C.muted} strokeWidth={2} />
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
            <Radio size={20} color={C.red} strokeWidth={2} />
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
                    <Hash size={10} color={C.red} strokeWidth={2.5} />
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
                  <Plus size={11} color={C.muted} strokeWidth={2.5} />
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
    fontSize: 22,
    fontWeight: '800',
    color: C.red,
    letterSpacing: 2,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '600',
    color: C.muted,
    letterSpacing: 3,
    marginTop: 1,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
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
    letterSpacing: 0.5,
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
    letterSpacing: 0.3,
  },
  showPillText: {
    fontSize: 12,
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
    fontSize: 10,
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
    fontSize: 12,
    fontWeight: '700',
    color: C.muted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  episodeListHeaderCount: {
    fontSize: 11,
    fontWeight: '600',
    color: C.muted,
    backgroundColor: C.surface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
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
    borderRadius: 14,
    overflow: 'hidden',
  },
  episodeCardInner: {
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    gap: 10,
  },
  episodeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  showAvatarSmall: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  showAvatarSmallText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  episodeMeta: { flex: 1, gap: 2 },
  episodeShowLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: C.muted,
    letterSpacing: 0.3,
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
    fontSize: 15,
    fontWeight: '700',
    color: C.textLight,
    lineHeight: 21,
    letterSpacing: 0.1,
  },
  episodeDesc: {
    fontSize: 13,
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
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  actionBtnAI: {
    backgroundColor: C.redDim,
    borderColor: C.red,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: C.muted,
    letterSpacing: 0.2,
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.red,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 'auto',
  },
  playBtnText: {
    fontSize: 11,
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
    fontSize: 11,
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
    padding: 14,
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
    fontSize: 11,
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
    fontSize: 11,
    fontWeight: '600',
    color: C.muted,
  },
  keywordHint: {
    fontSize: 10,
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
