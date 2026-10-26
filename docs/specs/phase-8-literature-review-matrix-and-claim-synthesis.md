# Phase 8 Specification: Literature Review Matrix & Claim Synthesis Engine

## 1. Giới Thiệu & Mục Tiêu Kỹ Thuật
Tài liệu đặc tả kỹ thuật cho **Phase 8A: Matrix Extraction Engine & Claim Synthesis** và **Phase 8B: UI Matrix View & ResourcesManager Integration**.
Cung cấp công cụ phân tích và so sánh đa tài liệu học thuật theo ma trận 5 chiều chuẩn quốc tế (*Research Question, Methodology, Key Findings, Limitations, Stance*), nhận diện tranh luận học thuật (Contradiction Detection) và xuất bản sang Markdown/CSV.

---

## 2. Đặc Tả Dữ Liệu & Interface (`src/lib/literatureMatrixEngine.ts`)

```ts
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
  coverageScore: number; // 0.0 - 1.0 (tỷ lệ các ô cốt lõi được điền)
}

export interface BuildMatrixOptions {
  topicId?: string;
  stanceFilter?: ScholarlyStance | 'all';
  searchQuery?: string;
  excerpts?: ResearchExcerpt[];
  notes?: Note[];
}
```

---

## 3. Các Hàm Cốt Lõi (Core Functions)

### 3.1 `generateResourceCitekey(resource: { title: string; author?: string; year?: string; createdAt?: string }): string`
- Trích xuất họ tác giả đầu tiên (chuyển sang chữ thường không dấu, ví dụ `Nguyen`, `Vaswani`).
- Kết hợp năm xuất bản `year` (4 chữ số, e.g. `2017`).
- Kết hợp 1 từ khóa có nghĩa đầu tiên của tiêu đề (nếu cần để tránh trùng lặp).
- Kết quả ví dụ: `vaswani2017`, `nguyen2025`.

### 3.2 `getMatrixRowOverrides(): Record<string, LiteratureMatrixOverride>`
- Đọc an toàn từ `localStorage` key `knowledge_os_literature_matrix_v1`.
- Trả về đối tượng rỗng `{}` nếu môi trường SSR hoặc chưa có dữ liệu.

### 3.3 `saveMatrixRowOverride(resourceId: string, override: Partial<LiteratureMatrixOverride>): LiteratureMatrixOverride`
- Gộp các trường mới vào bản ghi hiện có của `resourceId`.
- Đính kèm `updatedAt: new Date().toISOString()`.
- Lưu lại vào `localStorage`.

### 3.4 `clearMatrixRowOverride(resourceId: string): void`
- Xóa bản ghi đè của `resourceId` trong `localStorage`.

### 3.5 `buildLiteratureMatrixRow(resource: Resource, options?: { excerpts?: ResearchExcerpt[]; notes?: Note[]; override?: LiteratureMatrixOverride }): LiteratureMatrixRow`
- Trích xuất siêu dữ liệu học thuật bằng `extractAcademicMetadataFromResource(resource)`.
- Loại bỏ các khối chú thích ẩn `<!-- academic-metadata: ... -->` và `[ACADEMIC_META]`.
- Quét các nhãn cấu trúc:
  - `researchQuestion`: `/(?:mục tiêu|câu hỏi|objective|research question|goal)\s*[:—]\s*([^\n]+)/i`
  - `methodology`: `/(?:phương pháp|methodology|method|mô hình|thiết kế)\s*[:—]\s*([^\n]+)/i`
  - `keyFindings`: `/(?:kết quả|phát hiện|luận điểm|findings|results|claim)\s*[:—]\s*([^\n]+)/i`
  - `limitations`: `/(?:hạn chế|giới hạn|limitations|gap|chưa giải quyết)\s*[:—]\s*([^\n]+)/i`
- Bổ trợ từ `excerpts` và `notes` liên kết nếu trường tìm kiếm còn thiếu hoặc ngắn.
- Xác định `stance` tự động dựa trên từ khóa phân loại.
- Áp dụng các trường trong `override` (nếu có) để đè lên giá trị tự động.

### 3.6 `buildLiteratureMatrix(resources: Resource[], options?: BuildMatrixOptions): LiteratureMatrixRow[]`
- Tải từ điển overrides từ `getMatrixRowOverrides()`.
- Xây dựng từng hàng `buildLiteratureMatrixRow`.
- Áp dụng các bộ lọc: `topicId`, `stanceFilter`, `searchQuery`.

### 3.7 `analyzeLiteratureSynthesis(rows: LiteratureMatrixRow[]): LiteratureSynthesisSummary`
- Đếm tổng số lượng và phân loại theo từng lập trường `stance`.
- Nhóm theo `topicId`, phát hiện các tài liệu có `stance === 'contradicts'` song song với các tài liệu `'supports'` để sinh `contradictionAlerts`.
- Tính `coverageScore`.

### 3.8 `exportLiteratureMatrixToMarkdown(rows: LiteratureMatrixRow[], summary?: LiteratureSynthesisSummary): string`
- Sinh bảng Markdown chuẩn 7 cột: `Tài liệu (Citekey)`, `Tác giả & Năm`, `Mục tiêu / Câu hỏi`, `Phương pháp`, `Phát hiện chính`, `Hạn chế`, `Lập trường`.
- Escape ký tự `|` bên trong nội dung các ô.
- Đính kèm tóm tắt tổng quan học thuật.

### 3.9 `exportLiteratureMatrixToCsv(rows: LiteratureMatrixRow[]): string`
- Định dạng CSV chuẩn RFC-4180.
- Bọc dấu nháy kép `"` cho các trường có dấu phẩy, dấu nháy kép hoặc ngắt dòng.
