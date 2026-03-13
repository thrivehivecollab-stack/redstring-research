import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ActivityIndicator,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, Users, ChevronRight } from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { api } from '@/lib/api/api';
import useInvestigationStore from '@/lib/state/investigation-store';

const C = {
  bg: '#1A1614',
  surface: '#231F1C',
  surfaceAlt: '#2A2522',
  red: '#C41E3A',
  pin: '#D4A574',
  text: '#E8DCC8',
  muted: '#6B5B4F',
  border: '#3D332C',
  green: '#22C55E',
};

const PERMISSION_COLORS: Record<string, string> = {
  viewer: '#6B5B4F',
  annotator: '#3B82F6',
  contributor: '#F59E0B',
  co_investigator: '#C41E3A',
};

const PERMISSION_LABELS: Record<string, string> = {
  viewer: 'VIEWER',
  annotator: 'ANNOTATOR',
  contributor: 'CONTRIBUTOR',
  co_investigator: 'CO-INVESTIGATOR',
};

interface CollabSession {
  id: string;
  title: string;
  description?: string;
  investigationId: string;
  ownerId: string;
  myPermission: string;
  isOwner: boolean;
  members?: Array<{ id: string }>;
  memberCount?: number;
  _count?: { members: number };
  createdAt: string;
}

export default function CollabScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const investigations = useInvestigationStore((s) => s.investigations);

  const [showCreate, setShowCreate] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [selectedInvId, setSelectedInvId] = useState<string | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['collab-sessions'],
    queryFn: async () => {
      const sessions = await api.get<CollabSession[]>('/api/collab/sessions');
      return sessions;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const session = await api.post<CollabSession>('/api/collab/sessions', {
        investigationId: selectedInvId ?? '',
        title: createTitle.trim(),
        description: createDesc.trim() || undefined,
        originalSnapshot: '{}',
      });
      return session;
    },
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ['collab-sessions'] });
      setShowCreate(false);
      setCreateTitle('');
      setCreateDesc('');
      setSelectedInvId(null);
      router.push({ pathname: '/collab-session', params: { id: session.id } });
    },
  });

  const sessions = data ?? [];
  const mySessions = sessions.filter((s) => s.isOwner);
  const joinedSessions = sessions.filter((s) => !s.isOwner);

  const renderSession = useCallback(({ item }: { item: CollabSession }) => (
    <Pressable
      testID={`collab-session-item-${item.id}`}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({ pathname: '/collab-session', params: { id: item.id } });
      }}
      style={({ pressed }) => ({
        backgroundColor: pressed ? C.surfaceAlt : C.surface,
        borderRadius: 16,
        padding: 18,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: C.border,
        flexDirection: 'row',
        alignItems: 'center',
      })}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.text, fontSize: 16, fontWeight: '800', marginBottom: 4 }}>
          {item.title}
        </Text>
        {item.description ? (
          <Text style={{ color: C.muted, fontSize: 14, marginBottom: 8 }} numberOfLines={1}>
            {item.description}
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(212,165,116,0.1)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(212,165,116,0.2)' }}>
            <Users size={16} color={C.pin} strokeWidth={2.5} />
            <Text style={{ color: C.pin, fontSize: 13, fontWeight: '700' }}>{item.memberCount ?? (item.members?.length ?? 0)}</Text>
          </View>
          <View style={{ backgroundColor: (PERMISSION_COLORS[item.myPermission] ?? C.muted) + '20', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: (PERMISSION_COLORS[item.myPermission] ?? C.muted) + '40' }}>
            <Text style={{ color: PERMISSION_COLORS[item.myPermission] ?? C.muted, fontSize: 11, fontWeight: '800', letterSpacing: 0.7 }}>
              {PERMISSION_LABELS[item.myPermission] ?? item.myPermission.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>
      <ChevronRight size={20} color={C.muted} strokeWidth={2} />
    </Pressable>
  ), [router]);

  const nonDemoInvestigations = investigations.filter((inv) => !inv.isDemo);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }} testID="collab-screen">
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border }}>
          <Pressable
            testID="collab-back-button"
            onPress={() => router.back()}
            style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, backgroundColor: pressed ? C.border : C.surface, alignItems: 'center', justifyContent: 'center', marginRight: 14 })}
          >
            <ArrowLeft size={20} color={C.text} strokeWidth={2} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.red, fontSize: 22, fontWeight: '900', letterSpacing: 2.2 }}>COLLABORATIONS</Text>
            <Text style={{ color: C.muted, fontSize: 13, letterSpacing: 3.2, marginTop: 1 }}>SHARED INVESTIGATIONS</Text>
          </View>
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} testID="loading-indicator">
            <ActivityIndicator color={C.red} />
          </View>
        ) : sessions.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }} testID="empty-state">
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 20, borderWidth: 1, borderColor: C.border }}>
              <Users size={36} color={C.muted} strokeWidth={1.5} />
            </View>
            <Text style={{ color: C.text, fontSize: 18, fontWeight: '700', marginBottom: 8, textAlign: 'center' }}>No collaborations yet</Text>
            <Text style={{ color: C.muted, fontSize: 14, textAlign: 'center', lineHeight: 19 }}>
              Start one to invite investigators to your board.
            </Text>
          </View>
        ) : (
          <FlatList
            testID="collab-sessions-list"
            data={[]}
            renderItem={null}
            ListHeaderComponent={
              <View style={{ padding: 20 }}>
                {mySessions.length > 0 ? (
                  <>
                    <Text style={{ color: C.muted, fontSize: 12, fontWeight: '800', letterSpacing: 1.7, marginBottom: 12 }}>MY SESSIONS</Text>
                    {mySessions.map((item) => (
                      <View key={item.id}>{renderSession({ item })}</View>
                    ))}
                  </>
                ) : null}
                {joinedSessions.length > 0 ? (
                  <>
                    <View style={{ height: mySessions.length > 0 ? 8 : 0 }} />
                    {mySessions.length > 0 ? <View style={{ height: 1, backgroundColor: C.border, marginBottom: 16 }} /> : null}
                    <Text style={{ color: C.muted, fontSize: 12, fontWeight: '800', letterSpacing: 1.7, marginBottom: 12 }}>JOINED SESSIONS</Text>
                    {joinedSessions.map((item) => (
                      <View key={item.id}>{renderSession({ item })}</View>
                    ))}
                  </>
                ) : null}
              </View>
            }
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.red} />}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        )}
      </SafeAreaView>

      {/* Floating + button */}
      <Pressable
        testID="create-session-button"
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setShowCreate(true);
        }}
        style={({ pressed }) => ({
          position: 'absolute',
          bottom: 40,
          right: 24,
          width: 60,
          height: 60,
          borderRadius: 30,
          backgroundColor: pressed ? '#A3162E' : C.red,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: C.red,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.4,
          shadowRadius: 12,
          elevation: 8,
        })}
      >
        <Plus size={26} color="#FFF" strokeWidth={2.5} />
      </Pressable>

      {/* Create Modal */}
      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }} onPress={() => setShowCreate(false)}>
            <Pressable onPress={() => {}} style={{ backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderTopWidth: 1, borderTopColor: C.border }}>
              {/* Handle */}
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 20 }} />

              <Text style={{ color: C.text, fontSize: 20, fontWeight: '800', marginBottom: 20, letterSpacing: 0.5 }}>New Collab Session</Text>

              <Text style={{ color: C.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1.2, marginBottom: 6 }}>TITLE</Text>
              <TextInput
                testID="create-title-input"
                value={createTitle}
                onChangeText={setCreateTitle}
                placeholder="Session title..."
                placeholderTextColor={C.muted}
                autoFocus
                style={{ backgroundColor: C.surfaceAlt, borderRadius: 12, padding: 14, color: C.text, fontSize: 15, borderWidth: 1, borderColor: C.border, marginBottom: 16 }}
              />

              <Text style={{ color: C.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1.2, marginBottom: 6 }}>DESCRIPTION (OPTIONAL)</Text>
              <TextInput
                testID="create-desc-input"
                value={createDesc}
                onChangeText={setCreateDesc}
                placeholder="What is this investigation about..."
                placeholderTextColor={C.muted}
                multiline
                numberOfLines={2}
                style={{ backgroundColor: C.surfaceAlt, borderRadius: 12, padding: 14, color: C.text, fontSize: 15, borderWidth: 1, borderColor: C.border, marginBottom: 16, minHeight: 70, textAlignVertical: 'top' }}
              />

              {nonDemoInvestigations.length > 0 ? (
                <>
                  <Text style={{ color: C.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1.2, marginBottom: 10 }}>LINK TO INVESTIGATION</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20, flexGrow: 0 }}>
                    {nonDemoInvestigations.map((inv) => {
                      const isSelected = selectedInvId === inv.id;
                      return (
                        <Pressable
                          key={inv.id}
                          testID={`inv-select-${inv.id}`}
                          onPress={() => setSelectedInvId(isSelected ? null : inv.id)}
                          style={{
                            backgroundColor: isSelected ? C.red : C.surfaceAlt,
                            borderRadius: 10,
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                            marginRight: 10,
                            borderWidth: 1,
                            borderColor: isSelected ? C.red : C.border,
                          }}
                        >
                          <Text style={{ color: isSelected ? '#FFF' : C.text, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
                            {inv.title}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </>
              ) : null}

              <Pressable
                testID="create-session-submit-button"
                onPress={() => {
                  if (!createTitle.trim() || createMutation.isPending) return;
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  createMutation.mutate();
                }}
                style={({ pressed }) => ({
                  backgroundColor: createTitle.trim() ? (pressed ? '#A3162E' : C.red) : C.border,
                  borderRadius: 12,
                  paddingVertical: 16,
                  alignItems: 'center',
                  marginBottom: 8,
                })}
              >
                {createMutation.isPending ? (
                  <ActivityIndicator color="#FFF" testID="create-loading" />
                ) : (
                  <Text style={{ color: createTitle.trim() ? '#FFF' : C.muted, fontSize: 16, fontWeight: '800' }}>Create Session</Text>
                )}
              </Pressable>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
