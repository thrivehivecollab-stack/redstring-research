import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Investigation, CanvasNode, RedString, Timeline, Position, NodeType, TagColor, Tag, AISuggestion, ColorLegendEntry, NodeSource, AccessLogEntry, NodeSticker, ChatHistoryMessage, InvestigationPermissions, NodeProvenanceRecord } from '@/lib/types';
import { api } from '@/lib/api/api';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

const TIMELINE_COLORS = [
  '#C41E3A', '#3B82F6', '#22C55E', '#F59E0B',
  '#A855F7', '#14B8A6', '#F97316', '#EC4899',
];

interface InvestigationStore {
  investigations: Investigation[];
  activeInvestigationId: string | null;
  selectedNodeId: string | null;
  connectingFromId: string | null;
  viewMode: 'canvas' | 'list';
  canvasMode: 'corkboard' | 'mindmap';

  // Investigation CRUD
  createInvestigation: (title: string, description?: string) => string;
  deleteInvestigation: (id: string) => void;
  setActiveInvestigation: (id: string | null) => void;

  // Node CRUD
  addNode: (investigationId: string, type: NodeType, title: string, position: Position, extras?: Partial<CanvasNode>) => string;
  updateNode: (investigationId: string, nodeId: string, updates: Partial<CanvasNode>) => void;
  deleteNode: (investigationId: string, nodeId: string) => void;
  moveNode: (investigationId: string, nodeId: string, position: Position) => void;

  // Source CRUD
  addSource: (investigationId: string, nodeId: string, source: Omit<NodeSource, 'id' | 'addedAt'>) => void;
  updateSource: (investigationId: string, nodeId: string, sourceId: string, updates: Partial<NodeSource>) => void;
  removeSource: (investigationId: string, nodeId: string, sourceId: string) => void;

  // Red String CRUD
  addString: (investigationId: string, fromNodeId: string, toNodeId: string, label?: string, color?: string) => string;
  updateString: (investigationId: string, stringId: string, updates: Partial<RedString>) => void;
  deleteString: (investigationId: string, stringId: string) => void;

  // Timeline CRUD
  addTimeline: (investigationId: string, label: string) => string;
  updateTimeline: (investigationId: string, timelineId: string, updates: Partial<Timeline>) => void;
  deleteTimeline: (investigationId: string, timelineId: string) => void;
  toggleTimelineMinimized: (investigationId: string, timelineId: string) => void;

  // Selection
  setSelectedNode: (nodeId: string | null) => void;
  setConnectingFrom: (nodeId: string | null) => void;
  setViewMode: (mode: 'canvas' | 'list') => void;
  setCanvasMode: (mode: 'corkboard' | 'mindmap') => void;

  // Helpers
  getActiveInvestigation: () => Investigation | undefined;

  // Color Legend
  updateColorLegend: (investigationId: string, legend: ColorLegendEntry[]) => void;

  // Demo
  addDemoInvestigation: (investigation: Investigation) => void;
  removeDemoInvestigation: () => void;

  // Undo
  restoreInvestigation: (investigation: Investigation) => void;

  // ─── New actions ──────────────────────────────────────────────────────────
  updateInvestigationMeta: (id: string, updates: Partial<Investigation>) => void;
  setInvestigationPin: (id: string, pinHash: string) => void;
  logAccess: (id: string, entry: Omit<AccessLogEntry, 'id'>) => void;
  addSticker: (investigationId: string, nodeId: string, sticker: Omit<NodeSticker, 'id'>) => void;
  removeSticker: (investigationId: string, nodeId: string, stickerId: string) => void;
  toggleInvisibleInk: (investigationId: string, nodeId: string) => void;

  // ─── Chat history ──────────────────────────────────────────────────────────
  saveChatMessage: (investigationId: string, message: ChatHistoryMessage) => void;
  updateMessageFeedback: (investigationId: string, messageId: string, feedback: 'up' | 'down' | null) => void;
  updateChatMessage: (investigationId: string, messageId: string, updates: Partial<ChatHistoryMessage>) => void;
  clearChatHistory: (investigationId: string) => void;
  updateInvestigationTimelineSettings: (id: string, settings: Investigation['timelineSettings']) => void;
}

const useInvestigationStore = create<InvestigationStore>()(
  persist(
    (set, get) => ({
      investigations: [],
      activeInvestigationId: null,
      selectedNodeId: null,
      connectingFromId: null,
      viewMode: 'canvas',
      canvasMode: 'corkboard',

      createInvestigation: (title, description) => {
        const id = generateId();
        const now = Date.now();
        const currentYear = new Date().getFullYear();
        const mainTimeline: Timeline = {
          id: generateId(),
          label: 'MAIN',
          color: '#C41E3A',
          startYear: 1900,
          endYear: currentYear,
          isMinimized: false,
          createdAt: now,
        };
        const investigation: Investigation = {
          id,
          title,
          description,
          nodes: [],
          strings: [],
          timelines: [mainTimeline],
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          investigations: [...state.investigations, investigation],
          activeInvestigationId: id,
        }));
        return id;
      },

      deleteInvestigation: (id) => {
        set((state) => ({
          investigations: state.investigations.filter((inv) => inv.id !== id),
          activeInvestigationId: state.activeInvestigationId === id ? null : state.activeInvestigationId,
        }));
      },

      setActiveInvestigation: (id) => {
        set({ activeInvestigationId: id, selectedNodeId: null, connectingFromId: null });
      },

      addNode: (investigationId, type, title, position, extras) => {
        const nodeId = generateId();
        const now = Date.now();
        const node: CanvasNode = {
          id: nodeId,
          type,
          title,
          position,
          size: { width: 180, height: 110 },
          tags: [],
          createdAt: now,
          updatedAt: now,
          ...extras,
          provenance: {
            entryMethod: extras?.provenance?.entryMethod ?? 'direct_add',
            addedAt: now,
            editHistory: [],
            ...extras?.provenance,
          },
        };
        set((state) => ({
          investigations: state.investigations.map((inv) =>
            inv.id === investigationId
              ? { ...inv, nodes: [...inv.nodes, node], updatedAt: now }
              : inv
          ),
        }));
        return nodeId;
      },

      updateNode: (investigationId, nodeId, updates) => {
        const now = Date.now();
        set((state) => ({
          investigations: state.investigations.map((inv) =>
            inv.id === investigationId
              ? {
                  ...inv,
                  nodes: inv.nodes.map((n) =>
                    n.id === nodeId ? { ...n, ...updates, updatedAt: now } : n
                  ),
                  updatedAt: now,
                }
              : inv
          ),
        }));
      },

      deleteNode: (investigationId, nodeId) => {
        const now = Date.now();
        set((state) => ({
          investigations: state.investigations.map((inv) =>
            inv.id === investigationId
              ? {
                  ...inv,
                  nodes: inv.nodes.filter((n) => n.id !== nodeId),
                  strings: (inv.strings ?? []).filter(
                    (s) => s.fromNodeId !== nodeId && s.toNodeId !== nodeId
                  ),
                  updatedAt: now,
                }
              : inv
          ),
          selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
        }));
      },

      moveNode: (investigationId, nodeId, position) => {
        set((state) => ({
          investigations: state.investigations.map((inv) =>
            inv.id === investigationId
              ? {
                  ...inv,
                  nodes: inv.nodes.map((n) =>
                    n.id === nodeId ? { ...n, position } : n
                  ),
                }
              : inv
          ),
        }));
      },

      addSource: (investigationId, nodeId, source) => {
        const sourceId = generateId();
        const now = Date.now();
        const newSource: NodeSource = {
          ...source,
          id: sourceId,
          addedAt: now,
        };
        set((state) => ({
          investigations: state.investigations.map((inv) =>
            inv.id === investigationId
              ? {
                  ...inv,
                  nodes: inv.nodes.map((n) =>
                    n.id === nodeId
                      ? { ...n, sources: [...(n.sources ?? []), newSource], updatedAt: now }
                      : n
                  ),
                  updatedAt: now,
                }
              : inv
          ),
        }));
        // Fire-and-forget sync to backend
        api.post('/api/sources', {
          investigationId,
          nodeId,
          sourceType: newSource.sourceType,
          sourceName: newSource.sourceName,
          sourceHandle: newSource.sourceHandle,
          sourceUrl: newSource.sourceUrl,
          sourceProfileUrl: newSource.sourceProfileUrl,
          platform: newSource.platform,
          contentType: newSource.contentType,
          contentSummary: newSource.contentSummary,
          secondarySourceName: newSource.secondarySourceName,
          secondarySourceUrl: newSource.secondarySourceUrl,
          credibility: newSource.credibility,
        }).catch(() => {/* ignore errors */});
      },

      updateSource: (investigationId, nodeId, sourceId, updates) => {
        const now = Date.now();
        set((state) => ({
          investigations: state.investigations.map((inv) =>
            inv.id === investigationId
              ? {
                  ...inv,
                  nodes: inv.nodes.map((n) =>
                    n.id === nodeId
                      ? {
                          ...n,
                          sources: (n.sources ?? []).map((s) =>
                            s.id === sourceId ? { ...s, ...updates } : s
                          ),
                          updatedAt: now,
                        }
                      : n
                  ),
                  updatedAt: now,
                }
              : inv
          ),
        }));
      },

      removeSource: (investigationId, nodeId, sourceId) => {
        const now = Date.now();
        set((state) => ({
          investigations: state.investigations.map((inv) =>
            inv.id === investigationId
              ? {
                  ...inv,
                  nodes: inv.nodes.map((n) =>
                    n.id === nodeId
                      ? {
                          ...n,
                          sources: (n.sources ?? []).filter((s) => s.id !== sourceId),
                          updatedAt: now,
                        }
                      : n
                  ),
                  updatedAt: now,
                }
              : inv
          ),
        }));
      },

      addString: (investigationId, fromNodeId, toNodeId, label, color) => {
        const stringId = generateId();
        const now = Date.now();
        const newString: RedString = {
          id: stringId,
          fromNodeId,
          toNodeId,
          label,
          color: color ?? '#C41E3A',
          createdAt: now,
        };
        set((state) => ({
          investigations: state.investigations.map((inv) =>
            inv.id === investigationId
              ? { ...inv, strings: [...(inv.strings ?? []), newString], updatedAt: now }
              : inv
          ),
          connectingFromId: null,
        }));
        return stringId;
      },

      updateString: (investigationId, stringId, updates) => {
        set((state) => ({
          investigations: state.investigations.map((inv) =>
            inv.id === investigationId
              ? {
                  ...inv,
                  strings: (inv.strings ?? []).map((s) =>
                    s.id === stringId ? { ...s, ...updates } : s
                  ),
                }
              : inv
          ),
        }));
      },

      deleteString: (investigationId, stringId) => {
        set((state) => ({
          investigations: state.investigations.map((inv) =>
            inv.id === investigationId
              ? {
                  ...inv,
                  strings: (inv.strings ?? []).filter((s) => s.id !== stringId),
                }
              : inv
          ),
        }));
      },

      addTimeline: (investigationId, label) => {
        const timelineId = generateId();
        const now = Date.now();
        const currentYear = new Date().getFullYear();
        set((state) => {
          const inv = state.investigations.find((i) => i.id === investigationId);
          const existingCount = (inv?.timelines ?? []).length;
          const color = TIMELINE_COLORS[existingCount % TIMELINE_COLORS.length];
          const timeline: Timeline = {
            id: timelineId,
            label,
            color,
            startYear: 1900,
            endYear: currentYear,
            isMinimized: false,
            createdAt: now,
          };
          return {
            investigations: state.investigations.map((i) =>
              i.id === investigationId
                ? { ...i, timelines: [...(i.timelines ?? []), timeline], updatedAt: now }
                : i
            ),
          };
        });
        return timelineId;
      },

      updateTimeline: (investigationId, timelineId, updates) => {
        set((state) => ({
          investigations: state.investigations.map((inv) =>
            inv.id === investigationId
              ? {
                  ...inv,
                  timelines: (inv.timelines ?? []).map((t) =>
                    t.id === timelineId ? { ...t, ...updates } : t
                  ),
                }
              : inv
          ),
        }));
      },

      deleteTimeline: (investigationId, timelineId) => {
        set((state) => ({
          investigations: state.investigations.map((inv) =>
            inv.id === investigationId
              ? {
                  ...inv,
                  timelines: (inv.timelines ?? []).filter((t) => t.id !== timelineId),
                }
              : inv
          ),
        }));
      },

      toggleTimelineMinimized: (investigationId, timelineId) => {
        set((state) => ({
          investigations: state.investigations.map((inv) =>
            inv.id === investigationId
              ? {
                  ...inv,
                  timelines: (inv.timelines ?? []).map((t) =>
                    t.id === timelineId ? { ...t, isMinimized: !t.isMinimized } : t
                  ),
                }
              : inv
          ),
        }));
      },

      setSelectedNode: (nodeId) => set({ selectedNodeId: nodeId }),
      setConnectingFrom: (nodeId) => set({ connectingFromId: nodeId }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setCanvasMode: (mode) => set({ canvasMode: mode }),

      getActiveInvestigation: () => {
        const state = get();
        return state.investigations.find((inv) => inv.id === state.activeInvestigationId);
      },

      updateColorLegend: (investigationId, legend) => {
        set((state) => ({
          investigations: state.investigations.map((inv) =>
            inv.id === investigationId
              ? { ...inv, colorLegend: legend, updatedAt: Date.now() }
              : inv
          ),
        }));
      },

      addDemoInvestigation: (investigation) => {
        set((state) => ({
          investigations: [
            ...state.investigations.filter((inv) => !inv.isDemo),
            investigation,
          ],
          activeInvestigationId: investigation.id,
        }));
      },

      removeDemoInvestigation: () => {
        set((state) => ({
          investigations: state.investigations.filter((inv) => !inv.isDemo),
          activeInvestigationId:
            state.investigations.find((inv) => inv.id === state.activeInvestigationId)?.isDemo
              ? null
              : state.activeInvestigationId,
        }));
      },

      restoreInvestigation: (investigation) => {
        set((state) => ({
          investigations: [...state.investigations, investigation],
        }));
      },

      // ─── New actions ────────────────────────────────────────────────────────
      updateInvestigationMeta: (id, updates) => {
        const now = Date.now();
        set((state) => ({
          investigations: state.investigations.map((inv) =>
            inv.id === id ? { ...inv, ...updates, updatedAt: now } : inv
          ),
        }));
      },

      setInvestigationPin: (id, pinHash) => {
        const now = Date.now();
        set((state) => ({
          investigations: state.investigations.map((inv) =>
            inv.id === id ? { ...inv, investigationPin: pinHash, updatedAt: now } : inv
          ),
        }));
      },

      logAccess: (id, entry) => {
        const entryId = generateId();
        set((state) => ({
          investigations: state.investigations.map((inv) =>
            inv.id === id
              ? {
                  ...inv,
                  accessLog: [...(inv.accessLog ?? []), { ...entry, id: entryId }],
                }
              : inv
          ),
        }));
      },

      addSticker: (investigationId, nodeId, sticker) => {
        const stickerId = generateId();
        const now = Date.now();
        const newSticker: NodeSticker = { ...sticker, id: stickerId };
        set((state) => ({
          investigations: state.investigations.map((inv) =>
            inv.id === investigationId
              ? {
                  ...inv,
                  nodes: inv.nodes.map((n) =>
                    n.id === nodeId
                      ? { ...n, stickers: [...(n.stickers ?? []), newSticker], updatedAt: now }
                      : n
                  ),
                  updatedAt: now,
                }
              : inv
          ),
        }));
      },

      removeSticker: (investigationId, nodeId, stickerId) => {
        const now = Date.now();
        set((state) => ({
          investigations: state.investigations.map((inv) =>
            inv.id === investigationId
              ? {
                  ...inv,
                  nodes: inv.nodes.map((n) =>
                    n.id === nodeId
                      ? {
                          ...n,
                          stickers: (n.stickers ?? []).filter((s) => s.id !== stickerId),
                          updatedAt: now,
                        }
                      : n
                  ),
                  updatedAt: now,
                }
              : inv
          ),
        }));
      },

      toggleInvisibleInk: (investigationId, nodeId) => {
        const now = Date.now();
        set((state) => ({
          investigations: state.investigations.map((inv) =>
            inv.id === investigationId
              ? {
                  ...inv,
                  nodes: inv.nodes.map((n) =>
                    n.id === nodeId
                      ? { ...n, invisibleInk: !n.invisibleInk, updatedAt: now }
                      : n
                  ),
                  updatedAt: now,
                }
              : inv
          ),
        }));
      },

      // ─── Chat history ──────────────────────────────────────────────────────
      saveChatMessage: (investigationId, message) => {
        set((state) => ({
          investigations: state.investigations.map((inv) =>
            inv.id === investigationId
              ? { ...inv, chatHistory: [...(inv.chatHistory ?? []), message] }
              : inv
          ),
        }));
      },

      updateMessageFeedback: (investigationId, messageId, feedback) => {
        set((state) => ({
          investigations: state.investigations.map((inv) =>
            inv.id === investigationId
              ? {
                  ...inv,
                  chatHistory: (inv.chatHistory ?? []).map((m) =>
                    m.id === messageId ? { ...m, feedback } : m
                  ),
                }
              : inv
          ),
        }));
      },

      updateChatMessage: (investigationId, messageId, updates) => {
        set((state) => ({
          investigations: state.investigations.map((inv) =>
            inv.id === investigationId
              ? {
                  ...inv,
                  chatHistory: (inv.chatHistory ?? []).map((m) =>
                    m.id === messageId ? { ...m, ...updates } : m
                  ),
                }
              : inv
          ),
        }));
      },

      clearChatHistory: (investigationId) => {
        set((state) => ({
          investigations: state.investigations.map((inv) =>
            inv.id === investigationId ? { ...inv, chatHistory: [] } : inv
          ),
        }));
      },

      updateInvestigationTimelineSettings: (id, settings) => {
        set((state) => ({
          investigations: state.investigations.map((inv) =>
            inv.id === id ? { ...inv, timelineSettings: settings } : inv
          ),
        }));
      },
    }),
    {
      name: 'investigation-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      migrate: (persistedState: any, _fromVersion: number) => {
        const state = persistedState as any;
        if (!state.investigations) state.investigations = [];
        state.investigations = state.investigations.map((inv: any) => ({
          ...inv,
          nodes: Array.isArray(inv.nodes) ? inv.nodes : [],
          strings: Array.isArray(inv.strings) ? inv.strings : [],
          timelines: Array.isArray(inv.timelines) ? inv.timelines : [],
          colorLegend: Array.isArray(inv.colorLegend) ? inv.colorLegend : [],
        }));
        return state;
      },
    }
  )
);

export default useInvestigationStore;

// ─── One-time seed of demo investigations ────────────────────────────────────
export async function seedMockInvestigations(): Promise<void> {
  const seeded = await AsyncStorage.getItem('@redstring_seeded');
  if (seeded !== null) return;
  await AsyncStorage.setItem('@redstring_seeded', 'true');

  const store = useInvestigationStore.getState();

  // ── Investigation 1: Operation: Shadow Network ──
  const inv1Id = store.createInvestigation(
    'Operation: Shadow Network',
    '[DEMO] Tracking financial connections between offshore entities and political figures.'
  );
  useInvestigationStore.setState((state) => ({
    investigations: state.investigations.map((inv) =>
      inv.id === inv1Id ? { ...inv, isSeeded: true } : inv
    ),
  }));
  store.updateInvestigationMeta(inv1Id, { icon: '🕵️', iconUri: undefined, boardStyle: undefined, filingTabColor: undefined, filingTabLabel: undefined });

  store.addNode(inv1Id, 'note', 'John Mercer', { x: 400, y: 300 }, {
    id: 'sn1', content: 'Senior exec at Nexus Capital. Traveled to Geneva 3x in Q3.',
    color: 'red', tags: [{ id: 't1', label: 'Suspect', color: 'red' }],
  });
  store.addNode(inv1Id, 'note', 'Viktor Sokolov', { x: 700, y: 200 }, {
    id: 'sn2', content: 'Russian national. Shell company director. Named in 3 offshore leaks.',
    color: 'red', tags: [{ id: 't2', label: 'Suspect', color: 'red' }],
  });
  store.addNode(inv1Id, 'note', 'Nexus Capital LLC', { x: 550, y: 500 }, {
    id: 'sn3', content: 'Registered Delaware 2018. $47M traced to Cayman accounts.',
    color: 'purple', tags: [{ id: 't3', label: 'Organization', color: 'purple' }],
  });
  store.addNode(inv1Id, 'link', 'Cayman Registry Leak', { x: 900, y: 450 }, {
    id: 'sn4', content: 'Document showing Nexus as beneficial owner of 3 shell entities.',
    color: 'green', tags: [{ id: 't4', label: 'Evidence', color: 'green' }],
  });
  store.addNode(inv1Id, 'note', 'Geneva Meeting Sept 14', { x: 300, y: 600 }, {
    id: 'sn5', content: 'Mercer and Sokolov photographed outside Banque Privee Zurich.',
    color: 'amber', tags: [{ id: 't5', label: 'Timeline', color: 'amber' }],
  });
  store.addNode(inv1Id, 'note', 'Sarah Chen — Whistleblower', { x: 150, y: 450 }, {
    id: 'sn6', content: 'Former compliance officer at Nexus. Fired after flagging suspicious transfers.',
    color: 'blue', tags: [{ id: 't6', label: 'Source', color: 'blue' }],
  });

  const s1a = store.addString(inv1Id, 'sn1', 'sn2', 'Known Associates', '#C41E3A');
  store.updateString(inv1Id, s1a, { thickness: 3 });
  store.addString(inv1Id, 'sn1', 'sn3', 'Executive', '#C41E3A');
  store.addString(inv1Id, 'sn2', 'sn3', 'Director', '#C41E3A');
  store.addString(inv1Id, 'sn3', 'sn4', 'Beneficial Owner', '#22C55E');
  store.addString(inv1Id, 'sn6', 'sn3', 'Reported On', '#3B82F6');
  store.addString(inv1Id, 'sn1', 'sn5', 'Attended', '#F59E0B');

  // ── Investigation 2: Epstein Network ──
  const inv2Id = store.createInvestigation(
    'Epstein Network',
    '[DEMO] Mapping the flight logs, island visitors, and financial connections.'
  );
  useInvestigationStore.setState((state) => ({
    investigations: state.investigations.map((inv) =>
      inv.id === inv2Id ? { ...inv, isSeeded: true } : inv
    ),
  }));
  store.updateInvestigationMeta(inv2Id, { icon: '🔍', iconUri: undefined, boardStyle: undefined, filingTabColor: undefined, filingTabLabel: undefined });

  store.addNode(inv2Id, 'note', 'Jeffrey Epstein', { x: 500, y: 300 }, {
    id: 'ep1', content: 'Financier. Convicted 2008. Died in custody 2019. Case reopened.',
    color: 'red', tags: [{ id: 't7', label: 'Subject', color: 'red' }],
  });
  store.addNode(inv2Id, 'note', 'Little St James Island', { x: 300, y: 500 }, {
    id: 'ep2', content: 'Private island. Visited by heads of state, celebrities, academics.',
    color: 'purple', tags: [{ id: 't8', label: 'Location', color: 'purple' }],
  });
  store.addNode(inv2Id, 'link', 'Flight Logs — Lolita Express', { x: 750, y: 400 }, {
    id: 'ep3', content: '737 flight logs showing passenger manifests 1997-2005.',
    color: 'green', tags: [{ id: 't9', label: 'Evidence', color: 'green' }],
  });
  store.addNode(inv2Id, 'note', 'Ghislaine Maxwell', { x: 700, y: 200 }, {
    id: 'ep4', content: 'Convicted 2021. 20 year sentence. Named 8 co-conspirators.',
    color: 'red', tags: [{ id: 't10', label: 'Convicted', color: 'red' }],
  });
  store.addNode(inv2Id, 'note', 'Deutsche Bank Settlement', { x: 900, y: 550 }, {
    id: 'ep5', content: '$150M fine for processing Epstein transactions after 2008 conviction.',
    color: 'amber', tags: [{ id: 't11', label: 'Financial', color: 'amber' }],
  });

  const ep1a = store.addString(inv2Id, 'ep1', 'ep2', 'Owned', '#C41E3A');
  store.updateString(inv2Id, ep1a, { thickness: 2 });
  const ep1b = store.addString(inv2Id, 'ep1', 'ep4', 'Associates', '#C41E3A');
  store.updateString(inv2Id, ep1b, { thickness: 3 });
  store.addString(inv2Id, 'ep3', 'ep1', 'Documents', '#22C55E');
  store.addString(inv2Id, 'ep5', 'ep1', 'Processed Funds', '#F59E0B');

  // ── Investigation 3: Charlie Kirk — Follow The Money ──
  const inv3Id = store.createInvestigation(
    'Charlie Kirk — Follow The Money',
    '[DEMO] Investigating funding sources and corporate connections of TPUSA.'
  );
  useInvestigationStore.setState((state) => ({
    investigations: state.investigations.map((inv) =>
      inv.id === inv3Id ? { ...inv, isSeeded: true } : inv
    ),
  }));
  store.updateInvestigationMeta(inv3Id, { icon: '🎯', iconUri: undefined, boardStyle: undefined, filingTabColor: undefined, filingTabLabel: undefined });

  store.addNode(inv3Id, 'note', 'Charlie Kirk', { x: 500, y: 300 }, {
    id: 'ck1', content: 'Founder TPUSA. 3.5M Twitter followers. Close Trump ally.',
    color: 'red', tags: [{ id: 't12', label: 'Subject', color: 'red' }],
  });
  store.addNode(inv3Id, 'note', 'Turning Point USA', { x: 300, y: 200 }, {
    id: 'ck2', content: 'Founded 2012. $80M+ annual revenue. Active on 3000+ campuses.',
    color: 'purple', tags: [{ id: 't13', label: 'Organization', color: 'purple' }],
  });
  store.addNode(inv3Id, 'note', 'Desert Spirit Tech LLC', { x: 700, y: 400 }, {
    id: 'ck3', content: 'Tech company linked to TPUSA operations. Shelly Reams named as agent.',
    color: 'amber', tags: [{ id: 't14', label: 'Entity', color: 'amber' }],
  });
  store.addNode(inv3Id, 'link', 'IRS 990 Filing 2022', { x: 200, y: 500 }, {
    id: 'ck4', content: 'TPUSA reported $84M revenue. Top donor identities redacted.',
    color: 'green', tags: [{ id: 't15', label: 'Evidence', color: 'green' }],
  });
  store.addNode(inv3Id, 'note', '480-626-4800', { x: 800, y: 200 }, {
    id: 'ck5', content: 'Phone number appearing in multiple TPUSA legal filings. Unverified owner.',
    color: 'amber', tags: [{ id: 't16', label: 'Lead', color: 'amber' }],
  });

  const ck1a = store.addString(inv3Id, 'ck1', 'ck2', 'Founder', '#C41E3A');
  store.updateString(inv3Id, ck1a, { thickness: 3 });
  const ck2a = store.addString(inv3Id, 'ck2', 'ck3', 'Vendor', '#F59E0B');
  store.updateString(inv3Id, ck2a, { style: 'dashed' });
  store.addString(inv3Id, 'ck4', 'ck2', 'Filing', '#22C55E');
  const ck3a = store.addString(inv3Id, 'ck3', 'ck5', 'Connected', '#F59E0B');
  store.updateString(inv3Id, ck3a, { style: 'dotted' });

  // Set active investigation to Investigation 1
  store.setActiveInvestigation(inv1Id);
}
