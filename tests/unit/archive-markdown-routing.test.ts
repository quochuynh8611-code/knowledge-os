import { describe, it, expect } from 'vitest';
import { resolveDocumentRouting } from '../../src/lib/documentRoutingResolver';
import type { DocItem } from '../../src/components/docs/DocsExplorerView';
import type { ArchivedDocument } from '../../src/types';

describe('Unit: resolveDocumentRouting - Archive Markdown Routing (NDH1b)', () => {
  const archiveMdRecord: ArchivedDocument = {
    id: 'archive-md-001',
    fileName: 'phat-hoc-co-truyen.md',
    fileSize: 1024,
    mimeType: 'text/markdown',
    fileFormat: 'md',
    contentHash: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    storageRelPath: 'md/ab/abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890.md',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    sourceType: 'archive',
    lastPosition: { headingId: 'section-2' },
  };

  // 1. Archive Markdown exact ID
  it('1. routes Archive Markdown with exact ID to /api/archive/file/:id and recovers headingId position', () => {
    const doc: DocItem = {
      id: 'archive-md-001',
      title: 'Phật Học Cổ Truyền',
      category: 'guides',
      relativePath: 'md/ab/abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890.md',
      sourceType: 'archive',
      sizeBytes: 1024,
      lastModified: '2026-11-01T00:00:00.000Z',
    };

    const result = resolveDocumentRouting({
      doc,
      format: 'md' as any,
      archivedDocs: [archiveMdRecord],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.route.routeType).toBe('archive');
      expect(result.route.sourceType).toBe('archive');
      expect(result.route.format).toBe('md');
      expect(result.route.fileUrl).toBe('/api/archive/file/archive-md-001');
      expect(result.route.initialPosition).toBe('section-2');
      expect(result.route.fileUrl).not.toContain('/api/docs/raw');
      expect(result.route.fileUrl).not.toContain('/api/docs/content');
    }
  });

  // 2. Archive Markdown exact ID không có saved headingId
  it('2. routes Archive Markdown without saved headingId with undefined initialPosition', () => {
    const unreadRecord: ArchivedDocument = {
      ...archiveMdRecord,
      lastPosition: null,
    };
    const doc: DocItem = {
      id: 'archive-md-001',
      title: 'Phật Học Cổ Truyền',
      category: 'guides',
      relativePath: 'md/ab/abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890.md',
      sourceType: 'archive',
      sizeBytes: 1024,
      lastModified: '2026-11-01T00:00:00.000Z',
    };

    const result = resolveDocumentRouting({
      doc,
      format: 'md' as any,
      archivedDocs: [unreadRecord],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.route.routeType).toBe('archive');
      expect(result.route.fileUrl).toBe('/api/archive/file/archive-md-001');
      expect(result.route.initialPosition).toBeUndefined();
    }
  });

  // 3. Archive Markdown explicit URI
  it('3. routes Archive Markdown with explicit archive:// URI', () => {
    const doc: DocItem = {
      id: 'some-doc-item',
      title: 'Explicit URI Doc',
      category: 'guides',
      relativePath: 'archive://archive-md-001',
      sourceType: 'archive',
      sizeBytes: 1024,
      lastModified: '2026-11-01T00:00:00.000Z',
    };

    const result = resolveDocumentRouting({
      doc,
      format: 'md' as any,
      archivedDocs: [archiveMdRecord],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.route.routeType).toBe('archive');
      expect(result.route.fileUrl).toBe('/api/archive/file/archive-md-001');
    }
  });

  // 4. Archive Markdown hash-like structural unique match
  it('4. routes Archive Markdown via structural unique hash-like match', () => {
    const doc: DocItem = {
      id: 'virtual-shelf-item-1',
      title: 'Structural Match Doc',
      category: 'guides',
      relativePath: 'md/ab/abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890.md',
      sourceType: 'archive',
      sizeBytes: 1024,
      lastModified: '2026-11-01T00:00:00.000Z',
    };

    const result = resolveDocumentRouting({
      doc,
      format: 'md' as any,
      archivedDocs: [archiveMdRecord],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.route.routeType).toBe('archive');
      expect(result.route.fileUrl).toBe('/api/archive/file/archive-md-001');
    }
  });

  // 5. Archive Markdown ambiguity
  it('5. returns controlled ambiguity failure when multiple archive candidates match structural path', () => {
    const candidateA: ArchivedDocument = {
      ...archiveMdRecord,
      id: 'arch-md-dup-1',
    };
    const candidateB: ArchivedDocument = {
      ...archiveMdRecord,
      id: 'arch-md-dup-2',
    };

    const doc: DocItem = {
      id: 'unmatched-id',
      title: 'Ambiguous Doc',
      category: 'guides',
      relativePath: 'md/ab/abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890.md',
      sourceType: 'archive',
      sizeBytes: 1024,
      lastModified: '2026-11-01T00:00:00.000Z',
    };

    const result = resolveDocumentRouting({
      doc,
      format: 'md' as any,
      archivedDocs: [candidateA, candidateB],
    });

    expect(result.success).toBe(false);
    if (result.success === false) {
      expect(result.error.status).toBe('ambiguous');
      expect(result.error.candidateIds).toEqual(
        expect.arrayContaining(['arch-md-dup-1', 'arch-md-dup-2'])
      );
    }
  });

  // 6. Archive Markdown missing identifier
  it('6. returns controlled missing identifier failure when relativePath does not match hash-like pattern or candidate', () => {
    const doc: DocItem = {
      id: 'unknown-id',
      title: 'Missing Identifier Doc',
      category: 'guides',
      relativePath: 'md/invalid/path.md',
      sourceType: 'archive',
      sizeBytes: 1024,
      lastModified: '2026-11-01T00:00:00.000Z',
    };

    const result = resolveDocumentRouting({
      doc,
      format: 'md' as any,
      archivedDocs: [],
    });

    expect(result.success).toBe(false);
    if (result.success === false) {
      expect(result.error.status).toBe('missing_identifier');
    }
  });

  // 7. Filename suffix rejection
  it('7. rejects filename suffix match without exact ID or structural match', () => {
    const doc: DocItem = {
      id: 'other-id',
      title: 'Guide',
      category: 'guides',
      relativePath: 'notes/guide.md',
      sourceType: 'archive',
      sizeBytes: 1024,
      lastModified: '2026-11-01T00:00:00.000Z',
    };

    const existingRecord: ArchivedDocument = {
      ...archiveMdRecord,
      fileName: 'guide.md',
      storageRelPath: 'md/11/1111111111111111111111111111111111111111111111111111111111111111.md',
    };

    const result = resolveDocumentRouting({
      doc,
      format: 'md' as any,
      archivedDocs: [existingRecord],
    });

    expect(result.success).toBe(false);
  });

  // 8. Vault Markdown bảo toàn
  it('8. preserves Vault Markdown routing to /api/obsidian/vault/file', () => {
    const vaultDoc: DocItem = {
      id: 'vault:01_Notes/note.md',
      title: 'Vault Note',
      category: 'vault',
      relativePath: '01_Notes/note.md',
      sourceType: 'vault',
      sourcePath: '01_Notes/note.md',
      sizeBytes: 1024,
      lastModified: '2026-11-01T00:00:00.000Z',
    };

    const result = resolveDocumentRouting({
      doc: vaultDoc,
      format: 'md' as any,
      archivedDocs: [],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.route.routeType).toBe('vault');
      expect(result.route.sourceType).toBe('vault');
      expect(result.route.fileUrl).toBe(`/api/obsidian/vault/file?path=${encodeURIComponent('01_Notes/note.md')}`);
    }
  });

  // 9. Docs Markdown bảo toàn
  it('9. preserves Docs Markdown routing to /api/docs/content and /api/docs/raw', () => {
    const docsDoc: DocItem = {
      id: 'guides/note.md',
      title: 'Docs Note',
      category: 'guides',
      relativePath: 'guides/note.md',
      sourceType: 'docs',
      sizeBytes: 1024,
      lastModified: '2026-11-01T00:00:00.000Z',
    };

    const result = resolveDocumentRouting({
      doc: docsDoc,
      format: 'md' as any,
      archivedDocs: [],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.route.routeType).toBe('docs');
      expect(result.route.sourceType).toBe('docs');
      expect(result.route.fileUrl).toBe(`/api/docs/raw?path=${encodeURIComponent('guides/note.md')}`);
      expect(result.route.initialPosition).toBeUndefined();
    }
  });

  // 10. Docs Markdown position từ authoritative Archive record
  it('10. resolves Docs Markdown position from authoritative Archive record', () => {
    const docsDoc: DocItem = {
      id: 'docs-md-001',
      title: 'Docs Note with Position',
      category: 'guides',
      relativePath: 'guides/note.md',
      sourceType: 'docs',
      sizeBytes: 1024,
      lastModified: '2026-11-01T00:00:00.000Z',
    };

    const authoritativeArchiveRecord: ArchivedDocument = {
      ...archiveMdRecord,
      id: 'archive-md-001',
      sourceType: 'docs',
      sourcePath: 'guides/note.md',
      storageRelPath: 'guides/note.md',
      lastPosition: { headingId: 'section-2' },
    };

    const result = resolveDocumentRouting({
      doc: docsDoc,
      format: 'md' as any,
      archivedDocs: [authoritativeArchiveRecord],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.route.routeType).toBe('docs');
      expect(result.route.initialPosition).toBe('section-2');
    }
  });

  // 11. Markdown position leakage prevention
  it('11. prevents position leakage across distinct Markdown records sharing fileName or suffix', () => {
    const targetDoc: DocItem = {
      id: 'archive-md-001',
      title: 'Target Doc without Position',
      category: 'guides',
      relativePath: 'md/ab/abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890.md',
      sourceType: 'archive',
      sizeBytes: 1024,
      lastModified: '2026-11-01T00:00:00.000Z',
    };

    const recordA: ArchivedDocument = {
      ...archiveMdRecord,
      id: 'archive-md-001',
      lastPosition: null,
    };

    const recordB: ArchivedDocument = {
      ...archiveMdRecord,
      id: 'archive-md-002',
      fileName: 'phat-hoc-co-truyen.md',
      storageRelPath: 'md/ff/ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff.md',
      lastPosition: { headingId: 'section-99' },
    };

    const result = resolveDocumentRouting({
      doc: targetDoc,
      format: 'md' as any,
      archivedDocs: [recordA, recordB],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.route.initialPosition).toBeUndefined();
      expect(result.route.initialPosition).not.toBe('section-99');
    }
  });
});
