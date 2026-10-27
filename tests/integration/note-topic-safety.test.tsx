import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import express from "express";
import request from "supertest";
import { createTopicRouter } from "../../src/server/routes/topicRoutes";
import { createNoteRouter } from "../../src/server/routes/noteRoutes";
import { createSyncRouter } from "../../src/server/routes/syncRoutes";
import { DataProvider, useData } from "../../src/context/DataContext";

function NoteTopicSafetyTestConsumer() {
  const { notes, topics, deleteTopic, deleteNote } = useData();

  return (
    <div>
      <div data-testid="topics-count">{topics.length}</div>
      <div data-testid="notes-count">{notes.length}</div>

      {topics.map((t) => (
        <button
          key={t.id}
          data-testid={`btn-delete-topic-${t.id}`}
          onClick={() => deleteTopic(t.id)}
        >
          Delete Topic {t.id}
        </button>
      ))}

      {notes.map((n) => (
        <div key={n.id} data-testid={`note-card-${n.id}`}>
          <span data-testid={`note-title-${n.id}`}>{n.title}</span>
          <span data-testid={`note-topic-id-${n.id}`}>{n.topicId ?? "none"}</span>
          <button
            data-testid={`btn-delete-note-${n.id}`}
            onClick={() => deleteNote(n.id)}
          >
            Delete Note {n.id}
          </button>
        </div>
      ))}
    </div>
  );
}

describe("Phase 3 Integration: Note Cascade Safety & Topic Reassignment (ADR-079 / PR-3)", () => {
  const mockCategory = {
    id: "cat-1",
    name: "Knowledge",
    slug: "knowledge",
    type: "general",
    parentId: null,
  };

  let topicsTable: Map<string, any>;
  let notesTable: Map<string, any>;
  let noteTopicLinksTable: Map<string, any>; // key: `${noteId}:${topicId}`
  let mockPrisma: any;
  let app: express.Express;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    topicsTable = new Map();
    notesTable = new Map();
    noteTopicLinksTable = new Map();

    // In-memory Prisma mock that mirrors actual DB schema & relations
    mockPrisma = {
      $transaction: vi.fn().mockImplementation(async (callback: any) => {
        return callback(mockPrisma);
      }),
      category: {
        findUnique: vi.fn().mockResolvedValue(mockCategory),
        findMany: vi.fn().mockResolvedValue([mockCategory]),
      },
      topic: {
        findMany: vi.fn().mockImplementation(async () => Array.from(topicsTable.values())),
        findUnique: vi.fn().mockImplementation(async ({ where }: any) => {
          if (where.id) return topicsTable.get(where.id) || null;
          if (where.slug) {
            return Array.from(topicsTable.values()).find((t) => t.slug === where.slug) || null;
          }
          return null;
        }),
        create: vi.fn().mockImplementation(async ({ data }: any) => {
          const record = { ...data };
          topicsTable.set(record.id, record);
          return record;
        }),
        update: vi.fn().mockImplementation(async ({ where, data }: any) => {
          const existing = topicsTable.get(where.id);
          const updated = { ...existing, ...data };
          topicsTable.set(where.id, updated);
          return updated;
        }),
        delete: vi.fn().mockImplementation(async ({ where }: any) => {
          topicsTable.delete(where.id);
          return { id: where.id };
        }),
      },
      note: {
        findMany: vi.fn().mockImplementation(async (args?: any) => {
          return Array.from(notesTable.values()).map((n) => {
            const links = Array.from(noteTopicLinksTable.values()).filter(
              (l) => l.noteId === n.id
            );
            return {
              ...n,
              additionalTopics: links,
            };
          });
        }),
        findUnique: vi.fn().mockImplementation(async ({ where }: any) => {
          return notesTable.get(where.id) || null;
        }),
        create: vi.fn().mockImplementation(async ({ data }: any) => {
          const id = data.id || `note-${Date.now()}`;
          const record = { id, ...data };
          notesTable.set(id, record);
          return record;
        }),
        update: vi.fn().mockImplementation(async ({ where, data }: any) => {
          const existing = notesTable.get(where.id);
          const updated = { ...existing, ...data };
          notesTable.set(where.id, updated);
          return updated;
        }),
        delete: vi.fn().mockImplementation(async ({ where }: any) => {
          notesTable.delete(where.id);
          // Prisma cascade from note to noteTopicLink
          for (const [key, l] of Array.from(noteTopicLinksTable.entries())) {
            if (l.noteId === where.id) noteTopicLinksTable.delete(key);
          }
          return { id: where.id };
        }),
        upsert: vi.fn().mockImplementation(async ({ where, create, update }: any) => {
          const existing = notesTable.get(where.id);
          if (existing) {
            const updated = { ...existing, ...update };
            notesTable.set(where.id, updated);
            return updated;
          }
          const record = { id: where.id, ...create };
          notesTable.set(record.id, record);
          return record;
        }),
      },
      noteTopicLink: {
        findMany: vi.fn().mockImplementation(async ({ where }: any) => {
          let results = Array.from(noteTopicLinksTable.values());
          if (where?.noteId) {
            results = results.filter((l) => l.noteId === where.noteId);
          }
          if (where?.topicId) {
            results = results.filter((l) => l.topicId === where.topicId);
          }
          return results;
        }),
        deleteMany: vi.fn().mockImplementation(async ({ where }: any) => {
          let count = 0;
          for (const [key, l] of Array.from(noteTopicLinksTable.entries())) {
            let match = true;
            if (where?.noteId && l.noteId !== where.noteId) match = false;
            if (where?.topicId) {
              if (typeof where.topicId === "string" && l.topicId !== where.topicId) match = false;
              if (where.topicId.in && !where.topicId.in.includes(l.topicId)) match = false;
            }
            if (match) {
              noteTopicLinksTable.delete(key);
              count++;
            }
          }
          return { count };
        }),
        upsert: vi.fn().mockImplementation(async ({ where, create }: any) => {
          const noteId = where.noteId_topicId?.noteId || create.noteId;
          const topicId = where.noteId_topicId?.topicId || create.topicId;
          const key = `${noteId}:${topicId}`;
          const record = { noteId, topicId };
          noteTopicLinksTable.set(key, record);
          return record;
        }),
      },
      tag: {
        findMany: vi.fn().mockResolvedValue([]),
        upsert: vi.fn().mockResolvedValue({}),
      },
      topicTag: {
        findMany: vi.fn().mockResolvedValue([]),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        upsert: vi.fn().mockResolvedValue({}),
      },
      studyProgress: { upsert: vi.fn().mockResolvedValue({}) },
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
    app.use("/api", createNoteRouter(mockPrisma));
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
      if (url.includes("/api/resources") || url.includes("/api/tags") || url.includes("/api/links")) {
        return {
          ok: true,
          status: 200,
          json: async () => [],
        } as Response;
      }

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

  // ─── Scenario 1: Deleting primary topic preserves note with secondary topic ─

  it("Scenario 1: Deleting primary topic T1 reassigns note to secondary topic T2", async () => {
    // Seed Topics T1 and T2
    topicsTable.set("topic-t1", {
      id: "topic-t1",
      title: "Topic 1",
      slug: "topic-1",
      categoryId: "cat-1",
      type: "general",
      tags: [],
    });
    topicsTable.set("topic-t2", {
      id: "topic-t2",
      title: "Topic 2",
      slug: "topic-2",
      categoryId: "cat-1",
      type: "general",
      tags: [],
    });

    // Seed Note N1 linked to T1 (primary) and T2 (secondary)
    notesTable.set("note-n1", {
      id: "note-n1",
      title: "Multi-Topic Note",
      topicId: "topic-t1",
      content: "Content",
      tags: [],
    });
    noteTopicLinksTable.set("note-n1:topic-t1", { noteId: "note-n1", topicId: "topic-t1" });
    noteTopicLinksTable.set("note-n1:topic-t2", { noteId: "note-n1", topicId: "topic-t2" });

    // Client requests topic deletion: DELETE /api/topics/topic-t1
    const res = await request(app).delete("/api/topics/topic-t1");
    expect(res.status).toBe(200);

    // CRITICAL CANONICAL CHECK (RED PHASE):
    // In current topicRoutes.ts: DELETE /topics/:id does not call safe note reassignment.
    // Note N1 must survive with primary topic reassigned to topic-t2!
    const note = notesTable.get("note-n1");
    expect(note).toBeDefined();
    expect(note.topicId).toBe("topic-t2");
    expect(noteTopicLinksTable.has("note-n1:topic-t1")).toBe(false);
    expect(noteTopicLinksTable.has("note-n1:topic-t2")).toBe(true);
  });

  // ─── Scenario 2: Deleting the only topic preserves note with topicId = null ──

  it("Scenario 2: Deleting only topic T1 preserves note with topicId = null", async () => {
    topicsTable.set("topic-t1", {
      id: "topic-t1",
      title: "Topic 1",
      slug: "topic-1",
      categoryId: "cat-1",
      type: "general",
      tags: [],
    });

    notesTable.set("note-n2", {
      id: "note-n2",
      title: "Single-Topic Note",
      topicId: "topic-t1",
      content: "Content",
      tags: [],
    });
    noteTopicLinksTable.set("note-n2:topic-t1", { noteId: "note-n2", topicId: "topic-t1" });

    const res = await request(app).delete("/api/topics/topic-t1");
    expect(res.status).toBe(200);

    // CRITICAL CANONICAL CHECK:
    // Note N2 must survive with topicId = null!
    const note = notesTable.get("note-n2");
    expect(note).toBeDefined();
    expect(note.topicId).toBeNull();
    expect(noteTopicLinksTable.has("note-n2:topic-t1")).toBe(false);
  });

  // ─── Scenario 3: Sync hydrate prunes removed secondary topic ───────────────

  it("Scenario 3: Client removes secondary topic T2 -> sync hydrate prunes NoteTopicLink", async () => {
    topicsTable.set("topic-t1", { id: "topic-t1", title: "Topic 1", slug: "topic-1", categoryId: "cat-1" });
    topicsTable.set("topic-t2", { id: "topic-t2", title: "Topic 2", slug: "topic-2", categoryId: "cat-1" });

    notesTable.set("note-n3", {
      id: "note-n3",
      title: "Note 3",
      topicId: "topic-t1",
      content: "Content",
    });
    noteTopicLinksTable.set("note-n3:topic-t1", { noteId: "note-n3", topicId: "topic-t1" });
    noteTopicLinksTable.set("note-n3:topic-t2", { noteId: "note-n3", topicId: "topic-t2" });

    // Client sync payload with only ["topic-t1"] (topic-t2 removed)
    const payload = {
      clientSyncId: "session-note-prune-sec-1",
      clientTimestamp: "2026-10-27T10:00:00Z",
      categories: [],
      tags: [],
      topics: [
        { id: "topic-t1", title: "Topic 1", slug: "topic-1", categoryId: "cat-1", type: "general" },
        { id: "topic-t2", title: "Topic 2", slug: "topic-2", categoryId: "cat-1", type: "general" },
      ],
      notes: [
        {
          id: "note-n3",
          title: "Note 3",
          topicId: "topic-t1",
          topicIds: ["topic-t1"], // topic-t2 removed
          content: "Content",
        },
      ],
      resources: [],
      links: [],
    };

    const res = await request(app).post("/api/sync/hydrate").send(payload);
    expect(res.status).toBe(200);

    // CRITICAL CANONICAL CHECK:
    // In current syncRoutes.ts, NoteTopicLink is only upserted, never deleted!
    // topic-t2 must be pruned from noteTopicLinksTable.
    expect(noteTopicLinksTable.has("note-n3:topic-t2")).toBe(false);
    expect(noteTopicLinksTable.has("note-n3:topic-t1")).toBe(true);
  });

  // ─── Scenario 4: Deleting a note cascades deletion to NoteTopicLink ────────

  it("Scenario 4: Deleting a note removes all associated NoteTopicLink relations", async () => {
    notesTable.set("note-n4", {
      id: "note-n4",
      title: "Note 4",
      topicId: "topic-t1",
      content: "Content",
    });
    noteTopicLinksTable.set("note-n4:topic-t1", { noteId: "note-n4", topicId: "topic-t1" });
    noteTopicLinksTable.set("note-n4:topic-t2", { noteId: "note-n4", topicId: "topic-t2" });

    const res = await request(app).delete("/api/notes/note-n4");
    expect(res.status).toBe(200);

    expect(notesTable.has("note-n4")).toBe(false);
    expect(noteTopicLinksTable.has("note-n4:topic-t1")).toBe(false);
    expect(noteTopicLinksTable.has("note-n4:topic-t2")).toBe(false);
  });
});
