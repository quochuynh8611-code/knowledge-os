import { Note } from '../types';
import { parseArchiveCitation } from './readerDocumentResolver';
import { toReadablePlainTextPreview } from './markdownReadability';

export interface CitationBacklinkEntry {
  noteId: string;
  noteTitle: string;
  snippet?: string;
  referenceCount: number;
  locators: string[];
}

/**
 * Extracts and aggregates reverse citations (backlinks) from notes for the active document.
 * 
 * V1 Invariants:
 * - Scans internal Knowledge OS notes only.
 * - Extracts valid `archive://{documentId}` citations using `parseArchiveCitation`.
 * - Exact normalized `documentId` equality only (no title/path heuristics).
 * - Groups multiple citations per note into a single `CitationBacklinkEntry`.
 * - Safe against malformed URIs, blocked schemes, and undefined/empty note contents.
 * - Pure function — 0 side effects, 0 mutations, 0 vault writes.
 */
export function extractCitationBacklinks(
  notes: Note[] | undefined | null,
  activeDocumentId: string | undefined | null
): CitationBacklinkEntry[] {
  if (!notes || !Array.isArray(notes) || !activeDocumentId) {
    return [];
  }

  const normalizedActiveDocId = activeDocumentId.trim();
  if (!normalizedActiveDocId) {
    return [];
  }

  // Regex to match Markdown link URLs and bare archive URLs:
  // 1. [text](archive://...)
  // 2. bare archive://...
  const archiveUriRegex = /(?:\[([^\]]+)\]\((archive:\/\/[^\s)]+)\)|(archive:\/\/[^\s)\]]+))/gi;

  const results: CitationBacklinkEntry[] = [];

  for (const note of notes) {
    if (!note || !note.content || typeof note.content !== 'string') {
      continue;
    }

    const matches = Array.from(note.content.matchAll(archiveUriRegex));
    if (matches.length === 0) {
      continue;
    }

    const matchedLocators: string[] = [];
    let matchCount = 0;

    for (const match of matches) {
      const rawUri = match[2] || match[3] || match[0];
      const parsed = parseArchiveCitation(rawUri);
      if (!parsed) {
        continue;
      }

      const parsedDocId = parsed.documentId ? parsed.documentId.trim() : '';
      if (parsedDocId === normalizedActiveDocId) {
        matchCount++;
        if (parsed.locator) {
          const loc = parsed.locator.trim();
          if (loc && !matchedLocators.includes(loc)) {
            matchedLocators.push(loc);
          }
        }
      }
    }

    if (matchCount > 0) {
      const snippet = toReadablePlainTextPreview(note.content, 120);
      results.push({
        noteId: note.id,
        noteTitle: note.title || 'Ghi chú không tên',
        snippet: snippet || undefined,
        referenceCount: matchCount,
        locators: matchedLocators,
      });
    }
  }

  return results;
}
