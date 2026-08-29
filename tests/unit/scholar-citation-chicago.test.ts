import { describe, it, expect } from 'vitest';
import { formatChicagoNotes } from '../../src/lib/scholarCitation/formatters/chicago';
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

describe('Phase C: Scholar Citation Chicago 17th Edition Notes Formatter', () => {
  it('1. Returns null for internal_note_only entries', () => {
    const vm = normalizeLexiconEntry(stubProvenanceFixture);
    const output = formatChicagoNotes(vm);
    expect(output).toBeNull();
  });

  it('2. Formats classical SystemNode using s.v. syntax', () => {
    const vm = normalizeSystemNode(classicalSystemNodeFixture);
    const output = formatChicagoNotes(vm);

    expect(output).toBe(
      '*Chu Dịch (Zhou Yi)*, Thoán Truyện & Tượng Truyện - Quẻ Càn, s.v. "Thuần Càn (Bát Thuần Càn)."'
    );
  });

  it('3. Formats canonical LexiconEntry with PTS note locator', () => {
    const vm = normalizeLexiconEntry(canonicalLexiconFixture);
    const output = formatChicagoNotes(vm);

    expect(output).toBe(
      '*Dhammasaṅgaṇī*, Mātika & Citta-uppāda-kaṇḍa § 1 (PTS: Dhs 1-9), s.v. "Citta (Tâm / Thức (Khả năng nhận biết cảnh))."'
    );
  });

  it('4. Formats canonical LexiconEntry with Taishō note locator', () => {
    const vm = normalizeLexiconEntry(taishoLexiconFixture);
    const output = formatChicagoNotes(vm);

    expect(output).toBe(
      '*Trung Luận (Mūlamadhyamakakārikā)*, Quán Nhân Duyên Phẩm § 1 (Taishō: T30n1564), s.v. "Mūlamadhyamakakārikā (Trung Luận (Trung Quán Luận))."'
    );
  });
});
