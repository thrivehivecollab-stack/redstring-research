import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import {
  Users,
  UserPlus,
  Clock,
  Award,
  Check,
  X,
  Copy,
  ChevronDown,
  UserMinus,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import useCollabStore from '@/lib/state/collab-store';
import type { CollabSession, PendingNode } from '@/lib/state/collab-store';
import useInvestigationStore from '@/lib/state/investigation-store';
import type { NodeType, Position } from '@/lib/types';

const C = {
  bg: '#1A1614',
  surface: '#231F1C',
  surfaceAlt: '#2A2522',
  red: '#C41E3A',
  amber: '#D4A574',
  text: '#E8DCC8',
  muted: '#6B5B4F',
  border: '#3D332C',
  green: '#22C55E',
} as const;

const PERMISSIONS = [
  { value: 'viewer', label: 'Viewer', desc: 'Can view only' },
  { value: 'annotator', label: 'Annotator', desc: 'Can add notes' },
  { value: 'contributor', label: 'Contributor', desc: 'Can submit nodes' },
  { value: 'co-investigator', label: 'Co-Investigator', desc: 'Full access' },
] as const;

type Permission = (typeof PERMISSIONS)[number]['value'];

type TabId = 'team' | 'invite' | 'pending' | 'credits';

interface Props {
  investigationId: string;
  session: CollabSession | null;
  visible: boolean;
  onClose: () => void;
  currentUserId?: string;
}

// Initials avatar
function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const colors = ['#C41E3A', '#3B82F6', '#22C55E', '#F59E0B', '#A855F7', '#14B8A6'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color + '33',
        borderWidth: 1.5,
        borderColor: color + '66',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color, fontSize: size * 0.36, fontWeight: '700' }}>{initials}</Text>
    </View>
  );
}

// Permission badge
function PermBadge({ permission }: { permission: string }) {
  const colors: Record<string, string> = {
    viewer: C.muted,
    annotator: '#3B82F6',
    contributor: C.amber,
    'co-investigator': C.red,
  };
  const col = colors[permission] ?? C.muted;
  return (
    <View
      style={{
        backgroundColor: col + '22',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderWidth: 1,
        borderColor: col + '55',
      }}
    >
      <Text style={{ color: col, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {permission}
      </Text>
    </View>
  );
}

// Tab button
function TabBtn({
  id,
  label,
  icon: Icon,
  active,
  badge,
  onPress,
}: {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }>;
  active: boolean;
  badge?: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderBottomWidth: 2,
        borderBottomColor: active ? C.red : 'transparent',
        flexDirection: 'row',
        gap: 4,
      }}
    >
      <Icon size={14} color={active ? C.red : C.muted} strokeWidth={2} />
      <Text
        style={{
          fontSize: 11,
          fontWeight: '700',
          color: active ? C.red : C.muted,
          letterSpacing: 0.5,
        }}
      >
        {label}
      </Text>
      {badge != null && badge > 0 ? (
        <View
          style={{
            backgroundColor: C.red,
            borderRadius: 8,
            minWidth: 16,
            height: 16,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 3,
          }}
        >
          <Text style={{ color: '#FFF', fontSize: 9, fontWeight: '800' }}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export default function CollabSheet({
  investigationId,
  session,
  visible,
  onClose,
  currentUserId,
}: Props) {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['65%', '92%'], []);

  const [activeTab, setActiveTab] = useState<TabId>('team');
  const [inviteEmail, setInviteEmail] = useState<string>('');
  const [invitePermission, setInvitePermission] = useState<Permission>('contributor');
  const [showPermPicker, setShowPermPicker] = useState<boolean>(false);
  const [isSendingInvite, setIsSendingInvite] = useState<boolean>(false);
  const [inviteResult, setInviteResult] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const sendInvite = useCollabStore((s) => s.sendInvite);
  const generateInviteLink = useCollabStore((s) => s.generateInviteLink);
  const fetchPendingNodes = useCollabStore((s) => s.fetchPendingNodes);
  const approveNode = useCollabStore((s) => s.approveNode);
  const rejectNode = useCollabStore((s) => s.rejectNode);
  const pendingNodes = useCollabStore((s) => s.activePendingNodes);

  const addNode = useInvestigationStore((s) => s.addNode);

  useEffect(() => {
    if (visible) {
      sheetRef.current?.snapToIndex(0);
      if (session?.id) {
        fetchPendingNodes(session.id);
      }
    } else {
      sheetRef.current?.close();
    }
  }, [visible, session?.id, fetchPendingNodes]);

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

  const handleSendInvite = async () => {
    if (!session?.id || !inviteEmail.trim()) return;
    setIsSendingInvite(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const link = await sendInvite(session.id, inviteEmail.trim(), invitePermission);
      setInviteResult(link || 'Invite sent successfully!');
      setInviteEmail('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleCopyLink = async () => {
    if (!session?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const link = await generateInviteLink(session.id, invitePermission);
    if (link) {
      await Clipboard.setStringAsync(link);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleApprove = async (node: PendingNode) => {
    if (!session?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const approved = await approveNode(session.id, node.id);
    // If node data returned, add it to the local investigation canvas
    if (approved?.nodeData || node.nodeData) {
      const nd = approved?.nodeData ?? node.nodeData;
      const position: Position = nd.position ?? { x: 100, y: 100 };
      const type: NodeType = nd.type ?? 'note';
      const title: string = nd.title ?? 'Contributed Node';
      addNode(investigationId, type, title, position, {
        description: nd.description,
        content: nd.content,
        url: nd.url,
        tags: nd.tags ?? [],
      });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleReject = async (node: PendingNode) => {
    if (!session?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await rejectNode(session.id, node.id);
  };

  const members = session?.members ?? [];
  const isOwner = session?.ownerId === currentUserId;

  // ---- Render tab content ----

  const renderTeamTab = () => (
    <View>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '700',
          color: C.muted,
          letterSpacing: 1,
          marginBottom: 12,
          marginTop: 4,
        }}
      >
        TEAM MEMBERS ({members.length})
      </Text>
      {members.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 32 }}>
          <Users size={36} color={C.muted} strokeWidth={1.5} />
          <Text style={{ color: C.muted, fontSize: 13, marginTop: 12, textAlign: 'center' }}>
            No members yet.{'\n'}Invite people from the Invite tab.
          </Text>
        </View>
      ) : (
        members.map((member) => (
          <View
            key={member.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: C.border,
              gap: 12,
            }}
          >
            <Avatar name={member.user.name || member.user.email} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.text, fontSize: 14, fontWeight: '600' }} numberOfLines={1}>
                {member.user.name || member.user.email}
              </Text>
              <Text style={{ color: C.muted, fontSize: 12 }} numberOfLines={1}>
                {member.user.email}
              </Text>
            </View>
            <PermBadge permission={member.permission} />
            {isOwner && member.userId !== currentUserId ? (
              <Pressable
                onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                style={({ pressed }) => ({
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: pressed ? 'rgba(196,30,58,0.2)' : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                })}
              >
                <UserMinus size={14} color={C.muted} strokeWidth={2} />
              </Pressable>
            ) : null}
          </View>
        ))
      )}
    </View>
  );

  const renderInviteTab = () => (
    <View>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '700',
          color: C.muted,
          letterSpacing: 1,
          marginBottom: 12,
          marginTop: 4,
        }}
      >
        INVITE BY EMAIL
      </Text>

      {/* Email input */}
      <TextInput
        testID="invite-email-input"
        value={inviteEmail}
        onChangeText={setInviteEmail}
        placeholder="collaborator@example.com"
        placeholderTextColor={C.muted}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        style={{
          backgroundColor: C.bg,
          borderRadius: 10,
          padding: 14,
          color: C.text,
          fontSize: 15,
          borderWidth: 1,
          borderColor: C.border,
          marginBottom: 12,
        }}
      />

      {/* Permission picker */}
      <Pressable
        testID="permission-picker"
        onPress={() => setShowPermPicker((v) => !v)}
        style={{
          backgroundColor: C.bg,
          borderRadius: 10,
          padding: 14,
          borderWidth: 1,
          borderColor: showPermPicker ? C.amber : C.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: showPermPicker ? 0 : 16,
        }}
      >
        <View>
          <Text style={{ color: C.text, fontSize: 15, fontWeight: '600' }}>
            {PERMISSIONS.find((p) => p.value === invitePermission)?.label}
          </Text>
          <Text style={{ color: C.muted, fontSize: 12 }}>
            {PERMISSIONS.find((p) => p.value === invitePermission)?.desc}
          </Text>
        </View>
        <ChevronDown size={16} color={C.muted} strokeWidth={2} />
      </Pressable>

      {showPermPicker ? (
        <View
          style={{
            backgroundColor: C.bg,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: C.border,
            marginBottom: 16,
            overflow: 'hidden',
          }}
        >
          {PERMISSIONS.map((perm) => (
            <Pressable
              key={perm.value}
              onPress={() => {
                setInvitePermission(perm.value);
                setShowPermPicker(false);
              }}
              style={({ pressed }) => ({
                paddingVertical: 12,
                paddingHorizontal: 14,
                backgroundColor:
                  invitePermission === perm.value
                    ? C.amber + '15'
                    : pressed
                    ? C.surface
                    : 'transparent',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
              })}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: invitePermission === perm.value ? C.amber : C.border,
                }}
              />
              <View>
                <Text style={{ color: C.text, fontSize: 14, fontWeight: '600' }}>{perm.label}</Text>
                <Text style={{ color: C.muted, fontSize: 12 }}>{perm.desc}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}

      {/* Send invite button */}
      <Pressable
        testID="send-invite-button"
        onPress={handleSendInvite}
        disabled={isSendingInvite || !inviteEmail.trim()}
        style={({ pressed }) => ({
          backgroundColor:
            inviteEmail.trim() ? (pressed ? '#A3162E' : C.red) : C.border,
          borderRadius: 10,
          padding: 14,
          alignItems: 'center',
          marginBottom: 20,
          opacity: isSendingInvite ? 0.7 : 1,
        })}
      >
        {isSendingInvite ? (
          <ActivityIndicator color="#FFF" size="small" />
        ) : (
          <Text style={{ color: inviteEmail.trim() ? '#FFF' : C.muted, fontSize: 15, fontWeight: '700' }}>
            Send Invite
          </Text>
        )}
      </Pressable>

      {inviteResult ? (
        <View
          style={{
            backgroundColor: '#22C55E22',
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: '#22C55E44',
          }}
        >
          <Text style={{ color: '#22C55E', fontSize: 13 }}>Invite sent successfully.</Text>
        </View>
      ) : null}

      {/* Divider */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
        <Text style={{ color: C.muted, fontSize: 12 }}>OR</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
      </View>

      {/* Copy invite link */}
      <Pressable
        testID="copy-link-button"
        onPress={handleCopyLink}
        style={({ pressed }) => ({
          backgroundColor: pressed ? C.surface : C.surfaceAlt,
          borderRadius: 10,
          padding: 14,
          borderWidth: 1,
          borderColor: isCopied ? '#22C55E44' : C.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        })}
      >
        {isCopied ? (
          <Check size={16} color="#22C55E" strokeWidth={2.5} />
        ) : (
          <Copy size={16} color={C.amber} strokeWidth={2} />
        )}
        <Text
          style={{
            color: isCopied ? '#22C55E' : C.amber,
            fontSize: 14,
            fontWeight: '600',
          }}
        >
          {isCopied ? 'Link copied!' : 'Copy invite link'}
        </Text>
      </Pressable>
    </View>
  );

  const renderPendingTab = () => (
    <View>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '700',
          color: C.muted,
          letterSpacing: 1,
          marginBottom: 12,
          marginTop: 4,
        }}
      >
        PENDING CONTRIBUTIONS ({pendingNodes.length})
      </Text>
      {pendingNodes.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 32 }}>
          <Clock size={36} color={C.muted} strokeWidth={1.5} />
          <Text style={{ color: C.muted, fontSize: 13, marginTop: 12, textAlign: 'center' }}>
            No pending nodes.{'\n'}Contributions will appear here for your review.
          </Text>
        </View>
      ) : (
        pendingNodes.map((node) => (
          <View
            key={node.id}
            style={{
              backgroundColor: C.surfaceAlt,
              borderRadius: 12,
              padding: 14,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: C.border,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontSize: 14, fontWeight: '700' }} numberOfLines={1}>
                  {node.nodeData?.title ?? 'Untitled Node'}
                </Text>
                <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
                  by {node.contributor?.name ?? node.contributor?.email ?? 'Unknown'} •{' '}
                  {new Date(node.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: C.amber + '22',
                  borderRadius: 6,
                  paddingHorizontal: 7,
                  paddingVertical: 3,
                  borderWidth: 1,
                  borderColor: C.amber + '44',
                }}
              >
                <Text style={{ color: C.amber, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>
                  {node.nodeData?.type ?? 'node'}
                </Text>
              </View>
            </View>
            {node.nodeData?.description ? (
              <Text style={{ color: C.muted, fontSize: 12, lineHeight: 17, marginBottom: 10 }} numberOfLines={2}>
                {node.nodeData.description}
              </Text>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                testID={`reject-node-${node.id}`}
                onPress={() => handleReject(node)}
                style={({ pressed }) => ({
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 8,
                  alignItems: 'center',
                  backgroundColor: pressed ? 'rgba(196,30,58,0.2)' : 'rgba(196,30,58,0.1)',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 6,
                  borderWidth: 1,
                  borderColor: 'rgba(196,30,58,0.3)',
                })}
              >
                <X size={14} color={C.red} strokeWidth={2.5} />
                <Text style={{ color: C.red, fontSize: 13, fontWeight: '700' }}>Reject</Text>
              </Pressable>
              <Pressable
                testID={`approve-node-${node.id}`}
                onPress={() => handleApprove(node)}
                style={({ pressed }) => ({
                  flex: 2,
                  paddingVertical: 10,
                  borderRadius: 8,
                  alignItems: 'center',
                  backgroundColor: pressed ? '#16A34A' : '#22C55E',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 6,
                })}
              >
                <Check size={14} color="#FFF" strokeWidth={2.5} />
                <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>Approve & Add</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}
    </View>
  );

  const renderCreditsTab = () => (
    <View>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '700',
          color: C.muted,
          letterSpacing: 1,
          marginBottom: 12,
          marginTop: 4,
        }}
      >
        CONTRIBUTIONS
      </Text>
      {members.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 32 }}>
          <Award size={36} color={C.muted} strokeWidth={1.5} />
          <Text style={{ color: C.muted, fontSize: 13, marginTop: 12, textAlign: 'center' }}>
            No contributions yet.{'\n'}Approved nodes will be credited here.
          </Text>
        </View>
      ) : (
        members.map((member) => (
          <View
            key={member.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: C.border,
              gap: 12,
            }}
          >
            <Avatar name={member.user.name || member.user.email} size={32} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.text, fontSize: 13, fontWeight: '600' }}>
                {member.user.name || member.user.email}
              </Text>
              <Text style={{ color: C.muted, fontSize: 11 }}>
                {member.permission === 'co-investigator' ? 'Co-Investigator' : 'Collaborator'}
              </Text>
            </View>
            <Award size={14} color={C.amber} strokeWidth={2} />
          </View>
        ))
      )}
    </View>
  );

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
      {/* Sheet header */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 4,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: C.border,
        }}
      >
        <Text style={{ color: C.text, fontSize: 17, fontWeight: '800', letterSpacing: 0.3 }}>
          {session?.title ?? 'Collaboration'}
        </Text>
        <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
          {members.length} {members.length === 1 ? 'member' : 'members'}
        </Text>
      </View>

      {/* Tab bar */}
      <View
        style={{
          flexDirection: 'row',
          borderBottomWidth: 1,
          borderBottomColor: C.border,
          backgroundColor: C.surface,
        }}
      >
        <TabBtn
          id="team"
          label="Team"
          icon={Users}
          active={activeTab === 'team'}
          onPress={() => setActiveTab('team')}
        />
        <TabBtn
          id="invite"
          label="Invite"
          icon={UserPlus}
          active={activeTab === 'invite'}
          onPress={() => setActiveTab('invite')}
        />
        <TabBtn
          id="pending"
          label="Pending"
          icon={Clock}
          active={activeTab === 'pending'}
          badge={pendingNodes.length}
          onPress={() => setActiveTab('pending')}
        />
        <TabBtn
          id="credits"
          label="Credits"
          icon={Award}
          active={activeTab === 'credits'}
          onPress={() => setActiveTab('credits')}
        />
      </View>

      <BottomSheetScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      >
        {activeTab === 'team' ? renderTeamTab() : null}
        {activeTab === 'invite' ? renderInviteTab() : null}
        {activeTab === 'pending' ? renderPendingTab() : null}
        {activeTab === 'credits' ? renderCreditsTab() : null}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
