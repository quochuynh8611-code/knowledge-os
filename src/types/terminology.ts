/**
 * Universal Terminology Contract & Extensible Knowledge Domain Foundation
 *
 * Provides domain-agnostic data structures for representing terminology entries,
 * citations, and dictionary registries across all traditional and modern disciplines.
 */

/**
 * Core predefined knowledge domains in the system.
 */
export type CoreKnowledgeDomain =
  | 'phat-hoc'
  | 'huyen-hoc'
  | 'triet-hoc'
  | 'khoa-hoc-tam-thuc'
  | 'da-nganh';

/**
 * Open union allowing both core knowledge domains (with full IDE autocomplete)
 * and arbitrary domain strings for future expansion.
 */
export type KnowledgeDomain = CoreKnowledgeDomain | (string & {});

/**
 * Standard citation and provenance source reference for terminology entries.
 * Accommodates classical canon locators (PTS, Taishō) and modern digital identifiers (DOI, URL).
 */
export interface TerminologySource {
  sourceTitle: string;
  sectionRef?: string;
  ptsRef?: string;
  taishoRef?: string;
  standardEdition?: string;
  doi?: string;
  url?: string;
}

/**
 * Granular etymology and morphological structure for classical and modern terms.
 */
export interface TerminologyEtymology {
  readonly root?: string;
  readonly morphology?: string;
  readonly literalMeaning?: string;
}

/**
 * Canonical immutable data contract for a standalone Terminology Entry across any knowledge domain.
 */
export interface TerminologyEntry {
  readonly id: string;
  readonly title: string;
  readonly domain: KnowledgeDomain;
  readonly code?: string;
  readonly canonicalTerm?: string;
  readonly aliases?: Record<string, string>;
  readonly summary?: string;
  readonly etymology?: TerminologyEtymology;
  readonly provenanceNote?: string;
  readonly sources?: TerminologySource[];
}


/**
 * Standard interface for terminology dictionaries, registries, or ontology stores.
 */
export interface TerminologyDictionary {
  readonly name: string;
  readonly domain: KnowledgeDomain;
  getEntry(id: string): TerminologyEntry | undefined;
  search(query: string): TerminologyEntry[];
  listAll?(): TerminologyEntry[];
}
