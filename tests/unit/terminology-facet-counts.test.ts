import { describe, it, expect } from 'vitest';
import * as selectors from '../../src/lib/scholarSuite/selectors';

describe('Phase P12.2 Wave 3: Terminology Multi-Facet Counting & Filtering Selectors', () => {
  it('1. Computes exact dynamic facet counts across all orthogonal layers without search query', () => {
    const counts = selectors.getTerminologyFacetCounts();

    expect(counts).toBeDefined();
    expect(counts.total).toBe(241);

    // Domain breakdown (154 Buddhist + 73 I Ching/Qi Men + 14 TCM = 241)
    expect(counts.byDomain['phat-hoc']).toBe(154);
    expect(counts.byDomain['huyen-hoc']).toBe(73);
    expect(counts.byDomain['y-hoc-co-truyen']).toBe(14);

    // Source Type breakdown (19 Lexicon + 208 System Nodes + 14 TCM = 241)
    expect(counts.bySourceType['lexicon']).toBe(19);
    expect(counts.bySourceType['system_node']).toBe(208);
    expect(counts.bySourceType['tcm_registry']).toBe(14);

    // TCM Subcategory breakdown (5 Acupoints + 5 Zang-Fu + 4 Herbs = 14)
    expect(counts.byTcmCategory['kinh-huyet']).toBe(5);
    expect(counts.byTcmCategory['tang-tuong']).toBe(5);
    expect(counts.byTcmCategory['duoc-tinh']).toBe(4);
  });

  it('2. Filters terminology entries strictly by domain "y-hoc-co-truyen"', () => {
    const tcmEntries = selectors.getTerminologyEntries({ domain: 'y-hoc-co-truyen' });
    expect(tcmEntries.length).toBe(14);
    expect(tcmEntries.every((e) => e.domain === 'y-hoc-co-truyen')).toBe(true);
    expect(tcmEntries.every((e) => e.sourceType === 'tcm_registry')).toBe(true);
  });

  it('3. Filters terminology entries strictly by sourceType "lexicon"', () => {
    const lexiconEntries = selectors.getTerminologyEntries({ sourceType: 'lexicon' });
    expect(lexiconEntries.length).toBe(19);
    expect(lexiconEntries.every((e) => e.sourceType === 'lexicon')).toBe(true);
  });

  it('4. Filters terminology entries strictly by tcmCategory "kinh-huyet"', () => {
    const acupoints = selectors.getTerminologyEntries({ tcmCategory: 'kinh-huyet' });
    expect(acupoints.length).toBe(5);
    expect(acupoints.every((e) => e.tcmExtension?.category === 'kinh-huyet')).toBe(true);
    expect(acupoints.map((e) => e.id)).toEqual([
      'tcm-point-hegu',
      'tcm-point-zusanli',
      'tcm-point-baihui',
      'tcm-point-neiguan',
      'tcm-point-sanyinjiao',
    ]);
  });

  it('5. Combines search query with domain filter using AND intersection', () => {
    // Search "Tâm Tạng" in TCM domain -> returns only Heart Organ (tcm-zangfu-xin)
    const tcmResults = selectors.getTerminologyEntries({
      query: 'Tâm Tạng',
      domain: 'y-hoc-co-truyen',
    });
    expect(tcmResults.length).toBe(1);
    expect(tcmResults[0].id).toBe('tcm-zangfu-xin');

    // Search "Citta" in Buddhist domain -> top result must be Citta lexical entry (lex-pali-citta)
    const buddhistResults = selectors.getTerminologyEntries({
      query: 'Citta',
      domain: 'phat-hoc',
    });
    expect(buddhistResults.length).toBeGreaterThanOrEqual(1);
    expect(buddhistResults[0].id).toBe('lex-pali-citta');
  });

  it('6. Recomputes search-scoped facet counts when a query is provided', () => {
    const counts = selectors.getTerminologyFacetCounts('Hợp Cốc');
    expect(counts.total).toBeGreaterThan(0);
    expect(counts.byDomain['y-hoc-co-truyen']).toBeGreaterThanOrEqual(1);
    expect(counts.byTcmCategory['kinh-huyet']).toBeGreaterThanOrEqual(1);
  });
});
