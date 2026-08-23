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
      expect(handleNavigate).toHaveBeenCalledWith("abhidharma_matrix");
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
  });

  describe("ShortcutsModal Component", () => {
    it("Không hiển thị khi isOpen = false", () => {
      const { container } = render(
        <ShortcutsModal isOpen={false} onClose={vi.fn()} />,
      );
      expect(container.firstChild).toBeNull();
    });

    it("Hiển thị đầy đủ các danh mục phím tắt khi isOpen = true", () => {
      const handleClose = vi.fn();
      render(<ShortcutsModal isOpen={true} onClose={handleClose} />);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText(/Phím Tắt Hệ Thống/i)).toBeInTheDocument();
      expect(screen.getByText(/Thanh Lệnh Toàn Năng/i)).toBeInTheDocument();
      expect(screen.getByText(/Ma Trận Vi Diệu Pháp/i)).toBeInTheDocument();

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
