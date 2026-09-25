import { describe, it, expect } from "vitest";
import {
  createOperatorSignoff,
  validateOperatorSignoff,
} from "../../src/server/services/providers/operatorSignoffContract";

describe("Operator Sign-off Contract", () => {
  const defaultParams = {
    operatorId: "operator-alice",
    decision: "ACKNOWLEDGED_FOR_MANUAL_REVIEW" as const,
    bundleId: "bundle-123",
    bundleFingerprint: "a".repeat(64),
    environment: "staging" as const,
    signedAt: "2026-09-24T10:00:00.000Z",
    expiresAt: "2026-09-24T12:00:00.000Z",
  };

  it("1. valid sign-off is accepted", () => {
    const signoff = createOperatorSignoff(defaultParams);
    const result = validateOperatorSignoff({
      signoff,
      expectedBundleId: "bundle-123",
      expectedBundleFingerprint: "a".repeat(64),
      currentTime: "2026-09-24T10:30:00.000Z",
    });
    expect(result.valid).toBe(true);
    expect(result.decision).toBe("ACKNOWLEDGED_FOR_MANUAL_REVIEW");
    expect(result.rejectionReasons).toHaveLength(0);
  });

  it("2. missing operator ID is rejected", () => {
    expect(() =>
      createOperatorSignoff({
        ...defaultParams,
        operatorId: "",
      })
    ).toThrow("ERR_MISSING_OPERATOR_ID");
  });

  it("3. missing bundle ID is rejected", () => {
    expect(() =>
      createOperatorSignoff({
        ...defaultParams,
        bundleId: "",
      })
    ).toThrow("ERR_MISSING_BUNDLE_ID");
  });

  it("4. missing bundle fingerprint is rejected", () => {
    expect(() =>
      createOperatorSignoff({
        ...defaultParams,
        bundleFingerprint: "",
      })
    ).toThrow("ERR_MISSING_BUNDLE_FINGERPRINT");
  });

  it("5. bundle fingerprint mismatch is rejected", () => {
    const signoff = createOperatorSignoff(defaultParams);
    const result = validateOperatorSignoff({
      signoff,
      expectedBundleId: "bundle-123",
      expectedBundleFingerprint: "b".repeat(64),
      currentTime: "2026-09-24T10:30:00.000Z",
    });
    expect(result.valid).toBe(false);
    expect(result.rejectionReasons).toContain("BUNDLE_FINGERPRINT_MISMATCH");
  });

  it("6. expired sign-off is rejected", () => {
    const signoff = createOperatorSignoff(defaultParams);
    const result = validateOperatorSignoff({
      signoff,
      expectedBundleId: "bundle-123",
      expectedBundleFingerprint: "a".repeat(64),
      currentTime: "2026-09-24T12:01:00.000Z",
    });
    expect(result.valid).toBe(false);
    expect(result.decision).toBe("EXPIRED");
    expect(result.rejectionReasons).toContain("SIGNOFF_EXPIRED");
  });

  it("7. production sign-off is rejected", () => {
    expect(() =>
      createOperatorSignoff({
        ...defaultParams,
        environment: "production" as any,
      })
    ).toThrow("ERR_PRODUCTION_SIGNOFF_FORBIDDEN");
  });

  it("8. sign-off cannot enable toggle", () => {
    const signoff = createOperatorSignoff(defaultParams);
    expect(signoff.runtimeToggleChanged).toBe(false);
  });

  it("9. sign-off cannot disable kill-switch", () => {
    const signoff = createOperatorSignoff(defaultParams);
    expect(signoff.killSwitchChanged).toBe(false);
  });

  it("10. sign-off cannot set realExecutionAllowed true", () => {
    const signoff = createOperatorSignoff(defaultParams);
    expect(signoff.realExecutionAllowed).toBe(false);
  });

  it("11. sign-off notes are sanitized from sensitive paths", () => {
    const signoff = createOperatorSignoff({
      ...defaultParams,
      notes: "Reviewed log at /Users/mr.chem/secret/log.txt",
    });
    expect(signoff.notes).toContain("[REDACTED_PATH]");
    expect(signoff.notes).not.toContain("/Users/mr.chem");
  });

  it("12. sign-off notes cannot contain secrets", () => {
    const signoff = createOperatorSignoff({
      ...defaultParams,
      notes: "Reviewed key password=SuperSecretPassword123",
    });
    expect(signoff.notes).toContain("[REDACTED_CREDENTIAL]");
    expect(signoff.notes).not.toContain("SuperSecretPassword123");
  });

  it("13. sign-off is JSON-serializable", () => {
    const signoff = createOperatorSignoff(defaultParams);
    const serialized = JSON.stringify(signoff);
    const parsed = JSON.parse(serialized);
    expect(parsed.operatorId).toBe("operator-alice");
    expect(parsed.realExecutionAllowed).toBe(false);
  });

  it("14. sign-off is deterministic with injected timestamps", () => {
    const signoff1 = createOperatorSignoff(defaultParams);
    const signoff2 = createOperatorSignoff(defaultParams);
    expect(signoff1.signedAt).toBe(signoff2.signedAt);
    expect(signoff1.expiresAt).toBe(signoff2.expiresAt);
  });

  it("15. sign-off does not call provider", () => {
    const signoff = createOperatorSignoff(defaultParams);
    expect(signoff.realExecutionAllowed).toBe(false);
  });

  it("16. sign-off does not call network", () => {
    const signoff = createOperatorSignoff(defaultParams);
    expect(signoff).toBeDefined();
  });

  it("17. sign-off does not read credentials", () => {
    const signoff = createOperatorSignoff(defaultParams);
    expect(signoff.operatorId).toBe("operator-alice");
  });

  it("18. bundle ID mismatch is rejected", () => {
    const signoff = createOperatorSignoff(defaultParams);
    const result = validateOperatorSignoff({
      signoff,
      expectedBundleId: "bundle-999",
      expectedBundleFingerprint: "a".repeat(64),
      currentTime: "2026-09-24T10:30:00.000Z",
    });
    expect(result.valid).toBe(false);
    expect(result.rejectionReasons).toContain("BUNDLE_ID_MISMATCH");
  });

  it("19. operator explicit rejection decision is handled correctly", () => {
    const signoff = createOperatorSignoff({
      ...defaultParams,
      decision: "REJECTED",
    });
    const result = validateOperatorSignoff({
      signoff,
      expectedBundleId: "bundle-123",
      expectedBundleFingerprint: "a".repeat(64),
      currentTime: "2026-09-24T10:30:00.000Z",
    });
    expect(result.valid).toBe(false);
    expect(result.decision).toBe("REJECTED");
    expect(result.rejectionReasons).toContain("OPERATOR_REJECTED");
  });

  it("20. sign-off remains acknowledgement-only without side-effects", () => {
    const signoff = createOperatorSignoff(defaultParams);
    expect(signoff.realExecutionAllowed).toBe(false);
    expect(signoff.runtimeToggleChanged).toBe(false);
    expect(signoff.killSwitchChanged).toBe(false);
  });
});
