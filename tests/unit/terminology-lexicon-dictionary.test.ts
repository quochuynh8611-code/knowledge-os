import { describe, it, expect } from 'vitest';
import {
  mapLexiconEntryToTerminology,
  createLexiconDictionary,
  scholarLexiconDictionary,
} from '../../src/lib/terminology/lexiconDictionary';
import { LEXICON_REGISTRY } from '../../src/data/scholarSuite/lexiconRegistry';
import { canonicalLexiconFixture } from '../fixtures/scholar-citation-fixtures';

describe('Phase P9.2: Read-Only Terminology Dictionary Adapter for Lexicon Registry', () => {
  describe('mapLexiconEntryToTerminology', () => {
    it('1. Maps LexiconEntry to TerminologyEntry with 100% multilingual alias preservation', () => {
      const entry = mapLexiconEntryToTerminology(canonicalLexiconFixture);

      expect(entry.id).toBe('lex-pali-citta');
      expect(entry.title).toBe('Citta (Tâm / Thức (Khả năng nhận biết cảnh))');
      expect(entry.domain).toBe('phat-hoc');
      expect(entry.code).toBe('citta');
      expect(entry.canonicalTerm).toBe('Citta');
      expect(entry.summary).toContain('Thực tại tối hậu có đặc tính thuần túy');


      // Verify all multilingual aliases are preserved
      expect(entry.aliases?.vietnamese).toBe('Tâm / Thức (Khả năng nhận biết cảnh)');
      expect(entry.aliases?.pali).toBe('Citta');
      expect(entry.aliases?.sanskrit).toBe('Citta (चित्त)');
      expect(entry.aliases?.hanTu).toBe('心 / 識');
      expect(entry.aliases?.pinyin).toBe('Xīn / Shì');
      expect(entry.aliases?.english).toBe('Consciousness / Mind State');

      // Verify sources preservation
      expect(entry.sources).toHaveLength(2);
      expect(entry.sources?.[0].sourceTitle).toBe('Dhammasaṅgaṇī');
      expect(entry.sources?.[0].ptsRef).toBe('Dhs 1-9');
    });

    it('2. Preserves etymology (root, morphology, literalMeaning) on TerminologyEntry', () => {
      const rawCitta = LEXICON_REGISTRY.find((e) => e.id === 'lex-pali-citta')!;
      const entry = mapLexiconEntryToTerminology(rawCitta);

      expect(entry.etymology).toBeDefined();
      expect(entry.etymology?.root).toContain('nhận thức');
      expect(entry.etymology?.literalMeaning).toContain('tích lũy');
    });
  });


  describe('TerminologyDictionary implementation', () => {
    it('3. Retrieves entries by ID through getEntry(id)', () => {
      const dict = createLexiconDictionary(LEXICON_REGISTRY);

      const citta = dict.getEntry('lex-pali-citta');
      expect(citta).toBeDefined();
      expect(citta?.title).toContain('Citta');
      expect(citta?.domain).toBe('phat-hoc');

      const nonExistent = dict.getEntry('lex-unknown-404');
      expect(nonExistent).toBeUndefined();
    });

    it('4. Searches entries deterministically across title, summary, aliases, and code', () => {
      const dict = createLexiconDictionary(LEXICON_REGISTRY);

      // Search by English alias
      const consciousnessResults = dict.search('Consciousness');
      expect(consciousnessResults.length).toBeGreaterThan(0);
      expect(consciousnessResults.some((e) => e.id === 'lex-pali-citta')).toBe(true);

      // Search by HanTu alias
      const hanTuResults = dict.search('心');
      expect(hanTuResults.length).toBeGreaterThan(0);
      expect(hanTuResults.some((e) => e.id === 'lex-pali-citta')).toBe(true);

      // Search by keyword in summary
      const paramatthaResults = dict.search('Paramattha');
      expect(paramatthaResults.length).toBeGreaterThan(0);
    });

    it('5. Searches entries across etymology root (e.g., "nhận thức") and matches Citta', () => {
      const dict = createLexiconDictionary(LEXICON_REGISTRY);

      const rootResults = dict.search('nhận thức');
      expect(rootResults.length).toBeGreaterThan(0);
      expect(rootResults.some((e) => e.id === 'lex-pali-citta')).toBe(true);
    });

    it('6. Searches entries across etymology literalMeaning (e.g., "tích lũy") and matches Citta', () => {
      const dict = createLexiconDictionary(LEXICON_REGISTRY);

      const literalResults = dict.search('tích lũy');
      expect(literalResults.length).toBeGreaterThan(0);
      expect(literalResults.some((e) => e.id === 'lex-pali-citta')).toBe(true);
    });

    it('7. Searches with NFD decomposed Unicode input (macOS IME format) and matches Citta', () => {
      const dict = createLexiconDictionary(LEXICON_REGISTRY);

      const nfdQuery = 'nhận thức'.normalize('NFD');
      const nfdResults = dict.search(nfdQuery);
      expect(nfdResults.length).toBeGreaterThan(0);
      expect(nfdResults.some((e) => e.id === 'lex-pali-citta')).toBe(true);
    });

    it('8. Searches with unaccented Vietnamese query (e.g. "nhan thuc") and matches Citta', () => {
      const dict = createLexiconDictionary(LEXICON_REGISTRY);

      const unaccentedResults = dict.search('nhan thuc');
      expect(unaccentedResults.length).toBeGreaterThan(0);
      expect(unaccentedResults.some((e) => e.id === 'lex-pali-citta')).toBe(true);
    });

    it('9. Searches with title-case NFD query "Nhận Thức" and matches Citta', () => {
      const dict = createLexiconDictionary(LEXICON_REGISTRY);

      const titleCaseNfd = 'Nhận Thức'.normalize('NFD');
      const results = dict.search(titleCaseNfd);
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((e) => e.id === 'lex-pali-citta')).toBe(true);
    });

    it('10. Searches with IAST diacritics folding (e.g. "sobhana" matching "Sobhana / Śobhana")', () => {
      const dict = createLexiconDictionary(LEXICON_REGISTRY);

      const iastResults = dict.search('sobhana');
      expect(iastResults.length).toBeGreaterThan(0);
      expect(iastResults.some((e) => e.id === 'lex-pali-sobhana')).toBe(true);
    });

    it('11. Lists all mapped entries without mutating the source registry', () => {
      const originalCount = LEXICON_REGISTRY.length;
      const allEntries = scholarLexiconDictionary.listAll?.();

      expect(allEntries).toBeDefined();
      expect(allEntries?.length).toBe(originalCount);
      expect(LEXICON_REGISTRY.length).toBe(originalCount);
    });

    it('12. Regression Guard: Standalone Lexicon Dictionary maintains exact 19-entry boundary', () => {
      const standaloneDict = createLexiconDictionary(LEXICON_REGISTRY);
      expect(standaloneDict.listAll?.().length).toBe(19);
      expect(standaloneDict.getEntry('lex-pali-citta')).toBeDefined();
      // Standalone lexicon dictionary should not contain system nodes
      expect(standaloneDict.getEntry('sys-iching-01')).toBeUndefined();
    });
  });
});
