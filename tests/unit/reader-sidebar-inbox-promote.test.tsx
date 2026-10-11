import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ReaderSidebar } from '../../src/components/reader/ReaderSidebar';
import { ResearchInboxItem } from '../../src/types';

describe('Phase R3.A Unit: ReaderSidebar Inbox Promote to Flashcard', () => {
  const sampleInboxItem: ResearchInboxItem = {
    id: 'inbox-test-1',
    excerptId: 'excerpt-test-1',
    excerpt: {
      id: 'excerpt-test-1',
      archivedDocumentId: 'doc-triet-hoc',
      selectedText: 'Mộc sinh Hỏa là nguyên lý tương sinh trong Ngũ Hành.',
      positionSelector: { headingId: 'ngu-hanh-tuong-sinh' },
      highlightColor: '#fef08a',
      citationSnapshot: { title: 'Triết Học Phương Đông' },
      status: 'inbox',
      createdAt: '2026-10-11T00:00:00.000Z',
      updatedAt: '2026-10-11T00:00:00.000Z',
    },
    isProcessed: false,
    priority: 1,
    createdAt: '2026-10-11T00:00:00.000Z',
    updatedAt: '2026-10-11T00:00:00.000Z',
  };

  it('1. renders Promote to Flashcard button for inbox items when onPromoteToFlashcard is provided', () => {
    const onPromoteToFlashcard = vi.fn();
    render(
      <ReaderSidebar
        isOpen={true}
        onClose={vi.fn()}
        activeTab="inbox"
        onTabChange={vi.fn()}
        tocItems={[]}
        onSelectTocItem={vi.fn()}
        documentId="doc-triet-hoc"
        documentTitle="Triết Học Phương Đông"
        inboxItems={[sampleInboxItem]}
        onPromoteToFlashcard={onPromoteToFlashcard}
      />
    );

    const inboxPanel = screen.getByTestId('sidebar-panel-inbox');
    expect(inboxPanel).toBeInTheDocument();

    const promoteBtn = within(inboxPanel).getByRole('button', {
      name: /Tạo thẻ nhớ từ trích đoạn|Promote to Flashcard/i,
    });
    expect(promoteBtn).toBeInTheDocument();
  });

  it('2. triggers onPromoteToFlashcard with the target item when promote button is clicked', () => {
    const onPromoteToFlashcard = vi.fn();
    render(
      <ReaderSidebar
        isOpen={true}
        onClose={vi.fn()}
        activeTab="inbox"
        onTabChange={vi.fn()}
        tocItems={[]}
        onSelectTocItem={vi.fn()}
        documentId="doc-triet-hoc"
        documentTitle="Triết Học Phương Đông"
        inboxItems={[sampleInboxItem]}
        onPromoteToFlashcard={onPromoteToFlashcard}
      />
    );

    const inboxPanel = screen.getByTestId('sidebar-panel-inbox');
    const promoteBtn = within(inboxPanel).getByRole('button', {
      name: /Tạo thẻ nhớ từ trích đoạn|Promote to Flashcard/i,
    });
    fireEvent.click(promoteBtn);

    expect(onPromoteToFlashcard).toHaveBeenCalledTimes(1);
    expect(onPromoteToFlashcard).toHaveBeenCalledWith(sampleInboxItem);
  });

  it('3. maintains backward compatibility and renders gracefully without onPromoteToFlashcard', () => {
    render(
      <ReaderSidebar
        isOpen={true}
        onClose={vi.fn()}
        activeTab="inbox"
        onTabChange={vi.fn()}
        tocItems={[]}
        onSelectTocItem={vi.fn()}
        documentId="doc-triet-hoc"
        documentTitle="Triết Học Phương Đông"
        inboxItems={[sampleInboxItem]}
      />
    );

    const inboxPanel = screen.getByTestId('sidebar-panel-inbox');
    expect(inboxPanel).toBeInTheDocument();
    expect(within(inboxPanel).getByText(/Mộc sinh Hỏa là nguyên lý tương sinh/i)).toBeInTheDocument();
  });
});
