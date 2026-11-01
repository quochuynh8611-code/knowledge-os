/**
 * Unit Test Suite: ApiDataRepository Archive & Reading Position Network Guard Contracts
 *
 * Scope:
 * - getArchivedDocuments
 * - updateArchivedDocumentPosition
 *
 * Scenarios:
 * 1. Guard-blocked mode (unmocked plain recording fetch blocker, getUrl returns null):
 *    - transport journal length === 0
 *    - localFallback called exactly once with expected arguments
 *    - returns result from local counterpart
 *
 * 2. Explicit mocked HTTP success (vi.fn() installed, getUrl returns valid URL):
 *    - fetch called with exact URL, method, headers, and payload
 *    - HTTP success handling & saveArchivedDocsCache called on valid list response
 *
 * 3. Error paths (HTTP non-success and network rejection):
 *    - preserves current fallback/error semantics of each method
 *    - no new local fallback introduced
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  ApiDataRepository,
  LocalStorageDataRepository,
} from "../../src/services/dataRepository";
import type { ArchivedDocument, ReadingPositionData } from "../../src/types";

describe("ApiDataRepository - Archive & Reading Position Network Guard Contracts", () => {
  interface RecordedCall {
    url: string;
    method: string;
    headers?: Record<string, string>;
    body?: string;
  }

  let journal: RecordedCall[] = [];
  let originalGlobalFetch: typeof globalThis.fetch;
  let originalWindowFetch: typeof window.fetch | undefined;

  const sampleDoc: ArchivedDocument = {
    id: "doc-archive-001",
    fileName: "sample-study-guide.epub",
    fileSize: 1024,
    mimeType: "application/epub+zip",
    fileFormat: "epub",
    contentHash: "a".repeat(64),
    storageRelPath: "books/sample-study-guide.epub",
    lastPosition: { cfi: "epubcfi(/6/2[chapter1]!/4/2)", percentage: 15 },
    lastReadAt: "2026-11-01T12:00:00.000Z",
    readCount: 1,
    createdAt: "2026-11-01T10:00:00.000Z",
    updatedAt: "2026-11-01T12:00:00.000Z",
  };

  const samplePosition: ReadingPositionData = {
    cfi: "epubcfi(/6/4[chapter2]!/4/10)",
    percentage: 35,
  };

  /**
   * Install a plain recording stub.
   * This stub has NO Vitest/Jest mock metadata (_isMockFunction / mock are undefined),
   * causing getUrl() to evaluate `isFetchMocked === false` and return `null`.
   * It strictly rejects and records calls without any network transmission.
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
    it("1.1 getArchivedDocuments: asserts zero transport calls and delegates to localFallback", async () => {
      installUnmockedJournalBlocker();
      const local = new LocalStorageDataRepository();
      local.saveArchivedDocsCache([sampleDoc]);
      const repo = new ApiDataRepository("/api", local);

      const localSpy = vi.spyOn(local, "getArchivedDocuments");

      const docs = await repo.getArchivedDocuments();

      // Zero transport calls assertion
      expect(journal).toHaveLength(0);
      expect(localSpy).toHaveBeenCalledTimes(1);
      expect(docs).toHaveLength(1);
      expect(docs[0].id).toBe("doc-archive-001");
    });

    it("1.2 updateArchivedDocumentPosition: asserts zero transport calls and delegates to localFallback", async () => {
      installUnmockedJournalBlocker();
      const local = new LocalStorageDataRepository();
      local.saveArchivedDocsCache([sampleDoc]);
      const repo = new ApiDataRepository("/api", local);

      const localSpy = vi.spyOn(local, "updateArchivedDocumentPosition");

      const updated = await repo.updateArchivedDocumentPosition(
        "doc-archive-001",
        samplePosition
      );

      // Zero transport calls assertion
      expect(journal).toHaveLength(0);
      expect(localSpy).toHaveBeenCalledTimes(1);
      expect(localSpy).toHaveBeenCalledWith("doc-archive-001", samplePosition);
      expect(updated.id).toBe("doc-archive-001");
      expect(updated.lastPosition?.percentage).toBe(35);
      expect(updated.lastPosition?.cfi).toBe(samplePosition.cfi);
    });
  });

  // =========================================================================
  // Scenario 2: Explicit mocked HTTP success (getUrl returns valid URL)
  // =========================================================================
  describe("Scenario 2: Explicit mocked HTTP success mode", () => {
    it("2.1 getArchivedDocuments: fetches /api/archive/list and calls saveArchivedDocsCache", async () => {
      const mockDocs: ArchivedDocument[] = [sampleDoc];
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ documents: mockDocs }),
      });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const local = new LocalStorageDataRepository();
      const saveCacheSpy = vi.spyOn(local, "saveArchivedDocsCache");
      const repo = new ApiDataRepository("/api", local);

      const docs = await repo.getArchivedDocuments();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/archive/list")
      );
      expect(saveCacheSpy).toHaveBeenCalledTimes(1);
      expect(saveCacheSpy).toHaveBeenCalledWith(mockDocs);
      expect(docs).toEqual(mockDocs);
    });

    it("2.2 updateArchivedDocumentPosition: sends PATCH to encoded URL with expected payload and returns server doc", async () => {
      const serverUpdatedDoc: ArchivedDocument = {
        ...sampleDoc,
        lastPosition: samplePosition,
        updatedAt: "2026-11-01T12:05:00.000Z",
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ document: serverUpdatedDoc }),
      });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const local = new LocalStorageDataRepository();
      local.saveArchivedDocsCache([sampleDoc]);
      const localSpy = vi.spyOn(local, "updateArchivedDocumentPosition");
      const repo = new ApiDataRepository("/api", local);

      const docIdSpecial = "doc/special#001";
      const result = await repo.updateArchivedDocumentPosition(
        docIdSpecial,
        samplePosition
      );

      expect(localSpy).toHaveBeenCalledTimes(1);
      expect(localSpy).toHaveBeenCalledWith(docIdSpecial, samplePosition);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const call = mockFetch.mock.calls[0];
      expect(call[0]).toEqual(
        expect.stringContaining(
          `/api/archive/document/${encodeURIComponent(docIdSpecial)}/position`
        )
      );
      expect(call[1]?.method).toBe("PATCH");
      expect(call[1]?.headers).toEqual({ "Content-Type": "application/json" });

      const parsedBody = JSON.parse(call[1]?.body as string);
      expect(parsedBody.lastPosition).toEqual(samplePosition);
      expect(typeof parsedBody.lastReadAt).toBe("string");

      expect(result).toEqual(serverUpdatedDoc);
    });
  });

  // =========================================================================
  // Scenario 3: Error paths (non-success & network rejection)
  // =========================================================================
  describe("Scenario 3: Error paths and fallback semantics", () => {
    it("3.1 getArchivedDocuments: falls back to localFallback on HTTP 500 error", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const local = new LocalStorageDataRepository();
      local.saveArchivedDocsCache([sampleDoc]);
      const repo = new ApiDataRepository("/api", local);

      const docs = await repo.getArchivedDocuments();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(docs).toHaveLength(1);
      expect(docs[0].id).toBe("doc-archive-001");
    });

    it("3.2 getArchivedDocuments: falls back to localFallback on network rejection", async () => {
      const mockFetch = vi
        .fn()
        .mockRejectedValue(new Error("Connection refused"));
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const local = new LocalStorageDataRepository();
      local.saveArchivedDocsCache([sampleDoc]);
      const repo = new ApiDataRepository("/api", local);

      const docs = await repo.getArchivedDocuments();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(docs).toHaveLength(1);
      expect(docs[0].id).toBe("doc-archive-001");
    });

    it("3.3 updateArchivedDocumentPosition: falls back to localUpdated on HTTP 500 error", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const local = new LocalStorageDataRepository();
      local.saveArchivedDocsCache([sampleDoc]);
      const repo = new ApiDataRepository("/api", local);

      const result = await repo.updateArchivedDocumentPosition(
        "doc-archive-001",
        samplePosition
      );

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result.id).toBe("doc-archive-001");
      expect(result.lastPosition?.percentage).toBe(35);
    });

    it("3.4 updateArchivedDocumentPosition: falls back to localUpdated on network rejection", async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error("Network offline"));
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const local = new LocalStorageDataRepository();
      local.saveArchivedDocsCache([sampleDoc]);
      const repo = new ApiDataRepository("/api", local);

      const result = await repo.updateArchivedDocumentPosition(
        "doc-archive-001",
        samplePosition
      );

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result.id).toBe("doc-archive-001");
      expect(result.lastPosition?.percentage).toBe(35);
    });
  });
});
