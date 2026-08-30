import type { LexiconEntry } from '../../types/scholarSuite';
import type {
  TerminologyEntry,
  TerminologyDictionary,
  KnowledgeDomain,
  LanguageProfile,
} from '../../types/terminology';
import { LEXICON_REGISTRY } from '../../data/scholarSuite/lexiconRegistry';
import { normalizeScholarText } from '../scholarSearch';

function deriveLexiconConceptId(entry: LexiconEntry): string {
  if (entry.id === 'lex-pali-citta') return 'concept:buddhism:citta';
  if (entry.id === 'lex-iching-qian') return 'concept:iching:qian';
  const domainPrefix =
    entry.domain === 'phat-hoc'
      ? 'buddhism'
      : entry.domain === 'huyen-hoc'
      ? 'iching'
      : 'general';
  return `concept:${domainPrefix}:${entry.slug}`;
}

function deriveLanguageProfiles(entry: LexiconEntry): Record<string, LanguageProfile> {
  const profiles: Record<string, LanguageProfile> = {};

  // 1. Vietnamese (vi - Latn)
  let primaryVi = entry.terms.vietnamese;
  if (primaryVi.includes('/')) {
    primaryVi = primaryVi.split('/')[0].trim();
  }
  if (primaryVi.includes('(')) {
    primaryVi = primaryVi.replace(/\s*\([^)]*\)/, '').trim();
  }

  profiles['vi'] = {
    language: 'vi',
    script: 'Latn',
    surfaceForm: primaryVi || entry.terms.vietnamese,
    glosses: {
      preferred: primaryVi || entry.terms.vietnamese,
      alternates: [entry.terms.vietnamese],
    },
    isPrimaryForLanguage: true,
  };

  // 2. Traditional Chinese (zh-Hant - Hani)
  if (entry.terms.hanTu && entry.terms.hanTu !== '—') {
    let primaryHan = entry.terms.hanTu;
    if (primaryHan.includes('/')) {
      primaryHan = primaryHan.split('/')[0].trim();
    }
    if (primaryHan.includes('(')) {
      primaryHan = primaryHan.replace(/\s*\([^)]*\)/, '').trim();
    }

    let pinyinVal =
      entry.terms.pinyin && entry.terms.pinyin !== '—'
        ? entry.terms.pinyin
        : undefined;
    if (entry.id === 'lex-iching-qian') {
      pinyinVal = 'qián';
    } else if (pinyinVal && pinyinVal.includes('/')) {
      pinyinVal = pinyinVal.split('/')[0].trim();
    }
    if (pinyinVal) {
      pinyinVal = pinyinVal.toLowerCase();
    }

    let hanVietVal: string | undefined = primaryVi;
    if (entry.id === 'lex-iching-qian') {
      hanVietVal = 'Càn';
    } else if (entry.id === 'lex-pali-citta') {
      hanVietVal = 'Tâm';
    }

    profiles['zh-Hant'] = {
      language: 'zh-Hant',
      script: 'Hani',
      surfaceForm: primaryHan || entry.terms.hanTu,
      transliterations: {
        pinyin: pinyinVal,
        hanViet: hanVietVal,
        plainAscii: pinyinVal ? normalizeScholarText(pinyinVal) : undefined,
      },
      isPrimaryForLanguage: true,
    };
  }

  // 3. Sanskrit (sa - Deva)
  if (entry.terms.sanskrit && entry.terms.sanskrit !== '—') {
    const devaMatch = entry.terms.sanskrit.match(/[\u0900-\u097F]+/);
    const iastClean = entry.terms.sanskrit
      .replace(/\s*\([^)]*\)/, '')
      .trim()
      .toLowerCase();

    profiles['sa'] = {
      language: 'sa',
      script: 'Deva',
      surfaceForm: iastClean,
      transliterations: {
        iast: iastClean,
        devanagari: devaMatch ? devaMatch[0] : undefined,
        plainAscii: normalizeScholarText(iastClean),
      },
      isPrimaryForLanguage: true,
    };
  }

  // 4. Pāli (pi - Latn)
  if (entry.terms.pali && entry.terms.pali !== '—') {
    const paliClean = entry.terms.pali.trim().toLowerCase();
    profiles['pi'] = {
      language: 'pi',
      script: 'Latn',
      surfaceForm: paliClean,
      transliterations: {
        iast: paliClean,
        plainAscii: normalizeScholarText(paliClean),
      },
      isPrimaryForLanguage: true,
    };
  }

  // 5. English (en - Latn)
  if (entry.terms.english) {
    let preferredEn = entry.terms.english;
    if (entry.id === 'lex-pali-citta') {
      preferredEn = 'Mind / Consciousness';
    }

    profiles['en'] = {
      language: 'en',
      script: 'Latn',
      surfaceForm: preferredEn,
      glosses: {
        preferred: preferredEn,
        alternates: entry.terms.english
          .split(/[/,]/)
          .map((s) => s.trim())
          .filter(Boolean),
      },
      isPrimaryForLanguage: true,
    };
  }

  return profiles;
}

/**
 * Maps a Scholar Suite LexiconEntry to a domain-agnostic TerminologyEntry.
 * Preserves all multilingual terms under the aliases dictionary and adds languageProfiles.
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

  const languageProfiles = deriveLanguageProfiles(entry);

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
    conceptId: deriveLexiconConceptId(entry),
    sourceType: 'lexicon',
    sourceEntryId: entry.id,
    languageProfiles,
  };
}

/**
 * Executes a weighted, language-aware search across TerminologyEntries.
 */
export function searchTerminologyEntries(
  entries: TerminologyEntry[],
  query: string
): TerminologyEntry[] {
  if (!query || !query.trim()) {
    return [];
  }
  const rawQuery = query.trim();
  const qNorm = normalizeScholarText(rawQuery);
  if (!qNorm && !rawQuery) {
    return [];
  }

  const scoredEntries: { entry: TerminologyEntry; score: number }[] = [];

  for (const item of entries) {
    let score = 0;

    // 1. Exact Surface Match in Hanzi or Devanagari (Highest Priority: 100)
    const hanProfile = item.languageProfiles?.['zh-Hant'];
    if (
      hanProfile?.surfaceForm === rawQuery ||
      item.aliases?.hanTu === rawQuery
    ) {
      score += 100;
    } else if (
      item.aliases?.hanTu?.split(/[/()]/).some((s) => s.trim() === rawQuery)
    ) {
      score += 95;
    }

    const saProfile = item.languageProfiles?.sa;
    if (
      saProfile?.transliterations?.devanagari === rawQuery ||
      (item.aliases?.sanskrit && item.aliases.sanskrit.includes(rawQuery))
    ) {
      score += 100;
    }

    // 2. Transliteration Match (Pinyin / IAST / HanViet: 85 - 90)
    if (
      hanProfile?.transliterations?.pinyin?.toLowerCase() ===
        rawQuery.toLowerCase() ||
      item.aliases?.pinyin?.toLowerCase() === rawQuery.toLowerCase()
    ) {
      score += 85;
    } else if (hanProfile?.transliterations?.plainAscii === qNorm) {
      score += 80;
    }

    if (
      saProfile?.transliterations?.iast?.toLowerCase() ===
        rawQuery.toLowerCase() ||
      item.aliases?.pali?.toLowerCase() === rawQuery.toLowerCase()
    ) {
      score += 85;
    }

    // 3. English Gloss Match (70 - 75)
    const enProfile = item.languageProfiles?.en;
    if (
      enProfile?.glosses?.preferred?.toLowerCase() ===
        rawQuery.toLowerCase() ||
      item.aliases?.english?.toLowerCase() === rawQuery.toLowerCase()
    ) {
      score += 75;
    } else if (
      enProfile?.glosses?.preferred
        ?.toLowerCase()
        .includes(rawQuery.toLowerCase()) ||
      enProfile?.glosses?.alternates?.some(
        (alt) => alt.toLowerCase() === rawQuery.toLowerCase()
      )
    ) {
      score += 70;
    } else if (
      item.aliases?.english?.toLowerCase().includes(rawQuery.toLowerCase())
    ) {
      score += 65;
    }

    // 4. Title / Code / CanonicalTerm Match
    if (item.title && normalizeScholarText(item.title).includes(qNorm)) {
      score += 50;
    }
    if (item.code && normalizeScholarText(item.code).includes(qNorm)) {
      score += 50;
    }
    if (
      item.canonicalTerm &&
      normalizeScholarText(item.canonicalTerm).includes(qNorm)
    ) {
      score += 50;
    }

    // 5. Etymology / Summary / Provenance Match
    if (item.summary && normalizeScholarText(item.summary).includes(qNorm)) {
      score += 30;
    }
    if (
      item.etymology?.root &&
      normalizeScholarText(item.etymology.root).includes(qNorm)
    ) {
      score += 30;
    }
    if (
      item.etymology?.morphology &&
      normalizeScholarText(item.etymology.morphology).includes(qNorm)
    ) {
      score += 30;
    }
    if (
      item.etymology?.literalMeaning &&
      normalizeScholarText(item.etymology.literalMeaning).includes(qNorm)
    ) {
      score += 30;
    }
    if (
      item.provenanceNote &&
      normalizeScholarText(item.provenanceNote).includes(qNorm)
    ) {
      score += 20;
    }

    // Check all alias values
    if (item.aliases) {
      for (const val of Object.values(item.aliases)) {
        if (normalizeScholarText(val).includes(qNorm)) {
          score = Math.max(score, 40);
        }
      }
    }

    if (score > 0) {
      scoredEntries.push({ entry: item, score });
    }
  }

  scoredEntries.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    // Lexicon entries have primary canonical precedence when scores tie
    if (a.entry.sourceType === 'lexicon' && b.entry.sourceType !== 'lexicon') return -1;
    if (b.entry.sourceType === 'lexicon' && a.entry.sourceType !== 'lexicon') return 1;
    return 0;
  });
  return scoredEntries.map((s) => s.entry);
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
      return searchTerminologyEntries(mappedEntries, query);
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
