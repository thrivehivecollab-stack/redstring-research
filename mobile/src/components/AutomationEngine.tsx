import { useEffect, useRef } from 'react';
import useInvestigationStore from '@/lib/state/investigation-store';
import type { TagColor } from '@/lib/types';

const STOPWORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
  'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his',
  'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy',
  'did', 'she', 'use', 'way', 'will', 'with', 'this', 'that', 'from',
  'they', 'know', 'want', 'been', 'good', 'much', 'some', 'time', 'very',
  'when', 'come', 'here', 'just', 'like', 'long', 'make', 'many', 'more',
  'only', 'over', 'such', 'take', 'than', 'them', 'well', 'were',
]);

// Keyword to color rules (order matters — first match wins)
const COLOR_RULES: Array<{ keywords: string[]; color: TagColor }> = [
  { keywords: ['suspect', 'person', 'individual', 'witness', 'victim', 'perpetrator', 'accomplice'], color: 'red' },
  { keywords: ['location', 'place', 'address', 'building', 'city', 'town', 'country', 'state', 'area', 'site', 'venue'], color: 'blue' },
  { keywords: ['evidence', 'document', 'file', 'proof', 'record', 'photo', 'video', 'audio', 'exhibit'], color: 'green' },
  { keywords: ['date', 'timeline', 'event', 'incident', 'occurred', 'happened', 'before', 'after'], color: 'amber' },
  { keywords: ['organization', 'company', 'group', 'agency', 'department', 'bureau', 'corp', 'inc', 'llc', 'foundation'], color: 'purple' },
  { keywords: ['source', 'tip', 'report', 'news', 'article', 'interview', 'statement', 'testimony'], color: 'teal' },
];

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

function detectColor(title: string, content: string): TagColor | null {
  const text = `${title} ${content}`.toLowerCase();
  for (const rule of COLOR_RULES) {
    if (rule.keywords.some((kw) => text.includes(kw))) {
      return rule.color;
    }
  }
  return null;
}

export function useAutomationEngine(investigationId: string | null, onAutomationRan?: (msg: string) => void) {
  const investigations = useInvestigationStore((s) => s.investigations);
  const updateNode = useInvestigationStore((s) => s.updateNode);
  const addString = useInvestigationStore((s) => s.addString);
  const processedRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!investigationId) return;
    const inv = investigations.find((i) => i.id === investigationId);
    if (!inv) return;

    const existingStringCount = (inv.strings ?? []).length;
    if (existingStringCount > 30) return;

    let taggedCount = 0;
    let connectedCount = 0;

    for (const node of inv.nodes) {
      const lastProcessed = processedRef.current[node.id] ?? 0;
      if (node.updatedAt <= lastProcessed) continue;
      processedRef.current[node.id] = node.updatedAt;

      const title = node.title ?? '';
      const content = node.content ?? node.description ?? '';

      if (!node.color) {
        const detectedColor = detectColor(title, content);
        if (detectedColor) {
          updateNode(investigationId, node.id, { color: detectedColor });
          taggedCount++;
        }
      }

      const nodeKeywords = new Set(extractKeywords(`${title} ${content}`).filter((w) => w.length >= 5));
      if (nodeKeywords.size === 0) continue;

      const existingPairs = new Set((inv.strings ?? []).map((s) => `${s.toNodeId}`));

      for (const other of inv.nodes) {
        if (other.id === node.id) continue;
        if (existingPairs.has(`${other.id}`) || existingPairs.has(`${node.id}`)) continue;

        const otherKeywords = extractKeywords(`${other.title} ${other.content ?? other.description ?? ''}`).filter((w) => w.length >= 5);
        const shared = otherKeywords.filter((k) => nodeKeywords.has(k));
        if (shared.length < 2) continue;

        const bestKeyword = shared.sort((a, b) => b.length - a.length)[0];
        addString(investigationId, node.id, other.id, `Related: ${bestKeyword}`);
        existingPairs.add(`${other.id}`);
        connectedCount++;
      }
    }

    if ((taggedCount > 0 || connectedCount > 0) && onAutomationRan) {
      const parts: string[] = [];
      if (taggedCount > 0) parts.push(`tagged ${taggedCount} node${taggedCount > 1 ? 's' : ''}`);
      if (connectedCount > 0) parts.push(`found ${connectedCount} connection${connectedCount > 1 ? 's' : ''}`);
      onAutomationRan(`🤖 Auto-${parts.join(', ')}`);
    }
  }, [investigations, investigationId, updateNode, addString, onAutomationRan]);
}
