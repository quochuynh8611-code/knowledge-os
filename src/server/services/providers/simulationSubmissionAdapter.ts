/**
 * Simulation Submission Adapter (Phase 6.2)
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * - Implements ResearchSubmissionPort using ExecutionSimulationProvider.
 * - Enforces default-deny boundary: rejects real execution requests and side effects.
 * - Zero real provider calls (NO NotebookLM / NO Antigravity).
 * - Zero real Google Cloud or external network calls.
 * - Zero credentials, tokens, or API keys accessed.
 */

import { ResearchSubmissionPort } from "./researchSubmissionPort.js";
import {
  ResearchSubmissionRequest,
  ResearchSubmissionResult,
} from "./executionSubmissionContract.js";
import {
  ExecutionSimulationProvider,
  InMemoryExecutionSimulationProvider,
  computeHandoffFingerprint,
} from "./executionSimulationStub.js";
import { sanitizeProviderErrorMessage } from "./errors.js";

export class SimulationSubmissionAdapter implements ResearchSubmissionPort {
  private simulationProvider: ExecutionSimulationProvider;

  constructor(simulationProvider?: ExecutionSimulationProvider) {
    this.simulationProvider =
      simulationProvider ?? new InMemoryExecutionSimulationProvider();
  }

  async submit(
    request: ResearchSubmissionRequest
  ): Promise<ResearchSubmissionResult> {
    const handoff = request?.handoff;
    const handoffFingerprint = handoff
      ? computeHandoffFingerprint(handoff)
      : "unknown";
    const nowIso = new Date().toISOString();

    // 1. Boundary Guard: Request Mode
    if (!request || request.mode !== "simulation_only") {
      return {
        kind: "rejected",
        mode: "simulation_only",
        simulation: true,
        submissionId: `sim-sub-blocked-${handoffFingerprint.slice(0, 16)}`,
        correlationId: handoff?.correlationId || "unknown",
        providerId: handoff?.providerId || "unknown",
        tool: (handoff?.tool || "research_create_workspace") as
          | "research_create_workspace"
          | "research_ingest_sources"
          | "research_generate_audio",
        status: "SIMULATED_BLOCKED",
        sideEffectsAllowed: false,
        providerCallMade: false,
        networkCallMade: false,
        credentialAccessed: false,
        handoffFingerprint,
        createdAt: nowIso,
        failure: {
          code: "SIMULATION_BLOCKED",
          message: sanitizeProviderErrorMessage(
            `Submission request mode must be 'simulation_only', received '${request?.mode}'. Real execution is strictly blocked in Phase 6.2.`
          ),
        },
      };
    }

    // 2. Boundary Guard: Side Effects
    if (request.allowSideEffects !== false) {
      return {
        kind: "rejected",
        mode: "simulation_only",
        simulation: true,
        submissionId: `sim-sub-blocked-${handoffFingerprint.slice(0, 16)}`,
        correlationId: handoff?.correlationId || "unknown",
        providerId: handoff?.providerId || "unknown",
        tool: (handoff?.tool || "research_create_workspace") as
          | "research_create_workspace"
          | "research_ingest_sources"
          | "research_generate_audio",
        status: "SIMULATED_BLOCKED",
        sideEffectsAllowed: false,
        providerCallMade: false,
        networkCallMade: false,
        credentialAccessed: false,
        handoffFingerprint,
        createdAt: nowIso,
        failure: {
          code: "SIMULATION_BLOCKED",
          message: sanitizeProviderErrorMessage(
            "Side effects are strictly prohibited on the submission port."
          ),
        },
      };
    }

    // 3. Forward to simulation provider
    const simResult = await this.simulationProvider.simulateSubmission(handoff);

    // 4. Map to normalized ResearchSubmissionResult
    if (
      simResult.status === "SIMULATED_ACCEPTED" ||
      simResult.status === "SIMULATED_REPLAY"
    ) {
      return {
        kind: "accepted",
        mode: "simulation_only",
        simulation: true,
        submissionId: simResult.submissionId,
        correlationId: simResult.correlationId,
        providerId: simResult.providerId,
        tool: simResult.tool,
        status: simResult.status,
        sideEffectsAllowed: false,
        providerCallMade: false,
        networkCallMade: false,
        credentialAccessed: false,
        handoffFingerprint: simResult.handoffFingerprint,
        createdAt: simResult.createdAt,
      };
    }

    return {
      kind: "rejected",
      mode: "simulation_only",
      simulation: true,
      submissionId: simResult.submissionId,
      correlationId: simResult.correlationId,
      providerId: simResult.providerId,
      tool: simResult.tool,
      status: simResult.status,
      sideEffectsAllowed: false,
      providerCallMade: false,
      networkCallMade: false,
      credentialAccessed: false,
      handoffFingerprint: simResult.handoffFingerprint,
      createdAt: simResult.createdAt,
      failure: simResult.failure ?? {
        code: "SIMULATION_BLOCKED",
        message: sanitizeProviderErrorMessage("Simulation submission rejected."),
      },
    };
  }
}
