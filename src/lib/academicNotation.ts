/**
 * Academic Notation Engine for Knowledge OS.
 * Provides synchronous KaTeX rendering with mhchem support,
 * diagram extraction, LRU caching, and currency collision defense.
 */

import katex from 'katex';
import 'katex/contrib/mhchem';

export interface RenderMathOptions {
  displayMode?: boolean;
  throwOnError?: boolean;
}

export type AcademicTokenType = 'text' | 'inline-math' | 'block-math' | 'mermaid';

export interface AcademicToken {
  type: AcademicTokenType;
  raw: string;
  content: string;
}

export interface MermaidBlock {
  raw: string;
  content: string;
  startIndex: number;
  endIndex: number;
}

// In-memory LRU Cache for rendered KaTeX HTML strings (max 500 entries)
const MAX_CACHE_SIZE = 500;
const mathRenderCache = new Map<string, string>();

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Synchronously renders a LaTeX mathematical or chemical formula to HTML using KaTeX.
 * Configured with security sandboxing (trust: false) and non-throwing error handling.
 */
export function renderAcademicMath(latex: string, options?: RenderMathOptions): string {
  const displayMode = Boolean(options?.displayMode);
  const cacheKey = `${displayMode ? 'D' : 'I'}:${latex}`;

  // Check LRU cache
  const cached = mathRenderCache.get(cacheKey);
  if (cached !== undefined) {
    // Refresh LRU order
    mathRenderCache.delete(cacheKey);
    mathRenderCache.set(cacheKey, cached);
    return cached;
  }

  try {
    const rendered = katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      trust: false, // Disallow \href{javascript:...} or raw unsafe HTML
      strict: false,
    });

    // Save to cache
    if (mathRenderCache.size >= MAX_CACHE_SIZE) {
      const oldestKey = mathRenderCache.keys().next().value;
      if (oldestKey !== undefined) {
        mathRenderCache.delete(oldestKey);
      }
    }
    mathRenderCache.set(cacheKey, rendered);

    return rendered;
  } catch (err: any) {
    const fallback = `<span class="katex-error text-rose-500 font-mono text-xs" title="${escapeHtml(
      err?.message || 'Lỗi cú pháp TeX'
    )}">${escapeHtml(latex)}</span>`;
    return fallback;
  }
}

/**
 * Regex for Mermaid code blocks: ```mermaid ... ```
 */
const MERMAID_BLOCK_REGEX = /```mermaid[\r\n]+([\s\S]*?)```/g;

/**
 * Extracts all Mermaid diagram code blocks from a markdown string.
 */
export function extractMermaidBlocks(markdown: string): MermaidBlock[] {
  if (!markdown || typeof markdown !== 'string') return [];

  const blocks: MermaidBlock[] = [];
  const regex = new RegExp(MERMAID_BLOCK_REGEX.source, 'g');
  let match: RegExpExecArray | null;

  while ((match = regex.exec(markdown)) !== null) {
    blocks.push({
      raw: match[0],
      content: match[1],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  return blocks;
}

/**
 * Inline Math Regex with Currency Collision Guard:
 * - Match \$ as escaped dollar
 * - Opening $: must not be followed by whitespace: (?!\s)
 * - Inner content: on the same line [^\$\n]+
 * - Closing $: must not be preceded by whitespace: (?<!\s)
 * - After closing $: must not be followed immediately by a digit: (?![0-9])
 * - Inside content: if it is solely a monetary amount like $100 or $50.00, reject as math
 */
export const INLINE_MATH_REGEX = /(?<!\\)\$(?!\s)([^\$\n]+?)(?<!\s)\$(?![0-9])/g;

/**
 * Block Math Regex: $$ ... $$
 */
export const BLOCK_MATH_REGEX = /(?<!\\)\$\$([\s\S]+?)(?<!\\)\$\$/g;

/**
 * Checks whether a content string contains any math or diagram notations.
 */
export function hasAcademicNotation(content: string): boolean {
  if (!content || typeof content !== 'string') return false;
  if (content.includes('```mermaid')) return true;
  if (content.includes('$$')) return true;

  // Check inline math
  const inlineRegex = new RegExp(INLINE_MATH_REGEX.source, 'g');
  let match: RegExpExecArray | null;
  while ((match = inlineRegex.exec(content)) !== null) {
    const inner = match[1].trim();
    // Currency rejection: pure numbers or decimal currency like 100, 50.00
    if (!/^\d+(?:\.\d{2})?$/.test(inner)) {
      return true;
    }
  }

  return false;
}

/**
 * Tokenizes markdown content into structured academic tokens:
 * text, inline-math, block-math, mermaid.
 */
export function parseAcademicNotationTokens(text: string): AcademicToken[] {
  if (!text || typeof text !== 'string') return [];

  // Protect escaped dollar signs \$ with a unique sentinel
  const ESCAPED_DOLLAR_SENTINEL = '\u0000ESC_DOLLAR\u0000';
  const sanitizedText = text.replace(/\\\$/g, ESCAPED_DOLLAR_SENTINEL);

  interface MatchedItem {
    type: 'mermaid' | 'block-math' | 'inline-math';
    raw: string;
    content: string;
    start: number;
    end: number;
  }

  const items: MatchedItem[] = [];

  // 1. Mermaid blocks
  const mermaidRegex = new RegExp(MERMAID_BLOCK_REGEX.source, 'g');
  let mMatch: RegExpExecArray | null;
  while ((mMatch = mermaidRegex.exec(sanitizedText)) !== null) {
    items.push({
      type: 'mermaid',
      raw: mMatch[0],
      content: mMatch[1],
      start: mMatch.index,
      end: mMatch.index + mMatch[0].length,
    });
  }

  // 2. Block math $$...$$
  const blockRegex = new RegExp(BLOCK_MATH_REGEX.source, 'g');
  let bMatch: RegExpExecArray | null;
  while ((bMatch = blockRegex.exec(sanitizedText)) !== null) {
    const start = bMatch.index;
    const end = start + bMatch[0].length;
    // Overlap check with mermaid
    if (!items.some((i) => start < i.end && end > i.start)) {
      items.push({
        type: 'block-math',
        raw: bMatch[0],
        content: bMatch[1],
        start,
        end,
      });
    }
  }

  // 3. Inline math $...$
  const inlineRegex = new RegExp(INLINE_MATH_REGEX.source, 'g');
  let iMatch: RegExpExecArray | null;
  while ((iMatch = inlineRegex.exec(sanitizedText)) !== null) {
    const start = iMatch.index;
    const end = start + iMatch[0].length;
    const inner = iMatch[1].trim();

    // Check overlap with block-math or mermaid
    if (items.some((i) => start < i.end && end > i.start)) {
      continue;
    }

    // Currency rejection: pure numbers e.g. 50, 100, 50.00
    if (/^\d+(?:\.\d{1,2})?$/.test(inner)) {
      continue;
    }

    items.push({
      type: 'inline-math',
      raw: iMatch[0],
      content: iMatch[1],
      start,
      end,
    });
  }

  // Sort items by starting position
  items.sort((a, b) => a.start - b.start);

  // Construct tokens
  const tokens: AcademicToken[] = [];
  let lastIndex = 0;

  for (const item of items) {
    if (item.start > lastIndex) {
      const rawSlice = sanitizedText.slice(lastIndex, item.start);
      tokens.push({
        type: 'text',
        raw: rawSlice.replace(new RegExp(ESCAPED_DOLLAR_SENTINEL, 'g'), '$'),
        content: rawSlice.replace(new RegExp(ESCAPED_DOLLAR_SENTINEL, 'g'), '$'),
      });
    }

    tokens.push({
      type: item.type,
      raw: item.raw.replace(new RegExp(ESCAPED_DOLLAR_SENTINEL, 'g'), '$'),
      content: item.content.replace(new RegExp(ESCAPED_DOLLAR_SENTINEL, 'g'), '$'),
    });

    lastIndex = item.end;
  }

  if (lastIndex < sanitizedText.length) {
    const rawSlice = sanitizedText.slice(lastIndex);
    tokens.push({
      type: 'text',
      raw: rawSlice.replace(new RegExp(ESCAPED_DOLLAR_SENTINEL, 'g'), '$'),
      content: rawSlice.replace(new RegExp(ESCAPED_DOLLAR_SENTINEL, 'g'), '$'),
    });
  }

  return tokens;
}
