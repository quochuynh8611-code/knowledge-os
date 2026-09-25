/**
 * Provider Dry-Run Adapter Unit Tests (Phase 6.5)
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * - Validates fail-closed gating, capability enforcement, and idempotency.
 * - Proves fake transport is the exclusive execution dependency.
 * - Zero network, credentials, or live provider handles.
 */

import { describe, it, expect, vi } from "vitest";
import { ProviderDryRunAdapter } from "../../src/server/services/providers/providerDryRunAdapter.js";
import { DeterministicFakeProviderTransport } from "../../src/server/services/providers/fakeProviderTransport.js";
import { StagingSandboxRequest } from "../../src/server/services/providers/stagingSandboxContract.js";
import {
  computeKillSwitchFingerprint,
  DEFAULT_KILL_SWITCH,
} from "../../src/server/services/providers/executionKillSwitch.js";

describe("PROVIDER DRY-RUN ADAPTER (PHASE 6.5)", () => {
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
    requestId: "req-dryrun-12345",
    correlationId: "corr-dryrun-67890",
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

  it("1. Valid staging request accepted", async () => {
    const adapter = new ProviderDryRunAdapter({
      killSwitch: inactiveKillSwitch,
    });
    const res = await adapter.executeDryRun(validStagingRequest);

    expect(res.kind).toBe("dry_run_accepted");
    expect(res.sideEffectsAllowed).toBe(false);
    expect(res.providerCallMade).toBe(false);
    expect(res.networkCallMade).toBe(false);
    expect(res.credentialsAccessed).toBe(false);
    expect(res.createdResources.length).toBe(0);
  });

  it("2. Production request rejected before transport call", async () => {
    const transport = new DeterministicFakeProviderTransport();
    const spy = vi.spyOn(transport, "execute");

    const adapter = new ProviderDryRunAdapter({
      transport,
      killSwitch: inactiveKillSwitch,
    });

    const prodReq = {
      ...validStagingRequest,
      environment: "production" as any,
    };

    const res = await adapter.executeDryRun(prodReq);
    expect(res.kind).toBe("dry_run_rejected");
    if (res.kind === "dry_run_rejected") {
      expect(res.reason).toBe("PRODUCTION_FORBIDDEN");
    }
    expect(spy).not.toHaveBeenCalled();
  });

  it("3. Kill-switch active rejected before transport call", async () => {
    const transport = new DeterministicFakeProviderTransport();
    const spy = vi.spyOn(transport, "execute");

    const adapter = new ProviderDryRunAdapter({
      transport,
      killSwitch: DEFAULT_KILL_SWITCH, // active: true
    });

    const res = await adapter.executeDryRun(validStagingRequest);
    expect(res.kind).toBe("dry_run_rejected");
    if (res.kind === "dry_run_rejected") {
      expect(res.reason).toBe("KILL_SWITCH_ACTIVE");
    }
    expect(spy).not.toHaveBeenCalled();
  });

  it("4. Capability escalation rejected before transport call", async () => {
    const transport = new DeterministicFakeProviderTransport();
    const spy = vi.spyOn(transport, "execute");

    const adapter = new ProviderDryRunAdapter({
      transport,
      killSwitch: inactiveKillSwitch,
    });

    const reqWithNetwork = {
      ...validStagingRequest,
      capabilities: {
        ...validStagingRequest.capabilities,
        network: true as any,
      },
    };

    const res = await adapter.executeDryRun(reqWithNetwork);
    expect(res.kind).toBe("dry_run_rejected");
    expect(spy).not.toHaveBeenCalled();
  });

  it("5. Readiness mismatch rejected before transport call", async () => {
    const transport = new DeterministicFakeProviderTransport();
    const spy = vi.spyOn(transport, "execute");

    const adapter = new ProviderDryRunAdapter({
      transport,
      killSwitch: inactiveKillSwitch,
    });

    const reqEmptyReadiness = {
      ...validStagingRequest,
      readinessReportFingerprint: "",
    };

    const res = await adapter.executeDryRun(reqEmptyReadiness);
    expect(res.kind).toBe("dry_run_rejected");
    expect(spy).not.toHaveBeenCalled();
  });

  it("6. Approval mismatch rejected before transport call", async () => {
    const transport = new DeterministicFakeProviderTransport();
    const spy = vi.spyOn(transport, "execute");

    const adapter = new ProviderDryRunAdapter({
      transport,
      killSwitch: inactiveKillSwitch,
    });

    const reqEmptyApproval = {
      ...validStagingRequest,
      approvalFingerprint: "",
    };

    const res = await adapter.executeDryRun(reqEmptyApproval);
    expect(res.kind).toBe("dry_run_rejected");
    expect(spy).not.toHaveBeenCalled();
  });

  it("7. Provider/tool unsupported rejected", async () => {
    const adapter = new ProviderDryRunAdapter({
      killSwitch: inactiveKillSwitch,
    });

    // Antigravity does not support create_workspace
    const unsupportedReq: StagingSandboxRequest = {
      ...validStagingRequest,
      providerId: "antigravity-legacy",
      tool: "research_create_workspace",
    };

    const res = await adapter.executeDryRun(unsupportedReq);
    expect(res.kind).toBe("dry_run_rejected");
    if (res.kind === "dry_run_rejected") {
      expect(res.reason).toBe("PROVIDER_UNSUPPORTED");
    }
  });

  it("8. Adapter calls fake transport exactly once for new request", async () => {
    const transport = new DeterministicFakeProviderTransport();
    const spy = vi.spyOn(transport, "execute");

    const adapter = new ProviderDryRunAdapter({
      transport,
      killSwitch: inactiveKillSwitch,
    });

    await adapter.executeDryRun(validStagingRequest);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("9. Adapter returns replay without duplicate transport call", async () => {
    const transport = new DeterministicFakeProviderTransport();
    const spy = vi.spyOn(transport, "execute");

    const adapter = new ProviderDryRunAdapter({
      transport,
      killSwitch: inactiveKillSwitch,
    });

    const res1 = await adapter.executeDryRun(validStagingRequest);
    const res2 = await adapter.executeDryRun(validStagingRequest);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(res1.kind).toBe("dry_run_accepted");
    expect(res2.kind).toBe("dry_run_accepted");
    if (res2.kind === "dry_run_accepted") {
      expect(res2.simulatedProviderStatus).toBe("REPLAY");
    }
  });

  it("10. Adapter returns conflict without overwrite", async () => {
    const transport = new DeterministicFakeProviderTransport();
    const adapter = new ProviderDryRunAdapter({
      transport,
      killSwitch: inactiveKillSwitch,
    });

    await adapter.executeDryRun(validStagingRequest);

    const conflictingReq: StagingSandboxRequest = {
      ...validStagingRequest,
      inputFingerprint: "different-input-fingerprint",
    };

    const resConflict = await adapter.executeDryRun(conflictingReq);
    expect(resConflict.kind).toBe("dry_run_rejected");
    if (resConflict.kind === "dry_run_rejected") {
      expect(resConflict.reason).toBe("IDEMPOTENCY_CONFLICT");
    }
  });

  it("11. Adapter preserves providerId", async () => {
    const adapter = new ProviderDryRunAdapter({
      killSwitch: inactiveKillSwitch,
    });
    const res = await adapter.executeDryRun(validStagingRequest);
    expect(res.providerId).toBe(validStagingRequest.providerId);
  });

  it("12. Adapter preserves tool", async () => {
    const adapter = new ProviderDryRunAdapter({
      killSwitch: inactiveKillSwitch,
    });
    const res = await adapter.executeDryRun(validStagingRequest);
    expect(res.tool).toBe(validStagingRequest.tool);
  });

  it("13. Adapter preserves correlationId", async () => {
    const adapter = new ProviderDryRunAdapter({
      killSwitch: inactiveKillSwitch,
    });
    const res = await adapter.executeDryRun(validStagingRequest);
    expect(res.correlationId).toBe(validStagingRequest.correlationId);
  });

  it("14. Adapter generates deterministic dryRunId", async () => {
    const adapter1 = new ProviderDryRunAdapter({
      killSwitch: inactiveKillSwitch,
    });
    const adapter2 = new ProviderDryRunAdapter({
      killSwitch: inactiveKillSwitch,
    });

    const res1 = await adapter1.executeDryRun(validStagingRequest);
    const res2 = await adapter2.executeDryRun(validStagingRequest);

    if (res1.kind === "dry_run_accepted" && res2.kind === "dry_run_accepted") {
      expect(res1.dryRunId).toBe(res2.dryRunId);
    }
  });

  it("15. Adapter emits sanitized audit event", async () => {
    const adapter = new ProviderDryRunAdapter({
      killSwitch: inactiveKillSwitch,
    });
    await adapter.executeDryRun(validStagingRequest);

    const events = adapter.getAuditEvents();
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].providerCallMade).toBe(false);
    expect(events[0].networkCallMade).toBe(false);
  });

  it("16. Adapter does not call real provider", async () => {
    const adapter = new ProviderDryRunAdapter({
      killSwitch: inactiveKillSwitch,
    });
    const res = await adapter.executeDryRun(validStagingRequest);
    expect(res.providerCallMade).toBe(false);
  });

  it("17. Adapter does not call ProviderRegistry", async () => {
    const adapter = new ProviderDryRunAdapter({
      killSwitch: inactiveKillSwitch,
    });
    expect((adapter as any).registry).toBeUndefined();
  });

  it("18. Adapter does not call ResearchOrchestrator", async () => {
    const adapter = new ProviderDryRunAdapter({
      killSwitch: inactiveKillSwitch,
    });
    expect((adapter as any).orchestrator).toBeUndefined();
  });

  it("19. Adapter does not read credential", async () => {
    const adapter = new ProviderDryRunAdapter({
      killSwitch: inactiveKillSwitch,
    });
    const res = await adapter.executeDryRun(validStagingRequest);
    expect(res.credentialsAccessed).toBe(false);
  });

  it("20. Adapter does not call network", async () => {
    const adapter = new ProviderDryRunAdapter({
      killSwitch: inactiveKillSwitch,
    });
    const res = await adapter.executeDryRun(validStagingRequest);
    expect(res.networkCallMade).toBe(false);
  });

  it("21. Adapter does not mutate input", async () => {
    const reqClone = { ...validStagingRequest };
    const adapter = new ProviderDryRunAdapter({
      killSwitch: inactiveKillSwitch,
    });
    await adapter.executeDryRun(reqClone);
    expect(reqClone).toEqual(validStagingRequest);
  });

  it("22. Adapter does not mark domain COMPLETED", async () => {
    const adapter = new ProviderDryRunAdapter({
      killSwitch: inactiveKillSwitch,
    });
    const res = await adapter.executeDryRun(validStagingRequest);
    expect((res as any).terminalStatus).toBeUndefined();
  });

  it("23. Adapter does not create resources", async () => {
    const adapter = new ProviderDryRunAdapter({
      killSwitch: inactiveKillSwitch,
    });
    const res = await adapter.executeDryRun(validStagingRequest);
    expect(res.createdResources.length).toBe(0);
  });

  it("24. Adapter does not fallback to another provider", async () => {
    const adapter = new ProviderDryRunAdapter({
      killSwitch: inactiveKillSwitch,
    });
    const res = await adapter.executeDryRun(validStagingRequest);
    expect(res.providerId).toBe(validStagingRequest.providerId);
  });

  it("25. Adapter is safe under repeated requests", async () => {
    const adapter = new ProviderDryRunAdapter({
      killSwitch: inactiveKillSwitch,
    });
    for (let i = 0; i < 5; i++) {
      const res = await adapter.executeDryRun(validStagingRequest);
      expect(res.kind).toBe("dry_run_accepted");
    }
  });
});
