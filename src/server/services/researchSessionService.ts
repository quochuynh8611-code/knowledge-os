import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import { ResearchOrchestrator } from "./providers/researchOrchestrator";
import {
  ResearchExecutionSnapshot,
  ResearchPersistencePort,
  ResearchTerminalStatus,
} from "./providers/researchPersistencePort";
import { SourcePayload } from "./providers/types";
import {
  ProviderException,
  sanitizeProviderErrorMessage,
} from "./providers/errors";

export type ExecutionApprovalIntent =
  | "execute_research"
  | "force_retry_unknown"
  | "manual_fallback";

export interface ExecutionApprovalProof {
  readonly approvedBy: string;
  readonly approvedAt: string;
  readonly intent: ExecutionApprovalIntent;
  readonly approvalId: string;
  readonly expiresAt?: string;
}

export type McpIntentStatus =
  | "intent_recorded"
  | "ready_for_approval"
  | "approved_for_handoff"
  | "handoff_blocked"
  | "replay_blocked"
  | "transition_rejected"
  | "dry_run_only"
  | "intent_rejected";

export interface ResearchExecutionHandoff {
  readonly handoffId: string;
  readonly correlationId: string;
  readonly providerId: string;
  readonly tool:
    | "research_create_workspace"
    | "research_ingest_sources"
    | "research_generate_audio";
  readonly normalizedInput: Record<string, unknown>;
  readonly inputFingerprint: string;
  readonly approval: ExecutionApprovalProof;
  readonly requestedAt: string;
  readonly mode: "handoff_only";
  readonly sideEffectsAllowed: false;
}

export type {
  SimulatedSubmissionStatus,
  SimulatedSubmissionFailureCode,
  SimulatedSubmissionResult,
  ExecutionSimulationProvider,
} from "./providers/executionSimulationStub.js";

export type {
  ResearchSubmissionMode,
  ResearchSubmissionRequest,
  ResearchSubmissionResult,
  AcceptedResearchSubmissionResult,
  RejectedResearchSubmissionResult,
  ExecutionCapabilities,
} from "./providers/executionSubmissionContract.js";

export type { ResearchSubmissionPort } from "./providers/researchSubmissionPort.js";

export function validateApprovalProof(
  proof: unknown,
  context: {
    correlationId: string;
    inputFingerprint?: string;
    expectedProviderId?: string;
    now?: Date;
  }
): { valid: boolean; reason?: string; sanitizedProof?: ExecutionApprovalProof } {
  if (!proof || typeof proof !== "object") {
    return { valid: false, reason: "Approval proof is required and must be an object." };
  }
  const p = proof as Record<string, unknown>;

  if (typeof p.approvedBy !== "string" || p.approvedBy.trim() === "") {
    return { valid: false, reason: "'approvedBy' must be a non-empty string." };
  }

  if (typeof p.approvalId !== "string" || p.approvalId.trim() === "") {
    return { valid: false, reason: "'approvalId' must be a non-empty string." };
  }

  if (typeof p.approvedAt !== "string" || Number.isNaN(Date.parse(p.approvedAt))) {
    return { valid: false, reason: "'approvedAt' must be a valid ISO date string." };
  }

  const validIntents = new Set<string>([
    "execute_research",
    "force_retry_unknown",
    "manual_fallback",
  ]);
  if (typeof p.intent !== "string" || !validIntents.has(p.intent)) {
    return {
      valid: false,
      reason: `'intent' must be one of 'execute_research' | 'force_retry_unknown' | 'manual_fallback', received '${String(p.intent)}'.`,
    };
  }

  const approvedAtMs = Date.parse(p.approvedAt);
  const nowMs = context.now ? context.now.getTime() : Date.now();

  if (p.expiresAt !== undefined && p.expiresAt !== null) {
    if (typeof p.expiresAt !== "string" || Number.isNaN(Date.parse(p.expiresAt))) {
      return { valid: false, reason: "'expiresAt' must be a valid ISO date string if provided." };
    }
    const expiresAtMs = Date.parse(p.expiresAt);
    if (expiresAtMs <= approvedAtMs) {
      return { valid: false, reason: "'expiresAt' must be greater than 'approvedAt'." };
    }
    if (expiresAtMs < nowMs) {
      return { valid: false, reason: "Approval proof has expired." };
    }
  }

  const sanitizedProof: ExecutionApprovalProof = {
    approvedBy: sanitizeProviderErrorMessage(p.approvedBy.trim()),
    approvedAt: p.approvedAt,
    intent: p.intent as ExecutionApprovalIntent,
    approvalId: sanitizeProviderErrorMessage(p.approvalId.trim()),
    expiresAt: typeof p.expiresAt === "string" ? p.expiresAt : undefined,
  };

  return { valid: true, sanitizedProof };
}

export interface ResearchSessionServiceDeps {
  orchestrator?: ResearchOrchestrator | null;
  persistence?: ResearchPersistencePort | null;
  submissionPort?: import("./providers/researchSubmissionPort.js").ResearchSubmissionPort | null;
  now?: () => Date;
}

export class ResearchSessionService {
  private orchestrator: ResearchOrchestrator | null;
  private persistence: ResearchPersistencePort | null;
  private submissionPort: import("./providers/researchSubmissionPort.js").ResearchSubmissionPort | null;
  private now: () => Date;

  constructor(
    private prisma: PrismaClient,
    deps?: ResearchSessionServiceDeps
  ) {
    this.orchestrator = deps?.orchestrator || null;
    this.persistence = deps?.persistence || null;
    this.submissionPort = deps?.submissionPort || null;
    this.now = deps?.now || (() => new Date());
  }

  private hashString(content: string): string {
    return crypto.createHash("sha256").update(content.trim()).digest("hex");
  }

  async getOrCreateSessionForTopic(topicId: string, notebookUrl?: string | null, notebookId?: string | null) {
    // Check if topic exists
    const topic = await this.prisma.topic.findUnique({ where: { id: topicId } });
    if (!topic) {
      throw new Error(`Topic with id ${topicId} not found`);
    }

    // Find latest active session for topic or create one
    let session = await this.prisma.researchSession.findFirst({
      where: {
        topicId,
        status: { not: "archived" },
      },
      orderBy: { createdAt: "desc" },
      include: {
        sourcePackages: { orderBy: { version: "desc" } },
        taskPrompts: { orderBy: { version: "desc" } },
        artifacts: {
          orderBy: { createdAt: "desc" },
          include: { citations: true, imports: true, sourcePackage: true },
        },
        timelineEvents: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!session) {
      session = await this.prisma.researchSession.create({
        data: {
          topicId,
          notebookUrl: notebookUrl || null,
          notebookId: notebookId || null,
          status: "idle",
          timelineEvents: {
            create: {
              topicId,
              eventType: "session_created",
              eventData: { topicTitle: topic.title },
            },
          },
        },
        include: {
          sourcePackages: true,
          taskPrompts: true,
          artifacts: {
            include: { citations: true, imports: true, sourcePackage: true },
          },
          timelineEvents: true,
        },
      });
    }

    return session;
  }

  async getSessionById(sessionId: string) {
    const session = await this.prisma.researchSession.findUnique({
      where: { id: sessionId },
      include: {
        topic: true,
        sourcePackages: { orderBy: { version: "desc" } },
        taskPrompts: { orderBy: { version: "desc" } },
        artifacts: {
          orderBy: { createdAt: "desc" },
          include: { citations: true, imports: true, sourcePackage: true },
        },
        timelineEvents: { orderBy: { createdAt: "asc" } },
      },
    });

    return session;
  }

  async updateSession(sessionId: string, data: { status?: string; notebookUrl?: string | null; notebookId?: string | null }) {
    const updated = await this.prisma.researchSession.update({
      where: { id: sessionId },
      data,
      include: {
        sourcePackages: { orderBy: { version: "desc" } },
        taskPrompts: { orderBy: { version: "desc" } },
        artifacts: {
          orderBy: { createdAt: "desc" },
          include: { citations: true, imports: true, sourcePackage: true },
        },
        timelineEvents: { orderBy: { createdAt: "asc" } },
      },
    });
    return updated;
  }

  async packageSources(sessionId: string, content: string, sourceCount: number = 0) {
    const session = await this.prisma.researchSession.findUnique({
      where: { id: sessionId },
      include: { sourcePackages: { orderBy: { version: "desc" } } },
    });

    if (!session) {
      throw new Error(`Session with id ${sessionId} not found`);
    }

    const contentHash = this.hashString(content);
    const nextVersion = (session.sourcePackages[0]?.version || 0) + 1;

    // Run in transaction: set all existing packages isCurrent = false, create new package, record event
    const [_, newPackage] = await this.prisma.$transaction([
      this.prisma.sourcePackage.updateMany({
        where: { sessionId },
        data: { isCurrent: false },
      }),
      this.prisma.sourcePackage.create({
        data: {
          sessionId,
          version: nextVersion,
          isCurrent: true,
          content,
          contentHash,
          sourceCount,
        },
      }),
      this.prisma.researchSession.update({
        where: { id: sessionId },
        data: { status: "packaged" },
      }),
      this.prisma.researchTimelineEvent.create({
        data: {
          sessionId,
          topicId: session.topicId,
          eventType: "source_packaged",
          eventData: {
            version: nextVersion,
            sourceCount,
            contentLength: content.length,
            contentHash,
          },
        },
      }),
    ]);

    return newPackage;
  }

  async saveTaskPrompt(
    sessionId: string,
    promptMode: string,
    promptText: string,
    cliCommandHint?: string | null
  ) {
    const session = await this.prisma.researchSession.findUnique({
      where: { id: sessionId },
      include: { taskPrompts: { orderBy: { version: "desc" } } },
    });

    if (!session) {
      throw new Error(`Session with id ${sessionId} not found`);
    }

    const promptHash = this.hashString(promptText);
    const nextVersion = (session.taskPrompts[0]?.version || 0) + 1;

    const [_, newPrompt] = await this.prisma.$transaction([
      this.prisma.taskPrompt.updateMany({
        where: { sessionId },
        data: { isCurrent: false },
      }),
      this.prisma.taskPrompt.create({
        data: {
          sessionId,
          version: nextVersion,
          isCurrent: true,
          promptMode,
          promptText,
          promptHash,
          cliCommandHint: cliCommandHint || null,
        },
      }),
      this.prisma.researchSession.update({
        where: { id: sessionId },
        data: { status: "prompt_ready" },
      }),
      this.prisma.researchTimelineEvent.create({
        data: {
          sessionId,
          topicId: session.topicId,
          eventType: "prompt_generated",
          eventData: {
            version: nextVersion,
            promptMode,
            promptLength: promptText.length,
            promptHash,
          },
        },
      }),
    ]);

    return newPrompt;
  }

  /**
   * Orchestrates research via injected ResearchOrchestrator and persists execution trace
   * to researchSession.status and researchTimelineEvent without requiring schema migrations.
   */
  async startProviderResearchForSession(params: {
    sessionId: string;
    workspaceTitle: string;
    workspaceMetadata?: Record<string, string>;
    sources: SourcePayload[];
    preferredProviderId?: string | null;
    generateAudioOverview?: boolean;
    audioFormat?: "deep_dive" | "brief";
    correlationId?: string;
  }): Promise<{
    sessionId: string;
    correlationId: string;
    providerId: string;
    workspaceId: string;
    sourceCount: number;
    audioJobId: string | null;
    terminalStatus: "COMPLETED" | "FAILED" | "PARTIAL" | "IN_PROGRESS";
  }> {
    const session = await this.prisma.researchSession.findUnique({
      where: { id: params.sessionId },
    });

    if (!session) {
      throw new Error(`Session with id ${params.sessionId} not found`);
    }

    if (!this.orchestrator) {
      throw new ProviderException(
        "INTERNAL_ERROR",
        "ResearchOrchestrator dependency is not configured in ResearchSessionService",
        params.correlationId,
        undefined,
        false
      );
    }

    if (!this.persistence) {
      throw new ProviderException(
        "INTERNAL_ERROR",
        "ResearchPersistencePort dependency is not configured in ResearchSessionService",
        params.correlationId,
        undefined,
        false
      );
    }

    const correlationId = params.correlationId || `corr-${crypto.randomUUID()}`;

    // 1. Run orchestration flow
    const orchResult = await this.orchestrator.startResearchJob({
      workspaceTitle: params.workspaceTitle,
      workspaceMetadata: params.workspaceMetadata,
      sources: params.sources,
      preferredProviderId: params.preferredProviderId,
      generateAudioOverview: params.generateAudioOverview,
      audioFormat: params.audioFormat,
      correlationId,
    });

    // 2. Fetch snapshot from persistence
    const snapshot = await this.persistence.getExecutionByCorrelationId(correlationId);
    const terminalStatus = snapshot?.terminalStatus || "COMPLETED";
    const audioJobId = orchResult.audioJob ? orchResult.audioJob.remoteJobId : null;

    // 3. Persist trace to Prisma without modifying database schema
    try {
      await this.prisma.researchSession.update({
        where: { id: params.sessionId },
        data: {
          status: orchResult.audioJob ? "handoff_active" : "completed",
          notebookId: orchResult.workspaceId,
        },
      });

      await this.prisma.researchTimelineEvent.create({
        data: {
          sessionId: params.sessionId,
          topicId: session.topicId,
          eventType: "provider_research_completed",
          eventData: {
            schemaVersion: 1,
            correlationId,
            providerId: orchResult.providerId,
            workspaceId: orchResult.workspaceId,
            sourceCount: orchResult.sourceCount,
            audioJobId,
            terminalStatus,
            attemptCount: orchResult.attemptRecords.length,
          },
        },
      });
    } catch (prismaErr: unknown) {
      const rawMessage =
        prismaErr instanceof Error ? prismaErr.message : String(prismaErr);
      throw new ProviderException(
        "INTERNAL_ERROR",
        `Prisma sync failed: ${sanitizeProviderErrorMessage(rawMessage)}`,
        correlationId,
        orchResult.providerId,
        false
      );
    }

    return {
      sessionId: params.sessionId,
      correlationId,
      providerId: orchResult.providerId,
      workspaceId: orchResult.workspaceId,
      sourceCount: orchResult.sourceCount,
      audioJobId,
      terminalStatus,
    };
  }

  /**
   * Retrieves full execution snapshot from persistence port by correlationId.
   */
  async getProviderExecutionSnapshot(params: {
    correlationId: string;
  }): Promise<ResearchExecutionSnapshot | null> {
    if (!this.persistence) {
      return null;
    }
    return this.persistence.getExecutionByCorrelationId(params.correlationId);
  }

  /**
   * Evaluates whether a requested intent is new, an idempotent replay, or a conflicting duplicate.
   */
  async evaluateReplay(params: {
    correlationId: string;
    tool: string;
    normalizedInput: Record<string, unknown>;
  }): Promise<{
    decision: "NEW" | "IDEMPOTENT_REPLAY" | "IDEMPOTENCY_CONFLICT" | "UNKNOWN_PERSISTENCE_ERROR";
    existingSnapshot?: ResearchExecutionSnapshot | null;
    reason?: string;
  }> {
    if (!this.persistence) {
      return { decision: "NEW" };
    }

    let existingSnapshot: ResearchExecutionSnapshot | null = null;
    try {
      existingSnapshot = await this.persistence.getExecutionByCorrelationId(params.correlationId);
    } catch (err: unknown) {
      const rawMsg = err instanceof Error ? err.message : String(err);
      return {
        decision: "UNKNOWN_PERSISTENCE_ERROR",
        reason: sanitizeProviderErrorMessage(`Persistence read error: ${rawMsg}`),
      };
    }

    if (!existingSnapshot) {
      return { decision: "NEW" };
    }

    const firstAttempt = existingSnapshot.attemptRecords[0];
    const rawDetails = (firstAttempt?.rawErrorDetails as Record<string, unknown>) || {};
    const recordedTool = rawDetails.tool as string | undefined;

    if (recordedTool && recordedTool !== params.tool) {
      return {
        decision: "IDEMPOTENCY_CONFLICT",
        existingSnapshot,
        reason: `Correlation ID '${params.correlationId}' was already registered for tool '${recordedTool}', cannot reuse for tool '${params.tool}'.`,
      };
    }

    const sanitizeObjectValues = (val: unknown): unknown => {
      if (typeof val === "string") {
        return sanitizeProviderErrorMessage(val);
      }
      if (Array.isArray(val)) {
        return val.map(sanitizeObjectValues);
      }
      if (val && typeof val === "object") {
        const sortedKeys = Object.keys(val as Record<string, unknown>).sort();
        const res: Record<string, unknown> = {};
        for (const k of sortedKeys) {
          res[k] = sanitizeObjectValues((val as Record<string, unknown>)[k]);
        }
        return res;
      }
      return val;
    };

    const currentFingerprint = JSON.stringify({
      tool: params.tool,
      input: sanitizeObjectValues(params.normalizedInput),
    });

    const storedFingerprint =
      (rawDetails.inputFingerprint as string) ||
      (rawDetails.normalizedInput
        ? JSON.stringify({
            tool: recordedTool || params.tool,
            input: sanitizeObjectValues(rawDetails.normalizedInput),
          })
        : undefined);

    if (storedFingerprint && storedFingerprint !== currentFingerprint) {
      return {
        decision: "IDEMPOTENCY_CONFLICT",
        existingSnapshot,
        reason: `Correlation ID '${params.correlationId}' has conflicting normalized input parameters.`,
      };
    }

    return {
      decision: "IDEMPOTENT_REPLAY",
      existingSnapshot,
    };
  }

  /**
   * Retrieves the current state and intent metadata for a given correlationId.
   */
  async getExecutionIntentState(correlationId: string): Promise<{
    correlationId: string;
    intentStatus: "intent_recorded" | "ready_for_approval" | "replay_blocked" | "transition_rejected" | "dry_run_only" | "intent_rejected";
    terminalStatus: ResearchTerminalStatus;
    snapshot: ResearchExecutionSnapshot | null;
    state: {
      current: string;
      target?: string;
      transitionAccepted: boolean;
      previous?: string;
      requestedBy?: string;
      updatedAt?: string;
    };
  } | null> {
    if (!this.persistence) {
      return null;
    }

    const snapshot = await this.persistence.getExecutionByCorrelationId(correlationId);
    if (!snapshot) {
      return null;
    }

    const firstAttempt = snapshot.attemptRecords[0];
    const rawDetails = (firstAttempt?.rawErrorDetails as Record<string, unknown>) || {};
    const rawState = (rawDetails.state as {
      current: string;
      target?: string;
      transitionAccepted: boolean;
      previous?: string;
      requestedBy?: string;
      updatedAt?: string;
    }) || {
      current: (rawDetails.intentStatus as string) || "intent_recorded",
      transitionAccepted: true,
    };

    const intentStatus =
      (rawDetails.intentStatus as
        | "intent_recorded"
        | "ready_for_approval"
        | "replay_blocked"
        | "transition_rejected"
        | "dry_run_only"
        | "intent_rejected") || "intent_recorded";

    return {
      correlationId,
      intentStatus,
      terminalStatus: snapshot.terminalStatus,
      snapshot,
      state: rawState,
    };
  }

  /**
   * Transitions an existing execution intent through validated lifecycle gates.
   */
  async transitionExecutionIntent(params: {
    correlationId: string;
    expectedCurrentState: string;
    targetState: string;
    tool?: string;
    inputFingerprint?: string;
    requestedBy?: string;
  }): Promise<{
    correlationId: string;
    currentState: string;
    transitionAccepted: boolean;
    reason?: string;
  }> {
    if (!this.persistence) {
      return {
        correlationId: params.correlationId,
        currentState: "dry_run_only",
        transitionAccepted: false,
        reason: "Persistence layer not configured",
      };
    }

    let snapshot: ResearchExecutionSnapshot | null = null;
    try {
      snapshot = await this.persistence.getExecutionByCorrelationId(params.correlationId);
    } catch (err: unknown) {
      const rawMsg = err instanceof Error ? err.message : String(err);
      return {
        correlationId: params.correlationId,
        currentState: "unknown",
        transitionAccepted: false,
        reason: sanitizeProviderErrorMessage(`Persistence lookup failure: ${rawMsg}`),
      };
    }

    if (!snapshot) {
      return {
        correlationId: params.correlationId,
        currentState: "unknown",
        transitionAccepted: false,
        reason: `Execution intent '${params.correlationId}' not found in persistence layer.`,
      };
    }

    const firstAttempt = snapshot.attemptRecords[0];
    const rawDetails = (firstAttempt?.rawErrorDetails as Record<string, unknown>) || {};
    const currentState =
      (rawDetails.state as { current?: string })?.current ||
      (rawDetails.intentStatus as string) ||
      "intent_recorded";

    // 1. Validate expectedCurrentState
    if (currentState !== params.expectedCurrentState) {
      return {
        correlationId: params.correlationId,
        currentState,
        transitionAccepted: false,
        reason: `State mismatch: expected current state '${params.expectedCurrentState}', but actual state is '${currentState}'.`,
      };
    }

    // 2. Block executing transition in Phase 6.0
    const BLOCKED_EXECUTION_TARGETS = new Set([
      "executing",
      "in_progress_execution",
      "provider_submitted",
      "completed",
      "failed_provider_execution",
    ]);

    if (BLOCKED_EXECUTION_TARGETS.has(params.targetState)) {
      return {
        correlationId: params.correlationId,
        currentState,
        transitionAccepted: false,
        reason: "Transition to executing or provider execution plane is strictly blocked in Phase 5.9 / strictly blocked in Phase 6.0.",
      };
    }

    // 3. Validate transition against table
    const ALLOWED_INTENT_TRANSITIONS: Record<string, ReadonlySet<string>> = {
      intent_recorded: new Set(["ready_for_approval", "replay_blocked", "transition_rejected"]),
      ready_for_approval: new Set([
        "approved_for_handoff",
        "handoff_blocked",
        "replay_blocked",
        "transition_rejected",
      ]),
      approved_for_handoff: new Set([
        "handoff_blocked",
        "replay_blocked",
        "transition_rejected",
      ]),
    };

    const allowedTargets = ALLOWED_INTENT_TRANSITIONS[currentState];
    if (!allowedTargets || !allowedTargets.has(params.targetState)) {
      return {
        correlationId: params.correlationId,
        currentState,
        transitionAccepted: false,
        reason: `Invalid transition from '${currentState}' to '${params.targetState}'.`,
      };
    }

    // 4. Record transition
    const nowIso = this.now().toISOString();
    const updatedState = {
      current: params.targetState,
      previous: currentState,
      transitionAccepted: true,
      requestedBy: params.requestedBy ? sanitizeProviderErrorMessage(params.requestedBy) : undefined,
      updatedAt: nowIso,
    };

    const updatedRawDetails = {
      ...rawDetails,
      intentStatus: params.targetState as McpIntentStatus,
      state: updatedState,
    };

    const updatedSnapshot: ResearchExecutionSnapshot = {
      ...snapshot,
      updatedAt: nowIso,
      attemptRecords: [
        {
          ...firstAttempt,
          rawErrorDetails: updatedRawDetails,
        },
        ...snapshot.attemptRecords.slice(1),
      ],
    };

    try {
      await this.persistence.saveExecution(updatedSnapshot);
    } catch (err: unknown) {
      const rawMsg = err instanceof Error ? err.message : String(err);
      return {
        correlationId: params.correlationId,
        currentState,
        transitionAccepted: false,
        reason: sanitizeProviderErrorMessage(`Persistence write failure during transition: ${rawMsg}`),
      };
    }

    return {
      correlationId: params.correlationId,
      currentState: params.targetState,
      transitionAccepted: true,
    };
  }

  /**
   * Prepares a simulated execution handoff envelope for approved intents.
   * Strictly enforces mode: "handoff_only" and sideEffectsAllowed: false.
   * Zero real provider execution.
   */
  async prepareExecutionHandoff(params: {
    correlationId: string;
    approval: ExecutionApprovalProof;
    expectedProviderId?: string;
    expectedTool?: string;
    expectedInputFingerprint?: string;
  }): Promise<{
    success: boolean;
    handoff?: ResearchExecutionHandoff;
    reason?: string;
    intentStatus: McpIntentStatus;
  }> {
    if (!this.persistence) {
      return {
        success: false,
        intentStatus: "dry_run_only",
        reason: "Persistence layer not configured",
      };
    }

    let snapshot: ResearchExecutionSnapshot | null = null;
    try {
      snapshot = await this.persistence.getExecutionByCorrelationId(params.correlationId);
    } catch (err: unknown) {
      const rawMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        intentStatus: "transition_rejected",
        reason: sanitizeProviderErrorMessage(`Persistence lookup failure: ${rawMsg}`),
      };
    }

    if (!snapshot) {
      return {
        success: false,
        intentStatus: "transition_rejected",
        reason: `Execution intent '${params.correlationId}' not found in persistence layer.`,
      };
    }

    const firstAttempt = snapshot.attemptRecords[0];
    const rawDetails = (firstAttempt?.rawErrorDetails as Record<string, unknown>) || {};
    const currentState =
      (rawDetails.state as { current?: string })?.current ||
      (rawDetails.intentStatus as string) ||
      "intent_recorded";

    // 1. Current state must be ready_for_approval or approved_for_handoff
    if (currentState !== "ready_for_approval" && currentState !== "approved_for_handoff") {
      return {
        success: false,
        intentStatus: currentState as McpIntentStatus,
        reason: `Cannot prepare handoff from state '${currentState}'. Intent must be in 'ready_for_approval' state.`,
      };
    }

    const storedTool = (rawDetails.tool as string) || "research_create_workspace";
    const storedNormalizedInput = (rawDetails.normalizedInput as Record<string, unknown>) || {};
    const storedFingerprint =
      (rawDetails.inputFingerprint as string) ||
      JSON.stringify({ tool: storedTool, input: storedNormalizedInput });

    // 2. Validate tool match
    if (params.expectedTool && params.expectedTool !== storedTool) {
      return {
        success: false,
        intentStatus: "handoff_blocked",
        reason: `Tool mismatch: expected '${params.expectedTool}' but registered intent tool is '${storedTool}'.`,
      };
    }

    // 3. Validate providerId match
    if (params.expectedProviderId && params.expectedProviderId !== snapshot.providerId) {
      return {
        success: false,
        intentStatus: "handoff_blocked",
        reason: `Provider mismatch: expected '${params.expectedProviderId}' but registered intent provider is '${snapshot.providerId}'.`,
      };
    }

    // 4. Validate input fingerprint
    if (params.expectedInputFingerprint && params.expectedInputFingerprint !== storedFingerprint) {
      return {
        success: false,
        intentStatus: "handoff_blocked",
        reason: `Input fingerprint mismatch: expected '${params.expectedInputFingerprint}' but registered intent fingerprint is '${storedFingerprint}'.`,
      };
    }

    // 5. Validate capabilities
    const capabilityCheck = rawDetails.capabilityCheck as { satisfied?: boolean } | undefined;
    if (capabilityCheck && !capabilityCheck.satisfied) {
      return {
        success: false,
        intentStatus: "handoff_blocked",
        reason: "Required provider capabilities are not satisfied for this intent.",
      };
    }

    // 6. Validate Approval Proof
    const approvalValidation = validateApprovalProof(params.approval, {
      correlationId: params.correlationId,
      inputFingerprint: storedFingerprint,
      expectedProviderId: snapshot.providerId,
      now: this.now(),
    });

    if (!approvalValidation.valid || !approvalValidation.sanitizedProof) {
      return {
        success: false,
        intentStatus: "handoff_blocked",
        reason: `Approval proof validation failed: ${approvalValidation.reason}`,
      };
    }

    const sanitizedApproval = approvalValidation.sanitizedProof;
    const nowIso = this.now().toISOString();

    // 7. Transition intent to approved_for_handoff
    const updatedState = {
      current: "approved_for_handoff" as const,
      previous: currentState,
      transitionAccepted: true,
      approval: sanitizedApproval,
      updatedAt: nowIso,
    };

    const updatedRawDetails = {
      ...rawDetails,
      intentStatus: "approved_for_handoff" as const,
      state: updatedState,
    };

    const updatedSnapshot: ResearchExecutionSnapshot = {
      ...snapshot,
      updatedAt: nowIso,
      attemptRecords: [
        {
          ...firstAttempt,
          rawErrorDetails: updatedRawDetails,
        },
        ...snapshot.attemptRecords.slice(1),
      ],
    };

    try {
      await this.persistence.saveExecution(updatedSnapshot);
    } catch (err: unknown) {
      const rawMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        intentStatus: "transition_rejected",
        reason: sanitizeProviderErrorMessage(`Persistence write failure during handoff preparation: ${rawMsg}`),
      };
    }

    const handoff: ResearchExecutionHandoff = {
      handoffId: `handoff-${params.correlationId}`,
      correlationId: params.correlationId,
      providerId: snapshot.providerId,
      tool: storedTool as
        | "research_create_workspace"
        | "research_ingest_sources"
        | "research_generate_audio",
      normalizedInput: storedNormalizedInput,
      inputFingerprint: storedFingerprint,
      approval: sanitizedApproval,
      requestedAt: nowIso,
      mode: "handoff_only",
      sideEffectsAllowed: false,
    };

    return {
      success: true,
      handoff,
      intentStatus: "approved_for_handoff",
    };
  }

  /**
   * Simulates submission to provider execution plane (Phase 6.1).
   * Pure in-memory simulation with zero real provider calls.
   */
  async simulateExecutionSubmission(
    handoff: ResearchExecutionHandoff
  ): Promise<import("./providers/executionSimulationStub.js").SimulatedSubmissionResult> {
    const { InMemoryExecutionSimulationProvider } = await import(
      "./providers/executionSimulationStub.js"
    );
    const simulationStub = new InMemoryExecutionSimulationProvider({
      persistence: this.persistence,
      now: () => this.now(),
    });
    return simulationStub.simulateSubmission(handoff);
  }

  /**
   * Submits execution request to the execution-plane via ResearchSubmissionPort (Phase 6.2).
   * Defaults to SimulationSubmissionAdapter with strict default-deny boundaries.
   * Zero real provider execution.
   */
  async submitExecution(
    request: import("./providers/executionSubmissionContract.js").ResearchSubmissionRequest
  ): Promise<import("./providers/executionSubmissionContract.js").ResearchSubmissionResult> {
    if (this.submissionPort) {
      return this.submissionPort.submit(request);
    }

    const { SimulationSubmissionAdapter } = await import(
      "./providers/simulationSubmissionAdapter.js"
    );
    const { InMemoryExecutionSimulationProvider } = await import(
      "./providers/executionSimulationStub.js"
    );

    const simulationStub = new InMemoryExecutionSimulationProvider({
      persistence: this.persistence,
      now: () => this.now(),
    });
    const defaultPort = new SimulationSubmissionAdapter(simulationStub);
    return defaultPort.submit(request);
  }

  /**
   * Records a dry-run execution intent and audit trail in the persistence layer.
   * Enforces safe replay gates and state machine lifecycle.
   * Zero side effects: does not execute provider or orchestrator operations.
   */
  async recordExecutionIntent(params: {
    correlationId?: string;
    tool: "research_create_workspace" | "research_ingest_sources" | "research_generate_audio";
    dryRun: true;
    accepted: boolean;
    providerResolution: {
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
    normalizedInput: Record<string, unknown>;
    sessionId?: string | null;
  }): Promise<{
    correlationId: string;
    tool: "research_create_workspace" | "research_ingest_sources" | "research_generate_audio";
    dryRun: true;
    accepted: boolean;
    replayDecision: "NEW" | "IDEMPOTENT_REPLAY" | "IDEMPOTENCY_CONFLICT" | "UNKNOWN_PERSISTENCE_ERROR";
    state: {
      current: string;
      target?: string;
      transitionAccepted: boolean;
    };
    providerResolution: {
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
    normalizedInput: Record<string, unknown>;
    status: "intent_recorded" | "intent_rejected" | "dry_run_only";
    createdAt: string;
  }> {
    const sanitizeObjectValues = (val: unknown): unknown => {
      if (typeof val === "string") {
        return sanitizeProviderErrorMessage(val);
      }
      if (Array.isArray(val)) {
        return val.map(sanitizeObjectValues);
      }
      if (val && typeof val === "object") {
        const sortedKeys = Object.keys(val as Record<string, unknown>).sort();
        const res: Record<string, unknown> = {};
        for (const k of sortedKeys) {
          res[k] = sanitizeObjectValues((val as Record<string, unknown>)[k]);
        }
        return res;
      }
      return val;
    };

    const sanitizedInput = sanitizeObjectValues(params.normalizedInput) as Record<string, unknown>;
    const inputFingerprint = JSON.stringify({
      tool: params.tool,
      input: sanitizedInput,
    });

    // Check replay if correlationId is provided
    if (params.correlationId) {
      const replayEval = await this.evaluateReplay({
        correlationId: params.correlationId,
        tool: params.tool,
        normalizedInput: sanitizedInput,
      });

      if (replayEval.decision === "IDEMPOTENT_REPLAY" && replayEval.existingSnapshot) {
        const firstAtt = replayEval.existingSnapshot.attemptRecords[0];
        const rawDetails = (firstAtt?.rawErrorDetails as Record<string, unknown>) || {};
        const storedInput = (rawDetails.normalizedInput as Record<string, unknown>) || sanitizedInput;
        const storedStatus = (rawDetails.intentStatus as "intent_recorded" | "intent_rejected" | "dry_run_only") || "intent_recorded";
        const storedState = (rawDetails.state as {
          current: string;
          target?: string;
          transitionAccepted: boolean;
        }) || {
          current: storedStatus,
          target: "ready_for_approval",
          transitionAccepted: true,
        };

        return {
          correlationId: params.correlationId,
          tool: params.tool,
          dryRun: true,
          accepted: params.accepted,
          replayDecision: "IDEMPOTENT_REPLAY",
          state: storedState,
          providerResolution: { ...params.providerResolution },
          capabilityCheck: {
            required: [...params.capabilityCheck.required],
            satisfied: params.capabilityCheck.satisfied,
            missing: [...params.capabilityCheck.missing],
          },
          normalizedInput: storedInput,
          status: storedStatus,
          createdAt: replayEval.existingSnapshot.createdAt,
        };
      }

      if (replayEval.decision === "IDEMPOTENCY_CONFLICT") {
        throw new ProviderException(
          "IDEMPOTENCY_CONFLICT",
          replayEval.reason || "Idempotency conflict detected for correlationId",
          params.correlationId,
          params.providerResolution.resolvedProviderId || undefined,
          false
        );
      }

      if (replayEval.decision === "UNKNOWN_PERSISTENCE_ERROR") {
        throw new ProviderException(
          "INTERNAL_ERROR",
          replayEval.reason || "Persistence failure during replay evaluation",
          params.correlationId,
          params.providerResolution.resolvedProviderId || undefined,
          false
        );
      }
    }

    const correlationId = params.correlationId || `corr-mcp-${crypto.randomUUID()}`;
    const nowIso = this.now().toISOString();
    const status: "intent_recorded" | "intent_rejected" | "dry_run_only" = !this.persistence
      ? "dry_run_only"
      : params.accepted
      ? "intent_recorded"
      : "intent_rejected";

    const state = {
      current: status === "intent_recorded" ? "intent_recorded" : status,
      target: params.accepted ? "ready_for_approval" : undefined,
      transitionAccepted: params.accepted,
    };

    const intentRecord = {
      correlationId,
      tool: params.tool,
      dryRun: true as const,
      accepted: params.accepted,
      replayDecision: "NEW" as const,
      state,
      providerResolution: { ...params.providerResolution },
      capabilityCheck: {
        required: [...params.capabilityCheck.required],
        satisfied: params.capabilityCheck.satisfied,
        missing: [...params.capabilityCheck.missing],
      },
      normalizedInput: sanitizedInput,
      status,
      createdAt: nowIso,
    };

    if (this.persistence) {
      const providerId =
        params.providerResolution.resolvedProviderId ||
        params.providerResolution.requestedProviderId ||
        "unknown";

      const workspaceId =
        (sanitizedInput.workspaceId as string) ||
        (sanitizedInput.topicSlug as string) ||
        "dry-run-workspace";

      const sourceCount =
        typeof sanitizedInput.sourceCount === "number"
          ? sanitizedInput.sourceCount
          : 0;

      const snapshot: ResearchExecutionSnapshot = {
        correlationId,
        providerId,
        workspaceId,
        sourceCount,
        audioJobId: null,
        attemptRecords: [
          {
            attemptId: `att-mcp-${correlationId}`,
            providerId,
            status: params.accepted ? "IN_PROGRESS" : "FAILED",
            remoteWorkspaceId: workspaceId,
            startedAt: nowIso,
            completedAt: nowIso,
            errorCode: params.accepted ? undefined : "CAPABILITY_UNSUPPORTED",
            errorMessage: params.accepted
              ? undefined
              : sanitizeProviderErrorMessage(
                  "Dry-run rejected: Missing required capability or routing disabled"
                ),
            rawErrorDetails: {
              dryRun: true,
              tool: params.tool,
              intentStatus: status,
              accepted: params.accepted,
              normalizedInput: sanitizedInput,
              inputFingerprint,
              capabilityCheck: params.capabilityCheck,
              state,
            },
          },
        ],
        createdAt: nowIso,
        updatedAt: nowIso,
        terminalStatus: params.accepted ? "IN_PROGRESS" : "FAILED",
      };

      await this.persistence.saveExecution(snapshot);
    }

    return intentRecord;
  }
}
