import { Resource, ResourceType } from '../types';

export interface DoiLookupResult {
  status: 'success' | 'not_found' | 'invalid_doi' | 'network_error';
  data?: Partial<Resource>;
  error?: string;
}

/**
 * Trích xuất và chuẩn hóa chuỗi DOI từ văn bản thô hoặc URL
 * Ví dụ: "https://doi.org/10.1016/j.jair.2024.01.005/" -> "10.1016/j.jair.2024.01.005"
 */
export function normalizeDoi(input: string | undefined | null): string | null {
  if (!input || typeof input !== 'string') return null;

  const clean = input.trim();
  // Regex nhận diện chuẩn DOI quốc tế (bắt đầu bằng 10.xxxx/)
  const doiRegex = /\b(10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+)\b/;
  const match = clean.match(doiRegex);

  if (!match) return null;

  let doi = match[1];
  // Xóa dấu gạch chéo hoặc dấu câu ở cuối nếu có
  doi = doi.replace(/[/.,;:]+$/, '');
  return doi;
}

/**
 * Tra cứu siêu dữ liệu bài báo từ CrossRef REST API
 * Tuân thủ Hermetic Test Guard qua dependency injection `fetchImpl`
 */
export function lookupDoiMetadata(
  rawDoi: string,
  fetchImpl?: typeof fetch
): Promise<DoiLookupResult> {
  const activeFetch = fetchImpl || globalThis.fetch;
  const doi = normalizeDoi(rawDoi);
  if (!doi) {
    return Promise.resolve({
      status: 'invalid_doi',
      error: 'Cú pháp mã DOI không hợp lệ. Vui lòng nhập định dạng chuẩn (ví dụ: 10.1016/j.jair.2024.01.005).',
    });
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), 8000) : null;

  const endpoint = `https://api.crossref.org/works/${encodeURIComponent(doi)}`;

  return activeFetch(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'User-Agent': 'KnowledgeOS-AcademicStation/1.0 (mailto:academic-support@knowledge-os.org)',
    },
    signal: controller?.signal,
  })
    .then(async (response) => {
      if (timeoutId) clearTimeout(timeoutId);

      if (response.status === 404) {
        return {
          status: 'not_found' as const,
          error: `Không tìm thấy tài liệu với mã DOI: ${doi} trên cơ sở dữ liệu CrossRef.`,
        };
      }

      if (!response.ok) {
        return {
          status: 'network_error' as const,
          error: `Máy chủ CrossRef phản hồi mã lỗi HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const json = await response.json();
      const message = json?.message;

      if (!message || typeof message !== 'object') {
        return {
          status: 'not_found' as const,
          error: 'Phản hồi từ CrossRef không chứa cấu trúc thông tin bài báo hợp lệ.',
        };
      }

      // 1. Tiêu đề bài báo
      const title = Array.isArray(message.title) && message.title.length > 0
        ? message.title[0]
        : 'Tài liệu không tiêu đề';

      // 2. Danh sách tác giả
      let authorStr: string | undefined;
      if (Array.isArray(message.author) && message.author.length > 0) {
        const authorList = message.author.map((au: any) => {
          if (au.family && au.given) return `${au.family}, ${au.given}`;
          return au.name || au.family || au.given || '';
        }).filter(Boolean);
        if (authorList.length > 0) {
          authorStr = authorList.join(' and ');
        }
      }

      // 3. Tạp chí / Hội thảo
      const journal = Array.isArray(message['container-title']) && message['container-title'].length > 0
        ? message['container-title'][0]
        : undefined;

      // 4. Năm xuất bản
      let year: string | undefined;
      const published = message.issued || message.published || message['published-print'] || message['published-online'] || message.created;
      const dateParts = published?.['date-parts']?.[0];
      if (Array.isArray(dateParts) && dateParts.length > 0) {
        year = dateParts[0].toString();
      }

      // 5. Volume, Issue, Pages
      const volume = message.volume?.toString();
      const issue = (message.issue || message['journal-issue']?.issue)?.toString();
      const pages = message.page?.toString()?.replace(/\s+/g, '');

      // 6. Phân loại loại tài liệu
      let type: ResourceType = 'article';
      const crossrefType = (message.type || '').toLowerCase();
      if (crossrefType.includes('book') || crossrefType.includes('monograph')) {
        type = 'book';
      }

      // 7. URL và Publisher
      const publisher = message.publisher?.toString()?.trim() || undefined;
      const url = message.URL?.toString()?.trim() || `https://doi.org/${doi}`;

      const resourceData: Partial<Resource> = {
        title,
        author: authorStr,
        journal,
        year,
        volume,
        issue,
        pages,
        doi,
        url,
        publisher,
        type,
      };

      return {
        status: 'success' as const,
        data: resourceData,
      };
    })
    .catch((err: any) => {
      if (timeoutId) clearTimeout(timeoutId);
      const isTimeout = err?.name === 'AbortError';
      return {
        status: 'network_error' as const,
        error: isTimeout
          ? 'Quá thời gian kết nối tới CrossRef API (Timeout 8s). Vui lòng thử lại.'
          : (err?.message || 'Lỗi mạng khi tra cứu mã DOI.'),
      };
    });
}
