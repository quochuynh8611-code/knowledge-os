/**
 * Production Provider Registry & Selection Policy
 * (Phase 4.5 Production Core)
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * - NO real Google Cloud network calls or SDK dependencies.
 * - Pure selection logic, side-effect free.
 * - Strict capability gating and controlled fallback policy.
 * - All error conditions use standardized ProviderException.
 */

import {
  ProviderCapabilities,
  ProviderType,
  ResearchProvider,
} from "./types";
import { ProviderException } from "./errors";

export interface ProviderRegistryConfig {
  defaultProvider: ProviderType;
  allowFallback: boolean;
  enableOfficialProvider: boolean;
  enableLegacyProvider: boolean;
}

export class ProviderRegistry {
  private readonly config: ProviderRegistryConfig;
  private readonly activeProviders: Map<string, ResearchProvider> = new Map();

  constructor(params: {
    config: ProviderRegistryConfig;
    providers: ResearchProvider[];
  }) {
    this.config = { ...params.config };

    for (const provider of params.providers) {
      if (this.isProviderTypeEnabled(provider.metadata.type)) {
        this.activeProviders.set(provider.metadata.id, provider);
      }
    }
  }

  private isProviderTypeEnabled(type: ProviderType): boolean {
    if (type === "official") {
      return this.config.enableOfficialProvider;
    }
    if (type === "legacy") {
      return this.config.enableLegacyProvider;
    }
    return false;
  }

  /**
   * Returns all currently enabled research providers.
   */
  public getAllProviders(): ResearchProvider[] {
    return Array.from(this.activeProviders.values());
  }

  /**
   * Retrieves an enabled provider by its exact unique ID.
   */
  public getProviderById(providerId: string): ResearchProvider | null {
    return this.activeProviders.get(providerId) || null;
  }

  /**
   * Returns the designated default provider according to configuration.
   * Throws ProviderException if the default provider is missing or disabled.
   */
  public getDefaultProvider(): ResearchProvider {
    const matching = this.getAllProviders().find(
      (p) => p.metadata.type === this.config.defaultProvider
    );

    if (!matching) {
      throw new ProviderException(
        "INVALID_ARGUMENT",
        `Default provider type '${this.config.defaultProvider}' is not available or disabled in configuration.`,
        undefined,
        undefined,
        false
      );
    }

    return matching;
  }

  /**
   * Evaluates and returns the appropriate fallback provider for a primary provider.
   * Policy:
   * - Only allowed when allowFallback === true.
   * - Official -> Legacy fallback is permitted if legacy is enabled.
   * - Legacy -> Official automatic promotion is NEVER permitted.
   */
  public getFallbackProvider(primaryProviderId: string): ResearchProvider | null {
    if (!this.config.allowFallback) {
      return null;
    }

    const primary = this.getProviderById(primaryProviderId);
    if (!primary) {
      return null;
    }

    if (primary.metadata.type === "official") {
      // Find an enabled legacy provider
      const legacyProvider = this.getAllProviders().find(
        (p) => p.metadata.type === "legacy"
      );
      return legacyProvider || null;
    }

    // Never auto-promote legacy to official
    return null;
  }

  /**
   * Resolves the most appropriate provider for a given research request.
   */
  public resolveProviderForRequest(params?: {
    preferredProviderId?: string | null;
    requireCapability?: keyof ProviderCapabilities;
  }): ResearchProvider {
    // 1. If preferredProviderId is specified
    if (params?.preferredProviderId) {
      const preferred = this.getProviderById(params.preferredProviderId);
      if (!preferred) {
        throw new ProviderException(
          "INVALID_ARGUMENT",
          `Preferred provider '${params.preferredProviderId}' is not available or disabled.`,
          undefined,
          params.preferredProviderId,
          false
        );
      }

      if (params.requireCapability) {
        const caps = preferred.getCapabilities();
        if (!caps[params.requireCapability]) {
          throw new ProviderException(
            "CAPABILITY_UNSUPPORTED",
            `Preferred provider '${params.preferredProviderId}' does not support required capability '${params.requireCapability}'.`,
            undefined,
            preferred.metadata.id,
            false
          );
        }
      }

      return preferred;
    }

    // 2. Default provider resolution
    const defaultProvider = this.getDefaultProvider();

    if (!params?.requireCapability) {
      return defaultProvider;
    }

    // Check if default provider satisfies capability
    if (defaultProvider.getCapabilities()[params.requireCapability]) {
      return defaultProvider;
    }

    // 3. Find another enabled provider that satisfies requireCapability
    const candidate = this.getAllProviders().find(
      (p) => p.getCapabilities()[params.requireCapability!] === true
    );

    if (candidate) {
      return candidate;
    }

    throw new ProviderException(
      "CAPABILITY_UNSUPPORTED",
      `No available provider supports required capability '${params.requireCapability}'.`,
      undefined,
      undefined,
      false
    );
  }
}
