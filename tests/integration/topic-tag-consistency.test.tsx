import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import express from "express";
import request from "supertest";
import { createTopicRouter } from "../../src/server/routes/topicRoutes";
import { createSyncRouter } from "../../src/server/routes/syncRoutes";
import { DataProvider, useData } from "../../src/context/DataContext";

function TopicTagTestConsumer() {
  const { topics, addTopic, updateTopic } = useData();

  return (
    <div>
      <div data-testid="topics-count">{topics.length}</div>
      <button
        data-testid="btn-add-topic-with-tags"
        onClick={() => {
          addTopic({
            title: "Topic Tag Test",
            slug: "topic-tag-test",
            categoryId: "cat-1",
            type: "triet-hoc",
            description: "",
            content: "",
            tags: ["alpha", "beta", "gamma"],
            visibility: "active",
          });
        }}
      >
        Add Topic With Tags
      </button>

      {topics.map((t) => (
        <div key={t.id} data-testid={`topic-item-${t.id}`}>
          <span data-testid={`topic-title-${t.id}`}>{t.title}</span>
          <span data-testid={`topic-tags-count-${t.id}`}>{(t.tags || []).length}</span>
          <ul data-testid={`topic-tags-list-${t.id}`}>
            {(t.tags || []).map((tag) => (
              <li key={tag} data-testid={`topic-tag-${t.id}-${tag}`}>
                {tag}
              </li>
            ))}
          </ul>
          <button
            data-testid={`btn-prune-beta-${t.id}`}
            onClick={() => {
              updateTopic(t.id, {
                tags: ["alpha", "gamma"], // Beta removed
              });
            }}
          >
            Prune Beta
          </button>
          <button
            data-testid={`btn-clear-tags-${t.id}`}
            onClick={() => {
              updateTopic(t.id, {
                tags: [], // Cleared
              });
            }}
          >
            Clear All Tags
          </button>
        </div>
      ))}
    </div>
  );
}

describe("Phase 3 Integration: Topic Tag Consistency & Pruning Lifecycle (ADR-079 / PR-2)", () => {
  const mockCategory = {
    id: "cat-1",
    name: "Triết Học",
    slug: "triet-hoc",
    type: "triet-hoc",
    parentId: null,
  };

  let topicsTable: Map<string, any>;
  let tagsTable: Map<string, any>;
  let topicTagsTable: Map<string, any>;
  let mockPrisma: any;
  let app: express.Express;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    topicsTable = new Map();
    tagsTable = new Map();
    topicTagsTable = new Map();

    mockPrisma = {
      $transaction: vi.fn().mockImplementation(async (callback: any) => {
        return callback(mockPrisma);
      }),
      category: {
        findUnique: vi.fn().mockImplementation(async ({ where }: any) => {
          if (where.id === "cat-1" || where.slug === "triet-hoc") return mockCategory;
          return null;
        }),
        findMany: vi.fn().mockResolvedValue([mockCategory]),
      },
      topic: {
        findMany: vi.fn().mockImplementation(async () => {
          return Array.from(topicsTable.values()).map((t) => {
            const relations = Array.from(topicTagsTable.values()).filter(
              (rel) => rel.topicId === t.id
            );
            return {
              ...t,
              topicTags: relations.map((r) => ({
                ...r,
                tag: tagsTable.get(r.tagId),
              })),
            };
          });
        }),
        findUnique: vi.fn().mockImplementation(async ({ where }: any) => {
          if (where.id) return topicsTable.get(where.id) || null;
          if (where.slug) {
            return Array.from(topicsTable.values()).find((t) => t.slug === where.slug) || null;
          }
          return null;
        }),
        create: vi.fn().mockImplementation(async ({ data }: any) => {
          const id = data.id || `top-${Date.now()}`;
          const record = {
            id,
            ...data,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          topicsTable.set(id, record);
          return record;
        }),
        update: vi.fn().mockImplementation(async ({ where, data }: any) => {
          const existing = topicsTable.get(where.id);
          if (!existing) throw { code: "P2025" };
          const updated = {
            ...existing,
            ...data,
            updatedAt: new Date().toISOString(),
          };
          topicsTable.set(where.id, updated);
          return updated;
        }),
        delete: vi.fn().mockImplementation(async ({ where }: any) => {
          topicsTable.delete(where.id);
          for (const [key, rel] of Array.from(topicTagsTable.entries())) {
            if (rel.topicId === where.id) topicTagsTable.delete(key);
          }
          return { id: where.id };
        }),
        upsert: vi.fn().mockImplementation(async ({ where, create, update }: any) => {
          const existing = topicsTable.get(where.id);
          if (existing) {
            const updated = { ...existing, ...update, updatedAt: new Date().toISOString() };
            topicsTable.set(where.id, updated);
            return updated;
          }
          const record = { id: where.id || create.id || `top-${Date.now()}`, ...create };
          topicsTable.set(record.id, record);
          return record;
        }),
      },
      tag: {
        findMany: vi.fn().mockImplementation(async () => Array.from(tagsTable.values())),
        upsert: vi.fn().mockImplementation(async ({ where, create, update }: any) => {
          let existing = Array.from(tagsTable.values()).find((t) => t.slug === where.slug);
          if (existing) {
            const updated = { ...existing, ...update };
            tagsTable.set(existing.id, updated);
            return updated;
          }
          const id = create?.id || `tag-${where.slug}`;
          const record = { id, slug: where.slug, color: "#D97706", count: 0, ...create };
          tagsTable.set(id, record);
          return record;
        }),
        update: vi.fn().mockImplementation(async ({ where, data }: any) => {
          const existing = tagsTable.get(where.id);
          if (!existing) return {};
          const updated = { ...existing, ...data };
          tagsTable.set(where.id, updated);
          return updated;
        }),
      },
      topicTag: {
        findMany: vi.fn().mockImplementation(async ({ where }: any) => {
          let results = Array.from(topicTagsTable.values());
          if (where?.topicId) {
            results = results.filter((r) => r.topicId === where.topicId);
          }
          if (where?.tagId) {
            if (typeof where.tagId === "string") {
              results = results.filter((r) => r.tagId === where.tagId);
            } else if (where.tagId.in) {
              results = results.filter((r) => where.tagId.in.includes(r.tagId));
            }
          }
          return results.map((r) => ({
            ...r,
            tag: tagsTable.get(r.tagId),
          }));
        }),
        deleteMany: vi.fn().mockImplementation(async ({ where }: any) => {
          let count = 0;
          for (const [key, rel] of Array.from(topicTagsTable.entries())) {
            let match = true;
            if (where?.topicId && rel.topicId !== where.topicId) match = false;
            if (where?.tagId) {
              if (typeof where.tagId === "string" && rel.tagId !== where.tagId) match = false;
              if (where.tagId.in && !where.tagId.in.includes(rel.tagId)) match = false;
            }
            if (match) {
              topicTagsTable.delete(key);
              count++;
            }
          }
          return { count };
        }),
        upsert: vi.fn().mockImplementation(async ({ where, create }: any) => {
          const topicId = where.topicId_tagId?.topicId || create.topicId;
          const tagId = where.topicId_tagId?.tagId || create.tagId;
          const key = `${topicId}:${tagId}`;
          const record = { topicId, tagId };
          topicTagsTable.set(key, record);
          return record;
        }),
      },
      studyProgress: { upsert: vi.fn().mockResolvedValue({}) },
      note: { upsert: vi.fn().mockResolvedValue({}) },
      noteTopicLink: { upsert: vi.fn().mockResolvedValue({}) },
      resource: { upsert: vi.fn().mockResolvedValue({}) },
      knowledgeLink: { upsert: vi.fn().mockResolvedValue({}) },
      syncSession: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({}),
      },
    };

    app = express();
    app.use(express.json());
    app.use("/api", createTopicRouter(mockPrisma));
    app.use("/api", createSyncRouter(mockPrisma));

    // Hermetic fetch dispatch: forwards requests to real Express routers
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      const method = (init?.method || "GET").toLowerCase();
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;

      if (url.includes("/api/categories")) {
        return {
          ok: true,
          status: 200,
          json: async () => [mockCategory],
        } as Response;
      }

      if (url.includes("/api/notes") || url.includes("/api/resources") || url.includes("/api/tags") || url.includes("/api/links")) {
        return {
          ok: true,
          status: 200,
          json: async () => [],
        } as Response;
      }

      // Dispatch to real production topicRoutes and syncRoutes
      const path = url.replace(/^https?:\/\/[^/]+/, "");
      let req = (request(app) as any)[method](path);
      if (body) {
        req = req.send(body);
      }
      const res = await req;
      return {
        ok: res.status >= 200 && res.status < 300,
        status: res.status,
        json: async () => res.body,
      } as Response;
    });
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  // ─── Scenario 1: Updating topic with tags: [] must prune TopicTag ─────────

  it("Scenario 1: Updating topic with tags: [] prunes all TopicTag relations on the server", async () => {
    render(
      <DataProvider>
        <TopicTagTestConsumer />
      </DataProvider>
    );

    // 1. User creates topic with tags ["alpha", "beta", "gamma"]
    fireEvent.click(screen.getByTestId("btn-add-topic-with-tags"));

    await waitFor(() => {
      expect(screen.getByTestId("topics-count").textContent).toBe("1");
    });

    await waitFor(() => {
      expect(topicsTable.size).toBeGreaterThan(0);
    });

    const topicId = Array.from(topicsTable.keys())[0];
    expect(topicId).toBeDefined();

    // Verify initial TopicTag relations created in database by real topicRoutes
    await waitFor(async () => {
      const initialRelations = await mockPrisma.topicTag.findMany({
        where: { topicId },
      });
      expect(initialRelations).toHaveLength(3);
    });

    // 2. User updates topic to clear tags: tags: []
    fireEvent.click(screen.getByTestId(`btn-clear-tags-${topicId}`));

    await waitFor(() => {
      expect(screen.getByTestId(`topic-tags-count-${topicId}`).textContent).toBe("0");
    });

    // CRITICAL CANONICAL CHECK:
    // In production topicRoutes.ts line 247:
    // 'if (normalizedTags.length > 0)' skips syncTopicTags on empty array!
    // Therefore, topicTagsTable still holds 3 relations in Red phase, causing test to FAIL.
    await waitFor(async () => {
      const canonicalRelations = await mockPrisma.topicTag.findMany({
        where: { topicId },
      });
      expect(canonicalRelations).toHaveLength(0);
    });
  });

  // ─── Scenario 2: Hydration sync must prune removed tags ───────────────────

  it("Scenario 2: Sync hydrate prunes TopicTag relations removed by client", async () => {
    // Seed topic with tags: ["alpha", "beta"]
    topicsTable.set("top-sync-1", {
      id: "top-sync-1",
      title: "Sync Topic",
      slug: "sync-topic",
      categoryId: "cat-1",
      tags: ["alpha", "beta"],
    });
    tagsTable.set("tag-alpha", { id: "tag-alpha", name: "alpha", slug: "alpha" });
    tagsTable.set("tag-beta", { id: "tag-beta", name: "beta", slug: "beta" });
    topicTagsTable.set("top-sync-1:tag-alpha", { topicId: "top-sync-1", tagId: "tag-alpha" });
    topicTagsTable.set("top-sync-1:tag-beta", { topicId: "top-sync-1", tagId: "tag-beta" });

    // Client sync payload with only ["alpha"] (beta removed)
    const payload = {
      clientSyncId: "session-sync-prune-1",
      clientTimestamp: "2026-10-27T10:00:00Z",
      categories: [],
      tags: [],
      topics: [
        {
          id: "top-sync-1",
          title: "Sync Topic",
          slug: "sync-topic",
          categoryId: "cat-1",
          type: "triet-hoc",
          tags: ["alpha"], // beta removed
        },
      ],
      notes: [],
      resources: [],
      links: [],
    };

    const res = await request(app).post("/api/sync/hydrate").send(payload);
    expect(res.status).toBe(200);

    // CRITICAL CANONICAL CHECK:
    // In production syncRoutes.ts:
    // There is no deleteMany for topicTag, so beta remains.
    const remainingRelations = await mockPrisma.topicTag.findMany({
      where: { topicId: "top-sync-1" },
    });
    expect(remainingRelations).toHaveLength(1);
    expect(remainingRelations[0].tagId).toBe("tag-alpha");
  });
});
