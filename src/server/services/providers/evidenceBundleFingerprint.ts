import { createHash } from "crypto";

export type PreflightEvidenceKind =
  | "READINESS_REPORT"
  | "RUNTIME_COMPOSITION_AUDIT"
  | "MANUAL_ENABLEMENT_DECISION"
  | "CONTROLLED_TOGGLE_STATE"
  | "KILL_SWITCH_STATE"
  | "STAGING_DRY_RUN_RESULT"
  | "NO_REAL_EXECUTION_PROOF"
  | "REGRESSION_TEST_RESULT"
  | "ROLLBACK_REHEARSAL_RESULT";

export interface EvidenceBundleFingerprintInput {
  readonly bundleVersion: "6.6.0";
  readonly environment: "test" | "staging";
  readonly itemFingerprints: readonly string[];
  readonly requiredKinds: readonly PreflightEvidenceKind[];
  readonly missingKinds: readonly PreflightEvidenceKind[];
  readonly failedKinds: readonly PreflightEvidenceKind[];
  readonly staleKinds: readonly PreflightEvidenceKind[];
  readonly complete: boolean;
}

/**
 * Computes canonical deterministic SHA-256 fingerprint for preflight evidence bundle.
 * Pure function: no side-effects, no network, no secrets.
 */
export function computeEvidenceBundleFingerprint(input: EvidenceBundleFingerprintInput): string {
  const canonicalRepresentation = {
    bundleVersion: input.bundleVersion,
    environment: input.environment,
    complete: input.complete,
    requiredKinds: [...input.requiredKinds].sort(),
    missingKinds: [...input.missingKinds].sort(),
    failedKinds: [...input.failedKinds].sort(),
    staleKinds: [...input.staleKinds].sort(),
    itemFingerprints: [...input.itemFingerprints].sort(),
  };

  const payloadString = JSON.stringify(canonicalRepresentation);
  return createHash("sha256").update(payloadString, "utf8").digest("hex");
}

/**
 * Verifies if a given fingerprint matches the canonical fingerprint of the evidence input.
 */
export function verifyEvidenceBundleFingerprint(
  input: EvidenceBundleFingerprintInput,
  expectedFingerprint: string
): boolean {
  if (!expectedFingerprint || typeof expectedFingerprint !== "string") {
    return false;
  }
  const actual = computeEvidenceBundleFingerprint(input);
  return actual === expectedFingerprint.trim().toLowerCase();
}
