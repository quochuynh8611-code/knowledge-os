/**
 * Research Provider Configuration
 * (Phase 5.2 Application Routing & Feature-Flag Wiring)
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * - Pure configuration parsing, deterministic and side-effect free.
 * - NO process.env mutation.
 * - NO secret or credential fields returned.
 * - Safe defaults: routing disabled, NotebookLM denied, fallback enabled.
 */

export type ResearchProviderConfig = {
  enableProviderRouting: boolean;
  defaultProviderId: string;
  allowNotebookLM: boolean;
  allowProviderFallback: boolean;
  enableMcpServer: boolean;
};

export const APPROVED_PROVIDER_IDS = Object.freeze({
  LEGACY: "antigravity-legacy",
  NOTEBOOKLM_ENTERPRISE: "notebooklm-enterprise",
} as const);

export const DEFAULT_RESEARCH_PROVIDER_CONFIG: Readonly<ResearchProviderConfig> = Object.freeze({
  enableProviderRouting: false,
  defaultProviderId: APPROVED_PROVIDER_IDS.LEGACY,
  allowNotebookLM: false,
  allowProviderFallback: true,
  enableMcpServer: false,
});

export type ResearchExecutionPolicy = {
  readonly simulationOnly: true;
  readonly realExecutionEnabled: false;
  readonly requireManualApproval: true;
  readonly allowNotebookLM: false;
  readonly allowAntigravity: false;
};

export const DEFAULT_RESEARCH_EXECUTION_POLICY: Readonly<ResearchExecutionPolicy> = Object.freeze({
  simulationOnly: true,
  realExecutionEnabled: false,
  requireManualApproval: true,
  allowNotebookLM: false,
  allowAntigravity: false,
});

const TRUE_BOOLEAN_STRINGS = new Set(["1", "true", "yes", "on"]);

function parseBooleanFlag(val: string | undefined, defaultValue: boolean): boolean {
  if (val === undefined || val === null) {
    return defaultValue;
  }
  const trimmed = String(val).trim().toLowerCase();
  if (trimmed === "") {
    return defaultValue;
  }
  return TRUE_BOOLEAN_STRINGS.has(trimmed);
}

/**
 * Reads and validates Research Provider Configuration from an environment dictionary.
 * Does not mutate input or process.env.
 */
export function readResearchProviderConfig(
  env: NodeJS.ProcessEnv = process.env
): ResearchProviderConfig {
  const enableProviderRouting = parseBooleanFlag(env.ENABLE_PROVIDER_ROUTING, false);

  const rawDefaultProvider = env.RESEARCH_DEFAULT_PROVIDER?.trim();
  const defaultProviderId =
    rawDefaultProvider && rawDefaultProvider.length > 0
      ? rawDefaultProvider
      : DEFAULT_RESEARCH_PROVIDER_CONFIG.defaultProviderId;

  const allowNotebookLM = parseBooleanFlag(env.RESEARCH_ALLOW_NOTEBOOKLM, false);
  const allowProviderFallback = parseBooleanFlag(env.RESEARCH_ALLOW_PROVIDER_FALLBACK, true);
  const enableMcpServer = parseBooleanFlag(env.ENABLE_RESEARCH_MCP_SERVER, false);

  return {
    enableProviderRouting,
    defaultProviderId,
    allowNotebookLM,
    allowProviderFallback,
    enableMcpServer,
  };
}

/**
 * Validates whether a specific provider ID is approved and allowed under the current configuration.
 */
export function isProviderAllowed(
  providerId: string,
  config: ResearchProviderConfig
): boolean {
  if (!providerId || typeof providerId !== "string") {
    return false;
  }
  const normalized = providerId.trim();

  if (normalized === APPROVED_PROVIDER_IDS.NOTEBOOKLM_ENTERPRISE) {
    return config.allowNotebookLM === true;
  }

  if (normalized === APPROVED_PROVIDER_IDS.LEGACY) {
    return true;
  }

  return false;
}
