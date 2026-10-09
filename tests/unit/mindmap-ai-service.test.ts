/**
 * Unit Test Suite: Mind Map AI Node Expansion Service & Normalization (Phase P3)
 *
 * Verifies:
 * 1. normalizeTitleForComparison: whitespace collapsing, lowercase, trim.
 * 2. normalizeAiResponse:
 *    - JSON schema primary contract parsing (standard JSON, markdown code block JSON).
 *    - Markdown bullet list fallback parsing (- item, * item, 1. item, prefix number strip).
 *    - Duplicate detection against existingSiblingTitles (isSuspectedDuplicate = true, selected = false).
 *    - Flat-only enforcement (nested children flattened into direct items).
 *    - Empty input and syntax error handling (EMPTY_RESULT, PARSE_ERROR).
 * 3. MockMindMapAiClient: deterministic response, error simulation, AbortSignal handling.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  normalizeTitleForComparison,
  normalizeAiResponse,
  createMockMindMapAiClient,
  validateAiProviderPayload,
  createGeminiMindMapAiClient,
  type AiExpansionContext,
} from '../../src/lib/mindmapAiService';

describe('Mind Map AI Node Expansion Service (Phase P3)', () => {
  describe('1. normalizeTitleForComparison', () => {
    it('collapses multiple whitespace characters, trims, and converts to lowercase', () => {
      expect(normalizeTitleForComparison('  Chánh   Kiến  ')).toBe('chánh kiến');
      expect(normalizeTitleForComparison('\n\tSinh   Lão   Bệnh  Tử\t')).toBe('sinh lão bệnh tử');
      expect(normalizeTitleForComparison('')).toBe('');
      expect(normalizeTitleForComparison('   ')).toBe('');
    });
  });

  describe('2. normalizeAiResponse (Primary JSON Schema & Fallback Parsers)', () => {
    const sampleContext: AiExpansionContext = {
      targetNodeId: 'node-target-1',
      targetNodeTitle: 'Tứ Chánh Cần',
      rootTopicTitle: 'Phật Học Căn Bản',
      ancestorTitles: ['Phật Học Căn Bản', 'Ba Mươi Bảy Phẩm Trợ Đạo'],
      existingSiblingTitles: ['Chánh Tinh Tấn', 'Tứ Niệm Xứ'],
      preset: 'sub_components',
      language: 'vi',
    };

    it('Scenario 2.1: parses valid structured JSON primary payload accurately', () => {
      const validJson = JSON.stringify({
        candidates: [
          { title: 'Ngăn ngừa điều ác chưa sinh', description: 'Tinh tấn phòng hộ' },
          { title: 'Đoạn trừ điều ác đã sinh', description: 'Tinh tấn từ bỏ' },
          { title: 'Phát khởi điều thiện chưa sinh', description: 'Tinh tấn tu tập' },
          { title: 'Tăng trưởng điều thiện đã sinh', description: 'Tinh tấn viên mãn' },
        ],
      });

      const result = normalizeAiResponse(validJson, sampleContext);

      expect(result.ok).toBe(true);
      expect(result.isFallbackParsed).toBe(false);
      expect(result.candidates).toHaveLength(4);
      expect(result.candidates[0].title).toBe('Ngăn ngừa điều ác chưa sinh');
      expect(result.candidates[0].description).toBe('Tinh tấn phòng hộ');
      expect(result.candidates[0].selected).toBe(true);
      expect(result.candidates[0].isSuspectedDuplicate).toBe(false);
    });

    it('Scenario 2.2: extracts JSON payload wrapped inside Markdown code blocks', () => {
      const wrappedJson = '```json\n{\n  "candidates": [\n    { "title": "Khổ khổ" },\n    { "title": "Hoại khổ" }\n  ]\n}\n```';

      const result = normalizeAiResponse(wrappedJson, sampleContext);

      expect(result.ok).toBe(true);
      expect(result.isFallbackParsed).toBe(false);
      expect(result.candidates).toHaveLength(2);
      expect(result.candidates[0].title).toBe('Khổ khổ');
      expect(result.candidates[1].title).toBe('Hoại khổ');
    });

    it('Scenario 2.3: triggers Markdown fallback parser when response is bullet points list', () => {
      const markdownList = `
        Dưới đây là các nhánh đề xuất:
        - 1. Sắc uẩn (Vật chất)
        * 2. Thọ uẩn (Cảm thọ)
        - 3. Tưởng uẩn (Tri giác)
        - 4. Hành uẩn (Tâm hành)
        * 5. Thức uẩn (Nhận thức)
      `;

      const result = normalizeAiResponse(markdownList, sampleContext);

      expect(result.ok).toBe(true);
      expect(result.isFallbackParsed).toBe(true);
      expect(result.candidates).toHaveLength(5);
      expect(result.candidates[0].title).toBe('Sắc uẩn (Vật chất)');
      expect(result.candidates[1].title).toBe('Thọ uẩn (Cảm thọ)');
      expect(result.candidates[4].title).toBe('Thức uẩn (Nhận thức)');
    });

    it('Scenario 2.4: detects duplicates against existing siblings, marks soft warning and unchecks by default', () => {
      const jsonWithDuplicate = JSON.stringify({
        candidates: [
          { title: '  chánh   tinh tấn  ' }, // Matches existing sibling "Chánh Tinh Tấn"
          { title: 'Tứ Như Ý Túc' },
          { title: 'Ngũ Căn' },
        ],
      });

      const result = normalizeAiResponse(jsonWithDuplicate, sampleContext);

      expect(result.ok).toBe(true);
      expect(result.candidates).toHaveLength(3);

      const duplicateItem = result.candidates[0];
      expect(duplicateItem.isSuspectedDuplicate).toBe(true);
      expect(duplicateItem.selected).toBe(false); // Unchecked by default!

      const freshItem = result.candidates[1];
      expect(freshItem.isSuspectedDuplicate).toBe(false);
      expect(freshItem.selected).toBe(true);
    });

    it('Scenario 2.5: flattens nested children if AI returns hierarchical structure (flat-only merge rule)', () => {
      const nestedJson = JSON.stringify({
        candidates: [
          {
            title: 'Khổ Đế Căn Bản',
            children: [{ title: 'Sinh' }, { title: 'Lão' }],
          },
          { title: 'Tập Đế Căn Bản' },
        ],
      });

      const result = normalizeAiResponse(nestedJson, sampleContext);

      expect(result.ok).toBe(true);
      expect(result.candidates).toHaveLength(2);
      expect(result.candidates[0].title).toBe('Khổ Đế Căn Bản');
      expect(result.candidates[1].title).toBe('Tập Đế Căn Bản');
    });

    it('Scenario 2.6: returns EMPTY_RESULT on empty or whitespace response', () => {
      const result = normalizeAiResponse('   \n  \t  ', sampleContext);
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('EMPTY_RESULT');
      expect(result.candidates).toHaveLength(0);
    });

    it('Scenario 2.7: returns PARSE_ERROR when both JSON and markdown fallback fail', () => {
      const gibberish = 'Xin chào, tôi là AI! Bạn khỏe không? Không có nhánh nào ở đây cả.';
      const result = normalizeAiResponse(gibberish, sampleContext);
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('PARSE_ERROR');
    });
  });

  describe('3. MockMindMapAiClient', () => {
    it('generates deterministic candidate nodes on success', async () => {
      const client = createMockMindMapAiClient();
      const res = await client.generateNodeExpansion({
        targetNodeId: 'node-1',
        targetNodeTitle: 'Bát Chánh Đạo',
        rootTopicTitle: 'Tứ Diệu Đế',
        ancestorTitles: ['Tứ Diệu Đế'],
        existingSiblingTitles: [],
        preset: 'sub_components',
        language: 'vi',
      });

      expect(res.ok).toBe(true);
      expect(res.candidates.length).toBeGreaterThan(0);
      expect(res.candidates[0].title).toBeDefined();
    });

    it('handles AbortSignal cancellation gracefully with CANCELLED code', async () => {
      const client = createMockMindMapAiClient({ artificialDelayMs: 50 });
      const controller = new AbortController();

      // Cancel immediately
      controller.abort();

      const res = await client.generateNodeExpansion(
        {
          targetNodeId: 'node-1',
          targetNodeTitle: 'Bát Chánh Đạo',
          rootTopicTitle: 'Tứ Diệu Đế',
          ancestorTitles: [],
          existingSiblingTitles: [],
          preset: 'sub_components',
          language: 'vi',
        },
        controller.signal
      );

      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe('CANCELLED');
    });
  });

  describe('4. validateAiProviderPayload (Phase P3.x Hardening)', () => {
    it('accepts valid structured provider payload', () => {
      const validPayload = {
        candidates: [
          { title: 'Chánh Kiến', description: 'Hiểu biết đúng đắn', nodeType: 'topic' },
          { title: 'Chánh Tư Duy', nodeType: 'topic' },
        ],
      };

      const res = validateAiProviderPayload(validPayload);
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
      expect(res.data?.candidates).toHaveLength(2);
    });

    it('rejects payload when candidates is missing or not an array', () => {
      expect(validateAiProviderPayload(null).valid).toBe(false);
      expect(validateAiProviderPayload({}).valid).toBe(false);
      expect(validateAiProviderPayload({ candidates: 'not-an-array' }).valid).toBe(false);
    });

    it('rejects structured payload when candidates have empty or non-string titles', () => {
      const invalidPayload = {
        candidates: [
          { title: '' },
          { title: '   ' },
          { description: 'No title' },
        ],
      };

      const res = validateAiProviderPayload(invalidPayload);
      expect(res.valid).toBe(false);
      expect(res.errors.length).toBeGreaterThan(0);
    });

    it('rejects structured payload with empty candidates array', () => {
      const res = validateAiProviderPayload({ candidates: [] });
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Candidates array cannot be empty');
    });

    it('rejects structured payload when candidate has invalid nodeType', () => {
      const res = validateAiProviderPayload({
        candidates: [{ title: 'Hợp lệ', nodeType: 'invalid-type' }],
      });
      expect(res.valid).toBe(false);
      expect(res.errors.length).toBeGreaterThan(0);
    });
  });

  describe('5. createGeminiMindMapAiClient (Phase P3.x Hardening)', () => {
    const sampleContext: AiExpansionContext = {
      targetNodeId: 'node-target-1',
      targetNodeTitle: 'Bát Chánh Đạo',
      rootTopicTitle: 'Tứ Diệu Đế',
      ancestorTitles: ['Tứ Diệu Đế'],
      existingSiblingTitles: [],
      preset: 'sub_components',
      language: 'vi',
    };

    it('calls custom fetcher and parses valid structured Gemini JSON response successfully', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      candidates: [
                        { title: 'Chánh Kiến', description: 'Hiểu biết như thật' },
                        { title: 'Chánh Tư Duy', description: 'Suy nghĩ chân chính' },
                      ],
                    }),
                  },
                ],
              },
            },
          ],
        }),
      });

      const client = createGeminiMindMapAiClient({
        apiKey: 'test-api-key',
        customFetch: mockFetch,
      });

      const res = await client.generateNodeExpansion(sampleContext);
      expect(res.ok).toBe(true);
      expect(res.candidates).toHaveLength(2);
      expect(res.candidates[0].title).toBe('Chánh Kiến');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('returns VALIDATION_ERROR when structured Gemini response fails schema validation', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    // Structured JSON with empty candidates array -> schema-invalid!
                    text: JSON.stringify({
                      candidates: [],
                    }),
                  },
                ],
              },
            },
          ],
        }),
      });

      const client = createGeminiMindMapAiClient({
        apiKey: 'test-api-key',
        customFetch: mockFetch,
      });

      const res = await client.generateNodeExpansion(sampleContext);
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe('VALIDATION_ERROR');
    });

    it('returns CANCELLED when AbortSignal is aborted during request', async () => {
      const controller = new AbortController();
      controller.abort();

      const mockFetch = vi.fn();
      const client = createGeminiMindMapAiClient({
        apiKey: 'test-api-key',
        customFetch: mockFetch,
      });

      const res = await client.generateNodeExpansion(sampleContext, controller.signal);
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe('CANCELLED');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('handles HTTP error responses safely with API_ERROR code', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        text: async () => 'Rate limit exceeded',
      });

      const client = createGeminiMindMapAiClient({
        apiKey: 'test-api-key',
        customFetch: mockFetch,
      });

      const res = await client.generateNodeExpansion(sampleContext);
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe('API_ERROR');
    });
  });
});
