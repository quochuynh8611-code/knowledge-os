/**
 * Mind Map Document & Persistence Schema Definitions (Phase P1)
 *
 * Defines the core data structures for first-class persistent Mind Map documents,
 * immutable version snapshots, isolated tree nodes/edges, and repository operation contracts.
 *
 * Local-first schema; không làm thay đổi DataContext theo observable contract của P1;
 * blast radius thấp, bounded trong Mind Map context.
 */

import { LinkType } from './index';

// ==========================================
// 1. METADATA & SUMMARY (Central list storage)
// ==========================================
export interface MindMapDocumentSummary {
  id: string; // UUID: "mm-doc-<timestamp>-<hash>"
  title: string; // Document title (1..120 chars, trimmed, required)
  description?: string; // Optional short summary (max 300 chars)
  rootTopicId?: string | null; // Optional foreign reference to origin Topic in DataContext
  tags: string[]; // Classification tags (defaults to [])
  currentVersionNumber: number; // Active version number (starts at 1)
  totalVersionsCount: number; // Number of stored historical versions (1..5)
  isArchived: boolean; // Soft-delete / archive flag (defaults to false)
  createdAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp
}

// ==========================================
// 2. DOCUMENT PAYLOAD & VERSION SNAPSHOTS
// ==========================================
export interface MindMapDocumentPayload {
  schemaVersion: 1;
  documentId: string;
  versions: MindMapVersion[]; // Bounded historical versions (Max 5, auto-pruned)
}

export interface MindMapVersion {
  id: string; // "mm-ver-<docId>-v<num>"
  documentId: string;
  versionNumber: number; // Monotonically increasing: 1, 2, 3...
  changeSummary?: string; // Optional change note (e.g. "Initial snapshot")
  treeData: MindMapDocumentNode; // Full immutable snapshot of the hierarchy
  crossLinks: MindMapDocumentEdge[]; // Associated secondary cross-links
  viewState: MindMapVersionViewState; // Persisted view configuration
  createdAt: string; // ISO 8601 timestamp
}

export interface MindMapVersionViewState {
  layoutMode: 'tree_horizontal' | 'tree_vertical';
  collapsedNodeIds: string[];
  showCrossLinks: boolean;
}

// ==========================================
// 3. TREE NODE & EDGE SCHEMA (Persisted format)
// ==========================================
export type MindMapDocumentNodeType = 'topic' | 'note' | 'resource' | 'concept';

export interface MindMapDocumentNode {
  id: string; // Unique node ID within tree
  title: string; // Node display title (required)
  nodeType: MindMapDocumentNodeType;
  semanticBadge?: string; // e.g. "[tiên quyết]", "[nâng cao]"
  sourceIdReference?: string; // Reference to origin Topic/Note ID if derived
  children: MindMapDocumentNode[];
}

export interface MindMapDocumentEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  edgeType: LinkType; // 'prerequisite' | 'related' | 'advanced' | 'contradicts'
  label?: string;
}

// ==========================================
// 4. REPOSITORY INPUT & RESULT CONTRACTS
// ==========================================
export interface CreateDocumentInput {
  title: string;
  description?: string;
  rootTopicId?: string | null;
  tags?: string[];
  treeData: MindMapDocumentNode;
  crossLinks?: MindMapDocumentEdge[];
  viewState?: Partial<MindMapVersionViewState>;
  changeSummary?: string;
}

export interface SaveVersionInput {
  documentId: string;
  changeSummary?: string;
  treeData: MindMapDocumentNode;
  crossLinks?: MindMapDocumentEdge[];
  viewState?: Partial<MindMapVersionViewState>;
}

export interface DocumentFilter {
  searchQuery?: string;
  includeArchived?: boolean;
  rootTopicId?: string;
  tag?: string;
}

export type StorageErrorCode =
  | 'INVALID_TITLE'
  | 'EMPTY_TREE'
  | 'DUPLICATE_NODE_ID'
  | 'DANGLING_EDGE_REFERENCE'
  | 'INVALID_NODE_TYPE'
  | 'INVALID_EDGE_TYPE'
  | 'NOT_FOUND'
  | 'CORRUPTED_DATA'
  | 'STORAGE_QUOTA_EXCEEDED';

export interface StorageOperationResult<T> {
  success: boolean;
  data?: T;
  errorCode?: StorageErrorCode;
  isVolatile: boolean; // true if operating on RAM fallback (localStorage unavailable)
  errorMessage?: string;
}
