/**
 * Pure Retry Policy (Phase 6.5)
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * - Pure, deterministic, side-effect free retry decision logic.
 * - Zero random jitter, zero real sleeping/blocking, zero network.
 * - Fixed max attempts and deterministic delay schedule.
 */

import { ProviderDryRunErrorCode } from "./providerDryRunContract.js";

export type RetryAction = "RETRY" | "STOP";

export type RetryReason =
  | "TRANSIENT_FAILURE"
  | "RATE_LIMITED"
  | "MAX_ATTEMPTS_REACHED"
  | "PERMANENT_FAILURE"
  | "TIMEOUT"
  | "CIRCUIT_OPEN"
  | "KILL_SWITCH_ACTIVE";

export type RetryDecision =
  | {
      readonly action: "RETRY";
      readonly nextAttempt: number;
      readonly delayMs: number;
      readonly reason: "TRANSIENT_FAILURE" | "RATE_LIMITED";
    }
  | {
      readonly action: "STOP";
      readonly nextAttempt: number;
      readonly delayMs: 0;
      readonly reason:
        | "MAX_ATTEMPTS_REACHED"
        | "PERMANENT_FAILURE"
        | "TIMEOUT"
        | "CIRCUIT_OPEN"
        | "KILL_SWITCH_ACTIVE";
    };

export interface RetryPolicyConfig {
  readonly maxAttempts: number;
  readonly delaysMs: readonly number[];
}

export const DEFAULT_RETRY_POLICY_CONFIG: Readonly<RetryPolicyConfig> = Object.freeze({
  maxAttempts: 3,
  delaysMs: Object.freeze([0, 100, 500]),
});

/**
 * Evaluates whether a dry-run failure should be retried.
 */
export function evaluateRetryPolicy(params: {
  readonly currentAttempt: number;
  readonly errorCode?: ProviderDryRunErrorCode;
  readonly isKillSwitchActive?: boolean;
  readonly isCircuitOpen?: boolean;
  readonly config?: RetryPolicyConfig;
}): RetryDecision {
  const config = params.config ?? DEFAULT_RETRY_POLICY_CONFIG;
  const currentAttempt = Math.max(1, params.currentAttempt);

  if (params.isKillSwitchActive) {
    return {
      action: "STOP",
      nextAttempt: currentAttempt,
      delayMs: 0,
      reason: "KILL_SWITCH_ACTIVE",
    };
  }

  if (params.isCircuitOpen) {
    return {
      action: "STOP",
      nextAttempt: currentAttempt,
      delayMs: 0,
      reason: "CIRCUIT_OPEN",
    };
  }

  if (currentAttempt >= config.maxAttempts) {
    return {
      action: "STOP",
      nextAttempt: currentAttempt,
      delayMs: 0,
      reason: "MAX_ATTEMPTS_REACHED",
    };
  }

  if (params.errorCode === "TRANSIENT_PROVIDER_FAILURE") {
    const delayIndex = Math.min(currentAttempt, config.delaysMs.length - 1);
    const delayMs = config.delaysMs[delayIndex] ?? 500;
    return {
      action: "RETRY",
      nextAttempt: currentAttempt + 1,
      delayMs,
      reason: "TRANSIENT_FAILURE",
    };
  }

  if (params.errorCode === "SIMULATED_RATE_LIMIT") {
    const delayIndex = Math.min(currentAttempt, config.delaysMs.length - 1);
    const delayMs = config.delaysMs[delayIndex] ?? 500;
    return {
      action: "RETRY",
      nextAttempt: currentAttempt + 1,
      delayMs,
      reason: "RATE_LIMITED",
    };
  }

  if (params.errorCode === "SIMULATED_TIMEOUT") {
    return {
      action: "STOP",
      nextAttempt: currentAttempt,
      delayMs: 0,
      reason: "TIMEOUT",
    };
  }

  return {
    action: "STOP",
    nextAttempt: currentAttempt,
    delayMs: 0,
    reason: "PERMANENT_FAILURE",
  };
}
