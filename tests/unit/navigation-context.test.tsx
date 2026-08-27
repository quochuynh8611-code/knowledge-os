import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import {
  NavigationProvider,
  useNavigation,
} from "../../src/context/NavigationContext";

function TestNavigationConsumer() {
  const {
    activeTab,
    selectedTopicId,
    searchQuery,
    selectedCategoryFilter,
    selectedTagFilter,
    setActiveTab,
    setSelectedTopicId,
    setSearchQuery,
    setSelectedCategoryFilter,
    setSelectedTagFilter,
    openTopicDetail,
  } = useNavigation();

  return (
    <div>
      <div data-testid="active-tab">{activeTab}</div>
      <div data-testid="selected-topic-id">{selectedTopicId ?? "null"}</div>
      <div data-testid="search-query">{searchQuery}</div>
      <div data-testid="category-filter">{selectedCategoryFilter ?? "null"}</div>
      <div data-testid="tag-filter">{selectedTagFilter ?? "null"}</div>

      <button onClick={() => setActiveTab("topics")}>Set Topics Tab</button>
      <button onClick={() => setSearchQuery("Bát Chánh Đạo")}>Set Query</button>
      <button onClick={() => setSelectedTopicId("topic-123")}>Set Topic</button>
      <button onClick={() => setSelectedCategoryFilter("cat-phat-hoc")}>
        Set Cat Filter
      </button>
      <button onClick={() => setSelectedTagFilter("tag-thiền")}>
        Set Tag Filter
      </button>
      <button onClick={() => openTopicDetail("topic-tu-niem-xu")}>
        Open Topic Detail
      </button>
    </div>
  );
}

describe("NavigationContext Contract", () => {
  it("1.1. Cung cấp các giá trị mặc định chuẩn xác khi khởi tạo", () => {
    render(
      <NavigationProvider>
        <TestNavigationConsumer />
      </NavigationProvider>
    );

    expect(screen.getByTestId("active-tab").textContent).toBe("dashboard");
    expect(screen.getByTestId("selected-topic-id").textContent).toBe("null");
    expect(screen.getByTestId("search-query").textContent).toBe("");
    expect(screen.getByTestId("category-filter").textContent).toBe("null");
    expect(screen.getByTestId("tag-filter").textContent).toBe("null");
  });

  it("1.2. Cập nhật state chính xác qua các setter actions", () => {
    render(
      <NavigationProvider>
        <TestNavigationConsumer />
      </NavigationProvider>
    );

    act(() => {
      screen.getByText("Set Topics Tab").click();
      screen.getByText("Set Query").click();
      screen.getByText("Set Cat Filter").click();
      screen.getByText("Set Tag Filter").click();
    });

    expect(screen.getByTestId("active-tab").textContent).toBe("topics");
    expect(screen.getByTestId("search-query").textContent).toBe("Bát Chánh Đạo");
    expect(screen.getByTestId("category-filter").textContent).toBe("cat-phat-hoc");
    expect(screen.getByTestId("tag-filter").textContent).toBe("tag-thiền");
  });

  it("1.3. openTopicDetail gán selectedTopicId và tự động chuyển activeTab = 'topics'", () => {
    render(
      <NavigationProvider>
        <TestNavigationConsumer />
      </NavigationProvider>
    );

    act(() => {
      screen.getByText("Open Topic Detail").click();
    });

    expect(screen.getByTestId("selected-topic-id").textContent).toBe(
      "topic-tu-niem-xu"
    );
    expect(screen.getByTestId("active-tab").textContent).toBe("topics");
  });

  it("1.4. Ném lỗi tường minh khi gọi useNavigation bên ngoài NavigationProvider", () => {
    function OrphanConsumer() {
      useNavigation();
      return <div>Orphan</div>;
    }

    // Suppress React error boundary console error in test
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<OrphanConsumer />)).toThrowError(
      /useNavigation must be used within a NavigationProvider/i
    );

    consoleError.mockRestore();
  });
});
