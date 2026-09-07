import React, { act } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FlashcardReviewStudio } from "../../src/components/flashcards/FlashcardReviewStudio";
import { useKeyboardShortcuts } from "../../src/hooks/useKeyboardShortcuts";
import { shortcutScope } from "../../src/lib/shortcutScope";
import type { Flashcard } from "../../src/types/flashcard";

vi.mock("canvas-confetti", () => ({
  default: vi.fn(),
}));

// Mock DataContext so we don't need the full DataProvider
vi.mock("../../src/context/DataContext", () => ({
  useData: () => ({
    topics: [{ id: "topic-1", title: "Thực hành Chánh Niệm" }],
    notes: [],
    resources: [],
    categories: [],
  }),
}));

const mockDueCards: Flashcard[] = [
  {
    id: "card-001",
    front: "Thủ đô Việt Nam là gì?",
    back: "Hà Nội",
    type: "basic",
    topicId: "topic-1",
    noteId: null,
    lifecycleStatus: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    schedule: {
      id: "sch-1",
      flashcardId: "card-001",
      state: "new",
      dueAt: new Date().toISOString(),
      interval: 1,
      easeFactor: 2.5,
      repetitions: 0,
      lapses: 0,
      lastReviewedAt: null,
      updatedAt: new Date().toISOString(),
    },
  },
];

// Helper component that combines useKeyboardShortcuts with an optional FlashcardReviewStudio
function TestHarness({
  showStudio = true,
  onNavigateTab = vi.fn(),
  onOpenCommandPalette = vi.fn(),
  onOpenShortcutsModal = vi.fn(),
}: {
  showStudio?: boolean;
  onNavigateTab?: (tab: string) => void;
  onOpenCommandPalette?: () => void;
  onOpenShortcutsModal?: () => void;
}) {
  useKeyboardShortcuts({
    onNavigateTab,
    onOpenCommandPalette,
    onOpenShortcutsModal,
  });

  return (
    <div>
      {showStudio && <FlashcardReviewStudio />}
    </div>
  );
}

describe("BUG F6.0.1 — Final Spec: Scoped Keyboard Shortcut Priority", () => {
  beforeEach(() => {
    shortcutScope.reset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    shortcutScope.reset();
  });

  it("A.1: Khi thẻ ở mặt trước: 1-4 không rate và không trigger chuyển tab", async () => {
    const onNavigateTab = vi.fn();
    const reviewFetchSpy = vi.fn();

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/flashcards/due")) {
        return Promise.resolve({
          ok: true,
          json: async () => mockDueCards,
        });
      }
      if (url.includes("/api/flashcards/review")) {
        reviewFetchSpy();
        return Promise.resolve({ ok: true, json: async () => ({ success: true }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<TestHarness showStudio={true} onNavigateTab={onNavigateTab} />);

    // Đợi thẻ xuất hiện ở mặt trước
    expect(await screen.findByText("Thủ đô Việt Nam là gì?")).toBeInTheDocument();

    // Nhấn phím 1, 2, 3, 4
    for (const key of ["1", "2", "3", "4"]) {
      act(() => {
        fireEvent.keyDown(window, { key });
      });
    }

    // Xác nhận: Không gọi review API
    expect(reviewFetchSpy).not.toHaveBeenCalled();
    // Xác nhận: Không trigger chuyển tab toàn cục
    expect(onNavigateTab).not.toHaveBeenCalled();
  });

  it("A.2: Phím Space lật thẻ và ngăn chặn cuộn trình duyệt (preventDefault)", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/flashcards/due")) {
        return Promise.resolve({
          ok: true,
          json: async () => mockDueCards,
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<TestHarness showStudio={true} />);
    await screen.findByText("Thủ đô Việt Nam là gì?");

    const spaceEvent = new KeyboardEvent("keydown", {
      code: "Space",
      key: " ",
      bubbles: true,
      cancelable: true,
    });
    act(() => {
      window.dispatchEvent(spaceEvent);
    });

    // Xác nhận thẻ đã lật sang mặt sau
    expect(await screen.findByText("Hà Nội")).toBeInTheDocument();
    // Xác nhận đã gọi preventDefault
    expect(spaceEvent.defaultPrevented).toBe(true);
  });

  it("A.3: Khi thẻ ở mặt sau: 1-4 rate chính xác 1 lần và không trigger chuyển tab", async () => {
    const onNavigateTab = vi.fn();
    const reviewFetchSpy = vi.fn();

    global.fetch = vi.fn().mockImplementation((url: string, opts?: any) => {
      if (url.includes("/api/flashcards/due")) {
        return Promise.resolve({
          ok: true,
          json: async () => mockDueCards,
        });
      }
      if (url.includes("/api/flashcards/review")) {
        reviewFetchSpy(JSON.parse(opts?.body || "{}"));
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            review: { rating: 3 },
          }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<TestHarness showStudio={true} onNavigateTab={onNavigateTab} />);
    await screen.findByText("Thủ đô Việt Nam là gì?");

    // Lật thẻ bằng Space
    act(() => {
      fireEvent.keyDown(window, { code: "Space", key: " " });
    });
    expect(await screen.findByText("Hà Nội")).toBeInTheDocument();

    // Nhấn phím '3' (Good)
    const rateEvent = new KeyboardEvent("keydown", {
      key: "3",
      bubbles: true,
      cancelable: true,
    });
    act(() => {
      window.dispatchEvent(rateEvent);
    });

    await waitFor(() => {
      expect(reviewFetchSpy).toHaveBeenCalledTimes(1);
    });
    expect(reviewFetchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        rating: 3,
        flashcardId: "card-001",
      })
    );

    // Xác nhận không trigger chuyển tab toàn cục
    expect(onNavigateTab).not.toHaveBeenCalled();
    expect(rateEvent.defaultPrevented).toBe(true);
  });

  it("A.4: Không chặn các phím toàn cục không xung đột như Cmd/Ctrl+K và phím ?", async () => {
    const onOpenCommandPalette = vi.fn();
    const onOpenShortcutsModal = vi.fn();

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/flashcards/due")) {
        return Promise.resolve({
          ok: true,
          json: async () => mockDueCards,
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(
      <TestHarness
        showStudio={true}
        onOpenCommandPalette={onOpenCommandPalette}
        onOpenShortcutsModal={onOpenShortcutsModal}
      />
    );
    await screen.findByText("Thủ đô Việt Nam là gì?");

    // Nhấn Ctrl+K
    const ctrlKEvent = new KeyboardEvent("keydown", {
      key: "k",
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(ctrlKEvent);
    expect(onOpenCommandPalette).toHaveBeenCalledTimes(1);

    // Nhấn phím '?'
    const questionEvent = new KeyboardEvent("keydown", {
      key: "?",
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(questionEvent);
    expect(onOpenShortcutsModal).toHaveBeenCalledTimes(1);
  });

  it("B.1: Không capture Space hoặc 1-4 khi focus nằm trong input/textarea/select/contenteditable", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/flashcards/due")) {
        return Promise.resolve({
          ok: true,
          json: async () => mockDueCards,
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(
      <div>
        <TestHarness showStudio={true} />
        <input data-testid="test-input" />
        <textarea data-testid="test-textarea" />
        <div data-testid="test-contenteditable" contentEditable={true} />
      </div>
    );
    await screen.findByText("Thủ đô Việt Nam là gì?");

    // 1. Focus input và nhấn Space -> không được lật thẻ
    const input = screen.getByTestId("test-input");
    input.focus();
    const inputSpace = new KeyboardEvent("keydown", {
      code: "Space",
      key: " ",
      bubbles: true,
      cancelable: true,
    });
    input.dispatchEvent(inputSpace);
    // Thẻ vẫn phải ở mặt trước
    expect(screen.queryByText("Hà Nội")).not.toBeInTheDocument();
    expect(inputSpace.defaultPrevented).toBe(false);

    // 2. Focus textarea và nhấn 1 -> không được ngăn chặn
    const textarea = screen.getByTestId("test-textarea");
    textarea.focus();
    const textarea1 = new KeyboardEvent("keydown", {
      key: "1",
      bubbles: true,
      cancelable: true,
    });
    textarea.dispatchEvent(textarea1);
    expect(textarea1.defaultPrevented).toBe(false);

    // 3. Focus contenteditable và nhấn Space -> không được lật thẻ
    const editable = screen.getByTestId("test-contenteditable");
    editable.focus();
    const editableSpace = new KeyboardEvent("keydown", {
      code: "Space",
      key: " ",
      bubbles: true,
      cancelable: true,
    });
    editable.dispatchEvent(editableSpace);
    expect(screen.queryByText("Hà Nội")).not.toBeInTheDocument();
    expect(editableSpace.defaultPrevented).toBe(false);
  });

  it("B.2: Không capture Space hoặc 1-4 khi một modal (role=dialog) đang mở", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/flashcards/due")) {
        return Promise.resolve({
          ok: true,
          json: async () => mockDueCards,
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(
      <div>
        <TestHarness showStudio={true} />
        <div role="dialog" aria-modal="true" data-testid="active-modal">
          <button data-testid="modal-btn">Nút trong modal</button>
        </div>
      </div>
    );
    await screen.findByText("Thủ đô Việt Nam là gì?");

    // Focus một element trong modal
    const modalBtn = screen.getByTestId("modal-btn");
    modalBtn.focus();

    // Nhấn Space trong modal
    const modalSpace = new KeyboardEvent("keydown", {
      code: "Space",
      key: " ",
      bubbles: true,
      cancelable: true,
    });
    modalBtn.dispatchEvent(modalSpace);

    // Thẻ không được lật
    expect(screen.queryByText("Hà Nội")).not.toBeInTheDocument();
  });

  it("C: Khi rời Flashcard Review Studio (unmount): các phím 1-7 khôi phục điều hướng toàn cục", async () => {
    const onNavigateTab = vi.fn();

    // Render không có Studio
    const { rerender } = render(<TestHarness showStudio={false} onNavigateTab={onNavigateTab} />);

    // Scope phải là 'global'
    expect(shortcutScope.getCurrentScope()).toBe("global");

    // Nhấn phím 1 -> điều hướng tới dashboard
    fireEvent.keyDown(window, { key: "1" });
    expect(onNavigateTab).toHaveBeenCalledWith("dashboard");

    // Nhấn phím 2 -> điều hướng tới topics
    fireEvent.keyDown(window, { key: "2" });
    expect(onNavigateTab).toHaveBeenCalledWith("topics");

    // Nhấn phím 3 -> điều hướng tới abhidharma_matrix
    fireEvent.keyDown(window, { key: "3" });
    expect(onNavigateTab).toHaveBeenCalledWith("abhidharma_matrix");

    // Nhấn phím 4 -> điều hướng tới divination_matrix
    fireEvent.keyDown(window, { key: "4" });
    expect(onNavigateTab).toHaveBeenCalledWith("divination_matrix");
  });
});
