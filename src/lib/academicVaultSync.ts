/**
 * Obsidian & E-Ink Scholarly Round-Trip Bridge Engine (Phase 11A — ADR-115).
 *
 * Implements:
 * 1. Dataview-Ready Scholarly YAML Frontmatter & Callouts Export.
 * 2. Dedicated Literature Note (@citekey.md) Generation.
 * 3. Lossless Round-Trip Markdown & YAML Parser (preserving KaTeX/Pandoc math and citations).
 * 4. High-Contrast E-Ink Study Pack Compiler with Masked Active Recall Self-Test Appendix.
 * 5. Full Scholarly Vault Virtual File Map Builder.
 *
 * Strictly zero database migrations, pure TypeScript runtime logic.
 */

import type { Topic, Note, Resource, Category, ResearchExcerpt, LinkType } from '../types';
import type { Flashcard } from '../types/flashcard';
import {
  normalizeExportTags,
  sanitizeFileName,
  getDomainFolderName,
} from './obsidian';
import {
  generateResourceCitekey,
  ScholarlyStance,
} from './literatureMatrixEngine';
import { extractClozeOccurrences } from './clozeParser';

// -----------------------------------------------------------------------------
// Interfaces & Types
// -----------------------------------------------------------------------------

export interface ScholarlyTopicExportInput {
  topic: Topic;
  notes?: Note[];
  resources?: Resource[];
  excerpts?: ResearchExcerpt[];
  flashcards?: Flashcard[];
}

export interface ParsedWikiLink {
  targetTitle: string;
  displayText?: string;
  linkType: LinkType;
  strength: number;
  notes?: string;
}

export interface ParsedExcerptCallout {
  selectedText: string;
  locator?: string;
  userNote?: string;
}

export interface ParsedScholarlyMarkdownResult {
  title: string;
  slug?: string;
  domain?: string;
  category?: string;
  tags: string[];
  citekey?: string;
  doi?: string;
  author?: string;
  year?: string;
  stance?: ScholarlyStance;
  bodyContent: string;
  wikiLinks: ParsedWikiLink[];
  excerpts: ParsedExcerptCallout[];
  rawFrontmatter: Record<string, unknown>;
}

export interface EInkStudyPackInput {
  title?: string;
  author?: string;
  topics: Topic[];
  notes?: Note[];
  resources?: Resource[];
  excerpts?: ResearchExcerpt[];
  flashcards?: Flashcard[];
  includeSelfTest?: boolean;
  includeLiteratureMatrix?: boolean;
}

export interface VaultVirtualFile {
  path: string;
  content: string;
  category: 'moc' | 'topic' | 'note' | 'literature' | 'eink-pack';
}

// -----------------------------------------------------------------------------
// 1. Dataview-Ready Scholarly Topic Markdown Export
// -----------------------------------------------------------------------------

export function formatScholarlyTopicMarkdown(input: ScholarlyTopicExportInput): string {
  const { topic, notes = [], resources = [], excerpts = [], flashcards = [] } = input;

  const topicExcerpts = excerpts.filter(
    (e) => !e.topicId || e.topicId === topic.id
  );
  const topicCards = flashcards.filter(
    (c) => !c.topicId || c.topicId === topic.id
  );
  const topicResources = resources.filter(
    (r) => !r.topicId || r.topicId === topic.id
  );

  // Compute FSRS telemetry averages
  const stabilityValues = topicCards
    .map(
      (c) =>
        c.schedule?.stability ??
        (c as unknown as { fsrs?: { stability?: number } }).fsrs?.stability
    )
    .filter((s): s is number => typeof s === 'number' && s > 0);
  const avgStability =
    stabilityValues.length > 0
      ? Number((stabilityValues.reduce((a, b) => a + b, 0) / stabilityValues.length).toFixed(1))
      : 0;

  const difficultyValues = topicCards
    .map(
      (c) =>
        c.schedule?.difficulty ??
        (c as unknown as { fsrs?: { difficulty?: number } }).fsrs?.difficulty
    )
    .filter((d): d is number => typeof d === 'number' && d > 0);
  const avgDifficulty =
    difficultyValues.length > 0
      ? Number((difficultyValues.reduce((a, b) => a + b, 0) / difficultyValues.length).toFixed(1))
      : 0;

  // Gather citekeys from resources
  const citekeys = topicResources.map((r) => `@${generateResourceCitekey(r)}`);

  const cleanTags = normalizeExportTags(topic.tags);

  const frontmatterLines = [
    '---',
    `title: "${topic.title.replace(/"/g, '\\"')}"`,
    `slug: "${topic.slug || sanitizeFileName(topic.title).toLowerCase()}"`,
    `domain: "${topic.type || 'general'}"`,
    `category: "${topic.categoryName || topic.categoryId || 'General'}"`,
    `tags: [${cleanTags.map((t) => `"${t}"`).join(', ')}]`,
    `aliases: ["${topic.title.replace(/"/g, '\\"')}"]`,
    `progress: ${topic.studyProgress?.progress ?? 0}`,
    `status: "${topic.studyProgress?.status || 'not_started'}"`,
    `highlight_count: ${topicExcerpts.length}`,
    `flashcard_count: ${topicCards.length}`,
    `fsrs_avg_stability: ${avgStability.toFixed(1)}`,
    `fsrs_avg_difficulty: ${avgDifficulty.toFixed(1)}`,
    `citekeys: [${citekeys.map((c) => `"${c}"`).join(', ')}]`,
    `created: "${(topic.createdAt || new Date().toISOString()).slice(0, 10)}"`,
    `updated: "${(topic.updatedAt || new Date().toISOString()).slice(0, 10)}"`,
    '---',
    '',
  ];

  let body = `# ${topic.title}\n\n`;
  if (topic.description) {
    body += `> [!abstract] Mô tả & Định vị\n> ${topic.description}\n\n`;
  }
  body += `## Nội Dung Khảo Cứu & Luận Thuyết\n\n${topic.content || ''}\n\n`;

  // Links section with Obsidian [[Wiki Links]]
  if (topic.links && topic.links.length > 0) {
    body += `## 🔗 Liên Kết Tri Thức (Knowledge Links)\n\n`;
    topic.links.forEach((link) => {
      body += `- **${link.linkType.toUpperCase()}** (Trọng số ${link.strength}/5): [[${link.targetTitle || 'Chủ đề'}]]\n`;
      if (link.notes) {
        body += `  > *${link.notes}*\n`;
      }
    });
    body += '\n';
  }

  // Excerpts callout section
  if (topicExcerpts.length > 0) {
    body += `## 📑 Trích Đoạn Nghiên Cứu Đã Đánh Dấu (Highlights & Excerpts)\n\n`;
    topicExcerpts.forEach((exc) => {
      const locatorStr = exc.positionSelector?.pageNumber
        ? `Trang ${exc.positionSelector.pageNumber}`
        : exc.citationSnapshot?.locator || 'Văn bản';
      body += `> [!quote] Trích đoạn (${locatorStr})\n`;
      const quoteLines = exc.selectedText.split('\n');
      quoteLines.forEach((l) => {
        body += `> ${l}\n`;
      });
      if (exc.userNote) {
        body += `> — *Ghi chú: ${exc.userNote}*\n`;
      }
      body += '\n';
    });
  }

  // Flashcards callout section
  if (topicCards.length > 0) {
    body += `## 🧠 Thẻ Nhớ Ôn Tập FSRS (Flashcards)\n\n`;
    topicCards.forEach((card) => {
      body += `> [!question] Thẻ nhớ FSRS (${card.type})\n`;
      body += `> **Hỏi:** ${card.front}\n`;
      body += `> **Đáp:** ${card.back}\n\n`;
    });
  }

  // Associated notes
  const relatedNotes = notes.filter((n) => !n.topicId || n.topicId === topic.id);
  if (relatedNotes.length > 0) {
    body += `## 📝 Ghi Chú Chuyên Sâu Liên Quan\n\n`;
    relatedNotes.forEach((n) => {
      body += `### [[Ghi-Chu/${sanitizeFileName(n.title)}|${n.title}]]\n`;
      body += `*Loại: ${n.type} | Ngày: ${(n.createdAt || '').slice(0, 10)}*\n\n`;
      body += `${n.content}\n\n---\n\n`;
    });
  }

  return frontmatterLines.join('\n') + body;
}

// -----------------------------------------------------------------------------
// 2. Literature Note (@citekey.md) Export
// -----------------------------------------------------------------------------

export function formatScholarlyLiteratureNote(
  resource: Resource,
  options?: { excerpts?: ResearchExcerpt[]; notes?: Note[]; topicTitle?: string }
): { fileName: string; citekey: string; content: string } {
  const citekey = generateResourceCitekey(resource);
  const fileName = `@${citekey}.md`;
  const { excerpts = [], topicTitle = '' } = options || {};

  const frontmatterLines = [
    '---',
    `title: "${resource.title.replace(/"/g, '\\"')}"`,
    `citekey: "${citekey}"`,
    `author: "${(resource.author || 'Unknown').replace(/"/g, '\\"')}"`,
    `year: "${resource.year || ''}"`,
    `doi: "${resource.doi || ''}"`,
    `type: "${resource.type || 'article'}"`,
    `topic: "${(topicTitle || resource.topicTitle || '').replace(/"/g, '\\"')}"`,
    `highlight_count: ${excerpts.length}`,
    `created: "${(resource.createdAt || new Date().toISOString()).slice(0, 10)}"`,
    '---',
    '',
  ];

  let body = `# @${citekey} — ${resource.title}\n\n`;
  body += `## Thông Tin Thư Mục (Bibliographic Info)\n\n`;
  body += `- **Tác giả:** ${resource.author || 'Chưa rõ'}\n`;
  body += `- **Năm xuất bản:** ${resource.year || 'Chưa rõ'}\n`;
  if (resource.doi) body += `- **DOI:** [${resource.doi}](https://doi.org/${resource.doi})\n`;
  if (resource.url) body += `- **URL:** [${resource.url}](${resource.url})\n`;
  if (topicTitle || resource.topicTitle) {
    body += `- **Chủ đề nghiên cứu:** [[${topicTitle || resource.topicTitle}]]\n`;
  }
  body += '\n';

  if (resource.notes) {
    body += `## Tóm Tắt & Ghi Chú Tổng Quan\n\n${resource.notes}\n\n`;
  }

  if (excerpts.length > 0) {
    body += `## 📑 Các Trích Đoạn Đã Đánh Dấu (Highlights)\n\n`;
    excerpts.forEach((exc) => {
      const locatorStr = exc.positionSelector?.pageNumber
        ? `Trang ${exc.positionSelector.pageNumber}`
        : exc.citationSnapshot?.locator || 'Văn bản';
      body += `> [!quote] Trích đoạn (${locatorStr})\n`;
      const lines = exc.selectedText.split('\n');
      lines.forEach((l) => {
        body += `> ${l}\n`;
      });
      if (exc.userNote) {
        body += `> — *Ghi chú: ${exc.userNote}*\n`;
      }
      body += '\n';
    });
  }

  return {
    fileName,
    citekey,
    content: frontmatterLines.join('\n') + body,
  };
}

// -----------------------------------------------------------------------------
// 3. Lossless Round-Trip Markdown Ingestion Parser
// -----------------------------------------------------------------------------

export function parseScholarlyMarkdownNote(markdown: string): ParsedScholarlyMarkdownResult {
  const result: ParsedScholarlyMarkdownResult = {
    title: '',
    tags: [],
    bodyContent: '',
    wikiLinks: [],
    excerpts: [],
    rawFrontmatter: {},
  };

  if (!markdown || typeof markdown !== 'string') {
    return result;
  }

  const trimmed = markdown.trim();
  let contentWithoutFm = trimmed;

  // Check YAML Frontmatter
  const fmMatch = trimmed.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (fmMatch) {
    const rawFm = fmMatch[1];
    contentWithoutFm = fmMatch[2].trim();

    let currentListKey: string | null = null;
    const fmLines = rawFm.split('\n');
    fmLines.forEach((line) => {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('- ') && currentListKey) {
        const itemVal = trimmedLine.slice(2).trim().replace(/^["']|["']$/g, '');
        if (currentListKey === 'tags' && itemVal) {
          result.tags.push(itemVal);
        }
        return;
      }

      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) {
        currentListKey = null;
        return;
      }

      const key = line.slice(0, colonIdx).trim();
      let rawVal = line.slice(colonIdx + 1).trim();

      // Strip quotes
      if (
        (rawVal.startsWith('"') && rawVal.endsWith('"')) ||
        (rawVal.startsWith("'") && rawVal.endsWith("'"))
      ) {
        rawVal = rawVal.slice(1, -1);
      }

      result.rawFrontmatter[key] = rawVal;

      if (key === 'title') {
        result.title = rawVal;
        currentListKey = null;
      } else if (key === 'slug') {
        result.slug = rawVal;
        currentListKey = null;
      } else if (key === 'domain') {
        result.domain = rawVal;
        currentListKey = null;
      } else if (key === 'category') {
        result.category = rawVal;
        currentListKey = null;
      } else if (key === 'citekey') {
        result.citekey = rawVal.replace(/^@/, '');
        currentListKey = null;
      } else if (key === 'doi') {
        result.doi = rawVal;
        currentListKey = null;
      } else if (key === 'author') {
        result.author = rawVal;
        currentListKey = null;
      } else if (key === 'year') {
        result.year = rawVal;
        currentListKey = null;
      } else if (key === 'stance') {
        result.stance = rawVal as ScholarlyStance;
        currentListKey = null;
      } else if (key === 'tags') {
        currentListKey = 'tags';
        // Parse array [tag1, tag2] or single string
        const arrayMatch = rawVal.match(/\[(.*)\]/);
        if (arrayMatch) {
          result.tags = arrayMatch[1]
            .split(',')
            .map((t) => t.trim().replace(/^["']|["']$/g, ''))
            .filter(Boolean);
          currentListKey = null;
        } else if (rawVal) {
          result.tags = [rawVal];
          currentListKey = null;
        }
      } else {
        currentListKey = null;
      }
    });
  }

  // Fallback title from first H1 `# Title` if missing
  if (!result.title) {
    const h1Match = contentWithoutFm.match(/^#\s+(.+)$/m);
    if (h1Match) {
      result.title = h1Match[1].trim();
    }
  }

  // Extract typed Knowledge Links:
  // e.g. - **PREREQUISITE** (Trọng số 5/5): [[Đại Số Tuyến Tính]]
  const typedLinkRegex =
    /-\s+\*\*(PREREQUISITE|ADVANCED|CONTRADICTS|RELATED)\*\*\s*(?:\(Trọng số\s*(\d+)\/5\))?:\s*\[\[([^\]|]+)(?:\|([^\]]+))?\]\](?:\s*\r?\n\s*>\s*\*([^*]+)\*)?/gi;

  const foundTypedTargets = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = typedLinkRegex.exec(contentWithoutFm)) !== null) {
    const rawType = match[1].toLowerCase() as LinkType;
    const strength = match[2] ? parseInt(match[2], 10) : 3;
    const targetTitle = match[3].trim();
    const displayText = match[4]?.trim();
    const notes = match[5]?.trim();

    foundTypedTargets.add(targetTitle);

    result.wikiLinks.push({
      targetTitle,
      displayText,
      linkType: rawType,
      strength,
      notes,
    });
  }

  // Extract generic inline [[Wiki Links]] not already covered
  const inlineWikiRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  while ((match = inlineWikiRegex.exec(contentWithoutFm)) !== null) {
    const targetTitle = match[1].trim();
    const displayText = match[2]?.trim();

    // Skip if already parsed as typed link or if path like Ghi-Chu/...
    if (!foundTypedTargets.has(targetTitle) && !targetTitle.startsWith('Ghi-Chu/')) {
      result.wikiLinks.push({
        targetTitle,
        displayText,
        linkType: 'related',
        strength: 3,
      });
    }
  }

  // Extract > [!quote] Callout Excerpts
  const calloutRegex =
    />\s*\[!quote\]\s*Trích đoạn(?:\s*\(([^)]+)\))?\r?\n((?:>[^\r\n]*(?:\r?\n|$))+)/gi;

  while ((match = calloutRegex.exec(contentWithoutFm)) !== null) {
    const locator = match[1]?.trim();
    const calloutBody = match[2];

    const lines = calloutBody
      .split('\n')
      .map((l) => l.replace(/^>\s?/, '').trim())
      .filter(Boolean);

    let userNote: string | undefined = undefined;
    const textLines: string[] = [];

    lines.forEach((line) => {
      const noteMatch = line.match(/^—\s*\*Ghi chú:\s*([^*]+)\*/i);
      if (noteMatch) {
        userNote = noteMatch[1].trim();
      } else {
        textLines.push(line);
      }
    });

    const selectedText = textLines.join(' ').trim();
    if (selectedText) {
      result.excerpts.push({
        selectedText,
        locator,
        userNote,
      });
    }
  }

  result.bodyContent = contentWithoutFm;

  return result;
}

// -----------------------------------------------------------------------------
// 4. High-Contrast E-Ink Study Pack Compiler
// -----------------------------------------------------------------------------

export function compileEInkStudyPackMarkdown(input: EInkStudyPackInput): string {
  const {
    title = 'Academic Research Study Pack',
    author = 'Knowledge OS Scholarly Compiler',
    topics,
    resources = [],
    excerpts = [],
    flashcards = [],
    includeSelfTest = true,
    includeLiteratureMatrix = true,
  } = input;

  const lines: string[] = [
    '---',
    `title: "${title.replace(/"/g, '\\"')}"`,
    `author: "${author.replace(/"/g, '\\"')}"`,
    'lang: "vi-VN"',
    'eink_optimized: true',
    `generated_at: "${new Date().toISOString().slice(0, 10)}"`,
    '---',
    '',
    `# ${title}`,
    `*Biên soạn học thuật tối ưu cho màn hình E-Ink • ${author}*`,
    '',
    '---',
    '',
    '## Mục Lục',
    '',
  ];

  // Build Table of Contents
  topics.forEach((t, i) => {
    lines.push(`- [Chương ${i + 1}: ${t.title}](#chuong-${i + 1}-${sanitizeFileName(t.title).toLowerCase()})`);
  });
  if (includeLiteratureMatrix && resources.length > 0) {
    lines.push(`- [Bảng Tổng Quan Tài Liệu Nghiên Cứu](#bang-tong-quan-tai-lieu-nghien-cuu)`);
  }
  if (includeSelfTest && flashcards.length > 0) {
    lines.push(`- [Phụ Lục Ôn Tập Chủ Động (FSRS Active Recall)](#phu-luc-on-tap-chu-dong-fsrs-active-recall)`);
    lines.push(`  - [Phần A: Câu Hỏi Tự Đánh Giá (Flashcards)](#phan-a-cau-hoi-tu-danh-gia-flashcards)`);
    lines.push(`  - [Phần B: Đáp Án Đối Chiếu](#phan-b-dap-an-doi-chieu)`);
  }
  lines.push('', '---', '');

  // Chapters: Topic Content
  topics.forEach((topic, i) => {
    lines.push(`# Chương ${i + 1}: ${topic.title}`);
    lines.push('');
    if (topic.description) {
      lines.push(`> **Định vị nghiên cứu:** ${topic.description}`);
      lines.push('');
    }
    if (topic.content) {
      lines.push(topic.content);
      lines.push('');
    }

    const tExcerpts = excerpts.filter((e) => !e.topicId || e.topicId === topic.id);
    if (tExcerpts.length > 0) {
      lines.push(`### Trích Dẫn Chọn Lọc`);
      lines.push('');
      tExcerpts.forEach((exc) => {
        const loc = exc.positionSelector?.pageNumber ? `Trang ${exc.positionSelector.pageNumber}` : 'Trích dẫn';
        lines.push(`- *(${loc})* "${exc.selectedText}"`);
        if (exc.userNote) {
          lines.push(`  — *Nhận xét: ${exc.userNote}*`);
        }
      });
      lines.push('');
    }

    lines.push('---', '');
  });

  // Literature Matrix Section
  if (includeLiteratureMatrix && resources.length > 0) {
    lines.push('## Bảng Tổng Quan Tài Liệu Nghiên Cứu');
    lines.push('');
    lines.push('| Mã Trích Dẫn | Tác Giả | Năm | Tiêu Đề | Thể Loại |');
    lines.push('| :--- | :--- | :---: | :--- | :--- |');

    resources.forEach((r) => {
      const citekey = generateResourceCitekey(r);
      const cleanTitle = r.title.replace(/\|/g, '-');
      const author = r.author || 'Chưa rõ';
      const year = r.year || '-';
      const type = r.type || 'article';
      lines.push(`| ${citekey} | ${author} | ${year} | ${cleanTitle} | ${type} |`);
    });
    lines.push('', '---', '');
  }

  // Active Recall Self-Test Appendix (Separating Question prompts from Answer key)
  if (includeSelfTest && flashcards.length > 0) {
    lines.push('## Phụ Lục Ôn Tập Chủ Động (FSRS Active Recall)');
    lines.push('');
    lines.push('*Hướng dẫn: Tự trả lời các câu hỏi ở Phần A trước khi lật trang đối chiếu ở Phần B.*');
    lines.push('');

    // Part A: Question Prompts (Masking Cloze answers as [...])
    lines.push('### Phần A: Câu Hỏi Tự Đánh Giá (Flashcards)');
    lines.push('');

    const processedCards: { questionPrompt: string; answerKey: string }[] = [];

    flashcards.forEach((card, idx) => {
      let prompt = card.front;
      let answer = card.back;

      if (card.type === 'cloze') {
        const occurrences = extractClozeOccurrences(card.front);
        if (occurrences.length > 0) {
          // Mask cloze items with [...]
          prompt = card.front.replace(/\{\{c\d+::([^:}]+)(?:::[^}]+)?\}\}/g, '[...]');
          answer = occurrences.map((o) => o.answer).join(', ');
        }
      }

      processedCards.push({ questionPrompt: prompt, answerKey: answer });

      lines.push(`#### Câu ${idx + 1} (${card.type === 'cloze' ? 'Điền khuyết' : 'Câu hỏi ngắn'})`);
      lines.push(prompt);
      lines.push('');
    });

    lines.push('---', '');

    // Part B: Answer Key
    lines.push('### Phần B: Đáp Án Đối Chiếu');
    lines.push('');

    processedCards.forEach((c, idx) => {
      lines.push(`#### Đáp Án Câu ${idx + 1}`);
      lines.push(`**Đáp án:** ${c.answerKey}`);
      lines.push('');
    });
  }

  return lines.join('\n');
}

// -----------------------------------------------------------------------------
// 5. Full Scholarly Vault Virtual File Map Builder
// -----------------------------------------------------------------------------

export function buildScholarlyVaultFileMap(data: {
  topics: Topic[];
  notes?: Note[];
  resources?: Resource[];
  categories?: Category[];
  excerpts?: ResearchExcerpt[];
  flashcards?: Flashcard[];
  vaultName?: string;
}): VaultVirtualFile[] {
  const {
    topics,
    notes = [],
    resources = [],
    categories = [],
    excerpts = [],
    flashcards = [],
    vaultName = 'Knowledge-OS-Vault',
  } = data;

  const files: VaultVirtualFile[] = [];

  // 1. Master Map Of Content (00_Map_Of_Content.md)
  let mocContent = `# ${vaultName} — Bản Đồ Tri Thức (MOC)\n\n`;
  mocContent =
    mocContent +
    `*Tổng hợp ${topics.length} chủ đề, ${notes.length} ghi chú, ${resources.length} tài nguyên và ${flashcards.length} thẻ nhớ FSRS.*\n\n`;

  // Group topics by domain
  const domainGroups = new Map<string, Topic[]>();
  topics.forEach((t) => {
    const d = t.type || 'other';
    const list = domainGroups.get(d) || [];
    list.push(t);
    domainGroups.set(d, list);
  });

  domainGroups.forEach((topList, domainKey) => {
    const domainFolder = getDomainFolderName(domainKey);
    mocContent = mocContent + `## Lĩnh Vực: ${domainFolder}\n\n`;
    topList.forEach((t) => {
      const fileName = sanitizeFileName(t.title);
      mocContent = mocContent + `- [[${domainFolder}/${fileName}|${t.title}]] — *Tiến độ: ${t.studyProgress?.progress || 0}%*\n`;
    });
    mocContent = mocContent + '\n';
  });

  files.push({
    path: '00_Map_Of_Content.md',
    content: mocContent,
    category: 'moc',
  });

  // 2. Topic Files
  topics.forEach((topic) => {
    const domainFolder = getDomainFolderName(topic.type || 'other');
    const fileName = `${sanitizeFileName(topic.title)}.md`;
    const path = `${domainFolder}/${fileName}`;

    const topicNotes = notes.filter((n) => n.topicId === topic.id);
    const topicResources = resources.filter((r) => r.topicId === topic.id);
    const topicExcerpts = excerpts.filter((e) => e.topicId === topic.id);
    const topicCards = flashcards.filter((c) => c.topicId === topic.id);

    const content = formatScholarlyTopicMarkdown({
      topic,
      notes: topicNotes,
      resources: topicResources,
      excerpts: topicExcerpts,
      flashcards: topicCards,
    });

    files.push({
      path,
      content,
      category: 'topic',
    });
  });

  // 3. Literature Notes (@citekey.md)
  resources.forEach((resource) => {
    const rExcerpts = excerpts.filter((e) => e.archivedDocumentId === resource.id || e.topicId === resource.topicId);
    const litNote = formatScholarlyLiteratureNote(resource, {
      excerpts: rExcerpts,
      topicTitle: resource.topicTitle,
    });

    files.push({
      path: `Literature-Notes/${litNote.fileName}`,
      content: litNote.content,
      category: 'literature',
    });
  });

  // 4. E-Ink Study Pack
  const einkPack = compileEInkStudyPackMarkdown({
    title: `${vaultName} — E-Ink Study Pack`,
    topics,
    notes,
    resources,
    excerpts,
    flashcards,
    includeSelfTest: true,
    includeLiteratureMatrix: true,
  });

  files.push({
    path: `E-Ink-Study-Packs/${sanitizeFileName(vaultName)}-Study-Pack.md`,
    content: einkPack,
    category: 'eink-pack',
  });

  return files;
}
