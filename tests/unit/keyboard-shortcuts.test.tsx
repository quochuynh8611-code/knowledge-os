import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, renderHook } from "@testing-library/react";
import { useKeyboardShortcuts } from "../../src/hooks/useKeyboardShortcuts";
import { ShortcutsModal } from "../../src/components/modals/ShortcutsModal";

describe("Keyboard Shortcuts & ShortcutsModal (Phase 1B)", () => {
  describe("useKeyboardShortcuts Hook", () => {
    it("Kích hoạt onOpenCommandPalette khi nhấn Ctrl+K hoặc Cmd+K", () => {
      const handleOpenPalette = vi.fn();
      renderHook(() =>
        useKeyboardShortcuts({
          onOpenCommandPalette: handleOpenPalette,
        }),
      );

      // Trigger Ctrl+K
      fireEvent.keyDown(window, { key: "k", ctrlKey: true });
      expect(handleOpenPalette).toHaveBeenCalledTimes(1);

      // Trigger Cmd+K
      fireEvent.keyDown(window, { key: "k", metaKey: true });
      expect(handleOpenPalette).toHaveBeenCalledTimes(2);
    });

    it("Kích hoạt onOpenShortcutsModal khi nhấn phím ? (Shift + /)", () => {
      const handleOpenShortcuts = vi.fn();
      renderHook(() =>
        useKeyboardShortcuts({
          onOpenShortcutsModal: handleOpenShortcuts,
        }),
      );

      fireEvent.keyDown(window, { key: "?" });
      expect(handleOpenShortcuts).toHaveBeenCalledTimes(1);
    });

    it("Kích hoạt onNavigateTab khi nhấn phím số 1-7", () => {
      const handleNavigate = vi.fn();
      renderHook(() =>
        useKeyboardShortcuts({
          onNavigateTab: handleNavigate,
        }),
      );

      fireEvent.keyDown(window, { key: "1" });
      expect(handleNavigate).toHaveBeenCalledWith("dashboard");

      fireEvent.keyDown(window, { key: "3" });
      expect(handleNavigate).toHaveBeenCalledWith("flashcards");
    });

    it("Không kích hoạt phím số đơn lẻ khi đang nhập liệu trong ô input", () => {
      const handleNavigate = vi.fn();
      renderHook(() =>
        useKeyboardShortcuts({
          onNavigateTab: handleNavigate,
        }),
      );

      const input = document.createElement("input");
      document.body.appendChild(input);
      input.focus();

      fireEvent.keyDown(input, { key: "1" });
      expect(handleNavigate).not.toHaveBeenCalled();

      document.body.removeChild(input);
    });
    it("Kích hoạt onOpenQuickCapture khi nhấn Ctrl+N hoặc Cmd+N", () => {
      const handleOpenCapture = vi.fn();
      renderHook(() =>
        useKeyboardShortcuts({
          onOpenQuickCapture: handleOpenCapture,
        }),
      );

      fireEvent.keyDown(window, { key: "n", ctrlKey: true });
      expect(handleOpenCapture).toHaveBeenCalledTimes(1);

      fireEvent.keyDown(window, { key: "n", metaKey: true });
      expect(handleOpenCapture).toHaveBeenCalledTimes(2);
    });

    it("Kích hoạt onCloseModals khi nhấn phím Escape", () => {
      const handleCloseModals = vi.fn();
      renderHook(() =>
        useKeyboardShortcuts({
          onCloseModals: handleCloseModals,
        }),
      );

      fireEvent.keyDown(window, { key: "Escape" });
      expect(handleCloseModals).toHaveBeenCalledTimes(1);
    });

    it("Chặn phím 1-4 nhưng vẫn cho phép 5-7 khi flashcard_review scope đang kích hoạt", async () => {
      const { shortcutScope } = await import("../../src/lib/shortcutScope");
      shortcutScope.reset();
      const unregister = shortcutScope.pushScope("flashcard_review");

      const handleNavigate = vi.fn();
      renderHook(() =>
        useKeyboardShortcuts({
          onNavigateTab: handleNavigate,
        }),
      );

      // 1-4 bị chặn
      fireEvent.keyDown(window, { key: "1" });
      fireEvent.keyDown(window, { key: "2" });
      fireEvent.keyDown(window, { key: "3" });
      fireEvent.keyDown(window, { key: "4" });
      expect(handleNavigate).not.toHaveBeenCalled();

      // 5-7 vẫn hoạt động bình thường
      fireEvent.keyDown(window, { key: "5" });
      expect(handleNavigate).toHaveBeenCalledWith("resources");

      fireEvent.keyDown(window, { key: "6" });
      expect(handleNavigate).toHaveBeenCalledWith("graph");

      fireEvent.keyDown(window, { key: "7" });
      expect(handleNavigate).toHaveBeenCalledWith("library");

      unregister();
      shortcutScope.reset();
    });
  });

  describe("ShortcutsModal Component", () => {
    it("Không hiển thị khi isOpen = false", () => {
      const { container } = render(
        <ShortcutsModal isOpen={false} onClose={vi.fn()} />,
      );
      expect(container.firstChild).toBeNull();
    });

    it("Hiển thị đầy đủ các danh mục phím tắt từ registry khi isOpen = true", () => {
      const handleClose = vi.fn();
      render(<ShortcutsModal isOpen={true} onClose={handleClose} />);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText(/Phím Tắt Hệ Thống/i)).toBeInTheDocument();

      // Kiểm tra sự hiện diện của các nhóm phím từ registry
      expect(screen.getByText(/Thao Tác Nhanh & Tìm Kiếm/i)).toBeInTheDocument();
      expect(screen.getByText(/Chuyển Đổi Danh Mục Nhanh/i)).toBeInTheDocument();
      expect(screen.getByText(/Không Gian Ôn Tập Thẻ Nhớ/i)).toBeInTheDocument();
      expect(screen.getByText(/Sơ Đồ Tư Duy/i)).toBeInTheDocument();

      // Kiểm tra phím thao tác cụ thể
      expect(screen.getByText(/Thanh Lệnh Toàn Năng/i)).toBeInTheDocument();
      expect(screen.getByText(/Ghi chú nhanh vào Inbox/i)).toBeInTheDocument();
      expect(screen.getByText(/Lật mặt trước \/ sau thẻ nhớ/i)).toBeInTheDocument();
      expect(screen.getByText(/Thêm nhánh con/i)).toBeInTheDocument();

      // Close on button click
      const closeBtn = screen.getByLabelText(/Đóng bảng phím tắt/i);
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it("Đóng modal khi nhấn phím Escape", () => {
      const handleClose = vi.fn();
      render(<ShortcutsModal isOpen={true} onClose={handleClose} />);

      fireEvent.keyDown(window, { key: "Escape" });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });
});
