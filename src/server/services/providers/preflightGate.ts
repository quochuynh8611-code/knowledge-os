import {
  OperatorPreflightEvidenceBundle,
  ALL_REQUIRED_EVIDENCE_KINDS,
} from "./operatorPreflightEvidence";
import {
  verifyEvidenceBundleFingerprint,
  EvidenceBundleFingerprintInput,
} from "./evidenceBundleFingerprint";
import { RollbackRehearsalResult } from "./rollbackRehearsal";

export type PreflightGateBlockedReason =
  | "PRODUCTION_FORBIDDEN"
  | "MISSING_EVIDENCE"
  | "FAILED_EVIDENCE"
  | "STALE_EVIDENCE"
  | "INVALID_FINGERPRINT"
  | "SANITIZATION_FAILED"
  | "TOGGLE_ENABLED_UNEXPECTEDLY"
  | "KILL_SWITCH_NOT_ACTIVE"
  | "REAL_EXECUTION_FLAG_SET"
  | "NETWORK_FLAG_SET"
  | "CREDENTIAL_FLAG_SET"
  | "ROLLBACK_REHEARSAL_FAILED";

export type PreflightGateDecision =
  | {
      readonly decision: "READY_FOR_OPERATOR_REVIEW";
      readonly bundleId: string;
      readonly bundleFingerprint: string;
      readonly realExecutionAllowed: false;
      readonly sideEffectsAllowed: false;
    }
  | {
      readonly decision: "BLOCKED";
      readonly reasons: readonly PreflightGateBlockedReason[];
      readonly realExecutionAllowed: false;
      readonly sideEffectsAllowed: false;
    };

export interface EvaluateOperatorPreflightGateInput {
  readonly bundle: OperatorPreflightEvidenceBundle;
  readonly environment?: "test" | "staging" | "production";
  readonly toggleState?: {
    readonly enabled: boolean;
    readonly realExecutionAllowed?: boolean;
  };
  readonly killSwitchState?: {
    readonly active: boolean;
  };
  readonly rollbackRehearsalResult?: RollbackRehearsalResult;
}

/**
 * Evaluates the Operator Preflight Gate fail-closed.
 * Invariant: Returns READY_FOR_OPERATOR_REVIEW only if all evidence, flags, and rehearsals pass.
 * This decision NEVER authorizes live provider execution.
 */
export function evaluateOperatorPreflightGate(
  input: EvaluateOperatorPreflightGateInput
): PreflightGateDecision {
  const reasons: PreflightGateBlockedReason[] = [];
  const { bundle, environment = bundle.environment, toggleState, killSwitchState, rollbackRehearsalResult } = input;

  // 1. Environment check
  if (environment === "production" || (bundle.environment as string) === "production") {
    reasons.push("PRODUCTION_FORBIDDEN");
  }

  // 2. Safety flags checks
  if ((bundle as unknown as { realExecutionAllowed: boolean }).realExecutionAllowed === true) {
    reasons.push("REAL_EXECUTION_FLAG_SET");
  }
  if ((bundle as unknown as { networkAllowed: boolean }).networkAllowed === true) {
    reasons.push("NETWORK_FLAG_SET");
  }
  if ((bundle as unknown as { credentialsAllowed: boolean }).credentialsAllowed === true) {
    reasons.push("CREDENTIAL_FLAG_SET");
  }

  // 3. Controlled Toggle state check (must be disabled)
  if (toggleState) {
    if (toggleState.enabled === true || toggleState.realExecutionAllowed === true) {
      reasons.push("TOGGLE_ENABLED_UNEXPECTEDLY");
    }
  }

  // 4. Kill-Switch state check (must be active)
  if (killSwitchState) {
    if (killSwitchState.active === false) {
      reasons.push("KILL_SWITCH_NOT_ACTIVE");
    }
  }

  // 5. Evidence bundle fingerprint & tamper check
  const fingerprintInput: EvidenceBundleFingerprintInput = {
    bundleVersion: bundle.bundleVersion,
    environment: bundle.environment,
    itemFingerprints: bundle.items.map((i) => i.artifactFingerprint),
    requiredKinds: ALL_REQUIRED_EVIDENCE_KINDS,
    missingKinds: bundle.missingKinds,
    failedKinds: bundle.failedKinds,
    staleKinds: bundle.staleKinds,
    complete: bundle.complete,
  };

  const isFingerprintValid = verifyEvidenceBundleFingerprint(
    fingerprintInput,
    bundle.tamperEvidence?.fingerprint
  );

  if (!isFingerprintValid) {
    reasons.push("INVALID_FINGERPRINT");
  }

  // 6. Completeness and item status checks
  if (!bundle.complete || bundle.missingKinds.length > 0 || bundle.items.length < ALL_REQUIRED_EVIDENCE_KINDS.length) {
    reasons.push("MISSING_EVIDENCE");
  }

  const hasSanitizationFailure = bundle.items.some((i) => i.status === "SANITIZATION_FAILED");
  if (hasSanitizationFailure) {
    reasons.push("SANITIZATION_FAILED");
  }

  if (bundle.failedKinds.length > 0 || bundle.items.some((i) => i.status === "FAIL" || i.status === "INVALID")) {
    if (!reasons.includes("FAILED_EVIDENCE")) {
      reasons.push("FAILED_EVIDENCE");
    }
  }

  if (bundle.staleKinds.length > 0 || bundle.items.some((i) => i.status === "STALE")) {
    reasons.push("STALE_EVIDENCE");
  }

  // 7. Rollback rehearsal check
  if (rollbackRehearsalResult) {
    if (
      !rollbackRehearsalResult.passed ||
      rollbackRehearsalResult.finalToggleEnabled !== false ||
      rollbackRehearsalResult.finalKillSwitchActive !== true ||
      rollbackRehearsalResult.realExecutionAllowed !== false ||
      rollbackRehearsalResult.steps.some((s) => s.status === "FAIL")
    ) {
      reasons.push("ROLLBACK_REHEARSAL_FAILED");
    }
  }

  if (reasons.length > 0) {
    return Object.freeze({
      decision: "BLOCKED",
      reasons: Object.freeze(Array.from(new Set(reasons))),
      realExecutionAllowed: false,
      sideEffectsAllowed: false,
    });
  }

  return Object.freeze({
    decision: "READY_FOR_OPERATOR_REVIEW",
    bundleId: bundle.bundleId,
    bundleFingerprint: bundle.tamperEvidence.fingerprint,
    realExecutionAllowed: false,
    sideEffectsAllowed: false,
  });
}
