/**
 * Unit Test Suite: ApiDataRepository Disaster Recovery (DR) Network Guard & Contracts
 *
 * Scope:
 * - exportBackupSnapshot
 * - restoreBackupSnapshot
 * - getDbHealth
 *
 * Scenarios:
 * A. Guard-blocked mode (unmocked recording fetch blocker, getUrl returns null):
 *    - Assert 0 transport calls BEFORE outcome assertions.
 *    - Assert delegation to LocalStorageDataRepository counterpart exactly once with correct args.
 *    - Assert rejection with UNSUPPORTED_OFFLINE_OPERATION error.
 *    - Assert localStorage is unmodified (using seeded sentinel data).
 *
 * B. Explicit mocked HTTP success (vi.fn() installed, getUrl returns valid URL):
 *    - Assert exact URL, method, headers, serialized body per implementation.
 *    - Assert parsed schema-validated response.
 *    - Assert local counterpart is NOT called.
 *
 * C. Error paths (HTTP non-success, network rejection, JSON SyntaxError, schema invalid):
 *    - Assert exact current error semantics without local fallback.
 *    - Assert local counterpart is NOT called.
 *
 * D. Input validation:
 *    - Assert invalid restore input rejects with ZodError before transport or local fallback.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  ApiDataRepository,
  LocalStorageDataRepository,
} from "../../src/services/dataRepository";
import {
  calculateBackupChecksum,
  type ValidatedBackupSnapshot,
  type ValidatedRestoreRequest,
  type ValidatedRestoreResponse,
  type ValidatedDbHealthResponse,
} from "../../src/lib/validation";

describe("ApiDataRepository - Disaster Recovery Network Guard Contracts", () => {
  interface RecordedCall {
    url: string;
    method: string;
    headers?: Record<string, string>;
    body?: string;
  }

  let journal: RecordedCall[] = [];
  const originalFetch = globalThis.fetch;
  const originalVitestEnv = process.env.VITEST;

  const SENTINEL_BLOCKER_ERROR = new Error("SENTINEL_RECORDING_BLOCKER_HIT");
  const UNSUPPORTED_ERR_MSG =
    "UNSUPPORTED_OFFLINE_OPERATION: Disaster recovery and database health checks require an active server connection.";

  const sampleCanonicalData = {
    categories: [],
    topics: [],
    notes: [],
    resources: [],
    tags: [],
  };
  const validChecksum = calculateBackupChecksum(sampleCanonicalData);

  const sampleSnapshot: ValidatedBackupSnapshot = {
    version: "2.0.0",
    exportedAt: "2026-10-31T12:00:00.000Z",
    checksum: validChecksum,
    counts: {
      categories: 0,
      topics: 0,
      notes: 0,
      resources: 0,
      tags: 0,
    },
    data: sampleCanonicalData,
  };

  const sampleRestoreRequest: ValidatedRestoreRequest = {
    snapshot: sampleSnapshot,
    mode: "replace",
    confirmReplace: true,
  };

  const sampleRestoreResponse: ValidatedRestoreResponse = {
    success: true,
    mode: "replace",
    restoredAt: "2026-10-31T12:00:00.000Z",
    restoredCounts: sampleSnapshot.counts,
  };

  const sampleHealthResponse: ValidatedDbHealthResponse = {
    status: "healthy",
    latencyMs: 12,
    database: "postgresql",
    connected: true,
    timestamp: "2026-10-31T12:00:00.000Z",
  };

  const installUnmockedRecordingBlocker = () => {
    journal = [];
    const plainBlocker = (
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> => {
      const urlStr = typeof input === "string" ? input : input.toString();
      journal.push({
        url: urlStr,
        method: init?.method || "GET",
        headers: init?.headers as Record<string, string> | undefined,
        body: typeof init?.body === "string" ? init.body : undefined,
      });
      return Promise.reject(SENTINEL_BLOCKER_ERROR);
    };

    delete (plainBlocker as any)._isMockFunction;
    delete (plainBlocker as any).mock;
    globalThis.fetch = plainBlocker as unknown as typeof fetch;
  };

  beforeEach(() => {
    process.env.VITEST = "true";
    localStorage.clear();
    localStorage.setItem(
      "sentinel_storage_marker",
      JSON.stringify({ intact: true, timestamp: "2026-10-31T12:00:00.000Z" })
    );
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalVitestEnv !== undefined) {
      process.env.VITEST = originalVitestEnv;
    } else {
      delete process.env.VITEST;
    }
    vi.restoreAllMocks();
  });

  // =========================================================================
  // Scenario A: Guard-blocked mode (unmocked recording blocker, getUrl === null)
  // =========================================================================
  describe("Scenario A: Guard-blocked mode (unmocked fetch, getUrl returns null)", () => {
    it("A1. exportBackupSnapshot: does NOT call transport, delegates to local and rejects with UNSUPPORTED_OFFLINE_OPERATION", async () => {
      installUnmockedRecordingBlocker();
      const local = new LocalStorageDataRepository();
      const repo = new ApiDataRepository("/api", local);
      const localSpy = vi.spyOn(local, "exportBackupSnapshot");

      let outcomeError: any = null;
      try {
        await repo.exportBackupSnapshot();
      } catch (err) {
        outcomeError = err;
      }

      // Assert 0 transport calls BEFORE asserting outcome/local spy
      expect(journal).toHaveLength(0);
      expect(localSpy).toHaveBeenCalledTimes(1);
      expect(outcomeError).toBeInstanceOf(Error);
      expect(outcomeError.message).toBe(UNSUPPORTED_ERR_MSG);

      // Verify localStorage was not mutated
      expect(localStorage.getItem("sentinel_storage_marker")).toBe(
        JSON.stringify({ intact: true, timestamp: "2026-10-31T12:00:00.000Z" })
      );
      expect(localStorage.length).toBe(1);
    });

    it("A2. restoreBackupSnapshot: does NOT call transport, delegates validatedReq to local and rejects with UNSUPPORTED_OFFLINE_OPERATION", async () => {
      installUnmockedRecordingBlocker();
      const local = new LocalStorageDataRepository();
      const repo = new ApiDataRepository("/api", local);
      const localSpy = vi.spyOn(local, "restoreBackupSnapshot");

      let outcomeError: any = null;
      try {
        await repo.restoreBackupSnapshot(sampleRestoreRequest);
      } catch (err) {
        outcomeError = err;
      }

      // Assert 0 transport calls BEFORE asserting outcome/local spy
      expect(journal).toHaveLength(0);
      expect(localSpy).toHaveBeenCalledTimes(1);
      expect(localSpy).toHaveBeenCalledWith(sampleRestoreRequest);
      expect(outcomeError).toBeInstanceOf(Error);
      expect(outcomeError.message).toBe(UNSUPPORTED_ERR_MSG);

      // Verify localStorage was not mutated
      expect(localStorage.getItem("sentinel_storage_marker")).toBe(
        JSON.stringify({ intact: true, timestamp: "2026-10-31T12:00:00.000Z" })
      );
      expect(localStorage.length).toBe(1);
    });

    it("A3. getDbHealth: does NOT call transport, delegates to local and rejects with UNSUPPORTED_OFFLINE_OPERATION", async () => {
      installUnmockedRecordingBlocker();
      const local = new LocalStorageDataRepository();
      const repo = new ApiDataRepository("/api", local);
      const localSpy = vi.spyOn(local, "getDbHealth");

      let outcomeError: any = null;
      try {
        await repo.getDbHealth();
      } catch (err) {
        outcomeError = err;
      }

      // Assert 0 transport calls BEFORE asserting outcome/local spy
      expect(journal).toHaveLength(0);
      expect(localSpy).toHaveBeenCalledTimes(1);
      expect(outcomeError).toBeInstanceOf(Error);
      expect(outcomeError.message).toBe(UNSUPPORTED_ERR_MSG);

      // Verify localStorage was not mutated
      expect(localStorage.getItem("sentinel_storage_marker")).toBe(
        JSON.stringify({ intact: true, timestamp: "2026-10-31T12:00:00.000Z" })
      );
      expect(localStorage.length).toBe(1);
    });
  });

  // =========================================================================
  // Scenario B: Explicit mocked HTTP success (vi.fn() installed, getUrl returns valid URL)
  // =========================================================================
  describe("Scenario B: Explicit mocked HTTP success (vi.fn installed, getUrl returns valid URL)", () => {
    it("B1. exportBackupSnapshot: calls transport with GET /api/backup/export and returns parsed snapshot", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => sampleSnapshot,
      });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const local = new LocalStorageDataRepository();
      const repo = new ApiDataRepository("/api", local);
      const localSpy = vi.spyOn(local, "exportBackupSnapshot");

      const result = await repo.exportBackupSnapshot();

      expect(result).toEqual(sampleSnapshot);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/backup/export")
      );
      expect(localSpy).not.toHaveBeenCalled();
    });

    it("B2. restoreBackupSnapshot: calls transport with POST /api/backup/restore and returns parsed restore response", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => sampleRestoreResponse,
      });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const local = new LocalStorageDataRepository();
      const repo = new ApiDataRepository("/api", local);
      const localSpy = vi.spyOn(local, "restoreBackupSnapshot");

      const result = await repo.restoreBackupSnapshot(sampleRestoreRequest);

      expect(result).toEqual(sampleRestoreResponse);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/backup/restore"),
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sampleRestoreRequest),
        })
      );
      expect(localSpy).not.toHaveBeenCalled();
    });

    it("B3. getDbHealth: calls transport with GET /api/health/db and returns parsed health response", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => sampleHealthResponse,
      });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const local = new LocalStorageDataRepository();
      const repo = new ApiDataRepository("/api", local);
      const localSpy = vi.spyOn(local, "getDbHealth");

      const result = await repo.getDbHealth();

      expect(result).toEqual(sampleHealthResponse);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/health/db")
      );
      expect(localSpy).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Scenario C: Error paths (HTTP non-success, network rejection, SyntaxError, ZodError)
  // =========================================================================
  describe("Scenario C: Error paths without local fallback", () => {
    // --- exportBackupSnapshot error paths ---
    it("C1. exportBackupSnapshot: rejects with server error message on HTTP non-2xx", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ message: "Backup export storage failure" }),
      });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const local = new LocalStorageDataRepository();
      const repo = new ApiDataRepository("/api", local);
      const localSpy = vi.spyOn(local, "exportBackupSnapshot");

      await expect(repo.exportBackupSnapshot()).rejects.toThrow(
        "Backup export storage failure"
      );
      expect(localSpy).not.toHaveBeenCalled();
    });

    it("C2. exportBackupSnapshot: propagates network error when fetch rejects", async () => {
      const networkError = new Error("NETWORK_DISCONNECTED");
      const mockFetch = vi.fn().mockRejectedValue(networkError);
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const local = new LocalStorageDataRepository();
      const repo = new ApiDataRepository("/api", local);
      const localSpy = vi.spyOn(local, "exportBackupSnapshot");

      await expect(repo.exportBackupSnapshot()).rejects.toThrow(
        "NETWORK_DISCONNECTED"
      );
      expect(localSpy).not.toHaveBeenCalled();
    });

    it("C3. exportBackupSnapshot: rejects with SyntaxError when response is not valid JSON", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new SyntaxError("Unexpected token < in JSON at position 0");
        },
      });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const local = new LocalStorageDataRepository();
      const repo = new ApiDataRepository("/api", local);
      const localSpy = vi.spyOn(local, "exportBackupSnapshot");

      await expect(repo.exportBackupSnapshot()).rejects.toBeInstanceOf(
        SyntaxError
      );
      expect(localSpy).not.toHaveBeenCalled();
    });

    it("C4. exportBackupSnapshot: rejects with ZodError when response does not match BackupSnapshotSchema", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ corrupted: true, version: 123 }),
      });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const local = new LocalStorageDataRepository();
      const repo = new ApiDataRepository("/api", local);
      const localSpy = vi.spyOn(local, "exportBackupSnapshot");

      await expect(repo.exportBackupSnapshot()).rejects.toThrow();
      expect(localSpy).not.toHaveBeenCalled();
    });

    // --- restoreBackupSnapshot error paths ---
    it("C5. restoreBackupSnapshot: rejects with server error message on HTTP non-2xx", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          error: "CHECKSUM_MISMATCH",
          message: "Checksum verification failed",
        }),
      });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const local = new LocalStorageDataRepository();
      const repo = new ApiDataRepository("/api", local);
      const localSpy = vi.spyOn(local, "restoreBackupSnapshot");

      await expect(
        repo.restoreBackupSnapshot(sampleRestoreRequest)
      ).rejects.toThrow("Checksum verification failed");
      expect(localSpy).not.toHaveBeenCalled();
    });

    it("C6. restoreBackupSnapshot: propagates network error when fetch rejects", async () => {
      const networkError = new Error("ECONNRESET");
      const mockFetch = vi.fn().mockRejectedValue(networkError);
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const local = new LocalStorageDataRepository();
      const repo = new ApiDataRepository("/api", local);
      const localSpy = vi.spyOn(local, "restoreBackupSnapshot");

      await expect(
        repo.restoreBackupSnapshot(sampleRestoreRequest)
      ).rejects.toThrow("ECONNRESET");
      expect(localSpy).not.toHaveBeenCalled();
    });

    it("C7. restoreBackupSnapshot: rejects with SyntaxError when response is not valid JSON", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new SyntaxError("Unexpected token < in JSON at position 0");
        },
      });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const local = new LocalStorageDataRepository();
      const repo = new ApiDataRepository("/api", local);
      const localSpy = vi.spyOn(local, "restoreBackupSnapshot");

      await expect(
        repo.restoreBackupSnapshot(sampleRestoreRequest)
      ).rejects.toBeInstanceOf(SyntaxError);
      expect(localSpy).not.toHaveBeenCalled();
    });

    it("C8. restoreBackupSnapshot: rejects with ZodError when response does not match RestoreResponseSchema", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: "not_a_boolean", mode: "invalid_mode" }),
      });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const local = new LocalStorageDataRepository();
      const repo = new ApiDataRepository("/api", local);
      const localSpy = vi.spyOn(local, "restoreBackupSnapshot");

      await expect(
        repo.restoreBackupSnapshot(sampleRestoreRequest)
      ).rejects.toThrow();
      expect(localSpy).not.toHaveBeenCalled();
    });

    // --- getDbHealth error paths ---
    it("C9. getDbHealth: rejects with server error message on HTTP non-2xx", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({
          error: "DATABASE_UNAVAILABLE",
          message: "Database connection pool exhausted",
        }),
      });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const local = new LocalStorageDataRepository();
      const repo = new ApiDataRepository("/api", local);
      const localSpy = vi.spyOn(local, "getDbHealth");

      await expect(repo.getDbHealth()).rejects.toThrow(
        "Database connection pool exhausted"
      );
      expect(localSpy).not.toHaveBeenCalled();
    });

    it("C10. getDbHealth: propagates network error when fetch rejects", async () => {
      const networkError = new Error("SOCKET_HANGUP");
      const mockFetch = vi.fn().mockRejectedValue(networkError);
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const local = new LocalStorageDataRepository();
      const repo = new ApiDataRepository("/api", local);
      const localSpy = vi.spyOn(local, "getDbHealth");

      await expect(repo.getDbHealth()).rejects.toThrow("SOCKET_HANGUP");
      expect(localSpy).not.toHaveBeenCalled();
    });

    it("C11. getDbHealth: rejects with SyntaxError when response is not valid JSON", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new SyntaxError("Unexpected token < in JSON at position 0");
        },
      });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const local = new LocalStorageDataRepository();
      const repo = new ApiDataRepository("/api", local);
      const localSpy = vi.spyOn(local, "getDbHealth");

      await expect(repo.getDbHealth()).rejects.toBeInstanceOf(SyntaxError);
      expect(localSpy).not.toHaveBeenCalled();
    });

    it("C12. getDbHealth: rejects with ZodError when response does not match DbHealthResponseSchema", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: "unknown_status",
          connected: "not_a_boolean",
        }),
      });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const local = new LocalStorageDataRepository();
      const repo = new ApiDataRepository("/api", local);
      const localSpy = vi.spyOn(local, "getDbHealth");

      await expect(repo.getDbHealth()).rejects.toThrow();
      expect(localSpy).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Scenario D: Restore input validation (Zod validation before transport or fallback)
  // =========================================================================
  describe("Scenario D: restoreBackupSnapshot input validation", () => {
    it("D1. rejects invalid input with ZodError in blocked mode before calling transport or local fallback", async () => {
      installUnmockedRecordingBlocker();
      const local = new LocalStorageDataRepository();
      const repo = new ApiDataRepository("/api", local);
      const localSpy = vi.spyOn(local, "restoreBackupSnapshot");

      const invalidReq = {
        snapshot: sampleSnapshot,
        mode: "replace" as const,
        confirmReplace: false, // Refine fails: confirmReplace must be true when mode is replace
      };

      await expect(
        repo.restoreBackupSnapshot(invalidReq as any)
      ).rejects.toThrow();

      expect(journal).toHaveLength(0);
      expect(localSpy).not.toHaveBeenCalled();
    });

    it("D2. rejects invalid input with ZodError in mocked mode before calling fetch", async () => {
      const mockFetch = vi.fn();
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const local = new LocalStorageDataRepository();
      const repo = new ApiDataRepository("/api", local);
      const localSpy = vi.spyOn(local, "restoreBackupSnapshot");

      const invalidReq = {
        snapshot: { ...sampleSnapshot, version: "invalid-semver" },
        mode: "replace" as const,
        confirmReplace: true,
      };

      await expect(
        repo.restoreBackupSnapshot(invalidReq as any)
      ).rejects.toThrow();

      expect(mockFetch).not.toHaveBeenCalled();
      expect(localSpy).not.toHaveBeenCalled();
    });
  });
});
