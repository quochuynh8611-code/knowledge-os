import { describe, it, expect } from "vitest";
import { createHash } from "crypto";
import {
  ALL_REQUIRED_EVIDENCE_KINDS,
  createPreflightEvidenceItem,
  createPreflightEvidenceBundle,
} from "../../src/server/services/providers/operatorPreflightEvidence";
import {
  createOperatorSignoff,
  validateOperatorSignoff,
} from "../../src/server/services/providers/operatorSignoffContract";
import { simulateRollbackRehearsal } from "../../src/server/services/providers/rollbackRehearsal";
import { evaluateOperatorPreflightGate } from "../../src/server/services/providers/preflightGate";

export type VerificationCheckStatus =
  | "PASS"
  | "FAIL"
  | "BLOCKED"
  | "NOT_RUN";

export interface VerificationCheck {
  readonly checkId: string;
  readonly category:
    | "TYPECHECK"
    | "UNIT_TEST"
    | "REGRESSION"
    | "BOUNDARY"
    | "DEFAULT_DENY"
    | "SECRET_SAFETY"
    | "NETWORK_SAFETY"
    | "PROVIDER_SAFETY"
    | "GIT_SCOPE"
    | "DOCUMENTATION";
  readonly status: VerificationCheckStatus;
  readonly summary: string;
  readonly evidenceFingerprint: string;
  readonly sanitized: true;
  readonly containsSecrets: false;
  readonly containsRawSource: false;
  readonly realExecutionAllowed: false;
}

export interface Phase67VerificationReport {
  readonly reportVersion: "6.7.0";
  readonly generatedAt: string;
  readonly repositoryRoot: string;
  readonly checks: readonly VerificationCheck[];
  readonly passedChecks: readonly string[];
  readonly failedChecks: readonly string[];
  readonly blockedChecks: readonly string[];
  readonly notRunChecks: readonly string[];
  readonly overallStatus: "PASS" | "BLOCKED";
  readonly releaseFrozen: true;
  readonly realExecutionAllowed: false;
  readonly networkAllowed: false;
  readonly credentialsAllowed: false;
  readonly childProcessAllowed: false;
  readonly sideEffectsAllowed: false;
  readonly controlledExecutionEnabled: false;
  readonly killSwitchActive: true;
  readonly fingerprint: string;
}

export function createVerificationReport(checks: readonly VerificationCheck[], generatedAt = "2026-09-24T12:00:00.000Z"): Phase67VerificationReport {
  const passedChecks: string[] = [];
  const failedChecks: string[] = [];
  const blockedChecks: string[] = [];
  const notRunChecks: string[] = [];

  for (const check of checks) {
    if (check.status === "PASS") {
      passedChecks.push(check.checkId);
    } else if (check.status === "FAIL") {
      failedChecks.push(check.checkId);
    } else if (check.status === "BLOCKED") {
      blockedChecks.push(check.checkId);
    } else {
      notRunChecks.push(check.checkId);
    }
  }

  const overallStatus: "PASS" | "BLOCKED" =
    failedChecks.length === 0 && blockedChecks.length === 0 && notRunChecks.length === 0 && checks.length > 0
      ? "PASS"
      : "BLOCKED";

  const canonicalPayload = {
    reportVersion: "6.7.0",
    generatedAt,
    repositoryRoot: "/Users/mr.chem/Documents/Lap-trinh/Dashboard-update",
    overallStatus,
    releaseFrozen: true,
    passedChecks: [...passedChecks].sort(),
    failedChecks: [...failedChecks].sort(),
    blockedChecks: [...blockedChecks].sort(),
    notRunChecks: [...notRunChecks].sort(),
    realExecutionAllowed: false,
    networkAllowed: false,
    credentialsAllowed: false,
    childProcessAllowed: false,
    sideEffectsAllowed: false,
    controlledExecutionEnabled: false,
    killSwitchActive: true,
  };

  const fingerprint = createHash("sha256").update(JSON.stringify(canonicalPayload), "utf8").digest("hex");

  return Object.freeze({
    reportVersion: "6.7.0",
    generatedAt,
    repositoryRoot: "/Users/mr.chem/Documents/Lap-trinh/Dashboard-update",
    checks: Object.freeze(checks),
    passedChecks: Object.freeze(passedChecks),
    failedChecks: Object.freeze(failedChecks),
    blockedChecks: Object.freeze(blockedChecks),
    notRunChecks: Object.freeze(notRunChecks),
    overallStatus,
    releaseFrozen: true,
    realExecutionAllowed: false,
    networkAllowed: false,
    credentialsAllowed: false,
    childProcessAllowed: false,
    sideEffectsAllowed: false,
    controlledExecutionEnabled: false,
    killSwitchActive: true,
    fingerprint,
  });
}

describe("Phase 6.7 — Post-Implementation Verification Report Contract", () => {
  const sampleChecks: VerificationCheck[] = [
    {
      checkId: "CHK-01-TYPECHECK",
      category: "TYPECHECK",
      status: "PASS",
      summary: "TypeScript tsc compilation clean with zero errors",
      evidenceFingerprint: "a".repeat(64),
      sanitized: true,
      containsSecrets: false,
      containsRawSource: false,
      realExecutionAllowed: false,
    },
    {
      checkId: "CHK-02-UNIT-TESTS",
      category: "UNIT_TEST",
      status: "PASS",
      summary: "All 10 Phase 6.6 test suites pass with 215 tests",
      evidenceFingerprint: "b".repeat(64),
      sanitized: true,
      containsSecrets: false,
      containsRawSource: false,
      realExecutionAllowed: false,
    },
    {
      checkId: "CHK-03-REGRESSION",
      category: "REGRESSION",
      status: "PASS",
      summary: "All 44 regression suites pass with 800 tests",
      evidenceFingerprint: "c".repeat(64),
      sanitized: true,
      containsSecrets: false,
      containsRawSource: false,
      realExecutionAllowed: false,
    },
    {
      checkId: "CHK-04-BOUNDARY",
      category: "BOUNDARY",
      status: "PASS",
      summary: "Grep confirms zero provider, network, subprocess, or secret imports in preflight modules",
      evidenceFingerprint: "d".repeat(64),
      sanitized: true,
      containsSecrets: false,
      containsRawSource: false,
      realExecutionAllowed: false,
    },
    {
      checkId: "CHK-05-DEFAULT-DENY",
      category: "DEFAULT_DENY",
      status: "PASS",
      summary: "Kill switch active and controlled execution toggle disabled",
      evidenceFingerprint: "e".repeat(64),
      sanitized: true,
      containsSecrets: false,
      containsRawSource: false,
      realExecutionAllowed: false,
    },
  ];

  it("1. builds a valid PASS report when all checks pass", () => {
    const report = createVerificationReport(sampleChecks);
    expect(report.overallStatus).toBe("PASS");
    expect(report.releaseFrozen).toBe(true);
    expect(report.realExecutionAllowed).toBe(false);
    expect(report.controlledExecutionEnabled).toBe(false);
    expect(report.killSwitchActive).toBe(true);
    expect(report.fingerprint).toHaveLength(64);
  });

  it("2. fails closed with BLOCKED status if any check fails", () => {
    const failedChecks: VerificationCheck[] = [
      ...sampleChecks,
      {
        checkId: "CHK-06-FAIL",
        category: "PROVIDER_SAFETY",
        status: "FAIL",
        summary: "Simulated failure",
        evidenceFingerprint: "f".repeat(64),
        sanitized: true,
        containsSecrets: false,
        containsRawSource: false,
        realExecutionAllowed: false,
      },
    ];
    const report = createVerificationReport(failedChecks);
    expect(report.overallStatus).toBe("BLOCKED");
    expect(report.failedChecks).toContain("CHK-06-FAIL");
  });

  it("3. fails closed with BLOCKED status if any check is BLOCKED", () => {
    const blockedChecks: VerificationCheck[] = [
      ...sampleChecks,
      {
        checkId: "CHK-07-BLOCKED",
        category: "NETWORK_SAFETY",
        status: "BLOCKED",
        summary: "Blocked check",
        evidenceFingerprint: "g".repeat(64),
        sanitized: true,
        containsSecrets: false,
        containsRawSource: false,
        realExecutionAllowed: false,
      },
    ];
    const report = createVerificationReport(blockedChecks);
    expect(report.overallStatus).toBe("BLOCKED");
    expect(report.blockedChecks).toContain("CHK-07-BLOCKED");
  });

  it("4. fails closed with BLOCKED status if any check is NOT_RUN", () => {
    const notRunChecks: VerificationCheck[] = [
      ...sampleChecks,
      {
        checkId: "CHK-08-NOT-RUN",
        category: "GIT_SCOPE",
        status: "NOT_RUN",
        summary: "Not run check",
        evidenceFingerprint: "h".repeat(64),
        sanitized: true,
        containsSecrets: false,
        containsRawSource: false,
        realExecutionAllowed: false,
      },
    ];
    const report = createVerificationReport(notRunChecks);
    expect(report.overallStatus).toBe("BLOCKED");
    expect(report.notRunChecks).toContain("CHK-08-NOT-RUN");
  });

  it("5. verification report is JSON-serializable", () => {
    const report = createVerificationReport(sampleChecks);
    const json = JSON.stringify(report);
    const parsed = JSON.parse(json);
    expect(parsed.reportVersion).toBe("6.7.0");
    expect(parsed.releaseFrozen).toBe(true);
  });

  it("6. report fingerprint is deterministic with fixed timestamp", () => {
    const r1 = createVerificationReport(sampleChecks, "2026-09-24T12:00:00.000Z");
    const r2 = createVerificationReport(sampleChecks, "2026-09-24T12:00:00.000Z");
    expect(r1.fingerprint).toBe(r2.fingerprint);
  });

  it("7. report preserves immutable safety flags", () => {
    const report = createVerificationReport(sampleChecks);
    expect(report.realExecutionAllowed).toBe(false);
    expect(report.networkAllowed).toBe(false);
    expect(report.credentialsAllowed).toBe(false);
    expect(report.childProcessAllowed).toBe(false);
    expect(report.sideEffectsAllowed).toBe(false);
  });
});
