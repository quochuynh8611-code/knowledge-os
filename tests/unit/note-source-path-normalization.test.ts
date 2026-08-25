import { describe, it, expect } from 'vitest';
import { normalizeFilePath, classifyPathRelativeToRoot, auditFileReferences } from '../../src/lib/fileLibraryAudit';
import { Note } from '../../src/types';

describe('Post-Phase 6d: Note Source Path Normalization & Audit Contracts', () => {
  it('normalizes mixed separators and whitespace in note sourcePath', () => {
    const raw = ' D:\\Knowledge-Library\\Notes\\\\Abhidharma\\insight.md  ';
    expect(normalizeFilePath(raw)).toBe('D:/Knowledge-Library/Notes/Abhidharma/insight.md');
  });

  it('audits notes with sourcePath and classifies inside/outside canonical root', () => {
    const root = '/Users/researcher/Knowledge-Library';
    const notes: Note[] = [
      {
        id: 'note-1',
        topicId: 'topic-1',
        title: 'Thực Tại Danh Sắc',
        content: 'Nội dung phân tích...',
        type: 'insight',
        isPrivate: false,
        tags: ['Abhidharma'],
        sourcePath: '/Users/researcher/Knowledge-Library/Notes/danh-sac.md',
        createdAt: '2026-08-01T00:00:00Z',
        updatedAt: '2026-08-01T00:00:00Z',
      },
      {
        id: 'note-2',
        topicId: 'topic-1',
        title: 'Ghi chú nháp ngoài desktop',
        content: 'Nội dung nháp...',
        type: 'question',
        isPrivate: false,
        tags: ['Draft'],
        sourcePath: '/Users/researcher/Desktop/draft.md',
        createdAt: '2026-08-01T00:00:00Z',
        updatedAt: '2026-08-01T00:00:00Z',
      },
      {
        id: 'note-legacy-3',
        topicId: 'topic-1',
        title: 'Ghi chú cũ không có sourcePath',
        content: 'Nội dung cũ...',
        type: 'study',
        isPrivate: false,
        tags: ['Legacy'],
        createdAt: '2026-08-01T00:00:00Z',
        updatedAt: '2026-08-01T00:00:00Z',
      },
    ];

    const audit = auditFileReferences([], notes, { libraryRootPath: root });

    expect(audit.summary.totalItems).toBe(3);
    expect(audit.summary.totalWithLocalPath).toBe(2);
    expect(audit.summary.outsideLibraryCount).toBe(1);
    expect(audit.summary.unspecifiedCount).toBe(1);
    expect(audit.summary.unverifiedCount).toBe(1); // note-1 is inside root, marked unverified in browser mode

    const entry1 = audit.entries.find((e) => e.id === 'note-1');
    expect(entry1?.sourceType).toBe('note');
    expect(entry1?.status).toBe('unverified');
    expect(entry1?.relativeToRoot).toBe('Notes/danh-sac.md');

    const entry2 = audit.entries.find((e) => e.id === 'note-2');
    expect(entry2?.sourceType).toBe('note');
    expect(entry2?.status).toBe('outside_library');

    const entry3 = audit.entries.find((e) => e.id === 'note-legacy-3');
    expect(entry3?.sourceType).toBe('note');
    expect(entry3?.status).toBe('unspecified');
  });
});
