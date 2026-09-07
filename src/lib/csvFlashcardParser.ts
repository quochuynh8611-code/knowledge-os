/**
 * CSV / TSV Flashcard Parser for Knowledge OS (Phase F6.0).
 * Isomorphic, pure parsing logic supporting comma and tab delimiters,
 * quoted fields, escaped quotes, cloze validation, and Topic Resolution Policy.
 */

import { parseClozeDeletions } from "./clozeParser";

export interface ParsedFlashcard {
  front: string;
  back: string;
  type: "basic" | "cloze";
  topicId: string;
}

export interface ParsedFlashcardRow {
  lineNumber: number;
  isValid: boolean;
  error?: string;
  card?: ParsedFlashcard;
  raw: string;
}

export interface FlashcardParseOptions {
  delimiter?: "," | "\t";
  defaultTopicId?: string;
}

export interface FlashcardImportParseResult {
  totalRows: number;
  validRows: ParsedFlashcardRow[];
  invalidRows: ParsedFlashcardRow[];
  delimiterDetected: "," | "\t";
}

/**
 * Parses raw text into rows and columns respecting quoted strings and escapes.
 */
function parseDelimitedRows(
  content: string,
  delimiter: "," | "\t"
): { rows: string[][]; lineNumbers: number[]; rawLines: string[] } {
  const rows: string[][] = [];
  const lineNumbers: number[] = [];
  const rawLines: string[] = [];

  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;
  let currentRawLine = "";
  let rowStartLine = 1;
  let currentLine = 1;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    currentRawLine += char;

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote: "" -> "
        currentField += '"';
        currentRawLine += nextChar;
        i++; // skip next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      currentRow.push(currentField);
      currentField = "";
    } else if ((char === "\r" || char === "\n") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        currentRawLine += nextChar;
        i++; // skip \n
      }

      currentRow.push(currentField);
      currentField = "";

      // Check if row has any non-whitespace content
      const hasContent = currentRow.some((field) => field.trim().length > 0);
      if (hasContent) {
        rows.push(currentRow);
        lineNumbers.push(rowStartLine);
        rawLines.push(currentRawLine.trim());
      }

      currentRow = [];
      currentRawLine = "";
      currentLine++;
      rowStartLine = currentLine;
    } else {
      if (char === "\n") {
        currentLine++;
      }
      currentField += char;
    }
  }

  // Handle final row if file doesn't end with a newline
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    const hasContent = currentRow.some((field) => field.trim().length > 0);
    if (hasContent) {
      rows.push(currentRow);
      lineNumbers.push(rowStartLine);
      rawLines.push(currentRawLine.trim());
    }
  }

  return { rows, lineNumbers, rawLines };
}

/**
 * Detects delimiter by counting non-quoted commas vs tabs in first few lines.
 */
function detectDelimiter(content: string): "," | "\t" {
  const firstLines = content.split(/\r?\n/).slice(0, 5).join("\n");
  const tabCount = (firstLines.match(/\t/g) || []).length;
  const commaCount = (firstLines.match(/,/g) || []).length;
  return tabCount > commaCount ? "\t" : ",";
}

/**
 * Main parser function adhering to Topic Resolution Policy and cloze validation.
 */
export function parseFlashcardDelimitedText(
  content: string,
  options?: FlashcardParseOptions
): FlashcardImportParseResult {
  if (!content || !content.trim()) {
    return {
      totalRows: 0,
      validRows: [],
      invalidRows: [],
      delimiterDetected: options?.delimiter || ",",
    };
  }

  const delimiter = options?.delimiter || detectDelimiter(content);
  const { rows, lineNumbers, rawLines } = parseDelimitedRows(content, delimiter);

  if (rows.length === 0) {
    return {
      totalRows: 0,
      validRows: [],
      invalidRows: [],
      delimiterDetected: delimiter,
    };
  }

  // Check if first row is header
  const firstRow = rows[0].map((h) => h.trim().toLowerCase());
  const hasHeader =
    firstRow.some((col) => col === "front" || col === "câu hỏi" || col === "question") ||
    firstRow.some((col) => col === "back" || col === "câu trả lời" || col === "answer");

  let startIndex = 0;
  let frontIdx = 0;
  let backIdx = 1;
  let typeIdx = -1;
  let topicIdIdx = -1;

  if (hasHeader) {
    startIndex = 1;
    firstRow.forEach((col, idx) => {
      if (col === "front" || col === "câu hỏi" || col === "question") frontIdx = idx;
      if (col === "back" || col === "câu trả lời" || col === "answer") backIdx = idx;
      if (col === "type" || col === "loại") typeIdx = idx;
      // Per Topic Resolution Policy: Only exact topicId or topic_id maps to FK; 'topic' is ignored!
      if (col === "topicid" || col === "topic_id") topicIdIdx = idx;
    });
  } else {
    // Headerless positional fallback
    frontIdx = 0;
    backIdx = 1;
    if (rows[0].length >= 3) typeIdx = 2;
    if (rows[0].length >= 4) topicIdIdx = 3;
  }

  const validRows: ParsedFlashcardRow[] = [];
  const invalidRows: ParsedFlashcardRow[] = [];

  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i];
    const lineNumber = lineNumbers[i];
    const raw = rawLines[i];

    const rawFront = (row[frontIdx] || "").trim();
    const rawBack = (row[backIdx] || "").trim();
    const rawType = typeIdx >= 0 ? (row[typeIdx] || "").trim().toLowerCase() : "basic";
    const rawTopicId = topicIdIdx >= 0 ? (row[topicIdIdx] || "").trim() : "";

    // 1. Topic Resolution Policy
    const resolvedTopicId = rawTopicId || options?.defaultTopicId || "";

    // 2. Validate topic
    if (!resolvedTopicId) {
      invalidRows.push({
        lineNumber,
        isValid: false,
        error: "Thiếu chủ đề (topicId bắt buộc theo Topic Resolution Policy)",
        raw,
      });
      continue;
    }

    // 3. Validate front
    if (!rawFront) {
      invalidRows.push({
        lineNumber,
        isValid: false,
        error: "Mặt trước (front) không được để trống",
        raw,
      });
      continue;
    }

    // 4. Validate back
    if (!rawBack) {
      invalidRows.push({
        lineNumber,
        isValid: false,
        error: "Mặt sau (back) không được để trống",
        raw,
      });
      continue;
    }

    // 5. Determine & Validate Card Type
    const type: "basic" | "cloze" = rawType === "cloze" ? "cloze" : "basic";

    if (type === "cloze") {
      const clozeItems = parseClozeDeletions(rawFront);
      if (clozeItems.length === 0) {
        invalidRows.push({
          lineNumber,
          isValid: false,
          error: "Thẻ cloze yêu cầu mặt trước phải chứa mẫu đục lỗ {{c1::từ khóa}}",
          raw,
        });
        continue;
      }
    }

    // Valid card
    validRows.push({
      lineNumber,
      isValid: true,
      card: {
        front: rawFront,
        back: rawBack,
        type,
        topicId: resolvedTopicId,
      },
      raw,
    });
  }

  return {
    totalRows: validRows.length + invalidRows.length,
    validRows,
    invalidRows,
    delimiterDetected: delimiter,
  };
}
