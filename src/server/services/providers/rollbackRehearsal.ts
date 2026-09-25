import { createHash } from "crypto";

export type RollbackRehearsalStep =
  | "ACTIVATE_KILL_SWITCH"
  | "DISABLE_CONTROLLED_TOGGLE"
  | "CANCEL_IN_FLIGHT_DRY_RUN"
  | "VERIFY_NO_PROVIDER_CALL"
  | "VERIFY_NO_NETWORK_CALL"
  | "VERIFY_NO_CREDENTIAL_ACCESS"
  | "VERIFY_DEFAULT_DENY_STATE";

export interface RollbackRehearsalStepResult {
  readonly step: RollbackRehearsalStep;
  readonly status: "PASS" | "FAIL";
  readonly detailCode: string;
}

const EMPTY_RESOURCES: readonly [] = Object.freeze([]) as unknown as readonly [];

export interface RollbackRehearsalResult {
  readonly rehearsalId: string;
  readonly environment: "test" | "staging";
  readonly steps: readonly RollbackRehearsalStepResult[];
  readonly passed: boolean;
  readonly finalToggleEnabled: false;
  readonly finalKillSwitchActive: true;
  readonly realExecutionAllowed: false;
  readonly providerCallMade: false;
  readonly networkCallMade: false;
  readonly credentialsAccessed: false;
  readonly createdResources: readonly [];
  readonly fingerprint: string;
}

export interface RollbackRehearsalOptions {
  readonly rehearsalId?: string;
  readonly environment: "test" | "staging" | "production";
  readonly simulateFailureStep?: RollbackRehearsalStep;
  readonly inFlightDryRunsCount?: number;
}

/**
 * Computes deterministic fingerprint for rollback rehearsal results.
 */
export function computeRollbackRehearsalFingerprint(
  rehearsalId: string,
  environment: string,
  steps: readonly RollbackRehearsalStepResult[],
  passed: boolean
): string {
  const payload = {
    rehearsalId,
    environment,
    passed,
    steps: steps.map((s) => ({ step: s.step, status: s.status, detailCode: s.detailCode })),
    finalToggleEnabled: false,
    finalKillSwitchActive: true,
    realExecutionAllowed: false,
    providerCallMade: false,
    networkCallMade: false,
    credentialsAccessed: false,
  };
  return createHash("sha256").update(JSON.stringify(payload), "utf8").digest("hex");
}

/**
 * Simulates a complete, zero-side-effect rollback rehearsal in test or staging.
 * Invariant: Never executes live providers, never hits network, never mutates real state.
 */
export function simulateRollbackRehearsal(options: RollbackRehearsalOptions): RollbackRehearsalResult {
  const rehearsalId = options.rehearsalId ?? `rehearsal-${Date.now()}`;
  
  if (options.environment === "production") {
    const failedSteps: readonly RollbackRehearsalStepResult[] = Object.freeze([
      {
        step: "ACTIVATE_KILL_SWITCH",
        status: "FAIL",
        detailCode: "ERR_PRODUCTION_REHEARSAL_FORBIDDEN",
      },
    ]);
    const fingerprint = computeRollbackRehearsalFingerprint(rehearsalId, options.environment, failedSteps, false);
    return Object.freeze({
      rehearsalId,
      environment: "test", // fallback to literal typing
      steps: failedSteps,
      passed: false,
      finalToggleEnabled: false,
      finalKillSwitchActive: true,
      realExecutionAllowed: false,
      providerCallMade: false,
      networkCallMade: false,
      credentialsAccessed: false,
      createdResources: EMPTY_RESOURCES,
      fingerprint,
    });
  }

  const stepsList: RollbackRehearsalStep[] = [
    "ACTIVATE_KILL_SWITCH",
    "DISABLE_CONTROLLED_TOGGLE",
    "CANCEL_IN_FLIGHT_DRY_RUN",
    "VERIFY_NO_PROVIDER_CALL",
    "VERIFY_NO_NETWORK_CALL",
    "VERIFY_NO_CREDENTIAL_ACCESS",
    "VERIFY_DEFAULT_DENY_STATE",
  ];

  let hasFailed = false;
  const stepResults: RollbackRehearsalStepResult[] = [];

  for (const step of stepsList) {
    if (hasFailed) {
      stepResults.push({
        step,
        status: "FAIL",
        detailCode: "SKIPPED_DUE_TO_PREVIOUS_FAILURE",
      });
      continue;
    }

    if (options.simulateFailureStep === step) {
      hasFailed = true;
      stepResults.push({
        step,
        status: "FAIL",
        detailCode: `SIMULATED_FAILURE_${step}`,
      });
      continue;
    }

    // Step-specific simulated execution details
    switch (step) {
      case "ACTIVATE_KILL_SWITCH":
        stepResults.push({
          step,
          status: "PASS",
          detailCode: "KILL_SWITCH_ENGAGED_DEFAULT_DENY",
        });
        break;
      case "DISABLE_CONTROLLED_TOGGLE":
        stepResults.push({
          step,
          status: "PASS",
          detailCode: "CONTROLLED_TOGGLE_SET_DISABLED",
        });
        break;
      case "CANCEL_IN_FLIGHT_DRY_RUN": {
        const cancelledCount = options.inFlightDryRunsCount ?? 1;
        stepResults.push({
          step,
          status: "PASS",
          detailCode: `IN_FLIGHT_CANCELLED_COUNT_${cancelledCount}`,
        });
        break;
      }
      case "VERIFY_NO_PROVIDER_CALL":
        stepResults.push({
          step,
          status: "PASS",
          detailCode: "PROVIDER_CALL_COUNT_ZERO",
        });
        break;
      case "VERIFY_NO_NETWORK_CALL":
        stepResults.push({
          step,
          status: "PASS",
          detailCode: "NETWORK_CALL_COUNT_ZERO",
        });
        break;
      case "VERIFY_NO_CREDENTIAL_ACCESS":
        stepResults.push({
          step,
          status: "PASS",
          detailCode: "CREDENTIAL_ACCESS_COUNT_ZERO",
        });
        break;
      case "VERIFY_DEFAULT_DENY_STATE":
        stepResults.push({
          step,
          status: "PASS",
          detailCode: "DEFAULT_DENY_INVARIANTS_VERIFIED",
        });
        break;
    }
  }

  const passed = !hasFailed;
  const frozenSteps = Object.freeze(stepResults);
  const fingerprint = computeRollbackRehearsalFingerprint(
    rehearsalId,
    options.environment,
    frozenSteps,
    passed
  );

  return Object.freeze({
    rehearsalId,
    environment: options.environment,
    steps: frozenSteps,
    passed,
    finalToggleEnabled: false,
    finalKillSwitchActive: true,
    realExecutionAllowed: false,
    providerCallMade: false,
    networkCallMade: false,
    credentialsAccessed: false,
    createdResources: EMPTY_RESOURCES,
    fingerprint,
  });
}
