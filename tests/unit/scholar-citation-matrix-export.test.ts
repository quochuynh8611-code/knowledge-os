import { describe, it, expect } from 'vitest';
import { generateScholarCitations } from '../../src/lib/scholarCitation/generator';
import { formatBibTeX } from '../../src/lib/scholarCitation/formatters/bibtex';
import { formatCSLJSON } from '../../src/lib/scholarCitation/formatters/csl';
import { normalizeMatrixRelation } from '../../src/lib/scholarCitation/normalizer';
import {
  canonicalMatrixRelationFixture,
  patthanaMatrixRelationFixture,
  conjectureMatrixRelationFixture,
  stubMatrixRelationFixture,
} from '../fixtures/scholar-citation-matrix-fixtures';

describe('Phase P8.1: MatrixRelation BibTeX & CSL JSON Export Pipeline', () => {
  it('1. Formats valid BibTeX entry for canonical MatrixRelation with LaTeX escaping and Unicode preservation', () => {
    const vm = normalizeMatrixRelation(canonicalMatrixRelationFixture);
    const bib = formatBibTeX(vm);

    expect(bib).toContain('@misc{');
    expect(bib).toContain('title = {Tâm Tham');
    expect(bib).toContain('howpublished = {Abhidhammattha-saṅgaha}');
    expect(bib).toContain('note = {Phân đoạn: Chương 2: Cetasika-saṅgaha-vibhāga}');
  });

  it('2. Formats CSL JSON 1.0.2 item for Patthana relational citation', () => {
    const vm = normalizeMatrixRelation(patthanaMatrixRelationFixture);
    const csl = formatCSLJSON(vm);

    expect(csl).not.toBeNull();
    expect(csl?.type).toBe('chapter');
    expect(csl?.['container-title']).toBe('Paṭṭhāna (Bộ Vị Trí)');
    expect(csl?.section).toBe('Hetupaccaya-niddesa § 1');
    expect(csl?.number).toBe('Paṭṭh I 1');
  });

  it('3. Orchestrates generator correctly and returns isBlocked=false for valid relations', () => {
    const res = generateScholarCitations(canonicalMatrixRelationFixture);

    expect(res.isBlocked).toBe(false);
    expect(res.bibtex).toContain('@misc{');
    expect(res.csl).not.toBeNull();
    expect(res.cslJsonString).toContain('"container-title": "Abhidhammattha-saṅgaha"');
  });

  it('4. Blocks provenance-only stub relation in generator and returns null formatters', () => {
    const res = generateScholarCitations(stubMatrixRelationFixture);

    expect(res.isBlocked).toBe(true);
    expect(res.bibtex).toBeNull();
    expect(res.csl).toBeNull();
    expect(res.cslJsonString).toBeNull();
    expect(res.apa).toBeNull();
    expect(res.chicago).toBeNull();
    expect(res.mla).toBeNull();
    expect(res.harvard).toBeNull();
  });

  it('5. Preserves scholarly conjecture annotation in CSL and BibTeX outputs', () => {
    const res = generateScholarCitations(conjectureMatrixRelationFixture);

    expect(res.isBlocked).toBe(false);
    expect(res.bibtex).toContain('Đối Chiếu Đông Phương Học');
    expect(res.csl?.['container-title']).toBe('Đối Chiếu Đông Phương Học');
  });
});
