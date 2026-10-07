import { describe, it, expect } from "vitest";
import { projectToMindMapTree } from "../../src/lib/mindmapProjection";
import { Topic, KnowledgeLink } from "../../src/types";

function createTopic(
  id: string,
  title: string,
  links: Array<{ id: string; targetId: string; linkType: KnowledgeLink["linkType"]; strength: number }> = []
): Topic {
  return {
    id,
    title,
    slug: id,
    type: "phat-hoc",
    description: `${title} description`,
    content: `${title} content`,
    categoryId: "cat-1",
    tags: ["core"],
    studyProgress: {
      topicId: id,
      status: "not_started",
      progress: 0,
      interval: 1,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 0,
      timeSpent: 0,
    },
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    links: links.map((l) => ({
      ...l,
      sourceId: id,
    })),
  };
}

describe("Mind Map Track B1a: Projection Enrichment Test Suite", () => {
  it("Scenario 1: Extracts non-tree crossEdges connecting sibling branches", () => {
    // Topic A (root) -> Topic B (child), Topic A -> Topic C (child)
    // Non-tree link: Topic B -> Topic C (related, strength 4)
    const topics: Topic[] = [
      createTopic("topic-a", "Tứ Diệu Đế", [
        {
          id: "link-a-b",
          targetId: "topic-b",
          linkType: "prerequisite",
          strength: 5,
        },
        {
          id: "link-a-c",
          targetId: "topic-c",
          linkType: "prerequisite",
          strength: 5,
        },
      ]),
      createTopic("topic-b", "Bát Chánh Đạo", [
        {
          id: "link-b-c",
          targetId: "topic-c",
          linkType: "related",
          strength: 4,
        },
      ]),
      createTopic("topic-c", "Duyên Khởi", []),
    ];

    const projection = projectToMindMapTree({ topics }, "topic-a");
    expect(projection).not.toBeNull();
    expect(projection!.rootNodeId).toBe("topic-a");

    // Primary tree children
    expect(projection!.tree.children.map((c) => c.id)).toEqual([
      "topic-b",
      "topic-c",
    ]);

    // Cross edges verification
    expect(projection!.crossEdges).toBeDefined();
    expect(projection!.crossEdges.length).toBe(1);

    const crossEdge = projection!.crossEdges[0];
    expect(crossEdge.type).toBe("related");
    expect(crossEdge.strength).toBe(4);
    expect([crossEdge.sourceNodeId, crossEdge.targetNodeId].sort()).toEqual([
      "topic-b",
      "topic-c",
    ]);
  });

  it("Scenario 2: Excludes canonical tree edges from crossEdges", () => {
    const topics: Topic[] = [
      createTopic("topic-root", "Root Topic", [
        {
          id: "link-root-child",
          targetId: "topic-child",
          linkType: "prerequisite",
          strength: 5,
        },
      ]),
      createTopic("topic-child", "Child Topic", []),
    ];

    const projection = projectToMindMapTree({ topics }, "topic-root");
    expect(projection).not.toBeNull();
    expect(projection!.tree.children.length).toBe(1);

    // Tree edge "topic-root" -> "topic-child" must NOT be in crossEdges
    expect(projection!.crossEdges).toBeDefined();
    expect(projection!.crossEdges.length).toBe(0);
  });

  it("Scenario 3: Extracts cycleAnnotations when cyclic loop edge is detected", () => {
    // A -> B -> C -> A (cycle back to root A)
    const topics: Topic[] = [
      createTopic("topic-a", "Chủ Đề A", [
        {
          id: "link-a-b",
          targetId: "topic-b",
          linkType: "prerequisite",
          strength: 5,
        },
      ]),
      createTopic("topic-b", "Chủ Đề B", [
        {
          id: "link-b-c",
          targetId: "topic-c",
          linkType: "advanced",
          strength: 4,
        },
      ]),
      createTopic("topic-c", "Chủ Đề C", [
        {
          id: "link-c-a",
          targetId: "topic-a",
          linkType: "related",
          strength: 3,
        },
      ]),
    ];

    const projection = projectToMindMapTree({ topics }, "topic-a");
    expect(projection).not.toBeNull();
    expect(projection!.hasCyclesDetected).toBe(true);

    expect(projection!.cycleAnnotations).toBeDefined();
    expect(projection!.cycleAnnotations.length).toBeGreaterThanOrEqual(1);

    const cycle = projection!.cycleAnnotations.find(
      (c) => c.nodeId === "topic-c" && c.targetAncestorId === "topic-a"
    );
    expect(cycle).toBeDefined();
    expect(cycle?.targetAncestorTitle).toBe("Chủ Đề A");
  });

  it("Scenario 4: Enforces hard-cap of max 15 cross-edges with deterministic ordering", () => {
    // Generate root and 20 child topics, with dense cross-links between children
    const topics: Topic[] = [
      createTopic("topic-root", "Root", []),
    ];

    // Connect root to 10 children
    for (let i = 1; i <= 10; i++) {
      const childId = `child-${i}`;
      topics[0].links!.push({
        id: `link-root-${childId}`,
        sourceId: "topic-root",
        targetId: childId,
        linkType: "prerequisite",
        strength: 5,
      });

      topics.push(createTopic(childId, `Child ${i}`, []));
    }

    // Add 25 cross-links among children with varying strengths
    let linkCount = 0;
    for (let i = 1; i <= 9; i++) {
      for (let j = i + 1; j <= 10; j++) {
        if (linkCount >= 25) break;
        const sourceTopic = topics.find((t) => t.id === `child-${i}`)!;
        sourceTopic.links!.push({
          id: `cross-link-${i}-${j}`,
          sourceId: `child-${i}`,
          targetId: `child-${j}`,
          linkType: linkCount % 2 === 0 ? "prerequisite" : "related",
          strength: (linkCount % 5) + 1,
        });
        linkCount++;
      }
    }

    const projection = projectToMindMapTree({ topics }, "topic-root", {
      maxDepth: 3,
      maxNodesLimit: 50,
    });

    expect(projection).not.toBeNull();
    expect(projection!.crossEdges).toBeDefined();
    // Must be capped at exactly 15
    expect(projection!.crossEdges.length).toBe(15);

    // Verify deterministic ordering: strength descending
    for (let i = 0; i < projection!.crossEdges.length - 1; i++) {
      const current = projection!.crossEdges[i];
      const next = projection!.crossEdges[i + 1];
      expect(current.strength).toBeGreaterThanOrEqual(next.strength);
    }
  });
});
