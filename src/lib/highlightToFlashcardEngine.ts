/**
 * Smart Highlight-to-Flashcard & Cloze Synthesis Engine (ADR-111).
 * Bridges Reader Persistent Highlights (Phase 4), Academic Notation Engine (Phase 1),
 * and FSRS v5 Spaced Repetition (Phase 3).
 */

import type { PositionSelector, CitationSnapshot } from '../types';

export type SynthesisStrategy = 'auto' | 'cloze-auto' | 'definition-split' | 'qa-note';

export interface ExcerptInput {
  id: string;
  selectedText: string;
  userNote?: string | null;
  highlightColor?: string;
  sourceTitle?: string;
  sourceType?: string; // 'pdf' | 'epub' | 'md'
  pageNumber?: number;
  cfi?: string;
  headingId?: string;
  topicId?: string | null;
  tags?: string[];
  positionSelector?: PositionSelector | {
    pageNumber?: number;
    page?: number;
    cfi?: string;
    headingId?: string;
    format?: string;
  };
  citationSnapshot?: CitationSnapshot | {
    title?: string;
    locator?: string;
    author?: string;
  } | null;
}

export interface SynthesizedFlashcardCandidate {
  id: string;
  sourceExcerptId: string;
  strategyUsed: Exclude<SynthesisStrategy, 'auto'>;
  front: string;
  back: string;
  isCloze: boolean;
  provenanceLabel: string;
  highlightColor?: string;
  topicId?: string;
  tags: string[];
}

export interface BatchSynthesisOptions {
  strategy?: SynthesisStrategy;
  colorFilter?: string[];
  topicId?: string;
  maxClozesPerCard?: number;
  includeUserNoteInBack?: boolean;
}

export interface BatchSynthesisResult {
  candidates: SynthesizedFlashcardCandidate[];
  skippedDuplicates: number;
  totalProcessed: number;
}

/**
 * Normalizes text for deduplication and comparison.
 */
function normalizeText(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Formats academic deep-link provenance footer based on document format and locator.
 */
export function formatExcerptProvenance(excerpt: ExcerptInput): string {
  const title =
    excerpt.sourceTitle ||
    excerpt.citationSnapshot?.title ||
    'Tài liệu nghiên cứu';

  const page = excerpt.pageNumber ?? excerpt.positionSelector?.pageNumber;
  const cfi = excerpt.cfi ?? excerpt.positionSelector?.cfi;
  const heading = excerpt.headingId ?? excerpt.positionSelector?.headingId;
  const locator = excerpt.citationSnapshot?.locator;

  let locationStr = '';
  if (page !== undefined && page !== null) {
    locationStr = `Trang ${page}`;
  } else if (cfi) {
    locationStr = 'Vị trí EPUB';
  } else if (heading) {
    locationStr = `Mục: ${heading}`;
  } else if (locator) {
    locationStr = locator;
  }

  if (locationStr) {
    return `> 📖 Nguồn: ${title} • ${locationStr}`;
  }
  return `> 📖 Nguồn: ${title}`;
}

/**
 * Automatically inspects excerpt content and metadata to determine the best synthesis strategy.
 */
export function detectBestSynthesisStrategy(excerpt: ExcerptInput): Exclude<SynthesisStrategy, 'auto'> {
  // If user note is present and sufficiently detailed, prioritize Q&A mode
  if (excerpt.userNote && excerpt.userNote.trim().length >= 5) {
    return 'qa-note';
  }

  const text = (excerpt.selectedText || '').trim();

  // If text explicitly contains bold targets or LaTeX formulas, author intended cloze deletion
  if (/\*\*[^*]+\*\*/.test(text) || /\$[^$]+\$/.test(text)) {
    return 'cloze-auto';
  }

  // Check for colon / em-dash definition pattern: Term: Definition
  const colonIdx = text.indexOf(':');
  if (colonIdx > 2 && colonIdx < 80 && !text.slice(0, colonIdx).includes('\n')) {
    const afterColon = text.slice(colonIdx + 1).trim();
    if (afterColon.length >= 10) {
      return 'definition-split';
    }
  }

  const dashMatch = text.match(/^([^\n—–]{3,80})\s*[—–]\s*(.{10,})$/);
  if (dashMatch) {
    return 'definition-split';
  }

  // Vietnamese / English definition connectors
  const defMatch = text.match(/^([^\n]{3,80})\s+(?:được định nghĩa là|là|is defined as|refers to)\s+(.{10,})$/i);
  if (defMatch && !defMatch[1].includes('.')) {
    return 'definition-split';
  }

  return 'cloze-auto';
}

interface ClozeTargetCandidate {
  start: number;
  end: number;
  raw: string;
  replacementText: string;
  priority: number;
}

/**
 * Finds high-value academic targets in selected text for Cloze deletion.
 */
function findClozeTargets(text: string, maxClozes = 2): Array<{ start: number; end: number; replacementText: string }> {
  const candidates: ClozeTargetCandidate[] = [];

  // 1. Bold targets: **term**
  const boldRegex = /\*\*([^*]+)\*\*/g;
  let boldMatch: RegExpExecArray | null;
  while ((boldMatch = boldRegex.exec(text)) !== null) {
    const term = boldMatch[1].trim();
    if (term.length > 0) {
      candidates.push({
        start: boldMatch.index,
        end: boldMatch.index + boldMatch[0].length,
        raw: boldMatch[0],
        replacementText: term,
        priority: 10,
      });
    }
  }

  // 2. LaTeX & mhchem math formulas: $...$
  const mathRegex = /\$([^\$]+)\$/g;
  let mathMatch: RegExpExecArray | null;
  while ((mathMatch = mathRegex.exec(text)) !== null) {
    // Keep dollar delimiters intact for LaTeX rendering
    candidates.push({
      start: mathMatch.index,
      end: mathMatch.index + mathMatch[0].length,
      raw: mathMatch[0],
      replacementText: mathMatch[0],
      priority: 9,
    });
  }

  // 3. Quoted terms: "term" or “term”
  const quoteRegex = /["“]([^"”\n]{2,60})["”]/g;
  let quoteMatch: RegExpExecArray | null;
  while ((quoteMatch = quoteRegex.exec(text)) !== null) {
    const term = quoteMatch[1].trim();
    if (term.length > 0) {
      candidates.push({
        start: quoteMatch.index,
        end: quoteMatch.index + quoteMatch[0].length,
        raw: quoteMatch[0],
        replacementText: term,
        priority: 8,
      });
    }
  }

  // Sort candidates by priority desc, then by position asc
  candidates.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return a.start - b.start;
  });

  // Filter non-overlapping candidates
  const chosen: ClozeTargetCandidate[] = [];
  for (const cand of candidates) {
    const overlaps = chosen.some(
      (c) => Math.max(cand.start, c.start) < Math.min(cand.end, c.end)
    );
    if (!overlaps) {
      chosen.push(cand);
      if (chosen.length >= maxClozes) break;
    }
  }

  // Fallback if no markdown/formula/quote targets found (e.g. plain text)
  if (chosen.length === 0 && text.trim().length > 0) {
    const trimmed = text.trim();
    // Try to find subject phrase before common predicates
    const verbMatch = trimmed.match(
      /\b(?:xảy ra|xuất hiện|là|được|chứng minh|thể hiện|phản ánh|bao gồm|mang lại|tạo ra|is|are|occurs|refers|describes)\b/i
    );

    let target = '';
    let start = 0;
    let end = 0;

    if (verbMatch && verbMatch.index && verbMatch.index > 3) {
      target = trimmed.slice(0, verbMatch.index).trim();
      start = 0;
      end = verbMatch.index;
    } else {
      // Pick first 3-5 words
      const words = trimmed.split(/\s+/);
      const wordCount = Math.min(words.length, 4);
      target = words.slice(0, wordCount).join(' ').replace(/[.,;:!?]+$/, '').trim();
      start = 0;
      end = target.length;
    }

    if (target.length > 0) {
      chosen.push({
        start,
        end,
        raw: target,
        replacementText: target,
        priority: 1,
      });
    }
  }

  // Sort chosen by start position ascending
  return chosen.sort((a, b) => a.start - b.start);
}

/**
 * Synthesizes a single Flashcard from an excerpt.
 */
export function synthesizeFlashcardFromExcerpt(
  excerpt: ExcerptInput,
  options?: {
    strategy?: SynthesisStrategy;
    topicId?: string;
    maxClozesPerCard?: number;
    includeUserNoteInBack?: boolean;
  }
): SynthesizedFlashcardCandidate {
  const chosenStrategy = options?.strategy || 'auto';
  const effectiveStrategy: Exclude<SynthesisStrategy, 'auto'> =
    chosenStrategy === 'auto'
      ? detectBestSynthesisStrategy(excerpt)
      : chosenStrategy;

  const provenance = formatExcerptProvenance(excerpt);
  const cardId = `syn-${excerpt.id}-${Date.now().toString(36)}`;
  const topicId = options?.topicId || (excerpt.topicId ?? undefined);
  const tags = excerpt.tags ? [...excerpt.tags] : [];

  if (effectiveStrategy === 'qa-note') {
    const front = (excerpt.userNote || '').trim() || 'Câu hỏi nghiên cứu:';
    const backParts: string[] = [excerpt.selectedText.trim()];
    backParts.push('', provenance);

    return {
      id: cardId,
      sourceExcerptId: excerpt.id,
      strategyUsed: 'qa-note',
      front,
      back: backParts.join('\n'),
      isCloze: false,
      provenanceLabel: provenance,
      highlightColor: excerpt.highlightColor,
      topicId,
      tags,
    };
  }

  if (effectiveStrategy === 'definition-split') {
    const text = (excerpt.selectedText || '').trim();
    let term = '';
    let definition = '';

    const colonIdx = text.indexOf(':');
    const dashMatch = text.match(/^([^\n—–]{3,80})\s*[—–]\s*(.{10,})$/);
    const defMatch = text.match(/^([^\n]{3,80})\s+(?:được định nghĩa là|là|is defined as|refers to)\s+(.{10,})$/i);

    if (colonIdx > 2 && colonIdx < 100 && !text.slice(0, colonIdx).includes('\n')) {
      term = text.slice(0, colonIdx).replace(/^\*\*|\*\*$/g, '').trim();
      definition = text.slice(colonIdx + 1).trim();
    } else if (dashMatch) {
      term = dashMatch[1].replace(/^\*\*|\*\*$/g, '').trim();
      definition = dashMatch[2].trim();
    } else if (defMatch) {
      term = defMatch[1].replace(/^\*\*|\*\*$/g, '').trim();
      definition = defMatch[2].trim();
    } else {
      term = text.slice(0, 40).replace(/[.,;:!?]+$/, '').trim();
      definition = text;
    }

    const front = `Định nghĩa của **${term}** là gì?`;
    const backParts: string[] = [definition];
    if (excerpt.userNote && options?.includeUserNoteInBack !== false) {
      backParts.push('', `💡 Ghi chú: ${excerpt.userNote}`);
    }
    backParts.push('', provenance);

    return {
      id: cardId,
      sourceExcerptId: excerpt.id,
      strategyUsed: 'definition-split',
      front,
      back: backParts.join('\n'),
      isCloze: false,
      provenanceLabel: provenance,
      highlightColor: excerpt.highlightColor,
      topicId,
      tags,
    };
  }

  // cloze-auto strategy
  const text = (excerpt.selectedText || '').trim();
  const maxClozes = options?.maxClozesPerCard ?? 2;
  const targets = findClozeTargets(text, maxClozes);

  let clozeFront = text;
  // Replace from end to start to preserve original string indices
  const reverseTargets = [...targets].sort((a, b) => b.start - a.start);
  reverseTargets.forEach((t, i) => {
    const clozeIndex = targets.length - i; // Matches original order 1, 2, ...
    const replacement = `{{c${clozeIndex}::${t.replacementText}}}`;
    clozeFront =
      clozeFront.slice(0, t.start) + replacement + clozeFront.slice(t.end);
  });

  // If there are still lingering ** surrounding the text, clean them up for neat cloze reading
  clozeFront = clozeFront.replace(/\*\*\{\{c(\d+)::/g, '{{c$1::').replace(/\}\}\*\*/g, '}}');

  const backParts: string[] = [text];
  if (excerpt.userNote && options?.includeUserNoteInBack !== false) {
    backParts.push('', `💡 Ghi chú: ${excerpt.userNote}`);
  }
  backParts.push('', provenance);

  return {
    id: cardId,
    sourceExcerptId: excerpt.id,
    strategyUsed: 'cloze-auto',
    front: clozeFront,
    back: backParts.join('\n'),
    isCloze: true,
    provenanceLabel: provenance,
    highlightColor: excerpt.highlightColor,
    topicId,
    tags,
  };
}

/**
 * Batch synthesizes flashcards from multiple excerpts with color filtering and deduplication guard.
 */
export function synthesizeFlashcardBatchFromExcerpts(
  excerpts: ExcerptInput[],
  existingCards: Array<{ front: string; back: string; sourceExcerptId?: string }> = [],
  options?: BatchSynthesisOptions
): BatchSynthesisResult {
  const allowedColors = options?.colorFilter && options.colorFilter.length > 0
    ? new Set(options.colorFilter.map((c) => c.toLowerCase().trim()))
    : null;

  // Track existing cards for deduplication
  const existingSourceIds = new Set<string>();
  const existingNormalizedContent = new Set<string>();

  for (const card of existingCards) {
    if (card.sourceExcerptId) {
      existingSourceIds.add(card.sourceExcerptId);
    }
    const combinedNorm = normalizeText(`${card.front} ${card.back}`);
    if (combinedNorm) {
      existingNormalizedContent.add(combinedNorm);
    }
  }

  const candidates: SynthesizedFlashcardCandidate[] = [];
  let skippedDuplicates = 0;

  for (const excerpt of excerpts) {
    // 1. Color filter check
    if (allowedColors !== null) {
      const cardColor = (excerpt.highlightColor || '#fef08a').toLowerCase().trim();
      if (!allowedColors.has(cardColor)) {
        continue;
      }
    }

    // 2. Deduplication check by sourceExcerptId
    if (existingSourceIds.has(excerpt.id)) {
      skippedDuplicates++;
      continue;
    }

    // Check by excerpt text content
    const textNorm = normalizeText(excerpt.selectedText);
    if (textNorm && existingNormalizedContent.has(textNorm)) {
      skippedDuplicates++;
      continue;
    }

    // 3. Synthesize candidate
    const candidate = synthesizeFlashcardFromExcerpt(excerpt, options);

    // Verify candidate content isn't duplicated
    const candNorm = normalizeText(`${candidate.front} ${candidate.back}`);
    if (existingNormalizedContent.has(candNorm)) {
      skippedDuplicates++;
      continue;
    }

    candidates.push(candidate);
    existingSourceIds.add(excerpt.id);
    existingNormalizedContent.add(candNorm);
    if (textNorm) existingNormalizedContent.add(textNorm);
  }

  return {
    candidates,
    skippedDuplicates,
    totalProcessed: excerpts.length,
  };
}
