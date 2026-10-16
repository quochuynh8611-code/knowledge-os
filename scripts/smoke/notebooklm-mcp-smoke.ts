#!/usr/bin/env tsx
/**
 * NotebookLM Direct MCP Business Operations Smoke Runner CLI
 * (Phase 4 — Stage 4A: Dry-Run & CLI Entrypoint)
 *
 * Usage:
 *   # Dry-Run: Complete in-memory simulation with fake transport (zero network, zero binary spawn)
 *   npx tsx scripts/smoke/notebooklm-mcp-smoke.ts --dry-run
 *
 *   # Tier 0: Read-only probe against local binary (requires human approval in later stage)
 *   npx tsx scripts/smoke/notebooklm-mcp-smoke.ts --tier0
 *
 *   # Tier 1: Controlled live smoke (requires 3 fail-closed safety flags + human approval)
 *   NOTEBOOKLM_SANDBOX_PERMITTED=true npx tsx scripts/smoke/notebooklm-mcp-smoke.ts --tier1 --live-sandbox --confirm-live
 *
 *   # Emergency Sweeper: Clean up orphan [SMOKE-TEST] workspaces
 *   npx tsx scripts/smoke/notebooklm-mcp-smoke.ts --cleanup-only --target=workspace-uuid
 */

import fs from "node:fs";
import path from "node:path";
import {
  NotebookLMMcpClient,
} from "../../src/server/services/providers/notebooklmMcpClient";
import {
  NotebookLmMcpSmokeRunner,
  createDryRunInMemoryTransport,
  redactSmokeEvidence,
  type SmokeReport,
} from "./notebooklm-mcp-smoke-core";

// ============================================================================
// 1. CLI ARGUMENT PARSER & TYPES
// ============================================================================

export type CliRunMode = "dry-run" | "tier0" | "tier1" | "cleanup-only" | "help";

export interface ParsedSmokeCliArgs {
  valid: boolean;
  mode: CliRunMode;
  liveSandbox: boolean;
  confirmLive: boolean;
  targetWorkspaceIds: string[];
  exitCode?: number;
  errorMessage?: string;
}

export interface CliDependencies {
  client?: NotebookLMMcpClient;
  logger?: {
    log: (msg: string) => void;
    error: (msg: string) => void;
  };
  env?: Record<string, string | undefined>;
}

export function parseSmokeCliArgs(
  args: string[],
  env: Record<string, string | undefined> = process.env
): ParsedSmokeCliArgs {
  let mode: CliRunMode | null = null;
  let liveSandbox = false;
  let confirmLive = false;
  const targetWorkspaceIds: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--help" || arg === "-h") {
      return {
        valid: true,
        mode: "help",
        liveSandbox: false,
        confirmLive: false,
        targetWorkspaceIds: [],
        exitCode: 0,
      };
    }

    if (arg === "--dry-run") {
      mode = "dry-run";
    } else if (arg === "--tier0") {
      mode = "tier0";
    } else if (arg === "--tier1") {
      mode = "tier1";
    } else if (arg === "--cleanup-only") {
      mode = "cleanup-only";
    } else if (arg === "--live-sandbox") {
      liveSandbox = true;
    } else if (arg === "--confirm-live") {
      confirmLive = true;
    } else if (arg.startsWith("--target=")) {
      const id = arg.substring("--target=".length).trim();
      if (id) targetWorkspaceIds.push(id);
    } else if (arg === "--target" && i + 1 < args.length) {
      const id = args[++i].trim();
      if (id) targetWorkspaceIds.push(id);
    } else {
      return {
        valid: false,
        mode: "help",
        liveSandbox: false,
        confirmLive: false,
        targetWorkspaceIds: [],
        exitCode: 1,
        errorMessage: `Unknown argument: ${arg}`,
      };
    }
  }

  if (!mode) {
    return {
      valid: false,
      mode: "help",
      liveSandbox: false,
      confirmLive: false,
      targetWorkspaceIds: [],
      exitCode: 1,
      errorMessage: "Missing execution mode. Specify --dry-run, --tier0, --tier1, or --cleanup-only.",
    };
  }

  // Strict Fail-Closed Validation for Tier 1
  if (mode === "tier1") {
    if (!liveSandbox || !confirmLive) {
      return {
        valid: false,
        mode: "tier1",
        liveSandbox,
        confirmLive,
        targetWorkspaceIds,
        exitCode: 1,
        errorMessage:
          "FAIL-CLOSED: Live Tier 1 execution requires both --live-sandbox and --confirm-live flags.",
      };
    }

    const envPermitted = (env.NOTEBOOKLM_SANDBOX_PERMITTED || "").trim().toLowerCase();
    if (envPermitted !== "true" && envPermitted !== "1") {
      return {
        valid: false,
        mode: "tier1",
        liveSandbox,
        confirmLive,
        targetWorkspaceIds,
        exitCode: 1,
        errorMessage:
          "FAIL-CLOSED: Live Tier 1 execution requires environment variable NOTEBOOKLM_SANDBOX_PERMITTED=true.",
      };
    }
  }

  if (mode === "cleanup-only" && targetWorkspaceIds.length === 0) {
    return {
      valid: false,
      mode: "cleanup-only",
      liveSandbox,
      confirmLive,
      targetWorkspaceIds,
      exitCode: 1,
      errorMessage: "Mode --cleanup-only requires at least one --target=<workspaceId> argument.",
    };
  }

  return {
    valid: true,
    mode,
    liveSandbox,
    confirmLive,
    targetWorkspaceIds,
    exitCode: 0,
  };
}

// ============================================================================
// 2. HELP SCREEN
// ============================================================================

export function printUsage(logger: { log: (msg: string) => void }): void {
  logger.log(`
NotebookLM MCP Business Operations Smoke Runner
================================================

USAGE:
  npx tsx scripts/smoke/notebooklm-mcp-smoke.ts [MODE] [OPTIONS]

MODES:
  --dry-run          Run full T0 & T1 smoke simulation in-memory (fake transport, zero network/binary)
  --tier0            Run read-only discovery & readiness probe against local MCP binary
  --tier1            Run controlled live smoke test (requires all safety flags)
  --cleanup-only     Run emergency deletion on targeted [SMOKE-TEST] workspaces

OPTIONS:
  --live-sandbox     Acknowledge that operations run against a dedicated sandbox account
  --confirm-live     Explicit confirmation to perform create/delete operations on Cloud
  --target=<uuid>    Target workspace ID for --cleanup-only
  --help, -h         Show this help screen

EXAMPLES:
  # 1. Safe in-memory dry-run verification:
  npx tsx scripts/smoke/notebooklm-mcp-smoke.ts --dry-run

  # 2. Read-only probe (zero side-effects):
  npx tsx scripts/smoke/notebooklm-mcp-smoke.ts --tier0

  # 3. Controlled Live Smoke:
  NOTEBOOKLM_SANDBOX_PERMITTED=true npx tsx scripts/smoke/notebooklm-mcp-smoke.ts --tier1 --live-sandbox --confirm-live

  # 4. Emergency Cleanup:
  npx tsx scripts/smoke/notebooklm-mcp-smoke.ts --cleanup-only --target=3b123456-789a-bcde-f012-3456789abcde
`);
}

// ============================================================================
// 3. EXECUTION ENGINE
// ============================================================================

export async function runSmokeCli(
  rawArgs: string[],
  deps: CliDependencies = {}
): Promise<{ exitCode: number; report?: SmokeReport; error?: string }> {
  const logger = deps.logger || {
    log: (msg: string) => console.log(msg),
    error: (msg: string) => console.error(msg),
  };
  const env = deps.env || process.env;

  const parsed = parseSmokeCliArgs(rawArgs, env);

  if (!parsed.valid) {
    logger.error(`\n❌ ${parsed.errorMessage}\n`);
    printUsage(logger);
    return { exitCode: parsed.exitCode || 1, error: parsed.errorMessage };
  }

  if (parsed.mode === "help") {
    printUsage(logger);
    return { exitCode: 0 };
  }

  logger.log(`\n================================================================`);
  logger.log(` NotebookLM Direct MCP Smoke Runner (Mode: ${parsed.mode.toUpperCase()})`);
  logger.log(`================================================================\n`);

  // Resolve Client (Dependency Injection or Built-in)
  let client = deps.client;

  if (!client) {
    if (parsed.mode === "dry-run") {
      // In dry-run mode, construct deterministic in-memory fake transport
      const fakeTransport = createDryRunInMemoryTransport();
      client = new NotebookLMMcpClient({ transport: fakeTransport });
    } else {
      // Live modes instantiate real Stdio transport (Phase 4B/4D)
      const explicitBin =
        env.NOTEBOOKLM_MCP_BIN?.trim() ||
        env.NOTEBOOKLM_MCP_PATH?.trim() ||
        "/Users/mr.chem/.local/bin/notebooklm-mcp";
      client = new NotebookLMMcpClient({
        stdioConfig: {
          binaryPath: explicitBin,
        },
      });
    }
  }

  const runner = new NotebookLmMcpSmokeRunner(client);

  try {
    if (parsed.mode === "dry-run") {
      logger.log(`[DRY-RUN] Executing Stage 1: Tier 0 Read-Only Discovery...`);
      const t0Report = await runner.runTier0({ dryRun: true });
      logger.log(
        `[DRY-RUN] T0 Result: ${t0Report.passed ? "✅ PASS" : "❌ FAIL"} (Auth: ${t0Report.authStatus}, Tools: ${t0Report.toolsDiscovered?.length || 0})`
      );

      if (!t0Report.passed) {
        logger.error(`[DRY-RUN] T0 Failed: ${t0Report.error}`);
        return { exitCode: 1, report: t0Report, error: t0Report.error };
      }

      logger.log(`\n[DRY-RUN] Executing Stage 2: Tier 1 Simulated Lifecycle...`);
      const t1Report = await runner.runTier1({
        tier: "T1",
        dryRun: true,
        liveSandbox: true,
        approvalGranted: true,
      });

      logger.log(
        `[DRY-RUN] T1 Result: ${t1Report.passed ? "✅ PASS" : "❌ FAIL"} (Cleanup: ${t1Report.cleanupStatus})`
      );
      for (const step of t1Report.steps) {
        logger.log(`  - ${step.step}: ${step.status === "SUCCESS" ? "✅" : "❌"} (${step.durationMs}ms)`);
      }

      logger.log(`\n================================================================`);
      logger.log(` [DRY-RUN] VERIFICATION COMPLETED SUCCESSFULLY (Zero Cloud Side-Effects)`);
      logger.log(`================================================================\n`);

      return { exitCode: t1Report.passed ? 0 : 1, report: t1Report };
    }

    if (parsed.mode === "tier0") {
      logger.log(`Executing Tier 0 Read-Only Discovery Probe...`);
      const report = await runner.runTier0();
      logger.log(`T0 Result: ${report.passed ? "✅ PASS" : "❌ FAIL"}`);
      logger.log(`Auth Status: ${report.authStatus}`);
      logger.log(
        `Discovered Tools (${report.toolsDiscovered?.length || 0}/8): ${(report.toolsDiscovered || []).join(", ")}`
      );
      for (const step of report.steps) {
        logger.log(`  - ${step.step}: ${step.status === "SUCCESS" ? "✅" : "❌"} (${step.durationMs}ms)`);
      }

      // Write redacted evidence artifact to docs/session-logs/evidence/t0-discovery.json
      const evidenceDir = path.resolve(process.cwd(), "docs/session-logs/evidence");
      if (!fs.existsSync(evidenceDir)) {
        fs.mkdirSync(evidenceDir, { recursive: true });
      }
      const evidenceFile = path.join(evidenceDir, "t0-discovery.json");
      const evidencePayload = {
        timestamp: new Date().toISOString(),
        tier: "T0",
        passed: report.passed,
        durationMs: report.durationMs,
        authStatus: report.authStatus,
        toolsDiscovered: report.toolsDiscovered,
        steps: report.steps,
        error: report.error,
      };
      fs.writeFileSync(
        evidenceFile,
        redactSmokeEvidence(JSON.stringify(evidencePayload, null, 2)),
        "utf8"
      );
      logger.log(`Evidence artifact written to: ${evidenceFile}`);

      if (!report.passed) {
        if (report.error) logger.error(`Error: ${report.error}`);
        for (const step of report.steps) {
          if (step.status === "FAILED" && step.error) {
            logger.error(`  - ${step.step}: ${step.error}`);
          }
        }
      }
      return { exitCode: report.passed ? 0 : 1, report, error: report.error };
    }

    if (parsed.mode === "tier1") {
      logger.log(`Executing Tier 1 Controlled Live Smoke Test...`);
      const report = await runner.runTier1({
        tier: "T1",
        liveSandbox: parsed.liveSandbox,
        approvalGranted: parsed.confirmLive,
      });
      logger.log(`T1 Result: ${report.passed ? "✅ PASS" : "❌ FAIL"}`);
      logger.log(`Workspace ID: ${report.workspaceId}`);
      logger.log(`Cleanup Status: ${report.cleanupStatus}`);
      for (const step of report.steps) {
        logger.log(`  - ${step.step}: ${step.status === "SUCCESS" ? "✅" : "❌"} (${step.durationMs}ms)`);
      }

      // Write redacted evidence artifact to docs/session-logs/evidence/t1-live-smoke.json
      const evidenceDir = path.resolve(process.cwd(), "docs/session-logs/evidence");
      if (!fs.existsSync(evidenceDir)) {
        fs.mkdirSync(evidenceDir, { recursive: true });
      }
      const evidenceFile = path.join(evidenceDir, "t1-live-smoke.json");
      const evidencePayload = {
        timestamp: new Date().toISOString(),
        tier: "T1",
        passed: report.passed,
        durationMs: report.durationMs,
        workspaceId: report.workspaceId,
        cleanupStatus: report.cleanupStatus,
        steps: report.steps,
        error: report.error,
      };
      fs.writeFileSync(
        evidenceFile,
        redactSmokeEvidence(JSON.stringify(evidencePayload, null, 2)),
        "utf8"
      );
      logger.log(`Evidence artifact written to: ${evidenceFile}`);

      if (!report.passed) {
        if (report.error) logger.error(`Error: ${report.error}`);
        for (const step of report.steps) {
          if (step.status === "FAILED" && step.error) {
            logger.error(`  - ${step.step}: ${step.error}`);
          }
        }
      }
      return { exitCode: report.passed ? 0 : 1, report, error: report.error };
    }

    if (parsed.mode === "cleanup-only") {
      logger.log(`Executing Emergency Sweeper for targets: ${parsed.targetWorkspaceIds.join(", ")}...`);
      const sweepResult = await runner.runCleanupOnly(parsed.targetWorkspaceIds);
      logger.log(`Cleaned: ${sweepResult.cleanedCount}, Failed: ${sweepResult.failedCount}`);
      if (sweepResult.errors.length > 0) {
        logger.error(`Errors: ${sweepResult.errors.join("; ")}`);
        return { exitCode: 1, error: sweepResult.errors.join("; ") };
      }
      return { exitCode: 0 };
    }

    return { exitCode: 0 };
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : String(err);
    const safeMsg = redactSmokeEvidence(rawMsg);
    logger.error(`\n❌ Unhandled Runner Error: ${safeMsg}\n`);
    return { exitCode: 1, error: safeMsg };
  }
}

// Direct invocation guard when executed via tsx
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  runSmokeCli(args)
    .then((result) => {
      process.exit(result.exitCode);
    })
    .catch((err) => {
      console.error("Fatal CLI Error:", redactSmokeEvidence(String(err)));
      process.exit(1);
    });
}
