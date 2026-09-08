import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getStorageKey,
  saveReadingPosition,
  restoreReadingPosition,
  getHeadingFromQueryParam,
  updateHeadingQueryParam,
} from '../../src/lib/readingPosition';

describe('ReadingPosition Utilities: Deep Linking & State Restoration', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, '', 'http://localhost:3000/#/');
    vi.restoreAllMocks();
  });

  it('generates a formatted storage key for a noteId', () => {
    expect(getStorageKey('res-123')).toBe('obsidian-viewer:res-123:activeHeading');
  });

  it('saves and restores reading position from localStorage', () => {
    saveReadingPosition('note-abc', 'phuong-phap-thuc-hanh-1');
    expect(restoreReadingPosition('note-abc')).toBe('phuong-phap-thuc-hanh-1');
    expect(restoreReadingPosition('non-existent')).toBeNull();
  });

  it('handles localStorage errors gracefully without throwing', () => {
    const setItemSpy = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceeded');
    });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(() => saveReadingPosition('note-abc', 'heading-1')).not.toThrow();
    expect(warnSpy).toHaveBeenCalledWith('Failed to save reading position:', expect.any(Error));

    setItemSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('reads heading query parameter from current URL', () => {
    window.history.replaceState({}, '', 'http://localhost:3000/?heading=tong-quan#/topics');
    expect(getHeadingFromQueryParam()).toBe('tong-quan');

    window.history.replaceState({}, '', 'http://localhost:3000/#/topics');
    expect(getHeadingFromQueryParam()).toBeNull();
  });

  it('updates or removes heading query parameter in URL using replaceState', () => {
    window.history.replaceState({}, '', 'http://localhost:3000/#/topics');

    updateHeadingQueryParam('tong-quan-1');
    expect(getHeadingFromQueryParam()).toBe('tong-quan-1');

    updateHeadingQueryParam(null);
    expect(getHeadingFromQueryParam()).toBeNull();
  });
});
