import { describe, it, expect } from 'vitest';
import { SYSTEM_NODE_REGISTRY } from '../../src/data/scholarSuite/systemRegistry';
import type { SystemNode } from '../../src/types/scholarSuite';
import type { TerminologyEntry } from '../../src/types/terminology';
import { mapSystemNodeToTerminology } from '../../src/lib/terminology/systemNodeAdapter';

describe('Phase P11.0: SystemNode Terminology Adapter Contract (RED Phase)', () => {

  describe('1. I Ching (iching_64) SystemNode Mapping', () => {
    it('maps sys-iching-01 (Thuần Càn) to TerminologyEntry preserving code, title, domain, and judgment attributes', () => {
      const qianNode = SYSTEM_NODE_REGISTRY.find((n) => n.id === 'sys-iching-01');
      expect(qianNode).toBeDefined();

      const mapped: TerminologyEntry = mapSystemNodeToTerminology(qianNode as SystemNode);

      expect(mapped.id).toBe('sys-iching-01');
      expect(mapped.code).toBe('Q01');
      expect(mapped.domain).toBe('huyen-hoc');
      expect(mapped.title).toBe('Thuần Càn (Bát Thuần Càn)');
      expect(mapped.canonicalTerm).toBe('Thuần Càn');
      expect(mapped.summary).toContain('Sức mạnh cương kiện');
      expect(mapped.provenanceNote).toContain('Đại Nguyện Bồ Đề Tâm');

      // Aliases mapped from hexagram attributes
      expect(mapped.aliases).toBeDefined();
      expect(mapped.aliases?.upperTrigram).toBe('Càn (Trời / Kim)');
      expect(mapped.aliases?.lowerTrigram).toBe('Càn (Trời / Kim)');
      expect(mapped.aliases?.element).toBe('Kim');
      expect(mapped.aliases?.nature).toBe('Đại Cát - Nguyên Hanh Lợi Trinh');

      // Sources mapped cleanly
      expect(mapped.sources).toBeDefined();
      expect(mapped.sources?.length).toBeGreaterThan(0);
      expect(mapped.sources?.[0].sourceTitle).toBe('Chu Dịch (Zhou Yi)');
    });
  });

  describe('2. Cetasika (cetasika_52) SystemNode Mapping', () => {
    it('maps sys-cetasika-28 (Tâm Sở Tín) to TerminologyEntry with characteristic and functional aliases', () => {
      const saddhaNode = SYSTEM_NODE_REGISTRY.find((n) => n.id === 'sys-cetasika-28');
      expect(saddhaNode).toBeDefined();

      const mapped: TerminologyEntry = mapSystemNodeToTerminology(saddhaNode as SystemNode);

      expect(mapped.id).toBe('sys-cetasika-28');
      expect(mapped.code).toBe('CET28');
      expect(mapped.domain).toBe('phat-hoc');
      expect(mapped.title).toBe('Tâm Sở Tín (Saddhā)');
      expect(mapped.canonicalTerm).toBe('Saddhā');
      expect(mapped.summary).toBeDefined();

      // Aliases mapped from 4-fold cetasika definition (lakkhaṇa, rasa, paccupaṭṭhāna, padaṭṭhāna)
      expect(mapped.aliases).toBeDefined();
      expect(mapped.aliases?.group).toBe('sobhana');
      expect(mapped.aliases?.subGroup).toBe('sobhana_general');
      expect(mapped.aliases?.characteristic).toBeDefined();
      expect(mapped.aliases?.function).toBeDefined();
    });
  });

  describe('3. Citta (citta_89_121) SystemNode Mapping', () => {
    it('maps sys-citta-01 (Tâm Tham 1) to TerminologyEntry with plane, roots, and feeling attributes', () => {
      const citta01Node = SYSTEM_NODE_REGISTRY.find((n) => n.id === 'sys-citta-01');
      expect(citta01Node).toBeDefined();

      const mapped: TerminologyEntry = mapSystemNodeToTerminology(citta01Node as SystemNode);

      expect(mapped.id).toBe('sys-citta-01');
      expect(mapped.code).toBe('C01');
      expect(mapped.domain).toBe('phat-hoc');
      expect(mapped.title).toContain('Tham');

      // Aliases mapped from citta classification
      expect(mapped.aliases).toBeDefined();
      expect(mapped.aliases?.plane).toBe('kāmāvacara');
      expect(mapped.aliases?.cittaType).toBe('akusala');
      expect(mapped.aliases?.feeling).toBe('somanassa');
      expect(mapped.aliases?.prompting).toBe('asaṅkhārika');
    });
  });

  describe('4. Auxiliary System Nodes Mapping (patthana, paticcasamuppada, qimen)', () => {
    it('maps sys-patthana-01 (Hetu-paccayo) to TerminologyEntry', () => {
      const patthanaNode = SYSTEM_NODE_REGISTRY.find((n) => n.id === 'sys-patthana-01');
      expect(patthanaNode).toBeDefined();

      const mapped: TerminologyEntry = mapSystemNodeToTerminology(patthanaNode as SystemNode);
      expect(mapped.id).toBe('sys-patthana-01');
      expect(mapped.code).toBe('P01');
      expect(mapped.domain).toBe('phat-hoc');
    });

    it('maps sys-nidana-01 (Vô Minh) to TerminologyEntry', () => {
      const nidanaNode = SYSTEM_NODE_REGISTRY.find((n) => n.id === 'sys-nidana-01');
      expect(nidanaNode).toBeDefined();

      const mapped: TerminologyEntry = mapSystemNodeToTerminology(nidanaNode as SystemNode);
      expect(mapped.id).toBe('sys-nidana-01');
      expect(mapped.code).toBe('ND01');
      expect(mapped.domain).toBe('phat-hoc');
    });

    it('maps sys-qimen-01 (Khảm Cung) to TerminologyEntry', () => {
      const qimenNode = SYSTEM_NODE_REGISTRY.find((n) => n.id === 'sys-qimen-01');
      expect(qimenNode).toBeDefined();

      const mapped: TerminologyEntry = mapSystemNodeToTerminology(qimenNode as SystemNode);
      expect(mapped.id).toBe('sys-qimen-01');
      expect(mapped.code).toBe('QM01');
      expect(mapped.domain).toBe('huyen-hoc');
    });
  });

  describe('5. Error Handling & Malformed Input', () => {
    it('throws a TypeError or descriptive error when given null or undefined input', () => {
      expect(() => {
        mapSystemNodeToTerminology(null as unknown as SystemNode);
      }).toThrow();
    });
  });
});
