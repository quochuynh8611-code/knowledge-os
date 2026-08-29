import type { LexiconEntry, SystemNode, MatrixRelation } from '../../types/scholarSuite';
import type { ScholarCitationViewModel, CitationSufficiency } from '../../types/scholarCitation';
import type { TerminologyEntry } from '../../types/terminology';
import { SYSTEM_NODE_REGISTRY } from '../../data/scholarSuite/systemRegistry';
import { generateCitationKey, CitationEntityType } from './key';

export interface NormalizeTerminologyOptions {
  cslType?: 'entry-dictionary' | 'chapter';
  entityType?: CitationEntityType;
}

/**
 * Determines citation sufficiency according to Phase P8.0 strict tripartite model.
 */
function evaluateSufficiency(sources?: { ptsRef?: string; taishoRef?: string; standardEdition?: string }[]): CitationSufficiency {
  if (!sources || sources.length === 0) {
    return 'internal_note_only';
  }

  const primary = sources[0];
  if (primary.ptsRef || primary.taishoRef || primary.standardEdition) {
    return 'canonical_complete';
  }

  return 'canonical_minimal';
}

/**
 * Adapts any domain-agnostic TerminologyEntry into ScholarCitationViewModel.
 */
export function normalizeTerminologyEntry(
  entry: TerminologyEntry,
  options?: NormalizeTerminologyOptions
): ScholarCitationViewModel {
  const sufficiency = evaluateSufficiency(entry.sources);
  const primarySource = entry.sources?.[0];

  const entityType = options?.entityType ?? 'term';
  const cslType = options?.cslType ?? 'entry-dictionary';

  const slugOrCode = entry.code || entry.canonicalTerm || entry.id;

  const citationKey = sufficiency !== 'internal_note_only'
    ? generateCitationKey({
        domain: entry.domain,
        entityType,
        slugOrCode,
        sourceTitle: primarySource?.sourceTitle,
        sectionRef: primarySource?.sectionRef,
        fallbackId: entry.id,
      })
    : '';


  return {
    citationKey,
    title: entry.title,
    canonicalTerm: entry.canonicalTerm || entry.code,
    domain: entry.domain,
    sourceTitle: primarySource?.sourceTitle ?? '',
    sectionRef: primarySource?.sectionRef ?? '',
    ptsRef: primarySource?.ptsRef,
    taishoRef: primarySource?.taishoRef,
    standardEdition: primarySource?.standardEdition,
    provenanceNote: entry.provenanceNote,
    sufficiency,
    cslType,
  };
}

/**
 * Adapts a LexiconEntry into ScholarCitationViewModel.
 */
export function normalizeLexiconEntry(entry: LexiconEntry): ScholarCitationViewModel {
  const sufficiency = evaluateSufficiency(entry.sources);
  const primarySource = entry.sources?.[0];

  const canonicalTerm = entry.terms.pali || entry.terms.sanskrit || entry.slug;
  const canonicalName = entry.terms.pali || entry.terms.sanskrit;
  const title = canonicalName
    ? `${canonicalName} (${entry.terms.vietnamese})`
    : entry.terms.vietnamese;

  const citationKey = sufficiency !== 'internal_note_only'
    ? generateCitationKey({
        domain: entry.domain,
        entityType: 'lex',
        slugOrCode: entry.slug,
        sourceTitle: primarySource?.sourceTitle,
        sectionRef: primarySource?.sectionRef,
        fallbackId: entry.id,
      })
    : '';

  return {
    citationKey,
    title,
    canonicalTerm,
    domain: entry.domain,
    sourceTitle: primarySource?.sourceTitle ?? '',
    sectionRef: primarySource?.sectionRef ?? '',
    ptsRef: primarySource?.ptsRef,
    taishoRef: primarySource?.taishoRef,
    standardEdition: primarySource?.standardEdition,
    provenanceNote: entry.provenanceNote,
    sufficiency,
    cslType: 'entry-dictionary',
  };
}


/**
 * Adapts a SystemNode into ScholarCitationViewModel.
 */
export function normalizeSystemNode(node: SystemNode): ScholarCitationViewModel {
  const sufficiency = evaluateSufficiency(node.sources);
  const primarySource = node.sources?.[0];

  const citationKey = sufficiency !== 'internal_note_only'
    ? generateCitationKey({
        domain: node.domain,
        entityType: 'sys',
        slugOrCode: node.code || node.id,
        sourceTitle: primarySource?.sourceTitle,
        sectionRef: primarySource?.sectionRef,
        fallbackId: node.id,
      })
    : '';

  return {
    citationKey,
    title: node.title,
    canonicalTerm: node.code,
    domain: node.domain,
    sourceTitle: primarySource?.sourceTitle ?? '',
    sectionRef: primarySource?.sectionRef ?? '',
    ptsRef: primarySource?.ptsRef,
    taishoRef: primarySource?.taishoRef,
    standardEdition: primarySource?.standardEdition,
    provenanceNote: node.provenanceNote,
    sufficiency,
    cslType: 'chapter',
  };
}

/**
 * Adapts a MatrixRelation into ScholarCitationViewModel with link resolution.
 */
export function normalizeMatrixRelation(
  relation: MatrixRelation,
  rowNode?: SystemNode,
  colNode?: SystemNode
): ScholarCitationViewModel {
  const sufficiency = evaluateSufficiency(relation.sources);
  const primarySource = relation.sources?.[0];

  // Resolve row and column system nodes
  const resolvedRow = rowNode || SYSTEM_NODE_REGISTRY.find((n) => n.id === relation.rowNodeId);
  const resolvedCol = colNode || SYSTEM_NODE_REGISTRY.find((n) => n.id === relation.colNodeId);

  const rowTitle = resolvedRow ? resolvedRow.title : relation.rowNodeId;
  const colTitle = resolvedCol ? resolvedCol.title : relation.colNodeId;

  const rowSlug = resolvedRow?.code || relation.rowNodeId;
  const colSlug = resolvedCol?.code || relation.colNodeId;

  const title = `${rowTitle} (${relation.relationType}) → ${colTitle}`;
  const canonicalTerm = `${rowSlug}_${colSlug}`;

  const domain = relation.matrixType === 'cross_domain_synthesis'
    ? 'da-nganh'
    : 'phat-hoc';

  const citationKey = sufficiency !== 'internal_note_only'
    ? generateCitationKey({
        domain,
        entityType: 'rel',
        slugOrCode: `${rowSlug}_${colSlug}_${relation.relationType}`,
        sourceTitle: primarySource?.sourceTitle,
        sectionRef: primarySource?.sectionRef,
        fallbackId: relation.id,
      })
    : '';

  return {
    citationKey,
    title,
    canonicalTerm,
    domain,
    sourceTitle: primarySource?.sourceTitle ?? '',
    sectionRef: primarySource?.sectionRef ?? '',
    ptsRef: primarySource?.ptsRef,
    taishoRef: primarySource?.taishoRef,
    standardEdition: primarySource?.standardEdition,
    provenanceNote: relation.provenanceNote,
    sufficiency,
    cslType: 'chapter',
  };
}
