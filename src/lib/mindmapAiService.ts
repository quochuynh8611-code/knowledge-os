/**
 * Mind Map AI Node Expansion Service & Normalization Layer (Phase P3)
 *
 * Provides abstraction for generating, parsing, and normalizing AI-suggested nodes
 * for interactive mind map expansion.
 *
 * Local-first; không làm thay đổi DataContext theo observable contract;
 * blast radius thấp, bounded trong Mind Map context.
 */

import {
  AiExpansionContext,
  AiCandidateNode,
  AiExpansionServiceResult,
  AiExpansionJsonPayload,
  MindMapAiClient,
} from '../types/mindmapAi';

export * from '../types/mindmapAi';

/**
 * Normalizes a node title for duplicate comparison:
 * trims, collapses multiple spaces, and converts to lowercase.
 */
export function normalizeTitleForComparison(title: string): string {
  if (!title) return '';
  return title
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/**
 * Normalizes and parses raw text output from an AI provider into structured candidate nodes.
 * JSON schema is the primary contract; Markdown bullet list is the fallback parser.
 */
export function normalizeAiResponse(
  rawText: string,
  context: AiExpansionContext
): AiExpansionServiceResult {
  const trimmedRaw = (rawText || '').trim();
  if (!trimmedRaw) {
    return {
      ok: false,
      candidates: [],
      rawText,
      error: {
        code: 'EMPTY_RESULT',
        message: 'AI không tìm thấy gợi ý phù hợp. Vui lòng thử đổi mẫu yêu cầu.',
      },
    };
  }

  const existingNormalizedSet = new Set(
    (context.existingSiblingTitles || []).map(normalizeTitleForComparison).filter(Boolean)
  );

  let rawCandidates: Array<{ title: string; description?: string }> = [];
  let isFallbackParsed = false;

  // 1. Try Primary JSON Schema Parsing
  try {
    let cleanJsonStr = trimmedRaw;
    // Strip markdown code fences if present
    if (cleanJsonStr.includes('```')) {
      const match = cleanJsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match && match[1]) {
        cleanJsonStr = match[1].trim();
      }
    }

    const parsed: AiExpansionJsonPayload = JSON.parse(cleanJsonStr);
    if (Array.isArray(parsed.candidates)) {
      rawCandidates = parsed.candidates.map((c) => ({
        title: (c.title || '').trim(),
        description: c.description ? c.description.trim() : undefined,
      }));
    }
  } catch {
    // Primary JSON parse failed, proceed to fallback parser
    isFallbackParsed = true;
  }

  // 2. Fallback: Parse Markdown bullet lists or numbered items
  if (rawCandidates.length === 0) {
    isFallbackParsed = true;
    const lines = trimmedRaw.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Matches "- item", "* item", "+ item", "1. item", "1) item"
      const bulletMatch = trimmedLine.match(/^[-*+]\s+(?:(?:\d+[\.\)]\s*)?)(.+)$/);
      const numberedMatch = trimmedLine.match(/^\d+[\.\)]\s+(.+)$/);

      let itemText: string | null = null;
      if (bulletMatch && bulletMatch[1]) {
        itemText = bulletMatch[1].trim();
      } else if (numberedMatch && numberedMatch[1]) {
        itemText = numberedMatch[1].trim();
      }

      if (itemText) {
        // Separate title and optional description if format is "Title - Description" or "Title (Description)"
        rawCandidates.push({
          title: itemText,
        });
      }
    }
  }

  // 3. If still 0 candidates after both passes
  if (rawCandidates.length === 0) {
    return {
      ok: false,
      candidates: [],
      rawText,
      error: {
        code: 'PARSE_ERROR',
        message: 'Không thể phân tích định dạng gợi ý từ AI. Vui lòng thử lại.',
      },
    };
  }

  // 4. Transform into final candidate items with duplicate detection
  const candidates: AiCandidateNode[] = [];
  let index = 0;

  for (const raw of rawCandidates) {
    const cleanTitle = (raw.title || '').trim();
    if (!cleanTitle) continue;

    const normalized = normalizeTitleForComparison(cleanTitle);
    const isDuplicate = existingNormalizedSet.has(normalized);

    candidates.push({
      id: `candidate-${Date.now()}-${index++}`,
      title: cleanTitle,
      description: raw.description,
      nodeType: 'topic',
      selected: !isDuplicate, // Uncheck by default if duplicate
      isSuspectedDuplicate: isDuplicate,
    });
  }

  if (candidates.length === 0) {
    return {
      ok: false,
      candidates: [],
      rawText,
      error: {
        code: 'EMPTY_RESULT',
        message: 'AI không tìm thấy gợi ý phù hợp. Vui lòng thử đổi mẫu yêu cầu.',
      },
    };
  }

  return {
    ok: true,
    candidates,
    rawText,
    isFallbackParsed,
  };
}

/**
 * Creates a mockable MindMapAiClient implementation for automated tests and offline development.
 */
export function createMockMindMapAiClient(options?: {
  mockCandidates?: Array<{ title: string; description?: string }>;
  artificialDelayMs?: number;
}): MindMapAiClient {
  const mockCandidates = options?.mockCandidates || [
    { title: 'Ngăn ngừa điều ác chưa sinh', description: 'Tinh tấn phòng hộ' },
    { title: 'Đoạn trừ điều ác đã sinh', description: 'Tinh tấn từ bỏ' },
    { title: 'Phát khởi điều thiện chưa sinh', description: 'Tinh tấn tu tập' },
    { title: 'Tăng trưởng điều thiện đã sinh', description: 'Tinh tấn viên mãn' },
  ];
  const delayMs = options?.artificialDelayMs ?? 0;

  return {
    async generateNodeExpansion(
      context: AiExpansionContext,
      signal?: AbortSignal
    ): Promise<AiExpansionServiceResult> {
      if (signal?.aborted) {
        return {
          ok: false,
          candidates: [],
          error: {
            code: 'CANCELLED',
            message: 'Đã dừng quá trình tạo gợi ý.',
          },
        };
      }

      if (delayMs > 0) {
        await new Promise<void>((resolve, reject) => {
          const timeoutId = setTimeout(() => resolve(), delayMs);
          if (signal) {
            signal.addEventListener('abort', () => {
              clearTimeout(timeoutId);
              reject(new DOMException('Aborted', 'AbortError'));
            });
          }
        }).catch(() => {
          return null;
        });

        if (signal?.aborted) {
          return {
            ok: false,
            candidates: [],
            error: {
              code: 'CANCELLED',
              message: 'Đã dừng quá trình tạo gợi ý.',
            },
          };
        }
      }

      const jsonPayload = JSON.stringify({ candidates: mockCandidates });
      return normalizeAiResponse(jsonPayload, context);
    },
  };
}
