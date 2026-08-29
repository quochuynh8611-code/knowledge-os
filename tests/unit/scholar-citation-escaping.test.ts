import { describe, it, expect } from 'vitest';
import { escapeBibTeX } from '../../src/lib/scholarCitation/escaping';

describe('Phase B: Scholar Citation BibTeX LaTeX Special Character Escaping Policy', () => {
  it('1. Escapes ampersand (&) -> \\&', () => {
    expect(escapeBibTeX('Chu Dịch & Hệ Từ Thượng')).toBe('Chu Dịch \\& Hệ Từ Thượng');
  });

  it('2. Escapes percent sign (%) -> \\%', () => {
    expect(escapeBibTeX('Tâm sở chiếm 100% phối hợp')).toBe('Tâm sở chiếm 100\\% phối hợp');
  });

  it('3. Escapes underscore (_) -> \\_', () => {
    expect(escapeBibTeX('Abhidhamma_Study_Guide')).toBe('Abhidhamma\\_Study\\_Guide');
  });

  it('4. Escapes hash (#) -> \\#', () => {
    expect(escapeBibTeX('Tập san số #12')).toBe('Tập san số \\#12');
  });

  it('5. Escapes braces ({ and }) -> \\{ and \\}', () => {
    expect(escapeBibTeX('Khái niệm {Paramattha}')).toBe('Khái niệm \\{Paramattha\\}');
  });

  it('6. Escapes tilde (~) and caret (^)', () => {
    const escaped = escapeBibTeX('Tương đương ~100% và ^2');
    expect(escaped).toContain('\\textasciitilde{}');
    expect(escaped).toContain('\\textasciicircum{}');
  });

  it('7. Preserves full Pāli, Sanskrit and Chinese Unicode glyphs without mangling', () => {
    const unicodeInput = 'Dhammasaṅgaṇī & Citta (चित्त / 心) — Dhammapada § 1';
    const escaped = escapeBibTeX(unicodeInput);
    expect(escaped).toContain('Dhammasaṅgaṇī');
    expect(escaped).toContain('चित्त');
    expect(escaped).toContain('心');
    expect(escaped).toContain('\\&');
  });
});
