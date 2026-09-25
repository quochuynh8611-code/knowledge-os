/**
 * Manual Enablement Contract & Validation (Phase 6.4)
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * - Pure, deterministic, side-effect free validation and fingerprinting.
 * - Zero real provider or network execution.
 * - Zero secrets, credentials, or system paths accepted in payloads.
 * - Explicit actor, scope, environment, and readiness fingerprint binding.
 */

import { createHash } from "node:crypto";
import { sanitizeProviderErrorMessage } from "./errors.js";

export type ManualEnablementStatus =
  | "DENIED"
  | "PENDING_REVIEW"
  | "APPROVED_FOR_FUTURE_PHASE"
  | "REVOKED"
  | "EXPIRED";

export type ManualEnablementScope =
  | "simulation_only"
  | "real_execution_design_review";

export type ManualEnablementRequest = {
  readonly requestId: string;
  readonly requestedBy: string;
  readonly requestedAt: string;
  readonly scope: ManualEnablementScope;
  readonly providerId: "antigravity-legacy" | "notebooklm-enterprise";
  readonly environment: "test" | "staging" | "production";
  readonly reason: string;
  readonly readinessReportFingerprint: string;
  readonly requestedCapabilities: {
    readonly network: boolean;
    readonly credentials: boolean;
    readonly providerExecution: boolean;
    readonly childProcess: boolean;
  };
};

export type ManualEnablementApproval = {
  readonly approvalId: string;
  readonly requestId: string;
  readonly approvedBy: string;
  readonly approvedAt: string;
  readonly expiresAt: string;
  readonly status: ManualEnablementStatus;
  readonly scope: ManualEnablementScope;
  readonly providerId: "antigravity-legacy" | "notebooklm-enterprise";
  readonly environment: "test" | "staging" | "production";
  readonly readinessReportFingerprint: string;
  readonly approvalFingerprint: string;
};

export type ValidationResult = {
  readonly valid: boolean;
  readonly errors: readonly string[];
};

/**
 * Computes a deterministic SHA-256 fingerprint for a manual enablement approval.
 * Excludes non-canonical whitespace, runtime handles, or secrets.
 */
export function computeApprovalFingerprint(approval: {
  readonly approvalId: string;
  readonly requestId: string;
  readonly approvedBy: string;
  readonly approvedAt: string;
  readonly expiresAt: string;
  readonly status: ManualEnablementStatus;
  readonly scope: ManualEnablementScope;
  readonly providerId: "antigravity-legacy" | "notebooklm-enterprise";
  readonly environment: "test" | "staging" | "production";
  readonly readinessReportFingerprint: string;
}): string {
  const canonical = JSON.stringify({
    approvalId: approval.approvalId.trim(),
    approvedAt: approval.approvedAt.trim(),
    approvedBy: approval.approvedBy.trim(),
    environment: approval.environment.trim(),
    expiresAt: approval.expiresAt.trim(),
    providerId: approval.providerId.trim(),
    readinessReportFingerprint: approval.readinessReportFingerprint.trim(),
    requestId: approval.requestId.trim(),
    scope: approval.scope.trim(),
    status: approval.status.trim(),
  });
  return createHash("sha256").update(canonical).digest("hex");
}

const SECRET_PATTERNS = [
  /bearer\s+[a-z0-9_\-\.]+/i,
  /key-[a-z0-9_\-]+/i,
  /token-[a-z0-9_\-]+/i,
  /api[_-]?key/i,
  /secret/i,
  /password/i,
];

const PATH_PATTERNS = [
  /^\/[a-z0-9_.\-\/]+/i,
  /^[a-z]:\\[a-z0-9_.\-\\]+/i,
  /\/Users\//i,
  /\/home\//i,
  /\/etc\//i,
];

function containsSecretOrPath(text: string): { hasSecret: boolean; hasPath: boolean } {
  const hasSecret = SECRET_PATTERNS.some((pattern) => pattern.test(text));
  const hasPath = PATH_PATTERNS.some((pattern) => pattern.test(text));
  return { hasSecret, hasPath };
}

/**
 * Validates a ManualEnablementRequest for completeness, sanitized contents, and valid fields.
 */
export function validateManualEnablementRequest(
  request: unknown
): ValidationResult {
  const errors: string[] = [];

  if (!request || typeof request !== "object") {
    return { valid: false, errors: ["Request must be a non-null object."] };
  }

  const req = request as Record<string, unknown>;

  if (typeof req.requestId !== "string" || !req.requestId.trim()) {
    errors.push("requestId must be a non-empty string.");
  }

  if (typeof req.requestedBy !== "string" || !req.requestedBy.trim()) {
    errors.push("requestedBy must be a non-empty string.");
  } else if (req.requestedBy.trim().toLowerCase() === "system") {
    errors.push("requestedBy cannot be 'system'; manual request requires an explicit human actor.");
  }

  if (typeof req.requestedAt !== "string" || isNaN(Date.parse(req.requestedAt))) {
    errors.push("requestedAt must be a valid ISO date string.");
  }

  const validScopes: ManualEnablementScope[] = [
    "simulation_only",
    "real_execution_design_review",
  ];
  if (!validScopes.includes(req.scope as ManualEnablementScope)) {
    errors.push(`scope must be one of: ${validScopes.join(", ")}.`);
  }

  const validProviders = ["antigravity-legacy", "notebooklm-enterprise"];
  if (!validProviders.includes(req.providerId as string)) {
    errors.push(`providerId must be one of: ${validProviders.join(", ")}.`);
  }

  const validEnvironments = ["test", "staging", "production"];
  if (!validEnvironments.includes(req.environment as string)) {
    errors.push(`environment must be one of: ${validEnvironments.join(", ")}.`);
  }

  if (typeof req.reason !== "string" || !req.reason.trim()) {
    errors.push("reason must be a non-empty string.");
  } else {
    const { hasSecret, hasPath } = containsSecretOrPath(req.reason);
    if (hasSecret) {
      errors.push("reason contains forbidden secret or token pattern.");
    }
    if (hasPath) {
      errors.push("reason contains forbidden filesystem path pattern.");
    }
  }

  if (
    typeof req.readinessReportFingerprint !== "string" ||
    !req.readinessReportFingerprint.trim()
  ) {
    errors.push("readinessReportFingerprint must be a non-empty string.");
  }

  if (!req.requestedCapabilities || typeof req.requestedCapabilities !== "object") {
    errors.push("requestedCapabilities must be a valid capabilities object.");
  } else {
    const caps = req.requestedCapabilities as Record<string, unknown>;
    if (typeof caps.network !== "boolean") errors.push("requestedCapabilities.network must be boolean.");
    if (typeof caps.credentials !== "boolean") errors.push("requestedCapabilities.credentials must be boolean.");
    if (typeof caps.providerExecution !== "boolean") errors.push("requestedCapabilities.providerExecution must be boolean.");
    if (typeof caps.childProcess !== "boolean") errors.push("requestedCapabilities.childProcess must be boolean.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates a ManualEnablementApproval for actor presence, expiry constraints, and fingerprint integrity.
 */
export function validateManualEnablementApproval(
  approval: unknown,
  options?: { readonly now?: () => Date }
): ValidationResult {
  const errors: string[] = [];

  if (!approval || typeof approval !== "object") {
    return { valid: false, errors: ["Approval must be a non-null object."] };
  }

  const app = approval as Record<string, unknown>;

  if (typeof app.approvalId !== "string" || !app.approvalId.trim()) {
    errors.push("approvalId must be a non-empty string.");
  }

  if (typeof app.requestId !== "string" || !app.requestId.trim()) {
    errors.push("requestId must be a non-empty string.");
  }

  if (typeof app.approvedBy !== "string" || !app.approvedBy.trim()) {
    errors.push("approvedBy must be a non-empty string.");
  } else if (app.approvedBy.trim().toLowerCase() === "system") {
    errors.push("approvedBy cannot be 'system'; manual approval requires an explicit human approver.");
  }

  const approvedAtParsed = typeof app.approvedAt === "string" ? Date.parse(app.approvedAt) : NaN;
  if (isNaN(approvedAtParsed)) {
    errors.push("approvedAt must be a valid ISO date string.");
  }

  const expiresAtParsed = typeof app.expiresAt === "string" ? Date.parse(app.expiresAt) : NaN;
  if (isNaN(expiresAtParsed)) {
    errors.push("expiresAt must be a valid ISO date string.");
  }

  if (!isNaN(approvedAtParsed) && !isNaN(expiresAtParsed)) {
    if (expiresAtParsed <= approvedAtParsed) {
      errors.push("expiresAt must be strictly greater than approvedAt.");
    }
  }

  const now = options?.now ? options.now() : new Date();
  if (!isNaN(expiresAtParsed) && expiresAtParsed <= now.getTime()) {
    errors.push("Approval has expired.");
  }

  const validStatuses: ManualEnablementStatus[] = [
    "DENIED",
    "PENDING_REVIEW",
    "APPROVED_FOR_FUTURE_PHASE",
    "REVOKED",
    "EXPIRED",
  ];
  if (!validStatuses.includes(app.status as ManualEnablementStatus)) {
    errors.push(`status must be one of: ${validStatuses.join(", ")}.`);
  } else if (app.status === "REVOKED") {
    errors.push("Approval status is REVOKED.");
  } else if (app.status === "DENIED") {
    errors.push("Approval status is DENIED.");
  }

  const validScopes: ManualEnablementScope[] = [
    "simulation_only",
    "real_execution_design_review",
  ];
  if (!validScopes.includes(app.scope as ManualEnablementScope)) {
    errors.push(`scope must be one of: ${validScopes.join(", ")}.`);
  }

  const validProviders = ["antigravity-legacy", "notebooklm-enterprise"];
  if (!validProviders.includes(app.providerId as string)) {
    errors.push(`providerId must be one of: ${validProviders.join(", ")}.`);
  }

  const validEnvironments = ["test", "staging", "production"];
  if (!validEnvironments.includes(app.environment as string)) {
    errors.push(`environment must be one of: ${validEnvironments.join(", ")}.`);
  }

  if (
    typeof app.readinessReportFingerprint !== "string" ||
    !app.readinessReportFingerprint.trim()
  ) {
    errors.push("readinessReportFingerprint must be a non-empty string.");
  }

  if (typeof app.approvalFingerprint !== "string" || !app.approvalFingerprint.trim()) {
    errors.push("approvalFingerprint must be a non-empty string.");
  } else if (errors.length === 0) {
    const expectedFingerprint = computeApprovalFingerprint(
      app as unknown as ManualEnablementApproval
    );
    if (app.approvalFingerprint.trim() !== expectedFingerprint) {
      errors.push("approvalFingerprint does not match canonical payload hash.");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
