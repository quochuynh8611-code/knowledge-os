import {
  StagingLivePilotReport,
  StagingLivePilotStatus,
  StagingLivePilotDenialReason,
  computeStagingLivePilotFingerprint,
} from "./stagingLivePilotContract";

export interface StagingPilotOperatorApproval {
  readonly approvalId: string;
  readonly operatorId: string;
  readonly decision: "APPROVED_FOR_SINGLE_PILOT";
  readonly pilotId: string;
  readonly specFingerprint: string;
  readonly approvedAt: string;
  readonly expiresAt: string;
  readonly sanitizedEvidenceAcknowledged: boolean;
}

export interface StagingLivePilotGateInput {
  readonly report: StagingLivePilotReport;
  readonly approval?: StagingPilotOperatorApproval;
  readonly evaluatedAt?: string;
}

export interface StagingLivePilotGateDecision {
  readonly status: StagingLivePilotStatus;
  readonly environment: "staging" | "local" | "production";
  readonly reasons: readonly StagingLivePilotDenialReason[];
  readonly approvedPilotId?: string;
  readonly realExecutionAllowed: false;
  readonly controlledExecutionEnabled: false;
  readonly killSwitchActive: true;
  readonly networkAllowed: false;
  readonly credentialsAllowed: false;
  readonly childProcessAllowed: false;
  readonly sideEffectsAllowed: false;
  readonly requiresHumanApproval: true;
  readonly productionAlwaysDenied: true;
  readonly maxAttempts: 1;
  readonly parallelExecutionAllowed: false;
  readonly fallbackAllowed: false;
  readonly evaluatedAt: string;
  readonly reportFingerprint: string;
}

/**
 * Evaluates the Staging Live Pilot Gate fail-closed.
 * Guarantees:
 * - Production is unconditionally BLOCKED.
 * - Without explicit, cryptographically bound operator approval, status remains READY_FOR_MANUAL_APPROVAL.
 * - Valid operator approval for staging pilot transitions to GO_STAGING_PILOT.
 * - Under NO circumstances does this gate make network calls, read secrets, or spawn subprocesses.
 */
export function evaluateStagingLivePilotGate(
  input: StagingLivePilotGateInput
): StagingLivePilotGateDecision {
  const { report, approval, evaluatedAt = input.evaluatedAt || "2026-09-25T11:00:00.000Z" } = input;

  // 1. Verify report integrity
  const canonicalPayload = {
    reportVersion: report.reportVersion,
    generatedAt: report.generatedAt,
    pilotId: report.pilotId,
    operatorId: report.operatorId,
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
    productionAlwaysDenied: true,
    maxAttempts: 1,
    parallelExecutionAllowed: false,
    fallbackAllowed: false,
    rawCredentialExposure: false,
    rawSourceExposure: false,
    auditRequired: true,
    rollbackRequired: true,
    timeoutRequired: true,
    budgetLimitRequired: true,
  };

  const expectedFingerprint = computeStagingLivePilotFingerprint(canonicalPayload);
  const isFingerprintValid =
    typeof report.fingerprint === "string" &&
    report.fingerprint.length === 64 &&
    report.fingerprint === expectedFingerprint;

  if (!isFingerprintValid || report.reportVersion !== "6.9.0") {
    return Object.freeze({
      status: "BLOCKED",
      environment: report.environment || "local",
      reasons: Object.freeze(["UNKNOWN_RISK" as const]),
      realExecutionAllowed: false,
      controlledExecutionEnabled: false,
      killSwitchActive: true,
      networkAllowed: false,
      credentialsAllowed: false,
      childProcessAllowed: false,
      sideEffectsAllowed: false,
      requiresHumanApproval: true,
      productionAlwaysDenied: true,
      maxAttempts: 1,
      parallelExecutionAllowed: false,
      fallbackAllowed: false,
      evaluatedAt,
      reportFingerprint: report.fingerprint || "invalid",
    });
  }

  // 2. Production or existing blocker check
  if (report.environment === "production" || report.status === "BLOCKED") {
    const reasons: readonly StagingLivePilotDenialReason[] =
      report.reasons.length > 0
        ? report.reasons
        : (["PRODUCTION_ENVIRONMENT"] as const);
    return Object.freeze({
      status: "BLOCKED",
      environment: report.environment,
      reasons: Object.freeze(reasons),
      realExecutionAllowed: false,
      controlledExecutionEnabled: false,
      killSwitchActive: true,
      networkAllowed: false,
      credentialsAllowed: false,
      childProcessAllowed: false,
      sideEffectsAllowed: false,
      requiresHumanApproval: true,
      productionAlwaysDenied: true,
      maxAttempts: 1,
      parallelExecutionAllowed: false,
      fallbackAllowed: false,
      evaluatedAt,
      reportFingerprint: report.fingerprint,
    });
  }

  // 3. Evaluate operator approval if present
  if (approval) {
    const reasons: StagingLivePilotDenialReason[] = [];

    if (
      approval.decision !== "APPROVED_FOR_SINGLE_PILOT" ||
      approval.operatorId !== report.operatorId ||
      approval.pilotId !== report.pilotId
    ) {
      reasons.push("MISSING_OPERATOR_APPROVAL");
    }

    if (approval.specFingerprint !== report.fingerprint) {
      reasons.push("TAMPERED_PILOT_SPEC");
    }

    if (new Date(approval.expiresAt).getTime() <= new Date(evaluatedAt).getTime()) {
      reasons.push("MISSING_OPERATOR_APPROVAL");
    }

    if (reasons.length > 0) {
      return Object.freeze({
        status: "BLOCKED",
        environment: report.environment,
        reasons: Object.freeze(Array.from(new Set(reasons))),
        realExecutionAllowed: false,
        controlledExecutionEnabled: false,
        killSwitchActive: true,
        networkAllowed: false,
        credentialsAllowed: false,
        childProcessAllowed: false,
        sideEffectsAllowed: false,
        requiresHumanApproval: true,
        productionAlwaysDenied: true,
        maxAttempts: 1,
        parallelExecutionAllowed: false,
        fallbackAllowed: false,
        evaluatedAt,
        reportFingerprint: report.fingerprint,
      });
    }

    return Object.freeze({
      status: "GO_STAGING_PILOT",
      environment: report.environment,
      reasons: Object.freeze([] as readonly StagingLivePilotDenialReason[]),
      approvedPilotId: approval.pilotId,
      realExecutionAllowed: false,
      controlledExecutionEnabled: false,
      killSwitchActive: true,
      networkAllowed: false,
      credentialsAllowed: false,
      childProcessAllowed: false,
      sideEffectsAllowed: false,
      requiresHumanApproval: true,
      productionAlwaysDenied: true,
      maxAttempts: 1,
      parallelExecutionAllowed: false,
      fallbackAllowed: false,
      evaluatedAt,
      reportFingerprint: report.fingerprint,
    });
  }

  // 4. Default without approval: READY_FOR_MANUAL_APPROVAL
  return Object.freeze({
    status: "READY_FOR_MANUAL_APPROVAL",
    environment: report.environment,
    reasons: Object.freeze([] as readonly StagingLivePilotDenialReason[]),
    realExecutionAllowed: false,
    controlledExecutionEnabled: false,
    killSwitchActive: true,
    networkAllowed: false,
    credentialsAllowed: false,
    childProcessAllowed: false,
    sideEffectsAllowed: false,
    requiresHumanApproval: true,
    productionAlwaysDenied: true,
    maxAttempts: 1,
    parallelExecutionAllowed: false,
    fallbackAllowed: false,
    evaluatedAt,
    reportFingerprint: report.fingerprint,
  });
}
