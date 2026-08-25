import { describe, it, expect } from 'vitest';
import { Resource, Note } from '../../src/types';
import {
  normalizeFilePath,
  classifyPathRelativeToRoot,
  auditFileReferences,
  generateFileLibraryManifest,
  FileLibraryAuditSummary,
  FileReferenceEntry,
} from '../../src/lib/fileLibraryAudit';

describe('Post-Phase 6: File Library & Backup Architecture (Pure Library Audit)', () => {
  const sampleResources: Resource[] = [
    {
      id: 'res-1',
      topicId: 'topic-1',
      title: 'Câu Xá Luận Giảng Giải',
      type: 'pdf',
      filePath: '/Users/test/Library/abhidharma/kosa_vol1.pdf',
      createdAt: '2026-08-01T00:00:00Z',
    },
    {
      id: 'res-2',
      topicId: 'topic-1',
      title: 'Tài liệu bị thất lạc',
      type: 'pdf',
      filePath: '/Users/test/Library/missing_file.pdf',
      createdAt: '2026-08-01T00:00:00Z',
    },
    {
      id: 'res-3',
      topicId: 'topic-2',
      title: 'Sách trên ổ cứng ngoài',
      type: 'pdf',
      filePath: '/Volumes/ExternalUSB/books/external_book.pdf',
      createdAt: '2026-08-01T00:00:00Z',
    },
    {
      id: 'res-4',
      topicId: 'topic-2',
      title: 'Bài viết học thuật online',
      type: 'article',
      url: 'https://buddhism-studies.org/article-1',
      createdAt: '2026-08-01T00:00:00Z',
    },
  ];

  const sampleNotes: Note[] = [
    {
      id: 'note-1',
      topicId: 'topic-1',
      title: 'Ghi chép Tánh Không',
      content: '# Nội dung ghi chú',
      type: 'study',
      isPrivate: false,
      tags: ['triet-hoc'],
      createdAt: '2026-08-01T00:00:00Z',
      updatedAt: '2026-08-01T00:00:00Z',
    },
  ];

  describe('1. normalizeFilePath & classifyPathRelativeToRoot', () => {
    it('normalizes file paths with backslashes and redundant spaces', () => {
      expect(normalizeFilePath('  C:\\Users\\User\\Documents\\Book.pdf  ')).toBe(
        'C:/Users/User/Documents/Book.pdf'
      );
      expect(normalizeFilePath('/Users/test//folder///file.pdf')).toBe(
        '/Users/test/folder/file.pdf'
      );
    });

    it('classifies whether a file path is inside or outside canonical library root', () => {
      const root = '/Users/test/KnowledgeLibrary';

      expect(
        classifyPathRelativeToRoot('/Users/test/KnowledgeLibrary/PDFs/book.pdf', root)
      ).toBe('inside');

      expect(
        classifyPathRelativeToRoot('/Users/test/OtherFolder/book.pdf', root)
      ).toBe('outside');

      expect(
        classifyPathRelativeToRoot('/Users/test/KnowledgeLibrary/book.pdf', undefined)
      ).toBe('no_root');
    });
  });

  describe('2. auditFileReferences', () => {
    it('accurately audits resources, detects exists, missing, outside_library, and unspecified', () => {
      const libraryRoot = '/Users/test/Library';

      // Mock file system checker
      const existingPaths = new Set([
        '/Users/test/Library/abhidharma/kosa_vol1.pdf',
        '/Volumes/ExternalUSB/books/external_book.pdf',
      ]);

      const mockExists = (p: string) => existingPaths.has(p);
      const mockSize = (p: string) => (p.includes('kosa_vol1') ? 1048576 : 204800);

      const result = auditFileReferences(sampleResources, sampleNotes, {
        libraryRootPath: libraryRoot,
        fileExistsChecker: mockExists,
        fileSizeGetter: mockSize,
      });

      expect(result.summary.totalItems).toBe(5); // 4 resources + 1 note
      expect(result.summary.totalWithLocalPath).toBe(3); // 3 resources with filePath
      expect(result.summary.existingCount).toBe(1); // res-1 (inside root and exists)
      expect(result.summary.missingCount).toBe(1); // res-2 (missing)
      expect(result.summary.outsideLibraryCount).toBe(1); // res-3 (outside root)
      expect(result.summary.unspecifiedCount).toBe(2); // res-4 (web only) + note-1

      // Verify individual entry status
      const res1Entry = result.entries.find((e) => e.id === 'res-1');
      expect(res1Entry?.status).toBe('exists');
      expect(res1Entry?.sizeBytes).toBe(1048576);

      const res2Entry = result.entries.find((e) => e.id === 'res-2');
      expect(res2Entry?.status).toBe('missing');

      const res3Entry = result.entries.find((e) => e.id === 'res-3');
      expect(res3Entry?.status).toBe('outside_library');

      const res4Entry = result.entries.find((e) => e.id === 'res-4');
      expect(res4Entry?.status).toBe('unspecified');
    });
  });

  describe('3. generateFileLibraryManifest', () => {
    it('generates a complete structured JSON manifest without binary payload', () => {
      const libraryRoot = '/Users/test/Library';
      const mockExists = (p: string) => p.includes('kosa_vol1');

      const auditResult = auditFileReferences(sampleResources, sampleNotes, {
        libraryRootPath: libraryRoot,
        fileExistsChecker: mockExists,
      });

      const manifest = generateFileLibraryManifest(auditResult, {
        libraryRootPath: libraryRoot,
      });

      expect(manifest.manifestVersion).toBe('1.0');
      expect(manifest.libraryRootPath).toBe(libraryRoot);
      expect(manifest.summary.totalWithLocalPath).toBe(3);
      expect(manifest.entries.length).toBe(5);

      // Verify that manifest contains only path metadata and no binary fields
      const manifestString = JSON.stringify(manifest);
      expect(manifestString).not.toContain('base64');
      expect(manifestString).not.toContain('Buffer');
      expect(manifestString).toContain('kosa_vol1.pdf');
    });
  });

  describe('4. Edge Cases & Boundary Safety', () => {
    it('prevents false-positive descendant matches due to prefix collisions', () => {
      const root = '/Library/Books';
      // /Library/Books-Archive/file.pdf has prefix '/Library/Books' but is outside
      expect(classifyPathRelativeToRoot('/Library/Books-Archive/file.pdf', root)).toBe('outside');
      expect(classifyPathRelativeToRoot('/Library/Books/Volume1/file.pdf', root)).toBe('inside');
    });

    it('handles Windows-style drive letters and slashes safely', () => {
      const winRoot = 'D:/Knowledge/PDFs';
      expect(classifyPathRelativeToRoot('D:\\Knowledge\\PDFs\\book.pdf', winRoot)).toBe('inside');
      expect(classifyPathRelativeToRoot('D:\\Other\\book.pdf', winRoot)).toBe('outside');
    });

    it('does not mutate input resources or notes', () => {
      const resourceCopy = JSON.parse(JSON.stringify(sampleResources));
      const noteCopy = JSON.parse(JSON.stringify(sampleNotes));

      auditFileReferences(sampleResources, sampleNotes);

      expect(sampleResources).toEqual(resourceCopy);
      expect(sampleNotes).toEqual(noteCopy);
    });

    it('marks paths as unverified when no filesystem checker is provided (browser environment)', () => {
      const result = auditFileReferences(sampleResources, sampleNotes);

      expect(result.summary.unverifiedCount).toBe(3);
      expect(result.summary.existingCount).toBe(0);
      expect(result.summary.missingCount).toBe(0);
    });
  });
});
