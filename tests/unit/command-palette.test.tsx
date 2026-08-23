import React from "react";
import { describe, it, expect, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  renderHook,
  act,
} from "@testing-library/react";
import { useCommandPalette } from "../../src/hooks/useCommandPalette";
import { CommandPalette } from "../../src/components/search/CommandPalette";

describe("Command Palette & useCommandPalette Hook (Phase 1B)", () => {
  describe("useCommandPalette Hook", () => {
    it("Khởi tạo trạng thái ban đầu đóng và cung cấp danh sách lệnh mặc định", () => {
      const { result } = renderHook(() => useCommandPalette());

      expect(result.current.isOpen).toBe(false);
      expect(result.current.query).toBe("");
      expect(result.current.filteredItems.length).toBeGreaterThan(5);

      act(() => {
        result.current.openPalette();
      });

      expect(result.current.isOpen).toBe(true);

      act(() => {
        result.current.closePalette();
      });

      expect(result.current.isOpen).toBe(false);
    });

    it("Lọc các mục lệnh chính xác theo từ khóa truy vấn", () => {
      const { result } = renderHook(() => useCommandPalette());

      act(() => {
        result.current.setQuery("Abhidharma");
      });

      expect(result.current.filteredItems.length).toBeGreaterThanOrEqual(1);
      expect(result.current.filteredItems[0].title).toContain("Vi Diệu Pháp");
    });

    it("Thực thi hành động và tự động đóng Command Palette", () => {
      const handleNavigate = vi.fn();
      const { result } = renderHook(() =>
        useCommandPalette({
          onNavigateTab: handleNavigate,
        }),
      );

      act(() => {
        result.current.openPalette();
      });

      const navDashboardItem = result.current.filteredItems.find(
        (it) => it.id === "nav-dashboard",
      );
      expect(navDashboardItem).toBeDefined();

      act(() => {
        if (navDashboardItem) {
          result.current.executeItem(navDashboardItem);
        }
      });

      expect(handleNavigate).toHaveBeenCalledWith("dashboard");
      expect(result.current.isOpen).toBe(false);
    });
  });

  describe("CommandPalette Component", () => {
    const mockItems = [
      {
        id: "1",
        title: "Tổng Quan",
        description: "Về trang dashboard",
        category: "Điều hướng" as const,
        action: vi.fn(),
      },
      {
        id: "2",
        title: "Tạo Chủ Đề",
        description: "Tạo chủ đề mới",
        category: "Hành động nhanh" as const,
        action: vi.fn(),
      },
    ];

    it("Không render khi isOpen = false", () => {
      const { container } = render(
        <CommandPalette
          isOpen={false}
          onClose={vi.fn()}
          query=""
          onQueryChange={vi.fn()}
          items={mockItems}
          selectedIndex={0}
          onSelectIndex={vi.fn()}
          onExecuteItem={vi.fn()}
        />,
      );
      expect(container.firstChild).toBeNull();
    });

    it("Render hộp thoại, ô tìm kiếm và danh sách kết quả khi isOpen = true", () => {
      const handleClose = vi.fn();
      const handleQueryChange = vi.fn();
      const handleExecute = vi.fn();

      render(
        <CommandPalette
          isOpen={true}
          onClose={handleClose}
          query=""
          onQueryChange={handleQueryChange}
          items={mockItems}
          selectedIndex={0}
          onSelectIndex={vi.fn()}
          onExecuteItem={handleExecute}
        />,
      );

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(/Tìm lệnh, chủ đề khảo cứu/i),
      ).toBeInTheDocument();
      expect(screen.getByText("Tổng Quan")).toBeInTheDocument();
      expect(screen.getByText("Tạo Chủ Đề")).toBeInTheDocument();

      // Click execute
      fireEvent.click(screen.getByText("Tổng Quan"));
      expect(handleExecute).toHaveBeenCalledWith(mockItems[0]);
    });

    it("Hiển thị thông báo khi không có kết quả khớp tìm kiếm", () => {
      render(
        <CommandPalette
          isOpen={true}
          onClose={vi.fn()}
          query="xyz123khongtontai"
          onQueryChange={vi.fn()}
          items={[]}
          selectedIndex={0}
          onSelectIndex={vi.fn()}
          onExecuteItem={vi.fn()}
        />,
      );

      expect(
        screen.getByText(/Không tìm thấy lệnh hoặc chủ đề nào khớp/i),
      ).toBeInTheDocument();
    });
  });
});
