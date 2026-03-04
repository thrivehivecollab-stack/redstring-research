// Red String Research - Core Types

export type NodeType = 'investigation' | 'folder' | 'note' | 'link' | 'image' | 'dataset';

export type TagColor = 'red' | 'blue' | 'green' | 'amber' | 'purple' | 'teal';

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Tag {
  id: string;
  label: string;
  color: TagColor;
}

export interface NodeSource {
  id: string;
  sourceType: 'url' | 'x_user' | 'tiktok_user' | 'instagram_user' | 'person' | 'document' | 'tip' | 'other';
  sourceName: string;           // "@CanadianBacon1776" or "Epoch Times"
  sourceHandle?: string;
  sourceUrl?: string;
  sourceProfileUrl?: string;
  platform?: 'x' | 'tiktok' | 'instagram' | 'youtube' | 'facebook' | 'website' | 'podcast' | 'other';
  contentType?: 'article' | 'video' | 'testimony' | 'tip' | 'hypothesis' | 'evidence' | 'document';
  contentSummary?: string;
  secondarySourceName?: string;  // e.g. article author showed Epoch Times piece
  secondarySourceUrl?: string;
  credibility: 'primary' | 'secondary' | 'unverified' | 'disputed' | 'confirmed';
  addedAt: number;
}

export interface CanvasNode {
  id: string;
  type: NodeType;
  title: string;
  description?: string;
  position: Position;
  size: Size;
  parentId?: string; // parent investigation or folder
  tags: Tag[];
  color?: TagColor;
  url?: string; // for link type
  imageUri?: string; // for image type
  content?: string; // for note type
  timestamp?: number; // unix ms timestamp for when this evidence occurred
  sources?: NodeSource[];
  createdAt: number;
  updatedAt: number;
}

export interface RedString {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  label?: string;
  notes?: string;
  color: string; // hex color, default '#C41E3A'
  thickness?: number; // 1-4, default 2
  style?: 'solid' | 'dashed' | 'dotted'; // default 'solid'
  createdAt: number;
}

export interface Timeline {
  id: string;
  label: string;
  color: string; // hex color from color spectrum
  startYear: number;
  endYear: number;
  isMinimized: boolean;
  createdAt: number;
}

export interface ColorLegendEntry {
  color: string; // hex color
  label: string;
}

export interface Investigation {
  id: string;
  title: string;
  description?: string;
  nodes: CanvasNode[];
  strings: RedString[];
  timelines: Timeline[];
  colorLegend?: ColorLegendEntry[];
  createdAt: number;
  updatedAt: number;
}

export interface AISuggestion {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  suggestedLabel: string;
  reason: string;
  accepted: boolean;
}

// Tip types
export type TipStatus = 'unread' | 'investigating' | 'verified' | 'dismissed';

export interface TipVetting {
  score: number; // 0-100
  summary: string;
  keyFindings: string[];
  redFlags: string[];
  strengths: string[];
  followUpQuestions: string[];
  vettedAt: number;
}

export interface TipMessage {
  id: string;
  fromInvestigator: boolean;
  text: string;
  sentAt: number;
}

export interface Tip {
  id: string;
  recipientId: string;
  investigationId?: string;
  subject: string;
  content: string;
  tipperName?: string;
  tipperEmail?: string;
  tipperHandle?: string;
  isAnonymous: boolean;
  evidenceUrls: string[];
  status: TipStatus;
  vetting?: TipVetting;
  messages: TipMessage[];
  submittedAt: number;
  updatedAt: number;
}
