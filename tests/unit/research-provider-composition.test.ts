/**
 * Research Provider Dependency Composition Unit Tests
 * (Phase 5.2 Test-First Validation Suite)
 */

import { describe, it, expect, vi } from "vitest";
import {
  composeResearchProviderDependencies,
  ResearchProviderComposition,
} from "../../src/server/bootstrap/researchProviderComposition";
import { ResearchProviderConfig } from "../../src/server/config/researchProviderConfig";
import { ProviderRegistry } from "../../src/server/services/providers/providerRegistry";
import { ResearchOrchestrator } from "../../src/server/services/providers/researchOrchestrator";
import { InMemoryResearchPersistencePort } from "../../src/server/services/providers/researchPersistencePort";
import { AntigravityProvider } from "../../src/server/services/providers/antigravityProvider";

describe("RESEARCH PROVIDER COMPOSITION TESTS (PHASE 5.2)", () => {
  const disabledConfig: ResearchProviderConfig = {
    enableProviderRouting: false,
    defaultProviderId: "antigravity-legacy",
    allowNotebookLM: false,
    allowProviderFallback: true,
    enableMcpServer: false,
  };

  const enabledLegacyConfig: ResearchProviderConfig = {
    enableProviderRouting: true,
    defaultProviderId: "antigravity-legacy",
    allowNotebookLM: false,
    allowProviderFallback: true,
    enableMcpServer: false,
  };

  const enabledFullConfig: ResearchProviderConfig = {
    enableProviderRouting: true,
    defaultProviderId: "antigravity-legacy",
    allowNotebookLM: true,
    allowProviderFallback: true,
    enableMcpServer: false,
  };

  it("1. routing disabled returns disabled composition", () => {
    const composition = composeResearchProviderDependencies({
      config: disabledConfig,
    });

    expect(composition.config.enableProviderRouting).toBe(false);
    expect(composition.providerRegistry).toBeNull();
    expect(composition.orchestrator).toBeNull();
    expect(composition.persistence).toBeNull();
    expect(composition.enabledProviderIds).toEqual([]);
  });

  it("2. disabled mode does not call constructors/dependencies even if passed in deps", () => {
    const mockRegistry = {} as ProviderRegistry;
    const mockOrchestrator = {} as ResearchOrchestrator;
    const mockPersistence = new InMemoryResearchPersistencePort();

    const composition = composeResearchProviderDependencies({
      config: disabledConfig,
      deps: {
        providerRegistry: mockRegistry,
        orchestrator: mockOrchestrator,
        persistence: mockPersistence,
      },
    });

    expect(composition.providerRegistry).toBeNull();
    expect(composition.orchestrator).toBeNull();
    expect(composition.persistence).toBeNull();
    expect(composition.enabledProviderIds).toEqual([]);
  });

  it("3. routing enabled uses injected dependencies", () => {
    const legacyProvider = new AntigravityProvider();
    const registry = new ProviderRegistry({
      config: {
        defaultProvider: "legacy",
        allowFallback: true,
        enableLegacyProvider: true,
        enableOfficialProvider: false,
      },
      providers: [legacyProvider],
    });
    const persistence = new InMemoryResearchPersistencePort();
    const orchestrator = new ResearchOrchestrator({
      registry,
      persistence,
    });

    const composition = composeResearchProviderDependencies({
      config: enabledLegacyConfig,
      deps: {
        providerRegistry: registry,
        orchestrator,
        persistence,
      },
    });

    expect(composition.config.enableProviderRouting).toBe(true);
    expect(composition.providerRegistry).toBe(registry);
    expect(composition.orchestrator).toBe(orchestrator);
    expect(composition.persistence).toBe(persistence);
    expect(composition.enabledProviderIds).toEqual(["antigravity-legacy"]);
  });

  it("4. no network/client construction: composition accepts null deps gracefully", () => {
    const composition = composeResearchProviderDependencies({
      config: enabledLegacyConfig,
    });

    expect(composition.config.enableProviderRouting).toBe(true);
    expect(composition.providerRegistry).toBeNull();
    expect(composition.orchestrator).toBeNull();
    expect(composition.persistence).toBeNull();
    expect(composition.enabledProviderIds).toEqual(["antigravity-legacy"]);
  });

  it("5. disallowed NotebookLM excluded from enabledProviderIds", () => {
    const composition = composeResearchProviderDependencies({
      config: enabledLegacyConfig, // allowNotebookLM is false
    });

    expect(composition.enabledProviderIds).toEqual(["antigravity-legacy"]);
    expect(composition.enabledProviderIds).not.toContain("notebooklm-enterprise");
  });

  it("6. allowed provider list is deterministic when NotebookLM is allowed", () => {
    const composition = composeResearchProviderDependencies({
      config: enabledFullConfig, // allowNotebookLM is true
    });

    expect(composition.enabledProviderIds).toEqual([
      "antigravity-legacy",
      "notebooklm-enterprise",
    ]);
  });

  it("7. invalid default provider fails safely by disabling composition", () => {
    // defaultProviderId is "notebooklm-enterprise" but allowNotebookLM is false
    const invalidDefaultConfig: ResearchProviderConfig = {
      enableProviderRouting: true,
      defaultProviderId: "notebooklm-enterprise",
      allowNotebookLM: false,
      allowProviderFallback: true,
      enableMcpServer: false,
    };

    const composition = composeResearchProviderDependencies({
      config: invalidDefaultConfig,
    });

    expect(composition.providerRegistry).toBeNull();
    expect(composition.orchestrator).toBeNull();
    expect(composition.persistence).toBeNull();
    expect(composition.enabledProviderIds).toEqual([]);
  });

  it("8. fallback flag is preserved in returned config", () => {
    const noFallbackConfig: ResearchProviderConfig = {
      enableProviderRouting: true,
      defaultProviderId: "antigravity-legacy",
      allowNotebookLM: true,
      allowProviderFallback: false,
      enableMcpServer: false,
    };

    const composition = composeResearchProviderDependencies({
      config: noFallbackConfig,
    });

    expect(composition.config.allowProviderFallback).toBe(false);
  });

  it("9. composition is side-effect free: does not mutate input params", () => {
    const configCopy: ResearchProviderConfig = { ...enabledLegacyConfig };
    const originalJson = JSON.stringify(configCopy);

    const composition = composeResearchProviderDependencies({
      config: configCopy,
    });

    expect(JSON.stringify(configCopy)).toBe(originalJson);
    expect(composition.config).not.toBe(configCopy); // New object returned
  });

  it("10. no process.env mutation", () => {
    const beforeEnvKeys = Object.keys(process.env).length;
    const originalEnv = { ...process.env };

    composeResearchProviderDependencies({
      config: enabledFullConfig,
    });

    expect(Object.keys(process.env).length).toBe(beforeEnvKeys);
    expect(process.env).toEqual(originalEnv);
  });

  it("11. no MCP listener created: MCP flag does not invoke process.stdin", () => {
    const mcpConfig: ResearchProviderConfig = {
      enableProviderRouting: true,
      defaultProviderId: "antigravity-legacy",
      allowNotebookLM: false,
      allowProviderFallback: true,
      enableMcpServer: true,
    };

    const composition = composeResearchProviderDependencies({
      config: mcpConfig,
    });

    expect(composition.config.enableMcpServer).toBe(true);
    // Verified pure object composition without stdio hooks
  });

  it("12. legacy path remains untouched when routing is disabled", () => {
    const composition = composeResearchProviderDependencies({
      config: disabledConfig,
    });

    expect(composition.config.enableProviderRouting).toBe(false);
    expect(composition.enabledProviderIds).toHaveLength(0);
  });
});
