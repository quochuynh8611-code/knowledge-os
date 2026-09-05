import {
  ObsidianWikiLinkResolver,
  ResolverDocumentItem,
  parseWikiLinkSyntax,
} from './obsidianWikiLinkResolver';
import { normalizeScholarText } from './scholarSearch';

export const MAX_TRANSCLUSION_DEPTH = 3;

export const NON_NOTE_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.svg',
  '.bmp',
  '.pdf',
  '.mp4',
  '.webm',
  '.ogv',
  '.mov',
  '.mp3',
  '.wav',
  '.m4a',
  '.ogg',
  '.aac',
  '.flac',
]);

export interface TransclusionTargetParsed {
  target: string;
  heading: string | null;
  alias: string | null;
}

export type TransclusionStatus =
  | 'success'
  | 'circular'
  | 'max_depth'
  | 'not_found'
  | 'error';

export interface TransclusionResult {
  status: TransclusionStatus;
  targetTitle: string;
  heading: string | null;
  alias: string | null;
  filePath: string | null;
  content?: string;
  message?: string;
}

export type DocumentContentFetcher = (filePath: string) => Promise<string | null>;

/**
 * Parses Obsidian transclusion syntax ![[Target#Heading|Alias]]
 */
export function parseTransclusionTarget(rawEmbed: string): TransclusionTargetParsed {
  let inner = rawEmbed.trim();
  if (inner.startsWith('![[') && inner.endsWith(']]')) {
    inner = inner.slice(3, -2).trim();
  } else if (inner.startsWith('[[') && inner.endsWith(']]')) {
    inner = inner.slice(2, -2).trim();
  }

  const pipeIndex = inner.indexOf('|');
  let targetAndHeading = inner;
  let alias: string | null = null;

  if (pipeIndex !== -1) {
    targetAndHeading = inner.slice(0, pipeIndex).trim();
    alias = inner.slice(pipeIndex + 1).trim() || null;
  }

  const hashIndex = targetAndHeading.indexOf('#');
  let target = targetAndHeading;
  let heading: string | null = null;

  if (hashIndex !== -1) {
    target = targetAndHeading.slice(0, hashIndex).trim();
    heading = targetAndHeading.slice(hashIndex + 1).trim() || null;
  }

  return {
    target,
    heading,
    alias,
  };
}

/**
 * Checks if target is a Note Transclusion (markdown) rather than media/attachment transclusion.
 */
export function isNoteTransclusion(target: string): boolean {
  if (!target || typeof target !== 'string') return false;

  const cleanTarget = target.split('#')[0].split('|')[0].trim();
  if (!cleanTarget) {
    // Pure heading link in current document e.g. ![[#Heading]]
    return true;
  }

  const dotIdx = cleanTarget.lastIndexOf('.');
  if (dotIdx === -1) {
    // No extension -> Obsidian Note
    return true;
  }

  const ext = cleanTarget.slice(dotIdx).toLowerCase();
  if (ext === '.md') {
    return true;
  }

  if (NON_NOTE_EXTENSIONS.has(ext)) {
    return false;
  }

  // Any other non-media extension or custom text without dot
  return true;
}

/**
 * Extracts content from specified heading down to next heading of equal or higher rank.
 * If heading is null/undefined/empty, returns full content.
 * If heading does not exist, returns empty string.
 */
export function extractSection(content: string, heading?: string | null): string {
  if (!content) return '';
  if (!heading || !heading.trim()) return content;

  const targetHeading = heading.trim().toLowerCase();
  const normalizedTarget = normalizeScholarText(heading);

  const lines = content.split(/\r?\n/);
  let capturing = false;
  let targetLevel = 0;
  const sectionLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^(#{1,6})\s+(.*?)(?:\s+#+)?$/);

    if (match) {
      const level = match[1].length;
      const title = match[2].trim();
      const lowerTitle = title.toLowerCase();
      const normTitle = normalizeScholarText(title);

      if (!capturing) {
        if (lowerTitle === targetHeading || normTitle === normalizedTarget) {
          capturing = true;
          targetLevel = level;
          sectionLines.push(line);
        }
      } else {
        // Stop capturing when encountering heading of equal or higher rank
        if (level <= targetLevel) {
          break;
        }
        sectionLines.push(line);
      }
    } else if (capturing) {
      sectionLines.push(line);
    }
  }

  if (!capturing) {
    return '';
  }

  return sectionLines.join('\n');
}

/**
 * High-performance Obsidian Transclusion Resolver with memoization cache,
 * circular reference guard, and recursion depth limit.
 */
export class ObsidianTransclusionResolver {
  private wikiResolver: ObsidianWikiLinkResolver;
  private cache = new Map<string, string>();

  constructor(
    documents: ResolverDocumentItem[] = [],
    private fetcher?: DocumentContentFetcher
  ) {
    this.wikiResolver = new ObsidianWikiLinkResolver(documents);
  }

  setDocuments(documents: ResolverDocumentItem[]) {
    this.wikiResolver.setDocuments(documents);
    this.cache.clear();
  }

  setFetcher(fetcher: DocumentContentFetcher) {
    this.fetcher = fetcher;
  }

  clearCache() {
    this.cache.clear();
  }

  /**
   * Resolves a transclusion target and retrieves its rendered markdown content.
   */
  async resolve(
    rawEmbed: string,
    ancestors: string[] = [],
    depth: number = 1
  ): Promise<TransclusionResult> {
    const parsed = parseTransclusionTarget(rawEmbed);

    // 1. Check max depth limit
    if (depth > MAX_TRANSCLUSION_DEPTH) {
      return {
        status: 'max_depth',
        targetTitle: parsed.target,
        heading: parsed.heading,
        alias: parsed.alias,
        filePath: null,
        message: `Đã dừng nhúng: Vượt quá giới hạn độ sâu transclusion (tối đa 3 cấp).`,
      };
    }

    // 2. Resolve target note file path using ObsidianWikiLinkResolver
    const resolution = this.wikiResolver.resolve(`[[${parsed.target}]]`);
    const filePath = resolution.filePath;

    if (!filePath) {
      return {
        status: 'not_found',
        targetTitle: parsed.target,
        heading: parsed.heading,
        alias: parsed.alias,
        filePath: null,
        message: `Không tìm thấy ghi chú "${parsed.target}" trong Vault.`,
      };
    }

    // 3. Circular reference check
    if (ancestors.includes(filePath)) {
      return {
        status: 'circular',
        targetTitle: parsed.target,
        heading: parsed.heading,
        alias: parsed.alias,
        filePath,
        message: `Phát hiện vòng lặp transclusion (Circular Reference): "${parsed.target}" đã được nhúng trong chuỗi phân cấp trước đó.`,
      };
    }

    // 4. Retrieve content from cache or fetcher
    let fullContent: string | null = null;
    if (this.cache.has(filePath)) {
      fullContent = this.cache.get(filePath)!;
    } else if (this.fetcher) {
      try {
        fullContent = await this.fetcher(filePath);
        if (fullContent !== null) {
          this.cache.set(filePath, fullContent);
        }
      } catch (err: any) {
        return {
          status: 'error',
          targetTitle: parsed.target,
          heading: parsed.heading,
          alias: parsed.alias,
          filePath,
          message: err?.message || `Lỗi khi nạp nội dung ghi chú nhúng "${parsed.target}".`,
        };
      }
    }

    if (fullContent === null) {
      return {
        status: 'not_found',
        targetTitle: parsed.target,
        heading: parsed.heading,
        alias: parsed.alias,
        filePath,
        message: `Không thể đọc nội dung ghi chú "${parsed.target}".`,
      };
    }

    // 5. Extract section if heading is requested
    const extractedContent = parsed.heading
      ? extractSection(fullContent, parsed.heading)
      : fullContent;

    return {
      status: 'success',
      targetTitle: parsed.target,
      heading: parsed.heading,
      alias: parsed.alias,
      filePath,
      content: extractedContent,
    };
  }
}
