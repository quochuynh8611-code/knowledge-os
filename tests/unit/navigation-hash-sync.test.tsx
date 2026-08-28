import React from "react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { NavigationProvider, useNavigation } from "../../src/context/NavigationContext";

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
      <div data-testid="selected-topic">{selectedTopicId ?? "none"}</div>
      <div data-testid="search-query">{searchQuery}</div>
      <div data-testid="category-filter">{selectedCategoryFilter ?? "none"}</div>
      <div data-testid="tag-filter">{selectedTagFilter ?? "none"}</div>

      <button
        data-testid="btn-nav-graph"
        onClick={() => setActiveTab("graph")}
      >
        Go to Graph
      </button>

      <button
        data-testid="btn-open-topic"
        onClick={() => openTopicDetail("topic-abhidharma-tong-quan")}
      >
        Open Topic Detail
      </button>

      <button
        data-testid="btn-set-search"
        onClick={() => setSearchQuery("pháp số")}
      >
        Set Search
      </button>
    </div>
  );
}

describe("Phase P2.1 — Navigation Context Hash Synchronization Integration", () => {
  beforeEach(() => {
    window.location.hash = "";
  });

  afterEach(() => {
    window.location.hash = "";
  });

  it("1. hydrates initial navigation state from window.location.hash upon mount", () => {
    window.location.hash = "#/topics/topic-citta-1";

    render(
      <NavigationProvider>
        <TestNavigationConsumer />
      </NavigationProvider>
    );

    expect(screen.getByTestId("active-tab").textContent).toBe("topics");
    expect(screen.getByTestId("selected-topic").textContent).toBe("topic-citta-1");
  });

  it("2. updating activeTab synchronizes window.location.hash", async () => {
    render(
      <NavigationProvider>
        <TestNavigationConsumer />
      </NavigationProvider>
    );

    const btnGraph = screen.getByTestId("btn-nav-graph");

    await act(async () => {
      btnGraph.click();
    });

    expect(screen.getByTestId("active-tab").textContent).toBe("graph");
    expect(window.location.hash).toBe("#/graph");
  });

  it("3. openTopicDetail synchronizes topic deep-link hash #/topics/:topicId", async () => {
    render(
      <NavigationProvider>
        <TestNavigationConsumer />
      </NavigationProvider>
    );

    const btnOpen = screen.getByTestId("btn-open-topic");

    await act(async () => {
      btnOpen.click();
    });

    expect(screen.getByTestId("active-tab").textContent).toBe("topics");
    expect(screen.getByTestId("selected-topic").textContent).toBe("topic-abhidharma-tong-quan");
    expect(window.location.hash).toBe("#/topics/topic-abhidharma-tong-quan");
  });

  it("4. hashchange event updates NavigationContext state (browser back/forward)", async () => {
    render(
      <NavigationProvider>
        <TestNavigationConsumer />
      </NavigationProvider>
    );

    expect(screen.getByTestId("active-tab").textContent).toBe("dashboard");

    await act(async () => {
      window.location.hash = "#/ai_studio";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });

    expect(screen.getByTestId("active-tab").textContent).toBe("ai_studio");
  });

  it("5. invalid hashchange falls back safely to dashboard without error", async () => {
    render(
      <NavigationProvider>
        <TestNavigationConsumer />
      </NavigationProvider>
    );

    await act(async () => {
      window.location.hash = "#/invalid-unknown-route";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });

    expect(screen.getByTestId("active-tab").textContent).toBe("dashboard");
  });
});
