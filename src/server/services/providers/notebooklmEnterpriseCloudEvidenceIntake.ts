import { createHash } from "crypto";

export type CloudEvidenceStatus =
  | "VALID"
  | "INVALID"
  | "MISSING"
  | "DOCUMENTED_ONLY";

export type CloudEvidenceCategory =
  | "PROJECT"
  | "API_ENABLEMENT"
  | "REGION"
  | "IAM"
  | "AUTH_SCOPE"
  | "SECRET_BOUNDARY"
  | "QUOTA"
  | "BUDGET"
  | "AUDIT_LOGGING"
  | "NETWORK"
  | "PRODUCTION_DENY";

export type CloudEvidenceSourceType =
  | "OPERATOR_SCREENSHOT_METADATA"
  | "OPERATOR_CONSOLE_EXPORT_METADATA"
  | "OPERATOR_MANUAL_ENTRY"
  | "REPOSITORY_DOCUMENTATION";

export interface CloudEvidenceArtifact {
  readonly artifactId: string;
  readonly category: CloudEvidenceCategory;
  readonly status: CloudEvidenceStatus;
  readonly sourceType: CloudEvidenceSourceType;
  readonly summary: string;
  readonly evidenceFingerprint: string;
  readonly sanitized: true;
  readonly containsSecrets: false;
  readonly containsRawSource: false;
  readonly containsFilesystemPath: false;
}

export interface RawOperatorEvidenceInput {
  readonly artifactId: string;
  readonly category: CloudEvidenceCategory;
  readonly sourceType: CloudEvidenceSourceType;
  readonly summary: string;
  readonly payloadMetadata?: Readonly<Record<string, unknown>>;
}

export const MANDATORY_CLOUD_CATEGORIES: readonly CloudEvidenceCategory[] = Object.freeze([
  "PROJECT",
  "API_ENABLEMENT",
  "REGION",
  "IAM",
  "AUTH_SCOPE",
  "SECRET_BOUNDARY",
  "QUOTA",
  "BUDGET",
  "AUDIT_LOGGING",
  "NETWORK",
  "PRODUCTION_DENY",
]);

export interface NotebookLMEnterpriseCloudEvidenceIntakeReport {
  readonly version: "6.12.0";
  readonly generatedAt: string;
  readonly targetProvider: "notebooklm-enterprise";
  readonly environment: "staging";
  readonly artifacts: readonly CloudEvidenceArtifact[];
  readonly validArtifacts: readonly string[];
  readonly invalidArtifacts: readonly string[];
  readonly missingArtifacts: readonly string[];
  readonly documentedOnlyArtifacts: readonly string[];
  readonly evidenceCoverageStatus:
    | "INSUFFICIENT"
    | "PARTIAL"
    | "OPERATOR_EVIDENCE_READY";
  readonly apiRequestsMade: false;
  readonly credentialsAccessed: false;
  readonly notebookCreated: false;
  readonly sourceUploaded: false;
  readonly networkAllowed: false;
  readonly realExecutionAllowed: false;
  readonly controlledExecutionEnabled: false;
  readonly killSwitchActive: true;
  readonly productionAllowed: false;
  readonly fingerprint: string;
}

const FORBIDDEN_SECRET_PATTERNS = [
  /AIzaSy[a-zA-Z0-9_\-]{20,}/i,
  /bearer\s+[a-zA-Z0-9_\-\.]+/i,
  /client_secret/i,
  /private_key/i,
  /-----BEGIN PRIVATE KEY-----/i,
  /serviceAccountKey/i,
];

const FORBIDDEN_PATH_PATTERNS = [
  /\/Users\//i,
  /\/home\//i,
  /\/var\//i,
  /\/tmp\//i,
  /\/etc\//i,
  /[a-zA-Z]:\\/i,
];

function sanitizeString(val: string): string {
  let res = val;
  for (const p of FORBIDDEN_PATH_PATTERNS) {
    res = res.replace(p, "[REDACTED_PATH]");
  }
  return res;
}

export function computeCloudEvidenceIntakeFingerprint(payload: Record<string, unknown>): string {
  const sortedKeys = Object.keys(payload).sort();
  const canonical: Record<string, unknown> = {};
  for (const k of sortedKeys) {
    canonical[k] = payload[k];
  }
  return createHash("sha256").update(JSON.stringify(canonical), "utf8").digest("hex");
}

export function intakeAndClassifyCloudEvidence(
  inputs: readonly RawOperatorEvidenceInput[],
  generatedAt = new Date().toISOString()
): NotebookLMEnterpriseCloudEvidenceIntakeReport {
  const validArtifacts: string[] = [];
  const invalidArtifacts: string[] = [];
  const missingArtifacts: string[] = [];
  const documentedOnlyArtifacts: string[] = [];

  const artifacts: CloudEvidenceArtifact[] = [];
  const presentCategories = new Set<CloudEvidenceCategory>();

  for (const input of inputs) {
    presentCategories.add(input.category);

    const payloadString = input.payloadMetadata ? JSON.stringify(input.payloadMetadata) : "";
    const hasSecrets =
      FORBIDDEN_SECRET_PATTERNS.some((p) => p.test(input.summary) || p.test(payloadString));

    let status: CloudEvidenceStatus;

    if (hasSecrets) {
      status = "INVALID";
      invalidArtifacts.push(input.artifactId);
    } else if (
      input.payloadMetadata &&
      (input.payloadMetadata.environment === "production" || input.payloadMetadata.projectId === "prod-kb-project")
    ) {
      // Contradictory evidence (production target in staging intake)
      status = "INVALID";
      invalidArtifacts.push(input.artifactId);
    } else if (input.sourceType === "REPOSITORY_DOCUMENTATION") {
      status = "DOCUMENTED_ONLY";
      documentedOnlyArtifacts.push(input.artifactId);
    } else {
      status = "VALID";
      validArtifacts.push(input.artifactId);
    }

    const cleanSummary = sanitizeString(input.summary);
    const itemCanonical = {
      artifactId: input.artifactId,
      category: input.category,
      status,
      sourceType: input.sourceType,
      summary: cleanSummary,
    };
    const evidenceFingerprint = createHash("sha256")
      .update(JSON.stringify(itemCanonical), "utf8")
      .digest("hex");

    artifacts.push(
      Object.freeze({
        artifactId: input.artifactId,
        category: input.category,
        status,
        sourceType: input.sourceType,
        summary: cleanSummary,
        evidenceFingerprint,
        sanitized: true,
        containsSecrets: false,
        containsRawSource: false,
        containsFilesystemPath: false,
      })
    );
  }

  // Check for missing mandatory categories
  for (const mandatoryCategory of MANDATORY_CLOUD_CATEGORIES) {
    if (!presentCategories.has(mandatoryCategory)) {
      const missingId = `MISSING-${mandatoryCategory}`;
      missingArtifacts.push(missingId);
      const missingCanonical = {
        artifactId: missingId,
        category: mandatoryCategory,
        status: "MISSING" as const,
        sourceType: "OPERATOR_MANUAL_ENTRY" as const,
        summary: `No operator cloud evidence provided for category ${mandatoryCategory}`,
      };
      const evidenceFingerprint = createHash("sha256")
        .update(JSON.stringify(missingCanonical), "utf8")
        .digest("hex");

      artifacts.push(
        Object.freeze({
          artifactId: missingId,
          category: mandatoryCategory,
          status: "MISSING",
          sourceType: "OPERATOR_MANUAL_ENTRY",
          summary: `No operator cloud evidence provided for category ${mandatoryCategory}`,
          evidenceFingerprint,
          sanitized: true,
          containsSecrets: false,
          containsRawSource: false,
          containsFilesystemPath: false,
        })
      );
    }
  }

  // Determine coverage status
  let evidenceCoverageStatus: "INSUFFICIENT" | "PARTIAL" | "OPERATOR_EVIDENCE_READY";
  if (missingArtifacts.length === 0 && invalidArtifacts.length === 0 && validArtifacts.length >= MANDATORY_CLOUD_CATEGORIES.length) {
    evidenceCoverageStatus = "OPERATOR_EVIDENCE_READY";
  } else if (validArtifacts.length > 0 || documentedOnlyArtifacts.length > 0) {
    evidenceCoverageStatus = "PARTIAL";
  } else {
    evidenceCoverageStatus = "INSUFFICIENT";
  }

  const canonicalPayload = {
    version: "6.12.0",
    generatedAt,
    targetProvider: "notebooklm-enterprise",
    environment: "staging",
    evidenceCoverageStatus,
    validArtifacts: [...validArtifacts].sort(),
    invalidArtifacts: [...invalidArtifacts].sort(),
    missingArtifacts: [...missingArtifacts].sort(),
    documentedOnlyArtifacts: [...documentedOnlyArtifacts].sort(),
    apiRequestsMade: false,
    credentialsAccessed: false,
    notebookCreated: false,
    sourceUploaded: false,
    networkAllowed: false,
    realExecutionAllowed: false,
    controlledExecutionEnabled: false,
    killSwitchActive: true,
    productionAllowed: false,
  };

  const fingerprint = computeCloudEvidenceIntakeFingerprint(canonicalPayload);

  return Object.freeze({
    version: "6.12.0",
    generatedAt,
    targetProvider: "notebooklm-enterprise",
    environment: "staging",
    artifacts: Object.freeze(artifacts),
    validArtifacts: Object.freeze(validArtifacts),
    invalidArtifacts: Object.freeze(invalidArtifacts),
    missingArtifacts: Object.freeze(missingArtifacts),
    documentedOnlyArtifacts: Object.freeze(documentedOnlyArtifacts),
    evidenceCoverageStatus,
    apiRequestsMade: false,
    credentialsAccessed: false,
    notebookCreated: false,
    sourceUploaded: false,
    networkAllowed: false,
    realExecutionAllowed: false,
    controlledExecutionEnabled: false,
    killSwitchActive: true,
    productionAllowed: false,
    fingerprint,
  });
}
