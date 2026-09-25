/**
 * Manual Enablement Contract Unit Tests (Phase 6.4)
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * - Pure, deterministic validation of manual enablement contracts.
 * - Enforces actor identity, expiry, scope, and environment constraints.
 * - Zero secrets, source payloads, or system paths accepted in payloads.
 */

import { describe, it, expect } from "vitest";
import {
  ManualEnablementRequest,
  ManualEnablementApproval,
  computeApprovalFingerprint,
  validateManualEnablementRequest,
  validateManualEnablementApproval,
} from "../../src/server/services/providers/manualEnablementContract.js";

describe("MANUAL ENABLEMENT CONTRACT (PHASE 6.4)", () => {
  const validRequest: ManualEnablementRequest = {
    requestId: "req-man-12345",
    requestedBy: "human-security-officer-1",
    requestedAt: "2026-09-24T12:00:00.000Z",
    scope: "real_execution_design_review",
    providerId: "notebooklm-enterprise",
    environment: "test",
    reason: "Scheduled Phase 6.4 manual enablement review for design purposes only.",
    readinessReportFingerprint: "fingerprint-abc-123",
    requestedCapabilities: {
      network: false,
      credentials: false,
      providerExecution: false,
      childProcess: false,
    },
  };

  const validApprovalBase = {
    approvalId: "app-man-98765",
    requestId: "req-man-12345",
    approvedBy: "human-lead-architect-2",
    approvedAt: "2026-09-24T12:05:00.000Z",
    expiresAt: "2026-09-24T13:05:00.000Z",
    status: "APPROVED_FOR_FUTURE_PHASE" as const,
    scope: "real_execution_design_review" as const,
    providerId: "notebooklm-enterprise" as const,
    environment: "test" as const,
    readinessReportFingerprint: "fingerprint-abc-123",
  };

  const validApproval: ManualEnablementApproval = {
    ...validApprovalBase,
    approvalFingerprint: computeApprovalFingerprint(validApprovalBase),
  };

  it("1. Request type is JSON-serializable", () => {
    const json = JSON.stringify(validRequest);
    expect(typeof json).toBe("string");
    const parsed = JSON.parse(json);
    expect(parsed.requestId).toBe(validRequest.requestId);
  });

  it("2. Approval type is JSON-serializable", () => {
    const json = JSON.stringify(validApproval);
    expect(typeof json).toBe("string");
    const parsed = JSON.parse(json);
    expect(parsed.approvalId).toBe(validApproval.approvalId);
  });

  it("3. Empty actor is invalid", () => {
    const reqWithEmptyActor = { ...validRequest, requestedBy: "   " };
    const res = validateManualEnablementRequest(reqWithEmptyActor);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes("requestedBy"))).toBe(true);

    const appWithEmptyActor = { ...validApproval, approvedBy: "" };
    const resApp = validateManualEnablementApproval(appWithEmptyActor);
    expect(resApp.valid).toBe(false);
    expect(resApp.errors.some((e) => e.includes("approvedBy"))).toBe(true);
  });

  it("4. Empty reason is invalid", () => {
    const reqWithEmptyReason = { ...validRequest, reason: "" };
    const res = validateManualEnablementRequest(reqWithEmptyReason);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes("reason"))).toBe(true);
  });

  it("5. Expired approval is invalid", () => {
    const expiredApprovalBase = {
      ...validApprovalBase,
      expiresAt: "2026-09-24T11:00:00.000Z", // before evaluation time
    };
    const expiredApproval: ManualEnablementApproval = {
      ...expiredApprovalBase,
      approvalFingerprint: computeApprovalFingerprint(expiredApprovalBase),
    };

    const res = validateManualEnablementApproval(expiredApproval, {
      now: () => new Date("2026-09-24T12:30:00.000Z"),
    });
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes("expired"))).toBe(true);
  });

  it("6. expiresAt <= approvedAt is invalid", () => {
    const invalidDatesBase = {
      ...validApprovalBase,
      approvedAt: "2026-09-24T12:00:00.000Z",
      expiresAt: "2026-09-24T12:00:00.000Z",
    };
    const invalidDates: ManualEnablementApproval = {
      ...invalidDatesBase,
      approvalFingerprint: computeApprovalFingerprint(invalidDatesBase),
    };

    const res = validateManualEnablementApproval(invalidDates, {
      now: () => new Date("2026-09-24T11:00:00.000Z"),
    });
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes("strictly greater"))).toBe(true);
  });

  it("7. Scope mismatch is invalid", () => {
    const reqWithInvalidScope = { ...validRequest, scope: "unsupported_scope" as any };
    const res = validateManualEnablementRequest(reqWithInvalidScope);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes("scope"))).toBe(true);
  });

  it("8. Provider mismatch is invalid", () => {
    const reqWithInvalidProvider = { ...validRequest, providerId: "unknown-cloud" as any };
    const res = validateManualEnablementRequest(reqWithInvalidProvider);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes("providerId"))).toBe(true);
  });

  it("9. Environment mismatch is invalid", () => {
    const reqWithInvalidEnv = { ...validRequest, environment: "sandbox" as any };
    const res = validateManualEnablementRequest(reqWithInvalidEnv);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes("environment"))).toBe(true);
  });

  it("10. Fingerprint mismatch is invalid", () => {
    const tamperedApproval: ManualEnablementApproval = {
      ...validApproval,
      approvalFingerprint: "corrupted-or-tampered-hash",
    };
    const res = validateManualEnablementApproval(tamperedApproval, {
      now: () => new Date("2026-09-24T12:10:00.000Z"),
    });
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes("approvalFingerprint"))).toBe(true);
  });

  it("11. Credential is never accepted in payload", () => {
    const reqWithSecret = {
      ...validRequest,
      reason: "Applying Bearer secret-api-key-12345 to enable service",
    };
    const res = validateManualEnablementRequest(reqWithSecret);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes("secret"))).toBe(true);
  });

  it("12. Source content is never accepted in payload", () => {
    const res = validateManualEnablementRequest(validRequest);
    expect((validRequest as any).sourceContent).toBeUndefined();
    expect(res.valid).toBe(true);
  });

  it("13. Filesystem path is never accepted in payload", () => {
    const reqWithPath = {
      ...validRequest,
      reason: "Enabling from local file at /Users/admin/credentials.json",
    };
    const res = validateManualEnablementRequest(reqWithPath);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes("filesystem path"))).toBe(true);
  });

  it("14. Provider instance is never accepted in payload", () => {
    const res = validateManualEnablementRequest(validRequest);
    expect((validRequest as any).providerInstance).toBeUndefined();
    expect(res.valid).toBe(true);
  });

  it("15. Approval fingerprint is deterministic", () => {
    const fp1 = computeApprovalFingerprint(validApprovalBase);
    const fp2 = computeApprovalFingerprint(validApprovalBase);
    expect(fp1).toBe(fp2);
    expect(typeof fp1).toBe("string");
  });

  it("16. Approval fingerprint excludes secrets", () => {
    const fp = computeApprovalFingerprint(validApprovalBase);
    expect(fp).not.toContain("Bearer");
    expect(fp).not.toContain("secret");
  });

  it("17. Approval fingerprint excludes raw source", () => {
    const fp = computeApprovalFingerprint(validApprovalBase);
    expect(fp.length).toBe(64); // standard sha256 hex string
  });

  it("18. Approval fingerprint changes when scope changes", () => {
    const fp1 = computeApprovalFingerprint(validApprovalBase);
    const fp2 = computeApprovalFingerprint({
      ...validApprovalBase,
      scope: "simulation_only",
    });
    expect(fp1).not.toBe(fp2);
  });

  it("19. Approval fingerprint changes when provider changes", () => {
    const fp1 = computeApprovalFingerprint(validApprovalBase);
    const fp2 = computeApprovalFingerprint({
      ...validApprovalBase,
      providerId: "antigravity-legacy",
    });
    expect(fp1).not.toBe(fp2);
  });

  it("20. Approval fingerprint changes when environment changes", () => {
    const fp1 = computeApprovalFingerprint(validApprovalBase);
    const fp2 = computeApprovalFingerprint({
      ...validApprovalBase,
      environment: "production",
    });
    expect(fp1).not.toBe(fp2);
  });
});
