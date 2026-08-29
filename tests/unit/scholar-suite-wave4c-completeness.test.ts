import { describe, it, expect } from 'vitest';
import {
  getScholarSuiteCounts,
  getSystemNodes,
  validateAttributionInvariant,
} from '../../src/lib/scholarSuite/selectors';
import { LEXICON_REGISTRY } from '../../src/data/scholarSuite/lexiconRegistry';
import { SYSTEM_NODE_REGISTRY } from '../../src/data/scholarSuite/systemRegistry';
import { MATRIX_RELATION_REGISTRY } from '../../src/data/scholarSuite/matrixRegistry';

describe('Phase D - Sub-Wave 4C: 64 I Ching Hexagrams Full Completion', () => {
  describe('1. Batch Count Verification (Wave 4C Totals)', () => {
    it('verifies exact total of 64 Hexagrams, 89 Cittas, 52 Cetasikas and preserved counts', () => {
      const counts = getScholarSuiteCounts();
      expect(counts.totalHexagrams).toBe(64);
      expect(counts.totalCittas).toBe(89);
      expect(counts.totalCetasikas).toBe(52);
      expect(counts.totalPatthana).toBe(1);
      expect(counts.totalNidanas).toBe(1);
      expect(counts.totalQiMen).toBe(1);
      expect(counts.totalMatrixRelations).toBe(10);
    });

    it('verifies full sequence of 64 I Ching Hexagrams (Q01-Q64)', () => {
      const hexagrams = getSystemNodes('iching_64');
      expect(hexagrams.length).toBe(64);
      const numbers = hexagrams.map((h) => h.attributes.hexagramNumber);
      expect(numbers).toEqual(Array.from({ length: 64 }, (_, i) => i + 1));
    });

    it('verifies presence of all 32 Hạ Kinh Hexagrams (Q33-Q64)', () => {
      const hexagrams = getSystemNodes('iching_64');
      const haKinh = hexagrams.filter((h) => h.attributes.hexagramNumber >= 33);
      expect(haKinh.length).toBe(32);

      const codes = haKinh.map((h) => h.code);
      const expectedCodes = Array.from({ length: 32 }, (_, i) => `Q${i + 33}`);
      expect(codes).toEqual(expectedCodes);
    });
  });

  describe('2. I Ching Attribute Consistency & Attribution', () => {
    it('all 64 hexagrams have complete canonical attributes (trigrams, element, judgmentText, imageText)', () => {
      const hexagrams = getSystemNodes('iching_64');
      for (const hex of hexagrams) {
        expect(hex.attributes.upperTrigram.length).toBeGreaterThan(2);
        expect(hex.attributes.lowerTrigram.length).toBeGreaterThan(2);
        expect(hex.attributes.element.length).toBeGreaterThan(1);
        expect(hex.attributes.judgmentText.length).toBeGreaterThan(5);
        expect(hex.attributes.imageText.length).toBeGreaterThan(5);
        expect(hex.canonicalMeaning.length).toBeGreaterThan(10);
        expect(hex.coverage).toBe('canonical');
        expect(hex.sources.length).toBeGreaterThanOrEqual(1);
        expect(validateAttributionInvariant(hex)).toBe(true);
      }
    });

    it('every record in full system registry satisfies attribution invariants', () => {
      for (const entry of LEXICON_REGISTRY) {
        expect(validateAttributionInvariant(entry)).toBe(true);
      }
      for (const node of SYSTEM_NODE_REGISTRY) {
        expect(validateAttributionInvariant(node)).toBe(true);
      }
      for (const rel of MATRIX_RELATION_REGISTRY) {
        expect(validateAttributionInvariant(rel)).toBe(true);
      }
    });
  });
});
