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
 * Standard Language Codes (BCP-47 compatible)
 */
export type StandardLanguageCode =
  | 'vi'
  | 'zh-Hant'
  | 'zh-Hans'
  | 'sa'
  | 'pi'
  | 'en'
  | (string & {});

/**
 * Standard Script Codes (ISO-15924 compatible)
 */
export type StandardScriptCode =
  | 'Latn'
  | 'Hani'
  | 'Deva'
  | 'Brah'
  | (string & {});

/**
 * Granular transliteration and phonetic systems
 */
export interface TransliterationSet {
  readonly iast?: string;
  readonly pinyin?: string;
  readonly pinyinWithTones?: string;
  readonly pinyinPlain?: string;
  readonly hanViet?: string;
  readonly devanagari?: string;
  readonly plainAscii?: string;
}

/**
 * Structured glosses and academic translation equivalents
 */
export interface LanguageGlossSet {
  readonly preferred: string;
  readonly alternates?: readonly string[];
  readonly nuanceNote?: string;
}

/**
 * Granular Language & Script Profile for an entry
 */
export interface LanguageProfile {
  readonly language: StandardLanguageCode;
  readonly script: StandardScriptCode;
  readonly surfaceForm: string;
  readonly transliterations?: TransliterationSet;
  readonly glosses?: LanguageGlossSet;
  readonly isPrimaryForLanguage?: boolean;
}

/**
 * Traditional Chinese Medicine (TCM) Domain Extension Attributes
 */
export interface TcmDomainExtension {
  readonly category: 'kinh-huyet' | 'tang-tuong' | 'duoc-tinh' | 'bat-cuong' | 'phuong-te' | (string & {});
  readonly meridianCode?: string;
  readonly nature?: string;
  readonly flavor?: readonly string[];
  readonly channelTropism?: readonly string[];
  readonly primaryAction?: string;
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
  // P12.0 Multilingual & Language Profile Extensions
  readonly conceptId?: string;
  readonly sourceType?: 'lexicon' | 'system_node' | 'tcm_registry' | 'custom_glossary';
  readonly sourceEntryId?: string;
  readonly languageProfiles?: Record<string, LanguageProfile>;
  readonly tcmExtension?: TcmDomainExtension;
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
