import { describe, it, expect } from "vitest";
import {
  enqueueMutation,
  dequeueMutation,
  markMutationFailed,
  serializeSyncQueue,
  deserializeSyncQueue,
  type SyncMutation,
} from "../../src/lib/syncQueue";

describe("Phase P2.2 — Sync Queue Pure Helper Functions Contract", () => {
  const sampleNoteMutation: SyncMutation = {
    id: "mut-1",
    entityType: "note",
    action: "save",
    entityId: "note-101",
    payload: { id: "note-101", title: "Original Note", topicId: "topic-1" },
    clientTimestamp: "2026-08-28T10:00:00.000Z",
    retryCount: 0,
    status: "pending",
  };

  // ─── 1. Enqueue ──────────────────────────────────────────────────────────

  describe("1. Enqueueing Mutations", () => {
    it("1.1. adds mutation to an empty queue", () => {
      const queue = enqueueMutation([], sampleNoteMutation);
      expect(queue).toHaveLength(1);
      expect(queue[0].id).toBe("mut-1");
      expect(queue[0].status).toBe("pending");
    });

    it("1.2. appends distinct mutation for different entityId", () => {
      const secondMutation: SyncMutation = {
        id: "mut-2",
        entityType: "note",
        action: "save",
        entityId: "note-102",
        payload: { id: "note-102", title: "Second Note" },
        clientTimestamp: "2026-08-28T10:01:00.000Z",
        retryCount: 0,
        status: "pending",
      };

      const queue = enqueueMutation([sampleNoteMutation], secondMutation);
      expect(queue).toHaveLength(2);
      expect(queue[1].id).toBe("mut-2");
    });
  });

  // ─── 2. Coalescing (save -> save) ────────────────────────────────────────

  describe("2. Mutation Coalescing (save -> save)", () => {
    it("2.1. coalesces successive save mutations for the same entity preserving latest payload", () => {
      const updatedMutation: SyncMutation = {
        id: "mut-3",
        entityType: "note",
        action: "save",
        entityId: "note-101",
        payload: { id: "note-101", title: "Updated Note Title", topicId: "topic-1" },
        clientTimestamp: "2026-08-28T10:05:00.000Z",
        retryCount: 0,
        status: "pending",
      };

      const queue = enqueueMutation([sampleNoteMutation], updatedMutation);
      expect(queue).toHaveLength(1);
      expect(queue[0].id).toBe("mut-3");
      expect(queue[0].payload.title).toBe("Updated Note Title");
      expect(queue[0].clientTimestamp).toBe("2026-08-28T10:05:00.000Z");
    });
  });

  // ─── 3. Compaction (save -> delete) ──────────────────────────────────────

  describe("3. Mutation Compaction (save -> delete)", () => {
    it("3.1. replaces prior save mutation with delete mutation for the same entity", () => {
      const deleteMutation: SyncMutation = {
        id: "mut-4",
        entityType: "note",
        action: "delete",
        entityId: "note-101",
        clientTimestamp: "2026-08-28T10:10:00.000Z",
        retryCount: 0,
        status: "pending",
      };

      const queue = enqueueMutation([sampleNoteMutation], deleteMutation);
      expect(queue).toHaveLength(1);
      expect(queue[0].action).toBe("delete");
      expect(queue[0].entityId).toBe("note-101");
      expect(queue[0].payload).toBeUndefined();
    });
  });

  // ─── 4. Dequeue ──────────────────────────────────────────────────────────

  describe("4. Dequeueing Completed Mutations", () => {
    it("4.1. removes completed mutation by id from queue", () => {
      const queue = dequeueMutation([sampleNoteMutation], "mut-1");
      expect(queue).toHaveLength(0);
    });

    it("4.2. leaves other mutations untouched", () => {
      const mut2: SyncMutation = {
        ...sampleNoteMutation,
        id: "mut-2",
        entityId: "note-102",
      };
      const queue = dequeueMutation([sampleNoteMutation, mut2], "mut-1");
      expect(queue).toHaveLength(1);
      expect(queue[0].id).toBe("mut-2");
    });
  });

  // ─── 5. Mark Failed ──────────────────────────────────────────────────────

  describe("5. Marking Mutation Failed", () => {
    it("5.1. increments retryCount and records lastError", () => {
      const queue = markMutationFailed([sampleNoteMutation], "mut-1", "Network timeout");
      expect(queue).toHaveLength(1);
      expect(queue[0].retryCount).toBe(1);
      expect(queue[0].status).toBe("failed");
      expect(queue[0].lastError).toBe("Network timeout");
    });
  });

  // ─── 6. Serialization / Deserialization ──────────────────────────────────

  describe("6. Queue Serialization & Deserialization", () => {
    it("6.1. safely serializes and deserializes queue without data loss", () => {
      const raw = serializeSyncQueue([sampleNoteMutation]);
      expect(typeof raw).toBe("string");
      const parsed = deserializeSyncQueue(raw);
      expect(parsed).toEqual([sampleNoteMutation]);
    });

    it("6.2. gracefully handles corrupt/empty JSON strings", () => {
      expect(deserializeSyncQueue("")).toEqual([]);
      expect(deserializeSyncQueue("null")).toEqual([]);
      expect(deserializeSyncQueue("{invalid-json")).toEqual([]);
    });
  });
});
