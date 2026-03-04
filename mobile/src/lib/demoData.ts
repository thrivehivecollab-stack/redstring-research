import type { Investigation, CanvasNode, RedString, Timeline, ColorLegendEntry } from '@/lib/types';

function demoId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function makeNode(overrides: Partial<CanvasNode> & {
  id: string;
  title: string;
  position: { x: number; y: number };
}): CanvasNode {
  const now = Date.now();
  return {
    type: 'note',
    description: '',
    size: { width: 160, height: 100 },
    tags: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeString(
  id: string,
  fromNodeId: string,
  toNodeId: string,
  label: string,
  color: string,
  thickness?: number,
  style?: 'solid' | 'dashed' | 'dotted'
): RedString {
  return {
    id,
    fromNodeId,
    toNodeId,
    label,
    color,
    thickness: thickness ?? 2,
    style: style ?? 'solid',
    createdAt: Date.now(),
  };
}

export function createDemoInvestigation(): Investigation {
  const now = Date.now();

  // Node IDs
  const n001 = 'demo-node-001';
  const n002 = 'demo-node-002';
  const n003 = 'demo-node-003';
  const n004 = 'demo-node-004';
  const n005 = 'demo-node-005';
  const n006 = 'demo-node-006';
  const n007 = 'demo-node-007';
  const n008 = 'demo-node-008';
  const n009 = 'demo-node-009';
  const n010 = 'demo-node-010';
  const n011 = 'demo-node-011';
  const n012 = 'demo-node-012';
  const n013 = 'demo-node-013';
  const n014 = 'demo-node-014';
  const n015 = 'demo-node-015';

  const nodes: CanvasNode[] = [
    makeNode({
      id: n001,
      type: 'note',
      title: 'John Mercer',
      content: 'Senior executive at Nexus Capital. Traveled to Geneva 3x in Q3. Known associate of Viktor Sokolov.',
      color: 'red',
      tags: [{ id: demoId(), label: 'Suspect', color: 'red' }],
      position: { x: 400, y: 300 },
      sources: [{
        id: demoId(),
        sourceType: 'x_user',
        sourceName: '@investigator_mike',
        platform: 'x',
        credibility: 'secondary',
        contentType: 'testimony',
        addedAt: now,
      }],
    }),
    makeNode({
      id: n002,
      type: 'note',
      title: 'Viktor Sokolov',
      content: 'Russian national. Shell company director. Named in 3 offshore leaks. Denied visa to UK in 2019.',
      color: 'red',
      tags: [{ id: demoId(), label: 'Suspect', color: 'red' }],
      position: { x: 750, y: 200 },
    }),
    makeNode({
      id: n003,
      type: 'note',
      title: 'Nexus Capital LLC',
      content: 'Registered in Delaware 2018. No public-facing employees. $47M in transactions traced to Cayman accounts.',
      color: 'purple',
      tags: [{ id: demoId(), label: 'Organization', color: 'purple' }],
      position: { x: 550, y: 500 },
    }),
    makeNode({
      id: n004,
      type: 'link',
      title: 'Cayman Registry Leak',
      url: 'https://example.com/leak',
      content: 'Leaked document showing Nexus Capital listed as beneficial owner of 3 shell entities.',
      color: 'green',
      tags: [{ id: demoId(), label: 'Evidence', color: 'green' }],
      position: { x: 900, y: 450 },
    }),
    makeNode({
      id: n005,
      type: 'note',
      title: 'Geneva Meeting — Sept 14',
      content: 'Mercer and Sokolov photographed outside Banque Privee Zurich. Third party unidentified.',
      color: 'amber',
      tags: [{ id: demoId(), label: 'Timeline', color: 'amber' }],
      timestamp: new Date('2024-09-14').getTime(),
      position: { x: 300, y: 600 },
    }),
    makeNode({
      id: n006,
      type: 'note',
      title: 'Media Holdings Group',
      content: 'Parent company of 4 regional news outlets. Purchased in 2020 by anonymous trust. Editorial direction shifted post-acquisition.',
      color: 'purple',
      tags: [{ id: demoId(), label: 'Organization', color: 'purple' }],
      position: { x: 1100, y: 300 },
    }),
    makeNode({
      id: n007,
      type: 'note',
      title: 'Sarah Chen — Whistleblower',
      content: 'Former compliance officer at Nexus. Claims she was fired after flagging suspicious transfers. Testimony given Oct 2024.',
      color: 'blue',
      tags: [{ id: demoId(), label: 'Source', color: 'blue' }],
      position: { x: 150, y: 450 },
      sources: [{
        id: demoId(),
        sourceType: 'person',
        sourceName: 'Sarah Chen',
        contentType: 'testimony',
        credibility: 'primary',
        addedAt: now,
      }],
    }),
    makeNode({
      id: n008,
      type: 'image',
      title: 'Financial Flow Diagram',
      content: 'Wire transfer pattern: Nexus to 3 shell companies to Media Holdings. Estimated $12M over 18 months.',
      color: 'green',
      position: { x: 700, y: 650 },
    }),
    makeNode({
      id: n009,
      type: 'note',
      title: 'Epoch Times Article — Nov 3',
      content: 'Reports unnamed sources confirming Treasury investigation into offshore flows. Mercer named as person of interest.',
      color: 'green',
      tags: [{ id: demoId(), label: 'Confirmed', color: 'green' }],
      timestamp: new Date('2024-11-03').getTime(),
      sources: [{
        id: demoId(),
        sourceType: 'url',
        sourceName: 'Epoch Times',
        platform: 'website',
        sourceUrl: 'https://example.com',
        credibility: 'secondary',
        contentType: 'article',
        addedAt: now,
      }],
      position: { x: 1000, y: 150 },
    }),
    makeNode({
      id: n010,
      type: 'note',
      title: 'Anonymous Tip — Oct 28',
      content: 'Tipper claims third person in Geneva photo is a sitting EU parliament member. Cannot verify identity yet.',
      color: 'amber',
      tags: [{ id: demoId(), label: 'Unverified', color: 'amber' }],
      sources: [{
        id: demoId(),
        sourceType: 'tip',
        sourceName: 'Anonymous',
        credibility: 'unverified',
        contentType: 'tip',
        addedAt: now,
      }],
      position: { x: 500, y: 800 },
    }),
    makeNode({
      id: n011,
      type: 'folder',
      title: 'Financial Documents',
      content: 'Folder containing all financial evidence: bank records, wire transfers, corporate registries.',
      position: { x: 1200, y: 550 },
    }),
    makeNode({
      id: n012,
      type: 'note',
      title: 'EU Parliament Connection?',
      content: 'Cross-referencing Geneva visitor logs with parliament session records for Sept 14. Gap in attendance unexplained.',
      color: 'amber',
      tags: [{ id: demoId(), label: 'Lead', color: 'amber' }],
      position: { x: 350, y: 900 },
    }),
    makeNode({
      id: n013,
      type: 'link',
      title: 'Delaware Corp Registry',
      url: 'https://example.com/delaware',
      content: 'Nexus Capital registration documents. Registered agent: Blank & Associates LLC.',
      color: 'green',
      tags: [{ id: demoId(), label: 'Evidence', color: 'green' }],
      position: { x: 900, y: 700 },
    }),
    makeNode({
      id: n014,
      type: 'dataset',
      title: 'Transaction Log Q3 2024',
      content: '47 flagged transactions. 12 over $500K. All originating from accounts linked to Sokolov-adjacent entities.',
      color: 'blue',
      tags: [{ id: demoId(), label: 'Data', color: 'blue' }],
      position: { x: 1150, y: 700 },
    }),
    makeNode({
      id: n015,
      type: 'note',
      title: 'KEY QUESTION',
      content: 'Who is the third person in the Geneva photo? This is the missing link between the financial network and political influence.',
      color: 'red',
      tags: [{ id: demoId(), label: 'Priority', color: 'red' }],
      position: { x: 650, y: 950 },
    }),
  ];

  const strings: RedString[] = [
    makeString(demoId(), n001, n002, 'Known Associates', '#C41E3A', 3),
    makeString(demoId(), n001, n003, 'Executive', '#C41E3A'),
    makeString(demoId(), n002, n003, 'Director', '#C41E3A'),
    makeString(demoId(), n003, n004, 'Beneficial Owner', '#22C55E'),
    makeString(demoId(), n003, n006, 'Funds Flow', '#F59E0B', 3, 'dashed'),
    makeString(demoId(), n001, n005, 'Attended', '#F59E0B'),
    makeString(demoId(), n002, n005, 'Attended', '#F59E0B'),
    makeString(demoId(), n007, n003, 'Reported On', '#3B82F6'),
    makeString(demoId(), n008, n003, 'Documents', '#22C55E'),
    makeString(demoId(), n009, n001, 'Named', '#22C55E'),
    makeString(demoId(), n010, n005, 'Unverified Lead', '#F59E0B', 2, 'dotted'),
    makeString(demoId(), n015, n005, 'Mystery Person', '#C41E3A', 3),
  ];

  const timelines: Timeline[] = [
    {
      id: demoId(),
      label: 'MAIN TIMELINE',
      color: '#C41E3A',
      startYear: 2018,
      endYear: 2025,
      isMinimized: false,
      createdAt: now,
    },
    {
      id: demoId(),
      label: 'JOHN MERCER',
      color: '#3B82F6',
      startYear: 2020,
      endYear: 2025,
      isMinimized: true,
      createdAt: now,
    },
  ];

  const colorLegend: ColorLegendEntry[] = [
    { color: '#C41E3A', label: 'Suspects' },
    { color: '#3B82F6', label: 'Sources' },
    { color: '#22C55E', label: 'Confirmed Evidence' },
    { color: '#F59E0B', label: 'Leads / Timeline' },
    { color: '#A855F7', label: 'Organizations' },
    { color: '#14B8A6', label: 'Unverified' },
  ];

  return {
    id: 'demo-investigation',
    title: 'Operation: Shadow Network',
    description: 'Tracking the financial connections between offshore entities, media organizations, and political figures across 3 continents.',
    nodes,
    strings,
    timelines,
    colorLegend,
    isDemo: true,
    createdAt: now,
    updatedAt: now,
  };
}
