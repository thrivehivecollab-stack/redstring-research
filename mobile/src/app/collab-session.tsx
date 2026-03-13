import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Users, Check, X, Trash2 } from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { api } from '@/lib/api/api';
import useInvestigationStore from '@/lib/state/investigation-store';
import { useSession } from '@/lib/auth/use-session';
import WarRoomEntry from '@/components/WarRoomEntry';

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

const TABS = ['Members', 'Pending', 'Contributions', 'Audit'] as const;
type Tab = typeof TABS[number];

function formatRelative(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const s = ms / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hours ago`;
  return `${Math.floor(s / 86400)} days ago`;
}

const ACTION_LABELS: Record<string, string> = {
  created: 'Created session',
  invited: 'Sent an invite',
  joined: 'Joined session',
  added_node: 'Submitted a node',
  approved_node: 'Approved a contribution',
  rejected_node: 'Rejected a contribution',
  viewed: 'Viewed session',
};

interface SessionData {
  id: string;
  title: string;
  description?: string;
  isOwner: boolean;
  members: Array<{
    id: string;
    userId: string;
    permission: string;
    joinedAt?: string;
    user?: { name?: string; email?: string; username?: string };
  }>;
}

interface PendingItem {
  id: string;
  nodeData: string;
  createdAt: string;
  contributor?: { name?: string; email?: string; username?: string };
}

interface ContributionItem {
  id: string;
  nodeTitle: string;
  contributedAt: string;
  contributor?: { name?: string; email?: string; username?: string };
}

interface AuditItem {
  id: string;
  action: string;
  createdAt: string;
  user?: { name?: string; email?: string; username?: string };
}

export default function CollabSessionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const addNode = useInvestigationStore((s) => s.addNode);
  const activeId = useInvestigationStore((s) => s.activeInvestigationId);

  const [activeTab, setActiveTab] = useState<Tab>('Members');
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePermission, setInvitePermission] = useState<'viewer' | 'annotator' | 'contributor' | 'co_investigator'>('viewer');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteExpiry, setInviteExpiry] = useState<number | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [showInviteCode, setShowInviteCode] = useState(false);

  const { data: sessionData, isLoading } = useQuery({
    queryKey: ['collab-session', id],
    queryFn: async () => api.get<SessionData>(`/api/collab/sessions/${id}`),
    enabled: !!id,
  });

  const { data: pendingData } = useQuery({
    queryKey: ['collab-pending', id],
    queryFn: async () => api.get<PendingItem[]>(`/api/collab/sessions/${id}/pending`),
    enabled: !!id && (sessionData?.isOwner ?? false),
  });

  const { data: contributionsData } = useQuery({
    queryKey: ['collab-contributions', id],
    queryFn: async () => api.get<ContributionItem[]>(`/api/collab/sessions/${id}/contributions`),
    enabled: !!id,
  });

  const { data: auditData } = useQuery({
    queryKey: ['collab-audit', id],
    queryFn: async () => api.get<AuditItem[]>(`/api/collab/sessions/${id}/audit`),
    enabled: !!id && (sessionData?.isOwner ?? false),
  });

  const inviteMutation = useMutation({
    mutationFn: async () => api.post<{ inviteCode: string }>(`/api/collab/sessions/${id}/invite`, {
      email: inviteEmail.trim() || undefined,
      permission: invitePermission,
      message: inviteMessage.trim() || undefined,
      expiresInHours: inviteExpiry ?? undefined,
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['collab-session', id] });
      setInviteCode(data.inviteCode);
      setShowInviteCode(true);
      setShowInvite(false);
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ nodeId, nodeData }: { nodeId: string; nodeData: Record<string, unknown> }) =>
      api.post<unknown>(`/api/collab/sessions/${id}/pending/${nodeId}/approve`, {
        nodeId: nodeData.id,
        nodeTitle: nodeData.title,
      }),
    onSuccess: (_, { nodeData }) => {
      queryClient.invalidateQueries({ queryKey: ['collab-pending', id] });
      queryClient.invalidateQueries({ queryKey: ['collab-contributions', id] });
      if (activeId && nodeData) {
        try {
          const nodeType = (nodeData.type as string) ?? 'note';
          const nodeTitle = (nodeData.title as string) ?? 'Untitled';
          const validTypes = ['investigation', 'folder', 'note', 'link', 'image', 'dataset'] as const;
          type ValidNodeType = typeof validTypes[number];
          const safeType: ValidNodeType = validTypes.includes(nodeType as ValidNodeType)
            ? (nodeType as ValidNodeType)
            : 'note';
          addNode(activeId, safeType, nodeTitle, { x: 100, y: 100 });
        } catch {}
      }
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (nodeId: string) =>
      api.post<unknown>(`/api/collab/sessions/${id}/pending/${nodeId}/reject`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collab-pending', id] });
    },
  });

  const { mutate: approveNode } = approveMutation;
  const { mutate: rejectNode } = rejectMutation;

  const isOwner = sessionData?.isOwner ?? false;
  const members = sessionData?.members ?? [];
  const pending = pendingData ?? [];
  const contributions = contributionsData ?? [];
  const audit = auditData ?? [];

  const visibleTabs = isOwner ? TABS : TABS.filter((t) => t !== 'Pending' && t !== 'Audit');

  const renderContent = useCallback(() => {
    if (activeTab === 'Members') {
      return (
        <View style={{ padding: 20 }}>
          {isOwner ? (
            <>
              <WarRoomEntry collabSessionId={id} size="md" />
              <Pressable
                testID="invite-button"
                onPress={() => setShowInvite(true)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  backgroundColor: pressed ? '#A3162E' : C.red,
                  borderRadius: 12,
                  paddingVertical: 13,
                  marginBottom: 20,
                })}
              >
                <Users size={16} color="#FFF" strokeWidth={2.5} />
                <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700' }}>Invite Investigator</Text>
              </Pressable>
            </>
          ) : null}

          {members.map((m) => (
            <View
              key={m.id}
              testID={`member-item-${m.id}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: C.surface,
                borderRadius: 12,
                padding: 14,
                marginBottom: 10,
                borderWidth: 1,
                borderColor: C.border,
              }}
            >
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(196,30,58,0.12)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Text style={{ color: C.red, fontSize: 15, fontWeight: '800' }}>
                  {(m.user?.name ?? m.user?.email ?? '?')[0].toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontSize: 14, fontWeight: '600' }}>
                  {m.user?.name ?? m.user?.username ?? m.user?.email ?? 'Unknown'}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <View style={{ backgroundColor: (PERMISSION_COLORS[m.permission] ?? C.muted) + '20', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: (PERMISSION_COLORS[m.permission] ?? C.muted) + '40' }}>
                    <Text style={{ color: PERMISSION_COLORS[m.permission] ?? C.muted, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 }}>
                      {PERMISSION_LABELS[m.permission] ?? m.permission.toUpperCase()}
                    </Text>
                  </View>
                  {m.joinedAt ? (
                    <Text style={{ color: C.muted, fontSize: 11 }}>Joined {formatRelative(m.joinedAt)}</Text>
                  ) : null}
                </View>
              </View>
              {isOwner && m.userId !== session?.user?.id ? (
                <Pressable
                  testID={`remove-member-${m.id}`}
                  onPress={() => { /* TODO: remove member */ }}
                  style={({ pressed }) => ({ width: 32, height: 32, borderRadius: 16, backgroundColor: pressed ? 'rgba(196,30,58,0.2)' : 'transparent', alignItems: 'center', justifyContent: 'center' })}
                >
                  <Trash2 size={16} color={C.muted} strokeWidth={2} />
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
      );
    }

    if (activeTab === 'Pending') {
      return (
        <View style={{ padding: 20 }} testID="pending-tab-content">
          {pending.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <Text style={{ color: C.muted, fontSize: 14 }}>No pending contributions</Text>
            </View>
          ) : pending.map((item) => {
            let parsedNode: Record<string, unknown> = {};
            try { parsedNode = JSON.parse(item.nodeData); } catch {}
            return (
              <View key={item.id} testID={`pending-item-${item.id}`} style={{ backgroundColor: C.surface, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(212,165,116,0.12)', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                    <Text style={{ color: C.pin, fontSize: 13, fontWeight: '800' }}>
                      {(item.contributor?.name ?? item.contributor?.email ?? '?')[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.text, fontSize: 13, fontWeight: '600' }}>
                      {item.contributor?.name ?? item.contributor?.username ?? 'Unknown'}
                    </Text>
                    <Text style={{ color: C.muted, fontSize: 11 }}>{formatRelative(item.createdAt)}</Text>
                  </View>
                </View>
                <View style={{ backgroundColor: C.surfaceAlt, borderRadius: 8, padding: 10, marginBottom: 12 }}>
                  <Text style={{ color: C.muted, fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginBottom: 2 }}>NODE PREVIEW</Text>
                  <Text style={{ color: C.text, fontSize: 13, fontWeight: '600' }}>{(parsedNode.title as string) ?? 'Untitled'}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable
                    testID={`approve-button-${item.id}`}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      approveNode({ nodeId: item.id, nodeData: parsedNode });
                    }}
                    style={({ pressed }) => ({ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: pressed ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.1)', borderRadius: 10, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)' })}
                  >
                    <Check size={15} color={C.green} strokeWidth={2.5} />
                    <Text style={{ color: C.green, fontSize: 13, fontWeight: '700' }}>Approve</Text>
                  </Pressable>
                  <Pressable
                    testID={`reject-button-${item.id}`}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      rejectNode(item.id);
                    }}
                    style={({ pressed }) => ({ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: pressed ? 'rgba(196,30,58,0.2)' : 'rgba(196,30,58,0.08)', borderRadius: 10, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(196,30,58,0.25)' })}
                  >
                    <X size={15} color={C.red} strokeWidth={2.5} />
                    <Text style={{ color: C.red, fontSize: 13, fontWeight: '700' }}>Reject</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      );
    }

    if (activeTab === 'Contributions') {
      return (
        <View style={{ padding: 20 }} testID="contributions-tab-content">
          {contributions.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <Text style={{ color: C.muted, fontSize: 14 }}>No approved contributions yet</Text>
            </View>
          ) : contributions.map((item) => (
            <View key={item.id} testID={`contribution-item-${item.id}`} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(34,197,94,0.12)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Text style={{ color: C.green, fontSize: 14, fontWeight: '800' }}>
                  {(item.contributor?.name ?? item.contributor?.email ?? '?')[0].toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontSize: 13, fontWeight: '600' }}>{item.contributor?.name ?? item.contributor?.username ?? 'Unknown'}</Text>
                <Text style={{ color: C.pin, fontSize: 12, fontWeight: '600', marginTop: 1 }}>{item.nodeTitle}</Text>
                <Text style={{ color: C.muted, fontSize: 11, marginTop: 1 }}>{formatRelative(item.contributedAt)}</Text>
              </View>
            </View>
          ))}
        </View>
      );
    }

    if (activeTab === 'Audit') {
      return (
        <View style={{ padding: 20 }} testID="audit-tab-content">
          {audit.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <Text style={{ color: C.muted, fontSize: 14 }}>No audit log entries</Text>
            </View>
          ) : audit.map((item) => (
            <View key={item.id} testID={`audit-item-${item.id}`} style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginRight: 10, marginTop: 1 }}>
                <Text style={{ color: C.muted, fontSize: 11, fontWeight: '800' }}>
                  {(item.user?.name ?? item.user?.email ?? '?')[0].toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontSize: 13, fontWeight: '600' }}>{item.user?.name ?? item.user?.username ?? 'Unknown'}</Text>
                <Text style={{ color: C.muted, fontSize: 12, marginTop: 1 }}>{ACTION_LABELS[item.action] ?? item.action}</Text>
              </View>
              <Text style={{ color: C.muted, fontSize: 11 }}>{formatRelative(item.createdAt)}</Text>
            </View>
          ))}
        </View>
      );
    }

    return null;
  }, [activeTab, isOwner, members, pending, contributions, audit, session, approveNode, rejectNode]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }} testID="collab-session-screen">
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border }}>
          <Pressable
            testID="session-back-button"
            onPress={() => router.back()}
            style={({ pressed }) => ({ width: 36, height: 36, borderRadius: 18, backgroundColor: pressed ? C.border : C.surface, alignItems: 'center', justifyContent: 'center', marginRight: 14 })}
          >
            <ArrowLeft size={18} color={C.text} strokeWidth={2} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.text, fontSize: 17, fontWeight: '800', letterSpacing: 0.3 }} numberOfLines={1}>
              {sessionData?.title ?? 'Loading...'}
            </Text>
            {sessionData?.description ? (
              <Text style={{ color: C.muted, fontSize: 11, marginTop: 1 }} numberOfLines={1}>{sessionData.description}</Text>
            ) : null}
          </View>
        </View>

        {/* Tabs */}
        <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.border }}>
          {visibleTabs.map((tab) => (
            <Pressable
              key={tab}
              testID={`tab-${tab.toLowerCase()}`}
              onPress={() => setActiveTab(tab)}
              style={{ flex: 1, paddingVertical: 13, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: activeTab === tab ? C.red : 'transparent' }}
            >
              <Text style={{ color: activeTab === tab ? C.text : C.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.3 }}>{tab.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>

        {isLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} testID="loading-indicator">
            <ActivityIndicator color={C.red} />
          </View>
        ) : (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
            {renderContent()}
          </ScrollView>
        )}
      </SafeAreaView>

      {/* Invite Modal */}
      <Modal visible={showInvite} transparent animationType="slide" onRequestClose={() => setShowInvite(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }} onPress={() => setShowInvite(false)}>
            <Pressable onPress={() => {}} style={{ backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderTopWidth: 1, borderTopColor: C.border, maxHeight: '80%' }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 20 }} />
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={{ color: C.text, fontSize: 18, fontWeight: '800', marginBottom: 20 }}>Invite Investigator</Text>

                <Text style={{ color: C.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 6 }}>EMAIL (OPTIONAL)</Text>
                <TextInput
                  testID="invite-email-input"
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  placeholder="investigator@email.com"
                  placeholderTextColor={C.muted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={{ backgroundColor: C.surfaceAlt, borderRadius: 10, padding: 14, color: C.text, fontSize: 15, borderWidth: 1, borderColor: C.border, marginBottom: 16 }}
                />

                <Text style={{ color: C.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 10 }}>PERMISSION LEVEL</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                  {(['viewer', 'annotator', 'contributor', 'co_investigator'] as const).map((perm) => (
                    <Pressable
                      key={perm}
                      testID={`permission-${perm}`}
                      onPress={() => setInvitePermission(perm)}
                      style={{
                        backgroundColor: invitePermission === perm ? C.red : C.surfaceAlt,
                        borderRadius: 8,
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderWidth: 1,
                        borderColor: invitePermission === perm ? C.red : C.border,
                      }}
                    >
                      <Text style={{ color: invitePermission === perm ? '#FFF' : C.muted, fontSize: 12, fontWeight: '700' }}>
                        {PERMISSION_LABELS[perm]}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={{ color: C.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 6 }}>MESSAGE (OPTIONAL)</Text>
                <TextInput
                  testID="invite-message-input"
                  value={inviteMessage}
                  onChangeText={setInviteMessage}
                  placeholder="Add a personal message..."
                  placeholderTextColor={C.muted}
                  multiline
                  numberOfLines={2}
                  style={{ backgroundColor: C.surfaceAlt, borderRadius: 10, padding: 14, color: C.text, fontSize: 15, borderWidth: 1, borderColor: C.border, marginBottom: 16, minHeight: 60, textAlignVertical: 'top' }}
                />

                <Text style={{ color: C.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 10 }}>EXPIRY</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                  {([{ label: '24h', hours: 24 }, { label: '72h', hours: 72 }, { label: '7 days', hours: 168 }, { label: 'No expiry', hours: null }] as const).map((opt) => (
                    <Pressable
                      key={opt.label}
                      testID={`expiry-${opt.label}`}
                      onPress={() => setInviteExpiry(opt.hours)}
                      style={{
                        backgroundColor: inviteExpiry === opt.hours ? C.red : C.surfaceAlt,
                        borderRadius: 8,
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderWidth: 1,
                        borderColor: inviteExpiry === opt.hours ? C.red : C.border,
                      }}
                    >
                      <Text style={{ color: inviteExpiry === opt.hours ? '#FFF' : C.muted, fontSize: 12, fontWeight: '700' }}>{opt.label}</Text>
                    </Pressable>
                  ))}
                </View>

                <Pressable
                  testID="send-invite-button"
                  onPress={() => {
                    if (inviteMutation.isPending) return;
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    inviteMutation.mutate();
                  }}
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? '#A3162E' : C.red,
                    borderRadius: 12,
                    paddingVertical: 15,
                    alignItems: 'center',
                    marginBottom: 8,
                  })}
                >
                  {inviteMutation.isPending ? (
                    <ActivityIndicator color="#FFF" testID="invite-loading" />
                  ) : (
                    <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '700' }}>Send Invite</Text>
                  )}
                </Pressable>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Invite Code Modal */}
      <Modal visible={showInviteCode} transparent animationType="fade" onRequestClose={() => setShowInviteCode(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 }} onPress={() => setShowInviteCode(false)}>
          <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 360, backgroundColor: C.surface, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: C.border }}>
            <Text style={{ color: C.text, fontSize: 17, fontWeight: '800', marginBottom: 8 }}>Invite Created!</Text>
            <Text style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>Share this code with the investigator:</Text>
            <View style={{ backgroundColor: C.surfaceAlt, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border, alignItems: 'center' }}>
              <Text style={{ color: C.pin, fontSize: 22, fontWeight: '900', letterSpacing: 4 }} testID="invite-code-display">{inviteCode}</Text>
            </View>
            <Pressable
              testID="share-invite-button"
              onPress={async () => {
                try {
                  await Share.share({ message: `Join my Red String investigation: open the app and enter code ${inviteCode}` });
                } catch {}
              }}
              style={({ pressed }) => ({ backgroundColor: pressed ? '#A3162E' : C.red, borderRadius: 12, paddingVertical: 13, alignItems: 'center' })}
            >
              <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700' }}>Share Code</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
