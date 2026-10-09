/**
 * Pure, side-effect-free parser and AST validator for Mind Map Markdown outlines.
 * Supports standard bullet formats (-, *, +), mixed indentations, semantic badges,
 * node icons, markdown links, and jump-indentation diagnostics.
 *
 * ZERO dependencies, ZERO DOM/React state, ZERO database/DataContext mutations.
 */

export type ImportNodeType = "topic" | "note" | "resource";

export type ImportSemanticEdgeType =
  | "prerequisite"
  | "advanced"
  | "related"
  | "contradicts"
  | "has_note"
  | "has_resource";

export interface MindMapImportNode {
  id: string;
  title: string;
  nodeType: ImportNodeType;
  edgeTypeToParent?: ImportSemanticEdgeType;
  sourceIdReference?: string;
  studyStatusText?: string;
  progressPercent?: number;
  rawLine: string;
  lineNumber: number;
  depth: number;
  children: MindMapImportNode[];
}

export type ImportWarningCode =
  | "JUMP_INDENTATION"
  | "UNRECOGNIZED_BADGE"
  | "MIXED_INDENTATION"
  | "MULTIPLE_ROOTS";

export type ImportErrorCode =
  | "EMPTY_INPUT"
  | "NO_VALID_NODES"
  | "MALFORMED_OUTLINE";

export interface MindMapImportWarning {
  lineNumber: number;
  code: ImportWarningCode;
  message: string;
}

export interface MindMapImportError {
  lineNumber?: number;
  code: ImportErrorCode;
  message: string;
}

export interface MindMapImportParseResult {
  status: "SUCCESS" | "WARNING" | "EMPTY_OR_INVALID";
  root: MindMapImportNode | null;
  forest: MindMapImportNode[];
  totalNodeCount: number;
  maxDepth: number;
  warnings: MindMapImportWarning[];
  errors: MindMapImportError[];
}

export interface MindMapImportParserOptions {
  tabSize?: number;
  defaultNodeType?: ImportNodeType;
}

interface RawLineToken {
  lineNumber: number;
  rawLine: string;
  indentLength: number;
  hasTab: boolean;
  content: string;
  isHeading: boolean;
}

const SEMANTIC_BADGE_MAP: Record<string, ImportSemanticEdgeType> = {
  "tiên quyết": "prerequisite",
  "tien quyet": "prerequisite",
  "prerequisite": "prerequisite",
  "nâng cao": "advanced",
  "nang cao": "advanced",
  "advanced": "advanced",
  "liên quan": "related",
  "lien quan": "related",
  "related": "related",
  "đối chiếu": "contradicts",
  "doi chieu": "contradicts",
  "contradicts": "contradicts",
  "ghi chú": "has_note",
  "ghi chu": "has_note",
  "has_note": "has_note",
  "tài liệu": "has_resource",
  "tai lieu": "has_resource",
  "has_resource": "has_resource",
};

/**
 * Calculates leading indent length expanding tabs to tabSize spaces.
 */
function calculateIndent(line: string, tabSize: number): { indentLength: number; hasTab: boolean } {
  let indentLength = 0;
  let hasTab = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === " ") {
      indentLength += 1;
    } else if (ch === "\t") {
      hasTab = true;
      indentLength += tabSize;
    } else {
      break;
    }
  }
  return { indentLength, hasTab };
}

/**
 * Parses node content line and extracts metadata (title, nodeType, badge, links, studyStatus).
 */
function parseNodeContent(
  rawContent: string,
  defaultNodeType: ImportNodeType = "topic"
): {
  title: string;
  nodeType: ImportNodeType;
  edgeTypeToParent?: ImportSemanticEdgeType;
  sourceIdReference?: string;
  studyStatusText?: string;
  progressPercent?: number;
} {
  let text = rawContent.trim();

  let edgeTypeToParent: ImportSemanticEdgeType | undefined = undefined;
  let nodeType: ImportNodeType = defaultNodeType;
  let sourceIdReference: string | undefined = undefined;
  let studyStatusText: string | undefined = undefined;
  let progressPercent: number | undefined = undefined;

  // 1. Extract semantic relation badge at start: e.g. [tiên quyết], [nâng cao], [related]
  const badgeMatch = text.match(/^\[([a-zA-Z0-9_\u00C0-\u1EF9\s-]+)\]\s*/i);
  if (badgeMatch) {
    const rawBadge = badgeMatch[1].trim().toLowerCase();
    if (SEMANTIC_BADGE_MAP[rawBadge]) {
      edgeTypeToParent = SEMANTIC_BADGE_MAP[rawBadge];
      text = text.slice(badgeMatch[0].length).trim();
    }
  }

  // 2. Extract node type icon if present: 📚, 📝, 🔗
  if (text.startsWith("📚")) {
    nodeType = "topic";
    text = text.slice(2).trim();
  } else if (text.startsWith("📝")) {
    nodeType = "note";
    text = text.slice(2).trim();
    if (!edgeTypeToParent) edgeTypeToParent = "has_note";
  } else if (text.startsWith("🔗")) {
    nodeType = "resource";
    text = text.slice(2).trim();
    if (!edgeTypeToParent) edgeTypeToParent = "has_resource";
  }

  // 3. Extract study status suffix if present, e.g. `[Hoàn thành: 100%]`, `[Tiến độ: 50%]`, `[Đang học]`
  const statusMatch = text.match(/`\[([^\]]+)\]`\s*$/);
  if (statusMatch) {
    studyStatusText = statusMatch[1].trim();
    text = text.slice(0, statusMatch.index).trim();

    const percentMatch = studyStatusText.match(/(\d+)%/);
    if (percentMatch) {
      progressPercent = parseInt(percentMatch[1], 10);
    }
  }

  // 4. Extract Markdown links: **[Title](url)** or [Title](url)
  const boldLinkMatch = text.match(/^\*\*\[([^\]]+)\]\(([^)]+)\)\*\*$/);
  const plainLinkMatch = text.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
  const linkMatch = boldLinkMatch || plainLinkMatch;

  if (linkMatch) {
    text = linkMatch[1].trim();
    const url = linkMatch[2].trim();

    const topicIdMatch = url.match(/(?:#|\/)?\/topics\/([^/?#]+)/);
    if (topicIdMatch) {
      try {
        sourceIdReference = decodeURIComponent(topicIdMatch[1]);
      } catch {
        sourceIdReference = topicIdMatch[1];
      }
    }
  } else {
    // Strip surrounding markdown bold / italic formatting if plain title
    text = text.replace(/^\*\*([^*]+)\*\*$/, "$1").replace(/^\*([^*]+)\*$/, "$1").trim();
  }

  return {
    title: text || "Untitled Node",
    nodeType,
    edgeTypeToParent,
    sourceIdReference,
    studyStatusText,
    progressPercent,
  };
}

/**
 * Pure function to parse a Markdown outline into a deterministic MindMapImportParseResult AST.
 */
export function parseMindMapMarkdownOutline(
  markdown: string,
  options?: MindMapImportParserOptions
): MindMapImportParseResult {
  const tabSize = options?.tabSize ?? 2;
  const defaultNodeType = options?.defaultNodeType ?? "topic";

  const warnings: MindMapImportWarning[] = [];
  const errors: MindMapImportError[] = [];

  if (!markdown || typeof markdown !== "string" || markdown.trim().length === 0) {
    return {
      status: "EMPTY_OR_INVALID",
      root: null,
      forest: [],
      totalNodeCount: 0,
      maxDepth: 0,
      warnings,
      errors: [
        {
          code: "EMPTY_INPUT",
          message: "Input Markdown string is empty or contains only whitespace",
        },
      ],
    };
  }

  const lines = markdown.split(/\r?\n/);
  const rawTokens: RawLineToken[] = [];
  let foundTabs = false;
  let foundSpaces = false;

  let headingRootToken: RawLineToken | null = null;

  for (let idx = 0; idx < lines.length; idx++) {
    const lineNum = idx + 1;
    const line = lines[idx];
    const trimmed = line.trim();

    if (trimmed.length === 0 || trimmed.startsWith(">") || trimmed.startsWith("<!--")) {
      continue;
    }

    // Check for Markdown heading (# Title)
    const headingMatch = line.match(/^#+\s*(?:🗺️\s*(?:Sơ Đồ Tư Duy:\s*)?)?(.*)$/i);
    if (headingMatch && rawTokens.length === 0 && !headingRootToken) {
      headingRootToken = {
        lineNumber: lineNum,
        rawLine: line,
        indentLength: 0,
        hasTab: false,
        content: headingMatch[1].trim(),
        isHeading: true,
      };
      continue;
    }

    // Check for bullet items: -, *, +
    const bulletMatch = line.match(/^([\s\t]*)[-*+]\s+(.*)$/);
    if (bulletMatch) {
      const indentStr = bulletMatch[1];
      const { indentLength, hasTab } = calculateIndent(indentStr, tabSize);

      if (hasTab) foundTabs = true;
      if (indentStr.includes(" ")) foundSpaces = true;

      rawTokens.push({
        lineNumber: lineNum,
        rawLine: line,
        indentLength,
        hasTab,
        content: bulletMatch[2].trim(),
        isHeading: false,
      });
    }
  }

  if (foundTabs && foundSpaces) {
    warnings.push({
      lineNumber: 1,
      code: "MIXED_INDENTATION",
      message: "Mixed tabs and spaces detected in outline; normalized using tabSize = " + tabSize,
    });
  }

  // Prepend headingRootToken as root if outline bullets exist
  const tokensToProcess: RawLineToken[] = [];
  if (headingRootToken) {
    tokensToProcess.push(headingRootToken);
    for (const tok of rawTokens) {
      tokensToProcess.push({
        ...tok,
        indentLength: tok.indentLength + tabSize,
      });
    }
  } else {
    tokensToProcess.push(...rawTokens);
  }

  if (tokensToProcess.length === 0) {
    return {
      status: "EMPTY_OR_INVALID",
      root: null,
      forest: [],
      totalNodeCount: 0,
      maxDepth: 0,
      warnings,
      errors: [
        {
          code: "NO_VALID_NODES",
          message: "No bullet list or hierarchical headings found in the provided Markdown",
        },
      ],
    };
  }

  // Build Tree Structure with stack
  let nodeSequence = 0;
  const forest: MindMapImportNode[] = [];
  const stack: { node: MindMapImportNode; depth: number }[] = [];
  let maxDepth = 0;

  for (const token of tokensToProcess) {
    const rawDepth = Math.round(token.indentLength / tabSize);
    const parsedData = parseNodeContent(token.content, defaultNodeType);

    let effectiveDepth = rawDepth;

    // Detect jump indentation
    if (stack.length > 0) {
      const topDepth = stack[stack.length - 1].depth;
      if (rawDepth > topDepth + 1) {
        warnings.push({
          lineNumber: token.lineNumber,
          code: "JUMP_INDENTATION",
          message: `Jump indentation at line ${token.lineNumber} (from depth ${topDepth} to ${rawDepth}); clamped to ${topDepth + 1}`,
        });
        effectiveDepth = topDepth + 1;
      }
    } else {
      effectiveDepth = 0;
    }

    const node: MindMapImportNode = {
      id: `import-node-${nodeSequence++}`,
      title: parsedData.title,
      nodeType: parsedData.nodeType,
      edgeTypeToParent: parsedData.edgeTypeToParent,
      sourceIdReference: parsedData.sourceIdReference,
      studyStatusText: parsedData.studyStatusText,
      progressPercent: parsedData.progressPercent,
      rawLine: token.rawLine,
      lineNumber: token.lineNumber,
      depth: effectiveDepth,
      children: [],
    };

    maxDepth = Math.max(maxDepth, effectiveDepth);

    // Pop until finding the direct parent
    while (stack.length > 0 && stack[stack.length - 1].depth >= effectiveDepth) {
      stack.pop();
    }

    if (stack.length === 0) {
      forest.push(node);
    } else {
      stack[stack.length - 1].node.children.push(node);
    }

    stack.push({ node, depth: effectiveDepth });
  }

  if (forest.length > 1) {
    warnings.push({
      lineNumber: forest[1].lineNumber,
      code: "MULTIPLE_ROOTS",
      message: `Multiple top-level roots (${forest.length}) detected; forest contains all roots`,
    });
  }

  const primaryRoot = forest.length > 0 ? forest[0] : null;

  return {
    status: warnings.length > 0 ? "WARNING" : "SUCCESS",
    root: primaryRoot,
    forest,
    totalNodeCount: nodeSequence,
    maxDepth,
    warnings,
    errors,
  };
}

export interface TreeValidationRules {
  maxDepthLimit?: number;
  maxNodesLimit?: number;
  disallowMultipleRoots?: boolean;
}

export interface TreeValidationResult {
  isValid: boolean;
  issues: string[];
}

/**
 * Pure validator to assert structural limits and safety criteria on a parsed tree AST.
 */
export function validateImportTree(
  result: MindMapImportParseResult,
  rules?: TreeValidationRules
): TreeValidationResult {
  const issues: string[] = [];

  if (result.status === "EMPTY_OR_INVALID" || !result.root) {
    issues.push("Tree is empty or contains unparseable syntax");
    return { isValid: false, issues };
  }

  const maxDepthLimit = rules?.maxDepthLimit ?? 10;
  const maxNodesLimit = rules?.maxNodesLimit ?? 500;

  if (result.maxDepth > maxDepthLimit) {
    issues.push(`Tree depth (${result.maxDepth}) exceeds maximum allowed depth (${maxDepthLimit})`);
  }

  if (result.totalNodeCount > maxNodesLimit) {
    issues.push(`Total nodes count (${result.totalNodeCount}) exceeds maximum allowed nodes (${maxNodesLimit})`);
  }

  if (rules?.disallowMultipleRoots && result.forest.length > 1) {
    issues.push(`Multiple top-level root nodes (${result.forest.length}) are not permitted`);
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}
