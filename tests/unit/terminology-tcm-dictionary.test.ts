import { describe, it, expect } from 'vitest';
import { scholarUnifiedDictionary } from '../../src/lib/terminology/unifiedDictionary';

describe('Phase P12.1: TCM Registry Integration & Unified Composition (RED Phase)', () => {
  it('1. Retrieves Acupoint entry "tcm-point-hegu" with full TCM metadata and language profiles', () => {
    // Expected to FAIL until P12.1 creates tcmRegistry and connects it to unifiedDictionary
    const entry = scholarUnifiedDictionary.getEntry('tcm-point-hegu');

    expect(entry).toBeDefined();
    expect(entry?.id).toBe('tcm-point-hegu');
    expect(entry?.domain).toBe('y-hoc-co-truyen');
    expect(entry?.sourceType).toBe('tcm_registry');
    expect(entry?.conceptId).toBe('concept:tcm:point:hegu');
    expect(entry?.canonicalTerm).toBe('Hợp Cốc');

    // Verify multilingual language profiles
    expect(entry?.languageProfiles?.vi?.surfaceForm).toBe('Hợp Cốc');
    expect(entry?.languageProfiles?.['zh-Hant']?.surfaceForm).toBe('合谷');
    expect(entry?.languageProfiles?.['zh-Hant']?.transliterations?.pinyin).toBe('hégǔ');
    expect(entry?.languageProfiles?.['zh-Hant']?.transliterations?.hanViet).toBe('Hợp Cốc');
    expect(entry?.languageProfiles?.en?.glosses?.preferred).toBe('Joining Valleys');

    // Verify TCM domain extension
    expect(entry?.tcmExtension?.category).toBe('kinh-huyet');
    expect(entry?.tcmExtension?.meridianCode).toBe('LI4');
  });

  it('2. Retrieves Herbal entry "tcm-herb-renshen" with Four Natures and Five Flavors', () => {
    const entry = scholarUnifiedDictionary.getEntry('tcm-herb-renshen');

    expect(entry).toBeDefined();
    expect(entry?.id).toBe('tcm-herb-renshen');
    expect(entry?.sourceType).toBe('tcm_registry');
    expect(entry?.tcmExtension?.category).toBe('duoc-tinh');
    expect(entry?.tcmExtension?.nature).toBeDefined();
    expect(entry?.tcmExtension?.flavor).toBeDefined();
    expect(entry?.tcmExtension?.channelTropism).toBeDefined();
    expect(entry?.tcmExtension?.primaryAction).toBeDefined();
  });

  it('3. Retrieves Zang-Fu entry "tcm-zangfu-xin" with Five Element association', () => {
    const entry = scholarUnifiedDictionary.getEntry('tcm-zangfu-xin');

    expect(entry).toBeDefined();
    expect(entry?.id).toBe('tcm-zangfu-xin');
    expect(entry?.sourceType).toBe('tcm_registry');
    expect(entry?.tcmExtension?.category).toBe('tang-tuong');
  });

  it('4. Searches TCM entries by Vietnamese, Hanzi, Pinyin, WHO code, and English gloss', () => {
    // Search by Vietnamese unaccented
    const viResults = scholarUnifiedDictionary.search('hop coc');
    expect(viResults.length).toBeGreaterThan(0);
    expect(viResults.some((r) => r.id === 'tcm-point-hegu')).toBe(true);

    // Search by Hanzi
    const hanResults = scholarUnifiedDictionary.search('合谷');
    expect(hanResults.length).toBeGreaterThan(0);
    expect(hanResults.some((r) => r.id === 'tcm-point-hegu')).toBe(true);

    // Search by WHO Code
    const whoResults = scholarUnifiedDictionary.search('LI4');
    expect(whoResults.length).toBeGreaterThan(0);
    expect(whoResults.some((r) => r.id === 'tcm-point-hegu')).toBe(true);

    // Search by Pinyin
    const pinyinResults = scholarUnifiedDictionary.search('renshen');
    expect(pinyinResults.length).toBeGreaterThan(0);
    expect(pinyinResults.some((r) => r.id === 'tcm-herb-renshen')).toBe(true);

    // Search by English
    const enResults = scholarUnifiedDictionary.search('Ginseng');
    expect(enResults.length).toBeGreaterThan(0);
    expect(enResults.some((r) => r.id === 'tcm-herb-renshen')).toBe(true);
  });

  it('5. Strictly preserves legacy Buddhist and I Ching entries without pollution', () => {
    const citta = scholarUnifiedDictionary.getEntry('lex-pali-citta');
    expect(citta).toBeDefined();
    expect(citta?.sourceType).toBe('lexicon');
    expect(citta?.domain).toBe('phat-hoc');
    expect(citta?.tcmExtension).toBeUndefined();

    const qian = scholarUnifiedDictionary.getEntry('sys-iching-01');
    expect(qian).toBeDefined();
    expect(qian?.sourceType).toBe('system_node');
    expect(qian?.domain).toBe('huyen-hoc');
    expect(qian?.tcmExtension).toBeUndefined();
  });
});
