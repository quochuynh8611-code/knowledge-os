import type { LexiconEntry } from '../../types/scholarSuite';
import type { TerminologyEntry, TerminologyDictionary, KnowledgeDomain } from '../../types/terminology';
import { LEXICON_REGISTRY } from '../../data/scholarSuite/lexiconRegistry';

/**
 * Maps a Scholar Suite LexiconEntry to a domain-agnostic TerminologyEntry.
 * Preserves all multilingual terms under the aliases dictionary.
 */
export function mapLexiconEntryToTerminology(entry: LexiconEntry): TerminologyEntry {
  const canonicalName = entry.terms.pali || entry.terms.sanskrit;
  const title = canonicalName
    ? `${canonicalName} (${entry.terms.vietnamese})`
    : entry.terms.vietnamese;

  const aliases: Record<string, string> = {
    vietnamese: entry.terms.vietnamese,
    english: entry.terms.english,
  };
  if (entry.terms.pali) aliases.pali = entry.terms.pali;
  if (entry.terms.sanskrit) aliases.sanskrit = entry.terms.sanskrit;
  if (entry.terms.hanTu) aliases.hanTu = entry.terms.hanTu;
  if (entry.terms.pinyin) aliases.pinyin = entry.terms.pinyin;

  return {
    id: entry.id,
    title,
    domain: entry.domain,
    code: entry.slug,
    canonicalTerm: entry.terms.pali || entry.terms.sanskrit || entry.slug,
    aliases,
    summary: entry.canonicalDefinition,
    etymology: entry.etymology
      ? {
          root: entry.etymology.root,
          morphology: entry.etymology.morphology,
          literalMeaning: entry.etymology.literalMeaning,
        }
      : undefined,
    provenanceNote: entry.provenanceNote || entry.interpretiveNotes,
    sources: entry.sources.map((s) => ({
      sourceTitle: s.sourceTitle,
      sectionRef: s.sectionRef,
      ptsRef: s.ptsRef,
      taishoRef: s.taishoRef,
      standardEdition: s.standardEdition,
    })),
  };
}

/**
 * Creates a read-only TerminologyDictionary instance wrapping an array of LexiconEntries.
 */
export function createLexiconDictionary(
  entries: LexiconEntry[] = LEXICON_REGISTRY,
  name = 'Scholar Suite Lexicon Dictionary'
): TerminologyDictionary {
  const domain: KnowledgeDomain = 'da-nganh';
  const mappedEntries = entries.map(mapLexiconEntryToTerminology);

  const entryMap = new Map<string, TerminologyEntry>();
  for (const item of mappedEntries) {
    entryMap.set(item.id, item);
  }

  return {
    name,
    domain,
    getEntry(id: string): TerminologyEntry | undefined {
      return entryMap.get(id);
    },
    search(query: string): TerminologyEntry[] {
      if (!query || !query.trim()) {
        return [];
      }
      const q = query.trim().toLowerCase();

      return mappedEntries.filter((item) => {
        if (item.title.toLowerCase().includes(q)) return true;
        if (item.summary && item.summary.toLowerCase().includes(q)) return true;
        if (item.etymology?.root && item.etymology.root.toLowerCase().includes(q)) return true;
        if (item.etymology?.morphology && item.etymology.morphology.toLowerCase().includes(q)) return true;
        if (item.etymology?.literalMeaning && item.etymology.literalMeaning.toLowerCase().includes(q)) return true;
        if (item.provenanceNote && item.provenanceNote.toLowerCase().includes(q)) return true;
        if (item.code && item.code.toLowerCase().includes(q)) return true;
        if (item.canonicalTerm && item.canonicalTerm.toLowerCase().includes(q)) return true;
        if (item.aliases) {
          for (const val of Object.values(item.aliases)) {
            if (val.toLowerCase().includes(q)) return true;
          }
        }
        return false;
      });
    },
    listAll(): TerminologyEntry[] {
      return [...mappedEntries];
    },
  };
}



/**
 * Singleton instance of the Scholar Suite Lexicon Dictionary.
 */
export const scholarLexiconDictionary = createLexiconDictionary(LEXICON_REGISTRY);
