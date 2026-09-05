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

/**
 * Creates a URL-friendly slug ID from heading text
 */
function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[đĐ]/g, "d")
    .replace(/\./g, "-") // replace periods in numbering (1.1 -> 1-1)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove diacritics
    .replace(/[^\w\s-]/g, "") // remove punctuation except hyphens/spaces
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * Lightweight parser for YAML frontmatter without external unsafe dependencies
 */
function parseSimpleYamlFrontmatter(yamlString: string): Record<string, any> {
  const result: Record<string, any> = {};
  const lines = yamlString.split("\n");

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    let valueStr = line.slice(colonIndex + 1).trim();

    // Check array: [item1, item2]
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

  // Check YAML Frontmatter block: ^---\r?\n([\s\S]*?)\r?\n---(\r?\n|$)
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
  const match = rawMarkdown.match(frontmatterRegex);

  if (match) {
    const rawYaml = match[1];
    frontmatter = parseSimpleYamlFrontmatter(rawYaml);
    bodyContent = rawMarkdown.slice(match[0].length);
  }

  // Extract headings outline while ignoring code blocks (```...```)
  const outline: OutlineItem[] = [];
  const lines = rawMarkdown.split("\n");
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
        id: slugifyHeading(headingText),
      });
    }
  }

  return {
    frontmatter,
    outline,
    content: rawMarkdown,
  };
}
