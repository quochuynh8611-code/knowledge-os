import type { KnowledgeDomain } from './terminology';
export type { KnowledgeDomain } from './terminology';

/**
 * Minimal Viable Intermediate Representation for Scholar Citation Engine (v1)
 */

export type CitationSufficiency = 'internal_note_only' | 'canonical_minimal' | 'canonical_complete';

export interface ScholarCitationViewModel {
  /** ASCII-safe, deterministic unique key for LaTeX/BibTeX */
  readonly citationKey: string;

  /** Primary title of the entry/node (Preserves full Unicode diacritics) */
  readonly title: string;

  /** Canonical term or code (e.g. 'Citta', 'Q01', 'Hetu') */
  readonly canonicalTerm?: string;

  /** Domain scope */
  readonly domain: KnowledgeDomain;

  /** Canonical source document title (e.g. 'Dhammasaṅgaṇī', 'Chu Dịch') */
  readonly sourceTitle: string;

  /** Section locator (e.g. '§ 1', 'Thoán Truyện - Quẻ Càn') */
  readonly sectionRef: string;

  /** Standard classical catalog references */
  readonly ptsRef?: string;
  readonly taishoRef?: string;
  readonly standardEdition?: string;

  /** Attributed author, commentator, or lineage (if explicit) */
  readonly authorOrTradition?: string;

  /** Publication/edition year if known */
  readonly editionYear?: string;

  /** Fallback academic provenance note when formal source is absent */
  readonly provenanceNote?: string;

  /** Computed sufficiency classification */
  readonly sufficiency: CitationSufficiency;

  /** CSL item type according to CSL 1.0.2 specification */
  readonly cslType: 'entry-dictionary' | 'chapter';
}

export interface CSLItem {
  id: string;
  type: 'entry-dictionary' | 'chapter';
  title: string;
  'container-title': string;
  section?: string;
  number?: string;
  'collection-title'?: string;
  publisher?: string;
  note?: string;
}
