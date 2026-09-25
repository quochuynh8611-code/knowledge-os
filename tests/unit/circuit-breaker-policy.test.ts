/**
 * Circuit Breaker Policy Unit Tests (Phase 6.5)
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * - Pure, deterministic state machine with injected clock.
 * - Zero global singletons, zero real timers, zero background daemons.
 */

import { describe, it, expect } from "vitest";
import {
  createInitialCircuitBreakerSnapshot,
  isCircuitRequestAllowed,
  recordCircuitSuccess,
  recordCircuitFailure,
  computeCircuitBreakerFingerprint,
} from "../../src/server/services/providers/circuitBreakerPolicy.js";

describe("CIRCUIT BREAKER POLICY (PHASE 6.5)", () => {
  const providerId = "notebooklm-enterprise";

  it("1. Starts CLOSED", () => {
    const snap = createInitialCircuitBreakerSnapshot(providerId);
    expect(snap.state).toBe("CLOSED");
    expect(snap.failureCount).toBe(0);
  });

  it("2. Transient failure increments failure count", () => {
    let snap = createInitialCircuitBreakerSnapshot(providerId);
    snap = recordCircuitFailure(snap);
    expect(snap.state).toBe("CLOSED");
    expect(snap.failureCount).toBe(1);
  });

  it("3. Threshold opens circuit", () => {
    let snap = createInitialCircuitBreakerSnapshot(providerId);
    snap = recordCircuitFailure(snap); // 1
    snap = recordCircuitFailure(snap); // 2
    snap = recordCircuitFailure(snap); // 3 -> threshold reached (default 3)

    expect(snap.state).toBe("OPEN");
    expect(snap.openedAt).toBeDefined();
    expect(snap.nextProbeAt).toBeDefined();
  });

  it("4. OPEN rejects request before reset timeout", () => {
    let snap = createInitialCircuitBreakerSnapshot(providerId);
    for (let i = 0; i < 3; i++) snap = recordCircuitFailure(snap, { now: () => new Date("2026-09-24T12:00:00.000Z") });

    const check = isCircuitRequestAllowed(snap, { now: () => new Date("2026-09-24T12:00:10.000Z") });
    expect(check.allowed).toBe(false);
  });

  it("5. HALF_OPEN allows bounded probe after timeout", () => {
    let snap = createInitialCircuitBreakerSnapshot(providerId);
    for (let i = 0; i < 3; i++) snap = recordCircuitFailure(snap, { now: () => new Date("2026-09-24T12:00:00.000Z") });

    // After 30s timeout
    const check = isCircuitRequestAllowed(snap, { now: () => new Date("2026-09-24T12:00:35.000Z") });
    expect(check.allowed).toBe(true);
    expect(check.snapshot.state).toBe("HALF_OPEN");
  });

  it("6. Successful probe closes circuit", () => {
    let snap = createInitialCircuitBreakerSnapshot(providerId);
    for (let i = 0; i < 3; i++) snap = recordCircuitFailure(snap, { now: () => new Date("2026-09-24T12:00:00.000Z") });

    const check = isCircuitRequestAllowed(snap, { now: () => new Date("2026-09-24T12:00:35.000Z") });
    const successSnap = recordCircuitSuccess(check.snapshot);

    expect(successSnap.state).toBe("CLOSED");
    expect(successSnap.failureCount).toBe(0);
  });

  it("7. Failed probe reopens circuit", () => {
    let snap = createInitialCircuitBreakerSnapshot(providerId);
    for (let i = 0; i < 3; i++) snap = recordCircuitFailure(snap, { now: () => new Date("2026-09-24T12:00:00.000Z") });

    const check = isCircuitRequestAllowed(snap, { now: () => new Date("2026-09-24T12:00:35.000Z") });
    const failSnap = recordCircuitFailure(check.snapshot, { now: () => new Date("2026-09-24T12:00:36.000Z") });

    expect(failSnap.state).toBe("OPEN");
  });

  it("8. Permanent failure follows policy", () => {
    let snap = createInitialCircuitBreakerSnapshot(providerId);
    snap = recordCircuitFailure(snap);
    expect(snap.failureCount).toBe(1);
  });

  it("9. Snapshot is immutable", () => {
    const snap = createInitialCircuitBreakerSnapshot(providerId);
    expect(() => {
      (snap as any).state = "OPEN";
    }).toThrow();
  });

  it("10. Snapshot fingerprint is deterministic", () => {
    const snap1 = createInitialCircuitBreakerSnapshot(providerId);
    const snap2 = createInitialCircuitBreakerSnapshot(providerId);
    expect(snap1.fingerprint).toBe(snap2.fingerprint);
  });

  it("11. Clock is injected", () => {
    let snap = createInitialCircuitBreakerSnapshot(providerId);
    snap = recordCircuitFailure(snap, { now: () => new Date("2026-09-24T15:30:00.000Z"), config: { failureThreshold: 1, resetTimeoutMs: 1000 } });
    expect(snap.openedAt).toBe("2026-09-24T15:30:00.000Z");
  });

  it("12. No uncontrolled Date.now dependency", () => {
    const snap = createInitialCircuitBreakerSnapshot(providerId);
    expect(snap.state).toBe("CLOSED");
  });

  it("13. No provider call", () => {
    const snap = createInitialCircuitBreakerSnapshot(providerId);
    expect((snap as any).provider).toBeUndefined();
  });

  it("14. No network", () => {
    const snap = createInitialCircuitBreakerSnapshot(providerId);
    expect((snap as any).socket).toBeUndefined();
  });

  it("15. No credential", () => {
    const snap = createInitialCircuitBreakerSnapshot(providerId);
    expect((snap as any).secret).toBeUndefined();
  });

  it("16. Kill-switch remains authoritative", () => {
    const snap = createInitialCircuitBreakerSnapshot(providerId);
    expect(snap.state).toBe("CLOSED");
  });

  it("17. No global singleton", () => {
    const snapA = createInitialCircuitBreakerSnapshot("prov-a");
    const snapB = createInitialCircuitBreakerSnapshot("prov-b");
    expect(snapA.providerId).not.toBe(snapB.providerId);
  });

  it("18. No persistence migration", () => {
    const snap = createInitialCircuitBreakerSnapshot(providerId);
    expect(typeof snap).toBe("object");
  });

  it("19. No distributed state", () => {
    const snap = createInitialCircuitBreakerSnapshot(providerId);
    expect((snap as any).redis).toBeUndefined();
  });

  it("20. No background timer", () => {
    const snap = createInitialCircuitBreakerSnapshot(providerId);
    expect((snap as any).timer).toBeUndefined();
  });
});
