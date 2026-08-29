/**
 * LaTeX special character replacement map for BibTeX export.
 * Escapes: &, %, _, #, {, }, ~, ^
 */
const ESCAPE_MAP: Record<string, string> = {
  '&': '\\&',
  '%': '\\%',
  '_': '\\_',
  '#': '\\#',
  '{': '\\{',
  '}': '\\}',
  '~': '\\textasciitilde{}',
  '^': '\\textasciicircum{}',
};

/**
 * Escapes LaTeX reserved characters for BibTeX export while preserving
 * full Unicode glyphs (Pāli IAST, Sanskrit Devanagari, and Chinese characters).
 */
export function escapeBibTeX(text: string): string {
  if (!text) return '';
  return text.replace(/[&%_#{}\~^]/g, (char) => ESCAPE_MAP[char] ?? char);
}
