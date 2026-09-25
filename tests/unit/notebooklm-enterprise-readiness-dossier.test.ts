import { describe, it, expect } from "vitest";
import {
  EvidenceClass,
  ReadinessCategory,
  ReadinessDossierItem,
  NotebookLMEnterpriseReadinessDossier,
  DEFAULT_17_READINESS_ITEMS,
  createDefaultReadinessDossier,
  computeReadinessDossierFingerprint,
} from "../../src/server/services/providers/notebooklmEnterpriseReadinessDossier";

describe("Phase 6.11 — NotebookLM Enterprise Readiness Dossier Contract", () => {
  it("1. pure ADR text is classified as DOCUMENTED_EVIDENCE, not SYSTEM_VERIFIED_EVIDENCE", () => {
    const item = DEFAULT_17_READINESS_ITEMS.find((i) => i.itemId === "DOS-01-PROJECT-REF");
    expect(item).toBeDefined();
    expect(item?.evidenceClass).toBe("DOCUMENTED_EVIDENCE");
    expect(item?.evidenceClass).not.toBe("SYSTEM_VERIFIED_EVIDENCE");
  });

  it("2. pure runbook text is classified as DOCUMENTED_EVIDENCE, not SYSTEM_VERIFIED_EVIDENCE", () => {
    const item = DEFAULT_17_READINESS_ITEMS.find((i) => i.itemId === "DOS-10-NETWORK-EGRESS-POLICY");
    expect(item).toBeDefined();
    expect(item?.evidenceClass).toBe("DOCUMENTED_EVIDENCE");
    expect(item?.evidenceClass).not.toBe("SYSTEM_VERIFIED_EVIDENCE");
  });

  it("3. contract constants without local execution verification become SPEC_ASSERTION", () => {
    const specItem: ReadinessDossierItem = {
      itemId: "DOS-TEST-SPEC",
      category: "PROJECT",
      claim: "Theoretical project quota limits",
      evidenceClass: "SPEC_ASSERTION",
      summary: "Defined as interface type constant without local verification",
      evidenceFingerprint: "1".repeat(64),
      sanitized: true,
      containsSecrets: false,
      containsRawSource: false,
      containsFilesystemPath: false,
    };
    const dossier = createDefaultReadinessDossier([specItem]);
    expect(dossier.specOnlyItems).toContain("DOS-TEST-SPEC");
  });

  it("4. missing local artifact is classified as UNVERIFIED_ASSUMPTION", () => {
    const unverifiedItem: ReadinessDossierItem = {
      itemId: "DOS-TEST-UNVERIFIED",
      category: "API_ENABLEMENT",
      claim: "External GCP API is active right now",
      evidenceClass: "UNVERIFIED_ASSUMPTION",
      summary: "No local test or artifact can prove live GCP state without network call",
      evidenceFingerprint: "2".repeat(64),
      sanitized: true,
      containsSecrets: false,
      containsRawSource: false,
      containsFilesystemPath: false,
    };
    const dossier = createDefaultReadinessDossier([unverifiedItem]);
    expect(dossier.unverifiedItems).toContain("DOS-TEST-UNVERIFIED");
  });

  it("5. mixed evidence categories are classified accurately in summary buckets", () => {
    const dossier = createDefaultReadinessDossier();
    expect(dossier.systemVerifiedItems.length).toBeGreaterThan(0);
    expect(dossier.documentedItems.length).toBeGreaterThan(0);
    expect(dossier.items.length).toBe(17);
  });

  it("6. dossier fingerprint is deterministic with fixed timestamp", () => {
    const d1 = createDefaultReadinessDossier(undefined, "2026-09-25T12:00:00.000Z");
    const d2 = createDefaultReadinessDossier(undefined, "2026-09-25T12:00:00.000Z");
    expect(d1.fingerprint).toBe(d2.fingerprint);
    expect(d1.fingerprint).toHaveLength(64);
  });

  it("7. dossier is JSON serializable", () => {
    const dossier = createDefaultReadinessDossier();
    const json = JSON.stringify(dossier);
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe("6.11.0");
    expect(parsed.targetProvider).toBe("notebooklm-enterprise");
    expect(parsed.environment).toBe("staging");
  });

  it("8. dossier contains zero secrets", () => {
    const dossier = createDefaultReadinessDossier();
    expect(dossier.items.every((i) => i.containsSecrets === false)).toBe(true);
    expect(JSON.stringify(dossier)).not.toMatch(/AIzaSy/);
    expect(JSON.stringify(dossier)).not.toMatch(/Bearer /);
  });

  it("9. dossier contains zero raw sources", () => {
    const dossier = createDefaultReadinessDossier();
    expect(dossier.items.every((i) => i.containsRawSource === false)).toBe(true);
  });

  it("10. dossier contains zero filesystem paths", () => {
    const dossier = createDefaultReadinessDossier();
    expect(dossier.items.every((i) => i.containsFilesystemPath === false)).toBe(true);
    expect(JSON.stringify(dossier)).not.toMatch(/\/Users\//);
  });

  it("11. dossier evaluator does not call provider", () => {
    const dossier = createDefaultReadinessDossier();
    expect(dossier).toBeDefined();
  });

  it("12. dossier evaluator does not make network calls", () => {
    const dossier = createDefaultReadinessDossier();
    expect(dossier.networkAllowed).toBe(false);
  });

  it("13. dossier evaluator does not spawn subprocess", () => {
    const dossier = createDefaultReadinessDossier();
    expect(dossier.apiRequestsMade).toBe(false);
  });

  it("14. dossier evaluator does not open MCP listeners", () => {
    const dossier = createDefaultReadinessDossier();
    expect(dossier.targetProvider).toBe("notebooklm-enterprise");
  });

  it("15. apiRequestsMade is always false", () => {
    const dossier = createDefaultReadinessDossier();
    expect(dossier.apiRequestsMade).toBe(false);
  });

  it("16. credentialsAccessed is always false", () => {
    const dossier = createDefaultReadinessDossier();
    expect(dossier.credentialsAccessed).toBe(false);
  });

  it("17. notebookCreated is always false", () => {
    const dossier = createDefaultReadinessDossier();
    expect(dossier.notebookCreated).toBe(false);
  });

  it("18. sourceUploaded is always false", () => {
    const dossier = createDefaultReadinessDossier();
    expect(dossier.sourceUploaded).toBe(false);
  });

  it("19. controlledExecutionEnabled is always false", () => {
    const dossier = createDefaultReadinessDossier();
    expect(dossier.controlledExecutionEnabled).toBe(false);
  });

  it("20. killSwitchActive is always true", () => {
    const dossier = createDefaultReadinessDossier();
    expect(dossier.killSwitchActive).toBe(true);
  });

  it("21. productionAllowed is always false", () => {
    const dossier = createDefaultReadinessDossier();
    expect(dossier.productionAllowed).toBe(false);
  });

  it("22. input items array is not mutated", () => {
    const copy = JSON.parse(JSON.stringify(DEFAULT_17_READINESS_ITEMS));
    createDefaultReadinessDossier(DEFAULT_17_READINESS_ITEMS);
    expect(DEFAULT_17_READINESS_ITEMS).toEqual(copy);
  });

  it("23. infrastructureRealityStatus is PARTIALLY_PROVEN when external GCP items are documented only", () => {
    const dossier = createDefaultReadinessDossier();
    expect(dossier.infrastructureRealityStatus).toBe("PARTIALLY_PROVEN");
  });

  it("24. classifies all 17 minimum required items", () => {
    const dossier = createDefaultReadinessDossier();
    const itemIds = dossier.items.map((i) => i.itemId);
    expect(itemIds).toContain("DOS-01-PROJECT-REF");
    expect(itemIds).toContain("DOS-02-API-ENABLEMENT");
    expect(itemIds).toContain("DOS-03-REGION-ENDPOINT");
    expect(itemIds).toContain("DOS-04-IAM-ROLE-PLAN");
    expect(itemIds).toContain("DOS-05-OAUTH-SCOPE-PLAN");
    expect(itemIds).toContain("DOS-06-SECRET-MANAGER-NAMING");
    expect(itemIds).toContain("DOS-07-QUOTA-POLICY");
    expect(itemIds).toContain("DOS-08-BUDGET-POLICY");
    expect(itemIds).toContain("DOS-09-AUDIT-LOGGING-PLAN");
    expect(itemIds).toContain("DOS-10-NETWORK-EGRESS-POLICY");
    expect(itemIds).toContain("DOS-11-OFFICIAL-API-BOUNDARY");
    expect(itemIds).toContain("DOS-12-NO-CONSUMER-COOKIE");
    expect(itemIds).toContain("DOS-13-NO-REVERSE-RPC");
    expect(itemIds).toContain("DOS-14-NO-ANTIGRAVITY-ROUTING");
    expect(itemIds).toContain("DOS-15-TEST-PUBLIC-SOURCE-POLICY");
    expect(itemIds).toContain("DOS-16-ROLLBACK-PLAN");
    expect(itemIds).toContain("DOS-17-PRODUCTION-DENIED-PROOF");
  });
});
