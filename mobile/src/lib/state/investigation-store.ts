import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Investigation, CanvasNode, RedString, Timeline, Position, NodeType, TagColor, Tag, AISuggestion, ColorLegendEntry, NodeSource } from '@/lib/types';
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
          size: { width: 160, height: 100 },
          tags: [],
          createdAt: now,
          updatedAt: now,
          ...extras,
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
                  strings: inv.strings.filter(
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
          source: newSource,
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
              ? { ...inv, strings: [...inv.strings, newString], updatedAt: now }
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
                  strings: inv.strings.map((s) =>
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
                  strings: inv.strings.filter((s) => s.id !== stringId),
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
          const existingCount = inv?.timelines.length ?? 0;
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
                ? { ...i, timelines: [...i.timelines, timeline], updatedAt: now }
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
                  timelines: inv.timelines.map((t) =>
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
                  timelines: inv.timelines.filter((t) => t.id !== timelineId),
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
                  timelines: inv.timelines.map((t) =>
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
    }),
    {
      name: 'investigation-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useInvestigationStore;
