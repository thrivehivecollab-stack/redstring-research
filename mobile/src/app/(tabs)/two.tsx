import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  AppState,
  useWindowDimensions,
  StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  runOnJS,
  Easing,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, {
  Path,
  Circle as SvgCircle,
  Text as SvgText,
  Defs,
  Filter,
  FeGaussianBlur,
  FeComposite,
} from 'react-native-svg';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import {
  ArrowLeft,
  Plus,
  Cable,
  FileText,
  Link2,
  Image as ImageIcon,
  Folder,
  Database,
  Search,
  Trash2,
  X,
  Lock,
  LayoutGrid,
  Network,
  BookOpen,
  Calendar,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import useInvestigationStore from '@/lib/state/investigation-store';
import useSubscriptionStore from '@/lib/state/subscription-store';
import useTourStore from '@/lib/state/tour-store';
import type { CanvasNode, NodeType, TagColor, Timeline, RedString } from '@/lib/types';
import TimelinePanel from '@/components/TimelinePanel';
import MindMapCanvas from '@/components/MindMapCanvas';
import ColorLegend from '@/components/ColorLegend';
import ColorSuggestionSheet from '@/components/ColorSuggestionSheet';
import TourOverlay from '@/components/TourOverlay';
import { useAutomationEngine } from '@/components/AutomationEngine';

// ---- Color constants ----
const C = {
  bg: '#1A1614',
  surface: '#231F1C',
  card: '#F5ECD7',
  red: '#C41E3A',
  redLight: '#E8445A',
  pin: '#D4A574',
  text: '#E8DCC8',
  muted: '#6B5B4F',
  border: '#3D332C',
  cardText: '#2C1810',
} as const;

const NODE_W = 160;
const NODE_H = 100;

const TAG_COLORS: Record<TagColor, string> = {
  red: '#C41E3A',
  blue: '#3B82F6',
  green: '#22C55E',
  amber: '#F59E0B',
  purple: '#A855F7',
  teal: '#14B8A6',
};

// String color palette for the color picker
const STRING_COLORS = [
  '#C41E3A', '#3B82F6', '#22C55E', '#F59E0B',
  '#A855F7', '#14B8A6', '#F97316', '#EC4899',
  '#E8DCC8', '#FFFFFF',
];

type IconComponent = React.ComponentType<{ size: number; color: string; strokeWidth: number }>;

const NODE_ICONS: Record<NodeType, IconComponent> = {
  note: FileText,
  link: Link2,
  image: ImageIcon,
  folder: Folder,
  dataset: Database,
  investigation: Search,
};

// ---- Bezier path helper ----
function makeBezierPath(
  fx: number,
  fy: number,
  tx: number,
  ty: number
): string {
  const dx = tx - fx;
  const dy = ty - fy;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  // For mostly horizontal connections, control points push curve up/down
  // For mostly vertical, push left/right
  let cp1x: number, cp1y: number, cp2x: number, cp2y: number;
  if (absDx >= absDy) {
    // Horizontal bias
    const offset = absDy * 0.3 + 20;
    cp1x = fx + dx * 0.4;
    cp1y = fy - offset;
    cp2x = tx - dx * 0.4;
    cp2y = ty - offset;
  } else {
    // Vertical bias
    const offset = absDx * 0.3 + 20;
    cp1x = fx + offset;
    cp1y = fy + dy * 0.4;
    cp2x = tx + offset;
    cp2y = ty - dy * 0.4;
  }

  return `M ${fx} ${fy} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${tx} ${ty}`;
}

// Cubic bezier midpoint at t=0.5
function bezierMidpoint(
  fx: number,
  fy: number,
  tx: number,
  ty: number
): { x: number; y: number } {
  const dx = tx - fx;
  const dy = ty - fy;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  let cp1x: number, cp1y: number, cp2x: number, cp2y: number;
  if (absDx >= absDy) {
    const offset = absDy * 0.3 + 20;
    cp1x = fx + dx * 0.4;
    cp1y = fy - offset;
    cp2x = tx - dx * 0.4;
    cp2y = ty - offset;
  } else {
    const offset = absDx * 0.3 + 20;
    cp1x = fx + offset;
    cp1y = fy + dy * 0.4;
    cp2x = tx + offset;
    cp2y = ty - dy * 0.4;
  }
  // B(0.5) = (1-t)^3*P0 + 3(1-t)^2*t*P1 + 3(1-t)*t^2*P2 + t^3*P3 at t=0.5
  const t = 0.5;
  const mt = 1 - t;
  const x = mt * mt * mt * fx + 3 * mt * mt * t * cp1x + 3 * mt * t * t * cp2x + t * t * t * tx;
  const y = mt * mt * mt * fy + 3 * mt * mt * t * cp1y + 3 * mt * t * t * cp2y + t * t * t * ty;
  return { x, y };
}

// ---- Node card component ----
function NodeCard({
  node,
  scaleVal,
  tX,
  tY,
  connectMode,
  connectingFromId,
  onTap,
  onDragEnd,
  onDragStart,
  onDragMove,
  onDragEndPosition,
}: {
  node: CanvasNode;
  scaleVal: Animated.SharedValue<number>;
  tX: Animated.SharedValue<number>;
  tY: Animated.SharedValue<number>;
  connectMode: boolean;
  connectingFromId: string | null;
  onTap: (id: string) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  onDragStart: (id: string) => void;
  onDragMove: (id: string, screenY: number) => void;
  onDragEndPosition: (id: string, screenX: number, screenY: number) => void;
}) {
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const isDragging = useSharedValue(false);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!connectMode)
        .onStart(() => {
          isDragging.value = true;
          runOnJS(onDragStart)(node.id);
        })
        .onUpdate((e) => {
          offsetX.value = e.translationX / scaleVal.value;
          offsetY.value = e.translationY / scaleVal.value;
          runOnJS(onDragMove)(node.id, e.absoluteY);
        })
        .onEnd((e) => {
          isDragging.value = false;
          const finalX = node.position.x + offsetX.value;
          const finalY = node.position.y + offsetY.value;
          offsetX.value = 0;
          offsetY.value = 0;
          runOnJS(onDragEndPosition)(node.id, e.absoluteX, e.absoluteY);
          runOnJS(onDragEnd)(node.id, finalX, finalY);
        }),
    [connectMode, node.id, node.position.x, node.position.y, scaleVal, onDragEnd, onDragStart, onDragMove, onDragEndPosition, offsetX, offsetY, isDragging]
  );

  const tapGesture = useMemo(
    () =>
      Gesture.Tap().onEnd(() => {
        runOnJS(onTap)(node.id);
      }),
    [node.id, onTap]
  );

  const composed = useMemo(() => {
    if (connectMode) return tapGesture;
    return Gesture.Race(tapGesture, panGesture);
  }, [connectMode, tapGesture, panGesture]);

  const animStyle = useAnimatedStyle(() => {
    const sx = (node.position.x + offsetX.value) * scaleVal.value + tX.value;
    const sy = (node.position.y + offsetY.value) * scaleVal.value + tY.value;
    return {
      position: 'absolute' as const,
      left: sx,
      top: sy,
      width: NODE_W * scaleVal.value,
      transform: [{ scale: isDragging.value ? 1.05 : 1 }],
    };
  });

  const Icon = NODE_ICONS[node.type] ?? FileText;
  const pinColor = node.color ? TAG_COLORS[node.color] : C.pin;
  const leftBorderColor = node.color ? TAG_COLORS[node.color] : 'transparent';
  const isFrom = connectingFromId === node.id;

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={animStyle}>
        <View
          style={[
            styles.nodeCard,
            isFrom ? { borderWidth: 2, borderColor: C.red } : undefined,
          ]}
        >
          {/* Colored left category stripe */}
          {node.color ? (
            <View
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: 4,
                backgroundColor: leftBorderColor,
                borderTopLeftRadius: 8,
                borderBottomLeftRadius: 8,
                opacity: 0.85,
              }}
            />
          ) : null}
          <View style={[styles.pushpin, { backgroundColor: pinColor }]} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, paddingLeft: node.color ? 6 : 0 }}>
            <Icon size={14} color={C.muted} strokeWidth={2} />
            <Text
              className="text-xs font-bold"
              style={{ color: C.cardText, flex: 1 }}
              numberOfLines={2}
            >
              {node.title}
            </Text>
          </View>
          {node.tags.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6, paddingLeft: node.color ? 6 : 0 }}>
              {node.tags.slice(0, 3).map((tag) => (
                <View
                  key={tag.id}
                  style={{
                    backgroundColor: TAG_COLORS[tag.color] + '22',
                    borderRadius: 4,
                    paddingHorizontal: 5,
                    paddingVertical: 1,
                  }}
                >
                  <Text style={{ color: TAG_COLORS[tag.color], fontSize: 9, fontWeight: '600' }}>
                    {tag.label}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

// ---- Corkboard SVG strings layer ----
function StringsLayer({
  strings,
  nodeMap,
  scaleVal,
  tX,
  tY,
  selectedStringId,
  canvasVersion,
}: {
  strings: Array<{ id: string; fromNodeId: string; toNodeId: string; label?: string; color: string; thickness?: number; style?: 'solid' | 'dashed' | 'dotted' }>;
  nodeMap: Map<string, CanvasNode>;
  scaleVal: Animated.SharedValue<number>;
  tX: Animated.SharedValue<number>;
  tY: Animated.SharedValue<number>;
  selectedStringId: string | null;
  canvasVersion: number;
}) {
  const [canvasState, setCanvasState] = useState<{ scale: number; tx: number; ty: number }>({
    scale: 1,
    tx: 0,
    ty: 0,
  });

  // Sync canvas transform whenever canvasVersion bumps (pan/zoom) or strings change
  useEffect(() => {
    setCanvasState({
      scale: scaleVal.value,
      tx: tX.value,
      ty: tY.value,
    });
  }, [canvasVersion, strings, scaleVal, tX, tY]);

  const curScale = canvasState.scale;
  const curTX = canvasState.tx;
  const curTY = canvasState.ty;

  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <Filter id="stringGlow" x="-20%" y="-20%" width="140%" height="140%">
          <FeGaussianBlur stdDeviation="2" result="blur" />
          <FeComposite in="SourceGraphic" in2="blur" operator="over" />
        </Filter>
      </Defs>
      {strings.map((s) => {
        const fromN = nodeMap.get(s.fromNodeId);
        const toN = nodeMap.get(s.toNodeId);
        if (!fromN || !toN) return null;
        const fx = fromN.position.x * curScale + curTX + (NODE_W * curScale) / 2;
        const fy = fromN.position.y * curScale + curTY + (NODE_H * curScale) / 2;
        const tx2 = toN.position.x * curScale + curTX + (NODE_W * curScale) / 2;
        const ty2 = toN.position.y * curScale + curTY + (NODE_H * curScale) / 2;
        const pathD = makeBezierPath(fx, fy, tx2, ty2);
        const mid = bezierMidpoint(fx, fy, tx2, ty2);
        const color = s.color ?? C.red;
        const thickness = s.thickness ?? 2;
        const isSelected = selectedStringId === s.id;

        return (
          <React.Fragment key={s.id}>
            {/* Glow layer */}
            <Path
              d={pathD}
              stroke={color}
              strokeWidth={(thickness + 2) * curScale}
              fill="none"
              opacity={0.2}
            />
            {/* Main bezier string */}
            <Path
              d={pathD}
              stroke={color}
              strokeWidth={(isSelected ? thickness + 1.5 : thickness) * curScale}
              fill="none"
              opacity={isSelected ? 1 : 0.85}
              strokeDasharray={
                s.style === 'dashed'
                  ? `${6 * curScale},${4 * curScale}`
                  : s.style === 'dotted'
                  ? `${2 * curScale},${4 * curScale}`
                  : undefined
              }
            />
            {/* Endpoint circles */}
            <SvgCircle cx={fx} cy={fy} r={4 * curScale} fill={color} opacity={0.9} />
            <SvgCircle cx={tx2} cy={ty2} r={4 * curScale} fill={color} opacity={0.9} />
            {/* Label at bezier midpoint */}
            {s.label ? (
              <SvgText
                x={mid.x}
                y={mid.y - 6 * curScale}
                fill={C.text}
                fontSize={10 * curScale}
                textAnchor="middle"
              >
                {s.label}
              </SvgText>
            ) : null}
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

// ---- Trash Zone component ----
function TrashZone({
  visible,
  isActive,
}: {
  visible: Animated.SharedValue<boolean>;
  isActive: Animated.SharedValue<boolean>;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: withTiming(visible.value ? 1 : 0, { duration: 200 }),
    transform: [{ translateY: withTiming(visible.value ? 0 : 80, { duration: 200 }) }],
  }));
  const innerStyle = useAnimatedStyle(() => ({
    backgroundColor: isActive.value ? 'rgba(196,30,58,0.35)' : 'rgba(196,30,58,0.12)',
    borderColor: isActive.value ? '#C41E3A' : 'rgba(196,30,58,0.4)',
    transform: [{ scale: withTiming(isActive.value ? 1.06 : 1, { duration: 150 }) }],
  }));
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          bottom: 100,
          left: 0,
          right: 0,
          alignItems: 'center',
          zIndex: 999,
          pointerEvents: 'none',
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 24,
            paddingVertical: 14,
            borderRadius: 40,
            borderWidth: 1.5,
          },
          innerStyle,
        ]}
      >
        <Trash2 size={18} color="#C41E3A" strokeWidth={2} />
        <Text style={{ color: '#C41E3A', fontSize: 14, fontWeight: '700', letterSpacing: 0.5 }}>
          Drop to delete
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

// ---- Main Canvas Screen ----
export default function InvestigationCanvas() {
  const router = useRouter();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Store selectors
  const activeId = useInvestigationStore((s) => s.activeInvestigationId);
  const selectedNodeId = useInvestigationStore((s) => s.selectedNodeId);
  const connectingFromId = useInvestigationStore((s) => s.connectingFromId);
  const investigations = useInvestigationStore((s) => s.investigations);
  const canvasMode = useInvestigationStore((s) => s.canvasMode);

  const setActiveInvestigation = useInvestigationStore((s) => s.setActiveInvestigation);
  const setSelectedNode = useInvestigationStore((s) => s.setSelectedNode);
  const setConnectingFrom = useInvestigationStore((s) => s.setConnectingFrom);
  const setCanvasMode = useInvestigationStore((s) => s.setCanvasMode);
  const storeAddNode = useInvestigationStore((s) => s.addNode);
  const storeUpdateNode = useInvestigationStore((s) => s.updateNode);
  const storeDeleteNode = useInvestigationStore((s) => s.deleteNode);
  const storeMoveNode = useInvestigationStore((s) => s.moveNode);
  const storeAddString = useInvestigationStore((s) => s.addString);
  const storeUpdateString = useInvestigationStore((s) => s.updateString);
  const storeDeleteString = useInvestigationStore((s) => s.deleteString);
  const storeAddTimeline = useInvestigationStore((s) => s.addTimeline);
  const storeUpdateTimeline = useInvestigationStore((s) => s.updateTimeline);
  const storeDeleteTimeline = useInvestigationStore((s) => s.deleteTimeline);
  const storeToggleTimelineMinimized = useInvestigationStore((s) => s.toggleTimelineMinimized);

  // Subscription store
  const maxNodesPerInvestigation = useSubscriptionStore((s) => s.maxNodesPerInvestigation);
  const tier = useSubscriptionStore((s) => s.tier);
  const maxNodes = maxNodesPerInvestigation();

  // Tour/demo store
  const isDemoMode = useTourStore((s) => s.isDemoMode);

  // Canvas version counter — increments on every pan/zoom to force StringsLayer re-render
  const [canvasVersion, setCanvasVersion] = useState<number>(0);
  const bumpCanvas = useCallback(() => setCanvasVersion((v) => v + 1), []);

  // Automation engine — auto-tags and auto-connects nodes on save
  useAutomationEngine(activeId);

  // Derive active investigation
  const investigation = useMemo(
    () => investigations.find((inv) => inv.id === activeId),
    [investigations, activeId]
  );

  const nodes = investigation?.nodes ?? [];
  const strings = investigation?.strings ?? [];
  const timelines = investigation?.timelines ?? [];

  // Local UI state
  const [connectMode, setConnectMode] = useState<boolean>(false);
  const [showAddMenu, setShowAddMenu] = useState<boolean>(false);
  const [showNodeLimitModal, setShowNodeLimitModal] = useState<boolean>(false);
  const [selectedStringId, setSelectedStringId] = useState<string | null>(null);
  const [showSuggestionSheet, setShowSuggestionSheet] = useState<boolean>(false);
  const [colorToast, setColorToast] = useState<string | null>(null);
  const colorToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Undo state for drag-to-trash
  const [undoNode, setUndoNode] = useState<{ node: CanvasNode; strings: RedString[] } | null>(null);
  const [showUndoToast, setShowUndoToast] = useState<boolean>(false);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Shared values for trash zone
  const nodeIsDragging = useSharedValue(false);
  const nodeIsOverTrash = useSharedValue(false);

  // ---- Screenshot / background protection ----
  const [showPrivacyOverlay, setShowPrivacyOverlay] = useState<boolean>(false);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'inactive' || nextState === 'background') {
        setShowPrivacyOverlay(true);
      } else if (nextState === 'active') {
        // Keep overlay visible for 2 seconds after returning, then fade
        const t = setTimeout(() => setShowPrivacyOverlay(false), 2000);
        return () => clearTimeout(t);
      }
    });
    return () => sub.remove();
  }, []);

  // Cleanup color toast timer
  useEffect(() => {
    return () => {
      if (colorToastTimer.current) clearTimeout(colorToastTimer.current);
    };
  }, []);

  const showColorToastMessage = useCallback((message: string) => {
    setColorToast(message);
    if (colorToastTimer.current) clearTimeout(colorToastTimer.current);
    colorToastTimer.current = setTimeout(() => setColorToast(null), 2000);
  }, []);

  // Bottom sheet
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['45%', '80%'], []);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editContent, setEditContent] = useState<string>('');
  const [editDate, setEditDate] = useState<string>(''); // "YYYY-MM-DD" or free text like "Nov 1963"

  // Canvas shared values
  const tX = useSharedValue(0);
  const tY = useSharedValue(0);
  const scaleVal = useSharedValue(1);
  const savedTX = useSharedValue(0);
  const savedTY = useSharedValue(0);
  const savedScale = useSharedValue(1);

  // Canvas gestures
  const canvasPan = useMemo(
    () =>
      Gesture.Pan()
        .minPointers(2)
        .onStart(() => {
          savedTX.value = tX.value;
          savedTY.value = tY.value;
        })
        .onUpdate((e) => {
          tX.value = savedTX.value + e.translationX;
          tY.value = savedTY.value + e.translationY;
          runOnJS(bumpCanvas)();
        }),
    [tX, tY, savedTX, savedTY, bumpCanvas]
  );

  const canvasPinch = useMemo(
    () =>
      Gesture.Pinch()
        .onStart(() => {
          savedScale.value = scaleVal.value;
        })
        .onUpdate((e) => {
          const next = savedScale.value * e.scale;
          scaleVal.value = Math.min(Math.max(next, 0.3), 3.0);
          runOnJS(bumpCanvas)();
        }),
    [scaleVal, savedScale, bumpCanvas]
  );

  const canvasGesture = useMemo(
    () => Gesture.Simultaneous(canvasPan, canvasPinch),
    [canvasPan, canvasPinch]
  );

  // Node tap handler
  const handleNodeTap = useCallback(
    (nodeId: string) => {
      if (!activeId) return;
      if (connectMode) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Read fresh from store to avoid stale closure
        const freshConnectingFrom = useInvestigationStore.getState().connectingFromId;
        if (!freshConnectingFrom) {
          setConnectingFrom(nodeId);
        } else if (freshConnectingFrom !== nodeId) {
          storeAddString(activeId, freshConnectingFrom, nodeId);
          setConnectingFrom(null);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const nd = nodes.find((n) => n.id === nodeId);
        if (nd) {
          setEditTitle(nd.title);
          setEditContent(nd.content ?? nd.description ?? '');
          // Populate date field from existing timestamp
          if (nd.timestamp) {
            const d = new Date(nd.timestamp);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            setEditDate(`${yyyy}-${mm}-${dd}`);
          } else {
            setEditDate('');
          }
        }
        setSelectedNode(nodeId);
        bottomSheetRef.current?.snapToIndex(0);
      }
    },
    [activeId, connectMode, storeAddString, nodes, setSelectedNode, setConnectingFrom]
  );

  // Node drag handler
  const handleNodeDragEnd = useCallback(
    (nodeId: string, x: number, y: number) => {
      if (!activeId) return;
      storeMoveNode(activeId, nodeId, { x, y });
    },
    [activeId, storeMoveNode]
  );

  // Trash zone threshold — trash zone starts 180px above screen bottom
  const TRASH_ZONE_TOP = screenH - 180;

  const handleNodeDragStart = useCallback((_nodeId: string) => {
    nodeIsDragging.value = true;
  }, [nodeIsDragging]);

  const handleNodeDragMove = useCallback((_nodeId: string, screenY: number) => {
    nodeIsOverTrash.value = screenY > TRASH_ZONE_TOP;
  }, [nodeIsOverTrash, TRASH_ZONE_TOP]);

  const handleNodeDragEndPosition = useCallback((nodeId: string, _screenX: number, screenY: number) => {
    nodeIsDragging.value = false;
    const overTrash = screenY > TRASH_ZONE_TOP;
    nodeIsOverTrash.value = false;
    if (overTrash && activeId) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      const nodeToDelete = nodes.find((n) => n.id === nodeId);
      const stringsToDelete = strings.filter((s) => s.fromNodeId === nodeId || s.toNodeId === nodeId);
      if (nodeToDelete) {
        storeDeleteNode(activeId, nodeId);
        if (undoTimer.current) clearTimeout(undoTimer.current);
        setUndoNode({ node: nodeToDelete, strings: stringsToDelete });
        setShowUndoToast(true);
        undoTimer.current = setTimeout(() => {
          setShowUndoToast(false);
          setUndoNode(null);
        }, 4000);
      }
    }
  }, [activeId, nodes, strings, storeDeleteNode, nodeIsDragging, nodeIsOverTrash, TRASH_ZONE_TOP]);

  const handleUndoDelete = useCallback(() => {
    if (!undoNode || !activeId) return;
    if (undoTimer.current) clearTimeout(undoTimer.current);
    // Restore the node at its original position with all its properties
    storeAddNode(activeId, undoNode.node.type, undoNode.node.title, undoNode.node.position, {
      id: undoNode.node.id,
      content: undoNode.node.content,
      description: undoNode.node.description,
      color: undoNode.node.color,
      tags: undoNode.node.tags,
      size: undoNode.node.size,
      createdAt: undoNode.node.createdAt,
    });
    // Restore connected strings
    undoNode.strings.forEach((s) => {
      storeAddString(activeId, s.fromNodeId, s.toNodeId, s.label, s.color);
    });
    setShowUndoToast(false);
    setUndoNode(null);
  }, [undoNode, activeId, storeAddNode, storeAddString]);

  // Add node
  const handleAddNode = useCallback(
    (type: NodeType) => {
      if (!activeId) return;
      if (nodes.length >= maxNodes) {
        setShowAddMenu(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setShowNodeLimitModal(true);
        return;
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const centerX = (-tX.value + screenW / 2) / scaleVal.value - NODE_W / 2;
      const centerY = (-tY.value + screenH / 2) / scaleVal.value - NODE_H / 2;
      const typeLabels: Record<NodeType, string> = {
        note: 'New Note',
        link: 'New Link',
        image: 'New Image',
        folder: 'New Folder',
        dataset: 'New Dataset',
        investigation: 'Sub-Investigation',
      };
      storeAddNode(activeId, type, typeLabels[type], { x: centerX, y: centerY });
      setShowAddMenu(false);
    },
    [activeId, nodes.length, maxNodes, tX, tY, scaleVal, screenW, screenH, storeAddNode]
  );

  // Toggle connect mode
  const toggleConnectMode = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setConnectMode((prev) => {
      if (prev) setConnectingFrom(null);
      return !prev;
    });
  }, [setConnectingFrom]);

  // Toggle canvas mode
  const toggleCanvasMode = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCanvasMode(canvasMode === 'corkboard' ? 'mindmap' : 'corkboard');
  }, [canvasMode, setCanvasMode]);

  // Save node edits
  const handleSaveNode = useCallback(() => {
    if (!activeId || !selectedNodeId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Parse date string into unix timestamp
    let timestamp: number | undefined = undefined;
    if (editDate.trim()) {
      const parsed = new Date(editDate.trim());
      if (!isNaN(parsed.getTime())) {
        timestamp = parsed.getTime();
      }
    }
    storeUpdateNode(activeId, selectedNodeId, {
      title: editTitle,
      content: editContent,
      description: editContent,
      timestamp,
    });
    bottomSheetRef.current?.close();
    setSelectedNode(null);
  }, [activeId, selectedNodeId, editTitle, editContent, editDate, storeUpdateNode, setSelectedNode]);

  // Delete node
  const handleDeleteNode = useCallback(() => {
    if (!activeId || !selectedNodeId) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    storeDeleteNode(activeId, selectedNodeId);
    bottomSheetRef.current?.close();
    setSelectedNode(null);
  }, [activeId, selectedNodeId, storeDeleteNode, setSelectedNode]);

  // Go back
  const handleGoBack = useCallback(() => {
    setActiveInvestigation(null);
    router.push('/(tabs)');
  }, [setActiveInvestigation, router]);

  // Backdrop
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    []
  );

  // Selected node data
  const selectedNode = useMemo(
    () => (selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : undefined),
    [selectedNodeId, nodes]
  );

  const selectedNodeStrings = useMemo(
    () =>
      selectedNodeId
        ? strings.filter((s) => s.fromNodeId === selectedNodeId || s.toNodeId === selectedNodeId)
        : [],
    [selectedNodeId, strings]
  );

  const isAtNodeLimit = maxNodes !== Infinity && nodes.length >= maxNodes;

  // ---- No active investigation ----
  if (!investigation) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: C.bg }}
        testID="canvas-empty"
      >
        <SafeAreaView className="flex-1 items-center justify-center" edges={['top', 'bottom']}>
          <Search size={48} color={C.muted} strokeWidth={1.5} />
          <Text
            className="text-lg font-semibold"
            style={{ color: C.text, marginTop: 16, marginBottom: 8 }}
          >
            Select an investigation to begin
          </Text>
          <Pressable
            testID="go-back-button"
            onPress={handleGoBack}
            style={({ pressed }) => ({
              backgroundColor: pressed ? '#A3162E' : C.red,
              borderRadius: 10,
              paddingHorizontal: 24,
              paddingVertical: 12,
              marginTop: 8,
            })}
          >
            <Text className="text-base font-bold" style={{ color: '#FFF' }}>
              Go to Investigations
            </Text>
          </Pressable>
        </SafeAreaView>
      </View>
    );
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Tab bar height estimate (88) + safe area bottom
  const tabBarH = 88;
  const bottomOffset = tabBarH;

  return (
    <View className="flex-1" style={{ backgroundColor: C.bg }} testID="canvas-screen">
      {/* Demo Mode Banner */}
      {isDemoMode ? (
        <View
          testID="canvas-demo-banner"
          style={{
            backgroundColor: C.red,
            height: 36,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 }}>
            DEMO MODE — Sample investigation data
          </Text>
        </View>
      ) : null}
      {/* ---- CANVAS AREA ---- */}
      <View style={{ flex: 1, marginBottom: 0 }}>
        {canvasMode === 'corkboard' ? (
          /* ---- CORKBOARD MODE ---- */
          <GestureDetector gesture={canvasGesture}>
            <View style={StyleSheet.absoluteFill}>
              {/* Cork texture dots */}
              <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
                {Array.from({ length: 30 }, (_, r) =>
                  Array.from({ length: 20 }, (_, col) => (
                    <SvgCircle
                      key={`d${r}-${col}`}
                      cx={r * 25 + 12}
                      cy={col * 25 + 12}
                      r={1}
                      fill="#F5ECD7"
                      opacity={0.03}
                    />
                  ))
                )}
              </Svg>

              {/* Bezier string connections */}
              <StringsLayer
                strings={strings}
                nodeMap={nodeMap}
                scaleVal={scaleVal}
                tX={tX}
                tY={tY}
                selectedStringId={selectedStringId}
                canvasVersion={canvasVersion}
              />

              {/* Node cards */}
              {nodes.map((node) => (
                <NodeCard
                  key={node.id}
                  node={node}
                  scaleVal={scaleVal}
                  tX={tX}
                  tY={tY}
                  connectMode={connectMode}
                  connectingFromId={connectingFromId}
                  onTap={handleNodeTap}
                  onDragEnd={handleNodeDragEnd}
                  onDragStart={handleNodeDragStart}
                  onDragMove={handleNodeDragMove}
                  onDragEndPosition={handleNodeDragEndPosition}
                />
              ))}
            </View>
          </GestureDetector>
        ) : (
          /* ---- MIND MAP MODE ---- */
          <MindMapCanvas
            nodes={nodes}
            strings={strings}
            selectedNodeId={selectedNodeId}
            onSelectNode={(id) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              const nd = nodes.find((n) => n.id === id);
              if (nd) {
                setEditTitle(nd.title);
                setEditContent(nd.content ?? nd.description ?? '');
              }
              setSelectedNode(id);
              bottomSheetRef.current?.snapToIndex(0);
            }}
          />
        )}
      </View>

      {/* ---- TRASH ZONE (appears while dragging a node) ---- */}
      <TrashZone visible={nodeIsDragging} isActive={nodeIsOverTrash} />

      {/* ---- UNDO TOAST (after drag-to-trash delete) ---- */}
      {showUndoToast && undoNode ? (
        <Animated.View
          entering={SlideInDown.duration(250)}
          exiting={SlideOutDown.duration(200)}
          style={{
            position: 'absolute',
            bottom: bottomOffset + 16,
            left: 16,
            right: 16,
            backgroundColor: C.surface,
            borderRadius: 14,
            paddingHorizontal: 16,
            paddingVertical: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderWidth: 1,
            borderColor: C.border,
            zIndex: 1000,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 10,
            elevation: 8,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.text, fontSize: 13, fontWeight: '600' }}>
              "{undoNode.node.title}" deleted
            </Text>
            <Text style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>
              Tap Undo to restore
            </Text>
          </View>
          <Pressable
            onPress={handleUndoDelete}
            style={({ pressed }) => ({
              backgroundColor: pressed ? '#A3162E' : C.red,
              borderRadius: 8,
              paddingHorizontal: 14,
              paddingVertical: 8,
              marginLeft: 12,
            })}
          >
            <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>Undo</Text>
          </Pressable>
        </Animated.View>
      ) : null}

      {/* ---- TIMELINE PANEL — sits above tab bar ---- */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: bottomOffset }}>
        <TimelinePanel
          investigationId={activeId ?? ''}
          timelines={timelines}
          nodes={nodes}
          onAddTimeline={(label) => {
            if (activeId) storeAddTimeline(activeId, label);
          }}
          onDeleteTimeline={(timelineId) => {
            if (activeId) storeDeleteTimeline(activeId, timelineId);
          }}
          onToggleMinimized={(timelineId) => {
            if (activeId) storeToggleTimelineMinimized(activeId, timelineId);
          }}
          onUpdateTimeline={(timelineId, updates) => {
            if (activeId) storeUpdateTimeline(activeId, timelineId, updates);
          }}
        />
      </View>

      {/* ---- COLOR LEGEND — left edge, vertically centered ---- */}
      {activeId ? (
        <ColorLegend
          investigationId={activeId}
          onSuggestPress={() => setShowSuggestionSheet(true)}
        />
      ) : null}

      {/* ---- COLOR TOAST ---- */}
      {colorToast ? (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(300)}
          style={{
            position: 'absolute',
            bottom: bottomOffset + 80,
            alignSelf: 'center',
            backgroundColor: 'rgba(26, 22, 20, 0.92)',
            borderRadius: 20,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderWidth: 1,
            borderColor: C.border,
            zIndex: 200,
          }}
          pointerEvents="none"
        >
          <Text style={{ color: C.text, fontSize: 13, fontWeight: '600' }}>
            {colorToast}
          </Text>
        </Animated.View>
      ) : null}

      {/* ---- TOP BAR ---- */}
      <SafeAreaView
        edges={['top']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0 }}
        pointerEvents="box-none"
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
            paddingVertical: 8,
            gap: 8,
          }}
          pointerEvents="box-none"
        >
          {/* Back */}
          <Pressable
            testID="canvas-back-button"
            onPress={handleGoBack}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: pressed ? C.border : C.surface,
              alignItems: 'center',
              justifyContent: 'center',
            })}
          >
            <ArrowLeft size={18} color={C.text} strokeWidth={2} />
          </Pressable>

          {/* Title */}
          <View style={{ flex: 1 }} pointerEvents="none">
            <Text
              className="text-base font-bold"
              style={{ color: C.text }}
              numberOfLines={1}
            >
              {investigation.title}
            </Text>
            {connectMode ? (
              <Text className="text-xs" style={{ color: C.redLight }}>
                {connectingFromId ? 'Tap second node' : 'Tap first node'}
              </Text>
            ) : maxNodes !== Infinity ? (
              <Text
                className="text-xs"
                style={{ color: isAtNodeLimit ? C.red : C.muted }}
              >
                {nodes.length}/{maxNodes} nodes{isAtNodeLimit ? ' — limit reached' : null}
              </Text>
            ) : null}
          </View>

          {/* Canvas mode toggle */}
          <Pressable
            testID="canvas-mode-toggle"
            onPress={toggleCanvasMode}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: pressed ? C.border : C.surface,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: C.border,
            })}
          >
            {canvasMode === 'corkboard' ? (
              <Network size={17} color={C.text} strokeWidth={2} />
            ) : (
              <LayoutGrid size={17} color={C.text} strokeWidth={2} />
            )}
          </Pressable>

          {/* Sources button */}
          <Pressable
            testID="sources-button"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push({ pathname: '/sources-panel', params: { investigationId: investigation.id } });
            }}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: pressed ? C.border : C.surface,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: C.border,
            })}
          >
            <BookOpen size={17} color={C.text} strokeWidth={2} />
          </Pressable>

          {/* Connect toggle (corkboard only) */}
          {canvasMode === 'corkboard' ? (
            <Pressable
              testID="connect-toggle"
              onPress={toggleConnectMode}
              style={({ pressed }) => ({
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: connectMode ? C.red : pressed ? C.border : C.surface,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: connectMode ? 0 : 1,
                borderColor: C.border,
              })}
            >
              <Cable size={18} color={connectMode ? '#FFF' : C.text} strokeWidth={2} />
            </Pressable>
          ) : null}

          {/* Add node */}
          <Pressable
            testID="add-node-button"
            onPress={() => {
              if (isAtNodeLimit) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                setShowNodeLimitModal(true);
                return;
              }
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowAddMenu(true);
            }}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: isAtNodeLimit ? C.border : pressed ? '#A3162E' : C.red,
              alignItems: 'center',
              justifyContent: 'center',
            })}
          >
            {isAtNodeLimit ? (
              <Lock size={16} color={C.muted} strokeWidth={2} />
            ) : (
              <Plus size={18} color="#FFF" strokeWidth={2.5} />
            )}
          </Pressable>
        </View>
      </SafeAreaView>

      {/* ---- ADD NODE MENU ---- */}
      <Modal
        visible={showAddMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddMenu(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.6)',
            justifyContent: 'flex-end',
          }}
          onPress={() => setShowAddMenu(false)}
        >
          <Pressable onPress={() => {}} style={styles.addMenuContainer}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <Text className="text-lg font-bold" style={{ color: C.text }}>
                Add Node
              </Text>
              <Pressable onPress={() => setShowAddMenu(false)}>
                <X size={20} color={C.muted} strokeWidth={2} />
              </Pressable>
            </View>
            {(
              [
                { type: 'note' as const, label: 'Note', Icon: FileText },
                { type: 'link' as const, label: 'Link', Icon: Link2 },
                { type: 'image' as const, label: 'Image', Icon: ImageIcon },
                { type: 'folder' as const, label: 'Folder', Icon: Folder },
                { type: 'dataset' as const, label: 'Dataset', Icon: Database },
              ] as const
            ).map((item) => (
              <Pressable
                key={item.type}
                testID={`add-node-${item.type}`}
                onPress={() => handleAddNode(item.type)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  paddingVertical: 14,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  backgroundColor: pressed ? C.border : 'transparent',
                })}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: C.bg,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <item.Icon size={18} color={C.pin} strokeWidth={2} />
                </View>
                <Text className="text-base font-semibold" style={{ color: C.text }}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ---- NODE LIMIT MODAL ---- */}
      <Modal
        visible={showNodeLimitModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNodeLimitModal(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.75)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
          }}
          onPress={() => setShowNodeLimitModal(false)}
        >
          <Pressable
            onPress={() => {}}
            style={{
              width: '100%',
              maxWidth: 400,
              backgroundColor: C.surface,
              borderRadius: 20,
              padding: 28,
              borderWidth: 1,
              borderColor: C.border,
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
              <Lock size={24} color={C.red} strokeWidth={2} />
            </View>
            <Text
              className="text-xl font-bold"
              style={{ color: C.text, marginBottom: 8, textAlign: 'center' }}
            >
              Node Limit Reached
            </Text>
            <Text
              className="text-sm"
              style={{ color: C.muted, lineHeight: 20, marginBottom: 24, textAlign: 'center' }}
            >
              {tier === 'free'
                ? `Free accounts are limited to ${maxNodes} nodes per investigation. Upgrade to Pro for up to 200, or Plus for unlimited.`
                : `You've reached the ${maxNodes} node limit for your plan. Upgrade to Plus for unlimited nodes.`}
            </Text>
            <Pressable
              testID="upgrade-from-node-limit-button"
              onPress={() => {
                setShowNodeLimitModal(false);
                router.push('/paywall');
              }}
              style={({ pressed }) => ({
                width: '100%',
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: 'center',
                backgroundColor: pressed ? '#A3162E' : C.red,
                marginBottom: 12,
                shadowColor: C.red,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
              })}
            >
              <Text className="text-base font-bold" style={{ color: '#FFF' }}>
                Upgrade Now
              </Text>
            </Pressable>
            <Pressable
              testID="dismiss-node-limit-button"
              onPress={() => setShowNodeLimitModal(false)}
              style={({ pressed }) => ({
                paddingVertical: 10,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text style={{ color: C.muted, fontSize: 14 }}>Not now</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ---- BOTTOM SHEET (Node Detail) ---- */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: C.surface }}
        handleIndicatorStyle={{ backgroundColor: C.muted }}
        backdropComponent={renderBackdrop}
        onChange={(index: number) => {
          if (index === -1) {
            setSelectedNode(null);
          }
        }}
      >
        <BottomSheetScrollView
          style={{ paddingHorizontal: 20 }}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {selectedNode ? (
            <>
              {/* Type badge */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <View
                  style={{
                    backgroundColor: C.bg,
                    borderRadius: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  {React.createElement(NODE_ICONS[selectedNode.type] ?? FileText, {
                    size: 12,
                    color: C.pin,
                    strokeWidth: 2,
                  })}
                  <Text
                    style={{
                      color: C.pin,
                      fontSize: 11,
                      fontWeight: '700',
                      textTransform: 'uppercase',
                    }}
                  >
                    {selectedNode.type}
                  </Text>
                </View>
              </View>

              {/* Title input */}
              <Text
                className="text-xs font-semibold"
                style={{ color: C.muted, marginBottom: 6, letterSpacing: 1 }}
              >
                TITLE
              </Text>
              <BottomSheetTextInput
                testID="node-title-input"
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="Node title"
                placeholderTextColor={C.muted}
                style={styles.sheetInput}
              />

              {/* Content input */}
              <Text
                className="text-xs font-semibold"
                style={{ color: C.muted, marginBottom: 6, marginTop: 16, letterSpacing: 1 }}
              >
                CONTENT
              </Text>
              <BottomSheetTextInput
                testID="node-content-input"
                value={editContent}
                onChangeText={setEditContent}
                placeholder="Notes, links, details..."
                placeholderTextColor={C.muted}
                multiline
                style={[styles.sheetInput, { minHeight: 100, textAlignVertical: 'top' }]}
              />

              {/* Date field */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 6, gap: 6 }}>
                <Calendar size={12} color={C.muted} strokeWidth={2} />
                <Text
                  className="text-xs font-semibold"
                  style={{ color: C.muted, letterSpacing: 1 }}
                >
                  DATE (for timeline)
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <BottomSheetTextInput
                  value={editDate}
                  onChangeText={setEditDate}
                  placeholder="e.g. 1963-11-22 or Nov 1963"
                  placeholderTextColor={C.muted}
                  style={[styles.sheetInput, { flex: 1 }]}
                />
                {editDate.trim() ? (
                  <Pressable
                    onPress={() => setEditDate('')}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: C.border,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <X size={13} color={C.muted} strokeWidth={2} />
                  </Pressable>
                ) : null}
              </View>

              {/* Tags */}
              {selectedNode.tags.length > 0 ? (
                <>
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: C.muted, marginTop: 16, marginBottom: 8, letterSpacing: 1 }}
                  >
                    TAGS
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {selectedNode.tags.map((tag) => (
                      <View
                        key={tag.id}
                        style={{
                          backgroundColor: TAG_COLORS[tag.color] + '22',
                          borderRadius: 6,
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                        }}
                      >
                        <Text
                          style={{
                            color: TAG_COLORS[tag.color],
                            fontSize: 12,
                            fontWeight: '600',
                          }}
                        >
                          {tag.label}
                        </Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : null}

              {/* ---- COLOR CODE section ---- */}
              <Text
                className="text-xs font-semibold"
                style={{ color: C.muted, marginTop: 16, marginBottom: 10, letterSpacing: 1 }}
              >
                COLOR CODE
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                {(Object.entries(TAG_COLORS) as Array<[TagColor, string]>).map(([colorKey, hex]) => {
                  const isAssigned = selectedNode.color === colorKey;
                  // Find legend label for this color
                  const legendEntry = investigation.colorLegend?.find((e) => e.color === hex);
                  return (
                    <Pressable
                      key={colorKey}
                      testID={`color-swatch-${colorKey}`}
                      onPress={() => {
                        if (!activeId || !selectedNodeId) return;
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        const newColor: TagColor | undefined = isAssigned ? undefined : colorKey;
                        storeUpdateNode(activeId, selectedNodeId, { color: newColor });
                        if (!isAssigned && legendEntry) {
                          showColorToastMessage(`Tagged as ${legendEntry.label}`);
                        }
                      }}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: hex,
                        borderWidth: isAssigned ? 3 : 1.5,
                        borderColor: isAssigned ? '#FFFFFF' : 'transparent',
                        shadowColor: isAssigned ? hex : 'transparent',
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: isAssigned ? 0.9 : 0,
                        shadowRadius: isAssigned ? 8 : 0,
                        elevation: isAssigned ? 4 : 0,
                      }}
                    />
                  );
                })}
              </View>
              {/* Legend label hint */}
              {selectedNode.color ? (
                <Text style={{ color: C.muted, fontSize: 12, marginTop: 6 }}>
                  {(() => {
                    const hex = TAG_COLORS[selectedNode.color];
                    const legendEntry = investigation.colorLegend?.find((e) => e.color === hex);
                    return legendEntry ? `${legendEntry.label}` : selectedNode.color;
                  })()}
                </Text>
              ) : null}

              {/* Connected strings with color pickers */}
              {selectedNodeStrings.length > 0 ? (
                <>
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: C.muted, marginTop: 16, marginBottom: 8, letterSpacing: 1 }}
                  >
                    CONNECTIONS ({selectedNodeStrings.length})
                  </Text>
                  {selectedNodeStrings.map((s) => {
                    const otherId =
                      s.fromNodeId === selectedNodeId ? s.toNodeId : s.fromNodeId;
                    const otherNode = nodes.find((n) => n.id === otherId);
                    return (
                      <View key={s.id} style={{ marginBottom: 12 }}>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingVertical: 8,
                            borderBottomWidth: 1,
                            borderBottomColor: C.border,
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <Text className="text-sm font-medium" style={{ color: C.text }}>
                              {otherNode?.title ?? 'Unknown'}
                            </Text>
                            {s.label ? (
                              <Text className="text-xs" style={{ color: s.color ?? C.red }}>
                                {s.label}
                              </Text>
                            ) : null}
                          </View>
                          <Pressable
                            onPress={() => {
                              if (activeId) {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                storeDeleteString(activeId, s.id);
                              }
                            }}
                          >
                            <X size={16} color={C.muted} strokeWidth={2} />
                          </Pressable>
                        </View>
                        {/* String color picker */}
                        <View
                          style={{
                            flexDirection: 'row',
                            gap: 6,
                            paddingVertical: 8,
                            flexWrap: 'wrap',
                          }}
                        >
                          {STRING_COLORS.map((col) => (
                            <Pressable
                              key={col}
                              onPress={() => {
                                if (activeId) {
                                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                  storeUpdateString(activeId, s.id, { color: col });
                                }
                              }}
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: 11,
                                backgroundColor: col,
                                borderWidth: s.color === col ? 3 : 1,
                                borderColor: s.color === col ? '#FFFFFF' : 'transparent',
                              }}
                            />
                          ))}
                        </View>
                      </View>
                    );
                  })}
                </>
              ) : null}

              {/* Actions */}
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
                <Pressable
                  testID="delete-node-button"
                  onPress={handleDeleteNode}
                  style={({ pressed }) => ({
                    flex: 1,
                    paddingVertical: 14,
                    borderRadius: 10,
                    alignItems: 'center',
                    backgroundColor: pressed ? '#3D1520' : 'rgba(196,30,58,0.12)',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: 6,
                  })}
                >
                  <Trash2 size={16} color={C.red} strokeWidth={2} />
                  <Text className="text-sm font-bold" style={{ color: C.red }}>
                    Delete
                  </Text>
                </Pressable>
                <Pressable
                  testID="save-node-button"
                  onPress={handleSaveNode}
                  style={({ pressed }) => ({
                    flex: 2,
                    paddingVertical: 14,
                    borderRadius: 10,
                    alignItems: 'center',
                    backgroundColor: pressed ? '#A3162E' : C.red,
                  })}
                >
                  <Text className="text-sm font-bold" style={{ color: '#FFF' }}>
                    Save Changes
                  </Text>
                </Pressable>
              </View>
            </>
          ) : null}
        </BottomSheetScrollView>
      </BottomSheet>

      {/* ---- COLOR SUGGESTION SHEET ---- */}
      {activeId ? (
        <ColorSuggestionSheet
          investigationId={activeId}
          isVisible={showSuggestionSheet}
          onClose={() => setShowSuggestionSheet(false)}
        />
      ) : null}

      {/* ---- PRIVACY OVERLAY (screenshot / background protection) ---- */}
      {showPrivacyOverlay ? (
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(400)}
          style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: C.bg,
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: C.surface,
              borderWidth: 1,
              borderColor: C.border,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
              shadowColor: C.red,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.25,
              shadowRadius: 16,
              elevation: 12,
            }}
          >
            <Svg width={40} height={40} viewBox="0 0 64 64">
              <SvgCircle cx={32} cy={14} r={4} fill={C.red} opacity={0.9} />
              <SvgCircle cx={50} cy={44} r={4} fill={C.red} opacity={0.9} />
              <SvgCircle cx={14} cy={44} r={4} fill={C.red} opacity={0.9} />
              <Path d="M32 14 L50 44" stroke={C.red} strokeWidth={1.5} fill="none" opacity={0.7} />
              <Path d="M50 44 L14 44" stroke={C.red} strokeWidth={1.5} fill="none" opacity={0.7} />
              <Path d="M14 44 L32 14" stroke={C.red} strokeWidth={1.5} fill="none" opacity={0.7} />
            </Svg>
          </View>
          <Text
            style={{
              fontSize: 20,
              fontWeight: '900',
              color: C.red,
              letterSpacing: 3,
              marginBottom: 4,
            }}
          >
            RED STRING
          </Text>
          <Text
            style={{
              fontSize: 11,
              fontWeight: '700',
              color: C.pin,
              letterSpacing: 5,
            }}
          >
            RESEARCH
          </Text>
        </Animated.View>
      ) : null}

      {/* Tour Overlay */}
      <TourOverlay />
    </View>
  );
}

const styles = StyleSheet.create({
  nodeCard: {
    backgroundColor: C.card,
    borderRadius: 8,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
    minHeight: 60,
  },
  pushpin: {
    position: 'absolute',
    top: -5,
    left: 14,
    width: 10,
    height: 10,
    borderRadius: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
    zIndex: 2,
  },
  addMenuContainer: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: C.border,
    borderBottomWidth: 0,
  },
  sheetInput: {
    backgroundColor: C.bg,
    borderRadius: 10,
    padding: 14,
    color: C.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
});
