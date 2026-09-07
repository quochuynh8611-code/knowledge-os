/**
 * Cloze Deletion Parser for Spaced Repetition Flashcards.
 * Follows the standard {{c1::answer}} and {{c1::answer::hint}} formatting.
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

interface InternalClozeOccurrence {
  index: number;
  answer: string;
  hint?: string;
  start: number;
  end: number;
  fullMatch: string;
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
  if (!rawText || typeof rawText !== "string") {
    return [];
  }

  // Regex pattern to match {{c<index>::<content>}}
  const clozeRegex = /\{\{c(\d+)::([\s\S]*?)\}\}/g;
  const occurrences: InternalClozeOccurrence[] = [];
  let match: RegExpExecArray | null;

  while ((match = clozeRegex.exec(rawText)) !== null) {
    const rawIndex = match[1];
    const rawContent = match[2];
    const index = parseInt(rawIndex, 10);

    if (index < 1) {
      throw new Error(
        `Chỉ số cloze deletion phải là số nguyên dương >= 1. Nhận được: c${rawIndex}`
      );
    }

    let answer = rawContent;
    let hint: string | undefined = undefined;

    const hintSeparatorIndex = rawContent.indexOf("::");
    if (hintSeparatorIndex !== -1) {
      answer = rawContent.slice(0, hintSeparatorIndex);
      hint = rawContent.slice(hintSeparatorIndex + 2);
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
      start: match.index,
      end: match.index + match[0].length,
      fullMatch: match[0],
    });
  }

  // In strict mode, verify there are no unclosed/stray cloze openings like {{c1::
  if (options?.strict) {
    const strayOpening = /\{\{c\d+::(?![^}]*\}\})/;
    if (strayOpening.test(rawText)) {
      throw new Error("Cú pháp cloze deletion chưa được đóng đúng cách (thiếu '}}')");
    }
  }

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
