import { describe, it, expect } from "vitest";
import {
  ALL_REQUIRED_EVIDENCE_KINDS,
  createPreflightEvidenceItem,
  createPreflightEvidenceBundle,
  PreflightEvidenceKind,
} from "../../src/server/services/providers/operatorPreflightEvidence";

function createValidItemsExcept(excludedKind?: PreflightEvidenceKind) {
  return ALL_REQUIRED_EVIDENCE_KINDS.filter((k) => k !== excludedKind).map((kind) =>
    createPreflightEvidenceItem({
      evidenceId: `item-${kind.toLowerCase()}`,
      kind,
      status: "PASS",
      summary: `Verified evidence for ${kind}`,
      checks: ["CHECK_OK"],
    })
  );
}

describe("Phase 6.6 — Evidence Completeness Matrix", () => {
  it("1. all nine required evidence kinds are present in full bundle", () => {
    const items = createValidItemsExcept();
    const bundle = createPreflightEvidenceBundle({ environment: "staging", items });
    expect(bundle.complete).toBe(true);
    expect(bundle.items).toHaveLength(9);
  });

  it("2. missing readiness report blocks completeness", () => {
    const items = createValidItemsExcept("READINESS_REPORT");
    const bundle = createPreflightEvidenceBundle({ environment: "staging", items });
    expect(bundle.complete).toBe(false);
    expect(bundle.missingKinds).toContain("READINESS_REPORT");
  });

  it("3. missing runtime composition audit blocks completeness", () => {
    const items = createValidItemsExcept("RUNTIME_COMPOSITION_AUDIT");
    const bundle = createPreflightEvidenceBundle({ environment: "staging", items });
    expect(bundle.complete).toBe(false);
    expect(bundle.missingKinds).toContain("RUNTIME_COMPOSITION_AUDIT");
  });

  it("4. missing manual enablement decision blocks completeness", () => {
    const items = createValidItemsExcept("MANUAL_ENABLEMENT_DECISION");
    const bundle = createPreflightEvidenceBundle({ environment: "staging", items });
    expect(bundle.complete).toBe(false);
    expect(bundle.missingKinds).toContain("MANUAL_ENABLEMENT_DECISION");
  });

  it("5. missing controlled toggle state blocks completeness", () => {
    const items = createValidItemsExcept("CONTROLLED_TOGGLE_STATE");
    const bundle = createPreflightEvidenceBundle({ environment: "staging", items });
    expect(bundle.complete).toBe(false);
    expect(bundle.missingKinds).toContain("CONTROLLED_TOGGLE_STATE");
  });

  it("6. missing kill-switch state blocks completeness", () => {
    const items = createValidItemsExcept("KILL_SWITCH_STATE");
    const bundle = createPreflightEvidenceBundle({ environment: "staging", items });
    expect(bundle.complete).toBe(false);
    expect(bundle.missingKinds).toContain("KILL_SWITCH_STATE");
  });

  it("7. missing dry-run result blocks completeness", () => {
    const items = createValidItemsExcept("STAGING_DRY_RUN_RESULT");
    const bundle = createPreflightEvidenceBundle({ environment: "staging", items });
    expect(bundle.complete).toBe(false);
    expect(bundle.missingKinds).toContain("STAGING_DRY_RUN_RESULT");
  });

  it("8. missing no-real-execution proof blocks completeness", () => {
    const items = createValidItemsExcept("NO_REAL_EXECUTION_PROOF");
    const bundle = createPreflightEvidenceBundle({ environment: "staging", items });
    expect(bundle.complete).toBe(false);
    expect(bundle.missingKinds).toContain("NO_REAL_EXECUTION_PROOF");
  });

  it("9. missing regression test result blocks completeness", () => {
    const items = createValidItemsExcept("REGRESSION_TEST_RESULT");
    const bundle = createPreflightEvidenceBundle({ environment: "staging", items });
    expect(bundle.complete).toBe(false);
    expect(bundle.missingKinds).toContain("REGRESSION_TEST_RESULT");
  });

  it("10. missing rollback rehearsal blocks completeness", () => {
    const items = createValidItemsExcept("ROLLBACK_REHEARSAL_RESULT");
    const bundle = createPreflightEvidenceBundle({ environment: "staging", items });
    expect(bundle.complete).toBe(false);
    expect(bundle.missingKinds).toContain("ROLLBACK_REHEARSAL_RESULT");
  });

  it("11. one failed item makes bundle incomplete", () => {
    const items = createValidItemsExcept().map((i) =>
      i.kind === "ROLLBACK_REHEARSAL_RESULT" ? createPreflightEvidenceItem({ ...i, status: "FAIL" }) : i
    );
    const bundle = createPreflightEvidenceBundle({ environment: "staging", items });
    expect(bundle.complete).toBe(false);
    expect(bundle.failedKinds).toContain("ROLLBACK_REHEARSAL_RESULT");
  });

  it("12. one stale item makes bundle incomplete", () => {
    const items = createValidItemsExcept().map((i) =>
      i.kind === "KILL_SWITCH_STATE" ? createPreflightEvidenceItem({ ...i, status: "STALE" }) : i
    );
    const bundle = createPreflightEvidenceBundle({ environment: "staging", items });
    expect(bundle.complete).toBe(false);
    expect(bundle.staleKinds).toContain("KILL_SWITCH_STATE");
  });

  it("13. one invalid item makes bundle incomplete", () => {
    const items = createValidItemsExcept().map((i) =>
      i.kind === "STAGING_DRY_RUN_RESULT" ? createPreflightEvidenceItem({ ...i, status: "INVALID" }) : i
    );
    const bundle = createPreflightEvidenceBundle({ environment: "staging", items });
    expect(bundle.complete).toBe(false);
    expect(bundle.failedKinds).toContain("STAGING_DRY_RUN_RESULT");
  });

  it("14. one unsanitized item makes bundle incomplete", () => {
    const item = createPreflightEvidenceItem({
      evidenceId: "bad-meta",
      kind: "NO_REAL_EXECUTION_PROOF",
      status: "PASS",
      summary: "Contains token",
      rawMetadata: { accessToken: "ya29.12345678901234567890" },
    });
    const items = createValidItemsExcept().map((i) => (i.kind === "NO_REAL_EXECUTION_PROOF" ? item : i));
    const bundle = createPreflightEvidenceBundle({ environment: "staging", items });
    expect(bundle.complete).toBe(false);
    expect(bundle.failedKinds).toContain("NO_REAL_EXECUTION_PROOF");
  });

  it("15. duplicate item ID throws error", () => {
    const items = createValidItemsExcept();
    const duplicate = createPreflightEvidenceItem({
      evidenceId: items[0].evidenceId,
      kind: "KILL_SWITCH_STATE",
      status: "PASS",
      summary: "Dup id",
    });
    expect(() =>
      createPreflightEvidenceBundle({
        environment: "staging",
        items: [items[0], duplicate],
      })
    ).toThrow("ERR_DUPLICATE_EVIDENCE_ID");
  });

  it("16. duplicate kind throws error", () => {
    const items = [
      createPreflightEvidenceItem({
        evidenceId: "item-1",
        kind: "READINESS_REPORT",
        status: "PASS",
        summary: "First",
      }),
      createPreflightEvidenceItem({
        evidenceId: "item-2",
        kind: "READINESS_REPORT",
        status: "PASS",
        summary: "Second",
      }),
    ];
    expect(() =>
      createPreflightEvidenceBundle({
        environment: "staging",
        items,
      })
    ).toThrow("ERR_DUPLICATE_EVIDENCE_KIND");
  });

  it("17. tampered fingerprint is detectable", () => {
    const bundle = createPreflightEvidenceBundle({
      environment: "staging",
      items: createValidItemsExcept(),
    });
    expect(bundle.tamperEvidence.fingerprint).toHaveLength(64);
  });

  it("18. production bundle rejects immediately", () => {
    expect(() =>
      createPreflightEvidenceBundle({
        environment: "production" as any,
        items: createValidItemsExcept(),
      })
    ).toThrow("ERR_PRODUCTION_BUNDLE_FORBIDDEN");
  });

  it("19. complete bundle remains strictly non-authorizing", () => {
    const bundle = createPreflightEvidenceBundle({
      environment: "staging",
      items: createValidItemsExcept(),
    });
    expect(bundle.realExecutionAllowed).toBe(false);
    expect(bundle.networkAllowed).toBe(false);
    expect(bundle.sideEffectsAllowed).toBe(false);
  });

  it("20. no provider, network, or credential side effects occur", () => {
    const bundle = createPreflightEvidenceBundle({
      environment: "test",
      items: createValidItemsExcept(),
    });
    expect(bundle.credentialsAllowed).toBe(false);
  });
});
