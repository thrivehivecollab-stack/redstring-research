import { create } from 'zustand';
import { api } from '@/lib/api/api';

export interface CollabMember {
  id: string;
  userId: string;
  permission: string;
  user: { name: string; email: string };
}

export interface CollabSession {
  id: string;
  investigationId: string;
  ownerId: string;
  title: string;
  members: CollabMember[];
  pendingCount: number;
  createdAt: string;
}

export interface PendingNode {
  id: string;
  contributorId: string;
  nodeData: any;
  status: string;
  createdAt: string;
  contributor?: { name: string; email: string };
}

interface CollabState {
  sessions: CollabSession[];
  activePendingNodes: PendingNode[];

  fetchSessions: () => Promise<void>;
  createSession: (investigationId: string, title: string, description?: string) => Promise<string>;
  sendInvite: (sessionId: string, email: string, permission: string) => Promise<string>;
  generateInviteLink: (sessionId: string, permission: string) => Promise<string>;
  submitNode: (sessionId: string, nodeData: any) => Promise<void>;
  fetchPendingNodes: (sessionId: string) => Promise<void>;
  approveNode: (sessionId: string, nodeId: string) => Promise<any>;
  rejectNode: (sessionId: string, nodeId: string, reason?: string) => Promise<void>;
}

const useCollabStore = create<CollabState>()((set) => ({
  sessions: [],
  activePendingNodes: [],

  fetchSessions: async () => {
    try {
      const sessions = await api.get<CollabSession[]>('/api/collab/sessions');
      set({ sessions: sessions ?? [] });
    } catch {
      // Silently fail — backend may not have collab routes yet
    }
  },

  createSession: async (investigationId, title, description) => {
    try {
      const session = await api.post<CollabSession>('/api/collab/sessions', {
        investigationId,
        title,
        description,
      });
      set((state) => ({ sessions: [...state.sessions, session] }));
      return session.id;
    } catch {
      return '';
    }
  },

  sendInvite: async (sessionId, email, permission) => {
    try {
      const result = await api.post<{ inviteLink: string }>('/api/collab/invites', {
        sessionId,
        email,
        permission,
      });
      return result?.inviteLink ?? '';
    } catch {
      return '';
    }
  },

  generateInviteLink: async (sessionId, permission) => {
    try {
      const result = await api.post<{ inviteLink: string }>('/api/collab/invites/link', {
        sessionId,
        permission,
      });
      return result?.inviteLink ?? '';
    } catch {
      return '';
    }
  },

  submitNode: async (sessionId, nodeData) => {
    try {
      await api.post('/api/collab/nodes', { sessionId, nodeData });
    } catch {
      // Silently fail
    }
  },

  fetchPendingNodes: async (sessionId) => {
    try {
      const nodes = await api.get<PendingNode[]>(`/api/collab/sessions/${sessionId}/pending`);
      set({ activePendingNodes: nodes ?? [] });
    } catch {
      set({ activePendingNodes: [] });
    }
  },

  approveNode: async (sessionId, nodeId) => {
    try {
      const result = await api.post<any>(`/api/collab/sessions/${sessionId}/nodes/${nodeId}/approve`, {});
      set((state) => ({
        activePendingNodes: state.activePendingNodes.filter((n) => n.id !== nodeId),
      }));
      return result;
    } catch {
      return null;
    }
  },

  rejectNode: async (sessionId, nodeId, reason) => {
    try {
      await api.post(`/api/collab/sessions/${sessionId}/nodes/${nodeId}/reject`, { reason });
      set((state) => ({
        activePendingNodes: state.activePendingNodes.filter((n) => n.id !== nodeId),
      }));
    } catch {
      // Silently fail
    }
  },
}));

export default useCollabStore;
