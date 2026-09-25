/**
 * Execution Submission Contract & Types (Phase 6.2)
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * - Pure type definitions and contract schemas.
 * - Mode strictly 'simulation_only', allowSideEffects strictly false.
 * - All side effect flags strictly false.
 * - Absolute default-deny for real execution in Phase 6.2.
 */

import { ResearchExecutionHandoff } from "../researchSessionService.js";
import {
  SimulatedSubmissionStatus,
  SimulatedSubmissionFailureCode,
} from "./executionSimulationStub.js";

export type ResearchSubmissionMode =
  | "simulation_only"
  | "real_execution";

export type ResearchSubmissionRequest = {
  readonly handoff: ResearchExecutionHandoff;
  readonly mode: "simulation_only";
  readonly allowSideEffects: false;
};

export type AcceptedResearchSubmissionResult = {
  readonly kind: "accepted";
  readonly mode: "simulation_only";
  readonly simulation: true;
  readonly submissionId: string;
  readonly correlationId: string;
  readonly providerId: string;
  readonly tool:
    | "research_create_workspace"
    | "research_ingest_sources"
    | "research_generate_audio";
  readonly status: "SIMULATED_ACCEPTED" | "SIMULATED_REPLAY";
  readonly sideEffectsAllowed: false;
  readonly providerCallMade: false;
  readonly networkCallMade: false;
  readonly credentialAccessed: false;
  readonly handoffFingerprint: string;
  readonly createdAt: string;
};

export type RejectedResearchSubmissionResult = {
  readonly kind: "rejected";
  readonly mode: "simulation_only";
  readonly simulation: true;
  readonly submissionId: string;
  readonly correlationId: string;
  readonly providerId: string;
  readonly tool:
    | "research_create_workspace"
    | "research_ingest_sources"
    | "research_generate_audio";
  readonly status: "SIMULATED_REJECTED" | "SIMULATED_BLOCKED";
  readonly sideEffectsAllowed: false;
  readonly providerCallMade: false;
  readonly networkCallMade: false;
  readonly credentialAccessed: false;
  readonly handoffFingerprint: string;
  readonly createdAt: string;
  readonly failure: {
    readonly code:
      | "INVALID_HANDOFF"
      | "APPROVAL_REQUIRED"
      | "IDEMPOTENCY_CONFLICT"
      | "CAPABILITY_UNSUPPORTED"
      | "PERSISTENCE_UNAVAILABLE"
      | "SIMULATION_BLOCKED";
    readonly message: string;
  };
};

export type ResearchSubmissionResult =
  | AcceptedResearchSubmissionResult
  | RejectedResearchSubmissionResult;

export type ExecutionCapabilities = {
  readonly network: false;
  readonly credentials: false;
  readonly childProcess: false;
  readonly filesystemWrite: false;
  readonly providerExecution: false;
};
