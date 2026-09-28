import type {
  ReaderDocumentFormat,
  FlashcardCitationProvenance,
} from '../types/flashcard';

export interface NormalizedLocatorResult {
  isValid: boolean;
  canonicalLocator?: string;
  format: ReaderDocumentFormat;
  errorReason?:
    | 'invalid_epub_cfi'
    | 'invalid_pdf_page'
    | 'invalid_md_heading'
    | 'unsupported_format';
}

/**
 * Pure function to normalize and validate locators based on format semantics:
 * - epub: CFI string (must start with 'epubcfi(' and end with ')')
 * - pdf: Normalized to 'page=<n>' with n >= 1
 * - md: Normalized heading anchor slug (lowercase, trimmed, hashes removed)
 *
 * An empty, whitespace-only, or undefined locator is treated as a valid fallback to the start of the document.
 */
export function normalizeCitationLocator(
  format: ReaderDocumentFormat,
  rawLocator?: string | null
): NormalizedLocatorResult {
  const validFormats: ReaderDocumentFormat[] = ['epub', 'pdf', 'md'];
  if (!validFormats.includes(format)) {
    return { isValid: false, format, errorReason: 'unsupported_format' };
  }

  if (rawLocator === undefined || rawLocator === null || !rawLocator.trim()) {
    return { isValid: true, canonicalLocator: undefined, format };
  }

  const trimmed = rawLocator.trim();

  if (format === 'epub') {
    const isValidCfi = trimmed.startsWith('epubcfi(') && trimmed.endsWith(')');
    return isValidCfi
      ? { isValid: true, canonicalLocator: trimmed, format }
      : { isValid: false, format, errorReason: 'invalid_epub_cfi' };
  }

  if (format === 'pdf') {
    const match = trimmed.match(/^(?:page=)?(\d+)$/i);
    if (match) {
      const pageNum = parseInt(match[1], 10);
      if (pageNum >= 1) {
        return { isValid: true, canonicalLocator: `page=${pageNum}`, format };
      }
    }
    return { isValid: false, format, errorReason: 'invalid_pdf_page' };
  }

  if (format === 'md') {
    const slug = trimmed.replace(/^#+/, '').trim().toLowerCase();
    return slug.length > 0
      ? { isValid: true, canonicalLocator: slug, format }
      : { isValid: false, format, errorReason: 'invalid_md_heading' };
  }

  return { isValid: false, format, errorReason: 'unsupported_format' };
}

/**
 * Validates that an object conforms to FlashcardCitationProvenance contract.
 */
export function isValidCitationProvenance(
  raw: unknown
): raw is FlashcardCitationProvenance {
  if (!raw || typeof raw !== 'object') return false;
  const p = raw as Record<string, unknown>;
  const validFormats: ReaderDocumentFormat[] = ['epub', 'pdf', 'md'];

  if (
    typeof p.documentId !== 'string' ||
    !p.documentId.trim() ||
    typeof p.documentTitle !== 'string' ||
    !p.documentTitle.trim() ||
    typeof p.format !== 'string' ||
    !validFormats.includes(p.format as ReaderDocumentFormat)
  ) {
    return false;
  }

  if (p.locator !== undefined && p.locator !== null) {
    if (typeof p.locator !== 'string') return false;
    const locResult = normalizeCitationLocator(
      p.format as ReaderDocumentFormat,
      p.locator
    );
    if (!locResult.isValid) return false;
  }

  return true;
}
