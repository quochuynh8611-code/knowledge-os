import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "../../src/App";
import { Navbar } from "../../src/components/layout/Navbar";
import { CommandPalette } from "../../src/components/search/CommandPalette";
import { DataProvider } from "../../src/context/DataContext";

describe("Phase P5.1: Command Palette Caller Wiring & Deterministic Ordering", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("1. Injected Deep Actions in App", () => {
    it("1.1. opens NotebookLM Studio modal when executed from Command Palette", async () => {
      render(<App />);

      // Open Command Palette via global event / shortcut or button
      fireEvent.keyDown(window, { key: "k", metaKey: true });

      // Find the NotebookLM Studio action item
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      const notebookLMItem = screen.getByText("Mở NotebookLM Studio");
      expect(notebookLMItem).toBeInTheDocument();

      // Execute action
      fireEvent.click(notebookLMItem);

      // Verify NotebookLM Studio modal appears
      await waitFor(() => {
        expect(
          screen.getByText(/Google NotebookLM Research Hub/i)
        ).toBeInTheDocument();
      });
    });

    it("1.2. opens Antigravity Handoff modal when executed from Command Palette", async () => {
      render(<App />);

      // Open Command Palette via global event / shortcut
      fireEvent.keyDown(window, { key: "k", metaKey: true });

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      const antigravityItem = screen.getByText("Chuẩn Bị Antigravity Handoff");
      expect(antigravityItem).toBeInTheDocument();

      // Execute action
      fireEvent.click(antigravityItem);

      // Verify Antigravity Handoff modal appears
      await waitFor(() => {
        expect(
          screen.getByText(/Antigravity AI Scholar Handoff Bundle/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe("2. Navbar Prop Callbacks for Modal Triggers", () => {
    it("2.1. invokes onOpenNotebookLMModal and onOpenAntigravityModal when Navbar buttons are clicked", () => {
      const handleOpenNotebookLM = vi.fn();
      const handleOpenAntigravity = vi.fn();

      render(
        <DataProvider>
          <Navbar
            onOpenNotebookLMModal={handleOpenNotebookLM}
            onOpenAntigravityModal={handleOpenAntigravity}
          />
        </DataProvider>
      );

      const notebookBtn = screen.getByTitle(/Đóng gói Google NotebookLM/i);
      fireEvent.click(notebookBtn);
      expect(handleOpenNotebookLM).toHaveBeenCalledTimes(1);

      const handoffBtn = screen.getByTitle(/Đóng gói Antigravity AI Handoff/i);
      fireEvent.click(handoffBtn);
      expect(handleOpenAntigravity).toHaveBeenCalledTimes(1);
    });
  });

  describe("3. Deterministic Category Ordering in CommandPalette UI", () => {
    it("3.1. renders categories in fixed priority order regardless of item insertion order", () => {
      const mockItems = [
        {
          id: "topic-1",
          title: "Chủ Đề A",
          description: "Mô tả chủ đề",
          category: "Chủ đề" as const,
          action: vi.fn(),
        },
        {
          id: "act-1",
          title: "Hành Động A",
          description: "Mô tả hành động",
          category: "Hành động nhanh" as const,
          action: vi.fn(),
        },
        {
          id: "nav-1",
          title: "Điều Hướng A",
          description: "Mô tả điều hướng",
          category: "Điều hướng" as const,
          action: vi.fn(),
        },
      ];

      const { container } = render(
        <CommandPalette
          isOpen={true}
          onClose={vi.fn()}
          query="A"
          onQueryChange={vi.fn()}
          items={mockItems}
          selectedIndex={0}
          onSelectIndex={vi.fn()}
          onExecuteItem={vi.fn()}
        />
      );

      // Extract all category headers rendered in the list
      const categoryHeaders = container.querySelectorAll(".uppercase.tracking-wider");
      const headerTexts = Array.from(categoryHeaders).map((el) => el.textContent?.trim());

      // Expected deterministic order: "Hành động nhanh" -> "Điều hướng" -> "Chủ đề"
      expect(headerTexts).toEqual(["Hành động nhanh", "Điều hướng", "Chủ đề"]);
    });
  });
});
