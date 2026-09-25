/**
 * Research Provider Dependency Composition
 * (Phase 5.2 Application Routing & Feature-Flag Wiring)
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * - Deterministic and side-effect free.
 * - NO process.env mutation.
 * - NO import-time singleton.
 * - NO implicit cloud clients or credentials.
 * - Returns safe disabled composition when enableProviderRouting is false.
 */

import {
  ResearchProviderConfig,
  isProviderAllowed,
  APPROVED_PROVIDER_IDS,
  readResearchProviderConfig,
} from "../config/researchProviderConfig";
import { ProviderRegistry } from "../services/providers/providerRegistry";
import { ResearchOrchestrator } from "../services/providers/researchOrchestrator";
import { ResearchPersistencePort } from "../services/providers/researchPersistencePort";
import { AntigravityProvider } from "../services/providers/antigravityProvider";
import { NotebookLMEnterpriseProvider } from "../services/providers/notebooklmEnterpriseProvider";
import { MockNotebookLMClient } from "../services/providers/notebooklmClient";
import { ResearchProvider } from "../services/providers/types";

export type ResearchProviderComposition = {
  config: ResearchProviderConfig;
  providerRegistry: ProviderRegistry | null;
  orchestrator: ResearchOrchestrator | null;
  persistence: ResearchPersistencePort | null;
  enabledProviderIds: string[];
};

export interface ComposeResearchProviderParams {
  config: ResearchProviderConfig;
  deps?: {
    providerRegistry?: ProviderRegistry;
    orchestrator?: ResearchOrchestrator;
    persistence?: ResearchPersistencePort;
  };
}

/**
 * Pure dependency composition function for research provider infrastructure.
 * Ensures strict capability gating and fail-safe defaults.
 */
export function composeResearchProviderDependencies(
  params: ComposeResearchProviderParams
): ResearchProviderComposition {
  const { config, deps } = params;

  // 1. If routing is disabled, return safe disabled composition immediately
  if (!config.enableProviderRouting) {
    return {
      config: { ...config },
      providerRegistry: null,
      orchestrator: null,
      persistence: null,
      enabledProviderIds: [],
    };
  }

  // 2. Validate default provider is allowed
  if (!isProviderAllowed(config.defaultProviderId, config)) {
    // Fail safely: if default provider is not allowed, disable composition
    return {
      config: { ...config },
      providerRegistry: null,
      orchestrator: null,
      persistence: null,
      enabledProviderIds: [],
    };
  }

  // 3. Determine enabled provider IDs in deterministic order
  const enabledProviderIds: string[] = [];
  if (isProviderAllowed(APPROVED_PROVIDER_IDS.LEGACY, config)) {
    enabledProviderIds.push(APPROVED_PROVIDER_IDS.LEGACY);
  }
  if (isProviderAllowed(APPROVED_PROVIDER_IDS.NOTEBOOKLM_ENTERPRISE, config)) {
    enabledProviderIds.push(APPROVED_PROVIDER_IDS.NOTEBOOKLM_ENTERPRISE);
  }

  // 4. Use injected dependencies without implicit cloud client creation
  const providerRegistry = deps?.providerRegistry || null;
  const orchestrator = deps?.orchestrator || null;
  const persistence = deps?.persistence || null;

  return {
    config: { ...config },
    providerRegistry,
    orchestrator,
    persistence,
    enabledProviderIds,
  };
}

/**
 * Constructs the default production ProviderRegistry from config.
 * Pure and side-effect free: uses AntigravityProvider and NotebookLMEnterpriseProvider (with safe client boundary).
 */
export function createDefaultProviderRegistry(
  config: ResearchProviderConfig
): ProviderRegistry {
  const providers: ResearchProvider[] = [
    new AntigravityProvider(),
    new NotebookLMEnterpriseProvider(new MockNotebookLMClient()),
  ];
  return new ProviderRegistry({
    config: {
      defaultProvider:
        config.defaultProviderId === "notebooklm-enterprise"
          ? "official"
          : "legacy",
      allowFallback: config.allowProviderFallback,
      enableOfficialProvider: config.allowNotebookLM,
      enableLegacyProvider: true,
    },
    providers,
  });
}

/**
 * Common payload structure for research provider diagnostics.
 */
export interface ResearchProviderDiagnosticsPayload {
  routingEnabled: boolean;
  defaultProviderId: string;
  allowProviderFallback: boolean;
  providers: Array<{
    id: string;
    displayName: string;
    capabilities: string[];
    allowed: boolean;
  }>;
}

/**
 * Formats a provider configuration and registry into a canonical diagnostics payload.
 * Pure, deterministic, and side-effect free. Shared source-of-truth for HTTP and MCP.
 */
export function formatResearchProviderDiagnostics(diagnostics: {
  config: ResearchProviderConfig;
  providerRegistry: ProviderRegistry | null;
}): ResearchProviderDiagnosticsPayload {
  const { config, providerRegistry } = diagnostics;

  if (!config.enableProviderRouting) {
    return {
      routingEnabled: false,
      defaultProviderId: config.defaultProviderId,
      allowProviderFallback: config.allowProviderFallback,
      providers: [],
    };
  }

  const rawProviders = providerRegistry ? providerRegistry.getAllProviders() : [];
  const filteredProviders = rawProviders
    .filter((p) => isProviderAllowed(p.metadata.id, config))
    .sort((a, b) => a.metadata.id.localeCompare(b.metadata.id))
    .map((p) => {
      const caps = p.getCapabilities();
      const capabilityNames = (Object.keys(caps) as Array<keyof typeof caps>).filter(
        (k) => caps[k] === true
      );

      return {
        id: p.metadata.id,
        displayName: p.metadata.name || p.metadata.id,
        capabilities: capabilityNames,
        allowed: true,
      };
    });

  return {
    routingEnabled: true,
    defaultProviderId: config.defaultProviderId,
    allowProviderFallback: config.allowProviderFallback,
    providers: filteredProviders,
  };
}

/**
 * Creates the runtime diagnostics dependency bundle for research session router and MCP server.
 * Fail-safe and side-effect free: does not start MCP listeners, does not call network.
 */
export function createResearchProviderRuntimeDiagnostics(
  env: NodeJS.ProcessEnv = process.env
): {
  config: ResearchProviderConfig;
  providerRegistry: ProviderRegistry | null;
} {
  const config = readResearchProviderConfig(env);
  let providerRegistry: ProviderRegistry | null = null;
  try {
    providerRegistry = createDefaultProviderRegistry(config);
  } catch {
    providerRegistry = null;
  }
  return {
    config,
    providerRegistry,
  };
}

