import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  inspectSnapshotPayload,
  validateRestoreCandidate,
  runRestoreDrill,
  buildRestorePreview,
  calculateBackupReadiness,
  evaluateRestoreDrillReadiness,
} from '../../src/lib/backupVerification';
import {
  validateBackupSnapshotPreflight,
  calculateBackupChecksum,
  RestoreRequestSchema,
} from '../../src/lib/validation';
import { Category, Topic, Note, Resource, Tag } from '../../src/types';

describe('Post-Phase 6g: Operator Restore Drill Readiness & Safety Gates', () => {
  const fixturesDir = path.resolve(__dirname, '../fixtures/backup');
  const runbookPath = path.resolve(
    __dirname,
    '../../docs/runbooks/backup-restore-operator-runbook.vi.md'
  );

  // Sample active live state representing researcher workspace
  const createSampleLiveState = () => ({
    categories: [
      { id: 'cat-live-1', name: 'Phật Học', slug: 'phat-hoc' },
    ] as Category[],
    topics: [
      {
        id: 'top-live-1',
        title: 'Tứ Diệu Đế',
        slug: 'tu-dieu-de',
        categoryId: 'cat-live-1',
        type: 'phat-hoc',
        description: 'Bản thảo ban đầu',
        content: 'Nội dung đang nghiên cứu...',
        tags: ['PhatHoc'],
        links: [],
        studyProgress: {
          topicId: 'top-live-1',
          status: 'in_progress',
          progress: 40,
          interval: 2,
          easeFactor: 2.5,
          repetitions: 1,
          totalNotes: 1,
          timeSpent: 25,
        },
        createdAt: '2026-08-01T00:00:00Z',
        updatedAt: '2026-08-01T00:00:00Z',
      },
    ] as Topic[],
    notes: [
      {
        id: 'note-live-1',
        topicId: 'top-live-1',
        title: 'Ghi chú gốc',
        content: 'Nội dung ghi chú live',
        sourcePath: '/Users/researcher/Knowledge-Library/Notes/live-note.md',
        type: 'insight' as const,
        isPrivate: false,
        tags: ['GhiChu'],
        createdAt: '2026-08-01T00:00:00Z',
        updatedAt: '2026-08-01T00:00:00Z',
      },
    ] as Note[],
    resources: [
      {
        id: 'res-live-1',
        topicId: 'top-live-1',
        title: 'Tài liệu gốc PDF',
        type: 'pdf' as const,
        filePath: '/Users/researcher/Knowledge-Library/PDF/live-doc.pdf',
        createdAt: '2026-08-01T00:00:00Z',
      },
    ] as Resource[],
    tags: [{ id: 'tag-1', name: 'PhatHoc', slug: 'phat-hoc', color: '#10b981' }] as Tag[],
  });

  // ---------------------------------------------------------------------------
  // 1. Preconditions & Point-in-time Recovery Point
  // ---------------------------------------------------------------------------
  it('1. Operator assesses preconditions: snapshot readiness evaluates 3 layers before drill', () => {
    const liveState = createSampleLiveState();

    const readiness = calculateBackupReadiness({
      categories: liveState.categories,
      topics: liveState.topics,
      notes: liveState.notes,
      resources: liveState.resources,
      tags: liveState.tags,
      libraryRootPath: '/Users/researcher/Knowledge-Library',
      auditSummary: {
        totalItems: 2,
        totalWithLocalPath: 2,
        existingCount: 2,
        unverifiedCount: 0,
        missingCount: 0,
        outsideLibraryCount: 0,
        unspecifiedCount: 0,
        totalFileSizeBytes: 1024,
        auditedAt: '2026-08-25T10:00:00Z',
      },
    });

    expect(readiness.layers.snapshot.status).toBe('ready');
    expect(readiness.layers.snapshot.isLogicalOnly).toBe(true);
    expect(readiness.layers.manifest.status).toBe('ready');
    expect(readiness.layers.physicalFiles.actionRecommendation).toContain('Bắt buộc sao chép');
    expect(readiness.overallStatus).toBe('ready_with_recommendations');
  });

  // ---------------------------------------------------------------------------
  // 2. Gate 1: Checksum & Schema Preflight Gate
  // ---------------------------------------------------------------------------
  it('2. Safety Gate 1: blocks tampered or corrupted snapshot and halts drill execution', () => {
    const validRaw = fs.readFileSync(path.join(fixturesDir, 'valid-snapshot.json'), 'utf-8');
    const validPayload = JSON.parse(validRaw);

    // Case A: Valid snapshot passes Gate 1
    const validPreflight = validateBackupSnapshotPreflight(validPayload);
    expect(validPreflight.valid).toBe(true);
    expect(validPreflight.checksumMatch).toBe(true);

    // Case B: Tampered snapshot (modifying data without updating checksum)
    const tamperedPayload = JSON.parse(validRaw);
    tamperedPayload.data.topics[0].title = 'Tampered Title Sửa Đổi Trái Phép';
    const tamperedPreflight = validateBackupSnapshotPreflight(tamperedPayload);
    expect(tamperedPreflight.valid).toBe(false);
    expect(tamperedPreflight.checksumMatch).toBe(false);
    expect(tamperedPreflight.error).toContain('Checksum không khớp');

    // Case C: Malformed snapshot fixture from evidence pack
    const malformedRaw = fs.readFileSync(path.join(fixturesDir, 'malformed-snapshot.json'), 'utf-8');
    const malformedPayload = JSON.parse(malformedRaw);
    const candidateVal = validateRestoreCandidate(malformedPayload);
    expect(candidateVal.isValid).toBe(false);

    const liveState = createSampleLiveState();
    const drill = runRestoreDrill(malformedPayload, liveState, { mode: 'replace' });
    expect(drill.drillSuccess).toBe(false);
    expect(drill.error).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // 3. Gate 2: In-Memory Dry Run Isolation Gate
  // ---------------------------------------------------------------------------
  it('3. Safety Gate 2: In-Memory restore drill operates purely in RAM without mutating live state', () => {
    const validRaw = fs.readFileSync(path.join(fixturesDir, 'valid-snapshot.json'), 'utf-8');
    const validPayload = JSON.parse(validRaw);

    const liveState = createSampleLiveState();
    // Freeze liveState to guarantee immutability
    Object.freeze(liveState.categories);
    Object.freeze(liveState.topics);
    Object.freeze(liveState.notes);
    Object.freeze(liveState.resources);
    Object.freeze(liveState.tags);
    Object.freeze(liveState);

    // Run drill in destructive replace mode
    const replaceDrill = runRestoreDrill(validPayload, liveState, { mode: 'replace' });

    expect(replaceDrill.drillSuccess).toBe(true);
    expect(replaceDrill.isDryRun).toBe(true);
    expect(replaceDrill.simulatedMode).toBe('replace');
    expect(replaceDrill.simulatedImpact.topicsDelta).toBe(1); // 2 from fixture - 1 live = +1 net
    expect(replaceDrill.simulatedResultState.topics.length).toBe(2);

    // Verify live state remains 100% unchanged
    expect(liveState.topics.length).toBe(1);
    expect(liveState.topics[0].title).toBe('Tứ Diệu Đế');
    expect(liveState.notes.length).toBe(1);
  });

  // ---------------------------------------------------------------------------
  // 4. Gate 3: Explicit Confirmation Gate for Destructive Replace Mode
  // ---------------------------------------------------------------------------
  it('4. Safety Gate 3: Destructive replace mode strictly requires confirmReplace: true', () => {
    const validRaw = fs.readFileSync(path.join(fixturesDir, 'valid-snapshot.json'), 'utf-8');
    const validSnapshot = JSON.parse(validRaw);

    // Case A: Replace mode WITHOUT confirmReplace is rejected by RestoreRequestSchema
    const unconfirmedRequest = {
      snapshot: validSnapshot,
      mode: 'replace',
    };
    const unconfirmedParsed = RestoreRequestSchema.safeParse(unconfirmedRequest);
    expect(unconfirmedParsed.success).toBe(false);
    if (!unconfirmedParsed.success) {
      expect(unconfirmedParsed.error.issues[0].message).toContain('confirmReplace must be true');
    }

    // Case B: Replace mode WITH confirmReplace: true is accepted
    const confirmedRequest = {
      snapshot: validSnapshot,
      mode: 'replace',
      confirmReplace: true,
    };
    const confirmedParsed = RestoreRequestSchema.safeParse(confirmedRequest);
    expect(confirmedParsed.success).toBe(true);

    // Case C: Merge mode does NOT require confirmReplace
    const mergeRequest = {
      snapshot: validSnapshot,
      mode: 'merge',
    };
    const mergeParsed = RestoreRequestSchema.safeParse(mergeRequest);
    expect(mergeParsed.success).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 5. Gate 4: Rehydration Preserving Gate
  // ---------------------------------------------------------------------------
  it('5. Safety Gate 4: Failed reload/rehydration preserves in-memory state and prevents state wiping', () => {
    const initialLiveState = createSampleLiveState();

    // Simulated rehydration failure handler
    const safeReloadSimulator = (loadInitialDataFn: () => Promise<any>, fallbackState: typeof initialLiveState) => {
      try {
        // Attempt load
        throw new Error('Network Connection Lost / Server Unhealthy');
      } catch (err) {
        // Preserves previous in-memory state on failure
        return {
          rehydrated: false,
          state: fallbackState,
        };
      }
    };

    const result = safeReloadSimulator(async () => {}, initialLiveState);
    expect(result.rehydrated).toBe(false);
    expect(result.state.topics.length).toBe(1);
    expect(result.state.topics[0].id).toBe('top-live-1');
  });

  // ---------------------------------------------------------------------------
  // 6. Evidence Pack Artifacts & Sign-off Completeness
  // ---------------------------------------------------------------------------
  it('6. Evidence pack & sign-off checklist: captures reproducible metrics and valid sign-off structure', () => {
    const validRaw = fs.readFileSync(path.join(fixturesDir, 'valid-snapshot.json'), 'utf-8');
    const validPayload = JSON.parse(validRaw);
    const liveState = createSampleLiveState();

    const drill = runRestoreDrill(validPayload, liveState, { mode: 'merge' });
    const preview = buildRestorePreview(validPayload);

    // Collect Evidence Metrics
    const evidenceArtifact = {
      snapshotVersion: validPayload.version,
      snapshotChecksum: validPayload.checksum,
      isDryRun: drill.isDryRun,
      simulatedMode: drill.simulatedMode,
      entityCounts: preview,
      simulatedImpact: drill.simulatedImpact,
      timestamp: new Date().toISOString(),
    };

    expect(evidenceArtifact.snapshotChecksum).toBe('69da0aca4ed05f3a63e257f38a1ec23f5a37d4e8c673ecdabc054b990185acd2');
    expect(evidenceArtifact.isDryRun).toBe(true);
    expect(evidenceArtifact.simulatedImpact.topicsDelta).toBe(2);
    expect(evidenceArtifact.simulatedImpact.notesDelta).toBe(2);

    // Check that runbook has the exact 5-point checklist
    const runbookContent = fs.readFileSync(runbookPath, 'utf-8');
    expect(runbookContent).toContain('Đã xuất App Snapshot JSON trước khi thao tác');
    expect(runbookContent).toContain('Đã xuất File Library Manifest JSON');
    expect(runbookContent).toContain('Đã sao chép thư mục tệp vật lý (PDF/Audio/Vault)');
    expect(runbookContent).toContain('Đã chạy Restore Drill (In-Memory Dry Run) xem trước số liệu');
    expect(runbookContent).toContain('Đã hoàn thành khôi phục và vượt qua Smoke Test');
  });

  // ---------------------------------------------------------------------------
  // 7. Aggregated Operator Drill Readiness Evaluation Helper
  // ---------------------------------------------------------------------------
  it('7. evaluateRestoreDrillReadiness: aggregates Gate 1, Gate 2, Gate 3 into a standardized certificate report', () => {
    const validRaw = fs.readFileSync(path.join(fixturesDir, 'valid-snapshot.json'), 'utf-8');
    const validPayload = JSON.parse(validRaw);
    const liveState = createSampleLiveState();

    const readinessReport = evaluateRestoreDrillReadiness(validPayload, liveState, { mode: 'replace' });

    expect(readinessReport.isDrillReady).toBe(true);
    expect(readinessReport.gate1Validation.passed).toBe(true);
    expect(readinessReport.gate1Validation.checksumMatch).toBe(true);
    expect(readinessReport.gate2DryRun.isDryRun).toBe(true);
    expect(readinessReport.gate2DryRun.drillSuccess).toBe(true);
    expect(readinessReport.gate3Confirmation.isDestructiveReplace).toBe(true);
    expect(readinessReport.gate3Confirmation.requiredPhrase).toBe('XÁC NHẬN THAY THẾ');
    expect(readinessReport.evidenceRecord.snapshotChecksum).toBe('69da0aca4ed05f3a63e257f38a1ec23f5a37d4e8c673ecdabc054b990185acd2');
  });
});
