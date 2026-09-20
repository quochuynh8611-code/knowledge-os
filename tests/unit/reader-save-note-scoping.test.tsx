import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { UnifiedResearchReader } from "../../src/components/reader/UnifiedResearchReader";
import { ResearchInboxDrawer } from "../../src/components/research/ResearchInboxDrawer";
import { Navbar } from "../../src/components/layout/Navbar";
import { DataContext, DataProvider, dataRepository } from "../../src/context/DataContext";
import { formatExcerptBlockquote } from "../../src/lib/excerptCitationService";
import { Note, ResearchExcerpt, ResearchInboxItem } from "../../src/types";

describe("Reader Save to Note & Scoped Notes Contract (Red Stage)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 404,
          json: () => Promise.resolve({}),
          text: () => Promise.resolve(""),
        })
      )
    );
  });

  const mockNote: Note = {
    id: "note-buddhism-1",
    topicId: "topic-1",
    title: "Ghi chú Bát Chánh Đạo",
    content: "Nội dung ban đầu của ghi chú.",
    type: "insight",
    tags: ["buddhism"],
    isPrivate: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it("1. formatExcerptBlockquote includes archiveUri identifier and source link", () => {
    const quote = formatExcerptBlockquote(
      "Chánh kiến là thấy biết như thật.",
      {
        documentId: "vault:05_EPUB_Export/Dai_Niem_Xu.epub",
        title: "Kinh Đại Niệm Xứ",
        author: "Thiền Sư U Silananda",
        sourceUrl: "/api/obsidian/vault/attachment?path=05_EPUB_Export%2FDai_Niem_Xu.epub",
      },
      {
        page: 42,
        cfi: "epubcfi(/6/2[chap1]!/4/2/1:0)",
      }
    );

    expect(quote).toContain("Chánh kiến là thấy biết như thật.");
    expect(quote).toContain("Kinh Đại Niệm Xứ");
    expect(quote).toContain("Thiền Sư U Silananda");
    // Contract: Must contain canonical archive URI provenance marker
    expect(quote).toContain("archive://vault:05_EPUB_Export/Dai_Niem_Xu.epub");
  });

  it("2. Saving excerpt to target note in UnifiedResearchReader keeps the note visible in Ghi chú tab when matching by fileUrl or archiveUri", async () => {
    const updateNoteMock = vi.fn();
    const addExcerptToInboxMock = vi.fn().mockImplementation((excerpt: ResearchExcerpt) => {
      const item: ResearchInboxItem = {
        id: `inbox-${excerpt.id}`,
        excerptId: excerpt.id,
        excerpt,
        isProcessed: false,
        priority: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return Promise.resolve(item);
    });

    // Note has excerpt with matching fileUrl but citation title differs from reader title
    const noteWithExcerpt: Note = {
      ...mockNote,
      content: `${mockNote.content}\n\n> Chánh kiến là thấy biết như thật.\n>\n> — *Tài liệu tham khảo*, [Xem tài liệu](/api/obsidian/vault/attachment?path=05_EPUB_Export%2FDai_Niem_Xu.epub)`,
    };

    render(
      <DataContext.Provider
        value={
          {
            notes: [noteWithExcerpt],
            resources: [],
            researchInboxItems: [],
            addExcerptToInbox: addExcerptToInboxMock,
            updateNote: updateNoteMock,
          } as any
        }
      >
        <UnifiedResearchReader
          documentId="vault:05_EPUB_Export/Dai_Niem_Xu.epub"
          title="Kinh Đại Niệm Xứ (Bản Dịch)"
          format="md"
          content="# Kinh Đại Niệm Xứ\n\nNội dung văn bản khảo cứu."
          fileUrl="/api/obsidian/vault/attachment?path=05_EPUB_Export%2FDai_Niem_Xu.epub"
          onClose={vi.fn()}
        />
      </DataContext.Provider>
    );

    // Open Reader Sidebar
    const sidebarToggleBtn = screen.getByTestId("reader-toggle-sidebar-btn");
    fireEvent.click(sidebarToggleBtn);

    // Click "Ghi chú" tab
    const notesTab = screen.getByTestId("sidebar-tab-notes");
    fireEvent.click(notesTab);

    // Contract: The note must be visible in Ghi chú tab because its citation matches the open document fileUrl
    await waitFor(() => {
      expect(screen.getByText("Ghi chú Bát Chánh Đạo")).toBeInTheDocument();
    });
  });

  it("3. Navbar ResearchInboxDrawer onSendToNote updates React notes state in DataContext immediately", async () => {
    vi.spyOn(dataRepository, "appendExcerptToNote" as any).mockImplementation((noteId: string, blockquote: string) => {
      return Promise.resolve({
        ...mockNote,
        content: `${mockNote.content}\n\n${blockquote}`,
      });
    });

    const mockExcerpt: ResearchExcerpt = {
      id: "excerpt-test-1",
      archivedDocumentId: "vault:05_EPUB_Export/Dai_Niem_Xu.epub",
      selectedText: "Đoạn trích từ inbox",
      positionSelector: {},
      highlightColor: "#fef08a",
      citationSnapshot: {
        title: "Kinh Đại Niệm Xứ",
        author: "Thiền Sư U Silananda",
      },
      status: "inbox",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const mockInboxItem: ResearchInboxItem = {
      id: "inbox-101",
      excerptId: "excerpt-test-1",
      excerpt: mockExcerpt,
      isProcessed: false,
      priority: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    function TestConsumer() {
      const ctx = React.useContext(DataContext);
      return (
        <div>
          <div data-testid="notes-count">{ctx.notes.length}</div>
          {ctx.notes.map((n) => (
            <div key={n.id} data-testid={`note-content-${n.id}`}>
              {n.content}
            </div>
          ))}
        </div>
      );
    }

    // Set initial storage so DataProvider initializes with mockNote and mockInboxItem
    localStorage.setItem("knowledge_os_storage_version", "3");
    localStorage.setItem("phat_hoc_huyen_hoc_clean_v3_notes", JSON.stringify([mockNote]));
    localStorage.setItem("phat_hoc_huyen_hoc_clean_v3_research_inbox", JSON.stringify([mockInboxItem]));

    render(
      <DataProvider>
        <Navbar />
        <TestConsumer />
      </DataProvider>
    );

    // Open Research Inbox Drawer from Navbar
    const inboxBtn = screen.getByLabelText("Mở Research Inbox");
    fireEvent.click(inboxBtn);

    // Wait for drawer item
    await waitFor(() => {
      expect(screen.getByText(/Đoạn trích từ inbox/i)).toBeInTheDocument();
    });

    // Click "Lưu vào ghi chú" button in drawer
    const sendToNoteBtn = screen.getByLabelText("Lưu vào ghi chú");
    fireEvent.click(sendToNoteBtn);

    // Contract: React state in DataContext must be updated immediately with the new content
    await waitFor(() => {
      const noteEl = screen.getByTestId("note-content-note-buddhism-1");
      expect(noteEl.textContent).toContain("Đoạn trích từ inbox");
    });
  });

  it("4. ResearchRepositoryV2 delegates appendExcerptToNote properly to base repository and persists updated note", async () => {
    const { LocalStorageDataRepository } = await import("../../src/services/dataRepository");
    const { ResearchRepositoryV2 } = await import("../../src/services/researchRepositoryV2");

    const storageKey = "test_repo_v2_storage";
    localStorage.setItem(storageKey, JSON.stringify({
      categories: [],
      topics: [],
      notes: [mockNote],
      resources: [],
      tags: [],
    }));

    const baseRepo = new LocalStorageDataRepository(storageKey);
    const repoV2 = new ResearchRepositoryV2(baseRepo);

    expect(typeof repoV2.appendExcerptToNote).toBe("function");

    const updated = await repoV2.appendExcerptToNote!(
      "note-buddhism-1",
      "> Trích đoạn khảo cứu quan trọng\n>\n> — *Kinh Đại Niệm Xứ*"
    );

    expect(updated.content).toContain("Trích đoạn khảo cứu quan trọng");
    expect(updated.content).toContain("Nội dung ban đầu của ghi chú.");

    // Verify persisted in localStorage
    const savedData = JSON.parse(localStorage.getItem(storageKey) || "{}");
    const savedNote = savedData.notes.find((n: Note) => n.id === "note-buddhism-1");
    expect(savedNote.content).toContain("Trích đoạn khảo cứu quan trọng");
  });

  it("5. Navbar onSendToNote opens TargetNoteSelectorModal when multiple notes exist and saves to selected note", async () => {
    const note1: Note = {
      ...mockNote,
      id: "note-1",
      title: "Ghi chú số 1",
      content: "Nội dung ghi chú 1",
    };
    const note2: Note = {
      ...mockNote,
      id: "note-2",
      title: "Ghi chú số 2",
      content: "Nội dung ghi chú 2",
    };

    const mockExcerpt: ResearchExcerpt = {
      id: "excerpt-test-2",
      archivedDocumentId: "vault:05_EPUB_Export/Dai_Niem_Xu.epub",
      selectedText: "Đoạn trích muốn lưu vào note 2",
      positionSelector: {},
      highlightColor: "#fef08a",
      citationSnapshot: {
        title: "Kinh Đại Niệm Xứ",
      },
      status: "inbox",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const mockInboxItem: ResearchInboxItem = {
      id: "inbox-202",
      excerptId: "excerpt-test-2",
      excerpt: mockExcerpt,
      isProcessed: false,
      priority: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    function TestConsumer() {
      const ctx = React.useContext(DataContext);
      return (
        <div>
          <div data-testid="notes-count">{ctx.notes.length}</div>
          {ctx.notes.map((n) => (
            <div key={n.id} data-testid={`note-content-${n.id}`}>
              {n.content}
            </div>
          ))}
        </div>
      );
    }

    const rootData = {
      categories: [],
      topics: [],
      notes: [note1, note2],
      resources: [],
      tags: [],
    };
    localStorage.setItem("knowledge_os_storage_version", "3");
    localStorage.setItem("phat_hoc_huyen_hoc_clean_v3", JSON.stringify(rootData));
    localStorage.setItem("phat_hoc_huyen_hoc_clean_v3_notes", JSON.stringify([note1, note2]));
    localStorage.setItem("phat_hoc_huyen_hoc_clean_v3_research_inbox", JSON.stringify([mockInboxItem]));

    render(
      <DataProvider>
        <Navbar />
        <TestConsumer />
      </DataProvider>
    );

    // Ensure DataProvider has settled and notes array has 2 notes before interaction
    await waitFor(() => {
      expect(screen.getByTestId("notes-count")).toHaveTextContent("2");
    });

    // Open Research Inbox Drawer
    const inboxBtn = screen.getByLabelText("Mở Research Inbox");
    fireEvent.click(inboxBtn);

    await waitFor(() => {
      expect(screen.getByText(/Đoạn trích muốn lưu vào note 2/i)).toBeInTheDocument();
    });

    // Click "Lưu vào ghi chú"
    const sendToNoteBtn = screen.getByLabelText("Lưu vào ghi chú");
    fireEvent.click(sendToNoteBtn);

    // When multiple notes exist, TargetNoteSelectorModal should appear
    const noteModal = await screen.findByRole("dialog", { name: /Chọn ghi chú đích/i });
    expect(noteModal).toBeInTheDocument();

    // Click on "Ghi chú số 2" within the target note selector modal
    const note2Option = within(noteModal).getByText("Ghi chú số 2");
    fireEvent.click(note2Option);

    // Contract: Excerpt must be appended to note-2, NOT note-1
    await waitFor(() => {
      const note2El = screen.getByTestId("note-content-note-2");
      expect(note2El.textContent).toContain("Đoạn trích muốn lưu vào note 2");
      const note1El = screen.getByTestId("note-content-note-1");
      expect(note1El.textContent).not.toContain("Đoạn trích muốn lưu vào note 2");
    });

    // Contract: Persistence verification (simulated page reload reading from localStorage)
    const storedNotesRaw = localStorage.getItem("phat_hoc_huyen_hoc_clean_v3_notes");
    expect(storedNotesRaw).toBeTruthy();
    const storedNotes = JSON.parse(storedNotesRaw || "[]");
    const storedNote2 = storedNotes.find((n: Note) => n.id === "note-2");
    expect(storedNote2).toBeTruthy();
    expect(storedNote2.content).toContain("Đoạn trích muốn lưu vào note 2");
  });

  it("6. Navbar onSendToNote stops immediately and keeps inbox item when appendExcerptToNote rejects", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const appendMock = vi.spyOn(dataRepository, "appendExcerptToNote" as any).mockRejectedValue(new Error("Disk IO Failure"));

    const note1: Note = {
      ...mockNote,
      id: "note-err-1",
      title: "Ghi chú lỗi",
      content: "Nội dung nguyên bản chưa sửa",
    };

    const mockExcerpt: ResearchExcerpt = {
      id: "excerpt-test-err",
      archivedDocumentId: "vault:05_EPUB_Export/Dai_Niem_Xu.epub",
      selectedText: "Đoạn trích gây lỗi lưu",
      positionSelector: {},
      highlightColor: "#fef08a",
      citationSnapshot: {
        title: "Kinh Đại Niệm Xứ",
      },
      status: "inbox",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const mockInboxItem: ResearchInboxItem = {
      id: "inbox-err-303",
      excerptId: "excerpt-test-err",
      excerpt: mockExcerpt,
      isProcessed: false,
      priority: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    function TestConsumer() {
      const ctx = React.useContext(DataContext);
      const inboxItem = ctx.researchInboxItems.find((i) => i.id === "inbox-err-303");
      return (
        <div>
          <div data-testid="inbox-item-status">{inboxItem ? (inboxItem.isProcessed ? "PROCESSED" : "UNPROCESSED") : "MISSING"}</div>
          {ctx.notes.map((n) => (
            <div key={n.id} data-testid={`note-content-${n.id}`}>
              {n.content}
            </div>
          ))}
        </div>
      );
    }

    localStorage.setItem("knowledge_os_storage_version", "3");
    localStorage.setItem("phat_hoc_huyen_hoc_clean_v3_notes", JSON.stringify([note1]));
    localStorage.setItem("phat_hoc_huyen_hoc_clean_v3_research_inbox", JSON.stringify([mockInboxItem]));

    render(
      <DataProvider>
        <Navbar />
        <TestConsumer />
      </DataProvider>
    );

    // Open Research Inbox Drawer
    const inboxBtn = screen.getByLabelText("Mở Research Inbox");
    fireEvent.click(inboxBtn);

    await waitFor(() => {
      expect(screen.getByText(/Đoạn trích gây lỗi lưu/i)).toBeInTheDocument();
      expect(screen.getByTestId("note-content-note-err-1")).toBeInTheDocument();
    });

    // Click "Lưu vào ghi chú"
    const sendToNoteBtn = screen.getByLabelText("Lưu vào ghi chú");
    fireEvent.click(sendToNoteBtn);

    // Contract: When appendExcerptToNote fails:
    // 1. Note content must NOT be modified
    // 2. Inbox item must NOT be marked as processed (status stays UNPROCESSED for retry)
    await waitFor(() => {
      const noteEl = screen.getByTestId("note-content-note-err-1");
      expect(noteEl.textContent).toBe("Nội dung nguyên bản chưa sửa");
      expect(noteEl.textContent).not.toContain("Đoạn trích gây lỗi lưu");

      const statusEl = screen.getByTestId("inbox-item-status");
      expect(statusEl.textContent).toBe("UNPROCESSED");
    });

    // 3. Error must be logged
    expect(errorSpy).toHaveBeenCalled();
    appendMock.mockRestore();
    errorSpy.mockRestore();
  });

  it("7. UnifiedResearchReader handleSelectTargetNote does NOT update note locally or add to inbox if appendExcerptToNote fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const appendMock = vi.spyOn(dataRepository, "appendExcerptToNote" as any).mockRejectedValue(new Error("Disk IO Failure"));

    const updateNoteMock = vi.fn();
    const addExcerptToInboxMock = vi.fn();

    const note1: Note = {
      ...mockNote,
      id: "note-reader-err-1",
      title: "Ghi chú khảo cứu",
      content: "Nội dung ban đầu của ghi chú.",
    };

    render(
      <DataContext.Provider
        value={
          {
            notes: [note1],
            resources: [],
            researchInboxItems: [],
            addExcerptToInbox: addExcerptToInboxMock,
            updateNote: updateNoteMock,
          } as any
        }
      >
        <UnifiedResearchReader
          documentId="doc-test-1"
          title="Tài liệu mẫu"
          format="md"
          content="# Đoạn văn bản khảo cứu"
          onClose={vi.fn()}
        />
      </DataContext.Provider>
    );

    const contentEl = screen.getByText("Đoạn văn bản khảo cứu");
    const getSelectionSpy = vi.spyOn(window, "getSelection").mockReturnValue({
      isCollapsed: false,
      toString: () => "Đoạn trích khảo cứu",
      getRangeAt: () => ({
        getBoundingClientRect: () => ({ top: 100, left: 200, width: 50, height: 20, right: 250, bottom: 120 }),
      }),
    } as any);

    fireEvent.mouseUp(contentEl);

    const sendToNoteBtn = await screen.findByRole("button", { name: /Ghi chú/i });
    fireEvent.click(sendToNoteBtn);

    const targetNoteBtn = await screen.findByText("Ghi chú khảo cứu");
    fireEvent.click(targetNoteBtn);

    await waitFor(() => {
      // Contract:
      // 1. updateNote must NOT be called
      expect(updateNoteMock).not.toHaveBeenCalled();
      // 2. addExcerptToInbox must NOT be called
      expect(addExcerptToInboxMock).not.toHaveBeenCalled();
      // 3. Error toast should be visible
      expect(screen.getByText("Lỗi khi lưu vào ghi chú")).toBeInTheDocument();
      // 4. Success toast should NOT be visible
      expect(screen.queryByText("Đã lưu trích đoạn vào ghi chú thành công")).not.toBeInTheDocument();
    });

    getSelectionSpy.mockRestore();
    appendMock.mockRestore();
    errorSpy.mockRestore();
  });

  it("8. UnifiedResearchReader handleSelectTargetNote updates note and adds to inbox when appendExcerptToNote succeeds", async () => {
    const appendMock = vi.spyOn(dataRepository, "appendExcerptToNote" as any).mockResolvedValue({
      id: "note-reader-ok-1",
      title: "Ghi chú khảo cứu",
      content: "Nội dung ban đầu của ghi chú.\n\n> Đoạn trích khảo cứu",
    });

    const updateNoteMock = vi.fn();
    const addExcerptToInboxMock = vi.fn();

    const note1: Note = {
      ...mockNote,
      id: "note-reader-ok-1",
      title: "Ghi chú khảo cứu",
      content: "Nội dung ban đầu của ghi chú.",
    };

    render(
      <DataContext.Provider
        value={
          {
            notes: [note1],
            resources: [],
            researchInboxItems: [],
            addExcerptToInbox: addExcerptToInboxMock,
            updateNote: updateNoteMock,
          } as any
        }
      >
        <UnifiedResearchReader
          documentId="doc-test-1"
          title="Tài liệu mẫu"
          format="md"
          content="# Đoạn văn bản khảo cứu"
          onClose={vi.fn()}
        />
      </DataContext.Provider>
    );

    const contentEl = screen.getByText("Đoạn văn bản khảo cứu");
    const getSelectionSpy = vi.spyOn(window, "getSelection").mockReturnValue({
      isCollapsed: false,
      toString: () => "Đoạn trích khảo cứu",
      getRangeAt: () => ({
        getBoundingClientRect: () => ({ top: 100, left: 200, width: 50, height: 20, right: 250, bottom: 120 }),
      }),
    } as any);

    fireEvent.mouseUp(contentEl);

    const sendToNoteBtn = await screen.findByRole("button", { name: /Ghi chú/i });
    fireEvent.click(sendToNoteBtn);

    const targetNoteBtn = await screen.findByText("Ghi chú khảo cứu");
    fireEvent.click(targetNoteBtn);

    await waitFor(() => {
      expect(updateNoteMock).toHaveBeenCalledWith("note-reader-ok-1", {
        content: "Nội dung ban đầu của ghi chú.\n\n> Đoạn trích khảo cứu",
      });
      expect(addExcerptToInboxMock).toHaveBeenCalled();
      expect(screen.getByText("Đã lưu trích đoạn vào ghi chú thành công")).toBeInTheDocument();
    });

    getSelectionSpy.mockRestore();
    appendMock.mockRestore();
  });
});
