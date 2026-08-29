import { describe, it, expect } from 'vitest';
import type {
  CoreKnowledgeDomain,
  KnowledgeDomain,
  TerminologySource,
  TerminologyEntry,
  TerminologyDictionary,
} from '../../src/types/terminology';

describe('Phase P9.0: Universal Terminology Contract', () => {
  it('1. Supports core knowledge domains and custom domain strings', () => {
    const coreDomain: KnowledgeDomain = 'phat-hoc';
    const crossDomain: KnowledgeDomain = 'da-nganh';
    const futureDomain: KnowledgeDomain = 'y-hoc-co-truyen';
    const westernPhilosophyDomain: KnowledgeDomain = 'western-philosophy';

    expect(coreDomain).toBe('phat-hoc');
    expect(crossDomain).toBe('da-nganh');
    expect(futureDomain).toBe('y-hoc-co-truyen');
    expect(westernPhilosophyDomain).toBe('western-philosophy');
  });

  it('2. Supports classical canon locators and modern digital identifiers (DOI/URL)', () => {
    const source: TerminologySource = {
      sourceTitle: 'Visuddhimagga (Thanh Tịnh Đạo)',
      sectionRef: 'Chap. XIV, § 32',
      ptsRef: 'Vism. 436',
      taishoRef: 'T. 1509',
      standardEdition: 'PTS 1920 / Bhikkhu Ñāṇamoli 1956',
      doi: '10.1007/s10781-020-09432-1',
      url: 'https://palitext.com/visuddhimagga',
    };

    expect(source.sourceTitle).toBe('Visuddhimagga (Thanh Tịnh Đạo)');
    expect(source.ptsRef).toBe('Vism. 436');
    expect(source.doi).toBe('10.1007/s10781-020-09432-1');
    expect(source.url).toBe('https://palitext.com/visuddhimagga');
  });

  it('3. Encapsulates full immutable TerminologyEntry data contract', () => {
    const entry: TerminologyEntry = {
      id: 'term-citta',
      title: 'Citta (Tâm)',
      domain: 'phat-hoc',
      code: 'citta-01',
      canonicalTerm: 'citta',
      aliases: {
        pali: 'citta',
        sanskrit: 'citta',
        hanTu: '心',
        pinyin: 'xīn',
        vietnamese: 'Tâm',
        english: 'Mind / Consciousness',
      },
      summary: 'Khả năng nhận biết và phản ánh đối tượng (cảnh).',
      provenanceNote: 'Canonical Abhidhamma classification',
      sources: [
        {
          sourceTitle: 'Dhammasaṅgaṇī',
          sectionRef: '§ 1',
          ptsRef: 'Dhs. 1',
        },
      ],
    };

    expect(entry.id).toBe('term-citta');
    expect(entry.domain).toBe('phat-hoc');
    expect(entry.aliases?.hanTu).toBe('心');
    expect(entry.sources?.[0].ptsRef).toBe('Dhs. 1');
  });

  it('4. Implements TerminologyDictionary interface for lookups and search', () => {
    const mockEntries: TerminologyEntry[] = [
      {
        id: 'term-anatta',
        title: 'Anattā (Vô Ngã)',
        domain: 'phat-hoc',
        summary: 'Bản chất không có tự tính độc lập, bất biến.',
      },
      {
        id: 'term-qian',
        title: 'Càn Vi Thiên',
        domain: 'huyen-hoc',
        summary: 'Quẻ số 1 trong Chu Dịch.',
      },
    ];

    class MockDictionary implements TerminologyDictionary {
      readonly name = 'Universal Scholar Glossary';
      readonly domain: KnowledgeDomain = 'da-nganh';

      private entries: Map<string, TerminologyEntry>;

      constructor(initialEntries: TerminologyEntry[]) {
        this.entries = new Map(initialEntries.map((e) => [e.id, e]));
      }

      getEntry(id: string): TerminologyEntry | undefined {
        return this.entries.get(id);
      }

      search(query: string): TerminologyEntry[] {
        const q = query.toLowerCase();
        return Array.from(this.entries.values()).filter(
          (e) => e.title.toLowerCase().includes(q) || (e.summary && e.summary.toLowerCase().includes(q))
        );
      }

      listAll(): TerminologyEntry[] {
        return Array.from(this.entries.values());
      }
    }

    const dict = new MockDictionary(mockEntries);

    expect(dict.name).toBe('Universal Scholar Glossary');
    expect(dict.getEntry('term-anatta')?.title).toBe('Anattā (Vô Ngã)');
    expect(dict.search('chu dịch')).toHaveLength(1);
    expect(dict.search('chu dịch')[0].id).toBe('term-qian');
    expect(dict.listAll()).toHaveLength(2);
  });

  it('5. Supports optional first-class etymology structure on TerminologyEntry', () => {
    const entryWithEtymology: TerminologyEntry = {
      id: 'term-citta-etym',
      title: 'Citta (Tâm)',
      domain: 'phat-hoc',
      etymology: {
        root: '√cit (nhận thức, tư duy)',
        morphology: 'cintetīti cittaṁ',
        literalMeaning: 'Cái gì tích lũy và nhận biết đối tượng',
      },
    };

    expect(entryWithEtymology.etymology?.root).toContain('nhận thức');
    expect(entryWithEtymology.etymology?.morphology).toBe('cintetīti cittaṁ');
    expect(entryWithEtymology.etymology?.literalMeaning).toContain('tích lũy');
  });
});
