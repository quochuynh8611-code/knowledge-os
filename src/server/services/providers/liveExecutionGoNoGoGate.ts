import {
  LiveExecutionEligibilityReport,
  LiveExecutionDenialReason,
  computeEligibilityFingerprint,
} from "./liveExecutionEligibility";

export type LiveExecutionGoNoGoDecisionType =
  | "GO_STAGING_REVIEW_ONLY"
  | "NO_GO_DENIED"
  | "NO_GO_BLOCKED";

export interface LiveExecutionGoNoGoGateInput {
  readonly report: LiveExecutionEligibilityReport;
  readonly evaluatedAt?: string;
}

export interface LiveExecutionGoNoGoDecision {
  readonly decision: LiveExecutionGoNoGoDecisionType;
  readonly environment: "local" | "staging" | "production";
  readonly reasons: readonly LiveExecutionDenialReason[];
  readonly realExecutionAllowed: false;
  readonly controlledExecutionEnabled: false;
  readonly killSwitchActive: true;
  readonly networkAllowed: false;
  readonly credentialsAllowed: false;
  readonly childProcessAllowed: false;
  readonly sideEffectsAllowed: false;
  readonly requiresManualOperatorAction: true;
  readonly reportFingerprint: string;
  readonly evaluatedAt: string;
}

/**
 * Evaluates the Live Execution Go/No-Go Gate fail-closed.
 * Guarantees:
 * - Production is unconditionally NO_GO_DENIED.
 * - Missing prerequisites or corrupted/tampered reports yield NO_GO_BLOCKED.
 * - Staging with 100% verified prerequisites yields GO_STAGING_REVIEW_ONLY.
 * - Under NO circumstances is realExecutionAllowed set to true in Phase 6.8.
 */
export function evaluateLiveExecutionGoNoGoGate(
  input: LiveExecutionGoNoGoGateInput
): LiveExecutionGoNoGoDecision {
  const { report, evaluatedAt = input.evaluatedAt || "2026-09-25T10:00:00.000Z" } = input;

  // 1. Verify report structure and tamper evidence
  const canonicalPayload = {
    reportVersion: report.reportVersion,
    generatedAt: report.generatedAt,
    environment: report.environment,
    status: report.status,
    reasons: [...report.reasons].sort(),
    prerequisitesSatisfied: [...report.prerequisitesSatisfied].sort(),
    prerequisitesMissing: [...report.prerequisitesMissing].sort(),
    realExecutionAllowed: false,
    controlledExecutionEnabled: false,
    killSwitchActive: true,
    networkAllowed: false,
    credentialsAllowed: false,
    childProcessAllowed: false,
    sideEffectsAllowed: false,
    requiresHumanApproval: true,
    eligibleForFutureStagingReview: report.eligibleForFutureStagingReview,
    productionAlwaysDenied: true,
  };

  const expectedFingerprint = computeEligibilityFingerprint(canonicalPayload);
  const isFingerprintValid =
    typeof report.fingerprint === "string" &&
    report.fingerprint.length === 64 &&
    report.fingerprint === expectedFingerprint;

  if (!isFingerprintValid || report.reportVersion !== "6.8.0") {
    return Object.freeze({
      decision: "NO_GO_BLOCKED",
      environment: report.environment || "local",
      reasons: Object.freeze(["UNKNOWN_RISK" as LiveExecutionDenialReason]),
      realExecutionAllowed: false,
      controlledExecutionEnabled: false,
      killSwitchActive: true,
      networkAllowed: false,
      credentialsAllowed: false,
      childProcessAllowed: false,
      sideEffectsAllowed: false,
      requiresManualOperatorAction: true,
      reportFingerprint: report.fingerprint || "invalid",
      evaluatedAt,
    });
  }

  // 2. Production check
  if (report.environment === "production" || report.status === "DENY") {
    const reasons: readonly LiveExecutionDenialReason[] =
      report.reasons.length > 0
        ? report.reasons
        : (["PRODUCTION_ENVIRONMENT"] as const);
    return Object.freeze({
      decision: "NO_GO_DENIED",
      environment: report.environment,
      reasons: Object.freeze(reasons),
      realExecutionAllowed: false,
      controlledExecutionEnabled: false,
      killSwitchActive: true,
      networkAllowed: false,
      credentialsAllowed: false,
      childProcessAllowed: false,
      sideEffectsAllowed: false,
      requiresManualOperatorAction: true,
      reportFingerprint: report.fingerprint,
      evaluatedAt,
    });
  }

  // 3. Staging and prerequisites check
  if (
    report.environment === "staging" &&
    report.status === "ELIGIBLE_FOR_FUTURE_STAGING_REVIEW" &&
    report.reasons.length === 0 &&
    report.prerequisitesMissing.length === 0 &&
    report.eligibleForFutureStagingReview === true
  ) {
    return Object.freeze({
      decision: "GO_STAGING_REVIEW_ONLY",
      environment: "staging",
      reasons: Object.freeze([] as readonly LiveExecutionDenialReason[]),
      realExecutionAllowed: false,
      controlledExecutionEnabled: false,
      killSwitchActive: true,
      networkAllowed: false,
      credentialsAllowed: false,
      childProcessAllowed: false,
      sideEffectsAllowed: false,
      requiresManualOperatorAction: true,
      reportFingerprint: report.fingerprint,
      evaluatedAt,
    });
  }

  // 4. Default fail-closed
  const fallbackReasons: readonly LiveExecutionDenialReason[] =
    report.reasons.length > 0
      ? report.reasons
      : (["UNKNOWN_RISK"] as const);
  return Object.freeze({
    decision: "NO_GO_BLOCKED",
    environment: report.environment,
    reasons: Object.freeze(fallbackReasons),
    realExecutionAllowed: false,
    controlledExecutionEnabled: false,
    killSwitchActive: true,
    networkAllowed: false,
    credentialsAllowed: false,
    childProcessAllowed: false,
    sideEffectsAllowed: false,
    requiresManualOperatorAction: true,
    reportFingerprint: report.fingerprint,
    evaluatedAt,
  });
}
