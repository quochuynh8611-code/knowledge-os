/**
 * Utility to auto-detect Cloze Deletion syntax ({{c1::answer}} or {{c1::answer::hint}})
 * from selected note text for seamless Flashcard creation.
 * Upgraded with balanced brace scanning to support nested LaTeX formulas.
 */

export interface ClozeDetectionItem {
  clozeNumber: number;
  answer: string;
  hint?: string;
}

export interface ClozeDetectionResult {
  hasCloze: boolean;
  type: "basic" | "cloze";
  clozeCount: number;
  items: ClozeDetectionItem[];
}

/**
 * Detects if a text snippet contains valid Anki-style cloze deletion syntax.
 * Uses balanced brace scanning compatible with clozeParser and nested LaTeX formulas.
 */
export function detectClozeFromSelection(
  selectedText: string
): ClozeDetectionResult {
  if (!selectedText || typeof selectedText !== "string") {
    return {
      hasCloze: false,
      type: "basic",
      clozeCount: 0,
      items: [],
    };
  }

  const items: ClozeDetectionItem[] = [];
  const startRegex = /\{\{c(\d+)::/g;
  let match: RegExpExecArray | null;

  while ((match = startRegex.exec(selectedText)) !== null) {
    const rawIndex = match[1];
    const clozeNumber = parseInt(rawIndex, 10);
    const startIndex = match.index;
    const contentStart = startIndex + match[0].length;

    if (isNaN(clozeNumber) || clozeNumber < 1) {
      continue;
    }

    let braceDepth = 2; // Starts with opening '{{'
    let hintSeparatorPos = -1;
    let endIndex = -1;

    for (let i = contentStart; i < selectedText.length; i++) {
      const char = selectedText[i];
      if (char === "{") {
        braceDepth++;
      } else if (char === "}") {
        braceDepth--;
        if (braceDepth === 0) {
          endIndex = i + 1;
          break;
        }
      } else if (char === ":" && braceDepth === 2 && hintSeparatorPos === -1) {
        if (selectedText[i + 1] === ":") {
          hintSeparatorPos = i;
          i++; // Skip second ':'
        }
      }
    }

    if (endIndex !== -1 && braceDepth === 0) {
      const rawContent = selectedText.slice(contentStart, endIndex - 2);
      let answer = rawContent;
      let hint: string | undefined = undefined;

      if (hintSeparatorPos !== -1) {
        answer = selectedText.slice(contentStart, hintSeparatorPos);
        hint = selectedText.slice(hintSeparatorPos + 2, endIndex - 2);
      }

      const item: ClozeDetectionItem = {
        clozeNumber,
        answer,
      };
      if (hint !== undefined) {
        item.hint = hint;
      }

      items.push(item);

      // Advance search index past this match
      startRegex.lastIndex = endIndex;
    }
  }

  const hasCloze = items.length > 0;

  return {
    hasCloze,
    type: hasCloze ? "cloze" : "basic",
    clozeCount: items.length,
    items,
  };
}
