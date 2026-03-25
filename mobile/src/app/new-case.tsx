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
  Switch,
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
import { DEFAULT_PERMISSIONS, type InvestigationPermissions, type RolePermissions } from '@/lib/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

type BoardStyle = 'corkboard' | 'mindmap' | 'timeline' | 'casefile';
type Step = 1 | 2;

// ─── Permission presets ───────────────────────────────────────────
const READ_ONLY_PERMISSIONS: InvestigationPermissions = {
  collaborator: {
    canDownloadPdf: false,
    canSaveNodes: false,
    canShareExternally: false,
    canScreenshot: false,
    canExportPresentation: false,
    canExportTimeline: false,
    canViewChainOfCustody: true,
  },
  viewer: {
    canDownloadPdf: false,
    canSaveNodes: false,
    canShareExternally: false,
    canScreenshot: false,
    canExportPresentation: false,
    canExportTimeline: false,
    canViewChainOfCustody: true,
  },
  guest: {
    canDownloadPdf: false,
    canSaveNodes: false,
    canShareExternally: false,
    canScreenshot: false,
    canExportPresentation: false,
    canExportTimeline: false,
    canViewChainOfCustody: false,
  },
};

const FULL_ACCESS_PERMISSIONS: InvestigationPermissions = {
  collaborator: {
    canDownloadPdf: true,
    canSaveNodes: true,
    canShareExternally: true,
    canScreenshot: true,
    canExportPresentation: true,
    canExportTimeline: true,
    canViewChainOfCustody: true,
  },
  viewer: {
    canDownloadPdf: true,
    canSaveNodes: true,
    canShareExternally: true,
    canScreenshot: true,
    canExportPresentation: true,
    canExportTimeline: true,
    canViewChainOfCustody: true,
  },
  guest: {
    canDownloadPdf: false,
    canSaveNodes: false,
    canShareExternally: false,
    canScreenshot: false,
    canExportPresentation: false,
    canExportTimeline: false,
    canViewChainOfCustody: true,
  },
};

// ─── Corkboard Preview ───────────────────────────────────────────
function CorkboardPreview() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 130, height: 100, position: 'relative' }}>
        <View
          style={{
            position: 'absolute', top: 0, left: 36, width: 62, height: 1.5,
            backgroundColor: '#C41E3A', opacity: 0.6,
            transformOrigin: 'left center', transform: [{ rotate: '62deg' }],
          }}
        />
        <View
          style={{
            position: 'absolute', top: 4, left: 94, width: 58, height: 1.5,
            backgroundColor: '#C41E3A', opacity: 0.6,
            transformOrigin: 'left center', transform: [{ rotate: '-119deg' }],
          }}
        />
        <View style={{ position: 'absolute', top: 4, left: 10, width: 52, height: 40, backgroundColor: '#F0E6D0', borderRadius: 3, shadowColor: '#000', shadowOffset: { width: 1, height: 2 }, shadowOpacity: 0.35, shadowRadius: 3, elevation: 3 }}>
          <View style={{ marginTop: 10, marginHorizontal: 6, gap: 4 }}>
            <View style={{ height: 2, backgroundColor: '#C4B59A', borderRadius: 1 }} />
            <View style={{ height: 2, backgroundColor: '#C4B59A', borderRadius: 1, width: '70%' }} />
          </View>
        </View>
        <View style={{ position: 'absolute', top: 0, left: 32, width: 8, height: 8, borderRadius: 4, backgroundColor: '#C41E3A', zIndex: 5 }} />
        <View style={{ position: 'absolute', top: 0, left: 68, width: 52, height: 44, backgroundColor: '#F0E6D0', borderRadius: 3, shadowColor: '#000', shadowOffset: { width: 1, height: 2 }, shadowOpacity: 0.35, shadowRadius: 3, elevation: 3 }}>
          <View style={{ marginTop: 10, marginHorizontal: 6, gap: 4 }}>
            <View style={{ height: 2, backgroundColor: '#C4B59A', borderRadius: 1 }} />
            <View style={{ height: 2, backgroundColor: '#C4B59A', borderRadius: 1, width: '60%' }} />
            <View style={{ height: 2, backgroundColor: '#C4B59A', borderRadius: 1, width: '80%' }} />
          </View>
        </View>
        <View style={{ position: 'absolute', top: -4, left: 90, width: 8, height: 8, borderRadius: 4, backgroundColor: '#C41E3A', zIndex: 5 }} />
        <View style={{ position: 'absolute', bottom: 0, left: 35, width: 60, height: 40, backgroundColor: '#F0E6D0', borderRadius: 3, shadowColor: '#000', shadowOffset: { width: 1, height: 2 }, shadowOpacity: 0.35, shadowRadius: 3, elevation: 3 }}>
          <View style={{ marginTop: 10, marginHorizontal: 6, gap: 4 }}>
            <View style={{ height: 2, backgroundColor: '#C4B59A', borderRadius: 1 }} />
            <View style={{ height: 2, backgroundColor: '#C4B59A', borderRadius: 1, width: '75%' }} />
          </View>
        </View>
        <View style={{ position: 'absolute', bottom: 36, left: 61, width: 8, height: 8, borderRadius: 4, backgroundColor: '#C41E3A', zIndex: 5 }} />
      </View>
    </View>
  );
}

function MindMapPreview() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 120, height: 100, position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ position: 'absolute', top: 14, left: 14, width: 58, height: 1.5, backgroundColor: '#3B82F6', opacity: 0.7, transformOrigin: 'left center', transform: [{ rotate: '37deg' }] }} />
        <View style={{ position: 'absolute', top: 14, left: 60, width: 58, height: 1.5, backgroundColor: '#E8DCC8', opacity: 0.6, transformOrigin: 'left center', transform: [{ rotate: '-37deg' }] }} />
        <View style={{ position: 'absolute', top: 50, left: 14, width: 58, height: 1.5, backgroundColor: '#22C55E', opacity: 0.7, transformOrigin: 'left center', transform: [{ rotate: '-37deg' }] }} />
        <View style={{ position: 'absolute', top: 50, left: 60, width: 58, height: 1.5, backgroundColor: '#F59E0B', opacity: 0.7, transformOrigin: 'left center', transform: [{ rotate: '37deg' }] }} />
        <View style={{ position: 'absolute', top: 0, left: 0, width: 28, height: 28, borderRadius: 6, backgroundColor: '#1E3A5F', borderWidth: 1, borderColor: '#3B82F6', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#3B82F6', marginBottom: 1 }} />
          <View style={{ width: 12, height: 6, borderRadius: 3, backgroundColor: '#3B82F6' }} />
        </View>
        <View style={{ position: 'absolute', top: 0, right: 0, width: 28, height: 28, borderRadius: 6, backgroundColor: '#2A2520', borderWidth: 1, borderColor: '#6B5C4E', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 14, height: 18, backgroundColor: '#E8DCC8', borderRadius: 2, padding: 2 }}>
            <View style={{ height: 2, backgroundColor: '#6B5C4E', borderRadius: 1, marginBottom: 2 }} />
            <View style={{ height: 2, backgroundColor: '#6B5C4E', borderRadius: 1, marginBottom: 2, width: '80%' }} />
            <View style={{ height: 2, backgroundColor: '#6B5C4E', borderRadius: 1, width: '60%' }} />
          </View>
        </View>
        <View style={{ position: 'absolute', bottom: 0, left: 0, width: 28, height: 28, borderRadius: 6, backgroundColor: '#14291A', borderWidth: 1, borderColor: '#22C55E', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#22C55E', marginBottom: -2 }} />
          <View style={{ width: 3, height: 6, backgroundColor: '#22C55E', borderRadius: 1 }} />
        </View>
        <View style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 6, backgroundColor: '#2A1F0A', borderWidth: 1, borderColor: '#F59E0B', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
          <View style={{ width: 9, height: 9, borderRadius: 4.5, borderWidth: 2, borderColor: '#F59E0B', marginRight: -3 }} />
          <View style={{ width: 9, height: 9, borderRadius: 4.5, borderWidth: 2, borderColor: '#F59E0B' }} />
        </View>
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#2A2520', borderWidth: 2, borderColor: '#6B5C4E', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
          <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#E8DCC8', position: 'absolute', top: 5, left: 5 }} />
          <View style={{ position: 'absolute', bottom: 4, right: 4, width: 7, height: 2, backgroundColor: '#E8DCC8', borderRadius: 1, transform: [{ rotate: '45deg' }] }} />
        </View>
      </View>
    </View>
  );
}

function TimelinePreview() {
  const dots: { color: string; year: string }[] = [
    { color: '#C41E3A', year: '2019' },
    { color: '#F59E0B', year: '2021' },
    { color: '#3B82F6', year: '2022' },
    { color: '#22C55E', year: '2024' },
  ];
  return (
    <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 10 }}>
      <View style={{ height: 50, position: 'relative', justifyContent: 'center' }}>
        <View style={{ position: 'absolute', top: 15, left: 0, right: 0, height: 2, backgroundColor: '#3D332C', borderRadius: 1 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {dots.map((dot) => (
            <View key={dot.year} style={{ alignItems: 'center', width: 28 }}>
              <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: dot.color, marginTop: 8 }} />
              <Text style={{ color: '#6B5C4E', fontSize: 8, marginTop: 4 }}>{dot.year}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function CaseFilePreview() {
  const bars: { color: string }[] = [
    { color: '#C41E3A' }, { color: '#3B82F6' }, { color: '#F59E0B' }, { color: '#22C55E' },
  ];
  return (
    <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 14, gap: 10 }}>
      {bars.map((bar, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: bar.color, flexShrink: 0 }} />
          <View style={{ flex: 1, height: 12, backgroundColor: '#2A2520', borderRadius: 4 }} />
        </View>
      ))}
    </View>
  );
}

const STYLE_CARDS: {
  id: BoardStyle;
  emoji: string;
  title: string;
  description: string;
  Preview: () => React.ReactElement;
}[] = [
  { id: 'corkboard', emoji: '🪵', title: 'Corkboard', description: 'Physical pins, red string connections. Classic detective style.', Preview: CorkboardPreview },
  { id: 'mindmap', emoji: '🕸️', title: 'Mind Map', description: 'Web of nodes, visual connections. See the full picture.', Preview: MindMapPreview },
  { id: 'timeline', emoji: '📅', title: 'Timeline', description: 'Chronological events, date-based investigation flow.', Preview: TimelinePreview },
  { id: 'casefile', emoji: '📋', title: 'Case File', description: 'Structured list view. Organized, scannable, methodical.', Preview: CaseFilePreview },
];

// ─── Permission toggle rows ───────────────────────────────────────
const PERM_KEYS: { key: keyof RolePermissions; label: string }[] = [
  { key: 'canDownloadPdf', label: 'Can download PDF dossier' },
  { key: 'canSaveNodes', label: 'Can save nodes or images' },
  { key: 'canShareExternally', label: 'Can share externally' },
  { key: 'canScreenshot', label: 'Can screenshot' },
  { key: 'canExportPresentation', label: 'Can export presentation' },
  { key: 'canExportTimeline', label: 'Can export timeline' },
  { key: 'canViewChainOfCustody', label: 'Can view chain of custody' },
];

interface RoleCardProps {
  role: 'collaborator' | 'viewer' | 'guest';
  label: string;
  borderColor: string;
  permissions: RolePermissions;
  onToggle: (key: keyof RolePermissions, value: boolean) => void;
  fontsLoaded: boolean;
}

function RoleCard({ role, label, borderColor, permissions, onToggle, fontsLoaded }: RoleCardProps) {
  return (
    <View
      style={{
        backgroundColor: '#231F1C',
        borderRadius: 14,
        borderLeftWidth: 4,
        borderLeftColor: borderColor,
        borderWidth: 1,
        borderColor: '#3D332C',
        marginBottom: 14,
        overflow: 'hidden',
      }}
    >
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 }}>
        <Text
          style={{
            color: borderColor,
            fontSize: 11,
            fontFamily: fontsLoaded ? 'CourierPrime_700Bold' : undefined,
            fontWeight: '800',
            letterSpacing: 2,
          }}
        >
          {label}
        </Text>
      </View>
      {PERM_KEYS.map(({ key, label: permLabel }, idx) => (
        <View
          key={key}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderTopWidth: idx === 0 ? 1 : 0,
            borderTopColor: '#2A2520',
          }}
        >
          <Text
            style={{
              color: '#E8DCC8',
              fontSize: 12,
              fontFamily: fontsLoaded ? 'CourierPrime_400Regular' : undefined,
              flex: 1,
              marginRight: 12,
            }}
          >
            {permLabel}
          </Text>
          <Switch
            testID={`perm-${role}-${key}`}
            value={permissions[key]}
            onValueChange={(v) => onToggle(key, v)}
            trackColor={{ false: '#3D332C', true: 'rgba(196,30,58,0.4)' }}
            thumbColor={permissions[key] ? '#C41E3A' : '#6B5C4E'}
            ios_backgroundColor="#3D332C"
          />
        </View>
      ))}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────
export default function NewCaseScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [selectedStyle, setSelectedStyle] = useState<BoardStyle>('corkboard');
  const [name, setName] = useState<string>('');
  const [permissions, setPermissions] = useState<InvestigationPermissions>(DEFAULT_PERMISSIONS);
  const [selectedPreset, setSelectedPreset] = useState<string>('Custom');

  const createInvestigation = useInvestigationStore((s) => s.createInvestigation);
  const setActiveInvestigation = useInvestigationStore((s) => s.setActiveInvestigation);
  const updateInvestigationMeta = useInvestigationStore((s) => s.updateInvestigationMeta);

  const [fontsLoaded] = useFonts({
    BebasNeue_400Regular,
    CourierPrime_400Regular,
    CourierPrime_700Bold,
  });

  const canCreate = name.trim().length > 0;

  const updatePerm = (role: 'collaborator' | 'viewer' | 'guest', key: keyof RolePermissions, value: boolean) => {
    setPermissions((prev) => ({
      ...prev,
      [role]: { ...prev[role], [key]: value },
    }));
  };

  const handleCreate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const id = createInvestigation(name.trim(), undefined);
    setActiveInvestigation(id);
    updateInvestigationMeta(id, {
      icon: STYLE_CARDS.find((c) => c.id === selectedStyle)?.emoji ?? '🔍',
      iconUri: undefined,
      boardStyle: selectedStyle,
      filingTabColor: undefined,
      filingTabLabel: undefined,
      permissions,
    });
    router.replace('/(tabs)/two');
  };

  const handleNext = () => {
    if (!canCreate) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(2);
  };

  // ── Step 1 ──
  if (step === 1) {
    return (
      <View style={{ flex: 1, backgroundColor: '#1A1614' }} testID="new-case-screen">
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={0}
          >
            {/* ── Header ── */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, gap: 12 }}>
              <Pressable
                testID="new-case-back-button"
                onPress={() => router.back()}
                style={({ pressed }) => ({
                  width: 40, height: 40, borderRadius: 12,
                  backgroundColor: pressed ? '#3D332C' : '#231F1C',
                  alignItems: 'center', justifyContent: 'center',
                  borderWidth: 1, borderColor: '#3D332C', flexShrink: 0,
                })}
              >
                <Text style={{ color: '#E8DCC8', fontSize: 20, lineHeight: 22, fontWeight: '300' }}>{'←'}</Text>
              </Pressable>
              <Text
                style={{
                  fontFamily: fontsLoaded ? 'BebasNeue_400Regular' : undefined,
                  fontSize: 28, letterSpacing: 4, color: '#E8DCC8',
                }}
              >
                NEW CASE
              </Text>
            </View>

            <Text
              style={{
                color: '#6B5C4E', fontSize: 12,
                fontFamily: fontsLoaded ? 'CourierPrime_400Regular' : undefined,
                textAlign: 'center', marginBottom: 20, letterSpacing: 0.5,
              }}
            >
              Choose your investigation style
            </Text>

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
                      {isSelected ? (
                        <View style={{ position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 11, backgroundColor: '#C41E3A', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                          <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '800' }}>✓</Text>
                        </View>
                      ) : null}
                      <View style={{ height: 150, backgroundColor: '#1A1614', borderBottomWidth: 1, borderBottomColor: '#3D332C' }}>
                        <Preview />
                      </View>
                      <View style={{ padding: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <Text style={{ fontSize: 16 }}>{card.emoji}</Text>
                          <Text style={{ color: '#E8DCC8', fontSize: 14, fontFamily: fontsLoaded ? 'CourierPrime_700Bold' : undefined, fontWeight: '700' }}>
                            {card.title}
                          </Text>
                        </View>
                        <Text style={{ color: '#6B5C4E', fontSize: 10, fontFamily: fontsLoaded ? 'CourierPrime_400Regular' : undefined, lineHeight: 14 }}>
                          {card.description}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            {/* ── Bottom: Name input + NEXT button ── */}
            <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24, borderTopWidth: 1, borderTopColor: '#3D332C', backgroundColor: '#1A1614', gap: 12 }}>
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
                returnKeyType="next"
                onSubmitEditing={handleNext}
              />
              <Pressable
                testID="next-step-button"
                onPress={handleNext}
                disabled={!canCreate}
                style={({ pressed }) => ({
                  backgroundColor: canCreate ? (pressed ? '#A01830' : '#C41E3A') : '#3D332C',
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
                <Text style={{ color: canCreate ? '#FFF' : '#6B5C4E', fontSize: 15, fontFamily: fontsLoaded ? 'CourierPrime_700Bold' : undefined, fontWeight: '700', letterSpacing: 1 }}>
                  NEXT →
                </Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    );
  }

  // ── Step 2: Permissions ──
  return (
    <View style={{ flex: 1, backgroundColor: '#1A1614' }} testID="permissions-step-screen">
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, gap: 12 }}>
          <Pressable
            testID="permissions-back-button"
            onPress={() => setStep(1)}
            style={({ pressed }) => ({
              width: 40, height: 40, borderRadius: 12,
              backgroundColor: pressed ? '#3D332C' : '#231F1C',
              alignItems: 'center', justifyContent: 'center',
              borderWidth: 1, borderColor: '#3D332C', flexShrink: 0,
            })}
          >
            <Text style={{ color: '#E8DCC8', fontSize: 20, lineHeight: 22, fontWeight: '300' }}>{'←'}</Text>
          </Pressable>
          <Text
            style={{
              fontFamily: fontsLoaded ? 'BebasNeue_400Regular' : undefined,
              fontSize: 28, letterSpacing: 4, color: '#E8DCC8',
            }}
          >
            ACCESS PERMISSIONS
          </Text>
        </View>

        <Text
          style={{
            color: '#6B5C4E', fontSize: 12,
            fontFamily: fontsLoaded ? 'CourierPrime_400Regular' : undefined,
            textAlign: 'center', marginBottom: 20, letterSpacing: 0.5,
          }}
        >
          Set default permissions per role
        </Text>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
        >
          {/* Permission Presets */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            {[
              { label: 'Read Only', desc: 'Viewers can only look' },
              { label: 'Full Access', desc: 'Collaborators can do everything' },
              { label: 'Custom', desc: 'Set manually below' },
            ].map(preset => (
              <Pressable
                key={preset.label}
                onPress={() => {
                  if (preset.label === 'Read Only') {
                    setPermissions(READ_ONLY_PERMISSIONS);
                  } else if (preset.label === 'Full Access') {
                    setPermissions(FULL_ACCESS_PERMISSIONS);
                  }
                  setSelectedPreset(preset.label);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={{ flex: 1, padding: 10, borderRadius: 10, borderWidth: 1.5,
                  borderColor: selectedPreset === preset.label ? '#C41E3A' : '#3D332C',
                  backgroundColor: selectedPreset === preset.label ? 'rgba(196,30,58,0.08)' : '#1A1714',
                  alignItems: 'center' }}
              >
                <Text style={{ color: '#E8DCC8', fontSize: 12, fontWeight: '700' }}>{preset.label}</Text>
                <Text style={{ color: '#6B5B4F', fontSize: 9, marginTop: 2, textAlign: 'center' }}>{preset.desc}</Text>
              </Pressable>
            ))}
          </View>

          <RoleCard
            role="collaborator"
            label="COLLABORATOR"
            borderColor="#C41E3A"
            permissions={permissions.collaborator}
            onToggle={(key, value) => { updatePerm('collaborator', key, value); setSelectedPreset('Custom'); }}
            fontsLoaded={fontsLoaded}
          />
          <RoleCard
            role="viewer"
            label="VIEWER"
            borderColor="#3B82F6"
            permissions={permissions.viewer}
            onToggle={(key, value) => { updatePerm('viewer', key, value); setSelectedPreset('Custom'); }}
            fontsLoaded={fontsLoaded}
          />
          <RoleCard
            role="guest"
            label="GUEST"
            borderColor="#6B5C4E"
            permissions={permissions.guest}
            onToggle={(key, value) => { updatePerm('guest', key, value); setSelectedPreset('Custom'); }}
            fontsLoaded={fontsLoaded}
          />

          <Text style={{ color: '#6B5B4F', fontSize: 12, textAlign: 'center', marginTop: 12 }}>
            You can change permissions anytime in Investigation Settings
          </Text>
        </ScrollView>

        {/* Create button pinned at bottom */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingBottom: 36, paddingTop: 16, backgroundColor: '#1A1614', borderTopWidth: 1, borderTopColor: '#3D332C' }}>
          <Pressable
            testID="create-investigation-button"
            onPress={handleCreate}
            style={({ pressed }) => ({
              backgroundColor: pressed ? '#A01830' : '#C41E3A',
              borderRadius: 28,
              paddingVertical: 16,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#C41E3A',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.35,
              shadowRadius: 10,
              elevation: 6,
            })}
          >
            <Text style={{ color: '#FFF', fontSize: 15, fontFamily: fontsLoaded ? 'CourierPrime_700Bold' : undefined, fontWeight: '700', letterSpacing: 1 }}>
              CREATE INVESTIGATION
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
