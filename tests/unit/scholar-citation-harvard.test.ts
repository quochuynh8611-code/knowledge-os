import { describe, it, expect } from 'vitest';
import { formatHarvard } from '../../src/lib/scholarCitation/formatters/harvard';
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

describe('Phase C: Scholar Citation Harvard Style Formatter', () => {
  it('1. Returns null for internal_note_only entries', () => {
    const vm = normalizeLexiconEntry(stubProvenanceFixture);
    const output = formatHarvard(vm);
    expect(output).toBeNull();
  });

  it('2. Formats classical anonymous SystemNode with (no date)', () => {
    const vm = normalizeSystemNode(classicalSystemNodeFixture);
    const output = formatHarvard(vm);

    expect(output).toBe(
      "Chu Dịch (Zhou Yi) (no date) 'Thuần Càn (Bát Thuần Càn)', Thoán Truyện & Tượng Truyện - Quẻ Càn."
    );
  });

  it('3. Formats canonical LexiconEntry with PTS locator', () => {
    const vm = normalizeLexiconEntry(canonicalLexiconFixture);
    const output = formatHarvard(vm);

    expect(output).toBe(
      "Dhammasaṅgaṇī (no date) 'Citta (Tâm / Thức (Khả năng nhận biết cảnh))', Mātika & Citta-uppāda-kaṇḍa § 1 (PTS: Dhs 1-9)."
    );
  });

  it('4. Formats canonical LexiconEntry with Taishō locator', () => {
    const vm = normalizeLexiconEntry(taishoLexiconFixture);
    const output = formatHarvard(vm);

    expect(output).toBe(
      "Trung Luận (Mūlamadhyamakakārikā) (no date) 'Mūlamadhyamakakārikā (Trung Luận (Trung Quán Luận))', Quán Nhân Duyên Phẩm § 1 (Taishō: T30n1564)."
    );
  });
});
