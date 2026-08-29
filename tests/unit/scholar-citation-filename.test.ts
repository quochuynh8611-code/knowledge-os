import { describe, it, expect } from 'vitest';
import {
  sanitizeCitationFilename,
  getScholarCitationSingleFilename,
  getScholarCitationBatchFilename,
} from '../../src/lib/scholarCitation/filename';

describe('Phase P8.4: Scholar Citation Filename Helper', () => {
  describe('sanitizeCitationFilename', () => {
    it('1. Strips diacritics and replaces whitespace with underscores', () => {
      const raw = 'Kāmāvacara Kusala Citta';
      const sanitized = sanitizeCitationFilename(raw);
      expect(sanitized).toBe('kamavacara_kusala_citta');
    });

    it('2. Strips dangerous filesystem characters and path traversal patterns', () => {
      const raw = '../../etc/passwd: *special? <test> | "quotes"';
      const sanitized = sanitizeCitationFilename(raw);
      expect(sanitized).toBe('etc_passwd_special_test_quotes');
    });

    it('3. Falls back to default fallback when input is empty or contains only symbols', () => {
      expect(sanitizeCitationFilename('')).toBe('citation');
      expect(sanitizeCitationFilename('   ')).toBe('citation');
      expect(sanitizeCitationFilename('???///', 'default_name')).toBe('default_name');
    });
  });

  describe('getScholarCitationSingleFilename', () => {
    it('4. Produces deterministic filename for BibTeX and JSON formats', () => {
      expect(getScholarCitationSingleFilename('lexicon:kusala:2026', 'bib')).toBe('lexicon_kusala_2026.bib');
      expect(getScholarCitationSingleFilename('node:citta-01', 'json')).toBe('node_citta-01.json');
    });
  });

  describe('getScholarCitationBatchFilename', () => {
    it('5. Generates standardized batch export filenames with prefixes', () => {
      expect(getScholarCitationBatchFilename('Akusala Citta', 'bib')).toBe('matrix_relations_akusala_citta.bib');
      expect(getScholarCitationBatchFilename('Hexagram 01', 'json')).toBe('matrix_relations_hexagram_01.json');
    });
  });
});
