import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Phase 6.7 — Boundary Audit & Static Import Verification", () => {
  const providersDir = path.resolve(__dirname, "../../src/server/services/providers");
  const phase66Files = [
    "operatorPreflightEvidence.ts",
    "operatorSignoffContract.ts",
    "rollbackRehearsal.ts",
    "evidenceBundleFingerprint.ts",
    "evidenceSanitizer.ts",
    "preflightGate.ts",
  ];

  const prohibitedPatterns = [
    { name: "Live NotebookLM Provider", regex: /NotebookLMEnterpriseProvider/ },
    { name: "Live Antigravity Provider", regex: /AntigravityProvider/ },
    { name: "Live NotebookLM Client", regex: /NotebookLMClient/ },
    { name: "Research Orchestrator", regex: /ResearchOrchestrator/ },
    { name: "Provider Registry", regex: /ProviderRegistry/ },
    { name: "Secure Storage Resolver", regex: /secureStorageResolver/ },
    { name: "Child Process", regex: /child_process/ },
    { name: "Raw Network Module (net)", regex: /['"]node:net['"]|['"]net['"]/ },
    { name: "Raw HTTP Module", regex: /['"]node:http['"]|['"]http['"]/ },
    { name: "Raw HTTPS Module", regex: /['"]node:https['"]|['"]https['"]/ },
    { name: "Direct fetch calls", regex: /\bfetch\s*\(/ },
  ];

  it("1. verifies all Phase 6.6 implementation files exist", () => {
    for (const file of phase66Files) {
      const fullPath = path.join(providersDir, file);
      expect(fs.existsSync(fullPath)).toBe(true);
    }
  });

  it("2. verifies zero prohibited imports or symbol references in Phase 6.6 modules", () => {
    for (const file of phase66Files) {
      const fullPath = path.join(providersDir, file);
      const content = fs.readFileSync(fullPath, "utf8");

      for (const { name, regex } of prohibitedPatterns) {
        const matches = content.match(regex);
        expect(
          matches,
          `Found prohibited pattern [${name}] in file ${file}`
        ).toBeNull();
      }
    }
  });

  it("3. verifies zero explicit 'any' types in Phase 6.6 implementation modules", () => {
    const anyTypeRegex = /:\s*any\b|\bas\s+any\b/;
    for (const file of phase66Files) {
      const fullPath = path.join(providersDir, file);
      const content = fs.readFileSync(fullPath, "utf8");
      const matches = content.match(anyTypeRegex);
      expect(
        matches,
        `Found explicit 'any' usage in file ${file}`
      ).toBeNull();
    }
  });

  it("4. verifies zero mutable process.env mutations in Phase 6.6 modules", () => {
    const envMutationRegex = /process\.env\.[A-Za-z0-9_]+\s*=/;
    for (const file of phase66Files) {
      const fullPath = path.join(providersDir, file);
      const content = fs.readFileSync(fullPath, "utf8");
      const matches = content.match(envMutationRegex);
      expect(
        matches,
        `Found process.env mutation in file ${file}`
      ).toBeNull();
    }
  });

  it("5. verifies pure and deterministic crypto hashing usage (SHA-256 only)", () => {
    for (const file of ["evidenceBundleFingerprint.ts", "operatorPreflightEvidence.ts", "rollbackRehearsal.ts"]) {
      const fullPath = path.join(providersDir, file);
      const content = fs.readFileSync(fullPath, "utf8");
      if (content.includes("createHash(")) {
        expect(content).toContain('createHash("sha256")');
        expect(content).not.toContain('createHash("md5")');
        expect(content).not.toContain('createHash("sha1")');
      }
    }
  });
});
