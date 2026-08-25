import { describe, it, expect } from 'vitest';
import {
  calculateBackupReadiness,
  inspectSnapshotPayload,
  inspectManifestPayload,
} from '../../src/lib/backupVerification';
import { calculateBackupChecksum } from '../../src/lib/validation';
import { auditFileReferences } from '../../src/lib/fileLibraryAudit';
import { Note, Resource, Topic, Category, Tag } from '../../src/types';

describe('Post-Phase 6e: Backup Readiness Calculation & Payload Inspection', () => {
  const sampleCategories: Category[] = [{ id: 'cat-1', name: 'Phật Học', slug: 'phat-hoc' }];
  const sampleTopics: Topic[] = [
    {
      id: 'top-1',
      title: 'Tứ Diệu Đế',
      slug: 'tu-dieu-de',
      categoryId: 'cat-1',
      type: 'phat-hoc',
      description: 'Khảo cứu căn bản',
      content: 'Nội dung...',
      tags: ['CanBan'],
      links: [],
      studyProgress: {
        topicId: 'top-1',
        status: 'in_progress',
        progress: 50,
        interval: 1,
        easeFactor: 2.5,
        repetitions: 2,
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
      title: 'Khổ Đế Ghi Chép',
      content: 'Phân tích Khổ...',
      type: 'study',
      isPrivate: false,
      tags: [],
      sourcePath: '/Users/researcher/Knowledge-Library/Notes/kho-de.md',
      createdAt: '2026-08-01T00:00:00Z',
      updatedAt: '2026-08-01T00:00:00Z',
    },
  ];
  const sampleResources: Resource[] = [
    {
      id: 'res-1',
      topicId: 'top-1',
      title: 'Kinh Chuyển Pháp Luân PDF',
      type: 'pdf',
      filePath: '/Users/researcher/Knowledge-Library/PDF/kinh-chuyen-phap-luan.pdf',
      createdAt: '2026-08-01T00:00:00Z',
    },
  ];
  const sampleTags: Tag[] = [{ id: 'tag-1', name: 'CanBan', slug: 'can-ban', color: '#3b82f6' }];

  it('inspectSnapshotPayload correctly identifies logical app data and confirms exclusion of binary bytes', () => {
    const rawData = {
      categories: sampleCategories,
      topics: sampleTopics,
      notes: sampleNotes,
      resources: sampleResources,
      tags: sampleTags,
    };
    const validSnapshot = {
      version: '2.0.0',
      exportedAt: '2026-08-25T10:00:00.000Z',
      checksum: calculateBackupChecksum(rawData),
      counts: { categories: 1, topics: 1, notes: 1, resources: 1, tags: 1 },
      data: rawData,
    };

    const inspection = inspectSnapshotPayload(validSnapshot);
    expect(inspection.isValid).toBe(true);
    expect(inspection.hasLogicalData).toBe(true);
    expect(inspection.includesPhysicalBinary).toBe(false);
    expect(inspection.entityCounts.topics).toBe(1);
    expect(inspection.entityCounts.notes).toBe(1);
  });

  it('calculateBackupReadiness calculates 3 distinct layers and exposes required physical backup', () => {
    const audit = auditFileReferences(sampleResources, sampleNotes, {
      libraryRootPath: '/Users/researcher/Knowledge-Library',
    });

    const report = calculateBackupReadiness({
      categories: sampleCategories,
      topics: sampleTopics,
      notes: sampleNotes,
      resources: sampleResources,
      tags: sampleTags,
      libraryRootPath: '/Users/researcher/Knowledge-Library',
      auditSummary: audit.summary,
    });

    expect(report.overallStatus).toBeDefined();
    expect(report.layers.snapshot.status).toBe('ready');
    expect(report.layers.snapshot.isLogicalOnly).toBe(true);
    expect(report.layers.manifest.status).toBe('ready');
    expect(report.layers.physicalFiles.status).toBe('action_required');
    expect(report.layers.physicalFiles.actionRecommendation).toContain('Knowledge-Library');
    expect(report.summary.unverifiedCount).toBe(2); // In browser mode, 2 references remain unverified
  });

  it('surfaces missing or outside-library files as high risk in readiness report', () => {
    const brokenResources: Resource[] = [
      {
        id: 'res-bad-1',
        topicId: 'top-1',
        title: 'Tệp ngoài desktop',
        type: 'pdf',
        filePath: '/Users/researcher/Desktop/random.pdf',
        createdAt: '2026-08-01T00:00:00Z',
      },
    ];

    const audit = auditFileReferences(brokenResources, [], {
      libraryRootPath: '/Users/researcher/Knowledge-Library',
    });

    const report = calculateBackupReadiness({
      categories: sampleCategories,
      topics: sampleTopics,
      notes: [],
      resources: brokenResources,
      tags: sampleTags,
      libraryRootPath: '/Users/researcher/Knowledge-Library',
      auditSummary: audit.summary,
    });

    expect(report.layers.physicalFiles.hasOutsideFiles).toBe(true);
    expect(report.layers.physicalFiles.outsideCount).toBe(1);
    expect(report.layers.physicalFiles.actionRecommendation).toMatch(/ngoài thư viện/i);
  });
});
