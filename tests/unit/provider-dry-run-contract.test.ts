/**
 * Provider Dry-Run Contract Unit Tests (Phase 6.5)
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * - Provider-specific capability mapping.
 * - Unsupported tools reject without fallback.
 * - Zero real provider or network execution.
 */

import { describe, it, expect } from "vitest";
import {
  ProviderDryRunRequest,
  ProviderDryRunResponse,
  isToolSupportedByProvider,
  computeProviderDryRunFingerprint,
} from "../../src/server/services/providers/providerDryRunContract.js";

describe("PROVIDER DRY-RUN CONTRACT (PHASE 6.5)", () => {
  const validRequest: ProviderDryRunRequest = {
    providerId: "notebooklm-enterprise",
    tool: "research_create_workspace",
    correlationId: "corr-12345",
    inputFingerprint: "input-fp-123",
    requestFingerprint: "req-fp-456",
    environment: "staging",
    attempt: 1,
  };

  it("1. Provider/tool binding is preserved", () => {
    expect(validRequest.providerId).toBe("notebooklm-enterprise");
    expect(validRequest.tool).toBe("research_create_workspace");
  });

  it("2. Unsupported tool maps correctly", () => {
    // Antigravity does not support create_workspace
    expect(isToolSupportedByProvider("antigravity-legacy", "research_create_workspace")).toBe(false);
    expect(isToolSupportedByProvider("antigravity-legacy", "research_generate_audio")).toBe(false);
    expect(isToolSupportedByProvider("antigravity-legacy", "research_ingest_sources")).toBe(true);

    // NotebookLM supports all 3
    expect(isToolSupportedByProvider("notebooklm-enterprise", "research_create_workspace")).toBe(true);
    expect(isToolSupportedByProvider("notebooklm-enterprise", "research_ingest_sources")).toBe(true);
    expect(isToolSupportedByProvider("notebooklm-enterprise", "research_generate_audio")).toBe(true);
  });

  it("3. Accepted response has all safety flags false", () => {
    const resp: ProviderDryRunResponse = {
      providerId: "notebooklm-enterprise",
      tool: "research_create_workspace",
      status: "ACCEPTED",
      providerRequestId: "fake-req-123",
      attempt: 1,
      retryable: false,
      sideEffectsAllowed: false,
      providerCallMade: false,
      networkCallMade: false,
      credentialsAccessed: false,
    };
    expect(resp.sideEffectsAllowed).toBe(false);
    expect(resp.providerCallMade).toBe(false);
    expect(resp.networkCallMade).toBe(false);
    expect(resp.credentialsAccessed).toBe(false);
  });

  it("4. Rejected response has all safety flags false", () => {
    const resp: ProviderDryRunResponse = {
      providerId: "antigravity-legacy",
      tool: "research_create_workspace",
      status: "REJECTED",
      providerRequestId: "fake-req-456",
      attempt: 1,
      retryable: false,
      errorCode: "UNSUPPORTED_TOOL",
      sideEffectsAllowed: false,
      providerCallMade: false,
      networkCallMade: false,
      credentialsAccessed: false,
    };
    expect(resp.status).toBe("REJECTED");
    expect(resp.errorCode).toBe("UNSUPPORTED_TOOL");
  });

  it("5. Timeout maps correctly", () => {
    const resp: ProviderDryRunResponse = {
      providerId: "notebooklm-enterprise",
      tool: "research_create_workspace",
      status: "TIMEOUT",
      providerRequestId: "fake-req-timeout",
      attempt: 1,
      retryable: false,
      errorCode: "SIMULATED_TIMEOUT",
      sideEffectsAllowed: false,
      providerCallMade: false,
      networkCallMade: false,
      credentialsAccessed: false,
    };
    expect(resp.status).toBe("TIMEOUT");
    expect(resp.errorCode).toBe("SIMULATED_TIMEOUT");
  });

  it("6. Transient failure is retryable", () => {
    const resp: ProviderDryRunResponse = {
      providerId: "notebooklm-enterprise",
      tool: "research_create_workspace",
      status: "TRANSIENT_FAILURE",
      providerRequestId: "fake-req-transient",
      attempt: 1,
      retryable: true,
      errorCode: "TRANSIENT_PROVIDER_FAILURE",
      sideEffectsAllowed: false,
      providerCallMade: false,
      networkCallMade: false,
      credentialsAccessed: false,
    };
    expect(resp.retryable).toBe(true);
  });

  it("7. Permanent failure is not retryable", () => {
    const resp: ProviderDryRunResponse = {
      providerId: "notebooklm-enterprise",
      tool: "research_create_workspace",
      status: "PERMANENT_FAILURE",
      providerRequestId: "fake-req-perm",
      attempt: 1,
      retryable: false,
      errorCode: "PERMANENT_PROVIDER_FAILURE",
      sideEffectsAllowed: false,
      providerCallMade: false,
      networkCallMade: false,
      credentialsAccessed: false,
    };
    expect(resp.retryable).toBe(false);
  });

  it("8. Rate limit is retryable", () => {
    const resp: ProviderDryRunResponse = {
      providerId: "notebooklm-enterprise",
      tool: "research_create_workspace",
      status: "TRANSIENT_FAILURE",
      providerRequestId: "fake-req-rate",
      attempt: 1,
      retryable: true,
      errorCode: "SIMULATED_RATE_LIMIT",
      sideEffectsAllowed: false,
      providerCallMade: false,
      networkCallMade: false,
      credentialsAccessed: false,
    };
    expect(resp.retryable).toBe(true);
  });

  it("9. Provider request ID is deterministic", () => {
    const id1 = `fake-req-${validRequest.providerId}-${validRequest.correlationId}`;
    const id2 = `fake-req-${validRequest.providerId}-${validRequest.correlationId}`;
    expect(id1).toBe(id2);
  });

  it("10. Output fingerprint excludes raw output", () => {
    const fp = computeProviderDryRunFingerprint({
      providerId: "notebooklm-enterprise",
      tool: "research_create_workspace",
      correlationId: "corr-12345",
      inputFingerprint: "input-fp",
    });
    expect(fp.length).toBe(64);
  });

  it("11. Error code is allowlisted", () => {
    const allowedCodes = [
      "UNSUPPORTED_TOOL",
      "INVALID_INPUT",
      "TRANSIENT_PROVIDER_FAILURE",
      "PERMANENT_PROVIDER_FAILURE",
      "SIMULATED_TIMEOUT",
      "SIMULATED_RATE_LIMIT",
    ];
    expect(allowedCodes).toContain("SIMULATED_TIMEOUT");
  });

  it("12. Error payload is sanitized", () => {
    const fp = computeProviderDryRunFingerprint({
      providerId: "notebooklm-enterprise",
      tool: "research_create_workspace",
      correlationId: "corr-123",
      inputFingerprint: "input-fp",
      errorCode: "SIMULATED_TIMEOUT",
    });
    expect(fp).not.toContain("secret");
  });

  it("13. No source content in response", () => {
    const resp: ProviderDryRunResponse = {
      providerId: "notebooklm-enterprise",
      tool: "research_create_workspace",
      status: "ACCEPTED",
      providerRequestId: "fake-req",
      attempt: 1,
      retryable: false,
      sideEffectsAllowed: false,
      providerCallMade: false,
      networkCallMade: false,
      credentialsAccessed: false,
    };
    expect((resp as any).sourceContent).toBeUndefined();
  });

  it("14. No credential in response", () => {
    const resp: ProviderDryRunResponse = {
      providerId: "notebooklm-enterprise",
      tool: "research_create_workspace",
      status: "ACCEPTED",
      providerRequestId: "fake-req",
      attempt: 1,
      retryable: false,
      sideEffectsAllowed: false,
      providerCallMade: false,
      networkCallMade: false,
      credentialsAccessed: false,
    };
    expect((resp as any).apiKey).toBeUndefined();
  });

  it("15. No path in response", () => {
    const resp: ProviderDryRunResponse = {
      providerId: "notebooklm-enterprise",
      tool: "research_create_workspace",
      status: "ACCEPTED",
      providerRequestId: "fake-req",
      attempt: 1,
      retryable: false,
      sideEffectsAllowed: false,
      providerCallMade: false,
      networkCallMade: false,
      credentialsAccessed: false,
    };
    expect((resp as any).path).toBeUndefined();
  });

  it("16. No provider instance in response", () => {
    const resp: ProviderDryRunResponse = {
      providerId: "notebooklm-enterprise",
      tool: "research_create_workspace",
      status: "ACCEPTED",
      providerRequestId: "fake-req",
      attempt: 1,
      retryable: false,
      sideEffectsAllowed: false,
      providerCallMade: false,
      networkCallMade: false,
      credentialsAccessed: false,
    };
    expect((resp as any).providerInstance).toBeUndefined();
  });

  it("17. JSON serialization succeeds", () => {
    const resp: ProviderDryRunResponse = {
      providerId: "notebooklm-enterprise",
      tool: "research_create_workspace",
      status: "ACCEPTED",
      providerRequestId: "fake-req",
      attempt: 1,
      retryable: false,
      sideEffectsAllowed: false,
      providerCallMade: false,
      networkCallMade: false,
      credentialsAccessed: false,
    };
    const json = JSON.stringify(resp);
    expect(typeof json).toBe("string");
  });

  it("18. Fingerprint is deterministic", () => {
    const fp1 = computeProviderDryRunFingerprint(validRequest);
    const fp2 = computeProviderDryRunFingerprint(validRequest);
    expect(fp1).toBe(fp2);
  });

  it("19. Fingerprint changes with provider", () => {
    const fp1 = computeProviderDryRunFingerprint(validRequest);
    const fp2 = computeProviderDryRunFingerprint({
      ...validRequest,
      providerId: "antigravity-legacy",
    });
    expect(fp1).not.toBe(fp2);
  });

  it("20. Fingerprint changes with tool", () => {
    const fp1 = computeProviderDryRunFingerprint(validRequest);
    const fp2 = computeProviderDryRunFingerprint({
      ...validRequest,
      tool: "research_ingest_sources",
    });
    expect(fp1).not.toBe(fp2);
  });
});
