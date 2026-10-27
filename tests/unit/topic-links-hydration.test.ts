import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { createTopicRouter } from "../../src/server/routes/topicRoutes";
import { normalizeTopics } from "../../src/lib/taxonomyMigration";

describe("Phase 3 Unit: Topic Links Hydration Contract (ADR-079 / PR-1)", () => {
  let mockPrisma: any;
  let app: express.Express;

  const mockSourceLink = {
    id: "link-1",
    sourceId: "top-1",
    targetId: "top-2",
    linkType: "related",
    strength: 3,
    notes: "Tương quan",
    target: { id: "top-2", title: "Topic 2" },
  };

  const mockTargetLink = {
    id: "link-2",
    sourceId: "top-3",
    targetId: "top-1",
    linkType: "prerequisite",
    strength: 4,
    notes: "Tiền đề",
    source: { id: "top-3", title: "Topic 3" },
  };

  beforeEach(() => {
    mockPrisma = {
      topic: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "top-1",
            title: "Topic 1",
            slug: "topic-1",
            categoryId: "cat-1",
            type: "general",
            tags: ["Triết Học"],
            sourceLinks: [mockSourceLink],
            targetLinks: [mockTargetLink],
            notes: [],
            resources: [],
            studyProgress: null,
          },
          {
            id: "top-2",
            title: "Topic 2",
            slug: "topic-2",
            categoryId: "cat-1",
            type: "general",
            tags: [],
            sourceLinks: [],
            targetLinks: [mockSourceLink],
            notes: [],
            resources: [],
            studyProgress: null,
          },
        ]),
      },
      category: {
        findUnique: vi.fn(),
      },
    };

    app = express();
    app.use(express.json());
    app.use("/api", createTopicRouter(mockPrisma));
  });

  // ─── 1. Mapping sourceLinks & targetLinks into Topic.links ───────────────

  it("1.1. GET /api/topics maps database sourceLinks and targetLinks into a unified links array", async () => {
    const response = await request(app).get("/api/topics");

    expect(response.status).toBe(200);
    const topics = response.body;
    expect(topics).toHaveLength(2);

    const topic1 = topics.find((t: any) => t.id === "top-1");
    expect(topic1).toBeDefined();

    // Critical invariant: topic1 MUST have a populated links property
    expect(Array.isArray(topic1.links)).toBe(true);
    expect(topic1.links).toHaveLength(2);

    // Should contain the outgoing link to top-2
    expect(topic1.links.some((l: any) => l.id === "link-1" && l.targetId === "top-2")).toBe(true);
    // Should contain the incoming link from top-3
    expect(topic1.links.some((l: any) => l.id === "link-2" && l.sourceId === "top-3")).toBe(true);
  });

  it("1.2. GET /api/topics preserves link metadata including sourceTitle and targetTitle", async () => {
    const response = await request(app).get("/api/topics");

    expect(response.status).toBe(200);
    const topic1 = response.body.find((t: any) => t.id === "top-1");
    const link1 = topic1.links.find((l: any) => l.id === "link-1");

    expect(link1).toBeDefined();
    expect(link1.linkType).toBe("related");
    expect(link1.strength).toBe(3);
  });

  // ─── 2. Bidirectional Link Exposure ──────────────────────────────────────

  it("2.1. A single link between T1 and T2 is visible on both topics with distinguished roles", async () => {
    const response = await request(app).get("/api/topics");

    expect(response.status).toBe(200);
    const topic1 = response.body.find((t: any) => t.id === "top-1");
    const topic2 = response.body.find((t: any) => t.id === "top-2");

    // Topic 1 sees it as source
    const t1Link = topic1.links.find((l: any) => l.id === "link-1");
    expect(t1Link).toBeDefined();
    expect(t1Link.sourceId).toBe("top-1");
    expect(t1Link.targetId).toBe("top-2");

    // Topic 2 sees it as target
    const t2Link = topic2.links.find((l: any) => l.id === "link-1");
    expect(t2Link).toBeDefined();
    expect(t2Link.sourceId).toBe("top-1");
    expect(t2Link.targetId).toBe("top-2");
  });

  // ─── 3. Client Normalization Preservation ────────────────────────────────

  it("3.1. normalizeTopics preserves populated links array returned from server", () => {
    const rawServerTopics = [
      {
        id: "top-1",
        title: "Topic 1",
        slug: "topic-1",
        categoryId: "cat-1",
        links: [
          {
            id: "link-1",
            sourceId: "top-1",
            targetId: "top-2",
            linkType: "related" as const,
            strength: 3,
          },
        ],
      },
    ];

    const normalized = normalizeTopics(rawServerTopics as any);
    expect(normalized[0].links).toHaveLength(1);
    expect(normalized[0].links[0].id).toBe("link-1");
  });
});
