import type { LexiconEntry, SystemNode } from '../../types/scholarSuite';
import type { ScholarCitationViewModel, CitationSufficiency } from '../../types/scholarCitation';
import { generateCitationKey } from './key';

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
