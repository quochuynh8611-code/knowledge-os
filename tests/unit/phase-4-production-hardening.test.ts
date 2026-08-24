/**
 * Phase 4 Production Hardening & Operational Readiness Test Suite
 *
 * ADR: docs/adr/ADR-013-phase-4-production-readiness.md
 * Gherkin: docs/gherkin/phase-4-production-hardening.feature (Scenarios 1–8)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BackupSnapshotSchema,
  RestoreRequestSchema,
  DbHealthResponseSchema,
  calculateBackupChecksum,
  validateBackupSnapshotPreflight,
  ValidatedBackupSnapshot,
  MAX_PROMPT_LENGTH,
  MAX_HANDOFF_CONTEXT_LENGTH,
  GeminiResearchInputSchema,
} from '../../src/lib/validation';
import {
  INITIAL_CATEGORIES,
  INITIAL_TOPICS,
  INITIAL_NOTES,
  INITIAL_RESOURCES,
  INITIAL_TAGS,
} from '../../src/data/initialData';
import {
  isRetryableGeminiError,
  generateContentWithResilience,
} from '../../src/lib/resilience';
import {
  createRateLimiter,
  formatStructuredLog,
} from '../../src/lib/security';

describe('Phase 4: Production Readiness, Security Guardrails & Operational Hardening', () => {
  const canonicalData = {
    categories: INITIAL_CATEGORIES,
    topics: INITIAL_TOPICS,
    notes: INITIAL_NOTES,
    resources: INITIAL_RESOURCES,
    tags: INITIAL_TAGS,
  };
  const validChecksum = calculateBackupChecksum(canonicalData);
  const sampleSnapshot: ValidatedBackupSnapshot = {
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    checksum: validChecksum,
    counts: {
      categories: 8,
      topics: 35,
      notes: 5,
      resources: 4,
      tags: 12,
    },
    data: canonicalData,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // 1. SCENARIO 1 & 2: PAYLOAD BOUNDARY & MALFORMED RESTORE REJECTION
  // ===========================================================================
  describe('Workstream A: Security Guardrails & Payload Boundary', () => {
    it('1. Scenario 1: Preflight and Schema reject malformed snapshot missing required collections', () => {
      const malformed = {
        version: '2.0.0',
        exportedAt: new Date().toISOString(),
        checksum: validChecksum,
        counts: { categories: 8, topics: 35, notes: 5, resources: 4, tags: 12 },
        data: {
          categories: INITIAL_CATEGORIES,
          // Missing topics, notes, resources, tags
        },
      };

      const result = validateBackupSnapshotPreflight(malformed);
      expect(result.valid).toBe(false);
      expect(result.snapshot).toBeUndefined();

      const schemaParsed = BackupSnapshotSchema.safeParse(malformed);
      expect(schemaParsed.success).toBe(false);
    });

    it('2. Scenario 2: Restore Request Schema rejects restore payload when mode is replace and confirmReplace is missing or false', () => {
      const invalidReq = {
        snapshot: sampleSnapshot,
        mode: 'replace',
        confirmReplace: false,
      };

      const parsed = RestoreRequestSchema.safeParse(invalidReq);
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues[0].message).toContain('confirmReplace');
      }
    });

    it('3. Rate Limiter blocks excessive requests with status 429 after exceeding limit', () => {
      const limiter = createRateLimiter({
        windowMs: 60 * 1000,
        maxRequests: 3,
      });

      const clientIp = '192.168.1.100';

      // First 3 requests allowed
      expect(limiter.check(clientIp).allowed).toBe(true);
      expect(limiter.check(clientIp).allowed).toBe(true);
      expect(limiter.check(clientIp).allowed).toBe(true);

      // 4th request blocked
      const blocked = limiter.check(clientIp);
      expect(blocked.allowed).toBe(false);
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    });

    it('4. Scenario 1: GeminiResearchInputSchema rejects prompt exceeding MAX_PROMPT_LENGTH and context exceeding MAX_HANDOFF_CONTEXT_LENGTH', () => {
      expect(MAX_PROMPT_LENGTH).toBe(20000);
      expect(MAX_HANDOFF_CONTEXT_LENGTH).toBe(100000);

      // Valid input
      const valid = GeminiResearchInputSchema.safeParse({
        prompt: 'Khảo sát Tứ Thánh Đế',
        topicTitle: 'Tứ Diệu Đế',
        category: 'Phật học',
        contextNotes: 'Ghi chú khảo cứu',
        mode: 'scholar_analysis',
      });
      expect(valid.success).toBe(true);

      // Oversized prompt rejected
      const oversizedPrompt = 'A'.repeat(MAX_PROMPT_LENGTH + 1);
      const invalidPrompt = GeminiResearchInputSchema.safeParse({
        prompt: oversizedPrompt,
      });
      expect(invalidPrompt.success).toBe(false);

      // Oversized context rejected
      const oversizedContext = 'B'.repeat(MAX_HANDOFF_CONTEXT_LENGTH + 1);
      const invalidContext = GeminiResearchInputSchema.safeParse({
        prompt: 'Khảo sát hợp lệ',
        contextNotes: oversizedContext,
      });
      expect(invalidContext.success).toBe(false);
    });
  });

  // ===========================================================================
  // 2. SCENARIO 3 & 4: HEALTH PROBE & DATABASE LATENCY POLICY
  // ===========================================================================
  describe('Workstream B: Health & Observability Latency Policy', () => {
    it('4. Scenario 4: Phân loại đúng 3 trạng thái độ trễ: healthy (<100ms), degraded (100-1000ms), unhealthy (>=1000ms)', () => {
      const evaluateStatus = (latencyMs: number, isConnected = true) => {
        if (!isConnected) return 'unhealthy';
        if (latencyMs < 100) return 'healthy';
        if (latencyMs < 1000) return 'degraded';
        return 'unhealthy';
      };

      expect(evaluateStatus(15)).toBe('healthy');
      expect(evaluateStatus(99)).toBe('healthy');
      expect(evaluateStatus(100)).toBe('degraded');
      expect(evaluateStatus(500)).toBe('degraded');
      expect(evaluateStatus(999)).toBe('degraded');
      expect(evaluateStatus(1000)).toBe('unhealthy');
      expect(evaluateStatus(2500)).toBe('unhealthy');
    });

    it('5. Scenario 3: Database offline sets connected = false, status = unhealthy, while preserving latencyMs & timestamp', () => {
      const offlinePayload = {
        status: 'unhealthy' as const,
        latencyMs: 0,
        database: 'postgresql' as const,
        connected: false,
        timestamp: new Date().toISOString(),
      };

      const parsed = DbHealthResponseSchema.safeParse(offlinePayload);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.connected).toBe(false);
        expect(parsed.data.status).toBe('unhealthy');
        expect(parsed.data.latencyMs).toBe(0);
      }
    });

    it('6. Structured Logger creates JSON-formatted logs without leaking API keys or secrets', () => {
      const logOutput = formatStructuredLog('warn', 'DATABASE_DISCONNECTED', {
        databaseUrl: 'postgresql://user:secretpass@localhost:5432/db',
        geminiApiKey: 'AIzaSySecretApiKey12345',
        latencyMs: 1500,
      });

      const parsed = JSON.parse(logOutput);
      expect(parsed.level).toBe('warn');
      expect(parsed.event).toBe('DATABASE_DISCONNECTED');
      expect(parsed.metadata.latencyMs).toBe(1500);

      // Secret masking verification
      expect(logOutput).not.toContain('secretpass');
      expect(logOutput).not.toContain('AIzaSySecretApiKey12345');
    });
  });

  // ===========================================================================
  // 3. SCENARIO 5 & 6: BACKUP & RESTORE INTEGRITY
  // ===========================================================================
  describe('Workstream C: Backup & Restore Integrity Gates', () => {
    it('7. Scenario 5: Canonical snapshot is valid against Semver 2.x and 64-char SHA-256 checksum', () => {
      const parsed = BackupSnapshotSchema.safeParse(sampleSnapshot);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.version).toBe('2.0.0');
        expect(parsed.data.checksum).toMatch(/^[a-f0-9]{64}$/);
        expect(parsed.data.counts.topics).toBe(35);
      }
    });

    it('8. Scenario 6: Tampered snapshot with modified title triggers CHECKSUM_MISMATCH and blocks restore', () => {
      const tamperedData = {
        ...canonicalData,
        topics: [
          {
            ...canonicalData.topics[0],
            title: 'Tiêu đề đã bị hacker can thiệp',
          },
          ...canonicalData.topics.slice(1),
        ],
      };

      const tamperedSnapshot = {
        ...sampleSnapshot,
        data: tamperedData,
        // Using old checksum to simulate tampering
        checksum: validChecksum,
      };

      const preflight = validateBackupSnapshotPreflight(tamperedSnapshot);
      expect(preflight.valid).toBe(false);
      expect(preflight.checksumMatch).toBe(false);
      expect(preflight.error).toContain('Checksum không khớp');
    });
  });

  // ===========================================================================
  // 4. SCENARIO 7 & 8: GEMINI RESILIENCE & ERROR BOUNDARY
  // ===========================================================================
  describe('Workstream D: Gemini AI Resilience & Error Classification', () => {
    it('9. isRetryableGeminiError classifies 503, 429, UNAVAILABLE, and quota exhaustion as retryable', () => {
      expect(isRetryableGeminiError({ status: 503 })).toBe(true);
      expect(isRetryableGeminiError({ status: 429 })).toBe(true);
      expect(isRetryableGeminiError({ error: { code: 503 } })).toBe(true);
      expect(isRetryableGeminiError({ message: 'Model is currently overloaded' })).toBe(true);
      expect(isRetryableGeminiError({ message: 'Resource has been exhausted' })).toBe(true);
      expect(isRetryableGeminiError({ message: 'High demand on service' })).toBe(true);
    });

    it('10. Scenario 8: isRetryableGeminiError classifies 400, 401, 403, 404, INVALID_ARGUMENT as non-retryable', () => {
      expect(isRetryableGeminiError({ status: 400, message: 'Invalid prompt arguments' })).toBe(false);
      expect(isRetryableGeminiError({ status: 401, message: 'API key not valid' })).toBe(false);
      expect(isRetryableGeminiError({ status: 403, message: 'Permission denied' })).toBe(false);
      expect(isRetryableGeminiError({ status: 404, message: 'Model not found' })).toBe(false);
      expect(isRetryableGeminiError({ code: 'INVALID_ARGUMENT', message: 'Bad request syntax' })).toBe(false);
    });

    it('11. Scenario 8: generateContentWithResilience stops immediately on non-retryable error without retrying or switching models', async () => {
      const mockGenerateContent = vi.fn().mockRejectedValue({
        status: 400,
        message: 'Invalid argument provided in prompt',
      });

      const mockAi = {
        models: {
          generateContent: mockGenerateContent,
        },
      } as any;

      await expect(
        generateContentWithResilience(mockAi, {
          contents: 'Test prompt',
          primaryModel: 'gemini-3.6-flash',
        })
      ).rejects.toMatchObject({
        status: 400,
        message: 'Invalid argument provided in prompt',
      });

      // Crucial: Only called exactly once! No retry, no fallback model attempts
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it('12. Scenario 7: generateContentWithResilience retries boundedly on 503/429 and succeeds on fallback model', async () => {
      const mockGenerateContent = vi
        .fn()
        // Model 1 Attempt 1 -> 503
        .mockRejectedValueOnce({ status: 503, message: 'High demand' })
        // Model 1 Attempt 2 -> 503
        .mockRejectedValueOnce({ status: 503, message: 'Overloaded' })
        // Model 2 Attempt 1 -> Success!
        .mockResolvedValueOnce({ text: 'Phân tích Vi Diệu Pháp thành công từ Model 2' });

      const mockAi = {
        models: {
          generateContent: mockGenerateContent,
        },
      } as any;

      const result = await generateContentWithResilience(mockAi, {
        contents: 'Khảo luận Vi Diệu Pháp',
        primaryModel: 'gemini-3.6-flash',
      });

      expect(result.text).toBe('Phân tích Vi Diệu Pháp thành công từ Model 2');
      expect(result.modelUsed).toBe('gemini-3.7-flash');
      expect(mockGenerateContent).toHaveBeenCalledTimes(3);
    });
  });
});
