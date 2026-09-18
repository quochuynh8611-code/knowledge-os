import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createUnifiedReadingPositionStore,
  UnifiedReadingPositionStore,
  formatReadingPositionKey,
} from '../../src/lib/readingPositionUnified';

describe('Phase 18A Wave 2: readingPositionUnified', () => {
  let store: UnifiedReadingPositionStore;

  beforeEach(() => {
    store = createUnifiedReadingPositionStore();
    vi.restoreAllMocks();
  });

  it('generates a clean namespaced key for document positions', () => {
    const keyEpub = formatReadingPositionKey('doc-123', 'epub');
    const keyMd = formatReadingPositionKey('doc-456', 'md');
    const keyMarkdown = formatReadingPositionKey('doc-789', 'markdown');

    expect(keyEpub).toBe('doc:doc-123:epub');
    expect(keyMd).toBe('doc:doc-456:md');
    expect(keyMarkdown).toBe('doc:doc-789:markdown');
  });

  it('saves and restores EPUB CFI reading position', () => {
    const docId = 'epub-book-01';
    const cfi = 'epubcfi(/6/14[chapter2]!/4/2/10/1:0)';

    store.setPosition(docId, 'epub', cfi);
    const restored = store.getPosition(docId, 'epub');

    expect(restored).toBe(cfi);
  });

  it('saves and restores Markdown heading ID reading position', () => {
    const docId = 'md-research-01';
    const headingId = 'section-3-results-and-analysis';

    store.setPosition(docId, 'md', headingId);
    const restored = store.getPosition(docId, 'md');

    expect(restored).toBe(headingId);
  });

  it('does not leak or mix positions between different documents or formats', () => {
    store.setPosition('doc-A', 'md', 'heading-a');
    store.setPosition('doc-A', 'epub', 'epubcfi(/6/2)');
    store.setPosition('doc-B', 'md', 'heading-b');

    expect(store.getPosition('doc-A', 'md')).toBe('heading-a');
    expect(store.getPosition('doc-A', 'epub')).toBe('epubcfi(/6/2)');
    expect(store.getPosition('doc-B', 'md')).toBe('heading-b');
    expect(store.getPosition('doc-B', 'epub')).toBeNull();
  });

  it('returns null for unrecorded or missing positions', () => {
    expect(store.getPosition('non-existent-doc', 'md')).toBeNull();
    expect(store.getPosition('non-existent-doc', 'epub')).toBeNull();
  });

  it('handles malformed, empty, or invalid inputs gracefully without crashing', () => {
    expect(() => store.setPosition('', 'md', 'heading-1')).not.toThrow();
    expect(store.getPosition('', 'md')).toBeNull();

    expect(() => store.setPosition(null as any, 'md', 'heading-1')).not.toThrow();
    expect(store.getPosition(null as any, 'md')).toBeNull();

    // Empty locator should clear or ignore
    store.setPosition('doc-C', 'md', '');
    expect(store.getPosition('doc-C', 'md')).toBeNull();
  });

  it('clears position on demand', () => {
    store.setPosition('doc-D', 'md', 'heading-d');
    expect(store.getPosition('doc-D', 'md')).toBe('heading-d');

    store.clearPosition('doc-D', 'md');
    expect(store.getPosition('doc-D', 'md')).toBeNull();
  });

  it('strictly operates in-memory without accessing localStorage or sessionStorage', () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    store.setPosition('doc-no-storage', 'md', 'heading-test');
    const result = store.getPosition('doc-no-storage', 'md');

    expect(result).toBe('heading-test');
    expect(getItemSpy).not.toHaveBeenCalled();
    expect(setItemSpy).not.toHaveBeenCalled();
  });
});
