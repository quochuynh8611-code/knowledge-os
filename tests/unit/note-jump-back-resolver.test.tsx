import { describe, it, expect } from 'vitest';
import {
  resolveNoteJumpBack,
  type NoteJumpBackResult,
} from '../../src/lib/noteJumpBackResolver';
import type { Resource } from '../../src/types';
import type { NoteCitationProvenance } from '../../src/types';

describe('note-jump-back-resolver', () => {
  const mockResources: Resource[] = [
    {
      id: 'res-pdf-1',
      topicId: 'topic-1',
      title: 'Tài Liệu Tâm Lý Học PDF',
      url: 'docs/books/psychology.pdf',
      type: 'pdf',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'res-epub-1',
      topicId: 'topic-1',
      title: 'Khoa Học Trí Nhớ EPUB',
      url: 'docs/books/memory.epub',
      type: 'book',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'res-md-1',
      topicId: 'topic-1',
      title: 'Ghi Chú Đọc Sách MD',
      url: 'docs/notes/reading.md',
      type: 'article',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ];

  it('should return status success when document exists and locator is valid', () => {
    const provenance: NoteCitationProvenance = {
      documentId: 'res-pdf-1',
      documentTitle: 'Tài Liệu Tâm Lý Học PDF',
      format: 'pdf',
      locator: 'page=15',
    };

    const result: NoteJumpBackResult = resolveNoteJumpBack(provenance, mockResources);
    expect(result.status).toBe('success');
    if (result.status === 'success') {
      expect(result.documentId).toBe('res-pdf-1');
      expect(result.format).toBe('pdf');
      expect(result.locator).toBe('page=15');
    }
  });

  it('should return status fallback_document_start when locator is missing or invalid', () => {
    // Missing locator
    const noLocatorProv: NoteCitationProvenance = {
      documentId: 'res-epub-1',
      documentTitle: 'Khoa Học Trí Nhớ EPUB',
      format: 'epub',
    };
    const resultMissing = resolveNoteJumpBack(noLocatorProv, mockResources);
    expect(resultMissing.status).toBe('fallback_document_start');
    if (resultMissing.status === 'fallback_document_start') {
      expect(resultMissing.documentId).toBe('res-epub-1');
      expect(resultMissing.format).toBe('epub');
      expect(resultMissing.originalLocator).toBeUndefined();
    }

    // Invalid locator
    const invalidLocatorProv: NoteCitationProvenance = {
      documentId: 'res-pdf-1',
      documentTitle: 'Tài Liệu Tâm Lý Học PDF',
      format: 'pdf',
      locator: 'invalid-page-format',
    };
    const resultInvalid = resolveNoteJumpBack(invalidLocatorProv, mockResources);
    expect(resultInvalid.status).toBe('fallback_document_start');
    if (resultInvalid.status === 'fallback_document_start') {
      expect(resultInvalid.originalLocator).toBe('invalid-page-format');
    }
  });

  it('should return status document_not_found when documentId cannot be resolved', () => {
    const deletedDocProv: NoteCitationProvenance = {
      documentId: 'res-deleted-999',
      documentTitle: 'Tài Liệu Đã Bị Xóa',
      format: 'md',
      locator: 'tong-quan',
    };

    const result = resolveNoteJumpBack(deletedDocProv, mockResources);
    expect(result.status).toBe('document_not_found');
    if (result.status === 'document_not_found') {
      expect(result.documentId).toBe('res-deleted-999');
      expect(result.message).toContain('Không tìm thấy tài liệu nguồn');
    }
  });

  it('should return status unsupported_format when format is not in epub, pdf, md', () => {
    const badFormatProv = {
      documentId: 'res-pdf-1',
      documentTitle: 'Tài Liệu Tâm Lý Học PDF',
      format: 'docx' as any,
      locator: 'page=1',
    };

    const result = resolveNoteJumpBack(badFormatProv, mockResources);
    expect(result.status).toBe('unsupported_format');
    if (result.status === 'unsupported_format') {
      expect(result.format).toBe('docx');
    }
  });
});
