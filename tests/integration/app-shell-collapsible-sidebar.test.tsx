import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DataProvider, useData } from "../../src/context/DataContext";
import { App } from "../../src/App";
import { AppSidebar } from "../../src/components/layout/AppSidebar";
import { AppShell } from "../../src/components/layout/AppShell";
import {
  getTabContainerPolicy,
  getTabContainerClass,
} from "../../src/components/layout/layoutPolicy";
import {
  useSidebarState,
  SIDEBAR_STORAGE_KEY,
} from "../../src/components/layout/useSidebarState";
import { renderHook, act } from "@testing-library/react";

describe("App Shell & Collapsible Sidebar Refactor", () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = "#/";
  });

  describe("1. Tab Layout Policy Engine", () => {
    it("phân loại đúng tab nhóm full: graph, mindmap, library", () => {
      expect(getTabContainerPolicy("graph")).toBe("full");
      expect(getTabContainerPolicy("mindmap")).toBe("full");
      expect(getTabContainerPolicy("library")).toBe("full");

      const graphClass = getTabContainerClass("graph");
      expect(graphClass).toContain("w-full");
      expect(graphClass).toContain("max-w-none");
    });

    it("phân loại đúng tab nhóm wide: dashboard, notes, resources, progress, search, ai_studio", () => {
      expect(getTabContainerPolicy("dashboard")).toBe("wide");
      expect(getTabContainerPolicy("notes")).toBe("wide");
      expect(getTabContainerPolicy("resources")).toBe("wide");
      expect(getTabContainerPolicy("progress")).toBe("wide");
      expect(getTabContainerPolicy("search")).toBe("wide");
      expect(getTabContainerPolicy("ai_studio")).toBe("wide");

      const wideClass = getTabContainerClass("notes");
      expect(wideClass).toContain("max-w-[1600px]");
    });

    it("phân loại đúng tab nhóm constrained: topics, flashcards", () => {
      expect(getTabContainerPolicy("topics")).toBe("constrained");
      expect(getTabContainerPolicy("flashcards")).toBe("constrained");

      const constrainedClass = getTabContainerClass("topics");
      expect(constrainedClass).toContain("max-w-5xl");
    });
  });

  describe("2. AppSidebar Collapsible Behavior", () => {
    it("hiển thị đầy đủ nhãn chữ ở trạng thái expanded mặc định", () => {
      render(
        <DataProvider>
          <AppSidebar />
        </DataProvider>
      );

      expect(screen.getByText("Khảo Cứu")).toBeInTheDocument();
      expect(screen.getByText("Thư Viện Sách")).toBeInTheDocument();
      expect(screen.getByText("Bản đồ tri thức")).toBeInTheDocument();
      expect(screen.getByText("Sơ đồ tư duy")).toBeInTheDocument();
      expect(screen.getByTestId("toggle-app-sidebar-btn")).toBeInTheDocument();
    });

    it("cho phép thu gọn (collapse) và mở rộng (expand) khi nhấn nút toggle", () => {
      render(
        <DataProvider>
          <AppSidebar />
        </DataProvider>
      );

      const toggleBtn = screen.getByTestId("toggle-app-sidebar-btn");
      const sidebarContainer = screen.getByTestId("app-sidebar-container");
      expect(sidebarContainer.className).toContain("w-64");

      // Click to collapse
      fireEvent.click(toggleBtn);
      expect(sidebarContainer.className).toContain("w-18");
      // Text label "Khảo Cứu" should no longer be rendered or hidden
      expect(screen.queryByText("Khảo Cứu")).not.toBeInTheDocument();

      // Click again to expand
      fireEvent.click(toggleBtn);
      expect(sidebarContainer.className).toContain("w-64");
      expect(screen.getByText("Khảo Cứu")).toBeInTheDocument();
    });

    it("ở trạng thái collapsed, các nút nav có title/aria-label làm tooltip", () => {
      render(
        <DataProvider>
          <AppSidebar initialCollapsed={true} />
        </DataProvider>
      );

      const libraryBtn = screen.getByRole("button", { name: /Thư Viện Sách/i });
      expect(libraryBtn).toBeInTheDocument();
      expect(libraryBtn).toHaveAttribute("title", "Thư Viện Sách");
    });
  });

  describe("3. App Shell Integration & Business Logic Preservation", () => {
    it("giữ nguyên mobile bottom navigation bar", () => {
      render(<App />);

      const mobileNav = screen.getByTestId("mobile-bottom-nav");
      expect(mobileNav).toBeInTheDocument();
      expect(mobileNav.className).toContain("md:hidden");
    });

    it("chuyển tab từ sidebar không bị mất trạng thái và render đúng màn hình", async () => {
      render(<App />);

      // Initially on dashboard
      expect(screen.getByText(/Tổng Quan Nghiên Cứu/i)).toBeInTheDocument();

      // Click "Ghi chú & Đúc kết" in sidebar
      const notesBtn = screen.getByRole("button", { name: /Ghi chú & Đúc kết/i });
      fireEvent.click(notesBtn);

      await waitFor(() => {
        expect(screen.getByText(/Quản Lý Ghi Chú/i)).toBeInTheDocument();
      });
    });

    it("thu gọn / mở rộng sidebar không làm reset activeTab", async () => {
      render(<App />);

      // Navigate to notes
      const notesBtn = screen.getByRole("button", { name: /Ghi chú & Đúc kết/i });
      fireEvent.click(notesBtn);

      await waitFor(() => {
        expect(screen.getByText(/Quản Lý Ghi Chú/i)).toBeInTheDocument();
      });

      // Toggle sidebar collapse
      const toggleBtn = screen.getByTestId("toggle-app-sidebar-btn");
      fireEvent.click(toggleBtn);

      // Still on notes tab!
      expect(screen.getByText(/Quản Lý Ghi Chú/i)).toBeInTheDocument();

      // Toggle back
      fireEvent.click(toggleBtn);
      expect(screen.getByText(/Quản Lý Ghi Chú/i)).toBeInTheDocument();
    });

    it("chuyển sang tab topics reset selectedTopicId như logic cũ", async () => {
      function TestWrapper() {
        const { selectedTopicId, openTopicDetail, activeTab } = useData();
        return (
          <div>
            <div data-testid="test-active-tab">{activeTab}</div>
            <div data-testid="test-selected-topic">{selectedTopicId || "none"}</div>
            <button
              data-testid="set-topic-btn"
              onClick={() => openTopicDetail("topic-123")}
            >
              Set Topic
            </button>
            <AppSidebar />
          </div>
        );
      }

      render(
        <DataProvider>
          <TestWrapper />
        </DataProvider>
      );

      // Open a topic detail first
      fireEvent.click(screen.getByTestId("set-topic-btn"));
      expect(screen.getByTestId("test-selected-topic").textContent).toBe("topic-123");
      expect(screen.getByTestId("test-active-tab").textContent).toBe("topics");

      // Switch to dashboard
      const dashBtn = screen.getByRole("button", { name: /Tổng quan/i });
      fireEvent.click(dashBtn);
      expect(screen.getByTestId("test-active-tab").textContent).toBe("dashboard");

      // Switch back to topics from dashboard via sidebar
      const topicsBtn = screen.getByRole("button", { name: /Chủ đề học/i });
      fireEvent.click(topicsBtn);

      // Should be reset to null!
      expect(screen.getByTestId("test-selected-topic").textContent).toBe("none");
      expect(screen.getByTestId("test-active-tab").textContent).toBe("topics");
    });

    it("container ở shell level không còn bị ép cứng max-w-7xl cho non-library tabs", () => {
      const { container } = render(<App />);

      const mainStage = container.querySelector("main");
      expect(mainStage).toBeInTheDocument();
      expect(mainStage?.className).toContain("min-w-0");

      // The shell outer wrapper should not have rigid max-w-7xl
      const shellOuter = screen.getByTestId("app-shell-main-container");
      expect(shellOuter.className).not.toContain("max-w-7xl");
    });
  });

  describe("4. useSidebarState Storage Resilience", () => {
    it("khôi phục chính xác trạng thái collapsed từ localStorage khi lưu 'true'", () => {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, "true");
      const { result } = renderHook(() => useSidebarState());
      expect(result.current.isCollapsed).toBe(true);
    });

    it("an toàn bỏ qua giá trị lưu trữ không hợp lệ hoặc bị hỏng, mặc định về false", () => {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, "corrupted_json_or_garbage");
      const { result } = renderHook(() => useSidebarState());
      expect(result.current.isCollapsed).toBe(false);
    });

    it("hoạt động mượt mà bằng in-memory fallback nếu localStorage bị chặn hoặc throw SecurityError", () => {
      const originalGetItem = Storage.prototype.getItem;
      const originalSetItem = Storage.prototype.setItem;

      // Giả lập trình duyệt chặn storage (SecurityError trong sandbox/private window)
      Storage.prototype.getItem = () => {
        throw new DOMException("The operation is insecure.", "SecurityError");
      };
      Storage.prototype.setItem = () => {
        throw new DOMException("Quota exceeded or blocked", "QuotaExceededError");
      };

      try {
        const { result } = renderHook(() => useSidebarState());
        expect(result.current.isCollapsed).toBe(false);

        // Toggle in-memory vẫn hoạt động bình thường, không gây sập ứng dụng
        act(() => {
          result.current.toggleCollapse();
        });
        expect(result.current.isCollapsed).toBe(true);

        act(() => {
          result.current.setCollapsed(false);
        });
        expect(result.current.isCollapsed).toBe(false);
      } finally {
        Storage.prototype.getItem = originalGetItem;
        Storage.prototype.setItem = originalSetItem;
      }
    });
  });
});

