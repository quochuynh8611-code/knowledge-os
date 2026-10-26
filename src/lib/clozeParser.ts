/**
 * Cloze Deletion Parser for Spaced Repetition Flashcards.
 * Follows the standard {{c1::answer}} and {{c1::answer::hint}} formatting.
 * Upgraded with balanced-brace scanning to flawlessly support complex
 * LaTeX math expressions containing nested braces (e.g. \frac{1}{2}, \ce{Fe^{2+}}).
 */

export interface ClozeItem {
  index: number;
  answer: string;
  prompt: string;
  hint?: string;
}

export interface ParseClozeOptions {
  strict?: boolean;
}

export interface InternalClozeOccurrence {
  index: number;
  answer: string;
  hint?: string;
  start: number;
  end: number;
  fullMatch: string;
}

/**
 * Scans rawText using a balanced brace scanner to extract cloze occurrences.
 * Handles nested braces inside LaTeX formulas cleanly.
 */
export function extractClozeOccurrences(
  rawText: string,
  options?: ParseClozeOptions
): InternalClozeOccurrence[] {
  if (!rawText || typeof rawText !== "string") {
    return [];
  }

  const occurrences: InternalClozeOccurrence[] = [];
  const startRegex = /\{\{c(\d+)::/g;
  let match: RegExpExecArray | null;

  while ((match = startRegex.exec(rawText)) !== null) {
    const rawIndex = match[1];
    const index = parseInt(rawIndex, 10);
    const startIndex = match.index;
    const contentStart = startIndex + match[0].length;

    if (index < 1) {
      if (options?.strict) {
        throw new Error(
          `Chỉ số cloze deletion phải là số nguyên dương >= 1. Nhận được: c${rawIndex}`
        );
      }
      continue;
    }

    let braceDepth = 2; // Starts with opening '{{'
    let hintSeparatorPos = -1;
    let endIndex = -1;

    for (let i = contentStart; i < rawText.length; i++) {
      const char = rawText[i];
      if (char === "{") {
        braceDepth++;
      } else if (char === "}") {
        braceDepth--;
        if (braceDepth === 0) {
          endIndex = i + 1;
          break;
        }
      } else if (char === ":" && braceDepth === 2 && hintSeparatorPos === -1) {
        if (rawText[i + 1] === ":") {
          hintSeparatorPos = i;
          i++; // Skip second ':'
        }
      }
    }

    if (endIndex !== -1 && braceDepth === 0) {
      const fullMatch = rawText.slice(startIndex, endIndex);
      const rawContent = rawText.slice(contentStart, endIndex - 2);

      let answer = rawContent;
      let hint: string | undefined = undefined;

      if (hintSeparatorPos !== -1) {
        answer = rawText.slice(contentStart, hintSeparatorPos);
        hint = rawText.slice(hintSeparatorPos + 2, endIndex - 2);
      }

      if (!answer.trim() && options?.strict) {
        throw new Error(
          `Nội dung câu trả lời cloze không được để trống tại c${index}`
        );
      }

      occurrences.push({
        index,
        answer,
        hint,
        start: startIndex,
        end: endIndex,
        fullMatch,
      });

      // Advance regex search pointer to avoid re-scanning inside this cloze
      startRegex.lastIndex = endIndex;
    } else if (options?.strict) {
      throw new Error("Cú pháp cloze deletion chưa được đóng đúng cách (thiếu '}}')");
    }
  }

  return occurrences;
}

/**
 * Parses markdown text containing cloze deletions: {{c1::answer}} or {{c1::answer::hint}}.
 *
 * For each cloze index c_i:
 * - All occurrences of c_i are replaced with [...] (or hint prompt)
 * - All occurrences of other clozes c_j (j != i) are revealed with their answer text
 * - Cloze occurrences sharing the exact same index are grouped into a single flashcard item
 */
export function parseClozeDeletions(
  rawText: string,
  options?: ParseClozeOptions
): ClozeItem[] {
  const occurrences = extractClozeOccurrences(rawText, options);

  if (occurrences.length === 0) {
    return [];
  }

  // Group occurrences by index
  const indexMap = new Map<number, InternalClozeOccurrence[]>();
  for (const occ of occurrences) {
    const list = indexMap.get(occ.index) || [];
    list.push(occ);
    indexMap.set(occ.index, list);
  }

  // Sort indices ascending (c1, c2, c3, ...)
  const sortedIndices = Array.from(indexMap.keys()).sort((a, b) => a - b);
  const items: ClozeItem[] = [];

  for (const currentIndex of sortedIndices) {
    const currentOccurrences = indexMap.get(currentIndex)!;
    
    // Combine answers for multiple occurrences with same index
    const combinedAnswer = currentOccurrences
      .map((o) => o.answer)
      .join(", ");

    const firstHint = currentOccurrences.find((o) => o.hint !== undefined)?.hint;

    // Build the prompt for this index:
    // Replace current index matches with [...]
    // Replace other index matches with their answer
    let prompt = rawText;
    // Replace from end to start to maintain string indices
    const sortedOccs = [...occurrences].sort((a, b) => b.start - a.start);

    for (const occ of sortedOccs) {
      const replacement = occ.index === currentIndex ? "[...]" : occ.answer;
      prompt =
        prompt.slice(0, occ.start) + replacement + prompt.slice(occ.end);
    }

    const item: ClozeItem = {
      index: currentIndex,
      answer: combinedAnswer,
      prompt,
    };

    if (firstHint !== undefined) {
      item.hint = firstHint;
    }

    items.push(item);
  }

  return items;
}

export * from "./detectClozeFromSelection";
