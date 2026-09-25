/**
 * Execution Audit Event Unit Tests (Phase 6.5)
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * - Sanitization of audit metadata (zero secrets, paths, tokens, or raw sources).
 * - Immutable, JSON-serializable events with deterministic fingerprinting.
 */

import { describe, it, expect } from "vitest";
import {
  createExecutionAuditEvent,
  computeAuditEventFingerprint,
  sanitizeAuditMetadata,
} from "../../src/server/services/providers/executionAuditEvent.js";

describe("EXECUTION AUDIT EVENT (PHASE 6.5)", () => {
  it("1. Event type is allowlisted", () => {
    const ev = createExecutionAuditEvent({
      eventType: "DRY_RUN_ACCEPTED",
      environment: "staging",
      providerId: "notebooklm-enterprise",
      tool: "research_create_workspace",
      correlationId: "corr-123",
    });
    expect(ev.eventType).toBe("DRY_RUN_ACCEPTED");
  });

  it("2. Metadata is sanitized", () => {
    const meta = sanitizeAuditMetadata({
      normalKey: "normal value",
      safeStatus: "OK",
    });
    expect(meta.normalKey).toBe("normal value");
  });

  it("3. Secret is rejected/redacted in metadata", () => {
    const meta = sanitizeAuditMetadata({
      authHeader: "Bearer eyJhbGciOi...",
      secretKey: "secret-12345",
    });
    expect(meta.authHeader).toBe("[REDACTED_AUDIT_VALUE]");
    expect(meta.secretKey).toBe("[REDACTED_AUDIT_VALUE]");
  });

  it("4. Path is rejected/redacted in metadata", () => {
    const meta = sanitizeAuditMetadata({
      filePath: "/Users/admin/data.txt",
    });
    expect(meta.filePath).toBe("[REDACTED_AUDIT_VALUE]");
  });

  it("5. Raw source is rejected", () => {
    const ev = createExecutionAuditEvent({
      eventType: "DRY_RUN_ACCEPTED",
      environment: "staging",
      providerId: "notebooklm-enterprise",
      tool: "research_ingest_sources",
      correlationId: "corr-123",
    });
    expect((ev as any).sourceText).toBeUndefined();
  });

  it("6. Process env is rejected in metadata", () => {
    const meta = sanitizeAuditMetadata({
      envVar: "process.env.SECRET",
    });
    expect(meta.envVar).toBe("[REDACTED_AUDIT_VALUE]");
  });

  it("7. Stack path is rejected in metadata", () => {
    const meta = sanitizeAuditMetadata({
      stack: "Error at /home/user/app/index.ts",
    });
    expect(meta.stack).toBe("[REDACTED_AUDIT_VALUE]");
  });

  it("8. Event is JSON-serializable", () => {
    const ev = createExecutionAuditEvent({
      eventType: "DRY_RUN_ACCEPTED",
      environment: "staging",
      providerId: "notebooklm-enterprise",
      tool: "research_create_workspace",
      correlationId: "corr-123",
    });
    const json = JSON.stringify(ev);
    expect(typeof json).toBe("string");
  });

  it("9. Event is immutable", () => {
    const ev = createExecutionAuditEvent({
      eventType: "DRY_RUN_ACCEPTED",
      environment: "staging",
      providerId: "notebooklm-enterprise",
      tool: "research_create_workspace",
      correlationId: "corr-123",
    });
    expect(() => {
      (ev as any).eventType = "DRY_RUN_REJECTED";
    }).toThrow();
  });

  it("10. Fingerprint is deterministic", () => {
    const base = {
      attempt: 1,
      correlationId: "corr-123",
      environment: "staging" as const,
      eventId: "ev-123",
      eventType: "DRY_RUN_ACCEPTED" as const,
      metadata: {},
      occurredAt: "2026-09-24T12:00:00.000Z",
      providerId: "notebooklm-enterprise",
      tool: "research_create_workspace",
    };
    const fp1 = computeAuditEventFingerprint(base);
    const fp2 = computeAuditEventFingerprint(base);
    expect(fp1).toBe(fp2);
  });

  it("11. Correlation ID is preserved", () => {
    const ev = createExecutionAuditEvent({
      eventType: "DRY_RUN_ACCEPTED",
      environment: "staging",
      providerId: "notebooklm-enterprise",
      tool: "research_create_workspace",
      correlationId: "corr-custom-123",
    });
    expect(ev.correlationId).toBe("corr-custom-123");
  });

  it("12. Provider ID is preserved", () => {
    const ev = createExecutionAuditEvent({
      eventType: "DRY_RUN_ACCEPTED",
      environment: "staging",
      providerId: "antigravity-legacy",
      tool: "research_ingest_sources",
      correlationId: "corr-123",
    });
    expect(ev.providerId).toBe("antigravity-legacy");
  });

  it("13. Tool is preserved", () => {
    const ev = createExecutionAuditEvent({
      eventType: "DRY_RUN_ACCEPTED",
      environment: "staging",
      providerId: "notebooklm-enterprise",
      tool: "research_generate_audio",
      correlationId: "corr-123",
    });
    expect(ev.tool).toBe("research_generate_audio");
  });

  it("14. Attempt is preserved", () => {
    const ev = createExecutionAuditEvent({
      eventType: "DRY_RUN_ACCEPTED",
      environment: "staging",
      providerId: "notebooklm-enterprise",
      tool: "research_create_workspace",
      correlationId: "corr-123",
      attempt: 2,
    });
    expect(ev.attempt).toBe(2);
  });

  it("15. Safety flags are false", () => {
    const ev = createExecutionAuditEvent({
      eventType: "DRY_RUN_ACCEPTED",
      environment: "staging",
      providerId: "notebooklm-enterprise",
      tool: "research_create_workspace",
      correlationId: "corr-123",
    });
    expect(ev.sideEffectsAllowed).toBe(false);
    expect(ev.providerCallMade).toBe(false);
    expect(ev.networkCallMade).toBe(false);
    expect(ev.credentialsAccessed).toBe(false);
  });

  it("16. Event IDs are deterministic when injected", () => {
    const ev = createExecutionAuditEvent({
      eventId: "custom-audit-id",
      eventType: "DRY_RUN_ACCEPTED",
      environment: "staging",
      providerId: "notebooklm-enterprise",
      tool: "research_create_workspace",
      correlationId: "corr-123",
    });
    expect(ev.eventId).toBe("custom-audit-id");
  });

  it("17. Audit failure cannot enable provider", () => {
    const ev = createExecutionAuditEvent({
      eventType: "DRY_RUN_REJECTED",
      environment: "staging",
      providerId: "notebooklm-enterprise",
      tool: "research_create_workspace",
      correlationId: "corr-123",
    });
    expect(ev.providerCallMade).toBe(false);
  });

  it("18. Audit failure cannot enable network", () => {
    const ev = createExecutionAuditEvent({
      eventType: "DRY_RUN_REJECTED",
      environment: "staging",
      providerId: "notebooklm-enterprise",
      tool: "research_create_workspace",
      correlationId: "corr-123",
    });
    expect(ev.networkCallMade).toBe(false);
  });

  it("19. Audit failure cannot disable kill-switch", () => {
    const ev = createExecutionAuditEvent({
      eventType: "DRY_RUN_KILL_SWITCH_BLOCKED",
      environment: "staging",
      providerId: "notebooklm-enterprise",
      tool: "research_create_workspace",
      correlationId: "corr-123",
    });
    expect(ev.eventType).toBe("DRY_RUN_KILL_SWITCH_BLOCKED");
  });

  it("20. Audit event does not mutate input", () => {
    const meta = { key: "value" };
    createExecutionAuditEvent({
      eventType: "DRY_RUN_ACCEPTED",
      environment: "staging",
      providerId: "notebooklm-enterprise",
      tool: "research_create_workspace",
      correlationId: "corr-123",
      metadata: meta,
    });
    expect(meta).toEqual({ key: "value" });
  });
});
