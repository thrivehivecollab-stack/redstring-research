import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TextInput,
  Pressable,
  Modal,
  Share,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  FileText,
  Edit2,
  Copy,
  Plus,
  Search,
  Check,
  X,
  BookOpen,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SCRIPTS_KEY = '@red_string_scripts';

const COLORS = {
  background: '#1A1614',
  surface: '#231F1C',
  card: '#F5ECD7',
  red: '#C41E3A',
  pin: '#D4A574',
  textLight: '#E8DCC8',
  muted: '#6B5B4F',
  border: '#3D332C',
  cardText: '#2C1810',
};

const CATEGORY_COLORS: Record<string, string> = {
  Interview: '#1E3A5F',
  FOIA: '#2D4A1E',
  'Source Contact': '#4A2D1E',
  Evidence: '#3A1E4A',
  Custom: '#1E3A3A',
};

const CATEGORIES = ['All', 'Interview', 'FOIA', 'Source Contact', 'Evidence', 'Custom'];

type Script = {
  id: string;
  title: string;
  category: string;
  body: string;
  variables: string[];
};

const INITIAL_SCRIPTS: Script[] = [
  {
    id: '1',
    title: 'Initial Contact - Whistleblower',
    category: 'Source Contact',
    body: 'My name is [YOUR_NAME] and I am a researcher investigating [TOPIC]. I came across your [PLATFORM] post about [SUBJECT] and wanted to reach out confidentially. Everything you share with me will be kept strictly off the record unless you give explicit permission.',
    variables: ['YOUR_NAME', 'TOPIC', 'PLATFORM', 'SUBJECT'],
  },
  {
    id: '2',
    title: 'FOIA Request Template',
    category: 'FOIA',
    body: 'Pursuant to the Freedom of Information Act (5 U.S.C. § 552), I am requesting records concerning [SUBJECT_MATTER] from [DATE_START] to [DATE_END]. Please provide all responsive documents in electronic format. I am willing to pay reasonable duplication fees.',
    variables: ['SUBJECT_MATTER', 'DATE_START', 'DATE_END'],
  },
  {
    id: '3',
    title: 'Interview - Government Official',
    category: 'Interview',
    body: "Thank you for agreeing to speak with me. I want to be transparent that I am documenting [INVESTIGATION_TOPIC]. Can you confirm your role at [AGENCY] and how long you have been in that position? Everything said here will be attributed to you by name unless otherwise agreed.",
    variables: ['INVESTIGATION_TOPIC', 'AGENCY'],
  },
  {
    id: '4',
    title: 'Evidence Documentation',
    category: 'Evidence',
    body: 'Item #[ITEM_NUMBER]: Obtained [DATE] from [SOURCE]. Description: [DESCRIPTION]. Chain of custody: [CUSTODY_NOTES]. This item has been photographed, logged, and stored in the secure evidence archive.',
    variables: ['ITEM_NUMBER', 'DATE', 'SOURCE', 'DESCRIPTION', 'CUSTODY_NOTES'],
  },
  {
    id: '5',
    title: 'Social Media Source Contact',
    category: 'Source Contact',
    body: 'Hi [USERNAME], I noticed your [POST_TYPE] about [TOPIC]. I\'m a researcher working on a [PUBLICATION_TYPE] piece. Would you be open to a brief conversation? All sources are kept confidential unless they choose otherwise.',
    variables: ['USERNAME', 'POST_TYPE', 'TOPIC', 'PUBLICATION_TYPE'],
  },
  {
    id: '6',
    title: 'On-Record Statement Request',
    category: 'Interview',
    body: 'For the record, I am asking [NAME] for an official statement regarding [SUBJECT] on [DATE]. Are you willing to provide an on-record comment? Your statement will be published in full with attribution.',
    variables: ['NAME', 'SUBJECT', 'DATE'],
  },
];

function detectVariables(text: string): string[] {
  const matches = text.match(/\[([A-Z_]+)\]/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.replace(/[\[\]]/g, '')))];
}

function renderPreview(body: string, vars: Record<string, string>): string {
  let result = body;
  Object.entries(vars).forEach(([key, value]) => {
    result = result.replace(new RegExp(`\\[${key}\\]`, 'g'), value || `[${key}]`);
  });
  return result;
}

// ---- Category Badge ----
function CategoryBadge({ category }: { category: string }) {
  const bg = CATEGORY_COLORS[category] ?? '#3D332C';
  return (
    <View style={{ backgroundColor: bg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' }}>
      <Text style={{ color: COLORS.textLight, fontSize: 13, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>
        {category}
      </Text>
    </View>
  );
}

// ---- Pushpin ----
function Pushpin({ color = COLORS.pin }: { color?: string }) {
  return (
    <View style={{ alignItems: 'center', position: 'absolute', top: -10, right: 18 }}>
      <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: color, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 2, elevation: 4 }} />
      <View style={{ width: 2, height: 8, backgroundColor: color, opacity: 0.7 }} />
    </View>
  );
}

// ---- Script Card ----
const ScriptCard = React.memo(function ScriptCard({
  script,
  onEdit,
  onCopy,
  onUse,
}: {
  script: Script;
  onEdit: () => void;
  onCopy: () => void;
  onUse: () => void;
}) {
  const preview = script.body.length > 90 ? script.body.slice(0, 90) + '…' : script.body;

  return (
    <View style={{ marginHorizontal: 16, marginBottom: 20, position: 'relative' }}>
      <Pushpin color={COLORS.pin} />
      <View
        testID={`script-card-${script.id}`}
        style={{
          backgroundColor: COLORS.card,
          borderRadius: 14,
          padding: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 6,
          elevation: 6,
          borderTopWidth: 3,
          borderTopColor: COLORS.pin,
        }}>
        {/* Title row */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
          <FileText size={16} color={COLORS.red} strokeWidth={2} style={{ marginTop: 1, marginRight: 8 }} />
          <Text style={{ flex: 1, color: COLORS.cardText, fontSize: 16, fontWeight: '800', lineHeight: 20, letterSpacing: 0.2 }}>
            {script.title}
          </Text>
        </View>

        {/* Badge + variable count */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <CategoryBadge category={script.category} />
          <Text style={{ color: COLORS.muted, fontSize: 13, fontWeight: '600' }}>
            {script.variables.length} variable{script.variables.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Preview text */}
        <Text style={{ color: '#5C4033', fontSize: 14, lineHeight: 18, fontStyle: 'italic', marginBottom: 14, borderLeftWidth: 2, borderLeftColor: COLORS.muted, paddingLeft: 8 }}>
          {preview}
        </Text>

        {/* Action buttons */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            testID={`edit-btn-${script.id}`}
            onPress={onEdit}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 14, borderRadius: 10, backgroundColor: 'rgba(44,24,16,0.08)', borderWidth: 1, borderColor: 'rgba(44,24,16,0.15)' }}>
            <Edit2 size={16} color={COLORS.cardText} strokeWidth={2} />
            <Text style={{ color: COLORS.cardText, fontSize: 14, fontWeight: '700' }}>Edit</Text>
          </Pressable>
          <Pressable
            testID={`copy-btn-${script.id}`}
            onPress={onCopy}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 14, borderRadius: 10, backgroundColor: 'rgba(44,24,16,0.08)', borderWidth: 1, borderColor: 'rgba(44,24,16,0.15)' }}>
            <Copy size={16} color={COLORS.cardText} strokeWidth={2} />
            <Text style={{ color: COLORS.cardText, fontSize: 14, fontWeight: '700' }}>Copy</Text>
          </Pressable>
          <Pressable
            testID={`use-btn-${script.id}`}
            onPress={onUse}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 14, borderRadius: 10, backgroundColor: COLORS.red }}>
            <BookOpen size={16} color='#fff' strokeWidth={2} />
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Use</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
});

// ---- Variable Use Modal ----
function UseScriptModal({
  script,
  visible,
  onClose,
}: {
  script: Script | null;
  visible: boolean;
  onClose: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    if (script) {
      const initial: Record<string, string> = {};
      script.variables.forEach((v) => { initial[v] = ''; });
      setValues(initial);
      setCopied(false);
    }
  }, [script]);

  if (!script) return null;

  const preview = renderPreview(script.body, values);

  const handleCopy = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await Share.share({ message: preview });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Render body with highlighted variables
  const renderHighlighted = () => {
    const parts: React.ReactNode[] = [];
    let idx = 0;
    const varRegex = /\[([A-Z_]+)\]/g;
    let match;
    let lastIndex = 0;
    varRegex.lastIndex = 0;
    while ((match = varRegex.exec(script.body)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <Text key={`t-${idx++}`} style={{ color: COLORS.cardText, fontSize: 13, lineHeight: 20 }}>
            {script.body.slice(lastIndex, match.index)}
          </Text>
        );
      }
      const varName = match[1];
      const filled = values[varName];
      parts.push(
        <Text key={`v-${idx++}`} style={{ color: filled ? '#006400' : COLORS.red, fontWeight: '700', fontSize: 13, lineHeight: 20 }}>
          {filled ? filled : match[0]}
        </Text>
      );
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < script.body.length) {
      parts.push(
        <Text key={`t-${idx++}`} style={{ color: COLORS.cardText, fontSize: 13, lineHeight: 20 }}>
          {script.body.slice(lastIndex)}
        </Text>
      );
    }
    return parts;
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
          <Pressable testID="use-modal-close" onPress={onClose} style={{ padding: 4, marginRight: 12 }}>
            <X size={20} color={COLORS.muted} strokeWidth={2.5} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: COLORS.red, fontSize: 12, fontWeight: '800', letterSpacing: 1.7, textTransform: 'uppercase' }}>Use Script</Text>
            <Text style={{ color: COLORS.textLight, fontSize: 15, fontWeight: '700', marginTop: 1 }} numberOfLines={1}>{script.title}</Text>
          </View>
          <CategoryBadge category={script.category} />
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
          {/* Script preview with highlights */}
          <View style={{ backgroundColor: COLORS.card, borderRadius: 10, padding: 14, marginBottom: 20, borderLeftWidth: 3, borderLeftColor: COLORS.red }}>
            <Text style={{ color: COLORS.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>Script Preview</Text>
            <Text style={{ lineHeight: 20 }}>{renderHighlighted()}</Text>
          </View>

          {/* Variable inputs */}
          {script.variables.length > 0 && (
            <View style={{ marginBottom: 20 }}>
              <Text style={{ color: COLORS.textLight, fontSize: 13, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12 }}>
                Fill Variables
              </Text>
              {script.variables.map((varName) => (
                <View key={varName} style={{ marginBottom: 12 }}>
                  <Text style={{ color: COLORS.red, fontSize: 12, fontWeight: '700', letterSpacing: 0.7, marginBottom: 5 }}>
                    [{varName}]
                  </Text>
                  <TextInput
                    testID={`var-input-${varName}`}
                    value={values[varName] ?? ''}
                    onChangeText={(t) => setValues((prev) => ({ ...prev, [varName]: t }))}
                    placeholder={`Enter ${varName.replace(/_/g, ' ').toLowerCase()}`}
                    placeholderTextColor={COLORS.muted}
                    style={{
                      backgroundColor: COLORS.surface,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      color: COLORS.textLight,
                      fontSize: 14,
                    }}
                  />
                </View>
              ))}
            </View>
          )}

          {/* Live preview */}
          <View style={{ backgroundColor: '#0D1F0D', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#1E3A1E' }}>
            <Text style={{ color: '#4CAF50', fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>Live Preview</Text>
            <Text style={{ color: '#B8E6B8', fontSize: 14, lineHeight: 22 }}>{preview}</Text>
          </View>
        </ScrollView>

        {/* Bottom actions */}
        <View style={{ flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 32, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.background }}>
          <Pressable
            testID="copy-to-clipboard-btn"
            onPress={handleCopy}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 10, backgroundColor: copied ? '#1E4A1E' : COLORS.surface, borderWidth: 1, borderColor: copied ? '#2E6A2E' : COLORS.border }}>
            {copied ? <Check size={16} color='#4CAF50' strokeWidth={2.5} /> : <Copy size={16} color={COLORS.textLight} strokeWidth={2} />}
            <Text style={{ color: copied ? '#4CAF50' : COLORS.textLight, fontSize: 14, fontWeight: '700' }}>
              {copied ? 'Shared!' : 'Share / Copy'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---- Edit Script Modal ----
function EditScriptModal({
  script,
  visible,
  onClose,
  onSave,
}: {
  script: Script | null;
  visible: boolean;
  onClose: () => void;
  onSave: (s: Script) => void;
}) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Custom');
  const [body, setBody] = useState('');

  React.useEffect(() => {
    if (script) {
      setTitle(script.title);
      setCategory(script.category);
      setBody(script.body);
    }
  }, [script]);

  if (!script) return null;

  const detectedVars = detectVariables(body);

  const handleSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave({ ...script, title, category, body, variables: detectedVars });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
          <Pressable testID="edit-modal-close" onPress={onClose} style={{ padding: 4, marginRight: 12 }}>
            <X size={20} color={COLORS.muted} strokeWidth={2.5} />
          </Pressable>
          <Text style={{ flex: 1, color: COLORS.textLight, fontSize: 18, fontWeight: '800' }}>Edit Script</Text>
          <Pressable testID="edit-save-btn" onPress={handleSave} style={{ paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.red, borderRadius: 12 }}>
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Save</Text>
          </Pressable>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
          <Text style={{ color: COLORS.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>Title</Text>
          <TextInput
            testID="edit-title-input"
            value={title}
            onChangeText={setTitle}
            placeholder="Script title..."
            placeholderTextColor={COLORS.muted}
            style={{ backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: COLORS.textLight, fontSize: 15, marginBottom: 16 }}
          />

          <Text style={{ color: COLORS.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                <Pressable
                  key={cat}
                  testID={`edit-cat-${cat}`}
                  onPress={() => setCategory(cat)}
                  style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 6, backgroundColor: category === cat ? COLORS.red : COLORS.surface, borderWidth: 1, borderColor: category === cat ? COLORS.red : COLORS.border }}>
                  <Text style={{ color: category === cat ? '#fff' : COLORS.muted, fontSize: 12, fontWeight: '700' }}>{cat}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <Text style={{ color: COLORS.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>
            Script Body — use [VARIABLE_NAME] for variables
          </Text>
          <TextInput
            testID="edit-body-input"
            value={body}
            onChangeText={setBody}
            placeholder="Write your script here. Use [VARIABLE_NAME] for placeholders..."
            placeholderTextColor={COLORS.muted}
            multiline
            numberOfLines={8}
            textAlignVertical="top"
            style={{ backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: COLORS.textLight, fontSize: 14, lineHeight: 21, minHeight: 160, marginBottom: 16 }}
          />

          {detectedVars.length > 0 && (
            <View style={{ backgroundColor: COLORS.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: COLORS.border }}>
              <Text style={{ color: COLORS.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>Detected Variables</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {detectedVars.map((v) => (
                  <View key={v} style={{ backgroundColor: '#3A1010', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 }}>
                    <Text style={{ color: COLORS.red, fontSize: 12, fontWeight: '700' }}>[{v}]</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---- Create Script Modal ----
function CreateScriptModal({
  visible,
  onClose,
  onCreate,
}: {
  visible: boolean;
  onClose: () => void;
  onCreate: (s: Script) => void;
}) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Custom');
  const [body, setBody] = useState('');

  const reset = () => { setTitle(''); setCategory('Custom'); setBody(''); };

  const detectedVars = detectVariables(body);

  const handleCreate = () => {
    if (!title.trim() || !body.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onCreate({
      id: Date.now().toString(),
      title: title.trim(),
      category,
      body: body.trim(),
      variables: detectedVars,
    });
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { reset(); onClose(); }}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
          <Pressable testID="create-modal-close" onPress={() => { reset(); onClose(); }} style={{ padding: 4, marginRight: 12 }}>
            <X size={20} color={COLORS.muted} strokeWidth={2.5} />
          </Pressable>
          <Text style={{ flex: 1, color: COLORS.textLight, fontSize: 18, fontWeight: '800' }}>New Script</Text>
          <Pressable
            testID="create-save-btn"
            onPress={handleCreate}
            style={{ paddingHorizontal: 16, paddingVertical: 14, backgroundColor: title.trim() && body.trim() ? COLORS.red : COLORS.muted, borderRadius: 12 }}>
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Create</Text>
          </Pressable>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Text style={{ color: COLORS.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>Title</Text>
          <TextInput
            testID="create-title-input"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Follow-up Contact Template"
            placeholderTextColor={COLORS.muted}
            style={{ backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: COLORS.textLight, fontSize: 15, marginBottom: 16 }}
          />

          <Text style={{ color: COLORS.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                <Pressable
                  key={cat}
                  testID={`create-cat-${cat}`}
                  onPress={() => setCategory(cat)}
                  style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 6, backgroundColor: category === cat ? COLORS.red : COLORS.surface, borderWidth: 1, borderColor: category === cat ? COLORS.red : COLORS.border }}>
                  <Text style={{ color: category === cat ? '#fff' : COLORS.muted, fontSize: 12, fontWeight: '700' }}>{cat}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <Text style={{ color: COLORS.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>
            Script Body
          </Text>
          <Text style={{ color: COLORS.muted, fontSize: 12, marginBottom: 8 }}>
            Wrap variable names in brackets: [YOUR_NAME], [TOPIC], etc.
          </Text>
          <TextInput
            testID="create-body-input"
            value={body}
            onChangeText={setBody}
            placeholder="Write your script here. Use [VARIABLE_NAME] for dynamic placeholders..."
            placeholderTextColor={COLORS.muted}
            multiline
            numberOfLines={8}
            textAlignVertical="top"
            style={{ backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: COLORS.textLight, fontSize: 14, lineHeight: 21, minHeight: 180, marginBottom: 16 }}
          />

          {detectedVars.length > 0 && (
            <View style={{ backgroundColor: COLORS.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: COLORS.border }}>
              <Text style={{ color: COLORS.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>Auto-Detected Variables ({detectedVars.length})</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {detectedVars.map((v) => (
                  <View key={v} style={{ backgroundColor: '#3A1010', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 }}>
                    <Text style={{ color: COLORS.red, fontSize: 12, fontWeight: '700' }}>[{v}]</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---- Main Screen ----
export default function ScriptsScreen() {
  const [scripts, setScripts] = useState<Script[]>(INITIAL_SCRIPTS);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [useScript, setUseScript] = useState<Script | null>(null);
  const [editScript, setEditScript] = useState<Script | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // Load from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem(SCRIPTS_KEY).then((stored) => {
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as Script[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            setScripts(parsed);
          }
        } catch {
          // If parse fails, keep INITIAL_SCRIPTS
        }
      }
    });
  }, []);

  // Save to AsyncStorage whenever scripts change
  useEffect(() => {
    AsyncStorage.setItem(SCRIPTS_KEY, JSON.stringify(scripts));
  }, [scripts]);

  const filtered = useMemo(() => {
    return scripts.filter((s) => {
      const matchCategory = activeCategory === 'All' || s.category === activeCategory;
      const matchSearch = search.trim() === '' || s.title.toLowerCase().includes(search.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [scripts, search, activeCategory]);

  const handleEdit = (script: Script) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditScript(script);
  };

  const handleCopy = async (script: Script) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await Share.share({ message: script.body, title: script.title });
  };

  const handleUse = (script: Script) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setUseScript(script);
  };

  const handleSaveEdit = (updated: Script) => {
    setScripts((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  const handleCreate = (newScript: Script) => {
    setScripts((prev) => [newScript, ...prev]);
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ color: COLORS.red, fontSize: 32, fontWeight: '900', letterSpacing: 2, lineHeight: 36 }}>
              SCRIPTS
            </Text>
            <Text style={{ color: COLORS.pin, fontSize: 13, fontWeight: '700', letterSpacing: 3, marginTop: 1 }}>
              &amp; TEMPLATES
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: COLORS.muted, fontSize: 12, fontWeight: '600' }}>{filtered.length} scripts</Text>
          </View>
        </View>
        {/* Red underline */}
        <View style={{ height: 2, backgroundColor: COLORS.red, marginTop: 10, borderRadius: 1, opacity: 0.6 }} />
      </View>

      {/* Search bar */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.border, gap: 8 }}>
          <Search size={18} color={COLORS.muted} strokeWidth={2} />
          <TextInput
            testID="scripts-search-input"
            value={search}
            onChangeText={setSearch}
            placeholder="Search scripts..."
            placeholderTextColor={COLORS.muted}
            style={{ flex: 1, color: COLORS.textLight, fontSize: 14 }}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} testID="search-clear-btn">
              <X size={15} color={COLORS.muted} strokeWidth={2.5} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 12 }}>
        {CATEGORIES.map((cat) => {
          const active = cat === activeCategory;
          return (
            <Pressable
              key={cat}
              testID={`category-tab-${cat}`}
              onPress={() => {
                Haptics.selectionAsync();
                setActiveCategory(cat);
              }}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 9,
                borderRadius: 20,
                backgroundColor: active ? COLORS.red : COLORS.surface,
                borderWidth: 1,
                borderColor: active ? COLORS.red : COLORS.border,
              }}>
              <Text style={{ color: active ? '#fff' : COLORS.muted, fontSize: 13, fontWeight: '700', letterSpacing: 0.5 }}>
                {cat}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Script list */}
      <FlatList
        testID="scripts-list"
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        windowSize={10}
        removeClippedSubviews={true}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 60 }}>
            <FileText size={40} color={COLORS.muted} strokeWidth={1.5} />
            <Text style={{ color: COLORS.muted, fontSize: 15, fontWeight: '600', marginTop: 12 }}>No scripts found</Text>
            <Text style={{ color: COLORS.muted, fontSize: 13, marginTop: 4, opacity: 0.7 }}>Try a different search or category</Text>
          </View>
        }
        renderItem={({ item }) => (
          <ScriptCard
            script={item}
            onEdit={() => handleEdit(item)}
            onCopy={() => handleCopy(item)}
            onUse={() => handleUse(item)}
          />
        )}
      />

      {/* FAB - Create new script */}
      <Pressable
        testID="create-script-fab"
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setShowCreate(true);
        }}
        style={{
          position: 'absolute',
          bottom: 100,
          right: 20,
          width: 60,
          height: 60,
          borderRadius: 30,
          backgroundColor: COLORS.red,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: COLORS.red,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.5,
          shadowRadius: 8,
          elevation: 8,
        }}>
        <Plus size={28} color='#fff' strokeWidth={2.5} />
      </Pressable>

      {/* Modals */}
      <UseScriptModal
        script={useScript}
        visible={useScript !== null}
        onClose={() => setUseScript(null)}
      />
      <EditScriptModal
        script={editScript}
        visible={editScript !== null}
        onClose={() => setEditScript(null)}
        onSave={handleSaveEdit}
      />
      <CreateScriptModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
      />
    </SafeAreaView>
  );
}
