import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  parseCliArgs,
  runCleanupCli,
  sanitizeDatabaseUrl,
} from "../../scripts/maintenance/cleanup-legacy-economy";
import type { CleanupDbClient, CleanupResultSummary } from "../../scripts/maintenance/cleanupLegacyEconomyCore";

describe("cleanup-legacy-economy CLI parser and lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("parseCliArgs", () => {
    it("1. No args => mode: dry-run, valid: true", () => {
      const parsed = parseCliArgs([]);
      expect(parsed.valid).toBe(true);
      expect(parsed.mode).toBe("dry-run");
    });

    it("2. Explicit --dry-run => mode: dry-run, valid: true", () => {
      const parsed = parseCliArgs(["--dry-run"]);
      expect(parsed.valid).toBe(true);
      expect(parsed.mode).toBe("dry-run");
    });

    it("3. --execute without confirm => valid: false, exitCode: 2", () => {
      const parsed = parseCliArgs(["--execute"]);
      expect(parsed.valid).toBe(false);
      expect(parsed.exitCode).toBe(2);
      expect(parsed.errorMessage).toContain("Missing required --confirm");
    });

    it("4. --execute with invalid confirmation => valid: false, exitCode: 2", () => {
      const parsed = parseCliArgs(["--execute", '--confirm="SAI_CU_PHAP"']);
      expect(parsed.valid).toBe(false);
      expect(parsed.exitCode).toBe(2);
      expect(parsed.errorMessage).toContain("Invalid confirmation phrase");
    });

    it("5. --execute with valid confirmation => mode: execute, valid: true", () => {
      const parsed = parseCliArgs([
        "--execute",
        '--confirm="XOA KINH TE VA KINH TE HOC"',
      ]);
      expect(parsed.valid).toBe(true);
      expect(parsed.mode).toBe("execute");
    });

    it("6. Unknown flag or --force rejected => valid: false, exitCode: 2", () => {
      const parsedForce = parseCliArgs(["--force"]);
      expect(parsedForce.valid).toBe(false);
      expect(parsedForce.exitCode).toBe(2);
      expect(parsedForce.errorMessage).toContain("Unknown or disallowed argument: --force");

      const parsedUnknown = parseCliArgs(["--foo=bar"]);
      expect(parsedUnknown.valid).toBe(false);
      expect(parsedUnknown.exitCode).toBe(2);
      expect(parsedUnknown.errorMessage).toContain("Unknown or disallowed argument: --foo=bar");
    });
  });

  describe("sanitizeDatabaseUrl", () => {
    it("masks user credentials and shows only host:port/database", () => {
      const url = "postgresql://myuser:secretpassword@db.example.com:5432/my_database?schema=public";
      const sanitized = sanitizeDatabaseUrl(url);
      expect(sanitized).toBe("db.example.com:5432/my_database");
      expect(sanitized).not.toContain("myuser");
      expect(sanitized).not.toContain("secretpassword");
    });

    it("handles localhost default correctly", () => {
      const url = "postgresql://postgres:postgres@localhost:5432/knowledge_os?schema=public";
      const sanitized = sanitizeDatabaseUrl(url);
      expect(sanitized).toBe("localhost:5432/knowledge_os");
    });

    it("handles empty or invalid gracefully", () => {
      expect(sanitizeDatabaseUrl("")).toBe("unknown-database");
    });
  });

  describe("runCleanupCli lifecycle", () => {
    const mockPrismaDb: CleanupDbClient & { $disconnect: () => Promise<void> } = {
      category: { findMany: vi.fn().mockResolvedValue([]) },
      topic: { findMany: vi.fn().mockResolvedValue([]) },
      note: { findMany: vi.fn().mockResolvedValue([]) },
      noteTopicLink: { findMany: vi.fn().mockResolvedValue([]) },
      $disconnect: vi.fn().mockResolvedValue(undefined),
    };

    it("returns exitCode 0 on successful dry-run and disconnects prisma", async () => {
      const mockCore = vi.fn().mockResolvedValue({
        mode: "dry-run",
        success: true,
        alreadyClean: false,
        database: "localhost:5432/knowledge_os",
        timestamp: "2026-09-14T00:00:00.000Z",
        targets: {
          rootCategoryIds: ["cat-root-kinh-te", "cat-root-kinh-te-hoc"],
          deletedCategoryIds: [],
          deletedTopicIds: [],
        },
        counts: {
          categoriesDeleted: 0,
          topicsDeleted: 0,
          exclusiveNotesDeleted: 0,
          sharedNotesPreserved: 0,
          sharedNoteLinksRemoved: 0,
          primaryTopicReferencesRepaired: 0,
        },
      } satisfies CleanupResultSummary);

      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const exitCode = await runCleanupCli(
        ["--dry-run"],
        {
          prisma: mockPrismaDb,
          executeCleanup: mockCore,
          databaseUrl: "postgresql://postgres:postgres@localhost:5432/knowledge_os",
        }
      );

      expect(exitCode).toBe(0);
      expect(mockCore).toHaveBeenCalledWith(mockPrismaDb, {
        dryRun: true,
        databaseTarget: "localhost:5432/knowledge_os",
      });
      expect(mockPrismaDb.$disconnect).toHaveBeenCalledTimes(1);
      logSpy.mockRestore();
    });

    it("returns exitCode 2 on missing confirmation and disconnects prisma without calling core", async () => {
      const mockCore = vi.fn();
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const exitCode = await runCleanupCli(
        ["--execute"],
        {
          prisma: mockPrismaDb,
          executeCleanup: mockCore,
          databaseUrl: "postgresql://postgres:postgres@localhost:5432/knowledge_os",
        }
      );

      expect(exitCode).toBe(2);
      expect(mockCore).not.toHaveBeenCalled();
      expect(mockPrismaDb.$disconnect).toHaveBeenCalledTimes(1);
      errSpy.mockRestore();
    });

    it("returns exitCode 3 when databaseUrl is missing", async () => {
      const mockCore = vi.fn();
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const exitCode = await runCleanupCli(
        ["--dry-run"],
        {
          prisma: mockPrismaDb,
          executeCleanup: mockCore,
          databaseUrl: "",
        }
      );

      expect(exitCode).toBe(3);
      expect(mockCore).not.toHaveBeenCalled();
      expect(mockPrismaDb.$disconnect).toHaveBeenCalledTimes(1);
      errSpy.mockRestore();
    });

    it("returns exitCode 1 on core execution error and ensures disconnect is called", async () => {
      const mockCore = vi.fn().mockRejectedValue(new Error("Connection terminated"));
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const exitCode = await runCleanupCli(
        ["--dry-run"],
        {
          prisma: mockPrismaDb,
          executeCleanup: mockCore,
          databaseUrl: "postgresql://postgres:postgres@localhost:5432/knowledge_os",
        }
      );

      expect(exitCode).toBe(1);
      expect(mockPrismaDb.$disconnect).toHaveBeenCalledTimes(1);
      errSpy.mockRestore();
    });
  });
});
