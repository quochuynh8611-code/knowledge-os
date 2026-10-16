/**
 * NotebookLM Direct MCP Business Operations Smoke Runner Core
 * (Phase 4 — Stage 4A: Shared Module for CLI & Test Harness)
 *
 * Provides:
 * - Types: SmokeTier, CleanupStatus, SmokeRunnerOptions, SmokeStepResult, SmokeReport
 * - Core tools list: REQUIRED_MCP_CORE_TOOLS
 * - Sanitization / Redaction: redactSmokeEvidence
 * - Title generator: generateSmokeWorkspaceTitle
 * - Runner: NotebookLmMcpSmokeRunner (T0 discovery, T1 live smoke with inline cleanup, T2 audio blocked, sweeper)
 * - Dry-run transport factory: createDryRunInMemoryTransport
 *
 * Enforces:
 * - Zero side-effects in T0 & dry-run
 * - try ... finally cleanup contract
 * - Anti-false-positive rejection of fake fallback IDs (nlm-src-*, op-audio-*)
 * - Masking of bearer tokens, API keys, and session cookies
 * - BLOCKED status for Tier 2 Audio Overview
 */

import {
  NotebookLMMcpClient,
} from "../../src/server/services/providers/notebooklmMcpClient";
import {
  InMemoryMcpTransport,
} from "../../src/server/services/providers/notebooklmMcpTransport";
import {
  NotebookLMClientError,
  NotebookLMQueryResult,
} from "../../src/server/services/providers/notebooklmClient";
import { SourcePayload } from "../../src/server/services/providers/types";

// ============================================================================
// 1. RUNNER TYPES & CONSTANTS
// ============================================================================

export type SmokeTier = "T0" | "T1" | "T2";
export type CleanupStatus = "NOT_APPLICABLE" | "CLEANED" | "FAILED_DIRTY";

export interface SmokeRunnerOptions {
  tier: SmokeTier;
  liveSandbox?: boolean;
  approvalGranted?: boolean;
  dryRun?: boolean;
  syntheticText?: string;
  queryPrompt?: string;
  withAudio?: boolean;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface SmokeStepResult {
  step: string;
  status: "SUCCESS" | "FAILED" | "SKIPPED";
  durationMs: number;
  details?: Record<string, unknown>;
  error?: string;
}

export interface SmokeReport {
  tier: SmokeTier;
  passed: boolean;
  durationMs: number;
  workspaceId?: string;
  cleanupStatus: CleanupStatus;
  steps: SmokeStepResult[];
  authStatus?: string;
  toolsDiscovered?: string[];
  error?: string;
}

export const REQUIRED_MCP_CORE_TOOLS = [
  "server_info",
  "notebook_create",
  "source_add",
  "notebook_query",
  "notebook_get",
  "notebook_delete",
  "studio_create",
  "studio_status",
] as const;

// ============================================================================
// 2. EVIDENCE REDACTION & NAMING GUARDRAILS
// ============================================================================

/**
 * Redacts OAuth tokens, Google API keys, and session cookies from smoke test evidence.
 */
export function redactSmokeEvidence(text: string): string {
  if (!text || typeof text !== "string") {
    return text;
  }
  return text
    .replace(/Bearer\s+ya29\.[a-zA-Z0-9_\-]+/gi, "Bearer [REDACTED_OAUTH]")
    .replace(/AIzaSy[a-zA-Z0-9_\-]{33}/g, "[REDACTED_API_KEY]")
    .replace(/(SID|HSID|SSID|OSID|APISID|SAPISID|1PSID|3PSID)=[a-zA-Z0-9_\-]+/g, "$1=[REDACTED_COOKIE]");
}

/**
 * Generates a compliant workspace title adhering to Section 4.1 of the Spec:
 * [SMOKE-TEST] YYYY-MM-DD-HHmmss-<shortId>
 */
export function generateSmokeWorkspaceTitle(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = now.getFullYear();
  const MM = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const mm = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  const shortUuid = Math.random().toString(36).substring(2, 8);
  return `[SMOKE-TEST] ${yyyy}-${MM}-${dd}-${hh}${mm}${ss}-${shortUuid}`;
}

// ============================================================================
// 3. RUNNER CLASS IMPLEMENTATION
// ============================================================================

export class NotebookLmMcpSmokeRunner {
  constructor(private readonly client: NotebookLMMcpClient) {}

  /**
   * Tier 0: Read-Only Discovery & Readiness Probe.
   * Zero mutations, zero side-effects.
   */
  public async runTier0(options: Partial<SmokeRunnerOptions> = {}): Promise<SmokeReport> {
    const startTime = Date.now();
    const steps: SmokeStepResult[] = [];
    const transport = this.client.getTransport();

    // Step 1: Handshake
    const handshakeStart = Date.now();
    try {
      if (!transport.isAlive()) {
        await transport.connect();
      }
      steps.push({
        step: "SMK-01: Handshake connect()",
        status: "SUCCESS",
        durationMs: Date.now() - handshakeStart,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      steps.push({
        step: "SMK-01: Handshake connect()",
        status: "FAILED",
        durationMs: Date.now() - handshakeStart,
        error: redactSmokeEvidence(msg),
      });
      return {
        tier: "T0",
        passed: false,
        durationMs: Date.now() - startTime,
        cleanupStatus: "NOT_APPLICABLE",
        steps,
        error: "Handshake failed",
      };
    }

    // Step 2: Tools Discovery
    const toolsStart = Date.now();
    let discoveredToolNames: string[] = [];
    try {
      const toolsResponse = await transport.request<{ tools?: Array<{ name: string }> }>(
        "tools/list",
        {},
        { timeoutMs: options.timeoutMs || 10000, signal: options.signal }
      );
      discoveredToolNames = (toolsResponse?.tools || []).map((t) => t.name);
      const missingTools = REQUIRED_MCP_CORE_TOOLS.filter((t) => !discoveredToolNames.includes(t));

      if (missingTools.length > 0) {
        throw new Error(`Missing required MCP tools: ${missingTools.join(", ")}`);
      }

      steps.push({
        step: "SMK-02: tools/list verification",
        status: "SUCCESS",
        durationMs: Date.now() - toolsStart,
        details: { count: discoveredToolNames.length, tools: discoveredToolNames },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      steps.push({
        step: "SMK-02: tools/list verification",
        status: "FAILED",
        durationMs: Date.now() - toolsStart,
        error: redactSmokeEvidence(msg),
      });
      return {
        tier: "T0",
        passed: false,
        durationMs: Date.now() - startTime,
        cleanupStatus: "NOT_APPLICABLE",
        steps,
        toolsDiscovered: discoveredToolNames,
        error: "Missing required core tools",
      };
    }

    // Step 3: Server Info & Auth Status
    const readinessStart = Date.now();
    try {
      const readiness = await this.client.checkReadiness({ signal: options.signal });
      if (!readiness.isReady || readiness.status !== "READY") {
        throw new Error(
          `NotebookLM MCP server readiness failed: ${readiness.message} (status: ${readiness.status})`
        );
      }

      const authStatus = "configured";

      steps.push({
        step: "SMK-03: server_info readiness check",
        status: "SUCCESS",
        durationMs: Date.now() - readinessStart,
        details: { authStatus, latencyMs: readiness.latencyMs },
      });

      return {
        tier: "T0",
        passed: true,
        durationMs: Date.now() - startTime,
        cleanupStatus: "NOT_APPLICABLE",
        steps,
        authStatus,
        toolsDiscovered: discoveredToolNames,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      steps.push({
        step: "SMK-03: server_info readiness check",
        status: "FAILED",
        durationMs: Date.now() - readinessStart,
        error: redactSmokeEvidence(msg),
      });
      return {
        tier: "T0",
        passed: false,
        durationMs: Date.now() - startTime,
        cleanupStatus: "NOT_APPLICABLE",
        steps,
        toolsDiscovered: discoveredToolNames,
        error: "Auth readiness check failed",
      };
    }
  }

  /**
   * Tier 1: Controlled Live Smoke Test (Create -> Ingest -> Query -> Reconcile -> Delete)
   * Guaranteed cleanup in try ... finally.
   */
  public async runTier1(options: SmokeRunnerOptions): Promise<SmokeReport> {
    const startTime = Date.now();
    const steps: SmokeStepResult[] = [];

    // Precondition Gate
    if (!options.liveSandbox || !options.approvalGranted) {
      return {
        tier: "T1",
        passed: false,
        durationMs: 0,
        cleanupStatus: "NOT_APPLICABLE",
        steps: [
          {
            step: "SMK-Preflight: Safety & Human Approval Gate",
            status: "FAILED",
            durationMs: 0,
            error: "SAFETY_GUARDRAIL_VIOLATION: Tier 1 requires liveSandbox=true and approvalGranted=true.",
          },
        ],
        error: "SAFETY_GUARDRAIL_VIOLATION",
      };
    }

    const transport = this.client.getTransport();
    if (!transport.isAlive()) {
      await transport.connect();
    }

    let createdWorkspaceId: string | undefined = undefined;
    let cleanupStatus: CleanupStatus = "NOT_APPLICABLE";
    let tierError: string | undefined = undefined;

    try {
      // Step 1: Create Workspace
      const title = generateSmokeWorkspaceTitle();
      const createStart = Date.now();
      const createResult = await this.client.createWorkspace({
        title,
        signal: options.signal,
      });

      createdWorkspaceId = createResult.workspaceId;
      if (!createdWorkspaceId || createdWorkspaceId.startsWith("nlm-mock-") || createdWorkspaceId.trim() === "") {
        throw new NotebookLMClientError({
          code: "MALFORMED_RESPONSE",
          message: "notebook_create returned empty or invalid workspace identifier",
        });
      }

      steps.push({
        step: "SMK-04: notebook_create",
        status: "SUCCESS",
        durationMs: Date.now() - createStart,
        details: { workspaceId: createdWorkspaceId, title },
      });

      // Step 2: Ingest Synthetic Source
      const ingestStart = Date.now();
      const syntheticText =
        options.syntheticText ||
        "Knowledge OS Architecture Verification: Validating NotebookLM Direct MCP runtime adapter capabilities.";
      const sourcePayload: SourcePayload = {
        sourceId: "src-smoke-01",
        title: "Synthetic Smoke Document",
        type: "inline-text",
        mimeType: "text/plain",
        textContent: syntheticText,
        contentHash: "hash-smoke-01",
      };

      const ingestResult = await this.client.ingestSources({
        workspaceId: createdWorkspaceId,
        sources: [sourcePayload],
        signal: options.signal,
      });

      // Anti-false-positive check: If remote source ID starts with nlm-src-, it's an auto-fallback fake ID
      const hasFakeFallbackId = ingestResult.remoteSourceIds.some((id) => id.startsWith("nlm-src-"));
      if (hasFakeFallbackId) {
        throw new NotebookLMClientError({
          code: "MALFORMED_RESPONSE",
          message: "ANTI_FALSE_POSITIVE: source_add returned auto-fallback synthetic ID",
          rawDetails: ingestResult,
        });
      }

      if (ingestResult.status !== "COMPLETED") {
        throw new Error(`Ingest failed with status: ${ingestResult.status}`);
      }

      steps.push({
        step: "SMK-05: source_add (ingest)",
        status: "SUCCESS",
        durationMs: Date.now() - ingestStart,
        details: { remoteSourceIds: ingestResult.remoteSourceIds },
      });

      // Step 3: Query Grounded Knowledge (with bounded retry for cloud source indexing)
      const queryStart = Date.now();
      const prompt = options.queryPrompt || "What architecture is being validated?";
      let queryResult: NotebookLMQueryResult | null = null;
      let queryAttempts = 0;
      const isTestEnv = options.dryRun || Boolean(process.env.VITEST) || process.env.NODE_ENV === "test";
      const maxQueryAttempts = isTestEnv ? 1 : 6;
      const retryDelayMs = isTestEnv ? 10 : 3000;

      while (queryAttempts < maxQueryAttempts) {
        queryAttempts++;
        try {
          const res = await this.client.query({
            workspaceId: createdWorkspaceId,
            prompt,
            signal: options.signal,
          });
          if (res.answer && res.answer.trim().length > 0) {
            queryResult = res;
            break;
          }
        } catch (queryErr) {
          if (queryAttempts >= maxQueryAttempts) throw queryErr;
        }

        if (queryAttempts < maxQueryAttempts) {
          // Wait for Google Cloud indexing to settle before next attempt
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        }
      }

      if (!queryResult || !queryResult.answer || queryResult.answer.trim().length === 0) {
        throw new Error("notebook_query returned empty answer after waiting for source indexing");
      }

      steps.push({
        step: "SMK-06: notebook_query",
        status: "SUCCESS",
        durationMs: Date.now() - queryStart,
        details: {
          answerLength: queryResult.answer.length,
          citedSourcesCount: queryResult.citedSourceIds.length,
        },
      });

      // Step 4: Reconcile Present
      const reconcileStart = Date.now();
      const reconcileResult = await this.client.reconcileWorkspace({
        workspaceId: createdWorkspaceId,
        expectedSources: [{ sourceId: ingestResult.remoteSourceIds[0], contentHash: "dummy-hash" }],
        signal: options.signal,
      });

      if (reconcileResult !== "CONFIRMED_PRESENT") {
        throw new Error(`reconcileWorkspace returned ${reconcileResult}, expected CONFIRMED_PRESENT`);
      }

      steps.push({
        step: "SMK-07: reconcileWorkspace (present)",
        status: "SUCCESS",
        durationMs: Date.now() - reconcileStart,
        details: { result: reconcileResult },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      tierError = redactSmokeEvidence(msg);
      steps.push({
        step: "SMK-FAIL: Execution Failure",
        status: "FAILED",
        durationMs: 0,
        error: tierError,
      });
    } finally {
      // Step 5 & 6: Mandatory Cleanup in finally block
      if (createdWorkspaceId) {
        const cleanupStart = Date.now();
        try {
          const deleteSuccess = await this.client.deleteWorkspace({
            workspaceId: createdWorkspaceId,
          });

          if (!deleteSuccess) {
            throw new Error(`deleteWorkspace returned false for ${createdWorkspaceId}`);
          }

          // Verify absent
          const postDeleteReconcile = await this.client.reconcileWorkspace({
            workspaceId: createdWorkspaceId,
            expectedSources: [{ sourceId: "verify-absent-check", contentHash: "dummy" }],
          });

          if (postDeleteReconcile !== "CONFIRMED_ABSENT") {
            throw new Error(`Post-delete reconciliation returned ${postDeleteReconcile}`);
          }

          cleanupStatus = "CLEANED";
          steps.push({
            step: "SMK-08 & SMK-09: deleteWorkspace & reconcile absent (cleanup)",
            status: "SUCCESS",
            durationMs: Date.now() - cleanupStart,
            details: { workspaceId: createdWorkspaceId, cleanupStatus },
          });
        } catch (cleanupErr: unknown) {
          cleanupStatus = "FAILED_DIRTY";
          const cleanupMsg = cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr);
          steps.push({
            step: "SMK-08 & SMK-09: deleteWorkspace (cleanup)",
            status: "FAILED",
            durationMs: Date.now() - cleanupStart,
            error: `ALERT_ORPHAN_WORKSPACE: Failed to delete ${createdWorkspaceId}: ${redactSmokeEvidence(cleanupMsg)}`,
          });
        }
      }
    }

    const passed = tierError === undefined && cleanupStatus === "CLEANED";

    return {
      tier: "T1",
      passed,
      durationMs: Date.now() - startTime,
      workspaceId: createdWorkspaceId,
      cleanupStatus,
      steps,
      error: tierError,
    };
  }

  /**
   * Tier 2: Optional Audio Smoke Probe
   * Enforces that missing notebook_id in studio_status is detected and flagged as a schema blocker.
   */
  public async runTier2(_options: SmokeRunnerOptions): Promise<SmokeReport> {
    const startTime = Date.now();

    const schemaBlocker = {
      isBlocked: true,
      reason:
        "AUDIO_BLOCKER_SCHEMA_MISMATCH: studio_status requires 'notebook_id' parameter, but NotebookLMClient interface only passes 'artifact_id'.",
    };

    return {
      tier: "T2",
      passed: false,
      durationMs: Date.now() - startTime,
      cleanupStatus: "NOT_APPLICABLE",
      steps: [
        {
          step: "SMK-12: studio_status schema compatibility check",
          status: "FAILED",
          durationMs: 0,
          error: schemaBlocker.reason,
        },
      ],
      error: schemaBlocker.reason,
    };
  }

  /**
   * Sweeper: Emergency orphan cleaner for [SMOKE-TEST] workspaces
   */
  public async runCleanupOnly(targetWorkspaceIds: string[] = []): Promise<{
    cleanedCount: number;
    failedCount: number;
    errors: string[];
  }> {
    let cleanedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    const transport = this.client.getTransport();
    if (!transport.isAlive()) {
      await transport.connect();
    }

    for (const workspaceId of targetWorkspaceIds) {
      try {
        const deleted = await this.client.deleteWorkspace({ workspaceId });
        if (deleted) {
          cleanedCount++;
        } else {
          failedCount++;
          errors.push(`deleteWorkspace returned false for ${workspaceId}`);
        }
      } catch (err: unknown) {
        failedCount++;
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Failed to delete ${workspaceId}: ${redactSmokeEvidence(msg)}`);
      }
    }

    return { cleanedCount, failedCount, errors };
  }
}

// ============================================================================
// 4. DRY-RUN IN-MEMORY TRANSPORT FACTORY
// ============================================================================

/**
 * Creates a fully-functional in-memory MCP transport for dry-run verification.
 * Pre-wires all core tool responses deterministically without touching network or child process.
 */
export function createDryRunInMemoryTransport(options: {
  mockWorkspaceId?: string;
  mockSourceId?: string;
  mockAuthStatus?: string;
} = {}): InMemoryMcpTransport {
  const workspaceId = options.mockWorkspaceId || "00000000-0000-0000-0000-000000000001";
  const sourceId = options.mockSourceId || "src-dry-run-001";
  const authStatus = options.mockAuthStatus || "configured";

  let isDeleted = false;

  const transport = new InMemoryMcpTransport({
    initialize: () => ({
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: "notebooklm-mcp-dry-run", version: "3.4.0" },
    }),
    "notifications/initialized": () => ({}),
    "tools/list": () => ({
      tools: REQUIRED_MCP_CORE_TOOLS.map((name) => ({ name })),
    }),
  });

  transport.registerHandler("tools/call", (_method, params) => {
    const name = params?.name;
    const args = (params?.arguments || {}) as Record<string, unknown>;

    switch (name) {
      case "server_info":
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                status: "success",
                auth_status: authStatus,
                active_profile: "dry-run",
                version: "3.4.0",
              }),
            },
          ],
        };

      case "notebook_create":
        isDeleted = false;
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                notebook_id: workspaceId,
                title: String(args.title || "[SMOKE-TEST] Dry Run"),
              }),
            },
          ],
        };

      case "source_add":
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                source_id: sourceId,
                status: "success",
              }),
            },
          ],
        };

      case "notebook_query":
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                answer: "Knowledge OS Direct MCP Dry-Run execution verified successfully.",
                cited_sources: [sourceId],
              }),
            },
          ],
        };

      case "notebook_get":
        if (isDeleted) {
          return {
            content: [{ type: "text", text: JSON.stringify({ not_found: true }) }],
          };
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                notebook_id: workspaceId,
                sources: [{ id: sourceId }],
              }),
            },
          ],
        };

      case "notebook_delete":
        isDeleted = true;
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                deleted: true,
                notebook_id: workspaceId,
              }),
            },
          ],
        };

      case "studio_create":
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                artifact_id: "art-dry-run-001",
                status: "in_progress",
              }),
            },
          ],
        };

      case "studio_status":
        if (!args.notebook_id) {
          throw new NotebookLMClientError({
            code: "PROTOCOL_ERROR",
            message: "MCP tool studio_status requires notebook_id",
          });
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                status: "completed",
                isDone: true,
              }),
            },
          ],
        };

      default:
        throw new NotebookLMClientError({
          code: "PROTOCOL_ERROR",
          message: `Dry-run unhandled tool: ${String(name)}`,
        });
    }
  });

  return transport;
}
