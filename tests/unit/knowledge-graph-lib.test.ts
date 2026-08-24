import { describe, it, expect } from "vitest";
import {
  buildAdjacencyGraph,
  getDirectNeighbors,
  traverseMultiHop,
  filterSubgraph,
  GraphNodeMetadata,
  GraphEdgeMetadata,
  KnowledgeGraphData,
  SubgraphResult,
} from "../../src/lib/knowledgeGraph";
import { Topic, Note, Resource } from "../../src/types";

describe("Workstream 5A: Advanced Knowledge Graph & Multi-Hop Traversal Explorer", () => {
  // Mock canonical topics fixture
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
          id: "link-dangling",
          sourceId: "topic-tu-dieu-de",
          targetId: "non-existent-topic-id", // Dangling edge
          linkType: "related",
          strength: 1,
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
      description: "Con đường tám nhánh dẫn đến giải thoát.",
      content: "Chánh kiến, Chánh tư duy...",
      categoryId: "cat-phat-hoc",
      tags: ["phat-hoc", "dao-de"],
      links: [
        {
          id: "link-2",
          sourceId: "topic-bat-chanh-dao",
          targetId: "topic-tam-tuong",
          linkType: "related",
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
        totalNotes: 0,
        timeSpent: 30,
      },
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    {
      id: "topic-tam-tuong",
      title: "Tam Tướng (Vô thường - Khổ - Vô ngã)",
      slug: "tam-tuong",
      type: "phat-hoc",
      description: "Ba đặc tính phổ quát của các pháp hữu vi.",
      content: "Anicca, Dukkha, Anattā.",
      categoryId: "cat-phat-hoc",
      tags: ["phat-hoc", "triet-ly"],
      links: [
        {
          id: "link-cycle",
          sourceId: "topic-tam-tuong",
          targetId: "topic-tu-dieu-de", // Cycle: tu-dieu-de -> bat-chanh-dao -> tam-tuong -> tu-dieu-de
          linkType: "advanced",
          strength: 3,
        },
      ],
      studyProgress: {
        topicId: "topic-tam-tuong",
        status: "not_started",
        progress: 0,
        repetitions: 0,
        interval: 1,
        easeFactor: 2.5,
        totalNotes: 0,
        timeSpent: 0,
      },
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    {
      id: "topic-ky-mon-don-giap",
      title: "Kỳ Môn Độn Giáp",
      slug: "ky-mon-don-giap",
      type: "huyen-hoc",
      description: "Học thuyết Huyền học phương Đông.",
      content: "Bát Môn, Cửu Tinh, Bát Thần.",
      categoryId: "cat-huyen-hoc",
      tags: ["huyen-hoc", "ky-mon"],
      links: [],
      studyProgress: {
        topicId: "topic-ky-mon-don-giap",
        status: "not_started",
        progress: 0,
        repetitions: 0,
        interval: 1,
        easeFactor: 2.5,
        totalNotes: 0,
        timeSpent: 0,
      },
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
  ];

  // Mock notes fixture
  const mockNotes: Note[] = [
    {
      id: "note-1",
      topicId: "topic-tu-dieu-de",
      title: "Ghi chú về Khổ Đế",
      content: "Khảo sát thực chứng về khổ đau.",
      type: "study",
      tags: ["kho-de"],
      createdAt: "2026-08-24T00:00:00Z",
      updatedAt: "2026-08-24T00:00:00Z",
      isPrivate: false,
    },
  ];

  // Mock resources fixture (zero binary ingestion)
  const mockResources: Resource[] = [
    {
      id: "res-1",
      topicId: "topic-tu-dieu-de",
      title: "Kinh Chuyển Pháp Luân - Dhammacakkappavattana Sutta",
      type: "book",
      url: "",
      filePath: "/Users/mr.chem/Documents/Books/Dhammacakka.pdf",
      author: "Hòa thượng Thích Minh Châu",
      notes: "Tài liệu gốc về Tứ Diệu Đế.",
      createdAt: "2026-08-24T00:00:00Z",
    },
  ];

  describe("1. buildAdjacencyGraph & Dangling Edge Handling", () => {
    it("builds clean adjacency graph and automatically discards dangling edges", () => {
      const graph: KnowledgeGraphData = buildAdjacencyGraph({
        topics: mockTopics,
        notes: mockNotes,
        resources: mockResources,
      });

      // Total nodes = 4 topics + 1 note + 1 resource = 6 nodes
      expect(graph.nodes.size).toBe(6);

      // Verify topic node structure
      const topicNode = graph.nodes.get("topic-tu-dieu-de");
      expect(topicNode).toBeDefined();
      expect(topicNode?.type).toBe("topic");
      expect(topicNode?.domain).toBe("phat-hoc");

      // Verify dangling edge was discarded
      const danglingEdge = graph.edges.find(
        (e) => e.target === "non-existent-topic-id"
      );
      expect(danglingEdge).toBeUndefined();

      // Verify structural edges exist
      const noteEdge = graph.edges.find((e) => e.target === "note-1");
      expect(noteEdge).toBeDefined();
      expect(noteEdge?.type).toBe("has_note");

      const resEdge = graph.edges.find((e) => e.target === "res-1");
      expect(resEdge).toBeDefined();
      expect(resEdge?.type).toBe("has_resource");
    });
  });

  describe("2. getDirectNeighbors (1-Hop Traversal)", () => {
    it("extracts 1-hop direct neighbors and correctly computes node degree", () => {
      const graph = buildAdjacencyGraph({
        topics: mockTopics,
        notes: mockNotes,
        resources: mockResources,
      });

      const neighbors = getDirectNeighbors(graph, "topic-tu-dieu-de");

      // Neighbors of topic-tu-dieu-de:
      // Outgoing to topic-bat-chanh-dao, Incoming from topic-tam-tuong
      // Note: note-1, Resource: res-1
      expect(neighbors.nodes.some((n) => n.id === "topic-bat-chanh-dao")).toBe(true);
      expect(neighbors.nodes.some((n) => n.id === "note-1")).toBe(true);
      expect(neighbors.nodes.some((n) => n.id === "res-1")).toBe(true);

      // Degree must reflect total adjacent connections
      expect(neighbors.degree).toBeGreaterThanOrEqual(3);
    });
  });

  describe("3. traverseMultiHop (Bounded k-Hop Traversal)", () => {
    it("traverses graph with bounded maxDepth and maxNodesLimit", () => {
      const graph = buildAdjacencyGraph({
        topics: mockTopics,
        notes: mockNotes,
        resources: mockResources,
      });

      // 1-hop traversal from topic-tu-dieu-de
      const depth1Result: SubgraphResult = traverseMultiHop(graph, {
        startNodeId: "topic-tu-dieu-de",
        maxDepth: 1,
        maxNodesLimit: 50,
      });
      expect(depth1Result.depthReached).toBeLessThanOrEqual(1);

      // 2-hop traversal should reach topic-tam-tuong via bat-chanh-dao
      const depth2Result: SubgraphResult = traverseMultiHop(graph, {
        startNodeId: "topic-tu-dieu-de",
        maxDepth: 2,
        maxNodesLimit: 50,
      });
      expect(depth2Result.nodes.some((n) => n.id === "topic-tam-tuong")).toBe(true);

      // Test maxNodesLimit capping
      const cappedResult = traverseMultiHop(graph, {
        startNodeId: "topic-tu-dieu-de",
        maxDepth: 3,
        maxNodesLimit: 2,
      });
      expect(cappedResult.nodes.length).toBeLessThanOrEqual(2);
    });
  });

  describe("4. detectAndIsolateCycles (Cycle Avoidance)", () => {
    it("detects cycle and avoids infinite recursion without duplicate node visits", () => {
      const graph = buildAdjacencyGraph({
        topics: mockTopics,
        notes: mockNotes,
        resources: mockResources,
      });

      // Traversal on cycle: tu-dieu-de -> bat-chanh-dao -> tam-tuong -> tu-dieu-de
      const cycleResult = traverseMultiHop(graph, {
        startNodeId: "topic-tu-dieu-de",
        maxDepth: 5, // Deep traversal that traverses the cycle multiple times if unbounded
      });

      expect(cycleResult.hasCycles).toBe(true);

      // Each node ID must appear at most once in nodes array
      const nodeIds = cycleResult.nodes.map((n) => n.id);
      const uniqueNodeIds = new Set(nodeIds);
      expect(nodeIds.length).toBe(uniqueNodeIds.size);
    });
  });

  describe("5. filterSubgraph (Semantic & Structural Filters)", () => {
    it("filters subgraph by specific nodeTypes and edgeTypes", () => {
      const graph = buildAdjacencyGraph({
        topics: mockTopics,
        notes: mockNotes,
        resources: mockResources,
      });

      // Filter: only topics (exclude notes and resources)
      const topicOnlyResult = filterSubgraph(graph, {
        nodeTypes: ["topic"],
      });
      expect(topicOnlyResult.nodes.every((n) => n.type === "topic")).toBe(true);
      expect(topicOnlyResult.nodes.some((n) => n.type === "note")).toBe(false);

      // Filter: only prerequisite semantic edges
      const prerequisiteOnlyResult = filterSubgraph(graph, {
        edgeTypes: ["prerequisite"],
      });
      expect(
        prerequisiteOnlyResult.edges.every((e) => e.type === "prerequisite")
      ).toBe(true);
    });
  });

  describe("6. Zero Binary Ingestion Guard on Graph Model", () => {
    it("ensures resource graph nodes strictly store metadata without loading binary buffers", () => {
      const graph = buildAdjacencyGraph({
        topics: mockTopics,
        notes: mockNotes,
        resources: mockResources,
      });

      const resNode = graph.nodes.get("res-1");
      expect(resNode).toBeDefined();
      expect(resNode?.type).toBe("resource");
      expect(resNode?.filePath).toBe("/Users/mr.chem/Documents/Books/Dhammacakka.pdf");
      expect((resNode as any).binaryContent).toBeUndefined();
      expect((resNode as any).buffer).toBeUndefined();
    });
  });
});
