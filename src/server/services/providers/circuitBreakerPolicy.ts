/**
 * Pure Circuit Breaker Policy (Phase 6.5)
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * - Pure, deterministic state machine with injected clock.
 * - Zero global singletons, zero real timers, zero background daemons.
 * - Immutable snapshots with deterministic fingerprinting.
 */

import { createHash } from "node:crypto";

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export type CircuitBreakerSnapshot = {
  readonly providerId: string;
  readonly state: CircuitState;
  readonly failureCount: number;
  readonly successCount: number;
  readonly openedAt?: string;
  readonly nextProbeAt?: string;
  readonly fingerprint: string;
};

export interface CircuitBreakerConfig {
  readonly failureThreshold: number;
  readonly resetTimeoutMs: number;
}

export const DEFAULT_CIRCUIT_BREAKER_CONFIG: Readonly<CircuitBreakerConfig> = Object.freeze({
  failureThreshold: 3,
  resetTimeoutMs: 30000,
});

/**
 * Computes a deterministic SHA-256 fingerprint for a CircuitBreakerSnapshot.
 */
export function computeCircuitBreakerFingerprint(snapshot: {
  readonly providerId: string;
  readonly state: CircuitState;
  readonly failureCount: number;
  readonly successCount: number;
  readonly openedAt?: string;
  readonly nextProbeAt?: string;
}): string {
  const canonical = JSON.stringify({
    failureCount: snapshot.failureCount,
    nextProbeAt: snapshot.nextProbeAt?.trim() ?? "",
    openedAt: snapshot.openedAt?.trim() ?? "",
    providerId: snapshot.providerId.trim(),
    state: snapshot.state.trim(),
    successCount: snapshot.successCount,
  });
  return createHash("sha256").update(canonical).digest("hex");
}

/**
 * Creates an initial closed circuit breaker snapshot for a provider.
 */
export function createInitialCircuitBreakerSnapshot(
  providerId: string
): CircuitBreakerSnapshot {
  const base = {
    providerId,
    state: "CLOSED" as const,
    failureCount: 0,
    successCount: 0,
  };
  return Object.freeze({
    ...base,
    fingerprint: computeCircuitBreakerFingerprint(base),
  });
}

/**
 * Evaluates whether a request is allowed through the circuit breaker.
 */
export function isCircuitRequestAllowed(
  snapshot: CircuitBreakerSnapshot,
  options?: { readonly now?: () => Date; readonly config?: CircuitBreakerConfig }
): { readonly allowed: boolean; readonly snapshot: CircuitBreakerSnapshot } {
  const now = options?.now ? options.now() : new Date();

  if (snapshot.state === "CLOSED") {
    return { allowed: true, snapshot };
  }

  if (snapshot.state === "OPEN") {
    const nextProbe = snapshot.nextProbeAt ? Date.parse(snapshot.nextProbeAt) : 0;
    if (now.getTime() >= nextProbe) {
      // Transition to HALF_OPEN for probing
      const halfOpenBase = {
        providerId: snapshot.providerId,
        state: "HALF_OPEN" as const,
        failureCount: snapshot.failureCount,
        successCount: 0,
        openedAt: snapshot.openedAt,
        nextProbeAt: snapshot.nextProbeAt,
      };
      const halfOpenSnapshot: CircuitBreakerSnapshot = Object.freeze({
        ...halfOpenBase,
        fingerprint: computeCircuitBreakerFingerprint(halfOpenBase),
      });
      return { allowed: true, snapshot: halfOpenSnapshot };
    }
    return { allowed: false, snapshot };
  }

  // HALF_OPEN: Allow single bounded probe
  return { allowed: true, snapshot };
}

/**
 * Records a successful operation and updates the circuit breaker state.
 */
export function recordCircuitSuccess(
  snapshot: CircuitBreakerSnapshot
): CircuitBreakerSnapshot {
  const base = {
    providerId: snapshot.providerId,
    state: "CLOSED" as const,
    failureCount: 0,
    successCount: snapshot.successCount + 1,
  };
  return Object.freeze({
    ...base,
    fingerprint: computeCircuitBreakerFingerprint(base),
  });
}

/**
 * Records a failure and trips the circuit if the failure threshold is reached.
 */
export function recordCircuitFailure(
  snapshot: CircuitBreakerSnapshot,
  options?: { readonly now?: () => Date; readonly config?: CircuitBreakerConfig }
): CircuitBreakerSnapshot {
  const config = options?.config ?? DEFAULT_CIRCUIT_BREAKER_CONFIG;
  const now = options?.now ? options.now() : new Date();
  const nextFailureCount = snapshot.failureCount + 1;

  if (snapshot.state === "HALF_OPEN" || nextFailureCount >= config.failureThreshold) {
    const openedAtIso = now.toISOString();
    const nextProbeAtIso = new Date(now.getTime() + config.resetTimeoutMs).toISOString();

    const openBase = {
      providerId: snapshot.providerId,
      state: "OPEN" as const,
      failureCount: nextFailureCount,
      successCount: 0,
      openedAt: openedAtIso,
      nextProbeAt: nextProbeAtIso,
    };
    return Object.freeze({
      ...openBase,
      fingerprint: computeCircuitBreakerFingerprint(openBase),
    });
  }

  const closedBase = {
    providerId: snapshot.providerId,
    state: "CLOSED" as const,
    failureCount: nextFailureCount,
    successCount: snapshot.successCount,
  };
  return Object.freeze({
    ...closedBase,
    fingerprint: computeCircuitBreakerFingerprint(closedBase),
  });
}
