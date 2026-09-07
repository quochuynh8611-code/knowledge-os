/**
 * Utility to auto-detect Cloze Deletion syntax ({{c1::answer}} or {{c1::answer::hint}})
 * from selected note text for seamless Flashcard creation.
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
 * Uses regex pattern /\{\{c(\d+)::([\s\S]*?)\}\}/g compatible with clozeParser.
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

  const clozeRegex = /\{\{c(\d+)::([\s\S]*?)\}\}/g;
  const items: ClozeDetectionItem[] = [];
  let match: RegExpExecArray | null;

  while ((match = clozeRegex.exec(selectedText)) !== null) {
    const rawIndex = match[1];
    const rawContent = match[2];
    const clozeNumber = parseInt(rawIndex, 10);

    if (isNaN(clozeNumber) || clozeNumber < 1) {
      continue;
    }

    let answer = rawContent;
    let hint: string | undefined = undefined;

    const hintSeparatorIndex = rawContent.indexOf("::");
    if (hintSeparatorIndex !== -1) {
      answer = rawContent.slice(0, hintSeparatorIndex);
      hint = rawContent.slice(hintSeparatorIndex + 2);
    }

    const item: ClozeDetectionItem = {
      clozeNumber,
      answer,
    };
    if (hint !== undefined) {
      item.hint = hint;
    }

    items.push(item);
  }

  const hasCloze = items.length > 0;

  return {
    hasCloze,
    type: hasCloze ? "cloze" : "basic",
    clozeCount: items.length,
    items,
  };
}
