import { describe, it, expect } from 'vitest';
import {
  normalizeLexiconEntry,
  normalizeSystemNode,
} from '../../src/lib/scholarCitation/normalizer';
import {
  canonicalLexiconFixture,
  classicalSystemNodeFixture,
  stubProvenanceFixture,
} from '../fixtures/scholar-citation-fixtures';

describe('Phase B: Scholar Citation Source Normalizer & Sufficiency Evaluator', () => {
  describe('normalizeLexiconEntry', () => {
    it('1. Maps canonical LexiconEntry to complete ScholarCitationViewModel with PTS ref', () => {
      const vm = normalizeLexiconEntry(canonicalLexiconFixture);

      expect(vm.citationKey).toBe('phat_hoc_lex_citta_dhammasangani_1');
      expect(vm.title).toBe('Citta (Tâm / Thức (Khả năng nhận biết cảnh))');
      expect(vm.canonicalTerm).toBe('Citta');
      expect(vm.domain).toBe('phat-hoc');
      expect(vm.sourceTitle).toBe('Dhammasaṅgaṇī');
      expect(vm.sectionRef).toBe('Mātika & Citta-uppāda-kaṇḍa § 1');
      expect(vm.ptsRef).toBe('Dhs 1-9');
      expect(vm.sufficiency).toBe('canonical_complete');
      expect(vm.cslType).toBe('entry-dictionary');
    });

    it('2. Classifies stub entry without sources as internal_note_only', () => {
      const vm = normalizeLexiconEntry(stubProvenanceFixture);

      expect(vm.sufficiency).toBe('internal_note_only');
      expect(vm.provenanceNote).toContain('Ghi chép thảo luận sơ bộ');
      expect(vm.sourceTitle).toBe('');
      expect(vm.sectionRef).toBe('');
    });
  });

  describe('normalizeSystemNode', () => {
    it('3. Maps classical anonymous SystemNode (I Ching) with correct fields and chapter CSL type', () => {
      const vm = normalizeSystemNode(classicalSystemNodeFixture);

      expect(vm.citationKey).toBe('huyen_hoc_sys_q01_chu_dich_can');
      expect(vm.title).toBe('Thuần Càn (Bát Thuần Càn)');
      expect(vm.canonicalTerm).toBe('Q01');
      expect(vm.domain).toBe('huyen-hoc');
      expect(vm.sourceTitle).toBe('Chu Dịch (Zhou Yi)');
      expect(vm.sectionRef).toBe('Thoán Truyện & Tượng Truyện - Quẻ Càn');
      expect(vm.sufficiency).toBe('canonical_minimal');
      expect(vm.cslType).toBe('chapter');
    });
  });
});
