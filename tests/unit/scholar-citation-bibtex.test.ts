import { describe, it, expect } from 'vitest';
import { formatBibTeX } from '../../src/lib/scholarCitation/formatters/bibtex';
import {
  normalizeLexiconEntry,
  normalizeSystemNode,
} from '../../src/lib/scholarCitation/normalizer';
import {
  canonicalLexiconFixture,
  classicalSystemNodeFixture,
  stubProvenanceFixture,
  specialCharsNodeFixture,
} from '../fixtures/scholar-citation-fixtures';

describe('Phase B: Scholar Citation BibTeX Formatter Pure Engine', () => {
  it('1. Returns null for internal_note_only entries to prevent Scholarly False Confidence', () => {
    const vm = normalizeLexiconEntry(stubProvenanceFixture);
    const output = formatBibTeX(vm);

    expect(output).toBeNull();
  });

  it('2. Formats canonical LexiconEntry into valid @misc BibTeX with PTS note and preserved Unicode', () => {
    const vm = normalizeLexiconEntry(canonicalLexiconFixture);
    const bibtex = formatBibTeX(vm);

    expect(bibtex).not.toBeNull();
    expect(bibtex).toContain('@misc{phat_hoc_lex_citta_dhammasangani_1,');
    expect(bibtex).toContain('title = {Citta (Tâm / Thức (Khả năng nhận biết cảnh))}');
    expect(bibtex).toContain('howpublished = {Dhammasaṅgaṇī}');
    expect(bibtex).toContain('note = {PTS: Dhs 1-9; Phân đoạn: Mātika \\& Citta-uppāda-kaṇḍa § 1}');
  });

  it('3. Formats classical SystemNode with escaped special characters', () => {
    const vm = normalizeSystemNode(specialCharsNodeFixture);
    const bibtex = formatBibTeX(vm);

    expect(bibtex).not.toBeNull();
    expect(bibtex).toContain('Chu Dịch \\& Hệ Từ Thượng');
    expect(bibtex).toContain('100\\%');
    expect(bibtex).toContain('\\#1');
  });
});
