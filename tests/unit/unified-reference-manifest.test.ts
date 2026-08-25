import { describe, it, expect } from 'vitest';
import { generateFileLibraryManifest, auditFileReferences } from '../../src/lib/fileLibraryAudit';
import { Resource, Note } from '../../src/types';

describe('Post-Phase 6d: Unified Reference Manifest (Resource + Note References)', () => {
  it('generates a unified manifest containing both resources and notes with normalized paths', () => {
    const resources: Resource[] = [
      {
        id: 'res-pdf-1',
        topicId: 'topic-1',
        title: 'Abhidharmakosa PDF',
        type: 'pdf',
        filePath: ' D:\\Knowledge-Library\\PDF\\\\kosa.pdf ',
        createdAt: '2026-08-01T00:00:00Z',
      },
    ];

    const notes: Note[] = [
      {
        id: 'note-md-1',
        topicId: 'topic-1',
        title: 'Khảo cứu danh sắc',
        content: 'Chi tiết...',
        type: 'insight',
        isPrivate: false,
        tags: [],
        sourcePath: ' /Users/researcher/Knowledge-Library//Notes/danh-sac.md ',
        createdAt: '2026-08-01T00:00:00Z',
        updatedAt: '2026-08-01T00:00:00Z',
      },
    ];

    const audit = auditFileReferences(resources, notes, {
      libraryRootPath: '/Users/researcher/Knowledge-Library',
    });

    const manifest = generateFileLibraryManifest(audit, {
      libraryRootPath: '/Users/researcher/Knowledge-Library',
      exportedAt: '2026-08-25T12:00:00.000Z',
    });

    expect(manifest.manifestVersion).toBe('1.0');
    expect(manifest.entries.length).toBe(2);

    const resEntry = manifest.entries.find((e) => e.sourceType === 'resource');
    expect(resEntry?.resolvedPath).toBe('D:/Knowledge-Library/PDF/kosa.pdf');

    const noteEntry = manifest.entries.find((e) => e.sourceType === 'note');
    expect(noteEntry?.resolvedPath).toBe('/Users/researcher/Knowledge-Library/Notes/danh-sac.md');
    expect(noteEntry?.relativeToRoot).toBe('Notes/danh-sac.md');
  });
});
