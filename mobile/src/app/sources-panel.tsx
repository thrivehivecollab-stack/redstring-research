import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  BookOpen,
  Users,
  CheckCircle,
  BarChart2,
  ChevronDown,
  ChevronUp,
  Globe,
  FileText,
  Link as LinkIcon,
  User,
  Video,
  Mic,
  File,
  Share2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import useInvestigationStore from '@/lib/state/investigation-store';
import type { NodeSource, CanvasNode } from '@/lib/types';

const C = {
  bg: '#1A1614',
  surface: '#231F1C',
  surfaceAlt: '#2A2522',
  card: '#F5ECD7',
  red: '#C41E3A',
  amber: '#D4A574',
  text: '#E8DCC8',
  muted: '#6B5B4F',
  border: '#3D332C',
  green: '#22C55E',
  blue: '#3B82F6',
} as const;

type ViewTab = 'by-source' | 'by-node';

function credibilityColor(cred: NodeSource['credibility']): string {
  switch (cred) {
    case 'confirmed': return C.green;
    case 'primary': return C.amber;
    case 'secondary': return C.blue;
    case 'unverified': return C.muted;
    case 'disputed': return C.red;
  }
}

function credibilityLabel(cred: NodeSource['credibility']): string {
  switch (cred) {
    case 'confirmed': return 'CONFIRMED';
    case 'primary': return 'PRIMARY';
    case 'secondary': return 'SECONDARY';
    case 'unverified': return 'UNVERIFIED';
    case 'disputed': return 'DISPUTED';
  }
}

function platformIcon(platform: NodeSource['platform'] | undefined): React.ReactElement {
  const size = 13;
  const color = C.muted;
  const sw = 2;
  switch (platform) {
    case 'x': return <Text style={{ color, fontSize: 11, fontWeight: '700' }}>X</Text>;
    case 'youtube': return <Video size={size} color={color} strokeWidth={sw} />;
    case 'podcast': return <Mic size={size} color={color} strokeWidth={sw} />;
    case 'website': return <Globe size={size} color={color} strokeWidth={sw} />;
    case 'facebook': return <Users size={size} color={color} strokeWidth={sw} />;
    case 'tiktok': return <Video size={size} color={color} strokeWidth={sw} />;
    case 'instagram': return <User size={size} color={color} strokeWidth={sw} />;
    default: return <Globe size={size} color={color} strokeWidth={sw} />;
  }
}

function nodeTypeIcon(type: CanvasNode['type']): React.ReactElement {
  const size = 14;
  const color = C.muted;
  const sw = 2;
  switch (type) {
    case 'link': return <LinkIcon size={size} color={color} strokeWidth={sw} />;
    case 'image': return <File size={size} color={color} strokeWidth={sw} />;
    case 'dataset': return <BarChart2 size={size} color={color} strokeWidth={sw} />;
    case 'note': return <FileText size={size} color={color} strokeWidth={sw} />;
    default: return <FileText size={size} color={color} strokeWidth={sw} />;
  }
}

function researchScoreLabel(score: number): string {
  if (score <= 20) return 'Early Research';
  if (score <= 40) return 'Growing';
  if (score <= 60) return 'Solid';
  if (score <= 80) return 'Thorough';
  return 'Exhaustive';
}

function researchScoreColor(score: number): string {
  if (score <= 20) return C.muted;
  if (score <= 40) return C.amber;
  if (score <= 60) return C.blue;
  if (score <= 80) return C.green;
  return C.amber;
}

// ---- Stat Card ----
function StatCard({
  label,
  value,
  sublabel,
  color,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  color?: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: C.surface,
        borderRadius: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: C.border,
        alignItems: 'center',
      }}
    >
      <Text style={{ color: color ?? C.text, fontSize: 22, fontWeight: '900' }}>
        {value}
      </Text>
      <Text style={{ color: C.muted, fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginTop: 2, textAlign: 'center' }}>
        {label}
      </Text>
      {sublabel ? (
        <Text style={{ color: color ?? C.muted, fontSize: 9, marginTop: 2, textAlign: 'center' }}>
          {sublabel}
        </Text>
      ) : null}
    </View>
  );
}

// ---- Source Group (by-source tab) ----
function SourceGroup({
  sourceName,
  platform,
  credibility,
  sourceUrl,
  secondarySourceName,
  nodeEntries,
  index,
}: {
  sourceName: string;
  platform: NodeSource['platform'] | undefined;
  credibility: NodeSource['credibility'];
  sourceUrl: string | undefined;
  secondarySourceName: string | undefined;
  nodeEntries: { nodeId: string; nodeTitle: string }[];
  index: number;
}) {
  const [expanded, setExpanded] = useState<boolean>(false);
  const credColor = credibilityColor(credibility);

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(300)}>
      <View
        style={{
          backgroundColor: C.surface,
          borderRadius: 12,
          marginHorizontal: 16,
          marginBottom: 10,
          borderWidth: 1,
          borderColor: C.border,
          overflow: 'hidden',
        }}
      >
        <Pressable
          onPress={() => {
            setExpanded((v) => !v);
            Haptics.selectionAsync();
          }}
          style={({ pressed }) => ({
            padding: 14,
            backgroundColor: pressed ? C.surfaceAlt : 'transparent',
          })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {platformIcon(platform)}
            <Text style={{ flex: 1, color: C.text, fontSize: 14, fontWeight: '700' }} numberOfLines={1}>
              {sourceName}
            </Text>
            <View
              style={{
                backgroundColor: credColor + '22',
                borderRadius: 5,
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderWidth: 1,
                borderColor: credColor + '44',
              }}
            >
              <Text style={{ color: credColor, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 }}>
                {credibilityLabel(credibility)}
              </Text>
            </View>
            {expanded ? (
              <ChevronUp size={14} color={C.muted} strokeWidth={2} />
            ) : (
              <ChevronDown size={14} color={C.muted} strokeWidth={2} />
            )}
          </View>

          {secondarySourceName ? (
            <Text style={{ color: C.muted, fontSize: 11, marginTop: 4 }} numberOfLines={1}>
              via {secondarySourceName}
            </Text>
          ) : null}

          <Text style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>
            {nodeEntries.length} {nodeEntries.length === 1 ? 'node' : 'nodes'}
          </Text>
        </Pressable>

        {expanded ? (
          <View
            style={{
              paddingHorizontal: 14,
              paddingBottom: 12,
              borderTopWidth: 1,
              borderTopColor: C.border,
              paddingTop: 10,
            }}
          >
            {nodeEntries.map((entry) => (
              <View
                key={entry.nodeId}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingVertical: 5,
                }}
              >
                <View
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 3,
                    backgroundColor: C.amber,
                  }}
                />
                <Text style={{ color: C.text, fontSize: 13 }} numberOfLines={1}>
                  {entry.nodeTitle}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

// ---- Node Entry (by-node tab) ----
function NodeSourceEntry({
  node,
  index,
}: {
  node: CanvasNode;
  index: number;
}) {
  const [expanded, setExpanded] = useState<boolean>(false);
  const sources = node.sources ?? [];

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(300)}>
      <View
        style={{
          backgroundColor: C.surface,
          borderRadius: 12,
          marginHorizontal: 16,
          marginBottom: 10,
          borderWidth: 1,
          borderColor: C.border,
          overflow: 'hidden',
        }}
      >
        <Pressable
          onPress={() => {
            setExpanded((v) => !v);
            Haptics.selectionAsync();
          }}
          style={({ pressed }) => ({
            padding: 14,
            backgroundColor: pressed ? C.surfaceAlt : 'transparent',
          })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {nodeTypeIcon(node.type)}
            <Text style={{ flex: 1, color: C.text, fontSize: 14, fontWeight: '700' }} numberOfLines={1}>
              {node.title}
            </Text>
            <Text style={{ color: C.muted, fontSize: 12 }}>
              {sources.length} {sources.length === 1 ? 'source' : 'sources'}
            </Text>
            {expanded ? (
              <ChevronUp size={14} color={C.muted} strokeWidth={2} />
            ) : (
              <ChevronDown size={14} color={C.muted} strokeWidth={2} />
            )}
          </View>
        </Pressable>

        {expanded ? (
          <View
            style={{
              paddingHorizontal: 14,
              paddingBottom: 12,
              borderTopWidth: 1,
              borderTopColor: C.border,
              paddingTop: 10,
              gap: 8,
            }}
          >
            {sources.map((src) => {
              const credColor = credibilityColor(src.credibility);
              return (
                <View
                  key={src.id}
                  style={{
                    backgroundColor: C.surfaceAlt,
                    borderRadius: 8,
                    padding: 10,
                    borderWidth: 1,
                    borderColor: C.border,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    {platformIcon(src.platform)}
                    <Text style={{ flex: 1, color: C.text, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
                      {src.sourceName}
                    </Text>
                    <View
                      style={{
                        backgroundColor: credColor + '22',
                        borderRadius: 5,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderWidth: 1,
                        borderColor: credColor + '44',
                      }}
                    >
                      <Text style={{ color: credColor, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 }}>
                        {credibilityLabel(src.credibility)}
                      </Text>
                    </View>
                  </View>
                  {src.contentType ? (
                    <Text style={{ color: C.muted, fontSize: 11 }}>
                      {src.contentType}
                    </Text>
                  ) : null}
                  {src.secondarySourceName ? (
                    <Text style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>
                      via {src.secondarySourceName}
                    </Text>
                  ) : null}
                  {src.sourceUrl ? (
                    <Text style={{ color: C.blue, fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                      {src.sourceUrl}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

// ---- Main Screen ----
export default function SourcesPanelScreen() {
  const router = useRouter();
  const { investigationId } = useLocalSearchParams<{ investigationId: string }>();
  const [activeTab, setActiveTab] = useState<ViewTab>('by-source');

  const investigations = useInvestigationStore((s) => s.investigations);
  const investigation = useMemo(
    () => investigations.find((inv) => inv.id === investigationId),
    [investigations, investigationId]
  );

  const nodes = investigation?.nodes ?? [];

  // Gather all sources across all nodes
  const allSources = useMemo(() => {
    const result: { source: NodeSource; nodeId: string; nodeTitle: string }[] = [];
    for (const node of nodes) {
      for (const src of node.sources ?? []) {
        result.push({ source: src, nodeId: node.id, nodeTitle: node.title });
      }
    }
    return result;
  }, [nodes]);

  // Stats
  const totalSources = allSources.length;
  const uniqueContributors = useMemo(
    () => new Set(allSources.map((s) => s.source.sourceName)).size,
    [allSources]
  );
  const verifiedCount = useMemo(
    () => allSources.filter((s) => s.source.credibility === 'confirmed').length,
    [allSources]
  );
  const researchScore = Math.min(
    100,
    totalSources * 2 + uniqueContributors * 5 + verifiedCount * 10
  );

  // Group sources by sourceName for by-source tab
  const sourceGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        sourceName: string;
        platform: NodeSource['platform'] | undefined;
        credibility: NodeSource['credibility'];
        sourceUrl: string | undefined;
        secondarySourceName: string | undefined;
        nodeEntries: { nodeId: string; nodeTitle: string }[];
      }
    >();

    for (const entry of allSources) {
      const key = entry.source.sourceName;
      if (!map.has(key)) {
        map.set(key, {
          sourceName: entry.source.sourceName,
          platform: entry.source.platform,
          credibility: entry.source.credibility,
          sourceUrl: entry.source.sourceUrl,
          secondarySourceName: entry.source.secondarySourceName,
          nodeEntries: [],
        });
      }
      map.get(key)!.nodeEntries.push({
        nodeId: entry.nodeId,
        nodeTitle: entry.nodeTitle,
      });
    }
    return Array.from(map.values());
  }, [allSources]);

  // Nodes with sources for by-node tab
  const nodesWithSources = useMemo(
    () => nodes.filter((n) => (n.sources ?? []).length > 0),
    [nodes]
  );

  const handleExportCitations = useCallback(async () => {
    if (!investigation) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const now = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const lines: string[] = [
      `RED STRING RESEARCH — ${investigation.title}`,
      'SOURCES & CITATIONS',
      `Generated: ${now}`,
      '━━━━━━━━━━━━━━━━━━',
    ];

    for (const node of nodesWithSources) {
      lines.push('');
      lines.push(`[${node.title.toUpperCase()}]`);
      for (const src of node.sources ?? []) {
        lines.push(
          `  • ${src.sourceName}${src.platform ? ` (${src.platform})` : ''}${src.contentType ? ` — ${src.contentType}` : ''}`
        );
        if (src.sourceUrl) lines.push(`    Link: ${src.sourceUrl}`);
        if (src.secondarySourceName) lines.push(`    Secondary: ${src.secondarySourceName}`);
        lines.push(`    Credibility: ${src.credibility}`);
      }
      lines.push('━━━━━━━━━━━━━━━━━━');
    }

    lines.push('');
    lines.push('Research conducted using Red String Research');

    try {
      await Share.share({
        message: lines.join('\n'),
        title: `${investigation.title} — Sources`,
      });
    } catch {
      // ignore
    }
  }, [investigation, nodesWithSources]);

  if (!investigation) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: C.muted, fontSize: 14 }}>Investigation not found.</Text>
      </View>
    );
  }

  const scoreColor = researchScoreColor(researchScore);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }} testID="sources-panel-screen">
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: C.border,
            gap: 12,
          }}
        >
          <Pressable
            testID="sources-panel-back"
            onPress={() => router.back()}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: pressed ? C.border : C.surface,
              alignItems: 'center',
              justifyContent: 'center',
            })}
          >
            <ArrowLeft size={18} color={C.text} strokeWidth={2} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.text, fontSize: 16, fontWeight: '900', letterSpacing: 1.5 }}>
              SOURCES & RESEARCH
            </Text>
            <Text style={{ color: C.muted, fontSize: 12 }} numberOfLines={1}>
              {investigation.title}
            </Text>
          </View>
          <BookOpen size={18} color={C.muted} strokeWidth={1.5} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Stats grid */}
          <View style={{ padding: 16, gap: 10 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <StatCard label="TOTAL SOURCES" value={totalSources} />
              <StatCard label="CONTRIBUTORS" value={uniqueContributors} color={C.amber} />
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <StatCard label="VERIFIED" value={verifiedCount} color={C.green} />
              <StatCard
                label="RESEARCH SCORE"
                value={researchScore}
                sublabel={researchScoreLabel(researchScore)}
                color={scoreColor}
              />
            </View>
          </View>

          {/* Tab switcher */}
          <View
            style={{
              flexDirection: 'row',
              marginHorizontal: 16,
              marginBottom: 16,
              backgroundColor: C.surface,
              borderRadius: 10,
              padding: 4,
              borderWidth: 1,
              borderColor: C.border,
            }}
          >
            {(['by-source', 'by-node'] as ViewTab[]).map((tab) => {
              const isActive = activeTab === tab;
              return (
                <Pressable
                  key={tab}
                  testID={`sources-tab-${tab}`}
                  onPress={() => {
                    setActiveTab(tab);
                    Haptics.selectionAsync();
                  }}
                  style={{
                    flex: 1,
                    backgroundColor: isActive ? C.red : 'transparent',
                    borderRadius: 8,
                    paddingVertical: 8,
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: isActive ? '#FFF' : C.muted,
                      fontSize: 11,
                      fontWeight: '800',
                      letterSpacing: 0.5,
                    }}
                  >
                    {tab === 'by-source' ? 'BY SOURCE' : 'BY NODE'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Empty state */}
          {allSources.length === 0 ? (
            <View style={{ alignItems: 'center', paddingHorizontal: 40, paddingTop: 40 }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: C.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}
              >
                <BookOpen size={28} color={C.muted} strokeWidth={1.5} />
              </View>
              <Text style={{ color: C.text, fontSize: 16, fontWeight: '700', marginBottom: 8, textAlign: 'center' }}>
                No Sources Yet
              </Text>
              <Text style={{ color: C.muted, fontSize: 13, lineHeight: 20, textAlign: 'center' }}>
                Add sources to your nodes on the canvas to track your research here.
              </Text>
            </View>
          ) : activeTab === 'by-source' ? (
            sourceGroups.map((group, i) => (
              <SourceGroup
                key={group.sourceName}
                sourceName={group.sourceName}
                platform={group.platform}
                credibility={group.credibility}
                sourceUrl={group.sourceUrl}
                secondarySourceName={group.secondarySourceName}
                nodeEntries={group.nodeEntries}
                index={i}
              />
            ))
          ) : (
            nodesWithSources.map((node, i) => (
              <NodeSourceEntry key={node.id} node={node} index={i} />
            ))
          )}

          {/* Export button */}
          {allSources.length > 0 ? (
            <Pressable
              testID="export-citations-button"
              onPress={handleExportCitations}
              style={({ pressed }) => ({
                marginHorizontal: 16,
                marginTop: 20,
                backgroundColor: pressed ? C.surfaceAlt : C.surface,
                borderRadius: 12,
                padding: 14,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                borderWidth: 1,
                borderColor: C.border,
              })}
            >
              <Share2 size={16} color={C.amber} strokeWidth={2} />
              <Text style={{ color: C.amber, fontSize: 14, fontWeight: '700' }}>
                Export Citations
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
