import { describe, it, expect } from 'vitest';
import { formatCSLJSON } from '../../src/lib/scholarCitation/formatters/csl';
import {
  normalizeLexiconEntry,
  normalizeSystemNode,
} from '../../src/lib/scholarCitation/normalizer';
import {
  canonicalLexiconFixture,
  classicalSystemNodeFixture,
  stubProvenanceFixture,
} from '../fixtures/scholar-citation-fixtures';

describe('Phase B: Scholar Citation CSL 1.0.2 JSON Formatter Pure Engine', () => {
  it('1. Returns null for internal_note_only entries', () => {
    const vm = normalizeLexiconEntry(stubProvenanceFixture);
    const csl = formatCSLJSON(vm);

    expect(csl).toBeNull();
  });

  it('2. Formats LexiconEntry into valid CSL JSON entry-dictionary object', () => {
    const vm = normalizeLexiconEntry(canonicalLexiconFixture);
    const csl = formatCSLJSON(vm);

    expect(csl).not.toBeNull();
    expect(csl).toMatchObject({
      id: 'phat_hoc_lex_citta_dhammasangani_1',
      type: 'entry-dictionary',
      title: 'Citta (Tâm / Thức (Khả năng nhận biết cảnh))',
      'container-title': 'Dhammasaṅgaṇī',
      section: 'Mātika & Citta-uppāda-kaṇḍa § 1',
      number: 'Dhs 1-9',
    });

    // Validates that it serializes to valid JSON
    expect(() => JSON.stringify(csl)).not.toThrow();
  });

  it('3. Formats SystemNode into valid CSL JSON chapter object', () => {
    const vm = normalizeSystemNode(classicalSystemNodeFixture);
    const csl = formatCSLJSON(vm);

    expect(csl).not.toBeNull();
    expect(csl).toMatchObject({
      id: 'huyen_hoc_sys_q01_chu_dich_can',
      type: 'chapter',
      title: 'Thuần Càn (Bát Thuần Càn)',
      'container-title': 'Chu Dịch (Zhou Yi)',
      section: 'Thoán Truyện & Tượng Truyện - Quẻ Càn',
    });
  });
});
