/**
 * Production Persistence Boundary Port & InMemory Implementation
 * (Phase 4.7 Persistence Adapter Skeleton)
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * - NO real database calls or schema mutations.
 * - Pure in-memory reference implementation for testing and contract compliance.
 * - Defensive cloning to prevent state mutation.
 */

import { ProviderAttemptRecord } from "./types";

export type ResearchTerminalStatus =
  | "COMPLETED"
  | "FAILED"
  | "PARTIAL"
  | "IN_PROGRESS";

export interface ResearchExecutionSnapshot {
  readonly correlationId: string;
  readonly providerId: string;
  readonly workspaceId: string;
  readonly sourceCount: number;
  readonly audioJobId: string | null;
  readonly attemptRecords: ProviderAttemptRecord[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly terminalStatus: ResearchTerminalStatus;
}

export interface ResearchPersistencePort {
  saveExecution(snapshot: ResearchExecutionSnapshot): Promise<void>;
  getExecutionByCorrelationId(
    correlationId: string
  ): Promise<ResearchExecutionSnapshot | null>;
  listAttempts(correlationId: string): Promise<ProviderAttemptRecord[]>;
}

/**
 * Deterministic In-Memory implementation of ResearchPersistencePort.
 */
export class InMemoryResearchPersistencePort implements ResearchPersistencePort {
  private readonly storage: Map<string, ResearchExecutionSnapshot> = new Map();

  public async saveExecution(
    snapshot: ResearchExecutionSnapshot
  ): Promise<void> {
    // Defensive deep copy of attempt records to guarantee immutability
    const clonedSnapshot: ResearchExecutionSnapshot = {
      ...snapshot,
      attemptRecords: snapshot.attemptRecords.map((att) => ({ ...att })),
    };

    this.storage.set(snapshot.correlationId, clonedSnapshot);
  }

  public async getExecutionByCorrelationId(
    correlationId: string
  ): Promise<ResearchExecutionSnapshot | null> {
    const item = this.storage.get(correlationId);
    if (!item) {
      return null;
    }

    return {
      ...item,
      attemptRecords: item.attemptRecords.map((att) => ({ ...att })),
    };
  }

  public async listAttempts(
    correlationId: string
  ): Promise<ProviderAttemptRecord[]> {
    const execution = await this.getExecutionByCorrelationId(correlationId);
    if (!execution) {
      return [];
    }

    return execution.attemptRecords;
  }
}
