import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MindMapView } from "../../src/components/mindmap/MindMapView";
import * as mindmapDocumentStorage from "../../src/lib/mindmapDocumentStorage";
import { Topic } from "../../src/types";

// ==========================================
// Mock Data Context with Stable References
// ==========================================
const sampleTopic: Topic = {
  id: "topic-shortcut-1",
  title: "Chủ đề Phím tắt Test",
  slug: "chu-de-phim-tat-test",
  type: "phat-hoc",
  description: "Mô tả kiểm thử bảng phím tắt",
  content: "Nội dung kiểm thử",
  categoryId: "cat-test",
  categoryName: "Kiểm thử",
  tags: ["test"],
  links: [],
  studyProgress: {
    topicId: "topic-shortcut-1",
    status: "not_started",
    progress: 0,
    interval: 0,
    easeFactor: 2.5,
    repetitions: 0,
    totalNotes: 0,
    timeSpent: 0,
  },
  visibility: "active",
  createdAt: "2026-10-29T00:00:00.000Z",
  updatedAt: "2026-10-29T00:00:00.000Z",
};

let mockTopics: Topic[] = [sampleTopic];
let mockNotes: any[] = [];
let mockResources: any[] = [];
let mockSelectedTopicId: string | null = "topic-shortcut-1";
const mockCategories: any[] = [];
const mockTags: any[] = [];

vi.mock("../../src/context/DataContext", () => ({
  useData: () => ({
    topics: mockTopics,
    notes: mockNotes,
    resources: mockResources,
    selectedTopicId: mockSelectedTopicId,
    categories: mockCategories,
    tags: mockTags,
    addTopic: vi.fn(),
    updateTopic: vi.fn(),
    deleteTopic: vi.fn(),
  }),
}));

describe("PR 5 (Phase 25): MindMap Keyboard Shortcut Overlay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTopics = [sampleTopic];
    mockNotes = [];
    mockResources = [];
    mockSelectedTopicId = "topic-shortcut-1";
    mindmapDocumentStorage.clearVolatileStorageForTests();
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.clear();
    }
  });

  it("renders the shortcut trigger button in the MindMap toolbar", () => {
    render(<MindMapView />);
    const shortcutBtn = screen.getByTestId("btn-mindmap-shortcuts");
    expect(shortcutBtn).toBeInTheDocument();
    expect(shortcutBtn).toHaveTextContent(/Phím tắt/i);
  });

  it("opens the shortcut overlay modal when clicking the toolbar button", () => {
    render(<MindMapView />);
    expect(screen.queryByRole("dialog", { name: /phím tắt mindmap/i })).not.toBeInTheDocument();

    const shortcutBtn = screen.getByTestId("btn-mindmap-shortcuts");
    fireEvent.click(shortcutBtn);

    const dialog = screen.getByRole("dialog", { name: /phím tắt mindmap/i });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("Phím tắt MindMap")).toBeInTheDocument();
  });

  it("opens the shortcut overlay modal on pressing '?' key", () => {
    render(<MindMapView />);
    expect(screen.queryByRole("dialog", { name: /phím tắt mindmap/i })).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: "?" });

    expect(screen.getByRole("dialog", { name: /phím tắt mindmap/i })).toBeInTheDocument();
  });

  it("opens the shortcut overlay modal on pressing 'Shift + /'", () => {
    render(<MindMapView />);
    expect(screen.queryByRole("dialog", { name: /phím tắt mindmap/i })).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: "/", shiftKey: true });

    expect(screen.getByRole("dialog", { name: /phím tắt mindmap/i })).toBeInTheDocument();
  });

  it("does not open modal when typing '?' inside an input or textarea element", () => {
    render(
      <div>
        <input data-testid="test-input" type="text" />
        <MindMapView />
      </div>
    );

    const input = screen.getByTestId("test-input");
    input.focus();
    fireEvent.keyDown(input, { key: "?" });

    expect(screen.queryByRole("dialog", { name: /phím tắt mindmap/i })).not.toBeInTheDocument();
  });

  it("closes the shortcut overlay modal when clicking the close button", () => {
    render(<MindMapView />);
    fireEvent.click(screen.getByTestId("btn-mindmap-shortcuts"));
    expect(screen.getByRole("dialog", { name: /phím tắt mindmap/i })).toBeInTheDocument();

    const closeBtn = screen.getByTestId("btn-close-shortcuts");
    fireEvent.click(closeBtn);

    expect(screen.queryByRole("dialog", { name: /phím tắt mindmap/i })).not.toBeInTheDocument();
  });

  it("closes the shortcut overlay modal when pressing Escape", () => {
    render(<MindMapView />);
    fireEvent.click(screen.getByTestId("btn-mindmap-shortcuts"));
    expect(screen.getByRole("dialog", { name: /phím tắt mindmap/i })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByRole("dialog", { name: /phím tắt mindmap/i })).not.toBeInTheDocument();
  });

  it("closes the shortcut overlay modal when clicking the backdrop", () => {
    render(<MindMapView />);
    fireEvent.click(screen.getByTestId("btn-mindmap-shortcuts"));
    const backdrop = screen.getByTestId("mindmap-shortcut-backdrop");
    expect(backdrop).toBeInTheDocument();

    fireEvent.click(backdrop);

    expect(screen.queryByRole("dialog", { name: /phím tắt mindmap/i })).not.toBeInTheDocument();
  });

  it("displays only verified implemented shortcuts grouped logically", () => {
    render(<MindMapView />);
    fireEvent.click(screen.getByTestId("btn-mindmap-shortcuts"));

    // Check section headings
    expect(screen.getByText("Điều hướng")).toBeInTheDocument();
    expect(screen.getByText("Chỉnh sửa nút")).toBeInTheDocument();
    expect(screen.getByText("Chọn & Thao tác hàng loạt")).toBeInTheDocument();
    expect(screen.getByText("Hoàn tác & Làm lại")).toBeInTheDocument();

    // Check specific verified keys
    expect(screen.getByText("Tab / Insert")).toBeInTheDocument();
    expect(screen.getAllByText("Enter").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("F2")).toBeInTheDocument();
    expect(screen.getByText("Delete / Backspace")).toBeInTheDocument();
    expect(screen.getByText("Alt + ↑ / ↓")).toBeInTheDocument();
    expect(screen.getByText("Shift + A")).toBeInTheDocument();
    expect(screen.getByText("Space")).toBeInTheDocument();
    expect(screen.getByText("Shift + Space")).toBeInTheDocument();
    expect(screen.getByText("Cmd / Ctrl + A")).toBeInTheDocument();
    expect(screen.getByText("Cmd / Ctrl + Z")).toBeInTheDocument();
    expect(screen.getAllByText("Escape").length).toBeGreaterThanOrEqual(1);
  });
});
