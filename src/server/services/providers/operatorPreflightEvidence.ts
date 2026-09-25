import { createHash } from "crypto";
import {
  computeEvidenceBundleFingerprint,
  PreflightEvidenceKind,
} from "./evidenceBundleFingerprint";
import { sanitizeEvidenceValue, sanitizeString } from "./evidenceSanitizer";

export type { PreflightEvidenceKind };

export type PreflightEvidenceStatus =
  | "PASS"
  | "FAIL"
  | "MISSING"
  | "STALE"
  | "INVALID"
  | "SANITIZATION_FAILED";

export interface PreflightEvidenceItem {
  readonly evidenceId: string;
  readonly kind: PreflightEvidenceKind;
  readonly status: PreflightEvidenceStatus;
  readonly generatedAt: string;
  readonly sourceFingerprint: string;
  readonly artifactFingerprint: string;
  readonly summary: string;
  readonly checks: readonly string[];
  readonly sanitized: true;
  readonly containsSecrets: false;
  readonly containsRawSource: false;
  readonly containsProviderInstance: false;
  readonly containsFilesystemPath: false;
  readonly containsEnvironmentDump: false;
  readonly realExecutionAllowed: false;
  readonly sideEffectsAllowed: false;
}

export interface OperatorPreflightEvidenceBundle {
  readonly bundleId: string;
  readonly bundleVersion: "6.6.0";
  readonly environment: "test" | "staging";
  readonly generatedAt: string;
  readonly items: readonly PreflightEvidenceItem[];
  readonly requiredKinds: readonly PreflightEvidenceKind[];
  readonly missingKinds: readonly PreflightEvidenceKind[];
  readonly failedKinds: readonly PreflightEvidenceKind[];
  readonly staleKinds: readonly PreflightEvidenceKind[];
  readonly complete: boolean;
  readonly tamperEvidence: {
    readonly algorithm: "sha256";
    readonly fingerprint: string;
    readonly canonicalized: true;
  };
  readonly realExecutionAllowed: false;
  readonly networkAllowed: false;
  readonly credentialsAllowed: false;
  readonly childProcessAllowed: false;
  readonly sideEffectsAllowed: false;
}

export const ALL_REQUIRED_EVIDENCE_KINDS: readonly PreflightEvidenceKind[] = Object.freeze([
  "READINESS_REPORT",
  "RUNTIME_COMPOSITION_AUDIT",
  "MANUAL_ENABLEMENT_DECISION",
  "CONTROLLED_TOGGLE_STATE",
  "KILL_SWITCH_STATE",
  "STAGING_DRY_RUN_RESULT",
  "NO_REAL_EXECUTION_PROOF",
  "REGRESSION_TEST_RESULT",
  "ROLLBACK_REHEARSAL_RESULT",
]);

export interface CreatePreflightEvidenceItemInput {
  readonly evidenceId: string;
  readonly kind: PreflightEvidenceKind;
  readonly status: PreflightEvidenceStatus;
  readonly generatedAt?: string;
  readonly sourceFingerprint?: string;
  readonly summary: string;
  readonly checks?: readonly string[];
  readonly rawMetadata?: unknown;
}

/**
 * Creates a sanitized, verifiable PreflightEvidenceItem.
 */
export function createPreflightEvidenceItem(
  input: CreatePreflightEvidenceItemInput
): PreflightEvidenceItem {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const rawSummary = input.summary ?? "";
  const { sanitized: sanitizedSummary } = sanitizeString(rawSummary);

  const rawChecks = input.checks ?? [];
  const sanitizedChecks = rawChecks.map((c) => sanitizeString(c).sanitized);

  // Check if raw metadata is safe and sanitized
  let status = input.status;
  if (input.rawMetadata !== undefined) {
    const sanitizationCheck = sanitizeEvidenceValue(input.rawMetadata);
    if (!sanitizationCheck.sanitized || sanitizationCheck.rejectedFields.length > 0) {
      status = "SANITIZATION_FAILED";
    }
  }

  const sourceFingerprint =
    input.sourceFingerprint ??
    createHash("sha256").update(JSON.stringify({ kind: input.kind, summary: sanitizedSummary }), "utf8").digest("hex");

  const artifactPayload = {
    evidenceId: input.evidenceId,
    kind: input.kind,
    status,
    generatedAt,
    sourceFingerprint,
    summary: sanitizedSummary,
    checks: sanitizedChecks,
  };

  const artifactFingerprint = createHash("sha256")
    .update(JSON.stringify(artifactPayload), "utf8")
    .digest("hex");

  return Object.freeze({
    evidenceId: input.evidenceId,
    kind: input.kind,
    status,
    generatedAt,
    sourceFingerprint,
    artifactFingerprint,
    summary: sanitizedSummary,
    checks: Object.freeze(sanitizedChecks),
    sanitized: true,
    containsSecrets: false,
    containsRawSource: false,
    containsProviderInstance: false,
    containsFilesystemPath: false,
    containsEnvironmentDump: false,
    realExecutionAllowed: false,
    sideEffectsAllowed: false,
  });
}

export interface CreatePreflightEvidenceBundleInput {
  readonly bundleId?: string;
  readonly environment: "test" | "staging" | "production";
  readonly generatedAt?: string;
  readonly items: readonly PreflightEvidenceItem[];
}

/**
 * Creates an OperatorPreflightEvidenceBundle aggregating all evidence items.
 * Fail-closed: Throws or produces failed bundle if in production or invalid.
 */
export function createPreflightEvidenceBundle(
  input: CreatePreflightEvidenceBundleInput
): OperatorPreflightEvidenceBundle {
  if (input.environment === "production") {
    throw new Error("ERR_PRODUCTION_BUNDLE_FORBIDDEN: Evidence bundles cannot be generated for production");
  }

  const bundleId = input.bundleId ?? `bundle-6.6.0-${Date.now()}`;
  const generatedAt = input.generatedAt ?? new Date().toISOString();

  // Validate duplicate IDs and duplicate kinds
  const seenIds = new Set<string>();
  const seenKinds = new Set<PreflightEvidenceKind>();
  const validItems: PreflightEvidenceItem[] = [];

  for (const item of input.items) {
    if (seenIds.has(item.evidenceId)) {
      throw new Error(`ERR_DUPLICATE_EVIDENCE_ID: Duplicate evidence ID detected: ${item.evidenceId}`);
    }
    if (seenKinds.has(item.kind)) {
      throw new Error(`ERR_DUPLICATE_EVIDENCE_KIND: Duplicate evidence kind detected: ${item.kind}`);
    }
    seenIds.add(item.evidenceId);
    seenKinds.add(item.kind);
    validItems.push(item);
  }

  const missingKinds: PreflightEvidenceKind[] = [];
  const failedKinds: PreflightEvidenceKind[] = [];
  const staleKinds: PreflightEvidenceKind[] = [];

  for (const requiredKind of ALL_REQUIRED_EVIDENCE_KINDS) {
    const item = validItems.find((i) => i.kind === requiredKind);
    if (!item) {
      missingKinds.push(requiredKind);
    } else if (item.status === "FAIL" || item.status === "INVALID" || item.status === "SANITIZATION_FAILED") {
      failedKinds.push(requiredKind);
    } else if (item.status === "STALE") {
      staleKinds.push(requiredKind);
    } else if (item.status === "MISSING") {
      missingKinds.push(requiredKind);
    }
  }

  const complete =
    missingKinds.length === 0 &&
    failedKinds.length === 0 &&
    staleKinds.length === 0 &&
    validItems.length === ALL_REQUIRED_EVIDENCE_KINDS.length &&
    validItems.every((i) => i.status === "PASS");

  const itemFingerprints = validItems.map((i) => i.artifactFingerprint);

  const fingerprint = computeEvidenceBundleFingerprint({
    bundleVersion: "6.6.0",
    environment: input.environment,
    itemFingerprints,
    requiredKinds: ALL_REQUIRED_EVIDENCE_KINDS,
    missingKinds: Object.freeze(missingKinds),
    failedKinds: Object.freeze(failedKinds),
    staleKinds: Object.freeze(staleKinds),
    complete,
  });

  return Object.freeze({
    bundleId,
    bundleVersion: "6.6.0",
    environment: input.environment,
    generatedAt,
    items: Object.freeze(validItems),
    requiredKinds: ALL_REQUIRED_EVIDENCE_KINDS,
    missingKinds: Object.freeze(missingKinds),
    failedKinds: Object.freeze(failedKinds),
    staleKinds: Object.freeze(staleKinds),
    complete,
    tamperEvidence: Object.freeze({
      algorithm: "sha256",
      fingerprint,
      canonicalized: true,
    }),
    realExecutionAllowed: false,
    networkAllowed: false,
    credentialsAllowed: false,
    childProcessAllowed: false,
    sideEffectsAllowed: false,
  });
}
