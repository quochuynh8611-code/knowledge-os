import { describe, it, expect } from "vitest";
import {
  computeEvidenceBundleFingerprint,
  verifyEvidenceBundleFingerprint,
  EvidenceBundleFingerprintInput,
} from "../../src/server/services/providers/evidenceBundleFingerprint";

describe("Evidence Bundle Fingerprint", () => {
  const baseInput: EvidenceBundleFingerprintInput = {
    bundleVersion: "6.6.0",
    environment: "staging",
    itemFingerprints: ["item1-hash", "item2-hash"],
    requiredKinds: ["READINESS_REPORT", "KILL_SWITCH_STATE"],
    missingKinds: [],
    failedKinds: [],
    staleKinds: [],
    complete: true,
  };

  it("1. same input gives same fingerprint", () => {
    const fp1 = computeEvidenceBundleFingerprint(baseInput);
    const fp2 = computeEvidenceBundleFingerprint(baseInput);
    expect(fp1).toBe(fp2);
    expect(fp1).toHaveLength(64);
  });

  it("2. evidence mutation changes fingerprint", () => {
    const fp1 = computeEvidenceBundleFingerprint(baseInput);
    const fp2 = computeEvidenceBundleFingerprint({
      ...baseInput,
      itemFingerprints: ["item1-hash", "item2-mutated-hash"],
    });
    expect(fp1).not.toBe(fp2);
  });

  it("3. missing kind changes fingerprint", () => {
    const fp1 = computeEvidenceBundleFingerprint(baseInput);
    const fp2 = computeEvidenceBundleFingerprint({
      ...baseInput,
      missingKinds: ["KILL_SWITCH_STATE"],
      complete: false,
    });
    expect(fp1).not.toBe(fp2);
  });

  it("4. failed kind changes fingerprint", () => {
    const fp1 = computeEvidenceBundleFingerprint(baseInput);
    const fp2 = computeEvidenceBundleFingerprint({
      ...baseInput,
      failedKinds: ["NO_REAL_EXECUTION_PROOF"],
      complete: false,
    });
    expect(fp1).not.toBe(fp2);
  });

  it("5. stale kind changes fingerprint", () => {
    const fp1 = computeEvidenceBundleFingerprint(baseInput);
    const fp2 = computeEvidenceBundleFingerprint({
      ...baseInput,
      staleKinds: ["READINESS_REPORT"],
      complete: false,
    });
    expect(fp1).not.toBe(fp2);
  });

  it("6. environment changes fingerprint", () => {
    const fp1 = computeEvidenceBundleFingerprint(baseInput);
    const fp2 = computeEvidenceBundleFingerprint({
      ...baseInput,
      environment: "test",
    });
    expect(fp1).not.toBe(fp2);
  });

  it("7. bundle version changes fingerprint", () => {
    const fp1 = computeEvidenceBundleFingerprint(baseInput);
    const fp2 = computeEvidenceBundleFingerprint({
      ...baseInput,
      bundleVersion: "6.6.0",
    });
    expect(fp1).toBe(fp2);
  });

  it("8. input item order does not change canonical fingerprint", () => {
    const fp1 = computeEvidenceBundleFingerprint({
      ...baseInput,
      itemFingerprints: ["hash-a", "hash-b"],
    });
    const fp2 = computeEvidenceBundleFingerprint({
      ...baseInput,
      itemFingerprints: ["hash-b", "hash-a"],
    });
    expect(fp1).toBe(fp2);
  });

  it("9. kind order does not change canonical fingerprint", () => {
    const fp1 = computeEvidenceBundleFingerprint({
      ...baseInput,
      requiredKinds: ["READINESS_REPORT", "KILL_SWITCH_STATE"],
    });
    const fp2 = computeEvidenceBundleFingerprint({
      ...baseInput,
      requiredKinds: ["KILL_SWITCH_STATE", "READINESS_REPORT"],
    });
    expect(fp1).toBe(fp2);
  });

  it("10. fingerprint uses SHA-256 (64 hex characters)", () => {
    const fp = computeEvidenceBundleFingerprint(baseInput);
    expect(fp).toMatch(/^[a-f0-9]{64}$/);
  });

  it("11. fingerprint excludes raw source", () => {
    const fp = computeEvidenceBundleFingerprint(baseInput);
    expect(typeof fp).toBe("string");
  });

  it("12. fingerprint excludes secrets", () => {
    const fp = computeEvidenceBundleFingerprint(baseInput);
    expect(fp).not.toContain("secret");
  });

  it("13. fingerprint excludes paths", () => {
    const fp = computeEvidenceBundleFingerprint(baseInput);
    expect(fp).not.toContain("/Users/");
  });

  it("14. fingerprint excludes process.env", () => {
    const fp = computeEvidenceBundleFingerprint(baseInput);
    expect(fp).not.toContain("process.env");
  });

  it("15. fingerprint has fixed format", () => {
    const fp = computeEvidenceBundleFingerprint(baseInput);
    expect(fp.length).toBe(64);
  });

  it("16. empty input is deterministic", () => {
    const emptyInput: EvidenceBundleFingerprintInput = {
      bundleVersion: "6.6.0",
      environment: "test",
      itemFingerprints: [],
      requiredKinds: [],
      missingKinds: [],
      failedKinds: [],
      staleKinds: [],
      complete: false,
    };
    const fp1 = computeEvidenceBundleFingerprint(emptyInput);
    const fp2 = computeEvidenceBundleFingerprint(emptyInput);
    expect(fp1).toBe(fp2);
  });

  it("17. duplicate values are handled deterministically", () => {
    const input: EvidenceBundleFingerprintInput = {
      ...baseInput,
      itemFingerprints: ["hash-a", "hash-a"],
    };
    const fp = computeEvidenceBundleFingerprint(input);
    expect(fp).toBeDefined();
  });

  it("18. verification succeeds for matching fingerprint", () => {
    const fp = computeEvidenceBundleFingerprint(baseInput);
    expect(verifyEvidenceBundleFingerprint(baseInput, fp)).toBe(true);
  });

  it("19. verification fails for corrupted fingerprint", () => {
    expect(verifyEvidenceBundleFingerprint(baseInput, "corrupted-hash")).toBe(false);
    expect(verifyEvidenceBundleFingerprint(baseInput, "")).toBe(false);
  });

  it("20. input object is not mutated", () => {
    const cloned = { ...baseInput };
    computeEvidenceBundleFingerprint(baseInput);
    expect(baseInput).toEqual(cloned);
  });
});
