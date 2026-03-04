import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  useWindowDimensions,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Line, Circle as SvgCircle, Text as SvgText } from 'react-native-svg';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
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
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import useInvestigationStore from '@/lib/state/investigation-store';
import useSubscriptionStore from '@/lib/state/subscription-store';
import type { CanvasNode, NodeType, TagColor } from '@/lib/types';

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

type IconComponent = React.ComponentType<{ size: number; color: string; strokeWidth: number }>;

const NODE_ICONS: Record<NodeType, IconComponent> = {
  note: FileText,
  link: Link2,
  image: ImageIcon,
  folder: Folder,
  dataset: Database,
  investigation: Search,
};

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
}: {
  node: CanvasNode;
  scaleVal: Animated.SharedValue<number>;
  tX: Animated.SharedValue<number>;
  tY: Animated.SharedValue<number>;
  connectMode: boolean;
  connectingFromId: string | null;
  onTap: (id: string) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
}) {
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const isDragging = useSharedValue(false);

  const panGesture = useMemo(() => {
    return Gesture.Pan()
      .enabled(!connectMode)
      .onStart(() => {
        isDragging.value = true;
      })
      .onUpdate((e) => {
        offsetX.value = e.translationX / scaleVal.value;
        offsetY.value = e.translationY / scaleVal.value;
      })
      .onEnd(() => {
        isDragging.value = false;
        const finalX = node.position.x + offsetX.value;
        const finalY = node.position.y + offsetY.value;
        offsetX.value = 0;
        offsetY.value = 0;
        runOnJS(onDragEnd)(node.id, finalX, finalY);
      });
  }, [connectMode, node.id, node.position.x, node.position.y, scaleVal, onDragEnd, offsetX, offsetY, isDragging]);

  const tapGesture = useMemo(() => {
    return Gesture.Tap().onEnd(() => {
      runOnJS(onTap)(node.id);
    });
  }, [node.id, onTap]);

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
          {/* Pushpin dot */}
          <View style={[styles.pushpin, { backgroundColor: pinColor }]} />
          {/* Icon + title row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <Icon size={14} color={C.muted} strokeWidth={2} />
            <Text
              className="text-xs font-bold"
              style={{ color: C.cardText, flex: 1 }}
              numberOfLines={2}
            >
              {node.title}
            </Text>
          </View>
          {/* Tags */}
          {node.tags.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
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

// ---- Main Canvas Screen ----
export default function InvestigationCanvas() {
  const router = useRouter();
  const { width: screenW, height: screenH } = useWindowDimensions();

  // Store selectors (primitives / functions only)
  const activeId = useInvestigationStore((s) => s.activeInvestigationId);
  const selectedNodeId = useInvestigationStore((s) => s.selectedNodeId);
  const connectingFromId = useInvestigationStore((s) => s.connectingFromId);
  const investigations = useInvestigationStore((s) => s.investigations);

  const setActiveInvestigation = useInvestigationStore((s) => s.setActiveInvestigation);
  const setSelectedNode = useInvestigationStore((s) => s.setSelectedNode);
  const setConnectingFrom = useInvestigationStore((s) => s.setConnectingFrom);
  const storeAddNode = useInvestigationStore((s) => s.addNode);
  const storeUpdateNode = useInvestigationStore((s) => s.updateNode);
  const storeDeleteNode = useInvestigationStore((s) => s.deleteNode);
  const storeMoveNode = useInvestigationStore((s) => s.moveNode);
  const storeAddString = useInvestigationStore((s) => s.addString);
  const storeDeleteString = useInvestigationStore((s) => s.deleteString);

  // Derive active investigation
  const investigation = useMemo(
    () => investigations.find((inv) => inv.id === activeId),
    [investigations, activeId]
  );

  const nodes = investigation?.nodes ?? [];
  const strings = investigation?.strings ?? [];

  // Local UI state
  const [connectMode, setConnectMode] = useState<boolean>(false);
  const [showAddMenu, setShowAddMenu] = useState<boolean>(false);

  // Bottom sheet
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['45%', '80%'], []);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editContent, setEditContent] = useState<string>('');

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
        }),
    [tX, tY, savedTX, savedTY]
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
        }),
    [scaleVal, savedScale]
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
        if (!connectingFromId) {
          setConnectingFrom(nodeId);
        } else if (connectingFromId !== nodeId) {
          storeAddString(activeId, connectingFromId, nodeId);
          setConnectingFrom(null);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const nd = nodes.find((n) => n.id === nodeId);
        if (nd) {
          setEditTitle(nd.title);
          setEditContent(nd.content ?? nd.description ?? '');
        }
        setSelectedNode(nodeId);
        bottomSheetRef.current?.snapToIndex(0);
      }
    },
    [activeId, connectMode, connectingFromId, setConnectingFrom, storeAddString, nodes, setSelectedNode]
  );

  // Node drag handler
  const handleNodeDragEnd = useCallback(
    (nodeId: string, x: number, y: number) => {
      if (!activeId) return;
      storeMoveNode(activeId, nodeId, { x, y });
    },
    [activeId, storeMoveNode]
  );

  // Add node
  const handleAddNode = useCallback(
    (type: NodeType) => {
      if (!activeId) return;
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
    [activeId, tX, tY, scaleVal, screenW, screenH, storeAddNode]
  );

  // Toggle connect mode
  const toggleConnectMode = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setConnectMode((prev) => {
      if (prev) setConnectingFrom(null);
      return !prev;
    });
  }, [setConnectingFrom]);

  // Save node edits
  const handleSaveNode = useCallback(() => {
    if (!activeId || !selectedNodeId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    storeUpdateNode(activeId, selectedNodeId, {
      title: editTitle,
      content: editContent,
      description: editContent,
    });
    bottomSheetRef.current?.close();
    setSelectedNode(null);
  }, [activeId, selectedNodeId, editTitle, editContent, storeUpdateNode, setSelectedNode]);

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

  // ---- Backdrop ----
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

  // ---- No active investigation ----
  if (!investigation) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: C.bg }} testID="canvas-empty">
        <SafeAreaView className="flex-1 items-center justify-center" edges={['top', 'bottom']}>
          <Search size={48} color={C.muted} strokeWidth={1.5} />
          <Text className="text-lg font-semibold" style={{ color: C.text, marginTop: 16, marginBottom: 8 }}>
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

  // ---- Node lookup map ----
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  return (
    <View className="flex-1" style={{ backgroundColor: C.bg }} testID="canvas-screen">
      {/* ---- CANVAS ---- */}
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

          {/* SVG string connections */}
          <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
            {strings.map((s) => {
              const fromN = nodeMap.get(s.fromNodeId);
              const toN = nodeMap.get(s.toNodeId);
              if (!fromN || !toN) return null;
              const curScale = scaleVal.value;
              const curTX = tX.value;
              const curTY = tY.value;
              const fx = fromN.position.x * curScale + curTX + (NODE_W * curScale) / 2;
              const fy = fromN.position.y * curScale + curTY + (NODE_H * curScale) / 2;
              const toX = toN.position.x * curScale + curTX + (NODE_W * curScale) / 2;
              const toY = toN.position.y * curScale + curTY + (NODE_H * curScale) / 2;
              const mx = (fx + toX) / 2;
              const my = (fy + toY) / 2;
              return (
                <React.Fragment key={s.id}>
                  <Line
                    x1={fx}
                    y1={fy}
                    x2={toX}
                    y2={toY}
                    stroke={s.color ?? C.red}
                    strokeWidth={2}
                    opacity={0.85}
                  />
                  <SvgCircle cx={fx} cy={fy} r={4} fill={C.red} />
                  <SvgCircle cx={toX} cy={toY} r={4} fill={C.red} />
                  {s.label ? (
                    <SvgText
                      x={mx}
                      y={my - 6}
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
            />
          ))}
        </View>
      </GestureDetector>

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
            ) : null}
          </View>

          {/* Connect toggle */}
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

          {/* Add node */}
          <Pressable
            testID="add-node-button"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowAddMenu(true);
            }}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: pressed ? '#A3162E' : C.red,
              alignItems: 'center',
              justifyContent: 'center',
            })}
          >
            <Plus size={18} color="#FFF" strokeWidth={2.5} />
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
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text className="text-lg font-bold" style={{ color: C.text }}>
                Add Node
              </Text>
              <Pressable onPress={() => setShowAddMenu(false)}>
                <X size={20} color={C.muted} strokeWidth={2} />
              </Pressable>
            </View>
            {([
              { type: 'note' as const, label: 'Note', Icon: FileText },
              { type: 'link' as const, label: 'Link', Icon: Link2 },
              { type: 'image' as const, label: 'Image', Icon: ImageIcon },
              { type: 'folder' as const, label: 'Folder', Icon: Folder },
              { type: 'dataset' as const, label: 'Dataset', Icon: Database },
            ]).map((item) => (
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
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
                  <Text style={{ color: C.pin, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>
                    {selectedNode.type}
                  </Text>
                </View>
              </View>

              {/* Title input */}
              <Text className="text-xs font-semibold" style={{ color: C.muted, marginBottom: 6, letterSpacing: 1 }}>
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
              <Text className="text-xs font-semibold" style={{ color: C.muted, marginBottom: 6, marginTop: 16, letterSpacing: 1 }}>
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

              {/* Tags */}
              {selectedNode.tags.length > 0 ? (
                <>
                  <Text className="text-xs font-semibold" style={{ color: C.muted, marginTop: 16, marginBottom: 8, letterSpacing: 1 }}>
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
                        <Text style={{ color: TAG_COLORS[tag.color], fontSize: 12, fontWeight: '600' }}>
                          {tag.label}
                        </Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : null}

              {/* Connected strings */}
              {selectedNodeStrings.length > 0 ? (
                <>
                  <Text className="text-xs font-semibold" style={{ color: C.muted, marginTop: 16, marginBottom: 8, letterSpacing: 1 }}>
                    CONNECTIONS ({selectedNodeStrings.length})
                  </Text>
                  {selectedNodeStrings.map((s) => {
                    const otherId = s.fromNodeId === selectedNodeId ? s.toNodeId : s.fromNodeId;
                    const otherNode = nodes.find((n) => n.id === otherId);
                    return (
                      <View
                        key={s.id}
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
                            <Text className="text-xs" style={{ color: C.red }}>
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
