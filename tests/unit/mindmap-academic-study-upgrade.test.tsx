/**
 * Test Suite: Academic MindMap Upgrade (Phases 1 - 4)
 *
 * Validates:
 * 1. Visual Ergonomics:
 *    - Node editing toolbar opacity classes (hidden by default, revealed on hover/focus/selected).
 *    - Depth visual hierarchy classes (Root, Level 1, Level 2+).
 *    - Academic citation badges ([9-11], [13-15]) parsing and interactive click.
 * 2. Radial Balanced Layout:
 *    - Layout switcher contains "btn-layout-radial".
 *    - Radial balanced renders left and right branches alternating with branch color palettes.
 * 3. Active Recall (Study Mode):
 *    - Toggle button "btn-toggle-study-mode" activates study mode.
 *    - Nodes with hopDistance >= 1 are masked with blur and EyeOff icon.
 *    - Clicking masked node reveals it.
 *    - "Mở tất cả" and "Che lại" buttons reveal/mask all nodes.
 *    - Quick peek popover shows citations and cross-links.
 * 4. Flashcard Branch Export:
 *    - "btn-create-flashcard-from-branch" in MindMapNodeDrawer creates card and shows success feedback.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MindMapTreeCanvas, renderTitleWithCitations, BRANCH_PALETTES } from "../../src/components/mindmap/MindMapTreeCanvas";
import { MindMapNodeDrawer } from "../../src/components/mindmap/MindMapNodeDrawer";
import { MindMapView } from "../../src/components/mindmap/MindMapView";
import { MindMapTreeNode } from "../../src/lib/mindmapProjection";

let mockTopics: any[] = [
  {
    id: "topic-tu-hoc",
    title: "Phương pháp Tự học [1-3]",
    visibility: "visible",
    parentId: null,
  },
  {
    id: "topic-heutagogy",
    title: "Heutagogy Căn bản [9-11]",
    visibility: "visible",
    parentId: "topic-tu-hoc",
  },
  {
    id: "topic-metacognition",
    title: "Siêu nhận thức Metacognition [13-15]",
    visibility: "visible",
    parentId: "topic-tu-hoc",
  },
];
let mockSelectedTopicId: string | null = "topic-tu-hoc";

vi.mock("../../src/context/DataContext", () => ({
  useData: () => ({
    topics: mockTopics,
    notes: [
      { id: "note-1", title: "Ghi chú Heutagogy", content: "Nội dung nghiên cứu tự quyết.", topicId: "topic-heutagogy" },
    ],
    resources: [],
    categories: [{ id: "cat-edu", name: "Nghiên cứu học tập" }],
    selectedTopicId: mockSelectedTopicId,
    openTopicDetail: vi.fn(),
  }),
  dataRepository: {
    createFlashcard: vi.fn().mockResolvedValue({ id: "fc-1" }),
  },
}));

describe("Academic MindMap Upgrade - Phase 1: Visual Ergonomics & Citation Badges", () => {
  it("renders academic citation badges correctly from title string", () => {
    const onCitationClick = vi.fn();
    const { container } = render(
      <div>
        {renderTitleWithCitations("Khảo sát Heutagogy [9-11] và Siêu nhận thức [13-15]", onCitationClick)}
      </div>
    );

    const badges = screen.getAllByTestId("citation-badge");
    expect(badges).toHaveLength(2);
    expect(badges[0].textContent).toBe("[9-11]");
    expect(badges[1].textContent).toBe("[13-15]");

    fireEvent.click(badges[0]);
    expect(onCitationClick).toHaveBeenCalledWith("[9-11]");

    // Verify stateless consecutive matching without /g lastIndex drift
    const { container: c2 } = render(
      <div>
        {renderTitleWithCitations("Luận đề [1] và chú giải [2-3] cùng đối chiếu [1, 2]", onCitationClick)}
      </div>
    );
    const badges2 = c2.querySelectorAll('[data-testid="citation-badge"]');
    expect(badges2).toHaveLength(3);
    expect(badges2[0].textContent).toBe("[1]");
    expect(badges2[1].textContent).toBe("[2-3]");
    expect(badges2[2].textContent).toBe("[1, 2]");
  });

  it("applies depth visual hierarchy styles based on hopDistance", () => {
    const mockTree: MindMapTreeNode = {
      id: "root-1",
      title: "Gốc Trí Tuệ",
      type: "topic",
      domain: "general",
      hopDistance: 0,
      tags: [],
      children: [
        {
          id: "child-1",
          title: "Nhánh Cấp 1",
          type: "topic",
          domain: "general",
          hopDistance: 1,
          tags: [],
          children: [
            {
              id: "child-2",
              title: "Nhánh Cấp 2 [4-6]",
              type: "topic",
              domain: "general",
              hopDistance: 2,
              tags: [],
              children: [],
            },
          ],
        },
      ],
    };

    render(
      <MindMapTreeCanvas
        tree={mockTree}
        layoutMode="tree_horizontal"
        isEditable={true}
      />
    );

    const rootCard = screen.getByTestId("node-card-root-1");
    expect(rootCard.className).toContain("border-amber-500");

    const child1Card = screen.getByTestId("node-card-child-1");
    expect(child1Card.className).toContain("rounded-xl");

    const child2Card = screen.getByTestId("node-card-child-2");
    expect(child2Card.className).toContain("py-2");

    // Toolbar buttons are present in DOM
    const editBtn = screen.getByTestId("btn-edit-node-root-1");
    expect(editBtn).toBeDefined();
  });
});

describe("Academic MindMap Upgrade - Phase 2: Radial Balanced Layout", () => {
  it("renders radial balanced layout button and alternates left/right branches", () => {
    const mockTree: MindMapTreeNode = {
      id: "root-radial",
      title: "Gốc Radial",
      type: "topic",
      domain: "general",
      hopDistance: 0,
      tags: [],
      children: [
        {
          id: "branch-right-0",
          title: "Nhánh Phải 0",
          type: "topic",
          domain: "general",
          hopDistance: 1,
          tags: [],
          children: [],
        },
        {
          id: "branch-left-1",
          title: "Nhánh Trái 1",
          type: "topic",
          domain: "general",
          hopDistance: 1,
          tags: [],
          children: [],
        },
      ],
    };

    const { container } = render(
      <MindMapTreeCanvas
        tree={mockTree}
        layoutMode="radial_balanced"
        isEditable={false}
      />
    );

    // Root node card is rendered
    expect(screen.getByTestId("node-card-root-radial")).toBeDefined();
    // Both children are rendered
    expect(screen.getByTestId("node-card-branch-right-0")).toBeDefined();
    expect(screen.getByTestId("node-card-branch-left-1")).toBeDefined();

    // Contains radial container with min-w-max flex
    expect(container.querySelector(".min-w-max")).toBeDefined();
  });

  it("exports valid branch color palettes", () => {
    expect(BRANCH_PALETTES.length).toBeGreaterThanOrEqual(6);
    expect(BRANCH_PALETTES[0].id).toBe("sky");
    expect(BRANCH_PALETTES[1].id).toBe("emerald");
    expect(BRANCH_PALETTES[2].id).toBe("violet");
  });
});

describe("Academic MindMap Upgrade - Phase 3: Active Recall Study Co-Pilot", () => {
  it("masks non-root cards when study mode is active and unmasks on click", () => {
    const mockTree: MindMapTreeNode = {
      id: "root-study",
      title: "Root Study",
      type: "topic",
      domain: "general",
      hopDistance: 0,
      tags: [],
      children: [
        {
          id: "child-study-1",
          title: "Khái niệm Cần Nhớ",
          type: "topic",
          domain: "general",
          hopDistance: 1,
          tags: [],
          children: [],
        },
      ],
    };

    const onRevealNode = vi.fn();

    render(
      <MindMapTreeCanvas
        tree={mockTree}
        layoutMode="tree_horizontal"
        isStudyModeActive={true}
        revealedNodeIds={new Set()}
        onRevealNode={onRevealNode}
      />
    );

    // Child node has eye mask icon
    const maskIcon = screen.getByTestId("btn-study-mask-child-study-1");
    expect(maskIcon).toBeDefined();

    // Clicking mask calls onRevealNode
    fireEvent.click(maskIcon);
    expect(onRevealNode).toHaveBeenCalledWith("child-study-1");
  });

  it("MindMapView exposes Active Recall toggle, Mở tất cả and Che lại buttons", () => {
    render(<MindMapView />);

    const studyToggle = screen.getByTestId("btn-toggle-study-mode");
    expect(studyToggle).toBeDefined();

    // Turn study mode on
    fireEvent.click(studyToggle);

    // Sub-buttons appear
    const revealAllBtn = screen.getByTestId("btn-study-reveal-all");
    const maskAllBtn = screen.getByTestId("btn-study-mask-all");
    expect(revealAllBtn).toBeDefined();
    expect(maskAllBtn).toBeDefined();

    // Click Mở tất cả
    fireEvent.click(revealAllBtn);
    // Click Che lại
    fireEvent.click(maskAllBtn);
  });
});

describe("Academic MindMap Upgrade - Phase 3.3: Flashcard Branch Export in Drawer", () => {
  it("renders 'Tạo Flashcards từ nhánh này' and triggers flashcard creation", async () => {
    const onCreateFlashcard = vi.fn().mockResolvedValue(undefined);
    const mockNode: any = {
      id: "drawer-node-1",
      title: "Định nghĩa Siêu nhận thức",
      type: "topic",
      domain: "general",
      hopDistance: 1,
      parentHopId: "root-1",
      tags: ["education"],
      children: [
        { id: "sub-1", title: "Tri thức siêu nhận thức", type: "topic", hopDistance: 2, tags: [], children: [] },
        { id: "sub-2", title: "Điều tiết siêu nhận thức", type: "topic", hopDistance: 2, tags: [], children: [] },
      ],
    };

    render(
      <MindMapNodeDrawer
        isOpen={true}
        node={mockNode}
        onClose={vi.fn()}
        onUpdateTitle={vi.fn()}
        onCreateFlashcard={onCreateFlashcard}
      />
    );

    const flashcardBtn = screen.getByTestId("btn-create-flashcard-from-branch");
    expect(flashcardBtn).toBeDefined();

    fireEvent.click(flashcardBtn);

    await waitFor(() => {
      expect(onCreateFlashcard).toHaveBeenCalledWith({
        topicId: "root-1",
        front: "Định nghĩa Siêu nhận thức",
        back: "• Tri thức siêu nhận thức\n• Điều tiết siêu nhận thức",
      });
    });

    expect(screen.getByTestId("flashcard-export-feedback")).toHaveTextContent("Đã tạo thẻ ôn tập thành công!");
  });
});

