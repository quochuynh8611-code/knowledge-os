/**
 * Production Types & Contracts for Knowledge OS Research Provider Architecture
 * (Phase 4.1 Production Core Interface)
 */

export type ProviderType = "official" | "legacy" | "experimental";

export type ProviderErrorCode =
  | "INVALID_ARGUMENT"
  | "AUTHENTICATION_FAILED"
  | "PERMISSION_DENIED"
  | "CAPABILITY_UNSUPPORTED"
  | "PROVIDER_TIMEOUT"
  | "PROVIDER_UNAVAILABLE"
  | "IDEMPOTENCY_CONFLICT"
  | "INTERNAL_ERROR";

export interface ProviderMetadata {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly type: ProviderType;
  readonly description: string;
}

export interface ProviderCapabilities {
  readonly supportsNotebookManagement: boolean;
  readonly supportsSourceIngestion: boolean;
  readonly supportsAudioOverview: boolean;
  readonly supportsBatchSourceDelete: boolean;
  readonly supportsQuery: boolean;
  readonly supportsInteractiveChat: boolean;
  readonly supportsStudyGuide: boolean;
  readonly supportsMindMap: boolean;
  readonly supportsSlides: boolean;
  readonly supportsAsyncHandoffCLI: boolean;
  readonly supportsLocalAgentHandoff: boolean;
}

export interface ExecutionContext {
  readonly requestId: string;
  readonly correlationId: string;
  readonly attemptId: string;
  readonly actor: {
    readonly userId?: string;
    readonly role: "user" | "system" | "agent";
  };
  readonly idempotencyKey: string;
  readonly allowFallback?: boolean;
  readonly approvalProof?: {
    readonly approvedBy: string;
    readonly approvedAt: string;
    readonly intent: "delete_workspace" | "force_retry_unknown" | "manual_fallback";
  };
}

export interface JobRef {
  readonly providerId: string;
  readonly remoteJobId: string;
  readonly workspaceId: string;
  readonly correlationId: string;
  readonly initiatedAt: string;
}

export interface ProviderAttemptRecord {
  readonly attemptId: string;
  readonly providerId: string;
  readonly status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "UNKNOWN";
  readonly providerAttemptId?: string;
  readonly remoteWorkspaceId?: string;
  readonly startedAt: string;
  readonly completedAt?: string;
  readonly errorCode?: ProviderErrorCode;
  readonly errorMessage?: string;
  readonly rawErrorDetails?: unknown;
}

export type ReconciliationResult =
  | "CONFIRMED_PRESENT"
  | "CONFIRMED_ABSENT"
  | "INCONCLUSIVE";

export type SourcePayload =
  | {
      readonly type: "inline-text";
      readonly sourceId: string;
      readonly title: string;
      readonly mimeType: "text/markdown" | "text/plain";
      readonly textContent: string;
      readonly contentHash: string;
    }
  | {
      readonly type: "file";
      readonly sourceId: string;
      readonly title: string;
      readonly mimeType: "application/pdf" | "application/epub+zip" | "text/markdown";
      readonly sourceObjectId: string;
      readonly byteSize: number;
      readonly contentHash: string;
    }
  | {
      readonly type: "url";
      readonly sourceId: string;
      readonly title: string;
      readonly url: string;
      readonly contentHash: string;
    };

export interface ProviderHealthResult {
  readonly isHealthy: boolean;
  readonly providerId: string;
  readonly message?: string;
  readonly latencyMs?: number;
  readonly authenticatedUserOrSa?: string;
}

export interface ProviderJobStatus {
  readonly jobRef: JobRef;
  readonly status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "CANCELLED";
  readonly progressPercentage?: number;
  readonly resultUrl?: string;
  readonly error?: string;
}

export interface ResearchProvider {
  readonly metadata: ProviderMetadata;

  getCapabilities(): ProviderCapabilities;

  healthCheck(context: ExecutionContext): Promise<ProviderHealthResult>;

  createWorkspace(
    params: { topicTitle: string; topicSlug: string; category?: string },
    context: ExecutionContext
  ): Promise<{ remoteWorkspaceId: string; attemptRecord: ProviderAttemptRecord }>;

  ingestSources(
    params: { remoteWorkspaceId: string; sources: SourcePayload[] },
    context: ExecutionContext
  ): Promise<{
    status: "COMPLETED" | "PARTIAL" | "FAILED" | "UNKNOWN";
    ingestedCount: number;
    remoteSourceIds: string[];
    errors?: Array<{ sourceId: string; errorCode: ProviderErrorCode; message: string }>;
    attemptRecord: ProviderAttemptRecord;
  }>;

  generateAudioOverview(
    params: { remoteWorkspaceId: string; format?: "deep_dive" | "brief" },
    context: ExecutionContext
  ): Promise<{ jobRef: JobRef; attemptRecord: ProviderAttemptRecord }>;

  reconcileIngest(
    params: {
      remoteWorkspaceId: string;
      expectedSources: Array<{ sourceId: string; contentHash: string }>;
    },
    context: ExecutionContext
  ): Promise<ReconciliationResult>;

  getJobStatus(jobRef: JobRef, context: ExecutionContext): Promise<ProviderJobStatus>;

  cancelJob(jobRef: JobRef, context: ExecutionContext): Promise<boolean>;

  deleteWorkspace(
    params: { remoteWorkspaceId: string; expectedSlug: string },
    context: ExecutionContext
  ): Promise<boolean>;

  query?(params: { workspaceId: string; question: string }, context: ExecutionContext): Promise<unknown>;
}

export const NOTEBOOKLM_ENTERPRISE_CAPABILITIES: ProviderCapabilities = Object.freeze({
  supportsNotebookManagement: true,
  supportsSourceIngestion: true,
  supportsAudioOverview: true,
  supportsBatchSourceDelete: true,
  supportsQuery: false,
  supportsInteractiveChat: false,
  supportsStudyGuide: false,
  supportsMindMap: false,
  supportsSlides: false,
  supportsAsyncHandoffCLI: false,
  supportsLocalAgentHandoff: false,
});

export const ANTIGRAVITY_LEGACY_CAPABILITIES: ProviderCapabilities = Object.freeze({
  supportsNotebookManagement: false,
  supportsSourceIngestion: true,
  supportsAudioOverview: false,
  supportsBatchSourceDelete: false,
  supportsQuery: true,
  supportsInteractiveChat: false,
  supportsStudyGuide: true,
  supportsMindMap: false,
  supportsSlides: false,
  supportsAsyncHandoffCLI: true,
  supportsLocalAgentHandoff: true,
});

export type {
  ResearchSubmissionMode,
  ResearchSubmissionRequest,
  ResearchSubmissionResult,
  AcceptedResearchSubmissionResult,
  RejectedResearchSubmissionResult,
  ExecutionCapabilities,
} from "./executionSubmissionContract.js";

export type { ResearchSubmissionPort } from "./researchSubmissionPort.js";

export type {
  ReadinessStatus,
  ReadinessCheckCode,
  ReadinessCheck,
  ResearchExecutionReadinessReport,
  EvaluateReadinessParams,
} from "./researchExecutionReadiness.js";

export { evaluateExecutionReadiness } from "./researchExecutionReadiness.js";

export type {
  RuntimeCompositionAuditInput,
  RuntimeCompositionAuditResult,
  RuntimeCompositionAudit,
  CompositionBypassFinding,
  AuditedProviderInstance,
} from "./runtimeCompositionAudit.js";

export { DefaultRuntimeCompositionAudit } from "./runtimeCompositionAudit.js";

export type {
  ManualEnablementStatus,
  ManualEnablementScope,
  ManualEnablementRequest,
  ManualEnablementApproval,
  ValidationResult,
} from "./manualEnablementContract.js";

export {
  computeApprovalFingerprint,
  validateManualEnablementRequest,
  validateManualEnablementApproval,
} from "./manualEnablementContract.js";

export type {
  ExecutionKillSwitchSource,
  ExecutionKillSwitchState,
  KillSwitchValidationResult,
} from "./executionKillSwitch.js";

export {
  computeKillSwitchFingerprint,
  DEFAULT_KILL_SWITCH,
  validateKillSwitch,
} from "./executionKillSwitch.js";

export type {
  ManualEnablementDenyCode,
  ManualEnablementDecision,
  ManualEnablementGateInput,
} from "./manualEnablementGate.js";

export { evaluateManualEnablementGate } from "./manualEnablementGate.js";

export type {
  ControlledExecutionToggleSource,
  ControlledExecutionToggle,
  EvaluateToggleParams,
  RollbackContract,
} from "./controlledExecutionToggle.js";

export {
  evaluateControlledExecutionToggle,
  createControlledRollbackPolicy,
} from "./controlledExecutionToggle.js";

export type {
  SandboxEnvironment,
  SandboxMode,
  StagingSandboxRequest,
  StagingSandboxRejectReason,
  StagingSandboxResult,
  SandboxValidationResult,
} from "./stagingSandboxContract.js";

export {
  computeStagingSandboxResultFingerprint,
  validateStagingSandboxRequest,
} from "./stagingSandboxContract.js";

export type {
  ProviderDryRunTool,
  ProviderDryRunRequest,
  ProviderDryRunStatus,
  ProviderDryRunErrorCode,
  ProviderDryRunResponse,
} from "./providerDryRunContract.js";

export {
  isToolSupportedByProvider,
  computeProviderDryRunFingerprint,
} from "./providerDryRunContract.js";

export type {
  FakeProviderScenario,
  FakeProviderTransport,
  DeterministicFakeProviderTransportParams,
} from "./fakeProviderTransport.js";

export { DeterministicFakeProviderTransport } from "./fakeProviderTransport.js";

export type {
  RetryAction,
  RetryReason,
  RetryDecision,
  RetryPolicyConfig,
} from "./retryPolicy.js";

export {
  DEFAULT_RETRY_POLICY_CONFIG,
  evaluateRetryPolicy,
} from "./retryPolicy.js";

export type {
  CircuitState,
  CircuitBreakerSnapshot,
  CircuitBreakerConfig,
} from "./circuitBreakerPolicy.js";

export {
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
  computeCircuitBreakerFingerprint,
  createInitialCircuitBreakerSnapshot,
  isCircuitRequestAllowed,
  recordCircuitSuccess,
  recordCircuitFailure,
} from "./circuitBreakerPolicy.js";

export type {
  ExecutionAuditEventType,
  ExecutionAuditEvent,
} from "./executionAuditEvent.js";

export {
  sanitizeAuditMetadata,
  computeAuditEventFingerprint,
  createExecutionAuditEvent,
} from "./executionAuditEvent.js";

export type {
  StagingDryRunRecord,
  ProviderDryRunAdapterParams,
} from "./providerDryRunAdapter.js";

export { ProviderDryRunAdapter } from "./providerDryRunAdapter.js";

export type {
  EvidenceSanitizationResult,
} from "./evidenceSanitizer.js";

export {
  sanitizeString,
  sanitizeEvidenceValue,
} from "./evidenceSanitizer.js";

export type {
  EvidenceBundleFingerprintInput,
} from "./evidenceBundleFingerprint.js";

export {
  computeEvidenceBundleFingerprint,
  verifyEvidenceBundleFingerprint,
} from "./evidenceBundleFingerprint.js";

export type {
  RollbackRehearsalStep,
  RollbackRehearsalStepResult,
  RollbackRehearsalResult,
  RollbackRehearsalOptions,
} from "./rollbackRehearsal.js";

export {
  computeRollbackRehearsalFingerprint,
  simulateRollbackRehearsal,
} from "./rollbackRehearsal.js";

export type {
  PreflightEvidenceKind,
  PreflightEvidenceStatus,
  PreflightEvidenceItem,
  OperatorPreflightEvidenceBundle,
  CreatePreflightEvidenceItemInput,
  CreatePreflightEvidenceBundleInput,
} from "./operatorPreflightEvidence.js";

export {
  ALL_REQUIRED_EVIDENCE_KINDS,
  createPreflightEvidenceItem,
  createPreflightEvidenceBundle,
} from "./operatorPreflightEvidence.js";

export type {
  OperatorSignoffDecision,
  OperatorSignoff,
  CreateOperatorSignoffInput,
  ValidateOperatorSignoffResult,
  ValidateSignoffAgainstBundleOptions,
} from "./operatorSignoffContract.js";

export {
  createOperatorSignoff,
  validateOperatorSignoff,
} from "./operatorSignoffContract.js";

export type {
  PreflightGateBlockedReason,
  PreflightGateDecision,
  EvaluateOperatorPreflightGateInput,
} from "./preflightGate.js";

export {
  evaluateOperatorPreflightGate,
} from "./preflightGate.js";



