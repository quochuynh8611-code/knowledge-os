import { describe, it, expect } from 'vitest';
import { normalizeTerminologyEntry } from '../../src/lib/scholarCitation/normalizer';
import type { TerminologyEntry } from '../../src/types/terminology';

describe('Phase P9.1: Terminology Citation Normalizer Bridge', () => {
  it('1. Normalizes standard canonical TerminologyEntry into complete citation view model', () => {
    const entry: TerminologyEntry = {
      id: 'term-citta',
      title: 'Citta (Tâm / Thức)',
      domain: 'phat-hoc',
      code: 'citta-01',
      canonicalTerm: 'Citta',
      sources: [
        {
          sourceTitle: 'Dhammasaṅgaṇī',
          sectionRef: 'Mātika & Citta-uppāda-kaṇḍa § 1',
          ptsRef: 'Dhs 1-9',
        },
      ],
    };

    const vm = normalizeTerminologyEntry(entry);

    expect(vm.title).toBe('Citta (Tâm / Thức)');
    expect(vm.canonicalTerm).toBe('Citta');
    expect(vm.domain).toBe('phat-hoc');
    expect(vm.sourceTitle).toBe('Dhammasaṅgaṇī');
    expect(vm.sectionRef).toBe('Mātika & Citta-uppāda-kaṇḍa § 1');
    expect(vm.ptsRef).toBe('Dhs 1-9');
    expect(vm.sufficiency).toBe('canonical_complete');
    expect(vm.cslType).toBe('entry-dictionary');
    expect(vm.citationKey).toBe('phat_hoc_term_citta_01_dhammasangani_1');
  });

  it('2. Supports arbitrary custom knowledge domains outside core domains', () => {
    const customEntry: TerminologyEntry = {
      id: 'term-khi-huyet',
      title: 'Khí Huyết (Qi and Blood)',
      domain: 'y-hoc-co-truyen',
      code: 'yhoc-01',
      sources: [
        {
          sourceTitle: 'Hoàng Đế Nội Kinh - Tố Vấn',
          sectionRef: 'Thiên 1 - Thượng Cổ Thiên Chân Luận',
          standardEdition: 'NXB Y Học 2005',
        },
      ],
    };

    const vm = normalizeTerminologyEntry(customEntry);

    expect(vm.domain).toBe('y-hoc-co-truyen');
    expect(vm.sufficiency).toBe('canonical_complete');
    expect(vm.citationKey).toContain('y_hoc_co_truyen');
  });

  it('3. Classifies stub terminology entry without sources as internal_note_only', () => {
    const stubEntry: TerminologyEntry = {
      id: 'term-draft',
      title: 'Draft Terminology Concept',
      domain: 'triet-hoc',
      provenanceNote: 'Ghi chú phác thảo sơ bộ chưa qua thẩm định nguồn',
    };

    const vm = normalizeTerminologyEntry(stubEntry);

    expect(vm.sufficiency).toBe('internal_note_only');
    expect(vm.citationKey).toBe('');
    expect(vm.provenanceNote).toContain('Ghi chú phác thảo');
    expect(vm.sourceTitle).toBe('');
    expect(vm.sectionRef).toBe('');
  });

  it('4. Respects custom options for cslType and entityType', () => {
    const chapterEntry: TerminologyEntry = {
      id: 'term-chapter',
      title: 'Chu Dịch - Thoán Từ Càn',
      domain: 'huyen-hoc',
      code: 'Q01',
      sources: [
        {
          sourceTitle: 'Chu Dịch (Zhou Yi)',
          sectionRef: 'Thoán Truyện - Quẻ Càn',
        },
      ],
    };

    const vm = normalizeTerminologyEntry(chapterEntry, {
      cslType: 'chapter',
      entityType: 'sys',
    });

    expect(vm.cslType).toBe('chapter');
    expect(vm.citationKey).toBe('huyen_hoc_sys_q01_chu_dich_can');
    expect(vm.sufficiency).toBe('canonical_minimal');
  });
});
