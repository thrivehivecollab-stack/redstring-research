import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Palette, ChevronRight, Sparkles } from 'lucide-react-native';
import useInvestigationStore from '@/lib/state/investigation-store';
import type { ColorLegendEntry } from '@/lib/types';

const C = {
  bg: 'rgba(26, 22, 20, 0.92)',
  surface: '#231F1C',
  red: '#C41E3A',
  redLight: '#E8445A',
  pin: '#D4A574',
  text: '#E8DCC8',
  muted: '#6B5B4F',
  border: '#3D332C',
} as const;

const DEFAULT_LEGEND: ColorLegendEntry[] = [
  { color: '#C41E3A', label: 'Suspects' },
  { color: '#3B82F6', label: 'Locations' },
  { color: '#22C55E', label: 'Confirmed' },
  { color: '#F59E0B', label: 'Timeline' },
  { color: '#A855F7', label: 'Organizations' },
  { color: '#14B8A6', label: 'Evidence' },
];

interface ColorLegendProps {
  investigationId: string;
  onSuggestPress: () => void;
}

export default function ColorLegend({ investigationId, onSuggestPress }: ColorLegendProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const expandWidth = useSharedValue(0);
  const chevronRotate = useSharedValue(0);

  const investigations = useInvestigationStore((s) => s.investigations);
  const updateColorLegend = useInvestigationStore((s) => s.updateColorLegend);

  const investigation = investigations.find((inv) => inv.id === investigationId);
  const legend: ColorLegendEntry[] = investigation?.colorLegend ?? DEFAULT_LEGEND;

  const toggleOpen = useCallback(() => {
    const opening = !isOpen;
    setIsOpen(opening);
    expandWidth.value = withSpring(opening ? 220 : 0, {
      damping: 18,
      stiffness: 200,
    });
    chevronRotate.value = withSpring(opening ? 1 : 0, {
      damping: 18,
      stiffness: 200,
    });
  }, [isOpen, expandWidth, chevronRotate]);

  const panelStyle = useAnimatedStyle(() => ({
    width: expandWidth.value,
    overflow: 'hidden' as const,
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotate.value * 180}deg` }],
  }));

  const handleLabelChange = useCallback(
    (index: number, newLabel: string) => {
      const updated = legend.map((entry, i) =>
        i === index ? { ...entry, label: newLabel } : entry
      );
      updateColorLegend(investigationId, updated);
    },
    [legend, investigationId, updateColorLegend]
  );

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        top: '50%',
        transform: [{ translateY: -140 }],
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 100,
      }}
      pointerEvents="box-none"
    >
      {/* Expanded panel */}
      <Animated.View style={panelStyle} pointerEvents={isOpen ? 'auto' : 'none'}>
        <View
          style={{
            width: 220,
            backgroundColor: C.bg,
            borderTopRightRadius: 12,
            borderBottomRightRadius: 12,
            borderWidth: 1,
            borderLeftWidth: 0,
            borderColor: C.red + '55',
            paddingTop: 12,
            paddingBottom: 4,
            paddingHorizontal: 12,
          }}
        >
          {/* Header */}
          <Text
            style={{
              color: C.text,
              fontSize: 10,
              fontWeight: '800',
              letterSpacing: 2,
              marginBottom: 10,
              opacity: 0.7,
            }}
          >
            COLOR CODE
          </Text>

          {/* Legend rows */}
          {legend.map((entry, index) => (
            <View
              key={entry.color}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                marginBottom: 8,
              }}
            >
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: entry.color,
                  shadowColor: entry.color,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.8,
                  shadowRadius: 4,
                  elevation: 3,
                  flexShrink: 0,
                }}
              />
              <TextInput
                value={entry.label}
                onChangeText={(text) => handleLabelChange(index, text)}
                style={{
                  flex: 1,
                  color: C.text,
                  fontSize: 13,
                  fontWeight: '500',
                  padding: 0,
                  margin: 0,
                }}
                placeholderTextColor={C.muted}
                placeholder="Label..."
                selectTextOnFocus
              />
            </View>
          ))}

          {/* Suggest button */}
          <Pressable
            testID="color-suggest-button"
            onPress={onSuggestPress}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              backgroundColor: pressed ? '#A3162E' : C.red,
              borderRadius: 8,
              paddingVertical: 8,
              marginTop: 6,
              marginBottom: 8,
            })}
          >
            <Sparkles size={13} color="#FFF" strokeWidth={2.5} />
            <Text
              style={{
                color: '#FFF',
                fontSize: 12,
                fontWeight: '700',
                letterSpacing: 0.5,
              }}
            >
              Suggest
            </Text>
          </Pressable>
        </View>
      </Animated.View>

      {/* Collapsed pill / toggle button */}
      <Pressable
        testID="color-legend-toggle"
        onPress={toggleOpen}
        style={({ pressed }) => ({
          width: 32,
          paddingVertical: 14,
          backgroundColor: pressed ? 'rgba(30, 26, 24, 0.95)' : 'rgba(26, 22, 20, 0.85)',
          borderTopRightRadius: 10,
          borderBottomRightRadius: 10,
          borderWidth: 1,
          borderLeftWidth: 0,
          borderColor: C.pin + '40',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          flexDirection: 'column',
        })}
      >
        <Palette size={15} color={C.pin} strokeWidth={2} />
        <Animated.View style={chevronStyle}>
          <ChevronRight size={11} color={C.muted} strokeWidth={2.5} />
        </Animated.View>
      </Pressable>
    </View>
  );
}
