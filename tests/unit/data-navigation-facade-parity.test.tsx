import React, { useRef } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { DataProvider, useData, useDomainData } from "../../src/context/DataContext";
import { useNavigation } from "../../src/context/NavigationContext";

function FacadeConsumer() {
  const {
    activeTab,
    searchQuery,
    selectedTopicId,
    setActiveTab,
    setSearchQuery,
    openTopicDetail,
  } = useData();

  return (
    <div>
      <div data-testid="facade-active-tab">{activeTab}</div>
      <div data-testid="facade-search-query">{searchQuery}</div>
      <div data-testid="facade-selected-topic">{selectedTopicId ?? "null"}</div>
      <button onClick={() => setActiveTab("graph")}>Facade Set Graph</button>
      <button onClick={() => setSearchQuery("Duy Thức")}>Facade Set Query</button>
      <button onClick={() => openTopicDetail("topic-456")}>
        Facade Open Topic
      </button>
    </div>
  );
}

function DirectNavigationConsumer() {
  const { activeTab, searchQuery, setActiveTab, setSearchQuery } = useNavigation();

  return (
    <div>
      <div data-testid="direct-active-tab">{activeTab}</div>
      <div data-testid="direct-search-query">{searchQuery}</div>
      <button onClick={() => setActiveTab("notes")}>Direct Set Notes</button>
      <button onClick={() => setSearchQuery("A-tì-đàm")}>Direct Set Query</button>
    </div>
  );
}

function PureDataConsumer({ renderSpy }: { renderSpy: () => void }) {
  const { categories } = useDomainData();
  renderSpy();

  return (
    <div>
      <div data-testid="pure-data-count">{categories.length}</div>
    </div>
  );
}

function NavigationSubscriber({ renderSpy }: { renderSpy: () => void }) {
  const { searchQuery, setSearchQuery } = useNavigation();
  renderSpy();

  return (
    <div>
      <div data-testid="nav-sub-query">{searchQuery}</div>
      <button onClick={() => setSearchQuery("New Search Value")}>
        Update Search
      </button>
    </div>
  );
}

describe("Data & Navigation Facade Parity and Isolation", () => {
  it("2.1. Đảm bảo đồng bộ hai chiều mượt mà giữa useData và useNavigation", () => {
    render(
      <DataProvider>
        <FacadeConsumer />
        <DirectNavigationConsumer />
      </DataProvider>
    );

    // Initial state matching
    expect(screen.getByTestId("facade-active-tab").textContent).toBe("dashboard");
    expect(screen.getByTestId("direct-active-tab").textContent).toBe("dashboard");

    // 1. Cập nhật qua Facade (useData) -> Direct (useNavigation) nhận giá trị mới
    act(() => {
      screen.getByText("Facade Set Graph").click();
      screen.getByText("Facade Set Query").click();
    });

    expect(screen.getByTestId("facade-active-tab").textContent).toBe("graph");
    expect(screen.getByTestId("direct-active-tab").textContent).toBe("graph");
    expect(screen.getByTestId("facade-search-query").textContent).toBe("Duy Thức");
    expect(screen.getByTestId("direct-search-query").textContent).toBe("Duy Thức");

    // 2. Cập nhật qua Direct (useNavigation) -> Facade (useData) nhận giá trị mới
    act(() => {
      screen.getByText("Direct Set Notes").click();
      screen.getByText("Direct Set Query").click();
    });

    expect(screen.getByTestId("facade-active-tab").textContent).toBe("notes");
    expect(screen.getByTestId("direct-active-tab").textContent).toBe("notes");
    expect(screen.getByTestId("facade-search-query").textContent).toBe("A-tì-đàm");
    expect(screen.getByTestId("direct-search-query").textContent).toBe("A-tì-đàm");

    // 3. Facade openTopicDetail
    act(() => {
      screen.getByText("Facade Open Topic").click();
    });

    expect(screen.getByTestId("facade-selected-topic").textContent).toBe("topic-456");
    expect(screen.getByTestId("facade-active-tab").textContent).toBe("topics");
    expect(screen.getByTestId("direct-active-tab").textContent).toBe("topics");
  });

  it("2.2. Render Isolation: Component chỉ subscribe DomainData KHÔNG bị re-render khi gõ searchQuery", () => {
    const dataRenderSpy = vi.fn();
    const navRenderSpy = vi.fn();

    render(
      <DataProvider>
        <PureDataConsumer renderSpy={dataRenderSpy} />
        <NavigationSubscriber renderSpy={navRenderSpy} />
      </DataProvider>
    );

    // Render count lần đầu
    expect(dataRenderSpy).toHaveBeenCalledTimes(1);
    expect(navRenderSpy).toHaveBeenCalledTimes(1);

    // Cập nhật searchQuery qua Navigation
    act(() => {
      screen.getByText("Update Search").click();
    });

    // Navigation subscriber phải re-render
    expect(navRenderSpy).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("nav-sub-query").textContent).toBe("New Search Value");

    // Pure Data subscriber KHÔNG ĐƯỢC re-render
    expect(dataRenderSpy).toHaveBeenCalledTimes(1);
  });
});
