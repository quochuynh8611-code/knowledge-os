import { createHash } from "crypto";

export type LiveExecutionEligibilityStatus =
  | "ELIGIBLE_FOR_FUTURE_STAGING_REVIEW"
  | "DENY"
  | "BLOCKED";

export type LiveExecutionDenialReason =
  | "PRODUCTION_ENVIRONMENT"
  | "CONTROLLED_TOGGLE_DISABLED"
  | "KILL_SWITCH_ACTIVE"
  | "MISSING_OPERATOR_SIGNOFF"
  | "MISSING_READINESS_REPORT"
  | "MISSING_PREFLIGHT_BUNDLE"
  | "MISSING_ROLLBACK_REHEARSAL"
  | "MISSING_SECRET_STRATEGY"
  | "MISSING_NETWORK_STRATEGY"
  | "MISSING_PROVIDER_SANDBOX_PROOF"
  | "MISSING_REGRESSION_EVIDENCE"
  | "MISSING_BOUNDARY_AUDIT"
  | "MISSING_RELEASE_FREEZE"
  | "UNVERIFIED_RUNTIME_COMPOSITION"
  | "UNKNOWN_RISK";

export interface OperatorSignoffEvidence {
  readonly status: "PASS" | "FAIL";
  readonly signoffId: string;
  readonly operatorId: string;
  readonly decision: "ACKNOWLEDGED_FOR_MANUAL_REVIEW";
  readonly bundleFingerprint: string;
  readonly signedAt: string;
  readonly expiresAt: string;
}

export interface ReadinessReportEvidence {
  readonly status: "PASS" | "FAIL";
  readonly overallStatus: "READY" | "BLOCKED" | "FAILED";
  readonly reportFingerprint: string;
}

export interface PreflightBundleEvidence {
  readonly status: "PASS" | "FAIL";
  readonly bundleId: string;
  readonly bundleFingerprint: string;
  readonly complete: boolean;
}

export interface RollbackRehearsalEvidence {
  readonly status: "PASS" | "FAIL";
  readonly passed: boolean;
  readonly stepsCompleted: number;
}

export interface SecretStrategyEvidence {
  readonly status: "PASS" | "FAIL";
  readonly sanitizerVerified: boolean;
  readonly zeroSecretsInReports: boolean;
}

export interface NetworkStrategyEvidence {
  readonly status: "PASS" | "FAIL";
  readonly networkDeniedByDefault: boolean;
  readonly zeroDirectSockets: boolean;
}

export interface ProviderSandboxProofEvidence {
  readonly status: "PASS" | "FAIL";
  readonly sandboxEnvironment: "staging" | "test";
  readonly fakeTransportVerified: boolean;
  readonly zeroLiveProviderCalls: boolean;
}

export interface RegressionEvidence {
  readonly status: "PASS" | "FAIL";
  readonly totalTests: number;
  readonly passedTests: number;
  readonly failedTests: number;
}

export interface BoundaryAuditEvidence {
  readonly status: "PASS" | "FAIL";
  readonly zeroAnyTypes: boolean;
  readonly zeroLiveImports: boolean;
}

export interface ReleaseFreezeEvidence {
  readonly status: "PASS" | "FAIL";
  readonly releaseFrozen: boolean;
  readonly freezeVersion: string;
}

export interface RuntimeCompositionEvidence {
  readonly status: "PASS" | "FAIL";
  readonly compositionVerified: boolean;
  readonly zeroBypassDetected: boolean;
}

export interface LiveExecutionPrerequisitesMap {
  readonly operatorSignoff?: OperatorSignoffEvidence;
  readonly readinessReport?: ReadinessReportEvidence;
  readonly preflightBundle?: PreflightBundleEvidence;
  readonly rollbackRehearsal?: RollbackRehearsalEvidence;
  readonly secretStrategy?: SecretStrategyEvidence;
  readonly networkStrategy?: NetworkStrategyEvidence;
  readonly providerSandboxProof?: ProviderSandboxProofEvidence;
  readonly regressionEvidence?: RegressionEvidence;
  readonly boundaryAudit?: BoundaryAuditEvidence;
  readonly releaseFreeze?: ReleaseFreezeEvidence;
  readonly runtimeComposition?: RuntimeCompositionEvidence;
}

export interface LiveExecutionEvidenceInput {
  readonly environment: "local" | "staging" | "production";
  readonly generatedAt?: string;
  readonly evidence: LiveExecutionPrerequisitesMap;
  readonly toggleState?: {
    readonly enabled: boolean;
    readonly realExecutionAllowed?: boolean;
  };
  readonly killSwitchState?: {
    readonly active: boolean;
  };
}

export type LiveExecutionEligibilityReport = {
  readonly reportVersion: "6.8.0";
  readonly generatedAt: string;
  readonly environment: "local" | "staging" | "production";
  readonly status: LiveExecutionEligibilityStatus;
  readonly reasons: readonly LiveExecutionDenialReason[];
  readonly prerequisitesSatisfied: readonly string[];
  readonly prerequisitesMissing: readonly string[];
  readonly realExecutionAllowed: false;
  readonly controlledExecutionEnabled: false;
  readonly killSwitchActive: true;
  readonly networkAllowed: false;
  readonly credentialsAllowed: false;
  readonly childProcessAllowed: false;
  readonly sideEffectsAllowed: false;
  readonly requiresHumanApproval: true;
  readonly eligibleForFutureStagingReview: boolean;
  readonly productionAlwaysDenied: true;
  readonly fingerprint: string;
};

export function computeEligibilityFingerprint(payload: Record<string, unknown>): string {
  const sortedKeys = Object.keys(payload).sort();
  const canonical: Record<string, unknown> = {};
  for (const k of sortedKeys) {
    canonical[k] = payload[k];
  }
  return createHash("sha256").update(JSON.stringify(canonical), "utf8").digest("hex");
}

export function evaluateLiveExecutionEligibility(
  input: LiveExecutionEvidenceInput
): LiveExecutionEligibilityReport {
  const generatedAt = input.generatedAt || new Date().toISOString();
  const environment = input.environment;
  const reasons: LiveExecutionDenialReason[] = [];
  const prerequisitesSatisfied: string[] = [];
  const prerequisitesMissing: string[] = [];

  // 1. Environment check: Production is ALWAYS denied
  if (environment === "production") {
    reasons.push("PRODUCTION_ENVIRONMENT");
  }

  // 2. Kill switch check: Must be active
  if (input.killSwitchState && input.killSwitchState.active === false) {
    reasons.push("KILL_SWITCH_ACTIVE");
  }

  // 3. Controlled execution toggle check: Must be disabled in Phase 6.8
  if (input.toggleState && (input.toggleState.enabled === true || input.toggleState.realExecutionAllowed === true)) {
    reasons.push("CONTROLLED_TOGGLE_DISABLED");
  }

  // 4. Evaluate individual prerequisite evidence items
  const evidence = input.evidence || {};

  // Operator signoff
  if (
    evidence.operatorSignoff &&
    evidence.operatorSignoff.status === "PASS" &&
    evidence.operatorSignoff.decision === "ACKNOWLEDGED_FOR_MANUAL_REVIEW"
  ) {
    prerequisitesSatisfied.push("OPERATOR_SIGNOFF");
  } else {
    prerequisitesMissing.push("OPERATOR_SIGNOFF");
    reasons.push("MISSING_OPERATOR_SIGNOFF");
  }

  // Readiness report
  if (
    evidence.readinessReport &&
    evidence.readinessReport.status === "PASS" &&
    evidence.readinessReport.overallStatus === "READY"
  ) {
    prerequisitesSatisfied.push("READINESS_REPORT");
  } else {
    prerequisitesMissing.push("READINESS_REPORT");
    reasons.push("MISSING_READINESS_REPORT");
  }

  // Preflight bundle
  if (
    evidence.preflightBundle &&
    evidence.preflightBundle.status === "PASS" &&
    evidence.preflightBundle.complete === true
  ) {
    prerequisitesSatisfied.push("PREFLIGHT_BUNDLE");
  } else {
    prerequisitesMissing.push("PREFLIGHT_BUNDLE");
    reasons.push("MISSING_PREFLIGHT_BUNDLE");
  }

  // Rollback rehearsal
  if (
    evidence.rollbackRehearsal &&
    evidence.rollbackRehearsal.status === "PASS" &&
    evidence.rollbackRehearsal.passed === true &&
    evidence.rollbackRehearsal.stepsCompleted >= 7
  ) {
    prerequisitesSatisfied.push("ROLLBACK_REHEARSAL");
  } else {
    prerequisitesMissing.push("ROLLBACK_REHEARSAL");
    reasons.push("MISSING_ROLLBACK_REHEARSAL");
  }

  // Secret safety strategy
  if (
    evidence.secretStrategy &&
    evidence.secretStrategy.status === "PASS" &&
    evidence.secretStrategy.sanitizerVerified === true &&
    evidence.secretStrategy.zeroSecretsInReports === true
  ) {
    prerequisitesSatisfied.push("SECRET_STRATEGY");
  } else {
    prerequisitesMissing.push("SECRET_STRATEGY");
    reasons.push("MISSING_SECRET_STRATEGY");
  }

  // Network safety strategy
  if (
    evidence.networkStrategy &&
    evidence.networkStrategy.status === "PASS" &&
    evidence.networkStrategy.networkDeniedByDefault === true &&
    evidence.networkStrategy.zeroDirectSockets === true
  ) {
    prerequisitesSatisfied.push("NETWORK_STRATEGY");
  } else {
    prerequisitesMissing.push("NETWORK_STRATEGY");
    reasons.push("MISSING_NETWORK_STRATEGY");
  }

  // Provider sandbox proof
  if (
    evidence.providerSandboxProof &&
    evidence.providerSandboxProof.status === "PASS" &&
    evidence.providerSandboxProof.fakeTransportVerified === true &&
    evidence.providerSandboxProof.zeroLiveProviderCalls === true
  ) {
    prerequisitesSatisfied.push("PROVIDER_SANDBOX_PROOF");
  } else {
    prerequisitesMissing.push("PROVIDER_SANDBOX_PROOF");
    reasons.push("MISSING_PROVIDER_SANDBOX_PROOF");
  }

  // Regression evidence
  if (
    evidence.regressionEvidence &&
    evidence.regressionEvidence.status === "PASS" &&
    evidence.regressionEvidence.failedTests === 0 &&
    evidence.regressionEvidence.passedTests > 0
  ) {
    prerequisitesSatisfied.push("REGRESSION_EVIDENCE");
  } else {
    prerequisitesMissing.push("REGRESSION_EVIDENCE");
    reasons.push("MISSING_REGRESSION_EVIDENCE");
  }

  // Boundary audit
  if (
    evidence.boundaryAudit &&
    evidence.boundaryAudit.status === "PASS" &&
    evidence.boundaryAudit.zeroAnyTypes === true &&
    evidence.boundaryAudit.zeroLiveImports === true
  ) {
    prerequisitesSatisfied.push("BOUNDARY_AUDIT");
  } else {
    prerequisitesMissing.push("BOUNDARY_AUDIT");
    reasons.push("MISSING_BOUNDARY_AUDIT");
  }

  // Release freeze
  if (
    evidence.releaseFreeze &&
    evidence.releaseFreeze.status === "PASS" &&
    evidence.releaseFreeze.releaseFrozen === true
  ) {
    prerequisitesSatisfied.push("RELEASE_FREEZE");
  } else {
    prerequisitesMissing.push("RELEASE_FREEZE");
    reasons.push("MISSING_RELEASE_FREEZE");
  }

  // Runtime composition
  if (
    evidence.runtimeComposition &&
    evidence.runtimeComposition.status === "PASS" &&
    evidence.runtimeComposition.compositionVerified === true &&
    evidence.runtimeComposition.zeroBypassDetected === true
  ) {
    prerequisitesSatisfied.push("RUNTIME_COMPOSITION_VERIFIED");
  } else {
    prerequisitesMissing.push("RUNTIME_COMPOSITION_VERIFIED");
    reasons.push("UNVERIFIED_RUNTIME_COMPOSITION");
  }

  // Determine Overall Status
  let status: LiveExecutionEligibilityStatus;
  let eligibleForFutureStagingReview = false;

  if (environment === "production") {
    status = "DENY";
    eligibleForFutureStagingReview = false;
  } else if (environment === "staging" && reasons.length === 0 && prerequisitesMissing.length === 0) {
    status = "ELIGIBLE_FOR_FUTURE_STAGING_REVIEW";
    eligibleForFutureStagingReview = true;
  } else {
    status = "BLOCKED";
    eligibleForFutureStagingReview = false;
  }

  const canonicalPayload = {
    reportVersion: "6.8.0",
    generatedAt,
    environment,
    status,
    reasons: [...reasons].sort(),
    prerequisitesSatisfied: [...prerequisitesSatisfied].sort(),
    prerequisitesMissing: [...prerequisitesMissing].sort(),
    realExecutionAllowed: false,
    controlledExecutionEnabled: false,
    killSwitchActive: true,
    networkAllowed: false,
    credentialsAllowed: false,
    childProcessAllowed: false,
    sideEffectsAllowed: false,
    requiresHumanApproval: true,
    eligibleForFutureStagingReview,
    productionAlwaysDenied: true,
  };

  const fingerprint = computeEligibilityFingerprint(canonicalPayload);

  return Object.freeze({
    reportVersion: "6.8.0",
    generatedAt,
    environment,
    status,
    reasons: Object.freeze(Array.from(new Set(reasons))),
    prerequisitesSatisfied: Object.freeze(prerequisitesSatisfied),
    prerequisitesMissing: Object.freeze(prerequisitesMissing),
    realExecutionAllowed: false,
    controlledExecutionEnabled: false,
    killSwitchActive: true,
    networkAllowed: false,
    credentialsAllowed: false,
    childProcessAllowed: false,
    sideEffectsAllowed: false,
    requiresHumanApproval: true,
    eligibleForFutureStagingReview,
    productionAlwaysDenied: true,
    fingerprint,
  });
}
