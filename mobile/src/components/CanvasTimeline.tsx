import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Image,
  useWindowDimensions,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import {
  Plus,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  X,
  Clock,
  FileText,
  Link2,
  Image as ImageIcon,
  Folder,
  Database,
  Search,
} from 'lucide-react-native';
import type { CanvasNode, NodeType, RedString } from '@/lib/types';
import * as Haptics from 'expo-haptics';

const C = {
  bg: '#0F0D0B',
  surface: '#1A1714',
  card: '#F5ECD7',
  red: '#C41E3A',
  redLight: '#E8445A',
  pin: '#D4A574',
  text: '#E8DCC8',
  muted: '#6B5B4F',
  border: '#3D332C',
  cardText: '#2C1810',
} as const;

export interface ManualTimelineEvent {
  description: string;
  timestamp: number;
  sourceType: string;
  credibility: string;
  sourceUrl?: string;
  note?: string;
}

export interface AITimelineFlag {
  id: string;
  type: 'gap' | 'impossibility' | 'pattern';
  nodeIds: string[];
  message: string;
  timestamp: number;
}

type Granularity = 'Year' | 'Month' | 'Week' | 'Day' | 'Hour' | 'Min' | 'Sec';
const GRANULARITIES: Granularity[] = ['Year', 'Month', 'Week', 'Day', 'Hour', 'Min', 'Sec'];

interface CanvasTimelineProps {
  nodes: CanvasNode[];
  strings: RedString[];
  investigationId: string;
  scrollDirection: 'horizontal' | 'vertical';
  dateRangeStart?: number;
  dateRangeEnd?: number;
  onNodeTap: (nodeId: string) => void;
  onNodeTimestampUpdate: (nodeId: string, timestamp: number) => void;
  onAddManualEvent: (event: ManualTimelineEvent) => void;
  onAIFlagTap: (flag: AITimelineFlag) => void;
}

type NodeIconComponent = React.ComponentType<{ size: number; color: string; strokeWidth: number }>;

const NODE_ICONS: Record<NodeType, NodeIconComponent> = {
  note: FileText,
  link: Link2,
  image: ImageIcon,
  folder: Folder,
  dataset: Database,
  investigation: Search,
};

function formatForGranularity(ts: number, granularity: Granularity): string {
  const d = new Date(ts);
  switch (granularity) {
    case 'Year': return d.getFullYear().toString();
    case 'Month': return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    case 'Week':
    case 'Day': return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    case 'Hour': return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit' });
    case 'Min': return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    case 'Sec': return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    default: return d.toLocaleDateString();
  }
}

function detectGaps(datedNodes: CanvasNode[], strings: RedString[]): AITimelineFlag[] {
  const flags: AITimelineFlag[] = [];
  strings.forEach((s) => {
    const from = datedNodes.find((n) => n.id === s.fromNodeId);
    const to = datedNodes.find((n) => n.id === s.toNodeId);
    if (from?.timestamp && to?.timestamp) {
      const gapMs = Math.abs(to.timestamp - from.timestamp);
      const gapDays = gapMs / (1000 * 60 * 60 * 24);
      if (gapDays > 30) {
        flags.push({
          id: `gap-${s.id}`,
          type: 'gap',
          nodeIds: [s.fromNodeId, s.toNodeId],
          message: `Unusual gap: ${Math.round(gapDays)} days between "${from.title}" and "${to.title}"`,
          timestamp: (from.timestamp + to.timestamp) / 2,
        });
      }
    }
  });
  return flags;
}

const SOURCE_TYPES = ['url', 'document', 'testimony', 'tip', 'other'];
const CREDIBILITIES = ['primary', 'secondary', 'unverified', 'confirmed', 'disputed'];

export default function CanvasTimeline({
  nodes,
  strings,
  scrollDirection,
  dateRangeStart,
  dateRangeEnd,
  onNodeTap,
  onAddManualEvent,
  onAIFlagTap,
}: CanvasTimelineProps) {
  const { width: screenW } = useWindowDimensions();
  const [granularity, setGranularity] = useState<Granularity>('Day');
  const [unplacedExpanded, setUnplacedExpanded] = useState<boolean>(true);
  const [showAddEventModal, setShowAddEventModal] = useState<boolean>(false);

  // Manual event form state
  const [eventDesc, setEventDesc] = useState<string>('');
  const [eventDateStr, setEventDateStr] = useState<string>('');
  const [eventTimeStr, setEventTimeStr] = useState<string>('00:00');
  const [eventSourceType, setEventSourceType] = useState<string>('url');
  const [eventCredibility, setEventCredibility] = useState<string>('unverified');
  const [eventSourceUrl, setEventSourceUrl] = useState<string>('');
  const [eventNote, setEventNote] = useState<string>('');

  const datedNodes = useMemo(() => nodes.filter((n) => !!n.timestamp), [nodes]);
  const undatedNodes = useMemo(() => nodes.filter((n) => !n.timestamp), [nodes]);

  const aiFlags = useMemo(() => detectGaps(datedNodes, strings), [datedNodes, strings]);

  const sorted = useMemo(
    () => [...datedNodes].sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0)),
    [datedNodes]
  );

  const rangeStart = useMemo(() => {
    if (dateRangeStart) return dateRangeStart;
    if (sorted.length === 0) return Date.now() - 1000 * 60 * 60 * 24 * 30;
    return sorted[0].timestamp ?? Date.now();
  }, [sorted, dateRangeStart]);

  const rangeEnd = useMemo(() => {
    if (dateRangeEnd) return dateRangeEnd;
    if (sorted.length === 0) return Date.now();
    return sorted[sorted.length - 1].timestamp ?? Date.now();
  }, [sorted, dateRangeEnd]);

  const timelineLength = scrollDirection === 'horizontal' ? Math.max(screenW * 3, 1200) : Math.max(1200, sorted.length * 160);
  const rangeDuration = Math.max(rangeEnd - rangeStart, 1);

  function positionOf(ts: number): number {
    return ((ts - rangeStart) / rangeDuration) * (timelineLength - 120) + 60;
  }

  // Flags mapped to positions
  const flagsWithPositions = useMemo(
    () => aiFlags.map((f) => ({ flag: f, pos: positionOf(f.timestamp) })),
    [aiFlags, rangeStart, rangeDuration, timelineLength]
  );

  const handleAddEvent = useCallback(() => {
    if (!eventDesc.trim() || !eventDateStr.trim()) return;
    const dateTime = new Date(`${eventDateStr}T${eventTimeStr}:00`);
    if (isNaN(dateTime.getTime())) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onAddManualEvent({
      description: eventDesc.trim(),
      timestamp: dateTime.getTime(),
      sourceType: eventSourceType,
      credibility: eventCredibility,
      sourceUrl: eventSourceUrl.trim() || undefined,
      note: eventNote.trim() || undefined,
    });
    setShowAddEventModal(false);
    setEventDesc('');
    setEventDateStr('');
    setEventTimeStr('00:00');
    setEventSourceUrl('');
    setEventNote('');
  }, [eventDesc, eventDateStr, eventTimeStr, eventSourceType, eventCredibility, eventSourceUrl, eventNote, onAddManualEvent]);

  const isHorizontal = scrollDirection === 'horizontal';

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* ── Granularity toggle row ── */}
      <View style={{ flexGrow: 0 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexDirection: 'row' }}
          style={{ flexGrow: 0 }}
        >
          {GRANULARITIES.map((g) => (
            <Pressable
              key={g}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setGranularity(g);
              }}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 20,
                backgroundColor: granularity === g ? C.red : C.surface,
                borderWidth: 1,
                borderColor: granularity === g ? C.red : C.border,
              }}
            >
              <Text
                style={{
                  color: granularity === g ? '#FFF' : C.muted,
                  fontSize: 12,
                  fontWeight: '700',
                }}
              >
                {g}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* ── Timeline area ── */}
      <View style={{ flex: 1 }}>
        {isHorizontal ? (
          <HorizontalTimeline
            sorted={sorted}
            flagsWithPositions={flagsWithPositions}
            timelineLength={timelineLength}
            positionOf={positionOf}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            granularity={granularity}
            onNodeTap={onNodeTap}
            onAIFlagTap={onAIFlagTap}
          />
        ) : (
          <VerticalTimeline
            sorted={sorted}
            flagsWithPositions={flagsWithPositions}
            timelineLength={timelineLength}
            positionOf={positionOf}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            granularity={granularity}
            onNodeTap={onNodeTap}
            onAIFlagTap={onAIFlagTap}
          />
        )}
      </View>

      {/* ── Unplaced Events tray ── */}
      {undatedNodes.length > 0 ? (
        <View
          style={{
            backgroundColor: C.surface,
            borderTopWidth: 1,
            borderTopColor: C.border,
            maxHeight: unplacedExpanded ? 160 : 44,
          }}
        >
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setUnplacedExpanded((p) => !p);
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}
          >
            <Text style={{ color: C.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 }}>
              UNPLACED EVENTS ({undatedNodes.length})
            </Text>
            {unplacedExpanded ? (
              <ChevronDown size={16} color={C.muted} strokeWidth={2} />
            ) : (
              <ChevronUp size={16} color={C.muted} strokeWidth={2} />
            )}
          </Pressable>
          {unplacedExpanded ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 12, gap: 8, flexDirection: 'row' }}
              style={{ flexGrow: 0 }}
            >
              {undatedNodes.map((node) => {
                const Icon = NODE_ICONS[node.type] ?? FileText;
                return (
                  <Pressable
                    key={node.id}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      onNodeTap(node.id);
                    }}
                    style={({ pressed }) => ({
                      backgroundColor: pressed ? '#2A2420' : C.bg,
                      borderRadius: 8,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      borderWidth: 1,
                      borderColor: C.border,
                      minWidth: 100,
                      maxWidth: 140,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                    })}
                  >
                    <Icon size={12} color={C.muted} strokeWidth={2} />
                    <Text style={{ color: C.text, fontSize: 11, fontWeight: '600', flex: 1 }} numberOfLines={2}>
                      {node.title}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}
        </View>
      ) : null}

      {/* ── Add Event FAB ── */}
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setShowAddEventModal(true);
        }}
        style={({ pressed }) => ({
          position: 'absolute',
          top: 52,
          right: 16,
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: pressed ? '#A3162E' : C.red,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: C.red,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 8,
          elevation: 8,
          zIndex: 100,
        })}
      >
        <Plus size={20} color="#FFF" strokeWidth={2.5} />
      </Pressable>

      {/* ── Add Manual Event Modal ── */}
      <Modal
        visible={showAddEventModal}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setShowAddEventModal(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}
          onPress={() => setShowAddEventModal(false)}
        >
          <Pressable onPress={() => null}>
            <View
              style={{
                backgroundColor: C.surface,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                paddingTop: 12,
                paddingHorizontal: 20,
                paddingBottom: 40,
                borderTopWidth: 1,
                borderTopColor: C.border,
              }}
            >
              {/* Grabber */}
              <View
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: C.border,
                  alignSelf: 'center',
                  marginBottom: 16,
                }}
              />

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <Text style={{ color: C.text, fontSize: 17, fontWeight: '800' }}>Add Timeline Event</Text>
                <Pressable onPress={() => setShowAddEventModal(false)}>
                  <X size={18} color={C.muted} strokeWidth={2} />
                </Pressable>
              </View>

              {/* Description */}
              <Text style={{ color: C.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 6 }}>
                DESCRIPTION *
              </Text>
              <TextInput
                value={eventDesc}
                onChangeText={setEventDesc}
                placeholder="What happened?"
                placeholderTextColor={C.muted}
                style={{
                  backgroundColor: C.bg, borderRadius: 8, padding: 12,
                  color: C.text, fontSize: 14, borderWidth: 1, borderColor: C.border, marginBottom: 12,
                }}
              />

              {/* Date + Time */}
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                <View style={{ flex: 2 }}>
                  <Text style={{ color: C.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 6 }}>
                    DATE * (YYYY-MM-DD)
                  </Text>
                  <TextInput
                    value={eventDateStr}
                    onChangeText={setEventDateStr}
                    placeholder="2024-11-22"
                    placeholderTextColor={C.muted}
                    keyboardType="numbers-and-punctuation"
                    style={{
                      backgroundColor: C.bg, borderRadius: 8, padding: 12,
                      color: C.text, fontSize: 14, borderWidth: 1, borderColor: C.border,
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 6 }}>
                    TIME (HH:MM)
                  </Text>
                  <TextInput
                    value={eventTimeStr}
                    onChangeText={setEventTimeStr}
                    placeholder="00:00"
                    placeholderTextColor={C.muted}
                    keyboardType="numbers-and-punctuation"
                    style={{
                      backgroundColor: C.bg, borderRadius: 8, padding: 12,
                      color: C.text, fontSize: 14, borderWidth: 1, borderColor: C.border,
                    }}
                  />
                </View>
              </View>

              {/* Source type */}
              <Text style={{ color: C.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 6 }}>
                SOURCE TYPE
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 12, flexGrow: 0 }}
                contentContainerStyle={{ gap: 6, flexDirection: 'row' }}
              >
                {SOURCE_TYPES.map((st) => (
                  <Pressable
                    key={st}
                    onPress={() => setEventSourceType(st)}
                    style={{
                      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
                      backgroundColor: eventSourceType === st ? C.red + '22' : C.bg,
                      borderWidth: 1, borderColor: eventSourceType === st ? C.red : C.border,
                    }}
                  >
                    <Text style={{ color: eventSourceType === st ? C.red : C.muted, fontSize: 11, fontWeight: '700' }}>
                      {st.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* Credibility */}
              <Text style={{ color: C.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 6 }}>
                CREDIBILITY
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {CREDIBILITIES.map((cred) => {
                  const credColor =
                    cred === 'confirmed' ? '#22C55E' :
                    cred === 'disputed' ? '#C41E3A' :
                    cred === 'primary' ? '#3B82F6' : C.muted;
                  return (
                    <Pressable
                      key={cred}
                      onPress={() => setEventCredibility(cred)}
                      style={{
                        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
                        backgroundColor: eventCredibility === cred ? credColor + '22' : C.bg,
                        borderWidth: 1, borderColor: eventCredibility === cred ? credColor : C.border,
                      }}
                    >
                      <Text style={{ color: eventCredibility === cred ? credColor : C.muted, fontSize: 11, fontWeight: '700' }}>
                        {cred.toUpperCase()}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Optional source URL */}
              <Text style={{ color: C.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 6 }}>
                SOURCE URL (optional)
              </Text>
              <TextInput
                value={eventSourceUrl}
                onChangeText={setEventSourceUrl}
                placeholder="https://..."
                placeholderTextColor={C.muted}
                autoCapitalize="none"
                keyboardType="url"
                style={{
                  backgroundColor: C.bg, borderRadius: 8, padding: 12,
                  color: C.text, fontSize: 14, borderWidth: 1, borderColor: C.border, marginBottom: 12,
                }}
              />

              {/* Note */}
              <Text style={{ color: C.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 6 }}>
                NOTE (optional)
              </Text>
              <TextInput
                value={eventNote}
                onChangeText={setEventNote}
                placeholder="Additional context..."
                placeholderTextColor={C.muted}
                multiline
                style={{
                  backgroundColor: C.bg, borderRadius: 8, padding: 12,
                  color: C.text, fontSize: 14, borderWidth: 1, borderColor: C.border,
                  minHeight: 60, textAlignVertical: 'top', marginBottom: 20,
                }}
              />

              {/* Submit */}
              <Pressable
                onPress={handleAddEvent}
                disabled={!eventDesc.trim() || !eventDateStr.trim()}
                style={({ pressed }) => ({
                  paddingVertical: 14, borderRadius: 12, alignItems: 'center',
                  backgroundColor:
                    !eventDesc.trim() || !eventDateStr.trim()
                      ? C.border
                      : pressed ? '#A3162E' : C.red,
                })}
              >
                <Text
                  style={{
                    color: !eventDesc.trim() || !eventDateStr.trim() ? C.muted : '#FFF',
                    fontSize: 15,
                    fontWeight: '800',
                  }}
                >
                  Add to Timeline
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ── Horizontal Timeline ──────────────────────────────────────────────────────
interface TimelineRenderProps {
  sorted: CanvasNode[];
  flagsWithPositions: { flag: AITimelineFlag; pos: number }[];
  timelineLength: number;
  positionOf: (ts: number) => number;
  rangeStart: number;
  rangeEnd: number;
  granularity: Granularity;
  onNodeTap: (id: string) => void;
  onAIFlagTap: (flag: AITimelineFlag) => void;
}

function HorizontalTimeline({
  sorted,
  flagsWithPositions,
  timelineLength,
  positionOf,
  rangeStart,
  rangeEnd,
  granularity,
  onNodeTap,
  onAIFlagTap,
}: TimelineRenderProps) {
  const AXIS_Y = 140; // vertical position of the axis line within the scrollable content

  // Generate tick marks based on granularity
  const ticks = useMemo(() => {
    const result: { ts: number; label: string; pos: number }[] = [];
    const numTicks = 8;
    const step = (rangeEnd - rangeStart) / numTicks;
    for (let i = 0; i <= numTicks; i++) {
      const ts = rangeStart + step * i;
      result.push({
        ts,
        label: formatForGranularity(ts, granularity),
        pos: positionOf(ts),
      });
    }
    return result;
  }, [rangeStart, rangeEnd, granularity, positionOf]);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ width: timelineLength, height: '100%', position: 'relative' }}>
        {/* Axis line */}
        <View
          style={{
            position: 'absolute',
            top: AXIS_Y,
            left: 0,
            width: timelineLength,
            height: 2,
            backgroundColor: C.red,
          }}
        />

        {/* Tick marks */}
        {ticks.map((tick, idx) => (
          <View key={idx} style={{ position: 'absolute', left: tick.pos - 1, top: AXIS_Y - 8 }}>
            <View style={{ width: 2, height: 16, backgroundColor: C.red, opacity: 0.6 }} />
            <Text
              style={{
                color: C.muted,
                fontSize: 9,
                fontWeight: '600',
                marginTop: 4,
                width: 80,
                marginLeft: -40,
                textAlign: 'center',
              }}
              numberOfLines={1}
            >
              {tick.label}
            </Text>
          </View>
        ))}

        {/* Node cards */}
        {sorted.map((node, idx) => {
          const ts = node.timestamp ?? rangeStart;
          const xPos = positionOf(ts);
          const isAbove = idx % 2 === 0; // alternate above/below axis
          const Icon = NODE_ICONS[node.type] ?? FileText;
          return (
            <Animated.View
              key={node.id}
              entering={FadeIn.delay(idx * 30).duration(300)}
              style={{
                position: 'absolute',
                left: xPos - 70,
                top: isAbove ? AXIS_Y - 130 : AXIS_Y + 20,
                width: 140,
              }}
            >
              {/* Connector line from axis to card */}
              <View
                style={{
                  position: 'absolute',
                  left: 69,
                  top: isAbove ? 90 : -10,
                  width: 2,
                  height: 14,
                  backgroundColor: C.red,
                  opacity: 0.5,
                }}
              />
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onNodeTap(node.id);
                }}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? '#EDE3CC' : C.card,
                  borderRadius: 10,
                  padding: 10,
                  borderWidth: 1,
                  borderColor: 'rgba(100,60,20,0.15)',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 6,
                  elevation: 4,
                })}
              >
                {/* Image thumbnail */}
                {node.imageUri ? (
                  <Image
                    source={{ uri: node.imageUri }}
                    style={{ width: '100%', height: 40, borderRadius: 6, marginBottom: 6 }}
                    resizeMode="cover"
                  />
                ) : null}

                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 5 }}>
                  <Icon size={12} color={C.muted} strokeWidth={2} />
                  <Text
                    style={{ color: C.cardText, fontSize: 11, fontWeight: '700', flex: 1 }}
                    numberOfLines={2}
                  >
                    {node.title}
                  </Text>
                </View>

                {/* Timestamp */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 5 }}>
                  <Clock size={9} color={C.muted} strokeWidth={2} />
                  <Text style={{ color: C.muted, fontSize: 9 }} numberOfLines={1}>
                    {formatForGranularity(ts, granularity)}
                  </Text>
                </View>

                {/* Contributor badge */}
                {node.provenance?.addedByUsername ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 3,
                      marginTop: 4,
                      backgroundColor: C.surface,
                      borderRadius: 4,
                      paddingHorizontal: 4,
                      paddingVertical: 2,
                      alignSelf: 'flex-start',
                    }}
                  >
                    <Text style={{ color: C.muted, fontSize: 8, fontWeight: '700' }}>
                      {node.provenance.addedByUsername}
                    </Text>
                  </View>
                ) : null}

                {/* Source type badge */}
                {(node.sources ?? []).length > 0 ? (
                  <View
                    style={{
                      marginTop: 4,
                      backgroundColor: 'rgba(212,165,116,0.15)',
                      borderRadius: 4,
                      paddingHorizontal: 4,
                      paddingVertical: 2,
                      alignSelf: 'flex-start',
                    }}
                  >
                    <Text style={{ color: C.pin, fontSize: 8, fontWeight: '700' }}>
                      {(node.sources![0].contentType ?? 'source').toUpperCase()}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            </Animated.View>
          );
        })}

        {/* AI flags */}
        {flagsWithPositions.map(({ flag, pos }) => (
          <Pressable
            key={flag.id}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onAIFlagTap(flag);
            }}
            style={{
              position: 'absolute',
              left: pos - 14,
              top: AXIS_Y - 14,
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: 'rgba(245,158,11,0.2)',
              borderWidth: 1.5,
              borderColor: '#F59E0B',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}
          >
            <AlertTriangle size={14} color="#F59E0B" strokeWidth={2.5} />
          </Pressable>
        ))}

        {/* Empty state */}
        {sorted.length === 0 ? (
          <View
            style={{
              position: 'absolute',
              left: '50%',
              top: AXIS_Y - 60,
              alignItems: 'center',
              width: 200,
              marginLeft: -100,
            }}
          >
            <Text style={{ color: C.muted, fontSize: 12, textAlign: 'center' }}>
              No dated events yet.{'\n'}Tap + to add a manual event,{'\n'}or set dates on nodes.
            </Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

// ── Vertical Timeline ────────────────────────────────────────────────────────
function VerticalTimeline({
  sorted,
  flagsWithPositions,
  timelineLength,
  positionOf,
  rangeStart,
  rangeEnd,
  granularity,
  onNodeTap,
  onAIFlagTap,
}: TimelineRenderProps) {
  const AXIS_X = 80; // horizontal position of the axis

  const ticks = useMemo(() => {
    const result: { ts: number; label: string; pos: number }[] = [];
    const numTicks = 10;
    const step = (rangeEnd - rangeStart) / numTicks;
    for (let i = 0; i <= numTicks; i++) {
      const ts = rangeStart + step * i;
      result.push({
        ts,
        label: formatForGranularity(ts, granularity),
        pos: positionOf(ts),
      });
    }
    return result;
  }, [rangeStart, rangeEnd, granularity, positionOf]);

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={{ height: timelineLength, width: '100%', position: 'relative' }}>
        {/* Axis line */}
        <View
          style={{
            position: 'absolute',
            left: AXIS_X,
            top: 0,
            width: 2,
            height: timelineLength,
            backgroundColor: C.red,
          }}
        />

        {/* Tick marks */}
        {ticks.map((tick, idx) => (
          <View key={idx} style={{ position: 'absolute', top: tick.pos - 1, left: AXIS_X - 8 }}>
            <View style={{ width: 16, height: 2, backgroundColor: C.red, opacity: 0.6 }} />
            <Text
              style={{
                color: C.muted,
                fontSize: 9,
                fontWeight: '600',
                marginTop: -8,
                marginLeft: -60,
                width: 56,
                textAlign: 'right',
              }}
              numberOfLines={2}
            >
              {tick.label}
            </Text>
          </View>
        ))}

        {/* Node cards */}
        {sorted.map((node, idx) => {
          const ts = node.timestamp ?? rangeStart;
          const yPos = positionOf(ts);
          const Icon = NODE_ICONS[node.type] ?? FileText;
          return (
            <Animated.View
              key={node.id}
              entering={FadeIn.delay(idx * 30).duration(300)}
              style={{
                position: 'absolute',
                top: yPos - 40,
                left: AXIS_X + 14,
                width: 180,
              }}
            >
              {/* Horizontal connector */}
              <View
                style={{
                  position: 'absolute',
                  left: -14,
                  top: 39,
                  width: 14,
                  height: 2,
                  backgroundColor: C.red,
                  opacity: 0.5,
                }}
              />
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onNodeTap(node.id);
                }}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? '#EDE3CC' : C.card,
                  borderRadius: 10,
                  padding: 10,
                  borderWidth: 1,
                  borderColor: 'rgba(100,60,20,0.15)',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 6,
                  elevation: 4,
                })}
              >
                {node.imageUri ? (
                  <Image
                    source={{ uri: node.imageUri }}
                    style={{ width: '100%', height: 40, borderRadius: 6, marginBottom: 6 }}
                    resizeMode="cover"
                  />
                ) : null}

                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 5 }}>
                  <Icon size={12} color={C.muted} strokeWidth={2} />
                  <Text
                    style={{ color: C.cardText, fontSize: 11, fontWeight: '700', flex: 1 }}
                    numberOfLines={2}
                  >
                    {node.title}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 }}>
                  <Clock size={9} color={C.muted} strokeWidth={2} />
                  <Text style={{ color: C.muted, fontSize: 9 }} numberOfLines={1}>
                    {formatForGranularity(ts, granularity)}
                  </Text>
                </View>

                {node.provenance?.addedByUsername ? (
                  <View
                    style={{
                      marginTop: 4,
                      backgroundColor: C.surface,
                      borderRadius: 4,
                      paddingHorizontal: 4,
                      paddingVertical: 2,
                      alignSelf: 'flex-start',
                    }}
                  >
                    <Text style={{ color: C.muted, fontSize: 8, fontWeight: '700' }}>
                      {node.provenance.addedByUsername}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            </Animated.View>
          );
        })}

        {/* AI flags */}
        {flagsWithPositions.map(({ flag, pos }) => (
          <Pressable
            key={flag.id}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onAIFlagTap(flag);
            }}
            style={{
              position: 'absolute',
              top: pos - 14,
              left: AXIS_X - 14,
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: 'rgba(245,158,11,0.2)',
              borderWidth: 1.5,
              borderColor: '#F59E0B',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}
          >
            <AlertTriangle size={14} color="#F59E0B" strokeWidth={2.5} />
          </Pressable>
        ))}

        {sorted.length === 0 ? (
          <View style={{ position: 'absolute', top: 80, left: AXIS_X + 24, width: 200 }}>
            <Text style={{ color: C.muted, fontSize: 12 }}>
              No dated events yet.{'\n'}Tap + to add a manual event.
            </Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
