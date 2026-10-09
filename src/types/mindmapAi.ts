/**
 * Mind Map AI Node Expansion Types & Contracts (Phase P3)
 *
 * Local-first schema; không làm thay đổi DataContext theo observable contract;
 * blast radius thấp, bounded trong Mind Map context.
 */

import { GraphNodeType } from '../lib/knowledgeGraph';

/**
 * Các mẫu yêu cầu mở rộng có sẵn
 */
export type AiExpansionPreset =
  | 'sub_components'    // Phân tích chi tiết thành phần con
  | 'dimensions'        // Phân tích các chiều hướng/khía cạnh
  | 'inquiry_questions' // Đặt các câu hỏi tư duy đào sâu
  | 'custom';           // Yêu cầu tùy chỉnh do người dùng nhập

/**
 * Ngữ cảnh gửi tới AI để sinh gợi ý chính xác
 */
export interface AiExpansionContext {
  targetNodeId: string;
  targetNodeTitle: string;
  rootTopicTitle: string;
  ancestorTitles: string[];        // Đường dẫn từ gốc đến node hiện tại
  existingSiblingTitles: string[];  // Các nhánh cùng cấp hiện có để chống trùng
  preset: AiExpansionPreset;
  customInstruction?: string;
  maxCandidates?: number;          // Mặc định: 4 - 6
  language?: 'vi' | 'en';          // Mặc định 'vi', tự chuyển 'en' nếu ngữ cảnh là tiếng Anh
}

/**
 * JSON Schema chuẩn yêu cầu AI trả về (Primary Output Contract)
 */
export interface AiExpansionJsonPayload {
  candidates: Array<{
    title: string;
    description?: string;
    nodeType?: 'topic' | 'note';
    children?: Array<{ title: string }>;
  }>;
}

/**
 * Node ứng viên đã qua bước chuẩn hóa (Normalized Candidate)
 */
export interface AiCandidateNode {
  id: string;                      // ID tạm thời (vd: temp-ai-1)
  title: string;                   // Tiêu đề gợi ý (được phép sửa trên modal)
  description?: string;            // Ghi chú phụ
  nodeType: GraphNodeType;         // 'topic' | 'note'
  selected: boolean;               // Checkbox chọn chèn (mặc định true trừ khi nghi trùng)
  isSuspectedDuplicate?: boolean;  // Cảnh báo trùng với sibling hiện có
}

/**
 * Kết quả trả về của AI Service
 */
export interface AiExpansionServiceResult {
  ok: boolean;
  candidates: AiCandidateNode[];
  rawText?: string;
  isFallbackParsed?: boolean;      // Đánh dấu nếu phải dùng parser fallback
  error?: {
    code: 'API_ERROR' | 'NETWORK_ERROR' | 'PARSE_ERROR' | 'CANCELLED' | 'EMPTY_RESULT' | 'VALIDATION_ERROR';
    message: string;
  };
}

/**
 * Kết quả xác thực payload từ AI Provider
 */
export interface AiProviderValidationResult {
  valid: boolean;
  errors: string[];
  data?: AiExpansionJsonPayload;
}

/**
 * Options cấu hình cho Gemini AI Client
 */
export interface GeminiAiClientOptions {
  apiKey?: string;
  apiEndpoint?: string;
  model?: string;
  customFetch?: typeof fetch;
}

/**
 * Interface trừu tượng cho AI Client (Mockable)
 */
export interface MindMapAiClient {
  generateNodeExpansion(
    context: AiExpansionContext,
    signal?: AbortSignal
  ): Promise<AiExpansionServiceResult>;
}
