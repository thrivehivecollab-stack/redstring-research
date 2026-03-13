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
function CorkboardPreview() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 12 }}>
      {/* Three note cards arranged in a triangle-like layout */}
      <View style={{ width: '100%', height: 100, position: 'relative' }}>
        {/* Top-left card */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 8,
            width: 60,
            height: 44,
            backgroundColor: '#F5ECD7',
            borderRadius: 4,
            shadowColor: '#000',
            shadowOffset: { width: 1, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 3,
            elevation: 3,
          }}
        >
          {/* Lines on card */}
          <View style={{ margin: 6, gap: 5 }}>
            <View style={{ height: 2, backgroundColor: '#C4B89A', borderRadius: 1 }} />
            <View style={{ height: 2, backgroundColor: '#C4B89A', borderRadius: 1, width: '70%' }} />
          </View>
        </View>
        {/* Pushpin top-left */}
        <View style={{ position: 'absolute', top: -4, left: 34, width: 8, height: 8, borderRadius: 4, backgroundColor: '#C41E3A', zIndex: 2 }} />

        {/* Top-right card */}
        <View
          style={{
            position: 'absolute',
            top: 4,
            right: 8,
            width: 60,
            height: 44,
            backgroundColor: '#F5ECD7',
            borderRadius: 4,
            shadowColor: '#000',
            shadowOffset: { width: 1, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 3,
            elevation: 3,
          }}
        >
          <View style={{ margin: 6, gap: 5 }}>
            <View style={{ height: 2, backgroundColor: '#C4B89A', borderRadius: 1 }} />
            <View style={{ height: 2, backgroundColor: '#C4B89A', borderRadius: 1, width: '60%' }} />
          </View>
        </View>
        {/* Pushpin top-right */}
        <View style={{ position: 'absolute', top: 0, right: 34, width: 8, height: 8, borderRadius: 4, backgroundColor: '#C41E3A', zIndex: 2 }} />

        {/* Bottom-center card */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: '50%',
            marginLeft: -30,
            width: 60,
            height: 44,
            backgroundColor: '#F5ECD7',
            borderRadius: 4,
            shadowColor: '#000',
            shadowOffset: { width: 1, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 3,
            elevation: 3,
          }}
        >
          <View style={{ margin: 6, gap: 5 }}>
            <View style={{ height: 2, backgroundColor: '#C4B89A', borderRadius: 1 }} />
            <View style={{ height: 2, backgroundColor: '#C4B89A', borderRadius: 1, width: '80%' }} />
          </View>
        </View>
        {/* Pushpin bottom-center */}
        <View style={{ position: 'absolute', bottom: 40, left: '50%', marginLeft: -4, width: 8, height: 8, borderRadius: 4, backgroundColor: '#C41E3A', zIndex: 2 }} />

        {/* Red string connecting top-left to bottom-center */}
        <View
          style={{
            position: 'absolute',
            top: 18,
            left: 38,
            width: 52,
            height: 1.5,
            backgroundColor: '#C41E3A',
            opacity: 0.7,
            transform: [{ rotate: '35deg' }],
          }}
        />
        {/* Red string connecting top-right to bottom-center */}
        <View
          style={{
            position: 'absolute',
            top: 22,
            right: 38,
            width: 52,
            height: 1.5,
            backgroundColor: '#C41E3A',
            opacity: 0.7,
            transform: [{ rotate: '-35deg' }],
          }}
        />
      </View>
    </View>
  );
}

// ─── Mind Map Preview ─────────────────────────────────────────────
function MindMapPreview() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 8 }}>
      <View style={{ width: 100, height: 100, position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
        {/* Connecting lines */}
        <View style={{ position: 'absolute', top: 18, left: 18, width: 22, height: 1.5, backgroundColor: '#3B82F6', opacity: 0.7, transform: [{ rotate: '-45deg' }] }} />
        <View style={{ position: 'absolute', top: 18, right: 18, width: 22, height: 1.5, backgroundColor: '#22C55E', opacity: 0.7, transform: [{ rotate: '45deg' }] }} />
        <View style={{ position: 'absolute', bottom: 18, left: 18, width: 22, height: 1.5, backgroundColor: '#F59E0B', opacity: 0.7, transform: [{ rotate: '45deg' }] }} />
        <View style={{ position: 'absolute', bottom: 18, right: 18, width: 22, height: 1.5, backgroundColor: '#C41E3A', opacity: 0.7, transform: [{ rotate: '-45deg' }] }} />

        {/* Satellite nodes */}
        <View style={{ position: 'absolute', top: 4, left: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: '#3B82F6', opacity: 0.8 }} />
        <View style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: '#22C55E', opacity: 0.8 }} />
        <View style={{ position: 'absolute', bottom: 4, left: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: '#F59E0B', opacity: 0.8 }} />
        <View style={{ position: 'absolute', bottom: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: '#C41E3A', opacity: 0.8 }} />

        {/* Central node */}
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: '#E8DCC8',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 4,
          }}
        >
          <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: '#3D332C' }} />
        </View>
      </View>
    </View>
  );
}

// ─── Timeline Preview ─────────────────────────────────────────────
function TimelinePreview() {
  const dots = [
    { color: '#C41E3A', year: '2019', left: '8%' },
    { color: '#F59E0B', year: '2021', left: '34%' },
    { color: '#3B82F6', year: '2022', left: '60%' },
    { color: '#22C55E', year: '2024', left: '82%' },
  ];
  return (
    <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 12 }}>
      <View style={{ position: 'relative', height: 60 }}>
        {/* Horizontal line */}
        <View
          style={{
            position: 'absolute',
            top: 18,
            left: 0,
            right: 0,
            height: 2,
            backgroundColor: '#3D332C',
            borderRadius: 1,
          }}
        />
        {/* Colored dots + year labels */}
        {dots.map((dot) => (
          <View
            key={dot.year}
            style={{ position: 'absolute', top: 10, left: dot.left as any, alignItems: 'center' }}
          >
            <View
              style={{
                width: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: dot.color,
                borderWidth: 2,
                borderColor: '#231F1C',
              }}
            />
            <Text
              style={{
                color: '#6B5C4E',
                fontSize: 8,
                fontFamily: 'CourierPrime_400Regular',
                marginTop: 6,
              }}
            >
              {dot.year}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Case File Preview ────────────────────────────────────────────
function CaseFilePreview() {
  const bars = [
    { color: '#C41E3A', width: '100%' },
    { color: '#3B82F6', width: '80%' },
    { color: '#F59E0B', width: '60%' },
    { color: '#22C55E', width: '75%' },
  ];
  return (
    <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 14, gap: 10 }}>
      {bars.map((bar, i) => (
        <View
          key={i}
          style={{
            height: 10,
            width: bar.width as any,
            backgroundColor: bar.color,
            borderRadius: 5,
            opacity: 0.85,
          }}
        />
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
            }}
          >
            {/* Back arrow */}
            <Pressable
              testID="new-case-back-button"
              onPress={() => router.back()}
              style={({ pressed }) => ({
                width: 40,
                height: 40,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text style={{ color: '#E8DCC8', fontSize: 22, fontWeight: '300' }}>{'←'}</Text>
            </Pressable>

            {/* Title centered */}
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text
                style={{
                  fontFamily: fontsLoaded ? 'BebasNeue_400Regular' : undefined,
                  fontSize: 26,
                  letterSpacing: 4,
                  color: '#E8DCC8',
                }}
              >
                NEW CASE
              </Text>
            </View>

            {/* Right spacer to balance layout */}
            <View style={{ width: 40 }} />
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
                        height: 120,
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
