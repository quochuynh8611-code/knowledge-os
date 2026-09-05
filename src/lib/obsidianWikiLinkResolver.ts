import { normalizeScholarText } from "./scholarSearch";

function getBaseNameWithoutExt(filePath: string): string {
  const lastSlash = Math.max(filePath.lastIndexOf("/"), filePath.lastIndexOf("\\"));
  const fileName = lastSlash !== -1 ? filePath.slice(lastSlash + 1) : filePath;
  const lastDot = fileName.lastIndexOf(".");
  return lastDot !== -1 ? fileName.slice(0, lastDot) : fileName;
}

export interface WikiLinkParsed {
  targetTitle: string;
  heading?: string;
  alias: string;
}

export interface WikiLinkResolution {
  targetTitle: string;
  heading?: string;
  alias: string;
  filePath: string | null;
}

export interface ResolverDocumentItem {
  title: string;
  filePath: string;
}

/**
 * Parses Obsidian wiki-link syntax [[Target#Heading|Alias]]
 */
export function parseWikiLinkSyntax(rawLink: string): WikiLinkParsed {
  let inner = rawLink.trim();
  if (inner.startsWith("[[") && inner.endsWith("]]")) {
    inner = inner.slice(2, -2).trim();
  }

  const pipeIndex = inner.indexOf("|");
  let targetPart = inner;
  let aliasPart: string | undefined = undefined;

  if (pipeIndex !== -1) {
    targetPart = inner.slice(0, pipeIndex).trim();
    aliasPart = inner.slice(pipeIndex + 1).trim();
  }

  let targetTitle = targetPart;
  let heading: string | undefined = undefined;

  const hashIndex = targetPart.indexOf("#");
  if (hashIndex !== -1) {
    targetTitle = targetPart.slice(0, hashIndex).trim();
    heading = targetPart.slice(hashIndex + 1).trim() || undefined;
  }

  const alias = aliasPart !== undefined ? aliasPart : targetPart;

  return {
    targetTitle,
    heading,
    alias,
  };
}

/**
 * High-performance resolver for Obsidian Wiki-Links with internal memoization cache
 */
export class ObsidianWikiLinkResolver {
  private cache = new Map<string, string | null>();

  constructor(private documents: ResolverDocumentItem[] = []) {}

  setDocuments(documents: ResolverDocumentItem[]) {
    this.documents = documents;
    this.cache.clear();
  }

  resolve(rawLink: string): WikiLinkResolution {
    const parsed = parseWikiLinkSyntax(rawLink);

    // Anchor link within the current document
    if (!parsed.targetTitle && parsed.heading) {
      return {
        targetTitle: "",
        heading: parsed.heading,
        alias: parsed.alias,
        filePath: "",
      };
    }

    const cacheKey = parsed.targetTitle.toLowerCase();
    if (this.cache.has(cacheKey)) {
      return {
        targetTitle: parsed.targetTitle,
        heading: parsed.heading,
        alias: parsed.alias,
        filePath: this.cache.get(cacheKey)!,
      };
    }

    const normTarget = normalizeScholarText(parsed.targetTitle);
    let resolvedPath: string | null = null;

    // 1. Match frontmatter title
    for (const doc of this.documents) {
      if (
        doc.title.toLowerCase() === parsed.targetTitle.toLowerCase() ||
        normalizeScholarText(doc.title) === normTarget
      ) {
        resolvedPath = doc.filePath;
        break;
      }
    }

    // 2. Match filename without extension
    if (!resolvedPath) {
      for (const doc of this.documents) {
        const baseName = getBaseNameWithoutExt(doc.filePath);
        if (
          baseName.toLowerCase() === parsed.targetTitle.toLowerCase() ||
          normalizeScholarText(baseName) === normTarget
        ) {
          resolvedPath = doc.filePath;
          break;
        }
      }
    }

    this.cache.set(cacheKey, resolvedPath);

    return {
      targetTitle: parsed.targetTitle,
      heading: parsed.heading,
      alias: parsed.alias,
      filePath: resolvedPath,
    };
  }
}
