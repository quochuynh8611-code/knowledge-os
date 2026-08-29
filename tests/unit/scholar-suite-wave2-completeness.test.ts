import { describe, it, expect } from 'vitest';
import {
  getScholarSuiteCounts,
  getSystemNodes,
  validateAttributionInvariant,
} from '../../src/lib/scholarSuite/selectors';
import { LEXICON_REGISTRY } from '../../src/data/scholarSuite/lexiconRegistry';
import { SYSTEM_NODE_REGISTRY } from '../../src/data/scholarSuite/systemRegistry';
import { MATRIX_RELATION_REGISTRY } from '../../src/data/scholarSuite/matrixRegistry';

describe('Phase D - Wave 2: Academic Dataset Completeness & Invariants', () => {
  describe('1. Batch Count Verification (Wave 2 Totals)', () => {
    it('verifies baseline Wave 2 counts for all models', () => {
      const counts = getScholarSuiteCounts();
      expect(counts.totalHexagrams).toBeGreaterThanOrEqual(16);
      expect(counts.totalCittas).toBeGreaterThanOrEqual(30);
      expect(counts.totalCetasikas).toBeGreaterThanOrEqual(13);
      expect(counts.totalPatthana).toBeGreaterThanOrEqual(1);
      expect(counts.totalNidanas).toBeGreaterThanOrEqual(1);
      expect(counts.totalQiMen).toBeGreaterThanOrEqual(1);
      expect(counts.totalLexicon).toBeGreaterThanOrEqual(12);
      expect(counts.totalMatrixRelations).toBeGreaterThanOrEqual(8);
    });

    it('verifies full sequence of first 16 I Ching hexagrams (Q01-Q16)', () => {
      const hexagrams = getSystemNodes('iching_64');
      expect(hexagrams.length).toBeGreaterThanOrEqual(16);
      const numbers = hexagrams.slice(0, 16).map((h) => h.attributes.hexagramNumber);
      expect(numbers).toEqual([
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
      ]);
    });

    it('verifies full sequence of first 30 Cittas (12 Akusala + 18 Ahetuka)', () => {
      const cittas = getSystemNodes('citta_89_121');
      expect(cittas.length).toBeGreaterThanOrEqual(30);
      const numbers = cittas.slice(0, 30).map((c) => c.attributes.cittaNumber);
      expect(numbers).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
    });

    it('verifies full sequence of first 13 Cetasikas (7 Sabbacitta + 6 Pakiṇṇaka)', () => {
      const cetasikas = getSystemNodes('cetasika_52');
      expect(cetasikas.length).toBeGreaterThanOrEqual(13);
      const numbers = cetasikas.slice(0, 13).map((c) => c.attributes.cetasikaNumber);
      expect(numbers).toEqual(Array.from({ length: 13 }, (_, i) => i + 1));
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

    it('ensures all 18 Ahetuka Cittas have empty roots and valid plane properties', () => {
      const ahetukaCittas = getSystemNodes('citta_89_121').filter(
        (c) => c.attributes.cittaNumber >= 13 && c.attributes.cittaNumber <= 30
      );
      expect(ahetukaCittas.length).toBe(18);
      for (const citta of ahetukaCittas) {
        expect(citta.attributes.plane).toBe('kāmāvacara');
        expect(citta.attributes.roots.length).toBe(0);
        expect(['vipāka', 'kiriya']).toContain(citta.attributes.cittaType);
        expect(citta.attributes.associatedCetasikaCount).toBeGreaterThanOrEqual(7);
        expect(citta.attributes.associatedCetasikaCount).toBeLessThanOrEqual(12);
      }
    });
  });
});
