/**
 * NotebookLM Direct MCP Business Operations Smoke Runner Tests
 * (Phase 4 — Stage 2: Test-First Skeleton for Smoke Runner)
 *
 * Implements unit/integration test harness against mock MCP server and fake transport
 * strictly adhering to:
 * - docs/specs/notebooklm-mcp-business-smoke-spec.md
 * - docs/specs/notebooklm-mcp-business-smoke-test-plan.md
 *
 * Safety & Quality Gates Enforced:
 * 1. T0 Read-only discovery: zero mutation side effects.
 * 2. T1 Live smoke guardrails: require explicit human approval and sandbox flags.
 * 3. Title prefix guardrail: [SMOKE-TEST] YYYY-MM-DD-HHmmss-<shortId>.
 * 4. Cleanup contract: try ... finally guarantees notebook_delete on Cloud.
 * 5. Anti-false-positive: rejects synthetic fallback IDs (nlm-src-*, op-audio-*).
 * 6. Evidence redaction: masks Bearer ya29..., AIzaSy..., and Google session cookies.
 * 7. Tier 2 blocker: blocks studio_status due to missing notebook_id schema requirement.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  NotebookLMMcpClient,
  unpackMcpToolResult,
} from "../../src/server/services/providers/notebooklmMcpClient";
import {
  InMemoryMcpTransport,
  McpTransport,
} from "../../src/server/services/providers/notebooklmMcpTransport";
import {
  NotebookLMClientError,
  NotebookLMQueryResult,
} from "../../src/server/services/providers/notebooklmClient";
import { SourcePayload } from "../../src/server/services/providers/types";

// ============================================================================
// 1. RE-EXPORTS FROM RUNNER CORE (Phase 4 Stage 4A Architecture)
// ============================================================================

export type {
  SmokeTier,
  CleanupStatus,
  SmokeRunnerOptions,
  SmokeStepResult,
  SmokeReport,
} from "../../scripts/smoke/notebooklm-mcp-smoke-core";

export {
  REQUIRED_MCP_CORE_TOOLS,
  redactSmokeEvidence,
  generateSmokeWorkspaceTitle,
  NotebookLmMcpSmokeRunner,
  createDryRunInMemoryTransport,
} from "../../scripts/smoke/notebooklm-mcp-smoke-core";

import {
  type SmokeTier,
  type CleanupStatus,
  type SmokeRunnerOptions,
  type SmokeStepResult,
  type SmokeReport,
  REQUIRED_MCP_CORE_TOOLS,
  redactSmokeEvidence,
  generateSmokeWorkspaceTitle,
  NotebookLmMcpSmokeRunner,
} from "../../scripts/smoke/notebooklm-mcp-smoke-core";

// ============================================================================
// 2. UNIT TESTS WITH IN-MEMORY MCP TRANSPORT & MOCK RESPONSES
// ============================================================================

describe("NOTEBOOKLM MCP BUSINESS SMOKE RUNNER (PHASE 4 - STAGE 2 SKELETON)", () => {
  let fakeTransport: InMemoryMcpTransport;
  let client: NotebookLMMcpClient;
  let runner: NotebookLmMcpSmokeRunner;

  beforeEach(() => {
    fakeTransport = new InMemoryMcpTransport();
    client = new NotebookLMMcpClient({ transport: fakeTransport });
    runner = new NotebookLmMcpSmokeRunner(client);
  });

  // --------------------------------------------------------------------------
  // Group 1: Tier 0 Read-Only Discovery (SMK-01, SMK-02, SMK-03)
  // --------------------------------------------------------------------------
  describe("Group 1: Tier 0 Read-Only Discovery", () => {
    it("SMK-01..03: succeeds when server accepts handshake, has all 8 core tools, and auth is configured", async () => {
      fakeTransport.registerHandler("initialize", () => ({
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "notebooklm-mcp", version: "3.4.0" },
      }));

      fakeTransport.registerHandler("notifications/initialized", () => ({}));

      fakeTransport.registerHandler("tools/list", () => ({
        tools: REQUIRED_MCP_CORE_TOOLS.map((name) => ({ name })),
      }));

      fakeTransport.registerHandler("tools/call", (method, params) => {
        if (params?.name === "server_info") {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  status: "success",
                  auth_status: "configured",
                  active_profile: "default",
                }),
              },
            ],
          };
        }
        throw new Error(`Unexpected tool call in T0: ${String(params?.name)}`);
      });

      const report = await runner.runTier0();

      expect(report.tier).toBe("T0");
      expect(report.passed).toBe(true);
      expect(report.authStatus).toBe("configured");
      expect(report.toolsDiscovered).toHaveLength(8);
      expect(report.cleanupStatus).toBe("NOT_APPLICABLE");
      expect(report.steps).toHaveLength(3);
      expect(report.steps.every((s) => s.status === "SUCCESS")).toBe(true);

      // Verify zero mutation requests were made
      const callRequests = fakeTransport.requestsReceived.filter((r) => r.method === "tools/call");
      expect(callRequests).toHaveLength(1);
      expect(callRequests[0].params?.name).toBe("server_info");
    });

    it("SMK-02: fails T0 if server lacks required core tools", async () => {
      fakeTransport.registerHandler("initialize", () => ({
        protocolVersion: "2024-11-05",
        serverInfo: { name: "notebooklm-mcp", version: "3.4.0" },
      }));

      fakeTransport.registerHandler("tools/list", () => ({
        tools: [{ name: "server_info" }], // missing other 7 tools
      }));

      const report = await runner.runTier0();

      expect(report.passed).toBe(false);
      expect(report.error).toContain("Missing required core tools");
      expect(report.steps.find((s) => s.step.includes("SMK-02"))?.status).toBe("FAILED");
    });

    it("SMK-03: fails T0 if auth_status is not 'configured' (e.g. 'not_configured')", async () => {
      fakeTransport.registerHandler("initialize", () => ({
        protocolVersion: "2024-11-05",
        serverInfo: { name: "notebooklm-mcp", version: "3.4.0" },
      }));

      fakeTransport.registerHandler("tools/list", () => ({
        tools: REQUIRED_MCP_CORE_TOOLS.map((name) => ({ name })),
      }));

      fakeTransport.registerHandler("tools/call", (method, params) => {
        if (params?.name === "server_info") {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  status: "error",
                  auth_status: "not_configured",
                  message: "User session not active",
                }),
              },
            ],
          };
        }
        return {};
      });

      const report = await runner.runTier0();

      expect(report.passed).toBe(false);
      expect(report.error).toContain("Auth readiness check failed");
      expect(report.steps.find((s) => s.step.includes("SMK-03"))?.status).toBe("FAILED");
    });
  });

  // --------------------------------------------------------------------------
  // Group 2: Tier 1 Controlled Live Smoke Lifecycle (SMK-04 to SMK-09)
  // --------------------------------------------------------------------------
  describe("Group 2: Tier 1 Controlled Live Smoke Lifecycle", () => {
    it("rejects execution immediately if liveSandbox or approvalGranted is missing", async () => {
      const reportWithoutFlags = await runner.runTier1({
        tier: "T1",
        liveSandbox: false,
        approvalGranted: false,
      });

      expect(reportWithoutFlags.passed).toBe(false);
      expect(reportWithoutFlags.error).toBe("SAFETY_GUARDRAIL_VIOLATION");
      expect(fakeTransport.requestsReceived).toHaveLength(0);
    });

    it("SMK-04..09: executes complete lifecycle with cleanup in finally block", async () => {
      const mockWorkspaceId = "11111111-2222-3333-4444-555555555555";
      const mockSourceId = "src-uuid-9999";
      let deleteCalled = false;

      fakeTransport.registerHandler("initialize", () => ({
        protocolVersion: "2024-11-05",
      }));

      fakeTransport.registerHandler("tools/call", (method, params) => {
        const toolName = params?.name;
        const args = (params?.arguments || {}) as Record<string, unknown>;

        if (toolName === "notebook_create") {
          expect(String(args.title)).toMatch(/^\[SMOKE-TEST\]\s\d{4}-\d{2}-\d{2}-/);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ notebook_id: mockWorkspaceId, title: args.title }),
              },
            ],
          };
        }

        if (toolName === "source_add") {
          expect(args.notebook_id).toBe(mockWorkspaceId);
          expect(args.source_type).toBe("text");
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ source_id: mockSourceId, status: "success" }),
              },
            ],
          };
        }

        if (toolName === "notebook_query") {
          expect(args.notebook_id).toBe(mockWorkspaceId);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  answer: "Validated Knowledge OS MCP architecture.",
                  cited_sources: [mockSourceId],
                }),
              },
            ],
          };
        }

        if (toolName === "notebook_get") {
          if (deleteCalled) {
            return {
              content: [{ type: "text", text: JSON.stringify({ not_found: true }) }],
            };
          }
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  notebook_id: mockWorkspaceId,
                  sources: [{ id: mockSourceId }],
                }),
              },
            ],
          };
        }

        if (toolName === "notebook_delete") {
          expect(args.notebook_id).toBe(mockWorkspaceId);
          expect(args.confirm).toBe(true);
          deleteCalled = true;
          return {
            content: [{ type: "text", text: JSON.stringify({ success: true, deleted: true }) }],
          };
        }

        throw new Error(`Unexpected tool call: ${String(toolName)}`);
      });

      const report = await runner.runTier1({
        tier: "T1",
        liveSandbox: true,
        approvalGranted: true,
      });

      expect(report.passed).toBe(true);
      expect(report.workspaceId).toBe(mockWorkspaceId);
      expect(report.cleanupStatus).toBe("CLEANED");
      expect(deleteCalled).toBe(true);
      expect(report.steps.map((s) => s.step)).toEqual([
        "SMK-04: notebook_create",
        "SMK-05: source_add (ingest)",
        "SMK-06: notebook_query",
        "SMK-07: reconcileWorkspace (present)",
        "SMK-08 & SMK-09: deleteWorkspace & reconcile absent (cleanup)",
      ]);
    });
  });

  // --------------------------------------------------------------------------
  // Group 3: Cleanup Resilience & Exception Handling (SMK-10)
  // --------------------------------------------------------------------------
  describe("Group 3: Cleanup Resilience on Error (SMK-10)", () => {
    it("guarantees notebook_delete is called even when ingest fails", async () => {
      const mockWorkspaceId = "err-workspace-001";
      let deleteCalledWithWorkspaceId: string | null = null;

      fakeTransport.registerHandler("initialize", () => ({ protocolVersion: "2024-11-05" }));

      fakeTransport.registerHandler("tools/call", (method, params) => {
        const toolName = params?.name;
        const args = (params?.arguments || {}) as Record<string, unknown>;

        if (toolName === "notebook_create") {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ notebook_id: mockWorkspaceId }),
              },
            ],
          };
        }

        if (toolName === "source_add") {
          // Simulate an ingestion error (e.g. server timeout or network issue)
          return {
            isError: true,
            content: [{ type: "text", text: "Cloud Storage upload timeout during ingest" }],
          };
        }

        if (toolName === "notebook_delete") {
          deleteCalledWithWorkspaceId = String(args.notebook_id);
          return {
            content: [{ type: "text", text: JSON.stringify({ success: true }) }],
          };
        }

        if (toolName === "notebook_get") {
          return {
            content: [{ type: "text", text: JSON.stringify({ not_found: true }) }],
          };
        }

        return {};
      });

      const report = await runner.runTier1({
        tier: "T1",
        liveSandbox: true,
        approvalGranted: true,
      });

      expect(report.passed).toBe(false);
      expect(report.workspaceId).toBe(mockWorkspaceId);
      expect(deleteCalledWithWorkspaceId).toBe(mockWorkspaceId);
      expect(report.cleanupStatus).toBe("CLEANED");
      expect(report.steps.find((s) => s.step.includes("cleanup"))?.status).toBe("SUCCESS");
    });

    it("guarantees notebook_delete is called even when query fails", async () => {
      const mockWorkspaceId = "err-workspace-002";
      let deleteCalled = false;

      fakeTransport.registerHandler("initialize", () => ({ protocolVersion: "2024-11-05" }));

      fakeTransport.registerHandler("tools/call", (method, params) => {
        const toolName = params?.name;

        if (toolName === "notebook_create") {
          return {
            content: [{ type: "text", text: JSON.stringify({ notebook_id: mockWorkspaceId }) }],
          };
        }

        if (toolName === "source_add") {
          return {
            content: [{ type: "text", text: JSON.stringify({ source_id: "src-valid-01" }) }],
          };
        }

        if (toolName === "notebook_query") {
          return {
            content: [{ type: "text", text: JSON.stringify({ answer: "" }) }], // empty answer failure
          };
        }

        if (toolName === "notebook_delete") {
          deleteCalled = true;
          return {
            content: [{ type: "text", text: JSON.stringify({ success: true }) }],
          };
        }

        if (toolName === "notebook_get") {
          return {
            content: [{ type: "text", text: JSON.stringify({ not_found: true }) }],
          };
        }

        return {};
      });

      const report = await runner.runTier1({
        tier: "T1",
        liveSandbox: true,
        approvalGranted: true,
      });

      expect(report.passed).toBe(false);
      expect(deleteCalled).toBe(true);
      expect(report.cleanupStatus).toBe("CLEANED");
    });

    it("flags FAILED_DIRTY and records orphan workspace if deleteWorkspace itself throws", async () => {
      const mockWorkspaceId = "dirty-workspace-999";

      fakeTransport.registerHandler("initialize", () => ({ protocolVersion: "2024-11-05" }));

      fakeTransport.registerHandler("tools/call", (method, params) => {
        const toolName = params?.name;

        if (toolName === "notebook_create") {
          return {
            content: [{ type: "text", text: JSON.stringify({ notebook_id: mockWorkspaceId }) }],
          };
        }

        if (toolName === "source_add") {
          return {
            isError: true,
            content: [{ type: "text", text: "Ingest failed" }],
          };
        }

        if (toolName === "notebook_delete") {
          // Deletion fails on cloud!
          return {
            isError: true,
            content: [{ type: "text", text: "503 Service Unavailable" }],
          };
        }

        return {};
      });

      const report = await runner.runTier1({
        tier: "T1",
        liveSandbox: true,
        approvalGranted: true,
      });

      expect(report.passed).toBe(false);
      expect(report.cleanupStatus).toBe("FAILED_DIRTY");
      expect(report.workspaceId).toBe(mockWorkspaceId);
      const cleanupStep = report.steps.find((s) => s.step.includes("cleanup"));
      expect(cleanupStep?.status).toBe("FAILED");
      expect(cleanupStep?.error).toContain("ALERT_ORPHAN_WORKSPACE");
    });
  });

  // --------------------------------------------------------------------------
  // Group 4: Anti-False-Positive Contract Validation (SMK-09 / Scenario 5)
  // --------------------------------------------------------------------------
  describe("Group 4: Anti-False-Positive Contract Validation", () => {
    it("detects and rejects auto-fallback fake source ID (nlm-src-*)", async () => {
      const mockWorkspaceId = "anti-fp-workspace";
      let deleteCalled = false;

      fakeTransport.registerHandler("initialize", () => ({ protocolVersion: "2024-11-05" }));

      fakeTransport.registerHandler("tools/call", (method, params) => {
        const toolName = params?.name;

        if (toolName === "notebook_create") {
          return {
            content: [{ type: "text", text: JSON.stringify({ notebook_id: mockWorkspaceId }) }],
          };
        }

        if (toolName === "source_add") {
          // Server returns a synthetic/auto-fallback source ID starting with nlm-src-
          return {
            content: [{ type: "text", text: JSON.stringify({ source_id: "nlm-src-synthetic-01" }) }],
          };
        }

        if (toolName === "notebook_delete") {
          deleteCalled = true;
          return {
            content: [{ type: "text", text: JSON.stringify({ success: true }) }],
          };
        }

        if (toolName === "notebook_get") {
          return {
            content: [{ type: "text", text: JSON.stringify({ not_found: true }) }],
          };
        }

        return {};
      });

      const report = await runner.runTier1({
        tier: "T1",
        liveSandbox: true,
        approvalGranted: true,
      });

      expect(report.passed).toBe(false);
      expect(report.error).toContain("ANTI_FALSE_POSITIVE");
      expect(deleteCalled).toBe(true);
      expect(report.cleanupStatus).toBe("CLEANED");
    });
  });

  // --------------------------------------------------------------------------
  // Group 5: Evidence Redaction & Sanitization (SMK-10 / Section 4)
  // --------------------------------------------------------------------------
  describe("Group 5: Evidence Redaction & Sanitization", () => {
    it("redacts Google OAuth Bearer tokens", () => {
      const raw = "Authorization: Bearer ya29.a0AfH6SMDOmeTokenValue1234567890 in error trace";
      const redacted = redactSmokeEvidence(raw);
      expect(redacted).toBe("Authorization: Bearer [REDACTED_OAUTH] in error trace");
      expect(redacted).not.toContain("ya29.");
    });

    it("redacts Google API keys", () => {
      const raw = "Request failed with key=AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q in URL";
      const redacted = redactSmokeEvidence(raw);
      expect(redacted).toBe("Request failed with key=[REDACTED_API_KEY] in URL");
      expect(redacted).not.toContain("AIzaSy");
    });

    it("redacts Google session cookies", () => {
      const raw = "Cookie: SID=abc123def; HSID=gh456; SSID=ij789; OSID=kl012";
      const redacted = redactSmokeEvidence(raw);
      expect(redacted).toBe("Cookie: SID=[REDACTED_COOKIE]; HSID=[REDACTED_COOKIE]; SSID=[REDACTED_COOKIE]; OSID=[REDACTED_COOKIE]");
    });
  });

  // --------------------------------------------------------------------------
  // Group 6: Tier 2 Audio Overview Blocker (SMK-11, SMK-12)
  // --------------------------------------------------------------------------
  describe("Group 6: Tier 2 Audio Overview Blocker", () => {
    it("SMK-12: detects studio_status schema mismatch and blocks Tier 2 execution", async () => {
      const report = await runner.runTier2({
        tier: "T2",
        withAudio: true,
      });

      expect(report.tier).toBe("T2");
      expect(report.passed).toBe(false);
      expect(report.error).toContain("AUDIO_BLOCKER_SCHEMA_MISMATCH");
      expect(report.steps[0].error).toContain("studio_status requires 'notebook_id' parameter");
    });
  });

  // --------------------------------------------------------------------------
  // Group 7: Sweeper / Cleanup Only
  // --------------------------------------------------------------------------
  describe("Group 7: Orphan Sweeper (runCleanupOnly)", () => {
    it("sweeps target workspaces and deletes them with confirm: true", async () => {
      const deletedIds: string[] = [];

      fakeTransport.registerHandler("initialize", () => ({ protocolVersion: "2024-11-05" }));

      fakeTransport.registerHandler("tools/call", (method, params) => {
        if (params?.name === "notebook_delete") {
          const args = (params?.arguments || {}) as Record<string, unknown>;
          expect(args.confirm).toBe(true);
          deletedIds.push(String(args.notebook_id));
          return {
            content: [{ type: "text", text: JSON.stringify({ success: true }) }],
          };
        }
        return {};
      });

      const sweepResult = await runner.runCleanupOnly(["orphan-01", "orphan-02"]);

      expect(sweepResult.cleanedCount).toBe(2);
      expect(sweepResult.failedCount).toBe(0);
      expect(deletedIds).toEqual(["orphan-01", "orphan-02"]);
    });
  });
});
