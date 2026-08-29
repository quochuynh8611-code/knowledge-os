import type {
  LexiconEntry,
  SystemNode,
  SystemNodeType,
  MatrixRelation,
  CompletenessState,
  SourceAttribution,
} from '../../types/scholarSuite';
import { LEXICON_REGISTRY } from '../../data/scholarSuite/lexiconRegistry';
import { SYSTEM_NODE_REGISTRY } from '../../data/scholarSuite/systemRegistry';
import { MATRIX_RELATION_REGISTRY } from '../../data/scholarSuite/matrixRegistry';

/**
 * Validates the core attribution invariant:
 * - If coverage is 'canonical' or 'verified': sources array must have >= 1 source.
 * - If coverage is 'stub' or 'partial': if sources is empty, a non-empty provenanceNote is mandatory.
 */
export function validateAttributionInvariant(item: {
  coverage: CompletenessState;
  sources?: SourceAttribution[];
  provenanceNote?: string;
}): boolean {
  const sources = item.sources ?? [];
  if (item.coverage === 'canonical' || item.coverage === 'verified') {
    return sources.length >= 1 && sources.every((s) => Boolean(s.sourceTitle && s.sectionRef));
  }

  // For 'stub' or 'partial'
  if (sources.length >= 1) {
    return true;
  }

  return typeof item.provenanceNote === 'string' && item.provenanceNote.trim().length > 0;
}

export interface LexiconFilterOptions {
  domain?: 'phat-hoc' | 'huyen-hoc' | 'triet-hoc' | 'khoa-hoc-tam-thuc' | 'all';
  query?: string;
  subCategory?: string;
}

/**
 * Pure selector to retrieve and filter Lexicon entries
 */
export function getLexiconEntries(filter?: LexiconFilterOptions): LexiconEntry[] {
  let entries = [...LEXICON_REGISTRY];

  if (!filter) {
    return entries;
  }

  if (filter.domain && filter.domain !== 'all') {
    entries = entries.filter((e) => e.domain === filter.domain);
  }

  if (filter.subCategory) {
    entries = entries.filter((e) => e.subCategory.toLowerCase() === filter.subCategory?.toLowerCase());
  }

  if (filter.query && filter.query.trim()) {
    const q = filter.query.toLowerCase().trim();
    entries = entries.filter((e) => {
      const matchVi = e.terms.vietnamese.toLowerCase().includes(q);
      const matchPali = e.terms.pali?.toLowerCase().includes(q) ?? false;
      const matchSkt = e.terms.sanskrit?.toLowerCase().includes(q) ?? false;
      const matchHan = e.terms.hanTu?.includes(q) ?? false;
      const matchEn = e.terms.english.toLowerCase().includes(q);
      const matchDef = e.canonicalDefinition.toLowerCase().includes(q);
      const matchSlug = e.slug.toLowerCase().includes(q);
      return matchVi || matchPali || matchSkt || matchHan || matchEn || matchDef || matchSlug;
    });
  }

  return entries;
}

/**
 * Pure selector to retrieve System Nodes, optionally filtered by systemType
 */
export function getSystemNodes<T extends SystemNodeType>(
  systemType: T
): Extract<SystemNode, { systemType: T }>[];
export function getSystemNodes(): SystemNode[];
export function getSystemNodes(
  systemType?: SystemNodeType
): SystemNode[] {
  if (!systemType) {
    return [...SYSTEM_NODE_REGISTRY];
  }
  return SYSTEM_NODE_REGISTRY.filter((node) => node.systemType === systemType);
}

/**
 * Pure selector to retrieve Matrix Relations, optionally filtered by matrixType
 */
export function getMatrixRelations(matrixType?: string): MatrixRelation[] {
  if (!matrixType) {
    return [...MATRIX_RELATION_REGISTRY];
  }
  return MATRIX_RELATION_REGISTRY.filter((rel) => rel.matrixType === matrixType);
}

export interface ScholarSuiteCounts {
  totalLexicon: number;
  totalHexagrams: number;
  totalCittas: number;
  totalCetasikas: number;
  totalPatthana: number;
  totalNidanas: number;
  totalQiMen: number;
  totalMatrixRelations: number;
}

/**
 * Computes exact data-driven item counts across all registered scholar models.
 * This provides the backbone for dynamic sidebar badges in Phase C.
 */
export function getScholarSuiteCounts(): ScholarSuiteCounts {
  const hexagrams = SYSTEM_NODE_REGISTRY.filter((n) => n.systemType === 'iching_64');
  const cittas = SYSTEM_NODE_REGISTRY.filter((n) => n.systemType === 'citta_89_121');
  const cetasikas = SYSTEM_NODE_REGISTRY.filter((n) => n.systemType === 'cetasika_52');
  const patthanas = SYSTEM_NODE_REGISTRY.filter((n) => n.systemType === 'patthana_24');
  const nidanas = SYSTEM_NODE_REGISTRY.filter((n) => n.systemType === 'paticcasamuppada_12');
  const qimens = SYSTEM_NODE_REGISTRY.filter((n) => n.systemType === 'qimen_9');

  return {
    totalLexicon: LEXICON_REGISTRY.length,
    totalHexagrams: hexagrams.length,
    totalCittas: cittas.length,
    totalCetasikas: cetasikas.length,
    totalPatthana: patthanas.length,
    totalNidanas: nidanas.length,
    totalQiMen: qimens.length,
    totalMatrixRelations: MATRIX_RELATION_REGISTRY.length,
  };
}
