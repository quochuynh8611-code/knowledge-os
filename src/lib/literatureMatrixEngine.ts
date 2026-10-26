/**
 * Literature Review Matrix & Claim Synthesis Engine (ADR-112).
 * Enables scholars to analyze, compare, and synthesize academic literature
 * across 5 standardized dimensions: Research Question, Methodology, Key Findings,
 * Limitations, and Scholarly Stance.
 */

import type { Resource, Note, ResearchExcerpt } from '../types';
import { extractAcademicMetadataFromResource } from './citationGenerator';

export type ScholarlyStance = 'supports' | 'contradicts' | 'extends' | 'neutral';

export interface LiteratureMatrixOverride {
  researchQuestion?: string;
  methodology?: string;
  keyFindings?: string;
  limitations?: string;
  stance?: ScholarlyStance;
  updatedAt?: string;
}

export interface LiteratureMatrixRow {
  resourceId: string;
  topicId: string;
  title: string;
  author: string;
  year: string;
  type: string;
  doi?: string;
  citationKey: string;
  researchQuestion: string;
  methodology: string;
  keyFindings: string;
  limitations: string;
  stance: ScholarlyStance;
  excerptCount: number;
  hasManualOverride: boolean;
}

export interface LiteratureContradictionAlert {
  topicId: string;
  contradictingResourceIds: string[];
  summary: string;
}

export interface LiteratureSynthesisSummary {
  totalResources: number;
  stanceCounts: Record<ScholarlyStance, number>;
  contradictionAlerts: LiteratureContradictionAlert[];
  coverageScore: number;
}

export interface BuildMatrixOptions {
  topicId?: string;
  stanceFilter?: ScholarlyStance | 'all';
  searchQuery?: string;
  excerpts?: ResearchExcerpt[];
  notes?: Note[];
}

const MATRIX_OVERRIDES_STORAGE_KEY = 'knowledge_os_literature_matrix_v1';

/**
 * Normalizes Vietnamese text by stripping accents and special characters.
 */
function normalizeAscii(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

/**
 * Generates a standard academic citekey (e.g. vaswani2017, nguyen2023, he2016).
 */
export function generateResourceCitekey(resource: {
  title: string;
  author?: string;
  year?: string;
  createdAt?: string;
}): string {
  let authorKey = 'unknown';

  if (resource.author && resource.author.trim()) {
    const rawAuthor = resource.author.trim();
    if (rawAuthor.includes(',')) {
      // Author format: "LeCun, Yann" -> "lecun"
      authorKey = normalizeAscii(rawAuthor.split(',')[0].trim());
    } else {
      const words = rawAuthor.split(/\s+/).filter(Boolean);
      const firstNormalized = normalizeAscii(words[0]);

      // Common Vietnamese family names where the family name is the FIRST word
      const vietnameseSurnames = new Set([
        'nguyen', 'tran', 'le', 'pham', 'hoang', 'huynh',
        'phan', 'vu', 'vo', 'dang', 'bui', 'do', 'ho',
        'ngo', 'duong', 'ly', 'dinh', 'doan', 'lam', 'truong'
      ]);

      if (vietnameseSurnames.has(firstNormalized)) {
        authorKey = firstNormalized;
      } else {
        // Western / International names where family name is the LAST word (e.g. Ashish Vaswani -> vaswani)
        authorKey = normalizeAscii(words[words.length - 1]);
      }
    }
  } else if (resource.title) {
    // Fallback to first alphanumeric word of title
    const match = normalizeAscii(resource.title).match(/[a-z0-9]+/);
    if (match) {
      authorKey = match[0];
    }
  }

  // Extract 4-digit year
  let yearKey = 'nd';
  const yearSource = resource.year || resource.createdAt || '';
  const yearMatch = yearSource.match(/\b((?:18|19|20)\d{2})\b/);
  if (yearMatch) {
    yearKey = yearMatch[1];
  }

  return `${authorKey.replace(/[^a-z0-9]/g, '')}${yearKey}`;
}

/**
 * Retrieves manual matrix row overrides from localStorage.
 */
export function getMatrixRowOverrides(): Record<string, LiteratureMatrixOverride> {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return {};
  }
  try {
    const raw = localStorage.getItem(MATRIX_OVERRIDES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Saves a manual override for a specific resource row.
 */
export function saveMatrixRowOverride(
  resourceId: string,
  override: Partial<LiteratureMatrixOverride>
): LiteratureMatrixOverride {
  const existing = getMatrixRowOverrides();
  const prev = existing[resourceId] || {};
  const updated: LiteratureMatrixOverride = {
    ...prev,
    ...override,
    updatedAt: new Date().toISOString(),
  };
  existing[resourceId] = updated;

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(MATRIX_OVERRIDES_STORAGE_KEY, JSON.stringify(existing));
  }
  return updated;
}

/**
 * Clears manual overrides for a specific resource.
 */
export function clearMatrixRowOverride(resourceId: string): void {
  const existing = getMatrixRowOverrides();
  if (existing[resourceId]) {
    delete existing[resourceId];
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(MATRIX_OVERRIDES_STORAGE_KEY, JSON.stringify(existing));
    }
  }
}

/**
 * Classifies scholarly stance based on text indicators and findings.
 */
function classifyStance(text: string): ScholarlyStance {
  const normalized = text.toLowerCase();

  // Contradicts / Refutes
  if (
    /(?:mâu thuẫn|bác bỏ|phản bác|đối lập|bất đồng|không đồng ý|contradicts|refutes|opposes|in contrast)/i.test(
      normalized
    )
  ) {
    return 'contradicts';
  }

  // Extends / Builds on
  if (
    /(?:mở rộng|kế thừa|phát triển từ|cải tiến|tiếp nối|extends|builds on|improves upon)/i.test(
      normalized
    )
  ) {
    return 'extends';
  }

  // Supports / Confirms
  if (
    /(?:chứng minh|ủng hộ|xác nhận|đồng thuận|khẳng định|phù hợp với|supports|confirms|validates)/i.test(
      normalized
    )
  ) {
    return 'supports';
  }

  return 'neutral';
}

/**
 * Strips academic metadata blocks and clean text.
 */
function cleanResourceNotes(rawNotes?: string): string {
  if (!rawNotes) return '';
  return rawNotes
    .replace(/<!--\s*academic-metadata:[\s\S]*?-->/g, '')
    .replace(/\[ACADEMIC_META\][\s\S]*?\[\/ACADEMIC_META\]/gi, '')
    .trim();
}

/**
 * Extracts a specific structured dimension from text using regex label markers.
 */
function extractDimensionByRegex(text: string, regex: RegExp): string | undefined {
  const match = text.match(regex);
  if (match && match[1]) {
    return match[1].trim();
  }
  return undefined;
}

/**
 * Builds a single LiteratureMatrixRow from a Resource.
 */
export function buildLiteratureMatrixRow(
  resource: Resource,
  options?: {
    excerpts?: ResearchExcerpt[];
    notes?: Note[];
    override?: LiteratureMatrixOverride;
  }
): LiteratureMatrixRow {
  const academicMeta = extractAcademicMetadataFromResource(resource);
  const cleanNotes = cleanResourceNotes(academicMeta.cleanNotes || resource.notes);

  // Extract markers
  const questionRegex = /(?:mục tiêu|câu hỏi(?:\s+nghiên cứu)?|objective|research question|goal)\s*[:—]\s*([^\n]+)/i;
  const methodRegex = /(?:phương pháp|methodology|method|mô hình|thiết kế)\s*[:—]\s*([^\n]+)/i;
  const findingsRegex = /(?:kết quả|phát hiện|luận điểm|findings|results|claim)\s*[:—]\s*([^\n]+)/i;
  const limitationsRegex = /(?:hạn chế|giới hạn|limitations|gap|chưa giải quyết)\s*[:—]\s*([^\n]+)/i;

  let researchQuestion = extractDimensionByRegex(cleanNotes, questionRegex) || '';
  let methodology = extractDimensionByRegex(cleanNotes, methodRegex) || '';
  let keyFindings = extractDimensionByRegex(cleanNotes, findingsRegex) || '';
  let limitations = extractDimensionByRegex(cleanNotes, limitationsRegex) || '';

  // Fallback 1: Keyword detection for methodology if no structured marker
  if (!methodology && cleanNotes) {
    const methodKeywordMatch = cleanNotes.match(
      /(?:thực nghiệm|khảo sát|mô phỏng|định lượng|định tính|empirical|rct|meta-analysis|case study|review|thử nghiệm lâm sàng)[^\n.]*/i
    );
    if (methodKeywordMatch) {
      methodology = methodKeywordMatch[0].trim();
    }
  }

  // Fallback 2: Link excerpts belonging to this resource
  const matchingExcerpts = (options?.excerpts || []).filter(
    (e) =>
      e.archivedDocumentId === resource.id ||
      (e.citationSnapshot?.title && e.citationSnapshot.title.toLowerCase() === resource.title.toLowerCase())
  );

  if ((!keyFindings || keyFindings.length < 15) && matchingExcerpts.length > 0) {
    keyFindings = matchingExcerpts.map((e) => e.selectedText.trim()).join('; ');
  }

  // Fallback 3: Link notes belonging to this topic or citing this resource
  if ((!keyFindings || keyFindings.length < 15) && options?.notes) {
    const matchingNote = options.notes.find(
      (n) =>
        n.citationProvenances?.some((p) => p.documentId === resource.id) ||
        (n.topicId === resource.topicId && n.content.includes(resource.title))
    );
    if (matchingNote && matchingNote.content) {
      const noteClean = matchingNote.content.replace(/^#+\s+[^\n]+\n/g, '').trim();
      if (!keyFindings) {
        keyFindings = noteClean.slice(0, 160);
      }
    }
  }

  // Fallback 4: General note snippet if still empty
  if (!keyFindings && cleanNotes) {
    keyFindings = cleanNotes.slice(0, 160);
  }

  // Determine stance
  const combinedContext = `${cleanNotes} ${keyFindings} ${researchQuestion}`;
  const computedStance = classifyStance(combinedContext);

  // Apply manual overrides if present
  const override = options?.override;
  const hasManualOverride = Boolean(
    override &&
      (override.researchQuestion !== undefined ||
        override.methodology !== undefined ||
        override.keyFindings !== undefined ||
        override.limitations !== undefined ||
        override.stance !== undefined)
  );

  const finalQuestion = override?.researchQuestion !== undefined ? override.researchQuestion : researchQuestion;
  const finalMethodology = override?.methodology !== undefined ? override.methodology : methodology;
  const finalFindings = override?.keyFindings !== undefined ? override.keyFindings : keyFindings;
  const finalLimitations = override?.limitations !== undefined ? override.limitations : limitations;
  const finalStance = override?.stance !== undefined ? override.stance : computedStance;

  const citationKey = generateResourceCitekey(resource);

  return {
    resourceId: resource.id,
    topicId: resource.topicId,
    title: resource.title,
    author: resource.author || 'Chưa rõ tác giả',
    year: academicMeta.year || 'n.d.',
    type: resource.type,
    doi: academicMeta.doi,
    citationKey,
    researchQuestion: finalQuestion,
    methodology: finalMethodology,
    keyFindings: finalFindings,
    limitations: finalLimitations,
    stance: finalStance,
    excerptCount: matchingExcerpts.length,
    hasManualOverride,
  };
}

/**
 * Builds the complete Literature Review Matrix for a collection of resources.
 */
export function buildLiteratureMatrix(
  resources: Resource[],
  options?: BuildMatrixOptions
): LiteratureMatrixRow[] {
  const overrides = getMatrixRowOverrides();

  let filtered = [...resources];
  if (options?.topicId && options.topicId !== 'all') {
    filtered = filtered.filter((r) => r.topicId === options.topicId);
  }

  const rows = filtered.map((resource) =>
    buildLiteratureMatrixRow(resource, {
      excerpts: options?.excerpts,
      notes: options?.notes,
      override: overrides[resource.id],
    })
  );

  // Apply stance filter
  let finalRows = rows;
  if (options?.stanceFilter && options.stanceFilter !== 'all') {
    finalRows = finalRows.filter((r) => r.stance === options.stanceFilter);
  }

  // Apply search query
  if (options?.searchQuery && options.searchQuery.trim()) {
    const q = options.searchQuery.toLowerCase().trim();
    finalRows = finalRows.filter((r) => {
      return (
        r.title.toLowerCase().includes(q) ||
        r.author.toLowerCase().includes(q) ||
        r.citationKey.toLowerCase().includes(q) ||
        r.researchQuestion.toLowerCase().includes(q) ||
        r.methodology.toLowerCase().includes(q) ||
        r.keyFindings.toLowerCase().includes(q) ||
        r.limitations.toLowerCase().includes(q)
      );
    });
  }

  return finalRows;
}

/**
 * Analyzes synthesis summary and surfaces scholarly debates/contradictions.
 */
export function analyzeLiteratureSynthesis(
  rows: LiteratureMatrixRow[]
): LiteratureSynthesisSummary {
  const stanceCounts: Record<ScholarlyStance, number> = {
    supports: 0,
    contradicts: 0,
    extends: 0,
    neutral: 0,
  };

  let filledCells = 0;
  const totalCells = rows.length * 3; // Question, Method, Findings

  for (const row of rows) {
    stanceCounts[row.stance] = (stanceCounts[row.stance] || 0) + 1;
    if (row.researchQuestion.trim()) filledCells++;
    if (row.methodology.trim()) filledCells++;
    if (row.keyFindings.trim()) filledCells++;
  }

  // Detect contradictions grouped by topic
  const topicMap = new Map<string, LiteratureMatrixRow[]>();
  for (const row of rows) {
    const list = topicMap.get(row.topicId) || [];
    list.push(row);
    topicMap.set(row.topicId, list);
  }

  const contradictionAlerts: LiteratureContradictionAlert[] = [];
  for (const [topicId, topicRows] of topicMap.entries()) {
    const contradictingRows = topicRows.filter((r) => r.stance === 'contradicts');
    if (contradictingRows.length > 0 && topicRows.length > 1) {
      contradictionAlerts.push({
        topicId,
        contradictingResourceIds: contradictingRows.map((r) => r.resourceId),
        summary: `Chủ đề này có ${contradictingRows.length} nghiên cứu đưa ra phát hiện đối lập/bác bỏ so với các nghiên cứu khác.`,
      });
    }
  }

  const coverageScore = totalCells > 0 ? Math.round((filledCells / totalCells) * 100) / 100 : 0;

  return {
    totalResources: rows.length,
    stanceCounts,
    contradictionAlerts,
    coverageScore,
  };
}

/**
 * Escapes markdown table special characters (pipe and newline).
 */
function escapeMarkdownCell(str: string): string {
  if (!str) return '–';
  return str.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim() || '–';
}

/**
 * Exports the Literature Matrix to a publication-ready Markdown table.
 */
export function exportLiteratureMatrixToMarkdown(
  rows: LiteratureMatrixRow[],
  summary?: LiteratureSynthesisSummary
): string {
  const syn = summary || analyzeLiteratureSynthesis(rows);

  const lines: string[] = [
    '# Ma Trận Tổng Quan Tài Liệu Nghiên Cứu (Literature Review Matrix)',
    '',
    `> **Tổng quan tổng hợp:** ${syn.totalResources} tài liệu • ` +
      `Ủng hộ: ${syn.stanceCounts.supports} • ` +
      `Mở rộng: ${syn.stanceCounts.extends} • ` +
      `Đối lập/Phản biện: ${syn.stanceCounts.contradicts} • ` +
      `Độ bao phủ: ${Math.round(syn.coverageScore * 100)}%`,
    '',
  ];

  if (syn.contradictionAlerts.length > 0) {
    lines.push('### ⚠️ Cảnh Báo Tranh Luận Học Thuật (Contradictions)');
    for (const alert of syn.contradictionAlerts) {
      lines.push(`- **Chủ đề [${alert.topicId}]:** ${alert.summary}`);
    }
    lines.push('');
  }

  lines.push(
    '| Tài liệu (Citekey) | Tác giả & Năm | Mục tiêu / Câu hỏi | Phương pháp | Phát hiện chính | Hạn chế | Lập trường |'
  );
  lines.push('|---|---|---|---|---|---|---|');

  for (const row of rows) {
    const citekeyDoc = `**${escapeMarkdownCell(row.title)}** (${row.citationKey})`;
    const authorYear = `${escapeMarkdownCell(row.author)} (${row.year})`;
    const question = escapeMarkdownCell(row.researchQuestion);
    const method = escapeMarkdownCell(row.methodology);
    const findings = escapeMarkdownCell(row.keyFindings);
    const limitations = escapeMarkdownCell(row.limitations);
    const stance = escapeMarkdownCell(row.stance);

    lines.push(
      `| ${citekeyDoc} | ${authorYear} | ${question} | ${method} | ${findings} | ${limitations} | ${stance} |`
    );
  }

  return lines.join('\n');
}

/**
 * Escapes an RFC-4180 CSV cell.
 */
function escapeCsvCell(val: string | undefined): string {
  const str = val || '';
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Exports the Literature Matrix to an RFC-4180 compliant CSV format.
 */
export function exportLiteratureMatrixToCsv(rows: LiteratureMatrixRow[]): string {
  const header = [
    'Citekey',
    'Tiêu đề',
    'Tác giả',
    'Năm',
    'Mục tiêu / Câu hỏi',
    'Phương pháp',
    'Phát hiện chính',
    'Hạn chế',
    'Lập trường',
    'DOI',
  ].map(escapeCsvCell).join(',');

  const csvRows = rows.map((r) =>
    [
      r.citationKey,
      r.title,
      r.author,
      r.year,
      r.researchQuestion,
      r.methodology,
      r.keyFindings,
      r.limitations,
      r.stance,
      r.doi || '',
    ]
      .map(escapeCsvCell)
      .join(',')
  );

  return [header, ...csvRows].join('\n');
}
