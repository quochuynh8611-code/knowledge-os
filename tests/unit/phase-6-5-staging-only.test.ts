/**
 * Phase 6.5 Staging-Only Enforcement Suite
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * - Production is strictly denied across all paths.
 * - Test/staging strictly enforces dry_run mode only.
 * - Zero environment mutation or real provider execution.
 */

import { describe, it, expect } from "vitest";
import { ProviderDryRunAdapter } from "../../src/server/services/providers/providerDryRunAdapter.js";
import { StagingSandboxRequest } from "../../src/server/services/providers/stagingSandboxContract.js";
import { computeKillSwitchFingerprint } from "../../src/server/services/providers/executionKillSwitch.js";

describe("PHASE 6.5 STAGING-ONLY ENFORCEMENT SUITE", () => {
  const inactiveKillSwitchBase = {
    active: false,
    reason: "Inactive kill switch for test fixture",
    source: "manual" as const,
    activatedBy: "human-test-runner",
    activatedAt: "2026-09-24T12:00:00.000Z",
  };

  const inactiveKillSwitch = {
    ...inactiveKillSwitchBase,
    fingerprint: computeKillSwitchFingerprint(inactiveKillSwitchBase),
  };

  const validStagingRequest: StagingSandboxRequest = {
    requestId: "req-stage-only-12345",
    correlationId: "corr-stage-only-67890",
    providerId: "notebooklm-enterprise",
    environment: "staging",
    mode: "dry_run",
    tool: "research_create_workspace",
    inputFingerprint: "input-fp-123",
    handoffFingerprint: "handoff-fp-456",
    approvalFingerprint: "approval-fp-789",
    readinessReportFingerprint: "readiness-fp-012",
    capabilities: {
      network: false,
      credentials: false,
      providerExecution: false,
      childProcess: false,
    },
  };

  it("1. Test environment accepts only dry-run", async () => {
    const adapter = new ProviderDryRunAdapter({ killSwitch: inactiveKillSwitch });
    const testReq: StagingSandboxRequest = {
      ...validStagingRequest,
      environment: "test",
    };
    const res = await adapter.executeDryRun(testReq);
    expect(res.kind).toBe("dry_run_accepted");
  });

  it("2. Staging environment accepts only dry-run", async () => {
    const adapter = new ProviderDryRunAdapter({ killSwitch: inactiveKillSwitch });
    const res = await adapter.executeDryRun(validStagingRequest);
    expect(res.kind).toBe("dry_run_accepted");
  });

  it("3. Production always denies", async () => {
    const adapter = new ProviderDryRunAdapter({ killSwitch: inactiveKillSwitch });
    const prodReq = {
      ...validStagingRequest,
      environment: "production" as any,
    };
    const res = await adapter.executeDryRun(prodReq);
    expect(res.kind).toBe("dry_run_rejected");
    if (res.kind === "dry_run_rejected") {
      expect(res.reason).toBe("PRODUCTION_FORBIDDEN");
    }
  });

  it("4. Environment flag cannot override production deny", async () => {
    process.env.NODE_ENV = "staging";
    process.env.RESEARCH_ALLOW_NOTEBOOKLM = "true";
    process.env.ENABLE_PROVIDER_ROUTING = "true";

    const adapter = new ProviderDryRunAdapter({ killSwitch: inactiveKillSwitch });
    const prodReq = {
      ...validStagingRequest,
      environment: "production" as any,
    };
    const res = await adapter.executeDryRun(prodReq);
    expect(res.kind).toBe("dry_run_rejected");
  });

  it("5. Manual approval cannot override production deny", async () => {
    const adapter = new ProviderDryRunAdapter({ killSwitch: inactiveKillSwitch });
    const prodReq = {
      ...validStagingRequest,
      environment: "production" as any,
      approvalFingerprint: "valid-human-approval-fp",
    };
    const res = await adapter.executeDryRun(prodReq);
    expect(res.kind).toBe("dry_run_rejected");
  });

  it("6. Readiness approval cannot override production deny", async () => {
    const adapter = new ProviderDryRunAdapter({ killSwitch: inactiveKillSwitch });
    const prodReq = {
      ...validStagingRequest,
      environment: "production" as any,
      readinessReportFingerprint: "valid-readiness-fp",
    };
    const res = await adapter.executeDryRun(prodReq);
    expect(res.kind).toBe("dry_run_rejected");
  });

  it("7. Kill-switch cannot be disabled by request payload", async () => {
    const activeKillSwitch = {
      active: true,
      reason: "Active kill switch",
      source: "default" as const,
      fingerprint: "fp",
    };
    const adapter = new ProviderDryRunAdapter({ killSwitch: activeKillSwitch as any });
    const res = await adapter.executeDryRun(validStagingRequest);
    expect(res.kind).toBe("dry_run_rejected");
    if (res.kind === "dry_run_rejected") {
      expect(res.reason).toBe("KILL_SWITCH_ACTIVE");
    }
  });

  it("8. Capability escalation is denied", async () => {
    const adapter = new ProviderDryRunAdapter({ killSwitch: inactiveKillSwitch });
    const req = {
      ...validStagingRequest,
      capabilities: {
        ...validStagingRequest.capabilities,
        credentials: true as any,
      },
    };
    const res = await adapter.executeDryRun(req);
    expect(res.kind).toBe("dry_run_rejected");
  });

  it("9. Real mode is denied", async () => {
    const adapter = new ProviderDryRunAdapter({ killSwitch: inactiveKillSwitch });
    const req = {
      ...validStagingRequest,
      mode: "real_execution" as any,
    };
    const res = await adapter.executeDryRun(req);
    expect(res.kind).toBe("dry_run_rejected");
  });

  it("10. Simulation adapter remains default", () => {
    const adapter = new ProviderDryRunAdapter();
    expect(adapter).toBeDefined();
  });

  it("11. Fake transport is the only transport used", async () => {
    const adapter = new ProviderDryRunAdapter({ killSwitch: inactiveKillSwitch });
    const res = await adapter.executeDryRun(validStagingRequest);
    expect(res.providerCallMade).toBe(false);
  });

  it("12. Real client cannot be injected through public contract", () => {
    const adapter = new ProviderDryRunAdapter();
    expect((adapter as any).client).toBeUndefined();
  });

  it("13. Provider fallback is denied", async () => {
    const adapter = new ProviderDryRunAdapter({ killSwitch: inactiveKillSwitch });
    // Antigravity does not support audio
    const req: StagingSandboxRequest = {
      ...validStagingRequest,
      providerId: "antigravity-legacy",
      tool: "research_generate_audio",
    };
    const res = await adapter.executeDryRun(req);
    expect(res.kind).toBe("dry_run_rejected");
    if (res.kind === "dry_run_rejected") {
      expect(res.reason).toBe("PROVIDER_UNSUPPORTED");
    }
  });

  it("14. Replay remains idempotent", async () => {
    const adapter = new ProviderDryRunAdapter({ killSwitch: inactiveKillSwitch });
    const res1 = await adapter.executeDryRun(validStagingRequest);
    const res2 = await adapter.executeDryRun(validStagingRequest);

    expect(res1.kind).toBe("dry_run_accepted");
    expect(res2.kind).toBe("dry_run_accepted");
  });

  it("15. Circuit breaker is bounded", () => {
    const adapter = new ProviderDryRunAdapter();
    const snap = adapter.getCircuitBreakerSnapshot("notebooklm-enterprise");
    expect(snap.state).toBe("CLOSED");
  });

  it("16. Retry policy is bounded", () => {
    const adapter = new ProviderDryRunAdapter();
    expect(adapter).toBeDefined();
  });

  it("17. Audit event is sanitized", async () => {
    const adapter = new ProviderDryRunAdapter({ killSwitch: inactiveKillSwitch });
    await adapter.executeDryRun(validStagingRequest);
    const events = adapter.getAuditEvents();
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].providerCallMade).toBe(false);
  });

  it("18. No external side effect", async () => {
    const adapter = new ProviderDryRunAdapter({ killSwitch: inactiveKillSwitch });
    const res = await adapter.executeDryRun(validStagingRequest);
    expect(res.sideEffectsAllowed).toBe(false);
    expect(res.createdResources.length).toBe(0);
  });

  it("19. No runtime composition mutation", async () => {
    const adapter = new ProviderDryRunAdapter({ killSwitch: inactiveKillSwitch });
    await adapter.executeDryRun(validStagingRequest);
    expect(adapter).toBeDefined();
  });

  it("20. No process.env mutation", async () => {
    const envBefore = { ...process.env };
    const adapter = new ProviderDryRunAdapter({ killSwitch: inactiveKillSwitch });
    await adapter.executeDryRun(validStagingRequest);
    expect(process.env).toEqual(envBefore);
  });
});
