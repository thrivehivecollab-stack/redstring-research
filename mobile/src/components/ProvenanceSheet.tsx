import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, Pressable, Linking, ActivityIndicator } from 'react-native';
import BottomSheet, { BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { Link2, Shield, Clock, User, Eye, Download, Check, X, FileText } from 'lucide-react-native';
import type { CanvasNode, NodeSource, SourceTypeBadge } from '@/lib/types';
import * as Haptics from 'expo-haptics';
import * as burnt from 'burnt';
import { generateDossier } from '@/lib/generateDossier';
import useInvestigationStore from '@/lib/state/investigation-store';

// Color constants matching the app
const C = {
  bg: '#0F0D0B',
  surface: '#1A1714',
  card: '#F5ECD7',
  red: '#C41E3A',
  redLight: '#E8445A',
  pin: '#D4A574',
  text: '#E8DCC8',
  muted: '#6B5B4F',
  border: '#3D332C',
  cardText: '#2C1810',
} as const;

interface ProvenanceSheetProps {
  visible: boolean;
  node: CanvasNode | null;
  investigationId: string;
  currentUserId?: string;
  isOwnerOrCoInvestigator?: boolean;
  onClose: () => void;
  onVerifySource: (sourceId: string) => void;
}

function formatTimestamp(ts: number | undefined): string {
  if (!ts) return 'Unknown';
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getEntryMethodLabel(method: string | undefined): string {
  switch (method) {
    case 'tip': return 'Tip';
    case 'direct_add': return 'Direct Add';
    case 'collab_contribution': return 'Collab Contribution';
    case 'import': return 'Import';
    default: return 'Direct Add';
  }
}

function getEntryMethodColor(method: string | undefined): string {
  switch (method) {
    case 'tip': return '#F59E0B';
    case 'direct_add': return '#3B82F6';
    case 'collab_contribution': return '#22C55E';
    case 'import': return '#A855F7';
    default: return '#3B82F6';
  }
}

function inferSourceTypeBadge(source: NodeSource): SourceTypeBadge {
  const ct = source.contentType;
  const platform = source.platform;
  const sourceType = source.sourceType;
  if (ct === 'document' || sourceType === 'document') return 'Document';
  if (ct === 'testimony') return 'Witness';
  if (platform === 'x' || platform === 'instagram' || platform === 'facebook' || platform === 'tiktok' || platform === 'youtube') return 'Social Media';
  if (ct === 'tip' || sourceType === 'tip') return 'Witness';
  return 'Manual Entry';
}

function getCredibilityBadge(credibility: NodeSource['credibility']): { label: string; color: string } {
  switch (credibility) {
    case 'confirmed':
    case 'primary': return { label: 'HIGH', color: '#22C55E' };
    case 'secondary': return { label: 'MEDIUM', color: '#F59E0B' };
    case 'disputed': return { label: 'DISPUTED', color: '#C41E3A' };
    default: return { label: 'UNVERIFIED', color: C.muted };
  }
}

interface AuditEntry {
  id: string;
  action: string;
  userId?: string;
  username?: string;
  timestamp: number;
  metadata?: Record<string, string>;
}

export default function ProvenanceSheet({
  visible,
  node,
  investigationId,
  isOwnerOrCoInvestigator,
  onClose,
  onVerifySource,
}: ProvenanceSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = ['85%'];
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [loadingAudit, setLoadingAudit] = useState<boolean>(false);
  const [exportLoading, setExportLoading] = useState<boolean>(false);

  const investigation = useInvestigationStore((s) =>
    s.investigations.find((inv) => inv.id === investigationId)
  );

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.expand();
      if (node?.id) {
        fetchAuditLogs(node.id);
      }
    } else {
      bottomSheetRef.current?.close();
    }
  }, [visible, node?.id]);

  const fetchAuditLogs = useCallback(async (nodeId: string) => {
    setLoadingAudit(true);
    try {
      const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? '';
      const res = await fetch(`${BACKEND_URL}/api/provenance/node/${nodeId}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const json = await res.json();
        setAuditLogs(json.data ?? []);
      } else {
        setAuditLogs([]);
      }
    } catch {
      setAuditLogs([]);
    } finally {
      setLoadingAudit(false);
    }
  }, []);

  const handleExport = useCallback(async () => {
    if (!investigation) return;
    setExportLoading(true);
    try {
      await generateDossier(investigation);
      burnt.toast({ title: 'Chain of custody exported', preset: 'done' });
    } catch {
      burnt.toast({ title: 'Export failed', preset: 'error' });
    } finally {
      setExportLoading(false);
    }
  }, [investigation]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.6}
        pressBehavior="close"
        onPress={onClose}
      />
    ),
    [onClose]
  );

  const provenance = node?.provenance;
  const sources = node?.sources ?? [];
  const editHistory = provenance?.editHistory ?? [];

  // Combine edit history + audit logs for the history section
  const historyEntries: AuditEntry[] = [
    ...editHistory.map((e) => ({
      id: e.id,
      action: e.action,
      userId: e.userId,
      username: e.username,
      timestamp: e.timestamp,
    })),
    ...auditLogs,
  ].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: C.surface }}
      handleIndicatorStyle={{ backgroundColor: C.muted }}
      backdropComponent={renderBackdrop}
      onChange={(index: number) => {
        if (index === -1) {
          onClose();
        }
      }}
    >
      <BottomSheetScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingTop: 4,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: C.border,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Shield size={16} color={C.red} strokeWidth={2} />
            <Text style={{ color: C.text, fontSize: 16, fontWeight: '800', letterSpacing: 0.5 }}>
              Chain of Custody
            </Text>
          </View>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onClose();
            }}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: C.bg,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: C.border,
            }}
          >
            <X size={15} color={C.muted} strokeWidth={2.5} />
          </Pressable>
        </View>

        {/* Node title */}
        {node ? (
          <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.border }}>
            <Text style={{ color: C.muted, fontSize: 9, fontWeight: '800', letterSpacing: 2, marginBottom: 4 }}>
              NODE
            </Text>
            <Text style={{ color: C.text, fontSize: 15, fontWeight: '700' }} numberOfLines={2}>
              {node.title}
            </Text>
          </View>
        ) : null}

        {/* ── CONTRIBUTOR SECTION ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.border }}>
          <Text style={{ color: C.muted, fontSize: 9, fontWeight: '800', letterSpacing: 2, marginBottom: 12 }}>
            CONTRIBUTOR
          </Text>
          {provenance ? (
            <View style={{ gap: 10 }}>
              {/* Avatar + username + timestamp */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {provenance.addedByUsername ? (
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: C.red + '22',
                      borderWidth: 1.5,
                      borderColor: C.red + '66',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: C.red, fontSize: 15, fontWeight: '800' }}>
                      {provenance.addedByUsername.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                ) : (
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: C.border,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <User size={16} color={C.muted} strokeWidth={2} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, fontSize: 14, fontWeight: '700' }}>
                    {provenance.addedByUsername ?? 'You'}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <Clock size={10} color={C.muted} strokeWidth={2} />
                    <Text style={{ color: C.muted, fontSize: 11 }}>
                      {formatTimestamp(provenance.addedAt)}
                    </Text>
                  </View>
                </View>
                {/* Entry method badge */}
                <View
                  style={{
                    backgroundColor: getEntryMethodColor(provenance.entryMethod) + '22',
                    borderRadius: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderWidth: 1,
                    borderColor: getEntryMethodColor(provenance.entryMethod) + '66',
                  }}
                >
                  <Text
                    style={{
                      color: getEntryMethodColor(provenance.entryMethod),
                      fontSize: 10,
                      fontWeight: '700',
                    }}
                  >
                    {getEntryMethodLabel(provenance.entryMethod)}
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: C.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <User size={16} color={C.muted} strokeWidth={2} />
              </View>
              <View>
                <Text style={{ color: C.text, fontSize: 14, fontWeight: '600' }}>You</Text>
                <Text style={{ color: C.muted, fontSize: 11 }}>
                  {formatTimestamp(node?.createdAt)}
                </Text>
              </View>
              <View
                style={{
                  marginLeft: 'auto',
                  backgroundColor: '#3B82F622',
                  borderRadius: 6,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderWidth: 1,
                  borderColor: '#3B82F666',
                }}
              >
                <Text style={{ color: '#3B82F6', fontSize: 10, fontWeight: '700' }}>
                  Direct Add
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* ── SOURCES SECTION ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.border }}>
          <Text style={{ color: C.muted, fontSize: 9, fontWeight: '800', letterSpacing: 2, marginBottom: 12 }}>
            SOURCES
          </Text>
          {sources.length === 0 ? (
            <Text style={{ color: C.muted, fontSize: 13, fontStyle: 'italic' }}>
              No sources recorded
            </Text>
          ) : (
            <View style={{ gap: 12 }}>
              {sources.map((src) => {
                const badge = inferSourceTypeBadge(src);
                const credBadge = getCredibilityBadge(src.credibility);
                return (
                  <View
                    key={src.id}
                    style={{
                      backgroundColor: C.bg,
                      borderRadius: 10,
                      padding: 12,
                      borderWidth: 1,
                      borderColor: C.border,
                      gap: 8,
                    }}
                  >
                    {/* Source name + link */}
                    <Pressable
                      onPress={() => {
                        if (src.sourceUrl) {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          Linking.openURL(src.sourceUrl);
                        }
                      }}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                    >
                      {src.sourceUrl ? (
                        <Link2 size={13} color={C.pin} strokeWidth={2} />
                      ) : (
                        <FileText size={13} color={C.muted} strokeWidth={2} />
                      )}
                      <Text
                        style={{
                          color: src.sourceUrl ? C.pin : C.text,
                          fontSize: 13,
                          fontWeight: '700',
                          flex: 1,
                          textDecorationLine: src.sourceUrl ? 'underline' : 'none',
                        }}
                        numberOfLines={1}
                      >
                        {src.sourceName}
                      </Text>
                    </Pressable>

                    {/* Secondary source */}
                    {src.secondarySourceName ? (
                      <Pressable
                        onPress={() => {
                          if (src.secondarySourceUrl) {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            Linking.openURL(src.secondarySourceUrl);
                          }
                        }}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 4 }}
                      >
                        <Text style={{ color: C.muted, fontSize: 11, fontStyle: 'italic' }}>
                          via {src.secondarySourceName}
                        </Text>
                      </Pressable>
                    ) : null}

                    {/* Badges row */}
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      {/* Source type badge */}
                      <View
                        style={{
                          backgroundColor: C.surface,
                          borderRadius: 4,
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderWidth: 1,
                          borderColor: C.border,
                        }}
                      >
                        <Text style={{ color: C.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1 }}>
                          {badge.toUpperCase()}
                        </Text>
                      </View>

                      {/* Credibility badge */}
                      <View
                        style={{
                          backgroundColor: credBadge.color + '22',
                          borderRadius: 4,
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderWidth: 1,
                          borderColor: credBadge.color + '66',
                        }}
                      >
                        <Text style={{ color: credBadge.color, fontSize: 9, fontWeight: '800', letterSpacing: 1 }}>
                          {credBadge.label}
                        </Text>
                      </View>

                      {/* Platform badge */}
                      {src.platform ? (
                        <View
                          style={{
                            backgroundColor: C.border,
                            borderRadius: 4,
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                          }}
                        >
                          <Text style={{ color: C.muted, fontSize: 9, fontWeight: '700' }}>
                            {src.platform.toUpperCase()}
                          </Text>
                        </View>
                      ) : null}

                      {/* Verified badge */}
                      {src.credibility === 'confirmed' ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                          <Check size={10} color="#22C55E" strokeWidth={2.5} />
                          <Text style={{ color: '#22C55E', fontSize: 9, fontWeight: '700' }}>
                            VERIFIED
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Content summary */}
                    {src.contentSummary ? (
                      <Text style={{ color: C.muted, fontSize: 11, lineHeight: 16 }} numberOfLines={2}>
                        {src.contentSummary}
                      </Text>
                    ) : null}

                    {/* Verify button */}
                    {isOwnerOrCoInvestigator && src.credibility !== 'confirmed' ? (
                      <Pressable
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          onVerifySource(src.id);
                        }}
                        style={({ pressed }) => ({
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          paddingVertical: 8,
                          borderRadius: 8,
                          backgroundColor: pressed ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.1)',
                          borderWidth: 1,
                          borderColor: 'rgba(34,197,94,0.4)',
                          marginTop: 4,
                        })}
                      >
                        <Shield size={12} color="#22C55E" strokeWidth={2.5} />
                        <Text style={{ color: '#22C55E', fontSize: 12, fontWeight: '700' }}>
                          Verify Source
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* ── HISTORY SECTION ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.border }}>
          <Text style={{ color: C.muted, fontSize: 9, fontWeight: '800', letterSpacing: 2, marginBottom: 12 }}>
            HISTORY
          </Text>
          {loadingAudit ? (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <ActivityIndicator size="small" color={C.muted} />
            </View>
          ) : historyEntries.length === 0 ? (
            <Text style={{ color: C.muted, fontSize: 13, fontStyle: 'italic' }}>
              No history
            </Text>
          ) : (
            <View style={{ gap: 0 }}>
              {historyEntries.map((entry, idx) => (
                <View
                  key={entry.id}
                  style={{
                    flexDirection: 'row',
                    gap: 10,
                    paddingVertical: 10,
                    borderBottomWidth: idx < historyEntries.length - 1 ? 1 : 0,
                    borderBottomColor: C.border,
                  }}
                >
                  {/* Timeline dot */}
                  <View style={{ alignItems: 'center', paddingTop: 3 }}>
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: C.red,
                        opacity: 0.7,
                      }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.text, fontSize: 12, fontWeight: '600' }}>
                      {entry.action}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                      {entry.username ? (
                        <Text style={{ color: C.muted, fontSize: 10, fontWeight: '600' }}>
                          {entry.username}
                        </Text>
                      ) : null}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Clock size={9} color={C.muted} strokeWidth={2} />
                        <Text style={{ color: C.muted, fontSize: 10 }}>
                          {formatTimestamp(entry.timestamp)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── EXPORT CHAIN OF CUSTODY ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          <Pressable
            onPress={handleExport}
            disabled={exportLoading}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingVertical: 14,
              borderRadius: 12,
              backgroundColor: exportLoading
                ? C.border
                : pressed ? '#A3162E' : C.red,
              opacity: exportLoading ? 0.7 : 1,
            })}
          >
            {exportLoading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Download size={16} color="#FFF" strokeWidth={2.5} />
            )}
            <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '800', letterSpacing: 0.3 }}>
              {exportLoading ? 'Generating...' : 'Export Chain of Custody'}
            </Text>
          </Pressable>
          <Text style={{ color: C.muted, fontSize: 10, textAlign: 'center', marginTop: 8 }}>
            Generates a PDF dossier with full provenance record
          </Text>
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
