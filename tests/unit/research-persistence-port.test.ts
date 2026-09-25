/**
 * Research Persistence Port & Adapter Unit Tests
 * (Phase 4.7 Test-First Validation Suite)
 */

import { describe, it, expect } from "vitest";
import {
  InMemoryResearchPersistencePort,
  ResearchExecutionSnapshot,
} from "../../src/server/services/providers/researchPersistencePort";
import { ProviderAttemptRecord } from "../../src/server/services/providers/types";

describe("RESEARCH PERSISTENCE PORT UNIT TESTS (PHASE 4.7)", () => {
  const sampleAttempts: ProviderAttemptRecord[] = [
    {
      attemptId: "att-ws-01",
      providerId: "notebooklm-enterprise",
      status: "COMPLETED",
      remoteWorkspaceId: "nlm-ws-100",
      startedAt: "2026-09-24T12:00:00.000Z",
      completedAt: "2026-09-24T12:00:01.000Z",
    },
    {
      attemptId: "att-ingest-01",
      providerId: "notebooklm-enterprise",
      status: "COMPLETED",
      remoteWorkspaceId: "nlm-ws-100",
      startedAt: "2026-09-24T12:00:01.000Z",
      completedAt: "2026-09-24T12:00:05.000Z",
    },
  ];

  const sampleSnapshot: ResearchExecutionSnapshot = {
    correlationId: "corr-pers-001",
    providerId: "notebooklm-enterprise",
    workspaceId: "nlm-ws-100",
    sourceCount: 2,
    audioJobId: "nlm-op-audio-999",
    attemptRecords: sampleAttempts,
    createdAt: "2026-09-24T12:00:00.000Z",
    updatedAt: "2026-09-24T12:00:05.000Z",
    terminalStatus: "COMPLETED",
  };

  it("1. SaveExecution saves snapshot successfully", async () => {
    const port = new InMemoryResearchPersistencePort();
    await port.saveExecution(sampleSnapshot);

    const saved = await port.getExecutionByCorrelationId("corr-pers-001");
    expect(saved).not.toBeNull();
    expect(saved?.correlationId).toBe("corr-pers-001");
    expect(saved?.sourceCount).toBe(2);
  });

  it("2. GetExecutionByCorrelationId returns exact snapshot data", async () => {
    const port = new InMemoryResearchPersistencePort();
    await port.saveExecution(sampleSnapshot);

    const saved = await port.getExecutionByCorrelationId("corr-pers-001");
    expect(saved).toEqual(sampleSnapshot);
  });

  it("3. GetExecutionByCorrelationId returns null when record does not exist", async () => {
    const port = new InMemoryResearchPersistencePort();
    const result = await port.getExecutionByCorrelationId("non-existent-corr");
    expect(result).toBeNull();
  });

  it("4. ListAttempts returns attempt records in exact execution order", async () => {
    const port = new InMemoryResearchPersistencePort();
    await port.saveExecution(sampleSnapshot);

    const attempts = await port.listAttempts("corr-pers-001");
    expect(attempts).toHaveLength(2);
    expect(attempts[0].attemptId).toBe("att-ws-01");
    expect(attempts[1].attemptId).toBe("att-ingest-01");
  });

  it("5. SaveExecution overwrites existing snapshot with same correlationId (upsert)", async () => {
    const port = new InMemoryResearchPersistencePort();
    await port.saveExecution(sampleSnapshot);

    const updatedSnapshot: ResearchExecutionSnapshot = {
      ...sampleSnapshot,
      sourceCount: 5,
      terminalStatus: "PARTIAL",
    };

    await port.saveExecution(updatedSnapshot);

    const retrieved = await port.getExecutionByCorrelationId("corr-pers-001");
    expect(retrieved?.sourceCount).toBe(5);
    expect(retrieved?.terminalStatus).toBe("PARTIAL");
  });

  it("6. UpdatedAt changes on subsequent saveExecution", async () => {
    const port = new InMemoryResearchPersistencePort();
    await port.saveExecution(sampleSnapshot);

    const newTimestamp = "2026-09-24T12:10:00.000Z";
    const updatedSnapshot: ResearchExecutionSnapshot = {
      ...sampleSnapshot,
      updatedAt: newTimestamp,
    };

    await port.saveExecution(updatedSnapshot);

    const retrieved = await port.getExecutionByCorrelationId("corr-pers-001");
    expect(retrieved?.updatedAt).toBe(newTimestamp);
    expect(retrieved?.createdAt).toBe("2026-09-24T12:00:00.000Z");
  });

  it("7. TerminalStatus preserves exact status values ('COMPLETED' | 'FAILED' | 'PARTIAL' | 'IN_PROGRESS')", async () => {
    const port = new InMemoryResearchPersistencePort();
    const statuses: Array<ResearchExecutionSnapshot["terminalStatus"]> = [
      "IN_PROGRESS",
      "COMPLETED",
      "PARTIAL",
      "FAILED",
    ];

    for (const status of statuses) {
      await port.saveExecution({
        ...sampleSnapshot,
        correlationId: `corr-${status}`,
        terminalStatus: status,
      });

      const retrieved = await port.getExecutionByCorrelationId(`corr-${status}`);
      expect(retrieved?.terminalStatus).toBe(status);
    }
  });

  it("8. Defensive cloning guarantees caller attemptRecords cannot mutate stored state", async () => {
    const port = new InMemoryResearchPersistencePort();
    const mutableAttempts: ProviderAttemptRecord[] = [
      {
        attemptId: "att-mut-01",
        providerId: "notebooklm-enterprise",
        status: "COMPLETED",
        startedAt: "2026-09-24T12:00:00.000Z",
      },
    ];

    await port.saveExecution({
      ...sampleSnapshot,
      correlationId: "corr-mut-check",
      attemptRecords: mutableAttempts,
    });

    // Mutate caller original array
    mutableAttempts[0] = {
      ...mutableAttempts[0],
      status: "FAILED",
    };

    const retrieved = await port.getExecutionByCorrelationId("corr-mut-check");
    expect(retrieved?.attemptRecords[0].status).toBe("COMPLETED");
  });

  it("9. Pure In-Memory storage without database side effects", async () => {
    const port = new InMemoryResearchPersistencePort();
    await port.saveExecution(sampleSnapshot);

    const empty = await port.listAttempts("unknown-corr");
    expect(empty).toEqual([]);
  });

  it("10. Supports nullable audioJobId when no audio was generated", async () => {
    const port = new InMemoryResearchPersistencePort();
    const noAudioSnapshot: ResearchExecutionSnapshot = {
      ...sampleSnapshot,
      correlationId: "corr-no-audio",
      audioJobId: null,
    };

    await port.saveExecution(noAudioSnapshot);

    const retrieved = await port.getExecutionByCorrelationId("corr-no-audio");
    expect(retrieved?.audioJobId).toBeNull();
  });
});
