import { describe, it, expect } from 'vitest';
import { resolveDocumentRouting } from '../../src/lib/documentRoutingResolver';
import type { DocItem } from '../../src/components/docs/DocsExplorerView';
import type { ArchivedDocument } from '../../src/types';

describe('Unit: resolveDocumentRouting (NDH1a Pure Routing & Identity Resolver)', () => {
  const dummyArchivedDoc: ArchivedDocument = {
    id: 'arch-epub-1',
    fileName: 'phat-hoc-co-truyen.epub',
    fileSize: 1024,
    mimeType: 'application/epub+zip',
    fileFormat: 'epub',
    contentHash: 'hash-epub-1',
    storageRelPath: 'epub/ha/hash-epub-1.epub',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    lastPosition: { cfi: 'epubcfi(/6/4[chap01]!/4/2/1:0)' },
  };

  const dummyPdfDoc: ArchivedDocument = {
    id: 'arch-pdf-1',
    fileName: 'kinh-trung-bo.pdf',
    fileSize: 2048,
    mimeType: 'application/pdf',
    fileFormat: 'pdf',
    contentHash: 'hash-pdf-1',
    storageRelPath: 'pdf/ha/hash-pdf-1.pdf',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    lastPosition: { pageNumber: 42 },
  };

  // 1. Archive EPUB exact ID
  it('1. routes Archive EPUB with exact ID to /api/archive/file/:id and sets sourceType to archive', () => {
    const doc: DocItem = {
      id: 'arch-epub-1',
      title: 'Phật Học Cổ Truyền',
      category: 'books',
      relativePath: 'books/phat-hoc-co-truyen.epub',
      sizeBytes: 1024,
      lastModified: '2026-11-01T00:00:00.000Z',
    };

    const result = resolveDocumentRouting({
      doc,
      format: 'epub',
      archivedDocs: [dummyArchivedDoc],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.route.routeType).toBe('archive');
      expect(result.route.sourceType).toBe('archive');
      expect(result.route.documentId).toBe('arch-epub-1');
      expect(result.route.fileUrl).toBe('/api/archive/file/arch-epub-1');
      expect(result.route.fileUrl).not.toContain('/api/docs/raw');
    }
  });

  // 2. Archive EPUB position isolation
  it('2. isolates Archive EPUB reading position to authoritative CFI and rejects PDF pageNumber', () => {
    const doc: DocItem = {
      id: 'arch-epub-1',
      title: 'Phật Học Cổ Truyền',
      category: 'books',
      relativePath: 'books/phat-hoc-co-truyen.epub',
      sizeBytes: 1024,
      lastModified: '2026-11-01T00:00:00.000Z',
    };

    const result = resolveDocumentRouting({
      doc,
      format: 'epub',
      archivedDocs: [dummyArchivedDoc, dummyPdfDoc],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.route.initialPosition).toBe('epubcfi(/6/4[chap01]!/4/2/1:0)');
      expect(result.route.initialPosition).not.toBe('42');
    }
  });

  // 3. Archive EPUB missing position
  it('3. returns undefined initialPosition when Archive EPUB has no saved position', () => {
    const unreadEpub: ArchivedDocument = {
      ...dummyArchivedDoc,
      id: 'arch-epub-unread',
      lastPosition: null,
    };
    const doc: DocItem = {
      id: 'arch-epub-unread',
      title: 'Unread EPUB',
      category: 'books',
      relativePath: 'books/unread.epub',
      sizeBytes: 1024,
      lastModified: '2026-11-01T00:00:00.000Z',
    };

    const result = resolveDocumentRouting({
      doc,
      format: 'epub',
      archivedDocs: [unreadEpub],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.route.initialPosition).toBeUndefined();
    }
  });

  // 4. Archive PDF exact ID
  it('4. routes Archive PDF with exact ID to /api/archive/file/:id and sets sourceType to archive', () => {
    const doc: DocItem = {
      id: 'arch-pdf-1',
      title: 'Kinh Trung Bộ',
      category: 'guides',
      relativePath: 'guides/kinh-trung-bo.pdf',
      sizeBytes: 2048,
      lastModified: '2026-11-01T00:00:00.000Z',
    };

    const result = resolveDocumentRouting({
      doc,
      format: 'pdf',
      archivedDocs: [dummyPdfDoc],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.route.routeType).toBe('archive');
      expect(result.route.sourceType).toBe('archive');
      expect(result.route.documentId).toBe('arch-pdf-1');
      expect(result.route.fileUrl).toBe('/api/archive/file/arch-pdf-1');
      expect(result.route.fileUrl).not.toContain('/api/docs/raw');
    }
  });

  // 5. Archive PDF position isolation
  it('5. isolates Archive PDF reading position to authoritative pageNumber string and rejects CFI', () => {
    const doc: DocItem = {
      id: 'arch-pdf-1',
      title: 'Kinh Trung Bộ',
      category: 'guides',
      relativePath: 'guides/kinh-trung-bo.pdf',
      sizeBytes: 2048,
      lastModified: '2026-11-01T00:00:00.000Z',
    };

    const result = resolveDocumentRouting({
      doc,
      format: 'pdf',
      archivedDocs: [dummyPdfDoc, dummyArchivedDoc],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.route.initialPosition).toBe('42');
      expect(result.route.initialPosition).not.toContain('epubcfi');
    }
  });

  // 6. Filename suffix rejection
  it('6. rejects granting Archive route if candidate only matches fileName suffix but has different ID and no structural match', () => {
    const doc: DocItem = {
      id: 'completely-unrelated-id',
      title: 'Khác Biệt',
      category: 'books',
      relativePath: 'custom-folder/kinh-trung-bo.pdf', // endsWith fileName
      sizeBytes: 2048,
      lastModified: '2026-11-01T00:00:00.000Z',
    };

    const result = resolveDocumentRouting({
      doc,
      format: 'pdf',
      archivedDocs: [dummyPdfDoc], // fileName is kinh-trung-bo.pdf
      docsList: [],
    });

    // Should NOT route to dummyPdfDoc archive endpoint
    if (result.success === true) {
      expect(result.route.routeType).not.toBe('archive');
      expect(result.route.documentId).not.toBe('arch-pdf-1');
    } else if (result.success === false) {
      expect(result.error.status).not.toBe('ambiguous');
    }
  });

  // 7. Ambiguous structural match
  it('7. fails closed with ambiguous status and candidateIds when multiple structural candidates match', () => {
    const archCandidate1: ArchivedDocument = {
      ...dummyPdfDoc,
      id: 'candidate-1',
      sourcePath: 'shared/path/manual.pdf',
    };
    const archCandidate2: ArchivedDocument = {
      ...dummyPdfDoc,
      id: 'candidate-2',
      sourcePath: 'shared/path/manual.pdf',
    };

    const doc: DocItem = {
      id: 'unknown-id',
      title: 'Manual PDF',
      category: 'guides',
      relativePath: 'shared/path/manual.pdf',
      sizeBytes: 2048,
      lastModified: '2026-11-01T00:00:00.000Z',
    };

    const result = resolveDocumentRouting({
      doc,
      format: 'pdf',
      archivedDocs: [archCandidate1, archCandidate2],
    });

    expect(result.success).toBe(false);
    if (result.success === false) {
      expect(result.error.status).toBe('ambiguous');
      expect(result.error.candidateIds).toEqual(expect.arrayContaining(['candidate-1', 'candidate-2']));
    }
  });

  // 8. Docs PDF hash-like path
  it('8. routes Docs PDF with hash-like path to /api/docs/raw when verified in docsList', () => {
    const hashRelPath = 'pdf/be/be0350020962dd65e04cf9786917df7f903871bdb65ea3f03dadd58ee89d1747.pdf';
    const doc: DocItem = {
      id: 'docs-hash-pdf',
      title: 'Docs Storage Shaped PDF',
      category: 'guides',
      relativePath: hashRelPath,
      sourceType: 'docs',
      sizeBytes: 2048,
      lastModified: '2026-11-01T00:00:00.000Z',
    };

    const result = resolveDocumentRouting({
      doc,
      format: 'pdf',
      archivedDocs: [],
      docsList: [doc],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.route.routeType).toBe('docs');
      expect(result.route.sourceType).toBe('docs');
      expect(result.route.fileUrl).toBe(`/api/docs/raw?path=${encodeURIComponent(hashRelPath)}`);
    }
  });

  // 9. Docs EPUB provenance protection
  it('9. routes Docs EPUB to /api/docs/raw, isolates position and rejects /api/archive/file', () => {
    const doc: DocItem = {
      id: 'docs-epub-doc',
      title: 'Docs EPUB Book',
      category: 'books',
      relativePath: 'books/clean-architecture.epub',
      sourceType: 'docs',
      sizeBytes: 4096,
      lastModified: '2026-11-01T00:00:00.000Z',
    };

    // 9a. No authoritative archive record -> initialPosition = undefined
    const resWithoutArch = resolveDocumentRouting({
      doc,
      format: 'epub',
      archivedDocs: [],
      docsList: [doc],
    });

    expect(resWithoutArch.success).toBe(true);
    if (resWithoutArch.success) {
      expect(resWithoutArch.route.routeType).toBe('docs');
      expect(resWithoutArch.route.sourceType).toBe('docs');
      expect(resWithoutArch.route.fileUrl).toBe(`/api/docs/raw?path=${encodeURIComponent('books/clean-architecture.epub')}`);
      expect(resWithoutArch.route.fileUrl).not.toContain('/api/archive/file');
      expect(resWithoutArch.route.initialPosition).toBeUndefined();
    }

    // 9b. With authoritative archive record matching exact ID or structural path
    const matchingArch: ArchivedDocument = {
      ...dummyArchivedDoc,
      id: 'docs-epub-doc',
      sourcePath: 'books/clean-architecture.epub',
      lastPosition: { cfi: 'epubcfi(/6/12[title]!/4/1)' },
    };

    const resWithArch = resolveDocumentRouting({
      doc,
      format: 'epub',
      archivedDocs: [matchingArch],
      docsList: [doc],
    });

    expect(resWithArch.success).toBe(true);
    if (resWithArch.success) {
      expect(resWithArch.route.routeType).toBe('docs');
      expect(resWithArch.route.initialPosition).toBe('epubcfi(/6/12[title]!/4/1)');
    }
  });

  // 10. Docs PDF position recovery
  it('10. resolves Docs PDF position only from authoritative archive record or leaves undefined', () => {
    const doc: DocItem = {
      id: 'docs-pdf-guide',
      title: 'Docs PDF Guide',
      category: 'guides',
      relativePath: 'guides/git-guide.pdf',
      sourceType: 'docs',
      sizeBytes: 1024,
      lastModified: '2026-11-01T00:00:00.000Z',
    };

    const resNoArch = resolveDocumentRouting({
      doc,
      format: 'pdf',
      archivedDocs: [],
      docsList: [doc],
    });

    expect(resNoArch.success).toBe(true);
    if (resNoArch.success) {
      expect(resNoArch.route.initialPosition).toBeUndefined();
    }

    const matchingArch: ArchivedDocument = {
      ...dummyPdfDoc,
      id: 'docs-pdf-guide',
      sourcePath: 'guides/git-guide.pdf',
      lastPosition: { pageNumber: 15 },
    };

    const resWithArch = resolveDocumentRouting({
      doc,
      format: 'pdf',
      archivedDocs: [matchingArch],
      docsList: [doc],
    });

    expect(resWithArch.success).toBe(true);
    if (resWithArch.success) {
      expect(resWithArch.route.initialPosition).toBe('15');
    }
  });

  // 11. Vault PDF & EPUB
  it('11. routes Vault PDF & EPUB to /api/obsidian/vault/attachment?path=... with sourceType vault', () => {
    const vaultPdfDoc: DocItem = {
      id: 'vault:Notes/Research.pdf',
      title: 'Research PDF',
      category: 'guides',
      relativePath: 'vault://Notes/Research.pdf',
      sourceType: 'vault',
      sourcePath: 'Notes/Research.pdf',
      sizeBytes: 1024,
      lastModified: '2026-11-01T00:00:00.000Z',
    };

    const resPdf = resolveDocumentRouting({
      doc: vaultPdfDoc,
      format: 'pdf',
      archivedDocs: [],
    });

    expect(resPdf.success).toBe(true);
    if (resPdf.success) {
      expect(resPdf.route.routeType).toBe('vault');
      expect(resPdf.route.sourceType).toBe('vault');
      expect(resPdf.route.fileUrl).toBe(`/api/obsidian/vault/attachment?path=${encodeURIComponent('Notes/Research.pdf')}`);
    }

    const vaultEpubDoc: DocItem = {
      id: 'vault:Books/Handbook.epub',
      title: 'Handbook EPUB',
      category: 'books',
      relativePath: 'vault://Books/Handbook.epub',
      sourceType: 'vault',
      sourcePath: 'Books/Handbook.epub',
      sizeBytes: 2048,
      lastModified: '2026-11-01T00:00:00.000Z',
    };

    const resEpub = resolveDocumentRouting({
      doc: vaultEpubDoc,
      format: 'epub',
      archivedDocs: [],
    });

    expect(resEpub.success).toBe(true);
    if (resEpub.success) {
      expect(resEpub.route.routeType).toBe('vault');
      expect(resEpub.route.sourceType).toBe('vault');
      expect(resEpub.route.fileUrl).toBe(`/api/obsidian/vault/attachment?path=${encodeURIComponent('Books/Handbook.epub')}`);
    }
  });

  // 12. Unsupported format
  it('12. returns unsupported_format failure when given format is md or other', () => {
    const mdDoc: DocItem = {
      id: 'doc-md',
      title: 'README',
      category: 'guides',
      relativePath: 'docs/README.md',
      sizeBytes: 512,
      lastModified: '2026-11-01T00:00:00.000Z',
    };

    const resMd = resolveDocumentRouting({
      doc: mdDoc,
      format: 'md',
      archivedDocs: [],
    });

    expect(resMd.success).toBe(false);
    if (resMd.success === false) {
      expect(resMd.error.status).toBe('unsupported_format');
    }
  });
});
