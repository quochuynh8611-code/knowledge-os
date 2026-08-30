import type { LexiconEntry, SystemNode } from '../../types/scholarSuite';
import type { TcmEntry } from '../../data/scholarSuite/tcmRegistry';
import type { TerminologyEntry, TerminologyDictionary, KnowledgeDomain } from '../../types/terminology';
import { LEXICON_REGISTRY } from '../../data/scholarSuite/lexiconRegistry';
import { SYSTEM_NODE_REGISTRY } from '../../data/scholarSuite/systemRegistry';
import { TCM_REGISTRY } from '../../data/scholarSuite/tcmRegistry';
import { mapLexiconEntryToTerminology, searchTerminologyEntries } from './lexiconDictionary';
import { mapSystemNodeToTerminology } from './systemNodeAdapter';
import { mapTcmEntryToTerminology } from './tcmDictionary';

/**
 * Creates a read-only TerminologyDictionary instance composing LexiconEntries, SystemNodes, and TCM Entries.
 * Pure composition: does not mutate any source array.
 */
export function createUnifiedTerminologyDictionary(
  lexiconEntries: LexiconEntry[] = LEXICON_REGISTRY,
  systemNodes: SystemNode[] = SYSTEM_NODE_REGISTRY,
  tcmEntries?: TcmEntry[],
  name = 'Scholar Suite Unified Terminology Dictionary'
): TerminologyDictionary {
  const domain: KnowledgeDomain = 'da-nganh';

  const mappedLexicon = lexiconEntries.map(mapLexiconEntryToTerminology);
  const mappedSystemNodes = systemNodes.map(mapSystemNodeToTerminology);
  const mappedTcm = tcmEntries ? tcmEntries.map(mapTcmEntryToTerminology) : [];
  const allEntries: TerminologyEntry[] = [
    ...mappedLexicon,
    ...mappedSystemNodes,
    ...mappedTcm,
  ];

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
      return searchTerminologyEntries(allEntries, query);
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
  SYSTEM_NODE_REGISTRY,
  TCM_REGISTRY
);
