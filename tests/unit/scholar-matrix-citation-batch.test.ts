import { describe, it, expect } from 'vitest';
import {
  exportMatrixRelationsToBibTeX,
  exportMatrixRelationsToCSL,
} from '../../src/lib/scholarCitation/batchMatrix';
import {
  canonicalMatrixRelationFixture,
  patthanaMatrixRelationFixture,
  stubMatrixRelationFixture,
  conjectureMatrixRelationFixture,
} from '../fixtures/scholar-citation-matrix-fixtures';

describe('Phase P8.2: Batch Matrix Relation Citation Export Engine', () => {
  it('1. Exports multiple valid MatrixRelations to a combined BibTeX string', () => {
    const bib = exportMatrixRelationsToBibTeX([
      canonicalMatrixRelationFixture,
      patthanaMatrixRelationFixture,
    ]);

    expect(bib).toContain('@misc{phat_hoc_rel_c01_cet01');
    expect(bib).toContain('@misc{phat_hoc_rel_p01_c01');
    expect(bib).toContain('Abhidhammattha-saṅgaha');
    expect(bib).toContain('Paṭṭhāna (Bộ Vị Trí)');
  });

  it('2. Exports multiple valid MatrixRelations to CSL JSON items array', () => {
    const cslItems = exportMatrixRelationsToCSL([
      canonicalMatrixRelationFixture,
      conjectureMatrixRelationFixture,
    ]);

    expect(cslItems.length).toBe(2);
    expect(cslItems[0]['container-title']).toBe('Abhidhammattha-saṅgaha');
    expect(cslItems[1]['container-title']).toBe('Đối Chiếu Đông Phương Học');
  });

  it('3. Safely omits blocked/stub relations with zero sources from batch outputs', () => {
    const bib = exportMatrixRelationsToBibTeX([
      canonicalMatrixRelationFixture,
      stubMatrixRelationFixture,
    ]);

    // Should only contain the canonical relation, not the stub
    expect(bib).toContain('Abhidhammattha-saṅgaha');
    expect(bib).not.toContain('rel_stub_01');

    const cslItems = exportMatrixRelationsToCSL([
      canonicalMatrixRelationFixture,
      stubMatrixRelationFixture,
    ]);
    expect(cslItems.length).toBe(1);
  });
});
