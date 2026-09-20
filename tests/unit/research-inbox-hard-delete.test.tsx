import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ResearchInboxDrawer } from "../../src/components/research/ResearchInboxDrawer";
import { ReaderSidebar } from "../../src/components/reader/ReaderSidebar";
import { ResearchInboxItem, ResearchExcerpt } from "../../src/types";

describe("Research Inbox Hard Delete Contract (Red Stage)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockExcerpt: ResearchExcerpt = {
    id: "excerpt-101",
    archivedDocumentId: "doc-test-1",
    selectedText: "Đoạn văn bản trích dẫn mẫu cần xóa.",
    positionSelector: {},
    highlightColor: "#fef08a",
    citationSnapshot: {
      title: "Khảo Cứu Phật Học",
      author: "Tác Giả A",
    },
    status: "inbox",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockInboxItem: ResearchInboxItem = {
    id: "inbox-item-101",
    excerptId: "excerpt-101",
    excerpt: mockExcerpt,
    isProcessed: false,
    priority: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it("1. ResearchInboxDrawer renders a distinct Delete button and calls onDelete on click", async () => {
    const onDelete = vi.fn();
    const onDismiss = vi.fn();
    const onView = vi.fn();
    const onSendToNote = vi.fn();

    render(
      <ResearchInboxDrawer
        isOpen={true}
        items={[mockInboxItem]}
        onView={onView}
        onDismiss={onDismiss}
        onSendToNote={onSendToNote}
        onDelete={onDelete}
        onClose={vi.fn()}
      />
    );

    // Verify excerpt content is rendered
    expect(screen.getByText(/Đoạn văn bản trích dẫn mẫu cần xóa/i)).toBeInTheDocument();

    // Contract: Must have a Delete button with aria-label="Xóa trích đoạn"
    const deleteBtn = screen.getByRole("button", { name: /Xóa trích đoạn/i });
    expect(deleteBtn).toBeInTheDocument();

    // Click Delete button
    fireEvent.click(deleteBtn);

    // Contract: onDelete must be called with item.id (hard delete semantics)
    expect(onDelete).toHaveBeenCalledWith("inbox-item-101");
    // Contract: onDismiss must NOT be called for delete
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("2. ReaderSidebar renders Delete button in Inbox tab and invokes onDeleteInboxItem", async () => {
    const onDeleteInboxItem = vi.fn();

    render(
      <ReaderSidebar
        isOpen={true}
        onClose={vi.fn()}
        activeTab="inbox"
        onTabChange={vi.fn()}
        tocItems={[]}
        onSelectTocItem={vi.fn()}
        documentId="doc-test-1"
        documentTitle="Khảo Cứu Phật Học"
        inboxItems={[mockInboxItem]}
        onDeleteInboxItem={onDeleteInboxItem}
      />
    );

    // In inbox tab, excerpt text should be visible
    expect(screen.getByText(/Đoạn văn bản trích dẫn mẫu cần xóa/i)).toBeInTheDocument();

    // Contract: Delete button inside sidebar item
    const deleteBtn = screen.getByRole("button", { name: /Xóa trích đoạn/i });
    expect(deleteBtn).toBeInTheDocument();

    fireEvent.click(deleteBtn);
    expect(onDeleteInboxItem).toHaveBeenCalledWith("inbox-item-101");
  });

  it("3. ReaderSidebar renders Delete button in Highlights tab and invokes onDeleteExcerpt", async () => {
    const onDeleteExcerpt = vi.fn();

    render(
      <ReaderSidebar
        isOpen={true}
        onClose={vi.fn()}
        activeTab="highlights"
        onTabChange={vi.fn()}
        tocItems={[]}
        onSelectTocItem={vi.fn()}
        documentId="doc-test-1"
        documentTitle="Khảo Cứu Phật Học"
        excerpts={[mockExcerpt]}
        onDeleteExcerpt={onDeleteExcerpt}
      />
    );

    expect(screen.getByText(/Đoạn văn bản trích dẫn mẫu cần xóa/i)).toBeInTheDocument();

    // Contract: Delete button inside highlight card
    const deleteBtn = screen.getByRole("button", { name: /Xóa điểm trích/i });
    expect(deleteBtn).toBeInTheDocument();

    fireEvent.click(deleteBtn);
    expect(onDeleteExcerpt).toHaveBeenCalledWith("excerpt-101");
  });
});
