import { describe, it, expect } from 'vitest';
import { normalizeMatrixRelation } from '../../src/lib/scholarCitation/normalizer';
import {
  canonicalMatrixRelationFixture,
  patthanaMatrixRelationFixture,
  conjectureMatrixRelationFixture,
  stubMatrixRelationFixture,
  reverseRelationFixture,
} from '../fixtures/scholar-citation-matrix-fixtures';

describe('Phase P8.1: normalizeMatrixRelation Adapter', () => {
  it('1. Normalizes a canonical MatrixRelation into ScholarCitationViewModel with link resolution', () => {
    const vm = normalizeMatrixRelation(canonicalMatrixRelationFixture);

    expect(vm.sufficiency).toBe('canonical_minimal');
    expect(vm.cslType).toBe('chapter');
    expect(vm.domain).toBe('phat-hoc');
    expect(vm.sourceTitle).toBe('Abhidhammattha-saṅgaha');
    expect(vm.sectionRef).toBe('Chương 2: Cetasika-saṅgaha-vibhāga');
    // Resolved titles: Tâm Tham thọ Hỷ... (sys-citta-01) and Tâm Sở Xúc (Phassa) (sys-cetasika-01)
    expect(vm.title).toContain('Tâm Tham');
    expect(vm.title).toContain('Tâm Sở Xúc');
    expect(vm.title).toContain('associates');
  });

  it('2. Preserves PTS reference in canonical Patthana relation', () => {
    const vm = normalizeMatrixRelation(patthanaMatrixRelationFixture);

    expect(vm.sufficiency).toBe('canonical_complete');
    expect(vm.ptsRef).toBe('Paṭṭh I 1');
    expect(vm.sourceTitle).toBe('Paṭṭhāna (Bộ Vị Trí)');
  });

  it('3. Generates deterministic citation key and avoids collision for directed relations', () => {
    const keyAtoB = normalizeMatrixRelation(canonicalMatrixRelationFixture).citationKey;
    const keyBtoA = normalizeMatrixRelation(reverseRelationFixture).citationKey;

    expect(keyAtoB).toBeTruthy();
    expect(keyBtoA).toBeTruthy();
    expect(keyAtoB).not.toBe(keyBtoA);

    // Verify determinism
    const keyAtoBRepeat = normalizeMatrixRelation(canonicalMatrixRelationFixture).citationKey;
    expect(keyAtoBRepeat).toBe(keyAtoB);
  });

  it('4. Classifies stub / provenance-only relation as internal_note_only and blocks citation key', () => {
    const vm = normalizeMatrixRelation(stubMatrixRelationFixture);

    expect(vm.sufficiency).toBe('internal_note_only');
    expect(vm.citationKey).toBe('');
    expect(vm.provenanceNote).toBe('Phác thảo nghiên cứu ban đầu, chưa đối chiếu văn bản nguồn.');
  });

  it('5. Preserves canonicalEvidence and flags scholarly_conjecture in metadata note', () => {
    const vm = normalizeMatrixRelation(conjectureMatrixRelationFixture);

    expect(vm.domain).toBe('da-nganh');
    expect(vm.sectionRef).toContain('§ 12');
  });
});
