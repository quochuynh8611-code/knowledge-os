import { describe, it, expect } from 'vitest';
import {
  synthesizeFlashcardFromExcerpt,
  synthesizeFlashcardBatchFromExcerpts,
  formatExcerptProvenance,
  detectBestSynthesisStrategy,
  type ExcerptInput,
} from '../../src/lib/highlightToFlashcardEngine';
import { parseClozeDeletions } from '../../src/lib/clozeParser';

describe('Highlight-to-Flashcard Synthesis Engine (ADR-111)', () => {
  // Scenario 1: Auto-Cloze on Bold / Quoted Academic Terms
  it('Scenario 1: wraps bold or quoted academic terms in {{c1::...}} and populates back with context + provenance', () => {
    const excerpt: ExcerptInput = {
      id: 'exc-1',
      selectedText: '**Định lý bất toàn của Gödel** chứng minh rằng trong mọi hệ tiên đề hình thức nhất quán đủ mạnh, luôn tồn tại những mệnh đề chân thực không thể chứng minh.',
      sourceTitle: 'Nhập Môn Logic Học Toán',
      pageNumber: 142,
    };

    const card = synthesizeFlashcardFromExcerpt(excerpt, { strategy: 'cloze-auto' });

    expect(card.isCloze).toBe(true);
    expect(card.strategyUsed).toBe('cloze-auto');
    expect(card.front).toContain('{{c1::Định lý bất toàn của Gödel}}');
    expect(card.front).not.toContain('**'); // Replaced markdown asterisks with clean cloze
    expect(card.back).toContain('Nhập Môn Logic Học Toán');
    expect(card.back).toContain('Trang 142');
    expect(card.sourceExcerptId).toBe('exc-1');
  });

  // Scenario 2: LaTeX & mhchem Formula Preservation in Cloze
  it('Scenario 2: preserves nested LaTeX and mhchem braces inside cloze deletions without corruption', () => {
    const rawFormula = '$E = \\frac{mc^2}{\\sqrt{1 - \\frac{v^2}{c^2}}}$';
    const excerpt: ExcerptInput = {
      id: 'exc-2',
      selectedText: `Phương trình năng lượng ${rawFormula} và phản ứng $\\ce{2H2 + O2 -> 2H2O}$ là hai ví dụ tiêu biểu.`,
      sourceTitle: 'Vật Lý & Hóa Học Đại Cương',
      pageNumber: 88,
    };

    const card = synthesizeFlashcardFromExcerpt(excerpt, { strategy: 'cloze-auto' });

    expect(card.isCloze).toBe(true);
    // Should preserve the exact nested LaTeX formula inside {{c1::...}}
    expect(card.front).toContain(`{{c1::${rawFormula}}}`);

    // Verify parser handles it with 0 errors and parses out Cloze items
    const parsedItems = parseClozeDeletions(card.front, { strict: true });
    expect(parsedItems.length).toBeGreaterThanOrEqual(1);
    expect(parsedItems[0].answer).toBe(rawFormula);
  });

  // Scenario 3: Definition Split Strategy
  it('Scenario 3: splits definition sentences into front question prompt and back answer with provenance', () => {
    const excerpt: ExcerptInput = {
      id: 'exc-3',
      selectedText: 'Entropy lượng tử Von Neumann: Đại lượng đo lường mức độ hỗn loạn hoặc vướng víu của trạng thái lượng tử $\\rho$.',
      sourceTitle: 'Cơ Học Lượng Tử',
      pageNumber: 215,
    };

    const card = synthesizeFlashcardFromExcerpt(excerpt, { strategy: 'definition-split' });

    expect(card.isCloze).toBe(false);
    expect(card.strategyUsed).toBe('definition-split');
    expect(card.front).toContain('Entropy lượng tử Von Neumann');
    expect(card.back).toContain('Đại lượng đo lường mức độ hỗn loạn hoặc vướng víu của trạng thái lượng tử $\\rho$.');
    expect(card.back).toContain('Cơ Học Lượng Tử');
    expect(card.back).toContain('Trang 215');
  });

  // Scenario 4: User Note Q&A Strategy
  it('Scenario 4: uses user note as front question prompt when available in qa-note mode', () => {
    const excerpt: ExcerptInput = {
      id: 'exc-4',
      userNote: 'Tại sao hệ số suy giảm FSRS dùng hàm lũy thừa thay vì hàm số mũ?',
      selectedText: 'Đường cong quên hàm lũy thừa R(t) = (1 + F * t/S)^C phản ánh chính xác suy giảm trí nhớ thực nghiệm hơn so với hàm mũ cố định của SM-2.',
      sourceTitle: 'FSRS v5 Specification',
      pageNumber: 12,
    };

    const card = synthesizeFlashcardFromExcerpt(excerpt, { strategy: 'qa-note' });

    expect(card.isCloze).toBe(false);
    expect(card.strategyUsed).toBe('qa-note');
    expect(card.front).toBe('Tại sao hệ số suy giảm FSRS dùng hàm lũy thừa thay vì hàm số mũ?');
    expect(card.back).toContain('Đường cong quên hàm lũy thừa');
    expect(card.back).toContain('FSRS v5 Specification');
  });

  // Scenario 5: Provenance Footer Formatting across PDF, EPUB & Markdown
  it('Scenario 5: formats provenance footer across PDF page, EPUB CFI, and Markdown heading', () => {
    const pdfExcerpt: ExcerptInput = {
      id: 'pdf-1',
      selectedText: 'Khảo sát định lượng',
      sourceTitle: 'Nghiên cứu A',
      sourceType: 'pdf',
      pageNumber: 42,
    };
    expect(formatExcerptProvenance(pdfExcerpt)).toBe('> 📖 Nguồn: Nghiên cứu A • Trang 42');

    const epubExcerpt: ExcerptInput = {
      id: 'epub-1',
      selectedText: 'Khái niệm trừu tượng',
      sourceTitle: 'Sách Chuyên Khảo',
      sourceType: 'epub',
      cfi: 'epubcfi(/6/4[chap01]!/4/2/10)',
    };
    expect(formatExcerptProvenance(epubExcerpt)).toBe('> 📖 Nguồn: Sách Chuyên Khảo • Vị trí EPUB');

    const mdExcerpt: ExcerptInput = {
      id: 'md-1',
      selectedText: 'Nguyên tắc tổng quan',
      sourceTitle: 'Ghi Chú Nghiên Cứu',
      sourceType: 'md',
      headingId: 'section-co-ban',
    };
    expect(formatExcerptProvenance(mdExcerpt)).toBe('> 📖 Nguồn: Ghi Chú Nghiên Cứu • Mục: section-co-ban');
  });

  // Scenario 6: Batch Filtering by Highlight Color
  it('Scenario 6: filters batch synthesis by highlight color palette', () => {
    const excerpts: ExcerptInput[] = [
      { id: '1', selectedText: 'Đoạn màu hồng **khái niệm A**', highlightColor: '#fbcfe8' },
      { id: '2', selectedText: 'Đoạn màu xanh **khái niệm B**', highlightColor: '#bae6fd' },
      { id: '3', selectedText: 'Đoạn màu vàng **khái niệm C**', highlightColor: '#fef08a' },
    ];

    const result = synthesizeFlashcardBatchFromExcerpts(excerpts, [], {
      colorFilter: ['#fbcfe8', '#fef08a'],
    });

    expect(result.candidates.length).toBe(2);
    expect(result.candidates.map((c) => c.sourceExcerptId)).toEqual(['1', '3']);
    expect(result.totalProcessed).toBe(3);
  });

  // Scenario 7: Batch Deduplication Guard against Existing Flashcards
  it('Scenario 7: skips excerpts whose sourceExcerptId or content already exists in existing cards', () => {
    const excerpts: ExcerptInput[] = [
      { id: 'exc-dup-1', selectedText: 'Khái niệm đã có thẻ nhớ trước đó' },
      { id: 'exc-new-2', selectedText: '**Thuật ngữ mới** cần tạo thẻ' },
    ];

    const existingCards = [
      {
        front: 'Khái niệm đã có thẻ nhớ trước đó',
        back: 'Nội dung giải thích',
        sourceExcerptId: 'exc-dup-1',
      },
    ];

    const result = synthesizeFlashcardBatchFromExcerpts(excerpts, existingCards);

    expect(result.candidates.length).toBe(1);
    expect(result.candidates[0].sourceExcerptId).toBe('exc-new-2');
    expect(result.skippedDuplicates).toBe(1);
  });

  // Scenario 8: Fallback Safety on Short / Plain Excerpts
  it('Scenario 8: safely handles plain excerpts without markdown or formulas without throwing or generating empty clozes', () => {
    const excerpt: ExcerptInput = {
      id: 'plain-1',
      selectedText: 'Hiện tượng quang điện ngoài xảy ra khi ánh sáng chiếu vào kim loại giải phóng electron.',
      sourceTitle: 'Quang Học',
    };

    const card = synthesizeFlashcardFromExcerpt(excerpt, { strategy: 'cloze-auto' });

    expect(card.isCloze).toBe(true);
    expect(card.front).toMatch(/\{\{c1::.+?\}\}/);
    expect(card.front).not.toContain('{{c1::}}');
    expect(card.back).toContain('Quang Học');
  });

  // Additional check: Strategy auto-detection
  it('auto-detects strategy accurately based on userNote and text pattern', () => {
    expect(detectBestSynthesisStrategy({ id: '1', selectedText: 'abc', userNote: 'Tại sao lại như vậy?' })).toBe('qa-note');
    expect(detectBestSynthesisStrategy({ id: '2', selectedText: 'Spaced Repetition: Kỹ thuật học tập ngắt quãng.' })).toBe('definition-split');
    expect(detectBestSynthesisStrategy({ id: '3', selectedText: '**Học máy** là một nhánh của trí tuệ nhân tạo.' })).toBe('cloze-auto');
  });
});
