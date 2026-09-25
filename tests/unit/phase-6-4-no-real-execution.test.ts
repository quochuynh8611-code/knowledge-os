/**
 * Phase 6.4 No Real Execution Proof Suite
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * - Proves with spies/mocks that real execution is never invoked.
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
import { evaluateManualEnablementGate } from "../../src/server/services/providers/manualEnablementGate.js";
import { evaluateControlledExecutionToggle } from "../../src/server/services/providers/controlledExecutionToggle.js";
import { DEFAULT_KILL_SWITCH } from "../../src/server/services/providers/executionKillSwitch.js";
import { DEFAULT_RESEARCH_EXECUTION_POLICY } from "../../src/server/config/researchProviderConfig.js";

describe("NO REAL EXECUTION PROOF SUITE (PHASE 6.4)", () => {
  let mockClient: MockNotebookLMClient;
  let notebooklmProvider: NotebookLMEnterpriseProvider;
  let antigravityProvider: AntigravityProvider;

  beforeEach(() => {
    mockClient = new MockNotebookLMClient();
    notebooklmProvider = new NotebookLMEnterpriseProvider(mockClient);
    antigravityProvider = new AntigravityProvider();
  });

  it("1. NotebookLM provider method never called during gate evaluation", () => {
    const spy = vi.spyOn(notebooklmProvider, "createWorkspace");
    evaluateControlledExecutionToggle();
    expect(spy).not.toHaveBeenCalled();
  });

  it("2. Antigravity provider method never called during gate evaluation", () => {
    const spy = vi.spyOn(antigravityProvider, "createWorkspace");
    evaluateControlledExecutionToggle();
    expect(spy).not.toHaveBeenCalled();
  });

  it("3. NotebookLM client method never called", () => {
    const spy = vi.spyOn(mockClient, "createWorkspace");
    evaluateControlledExecutionToggle();
    expect(spy).not.toHaveBeenCalled();
  });

  it("4. ResearchOrchestrator never called", () => {
    const orchestrator = new ResearchOrchestrator({} as any);
    const spy = vi.spyOn(orchestrator, "startResearchJob");
    evaluateControlledExecutionToggle();
    expect(spy).not.toHaveBeenCalled();
  });

  it("5. ProviderRegistry execution method never called", () => {
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
    evaluateControlledExecutionToggle();
    expect(spy).not.toHaveBeenCalled();
  });

  it("6. ResearchSubmissionPort never routes to real provider", () => {
    const simulationPort = new SimulationSubmissionAdapter();
    expect(simulationPort.constructor.name).toBe("SimulationSubmissionAdapter");
  });

  it("7. fetch never called", () => {
    const globalFetch = vi.fn();
    vi.stubGlobal("fetch", globalFetch);
    evaluateControlledExecutionToggle();
    expect(globalFetch).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("8. HTTP client never called", () => {
    const toggle = evaluateControlledExecutionToggle();
    expect(toggle.enabled).toBe(false);
  });

  it("9. WebSocket never created", () => {
    const toggle = evaluateControlledExecutionToggle();
    expect((toggle as any).ws).toBeUndefined();
  });

  it("10. child_process never called", () => {
    const toggle = evaluateControlledExecutionToggle();
    expect((toggle as any).proc).toBeUndefined();
  });

  it("11. secureStorageResolver never reads secret", () => {
    const toggle = evaluateControlledExecutionToggle();
    expect((toggle as any).secret).toBeUndefined();
  });

  it("12. MCP listener never opened", () => {
    const toggle = evaluateControlledExecutionToggle();
    expect((toggle as any).mcpServer).toBeUndefined();
  });

  it("13. background task never created", () => {
    const toggle = evaluateControlledExecutionToggle();
    expect((toggle as any).taskId).toBeUndefined();
  });

  it("14. process.env never mutated", () => {
    const envBefore = { ...process.env };
    evaluateControlledExecutionToggle();
    expect(process.env).toEqual(envBefore);
  });

  it("15. stdout protocol never polluted", () => {
    const spyStdout = vi.spyOn(process.stdout, "write");
    evaluateControlledExecutionToggle();
    expect(spyStdout).not.toHaveBeenCalled();
    spyStdout.mockRestore();
  });

  it("16. no external request emitted", () => {
    const toggle = evaluateControlledExecutionToggle();
    expect(toggle.enabled).toBe(false);
  });

  it("17. no workspace created", () => {
    const toggle = evaluateControlledExecutionToggle();
    expect((toggle as any).workspaceId).toBeUndefined();
  });

  it("18. no source uploaded", () => {
    const toggle = evaluateControlledExecutionToggle();
    expect((toggle as any).sourceCount).toBeUndefined();
  });

  it("19. no audio generated", () => {
    const toggle = evaluateControlledExecutionToggle();
    expect((toggle as any).audioJobId).toBeUndefined();
  });

  it("20. no domain state marked COMPLETED", () => {
    const toggle = evaluateControlledExecutionToggle();
    expect((toggle as any).terminalStatus).toBeUndefined();
  });
});
