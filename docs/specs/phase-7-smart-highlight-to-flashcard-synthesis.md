# Phase 7 Specification: Smart Highlight-to-Flashcard & Cloze Synthesis Engine

## 1. Giới Thiệu & Mục Tiêu Kỹ Thuật
Tài liệu đặc tả kỹ thuật cho **Phase 7A: Synthesis Core Engine** và **Phase 7B: UI Studio Modal & ReaderSidebar Integration**.
Hệ thống chuyển đổi tự động các điểm trích đọc học thuật (`ResearchExcerpt`) thành thẻ nhớ Spaced Repetition (`Flashcard`) tuân thủ chuẩn FSRS v5 (`ADR-107`) và hỗ trợ công thức toán học/hóa học KaTeX & mhchem (`ADR-105`).

---

## 2. Đặc Tả Dữ Liệu & Interface (`src/lib/highlightToFlashcardEngine.ts`)

```ts
export type SynthesisStrategy = 'auto' | 'cloze-auto' | 'definition-split' | 'qa-note';

export interface ExcerptInput {
  id: string;
  selectedText: string;
  userNote?: string | null;
  highlightColor?: string;
  sourceTitle?: string;
  sourceType?: string; // 'pdf' | 'epub' | 'md'
  pageNumber?: number;
  cfi?: string;
  headingId?: string;
  topicId?: string | null;
  tags?: string[];
  // Hỗ trợ cấu trúc lồng nhau từ ResearchExcerpt hiện hữu
  positionSelector?: {
    pageNumber?: number;
    cfi?: string;
    headingId?: string;
    format?: string;
    [key: string]: unknown;
  };
  citationSnapshot?: {
    title?: string;
    locator?: string;
    author?: string;
    [key: string]: unknown;
  } | null;
}

export interface SynthesizedFlashcardCandidate {
  id: string;
  sourceExcerptId: string;
  strategyUsed: Exclude<SynthesisStrategy, 'auto'>;
  front: string;
  back: string;
  isCloze: boolean;
  provenanceLabel: string;
  highlightColor?: string;
  topicId?: string;
  tags: string[];
}

export interface BatchSynthesisOptions {
  strategy?: SynthesisStrategy;
  colorFilter?: string[];
  topicId?: string;
  maxClozesPerCard?: number;
  includeUserNoteInBack?: boolean;
}

export interface BatchSynthesisResult {
  candidates: SynthesizedFlashcardCandidate[];
  skippedDuplicates: number;
  totalProcessed: number;
}
```

---

## 3. Các Hàm Cốt Lõi (Core Functions)

### 3.1 `formatExcerptProvenance(excerpt: ExcerptInput): string`
- Trích xuất thông tin nguồn:
  - Nếu `pageNumber` hoặc `positionSelector.pageNumber` có giá trị $\rightarrow$ PDF: `Trang ${pageNumber}`.
  - Nếu `cfi` hoặc `positionSelector.cfi` có giá trị $\rightarrow$ EPUB: `Vị trí EPUB` hoặc `CFI: ...`.
  - Nếu `headingId` hoặc `positionSelector.headingId` có giá trị $\rightarrow$ Markdown: `Mục: ${headingId}`.
- Trích xuất tiêu đề: `sourceTitle` hoặc `citationSnapshot.title` hoặc `"Tài liệu nghiên cứu"`.
- Định dạng trả về:
  `> 📖 Nguồn: [Tiêu đề] • [Vị trí]`

### 3.2 `detectBestSynthesisStrategy(excerpt: ExcerptInput): Exclude<SynthesisStrategy, 'auto'>`
- Nếu `excerpt.userNote` tồn tại và có độ dài $\ge 5$ ký tự $\rightarrow$ `'qa-note'`.
- Nếu văn bản thỏa mãn mẫu câu định nghĩa (`Term: Definition` hoặc `Term — Definition` hoặc `Term là Definition`) $\rightarrow$ `'definition-split'`.
- Mọi trường hợp khác $\rightarrow$ `'cloze-auto'`.

### 3.3 `synthesizeFlashcardFromExcerpt(excerpt: ExcerptInput, options?: { strategy?: SynthesisStrategy; topicId?: string; maxClozesPerCard?: number }): SynthesizedFlashcardCandidate`
- Áp dụng chiến lược:
  - **`'cloze-auto'`:**
    - Tìm kiếm thuật ngữ in đậm `**term**`, trong ngoặc kép `"term"`, công thức toán/hóa `$formula$`, hoặc cụm từ định nghĩa.
    - Đặt thẻ cloze `{{c1::term}}` (và `{{c2::...}}` nếu có nhiều mục tiêu và `maxClozesPerCard >= 2`).
    - Mặt trước (`front`) chứa đoạn văn kèm cloze deletion.
    - Mặt sau (`back`) chứa ngữ cảnh đầy đủ + ghi chú người dùng (nếu có) + provenance footer.
    - `isCloze: true`.
  - **`'definition-split'`:**
    - Tách phần thuật ngữ thành câu hỏi trên `front` (ví dụ: *"Định nghĩa của **[Thuật ngữ]** là gì?"*).
    - Đặt định nghĩa và provenance footer ở `back`.
    - `isCloze: false`.
  - **`'qa-note'`:**
    - Đặt `excerpt.userNote` ở `front`.
    - Đặt `excerpt.selectedText` + provenance footer ở `back`.
    - `isCloze: false`.

### 3.4 `synthesizeFlashcardBatchFromExcerpts(excerpts: ExcerptInput[], existingCards?: Array<{ front: string; back: string; sourceExcerptId?: string }>, options?: BatchSynthesisOptions): BatchSynthesisResult`
- Lọc theo `options.colorFilter` (so sánh mã màu không phân biệt hoa thường).
- Đối chiếu với `existingCards`:
  - Trùng `sourceExcerptId`.
  - Trùng lặp nội dung chuẩn hóa (`front` và `back`).
- Đếm số lượng trùng lặp vào `skippedDuplicates`.
- Trả về danh sách ứng viên `candidates` sẵn sàng lưu vào hệ sinh thái Flashcards.
