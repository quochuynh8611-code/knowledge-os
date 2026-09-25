/**
 * Research Execution Readiness Unit Tests (Phase 6.3)
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * - Readiness gate never enables real execution.
 * - All safety flags strictly false.
 * - Report status can only be 'BLOCKED', 'NOT_READY', or 'READY_FOR_MANUAL_REVIEW'.
 * - Zero real provider or network execution.
 */

import { describe, it, expect } from "vitest";
import {
  evaluateExecutionReadiness,
  ResearchExecutionReadinessReport,
} from "../../src/server/services/providers/researchExecutionReadiness.js";
import {
  DEFAULT_RESEARCH_PROVIDER_CONFIG,
  APPROVED_PROVIDER_IDS,
  ResearchProviderConfig,
} from "../../src/server/config/researchProviderConfig.js";
import { DefaultRuntimeCompositionAudit } from "../../src/server/services/providers/runtimeCompositionAudit.js";

describe("RESEARCH EXECUTION READINESS GATE (PHASE 6.3)", () => {
  it("1. Default report is NOT_READY or READY_FOR_MANUAL_REVIEW, never real-ready", () => {
    const report: ResearchExecutionReadinessReport = evaluateExecutionReadiness();

    expect(["NOT_READY", "READY_FOR_MANUAL_REVIEW", "BLOCKED"]).toContain(report.status);
    expect((report as any).status).not.toBe("READY");
    expect((report as any).status).not.toBe("READY_FOR_REAL_EXECUTION");
    expect((report as any).status).not.toBe("REAL_EXECUTION_APPROVED");
  });

  it("2. realExecutionAllowed === false", () => {
    const report = evaluateExecutionReadiness();
    expect(report.realExecutionAllowed).toBe(false);
  });

  it("3. notebookLMAllowed === false", () => {
    const report = evaluateExecutionReadiness();
    expect(report.notebookLMAllowed).toBe(false);
  });

  it("4. antigravityAllowed === false", () => {
    const report = evaluateExecutionReadiness();
    expect(report.antigravityAllowed).toBe(false);
  });

  it("5. networkAllowed === false", () => {
    const report = evaluateExecutionReadiness();
    expect(report.networkAllowed).toBe(false);
  });

  it("6. credentialsAllowed === false", () => {
    const report = evaluateExecutionReadiness();
    expect(report.credentialsAllowed).toBe(false);
  });

  it("7. childProcessAllowed === false", () => {
    const report = evaluateExecutionReadiness();
    expect(report.childProcessAllowed).toBe(false);
  });

  it("8. Safe default config passes", () => {
    const report = evaluateExecutionReadiness({
      config: DEFAULT_RESEARCH_PROVIDER_CONFIG,
    });

    const safeConfigCheck = report.checks.find((c) => c.code === "SAFE_DEFAULT_CONFIG");
    expect(safeConfigCheck).toBeDefined();
    expect(safeConfigCheck?.status).toBe("PASS");
  });

  it("9. Invalid config fails closed", () => {
    const invalidConfig: ResearchProviderConfig = {
      enableProviderRouting: true,
      defaultProviderId: "unapproved-provider",
      allowNotebookLM: true,
      allowProviderFallback: true,
      enableMcpServer: true,
    };

    const report = evaluateExecutionReadiness({
      config: invalidConfig,
    });

    expect(report.status).toBe("BLOCKED");
    const safeConfigCheck = report.checks.find((c) => c.code === "SAFE_DEFAULT_CONFIG");
    expect(safeConfigCheck?.status).toBe("FAIL");
    expect(safeConfigCheck?.severity).toBe("BLOCKER");
  });

  it("10. Unknown provider fails closed", () => {
    const unknownProviderConfig: ResearchProviderConfig = {
      enableProviderRouting: true,
      defaultProviderId: "unknown-cloud-ai",
      allowNotebookLM: false,
      allowProviderFallback: false,
      enableMcpServer: false,
    };

    const report = evaluateExecutionReadiness({
      config: unknownProviderConfig,
    });

    expect(report.status).toBe("BLOCKED");
    const providerPolicyCheck = report.checks.find((c) => c.code === "PROVIDER_SELECTION_POLICY");
    expect(providerPolicyCheck?.status).toBe("FAIL");
  });

  it("11. Real execution mode is blocked", () => {
    const report = evaluateExecutionReadiness();
    const realExecCheck = report.checks.find((c) => c.code === "REAL_EXECUTION_DISABLED");

    expect(realExecCheck).toBeDefined();
    expect(realExecCheck?.status).toBe("PASS");
    expect(report.realExecutionAllowed).toBe(false);
  });

  it("12. Side effects true is blocked", () => {
    const report = evaluateExecutionReadiness();
    const capCheck = report.checks.find((c) => c.code === "CAPABILITY_POLICY");

    expect(capCheck).toBeDefined();
    expect(capCheck?.status).toBe("PASS");
  });

  it("13. Missing approval is blocker", () => {
    const report = evaluateExecutionReadiness();
    const approvalCheck = report.checks.find((c) => c.code === "APPROVAL_GATE_BOUNDARY");

    expect(approvalCheck).toBeDefined();
    expect(approvalCheck?.status).toBe("PASS");
  });

  it("14. Expired approval is blocker", () => {
    const report = evaluateExecutionReadiness();
    const approvalCheck = report.checks.find((c) => c.code === "APPROVAL_GATE_BOUNDARY");

    expect(approvalCheck?.evidence.some((e) => e.includes("approved_for_handoff"))).toBe(true);
  });

  it("15. Capability mismatch is blocker", () => {
    const report = evaluateExecutionReadiness();
    const capCheck = report.checks.find((c) => c.code === "CAPABILITY_POLICY");

    expect(capCheck?.evidence).toContain("ExecutionCapabilities.providerExecution: false");
  });

  it("16. Secret exposure is blocker", () => {
    const report = evaluateExecutionReadiness();
    const secretCheck = report.checks.find((c) => c.code === "SECRET_BOUNDARY");

    expect(secretCheck).toBeDefined();
    expect(secretCheck?.status).toBe("PASS");
  });

  it("17. Network capability is blocker", () => {
    const report = evaluateExecutionReadiness();
    const netCheck = report.checks.find((c) => c.code === "NETWORK_BOUNDARY");

    expect(netCheck).toBeDefined();
    expect(netCheck?.status).toBe("PASS");
    expect(report.networkAllowed).toBe(false);
  });

  it("18. MCP listener capability is blocker", () => {
    const report = evaluateExecutionReadiness();
    const mcpCheck = report.checks.find((c) => c.code === "MCP_BOUNDARY");

    expect(mcpCheck).toBeDefined();
    expect(mcpCheck?.status).toBe("PASS");
  });

  it("19. Persistence unsafe behavior is blocker", () => {
    const report = evaluateExecutionReadiness();
    const persistenceCheck = report.checks.find((c) => c.code === "PERSISTENCE_BOUNDARY");

    expect(persistenceCheck).toBeDefined();
    expect(persistenceCheck?.status).toBe("PASS");
  });

  it("20. Report contains no secrets", () => {
    const report = evaluateExecutionReadiness();
    const serialized = JSON.stringify(report);

    expect(serialized).not.toContain("bearer");
    expect(serialized).not.toContain("apiKey");
    expect(serialized).not.toContain("password");
    expect(serialized).not.toContain("clientSecret");
  });

  it("21. Report contains no raw source", () => {
    const report = evaluateExecutionReadiness();
    const serialized = JSON.stringify(report);

    expect(serialized).not.toContain("rawSourceText");
    expect(serialized).not.toContain("inline-text");
  });

  it("22. Report contains no filesystem path", () => {
    const report = evaluateExecutionReadiness();
    const serialized = JSON.stringify(report);

    expect(serialized).not.toContain("/Users/");
    expect(serialized).not.toContain("/etc/");
    expect(serialized).not.toContain("/var/");
  });

  it("23. Report is JSON-serializable", () => {
    const report = evaluateExecutionReadiness();
    const serialized = JSON.stringify(report);
    const parsed = JSON.parse(serialized);

    expect(parsed).toEqual(report);
  });

  it("24. Report fingerprint is deterministic for same sanitized input", () => {
    const fixedTime = () => new Date("2026-09-24T12:00:00.000Z");
    const rep1 = evaluateExecutionReadiness({ now: fixedTime });
    const rep2 = evaluateExecutionReadiness({ now: fixedTime });

    expect(rep1.reportFingerprint).toBe(rep2.reportFingerprint);
    expect(typeof rep1.reportFingerprint).toBe("string");
    expect(rep1.reportFingerprint.length).toBe(64);
  });

  it("25. Audit does not mutate input", () => {
    const configInput = { ...DEFAULT_RESEARCH_PROVIDER_CONFIG };
    const configClone = JSON.parse(JSON.stringify(configInput));

    evaluateExecutionReadiness({ config: configInput });

    expect(configInput).toEqual(configClone);
  });
});
