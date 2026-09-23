import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { NoteReaderModal } from '../../src/components/modals/NoteReaderModal';
import { DataContext } from '../../src/context/DataContext';
import { Note } from '../../src/types';

describe('Phase R3A.1: NoteReaderModal Archive Deeplink Navigation', () => {
  const sampleNoteWithCitation: Note = {
    id: 'note-1',
    topicId: 'topic-1',
    title: 'Ghi Chú Bản Thể Luận',
    content: `
# Nghiên cứu Bản thể luận

Trích đoạn quan trọng từ sách:
> Tồn tại là nhận thức.
>
> — *Triết Học Khái Luận*, tr. 42 [Xem tài liệu](archive://doc-triet-hoc?loc=42)
    `.trim(),
    type: 'study',
    isPrivate: false,
    tags: ['triet-hoc'],
    createdAt: '2026-09-19T08:00:00.000Z',
    updatedAt: '2026-09-19T08:00:00.000Z',
  };

  const sampleNoteNoLocator: Note = {
    id: 'note-2',
    topicId: 'topic-1',
    title: 'Ghi Chú Không Vị Trí Cụ Thể',
    content: `
> Trích đoạn chung.
>
> — *Nhận Thức Luận* [Mở sách](archive://doc-nhan-thuc)
    `.trim(),
    type: 'insight',
    isPrivate: false,
    tags: ['triet-hoc'],
    createdAt: '2026-09-19T08:00:00.000Z',
    updatedAt: '2026-09-19T08:00:00.000Z',
  };

  const mockContextValue = {
    topics: [],
    openTopicDetail: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve([]),
          text: () => Promise.resolve('[]'),
          headers: new Headers({ 'content-type': 'application/json' }),
        })
      )
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. renders archive citation as interactive link inside NoteReaderModal', async () => {
    await act(async () => {
      render(
        <DataContext.Provider value={mockContextValue as any}>
          <NoteReaderModal
            isOpen={true}
            note={sampleNoteWithCitation}
            onClose={vi.fn()}
            onEdit={vi.fn()}
          />
        </DataContext.Provider>
      );
    });

    const citationLink = screen.getByRole('link', { name: /Xem tài liệu/i });
    expect(citationLink).toBeInTheDocument();
    expect(citationLink).toHaveAttribute('href', 'archive://doc-triet-hoc?loc=42');
  });

  it('2. clicking archive citation closes modal and triggers onOpenArchiveLink with documentId and locator', async () => {
    const handleClose = vi.fn();
    const handleOpenArchive = vi.fn();

    await act(async () => {
      render(
        <DataContext.Provider value={mockContextValue as any}>
          <NoteReaderModal
            isOpen={true}
            note={sampleNoteWithCitation}
            onClose={handleClose}
            onEdit={vi.fn()}
            onOpenArchiveLink={handleOpenArchive}
          />
        </DataContext.Provider>
      );
    });

    const citationLink = screen.getByRole('link', { name: /Xem tài liệu/i });
    fireEvent.click(citationLink);

    expect(handleClose).toHaveBeenCalled();
    expect(handleOpenArchive).toHaveBeenCalledWith('doc-triet-hoc', '42');
  });

  it('3. clicking archive citation without locator passes undefined locator', async () => {
    const handleClose = vi.fn();
    const handleOpenArchive = vi.fn();

    await act(async () => {
      render(
        <DataContext.Provider value={mockContextValue as any}>
          <NoteReaderModal
            isOpen={true}
            note={sampleNoteNoLocator}
            onClose={handleClose}
            onEdit={vi.fn()}
            onOpenArchiveLink={handleOpenArchive}
          />
        </DataContext.Provider>
      );
    });

    const citationLink = screen.getByRole('link', { name: /Mở sách/i });
    fireEvent.click(citationLink);

    expect(handleClose).toHaveBeenCalled();
    expect(handleOpenArchive).toHaveBeenCalledWith('doc-nhan-thuc', undefined);
  });

  describe('Phase 21B: Backlink Occurrence Navigation in NoteReaderModal', () => {
    const sampleNoteWithMultipleCitations: Note = {
      id: 'note-multi-cit',
      topicId: 'topic-1',
      title: 'Ghi Chú Đa Trích Dẫn',
      content: `
# Khái Luận Triết Học

Phần 1:
> Luận điểm đầu.
> — [Xem chương 1](archive://doc-triet-hoc?loc=chuong-1)

Phần 2:
> Luận điểm thứ hai.
> — [Xem chương 2](archive://doc-triet-hoc?loc=chuong-2)
      `.trim(),
      type: 'study',
      isPrivate: false,
      tags: ['triet-hoc'],
      createdAt: '2026-09-19T08:00:00.000Z',
      updatedAt: '2026-09-19T08:00:00.000Z',
    };

    it('UT-21B.1. scrolls to exact locator occurrence when targetCitation matches documentId and locator', async () => {
      const scrollIntoViewMock = vi.fn();
      window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

      await act(async () => {
        render(
          <DataContext.Provider value={mockContextValue as any}>
            <NoteReaderModal
              isOpen={true}
              note={sampleNoteWithMultipleCitations}
              targetCitation={{ documentId: 'doc-triet-hoc', locator: 'chuong-2' }}
              onClose={vi.fn()}
              onEdit={vi.fn()}
            />
          </DataContext.Provider>
        );
      });

      const targetElement = await screen.findByRole('link', { name: /Xem chương 2/i });
      expect(targetElement).toBeInTheDocument();
      expect(scrollIntoViewMock).toHaveBeenCalled();
    });

    it('UT-21B.2. falls back to first document occurrence when locator does not match', async () => {
      const scrollIntoViewMock = vi.fn();
      window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

      await act(async () => {
        render(
          <DataContext.Provider value={mockContextValue as any}>
            <NoteReaderModal
              isOpen={true}
              note={sampleNoteWithMultipleCitations}
              targetCitation={{ documentId: 'doc-triet-hoc', locator: 'chuong-99' }}
              onClose={vi.fn()}
              onEdit={vi.fn()}
            />
          </DataContext.Provider>
        );
      });

      const firstElement = await screen.findByRole('link', { name: /Xem chương 1/i });
      expect(firstElement).toBeInTheDocument();
      expect(scrollIntoViewMock).toHaveBeenCalled();
    });

    it('UT-21B.3. safely degrades without calling scrollIntoView when target document has no occurrences', async () => {
      const scrollIntoViewMock = vi.fn();
      window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

      await act(async () => {
        render(
          <DataContext.Provider value={mockContextValue as any}>
            <NoteReaderModal
              isOpen={true}
              note={sampleNoteWithMultipleCitations}
              targetCitation={{ documentId: 'doc-unrelated' }}
              onClose={vi.fn()}
              onEdit={vi.fn()}
            />
          </DataContext.Provider>
        );
      });

      expect(screen.getByText('Ghi Chú Đa Trích Dẫn')).toBeInTheDocument();
      expect(scrollIntoViewMock).not.toHaveBeenCalled();
    });
  });

  describe('Phase 22: Lifecycle Hardening & Edge Cases in NoteReaderModal', () => {
    const sampleNoteWithComplexLocator: Note = {
      id: 'note-complex-loc',
      topicId: 'topic-1',
      title: 'Ghi Chú Ký Tự Đặc Biệt',
      content: `
# Ghi chú Đặc biệt
> Trích đoạn có ký tự đặc biệt trong locator.
> — [Xem mục đặc biệt](archive://doc-triet-hoc?loc=sec-2.1%23sub%26test%3D1)
      `.trim(),
      type: 'insight',
      isPrivate: false,
      tags: ['triet-hoc'],
      createdAt: '2026-09-19T08:00:00.000Z',
      updatedAt: '2026-09-19T08:00:00.000Z',
    };

    it('UT-22.1. Timer teardown: unmounting modal before highlight timer expires cleanly cleans up timers without DOM access errors', () => {
      vi.useFakeTimers();
      try {
        const scrollIntoViewMock = vi.fn();
        window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

        const { unmount } = render(
          <DataContext.Provider value={mockContextValue as any}>
            <NoteReaderModal
              isOpen={true}
              note={sampleNoteWithComplexLocator}
              targetCitation={{ documentId: 'doc-triet-hoc', locator: 'sec-2.1#sub&test=1' }}
              onClose={vi.fn()}
              onEdit={vi.fn()}
            />
          </DataContext.Provider>
        );

        // Unmount before 2.5s timer finishes
        unmount();

        // Fast-forward timers past 2.5s and verify no exceptions
        act(() => {
          vi.advanceTimersByTime(3000);
        });
      } finally {
        vi.useRealTimers();
      }
    });

    it('UT-22.2. Special-character locator: executes exact locator query safely without SyntaxError', async () => {
      const scrollIntoViewMock = vi.fn();
      window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

      await act(async () => {
        render(
          <DataContext.Provider value={mockContextValue as any}>
            <NoteReaderModal
              isOpen={true}
              note={sampleNoteWithComplexLocator}
              targetCitation={{ documentId: 'doc-triet-hoc', locator: 'sec-2.1#sub&test=1' }}
              onClose={vi.fn()}
              onEdit={vi.fn()}
            />
          </DataContext.Provider>
        );
      });

      const targetElement = await screen.findByRole('link', { name: /Xem mục đặc biệt/i });
      expect(targetElement).toBeInTheDocument();
      expect(scrollIntoViewMock).toHaveBeenCalled();
    });

    it('UT-22.3. Missing occurrence fallback: verifies 3 tiers independently (exact match, first match, safe no-op)', async () => {
      const scrollIntoViewMock = vi.fn();
      window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

      // Tier 1: Exact match
      let rerenderFn: any;
      await act(async () => {
        const res = render(
          <DataContext.Provider value={mockContextValue as any}>
            <NoteReaderModal
              isOpen={true}
              note={sampleNoteWithComplexLocator}
              targetCitation={{ documentId: 'doc-triet-hoc', locator: 'sec-2.1#sub&test=1' }}
              onClose={vi.fn()}
              onEdit={vi.fn()}
            />
          </DataContext.Provider>
        );
        rerenderFn = res.rerender;
      });
      expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);

      // Tier 2: Mismatched locator -> fallback to first doc occurrence
      await act(async () => {
        rerenderFn(
          <DataContext.Provider value={mockContextValue as any}>
            <NoteReaderModal
              isOpen={true}
              note={sampleNoteWithComplexLocator}
              targetCitation={{ documentId: 'doc-triet-hoc', locator: 'non-existent-locator' }}
              onClose={vi.fn()}
              onEdit={vi.fn()}
            />
          </DataContext.Provider>
        );
      });
      expect(scrollIntoViewMock).toHaveBeenCalledTimes(2);

      // Tier 3: Unrelated doc -> safe no-op
      await act(async () => {
        rerenderFn(
          <DataContext.Provider value={mockContextValue as any}>
            <NoteReaderModal
              isOpen={true}
              note={sampleNoteWithComplexLocator}
              targetCitation={{ documentId: 'doc-completely-unrelated' }}
              onClose={vi.fn()}
              onEdit={vi.fn()}
            />
          </DataContext.Provider>
        );
      });
      expect(scrollIntoViewMock).toHaveBeenCalledTimes(2); // no extra call
    });

    it('UT-22.4. Defensive scroll behavior: gracefully degrades when scrollIntoView is undefined', async () => {
      // Temporarily remove scrollIntoView from prototype
      const originalScroll = window.HTMLElement.prototype.scrollIntoView;
      (window.HTMLElement.prototype as any).scrollIntoView = undefined;

      await act(async () => {
        render(
          <DataContext.Provider value={mockContextValue as any}>
            <NoteReaderModal
              isOpen={true}
              note={sampleNoteWithComplexLocator}
              targetCitation={{ documentId: 'doc-triet-hoc', locator: 'sec-2.1#sub&test=1' }}
              onClose={vi.fn()}
              onEdit={vi.fn()}
            />
          </DataContext.Provider>
        );
      });

      expect(screen.getByText('Ghi Chú Ký Tự Đặc Biệt')).toBeInTheDocument();

      // Restore prototype
      window.HTMLElement.prototype.scrollIntoView = originalScroll;
    });
  });
});
