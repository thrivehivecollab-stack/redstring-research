import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  withSequence,
  withTiming,
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { Sparkles, Check, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import useInvestigationStore from '@/lib/state/investigation-store';
import { generateColorSuggestions } from '@/lib/colorSuggestions';
import type { ColorSuggestion } from '@/lib/colorSuggestions';
import type { TagColor } from '@/lib/types';

const C = {
  bg: '#1A1614',
  surface: '#231F1C',
  card: '#2C2420',
  red: '#C41E3A',
  pin: '#D4A574',
  text: '#E8DCC8',
  muted: '#6B5B4F',
  border: '#3D332C',
} as const;

const TAG_COLORS: Record<TagColor, string> = {
  red: '#C41E3A',
  blue: '#3B82F6',
  green: '#22C55E',
  amber: '#F59E0B',
  purple: '#A855F7',
  teal: '#14B8A6',
};

interface ColorSuggestionSheetProps {
  investigationId: string;
  isVisible: boolean;
  onClose: () => void;
}

// Individual pulsing node highlight
function PulseNode({ color }: { color: string }) {
  const opacity = useSharedValue(0.4);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  React.useEffect(() => {
    opacity.value = withSequence(
      withTiming(1, { duration: 300 }),
      withTiming(0.4, { duration: 300 })
    );
  }, [color, opacity]);
  return (
    <Animated.View
      style={[
        {
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: color,
          marginRight: 2,
        },
        style,
      ]}
    />
  );
}

// A card for a single suggestion
function SuggestionCard({
  suggestion,
  nodeNames,
  isSelected,
  onToggle,
}: {
  suggestion: ColorSuggestion;
  nodeNames: string[];
  isSelected: boolean;
  onToggle: () => void;
}) {
  const previewNames = nodeNames.slice(0, 3);
  const extraCount = nodeNames.length - previewNames.length;

  return (
    <Pressable
      onPress={onToggle}
      testID={`suggestion-card-${suggestion.colorKey}`}
      style={({ pressed }) => ({
        backgroundColor: pressed
          ? C.surface
          : isSelected
          ? suggestion.color + '18'
          : C.card,
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1.5,
        borderColor: isSelected ? suggestion.color + '80' : C.border,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
      })}
    >
      {/* Color swatch */}
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: suggestion.color,
          shadowColor: suggestion.color,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.6,
          shadowRadius: 8,
          elevation: 4,
          flexShrink: 0,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isSelected ? <Check size={18} color="#FFF" strokeWidth={3} /> : null}
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.text, fontSize: 15, fontWeight: '700', marginBottom: 2 }}>
          {suggestion.label}
        </Text>
        <Text style={{ color: C.muted, fontSize: 12, marginBottom: 8 }}>
          {suggestion.reason}
        </Text>

        {/* Node chips */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
          {previewNames.map((name, i) => (
            <View
              key={i}
              style={{
                backgroundColor: suggestion.color + '22',
                borderRadius: 4,
                paddingHorizontal: 6,
                paddingVertical: 2,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 3,
              }}
            >
              {isSelected ? <PulseNode color={suggestion.color} /> : null}
              <Text
                style={{
                  color: suggestion.color,
                  fontSize: 10,
                  fontWeight: '600',
                }}
                numberOfLines={1}
              >
                {name.length > 18 ? name.slice(0, 18) + '...' : name}
              </Text>
            </View>
          ))}
          {extraCount > 0 ? (
            <View
              style={{
                backgroundColor: C.border,
                borderRadius: 4,
                paddingHorizontal: 6,
                paddingVertical: 2,
              }}
            >
              <Text style={{ color: C.muted, fontSize: 10, fontWeight: '600' }}>
                +{extraCount} more
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

export default function ColorSuggestionSheet({
  investigationId,
  isVisible,
  onClose,
}: ColorSuggestionSheetProps) {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['60%', '90%'], []);

  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  const investigations = useInvestigationStore((s) => s.investigations);
  const updateNode = useInvestigationStore((s) => s.updateNode);
  const updateString = useInvestigationStore((s) => s.updateString);
  const updateColorLegend = useInvestigationStore((s) => s.updateColorLegend);

  const investigation = investigations.find((inv) => inv.id === investigationId);

  const suggestions = useMemo<ColorSuggestion[]>(() => {
    if (!investigation) return [];
    return generateColorSuggestions(investigation);
  }, [investigation]);

  // Open/close the sheet when visibility changes
  React.useEffect(() => {
    if (isVisible) {
      setSelectedIndices(new Set());
      sheetRef.current?.snapToIndex(0);
    } else {
      sheetRef.current?.close();
    }
  }, [isVisible]);

  const toggleSelect = useCallback((index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selectedIndices.size === suggestions.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(suggestions.map((_, i) => i)));
    }
  }, [selectedIndices.size, suggestions]);

  const handleApply = useCallback(() => {
    if (!investigation || selectedIndices.size === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const newLegendEntries: Array<{ color: string; label: string }> = [];

    for (const idx of selectedIndices) {
      const s = suggestions[idx];
      if (!s) continue;

      // Update node colors
      for (const nodeId of s.affectedNodeIds) {
        updateNode(investigationId, nodeId, { color: s.colorKey as TagColor });
        // Add a tag for this category
        const node = investigation.nodes.find((n) => n.id === nodeId);
        if (node) {
          const alreadyTagged = node.tags.some(
            (t) => t.label === s.label && t.color === s.colorKey
          );
          if (!alreadyTagged) {
            updateNode(investigationId, nodeId, {
              tags: [
                ...node.tags,
                { id: generateId(), label: s.label, color: s.colorKey as TagColor },
              ],
            });
          }
        }
      }

      // Update string colors
      for (const stringId of s.affectedStringIds) {
        updateString(investigationId, stringId, { color: s.color });
      }

      newLegendEntries.push({ color: s.color, label: s.label });
    }

    // Merge into existing legend
    const existingLegend = investigation.colorLegend ?? [];
    const merged = [...existingLegend];
    for (const entry of newLegendEntries) {
      const exists = merged.some((e) => e.color === entry.color);
      if (!exists) merged.push(entry);
      else {
        const i = merged.findIndex((e) => e.color === entry.color);
        merged[i] = entry;
      }
    }
    updateColorLegend(investigationId, merged);

    onClose();
  }, [
    investigation,
    selectedIndices,
    suggestions,
    investigationId,
    updateNode,
    updateString,
    updateColorLegend,
    onClose,
  ]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.6}
        pressBehavior="close"
      />
    ),
    []
  );

  const allSelected = selectedIndices.size === suggestions.length && suggestions.length > 0;

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: C.surface }}
      handleIndicatorStyle={{ backgroundColor: C.muted }}
      backdropComponent={renderBackdrop}
      onChange={(index) => {
        if (index === -1) onClose();
      }}
    >
      <BottomSheetScrollView
        style={{ paddingHorizontal: 20 }}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 4,
            marginTop: 4,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Sparkles size={18} color={C.pin} strokeWidth={2} />
            <Text style={{ color: C.text, fontSize: 18, fontWeight: '800' }}>
              Color Suggestions
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
          >
            <X size={20} color={C.muted} strokeWidth={2} />
          </Pressable>
        </View>

        <Text style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>
          Based on your investigation — tap a card to select
        </Text>

        {suggestions.length === 0 ? (
          <View
            style={{
              alignItems: 'center',
              paddingVertical: 40,
            }}
          >
            <Text style={{ color: C.muted, fontSize: 14, textAlign: 'center' }}>
              Add more nodes with names, dates, and locations to get smart color suggestions.
            </Text>
          </View>
        ) : (
          <>
            {/* Select all toggle */}
            <Pressable
              onPress={handleSelectAll}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingVertical: 8,
                marginBottom: 8,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  borderWidth: 1.5,
                  borderColor: allSelected ? C.red : C.muted,
                  backgroundColor: allSelected ? C.red : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {allSelected ? <Check size={11} color="#FFF" strokeWidth={3} /> : null}
              </View>
              <Text style={{ color: C.muted, fontSize: 13 }}>
                {allSelected ? 'Deselect all' : 'Select all'}
              </Text>
            </Pressable>

            {/* Suggestion cards */}
            {suggestions.map((suggestion, index) => {
              const nodeNames = suggestion.affectedNodeIds
                .map((id) => investigation?.nodes.find((n) => n.id === id)?.title ?? '')
                .filter(Boolean);

              return (
                <SuggestionCard
                  key={suggestion.colorKey}
                  suggestion={suggestion}
                  nodeNames={nodeNames}
                  isSelected={selectedIndices.has(index)}
                  onToggle={() => toggleSelect(index)}
                />
              );
            })}

            {/* Apply / Dismiss */}
            <View style={{ gap: 10, marginTop: 8 }}>
              <Pressable
                testID="apply-suggestions-button"
                onPress={handleApply}
                style={({ pressed }) => ({
                  backgroundColor:
                    selectedIndices.size === 0
                      ? C.border
                      : pressed
                      ? '#A3162E'
                      : C.red,
                  borderRadius: 12,
                  paddingVertical: 15,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8,
                })}
              >
                <Sparkles
                  size={16}
                  color={selectedIndices.size === 0 ? C.muted : '#FFF'}
                  strokeWidth={2}
                />
                <Text
                  style={{
                    color: selectedIndices.size === 0 ? C.muted : '#FFF',
                    fontSize: 15,
                    fontWeight: '700',
                  }}
                >
                  Apply Selected{' '}
                  {selectedIndices.size > 0 ? `(${selectedIndices.size})` : null}
                </Text>
              </Pressable>

              <Pressable
                testID="dismiss-suggestions-button"
                onPress={onClose}
                style={({ pressed }) => ({
                  paddingVertical: 12,
                  alignItems: 'center',
                  opacity: pressed ? 0.5 : 1,
                })}
              >
                <Text style={{ color: C.muted, fontSize: 14 }}>Maybe Later</Text>
              </Pressable>
            </View>
          </>
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
