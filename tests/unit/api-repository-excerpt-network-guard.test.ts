/**
 * Unit Test Suite: ApiDataRepository Research Excerpt & Inbox Network Guard Contracts
 *
 * Scope:
 * 1. getResearchExcerpts
 * 2. createResearchExcerpt
 * 3. updateResearchExcerpt
 * 4. deleteResearchExcerpt
 * 5. getResearchInboxItems
 * 6. createResearchInboxItem
 * 7. processResearchInboxItem
 * 8. deleteResearchInboxItem
 *
 * Scenarios:
 * 1. Guard-blocked mode (unmocked plain recording fetch blocker, getUrl returns null):
 *    - transport journal length === 0
 *    - read methods delegate to localFallback
 *    - write methods delegate to localFallback and return local result
 *    - NO fallback to `${apiBaseUrl}${path}`
 *
 * 2. Explicit mocked HTTP success (vi.fn() installed, getUrl returns valid URL):
 *    - fetch called exactly once
 *    - exact HTTP method: GET/POST/PUT/DELETE/PATCH
 *    - exact URL/endpoint and query string
 *    - exact headers/body according to existing contract
 *    - successful server response returned
 *
 * 3. Error paths (non-success & network rejection):
 *    - graceful fallback to localFallback / local result
 *    - does not throw to caller
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  ApiDataRepository,
  LocalStorageDataRepository,
} from "../../src/services/dataRepository";
import type { ResearchExcerpt, ResearchInboxItem } from "../../src/types";

describe("ApiDataRepository - Research Excerpt & Inbox Network Guard Contracts", () => {
  interface RecordedCall {
    url: string;
    method: string;
    headers?: Record<string, string>;
    body?: string;
  }

  let journal: RecordedCall[] = [];
  let originalGlobalFetch: typeof globalThis.fetch;
  let originalWindowFetch: typeof window.fetch | undefined;

  const sampleExcerpt: ResearchExcerpt = {
    id: "excerpt-001",
    archivedDocumentId: "doc-001",
    topicId: "topic-001",
    selectedText: "Important research text",
    positionSelector: { page: 1 },
    highlightColor: "#ffe066",
    status: "active",
    createdAt: "2026-11-02T10:00:00.000Z",
    updatedAt: "2026-11-02T10:00:00.000Z",
  };

  const sampleInboxItem: ResearchInboxItem = {
    id: "inbox-001",
    excerptId: "excerpt-001",
    excerpt: sampleExcerpt,
    isProcessed: false,
    priority: 1,
    createdAt: "2026-11-02T10:00:00.000Z",
    updatedAt: "2026-11-02T10:00:00.000Z",
  };

  /**
   * Install a plain recording stub without Vitest/Jest mock metadata.
   * This stub has NO _isMockFunction or mock properties,
   * causing getUrl() to evaluate `isFetchMocked === false` and return `null`.
   */
  const installUnmockedJournalBlocker = () => {
    journal = [];
    const plainBlocker = (
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> => {
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
      return Promise.reject(
        new Error(`[NetworkBlocker] Unexpected call to: ${url}`)
      );
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
  // Scenario 1: Guard-blocked mode (getUrl returns null)
  // =========================================================================
  describe("Scenario 1: Guard-blocked mode (unmocked recording fetch, getUrl === null)", () => {
    it("1.1 getResearchExcerpts: asserts zero transport calls and delegates to localFallback", async () => {
      installUnmockedJournalBlocker();
      const local = new LocalStorageDataRepository();
      const localSpy = vi.spyOn(local, "getResearchExcerpts").mockResolvedValue([sampleExcerpt]);
      const repo = new ApiDataRepository("/api", local);

      const result = await repo.getResearchExcerpts({ topicId: "topic-001" });

      expect(journal).toHaveLength(0);
      expect(localSpy).toHaveBeenCalledTimes(1);
      expect(localSpy).toHaveBeenCalledWith({ topicId: "topic-001" });
      expect(result).toEqual([sampleExcerpt]);
    });

    it("1.2 createResearchExcerpt: asserts zero transport calls, delegates to localFallback and returns local result", async () => {
      installUnmockedJournalBlocker();
      const local = new LocalStorageDataRepository();
      const input = { archivedDocumentId: "doc-001", selectedText: "Text" };
      const localSpy = vi.spyOn(local, "createResearchExcerpt").mockResolvedValue(sampleExcerpt);
      const repo = new ApiDataRepository("/api", local);

      const result = await repo.createResearchExcerpt(input);

      expect(journal).toHaveLength(0);
      expect(localSpy).toHaveBeenCalledTimes(1);
      expect(localSpy).toHaveBeenCalledWith(input);
      expect(result).toEqual(sampleExcerpt);
    });

    it("1.3 updateResearchExcerpt: asserts zero transport calls, delegates to localFallback and returns local result", async () => {
      installUnmockedJournalBlocker();
      const local = new LocalStorageDataRepository();
      const input = { selectedText: "Updated Text" };
      const localSpy = vi.spyOn(local, "updateResearchExcerpt").mockResolvedValue(sampleExcerpt);
      const repo = new ApiDataRepository("/api", local);

      const result = await repo.updateResearchExcerpt("excerpt-001", input);

      expect(journal).toHaveLength(0);
      expect(localSpy).toHaveBeenCalledTimes(1);
      expect(localSpy).toHaveBeenCalledWith("excerpt-001", input);
      expect(result).toEqual(sampleExcerpt);
    });

    it("1.4 deleteResearchExcerpt: asserts zero transport calls, delegates to localFallback and returns true", async () => {
      installUnmockedJournalBlocker();
      const local = new LocalStorageDataRepository();
      const localSpy = vi.spyOn(local, "deleteResearchExcerpt").mockResolvedValue(true);
      const repo = new ApiDataRepository("/api", local);

      const result = await repo.deleteResearchExcerpt("excerpt-001");

      expect(journal).toHaveLength(0);
      expect(localSpy).toHaveBeenCalledTimes(1);
      expect(localSpy).toHaveBeenCalledWith("excerpt-001");
      expect(result).toBe(true);
    });

    it("1.5 getResearchInboxItems: asserts zero transport calls and delegates to localFallback", async () => {
      installUnmockedJournalBlocker();
      const local = new LocalStorageDataRepository();
      const localSpy = vi.spyOn(local, "getResearchInboxItems").mockResolvedValue([sampleInboxItem]);
      const repo = new ApiDataRepository("/api", local);

      const result = await repo.getResearchInboxItems();

      expect(journal).toHaveLength(0);
      expect(localSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual([sampleInboxItem]);
    });

    it("1.6 createResearchInboxItem: asserts zero transport calls, delegates to localFallback and returns local result", async () => {
      installUnmockedJournalBlocker();
      const local = new LocalStorageDataRepository();
      const input = { excerptId: "excerpt-001", priority: 1 };
      const localSpy = vi.spyOn(local, "createResearchInboxItem").mockResolvedValue(sampleInboxItem);
      const repo = new ApiDataRepository("/api", local);

      const result = await repo.createResearchInboxItem(input);

      expect(journal).toHaveLength(0);
      expect(localSpy).toHaveBeenCalledTimes(1);
      expect(localSpy).toHaveBeenCalledWith(input);
      expect(result).toEqual(sampleInboxItem);
    });

    it("1.7 processResearchInboxItem: asserts zero transport calls, delegates to localFallback and returns local result", async () => {
      installUnmockedJournalBlocker();
      const local = new LocalStorageDataRepository();
      const localSpy = vi.spyOn(local, "processResearchInboxItem").mockResolvedValue(sampleInboxItem);
      const repo = new ApiDataRepository("/api", local);

      const result = await repo.processResearchInboxItem("inbox-001", true);

      expect(journal).toHaveLength(0);
      expect(localSpy).toHaveBeenCalledTimes(1);
      expect(localSpy).toHaveBeenCalledWith("inbox-001", true);
      expect(result).toEqual(sampleInboxItem);
    });

    it("1.8 deleteResearchInboxItem: asserts zero transport calls, delegates to localFallback and returns true", async () => {
      installUnmockedJournalBlocker();
      const local = new LocalStorageDataRepository();
      const localSpy = vi.spyOn(local, "deleteResearchInboxItem").mockResolvedValue(true);
      const repo = new ApiDataRepository("/api", local);

      const result = await repo.deleteResearchInboxItem("inbox-001");

      expect(journal).toHaveLength(0);
      expect(localSpy).toHaveBeenCalledTimes(1);
      expect(localSpy).toHaveBeenCalledWith("inbox-001");
      expect(result).toBe(true);
    });
  });

  // =========================================================================
  // Scenario 2: Explicit mocked HTTP success (getUrl returns valid URL)
  // =========================================================================
  describe("Scenario 2: Explicit mocked HTTP success mode", () => {
    it("2.1 getResearchExcerpts: fetches /api/excerpts with query parameters", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [sampleExcerpt],
      });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const local = new LocalStorageDataRepository();
      const repo = new ApiDataRepository("/api", local);

      const result = await repo.getResearchExcerpts({ topicId: "topic-001", tag: "test-tag" });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const call = mockFetch.mock.calls[0];
      expect(call[0]).toContain("/api/excerpts?topicId=topic-001&tag=test-tag");
      expect(result).toEqual([sampleExcerpt]);
    });

    it("2.2 createResearchExcerpt: sends POST to /api/excerpts with payload", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => sampleExcerpt,
      });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const local = new LocalStorageDataRepository();
      vi.spyOn(local, "createResearchExcerpt").mockResolvedValue(sampleExcerpt);
      const repo = new ApiDataRepository("/api", local);

      const input = { archivedDocumentId: "doc-001", selectedText: "Text" };
      const result = await repo.createResearchExcerpt(input);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const call = mockFetch.mock.calls[0];
      expect(call[0]).toContain("/api/excerpts");
      expect(call[1]?.method).toBe("POST");
      expect(call[1]?.headers).toEqual({ "Content-Type": "application/json" });
      expect(JSON.parse(call[1]?.body as string)).toEqual(input);
      expect(result).toEqual(sampleExcerpt);
    });

    it("2.3 updateResearchExcerpt: sends PUT to /api/excerpts/:id with payload", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => sampleExcerpt,
      });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const local = new LocalStorageDataRepository();
      vi.spyOn(local, "updateResearchExcerpt").mockResolvedValue(sampleExcerpt);
      const repo = new ApiDataRepository("/api", local);

      const input = { selectedText: "Updated" };
      const result = await repo.updateResearchExcerpt("excerpt-001", input);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const call = mockFetch.mock.calls[0];
      expect(call[0]).toContain("/api/excerpts/excerpt-001");
      expect(call[1]?.method).toBe("PUT");
      expect(call[1]?.headers).toEqual({ "Content-Type": "application/json" });
      expect(result).toEqual(sampleExcerpt);
    });

    it("2.4 deleteResearchExcerpt: sends DELETE to /api/excerpts/:id", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const local = new LocalStorageDataRepository();
      vi.spyOn(local, "deleteResearchExcerpt").mockResolvedValue(true);
      const repo = new ApiDataRepository("/api", local);

      const result = await repo.deleteResearchExcerpt("excerpt-001");

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const call = mockFetch.mock.calls[0];
      expect(call[0]).toContain("/api/excerpts/excerpt-001");
      expect(call[1]?.method).toBe("DELETE");
      expect(result).toBe(true);
    });

    it("2.5 getResearchInboxItems: fetches /api/excerpts/inbox", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [sampleInboxItem],
      });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const local = new LocalStorageDataRepository();
      const repo = new ApiDataRepository("/api", local);

      const result = await repo.getResearchInboxItems();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const call = mockFetch.mock.calls[0];
      expect(call[0]).toContain("/api/excerpts/inbox");
      expect(result).toEqual([sampleInboxItem]);
    });

    it("2.6 createResearchInboxItem: sends POST to /api/excerpts/inbox with payload", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => sampleInboxItem,
      });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const local = new LocalStorageDataRepository();
      vi.spyOn(local, "createResearchInboxItem").mockResolvedValue(sampleInboxItem);
      const repo = new ApiDataRepository("/api", local);

      const input = { excerptId: "excerpt-001" };
      const result = await repo.createResearchInboxItem(input);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const call = mockFetch.mock.calls[0];
      expect(call[0]).toContain("/api/excerpts/inbox");
      expect(call[1]?.method).toBe("POST");
      expect(result).toEqual(sampleInboxItem);
    });

    it("2.7 processResearchInboxItem: sends PATCH to /api/excerpts/inbox/:id/process", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => sampleInboxItem,
      });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const local = new LocalStorageDataRepository();
      vi.spyOn(local, "processResearchInboxItem").mockResolvedValue(sampleInboxItem);
      const repo = new ApiDataRepository("/api", local);

      const result = await repo.processResearchInboxItem("inbox-001", true);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const call = mockFetch.mock.calls[0];
      expect(call[0]).toContain("/api/excerpts/inbox/inbox-001/process");
      expect(call[1]?.method).toBe("PATCH");
      expect(JSON.parse(call[1]?.body as string)).toEqual({ isProcessed: true });
      expect(result).toEqual(sampleInboxItem);
    });

    it("2.8 deleteResearchInboxItem: sends DELETE to /api/excerpts/inbox/:id", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const local = new LocalStorageDataRepository();
      vi.spyOn(local, "deleteResearchInboxItem").mockResolvedValue(true);
      const repo = new ApiDataRepository("/api", local);

      const result = await repo.deleteResearchInboxItem("inbox-001");

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const call = mockFetch.mock.calls[0];
      expect(call[0]).toContain("/api/excerpts/inbox/inbox-001");
      expect(call[1]?.method).toBe("DELETE");
      expect(result).toBe(true);
    });
  });

  // =========================================================================
  // Scenario 3: Error paths and fallback semantics
  // =========================================================================
  describe("Scenario 3: Error paths and fallback semantics", () => {
    it("3.1 getResearchExcerpts: falls back to localFallback on HTTP 500 error", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const local = new LocalStorageDataRepository();
      vi.spyOn(local, "getResearchExcerpts").mockResolvedValue([sampleExcerpt]);
      const repo = new ApiDataRepository("/api", local);

      const result = await repo.getResearchExcerpts();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result).toEqual([sampleExcerpt]);
    });

    it("3.2 getResearchExcerpts: falls back to localFallback on network rejection", async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error("Connection refused"));
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const local = new LocalStorageDataRepository();
      vi.spyOn(local, "getResearchExcerpts").mockResolvedValue([sampleExcerpt]);
      const repo = new ApiDataRepository("/api", local);

      const result = await repo.getResearchExcerpts();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result).toEqual([sampleExcerpt]);
    });

    it("3.3 createResearchExcerpt: falls back to local result on network rejection", async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error("Offline"));
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const local = new LocalStorageDataRepository();
      vi.spyOn(local, "createResearchExcerpt").mockResolvedValue(sampleExcerpt);
      const repo = new ApiDataRepository("/api", local);

      const result = await repo.createResearchExcerpt({ selectedText: "Text" });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result).toEqual(sampleExcerpt);
    });

    it("3.4 updateResearchExcerpt: falls back to local result on network rejection", async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error("Offline"));
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const local = new LocalStorageDataRepository();
      vi.spyOn(local, "updateResearchExcerpt").mockResolvedValue(sampleExcerpt);
      const repo = new ApiDataRepository("/api", local);

      const result = await repo.updateResearchExcerpt("excerpt-001", { selectedText: "Text" });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result).toEqual(sampleExcerpt);
    });

    it("3.5 deleteResearchExcerpt: falls back to true on network rejection", async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error("Offline"));
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const local = new LocalStorageDataRepository();
      vi.spyOn(local, "deleteResearchExcerpt").mockResolvedValue(true);
      const repo = new ApiDataRepository("/api", local);

      const result = await repo.deleteResearchExcerpt("excerpt-001");

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result).toBe(true);
    });

    it("3.6 getResearchInboxItems: falls back to localFallback on HTTP 500", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const local = new LocalStorageDataRepository();
      vi.spyOn(local, "getResearchInboxItems").mockResolvedValue([sampleInboxItem]);
      const repo = new ApiDataRepository("/api", local);

      const result = await repo.getResearchInboxItems();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result).toEqual([sampleInboxItem]);
    });

    it("3.7 createResearchInboxItem: falls back to local result on HTTP 500", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const local = new LocalStorageDataRepository();
      vi.spyOn(local, "createResearchInboxItem").mockResolvedValue(sampleInboxItem);
      const repo = new ApiDataRepository("/api", local);

      const result = await repo.createResearchInboxItem({ excerptId: "excerpt-001" });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result).toEqual(sampleInboxItem);
    });

    it("3.8 processResearchInboxItem: falls back to local result on network rejection", async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error("Offline"));
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const local = new LocalStorageDataRepository();
      vi.spyOn(local, "processResearchInboxItem").mockResolvedValue(sampleInboxItem);
      const repo = new ApiDataRepository("/api", local);

      const result = await repo.processResearchInboxItem("inbox-001", true);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result).toEqual(sampleInboxItem);
    });

    it("3.9 deleteResearchInboxItem: falls back to true on network rejection", async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error("Offline"));
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const local = new LocalStorageDataRepository();
      vi.spyOn(local, "deleteResearchInboxItem").mockResolvedValue(true);
      const repo = new ApiDataRepository("/api", local);

      const result = await repo.deleteResearchInboxItem("inbox-001");

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result).toBe(true);
    });
  });
});
