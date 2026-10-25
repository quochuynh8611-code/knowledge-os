import React from "react";
import {
  parseAcademicNotationTokens,
  renderAcademicMath,
} from "../../lib/academicNotation";
import { MermaidDiagramBlock } from "./MermaidDiagramBlock";

export interface AcademicMarkdownProps {
  content?: string;
  inline?: boolean;
  className?: string;
}

/**
 * Universal Academic Markdown renderer.
 * Renders prose, KaTeX inline/block math with mhchem chemistry formulas,
 * and dynamic Mermaid diagrams safely.
 */
export function AcademicMarkdown({
  content = "",
  inline = false,
  className = "",
}: AcademicMarkdownProps) {
  if (!content) return null;

  const tokens = parseAcademicNotationTokens(content);

  const elements = tokens.map((token, index) => {
    switch (token.type) {
      case "text":
        return <span key={`text-${index}`}>{token.content}</span>;

      case "inline-math": {
        const mathHtml = renderAcademicMath(token.content, { displayMode: false });
        return (
          <span
            key={`imath-${index}`}
            className="academic-inline-math inline-block align-baseline"
            dangerouslySetInnerHTML={{ __html: mathHtml }}
          />
        );
      }

      case "block-math": {
        if (inline) {
          const mathHtml = renderAcademicMath(token.content, { displayMode: false });
          return (
            <span
              key={`bmath-inline-${index}`}
              className="academic-inline-math inline-block align-baseline mx-1"
              dangerouslySetInnerHTML={{ __html: mathHtml }}
            />
          );
        }
        const mathHtml = renderAcademicMath(token.content, { displayMode: true });
        return (
          <div
            key={`bmath-${index}`}
            className="academic-block-math my-3.5 overflow-x-auto text-center"
            dangerouslySetInnerHTML={{ __html: mathHtml }}
          />
        );
      }

      case "mermaid": {
        if (inline) {
          return (
            <span
              key={`mermaid-inline-${index}`}
              className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 font-semibold mx-1"
            >
              [Sơ đồ Mermaid]
            </span>
          );
        }
        return <MermaidDiagramBlock key={`mermaid-${index}`} code={token.content} />;
      }

      default:
        return <span key={`token-${index}`}>{token.content}</span>;
    }
  });

  if (inline) {
    return <span className={className}>{elements}</span>;
  }

  return <div className={className}>{elements}</div>;
}
