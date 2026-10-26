# Đặc Tả Kỹ Thuật Phase 9: Academic Manuscript Compiler & Live Citekey ([@key]) Engine

> **Tài liệu tham chiếu:** [`docs/adr/ADR-113-phase-9-academic-manuscript-compiler-and-citekey-engine.md`](../adr/ADR-113-phase-9-academic-manuscript-compiler-and-citekey-engine.md)<br>
> **Tác giả:** Staff Software Engineer / Technical Architect<br>
> **Trạng thái:** 🟢 READY FOR IMPLEMENTATION

---

## 1. Mục Tiêu & Phạm Vi (Goals & Scope)
Cung cấp bộ công cụ biên dịch bản thảo học thuật hoàn chỉnh cho Knowledge OS, kết nối các ghi chú rời rạc thành một bài báo/luận văn khoa học có cấu trúc, tự động phân giải các mã trích dẫn Pandoc/LaTeX `[@key]` thành định dạng chuẩn theo phong cách (APA 7, IEEE, MLA, Chicago, Harvard), tự động tạo danh mục tài liệu tham khảo đồng bộ, và xuất ra Markdown, LaTeX (`.tex` + `.bib`).

---

## 2. Mô Hình Dữ Liệu & Giao Diện TypeScript (Data Models)

```typescript
export type ManuscriptCitationStyle = 'apa' | 'ieee' | 'mla' | 'chicago' | 'harvard';

export interface CitekeyRegistryEntry {
  citekey: string;
  resource: Resource;
  authorLastName: string;
  year: string;
}

export interface ParsedCitationItem {
  citekey: string;
  locator?: string;
  rawToken: string;
}

export interface ParsedCitationCluster {
  fullMatch: string;
  startIndex: number;
  endIndex: number;
  items: ParsedCitationItem[];
}

export interface ManuscriptSectionInput {
  id: string;
  title: string;
  content: string;
}

export interface CompileManuscriptInput {
  title: string;
  author?: string;
  abstract?: string;
  bodyMarkdown?: string;
  sections?: ManuscriptSectionInput[];
  resources: Resource[];
  style?: ManuscriptCitationStyle;
  includeUncitedResources?: boolean;
  appendixMarkdown?: string;
}

export interface CompiledManuscriptResult {
  compiledMarkdown: string;
  bibliographyMarkdown: string;
  latexSource: string;
  bibtexSource: string;
  citedResources: Resource[];
  unresolvedCitekeys: string[];
  wordCount: number;
  citationCount: number;
  style: ManuscriptCitationStyle;
}
```

---

## 3. Quy Tắc Thuật Toán Cốt Lõi (Core Algorithms)

### 3.1. Thuật toán `buildCitekeyRegistry(resources: Resource[])`
1. Duyệt qua mảng `resources`:
   - Sinh base citekey bằng `generateResourceCitekey(resource)`.
   - Trích xuất `authorLastName` (chuẩn hóa họ tác giả, chữ cái đầu viết hoa nếu có thể, ví dụ: "Vaswani", "Nguyễn", "He").
   - Trích xuất `year` (4 chữ số hoặc "n.d.").
2. Nếu base key đã tồn tại trong registry cho một resource ID khác:
   - Thêm suffix chữ cái `b`, `c`, `d`, ... (ví dụ: `smith2023` -> `smith2023b` -> `smith2023c`).
3. Lưu vào `Map<string, CitekeyRegistryEntry>` với key là citekey duy nhất.

### 3.2. Thuật toán `extractCitationClusters(text: string)`
1. Regex quét cụm trích dẫn:
   `/(?<!!)(?:^|[^\w\\])\[(@[a-zA-Z0-9_-]+(?:\s*,\s*[^;\]]+)?(?:\s*;\s*@[a-zA-Z0-9_-]+(?:\s*,\s*[^;\]]+)?)*)\]/g`
2. Đảm bảo loại trừ:
   - Liên kết Markdown: `[text](url)` (ký tự tiếp theo ngay sau `]` là `(`).
   - Footnotes: `[^1]`.
   - RAG citations: `[^SRC-1]`.
3. Với mỗi cụm hợp lệ, tách theo dấu `;` thành các `ParsedCitationItem`:
   - Tách citekey (bỏ ký tự `@` ở đầu và khoảng trắng).
   - Tách locator nếu có sau dấu `,` (ví dụ `p. 42`, `tr. 15`).

### 3.3. Thuật toán `compileAcademicManuscript(input: CompileManuscriptInput)`
1. **Ghép văn bản (Assembly):**
   - Tiêu đề (`# {title}`).
   - Tác giả (`**Tác giả:** {author}`).
   - Tóm tắt (`### Tóm Tắt (Abstract)\n> {abstract}`).
   - Các sections (`## 1. {section.title}\n{section.content}`).
   - Hoặc `bodyMarkdown` trực tiếp nếu không có sections.
2. **Quét và phân giải citekeys:**
   - Với phong cách **Author-Year** (`apa`, `harvard`, `chicago`, `mla`):
     - Mỗi citekey hợp lệ được chuyển thành `(Author, Year, Locator)`.
     - Cụm đa trích dẫn gộp thành `(Author1, Year1, Loc1; Author2, Year2, Loc2)`.
   - Với phong cách **Numeric** (`ieee`):
     - Theo dõi số thứ tự xuất hiện lần đầu (`Map<string, number>`).
     - Tái sử dụng số thứ tự nếu cùng citekey xuất hiện lại nhiều lần.
     - Cụm đa trích dẫn định dạng: `[1, p. 4]`, `[2]` hoặc `[1], [2]`.
   - Nếu citekey không có trong registry:
     - Giữ placeholder an toàn `[@missingKey?]`.
     - Đưa `missingKey` vào `unresolvedCitekeys`.
3. **Sinh Bibliography (Tài liệu tham khảo):**
   - Danh sách tài liệu được trích dẫn (`citedResources`).
   - Với Author-Year: Sắp xếp theo bảng chữ cái tác giả / tiêu đề.
   - Với IEEE: Sắp xếp theo thứ tự chỉ số xuất hiện `[1]`, `[2]`, ...
   - Tạo khối `## Tài Liệu Tham Khảo (References)`.
4. **Sinh mã nguồn LaTeX (`.tex`) & BibTeX (`.bib`):**
   - Chuyển đổi Markdown sang LaTeX cơ bản (`#` -> `\section`, `##` -> `\subsection`, `**` -> `\textbf`, `*` -> `\textit`).
   - Chuyển `[@key, p. 4]` thành `\cite[p. 4]{key}` và `[@key]` thành `\cite{key}`.
   - Sinh tệp BibTeX chứa các mục cho toàn bộ `citedResources` với citekey khớp `\cite{key}`.
5. **Thống kê:**
   - Tính toán `wordCount` và `citationCount`.

### 3.4. Thuật toán `searchCitekeySuggestions(registry, query)`
- Tìm kiếm nhanh theo citekey, tiêu đề bài báo hoặc tên tác giả, phục vụ popup autocomplete khi người dùng gõ `@`.
