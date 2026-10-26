import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildLiteratureMatrixRow,
  buildLiteratureMatrix,
  generateResourceCitekey,
  getMatrixRowOverrides,
  saveMatrixRowOverride,
  clearMatrixRowOverride,
  analyzeLiteratureSynthesis,
  exportLiteratureMatrixToMarkdown,
  exportLiteratureMatrixToCsv,
} from '../../src/lib/literatureMatrixEngine';
import type { Resource, Note, ResearchExcerpt } from '../../src/types';

describe('Literature Review Matrix & Claim Synthesis Engine (ADR-112)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // Scenario 1: Structured Marker Extraction
  it('Scenario 1: extracts researchQuestion, methodology, keyFindings, and limitations from structured markers while stripping academic metadata blocks', () => {
    const resource: Resource = {
      id: 'res-1',
      topicId: 'topic-fsrs',
      title: 'Free Spaced Repetition Scheduler: An Empirical Study',
      author: 'Jarrett Ye',
      year: '2024',
      type: 'pdf',
      doi: '10.1000/fsrs.2024',
      notes: `
Mục tiêu: Khảo sát độ chính xác của mô hình DSR trong FSRS v5.
Phương pháp: Thực nghiệm hồi cứu trên 10.000 người dùng với 20 triệu lượt ôn tập thẻ nhớ.
Kết quả: Giảm 22% số lượt ôn tập so với SM-2 trong khi vẫn duy trì đúng 90% retention rate mong muốn.
Hạn chế: Cần dữ liệu ôn tập tối thiểu 100 lần để cá nhân hóa 19 trọng số.
<!-- academic-metadata: {"doi":"10.1000/fsrs.2024","year":"2024"} -->
      `.trim(),
      createdAt: '2026-10-26T00:00:00Z',
    };

    const row = buildLiteratureMatrixRow(resource);

    expect(row.researchQuestion).toContain('Khảo sát độ chính xác của mô hình DSR');
    expect(row.methodology).toContain('Thực nghiệm hồi cứu trên 10.000 người dùng');
    expect(row.keyFindings).toContain('Giảm 22% số lượt ôn tập so với SM-2');
    expect(row.limitations).toContain('Cần dữ liệu ôn tập tối thiểu 100 lần');
    expect(row.researchQuestion).not.toContain('academic-metadata');
    expect(row.citationKey).toBe('ye2024');
  });

  // Scenario 2: Excerpt & Linked Note Fallback Enrichment
  it('Scenario 2: enriches key findings from linked ResearchExcerpt highlights and Note items when notes are brief', () => {
    const resource: Resource = {
      id: 'res-2',
      topicId: 'topic-nlp',
      title: 'Attention Is All You Need',
      author: 'Ashish Vaswani',
      year: '2017',
      type: 'article',
      notes: 'Bài báo kinh điển về kiến trúc Transformer.',
      createdAt: '2026-10-26T00:00:00Z',
    };

    const linkedExcerpts: ResearchExcerpt[] = [
      {
        id: 'exc-1',
        archivedDocumentId: 'res-2',
        selectedText: 'Kiến trúc Transformer loại bỏ hoàn toàn mạng tái quy (RNN), đạt điểm BLEU 28.4 trên WMT 2014.',
        highlightColor: '#fbcfe8',
        status: 'active',
        createdAt: '2026-10-26T01:00:00Z',
        updatedAt: '2026-10-26T01:00:00Z',
        positionSelector: { pageNumber: 1 },
      },
    ];

    const row = buildLiteratureMatrixRow(resource, { excerpts: linkedExcerpts });

    expect(row.keyFindings).toContain('Kiến trúc Transformer loại bỏ hoàn toàn mạng tái quy');
    expect(row.excerptCount).toBe(1);
  });

  // Scenario 3: Automatic Stance Classification
  it('Scenario 3: classifies scholarly stances into supports, contradicts, extends, or neutral accurately', () => {
    const resSupports: Resource = {
      id: 'res-sup',
      topicId: 't1',
      title: 'Nghiên cứu ủng hộ',
      notes: 'Kết quả: Dữ liệu thực nghiệm xác nhận và ủng hộ giả thuyết trí nhớ lũy thừa.',
      type: 'article',
      createdAt: '2026-10-26T00:00:00Z',
    };
    expect(buildLiteratureMatrixRow(resSupports).stance).toBe('supports');

    const resContradicts: Resource = {
      id: 'res-contra',
      topicId: 't1',
      title: 'Nghiên cứu phản biện',
      notes: 'Kết quả: Dữ liệu đối lập và mâu thuẫn hoàn toàn với kết luận của mô hình cổ điển, bác bỏ giả định số mũ.',
      type: 'article',
      createdAt: '2026-10-26T00:00:00Z',
    };
    expect(buildLiteratureMatrixRow(resContradicts).stance).toBe('contradicts');

    const resExtends: Resource = {
      id: 'res-ext',
      topicId: 't1',
      title: 'Nghiên cứu mở rộng',
      notes: 'Mục tiêu: Kế thừa và mở rộng mô hình mạng nơ-ron đồ thị cho dữ liệu học thuật.',
      type: 'article',
      createdAt: '2026-10-26T00:00:00Z',
    };
    expect(buildLiteratureMatrixRow(resExtends).stance).toBe('extends');

    const resNeutral: Resource = {
      id: 'res-neu',
      topicId: 't1',
      title: 'Khảo cứu tổng thuật',
      notes: 'Tổng hợp tài liệu tham khảo cho chuyên ngành.',
      type: 'book',
      createdAt: '2026-10-26T00:00:00Z',
    };
    expect(buildLiteratureMatrixRow(resNeutral).stance).toBe('neutral');
  });

  // Scenario 4: Citation Key Generation
  it('Scenario 4: generates clean deterministic citekeys from author, year, and title', () => {
    expect(
      generateResourceCitekey({
        title: 'Attention Is All You Need',
        author: 'Ashish Vaswani',
        year: '2017',
      })
    ).toBe('vaswani2017');

    expect(
      generateResourceCitekey({
        title: 'Deep Residual Learning for Image Recognition',
        author: 'Kaiming He',
        year: '2016',
      })
    ).toBe('he2016');

    // Vietnamese unaccented author
    expect(
      generateResourceCitekey({
        title: 'Lược Sử Triết Học Phật Giáo',
        author: 'Nguyễn Văn A',
        year: '2023',
      })
    ).toBe('nguyen2023');
  });

  // Scenario 5: Persistent User Cell Overrides
  it('Scenario 5: persists manual user cell overrides to localStorage and merges them over heuristic values', () => {
    const resource: Resource = {
      id: 'res-override',
      topicId: 't-test',
      title: 'Nghiên cứu gốc',
      notes: 'Mục tiêu: Đọc ban đầu.',
      type: 'article',
      createdAt: '2026-10-26T00:00:00Z',
    };

    // Save manual override
    saveMatrixRowOverride('res-override', {
      methodology: 'Thử nghiệm lâm sàng ngẫu nhiên có đối chứng (RCT)',
      stance: 'contradicts',
    });

    const overrides = getMatrixRowOverrides();
    expect(overrides['res-override']).toBeDefined();
    expect(overrides['res-override'].stance).toBe('contradicts');

    // Build matrix with override applied
    const rows = buildLiteratureMatrix([resource]);
    expect(rows[0].methodology).toBe('Thử nghiệm lâm sàng ngẫu nhiên có đối chứng (RCT)');
    expect(rows[0].stance).toBe('contradicts');
    expect(rows[0].hasManualOverride).toBe(true);

    // Clear override
    clearMatrixRowOverride('res-override');
    const clearedRows = buildLiteratureMatrix([resource]);
    expect(clearedRows[0].hasManualOverride).toBe(false);
  });

  // Scenario 6: Synthesis Summary & Contradiction Alert Detection
  it('Scenario 6: analyzes synthesis summary, stance distributions, and flags contradiction alerts within topic', () => {
    const rows = [
      {
        resourceId: 'r1',
        topicId: 'topic-memory',
        title: 'Mô hình A',
        author: 'Smith',
        year: '2021',
        type: 'article',
        citationKey: 'smith2021',
        researchQuestion: 'Q1',
        methodology: 'Empirical',
        keyFindings: 'Khẳng định giả thuyết H1',
        limitations: 'L1',
        stance: 'supports' as const,
        excerptCount: 0,
        hasManualOverride: false,
      },
      {
        resourceId: 'r2',
        topicId: 'topic-memory',
        title: 'Mô hình B',
        author: 'Johnson',
        year: '2023',
        type: 'article',
        citationKey: 'johnson2023',
        researchQuestion: 'Q2',
        methodology: 'Replication',
        keyFindings: 'Bác bỏ và mâu thuẫn trực tiếp với Smith 2021',
        limitations: 'L2',
        stance: 'contradicts' as const,
        excerptCount: 0,
        hasManualOverride: false,
      },
    ];

    const summary = analyzeLiteratureSynthesis(rows);

    expect(summary.totalResources).toBe(2);
    expect(summary.stanceCounts.supports).toBe(1);
    expect(summary.stanceCounts.contradicts).toBe(1);
    expect(summary.contradictionAlerts.length).toBeGreaterThanOrEqual(1);
    expect(summary.contradictionAlerts[0].topicId).toBe('topic-memory');
    expect(summary.contradictionAlerts[0].contradictingResourceIds).toContain('r2');
  });

  // Scenario 7: Markdown Table Export
  it('Scenario 7: exports publication-ready 7-column Markdown table with escaped pipes and summary callout', () => {
    const rows = [
      {
        resourceId: 'r1',
        topicId: 't1',
        title: 'Bài báo A | Khảo sát toán học',
        author: 'Nguyen',
        year: '2022',
        type: 'article',
        citationKey: 'nguyen2022',
        researchQuestion: 'Khảo sát A|B',
        methodology: 'Toán học',
        keyFindings: 'Phát hiện F1',
        limitations: 'Giới hạn L1',
        stance: 'supports' as const,
        excerptCount: 2,
        hasManualOverride: false,
      },
    ];

    const markdown = exportLiteratureMatrixToMarkdown(rows);

    expect(markdown).toContain('| Tài liệu (Citekey) | Tác giả & Năm | Mục tiêu / Câu hỏi | Phương pháp | Phát hiện chính | Hạn chế | Lập trường |');
    expect(markdown).toContain('nguyen2022');
    // Ensure raw pipe in title was escaped as \|
    expect(markdown).toContain('Bài báo A \\| Khảo sát toán học');
  });

  // Scenario 8: CSV Export Escaping
  it('Scenario 8: exports RFC-4180 compliant CSV properly quoting commas, quotes, and newlines', () => {
    const rows = [
      {
        resourceId: 'r1',
        topicId: 't1',
        title: 'Machine Learning, Deep Learning, and AI',
        author: 'LeCun, Yann',
        year: '2015',
        type: 'article',
        citationKey: 'lecun2015',
        researchQuestion: 'What is deep learning?',
        methodology: 'Backpropagation with "CNN"',
        keyFindings: 'Deep learning is effective.\nSecond line of finding.',
        limitations: 'Requires labeled data.',
        stance: 'extends' as const,
        excerptCount: 0,
        hasManualOverride: false,
      },
    ];

    const csv = exportLiteratureMatrixToCsv(rows);

    // Verify quoting of commas and quotes
    expect(csv).toContain('"Machine Learning, Deep Learning, and AI"');
    expect(csv).toContain('"LeCun, Yann"');
    expect(csv).toContain('"Backpropagation with ""CNN"""');
    expect(csv).toContain('"Deep learning is effective.\nSecond line of finding."');
  });
});
