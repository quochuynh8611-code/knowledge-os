/**
 * Unit Test Suite: Phase M7a — Mind Map On-Canvas Cross-Link Inspection & Quick Delete
 *
 * Mapped Specifications:
 * - On-canvas cross-link selection via hit-target
 * - Midpoint floating inspect popover (source, target, relation badge, label)
 * - Quick delete button triggers onDeleteCrossLink
 * - Open drawer handoff button
 * - Keyboard precedence: Escape deselects edge without wiping node selection
 * - Keyboard precedence: Delete/Backspace deletes selected edge
 * - M6 protection: Delete key ignored if focus is inside text inputs / drawer controls
 * - M5b isolation: Cross-link hit targets disable pointer events during connector dragging
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MindMapTreeCanvas } from "../../src/components/mindmap/MindMapTreeCanvas";
import { MindMapCrossLinksLayer } from "../../src/components/mindmap/MindMapCrossLinksLayer";
import { MindMapTreeNode, MindMapCrossEdge } from "../../src/lib/mindmapProjection";

describe("Phase M7a — Mind Map On-Canvas Cross-Link Inspection & Quick Delete", () => {
  const SAMPLE_TREE: MindMapTreeNode = {
    id: "node-root",
    title: "Tứ Diệu Đế",
    type: "topic",
    domain: "phat-hoc",
    hopDistance: 0,
    tags: [],
    children: [
      {
        id: "node-dukkha",
        title: "Khổ Đế",
        type: "topic",
        domain: "phat-hoc",
        hopDistance: 1,
        parentHopId: "node-root",
        tags: [],
        children: [],
      },
      {
        id: "node-samudaya",
        title: "Tập Đế",
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
      id: "edge-dukkha-samudaya",
      sourceNodeId: "node-dukkha",
      sourceTitle: "Khổ Đế",
      targetNodeId: "node-samudaya",
      targetTitle: "Tập Đế",
      type: "related",
      strength: 4,
      label: "Nhân Quả",
      isCycle: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. Render hit-target vô hình cho cross-link để người dùng dễ click", () => {
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

    const hitTarget = screen.getByTestId("crosslink-hit-target-edge-dukkha-samudaya");
    expect(hitTarget).toBeInTheDocument();
    expect(hitTarget.tagName.toLowerCase()).toBe("path");
    expect(hitTarget.getAttribute("stroke")).toBe("transparent");
  });

  it("2. Click vào hit-target chọn cross-link và hiển thị floating inspect popover", () => {
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

    const hitTarget = screen.getByTestId("crosslink-hit-target-edge-dukkha-samudaya");
    fireEvent.click(hitTarget);

    const popover = screen.getByTestId("crosslink-quick-actions");
    expect(popover).toBeInTheDocument();
    // Hiển thị tên nguồn và đích
    expect(popover).toHaveTextContent("Khổ Đế");
    expect(popover).toHaveTextContent("Tập Đế");
    // Hiển thị nhãn
    expect(popover).toHaveTextContent("Nhân Quả");
  });

  it("3. Click nút Quick Delete trong popover kích hoạt onDeleteCrossLink", () => {
    const mockDelete = vi.fn();

    render(
      <MindMapTreeCanvas
        tree={SAMPLE_TREE}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
        crossEdges={SAMPLE_CROSS_EDGES}
        showCrossLinks={true}
        isEditable={true}
        onDeleteCrossLink={mockDelete}
      />
    );

    // Click chọn cạnh
    const hitTarget = screen.getByTestId("crosslink-hit-target-edge-dukkha-samudaya");
    fireEvent.click(hitTarget);

    // Click nút xóa
    const deleteBtn = screen.getByTestId("crosslink-quick-delete");
    fireEvent.click(deleteBtn);

    expect(mockDelete).toHaveBeenCalledTimes(1);
    expect(mockDelete).toHaveBeenCalledWith("edge-dukkha-samudaya");
  });

  it("4. Nhấn phím Delete / Backspace khi edge đang được chọn kích hoạt onDeleteCrossLink", () => {
    const mockDelete = vi.fn();

    render(
      <MindMapTreeCanvas
        tree={SAMPLE_TREE}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
        crossEdges={SAMPLE_CROSS_EDGES}
        showCrossLinks={true}
        isEditable={true}
        onDeleteCrossLink={mockDelete}
      />
    );

    const hitTarget = screen.getByTestId("crosslink-hit-target-edge-dukkha-samudaya");
    fireEvent.click(hitTarget);

    // Kích hoạt phím Delete trên canvas
    const canvasBackdrop = screen.getByTestId("mindmap-canvas-backdrop");
    fireEvent.keyDown(canvasBackdrop, { key: "Delete" });

    expect(mockDelete).toHaveBeenCalledTimes(1);
    expect(mockDelete).toHaveBeenCalledWith("edge-dukkha-samudaya");
  });

  it("5. Nhấn Escape đóng popover và bỏ chọn edge nhưng BẢO LƯU selectedNodeIds của người dùng", () => {
    const initialSelectedNodes = new Set(["node-dukkha"]);

    render(
      <MindMapTreeCanvas
        tree={SAMPLE_TREE}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
        crossEdges={SAMPLE_CROSS_EDGES}
        showCrossLinks={true}
        isEditable={true}
        selectedNodeIds={initialSelectedNodes}
      />
    );

    // Chọn edge
    const hitTarget = screen.getByTestId("crosslink-hit-target-edge-dukkha-samudaya");
    fireEvent.click(hitTarget);

    expect(screen.getByTestId("crosslink-quick-actions")).toBeInTheDocument();

    // Nhấn Escape
    const canvasBackdrop = screen.getByTestId("mindmap-canvas-backdrop");
    fireEvent.keyDown(canvasBackdrop, { key: "Escape" });

    // Popover đã đóng
    expect(screen.queryByTestId("crosslink-quick-actions")).not.toBeInTheDocument();

    // Node "node-dukkha" vẫn giữ nguyên trạng thái được chọn
    const nodeEl = screen.getByTestId("node-card-node-dukkha");
    expect(nodeEl.getAttribute("data-selected")).toBe("true");
  });

  it("6. M6 Protection: Phím Delete bị bỏ qua khi focus đang ở trong input text của Drawer / Modal", () => {
    const mockDelete = vi.fn();

    render(
      <MindMapTreeCanvas
        tree={SAMPLE_TREE}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
        crossEdges={SAMPLE_CROSS_EDGES}
        showCrossLinks={true}
        isEditable={true}
        isDrawerOpen={true}
        onDeleteCrossLink={mockDelete}
      />
    );

    const hitTarget = screen.getByTestId("crosslink-hit-target-edge-dukkha-samudaya");
    fireEvent.click(hitTarget);

    // Giả lập một input bên trong Drawer
    const drawerInput = document.createElement("input");
    document.body.appendChild(drawerInput);
    drawerInput.focus();

    fireEvent.keyDown(drawerInput, { key: "Delete" });
    expect(mockDelete).not.toHaveBeenCalled();

    document.body.removeChild(drawerInput);
  });

  it("7. Click nút Open Drawer trong popover kích hoạt handoff mở Drawer cho node nguồn", () => {
    const mockOpenDrawer = vi.fn();

    render(
      <MindMapTreeCanvas
        tree={SAMPLE_TREE}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
        crossEdges={SAMPLE_CROSS_EDGES}
        showCrossLinks={true}
        isEditable={true}
        onOpenDrawerForNode={mockOpenDrawer}
      />
    );

    const hitTarget = screen.getByTestId("crosslink-hit-target-edge-dukkha-samudaya");
    fireEvent.click(hitTarget);

    const openDrawerBtn = screen.getByTestId("crosslink-open-drawer");
    fireEvent.click(openDrawerBtn);

    expect(mockOpenDrawer).toHaveBeenCalledTimes(1);
    expect(mockOpenDrawer).toHaveBeenCalledWith("node-dukkha");
    // Popover đóng sau khi chuyển sang drawer
    expect(screen.queryByTestId("crosslink-quick-actions")).not.toBeInTheDocument();
  });

  it("8. M5b Isolation: Layer hit-target nhận class và style pointer-events-none khi isConnecting=true", () => {
    const containerDiv = document.createElement("div");
    const sourceNode = document.createElement("div");
    sourceNode.setAttribute("data-node-id", "node-dukkha");
    const targetNode = document.createElement("div");
    targetNode.setAttribute("data-node-id", "node-samudaya");
    containerDiv.appendChild(sourceNode);
    containerDiv.appendChild(targetNode);
    document.body.appendChild(containerDiv);

    const mockSelect = vi.fn();

    render(
      <MindMapCrossLinksLayer
        crossEdges={SAMPLE_CROSS_EDGES}
        containerRef={{ current: containerDiv }}
        isConnecting={true}
        onSelectEdge={mockSelect}
      />
    );

    const hitTarget = screen.getByTestId("crosslink-hit-target-edge-dukkha-samudaya");
    expect(hitTarget).toHaveClass("pointer-events-none");
    expect(hitTarget).toHaveStyle({ pointerEvents: "none" });

    // Click bị chặn không gọi onSelectEdge khi isConnecting=true
    fireEvent.click(hitTarget);
    expect(mockSelect).not.toHaveBeenCalled();

    document.body.removeChild(containerDiv);
  });

  it("9. Popover render <select data-testid=\"crosslink-type-select\"> với current value đúng", () => {
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

    const hitTarget = screen.getByTestId("crosslink-hit-target-edge-dukkha-samudaya");
    fireEvent.click(hitTarget);

    const select = screen.getByTestId("crosslink-type-select") as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.value).toBe("related");
  });

  it("10. Select chứa đủ 4 options hợp lệ đồng bộ với Drawer", () => {
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

    const hitTarget = screen.getByTestId("crosslink-hit-target-edge-dukkha-samudaya");
    fireEvent.click(hitTarget);

    const select = screen.getByTestId("crosslink-type-select") as HTMLSelectElement;
    const options = Array.from(select.options).map((opt) => ({
      value: opt.value,
      text: opt.text,
    }));

    expect(options).toEqual([
      { value: "related", text: "Liên quan" },
      { value: "prerequisite", text: "Tiên quyết" },
      { value: "advanced", text: "Nâng cao" },
      { value: "contradicts", text: "Đối chiếu" },
    ]);
  });

  it("11. Chọn lại đúng type hiện tại là no-op, không gọi onUpdateCrossLinkType", () => {
    const mockUpdateType = vi.fn();

    render(
      <MindMapTreeCanvas
        tree={SAMPLE_TREE}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
        crossEdges={SAMPLE_CROSS_EDGES}
        showCrossLinks={true}
        isEditable={true}
        onUpdateCrossLinkType={mockUpdateType}
      />
    );

    const hitTarget = screen.getByTestId("crosslink-hit-target-edge-dukkha-samudaya");
    fireEvent.click(hitTarget);

    const select = screen.getByTestId("crosslink-type-select");
    fireEvent.change(select, { target: { value: "related" } });

    expect(mockUpdateType).not.toHaveBeenCalled();
  });

  it("12. Chọn type mới hợp lệ kích hoạt onUpdateCrossLinkType với edgeId và newType", () => {
    const mockUpdateType = vi.fn();

    render(
      <MindMapTreeCanvas
        tree={SAMPLE_TREE}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
        crossEdges={SAMPLE_CROSS_EDGES}
        showCrossLinks={true}
        isEditable={true}
        onUpdateCrossLinkType={mockUpdateType}
      />
    );

    const hitTarget = screen.getByTestId("crosslink-hit-target-edge-dukkha-samudaya");
    fireEvent.click(hitTarget);

    const select = screen.getByTestId("crosslink-type-select");
    fireEvent.change(select, { target: { value: "prerequisite" } });

    expect(mockUpdateType).toHaveBeenCalledTimes(1);
    expect(mockUpdateType).toHaveBeenCalledWith("edge-dukkha-samudaya", "prerequisite");
  });

  it("13. Focus bên trong select + nhấn Delete không kích hoạt onDeleteCrossLink", () => {
    const mockDelete = vi.fn();

    render(
      <MindMapTreeCanvas
        tree={SAMPLE_TREE}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
        crossEdges={SAMPLE_CROSS_EDGES}
        showCrossLinks={true}
        isEditable={true}
        onDeleteCrossLink={mockDelete}
      />
    );

    const hitTarget = screen.getByTestId("crosslink-hit-target-edge-dukkha-samudaya");
    fireEvent.click(hitTarget);

    const select = screen.getByTestId("crosslink-type-select");
    select.focus();

    fireEvent.keyDown(select, { key: "Delete" });
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("14. Focus bên trong select + nhấn Backspace không kích hoạt onDeleteCrossLink", () => {
    const mockDelete = vi.fn();

    render(
      <MindMapTreeCanvas
        tree={SAMPLE_TREE}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
        crossEdges={SAMPLE_CROSS_EDGES}
        showCrossLinks={true}
        isEditable={true}
        onDeleteCrossLink={mockDelete}
      />
    );

    const hitTarget = screen.getByTestId("crosslink-hit-target-edge-dukkha-samudaya");
    fireEvent.click(hitTarget);

    const select = screen.getByTestId("crosslink-type-select");
    select.focus();

    fireEvent.keyDown(select, { key: "Backspace" });
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("15. Popover render <input data-testid=\"crosslink-label-input\"> với giá trị ban đầu của edge.label", () => {
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

    const hitTarget = screen.getByTestId("crosslink-hit-target-edge-dukkha-samudaya");
    fireEvent.click(hitTarget);

    const labelInput = screen.getByTestId("crosslink-label-input") as HTMLInputElement;
    expect(labelInput).toBeInTheDocument();
    expect(labelInput.value).toBe("Nhân Quả");
  });

  it("16. Nhấn Enter sau khi sửa label kích hoạt onUpdateCrossLinkLabel với edgeId và newLabel", () => {
    const mockUpdateLabel = vi.fn();

    render(
      <MindMapTreeCanvas
        tree={SAMPLE_TREE}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
        crossEdges={SAMPLE_CROSS_EDGES}
        showCrossLinks={true}
        isEditable={true}
        onUpdateCrossLinkLabel={mockUpdateLabel}
      />
    );

    const hitTarget = screen.getByTestId("crosslink-hit-target-edge-dukkha-samudaya");
    fireEvent.click(hitTarget);

    const labelInput = screen.getByTestId("crosslink-label-input");
    fireEvent.change(labelInput, { target: { value: "Quan Hệ Nhân Quả Mới" } });
    fireEvent.keyDown(labelInput, { key: "Enter" });

    expect(mockUpdateLabel).toHaveBeenCalledTimes(1);
    expect(mockUpdateLabel).toHaveBeenCalledWith("edge-dukkha-samudaya", "Quan Hệ Nhân Quả Mới");
  });

  it("17. Blur khỏi label input sau khi sửa kích hoạt onUpdateCrossLinkLabel với edgeId và newLabel", () => {
    const mockUpdateLabel = vi.fn();

    render(
      <MindMapTreeCanvas
        tree={SAMPLE_TREE}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
        crossEdges={SAMPLE_CROSS_EDGES}
        showCrossLinks={true}
        isEditable={true}
        onUpdateCrossLinkLabel={mockUpdateLabel}
      />
    );

    const hitTarget = screen.getByTestId("crosslink-hit-target-edge-dukkha-samudaya");
    fireEvent.click(hitTarget);

    const labelInput = screen.getByTestId("crosslink-label-input");
    fireEvent.change(labelInput, { target: { value: "Quan Hệ Blur" } });
    fireEvent.blur(labelInput);

    expect(mockUpdateLabel).toHaveBeenCalledTimes(1);
    expect(mockUpdateLabel).toHaveBeenCalledWith("edge-dukkha-samudaya", "Quan Hệ Blur");
  });

  it("18. Nhập chuỗi chỉ gồm khoảng trắng hoặc xóa sạch và nhấn Enter chuẩn hóa thành undefined", () => {
    const mockUpdateLabel = vi.fn();

    render(
      <MindMapTreeCanvas
        tree={SAMPLE_TREE}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
        crossEdges={SAMPLE_CROSS_EDGES}
        showCrossLinks={true}
        isEditable={true}
        onUpdateCrossLinkLabel={mockUpdateLabel}
      />
    );

    const hitTarget = screen.getByTestId("crosslink-hit-target-edge-dukkha-samudaya");
    fireEvent.click(hitTarget);

    const labelInput = screen.getByTestId("crosslink-label-input");
    fireEvent.change(labelInput, { target: { value: "    " } });
    fireEvent.keyDown(labelInput, { key: "Enter" });

    expect(mockUpdateLabel).toHaveBeenCalledTimes(1);
    expect(mockUpdateLabel).toHaveBeenCalledWith("edge-dukkha-samudaya", undefined);
  });

  it("19. Nhấn Enter hoặc blur khi giá trị nhãn không đổi là strict no-op", () => {
    const mockUpdateLabel = vi.fn();

    render(
      <MindMapTreeCanvas
        tree={SAMPLE_TREE}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
        crossEdges={SAMPLE_CROSS_EDGES}
        showCrossLinks={true}
        isEditable={true}
        onUpdateCrossLinkLabel={mockUpdateLabel}
      />
    );

    const hitTarget = screen.getByTestId("crosslink-hit-target-edge-dukkha-samudaya");
    fireEvent.click(hitTarget);

    const labelInput = screen.getByTestId("crosslink-label-input");
    // Nhập cùng giá trị (kèm khoảng trắng thừa)
    fireEvent.change(labelInput, { target: { value: "  Nhân Quả  " } });
    fireEvent.keyDown(labelInput, { key: "Enter" });

    expect(mockUpdateLabel).not.toHaveBeenCalled();
  });

  it("20. Nhấn Escape khi đang focus trong label input hoàn nguyên draft và GIỮ popover mở", () => {
    const mockUpdateLabel = vi.fn();

    render(
      <MindMapTreeCanvas
        tree={SAMPLE_TREE}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
        crossEdges={SAMPLE_CROSS_EDGES}
        showCrossLinks={true}
        isEditable={true}
        onUpdateCrossLinkLabel={mockUpdateLabel}
      />
    );

    const hitTarget = screen.getByTestId("crosslink-hit-target-edge-dukkha-samudaya");
    fireEvent.click(hitTarget);

    const labelInput = screen.getByTestId("crosslink-label-input") as HTMLInputElement;
    fireEvent.change(labelInput, { target: { value: "Nhãn Tạm Thời Chưa Lưu" } });
    expect(labelInput.value).toBe("Nhãn Tạm Thời Chưa Lưu");

    // Nhấn Escape trên input
    fireEvent.keyDown(labelInput, { key: "Escape" });

    // Không kích hoạt update
    expect(mockUpdateLabel).not.toHaveBeenCalled();
    // Hoàn nguyên giá trị ban đầu
    expect(labelInput.value).toBe("Nhân Quả");
    // Popover vẫn mở
    expect(screen.getByTestId("crosslink-quick-actions")).toBeInTheDocument();
  });

  it("21. Focus bên trong label input + nhấn Delete / Backspace không kích hoạt onDeleteCrossLink (M6 Protection)", () => {
    const mockDelete = vi.fn();

    render(
      <MindMapTreeCanvas
        tree={SAMPLE_TREE}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
        crossEdges={SAMPLE_CROSS_EDGES}
        showCrossLinks={true}
        isEditable={true}
        onDeleteCrossLink={mockDelete}
      />
    );

    const hitTarget = screen.getByTestId("crosslink-hit-target-edge-dukkha-samudaya");
    fireEvent.click(hitTarget);

    const labelInput = screen.getByTestId("crosslink-label-input");
    labelInput.focus();

    fireEvent.keyDown(labelInput, { key: "Delete" });
    fireEvent.keyDown(labelInput, { key: "Backspace" });
    expect(mockDelete).not.toHaveBeenCalled();
  });
});

