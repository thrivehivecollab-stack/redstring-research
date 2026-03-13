import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  useFonts,
  BebasNeue_400Regular,
} from '@expo-google-fonts/bebas-neue';
import {
  CourierPrime_400Regular,
  CourierPrime_700Bold,
} from '@expo-google-fonts/courier-prime';
import useInvestigationStore from '@/lib/state/investigation-store';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

type BoardStyle = 'corkboard' | 'mindmap' | 'timeline' | 'casefile';

// ─── Corkboard Preview ───────────────────────────────────────────
// Dark bg, two note cards side by side at top, one bottom-center,
// each with a red pushpin, red lines connecting top pins to bottom pin.
function CorkboardPreview() {
  // Pin center X positions (relative to the 120h container width ~CARD_WIDTH)
  // Top-left card: left edge ~10, width 52 → pin center at 10+26 = 36
  // Top-right card: right edge ~10, width 52 → pin center at containerWidth-10-26 = cw-36
  // Bottom-center card: centered → pin center at containerWidth/2
  // We use percentage strings for positions since we don't know exact CARD_WIDTH at render.
  // Instead, use a fixed inner width of 130 for the relative layout.

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 130, height: 100, position: 'relative' }}>

        {/* ── Red lines first (behind everything) ── */}

        {/* Line: top-left pin → bottom-center pin
            top-left pin approx at (36, 0), bottom pin approx at (65, 55)
            dx=29, dy=55 → length=sqrt(29²+55²)≈62, angle=atan2(55,29)≈62° */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 36,
            width: 62,
            height: 1.5,
            backgroundColor: '#C41E3A',
            opacity: 0.6,
            transformOrigin: 'left center',
            transform: [{ rotate: '62deg' }],
          }}
        />

        {/* Line: top-right pin → bottom-center pin
            top-right pin approx at (94, 4), bottom pin approx at (65, 55)
            dx=-29, dy=51 → angle from right pin going down-left ≈ -60deg */}
        <View
          style={{
            position: 'absolute',
            top: 4,
            left: 94,
            width: 58,
            height: 1.5,
            backgroundColor: '#C41E3A',
            opacity: 0.6,
            transformOrigin: 'left center',
            transform: [{ rotate: '-119deg' }],
          }}
        />

        {/* ── Top-left note card ── */}
        <View
          style={{
            position: 'absolute',
            top: 4,
            left: 10,
            width: 52,
            height: 40,
            backgroundColor: '#F0E6D0',
            borderRadius: 3,
            shadowColor: '#000',
            shadowOffset: { width: 1, height: 2 },
            shadowOpacity: 0.35,
            shadowRadius: 3,
            elevation: 3,
          }}
        >
          <View style={{ marginTop: 10, marginHorizontal: 6, gap: 4 }}>
            <View style={{ height: 2, backgroundColor: '#C4B59A', borderRadius: 1 }} />
            <View style={{ height: 2, backgroundColor: '#C4B59A', borderRadius: 1, width: '70%' }} />
          </View>
        </View>
        {/* Pushpin top-left — centered at top of card: left+26-4=32, top=0 */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 32,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: '#C41E3A',
            zIndex: 5,
          }}
        />

        {/* ── Top-right note card — slightly taller ── */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 68,
            width: 52,
            height: 44,
            backgroundColor: '#F0E6D0',
            borderRadius: 3,
            shadowColor: '#000',
            shadowOffset: { width: 1, height: 2 },
            shadowOpacity: 0.35,
            shadowRadius: 3,
            elevation: 3,
          }}
        >
          <View style={{ marginTop: 10, marginHorizontal: 6, gap: 4 }}>
            <View style={{ height: 2, backgroundColor: '#C4B59A', borderRadius: 1 }} />
            <View style={{ height: 2, backgroundColor: '#C4B59A', borderRadius: 1, width: '60%' }} />
            <View style={{ height: 2, backgroundColor: '#C4B59A', borderRadius: 1, width: '80%' }} />
          </View>
        </View>
        {/* Pushpin top-right — centered at top: left=68+26-4=90, top=-4 */}
        <View
          style={{
            position: 'absolute',
            top: -4,
            left: 90,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: '#C41E3A',
            zIndex: 5,
          }}
        />

        {/* ── Bottom-center note card — slightly wider ── */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 35,
            width: 60,
            height: 40,
            backgroundColor: '#F0E6D0',
            borderRadius: 3,
            shadowColor: '#000',
            shadowOffset: { width: 1, height: 2 },
            shadowOpacity: 0.35,
            shadowRadius: 3,
            elevation: 3,
          }}
        >
          <View style={{ marginTop: 10, marginHorizontal: 6, gap: 4 }}>
            <View style={{ height: 2, backgroundColor: '#C4B59A', borderRadius: 1 }} />
            <View style={{ height: 2, backgroundColor: '#C4B59A', borderRadius: 1, width: '75%' }} />
          </View>
        </View>
        {/* Pushpin bottom-center — centered at top of bottom card: left=35+30-4=61, bottom=40-4=36 */}
        <View
          style={{
            position: 'absolute',
            bottom: 36,
            left: 61,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: '#C41E3A',
            zIndex: 5,
          }}
        />
      </View>
    </View>
  );
}

// ─── Mind Map Preview ─────────────────────────────────────────────
// Central magnifying-glass circle, 4 satellite rounded-rect nodes with icons,
// thin colored lines from center to each node.
function MindMapPreview() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 120, height: 100, position: 'relative', alignItems: 'center', justifyContent: 'center' }}>

        {/* ── Connector lines (behind nodes) ── */}
        {/* Top-left line: center(60,50) → top-left node center(14,14) */}
        <View style={{
          position: 'absolute',
          top: 14,
          left: 14,
          width: 58,
          height: 1.5,
          backgroundColor: '#3B82F6',
          opacity: 0.7,
          transformOrigin: 'left center',
          transform: [{ rotate: '37deg' }],
        }} />
        {/* Top-right line: center(60,50) → top-right node center(106,14) */}
        <View style={{
          position: 'absolute',
          top: 14,
          left: 60,
          width: 58,
          height: 1.5,
          backgroundColor: '#E8DCC8',
          opacity: 0.6,
          transformOrigin: 'left center',
          transform: [{ rotate: '-37deg' }],
        }} />
        {/* Bottom-left line: center(60,50) → bottom-left node center(14,86) */}
        <View style={{
          position: 'absolute',
          top: 50,
          left: 14,
          width: 58,
          height: 1.5,
          backgroundColor: '#22C55E',
          opacity: 0.7,
          transformOrigin: 'left center',
          transform: [{ rotate: '-37deg' }],
        }} />
        {/* Bottom-right line: center(60,50) → bottom-right node center(106,86) */}
        <View style={{
          position: 'absolute',
          top: 50,
          left: 60,
          width: 58,
          height: 1.5,
          backgroundColor: '#F59E0B',
          opacity: 0.7,
          transformOrigin: 'left center',
          transform: [{ rotate: '37deg' }],
        }} />

        {/* ── Satellite nodes ── */}

        {/* Top-left: person icon (blue) */}
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 28,
          height: 28,
          borderRadius: 6,
          backgroundColor: '#1E3A5F',
          borderWidth: 1,
          borderColor: '#3B82F6',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {/* Head */}
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#3B82F6', marginBottom: 1 }} />
          {/* Body */}
          <View style={{ width: 12, height: 6, borderRadius: 3, backgroundColor: '#3B82F6' }} />
        </View>

        {/* Top-right: document icon (light) */}
        <View style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 28,
          height: 28,
          borderRadius: 6,
          backgroundColor: '#2A2520',
          borderWidth: 1,
          borderColor: '#6B5C4E',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <View style={{ width: 14, height: 18, backgroundColor: '#E8DCC8', borderRadius: 2, padding: 2 }}>
            <View style={{ height: 2, backgroundColor: '#6B5C4E', borderRadius: 1, marginBottom: 2 }} />
            <View style={{ height: 2, backgroundColor: '#6B5C4E', borderRadius: 1, marginBottom: 2, width: '80%' }} />
            <View style={{ height: 2, backgroundColor: '#6B5C4E', borderRadius: 1, width: '60%' }} />
          </View>
        </View>

        {/* Bottom-left: pin/location icon (green) */}
        <View style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: 28,
          height: 28,
          borderRadius: 6,
          backgroundColor: '#14291A',
          borderWidth: 1,
          borderColor: '#22C55E',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {/* Teardrop pin */}
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#22C55E', marginBottom: -2 }} />
          <View style={{ width: 3, height: 6, backgroundColor: '#22C55E', borderRadius: 1 }} />
        </View>

        {/* Bottom-right: link icon — two overlapping circles */}
        <View style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: 28,
          height: 28,
          borderRadius: 6,
          backgroundColor: '#2A1F0A',
          borderWidth: 1,
          borderColor: '#F59E0B',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
        }}>
          <View style={{ width: 9, height: 9, borderRadius: 4.5, borderWidth: 2, borderColor: '#F59E0B', marginRight: -3 }} />
          <View style={{ width: 9, height: 9, borderRadius: 4.5, borderWidth: 2, borderColor: '#F59E0B' }} />
        </View>

        {/* ── Central node: magnifying glass look ── */}
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: '#2A2520',
            borderWidth: 2,
            borderColor: '#6B5C4E',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.4,
            shadowRadius: 4,
            elevation: 4,
            zIndex: 10,
          }}
        >
          {/* Inner circle of magnifying glass */}
          <View style={{
            width: 14,
            height: 14,
            borderRadius: 7,
            borderWidth: 2,
            borderColor: '#E8DCC8',
            position: 'absolute',
            top: 5,
            left: 5,
          }} />
          {/* Handle line — bottom-right diagonal */}
          <View style={{
            position: 'absolute',
            bottom: 4,
            right: 4,
            width: 7,
            height: 2,
            backgroundColor: '#E8DCC8',
            borderRadius: 1,
            transform: [{ rotate: '45deg' }],
          }} />
        </View>
      </View>
    </View>
  );
}

// ─── Timeline Preview ─────────────────────────────────────────────
// Horizontal gray line, 4 colored dots sitting ON the line, year labels below.
function TimelinePreview() {
  const dots: { color: string; year: string }[] = [
    { color: '#C41E3A', year: '2019' },
    { color: '#F59E0B', year: '2021' },
    { color: '#3B82F6', year: '2022' },
    { color: '#22C55E', year: '2024' },
  ];

  return (
    <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 10 }}>
      {/* Outer container so we can absolutely position dots on the line */}
      <View style={{ height: 50, position: 'relative', justifyContent: 'center' }}>
        {/* Horizontal gray line — vertically centered at y=15 within this 50h box */}
        <View
          style={{
            position: 'absolute',
            top: 15,
            left: 0,
            right: 0,
            height: 2,
            backgroundColor: '#3D332C',
            borderRadius: 1,
          }}
        />

        {/* Dots + year labels, distributed evenly */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {dots.map((dot) => (
            <View key={dot.year} style={{ alignItems: 'center', width: 28 }}>
              {/* Dot sitting on the line: dot is 14px, line is at top=15, so marginTop = 15 - 7 = 8 */}
              <View
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 7,
                  backgroundColor: dot.color,
                  marginTop: 8,
                }}
              />
              <Text
                style={{
                  color: '#6B5C4E',
                  fontSize: 8,
                  marginTop: 4,
                }}
              >
                {dot.year}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── Case File Preview ────────────────────────────────────────────
// 4 rows: small colored dot on left, then full-width dark gray bar
function CaseFilePreview() {
  const bars: { color: string }[] = [
    { color: '#C41E3A' },
    { color: '#3B82F6' },
    { color: '#F59E0B' },
    { color: '#22C55E' },
  ];

  return (
    <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 14, gap: 10 }}>
      {bars.map((bar, i) => (
        <View
          key={i}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
        >
          {/* Colored dot */}
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: bar.color,
              flexShrink: 0,
            }}
          />
          {/* Full-width dark gray bar */}
          <View
            style={{
              flex: 1,
              height: 12,
              backgroundColor: '#2A2520',
              borderRadius: 4,
            }}
          />
        </View>
      ))}
    </View>
  );
}

// ─── Style card data ──────────────────────────────────────────────
const STYLE_CARDS: {
  id: BoardStyle;
  emoji: string;
  title: string;
  description: string;
  Preview: () => React.ReactElement;
}[] = [
  {
    id: 'corkboard',
    emoji: '🪵',
    title: 'Corkboard',
    description: 'Physical pins, red string connections. Classic detective style.',
    Preview: CorkboardPreview,
  },
  {
    id: 'mindmap',
    emoji: '🕸️',
    title: 'Mind Map',
    description: 'Web of nodes, visual connections. See the full picture.',
    Preview: MindMapPreview,
  },
  {
    id: 'timeline',
    emoji: '📅',
    title: 'Timeline',
    description: 'Chronological events, date-based investigation flow.',
    Preview: TimelinePreview,
  },
  {
    id: 'casefile',
    emoji: '📋',
    title: 'Case File',
    description: 'Structured list view. Organized, scannable, methodical.',
    Preview: CaseFilePreview,
  },
];

// ─── Main Screen ──────────────────────────────────────────────────
export default function NewCaseScreen() {
  const router = useRouter();
  const [selectedStyle, setSelectedStyle] = useState<BoardStyle>('corkboard');
  const [name, setName] = useState<string>('');

  const createInvestigation = useInvestigationStore((s) => s.createInvestigation);
  const setActiveInvestigation = useInvestigationStore((s) => s.setActiveInvestigation);
  const updateInvestigationMeta = useInvestigationStore((s) => s.updateInvestigationMeta);

  const [fontsLoaded] = useFonts({
    BebasNeue_400Regular,
    CourierPrime_400Regular,
    CourierPrime_700Bold,
  });

  const canCreate = name.trim().length > 0;

  const handleCreate = () => {
    if (!canCreate) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const id = createInvestigation(name.trim(), undefined);
    setActiveInvestigation(id);
    updateInvestigationMeta(id, {
      icon: STYLE_CARDS.find((c) => c.id === selectedStyle)?.emoji ?? '🔍',
      iconUri: undefined,
      boardStyle: selectedStyle,
      filingTabColor: undefined,
      filingTabLabel: undefined,
    });
    router.replace('/(tabs)/two');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#1A1614' }} testID="new-case-screen">
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          {/* ── Header ── */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingTop: 8,
              paddingBottom: 4,
              gap: 12,
            }}
          >
            {/* Back button — dark rounded square */}
            <Pressable
              testID="new-case-back-button"
              onPress={() => router.back()}
              style={({ pressed }) => ({
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: pressed ? '#3D332C' : '#231F1C',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: '#3D332C',
                flexShrink: 0,
              })}
            >
              <Text style={{ color: '#E8DCC8', fontSize: 20, lineHeight: 22, fontWeight: '300' }}>{'←'}</Text>
            </Pressable>

            {/* Title left-aligned */}
            <Text
              style={{
                fontFamily: fontsLoaded ? 'BebasNeue_400Regular' : undefined,
                fontSize: 28,
                letterSpacing: 4,
                color: '#E8DCC8',
              }}
            >
              NEW CASE
            </Text>
          </View>

          {/* ── Subtitle ── */}
          <Text
            style={{
              color: '#6B5C4E',
              fontSize: 12,
              fontFamily: fontsLoaded ? 'CourierPrime_400Regular' : undefined,
              textAlign: 'center',
              marginBottom: 20,
              letterSpacing: 0.5,
            }}
          >
            Choose your investigation style
          </Text>

          {/* ── Style Cards Grid ── */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
            style={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {STYLE_CARDS.map((card) => {
                const isSelected = selectedStyle === card.id;
                const { Preview } = card;
                return (
                  <Pressable
                    key={card.id}
                    testID={`style-card-${card.id}`}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedStyle(card.id);
                    }}
                    style={({ pressed }) => ({
                      width: CARD_WIDTH,
                      backgroundColor: '#231F1C',
                      borderRadius: 16,
                      borderWidth: isSelected ? 2 : 1,
                      borderColor: isSelected ? '#C41E3A' : '#3D332C',
                      overflow: 'hidden',
                      opacity: pressed ? 0.9 : 1,
                      transform: [{ scale: pressed ? 0.97 : 1 }],
                      shadowColor: isSelected ? '#C41E3A' : '#000',
                      shadowOffset: { width: 0, height: isSelected ? 4 : 2 },
                      shadowOpacity: isSelected ? 0.3 : 0.2,
                      shadowRadius: isSelected ? 8 : 4,
                      elevation: isSelected ? 6 : 3,
                    })}
                  >
                    {/* Selected checkmark overlay */}
                    {isSelected ? (
                      <View
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          backgroundColor: '#C41E3A',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 10,
                        }}
                      >
                        <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '800' }}>✓</Text>
                      </View>
                    ) : null}

                    {/* Visual preview area */}
                    <View
                      style={{
                        height: 150,
                        backgroundColor: '#1A1614',
                        borderBottomWidth: 1,
                        borderBottomColor: '#3D332C',
                      }}
                    >
                      <Preview />
                    </View>

                    {/* Card info */}
                    <View style={{ padding: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <Text style={{ fontSize: 16 }}>{card.emoji}</Text>
                        <Text
                          style={{
                            color: '#E8DCC8',
                            fontSize: 14,
                            fontFamily: fontsLoaded ? 'CourierPrime_700Bold' : undefined,
                            fontWeight: '700',
                          }}
                        >
                          {card.title}
                        </Text>
                      </View>
                      <Text
                        style={{
                          color: '#6B5C4E',
                          fontSize: 10,
                          fontFamily: fontsLoaded ? 'CourierPrime_400Regular' : undefined,
                          lineHeight: 14,
                        }}
                      >
                        {card.description}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {/* ── Bottom Section: Name input + Create button ── */}
          <View
            style={{
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: 24,
              borderTopWidth: 1,
              borderTopColor: '#3D332C',
              backgroundColor: '#1A1614',
              gap: 12,
            }}
          >
            <TextInput
              testID="new-case-name-input"
              value={name}
              onChangeText={setName}
              placeholder="Name this investigation..."
              placeholderTextColor="#4A3C30"
              style={{
                backgroundColor: '#231F1C',
                borderRadius: 28,
                paddingHorizontal: 20,
                paddingVertical: 14,
                color: '#E8DCC8',
                fontSize: 15,
                fontFamily: fontsLoaded ? 'CourierPrime_400Regular' : undefined,
                borderWidth: 1,
                borderColor: '#3D332C',
              }}
              returnKeyType="done"
              onSubmitEditing={handleCreate}
            />

            <Pressable
              testID="create-investigation-button"
              onPress={handleCreate}
              disabled={!canCreate}
              style={({ pressed }) => ({
                backgroundColor: canCreate
                  ? pressed
                    ? '#A01830'
                    : '#C41E3A'
                  : '#3D332C',
                borderRadius: 28,
                paddingVertical: 16,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: canCreate ? 1 : 0.7,
                shadowColor: canCreate ? '#C41E3A' : 'transparent',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.35,
                shadowRadius: 10,
                elevation: canCreate ? 6 : 0,
              })}
            >
              <Text
                style={{
                  color: canCreate ? '#FFF' : '#6B5C4E',
                  fontSize: 15,
                  fontFamily: fontsLoaded ? 'CourierPrime_700Bold' : undefined,
                  fontWeight: '700',
                  letterSpacing: 1,
                }}
              >
                CREATE INVESTIGATION
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
