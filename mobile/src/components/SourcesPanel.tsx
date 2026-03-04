import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Share,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  BookOpen,
  Twitter,
  Video,
  Globe,
  User,
  FileText,
  Music,
  ChevronDown,
  ChevronRight,
  Share2,
  Bookmark,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import type { Investigation, NodeSource, CanvasNode } from '@/lib/types';

const C = {
  bg: '#1A1614',
  surface: '#231F1C',
  card: '#F5ECD7',
  red: '#C41E3A',
  pin: '#D4A574',
  text: '#E8DCC8',
  muted: '#6B5B4F',
  border: '#3D332C',
} as const;

type CredibilityKey = NodeSource['credibility'];

const CREDIBILITY_COLORS: Record<CredibilityKey, string> = {
  confirmed: '#22C55E',
  primary: '#3B82F6',
  secondary: '#F59E0B',
  unverified: '#6B5B4F',
  disputed: '#C41E3A',
};

function getPlatformIcon(source: NodeSource): React.ComponentType<{ size: number; color: string; strokeWidth: number }> {
  const p = source.platform;
  if (p === 'x') return Twitter;
  if (p === 'tiktok' || p === 'youtube') return Video;
  if (p === 'podcast') return Music;
  if (p === 'instagram' || p === 'facebook') return Globe;
  if (p === 'website') return Globe;
  if (source.sourceType === 'person') return User;
  if (source.sourceType === 'document') return FileText;
  return Globe;
}

function CredibilityBadge({ credibility }: { credibility: CredibilityKey }) {
  const color = CREDIBILITY_COLORS[credibility];
  return (
    <View style={{
      backgroundColor: color + '33',
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderWidth: 1,
      borderColor: color + '55',
    }}>
      <Text style={{ color, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {credibility}
      </Text>
    </View>
  );
}

function StatCard({ value, label }: { value: string | number; label: string }) {
  return (
    <View style={{
      flex: 1,
      backgroundColor: C.bg,
      borderRadius: 10,
      padding: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: C.border,
    }}>
      <Text style={{ color: C.text, fontSize: 22, fontWeight: '900', marginBottom: 2 }}>{value}</Text>
      <Text style={{ color: C.muted, fontSize: 9, fontWeight: '700', letterSpacing: 0.8, textAlign: 'center' }}>{label}</Text>
    </View>
  );
}

function computeStats(investigation: Investigation) {
  const allSources: NodeSource[] = [];
  for (const node of investigation.nodes) {
    for (const s of node.sources ?? []) {
      allSources.push(s);
    }
  }
  const totalSources = allSources.length;
  const uniqueContributors = new Set(allSources.map((s) => s.sourceName)).size;
  const verifiedSources = allSources.filter(
    (s) => s.credibility === 'confirmed' || s.credibility === 'primary'
  ).length;
  const score = Math.min(100, totalSources * 2 + uniqueContributors * 5 + verifiedSources * 10);
  let label = 'Early Research';
  if (score > 80) label = 'Exhaustive';
  else if (score > 60) label = 'Thorough';
  else if (score > 40) label = 'Solid';
  else if (score > 20) label = 'Growing';
  return { totalSources, uniqueContributors, verifiedSources, score, label };
}

interface SourceGroupProps {
  sourceName: string;
  sources: NodeSource[];
  nodes: CanvasNode[];
  nodeIdToTitle: Map<string, string>;
}

function SourceGroup({ sourceName, sources, nodeIdToTitle }: SourceGroupProps) {
  const [expanded, setExpanded] = useState<boolean>(true);
  const first = sources[0];
  const PlatformIcon = getPlatformIcon(first);
  const nodeIds = [...new Set(sources.map((s) => (s as any).__nodeId as string).filter(Boolean))];

  return (
    <View style={{
      backgroundColor: C.surface,
      borderRadius: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: C.border,
      overflow: 'hidden',
    }}>
      <Pressable
        onPress={() => setExpanded((p) => !p)}
        style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 }}
      >
        <View style={{
          width: 32, height: 32, borderRadius: 16,
          backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center',
        }}>
          <PlatformIcon size={15} color={C.pin} strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.text, fontSize: 14, fontWeight: '700' }}>{sourceName}</Text>
          {first.secondarySourceName ? (
            <Text style={{ color: C.muted, fontSize: 11, marginTop: 1 }}>via {first.secondarySourceName}</Text>
          ) : null}
        </View>
        <CredibilityBadge credibility={first.credibility} />
        {expanded ? (
          <ChevronDown size={16} color={C.muted} strokeWidth={2} />
        ) : (
          <ChevronRight size={16} color={C.muted} strokeWidth={2} />
        )}
      </Pressable>

      {expanded ? (
        <View style={{ paddingHorizontal: 14, paddingBottom: 12, borderTopWidth: 1, borderTopColor: C.border }}>
          <Text style={{ color: C.muted, fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginTop: 10, marginBottom: 6 }}>
            CITED IN {nodeIds.length} NODE{nodeIds.length !== 1 ? 'S' : null}
          </Text>
          {nodeIds.map((nid) => (
            <View key={nid} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Bookmark size={11} color={C.pin} strokeWidth={2} />
              <Text style={{ color: C.pin, fontSize: 12, fontWeight: '600' }}>
                {nodeIdToTitle.get(nid) ?? 'Unknown Node'}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

interface SourcesPanelProps {
  investigation: Investigation;
  onClose: () => void;
}

export default function SourcesPanel({ investigation, onClose }: SourcesPanelProps) {
  const [activeTab, setActiveTab] = useState<'bySource' | 'byNode'>('bySource');

  const stats = useMemo(() => computeStats(investigation), [investigation]);

  // Build nodeIdToTitle map
  const nodeIdToTitle = useMemo(() => {
    const map = new Map<string, string>();
    for (const n of investigation.nodes) map.set(n.id, n.title);
    return map;
  }, [investigation.nodes]);

  // Group sources by sourceName, attaching __nodeId
  const sourceGroups = useMemo(() => {
    const groups = new Map<string, (NodeSource & { __nodeId: string })[]>();
    for (const node of investigation.nodes) {
      for (const s of node.sources ?? []) {
        const tagged = { ...s, __nodeId: node.id };
        const existing = groups.get(s.sourceName) ?? [];
        existing.push(tagged);
        groups.set(s.sourceName, existing);
      }
    }
    return groups;
  }, [investigation.nodes]);

  // Nodes with sources
  const nodesWithSources = useMemo(
    () => investigation.nodes.filter((n) => (n.sources ?? []).length > 0),
    [investigation.nodes]
  );

  const handleExport = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const separator = '━'.repeat(26);

    let text = `RED STRING RESEARCH — ${investigation.title}\nSOURCES & CITATIONS\nGenerated: ${date}\n${separator}\n`;

    for (const node of nodesWithSources) {
      text += `\nNODE: ${node.title}\n`;
      for (const s of node.sources ?? []) {
        text += `  • ${s.sourceName}`;
        if (s.platform) text += ` (${s.platform})`;
        if (s.contentType) text += ` — ${s.contentType.charAt(0).toUpperCase() + s.contentType.slice(1)}`;
        text += '\n';
        if (s.sourceUrl) text += `    Source: ${s.sourceUrl}\n`;
        if (s.secondarySourceName) text += `    Secondary: ${s.secondarySourceName}\n`;
        text += `    Credibility: ${s.credibility.charAt(0).toUpperCase() + s.credibility.slice(1)}\n`;
        if (s.contentSummary) text += `    Notes: ${s.contentSummary}\n`;
      }
      text += separator + '\n';
    }

    text += '\nResearch conducted using Red String Research';

    try {
      await Share.share({ message: text, title: `${investigation.title} — Sources` });
    } catch {
      // ignore
    }
  }, [investigation, nodesWithSources]);

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20,
            paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border,
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 2 }}>
                SOURCES & RESEARCH
              </Text>
              <Text style={{ color: C.text, fontSize: 18, fontWeight: '900' }} numberOfLines={1}>
                {investigation.title}
              </Text>
            </View>
            <Pressable
              testID="sources-panel-close"
              onPress={onClose}
              style={({ pressed }) => ({
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: pressed ? C.border : C.surface,
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 1, borderColor: C.border,
              })}
            >
              <X size={18} color={C.muted} strokeWidth={2} />
            </Pressable>
          </View>

          {/* Stats bar */}
          <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingVertical: 16 }}>
            <StatCard value={stats.totalSources} label="SOURCES" />
            <StatCard value={stats.uniqueContributors} label="CONTRIBUTORS" />
            <StatCard value={stats.verifiedSources} label="VERIFIED" />
            <StatCard value={stats.label} label="RESEARCH" />
          </View>

          {/* Tabs */}
          <View style={{
            flexDirection: 'row', marginHorizontal: 20, marginBottom: 12,
            backgroundColor: C.surface, borderRadius: 10, padding: 3,
            borderWidth: 1, borderColor: C.border,
          }}>
            {([
              { key: 'bySource' as const, label: 'BY SOURCE' },
              { key: 'byNode' as const, label: 'BY NODE' },
            ]).map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  testID={`sources-tab-${tab.key}`}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setActiveTab(tab.key);
                  }}
                  style={{
                    flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8,
                    backgroundColor: isActive ? C.red : 'transparent',
                  }}
                >
                  <Text style={{ color: isActive ? '#FFF' : C.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.8 }}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Content */}
          {stats.totalSources === 0 ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
              <BookOpen size={40} color={C.muted} strokeWidth={1.5} />
              <Text style={{ color: C.text, fontSize: 16, fontWeight: '700', marginTop: 16, marginBottom: 8, textAlign: 'center' }}>
                No sources yet
              </Text>
              <Text style={{ color: C.muted, fontSize: 13, lineHeight: 20, textAlign: 'center' }}>
                Open any node on the canvas and add sources to track your research trail.
              </Text>
            </View>
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
            >
              {activeTab === 'bySource' ? (
                <>
                  {Array.from(sourceGroups.entries()).map(([name, sources]) => (
                    <SourceGroup
                      key={name}
                      sourceName={name}
                      sources={sources}
                      nodes={investigation.nodes}
                      nodeIdToTitle={nodeIdToTitle}
                    />
                  ))}
                </>
              ) : (
                <>
                  {nodesWithSources.map((node) => (
                    <View key={node.id} style={{
                      backgroundColor: C.surface, borderRadius: 12, marginBottom: 10,
                      borderWidth: 1, borderColor: C.border, overflow: 'hidden',
                    }}>
                      <View style={{
                        flexDirection: 'row', alignItems: 'center', gap: 10,
                        padding: 14, borderBottomWidth: 1, borderBottomColor: C.border,
                      }}>
                        <FileText size={16} color={C.pin} strokeWidth={2} />
                        <Text style={{ color: C.text, fontSize: 14, fontWeight: '700', flex: 1 }} numberOfLines={1}>
                          {node.title}
                        </Text>
                        <Text style={{ color: C.muted, fontSize: 11 }}>
                          {(node.sources ?? []).length} source{(node.sources ?? []).length !== 1 ? 's' : null}
                        </Text>
                      </View>
                      <View style={{ padding: 12, gap: 8 }}>
                        {(node.sources ?? []).map((s) => {
                          const PIcon = getPlatformIcon(s);
                          const credColor = CREDIBILITY_COLORS[s.credibility];
                          return (
                            <View key={s.id} style={{
                              flexDirection: 'row', alignItems: 'center', gap: 10,
                              backgroundColor: credColor + '11',
                              borderRadius: 8, padding: 10,
                              borderWidth: 1, borderColor: credColor + '33',
                            }}>
                              <PIcon size={14} color={credColor} strokeWidth={2} />
                              <View style={{ flex: 1 }}>
                                <Text style={{ color: C.text, fontSize: 13, fontWeight: '600' }}>{s.sourceName}</Text>
                                {s.secondarySourceName ? (
                                  <Text style={{ color: C.muted, fontSize: 11 }}>via {s.secondarySourceName}</Text>
                                ) : null}
                              </View>
                              <CredibilityBadge credibility={s.credibility} />
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  ))}
                </>
              )}
            </ScrollView>
          )}

          {/* Export button */}
          {stats.totalSources > 0 ? (
            <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
              <Pressable
                testID="export-citations-button"
                onPress={handleExport}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? C.surface : C.bg,
                  borderRadius: 12, paddingVertical: 14,
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                  borderWidth: 1, borderColor: C.border,
                })}
              >
                <Share2 size={16} color={C.pin} strokeWidth={2} />
                <Text style={{ color: C.pin, fontSize: 15, fontWeight: '700' }}>EXPORT CITATIONS</Text>
              </Pressable>
            </View>
          ) : null}
        </SafeAreaView>
      </View>
    </Modal>
  );
}
