import { describe, it, expect } from 'vitest';
import { scholarUnifiedDictionary } from '../../src/lib/terminology/unifiedDictionary';

describe('Phase P12.0: Language Profiles & Transliteration Systems (RED Phase)', () => {
  it('1. Verifies that dictionary entries provide structured LanguageProfiles for multi-script representations', () => {
    const entry = scholarUnifiedDictionary.getEntry('lex-pali-citta');
    expect(entry).toBeDefined();

    // P12.0 capability: LanguageProfiles must be structured and accessible on TerminologyEntry
    // Expected to FAIL until P12.1 adds languageProfiles mapping
    const extEntry = entry as unknown as {
      languageProfiles?: Record<string, {
        language: string;
        script: string;
        surfaceForm: string;
        transliterations?: {
          iast?: string;
          pinyin?: string;
          hanViet?: string;
          devanagari?: string;
        };
        glosses?: {
          preferred: string;
          alternates?: readonly string[];
        };
      }>;
    };

    expect(extEntry.languageProfiles).toBeDefined();
    expect(extEntry.languageProfiles?.vi?.surfaceForm).toBe('Tâm');
    expect(extEntry.languageProfiles?.['zh-Hant']?.surfaceForm).toBe('心');
    expect(extEntry.languageProfiles?.['zh-Hant']?.transliterations?.pinyin).toBe('xīn');
    expect(extEntry.languageProfiles?.['zh-Hant']?.transliterations?.hanViet).toBe('Tâm');
    expect(extEntry.languageProfiles?.sa?.transliterations?.devanagari).toBe('चित्त');
    expect(extEntry.languageProfiles?.en?.glosses?.preferred).toBe('Mind / Consciousness');
  });

  it('2. Asserts that legacy aliases dictionary matches the projected language profiles', () => {
    const entry = scholarUnifiedDictionary.getEntry('lex-pali-citta');
    expect(entry).toBeDefined();

    // Existing legacy aliases must remain populated
    expect(entry?.aliases?.vietnamese).toBe('Tâm / Thức (Khả năng nhận biết cảnh)');
    expect(entry?.aliases?.hanTu).toBe('心 / 識');
    expect(entry?.aliases?.pinyin).toBe('Xīn / Shì');
    expect(entry?.aliases?.pali).toBe('Citta');
    expect(entry?.aliases?.english).toBe('Consciousness / Mind State');
  });

  it('3. Verifies Chinese entries contain Han-Viet and Pinyin with explicit phonetic systems', () => {
    const qianEntry = scholarUnifiedDictionary.getEntry('lex-iching-qian');
    expect(qianEntry).toBeDefined();

    const extQian = qianEntry as unknown as {
      languageProfiles?: Record<string, {
        transliterations?: {
          pinyin?: string;
          hanViet?: string;
          plainAscii?: string;
        };
      }>;
    };

    // Expected to FAIL until P12.1 implementation
    expect(extQian.languageProfiles?.['zh-Hant']?.transliterations?.hanViet).toBe('Càn');
    expect(extQian.languageProfiles?.['zh-Hant']?.transliterations?.pinyin).toBe('qián');
  });
});
