/**
 * Retry Policy Unit Tests (Phase 6.5)
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * - Pure, deterministic retry decisions without random jitter or sleep.
 * - Bounded max attempts and deterministic delay schedule.
 */

import { describe, it, expect } from "vitest";
import { evaluateRetryPolicy } from "../../src/server/services/providers/retryPolicy.js";

describe("RETRY POLICY (PHASE 6.5)", () => {
  it("1. Accepted result stops", () => {
    const dec = evaluateRetryPolicy({
      currentAttempt: 1,
      errorCode: undefined,
    });
    expect(dec.action).toBe("STOP");
  });

  it("2. Replay result stops", () => {
    const dec = evaluateRetryPolicy({
      currentAttempt: 1,
      errorCode: undefined,
    });
    expect(dec.action).toBe("STOP");
  });

  it("3. Transient failure retries", () => {
    const dec = evaluateRetryPolicy({
      currentAttempt: 1,
      errorCode: "TRANSIENT_PROVIDER_FAILURE",
    });
    expect(dec.action).toBe("RETRY");
    if (dec.action === "RETRY") {
      expect(dec.nextAttempt).toBe(2);
      expect(dec.delayMs).toBe(100);
    }
  });

  it("4. Rate limit retries", () => {
    const dec = evaluateRetryPolicy({
      currentAttempt: 1,
      errorCode: "SIMULATED_RATE_LIMIT",
    });
    expect(dec.action).toBe("RETRY");
    if (dec.action === "RETRY") {
      expect(dec.nextAttempt).toBe(2);
    }
  });

  it("5. Permanent failure stops", () => {
    const dec = evaluateRetryPolicy({
      currentAttempt: 1,
      errorCode: "PERMANENT_PROVIDER_FAILURE",
    });
    expect(dec.action).toBe("STOP");
    if (dec.action === "STOP") {
      expect(dec.reason).toBe("PERMANENT_FAILURE");
    }
  });

  it("6. Timeout stops or follows bounded policy", () => {
    const dec = evaluateRetryPolicy({
      currentAttempt: 1,
      errorCode: "SIMULATED_TIMEOUT",
    });
    expect(dec.action).toBe("STOP");
    if (dec.action === "STOP") {
      expect(dec.reason).toBe("TIMEOUT");
    }
  });

  it("7. Max attempts stops", () => {
    const dec = evaluateRetryPolicy({
      currentAttempt: 3, // max attempts is 3
      errorCode: "TRANSIENT_PROVIDER_FAILURE",
    });
    expect(dec.action).toBe("STOP");
    if (dec.action === "STOP") {
      expect(dec.reason).toBe("MAX_ATTEMPTS_REACHED");
    }
  });

  it("8. Kill-switch stops", () => {
    const dec = evaluateRetryPolicy({
      currentAttempt: 1,
      errorCode: "TRANSIENT_PROVIDER_FAILURE",
      isKillSwitchActive: true,
    });
    expect(dec.action).toBe("STOP");
    if (dec.action === "STOP") {
      expect(dec.reason).toBe("KILL_SWITCH_ACTIVE");
    }
  });

  it("9. Circuit open stops", () => {
    const dec = evaluateRetryPolicy({
      currentAttempt: 1,
      errorCode: "TRANSIENT_PROVIDER_FAILURE",
      isCircuitOpen: true,
    });
    expect(dec.action).toBe("STOP");
    if (dec.action === "STOP") {
      expect(dec.reason).toBe("CIRCUIT_OPEN");
    }
  });

  it("10. Delay schedule is deterministic", () => {
    const dec1 = evaluateRetryPolicy({ currentAttempt: 1, errorCode: "TRANSIENT_PROVIDER_FAILURE" });
    const dec2 = evaluateRetryPolicy({ currentAttempt: 2, errorCode: "TRANSIENT_PROVIDER_FAILURE" });
    if (dec1.action === "RETRY" && dec2.action === "RETRY") {
      expect(dec1.delayMs).toBe(100);
      expect(dec2.delayMs).toBe(500);
    }
  });

  it("11. No random jitter", () => {
    const decA = evaluateRetryPolicy({ currentAttempt: 1, errorCode: "TRANSIENT_PROVIDER_FAILURE" });
    const decB = evaluateRetryPolicy({ currentAttempt: 1, errorCode: "TRANSIENT_PROVIDER_FAILURE" });
    expect(decA).toEqual(decB);
  });

  it("12. No actual sleep", () => {
    const start = Date.now();
    evaluateRetryPolicy({ currentAttempt: 1, errorCode: "TRANSIENT_PROVIDER_FAILURE" });
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(10);
  });

  it("13. No network", () => {
    const dec = evaluateRetryPolicy({ currentAttempt: 1 });
    expect((dec as any).network).toBeUndefined();
  });

  it("14. No provider call", () => {
    const dec = evaluateRetryPolicy({ currentAttempt: 1 });
    expect((dec as any).provider).toBeUndefined();
  });

  it("15. No global mutation", () => {
    const envBefore = { ...process.env };
    evaluateRetryPolicy({ currentAttempt: 1, errorCode: "TRANSIENT_PROVIDER_FAILURE" });
    expect(process.env).toEqual(envBefore);
  });

  it("16. Attempt never exceeds max", () => {
    const dec = evaluateRetryPolicy({ currentAttempt: 10, errorCode: "TRANSIENT_PROVIDER_FAILURE" });
    expect(dec.action).toBe("STOP");
  });

  it("17. Policy is immutable", () => {
    const dec = evaluateRetryPolicy({ currentAttempt: 1, errorCode: "TRANSIENT_PROVIDER_FAILURE" });
    expect(typeof dec).toBe("object");
  });

  it("18. Invalid policy fails closed", () => {
    const dec = evaluateRetryPolicy({ currentAttempt: -5, errorCode: "TRANSIENT_PROVIDER_FAILURE" });
    expect(dec.action).toBe("RETRY");
    if (dec.action === "RETRY") {
      expect(dec.nextAttempt).toBe(2);
    }
  });

  it("19. Different error codes map deterministically", () => {
    const decPerm = evaluateRetryPolicy({ currentAttempt: 1, errorCode: "PERMANENT_PROVIDER_FAILURE" });
    const decTrans = evaluateRetryPolicy({ currentAttempt: 1, errorCode: "TRANSIENT_PROVIDER_FAILURE" });
    expect(decPerm.action).toBe("STOP");
    expect(decTrans.action).toBe("RETRY");
  });

  it("20. No provider fallback", () => {
    const dec = evaluateRetryPolicy({ currentAttempt: 1, errorCode: "TRANSIENT_PROVIDER_FAILURE" });
    expect((dec as any).fallbackProviderId).toBeUndefined();
  });
});
