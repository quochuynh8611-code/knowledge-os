/**
 * Staging Sandbox Contract (Phase 6.5)
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * - Pure, deterministic, side-effect free contract validation and fingerprinting.
 * - Staging/test environments only; production is strictly rejected.
 * - Zero network, credentials, or live provider handles.
 * - Zero real resources created (createdResources is always empty []).
 */

import { createHash } from "node:crypto";
import { sanitizeProviderErrorMessage } from "./errors.js";

export type SandboxEnvironment = "test" | "staging" | "production";

export type SandboxMode = "dry_run" | "simulation_only";

export type StagingSandboxRequest = {
  readonly requestId: string;
  readonly correlationId: string;
  readonly providerId: "antigravity-legacy" | "notebooklm-enterprise";
  readonly environment: "test" | "staging";
  readonly mode: "dry_run";
  readonly tool:
    | "research_create_workspace"
    | "research_ingest_sources"
    | "research_generate_audio";
  readonly inputFingerprint: string;
  readonly handoffFingerprint: string;
  readonly approvalFingerprint: string;
  readonly readinessReportFingerprint: string;
  readonly capabilities: {
    readonly network: false;
    readonly credentials: false;
    readonly providerExecution: false;
    readonly childProcess: false;
  };
};

export type StagingSandboxRejectReason =
  | "PRODUCTION_FORBIDDEN"
  | "INVALID_APPROVAL"
  | "READINESS_NOT_MANUAL_REVIEWABLE"
  | "KILL_SWITCH_ACTIVE"
  | "CAPABILITY_ESCALATION"
  | "PROVIDER_UNSUPPORTED"
  | "TIMEOUT"
  | "CIRCUIT_OPEN"
  | "IDEMPOTENCY_CONFLICT"
  | "INVALID_REQUEST";

export type StagingSandboxResult =
  | {
      readonly kind: "dry_run_accepted";
      readonly environment: "test" | "staging";
      readonly mode: "dry_run";
      readonly providerId: string;
      readonly tool: string;
      readonly dryRunId: string;
      readonly correlationId: string;
      readonly simulatedProviderStatus: "ACCEPTED" | "REPLAY" | "REJECTED";
      readonly sideEffectsAllowed: false;
      readonly networkCallMade: false;
      readonly credentialsAccessed: false;
      readonly providerCallMade: false;
      readonly createdResources: readonly [];
      readonly auditEventId: string;
      readonly fingerprint: string;
    }
  | {
      readonly kind: "dry_run_rejected";
      readonly environment: "test" | "staging";
      readonly mode: "dry_run";
      readonly providerId: string;
      readonly tool: string;
      readonly dryRunId?: string;
      readonly correlationId: string;
      readonly reason: StagingSandboxRejectReason;
      readonly sideEffectsAllowed: false;
      readonly networkCallMade: false;
      readonly credentialsAccessed: false;
      readonly providerCallMade: false;
      readonly createdResources: readonly [];
      readonly auditEventId: string;
      readonly fingerprint: string;
    };

export type SandboxValidationResult = {
  readonly valid: boolean;
  readonly errors: readonly string[];
};

/**
 * Computes a deterministic SHA-256 fingerprint for a staging sandbox result.
 */
export function computeStagingSandboxResultFingerprint(params: {
  readonly kind: "dry_run_accepted" | "dry_run_rejected";
  readonly environment: "test" | "staging";
  readonly mode: "dry_run";
  readonly providerId: string;
  readonly tool: string;
  readonly dryRunId?: string;
  readonly correlationId: string;
  readonly simulatedProviderStatus?: "ACCEPTED" | "REPLAY" | "REJECTED";
  readonly reason?: StagingSandboxRejectReason;
  readonly auditEventId: string;
}): string {
  const canonical = JSON.stringify({
    auditEventId: params.auditEventId.trim(),
    correlationId: params.correlationId.trim(),
    dryRunId: params.dryRunId?.trim() ?? "",
    environment: params.environment.trim(),
    kind: params.kind.trim(),
    mode: params.mode.trim(),
    providerId: params.providerId.trim(),
    reason: params.reason?.trim() ?? "",
    simulatedProviderStatus: params.simulatedProviderStatus?.trim() ?? "",
    tool: params.tool.trim(),
  });
  return createHash("sha256").update(canonical).digest("hex");
}

/**
 * Validates a StagingSandboxRequest for schema conformity and strict staging constraints.
 */
export function validateStagingSandboxRequest(request: unknown): SandboxValidationResult {
  const errors: string[] = [];

  if (!request || typeof request !== "object") {
    return { valid: false, errors: ["Request must be a non-null object."] };
  }

  const req = request as Record<string, unknown>;

  if (typeof req.requestId !== "string" || !req.requestId.trim()) {
    errors.push("requestId must be a non-empty string.");
  }

  if (typeof req.correlationId !== "string" || !req.correlationId.trim()) {
    errors.push("correlationId must be a non-empty string.");
  }

  const validProviders = ["antigravity-legacy", "notebooklm-enterprise"];
  if (!validProviders.includes(req.providerId as string)) {
    errors.push(`providerId must be one of: ${validProviders.join(", ")}.`);
  }

  const validTools = [
    "research_create_workspace",
    "research_ingest_sources",
    "research_generate_audio",
  ];
  if (!validTools.includes(req.tool as string)) {
    errors.push(`tool must be one of: ${validTools.join(", ")}.`);
  }

  if (req.environment === "production") {
    errors.push("production environment is strictly forbidden in Staging Sandbox.");
  } else if (req.environment !== "test" && req.environment !== "staging") {
    errors.push("environment must be either 'test' or 'staging'.");
  }

  if (req.mode !== "dry_run") {
    errors.push("mode must be strictly 'dry_run' in Staging Sandbox.");
  }

  if (typeof req.inputFingerprint !== "string" || !req.inputFingerprint.trim()) {
    errors.push("inputFingerprint must be a non-empty string.");
  }

  if (typeof req.handoffFingerprint !== "string" || !req.handoffFingerprint.trim()) {
    errors.push("handoffFingerprint must be a non-empty string.");
  }

  if (typeof req.approvalFingerprint !== "string" || !req.approvalFingerprint.trim()) {
    errors.push("approvalFingerprint must be a non-empty string.");
  }

  if (
    typeof req.readinessReportFingerprint !== "string" ||
    !req.readinessReportFingerprint.trim()
  ) {
    errors.push("readinessReportFingerprint must be a non-empty string.");
  }

  if (!req.capabilities || typeof req.capabilities !== "object") {
    errors.push("capabilities must be an object.");
  } else {
    const caps = req.capabilities as Record<string, unknown>;
    if (caps.network !== false) errors.push("capabilities.network must be false.");
    if (caps.credentials !== false) errors.push("capabilities.credentials must be false.");
    if (caps.providerExecution !== false) errors.push("capabilities.providerExecution must be false.");
    if (caps.childProcess !== false) errors.push("capabilities.childProcess must be false.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
