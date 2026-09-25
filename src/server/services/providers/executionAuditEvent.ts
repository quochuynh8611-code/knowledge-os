/**
 * Execution Audit Event Contract & Sanitizer (Phase 6.5)
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * - Pure, deterministic audit event generation.
 * - Strict metadata sanitization: zero secrets, tokens, filesystem paths, or raw sources.
 * - Immutable, JSON-serializable event structure.
 */

import { createHash } from "node:crypto";
import { sanitizeProviderErrorMessage } from "./errors.js";

export type ExecutionAuditEventType =
  | "DRY_RUN_REQUESTED"
  | "DRY_RUN_ACCEPTED"
  | "DRY_RUN_REPLAYED"
  | "DRY_RUN_REJECTED"
  | "DRY_RUN_TIMEOUT"
  | "DRY_RUN_RETRY_SCHEDULED"
  | "DRY_RUN_CIRCUIT_OPEN"
  | "DRY_RUN_KILL_SWITCH_BLOCKED";

export type ExecutionAuditEvent = {
  readonly eventId: string;
  readonly eventType: ExecutionAuditEventType;
  readonly occurredAt: string;
  readonly environment: "test" | "staging";
  readonly providerId: "antigravity-legacy" | "notebooklm-enterprise";
  readonly tool:
    | "research_create_workspace"
    | "research_ingest_sources"
    | "research_generate_audio";
  readonly correlationId: string;
  readonly dryRunId?: string;
  readonly attempt: number;
  readonly sideEffectsAllowed: false;
  readonly providerCallMade: false;
  readonly networkCallMade: false;
  readonly credentialsAccessed: false;
  readonly metadata: Readonly<Record<string, string>>;
  readonly fingerprint: string;
};

const FORBIDDEN_METADATA_PATTERNS = [
  /bearer\s+[a-z0-9_\-\.]+/i,
  /key-[a-z0-9_\-]+/i,
  /token-[a-z0-9_\-]+/i,
  /api[_-]?key/i,
  /secret/i,
  /password/i,
  /\/Users\//i,
  /\/home\//i,
  /\/etc\//i,
  /process\.env/i,
];

export function sanitizeAuditMetadata(
  rawMetadata?: Readonly<Record<string, string>>
): Readonly<Record<string, string>> {
  if (!rawMetadata) {
    return Object.freeze({});
  }

  const sanitized: Record<string, string> = {};
  const sortedKeys = Object.keys(rawMetadata).sort();

  for (const key of sortedKeys) {
    const rawVal = rawMetadata[key];
    if (typeof rawVal !== "string") {
      continue;
    }

    const isForbidden = FORBIDDEN_METADATA_PATTERNS.some((p) => p.test(key) || p.test(rawVal));
    if (isForbidden) {
      sanitized[key] = "[REDACTED_AUDIT_VALUE]";
    } else {
      sanitized[key] = sanitizeProviderErrorMessage(rawVal);
    }
  }

  return Object.freeze(sanitized);
}

export function computeAuditEventFingerprint(event: {
  readonly attempt: number;
  readonly correlationId: string;
  readonly dryRunId?: string;
  readonly environment: "test" | "staging";
  readonly eventId: string;
  readonly eventType: ExecutionAuditEventType;
  readonly metadata: Readonly<Record<string, string>>;
  readonly occurredAt: string;
  readonly providerId: string;
  readonly tool: string;
}): string {
  const canonical = JSON.stringify({
    attempt: event.attempt,
    correlationId: event.correlationId.trim(),
    dryRunId: event.dryRunId?.trim() ?? "",
    environment: event.environment.trim(),
    eventId: event.eventId.trim(),
    eventType: event.eventType.trim(),
    metadata: event.metadata,
    occurredAt: event.occurredAt.trim(),
    providerId: event.providerId.trim(),
    tool: event.tool.trim(),
  });
  return createHash("sha256").update(canonical).digest("hex");
}

export function createExecutionAuditEvent(params: {
  readonly eventId?: string;
  readonly eventType: ExecutionAuditEventType;
  readonly environment: "test" | "staging";
  readonly providerId: "antigravity-legacy" | "notebooklm-enterprise";
  readonly tool:
    | "research_create_workspace"
    | "research_ingest_sources"
    | "research_generate_audio";
  readonly correlationId: string;
  readonly dryRunId?: string;
  readonly attempt?: number;
  readonly metadata?: Readonly<Record<string, string>>;
  readonly now?: () => Date;
}): ExecutionAuditEvent {
  const now = params.now ? params.now() : new Date();
  const occurredAt = now.toISOString();
  const attempt = Math.max(1, params.attempt ?? 1);
  const metadata = sanitizeAuditMetadata(params.metadata);
  const eventId =
    params.eventId ??
    `audit-${params.eventType.toLowerCase()}-${params.correlationId}-att${attempt}`;

  const base = {
    eventId,
    eventType: params.eventType,
    occurredAt,
    environment: params.environment,
    providerId: params.providerId,
    tool: params.tool,
    correlationId: params.correlationId,
    dryRunId: params.dryRunId,
    attempt,
    sideEffectsAllowed: false as const,
    providerCallMade: false as const,
    networkCallMade: false as const,
    credentialsAccessed: false as const,
    metadata,
  };

  const fingerprint = computeAuditEventFingerprint(base);

  return Object.freeze({
    ...base,
    fingerprint,
  });
}
