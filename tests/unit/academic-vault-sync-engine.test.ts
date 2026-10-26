import { describe, it, expect } from 'vitest';
import type { Topic, Note, Resource, ResearchExcerpt } from '../../src/types';
import type { Flashcard } from '../../src/types/flashcard';
import {
  formatScholarlyTopicMarkdown,
  formatScholarlyLiteratureNote,
  parseScholarlyMarkdownNote,
  compileEInkStudyPackMarkdown,
  buildScholarlyVaultFileMap,
} from '../../src/lib/academicVaultSync';

describe('Phase 11A: Obsidian & E-Ink Scholarly Round-Trip Bridge Engine', () => {
  // Common fixtures
  const sampleTopic: Topic = {
    id: 'topic-quantum',
    title: 'Vật Lý Lượng Tử & Rối Lượng Tử',
    slug: 'vat-ly-luong-tu',
    type: 'physics',
    categoryId: 'cat-physics',
    categoryName: 'Vật Lý Học',
    description: 'Nghiên cứu về lưỡng tính sóng hạt và tương quan spin.',
    content: 'Cơ học lượng tử mô tả hành vi của vật chất ở thang hạ nguyên tử. Hệ thức: $E = h\\nu$. Trích dẫn [@einstein1935].',
    tags: ['physics', 'quantum', 'mechanics'],
    links: [
      {
        sourceId: 'topic-quantum',
        targetId: 'topic-bell',
        targetTitle: 'Bất Đẳng Thức Bell',
        linkType: 'prerequisite',
        strength: 5,
        notes: 'Cần hiểu về trạng thái vướng víu trước khi kiểm chứng Bell',
      },
      {
        sourceId: 'topic-quantum',
        targetId: 'topic-optics',
        targetTitle: 'Quang Học Phi Tuyến',
        linkType: 'related',
        strength: 3,
      },
    ],
    studyProgress: {
      topicId: 'topic-quantum',
      status: 'in_progress',
      progress: 65,
      interval: 4,
      easeFactor: 2.6,
      repetitions: 3,
      totalNotes: 2,
      timeSpent: 120,
    },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-10-26T00:00:00Z',
  };

  const sampleResource: Resource = {
    id: 'res-einstein',
    topicId: 'topic-quantum',
    title: 'Can Quantum-Mechanical Description of Physical Reality be Considered Complete?',
    author: 'Albert Einstein',
    year: '1935',
    type: 'article',
    doi: '10.1103/PhysRev.47.777',
    notes: 'Tài liệu gốc về nghịch lý EPR',
    createdAt: '2026-01-01T00:00:00Z',
  };

  const sampleExcerpt: ResearchExcerpt = {
    id: 'exc-1',
    archivedDocumentId: 'doc-epr-pdf',
    topicId: 'topic-quantum',
    selectedText: 'No reasonable definition of reality could be expected to permit this.',
    highlightColor: 'amber',
    positionSelector: { pageNumber: 778 },
    status: 'active',
    userNote: 'Luận điểm then chốt về tính định xứ của Einstein',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  const sampleFlashcards: Flashcard[] = [
    {
      id: 'card-1',
      topicId: 'topic-quantum',
      type: 'basic',
      front: 'Nghịch lý EPR viết tắt của các tác giả nào?',
      back: 'Einstein, Podolsky, và Rosen.',
      schedule: {
        id: 'sch-1',
        flashcardId: 'card-1',
        state: 'review',
        dueAt: '2026-10-30T00:00:00Z',
        interval: 10,
        easeFactor: 2.5,
        repetitions: 4,
        lapses: 0,
        stability: 16.4,
        difficulty: 4.2,
        retrievability: 0.92,
        updatedAt: '2026-10-26T00:00:00Z',
      },
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-10-26T00:00:00Z',
    },
    {
      id: 'card-2',
      topicId: 'topic-quantum',
      type: 'cloze',
      front: 'Hệ thức liên hệ giữa năng lượng và tần số photon là {{c1::$E = h\\nu$::công thức Planck}}.',
      back: '$E = h\\nu$',
      schedule: {
        id: 'sch-2',
        flashcardId: 'card-2',
        state: 'review',
        dueAt: '2026-10-28T00:00:00Z',
        interval: 6,
        easeFactor: 2.4,
        repetitions: 2,
        lapses: 1,
        stability: 8.6,
        difficulty: 5.8,
        retrievability: 0.88,
        updatedAt: '2026-10-26T00:00:00Z',
      },
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-10-26T00:00:00Z',
    },
  ];

  // ---------------------------------------------------------------------------
  // 1. Scholarly Topic Markdown Export with Dataview YAML & FSRS Telemetry
  // ---------------------------------------------------------------------------
  it('1. formatScholarlyTopicMarkdown xuất YAML frontmatter chuẩn Dataview với FSRS telemetry và Callout blocks', () => {
    const md = formatScholarlyTopicMarkdown({
      topic: sampleTopic,
      resources: [sampleResource],
      excerpts: [sampleExcerpt],
      flashcards: sampleFlashcards,
    });

    // Check Dataview YAML frontmatter
    expect(md).toContain('---');
    expect(md).toContain('title: "Vật Lý Lượng Tử & Rối Lượng Tử"');
    expect(md).toContain('slug: "vat-ly-luong-tu"');
    expect(md).toContain('domain: "physics"');
    expect(md).toContain('category: "Vật Lý Học"');
    expect(md).toContain('highlight_count: 1');
    expect(md).toContain('flashcard_count: 2');
    expect(md).toContain('fsrs_avg_stability: 12.5'); // (16.4 + 8.6) / 2 = 12.5
    expect(md).toContain('fsrs_avg_difficulty: 5.0');  // (4.2 + 5.8) / 2 = 5.0
    expect(md).toContain('citekeys: ["@einstein1935"]');

    // Check Callouts
    expect(md).toContain('> [!quote] Trích đoạn (Trang 778)');
    expect(md).toContain('No reasonable definition of reality could be expected to permit this.');
    expect(md).toContain('> [!question] Thẻ nhớ FSRS (basic)');
    expect(md).toContain('Nghịch lý EPR viết tắt của các tác giả nào?');
  });

  // ---------------------------------------------------------------------------
  // 2. Literature Note (@citekey.md) Export
  // ---------------------------------------------------------------------------
  it('2. formatScholarlyLiteratureNote tạo ghi chú tài liệu riêng biệt @citekey.md với đầy đủ metadata', () => {
    const result = formatScholarlyLiteratureNote(sampleResource, {
      excerpts: [sampleExcerpt],
      topicTitle: sampleTopic.title,
    });

    expect(result.fileName).toBe('@einstein1935.md');
    expect(result.citekey).toBe('einstein1935');

    const content = result.content;
    expect(content).toContain('citekey: "einstein1935"');
    expect(content).toContain('doi: "10.1103/PhysRev.47.777"');
    expect(content).toContain('author: "Albert Einstein"');
    expect(content).toContain('year: "1935"');
    expect(content).toContain('topic: "Vật Lý Lượng Tử & Rối Lượng Tử"');
    expect(content).toContain('> [!quote] Trích đoạn (Trang 778)');
  });

  // ---------------------------------------------------------------------------
  // 3. Round-Trip YAML Frontmatter & Body Parsing
  // ---------------------------------------------------------------------------
  it('3. parseScholarlyMarkdownNote bóc tách chính xác YAML frontmatter và giữ nguyên KaTeX/Pandoc syntax', () => {
    const inputMarkdown = `---
title: "Lý Thuyết Dây & Không Gian Calabi-Yau"
slug: "ly-thuyet-day"
domain: "theoretical-physics"
category: "Vật Lý Lý Thuyết"
tags: ["string-theory", "dimensions"]
citekey: "witten1995"
doi: "10.1016/0550-3213(95)00158-O"
author: "Edward Witten"
year: "1995"
stance: "supports"
---

# Lý Thuyết Dây & Không Gian Calabi-Yau

Mô hình $10$ chiều không thời gian với tensor metric $g_{\\mu\\nu}$.
Tham khảo [@witten1995; @green1987].

Công thức tác động Polyakov:
$$S = -\\frac{1}{4\\pi\\alpha'} \\int d^2\\sigma \\sqrt{-h} h^{\\alpha\\beta} \\partial_\\alpha X^\\mu \\partial_\\beta X_\\mu$$
`;

    const parsed = parseScholarlyMarkdownNote(inputMarkdown);

    expect(parsed.title).toBe('Lý Thuyết Dây & Không Gian Calabi-Yau');
    expect(parsed.slug).toBe('ly-thuyet-day');
    expect(parsed.domain).toBe('theoretical-physics');
    expect(parsed.category).toBe('Vật Lý Lý Thuyết');
    expect(parsed.tags).toEqual(['string-theory', 'dimensions']);
    expect(parsed.citekey).toBe('witten1995');
    expect(parsed.doi).toBe('10.1016/0550-3213(95)00158-O');
    expect(parsed.author).toBe('Edward Witten');
    expect(parsed.year).toBe('1995');
    expect(parsed.stance).toBe('supports');

    // Preserved KaTeX formulas and Pandoc citations
    expect(parsed.bodyContent).toContain('$10$ chiều');
    expect(parsed.bodyContent).toContain('$g_{\\mu\\nu}$');
    expect(parsed.bodyContent).toContain('[@witten1995; @green1987]');
    expect(parsed.bodyContent).toContain('$$S = -\\frac{1}{4\\pi\\alpha\'}');
  });

  // ---------------------------------------------------------------------------
  // 4. Round-Trip [[Wiki Links]] & Semantic Link Extraction
  // ---------------------------------------------------------------------------
  it('4. parseScholarlyMarkdownNote trích xuất liên kết ngữ nghĩa có trọng số và wiki links nội dòng', () => {
    const markdownWithLinks = `---
title: "Học Máy & Mạng Nơ-ron"
tags: ["ai"]
---

## 🔗 Liên Kết Tri Thức (Knowledge Links)

- **PREREQUISITE** (Trọng số 5/5): [[Đại Số Tuyến Tính Nâng Cao]]
  > *Cần hiểu phép biến đổi ma trận và vector riêng*
- **ADVANCED** (Trọng số 4/5): [[Mô Hình Ngôn Ngữ Lớn]]
- **RELATED** (Trọng số 3/5): [[Xử Lý Tín Hiệu Số]]

Nghiên cứu này cũng liên hệ trực tiếp tới [[Tối Ưu Hóa Lồi|Lý thuyết tối ưu hóa]] trong toán học.
`;

    const parsed = parseScholarlyMarkdownNote(markdownWithLinks);

    expect(parsed.wikiLinks.length).toBeGreaterThanOrEqual(4);

    const prereq = parsed.wikiLinks.find((l) => l.targetTitle === 'Đại Số Tuyến Tính Nâng Cao');
    expect(prereq).toBeDefined();
    expect(prereq?.linkType).toBe('prerequisite');
    expect(prereq?.strength).toBe(5);
    expect(prereq?.notes).toContain('Cần hiểu phép biến đổi ma trận');

    const advanced = parsed.wikiLinks.find((l) => l.targetTitle === 'Mô Hình Ngôn Ngữ Lớn');
    expect(advanced?.linkType).toBe('advanced');
    expect(advanced?.strength).toBe(4);

    const inlineLink = parsed.wikiLinks.find((l) => l.targetTitle === 'Tối Ưu Hóa Lồi');
    expect(inlineLink).toBeDefined();
    expect(inlineLink?.displayText).toBe('Lý thuyết tối ưu hóa');
  });

  // ---------------------------------------------------------------------------
  // 5. Round-Trip > [!quote] Callout Excerpt Extraction
  // ---------------------------------------------------------------------------
  it('5. parseScholarlyMarkdownNote tái tạo chính xác các trích đoạn từ khối callout > [!quote]', () => {
    const markdownWithCallouts = `---
title: "Nghiên cứu về Trí Nhớ"
---

Nội dung phần đầu của bài viết.

> [!quote] Trích đoạn (Trang 45)
> Đường cong quên của Ebbinghaus mô tả sự suy giảm trí nhớ theo hàm số mũ.
> — *Ghi chú: Cần bổ sung thêm thực nghiệm năm 2015*

Một đoạn văn bản khác giữa các trích dẫn.

> [!quote] Trích đoạn (Đoạn 12)
> Sự lặp lại ngắt quãng (Spaced Repetition) làm chậm tốc độ phân rã trí nhớ.
`;

    const parsed = parseScholarlyMarkdownNote(markdownWithCallouts);

    expect(parsed.excerpts.length).toBe(2);

    expect(parsed.excerpts[0].locator).toBe('Trang 45');
    expect(parsed.excerpts[0].selectedText).toContain('Đường cong quên của Ebbinghaus');
    expect(parsed.excerpts[0].userNote).toContain('Cần bổ sung thêm thực nghiệm');

    expect(parsed.excerpts[1].locator).toBe('Đoạn 12');
    expect(parsed.excerpts[1].selectedText).toContain('Sự lặp lại ngắt quãng');
  });

  // ---------------------------------------------------------------------------
  // 6. E-Ink Study Pack Compilation with Separated Question/Answer Self-Test Appendix
  // ---------------------------------------------------------------------------
  it('6. compileEInkStudyPackMarkdown biên dịch tài liệu đọc E-Ink với bảng mục lục và tách riêng câu hỏi/đáp án', () => {
    const einkPack = compileEInkStudyPackMarkdown({
      title: 'Tập Khảo Cứu Vật Lý Lượng Tử',
      author: 'Knowledge OS Research Team',
      topics: [sampleTopic],
      resources: [sampleResource],
      excerpts: [sampleExcerpt],
      flashcards: sampleFlashcards,
      includeSelfTest: true,
      includeLiteratureMatrix: true,
    });

    // High contrast frontmatter
    expect(einkPack).toContain('eink_optimized: true');
    expect(einkPack).toContain('lang: "vi-VN"');

    // Table of contents
    expect(einkPack).toContain('## Mục Lục');

    // Content body
    expect(einkPack).toContain('# Chương 1: Vật Lý Lượng Tử & Rối Lượng Tử');

    // Literature matrix summary table
    expect(einkPack).toContain('## Bảng Tổng Quan Tài Liệu Nghiên Cứu');
    expect(einkPack).toContain('| Mã Trích Dẫn | Tác Giả | Năm | Tiêu Đề |');
    expect(einkPack).toContain('einstein1935');

    // Self-Test section separating question prompt from answer key
    expect(einkPack).toContain('## Phụ Lục Ôn Tập Chủ Động (FSRS Active Recall)');
    expect(einkPack).toContain('### Phần A: Câu Hỏi Tự Đánh Giá (Flashcards)');
    expect(einkPack).toContain('### Phần B: Đáp Án Đối Chiếu');

    // The question should appear in Part A
    expect(einkPack).toContain('Nghịch lý EPR viết tắt của các tác giả nào?');
  });

  // ---------------------------------------------------------------------------
  // 7. Cloze Flashcard Masking in E-Ink Self-Test Prompts
  // ---------------------------------------------------------------------------
  it('7. compileEInkStudyPackMarkdown che phủ đáp án cloze {{c1::...}} bằng [...] trong phần câu hỏi và hiện rõ trong đáp án', () => {
    const einkPack = compileEInkStudyPackMarkdown({
      topics: [sampleTopic],
      flashcards: [sampleFlashcards[1]], // card-2 (cloze)
      includeSelfTest: true,
    });

    const [partA, partB] = einkPack.split('### Phần B: Đáp Án Đối Chiếu');

    // In Part A (Question Prompts), cloze answer must be masked as [...]
    expect(partA).toContain('Hệ thức liên hệ giữa năng lượng và tần số photon là [...]');
    expect(partA).not.toContain('$E = h\\nu$::công thức Planck');

    // In Part B (Answer Key), the answer must be clearly exposed
    expect(partB).toContain('$E = h\\nu$');
  });

  // ---------------------------------------------------------------------------
  // 8. Full Scholarly Vault Archive Structure (buildScholarlyVaultFileMap)
  // ---------------------------------------------------------------------------
  it('8. buildScholarlyVaultFileMap tạo cây thư mục ảo chuẩn bị đóng gói ZIP hoặc sync folder', () => {
    const fileMap = buildScholarlyVaultFileMap({
      topics: [sampleTopic],
      resources: [sampleResource],
      excerpts: [sampleExcerpt],
      flashcards: sampleFlashcards,
      vaultName: 'Academic-Vault',
    });

    expect(fileMap.length).toBeGreaterThanOrEqual(4);

    // MOC file
    const mocFile = fileMap.find((f) => f.path === '00_Map_Of_Content.md');
    expect(mocFile).toBeDefined();
    expect(mocFile?.category).toBe('moc');
    expect(mocFile?.content).toContain('# Academic-Vault — Bản Đồ Tri Thức');

    // Topic file placed under its domain folder
    const topicFile = fileMap.find((f) => f.path.startsWith('Physics/') && f.path.endsWith('.md'));
    expect(topicFile).toBeDefined();
    expect(topicFile?.category).toBe('topic');
    expect(topicFile?.content).toContain('title: "Vật Lý Lượng Tử & Rối Lượng Tử"');

    // Literature note under Literature-Notes/
    const litFile = fileMap.find((f) => f.path.includes('Literature-Notes/@einstein1935.md'));
    expect(litFile).toBeDefined();
    expect(litFile?.category).toBe('literature');

    // E-Ink Study Pack file
    const einkFile = fileMap.find((f) => f.path.includes('E-Ink-Study-Packs/'));
    expect(einkFile).toBeDefined();
    expect(einkFile?.category).toBe('eink-pack');
  });
});
