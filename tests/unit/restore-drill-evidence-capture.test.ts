import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  evaluateRestoreDrillReadiness,
  captureRestoreDrillEvidence,
  RestoreDrillEvidenceRecord,
  OperatorDrillReadinessReport,
} from '../../src/lib/backupVerification';
import { Category, Topic, Note, Resource, Tag } from '../../src/types';

describe('Post-Phase 6h: Restore Drill Evidence Capture Contract Tests', () => {
  const fixturesDir = path.resolve(__dirname, '../fixtures/backup');

  const createSampleLiveState = () => ({
    categories: [{ id: 'cat-live-1', name: 'Phật Học', slug: 'phat-hoc' }] as Category[],
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
  // 1. Valid Readiness Report creates Valid Evidence Record
  // ---------------------------------------------------------------------------
  it('1. Valid readiness report creates a complete, compliant RestoreDrillEvidenceRecord', () => {
    const validRaw = fs.readFileSync(path.join(fixturesDir, 'valid-snapshot.json'), 'utf-8');
    const validPayload = JSON.parse(validRaw);
    const liveState = createSampleLiveState();

    const readinessReport = evaluateRestoreDrillReadiness(validPayload, liveState, { mode: 'replace' });
    const evidence = captureRestoreDrillEvidence(readinessReport, {
      operatorSignOffStatus: 'signed_off',
      operatorNotes: 'Đã hoàn thành diễn tập khôi phục thay thế thành công',
    });

    expect(evidence).toBeDefined();
    expect(evidence.evidenceId).toMatch(/^drill-ev-/);
    expect(evidence.snapshotChecksum).toBe('69da0aca4ed05f3a63e257f38a1ec23f5a37d4e8c673ecdabc054b990185acd2');
    expect(evidence.snapshotFormat).toBe('snapshot_v2');
    expect(evidence.validationStatus).toBe('valid');
    expect(evidence.dryRunStatus).toBe('simulated_success');
    expect(evidence.simulatedMode).toBe('replace');
    expect(evidence.operatorSignOffStatus).toBe('signed_off');
    expect(evidence.operatorNotes).toBe('Đã hoàn thành diễn tập khôi phục thay thế thành công');
  });

  // ---------------------------------------------------------------------------
  // 2. Preserves Checksum and Simulated Impact
  // ---------------------------------------------------------------------------
  it('2. Evidence record strictly preserves snapshot checksum and simulated entity impact', () => {
    const validRaw = fs.readFileSync(path.join(fixturesDir, 'valid-snapshot.json'), 'utf-8');
    const validPayload = JSON.parse(validRaw);
    const liveState = createSampleLiveState();

    const readinessReport = evaluateRestoreDrillReadiness(validPayload, liveState, { mode: 'merge' });
    const evidence = captureRestoreDrillEvidence(readinessReport);

    expect(evidence.snapshotChecksum).toBe(validPayload.checksum);
    expect(evidence.simulatedImpact).toEqual(readinessReport.gate2DryRun.simulatedImpact);
    expect(evidence.simulatedImpact.topicsDelta).toBe(2);
    expect(evidence.simulatedImpact.notesDelta).toBe(2);
  });

  // ---------------------------------------------------------------------------
  // 3. Reflects Correct Mode and Safety Gates Status
  // ---------------------------------------------------------------------------
  it('3. Evidence accurately reflects merge vs replace mode and Gate 1, Gate 2, Gate 3 statuses', () => {
    const validRaw = fs.readFileSync(path.join(fixturesDir, 'valid-snapshot.json'), 'utf-8');
    const validPayload = JSON.parse(validRaw);
    const liveState = createSampleLiveState();

    // Mode A: Replace requires Gate 3 confirmation
    const replaceReport = evaluateRestoreDrillReadiness(validPayload, liveState, { mode: 'replace' });
    const replaceEvidence = captureRestoreDrillEvidence(replaceReport);

    expect(replaceEvidence.simulatedMode).toBe('replace');
    expect(replaceEvidence.gateSummary.gate1Passed).toBe(true);
    expect(replaceEvidence.gateSummary.gate2Passed).toBe(true);
    expect(replaceEvidence.gateSummary.gate3Required).toBe(true);
    expect(replaceEvidence.gateSummary.overallDrillReady).toBe(true);

    // Mode B: Merge does not require Gate 3 confirmation
    const mergeReport = evaluateRestoreDrillReadiness(validPayload, liveState, { mode: 'merge' });
    const mergeEvidence = captureRestoreDrillEvidence(mergeReport);

    expect(mergeEvidence.simulatedMode).toBe('merge');
    expect(mergeEvidence.gateSummary.gate3Required).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // 4. ISO 8601 Timestamp Validation
  // ---------------------------------------------------------------------------
  it('4. Evidence record timestamp is a valid ISO 8601 string', () => {
    const validRaw = fs.readFileSync(path.join(fixturesDir, 'valid-snapshot.json'), 'utf-8');
    const validPayload = JSON.parse(validRaw);
    const liveState = createSampleLiveState();

    const readinessReport = evaluateRestoreDrillReadiness(validPayload, liveState);
    const evidence = captureRestoreDrillEvidence(readinessReport);

    expect(evidence.timestamp).toBeDefined();
    expect(new Date(evidence.timestamp).toISOString()).toBe(evidence.timestamp);
  });

  // ---------------------------------------------------------------------------
  // 5. Immutability: Input Readiness Report and Live State are not mutated
  // ---------------------------------------------------------------------------
  it('5. Capture evidence maintains absolute immutability of readiness report and live state', () => {
    const validRaw = fs.readFileSync(path.join(fixturesDir, 'valid-snapshot.json'), 'utf-8');
    const validPayload = JSON.parse(validRaw);
    const liveState = createSampleLiveState();

    const readinessReport = evaluateRestoreDrillReadiness(validPayload, liveState, { mode: 'replace' });

    // Freeze inputs
    Object.freeze(liveState.topics);
    Object.freeze(liveState);
    Object.freeze(readinessReport.gate2DryRun.simulatedImpact);
    Object.freeze(readinessReport);

    const evidence = captureRestoreDrillEvidence(readinessReport);

    expect(evidence).toBeDefined();
    expect(liveState.topics.length).toBe(1);
    expect(readinessReport.isDrillReady).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 6. Safe representation of Invalid Readiness Reports
  // ---------------------------------------------------------------------------
  it('6. Invalid readiness report is captured safely without crash and without triggering live restore', () => {
    const malformedRaw = fs.readFileSync(path.join(fixturesDir, 'malformed-snapshot.json'), 'utf-8');
    const malformedPayload = JSON.parse(malformedRaw);
    const liveState = createSampleLiveState();

    const failedReport = evaluateRestoreDrillReadiness(malformedPayload, liveState);
    expect(failedReport.isDrillReady).toBe(false);

    const evidence = captureRestoreDrillEvidence(failedReport);

    expect(evidence.validationStatus).toBe('invalid');
    expect(evidence.dryRunStatus).toBe('simulated_failed');
    expect(evidence.gateSummary.gate1Passed).toBe(false);
    expect(evidence.gateSummary.overallDrillReady).toBe(false);
    expect(evidence.operatorSignOffStatus).toBe('pending');
  });

  // ---------------------------------------------------------------------------
  // 7. Isolation & Zero Binary / Zero DB Dependency Check
  // ---------------------------------------------------------------------------
  it('7. Evidence capture code is completely pure with zero DB / API dependencies', () => {
    const srcFilePath = path.resolve(__dirname, '../../src/lib/backupVerification.ts');
    const srcContent = fs.readFileSync(srcFilePath, 'utf-8');

    expect(srcContent).not.toContain('prisma');
    expect(srcContent).not.toContain('@prisma/client');
    expect(srcContent).not.toContain('localStorage.setItem');
    expect(srcContent).not.toContain('fetch(');
  });

  // ---------------------------------------------------------------------------
  // 8. Timestamp Priority Order Policy
  // ---------------------------------------------------------------------------
  it('8. Timestamp priority order: options.timestamp > report timestamp > fallback new Date()', () => {
    const validRaw = fs.readFileSync(path.join(fixturesDir, 'valid-snapshot.json'), 'utf-8');
    const validPayload = JSON.parse(validRaw);
    const liveState = createSampleLiveState();

    const readinessReport = evaluateRestoreDrillReadiness(validPayload, liveState);
    const customTimestamp = '2026-08-25T12:00:00.000Z';

    // Case A: options.timestamp takes highest priority
    const evWithOverride = captureRestoreDrillEvidence(readinessReport, {
      timestamp: customTimestamp,
    });
    expect(evWithOverride.timestamp).toBe(customTimestamp);

    // Case B: Falls back to report timestamp when options.timestamp is omitted
    const evWithReportTimestamp = captureRestoreDrillEvidence(readinessReport);
    expect(evWithReportTimestamp.timestamp).toBe(readinessReport.evidenceRecord.timestamp);

    // Case C: Falls back to generated ISO timestamp when report timestamp is missing
    const reportWithoutTimestamp: OperatorDrillReadinessReport = {
      ...readinessReport,
      evidenceRecord: {
        ...readinessReport.evidenceRecord,
        timestamp: undefined as any,
      },
    };
    const evWithFallback = captureRestoreDrillEvidence(reportWithoutTimestamp);
    expect(evWithFallback.timestamp).toBeDefined();
    expect(new Date(evWithFallback.timestamp).toISOString()).toBe(evWithFallback.timestamp);
  });

  // ---------------------------------------------------------------------------
  // 9. Evidence ID Policy: Deterministic Override vs Runtime Generator
  // ---------------------------------------------------------------------------
  it('9. EvidenceId policy: caller can provide deterministic ID, or runtime generates unique drill-ev-*', () => {
    const validRaw = fs.readFileSync(path.join(fixturesDir, 'valid-snapshot.json'), 'utf-8');
    const validPayload = JSON.parse(validRaw);
    const liveState = createSampleLiveState();

    const readinessReport = evaluateRestoreDrillReadiness(validPayload, liveState);

    // Case A: Deterministic ID provided by caller
    const customId = 'AUDIT-LOG-2026-Q3-001';
    const evWithCustomId = captureRestoreDrillEvidence(readinessReport, { evidenceId: customId });
    expect(evWithCustomId.evidenceId).toBe(customId);

    // Case B: Auto-generated unique runtime identifiers
    const ev1 = captureRestoreDrillEvidence(readinessReport);
    const ev2 = captureRestoreDrillEvidence(readinessReport);
    expect(ev1.evidenceId).toMatch(/^drill-ev-/);
    expect(ev2.evidenceId).toMatch(/^drill-ev-/);
    expect(ev1.evidenceId).not.toBe(ev2.evidenceId);
  });

  // ---------------------------------------------------------------------------
  // 10. Operator Sign-off Statuses and Notes Policy
  // ---------------------------------------------------------------------------
  it('10. Sign-off statuses (pending, signed_off, rejected) and operator notes handling', () => {
    const validRaw = fs.readFileSync(path.join(fixturesDir, 'valid-snapshot.json'), 'utf-8');
    const validPayload = JSON.parse(validRaw);
    const liveState = createSampleLiveState();

    const readinessReport = evaluateRestoreDrillReadiness(validPayload, liveState);

    // Default status is 'pending' when omitted
    const defaultEv = captureRestoreDrillEvidence(readinessReport);
    expect(defaultEv.operatorSignOffStatus).toBe('pending');
    expect(defaultEv.operatorNotes).toBeUndefined();

    // Rejected status with notes
    const rejectedEv = captureRestoreDrillEvidence(readinessReport, {
      operatorSignOffStatus: 'rejected',
      operatorNotes: 'Từ chối: Số lượng delta quá lớn',
    });
    expect(rejectedEv.operatorSignOffStatus).toBe('rejected');
    expect(rejectedEv.operatorNotes).toBe('Từ chối: Số lượng delta quá lớn');
  });

  // ---------------------------------------------------------------------------
  // 11. Deep Reference Isolation (No Shared Mutable Nested References)
  // ---------------------------------------------------------------------------
  it('11. Output evidence record does not share mutable nested references with input report', () => {
    const validRaw = fs.readFileSync(path.join(fixturesDir, 'valid-snapshot.json'), 'utf-8');
    const validPayload = JSON.parse(validRaw);
    const liveState = createSampleLiveState();

    const readinessReport = evaluateRestoreDrillReadiness(validPayload, liveState, { mode: 'replace' });
    const originalTopicsDelta = readinessReport.gate2DryRun.simulatedImpact.topicsDelta;
    const originalGate1Passed = readinessReport.gate1Validation.passed;

    const evidence = captureRestoreDrillEvidence(readinessReport);

    // Mutate nested output properties
    evidence.simulatedImpact.topicsDelta = 9999;
    evidence.gateSummary.gate1Passed = false;

    // Verify input readiness report was NOT mutated
    expect(readinessReport.gate2DryRun.simulatedImpact.topicsDelta).toBe(originalTopicsDelta);
    expect(readinessReport.gate1Validation.passed).toBe(originalGate1Passed);
  });
});
