/**
 * Provider-Specific Dry-Run Contract (Phase 6.5)
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * - Pure, deterministic, side-effect free dry-run contract and helper functions.
 * - Provider-specific capability enforcement.
 * - Zero live network, credentials, or provider execution.
 */

import { createHash } from "node:crypto";
import { sanitizeProviderErrorMessage } from "./errors.js";

export type ProviderDryRunTool =
  | "research_create_workspace"
  | "research_ingest_sources"
  | "research_generate_audio";

export type ProviderDryRunRequest = {
  readonly providerId: "antigravity-legacy" | "notebooklm-enterprise";
  readonly tool: ProviderDryRunTool;
  readonly correlationId: string;
  readonly inputFingerprint: string;
  readonly requestFingerprint: string;
  readonly environment: "test" | "staging";
  readonly attempt: number;
};

export type ProviderDryRunStatus =
  | "ACCEPTED"
  | "REPLAY"
  | "REJECTED"
  | "TIMEOUT"
  | "TRANSIENT_FAILURE"
  | "PERMANENT_FAILURE";

export type ProviderDryRunErrorCode =
  | "UNSUPPORTED_TOOL"
  | "INVALID_INPUT"
  | "TRANSIENT_PROVIDER_FAILURE"
  | "PERMANENT_PROVIDER_FAILURE"
  | "SIMULATED_TIMEOUT"
  | "SIMULATED_RATE_LIMIT";

export type ProviderDryRunResponse = {
  readonly providerId: string;
  readonly tool: ProviderDryRunTool;
  readonly status: ProviderDryRunStatus;
  readonly providerRequestId: string;
  readonly attempt: number;
  readonly retryable: boolean;
  readonly outputFingerprint?: string;
  readonly errorCode?: ProviderDryRunErrorCode;
  readonly sideEffectsAllowed: false;
  readonly providerCallMade: false;
  readonly networkCallMade: false;
  readonly credentialsAccessed: false;
};

/**
 * Capability Matrix mapping for provider dry-runs:
 * - 'notebooklm-enterprise': supports workspace management, source ingestion, audio overview
 * - 'antigravity-legacy': supports source ingestion only (workspace and audio overview unsupported)
 */
export function isToolSupportedByProvider(
  providerId: "antigravity-legacy" | "notebooklm-enterprise",
  tool: ProviderDryRunTool
): boolean {
  if (providerId === "notebooklm-enterprise") {
    return (
      tool === "research_create_workspace" ||
      tool === "research_ingest_sources" ||
      tool === "research_generate_audio"
    );
  }

  if (providerId === "antigravity-legacy") {
    return tool === "research_ingest_sources";
  }

  return false;
}

/**
 * Computes a deterministic SHA-256 fingerprint for a dry-run request or response.
 */
export function computeProviderDryRunFingerprint(params: {
  readonly providerId: string;
  readonly tool: ProviderDryRunTool;
  readonly correlationId: string;
  readonly inputFingerprint: string;
  readonly attempt?: number;
  readonly status?: ProviderDryRunStatus;
  readonly errorCode?: ProviderDryRunErrorCode;
}): string {
  const canonical = JSON.stringify({
    attempt: params.attempt ?? 1,
    correlationId: params.correlationId.trim(),
    errorCode: params.errorCode?.trim() ?? "",
    inputFingerprint: params.inputFingerprint.trim(),
    providerId: params.providerId.trim(),
    status: params.status?.trim() ?? "",
    tool: params.tool.trim(),
  });
  return createHash("sha256").update(canonical).digest("hex");
}
