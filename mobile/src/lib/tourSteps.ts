export interface TourStep {
  id: string;
  screen: 'investigations' | 'canvas';
  title: string;
  description: string;
  targetId?: string;
  spotlightShape?: 'circle' | 'rect';
  spotlightPadding?: number;
  tooltipPosition?: 'top' | 'bottom' | 'center';
  action?: 'tap' | 'swipe' | 'none';
  highlightColor?: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    screen: 'investigations',
    title: 'Welcome to Red String Research',
    description: 'The investigation tool built for serious researchers, journalists, and truth-seekers. Let\'s take a quick tour.',
    tooltipPosition: 'center',
    action: 'none',
  },
  {
    id: 'investigations_list',
    screen: 'investigations',
    title: 'Your Investigations',
    description: 'Each case lives here. Create as many as your plan allows. Tap an investigation to open its canvas.',
    targetId: 'investigations-list',
    spotlightShape: 'rect',
    spotlightPadding: 12,
    tooltipPosition: 'top',
    action: 'tap',
  },
  {
    id: 'create_button',
    screen: 'investigations',
    title: 'Start a New Case',
    description: 'Tap + to create a new investigation. Give it a name and description.',
    targetId: 'new-investigation-button',
    spotlightShape: 'rect',
    spotlightPadding: 8,
    tooltipPosition: 'bottom',
    action: 'tap',
  },
  {
    id: 'sources_button',
    screen: 'investigations',
    title: 'Source Tracker',
    description: 'Every piece of evidence can be credited to its source — X users, articles, TikTok creators, anonymous tips. Full chain of custody.',
    tooltipPosition: 'center',
    action: 'none',
  },
  {
    id: 'tip_inbox',
    screen: 'investigations',
    title: 'Tip Inbox',
    description: 'Anyone can submit tips to you. AI vets every tip for credibility, extracts key claims, and flags red flags automatically.',
    tooltipPosition: 'center',
    action: 'none',
  },
  {
    id: 'canvas_intro',
    screen: 'canvas',
    title: 'The Investigation Canvas',
    description: 'Your corkboard. Drag anywhere, pinch to zoom, and connect evidence with red string.',
    tooltipPosition: 'center',
    action: 'none',
  },
  {
    id: 'add_node',
    screen: 'canvas',
    title: 'Add Evidence',
    description: 'Tap + to add any type of evidence: notes, links, images, folders, or datasets.',
    targetId: 'add-node-button',
    spotlightShape: 'circle',
    spotlightPadding: 10,
    tooltipPosition: 'bottom',
    action: 'tap',
    highlightColor: '#C41E3A',
  },
  {
    id: 'node_types',
    screen: 'canvas',
    title: '6 Node Types',
    description: 'Notes, Links, Images, Folders, Datasets, and nested Investigations. Every type of evidence has a home.',
    tooltipPosition: 'bottom',
    action: 'none',
  },
  {
    id: 'red_string',
    screen: 'canvas',
    title: 'Red String Connections',
    description: 'Tap the cable icon, then tap two nodes to connect them with red string. Change string color, thickness, even make it dashed.',
    targetId: 'connect-toggle',
    spotlightShape: 'circle',
    spotlightPadding: 10,
    tooltipPosition: 'bottom',
    action: 'tap',
    highlightColor: '#C41E3A',
  },
  {
    id: 'bezier_strings',
    screen: 'canvas',
    title: 'Dynamic Strings',
    description: 'Strings curve organically between nodes. They\'re flexible, colorable, and labeled — just like a real investigation board.',
    tooltipPosition: 'bottom',
    action: 'none',
  },
  {
    id: 'canvas_mode',
    screen: 'canvas',
    title: 'Corkboard vs Mind Map',
    description: 'Toggle between the classic corkboard and a neural network-style mind map. Same data, two perspectives.',
    targetId: 'canvas-mode-toggle',
    spotlightShape: 'circle',
    spotlightPadding: 10,
    tooltipPosition: 'bottom',
    action: 'tap',
  },
  {
    id: 'timeline',
    screen: 'canvas',
    title: 'Investigation Timeline',
    description: 'Every canvas has a timeline at the bottom. Add timestamps to evidence, create timelines per person, and track the full chronology.',
    tooltipPosition: 'top',
    action: 'none',
  },
  {
    id: 'color_legend',
    screen: 'canvas',
    title: 'Color Code System',
    description: 'The palette icon on the left is your color legend. Tap \'Suggest\' and AI analyzes your canvas to recommend a color-coding system.',
    tooltipPosition: 'center',
    action: 'none',
  },
  {
    id: 'color_stripe',
    screen: 'canvas',
    title: 'Color-Coded Cards',
    description: 'Each color represents a category — suspects, locations, confirmed evidence. Cards show a colored stripe so you can read your board at a glance.',
    tooltipPosition: 'bottom',
    action: 'none',
  },
  {
    id: 'node_sources',
    screen: 'canvas',
    title: 'Source Attribution',
    description: 'Tap any node, scroll to Sources, and log where that evidence came from. Credit X users, journalists, tipsters — even chain-of-custody secondary sources.',
    tooltipPosition: 'top',
    action: 'none',
  },
  {
    id: 'collab',
    screen: 'investigations',
    title: 'Collaborate Securely',
    description: 'Invite investigators with different permission levels. Contributors submit evidence to your approval queue. Every node shows who found it.',
    tooltipPosition: 'center',
    action: 'none',
  },
  {
    id: 'export',
    screen: 'canvas',
    title: 'Export Your Case',
    description: 'Generate a PDF case file, create a podcast script from your findings, or export a full citation list — all branded with Red String Research.',
    tooltipPosition: 'center',
    action: 'none',
  },
  {
    id: 'complete',
    screen: 'investigations',
    title: "You're Ready",
    description: 'Red String Research is your command center. Every thread leads somewhere. Start your first investigation.',
    tooltipPosition: 'center',
    action: 'none',
  },
];

export const TOTAL_TOUR_STEPS = TOUR_STEPS.length;
