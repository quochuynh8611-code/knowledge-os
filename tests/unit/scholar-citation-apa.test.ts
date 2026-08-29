import { describe, it, expect } from 'vitest';
import { formatAPA7 } from '../../src/lib/scholarCitation/formatters/apa';
import {
  normalizeLexiconEntry,
  normalizeSystemNode,
} from '../../src/lib/scholarCitation/normalizer';
import {
  canonicalLexiconFixture,
  classicalSystemNodeFixture,
  stubProvenanceFixture,
  taishoLexiconFixture,
} from '../fixtures/scholar-citation-fixtures';

describe('Phase C: Scholar Citation APA 7th Edition Formatter', () => {
  it('1. Returns null for internal_note_only entries to prevent Scholarly False Confidence', () => {
    const vm = normalizeLexiconEntry(stubProvenanceFixture);
    const output = formatAPA7(vm);
    expect(output).toBeNull();
  });

  it('2. Formats classical anonymous SystemNode (I Ching) with (n.d.) fallback', () => {
    const vm = normalizeSystemNode(classicalSystemNodeFixture);
    const output = formatAPA7(vm);

    expect(output).toBe('Chu Dịch (Zhou Yi). (n.d.). Thuần Càn (Bát Thuần Càn) [Thoán Truyện & Tượng Truyện - Quẻ Càn].');
  });

  it('3. Formats canonical LexiconEntry enriched with PTS reference and preserved Unicode', () => {
    const vm = normalizeLexiconEntry(canonicalLexiconFixture);
    const output = formatAPA7(vm);

    expect(output).toBe(
      'Dhammasaṅgaṇī. (n.d.). Citta (Tâm / Thức (Khả năng nhận biết cảnh)) (PTS: Dhs 1-9, Mātika & Citta-uppāda-kaṇḍa § 1).'
    );
    expect(output).toContain('Dhammasaṅgaṇī');
    expect(output).toContain('ā');
    expect(output).toContain('ī');
  });

  it('4. Formats canonical LexiconEntry enriched with Taishō reference', () => {
    const vm = normalizeLexiconEntry(taishoLexiconFixture);
    const output = formatAPA7(vm);

    expect(output).toBe(
      'Trung Luận (Mūlamadhyamakakārikā). (n.d.). Mūlamadhyamakakārikā (Trung Luận (Trung Quán Luận)) (Taishō: T30n1564, Quán Nhân Duyên Phẩm § 1).'
    );
  });
});
