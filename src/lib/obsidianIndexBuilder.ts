import fs from "fs";
import path from "path";
import { parseObsidianFrontmatterAndOutline } from "./obsidianParser";
import {
  ALLOWED_EXTENSIONS,
  FORBIDDEN_SEGMENTS,
  MAX_MARKDOWN_BYTES,
} from "./obsidianPathSanitizer";
import { normalizeScholarText } from "./scholarSearch";

export interface ObsidianIndexedDocument {
  title: string;
  filePath: string;
  content: string;
  tags: string[];
  mtime: string;
  sizeBytes: number;
}

export interface ObsidianSearchResult {
  title: string;
  path: string;
  snippet: string;
  score: number;
  tags?: string[];
  mtime?: string;
}

/**
 * Recursively scans a vault directory and indexes all valid Markdown files.
 * Ignores sensitive directories, symlinks, and files exceeding MAX_MARKDOWN_BYTES.
 */
export async function buildObsidianVaultIndex(
  vaultRoot: string
): Promise<ObsidianIndexedDocument[]> {
  if (!vaultRoot || typeof vaultRoot !== "string") {
    return [];
  }

  const resolvedRoot = path.resolve(vaultRoot);
  try {
    const rootStat = fs.statSync(resolvedRoot);
    if (!rootStat.isDirectory()) {
      return [];
    }
  } catch {
    return [];
  }

  const documents: ObsidianIndexedDocument[] = [];

  function walkDirectory(currentDir: string, relativeDir: string) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const ent of entries) {
      if (ent.name.startsWith(".") || FORBIDDEN_SEGMENTS.has(ent.name.toLowerCase())) {
        continue;
      }

      const fullPath = path.join(currentDir, ent.name);
      const relPath = relativeDir ? `${relativeDir}/${ent.name}` : ent.name;

      let lstat: fs.Stats;
      try {
        lstat = fs.lstatSync(fullPath);
      } catch {
        continue;
      }

      if (lstat.isSymbolicLink()) {
        continue;
      }

      if (lstat.isDirectory()) {
        walkDirectory(fullPath, relPath);
      } else if (lstat.isFile()) {
        const ext = path.extname(ent.name).toLowerCase();
        if (!ALLOWED_EXTENSIONS.has(ext)) {
          continue;
        }

        if (lstat.size > MAX_MARKDOWN_BYTES) {
          continue;
        }

        try {
          const rawContent = fs.readFileSync(fullPath, "utf8");
          const parsed = parseObsidianFrontmatterAndOutline(rawContent);

          const fileNameWithoutExt = path.basename(ent.name, ext);
          const title =
            parsed.frontmatter?.title && typeof parsed.frontmatter.title === "string"
              ? parsed.frontmatter.title.trim()
              : fileNameWithoutExt;

          const rawTags = parsed.frontmatter?.tags;
          const tags: string[] = Array.isArray(rawTags)
            ? rawTags.map(String)
            : typeof rawTags === "string"
            ? [rawTags]
            : [];

          documents.push({
            title,
            filePath: relPath,
            content: parsed.content,
            tags,
            mtime: lstat.mtime.toISOString(),
            sizeBytes: lstat.size,
          });
        } catch {
          // Skip unreadable files
          continue;
        }
      }
    }
  }

  walkDirectory(resolvedRoot, "");
  return documents;
}

/**
 * Extracts a concise snippet from content around the matching query
 */
export function extractSearchSnippet(content: string, query: string, maxLength = 140): string {
  if (!content) return "";

  // Clean markdown syntax for cleaner snippet
  const cleaned = content
    .replace(/^#+\s+/gm, "")
    .replace(/[*_`~[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!query) {
    return cleaned.slice(0, maxLength) + (cleaned.length > maxLength ? "..." : "");
  }

  const normCleaned = normalizeScholarText(cleaned);
  const normQuery = normalizeScholarText(query);

  let matchIndex = normCleaned.indexOf(normQuery);
  if (matchIndex === -1) {
    // Try matching the first token
    const firstToken = normQuery.split(/\s+/)[0];
    if (firstToken) {
      matchIndex = normCleaned.indexOf(firstToken);
    }
  }

  if (matchIndex === -1) {
    return cleaned.slice(0, maxLength) + (cleaned.length > maxLength ? "..." : "");
  }

  const start = Math.max(0, matchIndex - 40);
  const end = Math.min(cleaned.length, start + maxLength);

  let snippet = cleaned.slice(start, end).trim();
  if (start > 0) snippet = "..." + snippet;
  if (end < cleaned.length) snippet = snippet + "...";

  return snippet;
}

/**
 * In-memory search index for an Obsidian Vault
 */
export class ObsidianVaultIndex {
  private documents: ObsidianIndexedDocument[] = [];
  private isIndexed = false;
  private lastIndexedAt: string | null = null;

  async build(vaultRoot: string): Promise<void> {
    this.documents = await buildObsidianVaultIndex(vaultRoot);
    this.isIndexed = true;
    this.lastIndexedAt = new Date().toISOString();
  }

  isReady(): boolean {
    return this.isIndexed;
  }

  getLastIndexedAt(): string | null {
    return this.lastIndexedAt;
  }

  getDocCount(): number {
    return this.documents.length;
  }

  search(query: string, limit = 50): ObsidianSearchResult[] {
    const trimmed = (query || "").trim();
    if (!trimmed) return [];

    const normQuery = normalizeScholarText(trimmed);
    const queryTokens = normQuery.split(/\s+/).filter(Boolean);

    const scoredResults: ObsidianSearchResult[] = [];

    for (const doc of this.documents) {
      const normTitle = normalizeScholarText(doc.title);
      const normPath = normalizeScholarText(doc.filePath);
      const normContent = normalizeScholarText(doc.content);
      const normTags = doc.tags.map((t) => normalizeScholarText(t));

      let score = 0;

      // Title match
      if (normTitle === normQuery) {
        score += 100;
      } else if (normTitle.startsWith(normQuery)) {
        score += 80;
      } else if (normTitle.includes(normQuery)) {
        score += 60;
      } else if (queryTokens.length > 1 && queryTokens.every((tok) => normTitle.includes(tok))) {
        score += 50;
      }

      // Tag match
      for (const t of normTags) {
        if (t === normQuery || t.includes(normQuery)) {
          score += 45;
          break;
        }
      }

      // File path match
      if (normPath.includes(normQuery)) {
        score += 30;
      }

      // Content match
      if (normContent.includes(normQuery)) {
        score += 25;
        // Density bonus
        const occurrences = (normContent.match(new RegExp(normQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
        score += Math.min(occurrences * 3, 30);
      } else if (queryTokens.length > 1 && queryTokens.some((tok) => normContent.includes(tok))) {
        score += 15;
      }

      if (score > 0) {
        scoredResults.push({
          title: doc.title,
          path: doc.filePath,
          snippet: extractSearchSnippet(doc.content, trimmed),
          score,
          tags: doc.tags,
          mtime: doc.mtime,
        });
      }
    }

    // Sort by score descending, then by title ascending
    scoredResults.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: "base" });
    });

    return scoredResults.slice(0, limit);
  }
}
