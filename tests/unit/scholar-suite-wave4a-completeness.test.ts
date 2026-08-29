import { describe, it, expect } from 'vitest';
import {
  getScholarSuiteCounts,
  getSystemNodes,
  getLexiconEntries,
  getMatrixRelations,
  validateAttributionInvariant,
} from '../../src/lib/scholarSuite/selectors';
import { LEXICON_REGISTRY } from '../../src/data/scholarSuite/lexiconRegistry';
import { SYSTEM_NODE_REGISTRY } from '../../src/data/scholarSuite/systemRegistry';
import { MATRIX_RELATION_REGISTRY } from '../../src/data/scholarSuite/matrixRegistry';

describe('Phase D - Sub-Wave 4A: 52 Cetasikas Full Completion', () => {
  describe('1. Batch Count Verification (Wave 4A Totals)', () => {
    it('verifies exact total of 52 Cetasikas and preserved counts for other models', () => {
      const counts = getScholarSuiteCounts();
      expect(counts.totalCetasikas).toBe(52);
      expect(counts.totalCittas).toBeGreaterThanOrEqual(54);
      expect(counts.totalHexagrams).toBeGreaterThanOrEqual(32);
      expect(counts.totalPatthana).toBe(1);
      expect(counts.totalNidanas).toBe(1);
      expect(counts.totalQiMen).toBe(1);
      expect(counts.totalMatrixRelations).toBe(10);
    });

    it('verifies full sequence of 52 Cetasikas (CET01-CET52)', () => {
      const cetasikas = getSystemNodes('cetasika_52');
      expect(cetasikas.length).toBe(52);
      const numbers = cetasikas.map((c) => c.attributes.cetasikaNumber);
      expect(numbers).toEqual(Array.from({ length: 52 }, (_, i) => i + 1));
    });

    it('verifies exact distribution of all 4 Sobhana subgroups (25 Sobhana Cetasikas)', () => {
      const cetasikas = getSystemNodes('cetasika_52');
      const sobhanaList = cetasikas.filter((c) => c.attributes.group === 'sobhana');
      expect(sobhanaList.length).toBe(25);

      const generalList = cetasikas.filter((c) => c.attributes.subGroup === 'sobhana_general');
      expect(generalList.length).toBe(19);

      const viratiList = cetasikas.filter((c) => c.attributes.subGroup === 'virati');
      expect(viratiList.length).toBe(3);

      const appamannaList = cetasikas.filter((c) => c.attributes.subGroup === 'appamaññā');
      expect(appamannaList.length).toBe(2);

      const pannaList = cetasikas.filter((c) => c.attributes.subGroup === 'paññā');
      expect(pannaList.length).toBe(1);
    });
  });

  describe('2. Invariant & Attribute Safety', () => {
    it('all 52 cetasikas have complete 4 functional characteristics and canonical coverage', () => {
      const cetasikas = getSystemNodes('cetasika_52');
      for (const cet of cetasikas) {
        expect(cet.attributes.characteristic.length).toBeGreaterThan(5);
        expect(cet.attributes.function.length).toBeGreaterThan(5);
        expect(cet.attributes.manifestation.length).toBeGreaterThan(5);
        expect(cet.attributes.proximateCause.length).toBeGreaterThan(5);
        expect(validateAttributionInvariant(cet)).toBe(true);
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
