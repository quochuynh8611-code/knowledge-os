# ADR-113: Phase 9 — Academic Manuscript Compiler & Live Citekey ([@key]) Engine

## 1. Trạng Thái (Status)
- **Trạng thái:** 🟢 PROPOSED & IN PROGRESS (Phase 9A: Citekey Engine & Multi-Format Compiler; Phase 9B: ManuscriptStudioModal & UI Integration)
- **Ngày quyết định:** 2026-10-26
- **Tác giả:** Staff Engineer & System Architect
- **Phạm vi:** Trình biên dịch bản thảo học thuật đa phần (Multi-Note Manuscript Assembly), bộ phân tích cú pháp trích dẫn chuẩn Pandoc/LaTeX (`[@key]`, `[@key, p. 12]`, `[@key1; @key2]`), bộ phân giải trích dẫn theo phong cách (Author-Year: APA 7/Harvard/Chicago/MLA; Numeric: IEEE), tự động biên soạn danh mục tài liệu tham khảo (Auto-Bibliography), phát hiện citekey lỗi (`unresolvedCitekeys`), và xuất khẩu đồng thời sang Markdown, LaTeX (`.tex` + `.bib`) và HTML sẵn sàng in ấn.

---

## 2. Bối Cảnh (Context)
Trong quy trình làm việc của học giả, nhà nghiên cứu và nghiên cứu sinh (Horizon 2 - Academic Research OS):
1. **Thiếu khả năng trích dẫn nội dòng (In-Text Citation) chuẩn học thuật:** Người dùng khi soạn thảo ghi chú hoặc bài báo trong Knowledge OS phải nhập thủ công chuỗi trích dẫn thô (ví dụ: `(Vaswani et al., 2017)`) hoặc sao chép văn bản tĩnh từ CitationModal. Điều này dễ dẫn đến sai sót năm, thiếu trang tham chiếu (`p. 42`, `tr. 18`), và không thể chuyển đổi linh hoạt giữa các chuẩn trích dẫn khác nhau (APA sang IEEE hay Chicago).
2. **Không có cơ chế liên kết động giữa bản thảo và thư viện tài nguyên (`Resource[]`):** Trong hệ sinh thái Pandoc, Quarto và LaTeX, tiêu chuẩn vàng là sử dụng citekey dạng `[@vaswani2017]` hoặc `[@ye2024; @nguyen2023]`. Khi biên dịch bản thảo, hệ thống phải tự động tra cứu trong kho tài liệu, thay thế citekey bằng trích dẫn chuẩn và tự động sinh phần `Tài Liệu Tham Khảo (References)` ở cuối văn bản chỉ chứa những tài liệu thực sự được trích dẫn.
3. **Phân mảnh giữa ghi chú nghiên cứu và bài báo khoa học hoàn chỉnh:** Người nghiên cứu viết rải rác từng mục trong nhiều `Note` (Đặt vấn đề, Phương pháp, Kết quả, Thảo luận). Cần một công cụ cho phép ghép nối các section ghi chú thành một bản thảo liền mạch, bảo toàn công thức toán học KaTeX (`$E=mc^2$`), công thức hóa học mhchem (`$\ce{H2O}$`), và xuất ra định dạng LaTeX (`.tex`) kèm file trích dẫn BibTeX (`.bib`) chuẩn mực cho các tạp chí khoa học.
4. **Ràng buộc Zero-Database Migration & Zero-Default:** Toàn bộ quá trình biên dịch, phân giải citekey và sinh mã nguồn diễn ra hoàn toàn ở runtime bằng pure TypeScript functions, không thêm bất kỳ trường bắt buộc nào vào database Prisma.

---

## 3. Các Quyết Định Kiến Trúc (Architectural Decisions)

### Quyết định 1: Cú Pháp Trích Dẫn Pandoc/LaTeX (`[@key]`, `[@key, locator]`)
Hệ thống hỗ trợ cú pháp mở ngoặc vuông chuẩn Pandoc:
- Trích dẫn đơn: `[@vaswani2017]`
- Trích dẫn có định vị trang/chương: `[@vaswani2017, p. 42]`, `[@nguyen2023, tr. 18]`, `[@knuth1984, ch. 2]`
- Cụm trích dẫn đa tài liệu (Citation Cluster): `[@vaswani2017, p. 4; @ye2024; @he2016]`
- **Cơ chế chống xung đột ngữ pháp (Collision Avoidance):**
  - Biểu thức chính quy phải phân biệt rạch ròi với liên kết Markdown thông thường `[text](url)`.
  - Phân biệt với cước chú học thuật `[^1]` và thẻ trích nguồn RAG `[^SRC-1]`.
  - Biểu thức quy chuẩn: `\[(@[a-zA-Z0-9_-]+(?:\s*,\s*[^;\]]+)?(?:\s*;\s*@[a-zA-Z0-9_-]+(?:\s*,\s*[^;\]]+)?)*)\]`

### Quyết định 2: Registry Citekey Tất Định & Giải Quyết Trùng Lặp (Citekey Collision Disambiguation)
Hàm `buildCitekeyRegistry(resources: Resource[])` tạo một `Map<string, CitekeyRegistryEntry>`:
- Sử dụng thuật toán chuẩn học thuật từ Phase 8 (`generateResourceCitekey`) để sinh citekey gốc dạng `[tác_giả][năm]` (ví dụ: `vaswani2017`, `nguyen2023`, `he2016`).
- Tự động trích xuất họ tác giả (Western surname hoặc Vietnamese family name).
- **Xử lý trùng lặp (Collision Resolution):** Nếu hai tài liệu khác biệt có cùng tác giả và năm xuất bản (ví dụ hai bài báo của Smith năm 2023):
  - Tài liệu đầu tiên: `smith2023`
  - Tài liệu thứ hai: `smith2023b`
  - Tài liệu thứ ba: `smith2023c`, v.v.

### Quyết định 3: Phân Giải Theo Phong Cách Trích Dẫn & Tự Động Tạo Thư Mục Tham Khảo
Khi biên dịch văn bản:
1. **Phong cách Tác giả - Năm (`'apa' | 'harvard' | 'chicago' | 'mla'`)**:
   - Trích dẫn đơn: `[@vaswani2017]` $\rightarrow$ `(Vaswani, 2017)`.
   - Có định vị trang: `[@vaswani2017, p. 4]` $\rightarrow$ `(Vaswani, 2017, p. 4)`.
   - Cụm đa tài liệu: `[@vaswani2017; @ye2024]` $\rightarrow$ `(Vaswani, 2017; Ye, 2024)`.
   - Danh mục tài liệu tham khảo: Sắp xếp theo thứ tự bảng chữ cái (alphabetical) của tác giả/tiêu đề theo chuẩn tương ứng (`generateAPACitation`, `generateHarvardCitation`, v.v.).
2. **Phong cách Đánh số tuần tự (`'ieee'`)**:
   - Gán số thứ tự `[1]`, `[2]`, ... theo thứ tự xuất hiện đầu tiên trong bản thảo.
   - Nếu tài liệu `@vaswani2017` xuất hiện lần 1 được gán `[1]`, lần trích dẫn thứ 2 sau đó trong văn bản tiếp tục dùng `[1]`.
   - Có định vị trang: `[@vaswani2017, p. 4]` $\rightarrow$ `[1, p. 4]`.
   - Cụm đa tài liệu: `[@vaswani2017; @ye2024]` $\rightarrow$ `[1], [2]`.
   - Danh mục tài liệu tham khảo: Sắp xếp theo đúng thứ tự chỉ số `[1]`, `[2]`, ... bằng `generateIEEECitation(resource, index)`.
3. **Bảo vệ khóa trích dẫn không tồn tại (Unresolved Citekeys Guard)**:
   - Nếu tác giả nhập `[@nonexistent2099]`, hệ thống không ném lỗi mà thay thế bằng `[@nonexistent2099?]` trên bản thảo đã biên dịch.
   - Ghi nhận vào mảng `unresolvedCitekeys` để cung cấp phản hồi kiểm tra lỗi trực tiếp (linting feedback) cho học giả.

### Quyết định 4: Ghép Bản Thảo Đa Phần & Xuất Đa Định Dạng (Markdown, LaTeX .tex, BibTeX .bib)
Hàm `compileAcademicManuscript(input)`:
- Hỗ trợ ghép nhiều ghi chú `sections: ManuscriptSectionInput[]` thành các phần được đánh số học thuật (`## 1. Đặt Vấn Đề`, `## 2. Phương Pháp Luận`, ...).
- Giữ nguyên công thức toán học (`$...$`, `$$...$$`) và hóa học (`$\ce{...}$`).
- Sinh đồng thời:
  - `compiledMarkdown`: Văn bản Markdown hoàn chỉnh kèm danh mục `## Tài Liệu Tham Khảo (References)`.
  - `latexSource`: Tài liệu LaTeX chuẩn (`\documentclass[12pt]{article}`, `\usepackage{amsmath,amssymb,mhchem}`, `\usepackage{cite}`, chuyển `[@key, p. 4]` thành `\cite[p. 4]{key}`, chuyển formatting bold/italic, kèm `\bibliographystyle{plain}` và `\bibliography{references}`).
  - `bibtexSource`: Tệp `.bib` chứa các mục `@article`, `@book`, `@misc` cho đúng các tài liệu đã được trích dẫn trong bài báo với citekey khớp `\cite{key}`.
  - Bộ số liệu thống kê: `wordCount`, `citationCount`.

---

## 4. Hậu Quả & Đảm Bảo (Consequences & Invariants)
- **Zero-Default Universal Baseline (`ADR-076`):** Trình biên dịch không phụ thuộc vào bất kỳ category hay topic mặc định nào.
- **Hermetic Test Guard (`ADR-077`):** Toàn bộ engine là pure runtime logic, 100% cô lập, không gọi network hay I/O.
- **Tính toàn vẹn học thuật:** Tự động phát hiện lỗi trích dẫn thiếu, tự động khử trùng lặp trong thư mục tài liệu tham khảo, đồng bộ tuyệt đối giữa citekey trong `.tex` và khóa trong `.bib`.
