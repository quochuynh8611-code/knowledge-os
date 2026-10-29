import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../src/lib/prisma';
import { createFlashcard } from '../../src/server/services/flashcardService';
import { createArtifactRouter } from '../../src/server/routes/artifactRoutes';
import express from 'express';
import request from 'supertest';
import { formatStructuredLog } from '../../src/lib/security';

describe('Phase 22: Observability & Structured Logging', () => {
  let consoleLogSpy: any;
  let consoleWarnSpy: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('Scenario 1: Given hai request tạo flashcard cùng idempotencyKey, When request thứ hai gặp P2002, Then hệ thống ghi structured log FLASHCARD_P2002_RECOVERED không lộ secret', async () => {
    const existingCard = {
      id: 'card-1',
      topicId: 'topic-1',
      front: 'Front content',
      back: 'Back content',
      idempotencyKey: 'mindmap-node-123',
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active',
      schedule: {
        id: 'sched-1',
        flashcardId: 'card-1',
        easeFactor: 2.5,
        interval: 1,
        repetitions: 0,
        lapses: 0,
        stability: 1.0,
        difficulty: 5.0,
        state: 'learning',
        lastReview: null,
        nextReview: new Date(),
      },
    };

    // First findUnique returns null (not found yet in preliminary check)
    let findUniqueCalls = 0;
    (vi.spyOn(prisma.flashcard, 'findUnique') as any).mockImplementation(async () => {
      findUniqueCalls++;
      if (findUniqueCalls === 1) return null;
      return existingCard;
    });

    // Transaction throws Prisma P2002 unique constraint violation
    vi.spyOn(prisma, '$transaction').mockRejectedValueOnce({
      code: 'P2002',
      message: 'Unique constraint failed on the fields: (`idempotencyKey`)',
    });

    const result = await createFlashcard({
      topicId: 'topic-1',
      type: 'basic',
      front: 'Front content',
      back: 'Back content',
      idempotencyKey: 'mindmap-node-123',
    });

    expect(result.id).toBe('card-1');

    // Verify structured log event was emitted
    const loggedCalls = consoleLogSpy.mock.calls.map((c: any) => c[0]);
    const p2002LogString = loggedCalls.find((callStr: string) => {
      try {
        const parsed = JSON.parse(callStr);
        return parsed.event === 'FLASHCARD_P2002_RECOVERED';
      } catch {
        return false;
      }
    });

    expect(p2002LogString).toBeDefined();
    const parsedLog = JSON.parse(p2002LogString);
    expect(parsedLog.event).toBe('FLASHCARD_P2002_RECOVERED');
    expect(parsedLog.metadata.idempotencyKey).toBe('mindmap-node-123');
    expect(p2002LogString).not.toContain('DATABASE_URL');
    expect(p2002LogString).not.toContain('password');
  });

  it('Scenario 2: Given artifact đã tồn tại với cùng idempotencyKey, When POST /api/artifacts/ingest trả isDuplicate=true, Then hệ thống ghi structured log ARTIFACT_INGEST_DUPLICATE', async () => {
    const app = express();
    app.use(express.json());

    // Mock prisma groundedArtifact
    const mockArtifact = {
      id: 'art-existing-1',
      topicId: 'topic-1',
      artifactType: 'mindmap_outline',
      title: 'Mindmap Outline',
      rawContent: '# Outline',
      idempotencyKey: 'pkg-1:prompt-1:mindmap_outline:hash123',
      createdAt: new Date(),
      updatedAt: new Date(),
      citations: [],
      imports: [],
    };

    const mockPrisma = {
      groundedArtifact: {
        findUnique: vi.fn().mockResolvedValue(mockArtifact),
      },
    } as any;

    app.use('/api', createArtifactRouter(mockPrisma));

    const res = await request(app)
      .post('/api/artifacts/ingest')
      .send({
        topicId: 'topic-1',
        artifactType: 'mindmap_outline',
        title: 'Mindmap Outline',
        rawContent: '# Outline',
        contentHash: 'hash123',
        idempotencyKey: 'pkg-1:prompt-1:mindmap_outline:hash123',
      });

    expect(res.status).toBe(200);
    expect(res.body.isDuplicate).toBe(true);

    const loggedCalls = consoleLogSpy.mock.calls.map((c: any) => c[0]);
    const duplicateLogString = loggedCalls.find((callStr: string) => {
      try {
        const parsed = JSON.parse(callStr);
        return parsed.event === 'ARTIFACT_INGEST_DUPLICATE';
      } catch {
        return false;
      }
    });

    expect(duplicateLogString).toBeDefined();
    const parsedLog = JSON.parse(duplicateLogString);
    expect(parsedLog.event).toBe('ARTIFACT_INGEST_DUPLICATE');
    expect(parsedLog.metadata.artifactId).toBe('art-existing-1');
    expect(parsedLog.metadata.idempotencyKey).toBe('pkg-1:prompt-1:mindmap_outline:hash123');
  });

  it('Scenario 3: Given backend ingest thất bại hoặc không phản hồi, When kích hoạt fallback, Then hệ thống ghi structured log ARTIFACT_INGEST_FALLBACK không chứa rawContent', () => {
    const formatted = formatStructuredLog('warn', 'ARTIFACT_INGEST_FALLBACK', {
      reason: 'Network timeout',
      artifactType: 'mindmap_outline',
      idempotencyKey: 'pkg-1:prompt-1:mindmap_outline:hash123',
      rawContent: 'SUPER_SECRET_RAW_CONTENT_THAT_MUST_BE_REDACTED',
    });

    const parsed = JSON.parse(formatted);
    expect(parsed.event).toBe('ARTIFACT_INGEST_FALLBACK');
    expect(parsed.metadata.artifactType).toBe('mindmap_outline');
    expect(parsed.metadata.reason).toBe('Network timeout');
    expect(parsed.metadata.idempotencyKey).toBe('pkg-1:prompt-1:mindmap_outline:hash123');
    // rawContent must be redacted
    expect(formatted).not.toContain('SUPER_SECRET_RAW_CONTENT_THAT_MUST_BE_REDACTED');
  });
});
