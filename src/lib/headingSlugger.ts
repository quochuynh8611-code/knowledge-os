/**
 * Deterministic heading slugger utility for Markdown outlines and DOM anchor navigation.
 * Handles Unicode diacritics, wiki-link/markdown syntax stripping, and sequential disambiguation
 * for duplicate headings (e.g. 'ghi-chu', 'ghi-chu-1', 'ghi-chu-2').
 */
export class HeadingSlugger {
  private occurrences: Map<string, number> = new Map();

  /**
   * Cleans raw heading markdown into a URL and DOM-safe base slug:
   * - Extracts alias/text from wiki-links [[Target|Alias]] or [[Target]]
   * - Extracts label from markdown links [text](url)
   * - Strips inline formatting (*, _, `, ~)
   * - Normalizes Vietnamese diacritics and replaces symbols/spaces with hyphens
   */
  static slugify(rawText: string): string {
    if (!rawText || typeof rawText !== 'string') {
      return 'heading';
    }

    const cleanedText = rawText
      .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, '$1') // Extract alias/target from wiki-links
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')           // Extract link text from markdown links
      .replace(/[*_`~]/g, '')                            // Strip bold, italic, code, strike markers
      .trim();

    const base = cleanedText
      .toLowerCase()
      .replace(/[đĐ]/g, 'd')
      .replace(/\./g, '-') // Replace periods in section numbering (e.g. 1.1 -> 1-1)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Strip diacritics
      .replace(/[^\w\s-]/g, '')        // Strip remaining punctuation except hyphens/spaces
      .trim()
      .replace(/\s+/g, '-')            // Convert whitespace to hyphen
      .replace(/-+/g, '-');            // Collapse consecutive hyphens

    return base || 'heading';
  }

  /**
   * Generates a deterministic, collision-free slug ID by appending sequential suffixes for duplicates.
   */
  slug(rawText: string): string {
    const baseSlug = HeadingSlugger.slugify(rawText);
    const count = this.occurrences.get(baseSlug) || 0;
    this.occurrences.set(baseSlug, count + 1);

    if (count === 0) {
      return baseSlug;
    }
    return `${baseSlug}-${count}`;
  }

  /**
   * Resets the occurrence counts for a new document rendering pass.
   */
  reset(): void {
    this.occurrences.clear();
  }
}
