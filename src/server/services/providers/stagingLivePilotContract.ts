import { createHash } from "crypto";

export type StagingLivePilotStatus =
  | "NOT_READY"
  | "BLOCKED"
  | "READY_FOR_MANUAL_APPROVAL"
  | "GO_STAGING_PILOT"
  | "STOPPED";

export type StagingLivePilotDenialReason =
  | "PRODUCTION_ENVIRONMENT"
  | "MISSING_OPERATOR_APPROVAL"
  | "MISSING_STAGING_ENVIRONMENT"
  | "MISSING_PROVIDER_CAPABILITY_PROOF"
  | "UNAPPROVED_PROVIDER_TARGET"
  | "CONSUMER_NOTEBOOKLM_FORBIDDEN"
  | "REVERSE_ENGINEERED_RPC_FORBIDDEN"
  | "ANTIGRAVITY_HIDDEN_ROUTING_FORBIDDEN"
  | "MISSING_CREDENTIAL_REFERENCE"
  | "RAW_CREDENTIAL_EXPOSURE_DETECTED"
  | "MISSING_SOURCE_SAFETY_PROOF"
  | "SENSITIVE_SOURCE_DETECTED"
  | "MISSING_TIMEOUT"
  | "MISSING_BUDGET_LIMIT"
  | "MISSING_AUDIT_SINK"
  | "MISSING_ROLLBACK_PROOF"
  | "EXCESSIVE_ATTEMPTS_REQUESTED"
  | "PARALLEL_EXECUTION_FORBIDDEN"
  | "FALLBACK_FORBIDDEN"
  | "KILL_SWITCH_ACTIVE_PRE_APPROVAL"
  | "CONTROLLED_TOGGLE_DISABLED_PRE_APPROVAL"
  | "TAMPERED_PILOT_SPEC"
  | "UNKNOWN_RISK";

export interface StagingLivePilotProviderTarget {
  readonly providerId: string;
  readonly providerType: "official" | "legacy" | "experimental";
  readonly verifiedOfficialApi: boolean;
  readonly consumerSessionCookieUsed: boolean;
  readonly reverseEngineeredRpcUsed: boolean;
  readonly antigravityHiddenRoutingUsed: boolean;
}

export interface StagingLivePilotCredentialRef {
  readonly secretRefName: string;
  readonly containsRawSecret: boolean;
}

export interface StagingLivePilotSpec {
  readonly specVersion: "6.9.0";
  readonly pilotId: string;
  readonly operatorId: string;
  readonly environment: "staging" | "local" | "production";
  readonly providerTarget: StagingLivePilotProviderTarget;
  readonly workspaceSlug: string;
  readonly operation: "create_workspace" | "ingest_source" | "reconcile";
  readonly sourceClassification: "TEST_PUBLIC";
  readonly containsSensitiveData: boolean;
  readonly maxAttempts: number;
  readonly allowParallelExecution: boolean;
  readonly allowProviderFallback: boolean;
  readonly timeoutMs: number;
  readonly budgetLimitUnits: number;
  readonly credentialRef: StagingLivePilotCredentialRef;
  readonly auditSinkConfigured: boolean;
  readonly rollbackProofConfigured: boolean;
  readonly targetNotebookLMEnterprise: boolean;
}

export interface StagingLivePilotReport {
  readonly reportVersion: "6.9.0";
  readonly generatedAt: string;
  readonly pilotId: string;
  readonly operatorId: string;
  readonly environment: "staging" | "local" | "production";
  readonly status: StagingLivePilotStatus;
  readonly reasons: readonly StagingLivePilotDenialReason[];
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
  readonly productionAlwaysDenied: true;
  readonly maxAttempts: 1;
  readonly parallelExecutionAllowed: false;
  readonly fallbackAllowed: false;
  readonly rawCredentialExposure: false;
  readonly rawSourceExposure: false;
  readonly auditRequired: true;
  readonly rollbackRequired: true;
  readonly timeoutRequired: true;
  readonly budgetLimitRequired: true;
  readonly fingerprint: string;
}

export function computeStagingLivePilotFingerprint(payload: Record<string, unknown>): string {
  const sortedKeys = Object.keys(payload).sort();
  const canonical: Record<string, unknown> = {};
  for (const k of sortedKeys) {
    canonical[k] = payload[k];
  }
  return createHash("sha256").update(JSON.stringify(canonical), "utf8").digest("hex");
}

export function evaluateStagingLivePilotEligibility(
  spec: StagingLivePilotSpec,
  generatedAt = new Date().toISOString()
): StagingLivePilotReport {
  const reasons: StagingLivePilotDenialReason[] = [];
  const prerequisitesSatisfied: string[] = [];
  const prerequisitesMissing: string[] = [];

  // 1. Environment check
  if (spec.environment === "production") {
    reasons.push("PRODUCTION_ENVIRONMENT");
    prerequisitesMissing.push("STAGING_ENVIRONMENT");
  } else if (spec.environment !== "staging") {
    reasons.push("MISSING_STAGING_ENVIRONMENT");
    prerequisitesMissing.push("STAGING_ENVIRONMENT");
  } else {
    prerequisitesSatisfied.push("STAGING_ENVIRONMENT");
  }

  // 2. Operator check
  if (!spec.operatorId || typeof spec.operatorId !== "string" || spec.operatorId.trim().length === 0) {
    reasons.push("MISSING_OPERATOR_APPROVAL");
    prerequisitesMissing.push("OPERATOR_IDENTIFIED");
  } else {
    prerequisitesSatisfied.push("OPERATOR_IDENTIFIED");
  }

  // 3. Provider Target verification
  if (!spec.providerTarget) {
    reasons.push("MISSING_PROVIDER_CAPABILITY_PROOF");
    prerequisitesMissing.push("OFFICIAL_API_VERIFIED");
  } else {
    if (!spec.providerTarget.verifiedOfficialApi) {
      reasons.push("MISSING_PROVIDER_CAPABILITY_PROOF");
      prerequisitesMissing.push("OFFICIAL_API_VERIFIED");
    } else {
      prerequisitesSatisfied.push("OFFICIAL_API_VERIFIED");
    }

    if (spec.providerTarget.consumerSessionCookieUsed) {
      reasons.push("CONSUMER_NOTEBOOKLM_FORBIDDEN");
    }
    if (spec.providerTarget.reverseEngineeredRpcUsed) {
      reasons.push("REVERSE_ENGINEERED_RPC_FORBIDDEN");
    }
    if (spec.providerTarget.antigravityHiddenRoutingUsed) {
      reasons.push("ANTIGRAVITY_HIDDEN_ROUTING_FORBIDDEN");
    }
  }

  // 4. Credential Reference check
  if (!spec.credentialRef || typeof spec.credentialRef.secretRefName !== "string" || spec.credentialRef.secretRefName.trim().length === 0) {
    reasons.push("MISSING_CREDENTIAL_REFERENCE");
    prerequisitesMissing.push("CREDENTIAL_REFERENCE");
  } else if (spec.credentialRef.containsRawSecret === true) {
    reasons.push("RAW_CREDENTIAL_EXPOSURE_DETECTED");
    prerequisitesMissing.push("CREDENTIAL_REFERENCE");
  } else {
    prerequisitesSatisfied.push("CREDENTIAL_REFERENCE");
  }

  // 5. Source Safety check
  if (spec.sourceClassification !== "TEST_PUBLIC" || spec.containsSensitiveData === true) {
    reasons.push("SENSITIVE_SOURCE_DETECTED");
    prerequisitesMissing.push("SOURCE_SAFETY_PROOF");
  } else {
    prerequisitesSatisfied.push("SOURCE_SAFETY_PROOF");
  }

  // 6. Timeout check
  if (typeof spec.timeoutMs !== "number" || spec.timeoutMs <= 0 || spec.timeoutMs > 60000) {
    reasons.push("MISSING_TIMEOUT");
    prerequisitesMissing.push("TIMEOUT_BOUND");
  } else {
    prerequisitesSatisfied.push("TIMEOUT_BOUND");
  }

  // 7. Budget limit check
  if (typeof spec.budgetLimitUnits !== "number" || spec.budgetLimitUnits <= 0) {
    reasons.push("MISSING_BUDGET_LIMIT");
    prerequisitesMissing.push("BUDGET_LIMIT");
  } else {
    prerequisitesSatisfied.push("BUDGET_LIMIT");
  }

  // 8. Audit sink check
  if (spec.auditSinkConfigured !== true) {
    reasons.push("MISSING_AUDIT_SINK");
    prerequisitesMissing.push("AUDIT_SINK");
  } else {
    prerequisitesSatisfied.push("AUDIT_SINK");
  }

  // 9. Rollback proof check
  if (spec.rollbackProofConfigured !== true) {
    reasons.push("MISSING_ROLLBACK_PROOF");
    prerequisitesMissing.push("ROLLBACK_PROOF");
  } else {
    prerequisitesSatisfied.push("ROLLBACK_PROOF");
  }

  // 10. Attempt constraint
  if (spec.maxAttempts !== 1) {
    reasons.push("EXCESSIVE_ATTEMPTS_REQUESTED");
  }

  // 11. Parallel execution constraint
  if (spec.allowParallelExecution !== false) {
    reasons.push("PARALLEL_EXECUTION_FORBIDDEN");
  }

  // 12. Fallback constraint
  if (spec.allowProviderFallback !== false) {
    reasons.push("FALLBACK_FORBIDDEN");
  }

  // Determine status
  const status: StagingLivePilotStatus =
    reasons.length === 0 && prerequisitesMissing.length === 0
      ? "READY_FOR_MANUAL_APPROVAL"
      : "BLOCKED";

  const canonicalPayload = {
    reportVersion: "6.9.0",
    generatedAt,
    pilotId: spec.pilotId || "unknown-pilot",
    operatorId: spec.operatorId || "unknown-operator",
    environment: spec.environment,
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

  const fingerprint = computeStagingLivePilotFingerprint(canonicalPayload);

  return Object.freeze({
    reportVersion: "6.9.0",
    generatedAt,
    pilotId: spec.pilotId || "unknown-pilot",
    operatorId: spec.operatorId || "unknown-operator",
    environment: spec.environment,
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
    fingerprint,
  });
}
