import { describe, it, expect } from 'vitest';
import {
  INITIAL_CATEGORIES,
  INITIAL_TOPICS,
  INITIAL_NOTES,
  INITIAL_RESOURCES,
  INITIAL_TAGS,
} from '../../src/data/initialData';

describe('Commercial Neutralization & Zero-Default Baseline Contract (Slice A)', () => {
  describe('1. Zero-default universal workspace baseline in initialData', () => {
    it('1.1. INITIAL_CATEGORIES contains zero default specialized domains', () => {
      expect(INITIAL_CATEGORIES).toEqual([]);
      expect(INITIAL_CATEGORIES.length).toBe(0);
    });

    it('1.2. INITIAL_TOPICS contains zero default specialized topics', () => {
      expect(INITIAL_TOPICS).toEqual([]);
      expect(INITIAL_TOPICS.length).toBe(0);
    });

    it('1.3. INITIAL_NOTES contains zero default notes', () => {
      expect(INITIAL_NOTES).toEqual([]);
      expect(INITIAL_NOTES.length).toBe(0);
    });

    it('1.4. INITIAL_RESOURCES contains zero default resources', () => {
      expect(INITIAL_RESOURCES).toEqual([]);
      expect(INITIAL_RESOURCES.length).toBe(0);
    });

    it('1.5. INITIAL_TAGS contains zero default tags', () => {
      expect(INITIAL_TAGS).toEqual([]);
      expect(INITIAL_TAGS.length).toBe(0);
    });
  });
});
