import type { LexiconEntry, SystemNode } from '../../types/scholarSuite';
import type { ScholarCitationViewModel, CSLItem } from '../../types/scholarCitation';
import { normalizeLexiconEntry, normalizeSystemNode } from './normalizer';
import { formatBibTeX } from './formatters/bibtex';
import { formatCSLJSON } from './formatters/csl';
import { formatAPA7 } from './formatters/apa';
import { formatChicagoNotes } from './formatters/chicago';
import { formatMLA9 } from './formatters/mla';
import { formatHarvard } from './formatters/harvard';

export type ScholarCitationFormat = 'bibtex' | 'csl' | 'apa' | 'chicago' | 'mla' | 'harvard';

export interface ScholarCitationResult {
  viewModel: ScholarCitationViewModel;
  isBlocked: boolean;
  bibtex: string | null;
  csl: CSLItem | null;
  cslJsonString: string | null;
  apa: string | null;
  chicago: string | null;
  mla: string | null;
  harvard: string | null;
}

/**
 * Pure generator to orchestrate all 6 citation formats for any LexiconEntry or SystemNode.
 */
export function generateScholarCitations(
  item: LexiconEntry | SystemNode
): ScholarCitationResult {
  const isLexicon = 'terms' in item && 'canonicalDefinition' in item;
  const viewModel = isLexicon
    ? normalizeLexiconEntry(item as LexiconEntry)
    : normalizeSystemNode(item as SystemNode);

  const isBlocked = viewModel.sufficiency === 'internal_note_only';

  if (isBlocked) {
    return {
      viewModel,
      isBlocked: true,
      bibtex: null,
      csl: null,
      cslJsonString: null,
      apa: null,
      chicago: null,
      mla: null,
      harvard: null,
    };
  }

  const bibtex = formatBibTeX(viewModel);
  const csl = formatCSLJSON(viewModel);
  const cslJsonString = csl ? JSON.stringify(csl, null, 2) : null;
  const apa = formatAPA7(viewModel);
  const chicago = formatChicagoNotes(viewModel);
  const mla = formatMLA9(viewModel);
  const harvard = formatHarvard(viewModel);

  return {
    viewModel,
    isBlocked: false,
    bibtex,
    csl,
    cslJsonString,
    apa,
    chicago,
    mla,
    harvard,
  };
}
