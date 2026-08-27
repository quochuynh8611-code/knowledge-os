/**
 * NotebookLM Library Unit Test Suite (Phase 2b)
 *
 * ADR: ADR-012 (docs/adr/ADR-012-local-file-picker-and-knowledge-bridge.md)
 * Gherkin: docs/gherkin/file-picker-and-knowledge-bridge.feature (Scenario 7)
 * Target: src/lib/notebooklm.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  packageSourceForNotebookLM,
  getStoredArtifacts,
  saveArtifact,
  deleteArtifact,
  NOTEBOOKLM_STORAGE_KEY,
  generateNotebookLMTaskPrompt,
  validateArtifactImportInput,
  parseArtifactMarkdownFile,
} from '../../src/lib/notebooklm';
import { Topic, Note, Resource } from '../../src/types';

describe('ADR-012 Phase 2b: NotebookLM Library Contract Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const mockTopic: Topic = {
    id: 'topic-ky-mon',
    title: 'Kỳ Môn Độn Giáp Toàn Thư',
    slug: 'ky-mon-don-giap-toan-thu',
    type: 'huyen-hoc',
    categoryId: 'cat-dich-hoc',
    categoryName: 'Dịch Học & Thuật Số',
    description: 'Khoa thuật số định vị thời không và dự trắc biến dịch.',
    content: 'Cấu trúc Bát Môn, Cửu Tinh, Bát Thần, Tam Kỳ Lục Nghi.',
    tags: ['Kỳ Môn', 'Bát Trận'],
    createdAt: '2026-08-20T10:00:00Z',
    updatedAt: '2026-08-24T10:00:00Z',
    studyProgress: {
      topicId: 'topic-ky-mon',
      status: 'in_progress',
      progress: 50,
      interval: 3,
      easeFactor: 2.5,
      repetitions: 2,
      totalNotes: 1,
      timeSpent: 30,
    },
    links: [
      {
        id: 'link-km-1',
        sourceId: 'topic-ky-mon',
        targetId: 'topic-chu-dich',
        targetTitle: 'Kinh Dịch - Đạo Biến Dịch',
        linkType: 'prerequisite',
        strength: 5,
        notes: 'Cơ sở lý thuyết âm dương ngũ hành',
      },
    ],
  };

  const mockNotes: Note[] = [
    {
      id: 'note-km-1',
      topicId: 'topic-ky-mon',
      topicTitle: 'Kỳ Môn Độn Giáp Toàn Thư',
      title: 'Ứng Dụng Sinh Môn & Khai Môn',
      content: 'Sinh Môn thuộc Thổ phương Đông Bắc, Khai Môn thuộc Kim phương Tây Bắc...',
      type: 'insight',
      isPrivate: false,
      tags: ['Bát Môn'],
      createdAt: '2026-08-21T10:00:00Z',
      updatedAt: '2026-08-22T10:00:00Z',
    },
  ];

  const mockResources: Resource[] = [
    {
      id: 'res-web-1',
      topicId: 'topic-ky-mon',
      topicTitle: 'Kỳ Môn Độn Giáp Toàn Thư',
      title: 'Kỳ Môn Đại Toàn (Cổ Bản)',
      type: 'article',
      author: 'Lưu Bá Ôn',
      url: 'https://ctext.org/qimen',
      notes: 'Bản dịch chữ Hán đối chiếu',
      createdAt: '2026-08-20T10:00:00Z',
    },
    {
      id: 'res-local-2',
      topicId: 'topic-ky-mon',
      topicTitle: 'Kỳ Môn Độn Giáp Toàn Thư',
      title: 'Bi Kíp Tran Do Ky Mon.pdf',
      type: 'pdf',
      author: 'Gia Cát Lượng',
      filePath: 'KyMonBiKip.pdf',
      notes: 'Bản scan thư viện cá nhân',
      createdAt: '2026-08-20T10:00:00Z',
    },
  ];

  // ---------------------------------------------------------------------------
  // 1. 5-Part Source Packaging Structure
  // ---------------------------------------------------------------------------
  it('1. packageSourceForNotebookLM generates structured 5-part source document', () => {
    const doc = packageSourceForNotebookLM(mockTopic, mockNotes, mockResources);

    // Header metadata
    expect(doc).toContain('TÀI LIỆU NGUỒN KHẢO CỨU (NOTEBOOKLM SOURCE DOCUMENT)');
    expect(doc).toContain('CHỦ ĐỀ: KỲ MÔN ĐỘN GIÁP TOÀN THƯ');
    expect(doc).toContain('LĨNH VỰC: DỊCH HỌC & THUẬT SỐ');
    expect(doc).toContain('PHÂN LOẠI: Dịch Học & Thuật Số');

    // Section 1: Concept summary
    expect(doc).toContain('[PHẦN 1: TÓM TẮT ĐỊNH VỊ KHÁI NIỆM]');
    expect(doc).toContain('Khoa thuật số định vị thời không');

    // Section 2: Core content
    expect(doc).toContain('[PHẦN 2: NỘI DUNG LUẬN THUYẾT & NGUYÊN BẢN KINH ĐIỂN]');
    expect(doc).toContain('Cấu trúc Bát Môn, Cửu Tinh');

    // Section 3: Knowledge links
    expect(doc).toContain('[PHẦN 3: CÁC MỐI LIÊN HỆ ĐỐI CHIẾU TRI THỨC]');
    expect(doc).toContain('PREREQUISITE');
    expect(doc).toContain('Kinh Dịch - Đạo Biến Dịch');

    // Section 4: Associated notes
    expect(doc).toContain('[PHẦN 4: TẬP HỢP GHI CHÚ, QUAN SÁT & VẤN ĐỀ NGHIÊN CỨU]');
    expect(doc).toContain('Ứng Dụng Sinh Môn & Khai Môn');
    expect(doc).toContain('Sinh Môn thuộc Thổ');

    // Section 5: References
    expect(doc).toContain('[PHẦN 5: THƯ TỊCH THAM KHẢO & NGUỒN TRÍCH DẪN]');
    expect(doc).toContain('Kỳ Môn Đại Toàn (Cổ Bản)');
    expect(doc).toContain('https://ctext.org/qimen');
  });

  // ---------------------------------------------------------------------------
  // 2. Citation format for both Web URL and Local File Path
  // ---------------------------------------------------------------------------
  it('2. packageSourceForNotebookLM formats both Web URL and Local File citations without binary data', () => {
    const doc = packageSourceForNotebookLM(mockTopic, mockNotes, mockResources);

    // Web resource citation
    expect(doc).toContain('https://ctext.org/qimen');

    // Local file citation should cite filePath
    expect(doc).toContain('KyMonBiKip.pdf');

    // Zero binary assertion
    expect(doc).not.toContain('base64');
    expect(doc).not.toContain('ArrayBuffer');
  });

  it('3. packageSourceForNotebookLM handles empty notes and resources arrays gracefully', () => {
    const doc = packageSourceForNotebookLM(mockTopic, [], []);

    expect(doc).toContain('[PHẦN 1: TÓM TẮT ĐỊNH VỊ KHÁI NIỆM]');
    expect(doc).toContain('[PHẦN 2: NỘI DUNG LUẬN THUYẾT & NGUYÊN BẢN KINH ĐIỂN]');
    expect(doc).not.toContain('[PHẦN 4: TẬP HỢP GHI CHÚ');
    expect(doc).not.toContain('[PHẦN 5: THƯ TỊCH THAM KHẢO');
  });

  it('3b. packageSourceForNotebookLM handles custom dynamic domain without hardcoded Huyền Học fallback', () => {
    const customTopic: Topic = {
      ...mockTopic,
      id: 'topic-custom-kt',
      title: 'Kinh Tế Vĩ Mô & Chính Sách Tiền Tệ',
      type: 'kinh-te',
      categoryName: 'Kinh Tế Học',
    };

    const doc = packageSourceForNotebookLM(customTopic, [], []);

    expect(doc).toContain('CHỦ ĐỀ: KINH TẾ VĨ MÔ & CHÍNH SÁCH TIỀN TỆ');
    expect(doc).not.toContain('HUYỀN HỌC & DỊCH LÝ ĐÔNG PHƯƠNG');
    expect(doc).toContain('LĨNH VỰC: KINH TẾ HỌC');
  });

  // ---------------------------------------------------------------------------
  // 4. Artifact Locker Storage & CRUD
  // ---------------------------------------------------------------------------
  it('4. getStoredArtifacts returns empty array when localStorage is empty', () => {
    expect(getStoredArtifacts()).toEqual([]);
  });

  it('5. saveArtifact saves new artifact to localStorage and prepends to list', () => {
    const saved = saveArtifact({
      topicId: 'topic-ky-mon',
      type: 'audio_overview_summary',
      title: 'Tóm Tắt Podcast 2 Hosts về Kỳ Môn',
      content: 'Chuyên gia thảo luận về tính ứng dụng trong chiến lược...',
      notebookUrl: 'https://notebooklm.google.com/notebook/12345',
    });

    expect(saved.id).toMatch(/^artifact-/);
    expect(saved.createdAt).toBeDefined();
    expect(saved.title).toBe('Tóm Tắt Podcast 2 Hosts về Kỳ Môn');

    const list = getStoredArtifacts();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(saved.id);
  });

  it('6. deleteArtifact removes artifact by id from localStorage', () => {
    const art1 = saveArtifact({
      topicId: 'topic-ky-mon',
      type: 'study_guide',
      title: 'Giáo trình Kỳ Môn',
      content: 'Nội dung giáo trình...',
    });
    const art2 = saveArtifact({
      topicId: 'topic-ky-mon',
      type: 'briefing_doc',
      title: 'Báo cáo tổng kết',
      content: 'Nội dung báo cáo...',
    });

    expect(getStoredArtifacts()).toHaveLength(2);

    deleteArtifact(art1.id);

    const remaining = getStoredArtifacts();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(art2.id);
  });

  it('7. getStoredArtifacts handles corrupted JSON in localStorage safely', () => {
    localStorage.setItem(NOTEBOOKLM_STORAGE_KEY, 'invalid-non-json{[');
    expect(getStoredArtifacts()).toEqual([]);
  });

  // ---------------------------------------------------------------------------
  // 5. Antigravity 2.0 Task Prompt Generation for NotebookLM Skill
  // ---------------------------------------------------------------------------
  it('8. generateNotebookLMTaskPrompt generates structured instructions for Antigravity 2.0 NotebookLM skill', () => {
    const prompt = generateNotebookLMTaskPrompt(mockTopic, 'study_guide', 'Tập trung vào 64 quẻ');

    expect(prompt).toContain('[Chỉ thị Antigravity 2.0: Sử dụng NotebookLM Skill]');
    expect(prompt).toContain('Chủ đề: "Kỳ Môn Độn Giáp Toàn Thư"');
    expect(prompt).toContain('Mục tiêu: Tạo Study Guide / Giáo trình khảo cứu có cấu trúc');
    expect(prompt).toContain('Yêu cầu cấu trúc đầu ra:');
    expect(prompt).toContain('Chỉ dẫn bổ sung: Tập trung vào 64 quẻ');
    expect(prompt).toContain('Target Skill: notebooklm');
    expect(prompt).not.toContain('direct sync API');
  });

  it('9. saveArtifact persists explicit metadata (source, target, status) with safe defaults', () => {
    const saved = saveArtifact({
      topicId: 'topic-ky-mon',
      type: 'study_guide',
      title: 'Giáo trình Kỳ Môn Độn Giáp',
      content: '# Giáo trình\nNội dung chi tiết...',
    });

    expect(saved.source).toBe('antigravity-2.0');
    expect(saved.target).toBe('notebooklm');
    expect(saved.status).toBe('imported');

    const list = getStoredArtifacts();
    expect(list[0].source).toBe('antigravity-2.0');
    expect(list[0].target).toBe('notebooklm');
    expect(list[0].status).toBe('imported');
  });

  // ---------------------------------------------------------------------------
  // 6. Artifact Import Validation & Invariant Guardrails
  // ---------------------------------------------------------------------------
  it('10. validateArtifactImportInput rejects empty or whitespace-only content with specific error', () => {
    const result = validateArtifactImportInput({
      topicId: 'topic-ky-mon',
      title: 'Tiêu đề hợp lệ',
      content: '   ',
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Nội dung artifact không được để trống');
  });

  it('11. validateArtifactImportInput rejects invalid notebook URL with specific protocol error', () => {
    const result = validateArtifactImportInput({
      topicId: 'topic-ky-mon',
      title: 'Tiêu đề hợp lệ',
      content: 'Nội dung bài viết',
      notebookUrl: 'ftp://notebooklm.google.com/123',
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe('URL NotebookLM phải bắt đầu bằng http:// hoặc https://');
  });

  it('12. validateArtifactImportInput accepts valid input with valid http/https URL and trims fields', () => {
    const result = validateArtifactImportInput({
      topicId: 'topic-ky-mon',
      title: '  Báo cáo Tóm tắt  ',
      content: '  Nội dung tóm tắt chi tiết  ',
      notebookUrl: 'https://notebooklm.google.com/notebook/abc-123',
    });

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
    expect(result.sanitized?.title).toBe('Báo cáo Tóm tắt');
    expect(result.sanitized?.content).toBe('Nội dung tóm tắt chi tiết');
    expect(result.sanitized?.notebookUrl).toBe('https://notebooklm.google.com/notebook/abc-123');
  });

  it('13. parseArtifactMarkdownFile extracts title and content from raw Markdown text', () => {
    const rawMarkdown = `# Tóm Tắt Audio Overview: Luận Về Bát Môn\n\nĐây là phần tóm tắt chi tiết từ podcast 2 hosts...`;
    const parsed = parseArtifactMarkdownFile(rawMarkdown, 'topic-ky-mon');

    expect(parsed.title).toBe('Tóm Tắt Audio Overview: Luận Về Bát Môn');
    expect(parsed.content).toContain('Đây là phần tóm tắt chi tiết');
    expect(parsed.type).toBe('audio_overview_summary');
  });

  it('14. [C4] packageSourceForNotebookLM renders domain-neutral header based on categoryName/type without legacy overrides', () => {
    const specializedTopic: Topic = {
      ...mockTopic,
      id: 'topic-specialized-ph',
      title: 'Thiền Minh Sát',
      type: 'phat-hoc',
      categoryName: 'Phật Giáo Nguyên Thủy Vipassana',
    };

    const doc = packageSourceForNotebookLM(specializedTopic, [], []);

    expect(doc).toContain('CHỦ ĐỀ: THIỀN MINH SÁT');
    expect(doc).toContain('LĨNH VỰC: PHẬT GIÁO NGUYÊN THỦY VIPASSANA');
    expect(doc).not.toContain('PHẬT HỌC HỌC THUẬT');
  });
});
