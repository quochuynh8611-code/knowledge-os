/**
 * Integration Test Suite: Phase M7a — On-Canvas Cross-Link Quick Delete History Integration
 *
 * Mapped Specifications:
 * - Scenario: Delete cross-link via on-canvas quick action creates one atomic history snapshot
 * - Scenario: Undo (Cmd+Z / Ctrl+Z) restores the deleted cross-link
 * - Scenario: Redo (Cmd+Shift+Z / Ctrl+Shift+Z) re-deletes the cross-link
 * - Scenario: Dismissing popover on Escape does not dirty history or document
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MindMapView } from "../../src/components/mindmap/MindMapView";
import * as mindmapDocumentStorage from "../../src/lib/mindmapDocumentStorage";
import {
  MindMapDocumentNode,
  MindMapDocumentSummary,
  MindMapVersion,
} from "../../src/types/mindmapDocument";

const mockDocSummary: MindMapDocumentSummary = {
  id: "doc-quick-delete-test",
  title: "Sơ Đồ Quick Delete Test",
  tags: ["triet-hoc"],
  currentVersionNumber: 1,
  totalVersionsCount: 1,
  isArchived: false,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const docTree: MindMapDocumentNode = {
  id: "doc-root",
  title: "Gốc Triết Học",
  nodeType: "topic",
  children: [
    {
      id: "doc-node-a",
      title: "Khái Niệm A",
      nodeType: "topic",
      children: [],
    },
    {
      id: "doc-node-b",
      title: "Khái Niệm B",
      nodeType: "topic",
      children: [],
    },
  ],
};

const initialVersionWithCrossLink: MindMapVersion = {
  id: "ver-1",
  documentId: "doc-quick-delete-test",
  versionNumber: 1,
  createdAt: "2026-01-01T00:00:00Z",
  changeSummary: "Khởi tạo với liên kết",
  treeData: docTree,
  crossLinks: [
    {
      id: "edge-test-a-b",
      sourceNodeId: "doc-node-a",
      targetNodeId: "doc-node-b",
      edgeType: "related",
      label: "Quan hệ thử nghiệm",
    },
  ],
  viewState: {
    layoutMode: "tree_horizontal",
    collapsedNodeIds: [],
    showCrossLinks: true,
  },
};

vi.mock("../../src/context/DataContext", () => ({
  useData: () => ({
    topics: [],
    notes: [],
    resources: [],
    categories: [],
    selectedTopicId: null,
    openTopicDetail: vi.fn(),
  }),
}));

describe("Phase M7a — On-Canvas Cross-Link Quick Delete History Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mindmapDocumentStorage.clearVolatileStorageForTests();
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.clear();
    }

    vi.spyOn(mindmapDocumentStorage, "getMindMapDocumentSummary").mockReturnValue(mockDocSummary);
    vi.spyOn(mindmapDocumentStorage, "listMindMapDocuments").mockReturnValue([mockDocSummary]);
    vi.spyOn(mindmapDocumentStorage, "getMindMapVersion").mockReturnValue(initialVersionWithCrossLink);
  });

  it("Scenario 1: On-canvas quick delete removes edge and integrates with Undo/Redo", async () => {
    render(<MindMapView />);

    // 1. Mở tài liệu có sẵn liên kết
    fireEvent.click(screen.getByTestId("btn-open-mindmap-browser"));
    fireEvent.click(screen.getByTestId(`doc-card-${mockDocSummary.id}`));

    // 2. Định vị hit target của cross-link
    const hitTarget = screen.getByTestId("crosslink-hit-target-edge-test-a-b");
    expect(hitTarget).toBeInTheDocument();

    // 3. Click chọn cross-link để mở quick action popover
    fireEvent.click(hitTarget);
    const deleteBtn = screen.getByTestId("crosslink-quick-delete");
    expect(deleteBtn).toBeInTheDocument();

    // 4. Click nút xóa
    fireEvent.click(deleteBtn);

    // 5. Kiểm tra: Edge biến mất khỏi canvas & dirty indicator xuất hiện
    expect(screen.queryByTestId("crosslink-hit-target-edge-test-a-b")).not.toBeInTheDocument();
    expect(screen.getByTestId("dirty-indicator")).toBeInTheDocument();

    // 6. Nhấn Undo (Cmd+Z)
    fireEvent.keyDown(window, { key: "z", metaKey: true });

    // Edge được khôi phục trên canvas
    expect(screen.getByTestId("crosslink-hit-target-edge-test-a-b")).toBeInTheDocument();

    // 7. Nhấn Redo (Cmd+Shift+Z)
    fireEvent.keyDown(window, { key: "z", metaKey: true, shiftKey: true });

    // Edge lại bị xóa
    expect(screen.queryByTestId("crosslink-hit-target-edge-test-a-b")).not.toBeInTheDocument();
  });

  it("Scenario 2: Successful edgeType mutation updates canvas, creates 1 history entry, and supports Undo/Redo", async () => {
    render(<MindMapView />);

    // 1. Mở tài liệu có sẵn liên kết
    fireEvent.click(screen.getByTestId("btn-open-mindmap-browser"));
    fireEvent.click(screen.getByTestId(`doc-card-${mockDocSummary.id}`));

    // 2. Định vị hit target của cross-link và mở quick action popover
    const hitTarget = screen.getByTestId("crosslink-hit-target-edge-test-a-b");
    fireEvent.click(hitTarget);

    // 3. Chọn loại quan hệ mới "prerequisite"
    const select = screen.getByTestId("crosslink-type-select") as HTMLSelectElement;
    expect(select.value).toBe("related");
    fireEvent.change(select, { target: { value: "prerequisite" } });

    // 4. Kiểm tra: Value trên select cập nhật thành "prerequisite" & dirty indicator xuất hiện
    expect((screen.getByTestId("crosslink-type-select") as HTMLSelectElement).value).toBe("prerequisite");
    expect(screen.getByTestId("dirty-indicator")).toBeInTheDocument();

    // 5. Nhấn Undo (Cmd+Z)
    fireEvent.keyDown(window, { key: "z", metaKey: true });

    // Type được khôi phục về "related"
    expect((screen.getByTestId("crosslink-type-select") as HTMLSelectElement).value).toBe("related");

    // 6. Nhấn Redo (Cmd+Shift+Z)
    fireEvent.keyDown(window, { key: "z", metaKey: true, shiftKey: true });

    // Type được áp dụng lại thành "prerequisite"
    expect((screen.getByTestId("crosslink-type-select") as HTMLSelectElement).value).toBe("prerequisite");
  });

  it("Scenario 3: Same-type reselect is a no-op and produces zero history entries", async () => {
    render(<MindMapView />);

    fireEvent.click(screen.getByTestId("btn-open-mindmap-browser"));
    fireEvent.click(screen.getByTestId(`doc-card-${mockDocSummary.id}`));

    const hitTarget = screen.getByTestId("crosslink-hit-target-edge-test-a-b");
    fireEvent.click(hitTarget);

    const select = screen.getByTestId("crosslink-type-select") as HTMLSelectElement;
    expect(select.value).toBe("related");

    // Re-select same type "related"
    fireEvent.change(select, { target: { value: "related" } });

    // Không làm bẩn document nếu trước đó clean
    expect(screen.queryByTestId("dirty-indicator")).not.toBeInTheDocument();
  });

  it("Scenario 4: Validation rejection on duplicate link prevents mutation, creates zero history entry, and displays error feedback", async () => {
    // Chuẩn bị tài liệu ban đầu có 2 cross-links giữa node A và node B:
    // edge-1: type 'related'
    // edge-2: type 'contradicts'
    const versionWithTwoEdges: MindMapVersion = {
      ...initialVersionWithCrossLink,
      crossLinks: [
        {
          id: "edge-test-a-b",
          sourceNodeId: "doc-node-a",
          targetNodeId: "doc-node-b",
          edgeType: "related",
          label: "Quan hệ 1",
        },
        {
          id: "edge-test-a-b-2",
          sourceNodeId: "doc-node-a",
          targetNodeId: "doc-node-b",
          edgeType: "contradicts",
          label: "Quan hệ 2",
        },
      ],
    };

    vi.spyOn(mindmapDocumentStorage, "getMindMapVersion").mockReturnValue(versionWithTwoEdges);

    render(<MindMapView />);

    fireEvent.click(screen.getByTestId("btn-open-mindmap-browser"));
    fireEvent.click(screen.getByTestId(`doc-card-${mockDocSummary.id}`));

    // Chọn edge-test-a-b
    const hitTarget = screen.getByTestId("crosslink-hit-target-edge-test-a-b");
    fireEvent.click(hitTarget);

    const select = screen.getByTestId("crosslink-type-select") as HTMLSelectElement;
    expect(select.value).toBe("related");

    // Cố gắng đổi sang "contradicts" (đã tồn tại giữa A và B)
    fireEvent.change(select, { target: { value: "contradicts" } });

    // Mutation bị từ chối:
    // 1. Value của edge vẫn giữ nguyên "related"
    expect((screen.getByTestId("crosslink-type-select") as HTMLSelectElement).value).toBe("related");

    // 2. Không làm bẩn document / không tạo history entry
    expect(screen.queryByTestId("dirty-indicator")).not.toBeInTheDocument();

    // 3. Có thông báo lỗi (Toast alert)
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("Scenario 5: Successful inline label mutation updates document, creates 1 history entry, and supports Undo/Redo", async () => {
    render(<MindMapView />);

    // 1. Mở tài liệu có sẵn liên kết
    fireEvent.click(screen.getByTestId("btn-open-mindmap-browser"));
    fireEvent.click(screen.getByTestId(`doc-card-${mockDocSummary.id}`));

    // 2. Click chọn cross-link để mở quick action popover
    const hitTarget = screen.getByTestId("crosslink-hit-target-edge-test-a-b");
    fireEvent.click(hitTarget);

    // 3. Sửa nhãn qua input
    const labelInput = screen.getByTestId("crosslink-label-input") as HTMLInputElement;
    expect(labelInput.value).toBe("Quan hệ thử nghiệm");

    fireEvent.change(labelInput, { target: { value: "Quan hệ cập nhật M7c" } });
    fireEvent.keyDown(labelInput, { key: "Enter" });

    // 4. Kiểm tra document dirty & giá trị nhãn đã cập nhật
    expect((screen.getByTestId("crosslink-label-input") as HTMLInputElement).value).toBe("Quan hệ cập nhật M7c");
    expect(screen.getByTestId("dirty-indicator")).toBeInTheDocument();

    // 5. Nhấn Undo (Cmd+Z)
    fireEvent.keyDown(window, { key: "z", metaKey: true });

    // Nhãn được hoàn nguyên về "Quan hệ thử nghiệm"
    expect((screen.getByTestId("crosslink-label-input") as HTMLInputElement).value).toBe("Quan hệ thử nghiệm");

    // 6. Nhấn Redo (Cmd+Shift+Z)
    fireEvent.keyDown(window, { key: "z", metaKey: true, shiftKey: true });

    // Nhãn được áp dụng lại "Quan hệ cập nhật M7c"
    expect((screen.getByTestId("crosslink-label-input") as HTMLInputElement).value).toBe("Quan hệ cập nhật M7c");
  });

  it("Scenario 6: Empty/whitespace label submission normalizes to undefined and integrates with Undo/Redo", async () => {
    render(<MindMapView />);

    fireEvent.click(screen.getByTestId("btn-open-mindmap-browser"));
    fireEvent.click(screen.getByTestId(`doc-card-${mockDocSummary.id}`));

    const hitTarget = screen.getByTestId("crosslink-hit-target-edge-test-a-b");
    fireEvent.click(hitTarget);

    const labelInput = screen.getByTestId("crosslink-label-input") as HTMLInputElement;
    expect(labelInput.value).toBe("Quan hệ thử nghiệm");

    // Xóa sạch hoặc chỉ nhập khoảng trắng
    fireEvent.change(labelInput, { target: { value: "     " } });
    fireEvent.blur(labelInput);

    // Nhãn chuẩn hóa thành rỗng/undefined trên UI & document dirty
    expect((screen.getByTestId("crosslink-label-input") as HTMLInputElement).value).toBe("");
    expect(screen.getByTestId("dirty-indicator")).toBeInTheDocument();

    // Undo phục hồi lại nhãn cũ
    fireEvent.keyDown(window, { key: "z", metaKey: true });
    expect((screen.getByTestId("crosslink-label-input") as HTMLInputElement).value).toBe("Quan hệ thử nghiệm");
  });

  it("Scenario 7: Same-value label submission is strict no-op with zero history entries", async () => {
    render(<MindMapView />);

    fireEvent.click(screen.getByTestId("btn-open-mindmap-browser"));
    fireEvent.click(screen.getByTestId(`doc-card-${mockDocSummary.id}`));

    const hitTarget = screen.getByTestId("crosslink-hit-target-edge-test-a-b");
    fireEvent.click(hitTarget);

    const labelInput = screen.getByTestId("crosslink-label-input") as HTMLInputElement;
    expect(labelInput.value).toBe("Quan hệ thử nghiệm");

    // Nhập cùng giá trị kèm khoảng trắng thừa
    fireEvent.change(labelInput, { target: { value: "  Quan hệ thử nghiệm  " } });
    fireEvent.keyDown(labelInput, { key: "Enter" });

    // Không làm bẩn document, không tạo history entry
    expect(screen.queryByTestId("dirty-indicator")).not.toBeInTheDocument();
  });
});
