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
