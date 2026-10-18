import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, renderHook } from "@testing-library/react";
import { QuickCaptureModal } from "../../src/components/modals/QuickCaptureModal";
import { useKeyboardShortcuts } from "../../src/hooks/useKeyboardShortcuts";
import { useCommandPalette } from "../../src/hooks/useCommandPalette";
import App from "../../src/App";
import type { ResearchExcerpt } from "../../src/types";
import { STORAGE_ROOT_KEY } from "../../src/lib/storage";

describe("Phase D2 — Global Quick-Capture Modal Tests", () => {
  describe("1. Keyboard Shortcut (Cmd+N / Ctrl+N)", () => {
    it("kích hoạt onOpenQuickCapture khi nhấn Ctrl+N hoặc Cmd+N", () => {
      const handleOpenQuickCapture = vi.fn();
      renderHook(() =>
        useKeyboardShortcuts({
          onOpenQuickCapture: handleOpenQuickCapture,
        })
      );

      // Trigger Ctrl+N
      const eventCtrl = new KeyboardEvent("keydown", {
        key: "n",
        ctrlKey: true,
        cancelable: true,
      });
      window.dispatchEvent(eventCtrl);
      expect(handleOpenQuickCapture).toHaveBeenCalledTimes(1);

      // Trigger Cmd+N
      const eventMeta = new KeyboardEvent("keydown", {
        key: "n",
        metaKey: true,
        cancelable: true,
      });
      window.dispatchEvent(eventMeta);
      expect(handleOpenQuickCapture).toHaveBeenCalledTimes(2);
    });

    it("không làm hỏng shortcut cũ (Cmd+K, ?, phím số 1-7)", () => {
      const handleOpenPalette = vi.fn();
      const handleOpenShortcuts = vi.fn();
      const handleNavigate = vi.fn();

      renderHook(() =>
        useKeyboardShortcuts({
          onOpenCommandPalette: handleOpenPalette,
          onOpenShortcutsModal: handleOpenShortcuts,
          onNavigateTab: handleNavigate,
        })
      );

      fireEvent.keyDown(window, { key: "k", metaKey: true });
      expect(handleOpenPalette).toHaveBeenCalledTimes(1);

      fireEvent.keyDown(window, { key: "?" });
      expect(handleOpenShortcuts).toHaveBeenCalledTimes(1);

      fireEvent.keyDown(window, { key: "1" });
      expect(handleNavigate).toHaveBeenCalledWith("dashboard");
    });
  });

  describe("2. Command Palette Fallback Action", () => {
    it("đăng ký action act-quick-capture trong danh mục 'Hành động nhanh'", () => {
      const handleOpenQuickCapture = vi.fn();
      const { result } = renderHook(() =>
        useCommandPalette({
          onOpenQuickCapture: handleOpenQuickCapture,
        })
      );

      const quickCaptureItem = result.current.filteredItems.find(
        (it) => it.id === "act-quick-capture"
      );
      expect(quickCaptureItem).toBeDefined();
      expect(quickCaptureItem?.category).toBe("Hành động nhanh");
      expect(quickCaptureItem?.title).toContain("Ghi Chú Nhanh (Quick Capture)");

      // Thực thi action
      quickCaptureItem?.action();
      expect(handleOpenQuickCapture).toHaveBeenCalledTimes(1);
    });
  });

  describe("3. QuickCaptureModal Component", () => {
    it("không hiển thị khi isOpen = false", () => {
      const { container } = render(
        <QuickCaptureModal
          isOpen={false}
          onClose={vi.fn()}
          onSave={vi.fn()}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it("tự động focus vào ô nhập liệu textarea khi mở modal", async () => {
      render(
        <QuickCaptureModal
          isOpen={true}
          onClose={vi.fn()}
          onSave={vi.fn()}
        />
      );

      const textarea = screen.getByRole("textbox");
      expect(textarea).toBeInTheDocument();
      await waitFor(() => {
        expect(document.activeElement).toBe(textarea);
      });
    });

    it("gọi onSave với canonical payload và đóng modal khi nhấn Cmd+Enter", async () => {
      const handleSave = vi.fn().mockResolvedValue(undefined);
      const handleClose = vi.fn();

      render(
        <QuickCaptureModal
          isOpen={true}
          onClose={handleClose}
          onSave={handleSave}
        />
      );

      const textarea = screen.getByRole("textbox");
      fireEvent.change(textarea, { target: { value: "Ý tưởng nghiên cứu sâu" } });

      // Nhấn Cmd+Enter
      fireEvent.keyDown(textarea, { key: "Enter", metaKey: true });

      await waitFor(() => {
        expect(handleSave).toHaveBeenCalledTimes(1);
        expect(handleSave).toHaveBeenCalledWith("Ý tưởng nghiên cứu sâu");
        expect(handleClose).toHaveBeenCalledTimes(1);
      });
    });

    it("gọi onSave và đóng modal khi click nút 'Lưu vào Inbox'", async () => {
      const handleSave = vi.fn().mockResolvedValue(undefined);
      const handleClose = vi.fn();

      render(
        <QuickCaptureModal
          isOpen={true}
          onClose={handleClose}
          onSave={handleSave}
        />
      );

      const textarea = screen.getByRole("textbox");
      fireEvent.change(textarea, { target: { value: "Trích đoạn ghi chép" } });

      const submitBtn = screen.getByRole("button", { name: /Lưu vào Inbox/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(handleSave).toHaveBeenCalledTimes(1);
        expect(handleSave).toHaveBeenCalledWith("Trích đoạn ghi chép");
        expect(handleClose).toHaveBeenCalledTimes(1);
      });
    });

    it("không submit nếu nội dung rỗng hoặc chỉ có khoảng trắng", async () => {
      const handleSave = vi.fn();
      render(
        <QuickCaptureModal
          isOpen={true}
          onClose={vi.fn()}
          onSave={handleSave}
        />
      );

      const submitBtn = screen.getByRole("button", { name: /Lưu vào Inbox/i });
      fireEvent.click(submitBtn);

      expect(handleSave).not.toHaveBeenCalled();
    });

    it("đóng modal ngay lập tức khi nhấn Escape", () => {
      const handleClose = vi.fn();
      render(
        <QuickCaptureModal
          isOpen={true}
          onClose={handleClose}
          onSave={vi.fn()}
        />
      );

      fireEvent.keyDown(window, { key: "Escape" });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it("Error Retention: khi onSave thất bại, không đóng modal và giữ nguyên nội dung", async () => {
      const handleSave = vi.fn().mockRejectedValue(new Error("Database connection lost"));
      const handleClose = vi.fn();

      render(
        <QuickCaptureModal
          isOpen={true}
          onClose={handleClose}
          onSave={handleSave}
        />
      );

      const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: "Bản nháp vô cùng giá trị" } });

      const submitBtn = screen.getByRole("button", { name: /Lưu vào Inbox/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(handleSave).toHaveBeenCalledTimes(1);
      });

      // Modal KHÔNG được gọi onClose
      expect(handleClose).not.toHaveBeenCalled();

      // Textarea vẫn giữ nguyên nội dung
      expect(textarea.value).toBe("Bản nháp vô cùng giá trị");

      // Có thông báo lỗi hiển thị
      expect(screen.getByText(/Database connection lost/i)).toBeInTheDocument();
    });
  });

  describe("4. Integration in App Shell", () => {
    beforeEach(() => {
      localStorage.clear();
      vi.clearAllMocks();
    });

    it("mở QuickCaptureModal khi ấn Cmd+N trong App và lưu thành công vào localStorage inbox", async () => {
      render(<App />);

      // Kích hoạt Cmd+N
      fireEvent.keyDown(window, { key: "n", metaKey: true });

      await waitFor(() => {
        expect(screen.getByText("Ghi Chú Chớp Nhoáng")).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText(/Ghi nhanh ý tưởng/i);
      fireEvent.change(textarea, { target: { value: "Ý tưởng toàn cục từ App" } });

      const saveBtn = screen.getByRole("button", { name: /Lưu vào Inbox/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(screen.queryByText("Ghi Chú Chớp Nhoáng")).not.toBeInTheDocument();
        const inboxRaw = localStorage.getItem(`${STORAGE_ROOT_KEY}_research_inbox`);
        expect(inboxRaw).toBeDefined();
        const items = JSON.parse(inboxRaw || "[]");
        expect(items.length).toBeGreaterThan(0);
        expect(items[0].excerpt.selectedText).toBe("Ý tưởng toàn cục từ App");
        expect(items[0].excerpt.archivedDocumentId).toBe("quick-capture");
        expect(items[0].excerpt.citationSnapshot.title).toBe("Ghi chú chớp nhoáng");
      });
    });

    it("mở QuickCaptureModal qua Command Palette action", async () => {
      render(<App />);

      // Mở Command Palette
      fireEvent.keyDown(window, { key: "k", metaKey: true });

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      const quickCaptureAction = screen.getByText("Ghi Chú Nhanh (Quick Capture)");
      expect(quickCaptureAction).toBeInTheDocument();

      fireEvent.click(quickCaptureAction);

      await waitFor(() => {
        expect(screen.getByText("Ghi Chú Chớp Nhoáng")).toBeInTheDocument();
      });
    });
  });
});
