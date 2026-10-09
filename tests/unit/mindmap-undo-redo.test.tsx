/**
 * UI Integration Test Suite: Mind Map Canvas Undo / Redo (Phase P5)
 *
 * Verifies:
 * 1. Toolbar Undo and Redo buttons rendered and their disabled/enabled state.
 * 2. Mutation enables Undo button; clicking Undo reverts tree and enables Redo.
 * 3. Clicking Redo re-applies tree mutation.
 * 4. Keyboard shortcuts Cmd+Z / Ctrl+Z for Undo and Cmd+Shift+Z / Ctrl+Shift+Z / Ctrl+Y for Redo.
 * 5. Input isolation: Cmd+Z / Ctrl+Z inside text inputs or search does not trigger canvas undo.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MindMapView } from "../../src/components/mindmap/MindMapView";
import * as mindmapDocumentStorage from "../../src/lib/mindmapDocumentStorage";
import { MindMapDocumentNode } from "../../src/types/mindmapDocument";

const mockOpenTopicDetail = vi.fn();

vi.mock("../../src/context/DataContext", () => ({
  useData: () => ({
    topics: [
      {
        id: "topic-1",
        title: "Chủ đề 1",
        visibility: "visible",
        parentId: null,
      },
    ],
    notes: [],
    resources: [],
    selectedTopicId: "topic-1",
    openTopicDetail: mockOpenTopicDetail,
  }),
}));

describe("Mind Map Canvas Undo/Redo Component Integration (Phase P5)", () => {
  const mockSavedDocTree: MindMapDocumentNode = {
    id: "doc-root",
    title: "Document Root",
    nodeType: "topic",
    children: [
      {
        id: "doc-child-1",
        title: "Child 1",
        nodeType: "note",
        children: [],
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(mindmapDocumentStorage, "listMindMapDocuments").mockReturnValue([
      {
        id: "doc-123",
        title: "Test Saved Doc",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        tags: [],
        currentVersionNumber: 1,
        totalVersionsCount: 1,
        isArchived: false,
      },
    ]);

    vi.spyOn(mindmapDocumentStorage, "getMindMapDocumentSummary").mockReturnValue({
      id: "doc-123",
      title: "Test Saved Doc",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      tags: [],
      currentVersionNumber: 1,
      totalVersionsCount: 1,
      isArchived: false,
    });

    vi.spyOn(mindmapDocumentStorage, "getMindMapVersion").mockReturnValue({
      id: "ver-1",
      documentId: "doc-123",
      versionNumber: 1,
      createdAt: "2026-01-01T00:00:00Z",
      treeData: mockSavedDocTree,
      crossLinks: [],
      viewState: {
        layoutMode: "tree_horizontal",
        collapsedNodeIds: [],
        showCrossLinks: false,
      },
    });
  });

  it("1. Renders Undo and Redo toolbar buttons in saved-document mode with initial disabled state", () => {
    render(<MindMapView />);

    // Switch to saved document mode via Document Browser or direct button
    const openDocBtn = screen.getByTestId("btn-open-mindmap-browser");
    fireEvent.click(openDocBtn);

    const docItem = screen.getByText("Test Saved Doc");
    fireEvent.click(docItem);

    const undoBtn = screen.getByTestId("mindmap-undo-button");
    const redoBtn = screen.getByTestId("mindmap-redo-button");

    expect(undoBtn).toBeInTheDocument();
    expect(redoBtn).toBeInTheDocument();
    expect(undoBtn).toBeDisabled();
    expect(redoBtn).toBeDisabled();
  });

  it("2. Enables Undo after mutation, reverts on click, and enables Redo", () => {
    render(<MindMapView />);

    // Open saved doc
    fireEvent.click(screen.getByTestId("btn-open-mindmap-browser"));
    fireEvent.click(screen.getByText("Test Saved Doc"));

    const undoBtn = screen.getByTestId("mindmap-undo-button");
    const redoBtn = screen.getByTestId("mindmap-redo-button");

    // Add a child node
    fireEvent.click(screen.getByTestId("btn-add-child-doc-root"));

    expect(undoBtn).not.toBeDisabled();
    expect(redoBtn).toBeDisabled();

    // Click Undo
    fireEvent.click(undoBtn);
    expect(undoBtn).toBeDisabled();
    expect(redoBtn).not.toBeDisabled();

    // Click Redo
    fireEvent.click(redoBtn);
    expect(undoBtn).not.toBeDisabled();
    expect(redoBtn).toBeDisabled();
  });

  it("3. Handles keyboard shortcuts Cmd+Z / Ctrl+Z and Cmd+Shift+Z / Ctrl+Y", () => {
    render(<MindMapView />);

    fireEvent.click(screen.getByTestId("btn-open-mindmap-browser"));
    fireEvent.click(screen.getByText("Test Saved Doc"));

    const undoBtn = screen.getByTestId("mindmap-undo-button");
    const redoBtn = screen.getByTestId("mindmap-redo-button");

    // Perform mutation
    fireEvent.click(screen.getByTestId("btn-add-child-doc-root"));
    expect(undoBtn).not.toBeDisabled();

    // Trigger Cmd+Z on window
    fireEvent.keyDown(window, { key: "z", metaKey: true });
    expect(undoBtn).toBeDisabled();
    expect(redoBtn).not.toBeDisabled();

    // Trigger Cmd+Shift+Z on window
    fireEvent.keyDown(window, { key: "z", metaKey: true, shiftKey: true });
    expect(undoBtn).not.toBeDisabled();
    expect(redoBtn).toBeDisabled();

    // Trigger Ctrl+Z
    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    expect(undoBtn).toBeDisabled();
    expect(redoBtn).not.toBeDisabled();

    // Trigger Ctrl+Y
    fireEvent.keyDown(window, { key: "y", ctrlKey: true });
    expect(undoBtn).not.toBeDisabled();
    expect(redoBtn).toBeDisabled();
  });

  it("4. Does not trigger canvas undo when Cmd+Z / Ctrl+Z is pressed inside search input", () => {
    render(<MindMapView />);

    fireEvent.click(screen.getByTestId("btn-open-mindmap-browser"));
    fireEvent.click(screen.getByText("Test Saved Doc"));

    const undoBtn = screen.getByTestId("mindmap-undo-button");

    // Perform mutation
    fireEvent.click(screen.getByTestId("btn-add-child-doc-root"));
    expect(undoBtn).not.toBeDisabled();

    // Focus on search input and press Ctrl+Z
    const searchInput = screen.getByPlaceholderText("Tìm nút trong sơ đồ...");
    fireEvent.focus(searchInput);
    fireEvent.keyDown(searchInput, { key: "z", ctrlKey: true });

    // Canvas undo should NOT have fired
    expect(undoBtn).not.toBeDisabled();
  });
});
