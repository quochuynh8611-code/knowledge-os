/**
 * Mind Map Document Storage Engine (Phase P1)
 *
 * Local-First repository implementation for persisting first-class Mind Map documents,
 * immutable version snapshots, view state configurations, input validation,
 * bounded 5-version retention with auto-pruning, and resilient 3-step quota recovery.
 *
 * Local-first repository; không làm thay đổi DataContext theo observable contract của P1;
 * blast radius thấp, bounded trong Mind Map context.
 */

import {
  MindMapDocumentSummary,
  MindMapDocumentPayload,
  MindMapVersion,
  MindMapDocumentNode,
  MindMapDocumentEdge,
  CreateDocumentInput,
  SaveVersionInput,
  DocumentFilter,
  StorageOperationResult,
  StorageErrorCode,
} from '../types/mindmapDocument';
import { MindMapTreeNode, MindMapLayoutMode } from './mindmapProjection';
import { SemanticEdgeType, GraphNodeType } from './knowledgeGraph';

export const MINDMAP_DOCS_METADATA_KEY = 'knowledge_os_mindmap_documents_v1';
export const MINDMAP_DOC_PAYLOAD_PREFIX = 'knowledge_os_mindmap_payload_v1:';
export const MAX_VERSIONS_PER_DOCUMENT = 5;

// In-Memory Volatile Store for fallback when localStorage is unavailable
const volatileSummariesStore = new Map<string, MindMapDocumentSummary>();
const volatilePayloadsStore = new Map<string, MindMapDocumentPayload>();

export function clearVolatileStorageForTests(): void {
  volatileSummariesStore.clear();
  volatilePayloadsStore.clear();
}

// ==========================================
// 1. STORAGE ACCESS WRAPPERS (Resilience Layer)
// ==========================================

function safeGetItem(key: string): { value: string | null; isVolatile: boolean } {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return { value: window.localStorage.getItem(key), isVolatile: false };
    }
  } catch {
    // LocalStorage inaccessible (SecurityError / cookies disabled)
  }
  return { value: null, isVolatile: true };
}

function safeSetItem(key: string, value: string): { success: boolean; isQuotaError: boolean; isVolatile: boolean } {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
      return { success: true, isQuotaError: false, isVolatile: false };
    }
  } catch (error: unknown) {
    const isQuota =
      error instanceof Error &&
      (error.name === 'QuotaExceededError' ||
        error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        error.message.includes('QuotaExceeded'));
    return { success: false, isQuotaError: Boolean(isQuota), isVolatile: !isQuota };
  }
  return { success: false, isQuotaError: false, isVolatile: true };
}

// ==========================================
// 2. SERIALIZER & DESERIALIZER
// ==========================================

export function serializeDocumentSummaryList(summaries: MindMapDocumentSummary[]): string {
  return JSON.stringify(summaries);
}

export function deserializeDocumentSummaryList(raw: string | null): MindMapDocumentSummary[] {
  if (!raw || typeof raw !== 'string') return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is MindMapDocumentSummary =>
        Boolean(item && typeof item === 'object' && typeof item.id === 'string' && typeof item.title === 'string')
    );
  } catch {
    return [];
  }
}

export function serializeDocumentPayload(payload: MindMapDocumentPayload): string {
  return JSON.stringify(payload);
}

export function deserializeDocumentPayload(raw: string | null): MindMapDocumentPayload | null {
  if (!raw || typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || parsed.schemaVersion !== 1 || !Array.isArray(parsed.versions)) {
      return null;
    }
    return parsed as MindMapDocumentPayload;
  } catch {
    return null;
  }
}

// ==========================================
// 3. VALIDATOR
// ==========================================

export function validateDocumentInput(input: {
  title: string;
  treeData: MindMapDocumentNode;
  crossLinks?: MindMapDocumentEdge[];
}): { valid: boolean; errorCode?: StorageErrorCode } {
  const trimmedTitle = input.title ? input.title.trim() : '';
  if (!trimmedTitle || trimmedTitle.length === 0 || trimmedTitle.length > 120) {
    return { valid: false, errorCode: 'INVALID_TITLE' };
  }

  const treeValidation = validateDocumentTree(input.treeData);
  if (!treeValidation.valid) {
    return treeValidation;
  }

  if (input.crossLinks && Array.isArray(input.crossLinks)) {
    const nodeIds = collectAllNodeIds(input.treeData);
    for (const edge of input.crossLinks) {
      if (!nodeIds.has(edge.sourceNodeId) || !nodeIds.has(edge.targetNodeId)) {
        return { valid: false, errorCode: 'DANGLING_EDGE_REFERENCE' };
      }
    }
  }

  return { valid: true };
}

export function validateDocumentTree(treeData: MindMapDocumentNode): { valid: boolean; errorCode?: StorageErrorCode } {
  if (!treeData || typeof treeData !== 'object' || !treeData.id || !treeData.title) {
    return { valid: false, errorCode: 'EMPTY_TREE' };
  }

  const seenIds = new Set<string>();
  const hasDuplicates = checkDuplicateIds(treeData, seenIds);
  if (hasDuplicates) {
    return { valid: false, errorCode: 'DUPLICATE_NODE_ID' };
  }

  return { valid: true };
}

function checkDuplicateIds(node: MindMapDocumentNode, seenIds: Set<string>): boolean {
  if (seenIds.has(node.id)) {
    return true;
  }
  seenIds.add(node.id);
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      if (checkDuplicateIds(child, seenIds)) {
        return true;
      }
    }
  }
  return false;
}

function collectAllNodeIds(node: MindMapDocumentNode, acc: Set<string> = new Set()): Set<string> {
  if (!node) return acc;
  acc.add(node.id);
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      collectAllNodeIds(child, acc);
    }
  }
  return acc;
}

// ==========================================
// 4. TREE ADAPTERS (Delegated to mindmapTreeAdapter)
// ==========================================

export {
  projectedTreeToDocumentTree,
  documentTreeToProjectedTree,
} from './mindmapTreeAdapter';

// ==========================================
// 5. INTERNAL REPOSITORY HELPERS
// ==========================================

function readSummaries(): { summaries: MindMapDocumentSummary[]; isVolatile: boolean } {
  const { value, isVolatile } = safeGetItem(MINDMAP_DOCS_METADATA_KEY);
  if (isVolatile) {
    return { summaries: Array.from(volatileSummariesStore.values()), isVolatile: true };
  }
  const parsed = deserializeDocumentSummaryList(value);
  return { summaries: parsed, isVolatile: false };
}

function writeSummaries(summaries: MindMapDocumentSummary[]): { success: boolean; isVolatile: boolean } {
  const serialized = serializeDocumentSummaryList(summaries);
  const result = safeSetItem(MINDMAP_DOCS_METADATA_KEY, serialized);
  if (result.isVolatile || !result.success) {
    // Keep volatile fallback updated
    volatileSummariesStore.clear();
    summaries.forEach((s) => volatileSummariesStore.set(s.id, s));
    return { success: true, isVolatile: true };
  }
  return { success: true, isVolatile: false };
}

function readPayload(docId: string): { payload: MindMapDocumentPayload | null; isVolatile: boolean } {
  const { value, isVolatile } = safeGetItem(`${MINDMAP_DOC_PAYLOAD_PREFIX}${docId}`);
  if (isVolatile) {
    return { payload: volatilePayloadsStore.get(docId) || null, isVolatile: true };
  }
  return { payload: deserializeDocumentPayload(value), isVolatile: false };
}

function writePayloadWithQuotaRecovery(
  docId: string,
  payload: MindMapDocumentPayload
): { success: boolean; errorCode?: StorageErrorCode; isVolatile: boolean } {
  const key = `${MINDMAP_DOC_PAYLOAD_PREFIX}${docId}`;
  let writeResult = safeSetItem(key, serializeDocumentPayload(payload));

  if (writeResult.isVolatile) {
    volatilePayloadsStore.set(docId, payload);
    return { success: true, isVolatile: true };
  }

  // 3-Step Quota Recovery if write failed due to QuotaExceededError
  if (!writeResult.success && writeResult.isQuotaError) {
    // Step 1: Prune older versions of THIS current document down to 3 versions
    if (payload.versions.length > 3) {
      payload.versions = payload.versions.slice(-3);
      // Step 2: Retry setItem
      writeResult = safeSetItem(key, serializeDocumentPayload(payload));
    }
  }

  // Step 3: If still failing, return structured error code without deleting other archived documents
  if (!writeResult.success) {
    if (writeResult.isQuotaError) {
      return { success: false, errorCode: 'STORAGE_QUOTA_EXCEEDED', isVolatile: false };
    }
    // Fallback to volatile
    volatilePayloadsStore.set(docId, payload);
    return { success: true, isVolatile: true };
  }

  return { success: true, isVolatile: false };
}

// ==========================================
// 6. PUBLIC REPOSITORY API
// ==========================================

export function listMindMapDocuments(filter?: DocumentFilter): MindMapDocumentSummary[] {
  const { summaries } = readSummaries();
  let result = summaries;

  if (!filter?.includeArchived) {
    result = result.filter((d) => !d.isArchived);
  }

  if (filter?.searchQuery) {
    const q = filter.searchQuery.trim().toLowerCase();
    result = result.filter(
      (d) => d.title.toLowerCase().includes(q) || (d.tags && d.tags.some((t) => t.toLowerCase().includes(q)))
    );
  }

  if (filter?.rootTopicId) {
    result = result.filter((d) => d.rootTopicId === filter.rootTopicId);
  }

  return result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function getMindMapDocumentSummary(documentId: string): MindMapDocumentSummary | null {
  const { summaries } = readSummaries();
  return summaries.find((d) => d.id === documentId) || null;
}

export function getMindMapDocumentPayload(documentId: string): MindMapDocumentPayload | null {
  const { payload } = readPayload(documentId);
  return payload;
}

export function getMindMapVersion(documentId: string, versionNumber?: number): MindMapVersion | null {
  const payload = getMindMapDocumentPayload(documentId);
  if (!payload || !payload.versions.length) return null;

  if (typeof versionNumber === 'number') {
    return payload.versions.find((v) => v.versionNumber === versionNumber) || null;
  }
  // Return latest version by default
  return payload.versions[payload.versions.length - 1];
}

export function createMindMapDocument(input: CreateDocumentInput): StorageOperationResult<{
  document: MindMapDocumentSummary;
  version: MindMapVersion;
}> {
  const validation = validateDocumentInput({
    title: input.title,
    treeData: input.treeData,
    crossLinks: input.crossLinks,
  });

  if (!validation.valid) {
    return {
      success: false,
      errorCode: validation.errorCode,
      isVolatile: false,
      errorMessage: `Validation failed: ${validation.errorCode}`,
    };
  }

  const now = new Date().toISOString();
  const docId = `mm-doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const versionId = `mm-ver-${docId}-v1`;

  const initialVersion: MindMapVersion = {
    id: versionId,
    documentId: docId,
    versionNumber: 1,
    changeSummary: input.changeSummary || 'Bản lưu khởi tạo',
    treeData: input.treeData,
    crossLinks: input.crossLinks || [],
    viewState: {
      layoutMode: input.viewState?.layoutMode || 'tree_horizontal',
      collapsedNodeIds: input.viewState?.collapsedNodeIds || [],
      showCrossLinks: Boolean(input.viewState?.showCrossLinks),
    },
    createdAt: now,
  };

  const payload: MindMapDocumentPayload = {
    schemaVersion: 1,
    documentId: docId,
    versions: [initialVersion],
  };

  const payloadWriteResult = writePayloadWithQuotaRecovery(docId, payload);
  if (!payloadWriteResult.success) {
    return {
      success: false,
      errorCode: payloadWriteResult.errorCode,
      isVolatile: payloadWriteResult.isVolatile,
      errorMessage: 'Failed to write document payload',
    };
  }

  const summary: MindMapDocumentSummary = {
    id: docId,
    title: input.title.trim(),
    description: input.description?.trim(),
    rootTopicId: input.rootTopicId || null,
    tags: input.tags || [],
    currentVersionNumber: 1,
    totalVersionsCount: 1,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  };

  const { summaries, isVolatile: readVolatile } = readSummaries();
  summaries.unshift(summary);
  const summaryWriteResult = writeSummaries(summaries);

  const isVolatile = payloadWriteResult.isVolatile || summaryWriteResult.isVolatile || readVolatile;

  return {
    success: true,
    data: { document: summary, version: initialVersion },
    isVolatile,
  };
}

export function appendMindMapVersion(input: SaveVersionInput): StorageOperationResult<MindMapVersion> {
  const summary = getMindMapDocumentSummary(input.documentId);
  if (!summary) {
    return { success: false, errorCode: 'NOT_FOUND', isVolatile: false, errorMessage: 'Document not found' };
  }

  const validation = validateDocumentTree(input.treeData);
  if (!validation.valid) {
    return { success: false, errorCode: validation.errorCode, isVolatile: false };
  }

  const { payload } = readPayload(input.documentId);
  if (!payload) {
    return { success: false, errorCode: 'NOT_FOUND', isVolatile: false };
  }

  const nextVersionNumber = summary.currentVersionNumber + 1;
  const versionId = `mm-ver-${input.documentId}-v${nextVersionNumber}`;
  const now = new Date().toISOString();

  const latestVersion = payload.versions[payload.versions.length - 1];
  const newVersion: MindMapVersion = {
    id: versionId,
    documentId: input.documentId,
    versionNumber: nextVersionNumber,
    changeSummary: input.changeSummary || `Phiên bản ${nextVersionNumber}`,
    treeData: input.treeData,
    crossLinks: input.crossLinks || latestVersion?.crossLinks || [],
    viewState: {
      layoutMode: input.viewState?.layoutMode || latestVersion?.viewState.layoutMode || 'tree_horizontal',
      collapsedNodeIds: input.viewState?.collapsedNodeIds || latestVersion?.viewState.collapsedNodeIds || [],
      showCrossLinks:
        typeof input.viewState?.showCrossLinks === 'boolean'
          ? input.viewState.showCrossLinks
          : Boolean(latestVersion?.viewState.showCrossLinks),
    },
    createdAt: now,
  };

  // Append version and enforce MAX_VERSIONS_PER_DOCUMENT auto-pruning
  payload.versions.push(newVersion);
  if (payload.versions.length > MAX_VERSIONS_PER_DOCUMENT) {
    payload.versions = payload.versions.slice(-MAX_VERSIONS_PER_DOCUMENT);
  }

  const payloadWriteResult = writePayloadWithQuotaRecovery(input.documentId, payload);
  if (!payloadWriteResult.success) {
    return {
      success: false,
      errorCode: payloadWriteResult.errorCode,
      isVolatile: payloadWriteResult.isVolatile,
    };
  }

  // Update summary
  const { summaries, isVolatile: readVolatile } = readSummaries();
  const index = summaries.findIndex((s) => s.id === input.documentId);
  if (index !== -1) {
    summaries[index].currentVersionNumber = nextVersionNumber;
    summaries[index].totalVersionsCount = payload.versions.length;
    summaries[index].updatedAt = now;
    writeSummaries(summaries);
  }

  return {
    success: true,
    data: newVersion,
    isVolatile: payloadWriteResult.isVolatile || readVolatile,
  };
}

export function renameMindMapDocument(
  documentId: string,
  newTitle: string
): StorageOperationResult<MindMapDocumentSummary> {
  const trimmed = newTitle ? newTitle.trim() : '';
  if (!trimmed || trimmed.length > 120) {
    return { success: false, errorCode: 'INVALID_TITLE', isVolatile: false };
  }

  const { summaries, isVolatile } = readSummaries();
  const index = summaries.findIndex((s) => s.id === documentId);
  if (index === -1) {
    return { success: false, errorCode: 'NOT_FOUND', isVolatile };
  }

  summaries[index].title = trimmed;
  summaries[index].updatedAt = new Date().toISOString();
  writeSummaries(summaries);

  return {
    success: true,
    data: summaries[index],
    isVolatile,
  };
}

export function archiveMindMapDocument(documentId: string): StorageOperationResult<boolean> {
  const { summaries, isVolatile } = readSummaries();
  const index = summaries.findIndex((s) => s.id === documentId);
  if (index === -1) {
    return { success: false, errorCode: 'NOT_FOUND', isVolatile };
  }

  summaries[index].isArchived = true;
  summaries[index].updatedAt = new Date().toISOString();
  writeSummaries(summaries);

  return { success: true, data: true, isVolatile };
}

export function restoreMindMapDocument(documentId: string): StorageOperationResult<boolean> {
  const { summaries, isVolatile } = readSummaries();
  const index = summaries.findIndex((s) => s.id === documentId);
  if (index === -1) {
    return { success: false, errorCode: 'NOT_FOUND', isVolatile };
  }

  summaries[index].isArchived = false;
  summaries[index].updatedAt = new Date().toISOString();
  writeSummaries(summaries);

  return { success: true, data: true, isVolatile };
}
