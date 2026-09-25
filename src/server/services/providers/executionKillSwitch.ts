/**
 * Execution Kill Switch (Phase 6.4)
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * - Fail-closed safety barrier: default state is always ACTIVE.
 * - Active kill-switch strictly denies all manual enablement and real execution attempts.
 * - Zero global mutable singletons, zero process.env mutation, zero child processes.
 * - Pure, deterministic validation and fingerprinting.
 */

import { createHash } from "node:crypto";
import { sanitizeProviderErrorMessage } from "./errors.js";

export type ExecutionKillSwitchSource = "default" | "manual" | "system";

export type ExecutionKillSwitchState = {
  readonly active: boolean;
  readonly reason: string;
  readonly activatedAt?: string;
  readonly activatedBy?: string;
  readonly source: ExecutionKillSwitchSource;
  readonly fingerprint: string;
};

/**
 * Computes a deterministic SHA-256 fingerprint for a kill-switch state.
 */
export function computeKillSwitchFingerprint(state: {
  readonly active: boolean;
  readonly reason: string;
  readonly activatedAt?: string;
  readonly activatedBy?: string;
  readonly source: ExecutionKillSwitchSource;
}): string {
  const canonical = JSON.stringify({
    activatedAt: state.activatedAt?.trim() ?? "",
    activatedBy: state.activatedBy?.trim() ?? "",
    active: Boolean(state.active),
    reason: state.reason.trim(),
    source: state.source.trim(),
  });
  return createHash("sha256").update(canonical).digest("hex");
}

export const DEFAULT_KILL_SWITCH: Readonly<ExecutionKillSwitchState> = Object.freeze({
  active: true,
  reason: "Real execution is disabled in Phase 6.4.",
  source: "default",
  fingerprint: computeKillSwitchFingerprint({
    active: true,
    reason: "Real execution is disabled in Phase 6.4.",
    source: "default",
  }),
});

export type KillSwitchValidationResult = {
  readonly valid: boolean;
  readonly errors: readonly string[];
};

/**
 * Validates an ExecutionKillSwitchState structure and its constraints.
 */
export function validateKillSwitch(state: unknown): KillSwitchValidationResult {
  const errors: string[] = [];

  if (!state || typeof state !== "object") {
    return { valid: false, errors: ["Kill switch state must be a non-null object."] };
  }

  const s = state as Record<string, unknown>;

  if (typeof s.active !== "boolean") {
    errors.push("active must be a boolean.");
  }

  if (typeof s.reason !== "string" || !s.reason.trim()) {
    errors.push("reason must be a non-empty string.");
  }

  const validSources: ExecutionKillSwitchSource[] = ["default", "manual", "system"];
  if (!validSources.includes(s.source as ExecutionKillSwitchSource)) {
    errors.push(`source must be one of: ${validSources.join(", ")}.`);
  }

  if (s.source === "manual") {
    if (typeof s.activatedBy !== "string" || !s.activatedBy.trim()) {
      errors.push("Manual kill switch requires an explicit activatedBy actor.");
    }
    if (typeof s.activatedAt !== "string" || isNaN(Date.parse(s.activatedAt))) {
      errors.push("Manual kill switch requires a valid ISO activatedAt timestamp.");
    }
  }

  if (s.source === "system") {
    if (typeof s.activatedAt !== "string" || isNaN(Date.parse(s.activatedAt))) {
      errors.push("System kill switch requires a valid ISO activatedAt timestamp.");
    }
  }

  if (typeof s.fingerprint !== "string" || !s.fingerprint.trim()) {
    errors.push("fingerprint must be a non-empty string.");
  } else if (errors.length === 0) {
    const expected = computeKillSwitchFingerprint(s as unknown as ExecutionKillSwitchState);
    if (s.fingerprint.trim() !== expected) {
      errors.push("Kill switch fingerprint does not match canonical payload hash.");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
