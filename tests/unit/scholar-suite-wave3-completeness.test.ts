import { describe, it, expect } from 'vitest';
import {
  getScholarSuiteCounts,
  getSystemNodes,
  validateAttributionInvariant,
} from '../../src/lib/scholarSuite/selectors';
import { LEXICON_REGISTRY } from '../../src/data/scholarSuite/lexiconRegistry';
import { SYSTEM_NODE_REGISTRY } from '../../src/data/scholarSuite/systemRegistry';
import { MATRIX_RELATION_REGISTRY } from '../../src/data/scholarSuite/matrixRegistry';

describe('Phase D - Wave 3: Academic Dataset Completeness & Invariants', () => {
  describe('1. Batch Count Verification (Wave 3 Totals)', () => {
    it('verifies baseline Wave 3 counts for all models', () => {
      const counts = getScholarSuiteCounts();
      expect(counts.totalHexagrams).toBeGreaterThanOrEqual(32);
      expect(counts.totalCittas).toBeGreaterThanOrEqual(54);
      expect(counts.totalCetasikas).toBeGreaterThanOrEqual(27);
      expect(counts.totalPatthana).toBeGreaterThanOrEqual(1);
      expect(counts.totalNidanas).toBeGreaterThanOrEqual(1);
      expect(counts.totalQiMen).toBeGreaterThanOrEqual(1);
      expect(counts.totalLexicon).toBeGreaterThanOrEqual(16);
      expect(counts.totalMatrixRelations).toBeGreaterThanOrEqual(10);
    });

    it('verifies full sequence of first 32 I Ching hexagrams (Q01-Q32)', () => {
      const hexagrams = getSystemNodes('iching_64');
      expect(hexagrams.length).toBeGreaterThanOrEqual(32);
      const numbers = hexagrams.slice(0, 32).map((h) => h.attributes.hexagramNumber);
      expect(numbers).toEqual(Array.from({ length: 32 }, (_, i) => i + 1));
    });

    it('verifies full sequence of first 54 Cittas (12 Akusala + 18 Ahetuka + 24 Kāmāvacara Sobhana)', () => {
      const cittas = getSystemNodes('citta_89_121');
      expect(cittas.length).toBeGreaterThanOrEqual(54);
      const numbers = cittas.slice(0, 54).map((c) => c.attributes.cittaNumber);
      expect(numbers).toEqual(Array.from({ length: 54 }, (_, i) => i + 1));
    });

    it('verifies full sequence of first 27 Cetasikas (13 Aññasamāna + 14 Akusala)', () => {
      const cetasikas = getSystemNodes('cetasika_52');
      expect(cetasikas.length).toBeGreaterThanOrEqual(27);
      const numbers = cetasikas.slice(0, 27).map((c) => c.attributes.cetasikaNumber);
      expect(numbers).toEqual(Array.from({ length: 27 }, (_, i) => i + 1));
    });
  });

  describe('2. Invariant & Source Attribution Safety', () => {
    it('every expanded record satisfies attribution invariants with zero exceptions', () => {
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

    it('ensures all 24 Kāmāvacara Sobhana Cittas have valid roots and plane properties', () => {
      const sobhanaCittas = getSystemNodes('citta_89_121').filter(
        (c) => c.attributes.cittaNumber >= 31 && c.attributes.cittaNumber <= 54
      );
      expect(sobhanaCittas.length).toBe(24);
      for (const citta of sobhanaCittas) {
        expect(citta.attributes.plane).toBe('kāmāvacara');
        expect(citta.attributes.roots.length).toBeGreaterThanOrEqual(2);
        expect(['kusala', 'vipāka', 'kiriya']).toContain(citta.attributes.cittaType);
        expect(citta.attributes.associatedCetasikaCount).toBeGreaterThanOrEqual(30);
      }
    });
  });
});
