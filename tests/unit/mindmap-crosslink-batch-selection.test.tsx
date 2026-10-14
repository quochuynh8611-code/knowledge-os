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

describe("Phase M8a — Multi-Edge Selection & Canvas Interactions (Test-First)", () => {
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

describe("Phase M8b — Cross-Link Batch Action Bar (Test-First)", () => {

  it("1. Batch bar xuất hiện khi chọn >= 2 cạnh", () => {
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

    fireEvent.click(hit1);
    expect(screen.queryByTestId("crosslink-batch-action-bar")).toBeNull();

    fireEvent.click(hit2, { shiftKey: true });
    expect(screen.getByTestId("crosslink-batch-action-bar")).toBeInTheDocument();
  });

  it("2. Không xuất hiện khi chỉ chọn 1 cạnh hoặc 0 cạnh", () => {
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

    expect(screen.queryByTestId("crosslink-batch-action-bar")).toBeNull();

    const hit1 = screen.getByTestId("crosslink-hit-target-edge-1-2");
    fireEvent.click(hit1);
    expect(screen.queryByTestId("crosslink-batch-action-bar")).toBeNull();
  });

  it("3. Hiển thị đúng số lượng cạnh đã chọn", () => {
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
    const hit3 = screen.getByTestId("crosslink-hit-target-edge-1-3");

    fireEvent.click(hit1);
    fireEvent.click(hit2, { shiftKey: true });
    expect(screen.getByTestId("crosslink-batch-selection-count")).toHaveTextContent("Đã chọn 2 liên kết");

    fireEvent.click(hit3, { shiftKey: true });
    expect(screen.getByTestId("crosslink-batch-selection-count")).toHaveTextContent("Đã chọn 3 liên kết");
  });

  it("4. Nút clear selection xóa edge selection nhưng giữ node selection", () => {
    const onClearSelectionSpy = vi.fn();
    render(
      <MindMapTreeCanvas
        tree={SAMPLE_TREE}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
        crossEdges={SAMPLE_CROSS_EDGES}
        showCrossLinks={true}
        isEditable={true}
        selectedNodeIds={new Set(["node-1", "node-2"])}
        onClearSelection={onClearSelectionSpy}
      />
    );

    const hit1 = screen.getByTestId("crosslink-hit-target-edge-1-2");
    const hit2 = screen.getByTestId("crosslink-hit-target-edge-2-3");
    fireEvent.click(hit1);
    fireEvent.click(hit2, { shiftKey: true });

    expect(screen.getByTestId("crosslink-batch-action-bar")).toBeInTheDocument();

    const deselectBtn = screen.getByTestId("btn-crosslink-batch-deselect");
    fireEvent.click(deselectBtn);

    expect(screen.queryByTestId("crosslink-batch-action-bar")).toBeNull();
    expect(onClearSelectionSpy).not.toHaveBeenCalled();
  });

  it("5. Nút batch delete gọi đúng contract xóa hàng loạt", () => {
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
    fireEvent.click(hit1);
    fireEvent.click(hit2, { shiftKey: true });

    const deleteBtn = screen.getByTestId("btn-crosslink-batch-delete");
    fireEvent.click(deleteBtn);

    expect(onDeleteCrossLink).toHaveBeenCalledTimes(1);
    expect(onDeleteCrossLink).toHaveBeenCalledWith(
      expect.arrayContaining(["edge-1-2", "edge-2-3"])
    );
    expect(screen.queryByTestId("crosslink-batch-action-bar")).toBeNull();
  });

  it("6. Vertical Stacking Guard: Điều chỉnh vị trí không render đè chồng với node batch bar", () => {
    const { rerender } = render(
      <MindMapTreeCanvas
        tree={SAMPLE_TREE}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
        crossEdges={SAMPLE_CROSS_EDGES}
        showCrossLinks={true}
        isEditable={true}
        selectedNodeIds={new Set()}
      />
    );

    const hit1 = screen.getByTestId("crosslink-hit-target-edge-1-2");
    const hit2 = screen.getByTestId("crosslink-hit-target-edge-2-3");
    fireEvent.click(hit1);
    fireEvent.click(hit2, { shiftKey: true });

    const barDefault = screen.getByTestId("crosslink-batch-action-bar");
    expect(barDefault).toHaveAttribute("data-stacked", "false");
    expect(barDefault.className).toContain("bottom-6");

    rerender(
      <MindMapTreeCanvas
        tree={SAMPLE_TREE}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
        crossEdges={SAMPLE_CROSS_EDGES}
        showCrossLinks={true}
        isEditable={true}
        selectedNodeIds={new Set(["node-1", "node-2"])}
      />
    );

    const barStacked = screen.getByTestId("crosslink-batch-action-bar");
    expect(barStacked).toHaveAttribute("data-stacked", "true");
    expect(barStacked.className).toContain("bottom-20");
  });
});

describe("Phase M8c — Cross-Link Batch Type Mutation (Test-First)", () => {
  it("1. Batch type select chỉ xuất hiện khi >= 2 edges", () => {
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

    // Single edge selected -> No batch type select
    fireEvent.click(hit1);
    expect(screen.queryByTestId("crosslink-batch-type-select")).toBeNull();

    // Two edges selected -> Batch type select appears
    fireEvent.click(hit2, { shiftKey: true });
    expect(screen.getByTestId("crosslink-batch-type-select")).toBeInTheDocument();
  });

  it("2. Hiển thị đúng các LinkType hợp lệ và placeholder", () => {
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
    fireEvent.click(hit1);
    fireEvent.click(hit2, { shiftKey: true });

    const select = screen.getByTestId("crosslink-batch-type-select") as HTMLSelectElement;
    expect(select).toBeInTheDocument();

    const options = Array.from(select.options).map((o) => ({
      value: o.value,
      text: o.text,
      disabled: o.disabled,
    }));

    expect(options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: "", disabled: true }),
        expect.objectContaining({ value: "related", text: "Liên quan" }),
        expect.objectContaining({ value: "prerequisite", text: "Tiên quyết" }),
        expect.objectContaining({ value: "advanced", text: "Nâng cao" }),
        expect.objectContaining({ value: "contradicts", text: "Đối chiếu" }),
      ])
    );
  });

  it("3. Batch type select gọi callback onBatchUpdateCrossLinkType với mảng edgeIds và newType", () => {
    const onBatchUpdateCrossLinkType = vi.fn();
    render(
      <MindMapTreeCanvas
        tree={SAMPLE_TREE}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
        crossEdges={SAMPLE_CROSS_EDGES}
        showCrossLinks={true}
        isEditable={true}
        onBatchUpdateCrossLinkType={onBatchUpdateCrossLinkType}
      />
    );

    const hit1 = screen.getByTestId("crosslink-hit-target-edge-1-2");
    const hit2 = screen.getByTestId("crosslink-hit-target-edge-2-3");
    fireEvent.click(hit1);
    fireEvent.click(hit2, { shiftKey: true });

    const select = screen.getByTestId("crosslink-batch-type-select") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "prerequisite" } });

    expect(onBatchUpdateCrossLinkType).toHaveBeenCalledTimes(1);
    expect(onBatchUpdateCrossLinkType).toHaveBeenCalledWith(
      expect.arrayContaining(["edge-1-2", "edge-2-3"]),
      "prerequisite"
    );
  });
});
