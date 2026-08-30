import { describe, it, expect } from 'vitest';
import { scholarUnifiedDictionary } from '../../src/lib/terminology/unifiedDictionary';

describe('Phase P12.0: Multilingual Concept Identity & Source Separation (RED Phase)', () => {
  it('1. Verifies that dictionary entries expose semantic conceptId and sourceType', () => {
    const lexCitta = scholarUnifiedDictionary.getEntry('lex-pali-citta');
    expect(lexCitta).toBeDefined();

    // P12.0 capability: Each entry must have semantic conceptId and sourceType
    // Expected to FAIL until P12.1 implementation enriches mapped entries
    const extendedLex = lexCitta as unknown as Record<string, unknown>;
    expect(extendedLex.conceptId).toBe('concept:buddhism:citta');
    expect(extendedLex.sourceType).toBe('lexicon');
  });

  it('2. Preserves distinct physical identity and sourceType for dual-linked concepts', () => {
    const lexQian = scholarUnifiedDictionary.getEntry('lex-iching-qian');
    const sysQ01 = scholarUnifiedDictionary.getEntry('sys-iching-01');

    expect(lexQian).toBeDefined();
    expect(sysQ01).toBeDefined();

    // They must share semantic concept or domain link while maintaining separate source identity
    const extLexQian = lexQian as unknown as Record<string, unknown>;
    const extSysQ01 = sysQ01 as unknown as Record<string, unknown>;

    expect(extLexQian.sourceType).toBe('lexicon');
    expect(extSysQ01.sourceType).toBe('system_node');
    expect(sysQ01?.code).toBe('Q01');
    expect(extLexQian.id).not.toBe(extSysQ01.id);
  });

  it('3. Guarantees TCM domain extension is strictly isolated to TCM entries', () => {
    const buddhistEntry = scholarUnifiedDictionary.getEntry('lex-pali-citta');
    expect(buddhistEntry).toBeDefined();

    const extBuddhist = buddhistEntry as unknown as Record<string, unknown>;
    // Non-TCM entries must never have tcmExtension
    expect(extBuddhist.tcmExtension).toBeUndefined();
  });
});
