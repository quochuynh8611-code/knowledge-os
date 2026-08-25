import { describe, it, expect } from 'vitest';
import {
  validateRestoreCandidate,
  buildRestorePreview,
  runRestoreDrill,
} from '../../src/lib/backupVerification';
import { calculateBackupChecksum } from '../../src/lib/validation';
import { Topic, Note, Resource, Category, Tag } from '../../src/types';

describe('Post-Phase 6e: In-Memory Restore Drill & Candidate Validation', () => {
  const sampleCategories: Category[] = [{ id: 'cat-1', name: 'Phật Học', slug: 'phat-hoc' }];
  const sampleTopics: Topic[] = [
    {
      id: 'top-1',
      title: 'Tứ Diệu Đế',
      slug: 'tu-dieu-de',
      categoryId: 'cat-1',
      type: 'phat-hoc',
      description: 'Mô tả...',
      content: 'Nội dung...',
      tags: [],
      links: [],
      studyProgress: {
        topicId: 'top-1',
        status: 'completed',
        progress: 100,
        interval: 10,
        easeFactor: 2.5,
        repetitions: 5,
        totalNotes: 1,
        timeSpent: 120,
      },
      createdAt: '2026-08-01T00:00:00Z',
      updatedAt: '2026-08-01T00:00:00Z',
    },
  ];
  const sampleNotes: Note[] = [
    {
      id: 'note-1',
      topicId: 'top-1',
      title: 'Ghi chú 1',
      content: 'Nội dung ghi chú...',
      type: 'study',
      isPrivate: false,
      tags: [],
      createdAt: '2026-08-01T00:00:00Z',
      updatedAt: '2026-08-01T00:00:00Z',
    },
  ];
  const sampleResources: Resource[] = [];
  const sampleTags: Tag[] = [];

  const rawData = {
    categories: sampleCategories,
    topics: sampleTopics,
    notes: sampleNotes,
    resources: sampleResources,
    tags: sampleTags,
  };

  const validChecksum = calculateBackupChecksum(rawData);

  const validSnapshot = {
    version: '2.0.0',
    exportedAt: '2026-08-25T12:00:00.000Z',
    checksum: validChecksum,
    counts: { categories: 1, topics: 1, notes: 1, resources: 0, tags: 0 },
    data: rawData,
  };

  it('validates a correct Semver 2.x snapshot candidate in memory', () => {
    const res = validateRestoreCandidate(validSnapshot);
    expect(res.isValid).toBe(true);
    expect(res.format).toBe('snapshot_v2');
    expect(res.checksumMatch).toBe(true);
  });

  it('rejects a snapshot with corrupted checksum or malformed json safely', () => {
    const corruptSnapshot = {
      ...validSnapshot,
      checksum: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    };
    const res = validateRestoreCandidate(corruptSnapshot);
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/checksum/i);
  });

  it('accepts and upgrades a legacy JSON structure without crashing', () => {
    const legacyPayload = {
      categories: sampleCategories,
      topics: sampleTopics,
      notes: sampleNotes,
    };
    const res = validateRestoreCandidate(legacyPayload);
    expect(res.isValid).toBe(true);
    expect(res.format).toBe('legacy_json');
    expect(res.counts.topics).toBe(1);
    expect(res.counts.notes).toBe(1);
  });

  it('buildRestorePreview extracts entities preview without executing restore', () => {
    const preview = buildRestorePreview(validSnapshot);
    expect(preview.totalEntities).toBe(3);
    expect(preview.categoriesCount).toBe(1);
    expect(preview.topicsCount).toBe(1);
    expect(preview.notesCount).toBe(1);
    expect(preview.sampleTopicTitles).toContain('Tứ Diệu Đế');
  });

  it('runRestoreDrill performs a 100% in-memory dry-run and does not mutate live state', () => {
    const liveState = {
      categories: [{ id: 'live-cat', name: 'Live Cat', slug: 'live-cat' }],
      topics: [],
      notes: [],
      resources: [],
      tags: [],
    };

    // Deep clone live state before drill
    const liveStateBefore = JSON.parse(JSON.stringify(liveState));

    const drillResult = runRestoreDrill(validSnapshot, liveState, { mode: 'replace' });

    expect(drillResult.drillSuccess).toBe(true);
    expect(drillResult.isDryRun).toBe(true);
    expect(drillResult.simulatedImpact.categoriesDelta).toBe(0); // 1 incoming vs 1 existing
    expect(drillResult.simulatedImpact.topicsDelta).toBe(1); // 1 incoming vs 0 existing
    expect(drillResult.simulatedResultState.topics.length).toBe(1);

    // Live state must remain strictly unmodified
    expect(liveState).toEqual(liveStateBefore);
  });
});
