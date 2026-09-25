/**
 * Fake Provider Transport (Phase 6.5)
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * - Pure, deterministic, in-memory transport simulation.
 * - Zero network, credentials, timers, or live provider handles.
 * - Explicit failure injection without random numbers.
 */

import {
  ProviderDryRunRequest,
  ProviderDryRunResponse,
  ProviderDryRunStatus,
  ProviderDryRunErrorCode,
  isToolSupportedByProvider,
  computeProviderDryRunFingerprint,
} from "./providerDryRunContract.js";

export type FakeProviderScenario =
  | "accepted"
  | "replay"
  | "unsupported_tool"
  | "transient_failure"
  | "permanent_failure"
  | "timeout"
  | "rate_limited";

export interface FakeProviderTransport {
  execute(request: ProviderDryRunRequest): Promise<ProviderDryRunResponse>;
}

export interface DeterministicFakeProviderTransportParams {
  readonly defaultScenario?: FakeProviderScenario;
  readonly scenarioOverrides?: Readonly<Record<string, FakeProviderScenario>>;
}

export class DeterministicFakeProviderTransport implements FakeProviderTransport {
  private readonly defaultScenario: FakeProviderScenario;
  private readonly scenarioOverrides: Readonly<Record<string, FakeProviderScenario>>;

  constructor(params?: DeterministicFakeProviderTransportParams) {
    this.defaultScenario = params?.defaultScenario ?? "accepted";
    this.scenarioOverrides = params?.scenarioOverrides ?? {};
  }

  public async execute(
    request: ProviderDryRunRequest
  ): Promise<ProviderDryRunResponse> {
    const key = `${request.providerId}:${request.tool}:${request.correlationId}`;
    const scenario = this.scenarioOverrides[key] ?? this.defaultScenario;

    // First, verify provider tool support
    if (!isToolSupportedByProvider(request.providerId, request.tool)) {
      const outputFp = computeProviderDryRunFingerprint({
        providerId: request.providerId,
        tool: request.tool,
        correlationId: request.correlationId,
        inputFingerprint: request.inputFingerprint,
        attempt: request.attempt,
        status: "REJECTED",
        errorCode: "UNSUPPORTED_TOOL",
      });

      return {
        providerId: request.providerId,
        tool: request.tool,
        status: "REJECTED",
        providerRequestId: `fake-req-${request.providerId}-${request.correlationId}`,
        attempt: request.attempt,
        retryable: false,
        errorCode: "UNSUPPORTED_TOOL",
        outputFingerprint: outputFp,
        sideEffectsAllowed: false,
        providerCallMade: false,
        networkCallMade: false,
        credentialsAccessed: false,
      };
    }

    let status: ProviderDryRunStatus = "ACCEPTED";
    let retryable = false;
    let errorCode: ProviderDryRunErrorCode | undefined;

    switch (scenario) {
      case "accepted":
        status = "ACCEPTED";
        retryable = false;
        break;
      case "replay":
        status = "REPLAY";
        retryable = false;
        break;
      case "unsupported_tool":
        status = "REJECTED";
        retryable = false;
        errorCode = "UNSUPPORTED_TOOL";
        break;
      case "transient_failure":
        status = "TRANSIENT_FAILURE";
        retryable = true;
        errorCode = "TRANSIENT_PROVIDER_FAILURE";
        break;
      case "permanent_failure":
        status = "PERMANENT_FAILURE";
        retryable = false;
        errorCode = "PERMANENT_PROVIDER_FAILURE";
        break;
      case "timeout":
        status = "TIMEOUT";
        retryable = false;
        errorCode = "SIMULATED_TIMEOUT";
        break;
      case "rate_limited":
        status = "TRANSIENT_FAILURE";
        retryable = true;
        errorCode = "SIMULATED_RATE_LIMIT";
        break;
      default:
        status = "ACCEPTED";
        retryable = false;
    }

    const outputFingerprint = computeProviderDryRunFingerprint({
      providerId: request.providerId,
      tool: request.tool,
      correlationId: request.correlationId,
      inputFingerprint: request.inputFingerprint,
      attempt: request.attempt,
      status,
      errorCode,
    });

    return {
      providerId: request.providerId,
      tool: request.tool,
      status,
      providerRequestId: `fake-req-${request.providerId}-${request.correlationId}-att${request.attempt}`,
      attempt: request.attempt,
      retryable,
      errorCode,
      outputFingerprint,
      sideEffectsAllowed: false,
      providerCallMade: false,
      networkCallMade: false,
      credentialsAccessed: false,
    };
  }
}
