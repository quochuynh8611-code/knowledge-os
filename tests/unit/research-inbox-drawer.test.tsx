import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResearchInboxDrawer } from '../../src/components/research/ResearchInboxDrawer';
import { ResearchInboxItem } from '../../src/types';

describe('Phase 18A Wave 4: ResearchInboxDrawer Component', () => {
  const sampleItems: ResearchInboxItem[] = [
    {
      id: 'inbox-1',
      excerptId: 'excerpt-1',
      excerpt: {
        id: 'excerpt-1',
        archivedDocumentId: 'doc-1',
        selectedText: 'Đoạn trích dẫn quan trọng cần xem lại.',
        positionSelector: { pageNumber: 12 },
        highlightColor: 'amber',
        citationSnapshot: {
          title: 'Nghiên cứu A',
          author: 'TS. Nguyễn',
        },
        status: 'inbox',
        createdAt: '2026-01-01T10:00:00.000Z',
        updatedAt: '2026-01-01T10:00:00.000Z',
      },
      isProcessed: false,
      priority: 1,
      createdAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-01-01T10:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    render(
      <ResearchInboxDrawer
        isOpen={false}
        items={sampleItems}
        onView={vi.fn()}
        onDismiss={vi.fn()}
        onSendToNote={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.queryByRole('dialog', { name: /Research Inbox/i })).not.toBeInTheDocument();
  });

  it('renders list of inbox items and badge/counter in header', () => {
    render(
      <ResearchInboxDrawer
        isOpen={true}
        items={sampleItems}
        onView={vi.fn()}
        onDismiss={vi.fn()}
        onSendToNote={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByRole('dialog', { name: /Research Inbox/i })).toBeInTheDocument();
    expect(screen.getByText('Đoạn trích dẫn quan trọng cần xem lại.')).toBeInTheDocument();
    expect(screen.getByText('Nghiên cứu A')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // Unprocessed count badge
  });

  it('renders empty state when there are no unprocessed items', () => {
    render(
      <ResearchInboxDrawer
        isOpen={true}
        items={[]}
        onView={vi.fn()}
        onDismiss={vi.fn()}
        onSendToNote={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText(/Research Inbox trống/i)).toBeInTheDocument();
    expect(screen.getByText(/Chưa có trích đoạn nào được thêm vào Inbox/i)).toBeInTheDocument();
  });

  it('triggers onView action with excerpt details when View button is clicked', () => {
    const onView = vi.fn();
    render(
      <ResearchInboxDrawer
        isOpen={true}
        items={sampleItems}
        onView={onView}
        onDismiss={vi.fn()}
        onSendToNote={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const viewBtn = screen.getByRole('button', { name: /Xem lại/i });
    fireEvent.click(viewBtn);

    expect(onView).toHaveBeenCalledWith(sampleItems[0]);
  });

  it('triggers onDismiss action when Dismiss button is clicked', () => {
    const onDismiss = vi.fn();
    render(
      <ResearchInboxDrawer
        isOpen={true}
        items={sampleItems}
        onView={vi.fn()}
        onDismiss={onDismiss}
        onSendToNote={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const dismissBtn = screen.getByRole('button', { name: /Bỏ qua/i });
    fireEvent.click(dismissBtn);

    expect(onDismiss).toHaveBeenCalledWith(sampleItems[0].id);
  });

  it('triggers onSendToNote action when Send to Note button is clicked', () => {
    const onSendToNote = vi.fn();
    render(
      <ResearchInboxDrawer
        isOpen={true}
        items={sampleItems}
        onView={vi.fn()}
        onDismiss={vi.fn()}
        onSendToNote={onSendToNote}
        onClose={vi.fn()}
      />
    );

    const sendBtn = screen.getByRole('button', { name: /Lưu vào ghi chú/i });
    fireEvent.click(sendBtn);

    expect(onSendToNote).toHaveBeenCalledWith(sampleItems[0]);
  });

  it('closes drawer on Escape key or close button click', () => {
    const onClose = vi.fn();
    render(
      <ResearchInboxDrawer
        isOpen={true}
        items={sampleItems}
        onView={vi.fn()}
        onDismiss={vi.fn()}
        onSendToNote={vi.fn()}
        onClose={onClose}
      />
    );

    const closeBtn = screen.getByRole('button', { name: /Đóng Inbox/i });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
