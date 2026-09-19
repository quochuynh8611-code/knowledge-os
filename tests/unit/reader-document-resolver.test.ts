import { describe, it, expect } from 'vitest';
import {
  resolveArchiveLinkToReaderDoc,
  ActiveReaderDocument,
} from '../../src/lib/readerDocumentResolver';
import { Resource } from '../../src/types';

describe('Phase R3C: Shared Reader Deep-Link Resolver Consolidation', () => {
  const sampleResources: Resource[] = [
    {
      id: 'res-triet-hoc-1',
      topicId: 'topic-1',
      title: 'Triết Học Khái Luận',
      type: 'md',
      filePath: '01_Notes/triet-hoc.md',
      createdAt: '2026-09-19T08:00:00.000Z',
    },
    {
      id: 'res-tam-ly-epub-2',
      topicId: 'topic-1',
      title: 'Giáo Trình Tâm Lý Học',
      type: 'book',
      filePath: '02_Sources/tam-ly-hoc.epub',
      createdAt: '2026-09-19T08:10:00.000Z',
    },
    {
      id: 'res-sinh-hoc-pdf-3',
      topicId: 'topic-2',
      title: 'Sinh Học Phân Tử',
      type: 'pdf',
      url: 'https://archive.org/biology.pdf',
      createdAt: '2026-09-19T08:20:00.000Z',
    },
  ];

  describe('1. Resource Matching', () => {
    it('1.1. resolves document matching resource.id', () => {
      const result: ActiveReaderDocument = resolveArchiveLinkToReaderDoc(
        'res-triet-hoc-1',
        'chuong-1-ban-the-luan',
        sampleResources
      );

      expect(result).toEqual({
        documentId: 'res-triet-hoc-1',
        title: 'Triết Học Khái Luận',
        format: 'md',
        fileUrl: '/api/obsidian/vault/attachment?path=01_Notes%2Ftriet-hoc.md',
        initialPosition: 'chuong-1-ban-the-luan',
      });
    });

    it('1.2. resolves document matching resource.filePath', () => {
      const result = resolveArchiveLinkToReaderDoc(
        '02_Sources/tam-ly-hoc.epub',
        'cfi-loc-123',
        sampleResources
      );

      expect(result).toEqual({
        documentId: '02_Sources/tam-ly-hoc.epub',
        title: 'Giáo Trình Tâm Lý Học',
        format: 'epub',
        fileUrl: '/api/obsidian/vault/attachment?path=02_Sources%2Ftam-ly-hoc.epub',
        initialPosition: 'cfi-loc-123',
      });
    });

    it('1.3. resolves document matching resource.url', () => {
      const result = resolveArchiveLinkToReaderDoc(
        'https://archive.org/biology.pdf',
        '42',
        sampleResources
      );

      expect(result).toEqual({
        documentId: 'https://archive.org/biology.pdf',
        title: 'Sinh Học Phân Tử',
        format: 'pdf',
        fileUrl: 'https://archive.org/biology.pdf',
        initialPosition: '42',
      });
    });
  });

  describe('2. Format Detection', () => {
    it('2.1. detects PDF format when resource type is pdf or file ends with .pdf', () => {
      const resultFromType = resolveArchiveLinkToReaderDoc(
        'res-sinh-hoc-pdf-3',
        undefined,
        sampleResources
      );
      expect(resultFromType.format).toBe('pdf');

      const resultFromExt = resolveArchiveLinkToReaderDoc(
        'papers/quantum-physics.pdf',
        undefined,
        []
      );
      expect(resultFromExt.format).toBe('pdf');
    });

    it('2.2. detects EPUB format when filePath or documentId ends with .epub', () => {
      const result = resolveArchiveLinkToReaderDoc(
        'books/ancient-history.epub',
        'loc-1',
        []
      );
      expect(result.format).toBe('epub');
    });

    it('2.3. defaults format to md for markdown or unknown file extensions', () => {
      const resultMd = resolveArchiveLinkToReaderDoc('notes/philosophy.md', undefined, []);
      expect(resultMd.format).toBe('md');

      const resultUnknown = resolveArchiveLinkToReaderDoc('general-doc-id', undefined, []);
      expect(resultUnknown.format).toBe('md');
    });
  });

  describe('3. Title & Fallback Handling', () => {
    it('3.1. extracts title from document basename when resource is not found', () => {
      const result = resolveArchiveLinkToReaderDoc(
        '01_Notes/subfolder/cognitive-science.md',
        'sec-1',
        []
      );

      expect(result.title).toBe('cognitive-science');
      expect(result.fileUrl).toBeUndefined();
      expect(result.initialPosition).toBe('sec-1');
    });

    it('3.2. falls back to default title when documentId cannot produce a clean basename', () => {
      const result = resolveArchiveLinkToReaderDoc('', undefined, []);
      expect(result.title).toBe('Tài liệu nghiên cứu');
      expect(result.initialPosition).toBeUndefined();
    });

    it('3.3. handles empty or nullish resources array gracefully', () => {
      const result = resolveArchiveLinkToReaderDoc('doc-custom-id', 'loc-1');
      expect(result.documentId).toBe('doc-custom-id');
      expect(result.title).toBe('doc-custom-id');
      expect(result.format).toBe('md');
      expect(result.fileUrl).toBeUndefined();
      expect(result.initialPosition).toBe('loc-1');
    });
  });
});
