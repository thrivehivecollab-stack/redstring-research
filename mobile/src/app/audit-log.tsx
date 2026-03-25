import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Filter, Download, FileText, Eye, Link2, Check, X, Plus, Edit3 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const C = {
  bg: '#0F0D0B', surface: '#1A1714', text: '#E8DCC8',
  muted: '#6B5B4F', border: '#3D332C', red: '#C41E3A', pin: '#D4A574',
} as const;

interface AuditEntry {
  id: string;
  action: string;
  userId: string;
  userName: string;
  details?: string;
  createdAt: string;
  collabSessionId: string;
}

function getActionIcon(action: string) {
  if (action.includes('view')) return Eye;
  if (action.includes('add') || action.includes('create')) return Plus;
  if (action.includes('edit') || action.includes('update')) return Edit3;
  if (action.includes('delete') || action.includes('reject')) return X;
  if (action.includes('approve')) return Check;
  if (action.includes('link') || action.includes('connect')) return Link2;
  if (action.includes('export') || action.includes('download')) return Download;
  return FileText;
}

function getActionColor(action: string): string {
  if (action.includes('delete') || action.includes('reject')) return '#C41E3A';
  if (action.includes('approve') || action.includes('verified')) return '#22C55E';
  if (action.includes('add') || action.includes('create')) return '#3B82F6';
  if (action.includes('edit') || action.includes('update')) return '#F59E0B';
  return '#6B5B4F';
}

function formatAction(action: string): string {
  return action
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

export default function AuditLogScreen() {
  const router = useRouter();
  const { investigationId } = useLocalSearchParams<{ investigationId: string }>();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [members, setMembers] = useState<{ userId: string; userName: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [showMemberFilter, setShowMemberFilter] = useState(false);

  useEffect(() => {
    if (!investigationId) return;
    const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? '';
    Promise.all([
      fetch(`${BACKEND_URL}/api/audit-logs/investigation/${investigationId}`).then(r => r.json()),
      fetch(`${BACKEND_URL}/api/audit-logs/investigation/${investigationId}/members`).then(r => r.json()),
    ]).then(([logs, membersData]) => {
      setEntries(logs.data ?? []);
      setMembers(membersData.data ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [investigationId]);

  const filtered = selectedMember
    ? entries.filter(e => e.userId === selectedMember)
    : entries;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border }}>
        <Pressable
          testID="audit-log-back"
          onPress={() => router.back()}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' }}
        >
          <ArrowLeft size={20} color={C.text} strokeWidth={2} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.text, fontSize: 20, fontWeight: '800' }}>Audit Log</Text>
          <Text style={{ color: C.muted, fontSize: 12 }}>Immutable — cannot be edited or deleted</Text>
        </View>
        <Pressable
          testID="audit-log-filter"
          onPress={() => setShowMemberFilter(f => !f)}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: selectedMember ? C.red : C.surface, alignItems: 'center', justifyContent: 'center' }}
        >
          <Filter size={18} color={selectedMember ? '#FFF' : C.text} strokeWidth={2} />
        </Pressable>
      </View>

      {/* Member filter */}
      {showMemberFilter && members.length > 0 ? (
        <View style={{ paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Pressable
              onPress={() => setSelectedMember(null)}
              style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: selectedMember === null ? C.red : C.surface, borderWidth: 1, borderColor: selectedMember === null ? C.red : C.border }}
            >
              <Text style={{ color: selectedMember === null ? '#FFF' : C.text, fontSize: 12, fontWeight: '600' }}>All Members</Text>
            </Pressable>
            {members.map(m => (
              <Pressable
                key={m.userId}
                onPress={() => setSelectedMember(s => s === m.userId ? null : m.userId)}
                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: selectedMember === m.userId ? C.red : C.surface, borderWidth: 1, borderColor: selectedMember === m.userId ? C.red : C.border }}
              >
                <Text style={{ color: selectedMember === m.userId ? '#FFF' : C.text, fontSize: 12, fontWeight: '600' }}>{m.userName}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} testID="audit-log-loading">
          <ActivityIndicator color={C.red} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }} testID="audit-log-empty">
          <Text style={{ fontSize: 48, marginBottom: 16 }}>📋</Text>
          <Text style={{ color: C.text, fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 8 }}>No activity recorded</Text>
          <Text style={{ color: C.muted, fontSize: 15, textAlign: 'center' }}>Collaboration activity will appear here once the investigation has active contributors.</Text>
        </View>
      ) : (
        <FlatList
          testID="audit-log-list"
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: C.border, marginVertical: 2 }} />}
          renderItem={({ item }) => {
            const IconComponent = getActionIcon(item.action);
            const color = getActionColor(item.action);
            const time = new Date(item.createdAt);
            const timeStr = time.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            return (
              <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 12, alignItems: 'flex-start' }}>
                <View style={{ width: 8, borderRadius: 4, alignSelf: 'stretch', backgroundColor: color, marginTop: 4 }} />
                <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: color + '18', alignItems: 'center', justifyContent: 'center' }}>
                  <IconComponent size={16} color={color} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: C.text, fontSize: 9, fontWeight: '800' }}>
                        {(item.userName ?? 'U').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={{ color: C.pin, fontSize: 13, fontWeight: '700' }}>{item.userName ?? 'Unknown'}</Text>
                  </View>
                  <Text style={{ color: C.text, fontSize: 14, fontWeight: '600' }}>{formatAction(item.action)}</Text>
                  {item.details ? (
                    <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }} numberOfLines={2}>{item.details}</Text>
                  ) : null}
                  <Text style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>{timeStr}</Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
