import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataProvider } from '../../src/context/DataContext';
import { NoteReaderModal } from '../../src/components/modals/NoteReaderModal';
import { NotesManager } from '../../src/components/notes/NotesManager';
import { AdvancedSearch } from '../../src/components/search/AdvancedSearch';
import { Note, Topic } from '../../src/types';
import {
  toReadablePlainTextPreview,
  MarkdownReadabilityRenderer,
} from '../../src/lib/markdownReadability';

describe('Phase 7C: Content Readability Presentation Upgrade', () => {
  describe('1. Utility toReadablePlainTextPreview()', () => {
    it('1.1. Loại bỏ các ký tự điều khiển Markdown (#, **, _, >, ---, ```, [[ ]])', () => {
      const rawMarkdown = `
# Tiêu Đề 1
## Tiêu Đề 2
### Tiêu Đề 3
Đây là văn bản **in đậm** và *in nghiêng* cùng với \`mã nội dòng\`.
> Đây là trích dẫn quan trọng từ tài liệu cổ.
---
- Mục danh sách 1
- Mục danh sách 2
Tham chiếu đến [[Kỳ Môn Độn Giáp]] trong chương này.
`;

      const plainText = toReadablePlainTextPreview(rawMarkdown);

      // Should not contain raw markdown markers
      expect(plainText).not.toContain('#');
      expect(plainText).not.toContain('**');
      expect(plainText).not.toContain('---');
      expect(plainText).not.toContain('[[');
      expect(plainText).not.toContain(']]');
      expect(plainText).not.toContain('`');
      expect(plainText).not.toMatch(/^>/m);

      // Should contain clean text content
      expect(plainText).toContain('Tiêu Đề 1');
      expect(plainText).toContain('in đậm và in nghiêng');
      expect(plainText).toContain('trích dẫn quan trọng');
      expect(plainText).toContain('Kỳ Môn Độn Giáp');
    });

    it('1.2. Chuẩn hóa khoảng trắng và dòng mới thành chuỗi liên tục cho line-clamp', () => {
      const multiline = 'Dòng 1\n\n\nDòng 2\n   \n\nDòng 3';
      const result = toReadablePlainTextPreview(multiline);
      expect(result).toBe('Dòng 1 Dòng 2 Dòng 3');
    });

    it('1.3. Hỗ trợ cắt ngắn maxLength nếu được chỉ định', () => {
      const longText = 'Nội dung rất dài phục vụ mục đích trích lược xem trước của thẻ ghi chú';
      const preview = toReadablePlainTextPreview(longText, 25);
      expect(preview.length).toBeLessThanOrEqual(28); // 25 + '...'
      expect(preview.endsWith('...')).toBe(true);
    });
  });

  describe('2. MarkdownReadabilityRenderer in Focus Read Mode', () => {
    const mockTopics: Topic[] = [
      {
        id: 'topic-abhidharma',
        title: 'Abhidharma - Vi Diệu Pháp',
        categoryId: 'cat-phat-hoc',
        categoryName: 'Phật Học',
        description: 'Tâm & Tâm Sở',
        tags: ['abhidharma'],
        slug: 'abhidharma-vi-dieu-phap',
        links: [],
        studyProgress: { topicId: 'topic-abhidharma', timeSpent: 0, progress: 0, status: 'not_started', repetitions: 0, interval: 1, easeFactor: 2.5, totalNotes: 0 },
        createdAt: '2026-08-01T00:00:00Z',
        updatedAt: '2026-08-01T00:00:00Z',
        type: 'phat-hoc',
        content: 'Nội dung Abhidharma',
      },
    ];

    it('2.1. Render Heading thật, không hiển thị ký tự "#"', () => {
      const content = '# Chương Một: Căn Bản';
      const { container } = render(
        <MarkdownReadabilityRenderer content={content} topics={mockTopics} />
      );

      expect(container.querySelector('h1, h2, h3, [data-heading="1"]')).toBeInTheDocument();
      expect(screen.getByText('Chương Một: Căn Bản')).toBeInTheDocument();
      expect(screen.queryByText('# Chương Một: Căn Bản')).toBeNull();
    });

    it('2.2. Render Bold & Italic bằng CSS font weight, không hiển thị "**"', () => {
      const content = 'Khảo sát về **Tâm Bất Thiện** và *Tâm Thiện*.';
      const { container } = render(
        <MarkdownReadabilityRenderer content={content} topics={mockTopics} />
      );

      expect(screen.getByText('Tâm Bất Thiện')).toBeInTheDocument();
      expect(screen.getByText('Tâm Thiện')).toBeInTheDocument();
      expect(container.textContent).not.toContain('**');
      expect(container.textContent).not.toContain('*Tâm');
    });

    it('2.3. Render Blockquote thành container có viền, không hiển thị ">"', () => {
      const content = '> Lời trích yếu từ Luận Thư.';
      const { container } = render(
        <MarkdownReadabilityRenderer content={content} topics={mockTopics} />
      );

      expect(screen.getByText('Lời trích yếu từ Luận Thư.')).toBeInTheDocument();
      expect(container.querySelector('blockquote, [data-blockquote="true"]')).toBeInTheDocument();
      expect(container.textContent).not.toContain('>');
    });

    it('2.4. Render Horizontal Rule thành thẻ phân cách, không hiển thị "---"', () => {
      const content = 'Đoạn trên\n---\nĐoạn dưới';
      const { container } = render(
        <MarkdownReadabilityRenderer content={content} topics={mockTopics} />
      );

      expect(container.querySelector('hr, [data-divider="true"]')).toBeInTheDocument();
      expect(container.textContent).not.toContain('---');
    });

    it('2.5. Render Wiki Link [[...]] thành interactive button, không lộ ngoặc vuông "[["', () => {
      const onNavigate = vi.fn();
      const content = 'Tham khảo [[Abhidharma - Vi Diệu Pháp]] để hiểu sâu.';
      render(
        <MarkdownReadabilityRenderer
          content={content}
          topics={mockTopics}
          onOpenTopic={onNavigate}
        />
      );

      const wikiBtn = screen.getByRole('button', { name: /Abhidharma - Vi Diệu Pháp/i });
      expect(wikiBtn).toBeInTheDocument();
      expect(screen.queryByText(/\[\[Abhidharma/i)).toBeNull();

      fireEvent.click(wikiBtn);
      expect(onNavigate).toHaveBeenCalledWith('topic-abhidharma');
    });
  });

  describe('3. Integration with NoteReaderModal (Focus Reader)', () => {
    it('3.1. Không hiển thị markdown control characters thô khi người dùng đọc ghi chú', () => {
      const mockNote: Note = {
        id: 'note-focus-1',
        topicId: 'topic-abhidharma',
        topicTitle: 'Abhidharma',
        title: 'Ghi chú khảo cứu Vi Diệu Pháp',
        type: 'insight',
        isPrivate: false,
        content: '# Luận Thuyết\nNội dung có **chữ đậm** và > trích dẫn.\n---\n[[Abhidharma - Vi Diệu Pháp]]',
        tags: ['abhidharma'],
        createdAt: '2026-08-01T00:00:00Z',
        updatedAt: '2026-08-01T00:00:00Z',
      };

      render(
        <DataProvider>
          <NoteReaderModal
            note={mockNote}
            isOpen={true}
            onClose={vi.fn()}
            onEdit={vi.fn()}
          />
        </DataProvider>
      );

      // Verify no raw control characters in reader body
      expect(screen.getByText('Luận Thuyết')).toBeInTheDocument();
      expect(screen.getByText('chữ đậm')).toBeInTheDocument();
      expect(screen.queryByText(/# Luận Thuyết/)).toBeNull();
      expect(screen.queryByText(/\*\*chữ đậm\*\*/)).toBeNull();
      expect(screen.queryByText(/---/)).toBeNull();
    });
  });

  describe('4. Integration with NotesManager (Compact Card Preview)', () => {
    it('4.1. Card preview hiển thị văn bản sạch, không chứa markdown markup', () => {
      const { container } = render(
        <DataProvider>
          <NotesManager />
        </DataProvider>
      );

      // Verify cards in NotesManager render without raw [[ ]] or # in card previews
      const cardPreviews = container.querySelectorAll('p.line-clamp-3');
      expect(cardPreviews.length).toBeGreaterThan(0);
      cardPreviews.forEach((card) => {
        expect(card.textContent).not.toMatch(/\[\[[^\]]+\]\]/);
        expect(card.textContent).not.toContain('**');
        expect(card.textContent).not.toContain('---');
        expect(card.textContent).not.toMatch(/^#/);
      });
    });
  });

  describe('5. Data Integrity & Edit Mode Invariance', () => {
    it('5.1. Dữ liệu gốc trong note.content không bị mutate khi qua tầng presentation', () => {
      const originalContent = '# Tiêu đề gốc **in đậm** và [[Chủ Đề]]';
      const note: Note = {
        id: 'note-immutable-1',
        topicId: 'topic-1',
        title: 'Bất biến dữ liệu',
        type: 'study',
        isPrivate: false,
        content: originalContent,
        tags: ['test'],
        createdAt: '2026-08-01T00:00:00Z',
        updatedAt: '2026-08-01T00:00:00Z',
      };

      // Running presentation utilities
      toReadablePlainTextPreview(note.content);

      // Original note.content MUST remain strictly untouched
      expect(note.content).toBe(originalContent);
    });
  });
});
