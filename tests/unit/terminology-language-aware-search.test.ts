import { describe, it, expect } from 'vitest';
import { scholarUnifiedDictionary } from '../../src/lib/terminology/unifiedDictionary';

describe('Phase P12.0: Language-aware Search & Deterministic Ranking (RED Phase)', () => {
  it('1. Searches by Sanskrit Devanagari script and retrieves the canonical concept', () => {
    // Search query with original Devanagari script
    const results = scholarUnifiedDictionary.search('चित्त');

    // Expected to FAIL until P12.2 adds Devanagari index tokens to search engine
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.id === 'lex-pali-citta')).toBe(true);
  });

  it('2. Prioritizes exact Hanzi character match over substring matches in commentary', () => {
    const results = scholarUnifiedDictionary.search('心');
    expect(results.length).toBeGreaterThan(0);

    // The primary lexical entry for "心" (Citta / Tâm) must be the first result
    const topResult = results[0];
    expect(topResult.id).toBe('lex-pali-citta');
    expect(topResult.aliases?.hanTu).toContain('心');
    const extTop = topResult as { languageProfiles?: Record<string, { surfaceForm: string }> };
    expect(extTop.languageProfiles?.['zh-Hant']?.surfaceForm).toBe('心');
  });

  it('3. Searches by academic English gloss and retrieves the corresponding Buddhist concept', () => {
    const results = scholarUnifiedDictionary.search('Mind / Consciousness');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.id === 'lex-pali-citta')).toBe(true);
  });

  it('4. Searches by Pinyin with tone marks and returns exact matched entry', () => {
    const results = scholarUnifiedDictionary.search('xīn');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.id === 'lex-pali-citta')).toBe(true);
  });
});
