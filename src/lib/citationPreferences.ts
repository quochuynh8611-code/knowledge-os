export type CitationFormat =
  | 'apa'
  | 'mla'
  | 'chicago'
  | 'ieee'
  | 'harvard'
  | 'bibtex'
  | 'ris'
  | 'markdown';

export const CITATION_FORMAT_STORAGE_KEY = 'knowledge_os_citation_format_pref';
export const DEFAULT_CITATION_FORMAT: CitationFormat = 'apa';

export const ALL_CITATION_FORMATS: readonly CitationFormat[] = [
  'apa',
  'mla',
  'chicago',
  'ieee',
  'harvard',
  'bibtex',
  'ris',
  'markdown',
] as const;

/**
 * Kiểm tra giá trị có phải là định dạng trích dẫn hợp lệ hay không
 */
export function isValidCitationFormat(val: unknown): val is CitationFormat {
  return typeof val === 'string' && (ALL_CITATION_FORMATS as readonly string[]).includes(val);
}

/**
 * Đọc tùy chọn định dạng trích dẫn từ LocalStorage
 * Tự động fallback về 'apa' nếu rỗng hoặc không hợp lệ
 */
export function getStoredCitationFormat(): CitationFormat {
  try {
    if (typeof localStorage === 'undefined') {
      return DEFAULT_CITATION_FORMAT;
    }
    const stored = localStorage.getItem(CITATION_FORMAT_STORAGE_KEY);
    if (isValidCitationFormat(stored)) {
      return stored;
    }
    return DEFAULT_CITATION_FORMAT;
  } catch {
    return DEFAULT_CITATION_FORMAT;
  }
}

/**
 * Lưu tùy chọn định dạng trích dẫn vào LocalStorage
 */
export function setStoredCitationFormat(format: CitationFormat): void {
  try {
    if (typeof localStorage === 'undefined') return;
    if (isValidCitationFormat(format)) {
      localStorage.setItem(CITATION_FORMAT_STORAGE_KEY, format);
    }
  } catch {
    // Silent fail safely
  }
}

/**
 * Xóa tùy chọn định dạng trích dẫn đã lưu, trả về mặc định
 */
export function resetStoredCitationFormat(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(CITATION_FORMAT_STORAGE_KEY);
  } catch {
    // Silent fail safely
  }
}
