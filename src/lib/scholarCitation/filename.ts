/**
 * Pure helper module for sanitizing and generating deterministic, filesystem-safe filenames
 * for scholar citation exports (single & batch).
 */

/**
 * Sanitizes a raw title, citation key, or identifier into an ASCII filesystem-safe string.
 * Strips diacritics (e.g. Pali/Vietnamese accents), converts whitespace and symbols to underscores,
 * eliminates path traversal patterns ('..', '/', '\\'), and collapses consecutive underscores.
 */
export function sanitizeCitationFilename(raw: string, fallback = 'citation'): string {
  if (!raw || typeof raw !== 'string') {
    return fallback;
  }

  const cleanFallback = fallback && fallback.trim() ? fallback.trim() : 'citation';

  // 1. Normalize Unicode and strip diacritical marks (NFD decompose + strip combining diacriticals)
  const ascii = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // 2. Remove dangerous path traversal and system characters
  const safeChars = ascii
    .replace(/\.\.+/g, '') // remove ..
    .replace(/[/\\?%*:|"<>]/g, '_') // remove path separators and invalid OS filename chars
    .replace(/[\s\t\n\r]+/g, '_') // convert whitespace to underscores
    .replace(/[^a-zA-Z0-9_\-.]/g, '_') // only allow alphanumeric, underscore, hyphen, dot
    .replace(/_+/g, '_') // collapse multiple underscores
    .replace(/^_+|_+$/g, '') // trim leading/trailing underscores
    .toLowerCase();

  return safeChars.length > 0 ? safeChars.slice(0, 120) : cleanFallback;
}

/**
 * Generates a deterministic filename for single-item scholar citation downloads (.bib or .json).
 */
export function getScholarCitationSingleFilename(citationKey: string, format: 'bib' | 'json'): string {
  const sanitizedKey = sanitizeCitationFilename(citationKey, 'citation');
  return `${sanitizedKey}.${format}`;
}

/**
 * Generates a deterministic filename for batch scholar citation downloads (.bib or .json).
 */
export function getScholarCitationBatchFilename(
  identifier: string,
  format: 'bib' | 'json',
  prefix = 'matrix_relations'
): string {
  const sanitizedIdentifier = sanitizeCitationFilename(identifier, 'all');
  const sanitizedPrefix = sanitizeCitationFilename(prefix, 'matrix_relations');
  return `${sanitizedPrefix}_${sanitizedIdentifier}.${format}`;
}
