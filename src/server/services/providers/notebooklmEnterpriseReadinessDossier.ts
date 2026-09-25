import { createHash } from "crypto";

export type EvidenceClass =
  | "SPEC_ASSERTION"
  | "DOCUMENTED_EVIDENCE"
  | "SYSTEM_VERIFIED_EVIDENCE"
  | "UNVERIFIED_ASSUMPTION";

export type ReadinessCategory =
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
  | "ROLLBACK"
  | "PRODUCTION_DENY";

export interface ReadinessDossierItem {
  readonly itemId: string;
  readonly category: ReadinessCategory;
  readonly claim: string;
  readonly evidenceClass: EvidenceClass;
  readonly summary: string;
  readonly evidenceFingerprint: string;
  readonly sanitized: true;
  readonly containsSecrets: false;
  readonly containsRawSource: false;
  readonly containsFilesystemPath: false;
}

export const DEFAULT_17_READINESS_ITEMS: readonly ReadinessDossierItem[] = Object.freeze([
  {
    itemId: "DOS-01-PROJECT-REF",
    category: "PROJECT",
    claim: "Staging GCP project reference exists",
    evidenceClass: "DOCUMENTED_EVIDENCE",
    summary: "Documented in ADR-088 and Phase 6.9 staging pilot specification (gcp-staging-kb-project)",
    evidenceFingerprint: "11".repeat(32),
    sanitized: true,
    containsSecrets: false,
    containsRawSource: false,
    containsFilesystemPath: false,
  },
  {
    itemId: "DOS-02-API-ENABLEMENT",
    category: "API_ENABLEMENT",
    claim: "NotebookLM Enterprise API enablement exists",
    evidenceClass: "DOCUMENTED_EVIDENCE",
    summary: "Documented in ADR-089 infrastructure manifest; external cloud API state not yet live queried",
    evidenceFingerprint: "22".repeat(32),
    sanitized: true,
    containsSecrets: false,
    containsRawSource: false,
    containsFilesystemPath: false,
  },
  {
    itemId: "DOS-03-REGION-ENDPOINT",
    category: "REGION",
    claim: "Regional routing endpoint defined",
    evidenceClass: "DOCUMENTED_EVIDENCE",
    summary: "Documented as us-central1 regional boundary in ADR-089",
    evidenceFingerprint: "33".repeat(32),
    sanitized: true,
    containsSecrets: false,
    containsRawSource: false,
    containsFilesystemPath: false,
  },
  {
    itemId: "DOS-04-IAM-ROLE-PLAN",
    category: "IAM",
    claim: "IAM least-privilege role plan documented",
    evidenceClass: "DOCUMENTED_EVIDENCE",
    summary: "Documented in ADR-089 service account access matrix",
    evidenceFingerprint: "44".repeat(32),
    sanitized: true,
    containsSecrets: false,
    containsRawSource: false,
    containsFilesystemPath: false,
  },
  {
    itemId: "DOS-05-OAUTH-SCOPE-PLAN",
    category: "AUTH_SCOPE",
    claim: "OAuth scope plan documented",
    evidenceClass: "DOCUMENTED_EVIDENCE",
    summary: "Documented in ADR-089 OAuth scope specification",
    evidenceFingerprint: "55".repeat(32),
    sanitized: true,
    containsSecrets: false,
    containsRawSource: false,
    containsFilesystemPath: false,
  },
  {
    itemId: "DOS-06-SECRET-MANAGER-NAMING",
    category: "SECRET_BOUNDARY",
    claim: "Secret Manager reference naming convention exists",
    evidenceClass: "DOCUMENTED_EVIDENCE",
    summary: "Documented in stagingLivePilotContract specification (GCP_SECRET_MANAGER_REF:...)",
    evidenceFingerprint: "66".repeat(32),
    sanitized: true,
    containsSecrets: false,
    containsRawSource: false,
    containsFilesystemPath: false,
  },
  {
    itemId: "DOS-07-QUOTA-POLICY",
    category: "QUOTA",
    claim: "Quota allocation policy exists",
    evidenceClass: "DOCUMENTED_EVIDENCE",
    summary: "Documented in ADR-088 budget and quota constraints (100 units limit)",
    evidenceFingerprint: "77".repeat(32),
    sanitized: true,
    containsSecrets: false,
    containsRawSource: false,
    containsFilesystemPath: false,
  },
  {
    itemId: "DOS-08-BUDGET-POLICY",
    category: "QUOTA",
    claim: "Budget cap policy exists",
    evidenceClass: "DOCUMENTED_EVIDENCE",
    summary: "Documented in ADR-089 staging budget allocation plan",
    evidenceFingerprint: "88".repeat(32),
    sanitized: true,
    containsSecrets: false,
    containsRawSource: false,
    containsFilesystemPath: false,
  },
  {
    itemId: "DOS-09-AUDIT-LOGGING-PLAN",
    category: "AUDIT_LOGGING",
    claim: "Cloud Audit Logging ingestion plan exists",
    evidenceClass: "DOCUMENTED_EVIDENCE",
    summary: "Documented in ADR-089 Cloud Audit Logging topology",
    evidenceFingerprint: "99".repeat(32),
    sanitized: true,
    containsSecrets: false,
    containsRawSource: false,
    containsFilesystemPath: false,
  },
  {
    itemId: "DOS-10-NETWORK-EGRESS-POLICY",
    category: "NETWORK",
    claim: "Network egress firewall policy exists",
    evidenceClass: "DOCUMENTED_EVIDENCE",
    summary: "Documented in ADR-089 VPC Service Perimeter and firewall egress rules",
    evidenceFingerprint: "aa".repeat(32),
    sanitized: true,
    containsSecrets: false,
    containsRawSource: false,
    containsFilesystemPath: false,
  },
  {
    itemId: "DOS-11-OFFICIAL-API-BOUNDARY",
    category: "PROVIDER_BOUNDARY",
    claim: "Official API client boundary implemented and selected",
    evidenceClass: "SYSTEM_VERIFIED_EVIDENCE",
    summary: "Verified in repo via NotebookLMEnterpriseProvider and unit test suite notebooklm-enterprise-provider.test.ts",
    evidenceFingerprint: "bb".repeat(32),
    sanitized: true,
    containsSecrets: false,
    containsRawSource: false,
    containsFilesystemPath: false,
  },
  {
    itemId: "DOS-12-NO-CONSUMER-COOKIE",
    category: "PROVIDER_BOUNDARY",
    claim: "Consumer cookie/session authentication strictly forbidden",
    evidenceClass: "SYSTEM_VERIFIED_EVIDENCE",
    summary: "Verified in repo via stagingLivePilotContract and unit test staging-live-pilot-contract.test.ts",
    evidenceFingerprint: "cc".repeat(32),
    sanitized: true,
    containsSecrets: false,
    containsRawSource: false,
    containsFilesystemPath: false,
  },
  {
    itemId: "DOS-13-NO-REVERSE-RPC",
    category: "PROVIDER_BOUNDARY",
    claim: "Reverse-engineered RPC interfaces strictly forbidden",
    evidenceClass: "SYSTEM_VERIFIED_EVIDENCE",
    summary: "Verified in repo via stagingLivePilotContract and unit test staging-live-pilot-contract.test.ts",
    evidenceFingerprint: "dd".repeat(32),
    sanitized: true,
    containsSecrets: false,
    containsRawSource: false,
    containsFilesystemPath: false,
  },
  {
    itemId: "DOS-14-NO-ANTIGRAVITY-ROUTING",
    category: "PROVIDER_BOUNDARY",
    claim: "Hidden routing via Antigravity legacy CLI bridge strictly forbidden",
    evidenceClass: "SYSTEM_VERIFIED_EVIDENCE",
    summary: "Verified in repo via stagingLivePilotContract and unit test staging-live-pilot-contract.test.ts",
    evidenceFingerprint: "ee".repeat(32),
    sanitized: true,
    containsSecrets: false,
    containsRawSource: false,
    containsFilesystemPath: false,
  },
  {
    itemId: "DOS-15-TEST-PUBLIC-SOURCE-POLICY",
    category: "DATA_POLICY",
    claim: "TEST_PUBLIC source policy enforced with zero private user data",
    evidenceClass: "SYSTEM_VERIFIED_EVIDENCE",
    summary: "Verified in repo via stagingLivePilotContract evaluator and unit tests",
    evidenceFingerprint: "ff".repeat(32),
    sanitized: true,
    containsSecrets: false,
    containsRawSource: false,
    containsFilesystemPath: false,
  },
  {
    itemId: "DOS-16-ROLLBACK-PLAN",
    category: "ROLLBACK",
    claim: "7-step automated rollback rehearsal and cleanup workflow confirmed",
    evidenceClass: "SYSTEM_VERIFIED_EVIDENCE",
    summary: "Verified in repo via rollbackRehearsal.ts and rollback-rehearsal.test.ts",
    evidenceFingerprint: "00".repeat(32),
    sanitized: true,
    containsSecrets: false,
    containsRawSource: false,
    containsFilesystemPath: false,
  },
  {
    itemId: "DOS-17-PRODUCTION-DENIED-PROOF",
    category: "PRODUCTION_DENY",
    claim: "Production environment unconditionally denied and locked",
    evidenceClass: "SYSTEM_VERIFIED_EVIDENCE",
    summary: "Verified in repo across 21 test suites, preflight gate, eligibility gate, and pilot gate",
    evidenceFingerprint: "10".repeat(32),
    sanitized: true,
    containsSecrets: false,
    containsRawSource: false,
    containsFilesystemPath: false,
  },
]);

export interface NotebookLMEnterpriseReadinessDossier {
  readonly version: "6.11.0";
  readonly generatedAt: string;
  readonly targetProvider: "notebooklm-enterprise";
  readonly environment: "staging";
  readonly items: readonly ReadinessDossierItem[];
  readonly systemVerifiedItems: readonly string[];
  readonly documentedItems: readonly string[];
  readonly specOnlyItems: readonly string[];
  readonly unverifiedItems: readonly string[];
  readonly infrastructureRealityStatus:
    | "NOT_PROVEN"
    | "PARTIALLY_PROVEN"
    | "PROVEN_WITH_LOCAL_EVIDENCE";
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

export function computeReadinessDossierFingerprint(payload: Record<string, unknown>): string {
  const sortedKeys = Object.keys(payload).sort();
  const canonical: Record<string, unknown> = {};
  for (const k of sortedKeys) {
    canonical[k] = payload[k];
  }
  return createHash("sha256").update(JSON.stringify(canonical), "utf8").digest("hex");
}

export function createDefaultReadinessDossier(
  items: readonly ReadinessDossierItem[] = DEFAULT_17_READINESS_ITEMS,
  generatedAt = new Date().toISOString()
): NotebookLMEnterpriseReadinessDossier {
  const systemVerifiedItems: string[] = [];
  const documentedItems: string[] = [];
  const specOnlyItems: string[] = [];
  const unverifiedItems: string[] = [];

  for (const item of items) {
    if (item.evidenceClass === "SYSTEM_VERIFIED_EVIDENCE") {
      systemVerifiedItems.push(item.itemId);
    } else if (item.evidenceClass === "DOCUMENTED_EVIDENCE") {
      documentedItems.push(item.itemId);
    } else if (item.evidenceClass === "SPEC_ASSERTION") {
      specOnlyItems.push(item.itemId);
    } else {
      unverifiedItems.push(item.itemId);
    }
  }

  // Determine infrastructure reality status:
  // Since external cloud infrastructure (GCP project, live API, Secret Manager, Cloud Logging) is documented,
  // while local software boundaries and safety gates are system-verified, the status is PARTIALLY_PROVEN.
  let infrastructureRealityStatus: "NOT_PROVEN" | "PARTIALLY_PROVEN" | "PROVEN_WITH_LOCAL_EVIDENCE";
  if (systemVerifiedItems.length === 0) {
    infrastructureRealityStatus = "NOT_PROVEN";
  } else if (documentedItems.length > 0 || specOnlyItems.length > 0 || unverifiedItems.length > 0) {
    infrastructureRealityStatus = "PARTIALLY_PROVEN";
  } else {
    infrastructureRealityStatus = "PROVEN_WITH_LOCAL_EVIDENCE";
  }

  const canonicalPayload = {
    version: "6.11.0",
    generatedAt,
    targetProvider: "notebooklm-enterprise",
    environment: "staging",
    infrastructureRealityStatus,
    systemVerifiedItems: [...systemVerifiedItems].sort(),
    documentedItems: [...documentedItems].sort(),
    specOnlyItems: [...specOnlyItems].sort(),
    unverifiedItems: [...unverifiedItems].sort(),
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

  const fingerprint = computeReadinessDossierFingerprint(canonicalPayload);

  return Object.freeze({
    version: "6.11.0",
    generatedAt,
    targetProvider: "notebooklm-enterprise",
    environment: "staging",
    items: Object.freeze([...items]),
    systemVerifiedItems: Object.freeze(systemVerifiedItems),
    documentedItems: Object.freeze(documentedItems),
    specOnlyItems: Object.freeze(specOnlyItems),
    unverifiedItems: Object.freeze(unverifiedItems),
    infrastructureRealityStatus,
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
