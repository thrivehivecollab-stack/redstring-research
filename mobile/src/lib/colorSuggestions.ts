// Color Suggestion Engine — pure local logic, no AI needed
import type { Investigation, CanvasNode, TagColor } from './types';

export const TAG_COLORS_MAP: Record<TagColor, string> = {
  red: '#C41E3A',
  blue: '#3B82F6',
  green: '#22C55E',
  amber: '#F59E0B',
  purple: '#A855F7',
  teal: '#14B8A6',
};

// The 6 canonical colors in order — maps to TagColor keys
export const SUGGESTION_PALETTE: Array<{ hex: string; key: TagColor }> = [
  { hex: '#C41E3A', key: 'red' },
  { hex: '#3B82F6', key: 'blue' },
  { hex: '#22C55E', key: 'green' },
  { hex: '#F59E0B', key: 'amber' },
  { hex: '#A855F7', key: 'purple' },
  { hex: '#14B8A6', key: 'teal' },
];

export interface ColorSuggestion {
  color: string;         // hex
  colorKey: TagColor;
  label: string;
  reason: string;
  affectedNodeIds: string[];
  affectedStringIds: string[];
}

// Months for date detection
const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
  'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
];

// Organization suffixes
const ORG_SUFFIXES = [
  'inc', 'inc.', 'corp', 'corp.', 'llc', 'ltd', 'ltd.', 'co.', 'company',
  'organization', 'organisation', 'agency', 'department', 'dept', 'bureau',
  'foundation', 'institute', 'authority', 'commission', 'council', 'group',
  'international', 'enterprises', 'associates', 'solutions', 'services',
];

// Location indicator words
const LOCATION_WORDS = [
  'at', 'in', 'near', 'location', 'located', 'address', 'street', 'avenue',
  'road', 'drive', 'blvd', 'boulevard', 'place', 'plaza', 'building', 'floor',
  'city', 'town', 'state', 'country', 'district', 'region', 'area', 'zone',
  'north', 'south', 'east', 'west', 'downtown', 'uptown', 'suburb',
];

function getNodeText(node: CanvasNode): string {
  return [node.title, node.content, node.description].filter(Boolean).join(' ');
}

// Extract capitalized multi-word tokens (potential names/places)
function extractCapitalizedTokens(text: string): string[] {
  const tokens: string[] = [];
  // Match sequences of capitalized words (1 or more)
  const matches = text.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g);
  if (matches) {
    for (const m of matches) {
      // Skip very common capitalized words at start of sentences
      const lower = m.toLowerCase();
      if (!MONTHS.includes(lower) && m.length > 2) {
        tokens.push(m);
      }
    }
  }
  return tokens;
}

// Detect if text has date-like patterns
function hasDateContent(text: string): boolean {
  const lower = text.toLowerCase();
  // MM/DD/YYYY or YYYY-MM-DD
  if (/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/.test(text)) return true;
  // Month names
  if (MONTHS.some((m) => lower.includes(m))) return true;
  // "in 2020", "year 1999"
  if (/\b(19|20)\d{2}\b/.test(text)) return true;
  return false;
}

// Detect organization keywords
function hasOrgContent(text: string): boolean {
  const lower = text.toLowerCase();
  return ORG_SUFFIXES.some((suffix) => {
    const pattern = new RegExp(`\\b${suffix.replace('.', '\\.')}\\b`);
    return pattern.test(lower);
  });
}

// Detect location keywords
function hasLocationContent(text: string): boolean {
  const lower = text.toLowerCase();
  return LOCATION_WORDS.some((word) => lower.includes(word));
}

// BFS to find all clusters of interconnected nodes
function findClusters(
  nodes: CanvasNode[],
  strings: Investigation['strings']
): string[][] {
  const adjacency = new Map<string, Set<string>>();
  for (const node of nodes) {
    adjacency.set(node.id, new Set());
  }
  for (const s of strings) {
    adjacency.get(s.fromNodeId)?.add(s.toNodeId);
    adjacency.get(s.toNodeId)?.add(s.fromNodeId);
  }

  const visited = new Set<string>();
  const clusters: string[][] = [];

  for (const node of nodes) {
    if (visited.has(node.id)) continue;
    const cluster: string[] = [];
    const queue: string[] = [node.id];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      cluster.push(current);
      const neighbors = adjacency.get(current) ?? new Set<string>();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push(neighbor);
        }
      }
    }
    if (cluster.length >= 2) {
      clusters.push(cluster);
    }
  }

  return clusters;
}

// Find strings connecting a set of node IDs
function stringsForNodeSet(
  nodeIds: string[],
  strings: Investigation['strings']
): string[] {
  const nodeSet = new Set(nodeIds);
  return strings
    .filter((s) => nodeSet.has(s.fromNodeId) && nodeSet.has(s.toNodeId))
    .map((s) => s.id);
}

export function generateColorSuggestions(investigation: Investigation): ColorSuggestion[] {
  const { nodes, strings } = investigation;
  if (nodes.length === 0) return [];

  const suggestions: ColorSuggestion[] = [];
  const usedColorIndices = new Set<number>();
  const usedNodeIds = new Set<string>();

  function nextColor(): { hex: string; key: TagColor } | null {
    for (let i = 0; i < SUGGESTION_PALETTE.length; i++) {
      if (!usedColorIndices.has(i)) {
        usedColorIndices.add(i);
        return SUGGESTION_PALETTE[i];
      }
    }
    return null;
  }

  // ---- 1. Detect people/names ----
  // Build a frequency map of capitalized tokens across all nodes
  const tokenNodeMap = new Map<string, Set<string>>(); // token -> set of nodeIds

  for (const node of nodes) {
    const text = getNodeText(node);
    const tokens = extractCapitalizedTokens(text);
    for (const token of tokens) {
      const key = token.toLowerCase();
      if (!tokenNodeMap.has(key)) tokenNodeMap.set(key, new Set());
      tokenNodeMap.get(key)!.add(node.id);
    }
  }

  // Find tokens appearing in 2+ nodes — likely names
  const nameMatches: Array<{ name: string; nodeIds: string[] }> = [];
  for (const [token, nodeIds] of tokenNodeMap.entries()) {
    if (nodeIds.size >= 2) {
      // Reconstruct original casing from first occurrence
      let originalName = token;
      for (const node of nodes) {
        const text = getNodeText(node);
        const matches = text.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g);
        if (matches) {
          const found = matches.find((m) => m.toLowerCase() === token);
          if (found) { originalName = found; break; }
        }
      }
      nameMatches.push({ name: originalName, nodeIds: Array.from(nodeIds) });
    }
  }

  // Group overlapping name matches into person clusters
  if (nameMatches.length > 0) {
    // Collect all affected node IDs across all name matches
    const allNameNodeIds = new Set<string>();
    const nameList: string[] = [];
    for (const m of nameMatches.slice(0, 5)) {
      m.nodeIds.forEach((id) => allNameNodeIds.add(id));
      nameList.push(m.name);
    }

    const color = nextColor();
    if (color && allNameNodeIds.size >= 2) {
      const nodeIds = Array.from(allNameNodeIds);
      suggestions.push({
        color: color.hex,
        colorKey: color.key,
        label: 'People',
        reason: `Detected names: ${nameList.slice(0, 3).join(', ')}${nameList.length > 3 ? ` +${nameList.length - 3} more` : ''} — found in ${nodeIds.length} node${nodeIds.length === 1 ? '' : 's'}`,
        affectedNodeIds: nodeIds,
        affectedStringIds: stringsForNodeSet(nodeIds, strings),
      });
      nodeIds.forEach((id) => usedNodeIds.add(id));
    }
  }

  // ---- 2. Detect locations ----
  const locationNodeIds = nodes
    .filter((n) => hasLocationContent(getNodeText(n)))
    .map((n) => n.id);

  if (locationNodeIds.length >= 2) {
    const color = nextColor();
    if (color) {
      suggestions.push({
        color: color.hex,
        colorKey: color.key,
        label: 'Locations',
        reason: `Found location keywords in ${locationNodeIds.length} node${locationNodeIds.length === 1 ? '' : 's'}`,
        affectedNodeIds: locationNodeIds,
        affectedStringIds: stringsForNodeSet(locationNodeIds, strings),
      });
      locationNodeIds.forEach((id) => usedNodeIds.add(id));
    }
  }

  // ---- 3. Detect dates/timeline items ----
  const timelineNodeIds = nodes
    .filter((n) => hasDateContent(getNodeText(n)) || n.timestamp != null)
    .map((n) => n.id);

  if (timelineNodeIds.length >= 2) {
    const color = nextColor();
    if (color) {
      suggestions.push({
        color: color.hex,
        colorKey: color.key,
        label: 'Timeline Events',
        reason: `Found date references or timestamps in ${timelineNodeIds.length} node${timelineNodeIds.length === 1 ? '' : 's'}`,
        affectedNodeIds: timelineNodeIds,
        affectedStringIds: stringsForNodeSet(timelineNodeIds, strings),
      });
      timelineNodeIds.forEach((id) => usedNodeIds.add(id));
    }
  }

  // ---- 4. Detect organizations ----
  const orgNodeIds = nodes
    .filter((n) => hasOrgContent(getNodeText(n)))
    .map((n) => n.id);

  if (orgNodeIds.length >= 2) {
    const color = nextColor();
    if (color) {
      suggestions.push({
        color: color.hex,
        colorKey: color.key,
        label: 'Organizations',
        reason: `Found organization identifiers in ${orgNodeIds.length} node${orgNodeIds.length === 1 ? '' : 's'}`,
        affectedNodeIds: orgNodeIds,
        affectedStringIds: stringsForNodeSet(orgNodeIds, strings),
      });
      orgNodeIds.forEach((id) => usedNodeIds.add(id));
    }
  }

  // ---- 5. Detect node type clusters (links, images) ----
  const linkNodes = nodes.filter((n) => n.type === 'link').map((n) => n.id);
  if (linkNodes.length >= 3) {
    const color = nextColor();
    if (color) {
      suggestions.push({
        color: color.hex,
        colorKey: color.key,
        label: 'Sources & Links',
        reason: `${linkNodes.length} link-type nodes found`,
        affectedNodeIds: linkNodes,
        affectedStringIds: stringsForNodeSet(linkNodes, strings),
      });
      linkNodes.forEach((id) => usedNodeIds.add(id));
    }
  }

  const imageNodes = nodes.filter((n) => n.type === 'image').map((n) => n.id);
  if (imageNodes.length >= 3 && suggestions.length < 6) {
    const color = nextColor();
    if (color) {
      suggestions.push({
        color: color.hex,
        colorKey: color.key,
        label: 'Images & Media',
        reason: `${imageNodes.length} image-type nodes found`,
        affectedNodeIds: imageNodes,
        affectedStringIds: stringsForNodeSet(imageNodes, strings),
      });
      imageNodes.forEach((id) => usedNodeIds.add(id));
    }
  }

  // ---- 6. Detect connected clusters (BFS) — fill remaining slots ----
  if (suggestions.length < 6) {
    const clusters = findClusters(nodes, strings);
    // Sort by size descending, skip already-covered nodes
    const scoredClusters = clusters
      .map((cluster) => ({
        cluster,
        newNodes: cluster.filter((id) => !usedNodeIds.has(id)),
      }))
      .filter(({ newNodes }) => newNodes.length >= 2)
      .sort((a, b) => b.newNodes.length - a.newNodes.length);

    for (const { cluster, newNodes } of scoredClusters) {
      if (suggestions.length >= 6) break;
      const color = nextColor();
      if (!color) break;
      // Try to infer a label from tags on the cluster nodes
      const tagLabels: string[] = [];
      for (const nodeId of cluster) {
        const node = nodes.find((n) => n.id === nodeId);
        if (node) {
          for (const tag of node.tags) {
            if (!tagLabels.includes(tag.label)) tagLabels.push(tag.label);
          }
        }
      }
      const label = tagLabels.length > 0
        ? tagLabels.slice(0, 2).join(' / ')
        : `Cluster (${cluster.length} nodes)`;

      suggestions.push({
        color: color.hex,
        colorKey: color.key,
        label,
        reason: `${cluster.length} interconnected nodes — ${newNodes.length} not yet categorized`,
        affectedNodeIds: newNodes,
        affectedStringIds: stringsForNodeSet(cluster, strings),
      });
      newNodes.forEach((id) => usedNodeIds.add(id));
    }
  }

  // Sort by most nodes affected first
  return suggestions
    .sort((a, b) => b.affectedNodeIds.length - a.affectedNodeIds.length)
    .slice(0, 6);
}
