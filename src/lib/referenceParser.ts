import { Resource, ResourceType } from '../types';
import { normalizeDoi } from './doiResolver';
import { extractAcademicMetadataFromResource } from './citationGenerator';

export interface DeduplicationResult {
  unique: Partial<Resource>[];
  duplicates: {
    candidate: Partial<Resource>;
    existing: Resource;
    reason: string;
  }[];
}

/**
 * Loại bỏ các ký tự bọc LaTeX, dấu ngoặc nhọn hoặc ký tự thoát
 */
function cleanLatexValue(val: string): string {
  if (!val) return '';
  return val
    .replace(/^["{]+|["}]+$/g, '') // Bỏ ngoặc/nháy ngoài cùng
    .replace(/--/g, '-') // Chuẩn hóa dải trang 5998--6008 -> 5998-6008
    .replace(/\\([#$&_%{}])/g, '$1') // Bỏ escape LaTeX
    .replace(/\{([^{}]+)\}/g, '$1') // Bỏ ngoặc nhọn bên trong
    .trim();
}

/**
 * Phân tích cú pháp tệp BibTeX (.bib) thành danh sách Resource
 */
export function parseBibTeXReferences(content: string): Partial<Resource>[] {
  const resources: Partial<Resource>[] = [];
  if (!content || !content.trim()) return resources;

  // Tách từng entry @type{key, ...}
  const entryRegex = /@([a-zA-Z]+)\s*\{\s*([^,]+),([\s\S]*?)(?=\n\s*@|\n*$)/g;
  let match: RegExpExecArray | null;

  while ((match = entryRegex.exec(content)) !== null) {
    const rawType = match[1].toLowerCase();
    const body = match[3];

    let resourceType: ResourceType = 'article';
    if (rawType === 'book' || rawType === 'booklet' || rawType === 'manual') {
      resourceType = 'book';
    } else if (rawType === 'phdthesis' || rawType === 'mastersthesis' || rawType === 'techreport') {
      resourceType = 'pdf';
    }

    // Phân tích các trường key = {value} hoặc key = "value" hoặc key = value
    const fieldMap: Record<string, string> = {};
    const fieldRegex = /([a-zA-Z_]+)\s*=\s*(?:\{([\s\S]*?)\}|"([\s\S]*?)"|([^\s,}]+))/g;
    let fieldMatch: RegExpExecArray | null;

    while ((fieldMatch = fieldRegex.exec(body)) !== null) {
      const fieldKey = fieldMatch[1].toLowerCase();
      const rawVal = fieldMatch[2] ?? fieldMatch[3] ?? fieldMatch[4] ?? '';
      fieldMap[fieldKey] = cleanLatexValue(rawVal);
    }

    const title = fieldMap.title || 'Tài liệu không tiêu đề';
    const author = fieldMap.author ? cleanLatexValue(fieldMap.author) : undefined;
    const year = fieldMap.year || undefined;
    const journal = fieldMap.journal || fieldMap.booktitle || undefined;
    const publisher = fieldMap.publisher || undefined;
    const volume = fieldMap.volume || undefined;
    const issue = fieldMap.number || fieldMap.issue || undefined;
    const pages = fieldMap.pages ? fieldMap.pages.replace(/\s+/g, '') : undefined;
    const doi = fieldMap.doi ? normalizeDoi(fieldMap.doi) || fieldMap.doi : undefined;
    const isbn = fieldMap.isbn || undefined;
    const url = fieldMap.url || (doi ? `https://doi.org/${doi}` : undefined);

    resources.push({
      type: resourceType,
      title,
      author,
      year,
      journal,
      publisher,
      volume,
      issue,
      pages,
      doi,
      isbn,
      url,
    });
  }

  return resources;
}

/**
 * Phân tích cú pháp tệp RIS (Research Information Systems)
 */
export function parseRISReferences(content: string): Partial<Resource>[] {
  const resources: Partial<Resource>[] = [];
  if (!content || !content.trim()) return resources;

  // Chuẩn hóa dòng
  const lines = content.split(/\r?\n/);
  let currentRecord: Record<string, string[]> = {};
  let inRecord = false;

  const flushRecord = () => {
    if (!currentRecord.TY || currentRecord.TY.length === 0) return;

    const ty = currentRecord.TY[0].toUpperCase();
    let resourceType: ResourceType = 'article';
    if (ty === 'BOOK' || ty === 'CHAP') {
      resourceType = 'book';
    }

    const title = (currentRecord.TI?.[0] || currentRecord.T1?.[0] || 'Tài liệu không tiêu đề').trim();
    const authors = currentRecord.AU || currentRecord.A1 || [];
    const authorStr = authors.length > 0 ? authors.join('; ') : undefined;

    const journal = (currentRecord.JO?.[0] || currentRecord.JF?.[0] || currentRecord.JA?.[0])?.trim();
    const py = currentRecord.PY?.[0] || currentRecord.Y1?.[0];
    const yearMatch = py ? py.match(/\b((?:18|19|20)\d{2})\b/) : null;
    const year = yearMatch ? yearMatch[1] : py?.trim();

    const volume = currentRecord.VL?.[0]?.trim();
    const issue = currentRecord.IS?.[0]?.trim();

    const sp = currentRecord.SP?.[0]?.trim();
    const ep = currentRecord.EP?.[0]?.trim();
    let pages: string | undefined;
    if (sp && ep) pages = `${sp}-${ep}`;
    else if (sp) pages = sp;

    const rawDoi = currentRecord.DO?.[0]?.trim();
    const doi = rawDoi ? normalizeDoi(rawDoi) || rawDoi : undefined;
    const url = currentRecord.UR?.[0]?.trim() || (doi ? `https://doi.org/${doi}` : undefined);
    const publisher = currentRecord.PB?.[0]?.trim();
    const isbn = currentRecord.SN?.[0]?.trim();

    resources.push({
      type: resourceType,
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
      isbn,
    });
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const tagMatch = trimmed.match(/^([A-Z0-9]{2})\s*-\s*(.*)$/);
    if (tagMatch) {
      const tag = tagMatch[1].toUpperCase();
      const val = tagMatch[2].trim();

      if (tag === 'TY') {
        if (inRecord) flushRecord();
        currentRecord = { TY: [val] };
        inRecord = true;
        continue;
      }

      if (tag === 'ER') {
        if (inRecord) {
          flushRecord();
          currentRecord = {};
          inRecord = false;
        }
        continue;
      }

      if (inRecord) {
        if (!currentRecord[tag]) currentRecord[tag] = [];
        currentRecord[tag].push(val);
      }
    }
  }

  if (inRecord) {
    flushRecord();
  }

  return resources;
}

/**
 * Phân tích cú pháp định dạng Zotero CSL-JSON
 */
export function parseCSLJsonReferences(content: string): Partial<Resource>[] {
  const resources: Partial<Resource>[] = [];
  if (!content || !content.trim()) return resources;

  let jsonItems: any[] = [];
  try {
    const parsed = JSON.parse(content);
    jsonItems = Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return resources;
  }

  for (const item of jsonItems) {
    if (!item || typeof item !== 'object') continue;

    let resourceType: ResourceType = 'article';
    const cslType = (item.type || '').toLowerCase();
    if (cslType === 'book' || cslType === 'chapter') {
      resourceType = 'book';
    }

    const title = (item.title || item['title-short'] || 'Tài liệu không tiêu đề').toString().trim();

    // Tác giả CSL [{ family: 'Gao', given: 'Chen' }] -> 'Gao, Chen and Wang, Xiang'
    let author: string | undefined;
    if (Array.isArray(item.author) && item.author.length > 0) {
      const authorList = item.author.map((au: any) => {
        if (au.literal) return au.literal;
        if (au.family && au.given) return `${au.family}, ${au.given}`;
        return au.family || au.given || '';
      }).filter(Boolean);
      if (authorList.length > 0) {
        author = authorList.join(' and ');
      }
    }

    const journal = (item['container-title'] || item['collection-title'] || '').toString().trim() || undefined;

    let year: string | undefined;
    const dateParts = item.issued?.['date-parts']?.[0];
    if (Array.isArray(dateParts) && dateParts.length > 0) {
      year = dateParts[0].toString();
    } else if (item.issued?.raw) {
      const ym = item.issued.raw.toString().match(/\b((?:18|19|20)\d{2})\b/);
      if (ym) year = ym[1];
    }

    const volume = item.volume?.toString();
    const issue = (item.issue || item.number)?.toString();
    const pages = (item.page || item.pages)?.toString().replace(/\s+/g, '');
    const rawDoi = item.DOI?.toString().trim();
    const doi = rawDoi ? normalizeDoi(rawDoi) || rawDoi : undefined;
    const url = item.URL?.toString().trim() || (doi ? `https://doi.org/${doi}` : undefined);
    const publisher = item.publisher?.toString().trim() || undefined;
    const isbn = item.ISBN?.toString().trim() || undefined;

    resources.push({
      type: resourceType,
      title,
      author,
      journal,
      year,
      volume,
      issue,
      pages,
      doi,
      url,
      publisher,
      isbn,
    });
  }

  return resources;
}

/**
 * Tự động nhận diện định dạng (BibTeX, RIS, CSL-JSON) và phân tích cú pháp
 */
export function parseUniversalReferences(content: string, filenameHint?: string): Partial<Resource>[] {
  const trimmed = content.trim();
  const lowerHint = (filenameHint || '').toLowerCase();

  // 1. Phán đoán qua phần mở rộng file nếu có
  if (lowerHint.endsWith('.bib') || lowerHint.endsWith('.bibtex')) {
    return parseBibTeXReferences(content);
  }
  if (lowerHint.endsWith('.ris')) {
    return parseRISReferences(content);
  }
  if (lowerHint.endsWith('.json')) {
    return parseCSLJsonReferences(content);
  }

  // 2. Phán đoán qua nội dung đặc trưng
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    const jsonRes = parseCSLJsonReferences(content);
    if (jsonRes.length > 0) return jsonRes;
  }

  if (/@([a-zA-Z]+)\s*\{/i.test(trimmed)) {
    return parseBibTeXReferences(content);
  }

  if (/TY\s*-\s*[A-Z]+/i.test(trimmed)) {
    return parseRISReferences(content);
  }

  return [];
}

/**
 * Khử trùng lặp danh sách tài liệu chuẩn bị nhập với thư viện hiện hữu
 */
export function deduplicateImportedResources(
  candidates: Partial<Resource>[],
  existing: Resource[]
): DeduplicationResult {
  const normalizeText = (s: string | undefined): string => {
    if (!s) return '';
    return s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  };

  // Lập chỉ mục thư viện hiện hữu theo DOI và Title+Author
  const doiIndex = new Map<string, Resource>();
  const titleAuthorIndex = new Map<string, Resource>();

  for (const item of existing) {
    const rawDoi = item.doi || extractAcademicMetadataFromResource(item).doi;
    if (rawDoi) {
      const normDoi = normalizeDoi(rawDoi);
      if (normDoi) doiIndex.set(normDoi.toLowerCase(), item);
    }

    const normTitle = normalizeText(item.title);
    const normAuthor = normalizeText(item.author);
    if (normTitle) {
      titleAuthorIndex.set(`${normTitle}::${normAuthor}`, item);
    }
  }

  const unique: Partial<Resource>[] = [];
  const duplicates: DeduplicationResult['duplicates'] = [];

  // Lập chỉ mục cục bộ trong mẻ nhập để phát hiện trùng lặp chéo trong cùng batch
  const batchSeenDois = new Set<string>();
  const batchSeenTitleAuthors = new Set<string>();

  for (const candidate of candidates) {
    const candDoi = candidate.doi ? normalizeDoi(candidate.doi)?.toLowerCase() : null;
    const candTitle = normalizeText(candidate.title);
    const candAuthor = normalizeText(candidate.author);
    const candTitleAuthorKey = `${candTitle}::${candAuthor}`;

    // Kiểm tra trùng DOI với DB
    if (candDoi && doiIndex.has(candDoi)) {
      duplicates.push({
        candidate,
        existing: doiIndex.get(candDoi)!,
        reason: `Trùng mã định danh DOI: ${candDoi}`,
      });
      continue;
    }

    // Kiểm tra trùng DOI trong cùng batch
    if (candDoi && batchSeenDois.has(candDoi)) {
      duplicates.push({
        candidate,
        existing: { title: candidate.title || '', id: '', topicId: '', type: 'article', createdAt: '' },
        reason: `Trùng mã định danh DOI trong cùng tệp nhập: ${candDoi}`,
      });
      continue;
    }

    // Kiểm tra trùng Tiêu đề + Tác giả với DB
    if (candTitle && titleAuthorIndex.has(candTitleAuthorKey)) {
      duplicates.push({
        candidate,
        existing: titleAuthorIndex.get(candTitleAuthorKey)!,
        reason: `Trùng tiêu đề và tác giả với tài liệu trong thư viện`,
      });
      continue;
    }

    // Kiểm tra trùng Tiêu đề + Tác giả trong cùng batch
    if (candTitle && batchSeenTitleAuthors.has(candTitleAuthorKey)) {
      duplicates.push({
        candidate,
        existing: { title: candidate.title || '', id: '', topicId: '', type: 'article', createdAt: '' },
        reason: `Trùng tiêu đề và tác giả trong cùng tệp nhập`,
      });
      continue;
    }

    if (candDoi) batchSeenDois.add(candDoi);
    if (candTitle) batchSeenTitleAuthors.add(candTitleAuthorKey);
    unique.push(candidate);
  }

  return { unique, duplicates };
}
