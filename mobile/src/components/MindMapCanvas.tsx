import React, { useMemo, useCallback } from 'react';
import { View, Text, Pressable, useWindowDimensions, StyleSheet } from 'react-native';
import Svg, {
  Path,
  Circle as SvgCircle,
  Text as SvgText,
} from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { CanvasNode, RedString, TagColor } from '@/lib/types';

const C = {
  bg: '#0D0F14',
  text: '#E8DCC8',
  muted: '#6B5B4F',
  border: '#2A2D38',
  red: '#C41E3A',
  pin: '#D4A574',
} as const;

const TAG_COLORS: Record<TagColor, string> = {
  red: '#C41E3A',
  blue: '#3B82F6',
  green: '#22C55E',
  amber: '#F59E0B',
  purple: '#A855F7',
  teal: '#14B8A6',
};

interface NodeLayout {
  nodeId: string;
  x: number;
  y: number;
  radius: number;
  color: string;
}

function computeMindMapLayout(
  nodes: CanvasNode[],
  strings: RedString[],
  centerX: number,
  centerY: number,
  selectedNodeId: string | null
): NodeLayout[] {
  if (nodes.length === 0) return [];

  // Build adjacency count
  const connectionCount: Record<string, number> = {};
  nodes.forEach((n) => { connectionCount[n.id] = 0; });
  strings.forEach((s) => {
    if (connectionCount[s.fromNodeId] != null) connectionCount[s.fromNodeId]++;
    if (connectionCount[s.toNodeId] != null) connectionCount[s.toNodeId]++;
  });

  // Pick center node: selectedNode, or most connected, or first
  let centerId = selectedNodeId && nodes.find((n) => n.id === selectedNodeId)
    ? selectedNodeId
    : nodes.reduce((best, n) =>
        (connectionCount[n.id] ?? 0) > (connectionCount[best] ?? 0) ? n.id : best,
        nodes[0]?.id ?? ''
      );

  if (!centerId) centerId = nodes[0]?.id ?? '';

  const layouts: NodeLayout[] = [];
  const placed = new Set<string>();

  // BFS outward from center
  const rings: string[][] = [[centerId]];
  placed.add(centerId);

  // Build adjacency map
  const adj: Record<string, string[]> = {};
  nodes.forEach((n) => { adj[n.id] = []; });
  strings.forEach((s) => {
    adj[s.fromNodeId]?.push(s.toNodeId);
    adj[s.toNodeId]?.push(s.fromNodeId);
  });

  let remaining = nodes.filter((n) => n.id !== centerId).map((n) => n.id);
  while (remaining.length > 0) {
    const lastRing = rings[rings.length - 1];
    const nextRing: string[] = [];
    lastRing.forEach((id) => {
      (adj[id] ?? []).forEach((neighborId) => {
        if (!placed.has(neighborId)) {
          placed.add(neighborId);
          nextRing.push(neighborId);
          remaining = remaining.filter((r) => r !== neighborId);
        }
      });
    });
    if (nextRing.length === 0) {
      // Disconnected nodes: place them in a ring
      const batch = remaining.slice(0, Math.max(remaining.length, 1));
      batch.forEach((id) => {
        placed.add(id);
        nextRing.push(id);
      });
      remaining = [];
    }
    if (nextRing.length > 0) rings.push(nextRing);
  }

  // Layout rings
  rings.forEach((ring, ringIdx) => {
    if (ringIdx === 0) {
      const node = nodes.find((n) => n.id === ring[0]);
      const conns = connectionCount[ring[0]] ?? 0;
      const radius = 32 + Math.min(conns * 4, 20);
      const color = node?.color ? TAG_COLORS[node.color] : C.red;
      layouts.push({ nodeId: ring[0], x: centerX, y: centerY, radius, color });
      return;
    }
    const ringRadius = ringIdx * 130;
    ring.forEach((nodeId, i) => {
      const angle = (i / ring.length) * Math.PI * 2 - Math.PI / 2;
      const x = centerX + Math.cos(angle) * ringRadius;
      const y = centerY + Math.sin(angle) * ringRadius;
      const node = nodes.find((n) => n.id === nodeId);
      const conns = connectionCount[nodeId] ?? 0;
      const radius = 22 + Math.min(conns * 3, 16);
      const color = node?.color ? TAG_COLORS[node.color] : '#3B82F6';
      layouts.push({ nodeId, x, y, radius, color });
    });
  });

  return layouts;
}

// Bezier path between two circles
function bezierPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const cp1x = x1 + dx * 0.4;
  const cp1y = y1;
  const cp2x = x2 - dx * 0.4;
  const cp2y = y2;
  return `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
}

// ---- Mind map bubble node ----
interface BubbleNodeProps {
  layout: NodeLayout;
  node: CanvasNode;
  isSelected: boolean;
  isCenter: boolean;
  onTap: (id: string) => void;
}

function BubbleNode({ layout, node, isSelected, isCenter, onTap }: BubbleNodeProps) {
  const scale = useSharedValue(1);

  const tapGesture = useMemo(
    () =>
      Gesture.Tap().onEnd(() => {
        scale.value = withSpring(0.9, { duration: 80 }, () => {
          scale.value = withSpring(1, { duration: 150 });
        });
        runOnJS(onTap)(node.id);
      }),
    [node.id, onTap, scale]
  );

  const animStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: layout.x - layout.radius,
    top: layout.y - layout.radius,
    width: layout.radius * 2,
    height: layout.radius * 2,
    transform: [{ scale: scale.value }],
  }));

  const borderColor = isSelected ? '#FFFFFF' : isCenter ? layout.color : layout.color + '88';
  const bgColor = isCenter
    ? layout.color + 'CC'
    : isSelected
    ? layout.color + 'AA'
    : layout.color + '33';

  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View style={animStyle}>
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: layout.radius,
              backgroundColor: bgColor,
              borderWidth: isSelected || isCenter ? 2 : 1,
              borderColor,
              alignItems: 'center',
              justifyContent: 'center',
              padding: 4,
            },
          ]}
        >
          <Text
            style={{
              color: isCenter ? '#FFFFFF' : C.text,
              fontSize: Math.max(8, Math.min(11, layout.radius * 0.3)),
              fontWeight: isCenter ? '700' : '600',
              textAlign: 'center',
            }}
            numberOfLines={2}
          >
            {node.title}
          </Text>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

// ---- MindMapCanvas ----
interface MindMapCanvasProps {
  nodes: CanvasNode[];
  strings: RedString[];
  selectedNodeId: string | null;
  onSelectNode: (id: string) => void;
}

export default function MindMapCanvas({
  nodes,
  strings,
  selectedNodeId,
  onSelectNode,
}: MindMapCanvasProps) {
  const { width: screenW, height: screenH } = useWindowDimensions();

  const tX = useSharedValue(0);
  const tY = useSharedValue(0);
  const savedTX = useSharedValue(0);
  const savedTY = useSharedValue(0);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .minPointers(1)
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

  const centerX = screenW / 2;
  const centerY = (screenH - 200) / 2;

  const layouts = useMemo(
    () => computeMindMapLayout(nodes, strings, centerX, centerY, selectedNodeId),
    [nodes, strings, centerX, centerY, selectedNodeId]
  );

  const layoutMap = useMemo(() => {
    const m: Record<string, NodeLayout> = {};
    layouts.forEach((l) => { m[l.nodeId] = l; });
    return m;
  }, [layouts]);

  const containerStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: tX.value,
    top: tY.value,
    width: screenW,
    height: screenH,
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        {/* Subtle dot grid */}
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          {Array.from({ length: 20 }, (_, r) =>
            Array.from({ length: 30 }, (_, c) => (
              <SvgCircle
                key={`d${r}-${c}`}
                cx={r * 40}
                cy={c * 40}
                r={1}
                fill="#E8DCC8"
                opacity={0.04}
              />
            ))
          )}
        </Svg>

        <Animated.View style={containerStyle}>
          {/* SVG bezier strings */}
          <Svg
            style={{ position: 'absolute', left: 0, top: 0, width: screenW * 4, height: screenH * 4 }}
            pointerEvents="none"
          >
{strings.map((s) => {
              const fromL = layoutMap[s.fromNodeId];
              const toL = layoutMap[s.toNodeId];
              if (!fromL || !toL) return null;
              const path = bezierPath(fromL.x, fromL.y, toL.x, toL.y);
              const color = s.color ?? C.red;
              // Midpoint for label
              const mx = (fromL.x + toL.x) / 2;
              const my = (fromL.y + toL.y) / 2;
              return (
                <React.Fragment key={s.id}>
                  {/* Glow layer */}
                  <Path
                    d={path}
                    stroke={color}
                    strokeWidth={4}
                    fill="none"
                    opacity={0.15}
                  />
                  {/* Main line */}
                  <Path
                    d={path}
                    stroke={color}
                    strokeWidth={1.5}
                    fill="none"
                    opacity={0.7}
                  />
                  {/* Endpoint dots */}
                  <SvgCircle cx={fromL.x} cy={fromL.y} r={3} fill={color} opacity={0.8} />
                  <SvgCircle cx={toL.x} cy={toL.y} r={3} fill={color} opacity={0.8} />
                  {s.label ? (
                    <SvgText
                      x={mx}
                      y={my - 6}
                      fill={C.text}
                      fontSize={10}
                      textAnchor="middle"
                      opacity={0.8}
                    >
                      {s.label}
                    </SvgText>
                  ) : null}
                </React.Fragment>
              );
            })}
          </Svg>

          {/* Bubble nodes */}
          {layouts.map((layout, idx) => {
            const node = nodes.find((n) => n.id === layout.nodeId);
            if (!node) return null;
            const isCenter = idx === 0;
            return (
              <BubbleNode
                key={layout.nodeId}
                layout={layout}
                node={node}
                isSelected={selectedNodeId === layout.nodeId}
                isCenter={isCenter}
                onTap={onSelectNode}
              />
            );
          })}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}
