/**
 * Provider Registry & Selection Policy Unit Tests
 * (Phase 4.5 Test-First Validation Suite)
 */

import { describe, it, expect } from "vitest";
import {
  ProviderRegistry,
  ProviderRegistryConfig,
} from "../../src/server/services/providers/providerRegistry";
import { AntigravityProvider } from "../../src/server/services/providers/antigravityProvider";
import { NotebookLMEnterpriseProvider } from "../../src/server/services/providers/notebooklmEnterpriseProvider";
import { MockNotebookLMClient } from "../../src/server/services/providers/notebooklmClient";
import { ProviderException } from "../../src/server/services/providers/errors";

describe("PROVIDER REGISTRY & SELECTION POLICY UNIT TESTS (PHASE 4.5)", () => {
  function createStandardProviders() {
    const mockClient = new MockNotebookLMClient();
    const officialProvider = new NotebookLMEnterpriseProvider(mockClient);
    const legacyProvider = new AntigravityProvider();
    return { officialProvider, legacyProvider };
  }

  const standardConfig: ProviderRegistryConfig = {
    defaultProvider: "official",
    allowFallback: true,
    enableOfficialProvider: true,
    enableLegacyProvider: true,
  };

  it("1. Lists all enabled providers correctly", () => {
    const { officialProvider, legacyProvider } = createStandardProviders();
    const registry = new ProviderRegistry({
      config: standardConfig,
      providers: [officialProvider, legacyProvider],
    });

    const all = registry.getAllProviders();
    expect(all).toHaveLength(2);
    expect(all.map((p) => p.metadata.id)).toEqual([
      "notebooklm-enterprise",
      "antigravity-legacy",
    ]);
  });

  it("2. Does not expose disabled providers", () => {
    const { officialProvider, legacyProvider } = createStandardProviders();
    const registry = new ProviderRegistry({
      config: {
        ...standardConfig,
        enableLegacyProvider: false,
      },
      providers: [officialProvider, legacyProvider],
    });

    const all = registry.getAllProviders();
    expect(all).toHaveLength(1);
    expect(all[0].metadata.id).toBe("notebooklm-enterprise");
    expect(registry.getProviderById("antigravity-legacy")).toBeNull();
  });

  it("3. GetProviderById returns correct provider when exists and enabled", () => {
    const { officialProvider, legacyProvider } = createStandardProviders();
    const registry = new ProviderRegistry({
      config: standardConfig,
      providers: [officialProvider, legacyProvider],
    });

    const found = registry.getProviderById("antigravity-legacy");
    expect(found).not.toBeNull();
    expect(found?.metadata.id).toBe("antigravity-legacy");
  });

  it("4. GetProviderById returns null when provider does not exist", () => {
    const { officialProvider, legacyProvider } = createStandardProviders();
    const registry = new ProviderRegistry({
      config: standardConfig,
      providers: [officialProvider, legacyProvider],
    });

    const found = registry.getProviderById("non-existent-provider");
    expect(found).toBeNull();
  });

  it("5. GetDefaultProvider returns configured default provider", () => {
    const { officialProvider, legacyProvider } = createStandardProviders();
    const registry = new ProviderRegistry({
      config: {
        ...standardConfig,
        defaultProvider: "official",
      },
      providers: [officialProvider, legacyProvider],
    });

    const def = registry.getDefaultProvider();
    expect(def.metadata.id).toBe("notebooklm-enterprise");
    expect(def.metadata.type).toBe("official");
  });

  it("6. GetDefaultProvider throws when default provider is disabled or missing", () => {
    const { officialProvider, legacyProvider } = createStandardProviders();
    const registry = new ProviderRegistry({
      config: {
        ...standardConfig,
        defaultProvider: "official",
        enableOfficialProvider: false,
      },
      providers: [officialProvider, legacyProvider],
    });

    expect(() => registry.getDefaultProvider()).toThrow(ProviderException);
    try {
      registry.getDefaultProvider();
    } catch (err) {
      const pErr = err as ProviderException;
      expect(pErr.errorCode).toBe("INVALID_ARGUMENT");
    }
  });

  it("7. ResolveProviderForRequest uses preferredProviderId when valid and enabled", () => {
    const { officialProvider, legacyProvider } = createStandardProviders();
    const registry = new ProviderRegistry({
      config: standardConfig,
      providers: [officialProvider, legacyProvider],
    });

    const resolved = registry.resolveProviderForRequest({
      preferredProviderId: "antigravity-legacy",
    });

    expect(resolved.metadata.id).toBe("antigravity-legacy");
  });

  it("8. ResolveProviderForRequest falls back to default when preferredProviderId is null/undefined", () => {
    const { officialProvider, legacyProvider } = createStandardProviders();
    const registry = new ProviderRegistry({
      config: {
        ...standardConfig,
        defaultProvider: "official",
      },
      providers: [officialProvider, legacyProvider],
    });

    const resolved = registry.resolveProviderForRequest({});
    expect(resolved.metadata.id).toBe("notebooklm-enterprise");
  });

  it("9. ResolveProviderForRequest throws INVALID_ARGUMENT when preferredProviderId does not exist", () => {
    const { officialProvider, legacyProvider } = createStandardProviders();
    const registry = new ProviderRegistry({
      config: standardConfig,
      providers: [officialProvider, legacyProvider],
    });

    expect(() =>
      registry.resolveProviderForRequest({ preferredProviderId: "unknown-id" })
    ).toThrow(ProviderException);

    try {
      registry.resolveProviderForRequest({ preferredProviderId: "unknown-id" });
    } catch (err) {
      const pErr = err as ProviderException;
      expect(pErr.errorCode).toBe("INVALID_ARGUMENT");
    }
  });

  it("10. GetFallbackProvider returns legacy provider for official primary when allowFallback=true", () => {
    const { officialProvider, legacyProvider } = createStandardProviders();
    const registry = new ProviderRegistry({
      config: {
        ...standardConfig,
        allowFallback: true,
      },
      providers: [officialProvider, legacyProvider],
    });

    const fallback = registry.getFallbackProvider("notebooklm-enterprise");
    expect(fallback).not.toBeNull();
    expect(fallback?.metadata.id).toBe("antigravity-legacy");
  });

  it("11. GetFallbackProvider returns null when allowFallback=false", () => {
    const { officialProvider, legacyProvider } = createStandardProviders();
    const registry = new ProviderRegistry({
      config: {
        ...standardConfig,
        allowFallback: false,
      },
      providers: [officialProvider, legacyProvider],
    });

    const fallback = registry.getFallbackProvider("notebooklm-enterprise");
    expect(fallback).toBeNull();
  });

  it("12. GetFallbackProvider does NOT auto-promote legacy to official", () => {
    const { officialProvider, legacyProvider } = createStandardProviders();
    const registry = new ProviderRegistry({
      config: {
        ...standardConfig,
        allowFallback: true,
      },
      providers: [officialProvider, legacyProvider],
    });

    const fallback = registry.getFallbackProvider("antigravity-legacy");
    expect(fallback).toBeNull();
  });

  it("13. ResolveProviderForRequest selects capable provider when default lacks required capability", () => {
    const { officialProvider, legacyProvider } = createStandardProviders();
    const registry = new ProviderRegistry({
      config: {
        ...standardConfig,
        defaultProvider: "official", // Official does not support supportsQuery
      },
      providers: [officialProvider, legacyProvider],
    });

    // Request requires supportsQuery (supported by legacy, NOT by official)
    const resolved = registry.resolveProviderForRequest({
      requireCapability: "supportsQuery",
    });

    expect(resolved.metadata.id).toBe("antigravity-legacy");
  });

  it("14. ResolveProviderForRequest throws CAPABILITY_UNSUPPORTED when no provider supports required capability", () => {
    const { officialProvider, legacyProvider } = createStandardProviders();
    const registry = new ProviderRegistry({
      config: standardConfig,
      providers: [officialProvider, legacyProvider],
    });

    // Neither official nor legacy supports supportsMindMap
    expect(() =>
      registry.resolveProviderForRequest({
        requireCapability: "supportsMindMap",
      })
    ).toThrow(ProviderException);

    try {
      registry.resolveProviderForRequest({
        requireCapability: "supportsMindMap",
      });
    } catch (err) {
      const pErr = err as ProviderException;
      expect(pErr.errorCode).toBe("CAPABILITY_UNSUPPORTED");
    }
  });

  it("15. Registry does NOT open query capability on official provider even if requested", () => {
    const { officialProvider } = createStandardProviders();
    const registry = new ProviderRegistry({
      config: {
        defaultProvider: "official",
        allowFallback: false,
        enableOfficialProvider: true,
        enableLegacyProvider: false, // Legacy disabled
      },
      providers: [officialProvider],
    });

    expect(() =>
      registry.resolveProviderForRequest({
        requireCapability: "supportsQuery",
      })
    ).toThrow(ProviderException);
  });

  it("16. Operates seamlessly when only legacy provider is enabled", () => {
    const { legacyProvider } = createStandardProviders();
    const registry = new ProviderRegistry({
      config: {
        defaultProvider: "legacy",
        allowFallback: false,
        enableOfficialProvider: false,
        enableLegacyProvider: true,
      },
      providers: [legacyProvider],
    });

    expect(registry.getAllProviders()).toHaveLength(1);
    expect(registry.getDefaultProvider().metadata.id).toBe("antigravity-legacy");
    expect(
      registry.resolveProviderForRequest({ requireCapability: "supportsSourceIngestion" })
        .metadata.id
    ).toBe("antigravity-legacy");
  });

  it("17. Operates seamlessly when only official provider is enabled", () => {
    const { officialProvider } = createStandardProviders();
    const registry = new ProviderRegistry({
      config: {
        defaultProvider: "official",
        allowFallback: false,
        enableOfficialProvider: true,
        enableLegacyProvider: false,
      },
      providers: [officialProvider],
    });

    expect(registry.getAllProviders()).toHaveLength(1);
    expect(registry.getDefaultProvider().metadata.id).toBe("notebooklm-enterprise");
    expect(
      registry.resolveProviderForRequest({ requireCapability: "supportsAudioOverview" })
        .metadata.id
    ).toBe("notebooklm-enterprise");
  });

  it("18. Selection and resolution are pure logic without provider side effects", () => {
    const { officialProvider, legacyProvider } = createStandardProviders();
    const registry = new ProviderRegistry({
      config: standardConfig,
      providers: [officialProvider, legacyProvider],
    });

    // Repeated resolution calls produce deterministic results without mutating state
    for (let i = 0; i < 10; i++) {
      const res = registry.resolveProviderForRequest();
      expect(res.metadata.id).toBe("notebooklm-enterprise");
    }
  });
});
