import { CitationSnapshot } from '../types';

export interface DocumentMetadata {
  documentId?: string;
  title?: string;
  author?: string;
  year?: string;
  sourceUrl?: string;
  format?: string;
  topicTitle?: string;
}

export interface DocumentLocator {
  page?: number;
  paragraph?: number;
  heading?: string;
  cfi?: string;
  [key: string]: unknown;
}

/**
 * Formats a human-readable locator label (e.g. "tr. 42", "§ 1.2", "CFI(...)")
 */
export function formatLocatorLabel(locator?: DocumentLocator): string {
  if (!locator) return '';

  const parts: string[] = [];
  if (locator.page !== undefined && locator.page !== null) {
    parts.push(`tr. ${locator.page}`);
  }
  if (locator.paragraph !== undefined && locator.paragraph !== null) {
    parts.push(`đoạn ${locator.paragraph}`);
  }
  if (locator.heading) {
    parts.push(`§ ${locator.heading}`);
  }
  if (locator.cfi) {
    parts.push(`cfi: ${locator.cfi}`);
  }

  return parts.join(', ');
}

/**
 * Generates deterministic Citation Snapshot in APA, MLA, Chicago, and Markdown formats.
 */
export function generateExcerptCitationSnapshot(
  metadata: DocumentMetadata = {},
  locator: DocumentLocator = {}
): CitationSnapshot {
  const safeMeta = metadata || {};
  const safeLocator = locator || {};

  const title = (safeMeta.title || 'Tài liệu không tên').trim();
  const author = (safeMeta.author || '').trim();
  const year = (safeMeta.year || 'n.d.').trim();
  const sourceUrl = (safeMeta.sourceUrl || '').trim();
  const locLabel = formatLocatorLabel(safeLocator);

  // 1. APA Format
  let apa = '';
  if (author) {
    apa = `${author} (${year}). *${title}*${locLabel ? `, ${locLabel}` : ''}.${sourceUrl ? ` ${sourceUrl}` : ''}`;
  } else {
    apa = `*${title}* (${year})${locLabel ? `, ${locLabel}` : ''}.${sourceUrl ? ` ${sourceUrl}` : ''}`;
  }

  // 2. MLA Format
  let mla = '';
  const mlaLoc = safeLocator.page !== undefined ? `p. ${safeLocator.page}` : locLabel;
  if (author) {
    mla = `${author}. "${title}." ${year !== 'n.d.' ? year : ''}${mlaLoc ? `, ${mlaLoc}` : ''}.${sourceUrl ? ` <${sourceUrl}>` : ''}`;
  } else {
    mla = `"${title}." ${year !== 'n.d.' ? year : ''}${mlaLoc ? `, ${mlaLoc}` : ''}.${sourceUrl ? ` <${sourceUrl}>` : ''}`;
  }

  // 3. Chicago Format
  let chicago = '';
  const chicagoLoc = safeLocator.page !== undefined ? `${safeLocator.page}` : locLabel;
  if (author) {
    chicago = `${author}, *${title}* (${year})${chicagoLoc ? `, ${chicagoLoc}` : ''}.`;
  } else {
    chicago = `*${title}* (${year})${chicagoLoc ? `, ${chicagoLoc}` : ''}.`;
  }

  // 4. Markdown Footnote / Link
  let markdown = '';
  const locParam =
    safeLocator.heading ||
    (safeLocator.page !== undefined && safeLocator.page !== null ? String(safeLocator.page) : undefined) ||
    safeLocator.cfi ||
    (safeLocator.paragraph !== undefined && safeLocator.paragraph !== null ? String(safeLocator.paragraph) : undefined);
  const archiveUri = safeMeta.documentId
    ? (locParam ? `archive://${safeMeta.documentId}?loc=${encodeURIComponent(locParam)}` : `archive://${safeMeta.documentId}`)
    : '';
  const docLink = sourceUrl || archiveUri;
  if (author) {
    markdown = `> — *${title}* (${year})${locLabel ? `, ${locLabel}` : ''} bởi ${author}.${docLink ? ` [Nguồn](${docLink})` : ''}`;
  } else {
    markdown = `> — *${title}* (${year})${locLabel ? `, ${locLabel}` : ''}.${docLink ? ` [Nguồn](${docLink})` : ''}`;
  }

  return {
    title,
    author: author || undefined,
    locator: locLabel || undefined,
    formatted: apa.trim(),
    apa: apa.trim(),
    mla: mla.trim(),
    chicago: chicago.trim(),
  };
}

/**
 * Formats a blockquote with proper citation reference provenance for appending to notes.
 */
export function formatExcerptBlockquote(
  selectedText: string,
  metadata: DocumentMetadata = {},
  locator: DocumentLocator = {}
): string {
  const safeText = (selectedText || '').trim();
  const safeMeta = metadata || {};
  const safeLocator = locator || {};

  const title = (safeMeta.title || 'Tài liệu nghiên cứu').trim();
  const author = (safeMeta.author || '').trim();
  const locLabel = formatLocatorLabel(safeLocator);
  const locParam =
    safeLocator.heading ||
    (safeLocator.page !== undefined && safeLocator.page !== null ? String(safeLocator.page) : undefined) ||
    safeLocator.cfi ||
    (safeLocator.paragraph !== undefined && safeLocator.paragraph !== null ? String(safeLocator.paragraph) : undefined);
  const archiveUri = safeMeta.documentId
    ? (locParam ? `archive://${safeMeta.documentId}?loc=${encodeURIComponent(locParam)}` : `archive://${safeMeta.documentId}`)
    : '';
  const docLink = safeMeta.sourceUrl || archiveUri;

  // Wrap prose in blockquote lines
  const textLines = safeText.split(/\r?\n/).map((line) => `> ${line}`).join('\n');

  const attributionParts: string[] = [`— *${title}*`];
  if (author) {
    attributionParts.push(author);
  }
  if (locLabel) {
    attributionParts.push(locLabel);
  }
  if (docLink) {
    attributionParts.push(`[Xem tài liệu](${docLink})`);
  }

  const attributionLine = `>\n> ${attributionParts.join(', ')}`;

  return `${textLines}\n${attributionLine}`;
}
