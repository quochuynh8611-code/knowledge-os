import { describe, it, expect } from 'vitest';
import {
  getScholarSuiteCounts,
  getSystemNodes,
  validateAttributionInvariant,
} from '../../src/lib/scholarSuite/selectors';
import { LEXICON_REGISTRY } from '../../src/data/scholarSuite/lexiconRegistry';
import { SYSTEM_NODE_REGISTRY } from '../../src/data/scholarSuite/systemRegistry';
import { MATRIX_RELATION_REGISTRY } from '../../src/data/scholarSuite/matrixRegistry';

describe('Phase D - Wave 1: Academic Dataset Completeness & Invariants', () => {
  describe('1. Batch Count Verification', () => {
    it('verifies baseline Wave 1 presence for all models', () => {
      const counts = getScholarSuiteCounts();
      expect(counts.totalHexagrams).toBeGreaterThanOrEqual(8);
      expect(counts.totalCittas).toBeGreaterThanOrEqual(12);
      expect(counts.totalCetasikas).toBeGreaterThanOrEqual(7);
      expect(counts.totalPatthana).toBeGreaterThanOrEqual(1);
      expect(counts.totalNidanas).toBeGreaterThanOrEqual(1);
      expect(counts.totalQiMen).toBeGreaterThanOrEqual(1);
      expect(counts.totalLexicon).toBeGreaterThanOrEqual(8);
      expect(counts.totalMatrixRelations).toBeGreaterThanOrEqual(6);
    });

    it('verifies presence of first 8 I Ching hexagrams (Q01-Q08)', () => {
      const hexagrams = getSystemNodes('iching_64');
      expect(hexagrams.length).toBeGreaterThanOrEqual(8);
      const numbers = hexagrams.slice(0, 8).map((h) => h.attributes.hexagramNumber);
      expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    });

    it('verifies presence of first 12 Akusala Cittas (C01-C12)', () => {
      const cittas = getSystemNodes('citta_89_121');
      expect(cittas.length).toBeGreaterThanOrEqual(12);
      const numbers = cittas.slice(0, 12).map((c) => c.attributes.cittaNumber);
      expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    });

    it('verifies presence of first 7 Sabbacittasādhāraṇa cetasikas (CET01-CET07)', () => {
      const cetasikas = getSystemNodes('cetasika_52');
      expect(cetasikas.length).toBeGreaterThanOrEqual(7);
      const numbers = cetasikas.slice(0, 7).map((c) => c.attributes.cetasikaNumber);
      expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });
  });

  describe('2. Invariant & Source Attribution Safety', () => {
    it('every expanded record satisfies attribution invariants with zero exceptions', () => {
      for (const entry of LEXICON_REGISTRY) {
        expect(
          validateAttributionInvariant(entry),
          `Lexicon ${entry.id} invalid attribution`
        ).toBe(true);
      }

      for (const node of SYSTEM_NODE_REGISTRY) {
        expect(
          validateAttributionInvariant(node),
          `SystemNode ${node.id} invalid attribution`
        ).toBe(true);
      }

      for (const rel of MATRIX_RELATION_REGISTRY) {
        expect(
          validateAttributionInvariant(rel),
          `MatrixRelation ${rel.id} invalid attribution`
        ).toBe(true);
      }
    });

    it('ensures all 12 Akusala Cittas have valid roots and plane properties', () => {
      const akusalaCittas = getSystemNodes('citta_89_121').filter(
        (c) => c.attributes.cittaType === 'akusala'
      );
      expect(akusalaCittas.length).toBe(12);
      for (const citta of akusalaCittas) {
        expect(citta.attributes.plane).toBe('kāmāvacara');
        expect(citta.attributes.cittaType).toBe('akusala');
        expect(citta.attributes.roots.length).toBeGreaterThan(0);
        expect(citta.attributes.associatedCetasikaCount).toBeGreaterThanOrEqual(15);
      }
    });
  });
});
