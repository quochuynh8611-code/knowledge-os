/**
 * Academic Manuscript Compiler & Live Citekey ([@key]) Engine (ADR-113).
 *
 * Provides Pandoc/LaTeX-style in-text citation parsing ([@key], [@key, p. 12], [@key1; @key2]),
 * multi-section manuscript assembly, style-aware in-text citation resolution (APA, IEEE, MLA,
 * Chicago, Harvard), auto-bibliography compilation, and multi-format export (Markdown, LaTeX .tex,
 * BibTeX .bib).
 *
 * Strictly zero database migrations: runtime pure functions with hermetic execution.
 */

import type { Resource } from '../types';
import {
  extractAcademicMetadataFromResource,
  extractResourceYear,
  generateAPACitation,
  generateIEEECitation,
  generateMLACitation,
  generateChicagoCitation,
  generateHarvardCitation,
} from './citationGenerator';
import { generateResourceCitekey } from './literatureMatrixEngine';

export type ManuscriptCitationStyle = 'apa' | 'ieee' | 'mla' | 'chicago' | 'harvard';

export interface CitekeyRegistryEntry {
  citekey: string;
  resource: Resource;
  authorLastName: string;
  year: string;
}

export interface ParsedCitationItem {
  citekey: string;
  locator?: string;
  rawToken: string;
}

export interface ParsedCitationCluster {
  fullMatch: string;
  startIndex: number;
  endIndex: number;
  items: ParsedCitationItem[];
}

export interface ManuscriptSectionInput {
  id: string;
  title: string;
  content: string;
}

export interface CompileManuscriptInput {
  title: string;
  author?: string;
  abstract?: string;
  bodyMarkdown?: string;
  sections?: ManuscriptSectionInput[];
  resources: Resource[];
  style?: ManuscriptCitationStyle;
  includeUncitedResources?: boolean;
  appendixMarkdown?: string;
}

export interface CompiledManuscriptResult {
  compiledMarkdown: string;
  bibliographyMarkdown: string;
  latexSource: string;
  bibtexSource: string;
  citedResources: Resource[];
  unresolvedCitekeys: string[];
  wordCount: number;
  citationCount: number;
  style: ManuscriptCitationStyle;
}

/**
 * Normalizes Vietnamese and accented text to plain ASCII.
 */
function normalizeAscii(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

/**
 * Extracts author last name / family name formatted for in-text citations.
 */
function extractAuthorLastName(rawAuthor?: string): string {
  if (!rawAuthor || !rawAuthor.trim()) return 'Anon.';

  const author = rawAuthor.trim();
  if (author.includes(',')) {
    return author.split(',')[0].trim();
  }

  const words = author.split(/\s+/).filter(Boolean);
  const firstNormalized = normalizeAscii(words[0]);

  const vietnameseSurnames = new Set([
    'nguyen', 'tran', 'le', 'pham', 'hoang', 'huynh',
    'phan', 'vu', 'vo', 'dang', 'bui', 'do', 'ho',
    'ngo', 'duong', 'ly', 'dinh', 'doan', 'lam', 'truong',
  ]);

  if (vietnameseSurnames.has(firstNormalized)) {
    return words[0];
  }

  return words[words.length - 1];
}

/**
 * Builds a deterministic citekey registry with collision disambiguation.
 */
export function buildCitekeyRegistry(resources: Resource[]): Map<string, CitekeyRegistryEntry> {
  const registry = new Map<string, CitekeyRegistryEntry>();
  const baseKeyCounts = new Map<string, number>();

  for (const res of resources) {
    const baseKey = generateResourceCitekey(res);
    const authorLastName = extractAuthorLastName(res.author);
    const year = extractResourceYear(res);

    let finalKey = baseKey;
    const existingCount = baseKeyCounts.get(baseKey) || 0;

    if (existingCount > 0) {
      // Disambiguation suffixes: 1 -> 'b', 2 -> 'c', 3 -> 'd', etc.
      const suffixChar = String.fromCharCode(97 + existingCount); // 98 = 'b'
      finalKey = `${baseKey}${suffixChar}`;
    }

    baseKeyCounts.set(baseKey, existingCount + 1);

    registry.set(finalKey, {
      citekey: finalKey,
      resource: res,
      authorLastName,
      year: year !== 'n.d.' ? year : 'n.d.',
    });
  }

  return registry;
}

/**
 * Parses Pandoc/LaTeX-style inline citation clusters:
 * [@vaswani2017], [@vaswani2017, p. 42], [@vaswani2017, p. 4; @ye2024]
 * while ignoring Markdown links [text](url) and footnotes [^1], [^SRC-1].
 */
export function extractCitationClusters(text: string): ParsedCitationCluster[] {
  const clusters: ParsedCitationCluster[] = [];
  // Matches [...] where the content inside starts with @ and contains valid citekey chars,
  // not preceded by ! (images) and not followed by ( (markdown links).
  const regex = /\[(@[a-zA-Z0-9_-]+(?:\s*,\s*[^;\]]+)?(?:\s*;\s*@[a-zA-Z0-9_-]+(?:\s*,\s*[^;\]]+)?)*)\](?!\()/g;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const fullMatch = match[0];
    const inner = match[1];
    const startIndex = match.index;
    const endIndex = startIndex + fullMatch.length;

    const rawParts = inner.split(/\s*;\s*/);
    const items: ParsedCitationItem[] = [];

    for (const part of rawParts) {
      const trimmed = part.trim();
      if (!trimmed.startsWith('@')) continue;

      const withoutAt = trimmed.slice(1).trim();
      const commaIdx = withoutAt.indexOf(',');

      let citekey: string;
      let locator: string | undefined;

      if (commaIdx !== -1) {
        citekey = withoutAt.slice(0, commaIdx).trim();
        locator = withoutAt.slice(commaIdx + 1).trim();
      } else {
        citekey = withoutAt;
      }

      items.push({
        citekey,
        locator,
        rawToken: trimmed,
      });
    }

    if (items.length > 0) {
      clusters.push({
        fullMatch,
        startIndex,
        endIndex,
        items,
      });
    }
  }

  return clusters;
}

/**
 * Searches the citekey registry for autocomplete suggestions.
 */
export function searchCitekeySuggestions(
  registry: Map<string, CitekeyRegistryEntry>,
  query: string
): CitekeyRegistryEntry[] {
  const cleanQ = query.trim().replace(/^@/, '').toLowerCase();
  const results: CitekeyRegistryEntry[] = [];

  for (const entry of registry.values()) {
    if (!cleanQ) {
      results.push(entry);
      continue;
    }

    const matchKey = entry.citekey.toLowerCase().includes(cleanQ);
    const matchTitle = entry.resource.title.toLowerCase().includes(cleanQ);
    const matchAuthor = (entry.resource.author || '').toLowerCase().includes(cleanQ);

    if (matchKey || matchTitle || matchAuthor) {
      results.push(entry);
    }
  }

  return results;
}

/**
 * Formats a BibTeX entry with a specified citekey.
 */
function generateBibTeXEntryWithKey(resource: Resource, citekey: string): string {
  const meta = extractAcademicMetadataFromResource(resource);
  const year = meta.year || extractResourceYear(resource);

  let entryType = 'misc';
  if (resource.type === 'book' || meta.publisher) entryType = 'book';
  else if (resource.type === 'article' || meta.journal) entryType = 'article';

  const authorField = resource.author && resource.author.trim()
    ? resource.author.trim()
    : '[Khuyết danh]';

  const lines = [
    `@${entryType}{${citekey},`,
    `  title = {${resource.title.trim()}},`,
    `  author = {${authorField}},`,
    `  year = {${year}},`,
  ];

  if (meta.journal) lines.push(`  journal = {${meta.journal}},`);
  if (meta.volume) lines.push(`  volume = {${meta.volume}},`);
  if (meta.issue) lines.push(`  number = {${meta.issue}},`);
  if (meta.pages) lines.push(`  pages = {${meta.pages}},`);
  if (meta.doi) lines.push(`  doi = {${meta.doi}},`);
  if (resource.url) lines.push(`  url = {${resource.url}},`);
  lines.push('}');

  return lines.join('\n');
}

/**
 * Formats citation entry for bibliography based on style.
 */
function formatBibliographyEntry(
  resource: Resource,
  style: ManuscriptCitationStyle,
  index: number
): string {
  switch (style) {
    case 'ieee':
      return generateIEEECitation(resource, index);
    case 'mla':
      return generateMLACitation(resource);
    case 'chicago':
      return generateChicagoCitation(resource);
    case 'harvard':
      return generateHarvardCitation(resource);
    case 'apa':
    default:
      return generateAPACitation(resource);
  }
}

/**
 * Compiles an academic manuscript from markdown sections and resources.
 */
export function compileAcademicManuscript(
  input: CompileManuscriptInput
): CompiledManuscriptResult {
  const {
    title,
    author,
    abstract,
    bodyMarkdown = '',
    sections = [],
    resources,
    style = 'apa',
    includeUncitedResources = false,
    appendixMarkdown,
  } = input;

  const registry = buildCitekeyRegistry(resources);

  // 1. Assemble raw manuscript body
  const bodyParts: string[] = [];

  if (title) {
    bodyParts.push(`# ${title}\n`);
  }

  if (author) {
    bodyParts.push(`**Tác giả:** ${author}\n`);
  }

  if (abstract && abstract.trim()) {
    bodyParts.push(`### Tóm Tắt (Abstract)\n\n> ${abstract.trim()}\n`);
  }

  if (bodyMarkdown && bodyMarkdown.trim()) {
    bodyParts.push(bodyMarkdown.trim());
  }

  if (sections && sections.length > 0) {
    sections.forEach((sec, idx) => {
      bodyParts.push(`\n## ${idx + 1}. ${sec.title}\n\n${sec.content.trim()}`);
    });
  }

  if (appendixMarkdown && appendixMarkdown.trim()) {
    bodyParts.push(`\n## Phụ Lục (Appendix)\n\n${appendixMarkdown.trim()}`);
  }

  const assembledRaw = bodyParts.join('\n\n');

  // 2. Parse citation clusters
  const clusters = extractCitationClusters(assembledRaw);

  const unresolvedCitekeysSet = new Set<string>();
  const citedResourceMap = new Map<string, Resource>();
  const ieeeCitekeyOrder = new Map<string, number>();
  const resourceCitekeyMap = new Map<string, string>(); // resourceId -> citekey

  // Build reverse map from registry
  for (const [key, entry] of registry.entries()) {
    resourceCitekeyMap.set(entry.resource.id, key);
  }

  let totalCitationCount = 0;

  // Track IEEE sequential numbers
  for (const cluster of clusters) {
    for (const item of cluster.items) {
      const entry = registry.get(item.citekey);
      if (entry) {
        totalCitationCount++;
        citedResourceMap.set(entry.resource.id, entry.resource);
        if (style === 'ieee' && !ieeeCitekeyOrder.has(item.citekey)) {
          ieeeCitekeyOrder.set(item.citekey, ieeeCitekeyOrder.size + 1);
        }
      } else {
        unresolvedCitekeysSet.add(item.citekey);
      }
    }
  }

  // 3. Replace in-text citations in assembled markdown
  // We perform replacements in reverse order of startIndex to avoid index drift
  let compiledMarkdown = assembledRaw;
  const sortedClustersDesc = [...clusters].sort((a, b) => b.startIndex - a.startIndex);

  for (const cluster of sortedClustersDesc) {
    let replacement = '';

    if (style === 'ieee') {
      const itemStrs: string[] = [];
      for (const item of cluster.items) {
        const entry = registry.get(item.citekey);
        if (entry) {
          const num = ieeeCitekeyOrder.get(item.citekey) || 1;
          if (item.locator) {
            itemStrs.push(`[${num}, ${item.locator}]`);
          } else {
            itemStrs.push(`[${num}]`);
          }
        } else {
          itemStrs.push(`[@${item.citekey}?${item.locator ? `, ${item.locator}` : ''}]`);
        }
      }
      replacement = itemStrs.join(', ');
    } else {
      // Author-Year styles (apa, harvard, chicago, mla)
      const itemStrs: string[] = [];
      for (const item of cluster.items) {
        const entry = registry.get(item.citekey);
        if (entry) {
          if (item.locator) {
            itemStrs.push(`${entry.authorLastName}, ${entry.year}, ${item.locator}`);
          } else {
            itemStrs.push(`${entry.authorLastName}, ${entry.year}`);
          }
        } else {
          itemStrs.push(`[@${item.citekey}?${item.locator ? `, ${item.locator}` : ''}]`);
        }
      }

      // If all items were unresolved placeholders, leave as is
      const allUnresolved = cluster.items.every((it) => !registry.has(it.citekey));
      if (allUnresolved) {
        replacement = itemStrs.join('; ');
      } else {
        replacement = `(${itemStrs.join('; ')})`;
      }
    }

    compiledMarkdown =
      compiledMarkdown.slice(0, cluster.startIndex) +
      replacement +
      compiledMarkdown.slice(cluster.endIndex);
  }

  // 4. Determine cited resources list and order
  let citedResources: Resource[] = [];

  if (style === 'ieee') {
    // Sort according to first appearance order in IEEE
    const orderedPairs = [...ieeeCitekeyOrder.entries()].sort((a, b) => a[1] - b[1]);
    for (const [key] of orderedPairs) {
      const entry = registry.get(key);
      if (entry) {
        citedResources.push(entry.resource);
      }
    }
  } else {
    // Author-Year: sort alphabetically by author then title
    citedResources = [...citedResourceMap.values()].sort((a, b) => {
      const nameA = (a.author || a.title).toLowerCase();
      const nameB = (b.author || b.title).toLowerCase();
      if (nameA !== nameB) return nameA.localeCompare(nameB);
      return (a.year || '').localeCompare(b.year || '');
    });
  }

  if (includeUncitedResources) {
    const citedIds = new Set(citedResources.map((r) => r.id));
    const uncited = resources.filter((r) => !citedIds.has(r.id));
    citedResources = [...citedResources, ...uncited];
  }

  // 5. Generate Bibliography section
  const bibLines: string[] = [];
  bibLines.push('## Tài Liệu Tham Khảo (References)\n');

  citedResources.forEach((res, idx) => {
    const formatted = formatBibliographyEntry(res, style, idx + 1);
    bibLines.push(`- ${formatted}`);
  });

  const bibliographyMarkdown = bibLines.join('\n');
  compiledMarkdown += `\n\n${bibliographyMarkdown}`;

  // 6. Generate LaTeX source (.tex)
  let latexBody = assembledRaw;
  // Convert citation clusters to \cite{...} or \cite[locator]{...}
  for (const cluster of sortedClustersDesc) {
    let latexCite = '';
    if (cluster.items.length === 1) {
      const it = cluster.items[0];
      if (it.locator) {
        latexCite = `\\cite[${it.locator}]{${it.citekey}}`;
      } else {
        latexCite = `\\cite{${it.citekey}}`;
      }
    } else {
      const keys = cluster.items.map((it) => it.citekey).join(', ');
      latexCite = `\\cite{${keys}}`;
    }

    latexBody =
      latexBody.slice(0, cluster.startIndex) +
      latexCite +
      latexBody.slice(cluster.endIndex);
  }

  // Convert basic markdown formatting to LaTeX
  latexBody = latexBody
    .replace(/\*\*(.+?)\*\*/g, '\\textbf{$1}')
    .replace(/\*([^*]+?)\*/g, '\\textit{$1}')
    .replace(/^#\s+(.+)$/gm, '\\section{$1}')
    .replace(/^##\s+(.+)$/gm, '\\subsection{$1}')
    .replace(/^###\s+(.+)$/gm, '\\subsubsection{$1}');

  const latexSource = `\\documentclass[12pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage[version=4]{mhchem}
\\usepackage{cite}
\\usepackage{hyperref}

\\title{${title || 'Academic Manuscript'}}
\\author{${author || 'Author'}}
\\date{\\today}

\\begin{document}
\\maketitle

${abstract ? `\\begin{abstract}\n${abstract}\n\\end{abstract}\n\n` : ''}${latexBody}

\\bibliographystyle{plain}
\\bibliography{references}

\\end{document}
`.trim();

  // 7. Generate BibTeX source (.bib)
  const bibtexEntries: string[] = [];
  for (const res of citedResources) {
    const registeredKey = resourceCitekeyMap.get(res.id) || generateResourceCitekey(res);
    bibtexEntries.push(generateBibTeXEntryWithKey(res, registeredKey));
  }
  const bibtexSource = bibtexEntries.join('\n\n');

  // 8. Word count calculation
  const wordCount = assembledRaw
    .replace(/\[@.+?\]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return {
    compiledMarkdown,
    bibliographyMarkdown,
    latexSource,
    bibtexSource,
    citedResources,
    unresolvedCitekeys: Array.from(unresolvedCitekeysSet),
    wordCount,
    citationCount: totalCitationCount,
    style,
  };
}
