/**
 * NotebookLM Direct MCP Smoke Runner CLI Tests
 * (Phase 4 — Stage 4A: Dry-Run Only & Fail-Closed Validation)
 *
 * Verifies that:
 * 1. CLI argument parser is strict and fail-closed.
 * 2. Tier 1 live execution is blocked unless all 3 safety guards are present:
 *    --live-sandbox, --confirm-live, and NOTEBOOKLM_SANDBOX_PERMITTED=true.
 * 3. Dry-run mode executes end-to-end in-memory with fake transport (zero network, zero cloud tools).
 * 4. Evidence redaction sanitizes logs and errors before output.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  parseSmokeCliArgs,
  runSmokeCli,
} from "../../scripts/smoke/notebooklm-mcp-smoke";
import {
  NotebookLMMcpClient,
} from "../../src/server/services/providers/notebooklmMcpClient";
import {
  createDryRunInMemoryTransport,
} from "../../scripts/smoke/notebooklm-mcp-smoke-core";

describe("NOTEBOOKLM MCP SMOKE RUNNER CLI (PHASE 4 - STAGE 4A)", () => {
  let logMessages: string[];
  let errorMessages: string[];
  let mockLogger: { log: (msg: string) => void; error: (msg: string) => void };

  beforeEach(() => {
    logMessages = [];
    errorMessages = [];
    mockLogger = {
      log: (msg: string) => logMessages.push(msg),
      error: (msg: string) => errorMessages.push(msg),
    };
  });

  // --------------------------------------------------------------------------
  // Group 1: CLI Argument Parser & Fail-Closed Validation
  // --------------------------------------------------------------------------
  describe("Group 1: CLI Argument Parsing & Fail-Closed Safety", () => {
    it("parses --help flag correctly", () => {
      const parsed = parseSmokeCliArgs(["--help"]);
      expect(parsed.valid).toBe(true);
      expect(parsed.mode).toBe("help");
      expect(parsed.exitCode).toBe(0);
    });

    it("parses --dry-run flag correctly", () => {
      const parsed = parseSmokeCliArgs(["--dry-run"]);
      expect(parsed.valid).toBe(true);
      expect(parsed.mode).toBe("dry-run");
    });

    it("parses --tier0 flag correctly", () => {
      const parsed = parseSmokeCliArgs(["--tier0"]);
      expect(parsed.valid).toBe(true);
      expect(parsed.mode).toBe("tier0");
    });

    it("fails closed when no mode is provided", () => {
      const parsed = parseSmokeCliArgs([]);
      expect(parsed.valid).toBe(false);
      expect(parsed.errorMessage).toContain("Missing execution mode");
    });

    it("fails closed when unknown argument is provided", () => {
      const parsed = parseSmokeCliArgs(["--unknown-flag"]);
      expect(parsed.valid).toBe(false);
      expect(parsed.errorMessage).toContain("Unknown argument: --unknown-flag");
    });

    it("fails closed if --tier1 is requested without --live-sandbox and --confirm-live", () => {
      const parsed = parseSmokeCliArgs(["--tier1"]);
      expect(parsed.valid).toBe(false);
      expect(parsed.errorMessage).toContain("FAIL-CLOSED: Live Tier 1 execution requires both --live-sandbox and --confirm-live");
    });

    it("fails closed if --tier1 has --live-sandbox but lacks --confirm-live", () => {
      const parsed = parseSmokeCliArgs(["--tier1", "--live-sandbox"]);
      expect(parsed.valid).toBe(false);
      expect(parsed.errorMessage).toContain("FAIL-CLOSED: Live Tier 1 execution requires both --live-sandbox and --confirm-live");
    });

    it("fails closed if --tier1 has both flags but lacks NOTEBOOKLM_SANDBOX_PERMITTED env", () => {
      const parsed = parseSmokeCliArgs(["--tier1", "--live-sandbox", "--confirm-live"], {});
      expect(parsed.valid).toBe(false);
      expect(parsed.errorMessage).toContain("NOTEBOOKLM_SANDBOX_PERMITTED=true");
    });

    it("accepts --tier1 only when both flags and environment variable are present", () => {
      const parsed = parseSmokeCliArgs(
        ["--tier1", "--live-sandbox", "--confirm-live"],
        { NOTEBOOKLM_SANDBOX_PERMITTED: "true" }
      );
      expect(parsed.valid).toBe(true);
      expect(parsed.mode).toBe("tier1");
      expect(parsed.liveSandbox).toBe(true);
      expect(parsed.confirmLive).toBe(true);
    });

    it("fails closed if --cleanup-only is requested without target workspace ID", () => {
      const parsed = parseSmokeCliArgs(["--cleanup-only"]);
      expect(parsed.valid).toBe(false);
      expect(parsed.errorMessage).toContain("requires at least one --target=<workspaceId>");
    });

    it("parses --cleanup-only with target workspace IDs", () => {
      const parsed = parseSmokeCliArgs([
        "--cleanup-only",
        "--target=workspace-uuid-1",
        "--target",
        "workspace-uuid-2",
      ]);
      expect(parsed.valid).toBe(true);
      expect(parsed.mode).toBe("cleanup-only");
      expect(parsed.targetWorkspaceIds).toEqual(["workspace-uuid-1", "workspace-uuid-2"]);
    });
  });

  // --------------------------------------------------------------------------
  // Group 2: Dry-Run Execution Simulation
  // --------------------------------------------------------------------------
  describe("Group 2: Dry-Run Execution (In-Memory Fake Transport)", () => {
    it("runs complete dry-run smoke simulation successfully with zero cloud calls", async () => {
      const fakeTransport = createDryRunInMemoryTransport();
      const mockClient = new NotebookLMMcpClient({ transport: fakeTransport });

      const result = await runSmokeCli(["--dry-run"], {
        client: mockClient,
        logger: mockLogger,
      });

      expect(result.exitCode).toBe(0);
      expect(result.report).toBeDefined();
      expect(result.report?.passed).toBe(true);
      expect(result.report?.cleanupStatus).toBe("CLEANED");

      // Verify execution log contains dry-run progress
      const fullLog = logMessages.join("\n");
      expect(fullLog).toContain("Stage 1: Tier 0 Read-Only Discovery");
      expect(fullLog).toContain("Stage 2: Tier 1 Simulated Lifecycle");
      expect(fullLog).toContain("SMK-04: notebook_create: ✅");
      expect(fullLog).toContain("SMK-05: source_add (ingest): ✅");
      expect(fullLog).toContain("SMK-06: notebook_query: ✅");
      expect(fullLog).toContain("SMK-07: reconcileWorkspace (present): ✅");
      expect(fullLog).toContain("SMK-08 & SMK-09: deleteWorkspace & reconcile absent (cleanup): ✅");
      expect(fullLog).toContain("VERIFICATION COMPLETED SUCCESSFULLY");
    });

    it("aborts execution with exitCode 1 when arguments are invalid", async () => {
      const result = await runSmokeCli(["--tier1"], { logger: mockLogger });
      expect(result.exitCode).toBe(1);
      expect(errorMessages.join("\n")).toContain("FAIL-CLOSED");
    });

    it("prints usage and exits 0 for --help", async () => {
      const result = await runSmokeCli(["--help"], { logger: mockLogger });
      expect(result.exitCode).toBe(0);
      expect(logMessages.join("\n")).toContain("USAGE:");
    });
  });

  // --------------------------------------------------------------------------
  // Group 3: Emergency Sweeper Execution
  // --------------------------------------------------------------------------
  describe("Group 3: Emergency Sweeper Execution", () => {
    it("deletes specified target workspaces via --cleanup-only", async () => {
      const fakeTransport = createDryRunInMemoryTransport();
      const mockClient = new NotebookLMMcpClient({ transport: fakeTransport });

      const result = await runSmokeCli(
        ["--cleanup-only", "--target=clean-uuid-01", "--target=clean-uuid-02"],
        {
          client: mockClient,
          logger: mockLogger,
        }
      );

      expect(result.exitCode).toBe(0);
      const fullLog = logMessages.join("\n");
      expect(fullLog).toContain("Executing Emergency Sweeper");
      expect(fullLog).toContain("Cleaned: 2, Failed: 0");
    });
  });

  // --------------------------------------------------------------------------
  // Group 4: Redaction of Evidence in Error Output
  // --------------------------------------------------------------------------
  describe("Group 4: Redaction in CLI Output", () => {
    it("redacts tokens in unexpected errors handled by CLI wrapper", async () => {
      const throwingClient = {
        getTransport: () => ({
          isAlive: () => true,
          connect: vi.fn(),
          request: vi.fn().mockImplementation(async (method: string) => {
            if (method === "tools/list") {
              return {
                tools: [
                  { name: "server_info" },
                  { name: "notebook_create" },
                  { name: "source_add" },
                  { name: "notebook_query" },
                  { name: "notebook_get" },
                  { name: "notebook_delete" },
                  { name: "studio_create" },
                  { name: "studio_status" },
                ],
              };
            }
            return {};
          }),
          notify: vi.fn(),
          close: vi.fn(),
        }),
        checkReadiness: vi.fn().mockRejectedValue(
          new Error("Critical failure with token Bearer ya29.SECRET_LEAK_TOKEN_99999")
        ),
      } as unknown as NotebookLMMcpClient;

      const result = await runSmokeCli(["--tier0"], {
        client: throwingClient,
        logger: mockLogger,
      });

      expect(result.exitCode).toBe(1);
      const combinedOutput = logMessages.join("\n") + "\n" + errorMessages.join("\n");
      expect(combinedOutput).not.toContain("ya29.SECRET_LEAK_TOKEN_99999");
      expect(combinedOutput).toContain("Bearer [REDACTED_OAUTH]");
    });
  });
});
