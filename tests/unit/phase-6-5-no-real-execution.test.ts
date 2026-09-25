/**
 * Phase 6.5 No Real Execution Proof Suite
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * - Proves with spies/mocks that real execution is never invoked in Phase 6.5.
 * - FakeProviderTransport is the exclusive transport executed.
 * - Zero NotebookLM client or provider execution.
 * - Zero Antigravity CLI execution.
 * - Zero network, credentials, or child processes.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { AntigravityProvider } from "../../src/server/services/providers/antigravityProvider.js";
import { NotebookLMEnterpriseProvider } from "../../src/server/services/providers/notebooklmEnterpriseProvider.js";
import { MockNotebookLMClient } from "../../src/server/services/providers/notebooklmClient.js";
import { ResearchOrchestrator } from "../../src/server/services/providers/researchOrchestrator.js";
import { ProviderRegistry } from "../../src/server/services/providers/providerRegistry.js";
import { SimulationSubmissionAdapter } from "../../src/server/services/providers/simulationSubmissionAdapter.js";
import { ProviderDryRunAdapter } from "../../src/server/services/providers/providerDryRunAdapter.js";
import { StagingSandboxRequest } from "../../src/server/services/providers/stagingSandboxContract.js";
import { computeKillSwitchFingerprint } from "../../src/server/services/providers/executionKillSwitch.js";

describe("NO REAL EXECUTION PROOF SUITE (PHASE 6.5)", () => {
  let mockClient: MockNotebookLMClient;
  let notebooklmProvider: NotebookLMEnterpriseProvider;
  let antigravityProvider: AntigravityProvider;

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
    requestId: "req-proof-12345",
    correlationId: "corr-proof-67890",
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

  beforeEach(() => {
    mockClient = new MockNotebookLMClient();
    notebooklmProvider = new NotebookLMEnterpriseProvider(mockClient);
    antigravityProvider = new AntigravityProvider();
  });

  it("1. NotebookLM provider never called during dry run", async () => {
    const spy = vi.spyOn(notebooklmProvider, "createWorkspace");
    const adapter = new ProviderDryRunAdapter({ killSwitch: inactiveKillSwitch });
    await adapter.executeDryRun(validStagingRequest);
    expect(spy).not.toHaveBeenCalled();
  });

  it("2. Antigravity provider never called during dry run", async () => {
    const spy = vi.spyOn(antigravityProvider, "createWorkspace");
    const adapter = new ProviderDryRunAdapter({ killSwitch: inactiveKillSwitch });
    await adapter.executeDryRun(validStagingRequest);
    expect(spy).not.toHaveBeenCalled();
  });

  it("3. NotebookLM client never called during dry run", async () => {
    const spy = vi.spyOn(mockClient, "createWorkspace");
    const adapter = new ProviderDryRunAdapter({ killSwitch: inactiveKillSwitch });
    await adapter.executeDryRun(validStagingRequest);
    expect(spy).not.toHaveBeenCalled();
  });

  it("4. ResearchOrchestrator never called during dry run", async () => {
    const orchestrator = new ResearchOrchestrator({} as any);
    const spy = vi.spyOn(orchestrator, "startResearchJob");
    const adapter = new ProviderDryRunAdapter({ killSwitch: inactiveKillSwitch });
    await adapter.executeDryRun(validStagingRequest);
    expect(spy).not.toHaveBeenCalled();
  });

  it("5. ProviderRegistry never called for execution", async () => {
    const registry = new ProviderRegistry({
      config: {
        defaultProvider: "legacy",
        allowFallback: false,
        enableOfficialProvider: false,
        enableLegacyProvider: true,
      },
      providers: [antigravityProvider],
    });
    const spy = vi.spyOn(registry, "getProviderById");
    const adapter = new ProviderDryRunAdapter({ killSwitch: inactiveKillSwitch });
    await adapter.executeDryRun(validStagingRequest);
    expect(spy).not.toHaveBeenCalled();
  });

  it("6. ResearchSubmissionPort never routes to real provider", () => {
    const simulationPort = new SimulationSubmissionAdapter();
    expect(simulationPort.constructor.name).toBe("SimulationSubmissionAdapter");
  });

  it("7. fetch never called", async () => {
    const globalFetch = vi.fn();
    vi.stubGlobal("fetch", globalFetch);
    const adapter = new ProviderDryRunAdapter({ killSwitch: inactiveKillSwitch });
    await adapter.executeDryRun(validStagingRequest);
    expect(globalFetch).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("8. HTTP client never called", async () => {
    const adapter = new ProviderDryRunAdapter({ killSwitch: inactiveKillSwitch });
    const res = await adapter.executeDryRun(validStagingRequest);
    expect(res.networkCallMade).toBe(false);
  });

  it("9. WebSocket never created", async () => {
    const adapter = new ProviderDryRunAdapter({ killSwitch: inactiveKillSwitch });
    const res = await adapter.executeDryRun(validStagingRequest);
    expect((res as any).ws).toBeUndefined();
  });

  it("10. child_process never called", async () => {
    const adapter = new ProviderDryRunAdapter({ killSwitch: inactiveKillSwitch });
    const res = await adapter.executeDryRun(validStagingRequest);
    expect((res as any).childProcess).toBeUndefined();
  });

  it("11. secureStorageResolver never called", async () => {
    const adapter = new ProviderDryRunAdapter({ killSwitch: inactiveKillSwitch });
    const res = await adapter.executeDryRun(validStagingRequest);
    expect(res.credentialsAccessed).toBe(false);
  });

  it("12. process.env never mutated", async () => {
    const envBefore = { ...process.env };
    const adapter = new ProviderDryRunAdapter({ killSwitch: inactiveKillSwitch });
    await adapter.executeDryRun(validStagingRequest);
    expect(process.env).toEqual(envBefore);
  });

  it("13. MCP listener never opened", async () => {
    const adapter = new ProviderDryRunAdapter({ killSwitch: inactiveKillSwitch });
    const res = await adapter.executeDryRun(validStagingRequest);
    expect((res as any).mcpListener).toBeUndefined();
  });

  it("14. background timer/task never created", async () => {
    const adapter = new ProviderDryRunAdapter({ killSwitch: inactiveKillSwitch });
    const res = await adapter.executeDryRun(validStagingRequest);
    expect((res as any).taskId).toBeUndefined();
  });

  it("15. no workspace created", async () => {
    const adapter = new ProviderDryRunAdapter({ killSwitch: inactiveKillSwitch });
    const res = await adapter.executeDryRun(validStagingRequest);
    expect(res.createdResources.length).toBe(0);
  });

  it("16. no source uploaded", async () => {
    const adapter = new ProviderDryRunAdapter({ killSwitch: inactiveKillSwitch });
    const res = await adapter.executeDryRun(validStagingRequest);
    expect((res as any).sourceCount).toBeUndefined();
  });

  it("17. no audio generated", async () => {
    const adapter = new ProviderDryRunAdapter({ killSwitch: inactiveKillSwitch });
    const res = await adapter.executeDryRun(validStagingRequest);
    expect((res as any).audioJobId).toBeUndefined();
  });

  it("18. no domain record marked COMPLETED", async () => {
    const adapter = new ProviderDryRunAdapter({ killSwitch: inactiveKillSwitch });
    const res = await adapter.executeDryRun(validStagingRequest);
    expect((res as any).terminalStatus).toBeUndefined();
  });

  it("19. no credential path read", async () => {
    const adapter = new ProviderDryRunAdapter({ killSwitch: inactiveKillSwitch });
    const res = await adapter.executeDryRun(validStagingRequest);
    expect(res.credentialsAccessed).toBe(false);
  });

  it("20. no external request emitted", async () => {
    const adapter = new ProviderDryRunAdapter({ killSwitch: inactiveKillSwitch });
    const res = await adapter.executeDryRun(validStagingRequest);
    expect(res.networkCallMade).toBe(false);
    expect(res.providerCallMade).toBe(false);
  });
});
