/**
 * Research Storage Architecture v1 — Failing Tests (RED state)
 * Tests cover: resolveTopicIds, buildSourceRegistry, normalizeTopicTags, captureProgressSnapshot
 * These tests MUST fail before implementation.
 */
import { describe, it, expect } from 'vitest';
import {
  resolveTopicIds,
  buildSourceRegistry,
  normalizeTopicTags,
  captureProgressSnapshot,
} from '../../src/lib/researchStorageHelpers';
import { Note, Resource, StudyProgress } from '../../src/types';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const baseNote: Note = {
  id: 'note-research-1',
  topicId: 'topic-A',
  title: 'Test Note',
  content: 'Content here',
  type: 'insight',
  isPrivate: false,
  tags: [],
  createdAt: '2026-08-27T00:00:00Z',
  updatedAt: '2026-08-27T00:00:00Z',
};

const baseResource: Resource = {
  id: 'res-research-1',
  topicId: 'topic-A',
  title: 'Kinh Đại Niệm Xứ',
  type: 'book',
  url: 'https://example.com/kinh-dai-niem-xu',
  createdAt: '2026-08-27T00:00:00Z',
};

const baseStudyProgress: StudyProgress = {
  topicId: 'topic-1',
  status: 'in_progress',
  progress: 75,
  interval: 4,
  easeFactor: 2.5,
  repetitions: 3,
  totalNotes: 5,
  timeSpent: 120,
};

// ─── Feature 1: resolveTopicIds ────────────────────────────────────────────────

describe('resolveTopicIds — Multi-Topic Note backward compat', () => {
  it('1. returns topicIds array when topicIds is populated', () => {
    const note = { ...baseNote, topicIds: ['topic-A', 'topic-B'] };
    const result = resolveTopicIds(note);
    expect(result).toEqual(['topic-A', 'topic-B']);
  });

  it('2. falls back to [topicId] when topicIds is absent (backward compat)', () => {
    const note = { ...baseNote }; // no topicIds
    const result = resolveTopicIds(note);
    expect(result).toEqual(['topic-A']);
  });

  it('3. falls back to [topicId] when topicIds is empty array', () => {
    const note = { ...baseNote, topicIds: [] };
    const result = resolveTopicIds(note);
    expect(result).toEqual(['topic-A']);
  });

  it('4. deduplicates topicIds preserving insertion order', () => {
    const note = { ...baseNote, topicIds: ['topic-A', 'topic-A', 'topic-B'] };
    const result = resolveTopicIds(note);
    expect(result).toEqual(['topic-A', 'topic-B']);
  });

  it('5. does not mutate the original note object', () => {
    const note = { ...baseNote, topicIds: ['topic-A', 'topic-B'] };
    const originalTopicIds = [...note.topicIds!];
    resolveTopicIds(note);
    expect(note.topicIds).toEqual(originalTopicIds);
  });
});

// ─── Feature 2: buildSourceRegistry ───────────────────────────────────────────

describe('buildSourceRegistry — Source deduplication helper', () => {
  it('6. deduplicates two resources with identical title + url', () => {
    const res1: Resource = { ...baseResource, id: 'res-1' };
    const res2: Resource = { ...baseResource, id: 'res-2' };
    const registry = buildSourceRegistry([res1, res2]);
    expect(registry.size).toBe(1);
    const entry = Array.from(registry.values())[0];
    expect(entry.resourceIds).toContain('res-1');
    expect(entry.resourceIds).toContain('res-2');
  });

  it('7. creates separate entries for resources with different urls', () => {
    const res1: Resource = { ...baseResource, id: 'res-1', url: 'https://a.com' };
    const res2: Resource = { ...baseResource, id: 'res-2', url: 'https://b.com' };
    const registry = buildSourceRegistry([res1, res2]);
    expect(registry.size).toBe(2);
  });

  it('8. derives canonical key from filePath when url is absent', () => {
    const res: Resource = {
      ...baseResource,
      id: 'res-fp-1',
      url: undefined,
      filePath: '/docs/kinh-phap-cu.pdf',
    };
    const registry = buildSourceRegistry([res]);
    expect(registry.size).toBe(1);
    const entry = Array.from(registry.values())[0];
    expect(entry.filePath).toBe('/docs/kinh-phap-cu.pdf');
    expect(entry.url).toBeUndefined();
  });

  it('9. returns empty registry for empty input', () => {
    const registry = buildSourceRegistry([]);
    expect(registry.size).toBe(0);
  });

  it('10. each canonical entry has a non-empty id and canonicalKey', () => {
    const registry = buildSourceRegistry([baseResource]);
    const entry = Array.from(registry.values())[0];
    expect(entry.id).toBeTruthy();
    expect(entry.canonicalKey).toBeTruthy();
    expect(entry.title).toBe('Kinh Đại Niệm Xứ');
  });
});

// ─── Feature 3: normalizeTopicTags ────────────────────────────────────────────

describe('normalizeTopicTags — Tag sanitization', () => {
  it('11. removes empty strings from tags', () => {
    const result = normalizeTopicTags(['Phật Học', '', 'Dịch Học', '  ']);
    expect(result).toEqual(['Phật Học', 'Dịch Học']);
  });

  it('12. deduplicates tags case-sensitively (preserving case)', () => {
    const result = normalizeTopicTags(['Phật Học', 'Phật Học', 'phat-hoc']);
    expect(result).toEqual(['Phật Học', 'phat-hoc']);
  });

  it('13. trims whitespace from each tag and then deduplicates', () => {
    const result = normalizeTopicTags(['  Thiền Định  ', 'Thiền Định']);
    expect(result).toEqual(['Thiền Định']);
  });

  it('14. returns empty array for empty input', () => {
    expect(normalizeTopicTags([])).toEqual([]);
  });

  it('15. preserves insertion order of first occurrences', () => {
    const result = normalizeTopicTags(['C', 'A', 'B', 'A']);
    expect(result).toEqual(['C', 'A', 'B']);
  });
});

// ─── Feature 4: captureProgressSnapshot ───────────────────────────────────────

describe('captureProgressSnapshot — Append-only progress history', () => {
  it('16. creates snapshot with correct topicId and progressData', () => {
    const snapshot = captureProgressSnapshot('topic-1', baseStudyProgress);
    expect(snapshot.topicId).toBe('topic-1');
    expect(snapshot.progressData).toEqual(baseStudyProgress);
  });

  it('17. capturedAt is a valid ISO string', () => {
    const snapshot = captureProgressSnapshot('topic-1', baseStudyProgress);
    const parsed = new Date(snapshot.capturedAt);
    expect(isNaN(parsed.getTime())).toBe(false);
  });

  it('18. does not mutate the original StudyProgress', () => {
    const progress = { ...baseStudyProgress };
    captureProgressSnapshot('topic-1', progress);
    expect(progress.progress).toBe(75); // unchanged
    expect(progress.status).toBe('in_progress'); // unchanged
  });

  it('19. includes triggerReason when provided', () => {
    const snapshot = captureProgressSnapshot('topic-1', baseStudyProgress, 'session_complete');
    expect(snapshot.triggerReason).toBe('session_complete');
  });

  it('20. triggerReason is undefined when not provided', () => {
    const snapshot = captureProgressSnapshot('topic-1', baseStudyProgress);
    expect(snapshot.triggerReason).toBeUndefined();
  });

  it('21. two successive snapshots have distinct ids and independent progressData', () => {
    const p1 = { ...baseStudyProgress, progress: 50 };
    const p2 = { ...baseStudyProgress, progress: 80 };
    const snap1 = captureProgressSnapshot('topic-1', p1);
    const snap2 = captureProgressSnapshot('topic-1', p2);
    expect(snap1.id).not.toBe(snap2.id);
    expect(snap1.progressData.progress).toBe(50);
    expect(snap2.progressData.progress).toBe(80);
  });
});
