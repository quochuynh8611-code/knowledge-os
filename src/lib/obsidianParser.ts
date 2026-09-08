import { HeadingSlugger } from "./headingSlugger";

export interface OutlineItem {
  level: number;
  text: string;
  id: string;
}

export interface ParsedObsidianNote {
  frontmatter: Record<string, any>;
  outline: OutlineItem[];
  content: string;
}

export { HeadingSlugger };

/**
 * Lightweight parser for YAML frontmatter without external unsafe dependencies.
 * Supports inline lists [a, b], multi-line lists (- item), quoted strings, booleans, and numbers.
 */
export function parseSimpleYamlFrontmatter(yamlString: string): Record<string, any> {
  const result: Record<string, any> = {};
  const lines = yamlString.split(/\r?\n/);

  let currentListKey: string | null = null;
  let currentList: string[] = [];

  const flushList = () => {
    if (currentListKey) {
      result[currentListKey] = currentList;
      currentListKey = null;
      currentList = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    // Check if line is a list item under current list key: "  - item" or "- item"
    const listItemMatch = trimmed.match(/^-\s+(.+)$/);
    if (listItemMatch && currentListKey) {
      let itemVal = listItemMatch[1].trim();
      if (
        (itemVal.startsWith('"') && itemVal.endsWith('"')) ||
        (itemVal.startsWith("'") && itemVal.endsWith("'"))
      ) {
        itemVal = itemVal.slice(1, -1);
      }
      currentList.push(itemVal);
      continue;
    }

    // Otherwise, flush existing list and look for a new key
    flushList();

    const colonIndex = rawLine.indexOf(":");
    if (colonIndex === -1) continue;

    const key = rawLine.slice(0, colonIndex).trim();
    if (!key) continue;

    let valueStr = rawLine.slice(colonIndex + 1).trim();

    // If valueStr is empty, this could be the start of a multi-line list (e.g. "tags:")
    if (valueStr === "") {
      currentListKey = key;
      currentList = [];
      continue;
    }

    // Check inline array: [item1, item2]
    if (valueStr.startsWith("[") && valueStr.endsWith("]")) {
      const inner = valueStr.slice(1, -1).trim();
      if (!inner) {
        result[key] = [];
      } else {
        result[key] = inner
          .split(",")
          .map((item) => item.trim().replace(/^["']|["']$/g, ""))
          .filter((item) => item.length > 0);
      }
      continue;
    }

    // Strip outer quotes if string
    if (
      (valueStr.startsWith('"') && valueStr.endsWith('"')) ||
      (valueStr.startsWith("'") && valueStr.endsWith("'"))
    ) {
      valueStr = valueStr.slice(1, -1);
    }

    // Numbers & Booleans
    if (valueStr === "true") {
      result[key] = true;
    } else if (valueStr === "false") {
      result[key] = false;
    } else if (!isNaN(Number(valueStr)) && valueStr !== "") {
      result[key] = Number(valueStr);
    } else {
      result[key] = valueStr;
    }
  }

  flushList();
  return result;
}

/**
 * Parses Obsidian Markdown, extracting YAML frontmatter, heading outline tree,
 * and ensuring code blocks do not trigger false positive headings.
 */
export function parseObsidianFrontmatterAndOutline(
  rawMarkdown: string
): ParsedObsidianNote {
  if (!rawMarkdown || typeof rawMarkdown !== "string") {
    return { frontmatter: {}, outline: [], content: "" };
  }

  let frontmatter: Record<string, any> = {};
  let bodyContent = rawMarkdown;

  // Check YAML Frontmatter block: ^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
  const match = rawMarkdown.match(frontmatterRegex);

  if (match) {
    const rawYaml = match[1];
    frontmatter = parseSimpleYamlFrontmatter(rawYaml);
    bodyContent = rawMarkdown.slice(match[0].length);
  }

  // Extract headings outline using HeadingSlugger
  const slugger = new HeadingSlugger();
  const outline: OutlineItem[] = [];
  const lines = rawMarkdown.split(/\r?\n/);
  let inCodeBlock = false;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    // Toggle code block
    if (trimmed.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) continue;

    // Check heading: # Heading, ## Heading, etc.
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = headingMatch[2].trim();
      outline.push({
        level,
        text: headingText,
        id: slugger.slug(headingText),
      });
    }
  }

  return {
    frontmatter,
    outline,
    content: bodyContent,
  };
}
