/**
 * Unit Test Suite: Mind Map Document Storage Engine (Phase P1)
 *
 * Verifies:
 * 1. Serializer & Deserializer round-trip invariants.
 * 2. Tree/Edge/Document input validation rules.
 * 3. Document CRUD & Version auto-increment.
 * 4. Bounded 5-version retention policy with auto-pruning.
 * 5. LocalStorage failure tolerance, in-memory volatile fallback, and 3-step quota recovery.
 * 6. Tree adapter round-trip transformations.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  serializeDocumentSummaryList,
  deserializeDocumentSummaryList,
  serializeDocumentPayload,
  deserializeDocumentPayload,
  validateDocumentInput,
  validateDocumentTree,
  projectedTreeToDocumentTree,
  documentTreeToProjectedTree,
  createMindMapDocument,
  getMindMapDocumentSummary,
  getMindMapDocumentPayload,
  getMindMapVersion,
  listMindMapDocuments,
  appendMindMapVersion,
  renameMindMapDocument,
  archiveMindMapDocument,
  restoreMindMapDocument,
  clearVolatileStorageForTests,
  MINDMAP_DOCS_METADATA_KEY,
  MINDMAP_DOC_PAYLOAD_PREFIX,
  MAX_VERSIONS_PER_DOCUMENT,
} from '../../src/lib/mindmapDocumentStorage';
import {
  MindMapDocumentNode,
  MindMapDocumentSummary,
  MindMapDocumentPayload,
  MindMapVersion,
} from '../../src/types/mindmapDocument';
import { MindMapTreeNode } from '../../src/lib/mindmapProjection';

describe('Mind Map Document Storage Engine (Phase P1)', () => {
  beforeEach(() => {
    localStorage.clear();
    clearVolatileStorageForTests();
    vi.restoreAllMocks();
  });

  const SAMPLE_TREE: MindMapDocumentNode = {
    id: 'node-root',
    title: 'Tứ Diệu Đế',
    nodeType: 'topic',
    children: [
      {
        id: 'node-kho',
        title: 'Khổ Đế',
        nodeType: 'topic',
        semanticBadge: '[tiên quyết]',
        children: [],
      },
      {
        id: 'node-tap',
        title: 'Tập Đế',
        nodeType: 'topic',
        children: [],
      },
    ],
  };

  // ==========================================
  // 1. SERIALIZER & DESERIALIZER
  // ==========================================
  describe('Serializer & Deserializer', () => {
    it('serializes and deserializes document summary list accurately', () => {
      const summaries: MindMapDocumentSummary[] = [
        {
          id: 'doc-1',
          title: 'Sơ đồ Phật học',
          description: 'Mô tả ngắn',
          rootTopicId: 'topic-1',
          tags: ['triet-hoc'],
          currentVersionNumber: 2,
          totalVersionsCount: 2,
          isArchived: false,
          createdAt: '2026-10-09T00:00:00.000Z',
          updatedAt: '2026-10-09T01:00:00.000Z',
        },
      ];

      const serialized = serializeDocumentSummaryList(summaries);
      const deserialized = deserializeDocumentSummaryList(serialized);

      expect(deserialized).toEqual(summaries);
    });

    it('returns empty list gracefully when deserializing malformed JSON or invalid data', () => {
      expect(deserializeDocumentSummaryList('{ broken: json')).toEqual([]);
      expect(deserializeDocumentSummaryList('')).toEqual([]);
      expect(deserializeDocumentSummaryList('{"notAnArray": true}')).toEqual([]);
    });

    it('serializes and deserializes document payload with schemaVersion: 1', () => {
      const payload: MindMapDocumentPayload = {
        schemaVersion: 1,
        documentId: 'doc-1',
        versions: [
          {
            id: 'ver-1',
            documentId: 'doc-1',
            versionNumber: 1,
            changeSummary: 'Khởi tạo',
            treeData: SAMPLE_TREE,
            crossLinks: [],
            viewState: {
              layoutMode: 'tree_horizontal',
              collapsedNodeIds: ['node-kho'],
              showCrossLinks: false,
            },
            createdAt: '2026-10-09T00:00:00.000Z',
          },
        ],
      };

      const raw = serializeDocumentPayload(payload);
      const deserialized = deserializeDocumentPayload(raw);

      expect(deserialized).toEqual(payload);
    });

    it('returns null when payload schemaVersion is unsupported or payload is corrupted', () => {
      expect(deserializeDocumentPayload('{ corrupted json')).toBeNull();
      expect(deserializeDocumentPayload(JSON.stringify({ schemaVersion: 99, versions: [] }))).toBeNull();
      expect(deserializeDocumentPayload(null)).toBeNull();
    });
  });

  // ==========================================
  // 2. VALIDATION RULES
  // ==========================================
  describe('Validator Rules', () => {
    it('rejects empty, whitespace-only, or overly long titles (>120 chars)', () => {
      expect(validateDocumentInput({ title: '', treeData: SAMPLE_TREE })).toEqual({
        valid: false,
        errorCode: 'INVALID_TITLE',
      });
      expect(validateDocumentInput({ title: '   ', treeData: SAMPLE_TREE })).toEqual({
        valid: false,
        errorCode: 'INVALID_TITLE',
      });
      expect(validateDocumentInput({ title: 'a'.repeat(121), treeData: SAMPLE_TREE })).toEqual({
        valid: false,
        errorCode: 'INVALID_TITLE',
      });
      expect(validateDocumentInput({ title: 'Valid Title', treeData: SAMPLE_TREE })).toEqual({
        valid: true,
      });
    });

    it('rejects tree without valid root node', () => {
      expect(validateDocumentTree(null as unknown as MindMapDocumentNode)).toEqual({
        valid: false,
        errorCode: 'EMPTY_TREE',
      });
      expect(validateDocumentTree({ id: '', title: '', nodeType: 'topic', children: [] })).toEqual({
        valid: false,
        errorCode: 'EMPTY_TREE',
      });
    });

    it('rejects duplicate node IDs within the same tree', () => {
      const duplicateTree: MindMapDocumentNode = {
        id: 'dup-id',
        title: 'Root',
        nodeType: 'topic',
        children: [
          {
            id: 'dup-id',
            title: 'Child with same ID',
            nodeType: 'topic',
            children: [],
          },
        ],
      };

      expect(validateDocumentTree(duplicateTree)).toEqual({
        valid: false,
        errorCode: 'DUPLICATE_NODE_ID',
      });
    });

    it('rejects dangling cross-links referencing non-existent nodes', () => {
      const result = validateDocumentInput({
        title: 'Valid Doc',
        treeData: SAMPLE_TREE,
        crossLinks: [
          {
            id: 'edge-1',
            sourceNodeId: 'node-kho',
            targetNodeId: 'missing-node-id',
            edgeType: 'prerequisite',
          },
        ],
      });

      expect(result).toEqual({
        valid: false,
        errorCode: 'DANGLING_EDGE_REFERENCE',
      });
    });
  });

  // ==========================================
  // 3. REPOSITORY CRUD & RETENTION
  // ==========================================
  describe('Repository Operations', () => {
    it('creates document with initial version 1 and persists both summary and payload', () => {
      const result = createMindMapDocument({
        title: '   Sơ đồ Tứ Diệu Đế   ',
        description: 'Tài liệu nghiên cứu',
        rootTopicId: 'topic-tu-dieu-de',
        tags: ['phat-hoc', 'tu-dieu-de'],
        treeData: SAMPLE_TREE,
        changeSummary: 'Bản lưu khởi tạo',
        viewState: {
          layoutMode: 'tree_horizontal',
          collapsedNodeIds: ['node-kho'],
          showCrossLinks: true,
        },
      });

      expect(result.success).toBe(true);
      expect(result.isVolatile).toBe(false);
      expect(result.data).toBeDefined();

      const { document, version } = result.data!;
      expect(document.title).toBe('Sơ đồ Tứ Diệu Đế');
      expect(document.currentVersionNumber).toBe(1);
      expect(document.totalVersionsCount).toBe(1);
      expect(document.isArchived).toBe(false);
      expect(version.versionNumber).toBe(1);
      expect(version.treeData).toEqual(SAMPLE_TREE);
      expect(version.viewState.collapsedNodeIds).toEqual(['node-kho']);

      // Check localStorage keys
      const summaries = deserializeDocumentSummaryList(localStorage.getItem(MINDMAP_DOCS_METADATA_KEY));
      expect(summaries).toHaveLength(1);
      expect(summaries[0].id).toBe(document.id);

      const payload = deserializeDocumentPayload(localStorage.getItem(`${MINDMAP_DOC_PAYLOAD_PREFIX}${document.id}`));
      expect(payload).not.toBeNull();
      expect(payload?.versions).toHaveLength(1);
    });

    it('retrieves document summary, payload, and specific version correctly', () => {
      const created = createMindMapDocument({
        title: 'Tài liệu A',
        treeData: SAMPLE_TREE,
      });
      const docId = created.data!.document.id;

      const summary = getMindMapDocumentSummary(docId);
      expect(summary?.title).toBe('Tài liệu A');

      const payload = getMindMapDocumentPayload(docId);
      expect(payload?.documentId).toBe(docId);
      expect(payload?.versions).toHaveLength(1);

      const v1 = getMindMapVersion(docId, 1);
      expect(v1?.versionNumber).toBe(1);

      // Latest version query (omit versionNumber)
      const latest = getMindMapVersion(docId);
      expect(latest?.versionNumber).toBe(1);

      // Non-existent document
      expect(getMindMapDocumentSummary('non-existent')).toBeNull();
      expect(getMindMapVersion('non-existent')).toBeNull();
    });

    it('lists documents with search and archived filters', () => {
      const doc1 = createMindMapDocument({ title: 'Bát Chánh Đạo', treeData: SAMPLE_TREE, tags: ['dao-de'] }).data!.document;
      const doc2 = createMindMapDocument({ title: 'Thập Nhị Nhân Duyên', treeData: SAMPLE_TREE, tags: ['duyen-khoi'] }).data!.document;

      archiveMindMapDocument(doc2.id);

      // By default, archived docs are excluded
      const activeList = listMindMapDocuments();
      expect(activeList).toHaveLength(1);
      expect(activeList[0].id).toBe(doc1.id);

      // Include archived
      const allList = listMindMapDocuments({ includeArchived: true });
      expect(allList).toHaveLength(2);

      // Search query
      const searchResults = listMindMapDocuments({ searchQuery: 'Bát Chánh', includeArchived: true });
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].title).toBe('Bát Chánh Đạo');
    });

    it('appends versions with auto-increment and enforces MAX_VERSIONS = 5 auto-pruning', () => {
      const initial = createMindMapDocument({ title: 'Doc Version Test', treeData: SAMPLE_TREE });
      const docId = initial.data!.document.id;

      // Append versions 2, 3, 4, 5
      for (let i = 2; i <= 5; i++) {
        const appended = appendMindMapVersion({
          documentId: docId,
          changeSummary: `Version ${i}`,
          treeData: SAMPLE_TREE,
          viewState: { layoutMode: 'tree_vertical', collapsedNodeIds: [], showCrossLinks: false },
        });
        expect(appended.success).toBe(true);
        expect(appended.data?.versionNumber).toBe(i);
      }

      let payload = getMindMapDocumentPayload(docId);
      expect(payload?.versions).toHaveLength(5);
      expect(payload?.versions.map((v) => v.versionNumber)).toEqual([1, 2, 3, 4, 5]);

      // Append version 6 -> Should prune version 1, keeping 5 versions [2, 3, 4, 5, 6]
      const v6 = appendMindMapVersion({
        documentId: docId,
        changeSummary: 'Version 6 exceeds limit',
        treeData: SAMPLE_TREE,
      });

      expect(v6.success).toBe(true);
      expect(v6.data?.versionNumber).toBe(6);

      payload = getMindMapDocumentPayload(docId);
      expect(payload?.versions).toHaveLength(MAX_VERSIONS_PER_DOCUMENT);
      expect(payload?.versions.map((v) => v.versionNumber)).toEqual([2, 3, 4, 5, 6]);

      const summary = getMindMapDocumentSummary(docId);
      expect(summary?.currentVersionNumber).toBe(6);
      expect(summary?.totalVersionsCount).toBe(5);
    });

    it('renames document and updates summary while preserving versions', () => {
      const created = createMindMapDocument({ title: 'Tên Cũ', treeData: SAMPLE_TREE }).data!;
      const renameResult = renameMindMapDocument(created.document.id, 'Tên Mới Đã Đổi');

      expect(renameResult.success).toBe(true);
      expect(renameResult.data?.title).toBe('Tên Mới Đã Đổi');

      const summary = getMindMapDocumentSummary(created.document.id);
      expect(summary?.title).toBe('Tên Mới Đã Đổi');

      const payload = getMindMapDocumentPayload(created.document.id);
      expect(payload?.versions).toHaveLength(1);
    });

    it('archives and restores documents (soft-delete toggle)', () => {
      const created = createMindMapDocument({ title: 'Tài liệu thử nghiệm', treeData: SAMPLE_TREE }).data!;
      
      expect(archiveMindMapDocument(created.document.id).success).toBe(true);
      expect(getMindMapDocumentSummary(created.document.id)?.isArchived).toBe(true);

      expect(restoreMindMapDocument(created.document.id).success).toBe(true);
      expect(getMindMapDocumentSummary(created.document.id)?.isArchived).toBe(false);
    });
  });

  // ==========================================
  // 4. STORAGE FAULT TOLERANCE & QUOTA
  // ==========================================
  describe('Storage Resilience & Recovery', () => {
    it('falls back to volatile in-memory storage with isVolatile: true when localStorage is unavailable', () => {
      // Simulate localStorage setItem throwing SecurityError
      vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
        throw new Error('SecurityError: The operation is insecure.');
      });
      vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError');
      });

      const result = createMindMapDocument({
        title: 'Tài liệu RAM Fallback',
        treeData: SAMPLE_TREE,
      });

      expect(result.success).toBe(true);
      expect(result.isVolatile).toBe(true);
      expect(result.data?.document.title).toBe('Tài liệu RAM Fallback');

      // Can be retrieved from in-memory store in the same session
      const summary = getMindMapDocumentSummary(result.data!.document.id);
      expect(summary?.title).toBe('Tài liệu RAM Fallback');
    });

    it('handles QuotaExceededError via 3-step recovery pruning only current document versions', () => {
      const created = createMindMapDocument({ title: 'Doc Quota Test', treeData: SAMPLE_TREE }).data!;
      const docId = created.document.id;

      // Add 4 versions
      for (let i = 2; i <= 4; i++) {
        appendMindMapVersion({ documentId: docId, treeData: SAMPLE_TREE });
      }
      expect(getMindMapDocumentPayload(docId)?.versions).toHaveLength(4);

      // Create an archived document to verify it is NOT deleted during quota recovery
      const archivedDoc = createMindMapDocument({ title: 'Archived Doc', treeData: SAMPLE_TREE }).data!;
      archiveMindMapDocument(archivedDoc.document.id);

      // Mock QuotaExceededError on the first setItem call for payload, then allow subsequent write
      const quotaErr = new Error('QuotaExceededError');
      quotaErr.name = 'QuotaExceededError';
      vi.spyOn(window.localStorage, 'setItem').mockImplementationOnce(() => {
        throw quotaErr;
      });

      // Saving version 5 should trigger quota recovery: prune current doc versions to 3, then retry
      const v5 = appendMindMapVersion({ documentId: docId, treeData: SAMPLE_TREE });
      expect(v5.success).toBe(true);

      // Verify archived document still exists!
      expect(getMindMapDocumentSummary(archivedDoc.document.id)).not.toBeNull();
      expect(getMindMapDocumentSummary(archivedDoc.document.id)?.isArchived).toBe(true);
    });

    it('returns STORAGE_QUOTA_EXCEEDED when retry still fails after pruning', () => {
      const created = createMindMapDocument({ title: 'Doc Permanent Quota Failure', treeData: SAMPLE_TREE }).data!;
      
      const quotaErr = new Error('QuotaExceededError');
      quotaErr.name = 'QuotaExceededError';
      // Mock repeated quota failures on setItem
      vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
        throw quotaErr;
      });

      const failedAppend = appendMindMapVersion({ documentId: created.document.id, treeData: SAMPLE_TREE });
      expect(failedAppend.success).toBe(false);
      expect(failedAppend.errorCode).toBe('STORAGE_QUOTA_EXCEEDED');
    });
  });

  // ==========================================
  // 5. TREE ADAPTERS
  // ==========================================
  describe('Tree Adapters', () => {
    it('projectedTreeToDocumentTree strips runtime-only fields and preserves structure', () => {
      const runtimeTree: MindMapTreeNode = {
        id: 'node-1',
        title: 'Root Node',
        type: 'topic',
        domain: 'general',
        categoryName: 'Category A',
        studyStatus: 'completed',
        progress: 100,
        hopDistance: 0,
        tags: ['tag1'],
        children: [
          {
            id: 'node-child-1',
            title: 'Child Node',
            type: 'note',
            domain: 'general',
            hopDistance: 1,
            parentHopId: 'node-1',
            edgeTypeToParent: 'prerequisite',
            tags: [],
            children: [],
          },
        ],
      };

      const docTree = projectedTreeToDocumentTree(runtimeTree);

      expect(docTree.id).toBe('node-1');
      expect(docTree.title).toBe('Root Node');
      expect(docTree.nodeType).toBe('topic');
      expect((docTree as unknown as { hopDistance?: number }).hopDistance).toBeUndefined();
      expect((docTree as unknown as { progress?: number }).progress).toBeUndefined();
      expect(docTree.children).toHaveLength(1);
      expect(docTree.children[0].id).toBe('node-child-1');
      expect(docTree.children[0].semanticBadge).toBe('[tiên quyết]');
    });

    it('documentTreeToProjectedTree reconstructs MindMapTreeNode with safe default runtime fields', () => {
      const docTree: MindMapDocumentNode = {
        id: 'doc-node-root',
        title: 'Doc Root',
        nodeType: 'topic',
        children: [
          {
            id: 'doc-node-sub',
            title: 'Sub Concept',
            nodeType: 'concept',
            semanticBadge: '[nâng cao]',
            children: [],
          },
        ],
      };

      const projected = documentTreeToProjectedTree(docTree, 'tree_horizontal');

      expect(projected.id).toBe('doc-node-root');
      expect(projected.title).toBe('Doc Root');
      expect(projected.domain).toBe('general');
      expect(projected.hopDistance).toBe(0);
      expect(projected.children).toHaveLength(1);
      expect(projected.children[0].id).toBe('doc-node-sub');
      expect(projected.children[0].edgeTypeToParent).toBe('advanced');
      expect(projected.children[0].hopDistance).toBe(1);
    });
  });
});
