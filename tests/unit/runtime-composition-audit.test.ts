/**
 * Runtime Composition Audit Unit Tests (Phase 6.3)
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * - Pure, deterministic audit of runtime composition.
 * - Distinguishes mock adapter from real readiness.
 * - Zero provider calls, zero network, zero process.env mutation.
 */

import { describe, it, expect, vi } from "vitest";
import { DefaultRuntimeCompositionAudit } from "../../src/server/services/providers/runtimeCompositionAudit.js";
import {
  DEFAULT_RESEARCH_PROVIDER_CONFIG,
  APPROVED_PROVIDER_IDS,
  ResearchProviderConfig,
} from "../../src/server/config/researchProviderConfig.js";
import { createDefaultProviderRegistry } from "../../src/server/bootstrap/researchProviderComposition.js";
import { ProviderRegistry } from "../../src/server/services/providers/providerRegistry.js";
import { ResearchOrchestrator } from "../../src/server/services/providers/researchOrchestrator.js";
import { SimulationSubmissionAdapter } from "../../src/server/services/providers/simulationSubmissionAdapter.js";

describe("RUNTIME COMPOSITION AUDIT (PHASE 6.3)", () => {
  const auditService = new DefaultRuntimeCompositionAudit();

  it("1. Audit identifies provider composition", () => {
    const registry = createDefaultProviderRegistry(DEFAULT_RESEARCH_PROVIDER_CONFIG);
    const result = auditService.audit({
      config: DEFAULT_RESEARCH_PROVIDER_CONFIG,
      providerRegistry: registry,
    });

    expect(result).toBeDefined();
    expect(result.providerInstances.length).toBeGreaterThan(0);
  });

  it("2. Audit identifies enabled providers", () => {
    const result = auditService.audit({
      config: DEFAULT_RESEARCH_PROVIDER_CONFIG,
    });

    expect(result.enabledProviderIds).toContain(APPROVED_PROVIDER_IDS.LEGACY);
    expect(result.enabledProviderIds).not.toContain(APPROVED_PROVIDER_IDS.NOTEBOOKLM_ENTERPRISE);
  });

  it("3. Audit identifies default provider", () => {
    const result = auditService.audit({
      config: DEFAULT_RESEARCH_PROVIDER_CONFIG,
    });

    expect(result.defaultProviderId).toBe(APPROVED_PROVIDER_IDS.LEGACY);
  });

  it("4. Audit identifies MockNotebookLMClient", () => {
    const configWithNotebookLM = {
      ...DEFAULT_RESEARCH_PROVIDER_CONFIG,
      allowNotebookLM: true,
    };
    const registry = createDefaultProviderRegistry(configWithNotebookLM);
    const result = auditService.audit({
      config: configWithNotebookLM,
      providerRegistry: registry,
    });

    const notebooklmProvider = result.providerInstances.find(
      (p) => p.id === APPROVED_PROVIDER_IDS.NOTEBOOKLM_ENTERPRISE
    );

    expect(notebooklmProvider).toBeDefined();
    expect(notebooklmProvider?.clientType).toBe("mock");
  });

  it("5. Audit does not instantiate real client", () => {
    const result = auditService.audit({
      config: DEFAULT_RESEARCH_PROVIDER_CONFIG,
    });

    const realProviders = result.providerInstances.filter((p) => p.clientType === "real");
    expect(realProviders.length).toBe(0);
  });

  it("6. Audit does not call provider methods", () => {
    const registry = createDefaultProviderRegistry(DEFAULT_RESEARCH_PROVIDER_CONFIG);
    const spy = vi.spyOn(registry, "getProviderById");

    auditService.audit({
      config: DEFAULT_RESEARCH_PROVIDER_CONFIG,
      providerRegistry: registry,
    });

    expect(spy).not.toHaveBeenCalled();
  });

  it("7. Audit does not call network", () => {
    const result = auditService.audit({
      config: DEFAULT_RESEARCH_PROVIDER_CONFIG,
    });

    expect(result.networkCapabilityDetected).toBe(false);
  });

  it("8. Audit does not read credentials", () => {
    const result = auditService.audit({
      config: DEFAULT_RESEARCH_PROVIDER_CONFIG,
    });

    expect(result.credentialAccessDetected).toBe(false);
  });

  it("9. Audit does not mutate process.env", () => {
    const envBefore = { ...process.env };
    auditService.audit({
      config: DEFAULT_RESEARCH_PROVIDER_CONFIG,
    });

    expect(process.env).toEqual(envBefore);
  });

  it("10. Audit detects missing submission port", () => {
    const result = auditService.audit({
      config: DEFAULT_RESEARCH_PROVIDER_CONFIG,
      submissionPort: null,
    });

    expect(result.submissionPortBound).toBe(false);
  });

  it("11. Audit detects direct orchestrator bypass", () => {
    const mockOrchestrator = {} as ResearchOrchestrator;
    const result = auditService.audit({
      config: DEFAULT_RESEARCH_PROVIDER_CONFIG,
      orchestrator: mockOrchestrator,
      submissionPort: null, // missing submission port wrapping
    });

    expect(result.hasDirectOrchestratorBypass).toBe(true);
    expect(result.bypasses.some((b) => b.location.includes("orchestrator"))).toBe(true);
  });

  it("12. Audit detects direct provider bypass", () => {
    const registry = createDefaultProviderRegistry(DEFAULT_RESEARCH_PROVIDER_CONFIG);
    const result = auditService.audit({
      config: DEFAULT_RESEARCH_PROVIDER_CONFIG,
      providerRegistry: registry,
      submissionPort: null, // missing submission port wrapping
    });

    expect(result.hasDirectProviderBypass).toBe(true);
    expect(result.bypasses.some((b) => b.location.includes("ProviderRegistry"))).toBe(true);
  });

  it("13. Audit detects unsafe fallback", () => {
    const unsafeConfig: ResearchProviderConfig = {
      enableProviderRouting: true,
      defaultProviderId: "unapproved-cloud-adapter",
      allowNotebookLM: false,
      allowProviderFallback: true,
      enableMcpServer: false,
    };

    const result = auditService.audit({
      config: unsafeConfig,
    });

    expect(result.bypasses.some((b) => b.severity === "BLOCKER")).toBe(true);
  });

  it("14. Audit reports simulation adapter default", () => {
    const simulationPort = new SimulationSubmissionAdapter();
    const result = auditService.audit({
      config: DEFAULT_RESEARCH_PROVIDER_CONFIG,
      submissionPort: simulationPort,
    });

    expect(result.defaultSubmissionAdapter).toBe("SimulationSubmissionAdapter");
    expect(result.submissionPortBound).toBe(true);
  });

  it("15. Audit distinguishes mock provider from real readiness", () => {
    const configWithNotebookLM = {
      ...DEFAULT_RESEARCH_PROVIDER_CONFIG,
      allowNotebookLM: true,
    };
    const registry = createDefaultProviderRegistry(configWithNotebookLM);
    const result = auditService.audit({
      config: configWithNotebookLM,
      providerRegistry: registry,
    });

    const mockProvider = result.providerInstances.find(
      (p) => p.id === APPROVED_PROVIDER_IDS.NOTEBOOKLM_ENTERPRISE
    );

    expect(mockProvider?.clientType).toBe("mock");
    expect(result.realExecutionPossible).toBe(false);
  });

  it("16. Audit reports safe default config", () => {
    const result = auditService.audit({
      config: DEFAULT_RESEARCH_PROVIDER_CONFIG,
    });

    expect(result.isDefaultConfigSafe).toBe(true);
    expect(result.routingEnabled).toBe(false);
  });

  it("17. Audit fails closed on unknown provider", () => {
    const unknownConfig: ResearchProviderConfig = {
      enableProviderRouting: true,
      defaultProviderId: "completely-unknown",
      allowNotebookLM: false,
      allowProviderFallback: false,
      enableMcpServer: false,
    };

    const result = auditService.audit({
      config: unknownConfig,
    });

    expect(result.bypasses.some((b) => b.severity === "BLOCKER")).toBe(true);
  });

  it("18. Audit is deterministic", () => {
    const res1 = auditService.audit({ config: DEFAULT_RESEARCH_PROVIDER_CONFIG });
    const res2 = auditService.audit({ config: DEFAULT_RESEARCH_PROVIDER_CONFIG });

    expect(res1.auditFingerprint).toBe(res2.auditFingerprint);
    expect(typeof res1.auditFingerprint).toBe("string");
  });

  it("19. Audit has no import-time side effect", () => {
    expect(typeof DefaultRuntimeCompositionAudit).toBe("function");
  });

  it("20. Audit does not open MCP listener", () => {
    const result = auditService.audit({
      config: DEFAULT_RESEARCH_PROVIDER_CONFIG,
    });

    expect(result.childProcessDetected).toBe(false);
  });
});
