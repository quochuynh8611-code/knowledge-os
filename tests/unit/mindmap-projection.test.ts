import { describe, it, expect } from "vitest";
import {
  projectToMindMapTree,
  exportMindMapToMarkdown,
  MindMapTreeProjection,
} from "../../src/lib/mindmapProjection";
import { buildAdjacencyGraph } from "../../src/lib/knowledgeGraph";
import { Topic, Note, Resource } from "../../src/types";

describe("Mind Map v1 Derived Read-Model Projection", () => {
  // Mock fixtures according to knowledge-graph-lib.test.ts standards
  const mockTopics: Topic[] = [
    {
      id: "topic-tu-dieu-de",
      title: "Tứ Diệu Đế",
      slug: "tu-dieu-de",
      type: "phat-hoc",
      description: "Bốn chân lý tối thượng nền tảng của Phật giáo.",
      content: "Khổ, Tập, Diệt, Đạo.",
      categoryId: "cat-phat-hoc",
      tags: ["phat-hoc", "co-ban"],
      links: [
        {
          id: "link-1",
          sourceId: "topic-tu-dieu-de",
          targetId: "topic-bat-chanh-dao",
          linkType: "prerequisite",
          strength: 5,
        },
        {
          id: "link-2",
          sourceId: "topic-tu-dieu-de",
          targetId: "topic-tam-tuong",
          linkType: "related",
          strength: 5,
        },
        {
          id: "link-3",
          sourceId: "topic-tu-dieu-de",
          targetId: "topic-duyen-khoi",
          linkType: "prerequisite",
          strength: 3,
        },
      ],
      studyProgress: {
        topicId: "topic-tu-dieu-de",
        status: "completed",
        progress: 100,
        repetitions: 5,
        interval: 10,
        easeFactor: 2.5,
        totalNotes: 1,
        timeSpent: 60,
      },
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    {
      id: "topic-bat-chanh-dao",
      title: "Bát Chánh Đạo",
      slug: "bat-chanh-dao",
      type: "phat-hoc",
      description: "Con đường tám nhánh.",
      content: "Chánh kiến, Chánh tư duy...",
      categoryId: "cat-phat-hoc",
      tags: ["phat-hoc", "dao-de"],
      links: [
        {
          id: "link-cycle",
          sourceId: "topic-bat-chanh-dao",
          targetId: "topic-tu-dieu-de", // Cycle: tu-dieu-de -> bat-chanh-dao -> tu-dieu-de
          linkType: "advanced",
          strength: 4,
        },
      ],
      studyProgress: {
        topicId: "topic-bat-chanh-dao",
        status: "in_progress",
        progress: 50,
        repetitions: 2,
        interval: 3,
        easeFactor: 2.4,
        totalNotes: 1,
        timeSpent: 30,
      },
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    {
      id: "topic-tam-tuong",
      title: "Tam Tướng",
      slug: "tam-tuong",
      type: "phat-hoc",
      description: "Vô thường, Khổ, Vô ngã.",
      content: "Anicca, Dukkha, Anatta.",
      categoryId: "cat-phat-hoc",
      tags: ["phat-hoc", "triet-ly"],
      links: [],
      studyProgress: {
        topicId: "topic-tam-tuong",
        status: "not_started",
        progress: 0,
        repetitions: 0,
        interval: 0,
        easeFactor: 2.5,
        totalNotes: 0,
        timeSpent: 0,
      },
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    {
      id: "topic-duyen-khoi",
      title: "Duyên Khởi (Paticcasamuppada)",
      slug: "duyen-khoi",
      type: "phat-hoc",
      description: "Mười hai nhân duyên liên kết.",
      content: "Vô minh duyên Hành...",
      categoryId: "cat-phat-hoc",
      tags: ["phat-hoc", "nhan-duyen"],
      links: [],
      studyProgress: {
        topicId: "topic-duyen-khoi",
        status: "reviewing",
        progress: 80,
        repetitions: 4,
        interval: 7,
        easeFactor: 2.6,
        totalNotes: 0,
        timeSpent: 45,
      },
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
  ];

  const mockNotes: Note[] = [
    {
      id: "note-tu-dieu-de-summary",
      topicId: "topic-tu-dieu-de",
      title: "Tóm Lược 4 Chân Lý",
      content: "Khổ, Tập, Diệt, Đạo chi tiết.",
      type: "summary",
      isPrivate: false,
      tags: ["summary", "core"],
      createdAt: "2026-01-02T00:00:00Z",
      updatedAt: "2026-01-02T00:00:00Z",
    },
    {
      id: "note-bat-chanh-dao-insight",
      topicId: "topic-bat-chanh-dao",
      title: "Ứng Dụng Chánh Niệm",
      content: "Sati trong đời sống hàng ngày.",
      type: "insight",
      isPrivate: false,
      tags: ["mindfulness"],
      createdAt: "2026-01-02T00:00:00Z",
      updatedAt: "2026-01-02T00:00:00Z",
    },
  ];

  const mockResources: Resource[] = [
    {
      id: "res-kinh-chuyen-phap-luan",
      topicId: "topic-tu-dieu-de",
      title: "Kinh Chuyển Pháp Luân (Dhammacakkappavattana Sutta)",
      type: "book",
      createdAt: "2026-01-01T00:00:00Z",
    },
  ];

  // ─── 1. Deterministic Spanning Tree & Edge Ordering ────────────────────────

  describe("1. Deterministic Spanning Tree & Edge Ordering", () => {
    it("projects graph into single-parent tree with deterministic child ordering", () => {
      const projection = projectToMindMapTree(
        { topics: mockTopics, notes: mockNotes, resources: mockResources },
        "topic-tu-dieu-de"
      );

      expect(projection).not.toBeNull();
      expect(projection!.rootNodeId).toBe("topic-tu-dieu-de");
      expect(projection!.tree.id).toBe("topic-tu-dieu-de");
      expect(projection!.tree.title).toBe("Tứ Diệu Đế");
      expect(projection!.tree.progress).toBe(100);

      // Children of root:
      // Priority rule:
      // 1. strength desc
      // 2. semantic priority desc: prerequisite(5) > related(3) > has_note(1) > has_resource(1)
      // 3. id asc
      const children = projection!.tree.children;
      expect(children.length).toBe(5); // topic-bat-chanh-dao (prereq str 5), topic-tam-tuong (related str 5), topic-duyen-khoi (prereq str 3), note (has_note str 2), res (has_resource str 2)

      // topic-bat-chanh-dao (strength 5, prerequisite priority 5)
      expect(children[0].id).toBe("topic-bat-chanh-dao");
      expect(children[0].edgeTypeToParent).toBe("prerequisite");
      expect(children[0].edgeStrength).toBe(5);

      // topic-tam-tuong (strength 5, related priority 3)
      expect(children[1].id).toBe("topic-tam-tuong");
      expect(children[1].edgeTypeToParent).toBe("related");
      expect(children[1].edgeStrength).toBe(5);

      // topic-duyen-khoi (strength 3, prerequisite priority 5)
      expect(children[2].id).toBe("topic-duyen-khoi");
      expect(children[2].edgeTypeToParent).toBe("prerequisite");
      expect(children[2].edgeStrength).toBe(3);

      // note (strength 2, has_note priority 1)
      expect(children[3].id).toBe("note-tu-dieu-de-summary");
      expect(children[3].edgeTypeToParent).toBe("has_note");

      // resource (strength 2, has_resource priority 1)
      expect(children[4].id).toBe("res-kinh-chuyen-phap-luan");
      expect(children[4].edgeTypeToParent).toBe("has_resource");
    });

    it("produces identical JSON output across 20 consecutive projection calls", () => {
      const graph = buildAdjacencyGraph({
        topics: mockTopics,
        notes: mockNotes,
        resources: mockResources,
      });

      const firstResult = projectToMindMapTree(graph, "topic-tu-dieu-de");
      expect(firstResult).not.toBeNull();
      const firstTreeString = JSON.stringify(firstResult!.tree);

      for (let i = 0; i < 20; i++) {
        const subsequentResult = projectToMindMapTree(graph, "topic-tu-dieu-de");
        expect(JSON.stringify(subsequentResult!.tree)).toBe(firstTreeString);
      }
    });

    it("accepts both KnowledgeGraphData and raw entity collections producing identical projections", () => {
      const rawInput = {
        topics: mockTopics,
        notes: mockNotes,
        resources: mockResources,
      };
      const graphInput = buildAdjacencyGraph(rawInput);

      const fromRaw = projectToMindMapTree(rawInput, "topic-tu-dieu-de");
      const fromGraph = projectToMindMapTree(graphInput, "topic-tu-dieu-de");

      expect(fromRaw).not.toBeNull();
      expect(fromGraph).not.toBeNull();
      expect(fromRaw!.tree).toEqual(fromGraph!.tree);
      expect(fromRaw!.totalNodesCount).toBe(fromGraph!.totalNodesCount);
      expect(fromRaw!.maxDepthReached).toBe(fromGraph!.maxDepthReached);
    });
  });

  // ─── 2. Cycle Safety & Single-Parent Guarantee ──────────────────────────────

  describe("2. Cycle Safety & Single-Parent Guarantee", () => {
    it("detects cycles and enforces single-parent without duplicate subtree explosion", () => {
      const projection = projectToMindMapTree(
        { topics: mockTopics, notes: mockNotes, resources: mockResources },
        "topic-tu-dieu-de",
        { maxDepth: 4 }
      );

      expect(projection).not.toBeNull();
      expect(projection!.hasCyclesDetected).toBe(true);

      // Verify topic-tu-dieu-de only appears once as root (not repeated under bat-chanh-dao)
      const batChanhDaoNode = projection!.tree.children.find(
        (c) => c.id === "topic-bat-chanh-dao"
      );
      expect(batChanhDaoNode).toBeDefined();

      const batChanhDaoChildrenIds = batChanhDaoNode!.children.map((c) => c.id);
      expect(batChanhDaoChildrenIds).not.toContain("topic-tu-dieu-de");
      expect(batChanhDaoChildrenIds).toContain("note-bat-chanh-dao-insight");
    });

    it("returns null gracefully for non-existent root topic ID", () => {
      const projection = projectToMindMapTree(
        { topics: mockTopics, notes: mockNotes },
        "non-existent-id"
      );
      expect(projection).toBeNull();
    });

    it("returns null gracefully for empty string rootTopicId", () => {
      const projection = projectToMindMapTree(
        { topics: mockTopics, notes: mockNotes, resources: mockResources },
        ""
      );
      expect(projection).toBeNull();
    });

    it("projects an isolated topic with no links into a valid 1-node tree with 0 children", () => {
      const isolatedTopic: Topic = {
        id: "topic-isolated",
        title: "Chủ Đề Độc Lập",
        slug: "chu-de-doc-lap",
        type: "triet-hoc",
        description: "Không có liên kết nào.",
        content: "Nội dung độc lập.",
        categoryId: "cat-triet-hoc",
        tags: ["isolated"],
        links: [],
        studyProgress: {
          topicId: "topic-isolated",
          status: "not_started",
          progress: 0,
          repetitions: 0,
          interval: 0,
          easeFactor: 2.5,
          totalNotes: 0,
          timeSpent: 0,
        },
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      };

      const projection = projectToMindMapTree(
        { topics: [isolatedTopic] },
        "topic-isolated"
      );

      expect(projection).not.toBeNull();
      expect(projection!.rootNodeId).toBe("topic-isolated");
      expect(projection!.tree.id).toBe("topic-isolated");
      expect(projection!.tree.children).toHaveLength(0);
      expect(projection!.totalNodesCount).toBe(1);
      expect(projection!.maxDepthReached).toBe(0);
      expect(projection!.hasCyclesDetected).toBe(false);
      expect(projection!.hasTruncatedBranches).toBe(false);
    });
  });

  // ─── 3. Bounded Traversal & Truncation Signal ────────────────────────────────

  describe("3. Bounded Traversal & Truncation Signal", () => {
    it("respects maxDepth and maxNodesLimit hard caps", () => {
      const projection = projectToMindMapTree(
        { topics: mockTopics, notes: mockNotes, resources: mockResources },
        "topic-tu-dieu-de",
        { maxDepth: 1, maxNodesLimit: 3 }
      );

      expect(projection).not.toBeNull();
      expect(projection!.totalNodesCount).toBeLessThanOrEqual(3);
      expect(projection!.hasTruncatedBranches).toBe(true);
    });
  });

  // ─── 4. Markdown Outline Export & Safe Link Fallbacks ─────────────────────────

  describe("4. Markdown Outline Export & Safe Link Fallbacks", () => {
    it("generates structured markdown outline with correct deep-links and badges", () => {
      const topicMap = new Map<string, Topic>(mockTopics.map((t) => [t.id, t]));
      const projection = projectToMindMapTree(
        { topics: mockTopics, notes: mockNotes, resources: mockResources },
        "topic-tu-dieu-de"
      );

      const markdown = exportMindMapToMarkdown(projection!, topicMap);

      expect(markdown).toContain("# 🗺️ Sơ Đồ Tư Duy: Tứ Diệu Đế");
      expect(markdown).toContain("- 📚 **[Tứ Diệu Đế](#/topics/topic-tu-dieu-de)** `[Hoàn thành: 100%]`");
      expect(markdown).toContain("[tiên quyết] 📚 **[Bát Chánh Đạo](#/topics/topic-bat-chanh-dao)** `[Tiến độ: 50%]`");
      expect(markdown).toContain("[ghi chú] 📝 [Tóm Lược 4 Chân Lý](#/topics/topic-tu-dieu-de)");
    });

    it("falls back to plain text without broken link when note parent cannot be resolved", () => {
      const syntheticProjection: MindMapTreeProjection = {
        rootNodeId: "topic-orphan",
        rootTitle: "Orphan Topic",
        layoutMode: "tree_horizontal",
        maxDepthReached: 1,
        totalNodesCount: 2,
        hasTruncatedBranches: false,
        hasCyclesDetected: false,
        generatedAt: "2026-01-01T00:00:00Z",
        tree: {
          id: "topic-orphan",
          title: "Orphan Topic",
          type: "topic",
          domain: "general",
          hopDistance: 0,
          tags: [],
          children: [
            {
              id: "note-unresolved",
              title: "Unresolved Floating Note",
              type: "note",
              domain: "general",
              hopDistance: 1,
              tags: [],
              children: [],
            },
          ],
        },
      };

      // Empty topicMap, note parentHopId is undefined
      const markdown = exportMindMapToMarkdown(syntheticProjection, new Map());

      expect(markdown).toContain("- 📚 **[Orphan Topic](#/topics/topic-orphan)**");
      // Note must be plain text label, NOT a broken [Note](#/topics/undefined) link
      expect(markdown).toContain("- 📝 Unresolved Floating Note");
      expect(markdown).not.toContain("](#/topics/undefined)");
      expect(markdown).not.toContain("](#/notes/");
    });
  });
});
