import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  ApiDataRepository,
  LocalStorageDataRepository,
} from '../../src/services/dataRepository';
import {
  BackupSnapshotSchema,
  RestoreResponseSchema,
  DbHealthResponseSchema,
  calculateBackupChecksum,
  ValidatedBackupSnapshot,
  ValidatedRestoreRequest,
} from '../../src/lib/validation';
import {
  INITIAL_CATEGORIES,
  INITIAL_TOPICS,
  INITIAL_NOTES,
  INITIAL_RESOURCES,
  INITIAL_TAGS,
} from '../../src/data/initialData';

describe('Phase 2C.1: Repository Layer Backup, Restore & Health Contracts (Option A)', () => {
  const TEST_STORAGE_KEY = 'test_phase2c_persistence';
  const sampleCanonicalData = {
    categories: INITIAL_CATEGORIES,
    topics: INITIAL_TOPICS,
    notes: INITIAL_NOTES,
    resources: INITIAL_RESOURCES,
    tags: INITIAL_TAGS,
  };
  const validChecksum = calculateBackupChecksum(sampleCanonicalData);
  const sampleSnapshot: ValidatedBackupSnapshot = {
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    checksum: validChecksum,
    counts: {
      categories: INITIAL_CATEGORIES.length,
      topics: INITIAL_TOPICS.length,
      notes: INITIAL_NOTES.length,
      resources: INITIAL_RESOURCES.length,
      tags: INITIAL_TAGS.length,
    },
    data: sampleCanonicalData,
  };

  const sampleRestoreRequest: ValidatedRestoreRequest = {
    snapshot: sampleSnapshot,
    mode: 'replace',
    confirmReplace: true,
  };

  const sampleRestoreResponse = {
    success: true,
    mode: 'replace' as const,
    restoredAt: new Date().toISOString(),
    restoredCounts: sampleSnapshot.counts,
  };

  const sampleHealthResponse = {
    status: 'healthy' as const,
    latencyMs: 12,
    database: 'postgresql' as const,
    connected: true,
    timestamp: new Date().toISOString(),
  };

  const UNSUPPORTED_ERR_MSG =
    'UNSUPPORTED_OFFLINE_OPERATION: Disaster recovery and database health checks require an active server connection.';

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. ApiDataRepository Server-Authoritative Methods', () => {
    it('1. exportBackupSnapshot gọi GET /api/backup/export và parse kết quả hợp lệ theo BackupSnapshotSchema', async () => {
      // Given
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => sampleSnapshot,
      } as Response);

      const repo = new ApiDataRepository('/api');

      // When
      const result = await repo.exportBackupSnapshot();

      // Then
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/backup/export')
      );
      expect(BackupSnapshotSchema.safeParse(result).success).toBe(true);
      expect(result.counts.topics).toBe(INITIAL_TOPICS.length);
      expect(result.checksum).toBe(validChecksum);
    });

    it('2. restoreBackupSnapshot gọi POST /api/backup/restore với payload hợp lệ và trả về RestoreResponseSchema', async () => {
      // Given
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => sampleRestoreResponse,
      } as Response);

      const repo = new ApiDataRepository('/api');

      // When
      const result = await repo.restoreBackupSnapshot(sampleRestoreRequest);

      // Then
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/backup/restore'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.any(String),
        })
      );
      const sentBody = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      expect(sentBody.mode).toBe('replace');
      expect(sentBody.confirmReplace).toBe(true);
      expect(sentBody.snapshot.version).toBe('2.0.0');
      expect(sentBody.snapshot.counts.topics).toBe(INITIAL_TOPICS.length);

      expect(RestoreResponseSchema.safeParse(result).success).toBe(true);
      expect(result.success).toBe(true);
      expect(result.mode).toBe('replace');
    });

    it('3. getDbHealth gọi GET /api/health/db và parse kết quả hợp lệ theo DbHealthResponseSchema', async () => {
      // Given
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => sampleHealthResponse,
      } as Response);

      const repo = new ApiDataRepository('/api');

      // When
      const result = await repo.getDbHealth();

      // Then
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/health/db')
      );
      expect(DbHealthResponseSchema.safeParse(result).success).toBe(true);
      expect(result.status).toBe('healthy');
      expect(result.connected).toBe(true);
    });

    it('4. ApiDataRepository ném lỗi có message ổn định khi server trả về HTTP non-2xx', async () => {
      // Given
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'CHECKSUM_MISMATCH',
          message: 'Checksum verification failed',
        }),
      } as Response);

      const repo = new ApiDataRepository('/api');

      // When & Then
      await expect(repo.restoreBackupSnapshot(sampleRestoreRequest)).rejects.toThrow(
        /CHECKSUM_MISMATCH|Checksum verification failed/
      );
    });
  });

  describe('2. LocalStorageDataRepository Option A Unsupported Behavior', () => {
    it('5. exportBackupSnapshot trên LocalStorageDataRepository reject với lỗi UNSUPPORTED_OFFLINE_OPERATION', async () => {
      // Given
      const repo = new LocalStorageDataRepository(TEST_STORAGE_KEY);

      // When & Then
      await expect(repo.exportBackupSnapshot()).rejects.toThrow(UNSUPPORTED_ERR_MSG);
    });

    it('6. restoreBackupSnapshot trên LocalStorageDataRepository reject với lỗi UNSUPPORTED_OFFLINE_OPERATION', async () => {
      // Given
      const repo = new LocalStorageDataRepository(TEST_STORAGE_KEY);

      // When & Then
      await expect(
        repo.restoreBackupSnapshot(sampleRestoreRequest)
      ).rejects.toThrow(UNSUPPORTED_ERR_MSG);
    });

    it('7. getDbHealth trên LocalStorageDataRepository reject với lỗi UNSUPPORTED_OFFLINE_OPERATION', async () => {
      // Given
      const repo = new LocalStorageDataRepository(TEST_STORAGE_KEY);

      // When & Then
      await expect(repo.getDbHealth()).rejects.toThrow(UNSUPPORTED_ERR_MSG);
    });

    it('8. Thao tác disaster recovery thất bại trên LocalStorageDataRepository không làm thay đổi các khóa localStorage', async () => {
      // Given
      const repo = new LocalStorageDataRepository(TEST_STORAGE_KEY);
      localStorage.setItem('keep_unmodified', 'active_data');

      // When
      try {
        await repo.restoreBackupSnapshot(sampleRestoreRequest);
      } catch {
        // Expected reject
      }

      // Then
      expect(localStorage.getItem('keep_unmodified')).toBe('active_data');
      expect(localStorage.getItem(`${TEST_STORAGE_KEY}_topics`)).toBeNull();
    });
  });
});
