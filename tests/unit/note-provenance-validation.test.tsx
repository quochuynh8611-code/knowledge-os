import { describe, it, expect } from 'vitest';
import {
  getPrimaryNoteProvenance,
  type NoteCitationProvenance,
  type Note,
} from '../../src/types';

describe('note-provenance-validation', () => {
  describe('getPrimaryNoteProvenance helper', () => {
    it('should return the first citation provenance when citationProvenances array has items', () => {
      const prov1: NoteCitationProvenance = {
        documentId: 'doc-epub-1',
        documentTitle: 'Kinh Đại Niệm Xứ',
        format: 'epub',
        locator: 'epubcfi(/6/4[chap01]!/4/2/10)',
        excerptText: 'Chánh niệm trên thân.',
      };

      const prov2: NoteCitationProvenance = {
        documentId: 'doc-pdf-2',
        documentTitle: 'Tâm Lý Học Phật Giáo',
        format: 'pdf',
        locator: 'page=15',
        excerptText: 'Nhận thức và cảm thọ.',
      };

      const note: Note = {
        id: 'note-1',
        topicId: 'topic-1',
        title: 'Ghi chú về Chánh Niệm',
        content: 'Nội dung đúc kết từ nhiều tài liệu.',
        type: 'study',
        isPrivate: false,
        tags: ['buddhism', 'mindfulness'],
        citationProvenances: [prov1, prov2],
        createdAt: '2026-09-28T00:00:00.000Z',
        updatedAt: '2026-09-28T00:00:00.000Z',
      };

      const primary = getPrimaryNoteProvenance(note);
      expect(primary).toBeDefined();
      expect(primary?.documentId).toBe('doc-epub-1');
      expect(primary?.format).toBe('epub');
      expect(primary?.locator).toBe('epubcfi(/6/4[chap01]!/4/2/10)');
    });

    it('should return undefined when note has empty citationProvenances array', () => {
      const note: Note = {
        id: 'note-2',
        topicId: 'topic-1',
        title: 'Ghi chú rỗng provenance',
        content: 'Nội dung...',
        type: 'insight',
        isPrivate: false,
        tags: [],
        citationProvenances: [],
        createdAt: '2026-09-28T00:00:00.000Z',
        updatedAt: '2026-09-28T00:00:00.000Z',
      };

      expect(getPrimaryNoteProvenance(note)).toBeUndefined();
    });

    it('should return undefined safely when note is a legacy record without citationProvenances field', () => {
      const legacyNote = {
        id: 'note-legacy-3',
        topicId: 'topic-1',
        title: 'Ghi chú cũ',
        content: 'Nội dung cũ không có metadata provenance.',
        type: 'study',
        isPrivate: false,
        tags: ['legacy'],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      } as Note;

      expect(getPrimaryNoteProvenance(legacyNote)).toBeUndefined();
    });
  });
});
