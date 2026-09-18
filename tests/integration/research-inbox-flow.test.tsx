import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TopNavigationBar } from '../../src/components/workbench/TopNavigationBar';
import { ResearchInboxDrawer } from '../../src/components/research/ResearchInboxDrawer';
import { ResearchInboxItem } from '../../src/types';

describe('Phase 18A Wave 4: Research Inbox Integration Flow', () => {
  const initialItems: ResearchInboxItem[] = [
    {
      id: 'inbox-item-1',
      excerptId: 'excerpt-1',
      excerpt: {
        id: 'excerpt-1',
        archivedDocumentId: 'doc-1',
        selectedText: 'Đoạn trích nghiên cứu từ tài liệu A.',
        positionSelector: { pageNumber: 8 },
        highlightColor: 'amber',
        citationSnapshot: {
          title: 'Tài liệu A',
          author: 'Tác giả A',
        },
        status: 'inbox',
        createdAt: '2026-01-01T10:00:00.000Z',
        updatedAt: '2026-01-01T10:00:00.000Z',
      },
      isProcessed: false,
      priority: 0,
      createdAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-01-01T10:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders top navigation bar with inbox trigger and active badge counter', () => {
    const onToggleInbox = vi.fn();
    render(
      <TopNavigationBar
        unprocessedInboxCount={3}
        onToggleInbox={onToggleInbox}
      />
    );

    const inboxTrigger = screen.getByRole('button', { name: /Mở Research Inbox/i });
    expect(inboxTrigger).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();

    fireEvent.click(inboxTrigger);
    expect(onToggleInbox).toHaveBeenCalled();
  });

  it('renders drawer and executes dismiss flow correctly', async () => {
    let items = [...initialItems];
    const onDismiss = vi.fn((id: string) => {
      items = items.map((item) =>
        item.id === id ? { ...item, isProcessed: true } : item
      );
    });

    const { rerender } = render(
      <ResearchInboxDrawer
        isOpen={true}
        items={items}
        onView={vi.fn()}
        onDismiss={onDismiss}
        onSendToNote={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Đoạn trích nghiên cứu từ tài liệu A.')).toBeInTheDocument();

    const dismissBtn = screen.getByRole('button', { name: /Bỏ qua/i });
    fireEvent.click(dismissBtn);

    expect(onDismiss).toHaveBeenCalledWith('inbox-item-1');

    // Rerender with updated items
    rerender(
      <ResearchInboxDrawer
        isOpen={true}
        items={items}
        onView={vi.fn()}
        onDismiss={onDismiss}
        onSendToNote={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText(/Research Inbox trống/i)).toBeInTheDocument();
  });

  it('handles send to note flow from inbox drawer', () => {
    const onSendToNote = vi.fn();
    render(
      <ResearchInboxDrawer
        isOpen={true}
        items={initialItems}
        onView={vi.fn()}
        onDismiss={vi.fn()}
        onSendToNote={onSendToNote}
        onClose={vi.fn()}
      />
    );

    const sendBtn = screen.getByRole('button', { name: /Lưu vào ghi chú/i });
    fireEvent.click(sendBtn);

    expect(onSendToNote).toHaveBeenCalledWith(initialItems[0]);
  });
});
