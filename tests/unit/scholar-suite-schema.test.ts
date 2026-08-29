import { describe, it, expect } from "vitest";
import type {
  LexiconEntry,
  SystemNode,
  MatrixRelation,
  CompletenessState,
} from "../../src/types/scholarSuite";
import {
  LEXICON_REGISTRY,
} from "../../src/data/scholarSuite/lexiconRegistry";
import {
  SYSTEM_NODE_REGISTRY,
} from "../../src/data/scholarSuite/systemRegistry";
import {
  MATRIX_RELATION_REGISTRY,
} from "../../src/data/scholarSuite/matrixRegistry";
import {
  getLexiconEntries,
  getSystemNodes,
  getMatrixRelations,
  getScholarSuiteCounts,
  validateAttributionInvariant,
} from "../../src/lib/scholarSuite/selectors";

describe("Phase A: ScholarSuite Typed Content Backbone & Invariant Suite", () => {
  describe("1. Invariant: coverage, sources & provenanceNote", () => {
    it("enforces at least 1 source when coverage is 'canonical' or 'verified'", () => {
      const canonicalEntry: LexiconEntry = {
        id: "lex-test-citta",
        slug: "citta",
        terms: {
          vietnamese: "Tâm",
          pali: "Citta",
          english: "Consciousness",
        },
        domain: "phat-hoc",
        subCategory: "Abhidhamma",
        canonicalDefinition: "Khả năng nhận biết cảnh (Arammaṇa).",
        sources: [
          {
            sourceTitle: "Dhammasaṅgaṇī",
            sectionRef: "§ 1",
            ptsRef: "Dhs 1",
          },
        ],
        coverage: "canonical",
      };

      const invalidCanonicalEntry: LexiconEntry = {
        ...canonicalEntry,
        id: "lex-test-invalid",
        sources: [],
      };

      expect(validateAttributionInvariant(canonicalEntry)).toBe(true);
      expect(validateAttributionInvariant(invalidCanonicalEntry)).toBe(false);
    });

    it("allows empty sources for 'stub' or 'partial' ONLY IF provenanceNote is provided", () => {
      const stubWithProvenance: LexiconEntry = {
        id: "lex-test-stub",
        slug: "stub-concept",
        terms: {
          vietnamese: "Khái niệm nháp",
          english: "Draft Concept",
        },
        domain: "phat-hoc",
        subCategory: "General",
        canonicalDefinition: "Đang biên soạn.",
        provenanceNote: "Sơ thảo từ bản dịch HT Thích Minh Châu",
        sources: [],
        coverage: "stub",
      };

      const stubWithoutProvenance: LexiconEntry = {
        ...stubWithProvenance,
        id: "lex-test-stub-invalid",
        provenanceNote: undefined,
      };

      expect(validateAttributionInvariant(stubWithProvenance)).toBe(true);
      expect(validateAttributionInvariant(stubWithoutProvenance)).toBe(false);
    });

    it("all registered entries in registries satisfy the attribution invariant", () => {
      for (const entry of LEXICON_REGISTRY) {
        expect(
          validateAttributionInvariant(entry),
          `Lexicon entry ${entry.id} failed attribution invariant`
        ).toBe(true);
      }

      for (const node of SYSTEM_NODE_REGISTRY) {
        expect(
          validateAttributionInvariant(node),
          `System node ${node.id} failed attribution invariant`
        ).toBe(true);
      }

      for (const rel of MATRIX_RELATION_REGISTRY) {
        expect(
          validateAttributionInvariant(rel),
          `Matrix relation ${rel.id} failed attribution invariant`
        ).toBe(true);
      }
    });
  });

  describe("2. Discriminated Union Attribute Safety by systemType", () => {
    it("ensures I Ching nodes contain strict IChingNodeAttributes", () => {
      const ichingNodes = getSystemNodes("iching_64");
      expect(ichingNodes.length).toBeGreaterThanOrEqual(2);

      for (const node of ichingNodes) {
        expect(node.systemType).toBe("iching_64");
        expect(node.attributes.hexagramNumber).toBeGreaterThanOrEqual(1);
        expect(node.attributes.hexagramNumber).toBeLessThanOrEqual(64);
        expect(node.attributes.upperTrigram).toBeDefined();
        expect(node.attributes.lowerTrigram).toBeDefined();
        expect(node.attributes.element).toBeDefined();
        expect(node.attributes.judgmentText).toBeDefined();
        expect(node.attributes.imageText).toBeDefined();
      }
    });

    it("ensures Citta nodes contain strict CittaNodeAttributes", () => {
      const cittaNodes = getSystemNodes("citta_89_121");
      expect(cittaNodes.length).toBeGreaterThanOrEqual(2);

      for (const node of cittaNodes) {
        expect(node.systemType).toBe("citta_89_121");
        expect(node.attributes.cittaNumber).toBeGreaterThanOrEqual(1);
        expect(node.attributes.plane).toBeDefined();
        expect(node.attributes.cittaType).toBeDefined();
        expect(node.attributes.roots).toBeInstanceOf(Array);
        expect(node.attributes.feeling).toBeDefined();
        expect(node.attributes.prompting).toBeDefined();
        expect(node.attributes.associatedCetasikaCount).toBeGreaterThan(0);
      }
    });

    it("ensures Cetasika, Patthana, Nidana, and QiMen nodes contain respective typed attributes", () => {
      const cetasikaNodes = getSystemNodes("cetasika_52");
      expect(cetasikaNodes.length).toBeGreaterThanOrEqual(1);
      expect(cetasikaNodes[0].attributes.cetasikaNumber).toBeGreaterThanOrEqual(1);
      expect(cetasikaNodes[0].attributes.group).toBeDefined();
      expect(cetasikaNodes[0].attributes.characteristic).toBeDefined();

      const patthanaNodes = getSystemNodes("patthana_24");
      expect(patthanaNodes.length).toBeGreaterThanOrEqual(1);
      expect(patthanaNodes[0].attributes.conditionNumber).toBeGreaterThanOrEqual(1);
      expect(patthanaNodes[0].attributes.paliName).toBeDefined();

      const nidanaNodes = getSystemNodes("paticcasamuppada_12");
      expect(nidanaNodes.length).toBeGreaterThanOrEqual(1);
      expect(nidanaNodes[0].attributes.order).toBeGreaterThanOrEqual(1);
      expect(nidanaNodes[0].attributes.timePeriod).toBeDefined();

      const qimenNodes = getSystemNodes("qimen_9");
      expect(qimenNodes.length).toBeGreaterThanOrEqual(1);
      expect(qimenNodes[0].attributes.palaceNumber).toBeGreaterThanOrEqual(1);
      expect(qimenNodes[0].attributes.door).toBeDefined();
      expect(qimenNodes[0].attributes.star).toBeDefined();
      expect(qimenNodes[0].attributes.deity).toBeDefined();
    });
  });

  describe("3. Separation of Canonical vs Interpretive Layers", () => {
    it("maintains distinct fields for canonical exegesis and cross-domain analogy", () => {
      const qianNode = SYSTEM_NODE_REGISTRY.find((n) => n.id === "sys-iching-01");
      expect(qianNode).toBeDefined();
      if (qianNode) {
        expect(qianNode.canonicalMeaning).toBeTruthy();
        expect(qianNode.crossDomainAnalogy).toBeDefined();
        expect(qianNode.canonicalMeaning).not.toEqual(qianNode.crossDomainAnalogy);
      }

      const cittaNode = SYSTEM_NODE_REGISTRY.find((n) => n.id === "sys-citta-01");
      expect(cittaNode).toBeDefined();
      if (cittaNode) {
        expect(cittaNode.canonicalMeaning).toBeTruthy();
      }
    });
  });

  describe("4. Selectors & Non-Hardcoded Counts", () => {
    it("computes data-driven counts matching real registered items", () => {
      const counts = getScholarSuiteCounts();
      expect(counts.totalLexicon).toBe(LEXICON_REGISTRY.length);
      expect(counts.totalHexagrams).toBe(
        SYSTEM_NODE_REGISTRY.filter((n) => n.systemType === "iching_64").length
      );
      expect(counts.totalCittas).toBe(
        SYSTEM_NODE_REGISTRY.filter((n) => n.systemType === "citta_89_121").length
      );
      expect(counts.totalCetasikas).toBe(
        SYSTEM_NODE_REGISTRY.filter((n) => n.systemType === "cetasika_52").length
      );
      expect(counts.totalPatthana).toBe(
        SYSTEM_NODE_REGISTRY.filter((n) => n.systemType === "patthana_24").length
      );
      expect(counts.totalNidanas).toBe(
        SYSTEM_NODE_REGISTRY.filter((n) => n.systemType === "paticcasamuppada_12").length
      );
      expect(counts.totalQiMen).toBe(
        SYSTEM_NODE_REGISTRY.filter((n) => n.systemType === "qimen_9").length
      );
      expect(counts.totalMatrixRelations).toBe(MATRIX_RELATION_REGISTRY.length);

      // Invariants: counts are non-negative numbers, not static placeholder strings
      expect(typeof counts.totalHexagrams).toBe("number");
      expect(typeof counts.totalCittas).toBe("number");
    });

    it("filters lexicon entries by domain and search query correctly", () => {
      const phatHocEntries = getLexiconEntries({ domain: "phat-hoc" });
      expect(phatHocEntries.every((e) => e.domain === "phat-hoc")).toBe(true);

      const huyenHocEntries = getLexiconEntries({ domain: "huyen-hoc" });
      expect(huyenHocEntries.every((e) => e.domain === "huyen-hoc")).toBe(true);

      const searchResults = getLexiconEntries({ query: "citta" });
      expect(searchResults.length).toBeGreaterThan(0);
      expect(searchResults.some((e) => e.slug.includes("citta"))).toBe(true);
    });

    it("filters matrix relations by matrixType", () => {
      const crossDomainRels = getMatrixRelations("cross_domain_synthesis");
      expect(crossDomainRels.length).toBeGreaterThan(0);
      expect(
        crossDomainRels.every((r) => r.matrixType === "cross_domain_synthesis")
      ).toBe(true);
    });
  });
});
