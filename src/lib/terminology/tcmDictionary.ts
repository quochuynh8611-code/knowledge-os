import type { TcmEntry } from '../../data/scholarSuite/tcmRegistry';
import { TCM_REGISTRY } from '../../data/scholarSuite/tcmRegistry';
import type {
  TerminologyEntry,
  TerminologyDictionary,
  KnowledgeDomain,
  LanguageProfile,
} from '../../types/terminology';
import { normalizeScholarText } from '../scholarSearch';
import { searchTerminologyEntries } from './lexiconDictionary';

/**
 * Derives structured multilingual language profiles for a TCM Entry.
 */
function deriveTcmLanguageProfiles(entry: TcmEntry): Record<string, LanguageProfile> {
  const profiles: Record<string, LanguageProfile> = {};

  // 1. Vietnamese (vi - Latn)
  profiles['vi'] = {
    language: 'vi',
    script: 'Latn',
    surfaceForm: entry.nameVi,
    glosses: {
      preferred: entry.nameVi,
      alternates: [entry.hanViet],
    },
    isPrimaryForLanguage: true,
  };

  // 2. Traditional Chinese (zh-Hant - Hani)
  profiles['zh-Hant'] = {
    language: 'zh-Hant',
    script: 'Hani',
    surfaceForm: entry.nameHanTu,
    transliterations: {
      pinyin: entry.pinyin.toLowerCase(),
      hanViet: entry.hanViet,
      plainAscii: normalizeScholarText(entry.pinyin),
    },
    isPrimaryForLanguage: true,
  };

  // 3. English (en - Latn)
  if (entry.englishGloss) {
    profiles['en'] = {
      language: 'en',
      script: 'Latn',
      surfaceForm: entry.englishGloss,
      glosses: {
        preferred: entry.englishGloss,
      },
      isPrimaryForLanguage: true,
    };
  }

  return profiles;
}

/**
 * Maps a TcmEntry into a domain-agnostic canonical TerminologyEntry.
 * Pure mapper function: does not mutate source data.
 */
export function mapTcmEntryToTerminology(entry: TcmEntry): TerminologyEntry {
  const languageProfiles = deriveTcmLanguageProfiles(entry);

  const aliases: Record<string, string> = {
    vietnamese: entry.nameVi,
    hanTu: entry.nameHanTu,
    pinyin: entry.pinyin,
    hanViet: entry.hanViet,
    english: entry.englishGloss,
  };

  if (entry.tcmAttributes.meridianCode) {
    aliases.meridianCode = entry.tcmAttributes.meridianCode;
  }
  if (entry.tcmAttributes.fiveElements) {
    aliases.fiveElements = entry.tcmAttributes.fiveElements;
  }
  if (entry.tcmAttributes.primaryAction) {
    aliases.primaryAction = entry.tcmAttributes.primaryAction;
  }

  return {
    id: entry.id,
    title: entry.nameVi,
    domain: 'y-hoc-co-truyen',
    code: entry.tcmAttributes.meridianCode ?? entry.slug,
    canonicalTerm: entry.nameVi,
    aliases,
    summary: entry.summary,
    provenanceNote: entry.sources[0]
      ? `${entry.sources[0].sourceTitle} ${entry.sources[0].sectionRef}`
      : 'Thư tịch Y học cổ truyền',
    sources: entry.sources.map((s) => ({
      sourceTitle: s.sourceTitle,
      sectionRef: s.sectionRef,
      standardEdition: s.standardEdition,
    })),
    conceptId: entry.conceptId ?? `concept:tcm:${entry.category}:${entry.slug}`,
    sourceType: 'tcm_registry',
    sourceEntryId: entry.id,
    languageProfiles,
    tcmExtension: {
      category: entry.category,
      meridianCode: entry.tcmAttributes.meridianCode,
      nature: entry.tcmAttributes.nature,
      flavor: entry.tcmAttributes.flavor,
      channelTropism: entry.tcmAttributes.channelTropism,
      primaryAction: entry.tcmAttributes.primaryAction,
    },
  };
}

/**
 * Creates a read-only TerminologyDictionary instance wrapping an array of TcmEntries.
 */
export function createTcmDictionary(
  entries: TcmEntry[] = TCM_REGISTRY,
  name = 'Traditional Chinese Medicine (TCM) Dictionary'
): TerminologyDictionary {
  const domain: KnowledgeDomain = 'y-hoc-co-truyen';
  const mappedEntries = entries.map(mapTcmEntryToTerminology);

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
      return searchTerminologyEntries(mappedEntries, query);
    },
    listAll(): TerminologyEntry[] {
      return [...mappedEntries];
    },
  };
}

/**
 * Singleton instance of the TCM Terminology Dictionary.
 */
export const scholarTcmDictionary = createTcmDictionary(TCM_REGISTRY);
