import { describe, it, expect } from 'vitest';
import {
  normalizeCitationLocator,
  isValidCitationProvenance,
  type NormalizedLocatorResult,
} from '../../src/lib/citationProvenanceValidator';
import type { FlashcardCitationProvenance } from '../../src/types/flashcard';

describe('flashcard-provenance-validation', () => {
  describe('normalizeCitationLocator', () => {
    it('should validate and preserve canonical EPUB CFI strings', () => {
      const result: NormalizedLocatorResult = normalizeCitationLocator(
        'epub',
        'epubcfi(/6/4[chap01]!/4/2/10)'
      );
      expect(result.isValid).toBe(true);
      expect(result.canonicalLocator).toBe('epubcfi(/6/4[chap01]!/4/2/10)');
      expect(result.format).toBe('epub');
    });

    it('should reject invalid EPUB CFI strings', () => {
      const result = normalizeCitationLocator('epub', 'invalid-cfi-string');
      expect(result.isValid).toBe(false);
      expect(result.errorReason).toBe('invalid_epub_cfi');
    });

    it('should normalize PDF page locators into page=<n> format', () => {
      const fromNumber = normalizeCitationLocator('pdf', '42');
      expect(fromNumber.isValid).toBe(true);
      expect(fromNumber.canonicalLocator).toBe('page=42');

      const fromPrefixed = normalizeCitationLocator('pdf', 'page=15');
      expect(fromPrefixed.isValid).toBe(true);
      expect(fromPrefixed.canonicalLocator).toBe('page=15');
    });

    it('should reject invalid PDF page numbers (zero, negative, or non-numeric)', () => {
      expect(normalizeCitationLocator('pdf', 'page=0').isValid).toBe(false);
      expect(normalizeCitationLocator('pdf', '-5').isValid).toBe(false);
      expect(normalizeCitationLocator('pdf', 'page=abc').isValid).toBe(false);
    });

    it('should normalize Markdown heading slugs by trimming and removing leading hashes', () => {
      const result = normalizeCitationLocator('md', '  ### Tong-Quan-Active-Recall  ');
      expect(result.isValid).toBe(true);
      expect(result.canonicalLocator).toBe('tong-quan-active-recall');
    });

    it('should treat empty or undefined locators as valid fallback to start of document', () => {
      expect(normalizeCitationLocator('epub', undefined).isValid).toBe(true);
      expect(normalizeCitationLocator('epub', undefined).canonicalLocator).toBeUndefined();

      expect(normalizeCitationLocator('pdf', '').isValid).toBe(true);
      expect(normalizeCitationLocator('pdf', '').canonicalLocator).toBeUndefined();

      expect(normalizeCitationLocator('md', '   ').isValid).toBe(true);
      expect(normalizeCitationLocator('md', '   ').canonicalLocator).toBeUndefined();
    });
  });

  describe('isValidCitationProvenance', () => {
    it('should return true for complete and valid provenance objects', () => {
      const validEpub: FlashcardCitationProvenance = {
        documentId: 'doc-123',
        documentTitle: 'Sách Học Tập Chủ Động',
        format: 'epub',
        locator: 'epubcfi(/6/4[ch1]!/4/2/8)',
        sourceUrl: 'docs/books/active-learning.epub',
        excerptText: 'Active recall là phương pháp học tập hiệu quả.',
        citationFormatted: 'Nguyễn Văn A (2026). Sách Học Tập Chủ Động, cfi: epubcfi(/6/4[ch1]!/4/2/8).',
      };
      expect(isValidCitationProvenance(validEpub)).toBe(true);
    });

    it('should return true when optional locator is omitted (document-level provenance)', () => {
      const validWithoutLocator: FlashcardCitationProvenance = {
        documentId: 'doc-pdf-456',
        documentTitle: 'Tài Liệu Nghiên Cứu PDF',
        format: 'pdf',
      };
      expect(isValidCitationProvenance(validWithoutLocator)).toBe(true);
    });

    it('should return false for invalid formats or missing required fields', () => {
      expect(isValidCitationProvenance(null)).toBe(false);
      expect(isValidCitationProvenance({})).toBe(false);

      // Missing documentTitle
      expect(
        isValidCitationProvenance({
          documentId: 'doc-1',
          format: 'md',
        })
      ).toBe(false);

      // Unsupported format alias
      expect(
        isValidCitationProvenance({
          documentId: 'doc-1',
          documentTitle: 'Tiêu đề',
          format: 'markdown', // should be 'md'
        })
      ).toBe(false);
    });
  });
});
