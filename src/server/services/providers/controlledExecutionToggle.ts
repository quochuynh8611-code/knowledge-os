/**
 * Controlled Real-Execution Toggle & Rollback Contract (Phase 6.4)
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * - Pure, deterministic, side-effect free toggle evaluation.
 * - 'enabled' is strictly literal 'false' in Phase 6.4.
 * - Requested flags cannot bypass kill-switch, approval gate, or policy.
 * - Zero real provider or network execution.
 * - Zero secrets, credentials, or environment mutations.
 */

import {
  ManualEnablementApproval,
  validateManualEnablementApproval,
} from "./manualEnablementContract.js";
import {
  ExecutionKillSwitchState,
  DEFAULT_KILL_SWITCH,
  validateKillSwitch,
} from "./executionKillSwitch.js";
import {
  ResearchExecutionPolicy,
  DEFAULT_RESEARCH_EXECUTION_POLICY,
  ResearchProviderConfig,
  DEFAULT_RESEARCH_PROVIDER_CONFIG,
} from "../../config/researchProviderConfig.js";

export type ControlledExecutionToggleSource =
  | "default"
  | "configuration"
  | "manual_approval"
  | "kill_switch";

export type ControlledExecutionToggle = {
  readonly requested: boolean;
  readonly enabled: false;
  readonly source: ControlledExecutionToggleSource;
  readonly environment: "test" | "staging" | "production";
  readonly approvalId?: string;
  readonly expiresAt?: string;
  readonly reason: string;
};

export type EvaluateToggleParams = {
  readonly requested?: boolean;
  readonly environment?: "test" | "staging" | "production";
  readonly approval?: ManualEnablementApproval;
  readonly killSwitch?: ExecutionKillSwitchState;
  readonly config?: ResearchProviderConfig;
  readonly policy?: ResearchExecutionPolicy;
  readonly now?: () => Date;
};

/**
 * Evaluates the controlled execution toggle.
 * Under Phase 6.4 rules, 'enabled' is ALWAYS strictly false.
 */
export function evaluateControlledExecutionToggle(
  params?: EvaluateToggleParams
): ControlledExecutionToggle {
  const env = params?.environment ?? "test";
  const requested = Boolean(params?.requested);
  const killSwitch = params?.killSwitch ?? DEFAULT_KILL_SWITCH;

  // 1. Check Kill Switch
  const killSwitchVal = validateKillSwitch(killSwitch);
  if (!killSwitchVal.valid || killSwitch.active) {
    return Object.freeze({
      requested,
      enabled: false,
      source: "kill_switch",
      environment: env,
      approvalId: params?.approval?.approvalId,
      expiresAt: params?.approval?.expiresAt,
      reason: `Kill switch active or invalid: ${killSwitch.reason || "Real execution blocked."}`,
    });
  }

  // 2. Production is unconditionally disabled in Phase 6.4
  if (env === "production") {
    return Object.freeze({
      requested,
      enabled: false,
      source: "configuration",
      environment: env,
      approvalId: params?.approval?.approvalId,
      expiresAt: params?.approval?.expiresAt,
      reason: "Production environment real execution is strictly disabled in Phase 6.4.",
    });
  }

  // 3. Check Manual Approval if provided
  if (params?.approval) {
    const appVal = validateManualEnablementApproval(params.approval, {
      now: params.now,
    });
    if (!appVal.valid) {
      return Object.freeze({
        requested,
        enabled: false,
        source: "manual_approval",
        environment: env,
        approvalId: params.approval.approvalId,
        expiresAt: params.approval.expiresAt,
        reason: `Invalid or expired approval: ${appVal.errors.join("; ")}`,
      });
    }
  }

  // 4. Safe default return: enabled is always false
  return Object.freeze({
    requested,
    enabled: false,
    source: params?.approval ? "manual_approval" : "default",
    environment: env,
    approvalId: params?.approval?.approvalId,
    expiresAt: params?.approval?.expiresAt,
    reason: "Real execution toggle is hard-locked to false in Phase 6.4.",
  });
}

export type RollbackContract = {
  readonly toggle: ControlledExecutionToggle;
  readonly killSwitch: ExecutionKillSwitchState;
  readonly config: Readonly<ResearchProviderConfig>;
  readonly policy: Readonly<ResearchExecutionPolicy>;
  readonly isRollbackComplete: boolean;
};

/**
 * Generates an immutable, deterministic rollback contract artifact.
 * Pure and idempotent: does not mutate process.env or global singletons.
 */
export function createControlledRollbackPolicy(): RollbackContract {
  const toggle = evaluateControlledExecutionToggle({
    requested: false,
    killSwitch: DEFAULT_KILL_SWITCH,
  });

  return {
    toggle,
    killSwitch: DEFAULT_KILL_SWITCH,
    config: DEFAULT_RESEARCH_PROVIDER_CONFIG,
    policy: DEFAULT_RESEARCH_EXECUTION_POLICY,
    isRollbackComplete: true,
  };
}
