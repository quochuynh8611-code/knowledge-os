import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  inspectManifestPayload,
  calculateBackupReadiness,
} from '../../src/lib/backupVerification';
import { Category, Topic, Note, Resource, Tag } from '../../src/types';
import { FileLibraryAuditSummary } from '../../src/lib/fileLibraryAudit';

describe('Post-Phase 6f: Manifest Mixed Statuses Fixture Contract Tests', () => {
  const fixturesDir = path.resolve(__dirname, '../fixtures/backup');

  it('1. manifest-mixed-statuses.json exposes distinct counts for all 4 reference boundary statuses', () => {
    const filePath = path.join(fixturesDir, 'manifest-mixed-statuses.json');
    expect(fs.existsSync(filePath)).toBe(true);

    const rawJson = fs.readFileSync(filePath, 'utf-8');
    const payload = JSON.parse(rawJson);

    const inspection = inspectManifestPayload(payload);
    expect(inspection.isValid).toBe(true);
    expect(inspection.manifestVersion).toBe('1.0.0');
    expect(inspection.totalEntries).toBe(4);
    expect(inspection.resourceCount).toBe(3);
    expect(inspection.noteCount).toBe(1);
    expect(inspection.unverifiedCount).toBe(1);
    expect(inspection.missingCount).toBe(1);
    expect(inspection.outsideCount).toBe(1);
  });

  it('2. calculateBackupReadiness correctly evaluates risk and recommendations from mixed manifest', () => {
    const filePath = path.join(fixturesDir, 'manifest-mixed-statuses.json');
    const rawJson = fs.readFileSync(filePath, 'utf-8');
    const manifest = JSON.parse(rawJson);

    const sampleCategories: Category[] = [{ id: 'cat-1', name: 'Phật Học', slug: 'phat-hoc' }];
    const sampleTopics: Topic[] = [
      {
        id: 'top-1',
        title: 'Tứ Diệu Đế',
        slug: 'tu-dieu-de',
        categoryId: 'cat-1',
        type: 'phat-hoc',
        description: '',
        content: '',
        tags: [],
        links: [],
        studyProgress: {
          topicId: 'top-1',
          status: 'in_progress',
          progress: 50,
          interval: 1,
          easeFactor: 2.5,
          repetitions: 1,
          totalNotes: 1,
          timeSpent: 30,
        },
        createdAt: '2026-08-01T00:00:00Z',
        updatedAt: '2026-08-01T00:00:00Z',
      },
    ];
    const sampleNotes: Note[] = [
      {
        id: 'note-1',
        topicId: 'top-1',
        title: 'Note 1',
        content: 'Content',
        sourcePath: '/Users/researcher/Desktop/note-temp.md',
        type: 'insight',
        isPrivate: false,
        tags: [],
        createdAt: '2026-08-01T00:00:00Z',
        updatedAt: '2026-08-01T00:00:00Z',
      },
    ];
    const sampleResources: Resource[] = [
      {
        id: 'res-1',
        topicId: 'top-1',
        title: 'Res 1',
        type: 'pdf',
        filePath: '/Users/researcher/Knowledge-Library/PDF/kinh-chuyen-phap-luan.pdf',
        createdAt: '2026-08-01T00:00:00Z',
      },
      {
        id: 'res-2',
        topicId: 'top-1',
        title: 'Res 2',
        type: 'audio',
        filePath: '/Users/researcher/Knowledge-Library/Audio/abhidhamma.mp3',
        createdAt: '2026-08-01T00:00:00Z',
      },
      {
        id: 'res-3',
        topicId: 'top-1',
        title: 'Res 3',
        type: 'pdf',
        filePath: '/Users/researcher/Knowledge-Library/PDF/missing-document.pdf',
        createdAt: '2026-08-01T00:00:00Z',
      },
    ];
    const sampleTags: Tag[] = [{ id: 'tag-1', name: 'Tag', slug: 'tag', color: '#000' }];

    const auditSummary: FileLibraryAuditSummary = {
      totalItems: 4,
      totalWithLocalPath: 4,
      existingCount: 1,
      unverifiedCount: 1,
      missingCount: 1,
      outsideLibraryCount: 1,
      unspecifiedCount: 0,
      totalFileSizeBytes: 0,
      auditedAt: '2026-08-25T10:00:00Z',
    };

    const readiness = calculateBackupReadiness({
      categories: sampleCategories,
      topics: sampleTopics,
      notes: sampleNotes,
      resources: sampleResources,
      tags: sampleTags,
      libraryRootPath: manifest.canonicalLibraryRoot,
      auditSummary,
    });

    // Layer 1: App Snapshot is valid
    expect(readiness.layers.snapshot.status).toBe('ready');
    expect(readiness.layers.snapshot.isLogicalOnly).toBe(true);
    expect(readiness.layers.snapshot.entityCounts.topics).toBe(1);
    expect(readiness.layers.snapshot.entityCounts.notes).toBe(1);

    // Layer 2: Manifest is ready with warnings
    expect(readiness.layers.manifest.status).toBe('ready');
    expect(readiness.layers.manifest.totalReferences).toBe(4);
    expect(readiness.layers.manifest.missingCount).toBe(1);
    expect(readiness.layers.manifest.outsideCount).toBe(1);

    // Layer 3: Physical backup requires copying files on disk
    expect(readiness.layers.physicalFiles.status).toBe('action_required');
    expect(readiness.layers.physicalFiles.hasOutsideFiles).toBe(true);
    expect(readiness.layers.physicalFiles.missingCount).toBe(1);

    // Overall readiness should be action_required due to missing files
    expect(readiness.overallStatus).toBe('action_required');
    expect(readiness.layers.physicalFiles.actionRecommendation).toContain('thất lạc');
  });
});
