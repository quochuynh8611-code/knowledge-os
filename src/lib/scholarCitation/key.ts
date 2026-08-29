export type CitationEntityType = 'term' | 'lex' | 'sys' | 'rel';

export interface CitationKeyParams {
  domain: string;
  entityType: CitationEntityType;
  slugOrCode: string;
  sourceTitle?: string;
  sectionRef?: string;
  fallbackId?: string;
}


/**
 * Removes Vietnamese and Pāli/Sanskrit diacritics to produce clean ASCII.
 */
function removeDiacritics(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[ṅṄ]/g, 'n')
    .replace(/[ñÑ]/g, 'n')
    .replace(/[ṇṆ]/g, 'n')
    .replace(/[ṭṬ]/g, 't')
    .replace(/[ḍḌ]/g, 'd')
    .replace(/[ḷḶ]/g, 'l')
    .replace(/[ṣṢśŚ]/g, 's')
    .replace(/[ṃṂ]/g, 'm')
    .replace(/[āĀ]/g, 'a')
    .replace(/[īĪ]/g, 'i')
    .replace(/[ūŪ]/g, 'u')
    .replace(/[ṛṚ]/g, 'r');
}

/**
 * Sanitizes a string token into a clean lowercase ASCII identifier.
 */
function sanitizeToken(str: string): string {
  return removeDiacritics(str)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Extracts a concise, clean source token from sourceTitle.
 * e.g. "Dhammasaṅgaṇī" -> "dhammasangani"
 *      "Chu Dịch (Zhou Yi)" -> "chu_dich"
 */
function extractSourceToken(sourceTitle: string): string {
  const baseTitle = sourceTitle.replace(/\s*\([^)]*\)/g, '').trim();
  const sanitized = sanitizeToken(baseTitle);
  const parts = sanitized.split('_').filter(Boolean);
  return parts.slice(0, 2).join('_');
}

/**
 * Extracts a concise section locator token.
 * e.g. "Mātika & Citta § 1" -> "1"
 *      "Thoán Truyện & Tượng Truyện - Quẻ Càn" -> "can"
 *      "Quẻ Càn" -> "can"
 */
function extractSectionToken(sectionRef: string): string {
  // 1. Check for explicit number (§ 1, #1, 1-9)
  const numberMatch = sectionRef.match(/(?:§|#|chương|tập|quẻ\s*số)?\s*(\d+(?:[-_]\d+)?)/i);
  if (numberMatch && numberMatch[1]) {
    return numberMatch[1].replace('-', '_');
  }

  // 2. If contains a dash (e.g. "Thoán Truyện - Quẻ Càn"), use the specific part after dash
  let targetRef = sectionRef;
  if (sectionRef.includes('-')) {
    const afterDash = sectionRef.split('-').slice(-1)[0].trim();
    if (afterDash) {
      targetRef = afterDash;
    }
  }

  // 3. Sanitize and remove generic helper words
  const sanitized = sanitizeToken(targetRef);
  const parts = sanitized
    .split('_')
    .filter((p) => p && !['que', 'chuong', 'pham', 'section', 'part', 'thiet', 'truyen', 'thoan', 'tuong'].includes(p));

  return parts.slice(-1)[0] || sanitized.split('_').filter(Boolean)[0] || '';
}

/**
 * Generates an ASCII-safe, deterministic citation key for LaTeX/BibTeX.
 * Formula: `${domainPrefix}_${entityType}_${cleanSlug}_${cleanSource}_${cleanRef}` (max 48 chars).
 */
export function generateCitationKey(params: CitationKeyParams): string {
  const domainPrefix = sanitizeToken(params.domain);
  const entityType = params.entityType;
  const cleanSlug = sanitizeToken(params.slugOrCode);

  const parts = [domainPrefix, entityType, cleanSlug];

  if (params.sourceTitle && params.sourceTitle.trim()) {
    const sourceToken = extractSourceToken(params.sourceTitle);
    if (sourceToken) {
      parts.push(sourceToken);
    }
  }

  if (params.sectionRef && params.sectionRef.trim()) {
    const sectionToken = extractSectionToken(params.sectionRef);
    if (sectionToken) {
      parts.push(sectionToken);
    }
  }

  if (params.fallbackId && (!params.sourceTitle || !params.sourceTitle.trim())) {
    const fallbackToken = sanitizeToken(params.fallbackId);
    const suffix = fallbackToken.slice(-4);
    if (suffix) {
      parts.push(suffix);
    }
  }

  let key = parts.filter(Boolean).join('_').replace(/_+/g, '_');

  if (key.length > 48) {
    key = key.slice(0, 48).replace(/_+$/, '');
  }

  return key;
}
