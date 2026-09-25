/**
 * Internal Research MCP Server Facade (JSON-RPC 2.0 over Stdio)
 * (Phase 4.9 Production Core & Phase 5.6 Runtime Bridge)
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * - NO real Google Cloud network calls or SDK dependencies.
 * - STRICT stdout protocol purity: stdout MUST ONLY receive valid JSON-RPC 2.0 responses.
 * - All logging / debugging is isolated exclusively to stderr.
 * - Thin facade delegating directly to ResearchSessionService and injected diagnostics source-of-truth.
 */

import { ResearchSessionService } from "../services/researchSessionService";
import {
  ProviderException,
  sanitizeProviderErrorMessage,
} from "../services/providers/errors";
import { ResearchExecutionSnapshot } from "../services/providers/researchPersistencePort";
import {
  formatResearchProviderDiagnostics,
  ResearchProviderDiagnosticsPayload,
} from "../bootstrap/researchProviderComposition";
import { ResearchProviderConfig } from "../config/researchProviderConfig";
import { ProviderRegistry } from "../services/providers/providerRegistry";

export type JsonRpcId = string | number | null;

export interface JsonRpcRequest {
  jsonrpc: "2.0" | string;
  id?: JsonRpcId;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse<T = unknown> {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface McpToolDefinition {
  name: string;
  description: string;
}

export interface McpProviderCapabilitySummary {
  id: string;
  displayName: string;
  capabilities: string[];
  allowed: boolean;
}

export type McpProviderDiagnosticsSource =
  | ResearchProviderDiagnosticsPayload
  | (() => ResearchProviderDiagnosticsPayload | Promise<ResearchProviderDiagnosticsPayload>)
  | {
      config: ResearchProviderConfig;
      providerRegistry: ProviderRegistry | null;
    }
  | (() => {
      config: ResearchProviderConfig;
      providerRegistry: ProviderRegistry | null;
    });

export interface InternalResearchMcpServerDeps {
  researchSessionService: ResearchSessionService;
  stderr?: NodeJS.WritableStream;
  providerDiagnostics?: McpProviderDiagnosticsSource | null;
}

export class InternalResearchMcpServer {
  private readonly researchSessionService: ResearchSessionService;
  private readonly stderr?: NodeJS.WritableStream;
  private readonly providerDiagnostics?: McpProviderDiagnosticsSource | null;

  constructor(params: InternalResearchMcpServerDeps) {
    this.researchSessionService = params.researchSessionService;
    this.stderr = params.stderr;
    this.providerDiagnostics = params.providerDiagnostics;
  }

  private logDebug(message: string): void {
    if (this.stderr && typeof this.stderr.write === "function") {
      this.stderr.write(`[MCP-DEBUG] ${sanitizeProviderErrorMessage(message)}\n`);
    }
  }

  /**
   * Returns the exact set of 5 supported MCP tools.
   */
  public listTools(): McpToolDefinition[] {
    return [
      {
        name: "research_create_workspace",
        description: "Create a new research workspace in the resolved research provider (Dry-run only)",
      },
      {
        name: "research_ingest_sources",
        description: "Ingest polymorphic source payloads into a research workspace (Dry-run only)",
      },
      {
        name: "research_generate_audio",
        description: "Trigger asynchronous audio overview generation on supported providers (Dry-run only)",
      },
      {
        name: "research_get_status",
        description: "Get execution status and attempt snapshot by correlationId",
      },
      {
        name: "research_list_providers",
        description: "List all configured research providers and their capabilities",
      },
    ];
  }

  private async resolveDiagnosticsPayload(): Promise<
    { error: JsonRpcResponse } | { payload: ResearchProviderDiagnosticsPayload }
  > {
    if (!this.providerDiagnostics) {
      return {
        error: {
          jsonrpc: "2.0",
          id: null,
          error: {
            code: -32004,
            message: "Provider diagnostics dependency is unavailable",
          },
        },
      };
    }

    let resolvedDiagnostics: unknown = this.providerDiagnostics;
    if (typeof this.providerDiagnostics === "function") {
      try {
        resolvedDiagnostics = await this.providerDiagnostics();
      } catch (err: unknown) {
        const rawMsg = err instanceof Error ? err.message : String(err);
        return {
          error: {
            jsonrpc: "2.0",
            id: null,
            error: {
              code: -32603,
              message: sanitizeProviderErrorMessage(`Provider diagnostics resolution failed: ${rawMsg}`),
            },
          },
        };
      }
    }

    if (!resolvedDiagnostics || typeof resolvedDiagnostics !== "object") {
      return {
        error: {
          jsonrpc: "2.0",
          id: null,
          error: {
            code: -32004,
            message: "Provider diagnostics dependency is unavailable",
          },
        },
      };
    }

    let payload: ResearchProviderDiagnosticsPayload;
    if ("config" in resolvedDiagnostics) {
      payload = formatResearchProviderDiagnostics(
        resolvedDiagnostics as {
          config: ResearchProviderConfig;
          providerRegistry: ProviderRegistry | null;
        }
      );
    } else {
      payload = resolvedDiagnostics as ResearchProviderDiagnosticsPayload;
    }

    return { payload };
  }

  private resolveProviderForDryRun(
    payload: ResearchProviderDiagnosticsPayload,
    requestedProviderId: string | null,
    requiredCapabilities: string[]
  ): {
    resolution: {
      requestedProviderId: string | null;
      resolvedProviderId: string | null;
      routingEnabled: boolean;
      fallbackAllowed: boolean;
    };
    capabilityCheck: {
      required: string[];
      satisfied: boolean;
      missing: string[];
    };
  } {
    const routingEnabled = Boolean(payload.routingEnabled);
    const fallbackAllowed = Boolean(payload.allowProviderFallback);
    const defaultProviderId = payload.defaultProviderId || null;
    const allowedProviders = Array.isArray(payload.providers)
      ? payload.providers.filter((p) => p.allowed)
      : [];

    let resolvedProviderId: string | null = null;
    if (requestedProviderId) {
      const matched = allowedProviders.find((p) => p.id === requestedProviderId);
      if (matched) {
        resolvedProviderId = matched.id;
      } else if (fallbackAllowed) {
        const defaultMatched = allowedProviders.find((p) => p.id === defaultProviderId);
        resolvedProviderId = defaultMatched ? defaultMatched.id : (allowedProviders[0]?.id ?? null);
      } else {
        resolvedProviderId = null;
      }
    } else {
      const defaultMatched = allowedProviders.find((p) => p.id === defaultProviderId);
      resolvedProviderId = defaultMatched ? defaultMatched.id : (allowedProviders[0]?.id ?? null);
    }

    const activeProvider = resolvedProviderId
      ? allowedProviders.find((p) => p.id === resolvedProviderId)
      : null;

    const missing = requiredCapabilities.filter(
      (cap) => !activeProvider || !activeProvider.capabilities.includes(cap)
    );

    const satisfied = Boolean(routingEnabled && resolvedProviderId && missing.length === 0);

    return {
      resolution: {
        requestedProviderId,
        resolvedProviderId,
        routingEnabled,
        fallbackAllowed,
      },
      capabilityCheck: {
        required: requiredCapabilities,
        satisfied,
        missing,
      },
    };
  }

  /**
   * Dispatches and handles a single JSON-RPC 2.0 request with strict stdout protocol purity.
   */
  public async handleRequest(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    const id = request && typeof request === "object" && "id" in request ? request.id ?? null : null;

    // 1. JSON-RPC 2.0 validation
    if (!request || typeof request !== "object" || request.jsonrpc !== "2.0" || typeof request.method !== "string") {
      return {
        jsonrpc: "2.0",
        id,
        error: {
          code: -32600,
          message: "Invalid Request: jsonrpc version must be '2.0' and method must be a valid string",
        },
      };
    }

    this.logDebug(`Received method call: ${request.method}`);

    try {
      // 2. Handle MCP protocol tool listing
      if (request.method === "tools/list" || request.method === "list_tools") {
        return {
          jsonrpc: "2.0",
          id,
          result: {
            tools: this.listTools(),
          },
        };
      }

      // 3. Resolve tool name and arguments
      let toolName = request.method;
      let toolArgs = (request.params as Record<string, unknown>) || {};

      if (request.method === "tools/call" && request.params) {
        toolName = String(request.params.name || "");
        toolArgs = (request.params.arguments as Record<string, unknown>) || {};
      }

      // 4. Dispatch supported tools
      switch (toolName) {
        case "research_list_providers": {
          const diagResult = await this.resolveDiagnosticsPayload();
          if ("error" in diagResult) {
            return { ...diagResult.error, id };
          }
          const payload = diagResult.payload;

          return {
            jsonrpc: "2.0",
            id,
            result: {
              routingEnabled: Boolean(payload.routingEnabled),
              defaultProviderId: String(payload.defaultProviderId || ""),
              allowProviderFallback: Boolean(payload.allowProviderFallback),
              providers: Array.isArray(payload.providers)
                ? payload.providers.map((p) => ({
                    id: String(p.id),
                    displayName: String(p.displayName || p.id),
                    capabilities: Array.isArray(p.capabilities) ? [...p.capabilities] : [],
                    allowed: Boolean(p.allowed),
                  }))
                : [],
            },
          };
        }

        case "research_get_status": {
          const correlationId = toolArgs.correlationId as string;
          if (!correlationId || typeof correlationId !== "string") {
            return {
              jsonrpc: "2.0",
              id,
              error: {
                code: -32602,
                message: "Invalid params: 'correlationId' string is required",
              },
            };
          }

          const snapshot: ResearchExecutionSnapshot | null =
            await this.researchSessionService.getProviderExecutionSnapshot({
              correlationId,
            });

          return {
            jsonrpc: "2.0",
            id,
            result: {
              snapshot,
            },
          };
        }

        case "research_create_workspace": {
          const rawTitle = toolArgs.topicTitle ?? toolArgs.title;
          if (rawTitle === undefined || rawTitle === null) {
            return {
              jsonrpc: "2.0",
              id,
              error: {
                code: -32004,
                message: `Tool 'research_create_workspace' is not directly invocable in isolation; missing required parameters for dry-run simulation.`,
              },
            };
          }

          if (typeof rawTitle !== "string" || rawTitle.trim() === "") {
            return {
              jsonrpc: "2.0",
              id,
              error: {
                code: -32602,
                message: sanitizeProviderErrorMessage("Invalid params for 'research_create_workspace': 'topicTitle' must be a non-empty string"),
              },
            };
          }

          const topicTitle = sanitizeProviderErrorMessage(rawTitle.trim());
          const rawSlug = toolArgs.topicSlug ?? toolArgs.slug;
          const topicSlug = typeof rawSlug === "string" && rawSlug.trim() !== ""
            ? sanitizeProviderErrorMessage(rawSlug.trim())
            : topicTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
          const category = typeof toolArgs.category === "string" && toolArgs.category.trim() !== ""
            ? sanitizeProviderErrorMessage(toolArgs.category.trim())
            : undefined;
          const requestedProviderId = typeof toolArgs.providerId === "string" && toolArgs.providerId.trim() !== ""
            ? toolArgs.providerId.trim()
            : null;
          const correlationId = typeof toolArgs.correlationId === "string" && toolArgs.correlationId.trim() !== ""
            ? toolArgs.correlationId.trim()
            : undefined;

          const diagResult = await this.resolveDiagnosticsPayload();
          if ("error" in diagResult) {
            return { ...diagResult.error, id };
          }
          const { resolution, capabilityCheck } = this.resolveProviderForDryRun(
            diagResult.payload,
            requestedProviderId,
            ["supportsNotebookManagement"]
          );

          const accepted = capabilityCheck.satisfied;
          const summary = accepted
            ? "Dry-run only. Workspace creation was validated but not executed."
            : !resolution.routingEnabled
            ? "Dry-run rejected: Research provider routing is disabled."
            : `Dry-run rejected: Provider '${resolution.resolvedProviderId ?? requestedProviderId}' does not support workspace management.`;

          const normalizedInput: Record<string, unknown> = {
            topicTitle,
            topicSlug,
          };
          if (category) {
            normalizedInput.category = category;
          }

          const recordedIntent = this.researchSessionService?.recordExecutionIntent
            ? await this.researchSessionService.recordExecutionIntent({
                correlationId,
                tool: "research_create_workspace",
                dryRun: true,
                accepted,
                providerResolution: resolution,
                capabilityCheck,
                normalizedInput,
              })
            : {
                correlationId,
                status: "dry_run_only" as const,
                replayDecision: "NEW" as const,
                state: {
                  current: "dry_run_only",
                  target: undefined,
                  transitionAccepted: accepted,
                },
              };

          return {
            jsonrpc: "2.0",
            id,
            result: {
              dryRun: true,
              tool: "research_create_workspace",
              correlationId: recordedIntent.correlationId,
              status: recordedIntent.status,
              replayDecision: recordedIntent.replayDecision || "NEW",
              state: recordedIntent.state || {
                current: recordedIntent.status,
                target: accepted ? "ready_for_approval" : undefined,
                transitionAccepted: accepted,
              },
              accepted,
              providerResolution: resolution,
              capabilityCheck,
              plan: {
                action: "create_workspace",
                sideEffectsSuppressed: true,
                summary,
              },
              normalizedInput,
            },
          };
        }

        case "research_ingest_sources": {
          const rawWorkspaceId = toolArgs.workspaceId ?? toolArgs.remoteWorkspaceId;
          const rawSources = toolArgs.sources;
          if (
            (rawWorkspaceId === undefined || rawWorkspaceId === null) &&
            (rawSources === undefined || rawSources === null)
          ) {
            return {
              jsonrpc: "2.0",
              id,
              error: {
                code: -32004,
                message: `Tool 'research_ingest_sources' is not directly invocable in isolation; missing required parameters for dry-run simulation.`,
              },
            };
          }

          if (typeof rawWorkspaceId !== "string" || rawWorkspaceId.trim() === "") {
            return {
              jsonrpc: "2.0",
              id,
              error: {
                code: -32602,
                message: sanitizeProviderErrorMessage("Invalid params for 'research_ingest_sources': 'workspaceId' must be a non-empty string"),
              },
            };
          }

          if (!Array.isArray(rawSources) || rawSources.length === 0) {
            return {
              jsonrpc: "2.0",
              id,
              error: {
                code: -32602,
                message: sanitizeProviderErrorMessage("Invalid params for 'research_ingest_sources': 'sources' must be a non-empty array"),
              },
            };
          }

          const workspaceId = rawWorkspaceId.trim();
          const sourceKinds: string[] = [];
          let hasOversizedContent = false;

          for (const s of rawSources) {
            if (!s || typeof s !== "object") {
              return {
                jsonrpc: "2.0",
                id,
                error: {
                  code: -32602,
                  message: sanitizeProviderErrorMessage("Invalid params for 'research_ingest_sources': each source in 'sources' must be an object"),
                },
              };
            }
            const kind = typeof s.type === "string" ? s.type : typeof s.kind === "string" ? s.kind : "unknown";
            sourceKinds.push(kind);
            const content = typeof s.content === "string" ? s.content : typeof s.text === "string" ? s.text : "";
            if (content.length > 50000) {
              hasOversizedContent = true;
            }
          }

          const requestedProviderId = typeof toolArgs.providerId === "string" && toolArgs.providerId.trim() !== ""
            ? toolArgs.providerId.trim()
            : null;
          const correlationId = typeof toolArgs.correlationId === "string" && toolArgs.correlationId.trim() !== ""
            ? toolArgs.correlationId.trim()
            : undefined;

          const diagResult = await this.resolveDiagnosticsPayload();
          if ("error" in diagResult) {
            return { ...diagResult.error, id };
          }
          const { resolution, capabilityCheck } = this.resolveProviderForDryRun(
            diagResult.payload,
            requestedProviderId,
            ["supportsSourceIngestion"]
          );

          const accepted = capabilityCheck.satisfied;
          const summary = accepted
            ? `Dry-run only. Ingestion of ${rawSources.length} source(s) into workspace '${workspaceId}' was validated but not executed.`
            : !resolution.routingEnabled
            ? "Dry-run rejected: Research provider routing is disabled."
            : `Dry-run rejected: Provider '${resolution.resolvedProviderId ?? requestedProviderId}' does not support source ingestion.`;

          const normalizedInput: Record<string, unknown> = {
            workspaceId,
            sourceCount: rawSources.length,
            sourceKinds,
            hasOversizedContent,
          };

          const recordedIntent = this.researchSessionService?.recordExecutionIntent
            ? await this.researchSessionService.recordExecutionIntent({
                correlationId,
                tool: "research_ingest_sources",
                dryRun: true,
                accepted,
                providerResolution: resolution,
                capabilityCheck,
                normalizedInput,
              })
            : {
                correlationId,
                status: "dry_run_only" as const,
                replayDecision: "NEW" as const,
                state: {
                  current: "dry_run_only",
                  target: undefined,
                  transitionAccepted: accepted,
                },
              };

          return {
            jsonrpc: "2.0",
            id,
            result: {
              dryRun: true,
              tool: "research_ingest_sources",
              correlationId: recordedIntent.correlationId,
              status: recordedIntent.status,
              replayDecision: recordedIntent.replayDecision || "NEW",
              state: recordedIntent.state || {
                current: recordedIntent.status,
                target: accepted ? "ready_for_approval" : undefined,
                transitionAccepted: accepted,
              },
              accepted,
              providerResolution: resolution,
              capabilityCheck,
              plan: {
                action: "ingest_sources",
                sideEffectsSuppressed: true,
                summary,
              },
              normalizedInput,
            },
          };
        }

        case "research_generate_audio": {
          const rawWorkspaceId = toolArgs.workspaceId ?? toolArgs.remoteWorkspaceId;
          if (rawWorkspaceId === undefined || rawWorkspaceId === null) {
            return {
              jsonrpc: "2.0",
              id,
              error: {
                code: -32004,
                message: `Tool 'research_generate_audio' is not directly invocable in isolation; missing required parameters for dry-run simulation.`,
              },
            };
          }

          if (typeof rawWorkspaceId !== "string" || rawWorkspaceId.trim() === "") {
            return {
              jsonrpc: "2.0",
              id,
              error: {
                code: -32602,
                message: sanitizeProviderErrorMessage("Invalid params for 'research_generate_audio': 'workspaceId' must be a non-empty string"),
              },
            };
          }

          const workspaceId = rawWorkspaceId.trim();
          const format = toolArgs.format === "brief" ? "brief" : "deep_dive";
          const requestedProviderId = typeof toolArgs.providerId === "string" && toolArgs.providerId.trim() !== ""
            ? toolArgs.providerId.trim()
            : null;
          const correlationId = typeof toolArgs.correlationId === "string" && toolArgs.correlationId.trim() !== ""
            ? toolArgs.correlationId.trim()
            : undefined;

          const diagResult = await this.resolveDiagnosticsPayload();
          if ("error" in diagResult) {
            return { ...diagResult.error, id };
          }
          const { resolution, capabilityCheck } = this.resolveProviderForDryRun(
            diagResult.payload,
            requestedProviderId,
            ["supportsAudioOverview"]
          );

          const accepted = capabilityCheck.satisfied;
          const summary = accepted
            ? `Dry-run only. Audio overview generation ('${format}') for workspace '${workspaceId}' was validated but not executed.`
            : !resolution.routingEnabled
            ? "Dry-run rejected: Research provider routing is disabled."
            : `Dry-run rejected: Provider '${resolution.resolvedProviderId ?? requestedProviderId}' does not support audio overview generation.`;

          const normalizedInput: Record<string, unknown> = {
            workspaceId,
            format,
          };

          const recordedIntent = this.researchSessionService?.recordExecutionIntent
            ? await this.researchSessionService.recordExecutionIntent({
                correlationId,
                tool: "research_generate_audio",
                dryRun: true,
                accepted,
                providerResolution: resolution,
                capabilityCheck,
                normalizedInput,
              })
            : {
                correlationId,
                status: "dry_run_only" as const,
                replayDecision: "NEW" as const,
                state: {
                  current: "dry_run_only",
                  target: undefined,
                  transitionAccepted: accepted,
                },
              };

          return {
            jsonrpc: "2.0",
            id,
            result: {
              dryRun: true,
              tool: "research_generate_audio",
              correlationId: recordedIntent.correlationId,
              status: recordedIntent.status,
              replayDecision: recordedIntent.replayDecision || "NEW",
              state: recordedIntent.state || {
                current: recordedIntent.status,
                target: accepted ? "ready_for_approval" : undefined,
                transitionAccepted: accepted,
              },
              accepted,
              providerResolution: resolution,
              capabilityCheck,
              plan: {
                action: "generate_audio",
                sideEffectsSuppressed: true,
                summary,
              },
              normalizedInput,
            },
          };
        }

        default: {
          return {
            jsonrpc: "2.0",
            id,
            error: {
              code: -32601,
              message: `Method '${request.method}' (or tool '${toolName}') not found`,
            },
          };
        }
      }
    } catch (error: unknown) {
      return this.mapErrorToJsonRpc(error, id);
    }
  }

  private mapErrorToJsonRpc(error: unknown, id: JsonRpcId): JsonRpcResponse {
    if (error instanceof ProviderException) {
      let code = -32603; // Internal error
      if (error.errorCode === "INVALID_ARGUMENT") {
        code = -32602;
      } else if (error.errorCode === "PERMISSION_DENIED") {
        code = -32003;
      } else if (error.errorCode === "CAPABILITY_UNSUPPORTED") {
        code = -32004;
      }

      return {
        jsonrpc: "2.0",
        id,
        error: {
          code,
          message: sanitizeProviderErrorMessage(error.message),
          data: {
            errorCode: error.errorCode,
            providerId: error.providerId,
            correlationId: error.correlationId,
          },
        },
      };
    }

    const rawMsg = error instanceof Error ? error.message : String(error);
    return {
      jsonrpc: "2.0",
      id,
      error: {
        code: -32603,
        message: sanitizeProviderErrorMessage(rawMsg),
      },
    };
  }
}
