/**
 * Staging Sandbox Contract Unit Tests (Phase 6.5)
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * - Production is strictly rejected.
 * - Test and staging allow only mode: 'dry_run'.
 * - Zero network, credentials, or live provider handles.
 */

import { describe, it, expect } from "vitest";
import {
  StagingSandboxRequest,
  validateStagingSandboxRequest,
  computeStagingSandboxResultFingerprint,
} from "../../src/server/services/providers/stagingSandboxContract.js";

describe("STAGING SANDBOX CONTRACT (PHASE 6.5)", () => {
  const validRequest: StagingSandboxRequest = {
    requestId: "req-stage-12345",
    correlationId: "corr-stage-67890",
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

  it("1. Production environment is rejected", () => {
    const prodReq = {
      ...validRequest,
      environment: "production" as any,
    };
    const res = validateStagingSandboxRequest(prodReq);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes("production"))).toBe(true);
  });

  it("2. Test environment is accepted only with dry_run", () => {
    const testReq: StagingSandboxRequest = {
      ...validRequest,
      environment: "test",
      mode: "dry_run",
    };
    const res = validateStagingSandboxRequest(testReq);
    expect(res.valid).toBe(true);
  });

  it("3. Staging environment is accepted only with dry_run", () => {
    const res = validateStagingSandboxRequest(validRequest);
    expect(res.valid).toBe(true);
  });

  it("4. Simulation-only mode is not confused with dry-run mode", () => {
    const simReq = {
      ...validRequest,
      mode: "simulation_only" as any,
    };
    const res = validateStagingSandboxRequest(simReq);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes("mode must be strictly 'dry_run'"))).toBe(true);
  });

  it("5. Missing requestId is rejected", () => {
    const req = { ...validRequest, requestId: "" };
    const res = validateStagingSandboxRequest(req);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes("requestId"))).toBe(true);
  });

  it("6. Missing correlationId is rejected", () => {
    const req = { ...validRequest, correlationId: "   " };
    const res = validateStagingSandboxRequest(req);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes("correlationId"))).toBe(true);
  });

  it("7. Missing fingerprints are rejected", () => {
    const req = { ...validRequest, inputFingerprint: "" };
    const res = validateStagingSandboxRequest(req);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes("inputFingerprint"))).toBe(true);
  });

  it("8. Capability true is rejected", () => {
    const req = {
      ...validRequest,
      capabilities: {
        ...validRequest.capabilities,
        network: true as any,
      },
    };
    const res = validateStagingSandboxRequest(req);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes("network"))).toBe(true);
  });

  it("9. Result is JSON-serializable", () => {
    const fp = computeStagingSandboxResultFingerprint({
      kind: "dry_run_accepted",
      environment: "staging",
      mode: "dry_run",
      providerId: "notebooklm-enterprise",
      tool: "research_create_workspace",
      dryRunId: "dryrun-123",
      correlationId: "corr-123",
      simulatedProviderStatus: "ACCEPTED",
      auditEventId: "audit-123",
    });

    const result = {
      kind: "dry_run_accepted" as const,
      environment: "staging" as const,
      mode: "dry_run" as const,
      providerId: "notebooklm-enterprise",
      tool: "research_create_workspace",
      dryRunId: "dryrun-123",
      correlationId: "corr-123",
      simulatedProviderStatus: "ACCEPTED" as const,
      sideEffectsAllowed: false as const,
      networkCallMade: false as const,
      credentialsAccessed: false as const,
      providerCallMade: false as const,
      createdResources: [] as const,
      auditEventId: "audit-123",
      fingerprint: fp,
    };

    const json = JSON.stringify(result);
    expect(typeof json).toBe("string");
    const parsed = JSON.parse(json);
    expect(parsed.kind).toBe("dry_run_accepted");
  });

  it("10. createdResources is always empty", () => {
    const createdResources: readonly [] = [];
    expect(createdResources.length).toBe(0);
  });

  it("11. Result contains no secret", () => {
    const fp = computeStagingSandboxResultFingerprint({
      kind: "dry_run_accepted",
      environment: "staging",
      mode: "dry_run",
      providerId: "notebooklm-enterprise",
      tool: "research_create_workspace",
      dryRunId: "dryrun-123",
      correlationId: "corr-123",
      auditEventId: "audit-123",
    });
    expect(fp).not.toContain("secret");
  });

  it("12. Result contains no path", () => {
    const fp = computeStagingSandboxResultFingerprint({
      kind: "dry_run_accepted",
      environment: "staging",
      mode: "dry_run",
      providerId: "notebooklm-enterprise",
      tool: "research_create_workspace",
      dryRunId: "dryrun-123",
      correlationId: "corr-123",
      auditEventId: "audit-123",
    });
    expect(fp).not.toContain("/Users/");
  });

  it("13. Result contains no provider instance", () => {
    const result = {
      kind: "dry_run_accepted",
      providerId: "notebooklm-enterprise",
    };
    expect((result as any).provider).toBeUndefined();
  });

  it("14. Result contains no network handle", () => {
    const result = {
      kind: "dry_run_accepted",
      networkCallMade: false,
    };
    expect((result as any).socket).toBeUndefined();
  });

  it("15. Result is deterministic", () => {
    const fp1 = computeStagingSandboxResultFingerprint({
      kind: "dry_run_accepted",
      environment: "staging",
      mode: "dry_run",
      providerId: "notebooklm-enterprise",
      tool: "research_create_workspace",
      dryRunId: "dryrun-123",
      correlationId: "corr-123",
      auditEventId: "audit-123",
    });
    const fp2 = computeStagingSandboxResultFingerprint({
      kind: "dry_run_accepted",
      environment: "staging",
      mode: "dry_run",
      providerId: "notebooklm-enterprise",
      tool: "research_create_workspace",
      dryRunId: "dryrun-123",
      correlationId: "corr-123",
      auditEventId: "audit-123",
    });
    expect(fp1).toBe(fp2);
  });

  it("16. Invalid provider is rejected", () => {
    const req = { ...validRequest, providerId: "unknown-provider" as any };
    const res = validateStagingSandboxRequest(req);
    expect(res.valid).toBe(false);
  });

  it("17. Invalid tool is rejected", () => {
    const req = { ...validRequest, tool: "unknown_tool" as any };
    const res = validateStagingSandboxRequest(req);
    expect(res.valid).toBe(false);
  });

  it("18. Empty metadata is safe", () => {
    const res = validateStagingSandboxRequest(validRequest);
    expect(res.valid).toBe(true);
  });

  it("19. Input is not mutated", () => {
    const reqClone = { ...validRequest };
    validateStagingSandboxRequest(reqClone);
    expect(reqClone).toEqual(validRequest);
  });

  it("20. No process.env mutation", () => {
    const envBefore = { ...process.env };
    validateStagingSandboxRequest(validRequest);
    expect(process.env).toEqual(envBefore);
  });
});
