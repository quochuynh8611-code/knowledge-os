import { describe, it, expect } from 'vitest';
import { extractCitationBacklinks, CitationBacklinkEntry } from '../../src/lib/readerBacklinksSelector';
import { Note } from '../../src/types';

describe('Phase 21A: Citation Backlinks Selector (Pure Unit Tests)', () => {
  const baseNote: Note = {
    id: 'note-1',
    topicId: 'topic-1',
    title: 'Ghi chú Khái Luận',
    content: '',
    type: 'study',
    isPrivate: false,
    tags: ['triet-hoc'],
    createdAt: '2026-09-19T08:00:00.000Z',
    updatedAt: '2026-09-19T08:00:00.000Z',
  };

  it('UT1. extracts valid single archive citation matching active documentId', () => {
    const notes: Note[] = [
      {
        ...baseNote,
        id: 'note-1',
        title: 'Bản Thể Luận Note',
        content: 'Nội dung trích dẫn: > Tồn tại là nhận thức.\n>\n> — [Xem tài liệu](archive://doc-triet-hoc?loc=chuong-1)',
      },
    ];

    const result = extractCitationBacklinks(notes, 'doc-triet-hoc');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual<CitationBacklinkEntry>({
      noteId: 'note-1',
      noteTitle: 'Bản Thể Luận Note',
      snippet: expect.stringContaining('Tồn tại là nhận thức'),
      referenceCount: 1,
      locators: ['chuong-1'],
    });
  });

  it('UT2. groups multiple citations from the same note into one backlink entry with referenceCount', () => {
    const notes: Note[] = [
      {
        ...baseNote,
        id: 'note-multi',
        title: 'Nhiều Trích Dẫn Cùng Sách',
        content: `
# Tổng hợp
1. Đoạn đầu: [Nguồn 1](archive://doc-triet-hoc?loc=trang-10)
2. Đoạn hai: [Nguồn 2](archive://doc-triet-hoc?loc=chuong-2)
3. Đoạn ba: [Nguồn 3](archive://doc-triet-hoc)
        `.trim(),
      },
    ];

    const result = extractCitationBacklinks(notes, 'doc-triet-hoc');
    expect(result).toHaveLength(1);
    expect(result[0].noteId).toBe('note-multi');
    expect(result[0].referenceCount).toBe(3);
    expect(result[0].locators).toEqual(['trang-10', 'chuong-2']);
  });

  it('UT3. excludes notes citing a different documentId (exact match)', () => {
    const notes: Note[] = [
      {
        ...baseNote,
        id: 'note-other-doc',
        title: 'Ghi chú Tâm Lý Học',
        content: 'Trích dẫn sách khác: [Tâm Lý](archive://doc-tam-ly?loc=phan-xa)',
      },
      {
        ...baseNote,
        id: 'note-matching-doc',
        title: 'Ghi chú Triết Học',
        content: 'Trích dẫn triết học: [Triết Học](archive://doc-triet-hoc?loc=ban-the)',
      },
    ];

    const result = extractCitationBacklinks(notes, 'doc-triet-hoc');
    expect(result).toHaveLength(1);
    expect(result[0].noteId).toBe('note-matching-doc');
  });

  it('UT4. normalizes documentId safely with trimming and URI decoding', () => {
    const notes: Note[] = [
      {
        ...baseNote,
        id: 'note-encoded',
        title: 'Encoded Doc ID',
        content: 'Trích dẫn: [Xem](archive://doc%2Dtriet%2Dhoc?loc=sec-1)',
      },
      {
        ...baseNote,
        id: 'note-padded',
        title: 'Padded Doc ID',
        content: 'Trích dẫn: [Xem](archive://doc-triet-hoc%20?loc=sec-2)',
      },
    ];

    const result = extractCitationBacklinks(notes, 'doc-triet-hoc');
    expect(result.map((r) => r.noteId)).toContain('note-encoded');
  });

  it('UT5. ignores malformed archive URIs gracefully without crashing', () => {
    const notes: Note[] = [
      {
        ...baseNote,
        id: 'note-broken-1',
        content: 'Link hỏng: [Hỏng 1](archive:/broken-link)',
      },
      {
        ...baseNote,
        id: 'note-broken-2',
        content: 'Link rỗng: [Hỏng 2](archive://)',
      },
      {
        ...baseNote,
        id: 'note-broken-3',
        content: 'Link chỉ có query: [Hỏng 3](archive://?loc=123)',
      },
    ];

    const result = extractCitationBacklinks(notes, 'doc-triet-hoc');
    expect(result).toHaveLength(0);
  });

  it('UT6. ignores unsafe URI schemes and dangerous injection payloads', () => {
    const notes: Note[] = [
      {
        ...baseNote,
        id: 'note-xss-1',
        content: 'XSS attempt: [Click](javascript:alert(1))',
      },
      {
        ...baseNote,
        id: 'note-data-uri',
        content: 'Data URI: [Payload](data:text/html,<script>alert(1)</script>)',
      },
      {
        ...baseNote,
        id: 'note-file-uri',
        content: 'File URI: [Passwd](file:///etc/passwd)',
      },
    ];

    const result = extractCitationBacklinks(notes, 'doc-triet-hoc');
    expect(result).toHaveLength(0);
  });

  it('UT7. rejects title or path heuristic matches when no explicit archive citation exists', () => {
    const notes: Note[] = [
      {
        ...baseNote,
        id: 'note-title-only',
        title: 'Title Match Only',
        content: 'Sách này nói về *Triết Học Khái Luận* rất hay nhưng không có citation marker.',
        sourcePath: 'doc-triet-hoc.md',
      },
    ];

    const result = extractCitationBacklinks(notes, 'doc-triet-hoc');
    expect(result).toHaveLength(0);
  });

  it('UT8. handles empty, null or undefined note content safely', () => {
    const notes: Note[] = [
      {
        ...baseNote,
        id: 'note-empty-content',
        content: '',
      },
      {
        ...baseNote,
        id: 'note-undefined-content',
        content: undefined as any,
      },
    ];

    expect(() => extractCitationBacklinks(notes, 'doc-triet-hoc')).not.toThrow();
    expect(extractCitationBacklinks(notes, 'doc-triet-hoc')).toHaveLength(0);
  });
});
