import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
} from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import {
  Twitter,
  Video,
  Globe,
  User,
  FileText,
  Image as ImageIcon,
  Music,
  X,
  Plus,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import type { NodeSource } from '@/lib/types';

const C = {
  bg: '#1A1614',
  surface: '#231F1C',
  red: '#C41E3A',
  pin: '#D4A574',
  text: '#E8DCC8',
  muted: '#6B5B4F',
  border: '#3D332C',
} as const;

type SourcePlatform = NonNullable<NodeSource['platform']>;
type ContentType = NonNullable<NodeSource['contentType']>;
type Credibility = NodeSource['credibility'];

interface PlatformOption {
  key: SourcePlatform | 'person' | 'document' | 'other';
  label: string;
  Icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }>;
}

const PLATFORM_OPTIONS: PlatformOption[] = [
  { key: 'x', label: 'X / Twitter', Icon: Twitter },
  { key: 'tiktok', label: 'TikTok', Icon: Video },
  { key: 'instagram', label: 'Instagram', Icon: ImageIcon },
  { key: 'youtube', label: 'YouTube', Icon: Video },
  { key: 'facebook', label: 'Facebook', Icon: Globe },
  { key: 'website', label: 'Website', Icon: Globe },
  { key: 'podcast', label: 'Podcast', Icon: Music },
  { key: 'person', label: 'Person', Icon: User },
  { key: 'document', label: 'Document', Icon: FileText },
  { key: 'other', label: 'Other', Icon: Globe },
];

const CONTENT_TYPES: { key: ContentType; label: string }[] = [
  { key: 'article', label: 'Article' },
  { key: 'video', label: 'Video' },
  { key: 'testimony', label: 'Testimony' },
  { key: 'tip', label: 'Tip' },
  { key: 'evidence', label: 'Evidence' },
  { key: 'document', label: 'Document' },
];

const CREDIBILITY_OPTIONS: { key: Credibility; label: string; color: string }[] = [
  { key: 'primary', label: 'Primary', color: '#3B82F6' },
  { key: 'secondary', label: 'Secondary', color: '#F59E0B' },
  { key: 'unverified', label: 'Unverified', color: '#6B5B4F' },
  { key: 'confirmed', label: 'Confirmed', color: '#22C55E' },
  { key: 'disputed', label: 'Disputed', color: '#C41E3A' },
];

function getNamePlaceholder(platform: SourcePlatform | 'person' | 'document' | 'other' | null): string {
  if (!platform) return 'Source name or handle';
  if (platform === 'x' || platform === 'tiktok' || platform === 'instagram') return '@username';
  if (platform === 'person') return 'Full name';
  if (platform === 'document') return 'Document title';
  return 'Publication or source name';
}

interface AddSourceSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onAdd: (source: Omit<NodeSource, 'id' | 'addedAt'>) => void;
}

export default function AddSourceSheet({ isVisible, onClose, onAdd }: AddSourceSheetProps) {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['80%', '95%'], []);

  const [selectedPlatform, setSelectedPlatform] = useState<SourcePlatform | 'person' | 'document' | 'other' | null>(null);
  const [sourceName, setSourceName] = useState<string>('');
  const [sourceUrl, setSourceUrl] = useState<string>('');
  const [secondarySource, setSecondarySource] = useState<string>('');
  const [selectedContentType, setSelectedContentType] = useState<ContentType | null>(null);
  const [contentSummary, setContentSummary] = useState<string>('');
  const [credibility, setCredibility] = useState<Credibility>('unverified');

  // Sync visibility with sheet
  React.useEffect(() => {
    if (isVisible) {
      sheetRef.current?.snapToIndex(0);
    } else {
      sheetRef.current?.close();
    }
  }, [isVisible]);

  const resetForm = useCallback(() => {
    setSelectedPlatform(null);
    setSourceName('');
    setSourceUrl('');
    setSecondarySource('');
    setSelectedContentType(null);
    setContentSummary('');
    setCredibility('unverified');
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handleAdd = useCallback(() => {
    if (!sourceName.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const platformToSourceType = (): NodeSource['sourceType'] => {
      if (selectedPlatform === 'person') return 'person';
      if (selectedPlatform === 'document') return 'document';
      if (selectedPlatform === 'x') return 'x_user';
      if (selectedPlatform === 'tiktok') return 'tiktok_user';
      if (selectedPlatform === 'instagram') return 'instagram_user';
      if (sourceUrl) return 'url';
      return 'other';
    };

    const resolvedPlatform = (): NodeSource['platform'] | undefined => {
      if (selectedPlatform === 'person' || selectedPlatform === 'document' || selectedPlatform === 'other') return 'other';
      return selectedPlatform ?? undefined;
    };

    onAdd({
      sourceType: platformToSourceType(),
      sourceName: sourceName.trim(),
      sourceUrl: sourceUrl.trim() || undefined,
      platform: resolvedPlatform(),
      contentType: selectedContentType ?? undefined,
      contentSummary: contentSummary.trim() || undefined,
      secondarySourceName: secondarySource.trim() || undefined,
      credibility,
    });

    resetForm();
    onClose();
  }, [sourceName, sourceUrl, selectedPlatform, selectedContentType, contentSummary, secondarySource, credibility, onAdd, resetForm, onClose]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
        onPress={handleClose}
      />
    ),
    [handleClose]
  );

  const canSubmit = sourceName.trim().length > 0;

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: C.surface }}
      handleIndicatorStyle={{ backgroundColor: C.muted }}
      backdropComponent={renderBackdrop}
      onChange={(index: number) => {
        if (index === -1) {
          handleClose();
        }
      }}
    >
      <BottomSheetScrollView
        style={{ paddingHorizontal: 20 }}
        contentContainerStyle={{ paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <Text style={{ color: C.text, fontSize: 18, fontWeight: '800', letterSpacing: 0.5 }}>
            Add Source
          </Text>
          <Pressable onPress={handleClose} testID="add-source-close">
            <X size={20} color={C.muted} strokeWidth={2} />
          </Pressable>
        </View>

        {/* Platform selector */}
        <Text style={{ color: C.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10 }}>
          PLATFORM
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, marginBottom: 20 }}
          contentContainerStyle={{ gap: 8, paddingRight: 8 }}
        >
          {PLATFORM_OPTIONS.map((opt) => {
            const isSelected = selectedPlatform === opt.key;
            return (
              <Pressable
                key={opt.key}
                testID={`platform-${opt.key}`}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedPlatform(isSelected ? null : opt.key as SourcePlatform);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: isSelected ? C.red : C.bg,
                  borderWidth: 1,
                  borderColor: isSelected ? C.red : C.border,
                }}
              >
                <opt.Icon size={13} color={isSelected ? '#FFF' : C.muted} strokeWidth={2} />
                <Text style={{ color: isSelected ? '#FFF' : C.muted, fontSize: 12, fontWeight: '600' }}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Source name */}
        <Text style={{ color: C.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 }}>
          NAME OR HANDLE
        </Text>
        <BottomSheetTextInput
          testID="source-name-input"
          value={sourceName}
          onChangeText={setSourceName}
          placeholder={getNamePlaceholder(selectedPlatform)}
          placeholderTextColor={C.muted}
          style={{
            backgroundColor: C.bg,
            borderRadius: 10,
            padding: 14,
            color: C.text,
            fontSize: 16,
            borderWidth: 1,
            borderColor: C.border,
            marginBottom: 16,
          }}
        />

        {/* Source URL */}
        <Text style={{ color: C.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 }}>
          LINK TO CONTENT
        </Text>
        <BottomSheetTextInput
          testID="source-url-input"
          value={sourceUrl}
          onChangeText={setSourceUrl}
          placeholder="https://..."
          placeholderTextColor={C.muted}
          autoCapitalize="none"
          keyboardType="url"
          style={{
            backgroundColor: C.bg,
            borderRadius: 10,
            padding: 14,
            color: C.text,
            fontSize: 15,
            borderWidth: 1,
            borderColor: C.border,
            marginBottom: 16,
          }}
        />

        {/* Via / Secondary source */}
        <Text style={{ color: C.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 4 }}>
          ORIGINALLY FROM (OPTIONAL)
        </Text>
        <Text style={{ color: C.muted, fontSize: 11, marginBottom: 8, lineHeight: 16 }}>
          e.g. if an X user showed you an Epoch Times article, put Epoch Times here
        </Text>
        <BottomSheetTextInput
          testID="secondary-source-input"
          value={secondarySource}
          onChangeText={setSecondarySource}
          placeholder="e.g. Epoch Times"
          placeholderTextColor={C.muted}
          style={{
            backgroundColor: C.bg,
            borderRadius: 10,
            padding: 14,
            color: C.text,
            fontSize: 15,
            borderWidth: 1,
            borderColor: C.border,
            marginBottom: 20,
          }}
        />

        {/* Content type */}
        <Text style={{ color: C.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10 }}>
          CONTENT TYPE
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {CONTENT_TYPES.map((ct) => {
            const isSelected = selectedContentType === ct.key;
            return (
              <Pressable
                key={ct.key}
                testID={`content-type-${ct.key}`}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedContentType(isSelected ? null : ct.key);
                }}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: isSelected ? C.red : C.bg,
                  borderWidth: 1,
                  borderColor: isSelected ? C.red : C.border,
                }}
              >
                <Text style={{ color: isSelected ? '#FFF' : C.muted, fontSize: 13, fontWeight: '600' }}>
                  {ct.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* What they contributed */}
        <Text style={{ color: C.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 }}>
          WHAT DID THEY CONTRIBUTE?
        </Text>
        <BottomSheetTextInput
          testID="content-summary-input"
          value={contentSummary}
          onChangeText={setContentSummary}
          placeholder="Brief description of this source's contribution..."
          placeholderTextColor={C.muted}
          multiline
          style={{
            backgroundColor: C.bg,
            borderRadius: 10,
            padding: 14,
            color: C.text,
            fontSize: 15,
            borderWidth: 1,
            borderColor: C.border,
            minHeight: 80,
            textAlignVertical: 'top',
            marginBottom: 20,
          }}
        />

        {/* Credibility */}
        <Text style={{ color: C.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10 }}>
          CREDIBILITY
        </Text>
        <View style={{ flexDirection: 'row', backgroundColor: C.bg, borderRadius: 10, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 28 }}>
          {CREDIBILITY_OPTIONS.map((opt, idx) => {
            const isSelected = credibility === opt.key;
            return (
              <Pressable
                key={opt.key}
                testID={`credibility-${opt.key}`}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setCredibility(opt.key);
                }}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  alignItems: 'center',
                  backgroundColor: isSelected ? opt.color + '30' : 'transparent',
                  borderLeftWidth: idx > 0 ? 1 : 0,
                  borderLeftColor: C.border,
                }}
              >
                <Text style={{ color: isSelected ? opt.color : C.muted, fontSize: 10, fontWeight: '700', textAlign: 'center' }}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Submit button */}
        <Pressable
          testID="add-source-submit"
          onPress={handleAdd}
          disabled={!canSubmit}
          style={({ pressed }) => ({
            backgroundColor: canSubmit ? (pressed ? '#A3162E' : C.red) : C.border,
            borderRadius: 12,
            paddingVertical: 16,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
          })}
        >
          <Plus size={18} color={canSubmit ? '#FFF' : C.muted} strokeWidth={2.5} />
          <Text style={{ color: canSubmit ? '#FFF' : C.muted, fontSize: 16, fontWeight: '800' }}>
            Add Source
          </Text>
        </Pressable>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
