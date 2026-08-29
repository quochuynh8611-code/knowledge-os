import type { LexiconEntry, SystemNode } from '../../types/scholarSuite';
import type { TerminologyEntry, TerminologyDictionary, KnowledgeDomain } from '../../types/terminology';
import { LEXICON_REGISTRY } from '../../data/scholarSuite/lexiconRegistry';
import { SYSTEM_NODE_REGISTRY } from '../../data/scholarSuite/systemRegistry';
import { mapLexiconEntryToTerminology } from './lexiconDictionary';
import { mapSystemNodeToTerminology } from './systemNodeAdapter';
import { normalizeScholarText } from '../scholarSearch';

/**
 * Creates a read-only TerminologyDictionary instance composing both LexiconEntries and SystemNodes.
 * Pure composition: does not mutate either source array.
 */
export function createUnifiedTerminologyDictionary(
  lexiconEntries: LexiconEntry[] = LEXICON_REGISTRY,
  systemNodes: SystemNode[] = SYSTEM_NODE_REGISTRY,
  name = 'Scholar Suite Unified Terminology Dictionary'
): TerminologyDictionary {
  const domain: KnowledgeDomain = 'da-nganh';

  const mappedLexicon = lexiconEntries.map(mapLexiconEntryToTerminology);
  const mappedSystemNodes = systemNodes.map(mapSystemNodeToTerminology);
  const allEntries: TerminologyEntry[] = [...mappedLexicon, ...mappedSystemNodes];

  const entryMap = new Map<string, TerminologyEntry>();
  for (const item of allEntries) {
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
      const qNorm = normalizeScholarText(query);
      if (!qNorm) {
        return [];
      }

      const matchField = (field?: string): boolean => {
        if (!field) return false;
        return normalizeScholarText(field).includes(qNorm);
      };

      return allEntries.filter((item) => {
        if (matchField(item.title)) return true;
        if (matchField(item.summary)) return true;
        if (matchField(item.etymology?.root)) return true;
        if (matchField(item.etymology?.morphology)) return true;
        if (matchField(item.etymology?.literalMeaning)) return true;
        if (matchField(item.provenanceNote)) return true;
        if (matchField(item.code)) return true;
        if (matchField(item.canonicalTerm)) return true;
        if (item.aliases) {
          for (const val of Object.values(item.aliases)) {
            if (matchField(val)) return true;
          }
        }
        return false;
      });
    },
    listAll(): TerminologyEntry[] {
      return [...allEntries];
    },
  };
}

/**
 * Singleton instance of the Unified Scholar Suite Terminology Dictionary.
 */
export const scholarUnifiedDictionary = createUnifiedTerminologyDictionary(
  LEXICON_REGISTRY,
  SYSTEM_NODE_REGISTRY
);
