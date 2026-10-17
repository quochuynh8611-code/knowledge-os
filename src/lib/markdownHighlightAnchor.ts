export interface AnchorTarget {
  selectedText: string;
  contextPrefix?: string | null;
  contextSuffix?: string | null;
  headingId?: string | null;
}

export interface HeadingSection {
  id: string;
  startIndex: number;
  endIndex?: number;
}

export interface AnchorMatch {
  startIndex: number;
  endIndex: number;
  matchedText: string;
}

export interface AnchorResolution {
  success: boolean;
  match?: AnchorMatch;
  failReason?: 'ambiguous' | 'not_found' | 'stale_context' | 'heading_mismatch';
}

/**
 * Normalizes text for robust comparison across whitespace variations (spaces, tabs, newlines).
 */
export function normalizeAnchorText(input: string): string {
  if (!input) return '';
  return input
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function cleanContextString(str: string): string {
  return str
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_`~]/g, '')
    .replace(/^>+\s*/gm, '');
}

/**
 * Builds a regex that matches the sequence of words in normalizedText with any whitespace in between.
 */
function buildWhitespaceFlexiblePattern(normalizedText: string, caseInsensitive = true): RegExp {
  const tokens = normalizedText.split(' ').filter(Boolean).map(escapeRegex);
  if (tokens.length === 0) return /$^/;
  return new RegExp(tokens.join('\\s+'), caseInsensitive ? 'gi' : 'g');
}

/**
 * Pure utility function to resolve an anchor target against document full text.
 * Strictly adheres to fail-closed principles:
 * - Returns success only when a unique verified match is found.
 * - Disambiguates repeated phrases using contextPrefix and contextSuffix.
 * - Applies coarse heading section filtering if sections are provided.
 */
export function resolveMarkdownAnchor(
  fullText: string,
  target: AnchorTarget,
  sections?: HeadingSection[]
): AnchorResolution {
  if (!fullText || !target.selectedText) {
    return { success: false, failReason: 'not_found' };
  }

  const normSelected = normalizeAnchorText(target.selectedText);
  if (!normSelected) {
    return { success: false, failReason: 'not_found' };
  }

  const pattern = buildWhitespaceFlexiblePattern(normSelected, true);
  const allCandidates: AnchorMatch[] = [];

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(fullText)) !== null) {
    allCandidates.push({
      startIndex: match.index,
      endIndex: match.index + match[0].length,
      matchedText: match[0],
    });
  }

  if (allCandidates.length === 0) {
    return { success: false, failReason: 'not_found' };
  }

  // Pre-normalize target contexts (cleaning markdown heading/styling artifacts)
  const hasPrefix = Boolean(target.contextPrefix && target.contextPrefix.trim());
  const hasSuffix = Boolean(target.contextSuffix && target.contextSuffix.trim());
  const normPrefix = hasPrefix
    ? normalizeAnchorText(cleanContextString(target.contextPrefix!)).toLowerCase()
    : null;
  const normSuffix = hasSuffix
    ? normalizeAnchorText(cleanContextString(target.contextSuffix!)).toLowerCase()
    : null;

  // Track if any candidate matched the context regardless of heading
  let hadContextMatchingCandidate = false;

function buildContextFlexiblePattern(normContext: string): RegExp {
  const tokens = normContext.split(/\s+/).filter(Boolean).map(escapeRegex);
  if (tokens.length === 0) return /$^/;
  return new RegExp(tokens.join('\\s*'), 'i');
}

  // Filter candidates based on context
  const contextVerifiedCandidates = allCandidates.filter((cand) => {
    // 1. Context Prefix check
    if (normPrefix) {
      const lookbackLen = Math.max(normPrefix.length * 4, 150);
      const rawBefore = fullText.slice(Math.max(0, cand.startIndex - lookbackLen), cand.startIndex);
      const prefixPattern = buildContextFlexiblePattern(normPrefix);
      if (!prefixPattern.test(rawBefore)) {
        return false;
      }
    }

    // 2. Context Suffix check
    if (normSuffix) {
      const lookaheadLen = Math.max(normSuffix.length * 4, 150);
      const rawAfter = fullText.slice(cand.endIndex, cand.endIndex + lookaheadLen);
      const suffixPattern = buildContextFlexiblePattern(normSuffix);
      if (!suffixPattern.test(rawAfter)) {
        return false;
      }
    }

    hadContextMatchingCandidate = true;
    return true;
  });

  if (hasPrefix || hasSuffix) {
    if (contextVerifiedCandidates.length === 0) {
      return { success: false, failReason: 'stale_context' };
    }
    if (contextVerifiedCandidates.length > 1) {
      return { success: false, failReason: 'ambiguous' };
    }
  } else {
    // Legacy excerpt (no context): only allow if strictly unique
    if (allCandidates.length > 1) {
      return { success: false, failReason: 'ambiguous' };
    }
  }

  // Next, apply heading coarse filter if specified
  let finalCandidates = contextVerifiedCandidates;
  if (target.headingId && sections && sections.length > 0) {
    const targetSection = sections.find((s) => s.id === target.headingId);
    if (!targetSection) {
      return { success: false, failReason: 'heading_mismatch' };
    }

    const inSection = contextVerifiedCandidates.filter((cand) => {
      const inStart = cand.startIndex >= targetSection.startIndex;
      const inEnd = targetSection.endIndex === undefined || cand.startIndex <= targetSection.endIndex;
      return inStart && inEnd;
    });

    if (inSection.length === 0 && hadContextMatchingCandidate) {
      return { success: false, failReason: 'heading_mismatch' };
    }

    finalCandidates = inSection;
  }

  if (finalCandidates.length === 1) {
    return {
      success: true,
      match: finalCandidates[0],
    };
  }

  if (finalCandidates.length > 1) {
    return {
      success: false,
      failReason: 'ambiguous',
    };
  }

  return {
    success: false,
    failReason: hadContextMatchingCandidate && target.headingId ? 'heading_mismatch' : 'not_found',
  };
}

// ─── DOM Highlight Reconciliation Helpers ─────────────────────────────────────

export interface DomTextNodeSlice {
  node: Text;
  startOffset: number;
  endOffset: number;
}

export function extractLinearTextFromDom(root: HTMLElement): {
  linearText: string;
  charMap: Array<{ node: Text; offset: number }>;
} {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      const tag = parent.tagName.toLowerCase();
      if (tag === 'script' || tag === 'style') {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let linearText = '';
  const charMap: Array<{ node: Text; offset: number }> = [];

  let current: Node | null;
  while ((current = walker.nextNode())) {
    const textNode = current as Text;
    const val = textNode.data;
    for (let i = 0; i < val.length; i++) {
      charMap.push({ node: textNode, offset: i });
    }
    linearText += val;
  }

  return { linearText, charMap };
}

export function clearDomHighlights(root: HTMLElement): void {
  const marks = root.querySelectorAll('mark[data-highlight-id]');
  const parentsToNormalize = new Set<Node>();

  marks.forEach((mark) => {
    const parent = mark.parentNode;
    if (parent) {
      parentsToNormalize.add(parent);
      mark.replaceWith(...Array.from(mark.childNodes));
    }
  });

  parentsToNormalize.forEach((parent) => {
    parent.normalize();
  });
}
