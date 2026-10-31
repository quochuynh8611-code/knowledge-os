/**
 * Unit Test Suite: ApiDataRepository Flashcard Network Guard & Fallback
 *
 * Scope:
 * - updateFlashcard
 * - deleteFlashcard
 * - getDueFlashcards
 *
 * Scenarios:
 * A. Guard-blocked mode:
 *    - Unmocked plain recording stub (getUrl returns null)
 *    - Assert 0 transport calls
 *    - Assert local mutation runs exactly ONCE (via vi.spyOn)
 *    - Assert correct local fallback return value
 *
 * B. Explicit mocked mode:
 *    - Vitest vi.fn() mock installed (getUrl returns string)
 *    - Correct URL, method, payload
 *    - Server success handling
 *
 * C. Error handling & non-2xx / rejection paths:
 *    - Server 500 error / network rejection falls back to local return value
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ApiDataRepository, LocalStorageDataRepository } from "../../src/services/dataRepository";
import type { FlashcardReviewResponse, FlashcardReviewInput } from "../../src/types/flashcard";

describe("ApiDataRepository - Flashcard Network Guard Contract", () => {
  interface RecordedCall {
    url: string;
    method: string;
    headers?: Record<string, string>;
    body?: string;
  }

  let journal: RecordedCall[] = [];
  let originalGlobalFetch: typeof globalThis.fetch;
  let originalWindowFetch: typeof window.fetch | undefined;

  /**
   * Install a plain recording stub.
   * This stub has NO Vitest/Jest mock metadata (_isMockFunction / mock are undefined),
   * causing getUrl() to evaluate `isFetchMocked === false` and return `null`.
   * It strictly rejects and records calls without any network transmission.
   */
  const installUnmockedJournalBlocker = () => {
    journal = [];
    const plainBlocker = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
          ? input.toString()
          : (input as Request)?.url || String(input);
      const method = init?.method || "GET";
      const headers = init?.headers as Record<string, string> | undefined;
      const body = typeof init?.body === "string" ? init.body : undefined;

      journal.push({ url, method, headers, body });
      return Promise.reject(new Error(`[NetworkBlocker] Unexpected call to: ${url}`));
    };

    globalThis.fetch = plainBlocker as unknown as typeof fetch;
    if (typeof window !== "undefined") {
      window.fetch = plainBlocker as unknown as typeof fetch;
    }
  };

  beforeEach(() => {
    originalGlobalFetch = globalThis.fetch;
    if (typeof window !== "undefined") {
      originalWindowFetch = window.fetch;
    }
    localStorage.clear();
    journal = [];
  });

  afterEach(() => {
    globalThis.fetch = originalGlobalFetch;
    if (typeof window !== "undefined" && originalWindowFetch) {
      window.fetch = originalWindowFetch;
    }
    localStorage.clear();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // Control Cases: Existing compliant methods
  // =========================================================================
  describe("Controls: Compliant core methods", () => {
    it("Control 1: deleteCategory obeys getUrl === null without transport call", async () => {
      installUnmockedJournalBlocker();
      const local = new LocalStorageDataRepository();
      const repo = new ApiDataRepository("/api", local);

      await local.saveCategory({ id: "cat-ctrl", slug: "cat-ctrl", name: "Cat Ctrl", color: "blue" });
      const res = await repo.deleteCategory("cat-ctrl");

      expect(res.status).toBe("deleted");
      expect(res.id).toBe("cat-ctrl");
      expect(journal).toHaveLength(0);
    });

    it("Control 2: createFlashcard obeys getUrl === null without transport call", async () => {
      installUnmockedJournalBlocker();
      const local = new LocalStorageDataRepository();
      const repo = new ApiDataRepository("/api", local);

      const card = await repo.createFlashcard({
        topicId: "topic-ctrl",
        type: "basic",
        front: "Ctrl Front",
        back: "Ctrl Back",
      });

      expect(card).toBeDefined();
      expect(card.id).toBeTruthy();
      expect(journal).toHaveLength(0);
    });
  });

  // =========================================================================
  // Scenario A: Guard-blocked mode (Fetch unmocked, getUrl returns null)
  // =========================================================================
  describe("Scenario A: Guard-blocked mode (unmocked fetch, getUrl returns null)", () => {
    it("A1. deleteFlashcard: does NOT call transport, performs local mutation exactly ONCE", async () => {
      installUnmockedJournalBlocker();
      const local = new LocalStorageDataRepository();
      const repo = new ApiDataRepository("/api", local);

      const created = await local.createFlashcard({
        topicId: "topic-1",
        type: "basic",
        front: "Front",
        back: "Back",
      });

      const localDeleteSpy = vi.spyOn(local, "deleteFlashcard");

      const result = await repo.deleteFlashcard(created.id);

      // Transport must NOT be touched
      expect(journal).toHaveLength(0);
      // Local mutation executed exactly ONCE
      expect(localDeleteSpy).toHaveBeenCalledTimes(1);
      expect(localDeleteSpy).toHaveBeenCalledWith(created.id);
      expect(result).toBe(true);

      // Verify entity actually deleted locally
      const cards = await local.getFlashcards({ topicId: "topic-1" });
      expect(cards.find((c) => c.id === created.id)).toBeUndefined();
    });

    it("A2. updateFlashcard: does NOT call transport, performs local mutation exactly ONCE", async () => {
      installUnmockedJournalBlocker();
      const local = new LocalStorageDataRepository();
      const repo = new ApiDataRepository("/api", local);

      const created = await local.createFlashcard({
        topicId: "topic-1",
        type: "basic",
        front: "Initial Front",
        back: "Initial Back",
      });

      const localUpdateSpy = vi.spyOn(local, "updateFlashcard");

      const updated = await repo.updateFlashcard(created.id, {
        front: "Updated Front",
      });

      // Transport must NOT be touched
      expect(journal).toHaveLength(0);
      // Local mutation executed exactly ONCE
      expect(localUpdateSpy).toHaveBeenCalledTimes(1);
      expect(localUpdateSpy).toHaveBeenCalledWith(created.id, { front: "Updated Front" });
      expect(updated.front).toBe("Updated Front");

      // Verify entity actually updated in local persistence
      const cards = await local.getFlashcards({ topicId: "topic-1" });
      const found = cards.find((c) => c.id === created.id);
      expect(found?.front).toBe("Updated Front");
    });

    it("A3. getDueFlashcards: does NOT call transport, returns cards matching local query", async () => {
      installUnmockedJournalBlocker();
      const local = new LocalStorageDataRepository();
      const repo = new ApiDataRepository("/api", local);

      await local.createFlashcard({
        topicId: "topic-due",
        type: "basic",
        front: "Due Front",
        back: "Due Back",
      });

      const localDueSpy = vi.spyOn(local, "getDueFlashcards");

      const dueCards = await repo.getDueFlashcards({ topicId: "topic-due" });

      // Transport must NOT be touched
      expect(journal).toHaveLength(0);
      // Local reader called exactly once
      expect(localDueSpy).toHaveBeenCalledTimes(1);
      expect(dueCards.length).toBeGreaterThanOrEqual(1);
      expect(dueCards[0].topicId).toBe("topic-due");
    });

    it("A4. recordReviewAtomic: does NOT call transport, executes local review calculation and schedule update", async () => {
      installUnmockedJournalBlocker();
      const local = new LocalStorageDataRepository();
      const repo = new ApiDataRepository("/api", local);

      const created = await local.createFlashcard({
        topicId: "topic-review",
        type: "basic",
        front: "Front to review",
        back: "Back to review",
      });

      const localReviewSpy = vi.spyOn(local, "recordReviewAtomic");

      const reviewInput = {
        clientEventId: "evt-local-1",
        flashcardId: created.id,
        topicId: "topic-review",
        rating: 3 as const,
        reviewDurationMs: 2500,
      };

      const response = await repo.recordReviewAtomic(reviewInput);

      // Transport must NOT be touched
      expect(journal).toHaveLength(0);
      // Local fallback called exactly once
      expect(localReviewSpy).toHaveBeenCalledTimes(1);
      expect(localReviewSpy).toHaveBeenCalledWith(reviewInput);
      expect(response.success).toBe(true);
      expect(response.clientEventId).toBe("evt-local-1");
      expect(response.schedule.repetitions).toBe(1);

      // Verify entity schedule was actually updated in local persistence
      const cards = await local.getFlashcards({ topicId: "topic-review" });
      const found = cards.find((c) => c.id === created.id);
      expect(found?.schedule?.repetitions).toBe(1);
    });

    it("A5. getFlashcardProgress: does NOT call transport, returns local progress stats matching filter", async () => {
      installUnmockedJournalBlocker();
      const local = new LocalStorageDataRepository();
      const repo = new ApiDataRepository("/api", local);

      await local.createFlashcard({
        topicId: "topic-p1",
        type: "basic",
        front: "P1 Front",
        back: "P1 Back",
      });
      await local.createFlashcard({
        topicId: "topic-p2",
        type: "basic",
        front: "P2 Front",
        back: "P2 Back",
      });

      const localProgressSpy = vi.spyOn(local, "getFlashcardProgress");

      const progress = await repo.getFlashcardProgress({ topicId: "topic-p1" });

      // Transport must NOT be touched
      expect(journal).toHaveLength(0);
      expect(localProgressSpy).toHaveBeenCalledTimes(1);
      expect(localProgressSpy).toHaveBeenCalledWith({ topicId: "topic-p1" });
      expect(progress.totalCards).toBe(1);
      expect(progress.newCards).toBe(1);
    });
  });

  // =========================================================================
  // Scenario B: Explicit mocked mode (vi.fn() installed, getUrl returns string)
  // =========================================================================
  describe("Scenario B: Explicit mocked mode (vi.fn installed, getUrl returns valid URL)", () => {
    it("B1. deleteFlashcard: calls transport with DELETE method and correct URL", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const local = new LocalStorageDataRepository();
      const repo = new ApiDataRepository("/api", local);

      const created = await local.createFlashcard({
        topicId: "topic-1",
        type: "basic",
        front: "Front",
        back: "Back",
      });

      const res = await repo.deleteFlashcard(created.id);

      expect(res).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/flashcards/${created.id}`),
        expect.objectContaining({ method: "DELETE" })
      );
    });

    it("B2. updateFlashcard: calls transport with PUT method, headers and JSON payload", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "card-server",
          topicId: "topic-1",
          type: "basic",
          front: "Server Front",
          back: "Server Back",
        }),
      });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const local = new LocalStorageDataRepository();
      const repo = new ApiDataRepository("/api", local);

      const created = await local.createFlashcard({
        topicId: "topic-1",
        type: "basic",
        front: "Old Front",
        back: "Old Back",
      });

      const updated = await repo.updateFlashcard(created.id, { front: "Server Front" });

      expect(updated.front).toBe("Server Front");
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/flashcards/${created.id}`),
        expect.objectContaining({
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ front: "Server Front" }),
        })
      );
    });

    it("B3. getDueFlashcards: calls transport with query parameters and parses JSON", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            id: "card-due-server",
            topicId: "topic-1",
            type: "basic",
            front: "Due Q",
            back: "Due A",
          },
        ],
      });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const local = new LocalStorageDataRepository();
      const repo = new ApiDataRepository("/api", local);

      const due = await repo.getDueFlashcards({ topicId: "topic-1" });

      expect(due).toHaveLength(1);
      expect(due[0].id).toBe("card-due-server");
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/api/flashcards/due?topicId=topic-1"));
    });

    it("B4. recordReviewAtomic: calls transport with POST /flashcards/review and JSON payload, returns server response and syncs local", async () => {
      const local = new LocalStorageDataRepository();
      const repo = new ApiDataRepository("/api", local);

      const created = await local.createFlashcard({
        topicId: "topic-1",
        type: "basic",
        front: "Front",
        back: "Back",
      });

      const serverResponse: FlashcardReviewResponse = {
        success: true,
        duplicate: false,
        clientEventId: "evt-server-1",
        review: {
          id: "rev-server-1",
          clientEventId: "evt-server-1",
          flashcardId: created.id,
          topicId: "topic-1",
          rating: 3,
          reviewDurationMs: 1200,
          reviewedAt: "2026-10-31T12:00:00.000Z",
          stateBefore: "new",
          stateAfter: "review",
          intervalBefore: 0,
          intervalAfter: 1,
          easeFactorBefore: 2.5,
          easeFactorAfter: 2.5,
          dueBeforeAt: "2026-10-31T12:00:00.000Z",
          dueAfterAt: "2026-11-01T12:00:00.000Z",
        },
        schedule: {
          id: `fcs-${created.id}`,
          flashcardId: created.id,
          state: "review",
          dueAt: "2026-11-01T12:00:00.000Z",
          interval: 1,
          easeFactor: 2.5,
          repetitions: 1,
          lapses: 0,
          lastReviewedAt: "2026-10-31T12:00:00.000Z",
          updatedAt: "2026-10-31T12:00:00.000Z",
        },
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => serverResponse,
      });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const reviewInput: FlashcardReviewInput = {
        clientEventId: "evt-server-1",
        flashcardId: created.id,
        topicId: "topic-1",
        rating: 3,
        reviewDurationMs: 1200,
      };

      const localReviewSpy = vi.spyOn(local, "recordReviewAtomic");

      const res = await repo.recordReviewAtomic(reviewInput);

      expect(res).toEqual(serverResponse);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/flashcards/review"),
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reviewInput),
        })
      );
      expect(localReviewSpy).toHaveBeenCalledTimes(1);
      expect(localReviewSpy).toHaveBeenCalledWith(reviewInput);

      // Verify schedule in local persistence advanced by 1 step
      const cards = await local.getFlashcards({ topicId: "topic-1" });
      const found = cards.find((c) => c.id === created.id);
      expect(found?.schedule?.repetitions).toBe(1);
      expect(found?.schedule?.state).toBe("review");
    });

    it("B5. getFlashcardProgress: calls transport with query string and returns server progress", async () => {
      const serverProgress = {
        totalCards: 10,
        newCards: 2,
        learningCards: 3,
        reviewCards: 5,
        dueToday: 4,
        retentionRate: 85,
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => serverProgress,
      });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const local = new LocalStorageDataRepository();
      const repo = new ApiDataRepository("/api", local);

      const progress = await repo.getFlashcardProgress({ topicId: "topic-p1" });

      expect(progress.totalCards).toBe(10);
      expect(progress.retentionRate).toBe(85);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/api/flashcards/progress?topicId=topic-p1"));
    });
  });

  // =========================================================================
  // Scenario C: Error handling & non-2xx / rejection paths
  // =========================================================================
  describe("Scenario C: Error handling & non-2xx fallback semantics", () => {
    it("C1. updateFlashcard: falls back to localUpdated when transport returns 500 error", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const local = new LocalStorageDataRepository();
      const repo = new ApiDataRepository("/api", local);

      const created = await local.createFlashcard({
        topicId: "topic-1",
        type: "basic",
        front: "Original Front",
        back: "Original Back",
      });

      const res = await repo.updateFlashcard(created.id, { front: "Locally Updated Front" });

      // Fallback card returned from localFallback
      expect(res.front).toBe("Locally Updated Front");
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("C2. deleteFlashcard: returns false when transport returns HTTP 500", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const local = new LocalStorageDataRepository();
      const repo = new ApiDataRepository("/api", local);

      const created = await local.createFlashcard({
        topicId: "topic-1",
        type: "basic",
        front: "Front",
        back: "Back",
      });

      const res = await repo.deleteFlashcard(created.id);

      // When HTTP non-2xx is received, res.ok is false
      expect(res).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("C3. deleteFlashcard: returns true when transport throws network rejection (offline fallback)", async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error("Network offline"));
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const local = new LocalStorageDataRepository();
      const repo = new ApiDataRepository("/api", local);

      const created = await local.createFlashcard({
        topicId: "topic-1",
        type: "basic",
        front: "Front",
        back: "Back",
      });

      const res = await repo.deleteFlashcard(created.id);

      // In catch block, deleteFlashcard returns true
      expect(res).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("C4. getDueFlashcards: falls back to local repository when transport throws error", async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error("Connection reset"));
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const local = new LocalStorageDataRepository();
      const repo = new ApiDataRepository("/api", local);

      await local.createFlashcard({
        topicId: "topic-err",
        type: "basic",
        front: "Fallback Front",
        back: "Fallback Back",
      });

      const due = await repo.getDueFlashcards({ topicId: "topic-err" });

      expect(due).toHaveLength(1);
      expect(due[0].front).toBe("Fallback Front");
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("C5. recordReviewAtomic: falls back to local execution when transport returns HTTP 500", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const local = new LocalStorageDataRepository();
      const repo = new ApiDataRepository("/api", local);

      const created = await local.createFlashcard({
        topicId: "topic-err",
        type: "basic",
        front: "Front",
        back: "Back",
      });

      const localReviewSpy = vi.spyOn(local, "recordReviewAtomic");

      const reviewInput: FlashcardReviewInput = {
        clientEventId: "evt-fail-500",
        flashcardId: created.id,
        topicId: "topic-err",
        rating: 3,
        reviewDurationMs: 1500,
      };

      const res = await repo.recordReviewAtomic(reviewInput);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/flashcards/review"),
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reviewInput),
        })
      );
      expect(localReviewSpy).toHaveBeenCalledTimes(1);
      expect(localReviewSpy).toHaveBeenCalledWith(reviewInput);

      expect(res.success).toBe(true);
      expect(res.clientEventId).toBe("evt-fail-500");
      expect(res.review.flashcardId).toBe(created.id);
      expect(res.review.rating).toBe(3);
      expect(res.schedule.repetitions).toBe(1);
      expect(res.schedule.state).toBe("review");

      // Verify entity schedule was actually updated in local persistence
      const cards = await local.getFlashcards({ topicId: "topic-err" });
      const found = cards.find((c) => c.id === created.id);
      expect(found?.schedule?.repetitions).toBe(1);
      expect(found?.schedule?.state).toBe("review");
    });

    it("C6. recordReviewAtomic: falls back to local execution when transport throws network rejection", async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error("Network timeout"));
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const local = new LocalStorageDataRepository();
      const repo = new ApiDataRepository("/api", local);

      const created = await local.createFlashcard({
        topicId: "topic-err",
        type: "basic",
        front: "Front",
        back: "Back",
      });

      const localReviewSpy = vi.spyOn(local, "recordReviewAtomic");

      const reviewInput: FlashcardReviewInput = {
        clientEventId: "evt-fail-reject",
        flashcardId: created.id,
        topicId: "topic-err",
        rating: 1,
        reviewDurationMs: 3000,
      };

      const res = await repo.recordReviewAtomic(reviewInput);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/flashcards/review"),
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reviewInput),
        })
      );
      expect(localReviewSpy).toHaveBeenCalledTimes(1);
      expect(localReviewSpy).toHaveBeenCalledWith(reviewInput);

      expect(res.success).toBe(true);
      expect(res.clientEventId).toBe("evt-fail-reject");
      expect(res.review.flashcardId).toBe(created.id);
      expect(res.review.rating).toBe(1);
      expect(res.schedule.repetitions).toBe(0);
      expect(res.schedule.state).toBe("relearning");
      expect(res.schedule.lapses).toBe(1);

      // Verify entity schedule was actually updated in local persistence
      const cards = await local.getFlashcards({ topicId: "topic-err" });
      const found = cards.find((c) => c.id === created.id);
      expect(found?.schedule?.repetitions).toBe(0);
      expect(found?.schedule?.state).toBe("relearning");
      expect(found?.schedule?.lapses).toBe(1);
    });

    it("C7. getFlashcardProgress: falls back to local repository when transport returns HTTP 500", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const local = new LocalStorageDataRepository();
      const repo = new ApiDataRepository("/api", local);

      await local.createFlashcard({
        topicId: "topic-p-fail",
        type: "basic",
        front: "P Front",
        back: "P Back",
      });

      const progress = await repo.getFlashcardProgress({ topicId: "topic-p-fail" });

      expect(progress.totalCards).toBe(1);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("C8. getFlashcardProgress: falls back to local repository when transport throws network rejection", async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error("Network connection dropped"));
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const local = new LocalStorageDataRepository();
      const repo = new ApiDataRepository("/api", local);

      await local.createFlashcard({
        topicId: "topic-p-fail2",
        type: "basic",
        front: "P Front 2",
        back: "P Back 2",
      });

      const progress = await repo.getFlashcardProgress({ topicId: "topic-p-fail2" });

      expect(progress.totalCards).toBe(1);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});
