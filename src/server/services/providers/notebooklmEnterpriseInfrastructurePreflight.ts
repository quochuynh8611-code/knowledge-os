import { createHash } from "crypto";

export type InfrastructurePreflightStatus =
  | "PASS"
  | "FAIL"
  | "BLOCKED"
  | "UNVERIFIED"
  | "NOT_RUN";

export type InfrastructurePreflightCheckCategory =
  | "PROJECT"
  | "API_ENABLEMENT"
  | "REGION"
  | "IAM"
  | "AUTH_SCOPE"
  | "SECRET_BOUNDARY"
  | "QUOTA"
  | "AUDIT_LOGGING"
  | "NETWORK"
  | "PROVIDER_BOUNDARY"
  | "DATA_POLICY"
  | "ROLLBACK";

export interface InfrastructurePreflightCheck {
  readonly checkId: string;
  readonly category: InfrastructurePreflightCheckCategory;
  readonly status: InfrastructurePreflightStatus;
  readonly summary: string;
  readonly evidenceFingerprint: string;
  readonly sanitized: true;
  readonly containsSecrets: false;
  readonly containsRawSource: false;
  readonly containsFilesystemPath: false;
}

export const MANDATORY_PREFLIGHT_CHECK_IDS = Object.freeze([
  "CHK-01-PROJECT-REF",
  "CHK-02-API-ENABLEMENT",
  "CHK-03-REGION-DEF",
  "CHK-04-IAM-AUTH-SCOPE",
  "CHK-05-SECRET-REF-BOUNDARY",
  "CHK-06-QUOTA-BUDGET",
  "CHK-07-CLOUD-AUDIT-LOGS",
  "CHK-08-NETWORK-EGRESS",
  "CHK-09-OFFICIAL-API-BOUNDARY",
  "CHK-10-NO-CONSUMER-COOKIE",
  "CHK-11-NO-REVERSE-RPC",
  "CHK-12-NO-ANTIGRAVITY-ROUTING",
  "CHK-13-TEST-PUBLIC-SOURCE-POLICY",
  "CHK-14-ROLLBACK-CLEANUP-PLAN",
  "CHK-15-PRODUCTION-DENIED-PROOF",
] as const);

export type MandatoryPreflightCheckId = typeof MANDATORY_PREFLIGHT_CHECK_IDS[number];

export interface NotebookLMEnterpriseInfrastructurePreflightReport {
  readonly reportVersion: "6.10.0";
  readonly generatedAt: string;
  readonly targetProvider: "notebooklm-enterprise";
  readonly environment: "staging";
  readonly checks: readonly InfrastructurePreflightCheck[];
  readonly passedChecks: readonly string[];
  readonly failedChecks: readonly string[];
  readonly blockedChecks: readonly string[];
  readonly unverifiedChecks: readonly string[];
  readonly notRunChecks: readonly string[];
  readonly overallStatus: "PASS" | "NOT_READY" | "BLOCKED";
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

export function computeInfrastructurePreflightFingerprint(payload: Record<string, unknown>): string {
  const sortedKeys = Object.keys(payload).sort();
  const canonical: Record<string, unknown> = {};
  for (const k of sortedKeys) {
    canonical[k] = payload[k];
  }
  return createHash("sha256").update(JSON.stringify(canonical), "utf8").digest("hex");
}

export function evaluateInfrastructurePreflight(
  checks: readonly InfrastructurePreflightCheck[],
  generatedAt = new Date().toISOString()
): NotebookLMEnterpriseInfrastructurePreflightReport {
  const passedChecks: string[] = [];
  const failedChecks: string[] = [];
  const blockedChecks: string[] = [];
  const unverifiedChecks: string[] = [];
  const notRunChecks: string[] = [];

  const checkMap = new Map<string, InfrastructurePreflightCheck>();
  for (const check of checks) {
    checkMap.set(check.checkId, check);
    if (check.status === "PASS") {
      passedChecks.push(check.checkId);
    } else if (check.status === "FAIL") {
      failedChecks.push(check.checkId);
    } else if (check.status === "BLOCKED") {
      blockedChecks.push(check.checkId);
    } else if (check.status === "UNVERIFIED") {
      unverifiedChecks.push(check.checkId);
    } else if (check.status === "NOT_RUN") {
      notRunChecks.push(check.checkId);
    }
  }

  // Ensure all 15 mandatory check IDs are tracked
  for (const mandatoryId of MANDATORY_PREFLIGHT_CHECK_IDS) {
    if (!checkMap.has(mandatoryId)) {
      if (!unverifiedChecks.includes(mandatoryId)) {
        unverifiedChecks.push(mandatoryId);
      }
    }
  }

  // Determine overall status
  let overallStatus: "PASS" | "NOT_READY" | "BLOCKED";

  if (failedChecks.length > 0 || blockedChecks.length > 0) {
    overallStatus = "BLOCKED";
  } else if (
    unverifiedChecks.length > 0 ||
    notRunChecks.length > 0 ||
    passedChecks.length < MANDATORY_PREFLIGHT_CHECK_IDS.length
  ) {
    overallStatus = "NOT_READY";
  } else {
    overallStatus = "PASS";
  }

  const canonicalPayload = {
    reportVersion: "6.10.0",
    generatedAt,
    targetProvider: "notebooklm-enterprise",
    environment: "staging",
    overallStatus,
    passedChecks: [...passedChecks].sort(),
    failedChecks: [...failedChecks].sort(),
    blockedChecks: [...blockedChecks].sort(),
    unverifiedChecks: [...unverifiedChecks].sort(),
    notRunChecks: [...notRunChecks].sort(),
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

  const fingerprint = computeInfrastructurePreflightFingerprint(canonicalPayload);

  return Object.freeze({
    reportVersion: "6.10.0",
    generatedAt,
    targetProvider: "notebooklm-enterprise",
    environment: "staging",
    checks: Object.freeze([...checks]),
    passedChecks: Object.freeze(passedChecks),
    failedChecks: Object.freeze(failedChecks),
    blockedChecks: Object.freeze(blockedChecks),
    unverifiedChecks: Object.freeze(unverifiedChecks),
    notRunChecks: Object.freeze(notRunChecks),
    overallStatus,
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
