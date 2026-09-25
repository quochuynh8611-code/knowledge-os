import { describe, it, expect } from "vitest";
import {
  ALL_REQUIRED_EVIDENCE_KINDS,
  createPreflightEvidenceItem,
  createPreflightEvidenceBundle,
  PreflightEvidenceKind,
  PreflightEvidenceItem,
} from "../../src/server/services/providers/operatorPreflightEvidence";

function makeValidItem(kind: PreflightEvidenceKind, idSuffix = "1"): PreflightEvidenceItem {
  return createPreflightEvidenceItem({
    evidenceId: `item-${kind.toLowerCase()}-${idSuffix}`,
    kind,
    status: "PASS",
    generatedAt: "2026-09-24T12:00:00.000Z",
    summary: `Valid evidence for ${kind}`,
    checks: ["CHECK_1_PASS", "CHECK_2_PASS"],
  });
}

function makeAllValidItems(): PreflightEvidenceItem[] {
  return ALL_REQUIRED_EVIDENCE_KINDS.map((kind) => makeValidItem(kind));
}

describe("Operator Preflight Evidence", () => {
  it("1. defines all 9 required evidence kinds", () => {
    expect(ALL_REQUIRED_EVIDENCE_KINDS).toHaveLength(9);
    expect(ALL_REQUIRED_EVIDENCE_KINDS).toContain("READINESS_REPORT");
    expect(ALL_REQUIRED_EVIDENCE_KINDS).toContain("RUNTIME_COMPOSITION_AUDIT");
    expect(ALL_REQUIRED_EVIDENCE_KINDS).toContain("MANUAL_ENABLEMENT_DECISION");
    expect(ALL_REQUIRED_EVIDENCE_KINDS).toContain("CONTROLLED_TOGGLE_STATE");
    expect(ALL_REQUIRED_EVIDENCE_KINDS).toContain("KILL_SWITCH_STATE");
    expect(ALL_REQUIRED_EVIDENCE_KINDS).toContain("STAGING_DRY_RUN_RESULT");
    expect(ALL_REQUIRED_EVIDENCE_KINDS).toContain("NO_REAL_EXECUTION_PROOF");
    expect(ALL_REQUIRED_EVIDENCE_KINDS).toContain("REGRESSION_TEST_RESULT");
    expect(ALL_REQUIRED_EVIDENCE_KINDS).toContain("ROLLBACK_REHEARSAL_RESULT");
  });

  it("2. complete bundle requires all required kinds", () => {
    const items = makeAllValidItems();
    const bundle = createPreflightEvidenceBundle({
      environment: "staging",
      items,
    });
    expect(bundle.complete).toBe(true);
    expect(bundle.missingKinds).toHaveLength(0);
    expect(bundle.failedKinds).toHaveLength(0);
  });

  it("3. missing item is not complete", () => {
    const items = makeAllValidItems().filter((i) => i.kind !== "KILL_SWITCH_STATE");
    const bundle = createPreflightEvidenceBundle({
      environment: "staging",
      items,
    });
    expect(bundle.complete).toBe(false);
    expect(bundle.missingKinds).toContain("KILL_SWITCH_STATE");
  });

  it("4. failed item is not complete", () => {
    const items = makeAllValidItems().map((i) =>
      i.kind === "NO_REAL_EXECUTION_PROOF"
        ? createPreflightEvidenceItem({ ...i, status: "FAIL" })
        : i
    );
    const bundle = createPreflightEvidenceBundle({
      environment: "staging",
      items,
    });
    expect(bundle.complete).toBe(false);
    expect(bundle.failedKinds).toContain("NO_REAL_EXECUTION_PROOF");
  });

  it("5. stale item is not complete", () => {
    const items = makeAllValidItems().map((i) =>
      i.kind === "READINESS_REPORT"
        ? createPreflightEvidenceItem({ ...i, status: "STALE" })
        : i
    );
    const bundle = createPreflightEvidenceBundle({
      environment: "staging",
      items,
    });
    expect(bundle.complete).toBe(false);
    expect(bundle.staleKinds).toContain("READINESS_REPORT");
  });

  it("6. invalid item status is not complete", () => {
    const items = makeAllValidItems().map((i) =>
      i.kind === "RUNTIME_COMPOSITION_AUDIT"
        ? createPreflightEvidenceItem({ ...i, status: "INVALID" })
        : i
    );
    const bundle = createPreflightEvidenceBundle({
      environment: "staging",
      items,
    });
    expect(bundle.complete).toBe(false);
    expect(bundle.failedKinds).toContain("RUNTIME_COMPOSITION_AUDIT");
  });

  it("7. sanitization failure marks item as SANITIZATION_FAILED and blocks completeness", () => {
    const itemWithSecret = createPreflightEvidenceItem({
      evidenceId: "item-secret",
      kind: "MANUAL_ENABLEMENT_DECISION",
      status: "PASS",
      summary: "Contains secret in metadata",
      rawMetadata: {
        apiKey: "AIzaSySecretApiKey123456789012345678",
      },
    });
    expect(itemWithSecret.status).toBe("SANITIZATION_FAILED");

    const items = makeAllValidItems().map((i) =>
      i.kind === "MANUAL_ENABLEMENT_DECISION" ? itemWithSecret : i
    );
    const bundle = createPreflightEvidenceBundle({
      environment: "staging",
      items,
    });
    expect(bundle.complete).toBe(false);
    expect(bundle.failedKinds).toContain("MANUAL_ENABLEMENT_DECISION");
  });

  it("8. bundle is test/staging only", () => {
    const testBundle = createPreflightEvidenceBundle({
      environment: "test",
      items: makeAllValidItems(),
    });
    expect(testBundle.environment).toBe("test");

    const stagingBundle = createPreflightEvidenceBundle({
      environment: "staging",
      items: makeAllValidItems(),
    });
    expect(stagingBundle.environment).toBe("staging");
  });

  it("9. production bundle is rejected with error", () => {
    expect(() =>
      createPreflightEvidenceBundle({
        environment: "production" as any,
        items: makeAllValidItems(),
      })
    ).toThrow("ERR_PRODUCTION_BUNDLE_FORBIDDEN");
  });

  it("10. all safety flags remain false", () => {
    const bundle = createPreflightEvidenceBundle({
      environment: "staging",
      items: makeAllValidItems(),
    });
    expect(bundle.realExecutionAllowed).toBe(false);
    expect(bundle.networkAllowed).toBe(false);
    expect(bundle.credentialsAllowed).toBe(false);
    expect(bundle.childProcessAllowed).toBe(false);
    expect(bundle.sideEffectsAllowed).toBe(false);
  });

  it("11. bundle is JSON-serializable", () => {
    const bundle = createPreflightEvidenceBundle({
      environment: "staging",
      items: makeAllValidItems(),
    });
    const serialized = JSON.stringify(bundle);
    const parsed = JSON.parse(serialized);
    expect(parsed.bundleVersion).toBe("6.6.0");
    expect(parsed.complete).toBe(true);
  });

  it("12. bundle excludes raw source", () => {
    const items = makeAllValidItems();
    const bundle = createPreflightEvidenceBundle({
      environment: "staging",
      items,
    });
    for (const item of bundle.items) {
      expect(item.containsRawSource).toBe(false);
    }
  });

  it("13. bundle excludes secrets", () => {
    const items = makeAllValidItems();
    const bundle = createPreflightEvidenceBundle({
      environment: "staging",
      items,
    });
    for (const item of bundle.items) {
      expect(item.containsSecrets).toBe(false);
    }
  });

  it("14. bundle excludes filesystem path", () => {
    const items = makeAllValidItems();
    const bundle = createPreflightEvidenceBundle({
      environment: "staging",
      items,
    });
    for (const item of bundle.items) {
      expect(item.containsFilesystemPath).toBe(false);
    }
  });

  it("15. bundle excludes process.env", () => {
    const items = makeAllValidItems();
    const bundle = createPreflightEvidenceBundle({
      environment: "staging",
      items,
    });
    for (const item of bundle.items) {
      expect(item.containsEnvironmentDump).toBe(false);
    }
  });

  it("16. bundle excludes provider instance", () => {
    const items = makeAllValidItems();
    const bundle = createPreflightEvidenceBundle({
      environment: "staging",
      items,
    });
    for (const item of bundle.items) {
      expect(item.containsProviderInstance).toBe(false);
    }
  });

  it("17. bundle does not mutate evidence input", () => {
    const items = makeAllValidItems();
    const originalLength = items.length;
    createPreflightEvidenceBundle({
      environment: "staging",
      items,
    });
    expect(items.length).toBe(originalLength);
  });

  it("18. empty evidence is incomplete", () => {
    const bundle = createPreflightEvidenceBundle({
      environment: "staging",
      items: [],
    });
    expect(bundle.complete).toBe(false);
    expect(bundle.missingKinds.length).toBe(9);
  });

  it("19. duplicate evidence IDs are rejected", () => {
    const item1 = makeValidItem("READINESS_REPORT", "same-id");
    const item2 = createPreflightEvidenceItem({
      evidenceId: "item-readiness_report-same-id",
      kind: "KILL_SWITCH_STATE",
      status: "PASS",
      summary: "Duplicate ID",
    });
    expect(() =>
      createPreflightEvidenceBundle({
        environment: "staging",
        items: [item1, item2],
      })
    ).toThrow("ERR_DUPLICATE_EVIDENCE_ID");
  });

  it("20. duplicate evidence kinds are rejected", () => {
    const item1 = makeValidItem("READINESS_REPORT", "id-1");
    const item2 = makeValidItem("READINESS_REPORT", "id-2");
    expect(() =>
      createPreflightEvidenceBundle({
        environment: "staging",
        items: [item1, item2],
      })
    ).toThrow("ERR_DUPLICATE_EVIDENCE_KIND");
  });

  it("21. bundle fingerprint is deterministic", () => {
    const items1 = makeAllValidItems();
    const items2 = makeAllValidItems();
    const bundle1 = createPreflightEvidenceBundle({
      bundleId: "b1",
      environment: "staging",
      items: items1,
    });
    const bundle2 = createPreflightEvidenceBundle({
      bundleId: "b2",
      environment: "staging",
      items: items2,
    });
    expect(bundle1.tamperEvidence.fingerprint).toBe(bundle2.tamperEvidence.fingerprint);
  });

  it("22. bundle fingerprint changes when evidence changes", () => {
    const bundle1 = createPreflightEvidenceBundle({
      environment: "staging",
      items: makeAllValidItems(),
    });
    const modifiedItems = makeAllValidItems().map((i) =>
      i.kind === "READINESS_REPORT"
        ? createPreflightEvidenceItem({ ...i, summary: "Changed summary text" })
        : i
    );
    const bundle2 = createPreflightEvidenceBundle({
      environment: "staging",
      items: modifiedItems,
    });
    expect(bundle1.tamperEvidence.fingerprint).not.toBe(bundle2.tamperEvidence.fingerprint);
  });

  it("23. bundle fingerprint is order-independent after canonicalization", () => {
    const itemsAsc = makeAllValidItems();
    const itemsDesc = [...itemsAsc].reverse();

    const bundle1 = createPreflightEvidenceBundle({
      environment: "staging",
      items: itemsAsc,
    });
    const bundle2 = createPreflightEvidenceBundle({
      environment: "staging",
      items: itemsDesc,
    });
    expect(bundle1.tamperEvidence.fingerprint).toBe(bundle2.tamperEvidence.fingerprint);
  });

  it("24. bundle generation makes no network requests", () => {
    const bundle = createPreflightEvidenceBundle({
      environment: "test",
      items: makeAllValidItems(),
    });
    expect(bundle.networkAllowed).toBe(false);
  });

  it("25. bundle generation makes no provider calls", () => {
    const bundle = createPreflightEvidenceBundle({
      environment: "test",
      items: makeAllValidItems(),
    });
    expect(bundle.realExecutionAllowed).toBe(false);
  });
});
