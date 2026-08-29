import type { SystemNode } from '../../types/scholarSuite';
import type { TerminologyEntry, TerminologySource } from '../../types/terminology';

/**
 * Derives a canonical search term for a SystemNode based on its specific domain and title format.
 */
function deriveCanonicalTerm(node: SystemNode): string {
  // For Cetasika / Pāli nodes, extract parenthesized Pāli term if present: e.g. "Tâm Sở Tín (Saddhā)" -> "Saddhā"
  const paliMatch = node.title.match(/\(([^)]+)\)/);
  if (paliMatch && paliMatch[1]) {
    // If it's a single word or transliterated term like Saddhā, Avijjā, Hetu-paccaya
    const term = paliMatch[1].trim();
    if (!term.includes('Bát Thuần') && !term.includes('Trời') && !term.includes('Chính Bắc')) {
      return term;
    }
  }

  // For I Ching hexagrams: extract primary hexagram name e.g. "Thuần Càn (Bát Thuần Càn)" -> "Thuần Càn"
  if (node.systemType === 'iching_64') {
    const cleanTitle = node.title.replace(/\s*\([^)]*\)/, '').trim();
    if (cleanTitle) return cleanTitle;
  }

  return node.title;
}

/**
 * Extracts searchable attributes as aliases depending on the discriminated systemType.
 */
function extractSystemNodeAliases(node: SystemNode): Record<string, string> {
  const aliases: Record<string, string> = {};

  switch (node.systemType) {
    case 'iching_64':
      aliases.upperTrigram = node.attributes.upperTrigram;
      aliases.lowerTrigram = node.attributes.lowerTrigram;
      aliases.element = node.attributes.element;
      aliases.nature = node.attributes.nature;
      aliases.judgmentText = node.attributes.judgmentText;
      aliases.imageText = node.attributes.imageText;
      break;

    case 'cetasika_52':
      aliases.group = node.attributes.group;
      aliases.subGroup = node.attributes.subGroup;
      aliases.characteristic = node.attributes.characteristic;
      aliases.function = node.attributes.function;
      aliases.manifestation = node.attributes.manifestation;
      aliases.proximateCause = node.attributes.proximateCause;
      break;

    case 'citta_89_121':
      aliases.plane = node.attributes.plane;
      aliases.cittaType = node.attributes.cittaType;
      aliases.feeling = node.attributes.feeling;
      aliases.prompting = node.attributes.prompting;
      if (Array.isArray(node.attributes.roots)) {
        aliases.roots = node.attributes.roots.join(', ');
      }
      break;

    case 'patthana_24':
      aliases.paliName = node.attributes.paliName;
      aliases.conditionGroup = node.attributes.conditionGroup;
      aliases.scope = node.attributes.scope;
      break;

    case 'paticcasamuppada_12':
      aliases.timePeriod = node.attributes.timePeriod;
      aliases.linkTier = node.attributes.linkTier;
      break;

    case 'qimen_9':
      aliases.direction = node.attributes.direction;
      aliases.element = node.attributes.element;
      aliases.door = node.attributes.door;
      aliases.star = node.attributes.star;
      aliases.deity = node.attributes.deity;
      break;
  }

  return aliases;
}

/**
 * Maps a Scholar Suite SystemNode into a canonical TerminologyEntry.
 * Pure adapter: does not mutate source data.
 */
export function mapSystemNodeToTerminology(node: SystemNode): TerminologyEntry {
  if (!node || typeof node !== 'object') {
    throw new TypeError('SystemNode must be a non-null object');
  }

  const canonicalTerm = deriveCanonicalTerm(node);
  const aliases = extractSystemNodeAliases(node);

  const sources: TerminologySource[] = Array.isArray(node.sources)
    ? node.sources.map((s) => ({
        sourceTitle: s.sourceTitle,
        sectionRef: s.sectionRef,
        ptsRef: s.ptsRef,
        taishoRef: s.taishoRef,
        standardEdition: s.standardEdition,
      }))
    : [];

  return {
    id: node.id,
    title: node.title,
    domain: node.domain,
    code: node.code,
    canonicalTerm,
    aliases,
    summary: node.canonicalMeaning,
    provenanceNote: node.provenanceNote || node.crossDomainAnalogy,
    sources,
  };
}
