/**
 * Unit Test Suite: Phase M8a — Multi-Edge Selection & Canvas Interactions
 *
 * Mapped Specifications (docs/specs/m8-multi-edge-selection-and-crosslink-batch-operations.md):
 * 1. Multi-edge selection bằng Shift/Cmd/Ctrl click
 * 2. Toggle deselect edge đã chọn qua modifier click
 * 3. Single selection (size === 1) => Mở M7 inspect popover
 * 4. Multi selection (size >= 2) => Ẩn M7 inspect popover
 * 5. Delete/Backspace xóa toàn bộ selected edges với 1 transaction nguyên tử
 * 6. Escape clear edge selection nhưng bảo toàn selectedNodeIds
 * 7. Disable edge selection khi isConnecting === true
 */

import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MindMapTreeCanvas } from "../../src/components/mindmap/MindMapTreeCanvas";
import { MindMapCrossLinksLayer } from "../../src/components/mindmap/MindMapCrossLinksLayer";
import { MindMapTreeNode, MindMapCrossEdge } from "../../src/lib/mindmapProjection";

describe("Phase M8a — Multi-Edge Selection & Canvas Interactions (Test-First)", () => {
  const SAMPLE_TREE: MindMapTreeNode = {
    id: "node-root",
    title: "Tứ Diệu Đế",
    type: "topic",
    domain: "phat-hoc",
    hopDistance: 0,
    tags: [],
    children: [
      {
        id: "node-1",
        title: "Khổ Đế",
        type: "topic",
        domain: "phat-hoc",
        hopDistance: 1,
        parentHopId: "node-root",
        tags: [],
        children: [],
      },
      {
        id: "node-2",
        title: "Tập Đế",
        type: "topic",
        domain: "phat-hoc",
        hopDistance: 1,
        parentHopId: "node-root",
        tags: [],
        children: [],
      },
      {
        id: "node-3",
        title: "Diệt Đế",
        type: "topic",
        domain: "phat-hoc",
        hopDistance: 1,
        parentHopId: "node-root",
        tags: [],
        children: [],
      },
    ],
  };

  const SAMPLE_CROSS_EDGES: MindMapCrossEdge[] = [
    {
      id: "edge-1-2",
      sourceNodeId: "node-1",
      sourceTitle: "Khổ Đế",
      targetNodeId: "node-2",
      targetTitle: "Tập Đế",
      type: "related",
      strength: 4,
      label: "Quan hệ 1-2",
      isCycle: false,
    },
    {
      id: "edge-2-3",
      sourceNodeId: "node-2",
      sourceTitle: "Tập Đế",
      targetNodeId: "node-3",
      targetTitle: "Diệt Đế",
      type: "prerequisite",
      strength: 3,
      label: "Quan hệ 2-3",
      isCycle: false,
    },
    {
      id: "edge-1-3",
      sourceNodeId: "node-1",
      sourceTitle: "Khổ Đế",
      targetNodeId: "node-3",
      targetTitle: "Diệt Đế",
      type: "advanced",
      strength: 2,
      label: "Quan hệ 1-3",
      isCycle: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. Multi-edge selection bằng Shift-click và Cmd/Ctrl-click", () => {
    const { container } = render(
      <MindMapTreeCanvas
        tree={SAMPLE_TREE}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
        crossEdges={SAMPLE_CROSS_EDGES}
        showCrossLinks={true}
        isEditable={true}
      />
    );

    const hit1 = screen.getByTestId("crosslink-hit-target-edge-1-2");
    const hit2 = screen.getByTestId("crosslink-hit-target-edge-2-3");
    const hit3 = screen.getByTestId("crosslink-hit-target-edge-1-3");

    // Click thường chọn edge 1
    fireEvent.click(hit1);
    expect(container.querySelector('[data-edge-id="edge-1-2"]')).toHaveAttribute(
      "data-edge-selected",
      "true"
    );
    expect(container.querySelector('[data-edge-id="edge-2-3"]')).not.toHaveAttribute(
      "data-edge-selected"
    );

    // Shift-click chọn thêm edge 2
    fireEvent.click(hit2, { shiftKey: true });
    expect(container.querySelector('[data-edge-id="edge-1-2"]')).toHaveAttribute(
      "data-edge-selected",
      "true"
    );
    expect(container.querySelector('[data-edge-id="edge-2-3"]')).toHaveAttribute(
      "data-edge-selected",
      "true"
    );
    expect(container.querySelector('[data-edge-id="edge-1-3"]')).not.toHaveAttribute(
      "data-edge-selected"
    );

    // Meta-click (Cmd) chọn thêm edge 3
    fireEvent.click(hit3, { metaKey: true });
    expect(container.querySelector('[data-edge-id="edge-1-2"]')).toHaveAttribute(
      "data-edge-selected",
      "true"
    );
    expect(container.querySelector('[data-edge-id="edge-2-3"]')).toHaveAttribute(
      "data-edge-selected",
      "true"
    );
    expect(container.querySelector('[data-edge-id="edge-1-3"]')).toHaveAttribute(
      "data-edge-selected",
      "true"
    );
  });

  it("2. Toggle deselect edge đã chọn khi Shift/Cmd click lại", () => {
    const { container } = render(
      <MindMapTreeCanvas
        tree={SAMPLE_TREE}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
        crossEdges={SAMPLE_CROSS_EDGES}
        showCrossLinks={true}
        isEditable={true}
      />
    );

    const hit1 = screen.getByTestId("crosslink-hit-target-edge-1-2");
    const hit2 = screen.getByTestId("crosslink-hit-target-edge-2-3");

    // Chọn edge 1 rồi shift-click chọn edge 2
    fireEvent.click(hit1);
    fireEvent.click(hit2, { shiftKey: true });

    expect(container.querySelector('[data-edge-id="edge-1-2"]')).toHaveAttribute(
      "data-edge-selected",
      "true"
    );
    expect(container.querySelector('[data-edge-id="edge-2-3"]')).toHaveAttribute(
      "data-edge-selected",
      "true"
    );

    // Shift-click lại vào edge 1 để bỏ chọn edge 1
    fireEvent.click(hit1, { shiftKey: true });

    expect(container.querySelector('[data-edge-id="edge-1-2"]')).not.toHaveAttribute(
      "data-edge-selected"
    );
    expect(container.querySelector('[data-edge-id="edge-2-3"]')).toHaveAttribute(
      "data-edge-selected",
      "true"
    );
  });

  it("3. Single selection (size === 1) mở M7 inspect popover tại cạnh được chọn", () => {
    render(
      <MindMapTreeCanvas
        tree={SAMPLE_TREE}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
        crossEdges={SAMPLE_CROSS_EDGES}
        showCrossLinks={true}
        isEditable={true}
      />
    );

    const hit1 = screen.getByTestId("crosslink-hit-target-edge-1-2");
    fireEvent.click(hit1);

    const popover = screen.getByTestId("crosslink-quick-actions");
    expect(popover).toBeInTheDocument();
    expect(within(popover).getByText("Khổ Đế")).toBeInTheDocument();
    expect(within(popover).getByText("Tập Đế")).toBeInTheDocument();
  });

  it("4. Multi selection (size >= 2) tự động ẩn M7 inspect popover", () => {
    render(
      <MindMapTreeCanvas
        tree={SAMPLE_TREE}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
        crossEdges={SAMPLE_CROSS_EDGES}
        showCrossLinks={true}
        isEditable={true}
      />
    );

    const hit1 = screen.getByTestId("crosslink-hit-target-edge-1-2");
    const hit2 = screen.getByTestId("crosslink-hit-target-edge-2-3");

    // Chọn 1 cạnh: popover mở
    fireEvent.click(hit1);
    expect(screen.getByTestId("crosslink-quick-actions")).toBeInTheDocument();

    // Shift-click chọn cạnh thứ 2: popover M7 phải đóng
    fireEvent.click(hit2, { shiftKey: true });
    expect(screen.queryByTestId("crosslink-quick-actions")).not.toBeInTheDocument();

    // Bỏ chọn cạnh thứ 2 để quay lại size === 1: popover phải mở lại
    fireEvent.click(hit2, { shiftKey: true });
    expect(screen.getByTestId("crosslink-quick-actions")).toBeInTheDocument();
  });

  it("5. Phím Delete/Backspace xóa toàn bộ selected edges trong 1 transaction nguyên tử", () => {
    const onDeleteCrossLink = vi.fn();

    render(
      <MindMapTreeCanvas
        tree={SAMPLE_TREE}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
        crossEdges={SAMPLE_CROSS_EDGES}
        showCrossLinks={true}
        isEditable={true}
        onDeleteCrossLink={onDeleteCrossLink}
      />
    );

    const hit1 = screen.getByTestId("crosslink-hit-target-edge-1-2");
    const hit2 = screen.getByTestId("crosslink-hit-target-edge-2-3");

    // Chọn 2 cạnh
    fireEvent.click(hit1);
    fireEvent.click(hit2, { shiftKey: true });

    // Nhấn phím Delete trên Canvas
    fireEvent.keyDown(window, { key: "Delete" });

    // onDeleteCrossLink được gọi 1 lần duy nhất với mảng chứa cả 2 IDs
    expect(onDeleteCrossLink).toHaveBeenCalledTimes(1);
    expect(onDeleteCrossLink).toHaveBeenCalledWith(["edge-1-2", "edge-2-3"]);
  });

  it("6. Phím Escape clear edge selection nhưng bảo toàn selectedNodeIds", () => {
    const onClearSelection = vi.fn();
    const selectedNodeIds = new Set(["node-1", "node-2"]);

    const { container } = render(
      <MindMapTreeCanvas
        tree={SAMPLE_TREE}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
        crossEdges={SAMPLE_CROSS_EDGES}
        showCrossLinks={true}
        isEditable={true}
        selectedNodeIds={selectedNodeIds}
        onClearSelection={onClearSelection}
      />
    );

    const hit1 = screen.getByTestId("crosslink-hit-target-edge-1-2");
    const hit2 = screen.getByTestId("crosslink-hit-target-edge-2-3");

    // Chọn 2 cạnh
    fireEvent.click(hit1);
    fireEvent.click(hit2, { shiftKey: true });

    expect(container.querySelector('[data-edge-id="edge-1-2"]')).toHaveAttribute(
      "data-edge-selected",
      "true"
    );
    expect(container.querySelector('[data-edge-id="edge-2-3"]')).toHaveAttribute(
      "data-edge-selected",
      "true"
    );

    // Nhấn phím Escape
    fireEvent.keyDown(window, { key: "Escape" });

    // Cả 2 cạnh phải bị hủy chọn
    expect(container.querySelector('[data-edge-id="edge-1-2"]')).not.toHaveAttribute(
      "data-edge-selected"
    );
    expect(container.querySelector('[data-edge-id="edge-2-3"]')).not.toHaveAttribute(
      "data-edge-selected"
    );

    // onClearSelection của Node KHÔNG được gọi (bảo toàn node selection)
    expect(onClearSelection).not.toHaveBeenCalled();
  });

  it("7. Disable edge selection khi isConnecting === true (M5b gesture safety)", () => {
    const containerDiv = document.createElement("div");
    const node1 = document.createElement("div");
    node1.setAttribute("data-node-id", "node-1");
    const node2 = document.createElement("div");
    node2.setAttribute("data-node-id", "node-2");
    containerDiv.appendChild(node1);
    containerDiv.appendChild(node2);
    document.body.appendChild(containerDiv);

    const onSelect = vi.fn();

    render(
      <MindMapCrossLinksLayer
        crossEdges={SAMPLE_CROSS_EDGES}
        containerRef={{ current: containerDiv }}
        isConnecting={true}
        onSelectEdge={onSelect}
      />
    );

    const hit1 = screen.getByTestId("crosslink-hit-target-edge-1-2");
    expect(hit1).toHaveClass("pointer-events-none");
    expect(hit1).toHaveStyle({ pointerEvents: "none" });

    fireEvent.click(hit1);
    expect(onSelect).not.toHaveBeenCalled();

    document.body.removeChild(containerDiv);
  });
});
