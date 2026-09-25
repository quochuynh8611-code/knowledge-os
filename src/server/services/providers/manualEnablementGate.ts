/**
 * Multi-Factor Manual Enablement Gate (Phase 6.4)
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * - Pure, deterministic, side-effect free evaluation of manual enablement.
 * - Even when approved, decision is strictly 'APPROVE_FOR_FUTURE_PHASE' with:
 *   - realExecutionAllowed: false
 *   - sideEffectsAllowed: false
 * - Zero real provider or network execution.
 * - Zero secrets, credentials, or system handles accessed.
 */

import {
  ManualEnablementRequest,
  ManualEnablementApproval,
  validateManualEnablementRequest,
  validateManualEnablementApproval,
} from "./manualEnablementContract.js";
import { ResearchExecutionReadinessReport } from "./researchExecutionReadiness.js";
import { ResearchExecutionPolicy } from "../../config/researchProviderConfig.js";
import {
  ExecutionKillSwitchState,
  validateKillSwitch,
} from "./executionKillSwitch.js";

export type ManualEnablementDenyCode =
  | "MISSING_APPROVAL"
  | "APPROVAL_EXPIRED"
  | "APPROVAL_REVOKED"
  | "ACTOR_MISMATCH"
  | "SCOPE_MISMATCH"
  | "PROVIDER_MISMATCH"
  | "ENVIRONMENT_MISMATCH"
  | "READINESS_NOT_MANUAL_REVIEWABLE"
  | "READINESS_FINGERPRINT_MISMATCH"
  | "RUNTIME_POLICY_DENIES"
  | "KILL_SWITCH_ACTIVE"
  | "CAPABILITY_ESCALATION_REQUESTED"
  | "REAL_EXECUTION_NOT_IMPLEMENTED"
  | "INVALID_REQUEST"
  | "INVALID_APPROVAL";

export type ManualEnablementDecision =
  | {
      readonly decision: "DENY";
      readonly reasons: readonly ManualEnablementDenyCode[];
      readonly sideEffectsAllowed: false;
      readonly realExecutionAllowed: false;
    }
  | {
      readonly decision: "APPROVE_FOR_FUTURE_PHASE";
      readonly reasons: readonly [];
      readonly sideEffectsAllowed: false;
      readonly realExecutionAllowed: false;
      readonly expiresAt: string;
      readonly approvalFingerprint: string;
    };

export type ManualEnablementGateInput = {
  readonly request: ManualEnablementRequest;
  readonly approval?: ManualEnablementApproval;
  readonly readinessReport: ResearchExecutionReadinessReport;
  readonly runtimePolicy: ResearchExecutionPolicy;
  readonly killSwitch: ExecutionKillSwitchState;
};

export function evaluateManualEnablementGate(
  input: ManualEnablementGateInput,
  options?: { readonly now?: () => Date }
): ManualEnablementDecision {
  const reasons: ManualEnablementDenyCode[] = [];

  // 1. Validate Kill Switch
  const killSwitchVal = validateKillSwitch(input.killSwitch);
  if (!killSwitchVal.valid || input.killSwitch.active) {
    reasons.push("KILL_SWITCH_ACTIVE");
  }

  // 2. Validate Request
  const reqVal = validateManualEnablementRequest(input.request);
  if (!reqVal.valid) {
    reasons.push("INVALID_REQUEST");
  } else {
    // Check capability escalation
    const caps = input.request.requestedCapabilities;
    if (
      caps.network ||
      caps.credentials ||
      caps.providerExecution ||
      caps.childProcess
    ) {
      reasons.push("CAPABILITY_ESCALATION_REQUESTED");
    }
  }

  // 3. Validate Approval existence & validity
  if (!input.approval) {
    reasons.push("MISSING_APPROVAL");
  } else {
    const appVal = validateManualEnablementApproval(input.approval, options);
    if (!appVal.valid) {
      if (appVal.errors.some((e) => e.includes("expired"))) {
        reasons.push("APPROVAL_EXPIRED");
      } else if (appVal.errors.some((e) => e.includes("REVOKED"))) {
        reasons.push("APPROVAL_REVOKED");
      } else {
        reasons.push("INVALID_APPROVAL");
      }
    } else {
      // Validate cross-bindings between request and approval
      if (input.approval.requestId !== input.request.requestId) {
        reasons.push("ACTOR_MISMATCH");
      }
      if (input.approval.scope !== input.request.scope) {
        reasons.push("SCOPE_MISMATCH");
      }
      if (input.approval.providerId !== input.request.providerId) {
        reasons.push("PROVIDER_MISMATCH");
      }
      if (input.approval.environment !== input.request.environment) {
        reasons.push("ENVIRONMENT_MISMATCH");
      }
      if (
        input.approval.readinessReportFingerprint !==
        input.request.readinessReportFingerprint
      ) {
        reasons.push("READINESS_FINGERPRINT_MISMATCH");
      }
    }
  }

  // 4. Validate Readiness Report
  if (input.readinessReport.status !== "READY_FOR_MANUAL_REVIEW") {
    reasons.push("READINESS_NOT_MANUAL_REVIEWABLE");
  }

  if (
    input.request &&
    input.readinessReport.reportFingerprint !==
      input.request.readinessReportFingerprint
  ) {
    if (!reasons.includes("READINESS_FINGERPRINT_MISMATCH")) {
      reasons.push("READINESS_FINGERPRINT_MISMATCH");
    }
  }

  // 5. Validate Runtime Policy
  if (
    !input.runtimePolicy ||
    input.runtimePolicy.realExecutionEnabled !== false ||
    input.runtimePolicy.simulationOnly !== true
  ) {
    reasons.push("RUNTIME_POLICY_DENIES");
  }

  // If any reasons were found, fail-closed immediately
  if (reasons.length > 0) {
    return {
      decision: "DENY",
      reasons,
      sideEffectsAllowed: false,
      realExecutionAllowed: false,
    };
  }

  // Approved for manual review / future phase only: realExecutionAllowed is strictly false
  return {
    decision: "APPROVE_FOR_FUTURE_PHASE",
    reasons: [],
    sideEffectsAllowed: false,
    realExecutionAllowed: false,
    expiresAt: input.approval!.expiresAt,
    approvalFingerprint: input.approval!.approvalFingerprint,
  };
}
