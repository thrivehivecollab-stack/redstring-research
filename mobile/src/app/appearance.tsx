import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, RotateCcw } from 'lucide-react-native';
import {
  useFonts,
  BebasNeue_400Regular,
} from '@expo-google-fonts/bebas-neue';
import {
  CourierPrime_400Regular,
  CourierPrime_700Bold,
} from '@expo-google-fonts/courier-prime';
import useAppearanceStore from '@/lib/state/appearance-store';
import type { HeroTitleFont, AccentColorKey } from '@/lib/theme';

// Dark corkboard aesthetic colors
const C = {
  bg: '#1A1614',
  surface: '#231F1C',
  surface2: '#2D2825',
  text: '#E8DCC8',
  muted: '#6B5B4F',
  border: '#3D332C',
  red: '#C41E3A',
  redDark: '#A3162E',
} as const;

// ─── Hero font options ────────────────────────────────────────────────────────
const HERO_FONT_OPTIONS: { key: HeroTitleFont; label: string }[] = [
  { key: 'playfair', label: 'Playfair Display' },
  { key: 'abril', label: 'Abril Fatface' },
  { key: 'specialElite', label: 'Special Elite' },
  { key: 'fjalla', label: 'Fjalla One' },
  { key: 'crimsonPro', label: 'Crimson Pro' },
  { key: 'libreBaskerville', label: 'Libre Baskerville' },
  { key: 'teko', label: 'Teko' },
];

// ─── Accent color options ─────────────────────────────────────────────────────
const ACCENT_COLOR_OPTIONS: { key: AccentColorKey; hex: string; label: string }[] = [
  { key: 'crimson', hex: '#C41E3A', label: 'Crimson' },
  { key: 'navy', hex: '#1E3A5F', label: 'Navy' },
  { key: 'forest', hex: '#1A4731', label: 'Forest' },
  { key: 'amber', hex: '#C47A1E', label: 'Amber' },
  { key: 'slate', hex: '#3A4A5C', label: 'Slate' },
];

// ─── Tape color presets ───────────────────────────────────────────────────────
const TAPE_COLOR_OPTIONS: { hex: string; label: string }[] = [
  { hex: '#D4C5A9', label: 'Beige' },
  { hex: '#C41E3A', label: 'Red' },
  { hex: '#3B82F6', label: 'Blue' },
  { hex: '#F59E0B', label: 'Yellow' },
  { hex: '#EC4899', label: 'Pink' },
  { hex: '#1A1A1A', label: 'Black' },
];

// ─── Pushpin color presets ────────────────────────────────────────────────────
const PUSHPIN_COLOR_OPTIONS: { hex: string; label: string }[] = [
  { hex: '#C8934A', label: 'Brass' },
  { hex: '#C41E3A', label: 'Red' },
  { hex: '#3B82F6', label: 'Blue' },
  { hex: '#22C55E', label: 'Green' },
  { hex: '#F59E0B', label: 'Gold' },
  { hex: '#A855F7', label: 'Purple' },
];

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  return (
    <Text
      style={{
        color: C.muted,
        fontSize: 9,
        fontFamily: 'CourierPrime_700Bold',
        letterSpacing: 2,
        marginBottom: 10,
        marginTop: 24,
      }}
    >
      {title}
    </Text>
  );
}

// ─── Option chip button ───────────────────────────────────────────────────────
function OptionChip({
  label,
  selected,
  onPress,
  testID,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: selected ? C.red : C.border,
        backgroundColor: selected
          ? 'rgba(196,30,58,0.15)'
          : pressed
          ? C.surface2
          : C.surface,
        marginRight: 8,
        marginBottom: 8,
      })}
    >
      <Text
        style={{
          color: selected ? C.red : C.text,
          fontSize: 13,
          fontFamily: 'CourierPrime_400Regular',
          fontWeight: selected ? '700' : '400',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Color swatch ─────────────────────────────────────────────────────────────
function ColorSwatch({
  hex,
  label,
  selected,
  onPress,
  testID,
}: {
  hex: string;
  label: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={{ alignItems: 'center', marginRight: 14, marginBottom: 8 }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: hex,
          borderWidth: selected ? 2.5 : 1.5,
          borderColor: selected ? C.text : C.border,
          shadowColor: selected ? hex : 'transparent',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: selected ? 0.6 : 0,
          shadowRadius: 6,
          elevation: selected ? 4 : 0,
        }}
      />
      <Text
        style={{
          color: selected ? C.text : C.muted,
          fontSize: 9,
          fontFamily: 'CourierPrime_400Regular',
          marginTop: 4,
          letterSpacing: 0.5,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function AppearanceScreen() {
  const router = useRouter();

  // Select each store value individually to avoid infinite renders
  const heroFont = useAppearanceStore((s) => s.heroFont);
  const setHeroFont = useAppearanceStore((s) => s.setHeroFont);
  const themeMode = useAppearanceStore((s) => s.themeMode);
  const setThemeMode = useAppearanceStore((s) => s.setThemeMode);
  const accentColor = useAppearanceStore((s) => s.accentColor);
  const setAccentColor = useAppearanceStore((s) => s.setAccentColor);
  const corkIntensity = useAppearanceStore((s) => s.corkIntensity);
  const setCorkIntensity = useAppearanceStore((s) => s.setCorkIntensity);
  const tapeColor = useAppearanceStore((s) => s.tapeColor);
  const setTapeColor = useAppearanceStore((s) => s.setTapeColor);
  const pushpinColor = useAppearanceStore((s) => s.pushpinColor);
  const setPushpinColor = useAppearanceStore((s) => s.setPushpinColor);
  const resetToDefaults = useAppearanceStore((s) => s.resetToDefaults);

  const [fontsLoaded] = useFonts({
    BebasNeue_400Regular,
    CourierPrime_400Regular,
    CourierPrime_700Bold,
  });

  const CORK_OPTIONS: { value: 0 | 1 | 2 | 3; label: string }[] = [
    { value: 0, label: 'None' },
    { value: 1, label: 'Low' },
    { value: 2, label: 'Medium' },
    { value: 3, label: 'High' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }} testID="appearance-screen">
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 14,
            borderBottomWidth: 1,
            borderBottomColor: C.border,
          }}
        >
          <Pressable
            testID="appearance-back-button"
            onPress={() => router.back()}
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: pressed ? C.surface2 : C.surface,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: C.border,
              marginRight: 12,
            })}
          >
            <ChevronLeft size={20} color={C.text} strokeWidth={2} />
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: fontsLoaded ? 'BebasNeue_400Regular' : undefined,
                fontSize: 22,
                letterSpacing: 3,
                color: C.text,
                lineHeight: 24,
              }}
            >
              APPEARANCE
            </Text>
            <Text
              style={{
                color: C.muted,
                fontSize: 10,
                fontFamily: fontsLoaded ? 'CourierPrime_400Regular' : undefined,
                letterSpacing: 1,
                marginTop: 1,
              }}
            >
              Themes, fonts &amp; board style
            </Text>
          </View>

          <Pressable
            testID="appearance-reset-button"
            onPress={resetToDefaults}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              paddingHorizontal: 10,
              paddingVertical: 7,
              borderRadius: 9,
              backgroundColor: pressed ? C.surface2 : C.surface,
              borderWidth: 1,
              borderColor: C.border,
            })}
          >
            <RotateCcw size={13} color={C.muted} strokeWidth={2} />
            <Text
              style={{
                color: C.muted,
                fontSize: 11,
                fontFamily: fontsLoaded ? 'CourierPrime_400Regular' : undefined,
              }}
            >
              Reset
            </Text>
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48 }}
        >
          {/* ── Theme Mode ── */}
          <SectionHeader title="THEME MODE" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {(['dark', 'sepia', 'light'] as const).map((mode) => (
              <OptionChip
                key={mode}
                testID={`theme-mode-${mode}`}
                label={mode.charAt(0).toUpperCase() + mode.slice(1)}
                selected={themeMode === mode}
                onPress={() => setThemeMode(mode)}
              />
            ))}
          </View>

          {/* ── Hero Font ── */}
          <SectionHeader title="HERO FONT" />
          <Text
            style={{
              color: C.muted,
              fontSize: 10,
              fontFamily: fontsLoaded ? 'CourierPrime_400Regular' : undefined,
              marginBottom: 10,
            }}
          >
            Used for investigation titles and headings
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {HERO_FONT_OPTIONS.map((opt) => (
              <OptionChip
                key={opt.key}
                testID={`hero-font-${opt.key}`}
                label={opt.label}
                selected={heroFont === opt.key}
                onPress={() => setHeroFont(opt.key)}
              />
            ))}
          </View>

          {/* ── Accent Color ── */}
          <SectionHeader title="ACCENT COLOR" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
            {ACCENT_COLOR_OPTIONS.map((opt) => (
              <ColorSwatch
                key={opt.key}
                testID={`accent-color-${opt.key}`}
                hex={opt.hex}
                label={opt.label}
                selected={accentColor === opt.key}
                onPress={() => setAccentColor(opt.key)}
              />
            ))}
          </View>

          {/* ── Cork Intensity ── */}
          <SectionHeader title="CORK BOARD TEXTURE" />
          <Text
            style={{
              color: C.muted,
              fontSize: 10,
              fontFamily: fontsLoaded ? 'CourierPrime_400Regular' : undefined,
              marginBottom: 10,
            }}
          >
            Controls the background cork texture intensity
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {CORK_OPTIONS.map((opt) => (
              <OptionChip
                key={opt.value}
                testID={`cork-intensity-${opt.value}`}
                label={opt.label}
                selected={corkIntensity === opt.value}
                onPress={() => setCorkIntensity(opt.value)}
              />
            ))}
          </View>

          {/* ── Tape Color ── */}
          <SectionHeader title="TAPE COLOR" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
            {TAPE_COLOR_OPTIONS.map((opt) => (
              <ColorSwatch
                key={opt.hex}
                testID={`tape-color-${opt.label.toLowerCase()}`}
                hex={opt.hex}
                label={opt.label}
                selected={tapeColor === opt.hex}
                onPress={() => setTapeColor(opt.hex)}
              />
            ))}
          </View>

          {/* ── Pushpin Color ── */}
          <SectionHeader title="PUSHPIN COLOR" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
            {PUSHPIN_COLOR_OPTIONS.map((opt) => (
              <ColorSwatch
                key={opt.hex}
                testID={`pushpin-color-${opt.label.toLowerCase()}`}
                hex={opt.hex}
                label={opt.label}
                selected={pushpinColor === opt.hex}
                onPress={() => setPushpinColor(opt.hex)}
              />
            ))}
          </View>

          {/* Preview strip */}
          <View
            style={{
              marginTop: 28,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: C.border,
              overflow: 'hidden',
              backgroundColor: C.surface,
            }}
          >
            <View
              style={{
                height: 4,
                backgroundColor: ACCENT_COLOR_OPTIONS.find((o) => o.key === accentColor)?.hex ?? C.red,
              }}
            />
            <View style={{ padding: 16 }}>
              <Text
                style={{
                  color: C.muted,
                  fontSize: 9,
                  fontFamily: fontsLoaded ? 'CourierPrime_700Bold' : undefined,
                  letterSpacing: 2,
                  marginBottom: 6,
                }}
              >
                PREVIEW
              </Text>
              <Text
                style={{
                  color: C.text,
                  fontSize: 20,
                  letterSpacing: 0.5,
                  marginBottom: 4,
                }}
              >
                Investigation Title
              </Text>
              <Text
                style={{
                  color: C.muted,
                  fontSize: 11,
                  fontFamily: fontsLoaded ? 'CourierPrime_400Regular' : undefined,
                  lineHeight: 16,
                }}
              >
                Font: {HERO_FONT_OPTIONS.find((f) => f.key === heroFont)?.label} &middot; Theme:{' '}
                {themeMode.charAt(0).toUpperCase() + themeMode.slice(1)}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 12,
                }}
              >
                {/* Tape swatch */}
                <View
                  style={{
                    width: 32,
                    height: 8,
                    borderRadius: 3,
                    backgroundColor: tapeColor,
                    opacity: 0.75,
                  }}
                />
                {/* Pushpin dot */}
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: pushpinColor,
                    shadowColor: pushpinColor,
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.5,
                    shadowRadius: 3,
                    elevation: 2,
                  }}
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
