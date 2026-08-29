import { describe, it, expect } from 'vitest';
import {
  getScholarSuiteCounts,
  getSystemNodes,
  getLexiconEntries,
  validateAttributionInvariant,
} from '../../src/lib/scholarSuite/selectors';
import { LEXICON_REGISTRY } from '../../src/data/scholarSuite/lexiconRegistry';
import { SYSTEM_NODE_REGISTRY } from '../../src/data/scholarSuite/systemRegistry';
import { MATRIX_RELATION_REGISTRY } from '../../src/data/scholarSuite/matrixRegistry';

describe('Phase D - Sub-Wave 4B: 89 Cittas Full Completion', () => {
  describe('1. Batch Count Verification (Wave 4B Totals)', () => {
    it('verifies exact total of 89 Cittas, 52 Cetasikas and preserved counts for other models', () => {
      const counts = getScholarSuiteCounts();
      expect(counts.totalCittas).toBe(89);
      expect(counts.totalCetasikas).toBe(52);
      expect(counts.totalHexagrams).toBeGreaterThanOrEqual(32);
      expect(counts.totalPatthana).toBe(1);
      expect(counts.totalNidanas).toBe(1);
      expect(counts.totalQiMen).toBe(1);
    });

    it('verifies full sequence of 89 Cittas (C01-C89)', () => {
      const cittas = getSystemNodes('citta_89_121');
      expect(cittas.length).toBe(89);
      const numbers = cittas.map((c) => c.attributes.cittaNumber);
      expect(numbers).toEqual(Array.from({ length: 89 }, (_, i) => i + 1));
    });

    it('verifies exact distribution across all 4 Consciousness Planes (Bhūmi)', () => {
      const cittas = getSystemNodes('citta_89_121');
      
      const kamavacara = cittas.filter((c) => c.attributes.plane === 'kāmāvacara');
      expect(kamavacara.length).toBe(54);

      const rupavacara = cittas.filter((c) => c.attributes.plane === 'rūpāvacara');
      expect(rupavacara.length).toBe(15);

      const arupavacara = cittas.filter((c) => c.attributes.plane === 'arūpāvacara');
      expect(arupavacara.length).toBe(12);

      const lokuttara = cittas.filter((c) => c.attributes.plane === 'lokuttara');
      expect(lokuttara.length).toBe(8);
    });
  });

  describe('2. Mahaggata & Lokuttara Attribute Consistency', () => {
    it('verifies all 15 Rūpāvacara Cittas have 3 roots, valid feelings, and unprompted convention', () => {
      const cittas = getSystemNodes('citta_89_121');
      const rupaList = cittas.filter((c) => c.attributes.plane === 'rūpāvacara');
      expect(rupaList.length).toBe(15);

      for (const c of rupaList) {
        expect(c.attributes.roots.length).toBe(3);
        expect(c.attributes.prompting).toBe('unprompted');
        expect(['somanassa', 'upekkhā']).toContain(c.attributes.feeling);
        expect(c.attributes.associatedCetasikaCount).toBeGreaterThanOrEqual(30);
        expect(validateAttributionInvariant(c)).toBe(true);
      }
    });

    it('verifies all 12 Arūpāvacara Cittas have 3 roots, upekkhā feeling, and 30 associated cetasikas', () => {
      const cittas = getSystemNodes('citta_89_121');
      const arupaList = cittas.filter((c) => c.attributes.plane === 'arūpāvacara');
      expect(arupaList.length).toBe(12);

      for (const c of arupaList) {
        expect(c.attributes.roots.length).toBe(3);
        expect(c.attributes.feeling).toBe('upekkhā');
        expect(c.attributes.prompting).toBe('unprompted');
        expect(c.attributes.associatedCetasikaCount).toBe(30);
        expect(validateAttributionInvariant(c)).toBe(true);
      }
    });

    it('verifies all 8 Lokuttara Cittas (4 Magga + 4 Phala) are strictly structured with canonical references', () => {
      const cittas = getSystemNodes('citta_89_121');
      const lokuList = cittas.filter((c) => c.attributes.plane === 'lokuttara');
      expect(lokuList.length).toBe(8);

      const maggaList = lokuList.filter((c) => c.attributes.cittaType === 'kusala');
      const phalaList = lokuList.filter((c) => c.attributes.cittaType === 'vipāka');
      expect(maggaList.length).toBe(4);
      expect(phalaList.length).toBe(4);

      for (const c of lokuList) {
        expect(c.attributes.roots.length).toBe(3);
        expect(c.attributes.prompting).toBe('unprompted');
        expect(c.attributes.associatedCetasikaCount).toBe(36);
        expect(c.coverage).toBe('canonical');
        expect(c.sources.length).toBeGreaterThanOrEqual(1);
        expect(validateAttributionInvariant(c)).toBe(true);
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
