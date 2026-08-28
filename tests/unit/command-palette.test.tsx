import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
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
      expect(result.current.filteredItems[0].title).toContain("Ma trận phân tích");
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
        screen.getByPlaceholderText(/Tìm lệnh, chủ đề nghiên cứu/i),
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

  describe("Phase P5.0: Recent History & Injected Custom Deep Actions", () => {
    beforeEach(() => {
      localStorage.clear();
      vi.restoreAllMocks();
    });

    it("1. [P5.0] merges and executes customItems injected via the extension seam without owning modal state", () => {
      const handleOpenNotebookLM = vi.fn();
      const customItem = {
        id: "act-open-notebooklm",
        title: "Mở NotebookLM Studio",
        description: "Sinh bản đồ tri thức và podcast âm thanh",
        category: "Hành động nhanh" as const,
        keywords: ["notebooklm", "studio", "gemini", "ai"],
        action: handleOpenNotebookLM,
      };

      const { result } = renderHook(() =>
        useCommandPalette({
          customItems: [customItem],
        }),
      );

      act(() => {
        result.current.openPalette();
      });

      // Assert customItem is present in filteredItems
      const found = result.current.filteredItems.find(
        (it) => it.id === "act-open-notebooklm",
      );
      expect(found).toBeDefined();
      expect(found?.title).toBe("Mở NotebookLM Studio");

      // Execute custom item
      act(() => {
        result.current.executeItem(found!);
      });

      expect(handleOpenNotebookLM).toHaveBeenCalledTimes(1);
      expect(result.current.isOpen).toBe(false);
    });

    it("2. [P5.0] maintains an LRU rolling buffer of max 5 recent items with deduplication by id", () => {
      const { result } = renderHook(() => useCommandPalette());

      const itemsToExecute = result.current.filteredItems.slice(0, 6);
      expect(itemsToExecute.length).toBeGreaterThanOrEqual(6);

      // Execute 6 distinct items in sequence
      for (const item of itemsToExecute) {
        act(() => {
          result.current.executeItem(item);
        });
      }

      // Recent items should hold exactly 5 items, with the 6th executed item at index 0
      expect(result.current.recentItems).toBeDefined();
      expect(result.current.recentItems.length).toBe(5);
      expect(result.current.recentItems[0].id).toBe(itemsToExecute[5].id);

      // Re-execute an earlier item (itemsToExecute[2]) -> should dedupe and move to index 0
      act(() => {
        result.current.executeItem(itemsToExecute[2]);
      });

      expect(result.current.recentItems.length).toBe(5);
      expect(result.current.recentItems[0].id).toBe(itemsToExecute[2].id);
    });

    it("3. [P5.0] safely falls back to in-memory history when localStorage is unavailable or blocked", () => {
      // Mock localStorage.setItem to throw SecurityError
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("SecurityError: Storage access is denied");
      });

      const { result } = renderHook(() => useCommandPalette());

      const item = result.current.filteredItems[0];
      expect(() => {
        act(() => {
          result.current.executeItem(item);
        });
      }).not.toThrow();

      expect(result.current.recentItems).toBeDefined();
      expect(result.current.recentItems.length).toBe(1);
      expect(result.current.recentItems[0].id).toBe(item.id);
    });

    it("4. [P5.0] displays 'Gần đây' section when query is empty and hides it when query is non-empty", () => {
      const mockRecentItem = {
        id: "recent-1",
        title: "Chủ Đề Nghiên Cứu Gần Đây",
        description: "Mô tả gần đây",
        category: "Gần đây" as any,
        action: vi.fn(),
      };

      const mockStandardItem = {
        id: "std-1",
        title: "Tổng Quan",
        description: "Dashboard",
        category: "Điều hướng" as const,
        action: vi.fn(),
      };

      // 1. Empty query -> Render 'Gần đây' section
      const { rerender } = render(
        <CommandPalette
          isOpen={true}
          onClose={vi.fn()}
          query=""
          onQueryChange={vi.fn()}
          items={[mockRecentItem, mockStandardItem]}
          selectedIndex={0}
          onSelectIndex={vi.fn()}
          onExecuteItem={vi.fn()}
        />,
      );

      expect(screen.getByText("Gần đây")).toBeInTheDocument();
      expect(screen.getByText("Chủ Đề Nghiên Cứu Gần Đây")).toBeInTheDocument();

      // 2. Non-empty query -> 'Gần đây' section heading is hidden
      rerender(
        <CommandPalette
          isOpen={true}
          onClose={vi.fn()}
          query="Tổng"
          onQueryChange={vi.fn()}
          items={[mockStandardItem]}
          selectedIndex={0}
          onSelectIndex={vi.fn()}
          onExecuteItem={vi.fn()}
        />,
      );

      expect(screen.queryByText("Gần đây")).not.toBeInTheDocument();
      expect(screen.getByText("Tổng Quan")).toBeInTheDocument();
    });

    it("5. [P5.0] matches search queries against title, description, category, and keywords metadata", () => {
      const customItem = {
        id: "topic-bat-chanh-dao",
        title: "Bát Chánh Đạo",
        description: "Con đường tám nhánh đưa đến giải thoát",
        category: "Chủ đề" as const,
        keywords: ["bat-chanh-dao", "dao-de", "ariya-atthangika-magga"],
        action: vi.fn(),
      };

      const { result } = renderHook(() =>
        useCommandPalette({
          customItems: [customItem],
        }),
      );

      // Match via keyword slug
      act(() => {
        result.current.setQuery("bat-chanh-dao");
      });
      expect(result.current.filteredItems.some((it) => it.id === "topic-bat-chanh-dao")).toBe(true);

      // Match via keyword Pali
      act(() => {
        result.current.setQuery("atthangika");
      });
      expect(result.current.filteredItems.some((it) => it.id === "topic-bat-chanh-dao")).toBe(true);

      // Match via description
      act(() => {
        result.current.setQuery("tam nhanh");
      });
      expect(result.current.filteredItems.some((it) => it.id === "topic-bat-chanh-dao")).toBe(true);
    });

    it("6. [P5.0] restores recent items from stored string IDs and legacy object arrays with live action bindings", () => {
      const handleNavigate = vi.fn();

      // Seed localStorage with legacy object array + string id
      localStorage.setItem(
        "phat_hoc_recent_commands_v1",
        JSON.stringify([{ id: "nav-dashboard" }, "nav-topics"]),
      );

      const { result } = renderHook(() =>
        useCommandPalette({
          onNavigateTab: handleNavigate,
        }),
      );

      expect(result.current.recentItems.length).toBe(2);
      expect(result.current.recentItems[0].id).toBe("nav-dashboard");
      expect(result.current.recentItems[1].id).toBe("nav-topics");

      // Verify that executing restored recent item invokes live action
      act(() => {
        result.current.executeItem(result.current.recentItems[0]);
      });

      expect(handleNavigate).toHaveBeenCalledWith("dashboard");
    });
  });

  describe("Phase P5.2: Result Ranking, Deduplication & Relevance", () => {
    it("1. [P5.2] ranks exact title matches higher than description and keyword substring matches", () => {
      const customItem = {
        id: "nav-custom-graph",
        title: "Đồ Thị Mạng Lưới",
        description: "Xem tổng quan không gian nghiên cứu",
        category: "Điều hướng" as const,
        action: vi.fn(),
      };

      const { result } = renderHook(() =>
        useCommandPalette({
          customItems: [customItem],
        }),
      );

      act(() => {
        result.current.setQuery("tong quan");
      });

      // "Tổng quan" (exact title match, score 100) must rank before "Đồ Thị Mạng Lưới" (desc match, score 20)
      expect(result.current.filteredItems[0].id).toBe("nav-dashboard");
      expect(result.current.filteredItems[0].title).toBe("Tổng quan");
    });

    it("2. [P5.2] ranks title prefix matches higher than title substring matches", () => {
      const itemSub = {
        id: "item-substring",
        title: "Bản Đồ Tổng Quan Tri Thức",
        category: "Chủ đề" as const,
        action: vi.fn(),
      };
      const itemPre = {
        id: "item-prefix",
        title: "Tổng Quan Bản Đồ Tri Thức",
        category: "Chủ đề" as const,
        action: vi.fn(),
      };

      const { result } = renderHook(() =>
        useCommandPalette({
          // Injected with itemSub first to test non-trivial sorting
          customItems: [itemSub, itemPre],
        }),
      );

      act(() => {
        result.current.setQuery("tong quan");
      });

      const ids = result.current.filteredItems.map((it) => it.id);
      const idxPre = ids.indexOf("item-prefix");
      const idxSub = ids.indexOf("item-substring");

      // item-prefix (score 80) must rank before item-substring (score 60)
      expect(idxPre).toBeLessThan(idxSub);
    });

    it("3. [P5.2] overrides base item when custom item with matching ID is injected (deduplication)", () => {
      const overriddenThemeItem = {
        id: "act-toggle-theme",
        title: "Custom Theme Switcher Pro",
        description: "Giao diện tùy biến",
        category: "Hành động nhanh" as const,
        action: vi.fn(),
      };

      const { result } = renderHook(() =>
        useCommandPalette({
          customItems: [overriddenThemeItem],
        }),
      );

      const matchingItems = result.current.filteredItems.filter(
        (it) => it.id === "act-toggle-theme",
      );

      // Must deduplicate by id (exactly 1 item) and reflect the overridden title
      expect(matchingItems.length).toBe(1);
      expect(matchingItems[0].title).toBe("Custom Theme Switcher Pro");
    });

    it("4. [P5.2] applies recency boost during non-empty query to elevate recently used items among same-tier matches", () => {
      // Seed act-add-note in recent history
      localStorage.setItem(
        "phat_hoc_recent_commands_v1",
        JSON.stringify(["act-add-note"]),
      );

      const { result } = renderHook(() => useCommandPalette());

      act(() => {
        result.current.setQuery("them");
      });

      const ids = result.current.filteredItems.map((it) => it.id);
      const idxNote = ids.indexOf("act-add-note");
      const idxTopic = ids.indexOf("act-add-topic");

      // Both match prefix "Thêm..." (score 80), but act-add-note has +5 recency boost (score 85)
      expect(idxNote).toBeLessThan(idxTopic);
    });

    it("5. [P5.2] applies deterministic tie-break ordering (score desc -> category order -> original stable index)", () => {
      const itemAction = {
        id: "custom-act-test",
        title: "Khảo cứu chuyên sâu",
        category: "Hành động nhanh" as const,
        action: vi.fn(),
      };
      const itemNav = {
        id: "custom-nav-test",
        title: "Khảo cứu học thuật",
        category: "Điều hướng" as const,
        action: vi.fn(),
      };

      const { result } = renderHook(() =>
        useCommandPalette({
          // Injected with itemNav first
          customItems: [itemNav, itemAction],
        }),
      );

      act(() => {
        result.current.setQuery("khao cuu");
      });

      const ids = result.current.filteredItems.map((it) => it.id);
      const idxAct = ids.indexOf("custom-act-test");
      const idxNav = ids.indexOf("custom-nav-test");

      // Both match prefix (score 80). By category order, "Hành động nhanh" must precede "Điều hướng".
      expect(idxAct).toBeLessThan(idxNav);
    });
  });
});

