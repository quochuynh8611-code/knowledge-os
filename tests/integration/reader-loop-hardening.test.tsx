import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import { UnifiedResearchReader } from '../../src/components/reader/UnifiedResearchReader';
import { DataContext } from '../../src/context/DataContext';
import { Note, Resource } from '../../src/types';
import { globalReadingPositionStore } from '../../src/lib/readingPositionUnified';

describe('Phase 22 Integration: Bidirectional Research Loop & Reader Hardening', () => {
  const sampleMarkdownContent = `# Triết Học Khái Luận

## Chương 1: Bản Thể Luận
Bản thể luận nghiên cứu về tồn tại và các phạm trù của thực tại.

## Chương 2: Nhận Thức Luận
Nhận thức luận nghiên cứu về nguồn gốc và giới hạn của tri thức.
`;

  const sampleResources: Resource[] = [
    {
      id: 'doc-triet-hoc',
      title: 'Triết Học Khái Luận',
      type: 'md',
      filePath: 'docs/books/triet-hoc.md',
      topicId: 'topic-1',
      createdAt: '2026-09-01T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    localStorage.clear();
    globalReadingPositionStore.clearPosition('doc-triet-hoc', 'md');
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ content: sampleMarkdownContent }),
          text: () => Promise.resolve(sampleMarkdownContent),
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
          headers: new Headers({ 'content-type': 'application/json' }),
        })
      )
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalReadingPositionStore.clearPosition('doc-triet-hoc', 'md');
  });

  it('IT-22.1. State transition: dynamic citation addition updates backlinks explorer from empty state to verified citation card', async () => {
    // Initial State: Note does not cite doc-triet-hoc (cites doc-khac)
    const initialNotes: Note[] = [
      {
        id: 'note-1',
        topicId: 'topic-1',
        title: 'Ghi Chú Đang Soạn',
        content: '# Nháp nghiên cứu\n> Đoạn trích từ nguồn khác [Xem](archive://doc-khac?loc=1)',
        type: 'study',
        isPrivate: false,
        tags: ['triet-hoc'],
        createdAt: '2026-09-19T08:00:00.000Z',
        updatedAt: '2026-09-19T08:00:00.000Z',
      },
    ];

    // State Provider Wrapper to simulate reactive DataContext update across reader lifecycle
    function TestEnvironment({ notes }: { notes: Note[] }) {
      const contextValue = {
        notes,
        resources: sampleResources,
        researchInboxItems: [],
        addExcerptToInbox: vi.fn(),
        updateNote: vi.fn(),
        deleteInboxItem: vi.fn(),
      };

      return (
        <DataContext.Provider value={contextValue as any}>
          <UnifiedResearchReader
            documentId="doc-triet-hoc"
            title="Triết Học Khái Luận"
            format="md"
            content={sampleMarkdownContent}
            onClose={vi.fn()}
          />
        </DataContext.Provider>
      );
    }

    // Step 1: Render with initial notes (0 backlinks for doc-triet-hoc)
    const { rerender } = render(<TestEnvironment notes={initialNotes} />);

    // Open sidebar -> Notes Tab
    fireEvent.click(screen.getByTestId('reader-toggle-sidebar-btn'));
    fireEvent.click(screen.getByTestId('sidebar-tab-notes'));

    const backlinksSection = await screen.findByTestId('sidebar-backlinks-section');
    expect(within(backlinksSection).getByText(/Chưa có ghi chú nào trích dẫn tài liệu này/i)).toBeInTheDocument();
    expect(within(backlinksSection).queryByText('Ghi Chú Đang Soạn')).not.toBeInTheDocument();

    // Step 2: Simulate citation addition into note-1 (e.g. via excerpt save / sync update)
    const updatedNotes: Note[] = [
      {
        ...initialNotes[0],
        title: 'Ghi Chú Đã Lưu Trích Dẫn',
        content: `
# Nháp nghiên cứu
> Nhận thức luận là cơ sở của tri thức.
> — *Triết Học Khái Luận* [Xem chương 2](archive://doc-triet-hoc?loc=chuong-2)
        `.trim(),
        updatedAt: '2026-09-19T08:05:00.000Z',
      },
    ];

    // Step 3: Rerender with updated context state
    rerender(<TestEnvironment notes={updatedNotes} />);

    // Step 4: Verify state transition — empty state is gone, backlink card appears
    expect(within(backlinksSection).queryByText(/Chưa có ghi chú nào trích dẫn tài liệu này/i)).not.toBeInTheDocument();
    expect(within(backlinksSection).getByText('Ghi Chú Đã Lưu Trích Dẫn')).toBeInTheDocument();
    expect(within(backlinksSection).getByText(/1 trích dẫn/i)).toBeInTheDocument();

    // Step 5: Open the newly linked note modal to verify the citation content contract
    fireEvent.click(within(backlinksSection).getByText('Ghi Chú Đã Lưu Trích Dẫn'));
    const noteModal = await screen.findByRole('dialog', { name: /Chi tiết ghi chú/i });
    expect(noteModal).toBeInTheDocument();
    const citationLink = within(noteModal).getByRole('link', { name: /Xem chương 2/i });
    expect(citationLink).toHaveAttribute('href', 'archive://doc-triet-hoc?loc=chuong-2');
  });

  it('IT-22.2. Full bidirectional round-trip with observable transient focus and reading state continuity', async () => {
    vi.useFakeTimers();
    try {
      const scrollIntoViewMock = vi.fn();
      window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;
      const handlePositionChange = vi.fn();

      const sampleNotes: Note[] = [
        {
          id: 'note-ban-the-luan',
          topicId: 'topic-1',
          title: 'Ghi Chú Bản Thể Luận',
          content: `
# Ghi chú Nghiên cứu
> Tồn tại là nhận thức.
> — *Triết Học Khái Luận* [Xem chương 2](archive://doc-triet-hoc?loc=chuong-2)
          `.trim(),
          type: 'study',
          isPrivate: false,
          tags: ['triet-hoc'],
          createdAt: '2026-09-19T08:00:00.000Z',
          updatedAt: '2026-09-19T08:00:00.000Z',
        },
      ];

      const mockContextValue = {
        notes: sampleNotes,
        resources: sampleResources,
        researchInboxItems: [],
        addExcerptToInbox: vi.fn(),
        updateNote: vi.fn(),
        deleteInboxItem: vi.fn(),
      };

      render(
        <DataContext.Provider value={mockContextValue as any}>
          <UnifiedResearchReader
            documentId="doc-triet-hoc"
            title="Triết Học Khái Luận"
            format="md"
            content={sampleMarkdownContent}
            initialPosition="chuong-1"
            onPositionChange={handlePositionChange}
            onClose={vi.fn()}
          />
        </DataContext.Provider>
      );

      // Open Sidebar -> Notes Tab
      fireEvent.click(screen.getByTestId('reader-toggle-sidebar-btn'));
      fireEvent.click(screen.getByTestId('sidebar-tab-notes'));

      const backlinksSection = screen.getByTestId('sidebar-backlinks-section');
      const backlinkCard = within(backlinksSection).getByText('Ghi Chú Bản Thể Luận');

      // Click backlink card -> Open NoteReaderModal
      fireEvent.click(backlinkCard);

      const noteModal = screen.getByRole('dialog', { name: /Chi tiết ghi chú/i });
      expect(noteModal).toBeInTheDocument();
      expect(within(noteModal).getByText('Ghi Chú Bản Thể Luận')).toBeInTheDocument();

      // Verify occurrence focus is invoked on target element
      expect(scrollIntoViewMock).toHaveBeenCalled();

      // Verify observable transient visual focus classes are applied immediately
      const citationLink = within(noteModal).getByRole('link', { name: /Xem chương 2/i });
      expect(citationLink).toHaveClass('ring-2');
      expect(citationLink).toHaveClass('ring-amber-500');

      // Advance timer by 2600ms (past 2500ms highlight duration)
      act(() => {
        vi.advanceTimersByTime(2600);
      });

      // Verify transient focus class is removed after timeout
      expect(citationLink).not.toHaveClass('ring-2');
      expect(citationLink).not.toHaveClass('ring-amber-500');

      // Click citation link inside NoteReaderModal -> jumps reader
      fireEvent.click(citationLink);

      expect(handlePositionChange).toHaveBeenCalledWith('chuong-2');

      // Close modal
      const closeButtons = within(noteModal).getAllByRole('button', { name: /Đóng/i });
      fireEvent.click(closeButtons[0]);

      // Reader is still mounted, visible, and at chuong-2
      expect(screen.queryByRole('dialog', { name: /Chi tiết ghi chú/i })).not.toBeInTheDocument();
      expect(screen.getByRole('dialog', { name: /Triết Học Khái Luận/i })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('IT-22.3. Timer cleanup: rapid modal close and advance timers cleanly cancels unmounted timers without throwing', async () => {
    vi.useFakeTimers();
    try {
      const scrollIntoViewMock = vi.fn();
      window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

      const multiNotes: Note[] = [
        {
          id: 'note-1',
          topicId: 'topic-1',
          title: 'Ghi Chú Thứ Nhất',
          content: '> Đoạn 1 [Xem chương 1](archive://doc-triet-hoc?loc=chuong-1)',
          type: 'study',
          isPrivate: false,
          tags: ['triet-hoc'],
          createdAt: '2026-09-19T08:00:00.000Z',
          updatedAt: '2026-09-19T08:00:00.000Z',
        },
        {
          id: 'note-2',
          topicId: 'topic-1',
          title: 'Ghi Chú Thứ Hai',
          content: '> Đoạn 2 [Xem chương 2](archive://doc-triet-hoc?loc=chuong-2)',
          type: 'insight',
          isPrivate: false,
          tags: ['triet-hoc'],
          createdAt: '2026-09-19T09:00:00.000Z',
          updatedAt: '2026-09-19T09:00:00.000Z',
        },
      ];

      const mockContextValue = {
        notes: multiNotes,
        resources: sampleResources,
        researchInboxItems: [],
        addExcerptToInbox: vi.fn(),
        updateNote: vi.fn(),
        deleteInboxItem: vi.fn(),
      };

      await act(async () => {
        render(
          <DataContext.Provider value={mockContextValue as any}>
            <UnifiedResearchReader
              documentId="doc-triet-hoc"
              title="Triết Học Khái Luận"
              format="md"
              content={sampleMarkdownContent}
              onClose={vi.fn()}
            />
          </DataContext.Provider>
        );
      });

      // Open sidebar notes tab
      fireEvent.click(screen.getByTestId('reader-toggle-sidebar-btn'));
      fireEvent.click(screen.getByTestId('sidebar-tab-notes'));

      const backlinksSection = screen.getByTestId('sidebar-backlinks-section');

      // 1. Open first note backlink
      await act(async () => {
        fireEvent.click(within(backlinksSection).getByText('Ghi Chú Thứ Nhất'));
      });
      let noteModal = screen.getByRole('dialog', { name: /Chi tiết ghi chú/i });
      expect(noteModal).toBeInTheDocument();

      // 2. Rapid close before 2.5s timer expires
      const closeButtons = within(noteModal).getAllByRole('button', { name: /Đóng/i });
      await act(async () => {
        fireEvent.click(closeButtons[0]);
      });
      expect(screen.queryByRole('dialog', { name: /Chi tiết ghi chú/i })).not.toBeInTheDocument();

      // 3. Advance timers by 3000ms after first modal is unmounted — verify no unhandled DOM exceptions
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      // 4. Immediately open second note backlink
      await act(async () => {
        fireEvent.click(within(backlinksSection).getByText('Ghi Chú Thứ Hai'));
      });
      noteModal = screen.getByRole('dialog', { name: /Chi tiết ghi chú/i });
      expect(noteModal).toBeInTheDocument();
      expect(within(noteModal).getByText('Ghi Chú Thứ Hai')).toBeInTheDocument();

      // Verify modal 2 has its own isolated highlight
      const citationLink2 = within(noteModal).getByRole('link', { name: /Xem chương 2/i });
      expect(citationLink2).toHaveClass('ring-2');
      expect(citationLink2).toHaveClass('ring-amber-500');

      // 5. Advance timers by 3000ms on second modal
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      // Modal 2 highlight is cleanly removed and modal remains mounted
      expect(citationLink2).not.toHaveClass('ring-2');
      expect(screen.getByRole('dialog', { name: /Chi tiết ghi chú/i })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('IT-22.4. Reading position store maintains isolated state across multiple modal open and close cycles', () => {
    globalReadingPositionStore.clearPosition('doc-triet-hoc', 'md');
    globalReadingPositionStore.setPosition('doc-triet-hoc', 'md', 'chuong-2');

    const sampleNotes: Note[] = [
      {
        id: 'note-1',
        topicId: 'topic-1',
        title: 'Ghi Chú Chu Kỳ',
        content: '> Đoạn trích [Xem](archive://doc-triet-hoc?loc=chuong-2)',
        type: 'study',
        isPrivate: false,
        tags: ['triet-hoc'],
        createdAt: '2026-09-19T08:00:00.000Z',
        updatedAt: '2026-09-19T08:00:00.000Z',
      },
    ];

    const mockContextValue = {
      notes: sampleNotes,
      resources: sampleResources,
      researchInboxItems: [],
      addExcerptToInbox: vi.fn(),
      updateNote: vi.fn(),
      deleteInboxItem: vi.fn(),
    };

    render(
      <DataContext.Provider value={mockContextValue as any}>
        <UnifiedResearchReader
          documentId="doc-triet-hoc"
          title="Triết Học Khái Luận"
          format="md"
          content={sampleMarkdownContent}
          initialPosition="chuong-2"
          onClose={vi.fn()}
        />
      </DataContext.Provider>
    );

    // Open sidebar
    fireEvent.click(screen.getByTestId('reader-toggle-sidebar-btn'));
    fireEvent.click(screen.getByTestId('sidebar-tab-notes'));
    const backlinksSection = screen.getByTestId('sidebar-backlinks-section');

    // Cycle 1: Open modal and close
    fireEvent.click(within(backlinksSection).getByText('Ghi Chú Chu Kỳ'));
    let noteModal = screen.getByRole('dialog', { name: /Chi tiết ghi chú/i });
    expect(noteModal).toBeInTheDocument();
    fireEvent.click(within(noteModal).getAllByRole('button', { name: /Đóng/i })[0]);
    expect(screen.queryByRole('dialog', { name: /Chi tiết ghi chú/i })).not.toBeInTheDocument();
    expect(globalReadingPositionStore.getPosition('doc-triet-hoc', 'md')).toBe('chuong-2');

    // Cycle 2: Re-open modal and close again
    fireEvent.click(within(backlinksSection).getByText('Ghi Chú Chu Kỳ'));
    noteModal = screen.getByRole('dialog', { name: /Chi tiết ghi chú/i });
    expect(noteModal).toBeInTheDocument();
    fireEvent.click(within(noteModal).getAllByRole('button', { name: /Đóng/i })[0]);
    expect(screen.queryByRole('dialog', { name: /Chi tiết ghi chú/i })).not.toBeInTheDocument();

    // Position store remains firmly at chuong-2 without race condition or state loss
    expect(globalReadingPositionStore.getPosition('doc-triet-hoc', 'md')).toBe('chuong-2');
  });
});
