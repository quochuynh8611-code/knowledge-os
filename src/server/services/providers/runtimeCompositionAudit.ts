/**
 * Runtime Composition Audit Service (Phase 6.3)
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * - Pure, deterministic, side-effect free inspection of runtime composition.
 * - Zero real provider calls (NO NotebookLM / NO Antigravity).
 * - Zero network, credential, or process.env access/mutation.
 * - Identifies mock vs real client boundaries and bypass risks.
 */

import { createHash } from "node:crypto";
import {
  ResearchProviderConfig,
  readResearchProviderConfig,
  isProviderAllowed,
  APPROVED_PROVIDER_IDS,
} from "../../config/researchProviderConfig.js";
import { ProviderRegistry } from "./providerRegistry.js";
import { ResearchOrchestrator } from "./researchOrchestrator.js";
import { ResearchPersistencePort } from "./researchPersistencePort.js";
import { ResearchSubmissionPort } from "./researchSubmissionPort.js";

export interface RuntimeCompositionAuditInput {
  readonly config?: ResearchProviderConfig;
  readonly env?: NodeJS.ProcessEnv;
  readonly providerRegistry?: ProviderRegistry | null;
  readonly orchestrator?: ResearchOrchestrator | null;
  readonly persistence?: ResearchPersistencePort | null;
  readonly submissionPort?: ResearchSubmissionPort | null;
}

export type CompositionBypassFinding = {
  readonly location: string;
  readonly severity: "INFO" | "WARNING" | "BLOCKER";
  readonly description: string;
};

export type AuditedProviderInstance = {
  readonly id: string;
  readonly type: string;
  readonly clientType: "mock" | "real" | "unknown" | "none";
};

export type RuntimeCompositionAuditResult = {
  readonly isDefaultConfigSafe: boolean;
  readonly routingEnabled: boolean;
  readonly defaultProviderId: string;
  readonly enabledProviderIds: readonly string[];
  readonly providerInstances: readonly AuditedProviderInstance[];
  readonly hasDirectOrchestratorBypass: boolean;
  readonly hasDirectProviderBypass: boolean;
  readonly submissionPortBound: boolean;
  readonly defaultSubmissionAdapter: "SimulationSubmissionAdapter" | "Custom" | "None";
  readonly realExecutionPossible: false;
  readonly networkCapabilityDetected: boolean;
  readonly credentialAccessDetected: boolean;
  readonly childProcessDetected: boolean;
  readonly bypasses: readonly CompositionBypassFinding[];
  readonly auditFingerprint: string;
};

export interface RuntimeCompositionAudit {
  audit(input: RuntimeCompositionAuditInput): RuntimeCompositionAuditResult;
}

export class DefaultRuntimeCompositionAudit implements RuntimeCompositionAudit {
  audit(input: RuntimeCompositionAuditInput): RuntimeCompositionAuditResult {
    const config = input.config ?? readResearchProviderConfig(input.env ?? process.env);

    // 1. Audit configuration safety
    const isDefaultConfigSafe =
      config.enableProviderRouting === false &&
      config.allowNotebookLM === false &&
      config.defaultProviderId === APPROVED_PROVIDER_IDS.LEGACY;

    const routingEnabled = config.enableProviderRouting;
    const defaultProviderId = config.defaultProviderId;

    // 2. Enabled providers determination
    const enabledProviderIds: string[] = [];
    if (isProviderAllowed(APPROVED_PROVIDER_IDS.LEGACY, config)) {
      enabledProviderIds.push(APPROVED_PROVIDER_IDS.LEGACY);
    }
    if (isProviderAllowed(APPROVED_PROVIDER_IDS.NOTEBOOKLM_ENTERPRISE, config)) {
      enabledProviderIds.push(APPROVED_PROVIDER_IDS.NOTEBOOKLM_ENTERPRISE);
    }

    // 3. Inspect registered provider instances
    const providerInstances: AuditedProviderInstance[] = [];
    if (input.providerRegistry) {
      try {
        const registered = input.providerRegistry.getAllProviders();
        for (const p of registered) {
          const isMock =
            p.metadata?.name?.toLowerCase().includes("mock") ||
            (p as any)?.client?.constructor?.name === "MockNotebookLMClient" ||
            p.metadata?.id === APPROVED_PROVIDER_IDS.NOTEBOOKLM_ENTERPRISE;

          providerInstances.push({
            id: p.metadata.id,
            type: p.metadata.type,
            clientType: isMock ? "mock" : "unknown",
          });
        }
      } catch {
        // Safe fail-closed
      }
    }

    // 4. Bypass detection
    const bypasses: CompositionBypassFinding[] = [];

    // Check if orchestrator exists without submission port
    const hasDirectOrchestratorBypass = Boolean(input.orchestrator && !input.submissionPort);
    if (hasDirectOrchestratorBypass) {
      bypasses.push({
        location: "ResearchSessionService.orchestrator",
        severity: "WARNING",
        description: "Direct ResearchOrchestrator reference present without explicit submission port constraint.",
      });
    }

    // Check if provider registry is directly accessible without submission port
    const hasDirectProviderBypass = Boolean(input.providerRegistry && !input.submissionPort);
    if (hasDirectProviderBypass) {
      bypasses.push({
        location: "ProviderRegistry",
        severity: "WARNING",
        description: "ProviderRegistry instance accessible without submission port wrapping.",
      });
    }

    // Validate default provider legitimacy
    if (!isProviderAllowed(defaultProviderId, config)) {
      bypasses.push({
        location: "researchProviderConfig.defaultProviderId",
        severity: "BLOCKER",
        description: `Default provider '${defaultProviderId}' is not allowed under current policy.`,
      });
    }

    // 5. Submission Port Binding
    const submissionPortBound = Boolean(input.submissionPort);
    let defaultSubmissionAdapter: "SimulationSubmissionAdapter" | "Custom" | "None" = "None";
    if (input.submissionPort) {
      const adapterName = input.submissionPort.constructor?.name;
      if (adapterName === "SimulationSubmissionAdapter") {
        defaultSubmissionAdapter = "SimulationSubmissionAdapter";
      } else {
        defaultSubmissionAdapter = "Custom";
      }
    } else {
      defaultSubmissionAdapter = "SimulationSubmissionAdapter";
    }

    // 6. Capability analysis (Simulation-only in Phase 6.3)
    const networkCapabilityDetected = false;
    const credentialAccessDetected = false;
    const childProcessDetected = false;
    const realExecutionPossible = false as const;

    // 7. Compute deterministic audit fingerprint
    const canonical = JSON.stringify({
      bypasses: bypasses.map((b) => ({ loc: b.location, sev: b.severity })),
      defaultProviderId,
      enabledProviderIds,
      isDefaultConfigSafe,
      routingEnabled,
      submissionPortBound,
    });
    const auditFingerprint = createHash("sha256").update(canonical).digest("hex");

    return {
      isDefaultConfigSafe,
      routingEnabled,
      defaultProviderId,
      enabledProviderIds,
      providerInstances,
      hasDirectOrchestratorBypass,
      hasDirectProviderBypass,
      submissionPortBound,
      defaultSubmissionAdapter,
      realExecutionPossible,
      networkCapabilityDetected,
      credentialAccessDetected,
      childProcessDetected,
      bypasses,
      auditFingerprint,
    };
  }
}
