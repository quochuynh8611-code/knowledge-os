import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import {
  MindMapTreeCanvas,
  BRANCH_PALETTES,
  getStableBranchPaletteIndex,
} from "../../src/components/mindmap/MindMapTreeCanvas";
import { MindMapTreeNode } from "../../src/lib/mindmapProjection";

describe("MindMap Stable Branch Palette (Commit 4)", () => {
  describe("Unit: getStableBranchPaletteIndex helper", () => {
    it("Scenario: Cùng nhánh giữ cùng màu", () => {
      // Given branchKey "branch-a"
      const branchKey = "branch-a";

      // When tính palette index nhiều lần
      const index1 = getStableBranchPaletteIndex(branchKey);
      const index2 = getStableBranchPaletteIndex(branchKey);
      const index3 = getStableBranchPaletteIndex(branchKey);

      // Then kết quả luôn giống nhau
      expect(index1).toBe(index2);
      expect(index2).toBe(index3);
      expect(Number.isInteger(index1)).toBe(true);
      expect(index1).toBeGreaterThanOrEqual(0);

      const palette1 = BRANCH_PALETTES[index1 % BRANCH_PALETTES.length];
      const palette2 = BRANCH_PALETTES[index2 % BRANCH_PALETTES.length];
      expect(palette1.id).toBe(palette2.id);
    });

    it("Scenario: branchKey rỗng hoặc null phải an toàn", () => {
      // Given branchKey "", null hoặc undefined
      // When tính palette index
      // Then không throw và trả về một index hợp lệ
      expect(() => getStableBranchPaletteIndex("")).not.toThrow();
      expect(() => getStableBranchPaletteIndex(null)).not.toThrow();
      expect(() => getStableBranchPaletteIndex(undefined)).not.toThrow();
      expect(() => getStableBranchPaletteIndex("   ")).not.toThrow();

      const idxEmpty = getStableBranchPaletteIndex("");
      const idxNull = getStableBranchPaletteIndex(null);
      const idxUndef = getStableBranchPaletteIndex(undefined);

      expect(idxEmpty).toBeGreaterThanOrEqual(0);
      expect(idxNull).toBeGreaterThanOrEqual(0);
      expect(idxUndef).toBeGreaterThanOrEqual(0);

      expect(BRANCH_PALETTES[idxEmpty % BRANCH_PALETTES.length]).toBeDefined();
    });
  });

  describe("Integration: Render Canvas with Radial Balanced Layout", () => {
    it("Scenario: Thêm nhánh mới không đổi màu nhánh cũ", () => {
      // Given các nhánh A, B, C
      const baseTree: MindMapTreeNode = {
        id: "root-1",
        title: "Gốc",
        type: "topic",
        domain: "general",
        hopDistance: 0,
        tags: [],
        children: [
          {
            id: "branch-a",
            title: "Nhánh A",
            type: "topic",
            domain: "general",
            hopDistance: 1,
            tags: [],
            children: [],
          },
          {
            id: "branch-b",
            title: "Nhánh B",
            type: "topic",
            domain: "general",
            hopDistance: 1,
            tags: [],
            children: [],
          },
          {
            id: "branch-c",
            title: "Nhánh C",
            type: "topic",
            domain: "general",
            hopDistance: 1,
            tags: [],
            children: [],
          },
        ],
      };

      const { unmount } = render(
        <MindMapTreeCanvas
          tree={baseTree}
          layoutMode="radial_balanced"
          isEditable={false}
        />
      );

      const colorA_before = screen.getByTestId("node-card-branch-a").getAttribute("data-palette-id");
      const colorB_before = screen.getByTestId("node-card-branch-b").getAttribute("data-palette-id");
      const colorC_before = screen.getByTestId("node-card-branch-c").getAttribute("data-palette-id");

      expect(colorA_before).toBeTruthy();
      expect(colorB_before).toBeTruthy();
      expect(colorC_before).toBeTruthy();

      unmount();

      // When thêm nhánh D vào đầu danh sách (dịch chuyển index của A, B, C)
      const treeWithPrependedBranch: MindMapTreeNode = {
        ...baseTree,
        children: [
          {
            id: "branch-d",
            title: "Nhánh D Mới",
            type: "topic",
            domain: "general",
            hopDistance: 1,
            tags: [],
            children: [],
          },
          ...baseTree.children,
        ],
      };

      render(
        <MindMapTreeCanvas
          tree={treeWithPrependedBranch}
          layoutMode="radial_balanced"
          isEditable={false}
        />
      );

      const colorA_after = screen.getByTestId("node-card-branch-a").getAttribute("data-palette-id");
      const colorB_after = screen.getByTestId("node-card-branch-b").getAttribute("data-palette-id");
      const colorC_after = screen.getByTestId("node-card-branch-c").getAttribute("data-palette-id");

      // Then màu của A, B, C không đổi
      expect(colorA_after).toBe(colorA_before);
      expect(colorB_after).toBe(colorB_before);
      expect(colorC_after).toBe(colorC_before);
    });

    it("Scenario: Xóa nhánh không đổi màu nhánh còn lại", () => {
      // Given các nhánh A, B, C
      const baseTree: MindMapTreeNode = {
        id: "root-2",
        title: "Gốc",
        type: "topic",
        domain: "general",
        hopDistance: 0,
        tags: [],
        children: [
          {
            id: "branch-a",
            title: "Nhánh A",
            type: "topic",
            domain: "general",
            hopDistance: 1,
            tags: [],
            children: [],
          },
          {
            id: "branch-b",
            title: "Nhánh B",
            type: "topic",
            domain: "general",
            hopDistance: 1,
            tags: [],
            children: [],
          },
          {
            id: "branch-c",
            title: "Nhánh C",
            type: "topic",
            domain: "general",
            hopDistance: 1,
            tags: [],
            children: [],
          },
        ],
      };

      const { unmount } = render(
        <MindMapTreeCanvas
          tree={baseTree}
          layoutMode="radial_balanced"
          isEditable={false}
        />
      );

      const colorA_before = screen.getByTestId("node-card-branch-a").getAttribute("data-palette-id");
      const colorC_before = screen.getByTestId("node-card-branch-c").getAttribute("data-palette-id");

      expect(colorA_before).toBeTruthy();
      expect(colorC_before).toBeTruthy();

      unmount();

      // When xóa B (nhánh C bị dịch chuyển index từ 2 sang 1)
      const treeWithoutB: MindMapTreeNode = {
        ...baseTree,
        children: [baseTree.children[0], baseTree.children[2]],
      };

      render(
        <MindMapTreeCanvas
          tree={treeWithoutB}
          layoutMode="radial_balanced"
          isEditable={false}
        />
      );

      const colorA_after = screen.getByTestId("node-card-branch-a").getAttribute("data-palette-id");
      const colorC_after = screen.getByTestId("node-card-branch-c").getAttribute("data-palette-id");

      // Then màu của A và C không đổi
      expect(colorA_after).toBe(colorA_before);
      expect(colorC_after).toBe(colorC_before);
    });

    it("Scenario: Node con kế thừa màu nhánh gốc", () => {
      // Given node con thuộc nhánh A
      const treeWithHierarchy: MindMapTreeNode = {
        id: "root-3",
        title: "Gốc",
        type: "topic",
        domain: "general",
        hopDistance: 0,
        tags: [],
        children: [
          {
            id: "branch-a",
            title: "Nhánh A",
            type: "topic",
            domain: "general",
            hopDistance: 1,
            branchKey: "branch-a",
            tags: [],
            children: [
              {
                id: "child-a1",
                title: "Con A1",
                type: "topic",
                domain: "general",
                hopDistance: 2,
                branchKey: "branch-a",
                tags: [],
                children: [
                  {
                    id: "grandchild-a1-1",
                    title: "Cháu A1.1",
                    type: "topic",
                    domain: "general",
                    hopDistance: 3,
                    branchKey: "branch-a",
                    tags: [],
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      };

      // When render node con
      render(
        <MindMapTreeCanvas
          tree={treeWithHierarchy}
          layoutMode="radial_balanced"
          isEditable={false}
        />
      );

      const branchCard = screen.getByTestId("node-card-branch-a");
      const childCard = screen.getByTestId("node-card-child-a1");
      const grandchildCard = screen.getByTestId("node-card-grandchild-a1-1");

      const branchPaletteId = branchCard.getAttribute("data-palette-id");
      const childPaletteId = childCard.getAttribute("data-palette-id");
      const grandchildPaletteId = grandchildCard.getAttribute("data-palette-id");

      // Then node con dùng cùng palette với nhánh A
      expect(branchPaletteId).toBeTruthy();
      expect(childPaletteId).toBe(branchPaletteId);
      expect(grandchildPaletteId).toBe(branchPaletteId);
    });
  });
});
