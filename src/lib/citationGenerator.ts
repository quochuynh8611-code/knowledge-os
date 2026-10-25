import { Resource, ResourceType } from '../types';
import { CitationFormat } from './citationPreferences';

export interface AcademicMetadata {
  doi?: string;
  year?: string;
  journal?: string;
  publisher?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  isbn?: string;
  cleanNotes?: string;
}

/**
 * Đóng gói siêu dữ liệu học thuật vào trường notes dưới dạng block ẩn
 */
export function embedAcademicMetadataInNotes(
  notes: string | undefined,
  meta: Omit<AcademicMetadata, 'cleanNotes'>
): string {
  const cleanNotes = (notes || '').replace(/<!--\s*academic-metadata:[\s\S]*?-->/g, '').trim();

  const filteredMeta: Record<string, string> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (v && typeof v === 'string' && v.trim()) {
      filteredMeta[k] = v.trim();
    }
  }

  if (Object.keys(filteredMeta).length === 0) {
    return cleanNotes;
  }

  const jsonStr = JSON.stringify(filteredMeta);
  const block = `<!-- academic-metadata: ${jsonStr} -->`;
  return cleanNotes ? `${cleanNotes}\n\n${block}` : block;
}

/**
 * Khôi phục siêu dữ liệu học thuật từ Resource (kết hợp trường trực tiếp và notes)
 */
export function extractAcademicMetadataFromResource(resource: Resource): AcademicMetadata {
  let embedded: Record<string, string> = {};
  let cleanNotes = resource.notes || '';

  if (resource.notes) {
    const match = resource.notes.match(/<!--\s*academic-metadata:\s*([\s\S]*?)\s*-->/);
    if (match) {
      try {
        embedded = JSON.parse(match[1]);
      } catch {
        embedded = {};
      }
      cleanNotes = resource.notes.replace(/<!--\s*academic-metadata:[\s\S]*?-->/g, '').trim();
    }
  }

  return {
    doi: resource.doi || embedded.doi,
    year: resource.year || embedded.year || extractResourceYear(resource),
    journal: resource.journal || embedded.journal,
    publisher: resource.publisher || embedded.publisher,
    volume: resource.volume || embedded.volume,
    issue: resource.issue || embedded.issue,
    pages: resource.pages || embedded.pages,
    isbn: resource.isbn || embedded.isbn,
    cleanNotes,
  };
}

/**
 * Trích xuất nhãn phân loại tiếng Việt cho từng loại tài liệu
 */
export function getResourceTypeLabel(type: ResourceType): string {
  switch (type) {
    case 'book':
      return '[Sách/Luận tạng]';
    case 'article':
      return '[Bài viết]';
    case 'pdf':
      return '[Tài liệu PDF]';
    case 'video':
      return '[Video bài giảng]';
    case 'audio':
      return '[Bản thu âm]';
    default:
      return '[Tài liệu tham khảo]';
  }
}

/**
 * Trích xuất năm xuất bản từ resource (ưu tiên trường year, sau đó đến notes, title hoặc createdAt)
 */
export function extractResourceYear(resource: Resource): string {
  if (resource.year && resource.year.trim()) {
    const clean = resource.year.trim().match(/\b((?:18|19|20)\d{2})\b/);
    if (clean) return clean[1];
    return resource.year.trim();
  }

  if (resource.notes) {
    const match = resource.notes.match(/\b((?:18|19|20)\d{2})\b/);
    if (match) return match[1];
  }

  if (resource.title) {
    const match = resource.title.match(/\b((?:18|19|20)\d{2})\b/);
    if (match) return match[1];
  }

  if (resource.author && resource.createdAt) {
    const date = new Date(resource.createdAt);
    if (!isNaN(date.getTime())) {
      return date.getFullYear().toString();
    }
  }

  return 'n.d.';
}

/**
 * Chuẩn hóa chuỗi thành slug ASCII không dấu, không khoảng trắng
 */
function toAsciiSlug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Sinh BibTeX Citation Key tất định
 */
export function generateBibTeXKey(resource: Resource, year: string): string {
  const authorSlug = resource.author
    ? toAsciiSlug(resource.author.split(' ')[0] || resource.author)
    : 'khuyetdanh';
  const mainTitle = resource.title.split('(')[0].trim();
  const titleSlug = toAsciiSlug(mainTitle).slice(0, 20) || 'tailieu';
  const yearSlug = year !== 'n.d.' ? year : 'nd';
  return `${authorSlug}_${yearSlug}_${titleSlug}`;
}

/**
 * Sinh trích dẫn theo chuẩn APA 7th Edition
 */
export function generateAPACitation(resource: Resource): string {
  const meta = extractAcademicMetadataFromResource(resource);
  const year = meta.year || extractResourceYear(resource);
  const typeLabel = getResourceTypeLabel(resource.type);

  const doiUrl = meta.doi ? `https://doi.org/${meta.doi}` : '';
  const source = doiUrl || resource.url || (resource.filePath ? `Tệp cục bộ: ${resource.filePath}` : '');

  const author = resource.author && resource.author.trim();
  const title = resource.title.trim();

  if (meta.journal) {
    const volIssue = meta.volume
      ? meta.issue
        ? `${meta.volume}(${meta.issue})`
        : meta.volume
      : '';
    const journalPart = [meta.journal, volIssue].filter(Boolean).join(', ');
    const pagesPart = meta.pages ? `, ${meta.pages}` : '';
    const tail = source ? ` ${source}` : '';
    if (author) {
      return `${author}. (${year}). ${title}. ${journalPart}${pagesPart}.${tail}`;
    }
    return `${title}. (${year}). ${journalPart}${pagesPart}.${tail}`;
  }

  if (meta.publisher) {
    const tail = source ? ` ${source}` : '';
    if (author) {
      return `${author}. (${year}). ${title}. ${meta.publisher}.${tail}`;
    }
    return `${title}. (${year}). ${meta.publisher}.${tail}`;
  }

  // Fallback chuẩn tương thích phiên bản cũ
  if (author) {
    return `${author}. (${year}). ${title}. ${typeLabel}.${source ? ` ${source}` : ''}`;
  }

  return `${title}. (${year}). ${typeLabel}.${source ? ` ${source}` : ''}`;
}

/**
 * Sinh trích dẫn theo chuẩn MLA 9th Edition
 */
export function generateMLACitation(resource: Resource): string {
  const meta = extractAcademicMetadataFromResource(resource);
  const year = meta.year || extractResourceYear(resource);
  const author = resource.author && resource.author.trim();
  const title = resource.title.trim();
  const authorPart = author ? `${author}.` : '';

  const doiUrl = meta.doi ? `https://doi.org/${meta.doi}` : (resource.url || '');

  if (meta.journal) {
    const vol = meta.volume ? `, vol. ${meta.volume}` : '';
    const iss = meta.issue ? `, no. ${meta.issue}` : '';
    const yr = `, ${year}`;
    const pg = meta.pages ? `, pp. ${meta.pages}` : '';
    const doiPart = doiUrl ? ` ${doiUrl}.` : '';
    return `${authorPart ? `${authorPart} ` : ''}"${title}." ${meta.journal}${vol}${iss}${yr}${pg}.${doiPart}`;
  }

  if (meta.publisher) {
    const doiPart = doiUrl ? ` ${doiUrl}.` : '';
    return `${authorPart ? `${authorPart} ` : ''}${title}. ${meta.publisher}, ${year}.${doiPart}`;
  }

  const typeLabel = getResourceTypeLabel(resource.type);
  const sourcePart = doiUrl ? ` ${doiUrl}.` : '';
  return `${authorPart ? `${authorPart} ` : ''}"${title}." ${typeLabel}, ${year}.${sourcePart}`;
}

/**
 * Sinh trích dẫn theo chuẩn Chicago 17th Edition (Author-Date)
 */
export function generateChicagoCitation(resource: Resource): string {
  const meta = extractAcademicMetadataFromResource(resource);
  const year = meta.year || extractResourceYear(resource);
  const author = resource.author && resource.author.trim();
  const title = resource.title.trim();
  const authorPart = author ? `${author}. ${year}.` : `${year}.`;

  const doiUrl = meta.doi ? `https://doi.org/${meta.doi}` : (resource.url || '');

  if (meta.journal) {
    const volIssue = meta.volume
      ? meta.issue
        ? ` ${meta.volume} (${meta.issue})`
        : ` ${meta.volume}`
      : '';
    const pg = meta.pages ? `: ${meta.pages}` : '';
    const doiPart = doiUrl ? ` ${doiUrl}.` : '';
    return `${authorPart} "${title}." ${meta.journal}${volIssue}${pg}.${doiPart}`.trim();
  }

  if (meta.publisher) {
    const doiPart = doiUrl ? ` ${doiUrl}.` : '';
    return `${authorPart} ${title}. ${meta.publisher}.${doiPart}`.trim();
  }

  const typeLabel = getResourceTypeLabel(resource.type);
  const sourcePart = doiUrl ? ` ${doiUrl}.` : '';
  return `${authorPart} "${title}." ${typeLabel}.${sourcePart}`.trim();
}

/**
 * Chuẩn hóa tên tác giả cho chuẩn IEEE (chữ cái đầu viết tắt: "Vaswani, Ashish" -> "A. Vaswani")
 */
function formatIEEEAuthors(authorString: string): string {
  if (!authorString) return '[Anon.]';

  const parts = authorString.split(/\s+and\s+|;\s*/i);
  const formattedList = parts.map((part) => {
    const name = part.trim();
    if (name.includes(',')) {
      const [last, first] = name.split(',').map((s) => s.trim());
      if (first) {
        const initials = first
          .split(/\s+/)
          .map((n) => `${n[0]?.toUpperCase()}.`)
          .join(' ');
        return `${initials} ${last}`;
      }
      return last;
    }
    return name;
  });

  if (formattedList.length === 1) return formattedList[0];
  if (formattedList.length === 2) return `${formattedList[0]} and ${formattedList[1]}`;
  return `${formattedList.slice(0, -1).join(', ')}, and ${formattedList[formattedList.length - 1]}`;
}

/**
 * Sinh trích dẫn theo chuẩn IEEE
 */
export function generateIEEECitation(resource: Resource, index: number = 1): string {
  const meta = extractAcademicMetadataFromResource(resource);
  const year = meta.year || extractResourceYear(resource);
  const author = resource.author ? formatIEEEAuthors(resource.author) : '[Anon.]';
  const title = resource.title.trim();

  const doiPart = meta.doi
    ? `doi: ${meta.doi}.`
    : resource.url
    ? `[Online]. Available: ${resource.url}.`
    : '';

  if (meta.journal) {
    const vol = meta.volume ? `, vol. ${meta.volume}` : '';
    const iss = meta.issue ? `, no. ${meta.issue}` : '';
    const pg = meta.pages ? `, pp. ${meta.pages}` : '';
    const yr = year !== 'n.d.' ? `, ${year}` : '';
    const tail = doiPart ? ` ${doiPart}` : '';
    return `[${index}] ${author}, "${title}," ${meta.journal}${vol}${iss}${pg}${yr}.${tail}`;
  }

  if (meta.publisher) {
    const yr = year !== 'n.d.' ? `, ${year}` : '';
    const tail = doiPart ? ` ${doiPart}` : '';
    return `[${index}] ${author}, ${title}. ${meta.publisher}${yr}.${tail}`;
  }

  const typeLabel = getResourceTypeLabel(resource.type);
  const yr = year !== 'n.d.' ? `, ${year}` : '';
  const tail = doiPart ? ` ${doiPart}` : '';
  return `[${index}] ${author}, "${title}," ${typeLabel}${yr}.${tail}`;
}

/**
 * Sinh trích dẫn theo chuẩn Harvard
 */
export function generateHarvardCitation(resource: Resource): string {
  const meta = extractAcademicMetadataFromResource(resource);
  const year = meta.year || extractResourceYear(resource);
  const author = resource.author && resource.author.trim() ? resource.author.trim() : 'Anon.';
  const title = resource.title.trim();

  const doiUrl = meta.doi ? `https://doi.org/${meta.doi}` : (resource.url || '');
  const availablePart = doiUrl ? ` Available at: ${doiUrl}.` : '';

  if (meta.journal) {
    const volIssue = meta.volume
      ? meta.issue
        ? `${meta.volume}(${meta.issue})`
        : meta.volume
      : '';
    const volPart = volIssue ? `, ${volIssue}` : '';
    const pg = meta.pages ? `, pp. ${meta.pages}` : '';
    return `${author} (${year}) '${title}', ${meta.journal}${volPart}${pg}.${availablePart}`;
  }

  if (meta.publisher) {
    return `${author} (${year}) ${title}. ${meta.publisher}.${availablePart}`;
  }

  const typeLabel = getResourceTypeLabel(resource.type);
  return `${author} (${year}) '${title}', ${typeLabel}.${availablePart}`;
}

/**
 * Sinh trích dẫn theo chuẩn BibTeX cho LaTeX / Zotero
 */
export function generateBibTeXCitation(resource: Resource): string {
  const meta = extractAcademicMetadataFromResource(resource);
  const year = meta.year || extractResourceYear(resource);
  const key = generateBibTeXKey(resource, year);

  let entryType = 'misc';
  if (resource.type === 'book' || meta.publisher) entryType = 'book';
  else if (resource.type === 'article' || meta.journal) entryType = 'article';

  const authorField = resource.author && resource.author.trim()
    ? resource.author.trim()
    : '[Khuyết danh]';

  const lines = [
    `@${entryType}{${key},`,
    `  title = {${resource.title.trim()}},`,
    `  author = {${authorField}},`,
    `  year = {${year}},`,
  ];

  if (meta.journal) {
    lines.push(`  journal = {${meta.journal}},`);
  }
  if (meta.volume) {
    lines.push(`  volume = {${meta.volume}},`);
  }
  if (meta.issue) {
    lines.push(`  number = {${meta.issue}},`);
  }
  if (meta.pages) {
    lines.push(`  pages = {${meta.pages}},`);
  }
  if (meta.publisher) {
    lines.push(`  publisher = {${meta.publisher}},`);
  }
  if (meta.isbn) {
    lines.push(`  isbn = {${meta.isbn}},`);
  }
  if (meta.doi) {
    lines.push(`  doi = {${meta.doi}},`);
  }

  const source = resource.url
    ? resource.url
    : resource.filePath
    ? `Tệp cục bộ: ${resource.filePath}`
    : '';

  if (source && !meta.doi) {
    lines.push(`  howpublished = {${source}},`);
  }

  if (resource.topicTitle) {
    lines.push(`  note = {Chủ đề: ${resource.topicTitle}},`);
  }

  lines.push('}');
  return lines.join('\n');
}

/**
 * Sinh trích dẫn theo chuẩn RIS (Research Information Systems) cho Zotero, EndNote, Mendeley
 */
export function generateRISCitation(resource: Resource): string {
  const meta = extractAcademicMetadataFromResource(resource);
  const year = meta.year || extractResourceYear(resource);

  let typeTag = 'GEN';
  if (resource.type === 'book' || meta.publisher) typeTag = 'BOOK';
  else if (resource.type === 'article' || meta.journal) typeTag = 'JOUR';

  const lines: string[] = [`TY  - ${typeTag}`];
  lines.push(`TI  - ${resource.title.trim()}`);

  if (resource.author) {
    const authors = resource.author.split(/\s+and\s+|;\s*/i);
    authors.forEach((au) => {
      if (au.trim()) lines.push(`AU  - ${au.trim()}`);
    });
  }

  if (meta.journal) {
    lines.push(`JO  - ${meta.journal}`);
  }
  if (year && year !== 'n.d.') {
    lines.push(`PY  - ${year}`);
  }
  if (meta.volume) {
    lines.push(`VL  - ${meta.volume}`);
  }
  if (meta.issue) {
    lines.push(`IS  - ${meta.issue}`);
  }
  if (meta.pages) {
    const [start, end] = meta.pages.split(/[-–—]+/).map((s) => s.trim());
    if (start) lines.push(`SP  - ${start}`);
    if (end) lines.push(`EP  - ${end}`);
  }
  if (meta.publisher) {
    lines.push(`PB  - ${meta.publisher}`);
  }
  if (meta.isbn) {
    lines.push(`SN  - ${meta.isbn}`);
  }
  if (meta.doi) {
    lines.push(`DO  - ${meta.doi}`);
  }
  if (resource.url) {
    lines.push(`UR  - ${resource.url}`);
  } else if (meta.doi) {
    lines.push(`UR  - https://doi.org/${meta.doi}`);
  }

  lines.push('ER  - ');
  return lines.join('\n');
}

/**
 * Sinh trích dẫn dạng Markdown Footnote cho Obsidian / Note cá nhân
 */
export function generateMarkdownFootnote(resource: Resource, index: number = 1): string {
  const meta = extractAcademicMetadataFromResource(resource);
  const year = meta.year || extractResourceYear(resource);
  const typeLabel = getResourceTypeLabel(resource.type);
  const sourcePart = resource.url
    ? ` [Xem tài liệu](${resource.url})`
    : resource.filePath
    ? ` Tệp cục bộ: ${resource.filePath}`
    : '';

  if (resource.author && resource.author.trim()) {
    return `[^${index}]: ${resource.author.trim()} (${year}). *${resource.title.trim()}*. ${typeLabel}.${sourcePart}`;
  }

  return `[^${index}]: *${resource.title.trim()}* (${year}). ${typeLabel}.${sourcePart}`;
}

/**
 * Sinh toàn bộ 8 định dạng trích dẫn trong 1 bundle
 */
export function generateAllCitations(resource: Resource): Record<CitationFormat, string> {
  return {
    apa: generateAPACitation(resource),
    mla: generateMLACitation(resource),
    chicago: generateChicagoCitation(resource),
    ieee: generateIEEECitation(resource, 1),
    harvard: generateHarvardCitation(resource),
    bibtex: generateBibTeXCitation(resource),
    ris: generateRISCitation(resource),
    markdown: generateMarkdownFootnote(resource),
  };
}

/**
 * Trả về tên tệp tải về tương ứng cho từng định dạng trích dẫn
 */
export function getBatchCitationDownloadFilename(format: CitationFormat): string {
  switch (format) {
    case 'bibtex':
      return 'references.bib';
    case 'ris':
      return 'references.ris';
    case 'apa':
      return 'references.txt';
    case 'mla':
      return 'references-mla.txt';
    case 'chicago':
      return 'references-chicago.txt';
    case 'ieee':
      return 'references-ieee.txt';
    case 'harvard':
      return 'references-harvard.txt';
    case 'markdown':
      return 'references.md';
    default:
      return 'references.txt';
  }
}

/**
 * Sinh trích dẫn hàng loạt cho tập danh sách tài liệu
 */
export function generateBatchCitations(
  resources: Resource[],
  format: CitationFormat
): string {
  if (!resources || resources.length === 0) return '';

  switch (format) {
    case 'bibtex':
      return resources.map((r) => generateBibTeXCitation(r)).join('\n\n');
    case 'ris':
      return resources.map((r) => generateRISCitation(r)).join('\n\n');
    case 'markdown':
      return resources.map((r, idx) => generateMarkdownFootnote(r, idx + 1)).join('\n');
    case 'ieee':
      return resources.map((r, idx) => generateIEEECitation(r, idx + 1)).join('\n\n');
    case 'mla':
      return resources.map((r) => generateMLACitation(r)).join('\n\n');
    case 'chicago':
      return resources.map((r) => generateChicagoCitation(r)).join('\n\n');
    case 'harvard':
      return resources.map((r) => generateHarvardCitation(r)).join('\n\n');
    case 'apa':
    default: {
      const sorted = [...resources].sort((a, b) => {
        const keyA = (a.author || a.title).trim().toLowerCase();
        const keyB = (b.author || b.title).trim().toLowerCase();
        return keyA.localeCompare(keyB, 'vi');
      });
      return sorted.map((r) => generateAPACitation(r)).join('\n\n');
    }
  }
}
