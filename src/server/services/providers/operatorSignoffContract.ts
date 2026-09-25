import { sanitizeString } from "./evidenceSanitizer";

export type OperatorSignoffDecision =
  | "ACKNOWLEDGED_FOR_MANUAL_REVIEW"
  | "REJECTED"
  | "EXPIRED";

export interface OperatorSignoff {
  readonly signoffId: string;
  readonly operatorId: string;
  readonly decision: OperatorSignoffDecision;
  readonly bundleId: string;
  readonly bundleFingerprint: string;
  readonly signedAt: string;
  readonly expiresAt: string;
  readonly reasonCode?: string;
  readonly notes?: string;
  readonly realExecutionAllowed: false;
  readonly runtimeToggleChanged: false;
  readonly killSwitchChanged: false;
}

export interface CreateOperatorSignoffInput {
  readonly signoffId?: string;
  readonly operatorId: string;
  readonly decision: OperatorSignoffDecision;
  readonly bundleId: string;
  readonly bundleFingerprint: string;
  readonly environment: "test" | "staging" | "production";
  readonly signedAt?: string;
  readonly expiresAt: string;
  readonly reasonCode?: string;
  readonly notes?: string;
}

export interface ValidateOperatorSignoffResult {
  readonly valid: boolean;
  readonly decision: OperatorSignoffDecision;
  readonly rejectionReasons: readonly string[];
  readonly signoff: OperatorSignoff | null;
}

/**
 * Creates an OperatorSignoff approval artifact.
 * Invariant: This is solely an acknowledgement artifact, never an execution authorization.
 */
export function createOperatorSignoff(input: CreateOperatorSignoffInput): OperatorSignoff {
  if (input.environment === "production") {
    throw new Error("ERR_PRODUCTION_SIGNOFF_FORBIDDEN: Operator sign-off cannot be created for production");
  }

  if (!input.operatorId || input.operatorId.trim() === "") {
    throw new Error("ERR_MISSING_OPERATOR_ID: Operator ID is required for sign-off");
  }

  if (!input.bundleId || input.bundleId.trim() === "") {
    throw new Error("ERR_MISSING_BUNDLE_ID: Bundle ID is required for sign-off");
  }

  if (!input.bundleFingerprint || input.bundleFingerprint.trim() === "") {
    throw new Error("ERR_MISSING_BUNDLE_FINGERPRINT: Bundle fingerprint is required for sign-off");
  }

  const signoffId = input.signoffId ?? `signoff-${Date.now()}`;
  const signedAt = input.signedAt ?? new Date().toISOString();

  let sanitizedNotes: string | undefined = undefined;
  if (input.notes) {
    const { sanitized } = sanitizeString(input.notes);
    sanitizedNotes = sanitized;
  }

  return Object.freeze({
    signoffId,
    operatorId: input.operatorId.trim(),
    decision: input.decision,
    bundleId: input.bundleId.trim(),
    bundleFingerprint: input.bundleFingerprint.trim(),
    signedAt,
    expiresAt: input.expiresAt,
    reasonCode: input.reasonCode,
    notes: sanitizedNotes,
    realExecutionAllowed: false,
    runtimeToggleChanged: false,
    killSwitchChanged: false,
  });
}

export interface ValidateSignoffAgainstBundleOptions {
  readonly signoff: OperatorSignoff;
  readonly expectedBundleId: string;
  readonly expectedBundleFingerprint: string;
  readonly currentTime?: string;
}

/**
 * Validates an OperatorSignoff against a bundle and expiry constraints.
 */
export function validateOperatorSignoff(
  options: ValidateSignoffAgainstBundleOptions
): ValidateOperatorSignoffResult {
  const { signoff, expectedBundleId, expectedBundleFingerprint } = options;
  const rejectionReasons: string[] = [];
  const now = options.currentTime ? new Date(options.currentTime) : new Date();

  if (!signoff.operatorId || signoff.operatorId.trim() === "") {
    rejectionReasons.push("MISSING_OPERATOR_ID");
  }

  if (signoff.bundleId !== expectedBundleId) {
    rejectionReasons.push("BUNDLE_ID_MISMATCH");
  }

  if (signoff.bundleFingerprint !== expectedBundleFingerprint) {
    rejectionReasons.push("BUNDLE_FINGERPRINT_MISMATCH");
  }

  const expiryDate = new Date(signoff.expiresAt);
  if (isNaN(expiryDate.getTime()) || now.getTime() > expiryDate.getTime()) {
    rejectionReasons.push("SIGNOFF_EXPIRED");
    return {
      valid: false,
      decision: "EXPIRED",
      rejectionReasons: Object.freeze(rejectionReasons),
      signoff,
    };
  }

  if (signoff.decision === "REJECTED") {
    rejectionReasons.push("OPERATOR_REJECTED");
    return {
      valid: false,
      decision: "REJECTED",
      rejectionReasons: Object.freeze(rejectionReasons),
      signoff,
    };
  }

  if (rejectionReasons.length > 0) {
    return {
      valid: false,
      decision: "REJECTED",
      rejectionReasons: Object.freeze(rejectionReasons),
      signoff,
    };
  }

  return {
    valid: true,
    decision: "ACKNOWLEDGED_FOR_MANUAL_REVIEW",
    rejectionReasons: Object.freeze([]),
    signoff,
  };
}
