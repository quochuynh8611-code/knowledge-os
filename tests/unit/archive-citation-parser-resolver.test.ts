import { describe, it, expect } from 'vitest';
import {
  parseArchiveCitation,
  resolveCitationTargetDocument,
} from '../../src/lib/readerDocumentResolver';
import { Resource } from '../../src/types';

describe('Phase 19 Suite A: Archive Citation Parser & 5-Tier Resolver Engine', () => {
  const sampleResources: Resource[] = [
    {
      id: 'doc-triet-hoc',
      title: 'Triết Học Khái Luận',
      type: 'md',
      filePath: 'docs/books/triet-hoc.md',
      topicId: 'topic-1',
      tags: ['triet-hoc'],
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    },
    {
      id: 'doc-tam-ly',
      title: 'Tâm Lý Học Nhận Thức',
      type: 'epub',
      filePath: '05_EPUB_Export/tam-ly.epub',
      topicId: 'topic-2',
      tags: ['tam-ly'],
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    },
    {
      id: 'doc-y-hoc',
      title: 'Đông Y Toàn Thư',
      type: 'pdf',
      filePath: '02_PDF_Source/y-hoc.pdf',
      topicId: 'topic-3',
      tags: ['y-hoc'],
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    },
  ];

  describe('1. parseArchiveCitation Parser Unit Tests', () => {
    it('A1.1. parses valid archive URI with locator', () => {
      const result = parseArchiveCitation('archive://doc-triet-hoc?loc=chuong-2');
      expect(result).toEqual({
        documentId: 'doc-triet-hoc',
        locator: 'chuong-2',
      });
    });

    it('A1.2. parses valid archive URI without locator', () => {
      const result = parseArchiveCitation('archive://doc-triet-hoc');
      expect(result).toEqual({
        documentId: 'doc-triet-hoc',
        locator: undefined,
      });
    });

    it('A1.3. safely decodes complex URL-encoded locators (EPUB CFI, unicode)', () => {
      const encodedCfi = 'epubcfi(%2F6%2F4%5Bchap1%5D!%2F4%2F2%2F10)';
      const result = parseArchiveCitation(`archive://doc-tam-ly?loc=${encodedCfi}`);
      expect(result).toEqual({
        documentId: 'doc-tam-ly',
        locator: 'epubcfi(/6/4[chap1]!/4/2/10)',
      });
    });

    it('A1.4. returns null for malformed or empty archive URI', () => {
      expect(parseArchiveCitation('')).toBeNull();
      expect(parseArchiveCitation('archive://')).toBeNull();
      expect(parseArchiveCitation('archive://?loc=123')).toBeNull();
      expect(parseArchiveCitation('not-archive://doc-1')).toBeNull();
    });

    it('A1.5. rejects dangerous pseudo-schemes in locator or docId', () => {
      expect(parseArchiveCitation('javascript:alert(1)')).toBeNull();
      expect(parseArchiveCitation('data:text/html,<script>alert(1)</script>')).toBeNull();
      expect(parseArchiveCitation('file:///etc/passwd')).toBeNull();
      expect(parseArchiveCitation('vbscript:msgbox(1)')).toBeNull();
    });
  });

  describe('2. resolveCitationTargetDocument 5-Tier Resolution Tests', () => {
    const activeDocContext = {
      documentId: 'doc-triet-hoc',
      title: 'Triết Học Khái Luận',
      format: 'md',
      fileUrl: '/api/docs/raw?path=books%2Ftriet-hoc.md',
    };

    it('A2.1. Tier 1: Same-Document Fast Path matches active documentId or canonical path', () => {
      const res = resolveCitationTargetDocument(
        'doc-triet-hoc',
        'chuong-2',
        activeDocContext,
        sampleResources
      );
      expect(res).not.toBeNull();
      expect(res?.isSameDocument).toBe(true);
      expect(res?.locator).toBe('chuong-2');
      expect(res?.document?.documentId).toBe('doc-triet-hoc');
    });

    it('A2.2. Tier 2: Direct documentId match for cross-document resolution', () => {
      const res = resolveCitationTargetDocument(
        'doc-tam-ly',
        'epubcfi(/6/2)',
        activeDocContext,
        sampleResources
      );
      expect(res).not.toBeNull();
      expect(res?.isSameDocument).toBe(false);
      expect(res?.document?.documentId).toBe('doc-tam-ly');
      expect(res?.document?.title).toBe('Tâm Lý Học Nhận Thức');
      expect(res?.document?.format).toBe('epub');
      expect(res?.locator).toBe('epubcfi(/6/2)');
    });

    it('A2.3. Tier 3: Resource alias / filePath match', () => {
      const res = resolveCitationTargetDocument(
        '02_PDF_Source/y-hoc.pdf',
        '42',
        activeDocContext,
        sampleResources
      );
      expect(res).not.toBeNull();
      expect(res?.isSameDocument).toBe(false);
      expect(res?.document?.documentId).toBe('doc-y-hoc');
      expect(res?.document?.format).toBe('pdf');
      expect(res?.locator).toBe('42');
    });

    it('A2.4. Tier 4: Canonical path normalization (vault: prefix & relative paths)', () => {
      const res = resolveCitationTargetDocument(
        'vault:05_EPUB_Export/tam-ly.epub',
        'epubcfi(/6/4)',
        activeDocContext,
        sampleResources
      );
      expect(res).not.toBeNull();
      expect(res?.isSameDocument).toBe(false);
      expect(res?.document?.documentId).toBe('doc-tam-ly');
      expect(res?.document?.format).toBe('epub');
    });

    it('A2.5. Tier 5: Title / baseName heuristic match for non-generic names', () => {
      const res = resolveCitationTargetDocument(
        'Đông Y Toàn Thư',
        '10',
        activeDocContext,
        sampleResources
      );
      expect(res).not.toBeNull();
      expect(res?.isSameDocument).toBe(false);
      expect(res?.document?.documentId).toBe('doc-y-hoc');
      expect(res?.document?.format).toBe('pdf');
    });

    it('A2.6. Tier 6: Unresolved target returns null (safe fallback)', () => {
      const res = resolveCitationTargetDocument(
        'doc-khong-ton-tai-xyz',
        '99',
        activeDocContext,
        sampleResources
      );
      expect(res).toBeNull();
    });
  });
});
