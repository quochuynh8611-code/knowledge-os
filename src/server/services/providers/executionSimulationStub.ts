/**
 * Execution Plane Simulation Stub (Phase 6.1)
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * - Pure in-memory deterministic simulation stub.
 * - Zero real provider execution (NO NotebookLM / NO Antigravity).
 * - Zero real Google Cloud or external network calls.
 * - Zero credentials, tokens, or API keys accessed or decrypted.
 * - Mode strictly 'simulation_only', sideEffectsAllowed strictly false.
 * - ProviderCallMade, networkCallMade, credentialAccessed all strictly false.
 */

import { createHash } from "node:crypto";
import {
  ResearchExecutionHandoff,
  validateApprovalProof,
} from "../researchSessionService.js";
import {
  ResearchPersistencePort,
  ResearchExecutionSnapshot,
} from "./researchPersistencePort.js";
import { ProviderAttemptRecord } from "./types.js";
import { sanitizeProviderErrorMessage } from "./errors.js";

export type SimulatedSubmissionStatus =
  | "SIMULATED_ACCEPTED"
  | "SIMULATED_REPLAY"
  | "SIMULATED_REJECTED"
  | "SIMULATED_BLOCKED";

export type SimulatedSubmissionFailureCode =
  | "INVALID_HANDOFF"
  | "APPROVAL_REQUIRED"
  | "IDEMPOTENCY_CONFLICT"
  | "CAPABILITY_UNSUPPORTED"
  | "PERSISTENCE_UNAVAILABLE"
  | "SIMULATION_BLOCKED";

export type SimulatedSubmissionResult = {
  simulation: true;
  submissionId: string;
  correlationId: string;
  providerId: string;
  tool:
    | "research_create_workspace"
    | "research_ingest_sources"
    | "research_generate_audio";
  status: SimulatedSubmissionStatus;
  mode: "simulation_only";
  sideEffectsAllowed: false;
  providerCallMade: false;
  networkCallMade: false;
  credentialAccessed: false;
  handoffFingerprint: string;
  createdAt: string;
  failure?: {
    code: SimulatedSubmissionFailureCode;
    message: string;
  };
};

export interface ExecutionSimulationProvider {
  simulateSubmission(
    handoff: ResearchExecutionHandoff
  ): Promise<SimulatedSubmissionResult>;
}

/**
 * Computes a deterministic submission ID from canonical handoff identity attributes.
 */
export function computeDeterministicSubmissionId(params: {
  correlationId: string;
  providerId: string;
  tool: string;
  inputFingerprint: string;
  approvalId: string;
}): string {
  const canonical = JSON.stringify({
    approvalId: params.approvalId || "",
    correlationId: params.correlationId || "",
    inputFingerprint: params.inputFingerprint || "",
    providerId: params.providerId || "",
    tool: params.tool || "",
  });
  const hash = createHash("sha256").update(canonical).digest("hex");
  return `sim-sub-${hash.slice(0, 32)}`;
}

/**
 * Computes a SHA-256 fingerprint for the full sanitized handoff payload.
 */
export function computeHandoffFingerprint(handoff: Partial<ResearchExecutionHandoff>): string {
  const canonical = JSON.stringify({
    approvalId: handoff.approval?.approvalId || "",
    approvedAt: handoff.approval?.approvedAt || "",
    approvedBy: handoff.approval?.approvedBy || "",
    correlationId: handoff.correlationId || "",
    handoffId: handoff.handoffId || "",
    inputFingerprint: handoff.inputFingerprint || "",
    intent: handoff.approval?.intent || "",
    mode: handoff.mode || "",
    providerId: handoff.providerId || "",
    sideEffectsAllowed: (handoff.sideEffectsAllowed as boolean) === true,
    tool: handoff.tool || "",
  });
  return createHash("sha256").update(canonical).digest("hex");
}

const ALLOWED_TOOLS = new Set([
  "research_create_workspace",
  "research_ingest_sources",
  "research_generate_audio",
]);

const FORBIDDEN_KEYWORD_PATTERNS = [
  /bearer\s+[a-z0-9_\-\.]+/i,
  /api[_-]?key/i,
  /client[_-]?secret/i,
  /process\.env/i,
  /\/Users\//i,
  /\/etc\/passwd/i,
  /\/var\/run/i,
];

export class InMemoryExecutionSimulationProvider
  implements ExecutionSimulationProvider
{
  private persistence?: ResearchPersistencePort;
  private now: () => Date;
  private inMemorySubmissions = new Map<string, SimulatedSubmissionResult>();

  constructor(options?: {
    persistence?: ResearchPersistencePort;
    now?: () => Date;
  }) {
    this.persistence = options?.persistence;
    this.now = options?.now ?? (() => new Date());
  }

  async simulateSubmission(
    handoff: ResearchExecutionHandoff
  ): Promise<SimulatedSubmissionResult> {
    const nowIso = this.now().toISOString();
    const handoffFingerprint = computeHandoffFingerprint(handoff);

    const baseResult = {
      simulation: true as const,
      mode: "simulation_only" as const,
      sideEffectsAllowed: false as const,
      providerCallMade: false as const,
      networkCallMade: false as const,
      credentialAccessed: false as const,
      createdAt: nowIso,
      handoffFingerprint,
    };

    // 1. Guard Mode
    if (handoff.mode !== "handoff_only") {
      const submissionId = `sim-sub-blocked-${handoffFingerprint.slice(0, 16)}`;
      return {
        ...baseResult,
        submissionId,
        correlationId: handoff.correlationId || "unknown",
        providerId: handoff.providerId || "unknown",
        tool: (ALLOWED_TOOLS.has(handoff.tool)
          ? handoff.tool
          : "research_create_workspace") as
          | "research_create_workspace"
          | "research_ingest_sources"
          | "research_generate_audio",
        status: "SIMULATED_BLOCKED",
        failure: {
          code: "INVALID_HANDOFF",
          message: sanitizeProviderErrorMessage(
            `Handoff mode must be 'handoff_only', received '${handoff.mode}'.`
          ),
        },
      };
    }

    // 2. Guard sideEffectsAllowed
    if (handoff.sideEffectsAllowed !== false) {
      const submissionId = `sim-sub-blocked-${handoffFingerprint.slice(0, 16)}`;
      return {
        ...baseResult,
        submissionId,
        correlationId: handoff.correlationId || "unknown",
        providerId: handoff.providerId || "unknown",
        tool: (ALLOWED_TOOLS.has(handoff.tool)
          ? handoff.tool
          : "research_create_workspace") as
          | "research_create_workspace"
          | "research_ingest_sources"
          | "research_generate_audio",
        status: "SIMULATED_BLOCKED",
        failure: {
          code: "SIMULATION_BLOCKED",
          message: sanitizeProviderErrorMessage(
            "Side effects are strictly prohibited during simulation."
          ),
        },
      };
    }

    // 3. Guard required fields
    if (
      !handoff.correlationId ||
      !handoff.handoffId ||
      !handoff.providerId ||
      !handoff.tool ||
      !handoff.inputFingerprint
    ) {
      const submissionId = `sim-sub-blocked-${handoffFingerprint.slice(0, 16)}`;
      return {
        ...baseResult,
        submissionId,
        correlationId: handoff.correlationId || "unknown",
        providerId: handoff.providerId || "unknown",
        tool: (ALLOWED_TOOLS.has(handoff.tool)
          ? handoff.tool
          : "research_create_workspace") as
          | "research_create_workspace"
          | "research_ingest_sources"
          | "research_generate_audio",
        status: "SIMULATED_BLOCKED",
        failure: {
          code: "INVALID_HANDOFF",
          message: sanitizeProviderErrorMessage(
            "Handoff is missing mandatory identity fields."
          ),
        },
      };
    }

    // 4. Guard Tool allowlist
    if (!ALLOWED_TOOLS.has(handoff.tool)) {
      const submissionId = `sim-sub-blocked-${handoffFingerprint.slice(0, 16)}`;
      return {
        ...baseResult,
        submissionId,
        correlationId: handoff.correlationId,
        providerId: handoff.providerId,
        tool: "research_create_workspace",
        status: "SIMULATED_BLOCKED",
        failure: {
          code: "INVALID_HANDOFF",
          message: sanitizeProviderErrorMessage(
            `Unsupported tool '${handoff.tool}' in simulation handoff.`
          ),
        },
      };
    }

    // 5. Guard Forbidden keyword / secrets leakage in handoff payload
    const serializedHandoff = JSON.stringify(handoff);
    for (const pattern of FORBIDDEN_KEYWORD_PATTERNS) {
      if (pattern.test(serializedHandoff)) {
        const submissionId = `sim-sub-blocked-${handoffFingerprint.slice(0, 16)}`;
        return {
          ...baseResult,
          submissionId,
          correlationId: handoff.correlationId,
          providerId: handoff.providerId,
          tool: handoff.tool,
          status: "SIMULATED_BLOCKED",
          failure: {
            code: "INVALID_HANDOFF",
            message: sanitizeProviderErrorMessage(
              "Forbidden pattern or potential credential leak detected in handoff."
            ),
          },
        };
      }
    }

    // 6. Guard Approval Existence
    if (!handoff.approval) {
      const submissionId = `sim-sub-blocked-${handoffFingerprint.slice(0, 16)}`;
      return {
        ...baseResult,
        submissionId,
        correlationId: handoff.correlationId,
        providerId: handoff.providerId,
        tool: handoff.tool,
        status: "SIMULATED_BLOCKED",
        failure: {
          code: "APPROVAL_REQUIRED",
          message: sanitizeProviderErrorMessage(
            "Execution approval proof is required for simulation submission."
          ),
        },
      };
    }

    // Compute deterministic submission ID
    const submissionId = computeDeterministicSubmissionId({
      correlationId: handoff.correlationId,
      providerId: handoff.providerId,
      tool: handoff.tool,
      inputFingerprint: handoff.inputFingerprint,
      approvalId: handoff.approval.approvalId,
    });

    // 7. Validate Approval Proof
    const approvalValidation = validateApprovalProof(handoff.approval, {
      correlationId: handoff.correlationId,
      inputFingerprint: handoff.inputFingerprint,
      expectedProviderId: handoff.providerId,
      now: this.now(),
    });

    if (!approvalValidation.valid) {
      return {
        ...baseResult,
        submissionId,
        correlationId: handoff.correlationId,
        providerId: handoff.providerId,
        tool: handoff.tool,
        status: "SIMULATED_REJECTED",
        failure: {
          code: "APPROVAL_REQUIRED",
          message: sanitizeProviderErrorMessage(
            `Approval proof validation failed: ${approvalValidation.reason}`
          ),
        },
      };
    }

    // 8. Evaluate Persistence & Replay Safety if persistence port exists
    let existingSnapshot: ResearchExecutionSnapshot | null = null;
    if (this.persistence) {
      try {
        existingSnapshot = await this.persistence.getExecutionByCorrelationId(
          handoff.correlationId
        );
      } catch (err: unknown) {
        const rawMsg = err instanceof Error ? err.message : String(err);
        return {
          ...baseResult,
          submissionId,
          correlationId: handoff.correlationId,
          providerId: handoff.providerId,
          tool: handoff.tool,
          status: "SIMULATED_BLOCKED",
          failure: {
            code: "PERSISTENCE_UNAVAILABLE",
            message: sanitizeProviderErrorMessage(
              `Persistence lookup error: ${rawMsg}`
            ),
          },
        };
      }

      if (!existingSnapshot) {
        return {
          ...baseResult,
          submissionId,
          correlationId: handoff.correlationId,
          providerId: handoff.providerId,
          tool: handoff.tool,
          status: "SIMULATED_REJECTED",
          failure: {
            code: "IDEMPOTENCY_CONFLICT",
            message: sanitizeProviderErrorMessage(
              `Execution intent '${handoff.correlationId}' not found in persistence layer.`
            ),
          },
        };
      }

      if (existingSnapshot) {
        const firstAtt = existingSnapshot.attemptRecords[0];
        const rawDetails =
          (firstAtt?.rawErrorDetails as Record<string, unknown>) || {};

        // Provider mismatch check
        if (existingSnapshot.providerId !== handoff.providerId) {
          return {
            ...baseResult,
            submissionId,
            correlationId: handoff.correlationId,
            providerId: handoff.providerId,
            tool: handoff.tool,
            status: "SIMULATED_REJECTED",
            failure: {
              code: "IDEMPOTENCY_CONFLICT",
              message: sanitizeProviderErrorMessage(
                `Provider ID mismatch: existing intent bound to '${existingSnapshot.providerId}' but handoff specified '${handoff.providerId}'.`
              ),
            },
          };
        }

        // Input fingerprint mismatch check
        const storedFingerprint = rawDetails.inputFingerprint as
          | string
          | undefined;
        if (
          storedFingerprint &&
          storedFingerprint !== handoff.inputFingerprint
        ) {
          return {
            ...baseResult,
            submissionId,
            correlationId: handoff.correlationId,
            providerId: handoff.providerId,
            tool: handoff.tool,
            status: "SIMULATED_REJECTED",
            failure: {
              code: "IDEMPOTENCY_CONFLICT",
              message: sanitizeProviderErrorMessage(
                "Input fingerprint mismatch against original execution intent."
              ),
            },
          };
        }

        // Capability check
        const capCheck = rawDetails.capabilityCheck as
          | { satisfied?: boolean; missing?: string[] }
          | undefined;
        if (capCheck && capCheck.satisfied === false) {
          return {
            ...baseResult,
            submissionId,
            correlationId: handoff.correlationId,
            providerId: handoff.providerId,
            tool: handoff.tool,
            status: "SIMULATED_REJECTED",
            failure: {
              code: "CAPABILITY_UNSUPPORTED",
              message: sanitizeProviderErrorMessage(
                `Provider does not satisfy required capabilities: ${(capCheck.missing || []).join(", ")}.`
              ),
            },
          };
        }

        // Replay check across existing attempt records
        const isReplay = existingSnapshot.attemptRecords.some((att) => {
          const details =
            (att.rawErrorDetails as Record<string, unknown>) || {};
          return (
            details.submissionId === submissionId ||
            details.handoffFingerprint === handoffFingerprint
          );
        });

        if (isReplay || this.inMemorySubmissions.has(submissionId)) {
          return {
            ...baseResult,
            submissionId,
            correlationId: handoff.correlationId,
            providerId: handoff.providerId,
            tool: handoff.tool,
            status: "SIMULATED_REPLAY",
          };
        }
      }
    } else {
      // In-memory replay check
      if (this.inMemorySubmissions.has(submissionId)) {
        return {
          ...baseResult,
          submissionId,
          correlationId: handoff.correlationId,
          providerId: handoff.providerId,
          tool: handoff.tool,
          status: "SIMULATED_REPLAY",
        };
      }
    }

    // 9. Persist simulation outcome safely (terminalStatus: IN_PROGRESS)
    if (this.persistence && existingSnapshot) {
      const simAttempt: ProviderAttemptRecord = {
        attemptId: submissionId,
        providerId: handoff.providerId,
        status: "IN_PROGRESS",
        startedAt: nowIso,
        completedAt: nowIso,
        rawErrorDetails: {
          simulation: true,
          submissionId,
          handoffFingerprint,
          status: "SIMULATED_ACCEPTED",
          providerCallMade: false,
          networkCallMade: false,
          credentialAccessed: false,
          tool: handoff.tool,
        },
      };

      const updatedSnapshot: ResearchExecutionSnapshot = {
        ...existingSnapshot,
        updatedAt: nowIso,
        terminalStatus: "IN_PROGRESS",
        attemptRecords: [...existingSnapshot.attemptRecords, simAttempt],
      };

      try {
        await this.persistence.saveExecution(updatedSnapshot);
      } catch (err: unknown) {
        const rawMsg = err instanceof Error ? err.message : String(err);
        return {
          ...baseResult,
          submissionId,
          correlationId: handoff.correlationId,
          providerId: handoff.providerId,
          tool: handoff.tool,
          status: "SIMULATED_BLOCKED",
          failure: {
            code: "PERSISTENCE_UNAVAILABLE",
            message: sanitizeProviderErrorMessage(
              `Persistence write error during simulation: ${rawMsg}`
            ),
          },
        };
      }
    }

    const acceptedResult: SimulatedSubmissionResult = {
      ...baseResult,
      submissionId,
      correlationId: handoff.correlationId,
      providerId: handoff.providerId,
      tool: handoff.tool,
      status: "SIMULATED_ACCEPTED",
    };

    this.inMemorySubmissions.set(submissionId, acceptedResult);
    return acceptedResult;
  }
}
