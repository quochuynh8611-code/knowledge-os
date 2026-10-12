/**
 * Test Suite: Phase M5a — MindMap Node Drawer Cross-Link Editing UI (Test-First)
 *
 * Mapped Specifications:
 * - Scenario: Add cross-link from drawer
 * - Scenario: Reject self-link
 * - Scenario: Reject duplicate edge
 * - Scenario: Reject cycle (temporary M5a policy)
 * - Scenario: Remove cross-link from drawer
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  MindMapNodeDrawer,
  MindMapDrawerNode,
} from "../../src/components/mindmap/MindMapNodeDrawer";
import { MindMapDocumentEdge } from "../../src/types/mindmapDocument";

describe("Phase M5a — MindMapNodeDrawer Cross-Link Editing UI", () => {
  const currentNode: MindMapDrawerNode = {
    id: "node-dukkha",
    title: "Khổ Đế",
    type: "topic",
    domain: "general",
    hopDistance: 1,
    tags: [],
    children: [],
  };

  const availableNodes = [
    { id: "node-root", title: "Tứ Diệu Đế" },
    { id: "node-dukkha", title: "Khổ Đế" },
    { id: "node-samudaya", title: "Tập Đế" },
    { id: "node-nirodha", title: "Diệt Đế" },
    { id: "node-magga", title: "Đạo Đế" },
  ];

  const existingCrossLinks: MindMapDocumentEdge[] = [
    {
      id: "edge-dukkha-to-samudaya",
      sourceNodeId: "node-dukkha",
      targetNodeId: "node-samudaya",
      edgeType: "related",
      label: "Quan hệ nhân quả",
    },
  ];

  const mockOnClose = vi.fn();
  const mockOnUpdateTitle = vi.fn();
  const mockOnAddCrossLink = vi.fn();
  const mockOnRemoveCrossLink = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Scenario 1: Renders cross-links section and lists connected links", () => {
    // Passes M5 crossLink props (currently not implemented in MindMapNodeDrawer)
    render(
      <MindMapNodeDrawer
        isOpen={true}
        onClose={mockOnClose}
        node={currentNode}
        onUpdateTitle={mockOnUpdateTitle}
        {...({
          crossLinks: existingCrossLinks,
          availableNodes,
          onAddCrossLink: mockOnAddCrossLink,
          onRemoveCrossLink: mockOnRemoveCrossLink,
        } as any)}
      />
    );

    // Should render cross-link management section
    expect(screen.getByTestId("mindmap-crosslinks-section")).toBeInTheDocument();

    // Should list existing edge
    expect(
      screen.getByTestId("crosslink-item-edge-dukkha-to-samudaya")
    ).toBeInTheDocument();
    expect(screen.getByText("Tập Đế")).toBeInTheDocument();
    expect(screen.getByText("Quan hệ nhân quả")).toBeInTheDocument();
  });

  it("Scenario 2: Adds a new cross-link from drawer form", () => {
    render(
      <MindMapNodeDrawer
        isOpen={true}
        onClose={mockOnClose}
        node={currentNode}
        onUpdateTitle={mockOnUpdateTitle}
        {...({
          crossLinks: [],
          availableNodes,
          onAddCrossLink: mockOnAddCrossLink,
          onRemoveCrossLink: mockOnRemoveCrossLink,
        } as any)}
      />
    );

    expect(screen.getByTestId("mindmap-crosslinks-section")).toBeInTheDocument();

    // Select target node
    const targetSelect = screen.getByTestId("crosslink-target-select");
    fireEvent.change(targetSelect, { target: { value: "node-nirodha" } });

    // Select edge type
    const typeSelect = screen.getByTestId("crosslink-type-select");
    fireEvent.change(typeSelect, { target: { value: "prerequisite" } });

    // Input label
    const labelInput = screen.getByTestId("crosslink-label-input");
    fireEvent.change(labelInput, { target: { value: "Mục tiêu hướng tới" } });

    // Click submit button
    const addBtn = screen.getByTestId("crosslink-add-btn");
    fireEvent.click(addBtn);

    expect(mockOnAddCrossLink).toHaveBeenCalledTimes(1);
    expect(mockOnAddCrossLink).toHaveBeenCalledWith({
      targetNodeId: "node-nirodha",
      edgeType: "prerequisite",
      label: "Mục tiêu hướng tới",
    });
  });

  it("Scenario 3: Rejects self-link (linking node to itself)", () => {
    render(
      <MindMapNodeDrawer
        isOpen={true}
        onClose={mockOnClose}
        node={currentNode}
        onUpdateTitle={mockOnUpdateTitle}
        {...({
          crossLinks: [],
          availableNodes,
          onAddCrossLink: mockOnAddCrossLink,
          onRemoveCrossLink: mockOnRemoveCrossLink,
        } as any)}
      />
    );

    expect(screen.getByTestId("mindmap-crosslinks-section")).toBeInTheDocument();

    // Target select either must not have current node as an option, or selecting it should trigger validation
    const targetSelect = screen.getByTestId("crosslink-target-select");
    const selfOption = withinTargetSelectHasSelf(targetSelect, currentNode.id);

    if (selfOption) {
      fireEvent.change(targetSelect, { target: { value: currentNode.id } });
      const addBtn = screen.getByTestId("crosslink-add-btn");
      fireEvent.click(addBtn);

      expect(screen.getByTestId("crosslink-error-message")).toBeInTheDocument();
      expect(mockOnAddCrossLink).not.toHaveBeenCalled();
    } else {
      // Option was filtered out from dropdown — valid rejection
      expect(selfOption).toBeFalsy();
    }
  });

  it("Scenario 4: Rejects duplicate edge with same target and type", () => {
    render(
      <MindMapNodeDrawer
        isOpen={true}
        onClose={mockOnClose}
        node={currentNode}
        onUpdateTitle={mockOnUpdateTitle}
        {...({
          crossLinks: existingCrossLinks,
          availableNodes,
          onAddCrossLink: mockOnAddCrossLink,
          onRemoveCrossLink: mockOnRemoveCrossLink,
        } as any)}
      />
    );

    expect(screen.getByTestId("mindmap-crosslinks-section")).toBeInTheDocument();

    // Attempt to add duplicate edge: same target "node-samudaya" and same type "related"
    const targetSelect = screen.getByTestId("crosslink-target-select");
    fireEvent.change(targetSelect, { target: { value: "node-samudaya" } });

    const typeSelect = screen.getByTestId("crosslink-type-select");
    fireEvent.change(typeSelect, { target: { value: "related" } });

    const addBtn = screen.getByTestId("crosslink-add-btn");
    fireEvent.click(addBtn);

    expect(screen.getByTestId("crosslink-error-message")).toBeInTheDocument();
    expect(mockOnAddCrossLink).not.toHaveBeenCalled();
  });

  it("Scenario 5: Rejects cycle in M5a policy", () => {
    // Current node is "node-dukkha" (child of "node-root"). Adding link to ancestor "node-root" forms a cycle
    render(
      <MindMapNodeDrawer
        isOpen={true}
        onClose={mockOnClose}
        node={currentNode}
        onUpdateTitle={mockOnUpdateTitle}
        {...({
          crossLinks: existingCrossLinks,
          availableNodes,
          onAddCrossLink: mockOnAddCrossLink,
          onRemoveCrossLink: mockOnRemoveCrossLink,
          treeRoot: {
            id: "node-root",
            children: [{ id: "node-dukkha", children: [] }],
          },
        } as any)}
      />
    );

    expect(screen.getByTestId("mindmap-crosslinks-section")).toBeInTheDocument();

    const targetSelect = screen.getByTestId("crosslink-target-select");
    fireEvent.change(targetSelect, { target: { value: "node-root" } });

    const addBtn = screen.getByTestId("crosslink-add-btn");
    fireEvent.click(addBtn);

    expect(screen.getByTestId("crosslink-error-message")).toBeInTheDocument();
    expect(mockOnAddCrossLink).not.toHaveBeenCalled();
  });

  it("Scenario 6: Removes cross-link from drawer", () => {
    render(
      <MindMapNodeDrawer
        isOpen={true}
        onClose={mockOnClose}
        node={currentNode}
        onUpdateTitle={mockOnUpdateTitle}
        {...({
          crossLinks: existingCrossLinks,
          availableNodes,
          onAddCrossLink: mockOnAddCrossLink,
          onRemoveCrossLink: mockOnRemoveCrossLink,
        } as any)}
      />
    );

    expect(screen.getByTestId("mindmap-crosslinks-section")).toBeInTheDocument();

    const removeBtn = screen.getByTestId(
      "crosslink-remove-btn-edge-dukkha-to-samudaya"
    );
    fireEvent.click(removeBtn);

    expect(mockOnRemoveCrossLink).toHaveBeenCalledTimes(1);
    expect(mockOnRemoveCrossLink).toHaveBeenCalledWith("edge-dukkha-to-samudaya");
  });
});

function withinTargetSelectHasSelf(selectEl: HTMLElement, selfId: string): boolean {
  const options = selectEl.querySelectorAll("option");
  for (let i = 0; i < options.length; i++) {
    if ((options[i] as HTMLOptionElement).value === selfId) {
      return true;
    }
  }
  return false;
}
