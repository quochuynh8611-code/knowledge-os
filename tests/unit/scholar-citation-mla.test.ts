import { describe, it, expect } from 'vitest';
import { formatMLA9 } from '../../src/lib/scholarCitation/formatters/mla';
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

describe('Phase C: Scholar Citation MLA 9th Edition Formatter', () => {
  it('1. Returns null for internal_note_only entries', () => {
    const vm = normalizeLexiconEntry(stubProvenanceFixture);
    const output = formatMLA9(vm);
    expect(output).toBeNull();
  });

  it('2. Formats classical anonymous SystemNode', () => {
    const vm = normalizeSystemNode(classicalSystemNodeFixture);
    const output = formatMLA9(vm);

    expect(output).toBe(
      '"Thuần Càn (Bát Thuần Càn)." *Chu Dịch (Zhou Yi)*, Thoán Truyện & Tượng Truyện - Quẻ Càn.'
    );
  });

  it('3. Formats canonical LexiconEntry with PTS locator', () => {
    const vm = normalizeLexiconEntry(canonicalLexiconFixture);
    const output = formatMLA9(vm);

    expect(output).toBe(
      '"Citta (Tâm / Thức (Khả năng nhận biết cảnh))." *Dhammasaṅgaṇī*, Mātika & Citta-uppāda-kaṇḍa § 1, PTS: Dhs 1-9.'
    );
  });

  it('4. Formats canonical LexiconEntry with Taishō locator', () => {
    const vm = normalizeLexiconEntry(taishoLexiconFixture);
    const output = formatMLA9(vm);

    expect(output).toBe(
      '"Mūlamadhyamakakārikā (Trung Luận (Trung Quán Luận))." *Trung Luận (Mūlamadhyamakakārikā)*, Quán Nhân Duyên Phẩm § 1, Taishō: T30n1564.'
    );
  });
});
