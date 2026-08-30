import { describe, it, expect } from 'vitest';
import { LEXICON_REGISTRY } from '../../src/data/scholarSuite/lexiconRegistry';
import { SYSTEM_NODE_REGISTRY } from '../../src/data/scholarSuite/systemRegistry';
import type { TerminologyDictionary } from '../../src/types/terminology';
import { createUnifiedTerminologyDictionary, scholarUnifiedDictionary } from '../../src/lib/terminology/unifiedDictionary';

describe('Phase P11.0: Unified Terminology Dictionary Composition (RED Phase)', () => {

  describe('1. Composition and Coverage Count', () => {
    it('composes LEXICON_REGISTRY (19) and SYSTEM_NODE_REGISTRY (208) to exactly 227 total entries', () => {
      const dict: TerminologyDictionary = createUnifiedTerminologyDictionary(
        LEXICON_REGISTRY,
        SYSTEM_NODE_REGISTRY
      );

      const allEntries = dict.listAll?.() ?? [];
      expect(allEntries.length).toBe(227);
    });

    it('ensures all 227 entries in the unified dictionary have unique IDs with 0 collisions', () => {
      const dict: TerminologyDictionary = createUnifiedTerminologyDictionary(
        LEXICON_REGISTRY,
        SYSTEM_NODE_REGISTRY
      );

      const allEntries = dict.listAll?.() ?? [];
      const idSet = new Set(allEntries.map((e) => e.id));
      expect(idSet.size).toBe(227);
    });

    it('preserves coexistence of both lex-* and sys-* entries for linked concepts', () => {
      const dict: TerminologyDictionary = createUnifiedTerminologyDictionary(
        LEXICON_REGISTRY,
        SYSTEM_NODE_REGISTRY
      );

      // Lexical concept for Qian
      const lexQian = dict.getEntry('lex-iching-qian');
      expect(lexQian).toBeDefined();
      expect(lexQian?.id).toBe('lex-iching-qian');

      // System node for Hexagram 01
      const sysQ01 = dict.getEntry('sys-iching-01');
      expect(sysQ01).toBeDefined();
      expect(sysQ01?.id).toBe('sys-iching-01');
      expect(sysQ01?.code).toBe('Q01');
    });
  });

  describe('2. Unified Search Behavior and Parity', () => {
    it('finds SystemNode by unique code (e.g. Q01, CET28, C01)', () => {
      const dict: TerminologyDictionary = createUnifiedTerminologyDictionary(
        LEXICON_REGISTRY,
        SYSTEM_NODE_REGISTRY
      );

      const q01Results = dict.search('Q01');
      expect(q01Results.some((e) => e.id === 'sys-iching-01')).toBe(true);

      const cet28Results = dict.search('CET28');
      expect(cet28Results.some((e) => e.id === 'sys-cetasika-28')).toBe(true);

      const c01Results = dict.search('C01');
      expect(c01Results.some((e) => e.id === 'sys-citta-01')).toBe(true);
    });

    it('searches adapted SystemNodes with normalized unaccented / NFD Unicode queries', () => {
      const dict: TerminologyDictionary = createUnifiedTerminologyDictionary(
        LEXICON_REGISTRY,
        SYSTEM_NODE_REGISTRY
      );

      // NFD Unicode decomposed search for I Ching
      const nfdQuery = 'thuần càn'.normalize('NFD');
      const nfdResults = dict.search(nfdQuery);
      expect(nfdResults.some((e) => e.id === 'sys-iching-01')).toBe(true);

      // Unaccented search for Cetasika
      const unaccentedResults = dict.search('tam so tin');
      expect(unaccentedResults.some((e) => e.id === 'sys-cetasika-28')).toBe(true);
    });

    it('returns both lexical root and system nodes when searching dual-linked terms (e.g. "Thuần Càn")', () => {
      const dict: TerminologyDictionary = createUnifiedTerminologyDictionary(
        LEXICON_REGISTRY,
        SYSTEM_NODE_REGISTRY
      );

      const results = dict.search('Thuần Càn');
      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results.some((e) => e.id === 'lex-iching-qian')).toBe(true);
      expect(results.some((e) => e.id === 'sys-iching-01')).toBe(true);
    });
  });

  describe('3. Singleton Instance Verification', () => {
    it('exports scholarUnifiedDictionary containing the complete academic catalog', () => {
      expect(scholarUnifiedDictionary).toBeDefined();
      expect(scholarUnifiedDictionary.listAll?.().length).toBe(241);
    });
  });
});
