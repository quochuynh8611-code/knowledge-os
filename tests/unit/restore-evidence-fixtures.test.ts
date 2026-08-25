import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  inspectSnapshotPayload,
  validateRestoreCandidate,
  runRestoreDrill,
  buildRestorePreview,
} from '../../src/lib/backupVerification';
import { validateBackupSnapshotPreflight } from '../../src/lib/validation';
import { Category, Topic, Note, Resource, Tag } from '../../src/types';

describe('Post-Phase 6f: Restore Evidence Fixtures Contract Tests', () => {
  const fixturesDir = path.resolve(__dirname, '../fixtures/backup');

  it('1. valid-snapshot.json passes full preflight & checksum verification with exact counts', () => {
    const filePath = path.join(fixturesDir, 'valid-snapshot.json');
    expect(fs.existsSync(filePath)).toBe(true);

    const rawJson = fs.readFileSync(filePath, 'utf-8');
    const payload = JSON.parse(rawJson);

    const preflight = validateBackupSnapshotPreflight(payload);
    expect(preflight.valid).toBe(true);
    expect(preflight.checksumMatch).toBe(true);
    expect(preflight.counts?.categories).toBe(2);
    expect(preflight.counts?.topics).toBe(2);
    expect(preflight.counts?.notes).toBe(2);
    expect(preflight.counts?.resources).toBe(2);
    expect(preflight.counts?.tags).toBe(3);

    const inspection = inspectSnapshotPayload(payload);
    expect(inspection.isValid).toBe(true);
    expect(inspection.hasLogicalData).toBe(true);
    expect(inspection.includesPhysicalBinary).toBe(false);

    const preview = buildRestorePreview(payload);
    expect(preview.categoriesCount).toBe(2);
    expect(preview.topicsCount).toBe(2);
    expect(preview.notesCount).toBe(2);
    expect(preview.resourcesCount).toBe(2);
    expect(preview.sampleTopicTitles).toContain('Tứ Diệu Đế');
    expect(preview.sampleNoteTitles).toContain('Ghi chú Khổ Đế');
  });

  it('2. legacy-snapshot.json remains loadable and backward-compatible without runtime crashes', () => {
    const filePath = path.join(fixturesDir, 'legacy-snapshot.json');
    expect(fs.existsSync(filePath)).toBe(true);

    const rawJson = fs.readFileSync(filePath, 'utf-8');
    const payload = JSON.parse(rawJson);

    const validation = validateRestoreCandidate(payload);
    expect(validation.isValid).toBe(true);
    expect(validation.format).toBe('legacy_json');
    expect(validation.counts.topics).toBe(1);
    expect(validation.counts.notes).toBe(1);
    expect(validation.counts.resources).toBe(1);

    const inspection = inspectSnapshotPayload(payload);
    expect(inspection.isValid).toBe(true);
    expect(inspection.hasLogicalData).toBe(true);
    expect(inspection.entityCounts.topics).toBe(1);

    const preview = buildRestorePreview(payload);
    expect(preview.topicsCount).toBe(1);
    expect(preview.sampleTopicTitles).toContain('Bát Nhã Tâm Kinh');
  });

  it('3. malformed-snapshot.json is rejected safely without crashing or mutating state', () => {
    const filePath = path.join(fixturesDir, 'malformed-snapshot.json');
    expect(fs.existsSync(filePath)).toBe(true);

    const rawJson = fs.readFileSync(filePath, 'utf-8');
    const payload = JSON.parse(rawJson);

    const preflight = validateBackupSnapshotPreflight(payload);
    expect(preflight.valid).toBe(false);
    expect(preflight.checksumMatch).toBe(false);
    expect(preflight.error).toContain('Checksum không khớp');

    const candidateVal = validateRestoreCandidate(payload);
    expect(candidateVal.isValid).toBe(false);
    expect(candidateVal.checksumMatch).toBe(false);

    const liveState = {
      categories: [{ id: 'live-cat', name: 'Live', slug: 'live' }] as Category[],
      topics: [] as Topic[],
      notes: [] as Note[],
      resources: [] as Resource[],
      tags: [] as Tag[],
    };

    const initialCategoriesLength = liveState.categories.length;
    const drill = runRestoreDrill(payload, liveState, { mode: 'replace' });

    expect(drill.drillSuccess).toBe(false);
    expect(drill.error).toBeDefined();
    // Live state remains completely untouched
    expect(liveState.categories.length).toBe(initialCategoriesLength);
  });

  it('4. Restore drill with valid-snapshot.json produces reproducible deltas without state mutation', () => {
    const filePath = path.join(fixturesDir, 'valid-snapshot.json');
    const rawJson = fs.readFileSync(filePath, 'utf-8');
    const payload = JSON.parse(rawJson);

    const liveState = {
      categories: [{ id: 'live-cat-1', name: 'Live', slug: 'live' }] as Category[],
      topics: [{ id: 'live-top-1', title: 'Live Top', slug: 'live-top', categoryId: 'live-cat-1', type: 'phat-hoc', description: '', content: '', tags: [], links: [] }] as Topic[],
      notes: [] as Note[],
      resources: [] as Resource[],
      tags: [] as Tag[],
    };

    // Test Merge Mode
    const mergeDrill = runRestoreDrill(payload, liveState, { mode: 'merge' });
    expect(mergeDrill.drillSuccess).toBe(true);
    expect(mergeDrill.isDryRun).toBe(true);
    expect(mergeDrill.simulatedMode).toBe('merge');
    expect(mergeDrill.simulatedImpact.topicsDelta).toBe(2);
    expect(mergeDrill.simulatedImpact.notesDelta).toBe(2);
    expect(mergeDrill.simulatedResultState.topics.length).toBe(3); // 1 live + 2 from fixture

    // Test Replace Mode
    const replaceDrill = runRestoreDrill(payload, liveState, { mode: 'replace' });
    expect(replaceDrill.drillSuccess).toBe(true);
    expect(replaceDrill.simulatedMode).toBe('replace');
    expect(replaceDrill.simulatedImpact.topicsDelta).toBe(1); // 2 new - 1 old = +1 net
    expect(replaceDrill.simulatedResultState.topics.length).toBe(2);

    // Verify original liveState object was not modified
    expect(liveState.topics.length).toBe(1);
  });
});
