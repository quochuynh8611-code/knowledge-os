/**
 * Provider Dry-Run Adapter (Phase 6.5)
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * - Pure, deterministic staging execution simulation.
 * - FakeProviderTransport is the EXCLUSIVE transport dependency.
 * - Zero live network, credentials, subprocesses, or real providers imported.
 * - Fail-closed on kill-switch, capability escalation, or production environment.
 */

import { createHash } from "node:crypto";
import {
  StagingSandboxRequest,
  StagingSandboxResult,
  validateStagingSandboxRequest,
  computeStagingSandboxResultFingerprint,
} from "./stagingSandboxContract.js";
import {
  FakeProviderTransport,
  DeterministicFakeProviderTransport,
} from "./fakeProviderTransport.js";
import {
  isToolSupportedByProvider,
  ProviderDryRunRequest,
  ProviderDryRunResponse,
} from "./providerDryRunContract.js";
import {
  ExecutionKillSwitchState,
  DEFAULT_KILL_SWITCH,
  validateKillSwitch,
} from "./executionKillSwitch.js";
import {
  CircuitBreakerSnapshot,
  createInitialCircuitBreakerSnapshot,
  isCircuitRequestAllowed,
  recordCircuitSuccess,
  recordCircuitFailure,
} from "./circuitBreakerPolicy.js";
import {
  ExecutionAuditEvent,
  createExecutionAuditEvent,
} from "./executionAuditEvent.js";

const EMPTY_RESOURCES: readonly [] = [] as const;

export interface StagingDryRunRecord {
  readonly dryRunId: string;
  readonly request: StagingSandboxRequest;
  readonly response: ProviderDryRunResponse;
  readonly result: StagingSandboxResult;
  readonly createdAt: string;
}

export interface ProviderDryRunAdapterParams {
  readonly transport?: FakeProviderTransport;
  readonly killSwitch?: ExecutionKillSwitchState;
  readonly now?: () => Date;
}

export class ProviderDryRunAdapter {
  private readonly transport: FakeProviderTransport;
  private readonly killSwitch: ExecutionKillSwitchState;
  private readonly now: () => Date;
  private readonly dryRunRecords = new Map<string, StagingDryRunRecord>();
  private readonly circuitBreakers = new Map<string, CircuitBreakerSnapshot>();
  private readonly auditEvents: ExecutionAuditEvent[] = [];

  constructor(params?: ProviderDryRunAdapterParams) {
    this.transport = params?.transport ?? new DeterministicFakeProviderTransport();
    this.killSwitch = params?.killSwitch ?? DEFAULT_KILL_SWITCH;
    this.now = params?.now ?? (() => new Date());
  }

  public getAuditEvents(): readonly ExecutionAuditEvent[] {
    return Object.freeze([...this.auditEvents]);
  }

  public getCircuitBreakerSnapshot(providerId: string): CircuitBreakerSnapshot {
    return (
      this.circuitBreakers.get(providerId) ??
      createInitialCircuitBreakerSnapshot(providerId)
    );
  }

  public async executeDryRun(
    request: StagingSandboxRequest
  ): Promise<StagingSandboxResult> {
    const now = this.now();
    const nowIso = now.toISOString();

    // 1. Validate request structure and base invariants
    const val = validateStagingSandboxRequest(request);
    if (!val.valid) {
      const isProduction =
        (request as unknown as Record<string, unknown>)?.environment === "production";
      const reason = isProduction ? "PRODUCTION_FORBIDDEN" : "INVALID_REQUEST";

      const auditEvent = createExecutionAuditEvent({
        eventType: "DRY_RUN_REJECTED",
        environment: isProduction ? "staging" : (request.environment ?? "staging"),
        providerId: request.providerId ?? "antigravity-legacy",
        tool: request.tool ?? "research_ingest_sources",
        correlationId: request.correlationId ?? "unknown-correlation",
        metadata: { reason, errors: val.errors.join("; ") },
        now: () => now,
      });
      this.auditEvents.push(auditEvent);

      const fp = computeStagingSandboxResultFingerprint({
        kind: "dry_run_rejected",
        environment: isProduction ? "staging" : request.environment,
        mode: "dry_run",
        providerId: request.providerId ?? "antigravity-legacy",
        tool: request.tool ?? "research_ingest_sources",
        correlationId: request.correlationId ?? "unknown-correlation",
        reason,
        auditEventId: auditEvent.eventId,
      });

      return Object.freeze({
        kind: "dry_run_rejected",
        environment: isProduction ? "staging" : request.environment,
        mode: "dry_run",
        providerId: request.providerId ?? "antigravity-legacy",
        tool: request.tool ?? "research_ingest_sources",
        correlationId: request.correlationId ?? "unknown-correlation",
        reason,
        sideEffectsAllowed: false,
        networkCallMade: false,
        credentialsAccessed: false,
        providerCallMade: false,
        createdResources: EMPTY_RESOURCES,
        auditEventId: auditEvent.eventId,
        fingerprint: fp,
      });
    }

    // 2. Validate Kill Switch
    const killVal = validateKillSwitch(this.killSwitch);
    if (!killVal.valid || this.killSwitch.active) {
      const auditEvent = createExecutionAuditEvent({
        eventType: "DRY_RUN_KILL_SWITCH_BLOCKED",
        environment: request.environment,
        providerId: request.providerId,
        tool: request.tool,
        correlationId: request.correlationId,
        metadata: { reason: "KILL_SWITCH_ACTIVE" },
        now: () => now,
      });
      this.auditEvents.push(auditEvent);

      const fp = computeStagingSandboxResultFingerprint({
        kind: "dry_run_rejected",
        environment: request.environment,
        mode: "dry_run",
        providerId: request.providerId,
        tool: request.tool,
        correlationId: request.correlationId,
        reason: "KILL_SWITCH_ACTIVE",
        auditEventId: auditEvent.eventId,
      });

      return Object.freeze({
        kind: "dry_run_rejected",
        environment: request.environment,
        mode: "dry_run",
        providerId: request.providerId,
        tool: request.tool,
        correlationId: request.correlationId,
        reason: "KILL_SWITCH_ACTIVE",
        sideEffectsAllowed: false,
        networkCallMade: false,
        credentialsAccessed: false,
        providerCallMade: false,
        createdResources: EMPTY_RESOURCES,
        auditEventId: auditEvent.eventId,
        fingerprint: fp,
      });
    }

    // 3. Validate Capability Escalation
    if (
      request.capabilities.network ||
      request.capabilities.credentials ||
      request.capabilities.providerExecution ||
      request.capabilities.childProcess
    ) {
      const auditEvent = createExecutionAuditEvent({
        eventType: "DRY_RUN_REJECTED",
        environment: request.environment,
        providerId: request.providerId,
        tool: request.tool,
        correlationId: request.correlationId,
        metadata: { reason: "CAPABILITY_ESCALATION" },
        now: () => now,
      });
      this.auditEvents.push(auditEvent);

      const fp = computeStagingSandboxResultFingerprint({
        kind: "dry_run_rejected",
        environment: request.environment,
        mode: "dry_run",
        providerId: request.providerId,
        tool: request.tool,
        correlationId: request.correlationId,
        reason: "CAPABILITY_ESCALATION",
        auditEventId: auditEvent.eventId,
      });

      return Object.freeze({
        kind: "dry_run_rejected",
        environment: request.environment,
        mode: "dry_run",
        providerId: request.providerId,
        tool: request.tool,
        correlationId: request.correlationId,
        reason: "CAPABILITY_ESCALATION",
        sideEffectsAllowed: false,
        networkCallMade: false,
        credentialsAccessed: false,
        providerCallMade: false,
        createdResources: EMPTY_RESOURCES,
        auditEventId: auditEvent.eventId,
        fingerprint: fp,
      });
    }

    // 4. Validate Provider Tool Support
    if (!isToolSupportedByProvider(request.providerId, request.tool)) {
      const auditEvent = createExecutionAuditEvent({
        eventType: "DRY_RUN_REJECTED",
        environment: request.environment,
        providerId: request.providerId,
        tool: request.tool,
        correlationId: request.correlationId,
        metadata: { reason: "PROVIDER_UNSUPPORTED" },
        now: () => now,
      });
      this.auditEvents.push(auditEvent);

      const fp = computeStagingSandboxResultFingerprint({
        kind: "dry_run_rejected",
        environment: request.environment,
        mode: "dry_run",
        providerId: request.providerId,
        tool: request.tool,
        correlationId: request.correlationId,
        reason: "PROVIDER_UNSUPPORTED",
        auditEventId: auditEvent.eventId,
      });

      return Object.freeze({
        kind: "dry_run_rejected",
        environment: request.environment,
        mode: "dry_run",
        providerId: request.providerId,
        tool: request.tool,
        correlationId: request.correlationId,
        reason: "PROVIDER_UNSUPPORTED",
        sideEffectsAllowed: false,
        networkCallMade: false,
        credentialsAccessed: false,
        providerCallMade: false,
        createdResources: EMPTY_RESOURCES,
        auditEventId: auditEvent.eventId,
        fingerprint: fp,
      });
    }

    // 5. Check Circuit Breaker
    const currentCircuit = this.getCircuitBreakerSnapshot(request.providerId);
    const circuitCheck = isCircuitRequestAllowed(currentCircuit, {
      now: () => now,
    });
    this.circuitBreakers.set(request.providerId, circuitCheck.snapshot);

    if (!circuitCheck.allowed) {
      const auditEvent = createExecutionAuditEvent({
        eventType: "DRY_RUN_CIRCUIT_OPEN",
        environment: request.environment,
        providerId: request.providerId,
        tool: request.tool,
        correlationId: request.correlationId,
        metadata: { reason: "CIRCUIT_OPEN" },
        now: () => now,
      });
      this.auditEvents.push(auditEvent);

      const fp = computeStagingSandboxResultFingerprint({
        kind: "dry_run_rejected",
        environment: request.environment,
        mode: "dry_run",
        providerId: request.providerId,
        tool: request.tool,
        correlationId: request.correlationId,
        reason: "CIRCUIT_OPEN",
        auditEventId: auditEvent.eventId,
      });

      return Object.freeze({
        kind: "dry_run_rejected",
        environment: request.environment,
        mode: "dry_run",
        providerId: request.providerId,
        tool: request.tool,
        correlationId: request.correlationId,
        reason: "CIRCUIT_OPEN",
        sideEffectsAllowed: false,
        networkCallMade: false,
        credentialsAccessed: false,
        providerCallMade: false,
        createdResources: EMPTY_RESOURCES,
        auditEventId: auditEvent.eventId,
        fingerprint: fp,
      });
    }

    // 6. Check Idempotency & Replay
    const existing = this.dryRunRecords.get(request.correlationId);
    if (existing) {
      const isExactMatch =
        existing.request.inputFingerprint === request.inputFingerprint &&
        existing.request.providerId === request.providerId &&
        existing.request.tool === request.tool &&
        existing.request.approvalFingerprint === request.approvalFingerprint &&
        existing.request.readinessReportFingerprint ===
          request.readinessReportFingerprint;

      if (!isExactMatch) {
        // Idempotency conflict: do NOT overwrite snapshot
        const auditEvent = createExecutionAuditEvent({
          eventType: "DRY_RUN_REJECTED",
          environment: request.environment,
          providerId: request.providerId,
          tool: request.tool,
          correlationId: request.correlationId,
          metadata: { reason: "IDEMPOTENCY_CONFLICT" },
          now: () => now,
        });
        this.auditEvents.push(auditEvent);

        const fp = computeStagingSandboxResultFingerprint({
          kind: "dry_run_rejected",
          environment: request.environment,
          mode: "dry_run",
          providerId: request.providerId,
          tool: request.tool,
          correlationId: request.correlationId,
          reason: "IDEMPOTENCY_CONFLICT",
          auditEventId: auditEvent.eventId,
        });

        return Object.freeze({
          kind: "dry_run_rejected",
          environment: request.environment,
          mode: "dry_run",
          providerId: request.providerId,
          tool: request.tool,
          correlationId: request.correlationId,
          reason: "IDEMPOTENCY_CONFLICT",
          sideEffectsAllowed: false,
          networkCallMade: false,
          credentialsAccessed: false,
          providerCallMade: false,
          createdResources: EMPTY_RESOURCES,
          auditEventId: auditEvent.eventId,
          fingerprint: fp,
        });
      }

      // Replay: return existing result without calling transport
      const auditEvent = createExecutionAuditEvent({
        eventType: "DRY_RUN_REPLAYED",
        environment: request.environment,
        providerId: request.providerId,
        tool: request.tool,
        correlationId: request.correlationId,
        dryRunId: existing.dryRunId,
        metadata: { replay: "true" },
        now: () => now,
      });
      this.auditEvents.push(auditEvent);

      const fp = computeStagingSandboxResultFingerprint({
        kind: "dry_run_accepted",
        environment: request.environment,
        mode: "dry_run",
        providerId: request.providerId,
        tool: request.tool,
        dryRunId: existing.dryRunId,
        correlationId: request.correlationId,
        simulatedProviderStatus: "REPLAY",
        auditEventId: auditEvent.eventId,
      });

      return Object.freeze({
        kind: "dry_run_accepted",
        environment: request.environment,
        mode: "dry_run",
        providerId: request.providerId,
        tool: request.tool,
        dryRunId: existing.dryRunId,
        correlationId: request.correlationId,
        simulatedProviderStatus: "REPLAY",
        sideEffectsAllowed: false,
        networkCallMade: false,
        credentialsAccessed: false,
        providerCallMade: false,
        createdResources: EMPTY_RESOURCES,
        auditEventId: auditEvent.eventId,
        fingerprint: fp,
      });
    }

    // 7. Execute Fake Transport
    const dryRunReq: ProviderDryRunRequest = {
      providerId: request.providerId,
      tool: request.tool,
      correlationId: request.correlationId,
      inputFingerprint: request.inputFingerprint,
      requestFingerprint: request.handoffFingerprint,
      environment: request.environment,
      attempt: 1,
    };

    const dryRunResp = await this.transport.execute(dryRunReq);
    const dryRunId = `dryrun-${request.providerId}-${createHash("sha256").update(request.correlationId + request.inputFingerprint).digest("hex").substring(0, 12)}`;

    // 8. Update Circuit Breaker
    const isSuccess =
      dryRunResp.status === "ACCEPTED" || dryRunResp.status === "REPLAY";

    if (isSuccess) {
      this.circuitBreakers.set(
        request.providerId,
        recordCircuitSuccess(this.getCircuitBreakerSnapshot(request.providerId))
      );
    } else {
      this.circuitBreakers.set(
        request.providerId,
        recordCircuitFailure(this.getCircuitBreakerSnapshot(request.providerId), {
          now: () => now,
        })
      );
    }

    // 9. Format Audit Event and Result
    const eventType = isSuccess ? "DRY_RUN_ACCEPTED" : "DRY_RUN_REJECTED";
    const auditEvent = createExecutionAuditEvent({
      eventType,
      environment: request.environment,
      providerId: request.providerId,
      tool: request.tool,
      correlationId: request.correlationId,
      dryRunId,
      metadata: {
        status: dryRunResp.status,
        errorCode: dryRunResp.errorCode ?? "",
      },
      now: () => now,
    });
    this.auditEvents.push(auditEvent);

    let finalResult: StagingSandboxResult;
    if (isSuccess) {
      const fp = computeStagingSandboxResultFingerprint({
        kind: "dry_run_accepted",
        environment: request.environment,
        mode: "dry_run",
        providerId: request.providerId,
        tool: request.tool,
        dryRunId,
        correlationId: request.correlationId,
        simulatedProviderStatus: dryRunResp.status as "ACCEPTED" | "REPLAY",
        auditEventId: auditEvent.eventId,
      });

      finalResult = Object.freeze({
        kind: "dry_run_accepted",
        environment: request.environment,
        mode: "dry_run",
        providerId: request.providerId,
        tool: request.tool,
        dryRunId,
        correlationId: request.correlationId,
        simulatedProviderStatus: dryRunResp.status as "ACCEPTED" | "REPLAY",
        sideEffectsAllowed: false,
        networkCallMade: false,
        credentialsAccessed: false,
        providerCallMade: false,
        createdResources: EMPTY_RESOURCES,
        auditEventId: auditEvent.eventId,
        fingerprint: fp,
      });
    } else {
      const mappedReason =
        dryRunResp.errorCode === "SIMULATED_TIMEOUT"
          ? "TIMEOUT"
          : dryRunResp.errorCode === "UNSUPPORTED_TOOL"
          ? "PROVIDER_UNSUPPORTED"
          : "INVALID_REQUEST";

      const fp = computeStagingSandboxResultFingerprint({
        kind: "dry_run_rejected",
        environment: request.environment,
        mode: "dry_run",
        providerId: request.providerId,
        tool: request.tool,
        dryRunId,
        correlationId: request.correlationId,
        reason: mappedReason,
        auditEventId: auditEvent.eventId,
      });

      finalResult = Object.freeze({
        kind: "dry_run_rejected",
        environment: request.environment,
        mode: "dry_run",
        providerId: request.providerId,
        tool: request.tool,
        dryRunId,
        correlationId: request.correlationId,
        reason: mappedReason,
        sideEffectsAllowed: false,
        networkCallMade: false,
        credentialsAccessed: false,
        providerCallMade: false,
        createdResources: EMPTY_RESOURCES,
        auditEventId: auditEvent.eventId,
        fingerprint: fp,
      });
    }

    // 10. Persist Record in Memory
    this.dryRunRecords.set(request.correlationId, {
      dryRunId,
      request,
      response: dryRunResp,
      result: finalResult,
      createdAt: nowIso,
    });

    return finalResult;
  }
}
