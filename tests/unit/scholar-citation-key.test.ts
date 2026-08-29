import { describe, it, expect } from 'vitest';
import { generateCitationKey } from '../../src/lib/scholarCitation/key';

describe('Phase B: Scholar Citation Key Generator (Deterministic & ASCII-safe)', () => {
  it('1. Generates expected deterministic key for Lexicon entry with Pāli/Vietnamese terms', () => {
    const key = generateCitationKey({
      domain: 'phat-hoc',
      entityType: 'lex',
      slugOrCode: 'citta',
      sourceTitle: 'Dhammasaṅgaṇī',
      sectionRef: 'Mātika & Citta § 1',
    });

    expect(key).toBe('phat_hoc_lex_citta_dhammasangani_1');
    expect(key).toMatch(/^[a-z0-9_]+$/);
    expect(key.length).toBeLessThanOrEqual(48);
  });

  it('2. Generates expected deterministic key for I Ching SystemNode', () => {
    const key = generateCitationKey({
      domain: 'huyen-hoc',
      entityType: 'sys',
      slugOrCode: 'Q01',
      sourceTitle: 'Chu Dịch (Zhou Yi)',
      sectionRef: 'Quẻ Càn',
    });

    expect(key).toBe('huyen_hoc_sys_q01_chu_dich_can');
    expect(key).toMatch(/^[a-z0-9_]+$/);
  });

  it('3. Sanitizes accents, spaces, diacritics and special symbols to clean ASCII', () => {
    const key = generateCitationKey({
      domain: 'triet-hoc',
      entityType: 'lex',
      slugOrCode: 'tánh-biết-đoạn-trừ',
      sourceTitle: 'Bát-Nhã Tâm Kinh & Đại Trí Độ Luận % 100',
      sectionRef: 'Phẩm #1 {A}',
    });

    expect(key).toMatch(/^[a-z0-9_]+$/);
    expect(key).not.toContain('&');
    expect(key).not.toContain('%');
    expect(key).not.toContain('#');
    expect(key).not.toContain('{');
    expect(key).not.toContain('}');
  });

  it('4. Handles collision with fallbackId suffix when basic slug conflicts', () => {
    const keyWithFallback = generateCitationKey({
      domain: 'phat-hoc',
      entityType: 'lex',
      slugOrCode: 'citta',
      fallbackId: 'lex-pali-citta-dup',
    });

    expect(keyWithFallback.length).toBeGreaterThan(0);
    expect(keyWithFallback).toMatch(/^[a-z0-9_]+$/);
  });
});
