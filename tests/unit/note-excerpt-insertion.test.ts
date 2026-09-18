import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageDataRepository } from '../../src/services/dataRepository';
import { Note } from '../../src/types';

describe('Phase 18A Wave 3: Note Excerpt Insertion Service', () => {
  let repository: LocalStorageDataRepository;

  beforeEach(() => {
    localStorage.clear();
    repository = new LocalStorageDataRepository();
  });

  it('appends excerpt blockquote to the end of an existing note without overwriting', async () => {
    const initialNote: Note = {
      id: 'note-target-1',
      topicId: 'topic-1',
      title: 'Ghi chú Nghiên cứu Ban đầu',
      content: '# Ý tưởng sơ khởi\nNội dung ghi chú hiện có.',
      type: 'study',
      isPrivate: false,
      tags: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    await repository.saveNote(initialNote);

    const excerptBlockquote = '> Đoạn trích dẫn mới từ tài liệu.\n>\n> — *Tài liệu tham khảo*, tr. 10';

    const updatedNote = await repository.appendExcerptToNote('note-target-1', excerptBlockquote);

    expect(updatedNote.content).toContain('# Ý tưởng sơ khởi\nNội dung ghi chú hiện có.');
    expect(updatedNote.content).toContain(excerptBlockquote);
    expect(updatedNote.content.endsWith(excerptBlockquote)).toBe(true);
  });

  it('handles appending excerpt to an empty note cleanly', async () => {
    const emptyNote: Note = {
      id: 'note-empty-1',
      topicId: 'topic-1',
      title: 'Ghi chú Trống',
      content: '',
      type: 'study',
      isPrivate: false,
      tags: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    await repository.saveNote(emptyNote);

    const excerptBlockquote = '> Trích đoạn từ tài liệu trống.';
    const updatedNote = await repository.appendExcerptToNote('note-empty-1', excerptBlockquote);

    expect(updatedNote.content.trim()).toBe(excerptBlockquote);
  });

  it('throws an error if target note is not found', async () => {
    await expect(
      repository.appendExcerptToNote('non-existent-note', '> Nội dung trích dẫn.')
    ).rejects.toThrow(/Note with id "non-existent-note" not found/i);
  });
});
