import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Investigation, CanvasNode, RedString, Position, NodeType, TagColor, Tag, AISuggestion } from '@/lib/types';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

interface InvestigationStore {
  investigations: Investigation[];
  activeInvestigationId: string | null;
  selectedNodeId: string | null;
  connectingFromId: string | null;
  viewMode: 'canvas' | 'list';

  // Investigation CRUD
  createInvestigation: (title: string, description?: string) => string;
  deleteInvestigation: (id: string) => void;
  setActiveInvestigation: (id: string | null) => void;

  // Node CRUD
  addNode: (investigationId: string, type: NodeType, title: string, position: Position, extras?: Partial<CanvasNode>) => string;
  updateNode: (investigationId: string, nodeId: string, updates: Partial<CanvasNode>) => void;
  deleteNode: (investigationId: string, nodeId: string) => void;
  moveNode: (investigationId: string, nodeId: string, position: Position) => void;

  // Red String CRUD
  addString: (investigationId: string, fromNodeId: string, toNodeId: string, label?: string) => string;
  updateString: (investigationId: string, stringId: string, updates: Partial<RedString>) => void;
  deleteString: (investigationId: string, stringId: string) => void;

  // Selection
  setSelectedNode: (nodeId: string | null) => void;
  setConnectingFrom: (nodeId: string | null) => void;
  setViewMode: (mode: 'canvas' | 'list') => void;

  // Helpers
  getActiveInvestigation: () => Investigation | undefined;
}

const useInvestigationStore = create<InvestigationStore>()(
  persist(
    (set, get) => ({
      investigations: [],
      activeInvestigationId: null,
      selectedNodeId: null,
      connectingFromId: null,
      viewMode: 'canvas',

      createInvestigation: (title, description) => {
        const id = generateId();
        const now = Date.now();
        const investigation: Investigation = {
          id,
          title,
          description,
          nodes: [],
          strings: [],
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

      addString: (investigationId, fromNodeId, toNodeId, label) => {
        const stringId = generateId();
        const now = Date.now();
        const newString: RedString = {
          id: stringId,
          fromNodeId,
          toNodeId,
          label,
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

      setSelectedNode: (nodeId) => set({ selectedNodeId: nodeId }),
      setConnectingFrom: (nodeId) => set({ connectingFromId: nodeId }),
      setViewMode: (mode) => set({ viewMode: mode }),

      getActiveInvestigation: () => {
        const state = get();
        return state.investigations.find((inv) => inv.id === state.activeInvestigationId);
      },
    }),
    {
      name: 'investigation-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useInvestigationStore;
