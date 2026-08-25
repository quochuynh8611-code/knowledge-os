import { Resource, ResourceType } from '../types';

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
 * Trích xuất năm xuất bản từ ghi chú, tiêu đề hoặc ngày tạo
 */
export function extractResourceYear(resource: Resource): string {
  // Tìm năm 4 chữ số trong notes trước
  if (resource.notes) {
    const match = resource.notes.match(/\b((?:18|19|20)\d{2})\b/);
    if (match) return match[1];
  }
  // Tìm năm trong title
  if (resource.title) {
    const match = resource.title.match(/\b((?:18|19|20)\d{2})\b/);
    if (match) return match[1];
  }
  // Nếu có tác giả và createdAt hợp lệ
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
  const year = extractResourceYear(resource);
  const typeLabel = getResourceTypeLabel(resource.type);
  const source = resource.url
    ? resource.url
    : resource.filePath
    ? `Tệp cục bộ: ${resource.filePath}`
    : '';

  if (resource.author && resource.author.trim()) {
    return `${resource.author.trim()}. (${year}). ${resource.title.trim()}. ${typeLabel}.${source ? ` ${source}` : ''}`;
  }

  return `${resource.title.trim()}. (${year}). ${typeLabel}.${source ? ` ${source}` : ''}`;
}

/**
 * Sinh trích dẫn theo chuẩn BibTeX cho LaTeX / Zotero
 */
export function generateBibTeXCitation(resource: Resource): string {
  const year = extractResourceYear(resource);
  const key = generateBibTeXKey(resource, year);

  let entryType = 'misc';
  if (resource.type === 'book') entryType = 'book';
  else if (resource.type === 'article') entryType = 'article';

  const authorField = resource.author && resource.author.trim()
    ? resource.author.trim()
    : '[Khuyết danh]';

  const source = resource.url
    ? resource.url
    : resource.filePath
    ? `Tệp cục bộ: ${resource.filePath}`
    : '';

  const lines = [
    `@${entryType}{${key},`,
    `  title = {${resource.title.trim()}},`,
    `  author = {${authorField}},`,
    `  year = {${year}},`,
  ];

  if (source) {
    lines.push(`  howpublished = {${source}},`);
  }

  if (resource.topicTitle) {
    lines.push(`  note = {Chủ đề: ${resource.topicTitle}},`);
  }

  lines.push('}');
  return lines.join('\n');
}

/**
 * Sinh trích dẫn dạng Markdown Footnote cho Obsidian / Note cá nhân
 */
export function generateMarkdownFootnote(resource: Resource, index: number = 1): string {
  const year = extractResourceYear(resource);
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
 * Sinh toàn bộ trích dẫn trong 1 bundle
 */
export function generateAllCitations(resource: Resource): {
  apa: string;
  bibtex: string;
  markdown: string;
} {
  return {
    apa: generateAPACitation(resource),
    bibtex: generateBibTeXCitation(resource),
    markdown: generateMarkdownFootnote(resource),
  };
}
