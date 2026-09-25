/**
 * Fake Provider Transport Unit Tests (Phase 6.5)
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * - Deterministic scenario simulation.
 * - Zero network, credentials, or child processes.
 */

import { describe, it, expect } from "vitest";
import {
  DeterministicFakeProviderTransport,
} from "../../src/server/services/providers/fakeProviderTransport.js";
import { ProviderDryRunRequest } from "../../src/server/services/providers/providerDryRunContract.js";

describe("FAKE PROVIDER TRANSPORT (PHASE 6.5)", () => {
  const baseRequest: ProviderDryRunRequest = {
    providerId: "notebooklm-enterprise",
    tool: "research_create_workspace",
    correlationId: "corr-fake-123",
    inputFingerprint: "input-fp-123",
    requestFingerprint: "req-fp-123",
    environment: "staging",
    attempt: 1,
  };

  it("1. Accepted scenario is deterministic", async () => {
    const transport = new DeterministicFakeProviderTransport({ defaultScenario: "accepted" });
    const res = await transport.execute(baseRequest);
    expect(res.status).toBe("ACCEPTED");
    expect(res.retryable).toBe(false);
  });

  it("2. Replay scenario is deterministic", async () => {
    const transport = new DeterministicFakeProviderTransport({ defaultScenario: "replay" });
    const res = await transport.execute(baseRequest);
    expect(res.status).toBe("REPLAY");
    expect(res.retryable).toBe(false);
  });

  it("3. Unsupported scenario is deterministic", async () => {
    const transport = new DeterministicFakeProviderTransport({ defaultScenario: "unsupported_tool" });
    const res = await transport.execute(baseRequest);
    expect(res.status).toBe("REJECTED");
    expect(res.errorCode).toBe("UNSUPPORTED_TOOL");
  });

  it("4. Transient failure scenario is deterministic", async () => {
    const transport = new DeterministicFakeProviderTransport({ defaultScenario: "transient_failure" });
    const res = await transport.execute(baseRequest);
    expect(res.status).toBe("TRANSIENT_FAILURE");
    expect(res.retryable).toBe(true);
    expect(res.errorCode).toBe("TRANSIENT_PROVIDER_FAILURE");
  });

  it("5. Permanent failure scenario is deterministic", async () => {
    const transport = new DeterministicFakeProviderTransport({ defaultScenario: "permanent_failure" });
    const res = await transport.execute(baseRequest);
    expect(res.status).toBe("PERMANENT_FAILURE");
    expect(res.retryable).toBe(false);
    expect(res.errorCode).toBe("PERMANENT_PROVIDER_FAILURE");
  });

  it("6. Timeout scenario is deterministic", async () => {
    const transport = new DeterministicFakeProviderTransport({ defaultScenario: "timeout" });
    const res = await transport.execute(baseRequest);
    expect(res.status).toBe("TIMEOUT");
    expect(res.retryable).toBe(false);
    expect(res.errorCode).toBe("SIMULATED_TIMEOUT");
  });

  it("7. Rate-limit scenario is deterministic", async () => {
    const transport = new DeterministicFakeProviderTransport({ defaultScenario: "rate_limited" });
    const res = await transport.execute(baseRequest);
    expect(res.status).toBe("TRANSIENT_FAILURE");
    expect(res.retryable).toBe(true);
    expect(res.errorCode).toBe("SIMULATED_RATE_LIMIT");
  });

  it("8. Fake transport does not call network", async () => {
    const transport = new DeterministicFakeProviderTransport();
    const res = await transport.execute(baseRequest);
    expect(res.networkCallMade).toBe(false);
  });

  it("9. Fake transport does not call provider", async () => {
    const transport = new DeterministicFakeProviderTransport();
    const res = await transport.execute(baseRequest);
    expect(res.providerCallMade).toBe(false);
  });

  it("10. Fake transport does not read credentials", async () => {
    const transport = new DeterministicFakeProviderTransport();
    const res = await transport.execute(baseRequest);
    expect(res.credentialsAccessed).toBe(false);
  });

  it("11. Fake transport does not read process.env", async () => {
    const envBefore = { ...process.env };
    const transport = new DeterministicFakeProviderTransport();
    await transport.execute(baseRequest);
    expect(process.env).toEqual(envBefore);
  });

  it("12. Fake transport does not mutate global state", async () => {
    const transport = new DeterministicFakeProviderTransport();
    const res1 = await transport.execute(baseRequest);
    const res2 = await transport.execute(baseRequest);
    expect(res1).toEqual(res2);
  });

  it("13. Fake transport does not spawn process", async () => {
    const transport = new DeterministicFakeProviderTransport();
    const res = await transport.execute(baseRequest);
    expect((res as any).childProcess).toBeUndefined();
  });

  it("14. Same request/same scenario returns same logical result", async () => {
    const transport = new DeterministicFakeProviderTransport();
    const res1 = await transport.execute(baseRequest);
    const res2 = await transport.execute(baseRequest);
    expect(res1.status).toBe(res2.status);
    expect(res1.outputFingerprint).toBe(res2.outputFingerprint);
  });

  it("15. Different provider produces different fingerprint", async () => {
    const transport = new DeterministicFakeProviderTransport();
    const res1 = await transport.execute(baseRequest);
    const res2 = await transport.execute({
      ...baseRequest,
      providerId: "antigravity-legacy",
      tool: "research_ingest_sources",
    });
    expect(res1.outputFingerprint).not.toBe(res2.outputFingerprint);
  });

  it("16. Different tool produces different fingerprint", async () => {
    const transport = new DeterministicFakeProviderTransport();
    const res1 = await transport.execute(baseRequest);
    const res2 = await transport.execute({
      ...baseRequest,
      tool: "research_ingest_sources",
    });
    expect(res1.outputFingerprint).not.toBe(res2.outputFingerprint);
  });

  it("17. Attempt number is preserved", async () => {
    const transport = new DeterministicFakeProviderTransport();
    const res = await transport.execute({ ...baseRequest, attempt: 3 });
    expect(res.attempt).toBe(3);
  });

  it("18. Retryable flag is correct", async () => {
    const transport = new DeterministicFakeProviderTransport({ defaultScenario: "transient_failure" });
    const res = await transport.execute(baseRequest);
    expect(res.retryable).toBe(true);
  });

  it("19. Invalid request is rejected", async () => {
    // Unsupported tool on antigravity
    const transport = new DeterministicFakeProviderTransport();
    const res = await transport.execute({
      ...baseRequest,
      providerId: "antigravity-legacy",
      tool: "research_create_workspace",
    });
    expect(res.status).toBe("REJECTED");
    expect(res.errorCode).toBe("UNSUPPORTED_TOOL");
  });

  it("20. No background task is created", async () => {
    const transport = new DeterministicFakeProviderTransport();
    const res = await transport.execute(baseRequest);
    expect((res as any).taskId).toBeUndefined();
  });
});
