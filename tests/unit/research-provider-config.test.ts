/**
 * Research Provider Configuration Unit Tests
 * (Phase 5.2 Test-First Validation Suite)
 */

import { describe, it, expect } from "vitest";
import {
  DEFAULT_RESEARCH_PROVIDER_CONFIG,
  readResearchProviderConfig,
  isProviderAllowed,
  APPROVED_PROVIDER_IDS,
  ResearchProviderConfig,
} from "../../src/server/config/researchProviderConfig";

describe("RESEARCH PROVIDER CONFIGURATION TESTS (PHASE 5.2)", () => {
  it("1. safe defaults: returns default config when env is empty", () => {
    const config = readResearchProviderConfig({});

    expect(config).toEqual(DEFAULT_RESEARCH_PROVIDER_CONFIG);
    expect(config.enableProviderRouting).toBe(false);
    expect(config.defaultProviderId).toBe("antigravity-legacy");
    expect(config.allowNotebookLM).toBe(false);
    expect(config.allowProviderFallback).toBe(true);
    expect(config.enableMcpServer).toBe(false);
  });

  it("2. explicit true parsing: parses '1', 'true', 'yes', 'on' case-insensitively", () => {
    const trueValues = ["1", "true", "TRUE", "True", "yes", "YES", "on", "ON"];

    for (const val of trueValues) {
      const config = readResearchProviderConfig({
        ENABLE_PROVIDER_ROUTING: val,
        RESEARCH_ALLOW_NOTEBOOKLM: val,
        ENABLE_RESEARCH_MCP_SERVER: val,
      });

      expect(config.enableProviderRouting).toBe(true);
      expect(config.allowNotebookLM).toBe(true);
      expect(config.enableMcpServer).toBe(true);
    }
  });

  it("3. false parsing for unknown or falsy values", () => {
    const falseValues = ["0", "false", "no", "off", "invalid", "", "   ", undefined];

    for (const val of falseValues) {
      const config = readResearchProviderConfig({
        ENABLE_PROVIDER_ROUTING: val,
        RESEARCH_ALLOW_NOTEBOOKLM: val,
        ENABLE_RESEARCH_MCP_SERVER: val,
      });

      expect(config.enableProviderRouting).toBe(false);
      expect(config.allowNotebookLM).toBe(false);
      expect(config.enableMcpServer).toBe(false);
    }
  });

  it("4. default provider override: accepts valid custom provider id", () => {
    const config = readResearchProviderConfig({
      RESEARCH_DEFAULT_PROVIDER: "custom-provider-id",
    });

    expect(config.defaultProviderId).toBe("custom-provider-id");
  });

  it("5. empty provider fallback: falls back to safe default if provider string is empty or whitespace", () => {
    const emptyValues = ["", "   ", "\t\n"];

    for (const val of emptyValues) {
      const config = readResearchProviderConfig({
        RESEARCH_DEFAULT_PROVIDER: val,
      });

      expect(config.defaultProviderId).toBe("antigravity-legacy");
    }
  });

  it("6. NotebookLM denied by default when flag is false", () => {
    const config = readResearchProviderConfig({});

    expect(config.allowNotebookLM).toBe(false);
    expect(isProviderAllowed("notebooklm-enterprise", config)).toBe(false);
    expect(isProviderAllowed(APPROVED_PROVIDER_IDS.NOTEBOOKLM_ENTERPRISE, config)).toBe(false);
  });

  it("7. NotebookLM allowed only when allowNotebookLM flag is true", () => {
    const config = readResearchProviderConfig({
      RESEARCH_ALLOW_NOTEBOOKLM: "true",
    });

    expect(config.allowNotebookLM).toBe(true);
    expect(isProviderAllowed("notebooklm-enterprise", config)).toBe(true);
  });

  it("8. config contains no secret or credential fields", () => {
    const config = readResearchProviderConfig({
      GEMINI_API_KEY: "AIzaSySecretKey",
      GOOGLE_APPLICATION_CREDENTIALS: "/path/to/key.json",
    });

    const keys = Object.keys(config).sort();
    expect(keys).toEqual([
      "allowNotebookLM",
      "allowProviderFallback",
      "defaultProviderId",
      "enableMcpServer",
      "enableProviderRouting",
    ]);

    const serialized = JSON.stringify(config);
    expect(serialized).not.toContain("AIzaSy");
    expect(serialized).not.toContain("key.json");
  });

  it("9. MCP flag does not create listener: pure boolean config", () => {
    const config = readResearchProviderConfig({
      ENABLE_RESEARCH_MCP_SERVER: "true",
    });

    expect(config.enableMcpServer).toBe(true);
    expect(typeof config.enableMcpServer).toBe("boolean");
  });

  it("10. provider allow-list behavior: handles legacy, notebooklm, and unknown providers", () => {
    const configWithNlm: ResearchProviderConfig = {
      enableProviderRouting: true,
      defaultProviderId: "antigravity-legacy",
      allowNotebookLM: true,
      allowProviderFallback: true,
      enableMcpServer: false,
    };

    const configWithoutNlm: ResearchProviderConfig = {
      enableProviderRouting: true,
      defaultProviderId: "antigravity-legacy",
      allowNotebookLM: false,
      allowProviderFallback: true,
      enableMcpServer: false,
    };

    // Legacy is always allowed
    expect(isProviderAllowed("antigravity-legacy", configWithNlm)).toBe(true);
    expect(isProviderAllowed("antigravity-legacy", configWithoutNlm)).toBe(true);

    // NotebookLM depends on flag
    expect(isProviderAllowed("notebooklm-enterprise", configWithNlm)).toBe(true);
    expect(isProviderAllowed("notebooklm-enterprise", configWithoutNlm)).toBe(false);

    // Unknown providers are rejected
    expect(isProviderAllowed("unknown-provider", configWithNlm)).toBe(false);
    expect(isProviderAllowed("", configWithNlm)).toBe(false);
    expect(isProviderAllowed("   ", configWithNlm)).toBe(false);
  });
});
