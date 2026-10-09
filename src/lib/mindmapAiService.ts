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
  AiProviderValidationResult,
  GeminiAiClientOptions,
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
 * Runtime validation gate for structured AI provider output.
 * Protects against malformed objects, non-array candidates, empty titles, and invalid types.
 */
export function validateAiProviderPayload(payload: any): AiProviderValidationResult {
  const errors: string[] = [];
  if (!payload || typeof payload !== 'object') {
    return {
      valid: false,
      errors: ['Payload must be a non-null object'],
    };
  }

  if (!Array.isArray(payload.candidates)) {
    return {
      valid: false,
      errors: ['Payload must contain a "candidates" array'],
    };
  }

  if (payload.candidates.length === 0) {
    return {
      valid: false,
      errors: ['Candidates array cannot be empty'],
    };
  }

  const validCandidates: Array<{ title: string; description?: string; nodeType?: 'topic' | 'note' }> = [];

  for (let i = 0; i < payload.candidates.length; i++) {
    const item = payload.candidates[i];
    if (!item || typeof item !== 'object') {
      errors.push(`Candidate at index ${i} is not a valid object`);
      continue;
    }

    if (typeof item.title !== 'string' || !item.title.trim()) {
      errors.push(`Candidate at index ${i} has an empty or invalid title`);
      continue;
    }

    if (item.nodeType !== undefined && item.nodeType !== 'topic' && item.nodeType !== 'note') {
      errors.push(`Candidate at index ${i} has invalid nodeType: "${item.nodeType}"`);
      continue;
    }

    validCandidates.push({
      title: item.title.trim(),
      description: typeof item.description === 'string' ? item.description.trim() : undefined,
      nodeType: item.nodeType,
    });
  }

  if (errors.length > 0 || validCandidates.length === 0) {
    return {
      valid: false,
      errors: errors.length > 0 ? errors : ['No valid candidates found'],
    };
  }

  return {
    valid: true,
    errors: [],
    data: {
      candidates: validCandidates,
    },
  };
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
 * Creates a live Gemini-backed MindMapAiClient implementation.
 * Validates provider responses before candidate normalization and respects AbortSignal.
 */
export function createGeminiMindMapAiClient(options?: GeminiAiClientOptions): MindMapAiClient {
  const envApiKey =
    (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : undefined) ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY);
  const apiKey = options?.apiKey || envApiKey;
  const model = options?.model || 'gemini-2.5-flash';
  const apiEndpoint = options?.apiEndpoint || `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const fetchFn = options?.customFetch || fetch;

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

      if (!apiKey && !options?.customFetch) {
        return {
          ok: false,
          candidates: [],
          error: {
            code: 'API_ERROR',
            message: 'GEMINI_API_KEY chưa được cấu hình. Vui lòng cấu hình API Key.',
          },
        };
      }

      const prompt = `Bạn là chuyên gia tư duy và kiến trúc sư tri thức. Nhiệm vụ: Gợi ý các nhánh con chất lượng cao cho sơ đồ tư duy.
Ngữ cảnh nút mục tiêu: "${context.targetNodeTitle}"
Chủ đề gốc: "${context.rootTopicTitle}"
Đường dẫn cha: ${context.ancestorTitles.join(' > ') || 'None'}
Các nhánh anh em hiện có (tránh trùng lặp): ${context.existingSiblingTitles.join(', ') || 'None'}
Mẫu định hướng: ${context.preset}
Chỉ dẫn bổ sung: ${context.customInstruction || 'None'}
Ngôn ngữ phản hồi: ${context.language === 'en' ? 'English' : 'Tiếng Việt'}

BẮT BUỘC trả về định dạng JSON thuần túy theo schema:
{
  "candidates": [
    { "title": "Tiêu đề nhánh ngắn gọn", "description": "Giải thích tóm tắt" }
  ]
}`;

      try {
        const url = new URL(apiEndpoint);
        if (apiKey) {
          url.searchParams.set('key', apiKey);
        }

        const response = await fetchFn(url.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
            },
          }),
          signal,
        });

        if (!response.ok) {
          return {
            ok: false,
            candidates: [],
            error: {
              code: 'API_ERROR',
              message: `Lỗi kết nối Gemini API (${response.status}: ${response.statusText}).`,
            },
          };
        }

        const data = await response.json();
        const textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Check if structured payload is returned
        try {
          let cleanStr = textResponse.trim();
          if (cleanStr.includes('```')) {
            const match = cleanStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (match && match[1]) cleanStr = match[1].trim();
          }
          const parsed = JSON.parse(cleanStr);
          if (parsed && typeof parsed === 'object') {
            const validation = validateAiProviderPayload(parsed);
            if (!validation.valid) {
              return {
                ok: false,
                candidates: [],
                rawText: textResponse,
                error: {
                  code: 'VALIDATION_ERROR',
                  message: `Phản hồi từ AI không đúng cấu trúc: ${validation.errors.join(', ')}`,
                },
              };
            }
          }
        } catch {
          // If not JSON, proceed to normalizeAiResponse for fallback parsing
        }

        return normalizeAiResponse(textResponse, context);
      } catch (err: any) {
        if (signal?.aborted || err?.name === 'AbortError') {
          return {
            ok: false,
            candidates: [],
            error: {
              code: 'CANCELLED',
              message: 'Đã dừng quá trình tạo gợi ý.',
            },
          };
        }
        return {
          ok: false,
          candidates: [],
          error: {
            code: 'NETWORK_ERROR',
            message: err?.message || 'Lỗi mạng khi kết nối tới dịch vụ AI.',
          },
        };
      }
    },
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
