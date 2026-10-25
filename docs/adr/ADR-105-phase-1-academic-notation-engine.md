# ADR-105: Phase 1 — Academic Notation Engine (KaTeX, mhchem, Mermaid) & Collision Guards

## 1. Trạng Thái (Status)
- **Trạng thái:** ✅ ACCEPTED & COMPLETED (Hoàn tất 100% Chặng 1A, 1B, 1C)
- **Ngày quyết định:** 2026-10-25
- **Tác giả:** Staff Engineer & System Architect
- **Phạm vi:** Core Parser, Math & Chemistry Notation, Diagram Extraction, Typography & Cloze Collision Guards

---

## 2. Bối Cảnh (Context)
Knowledge OS đang trong chiến dịch nâng cấp thành **Academic Research Workstation**. Một công cụ học tập và nghiên cứu học thuật đòi hỏi:
1. Biểu diễn toán học chuẩn mực LaTeX (`$...$` cho inline math và `$$...$$` cho block math).
2. Biểu diễn phản ứng hóa học và đơn vị vật lý tự nhiên (`\ce{...}` và `\pu{...}` qua tiện ích mở rộng `mhchem`).
3. Biểu diễn sơ đồ quy trình, kiến trúc, cây phả hệ hoặc đồ thị khoa học qua cú pháp ```` ```mermaid ````.

Tuy nhiên, khi tích hợp các cú pháp ký hiệu học thuật vào hệ thống hiện tại, xuất hiện 3 nguy cơ xung đột kiến trúc nghiêm trọng:
- **Va chạm 1 (Currency vs Inline Math):** Ký hiệu đô la Mỹ `$100`, `từ $50 đến $100` trong tài liệu kinh tế / tài chính rất dễ bị các regex lỏng lẻo nhận nhầm thành inline math, gây vỡ giao diện hoặc lỗi render.
- **Va chạm 2 (Readability Typography vs LaTeX Chemical Arrows):** Hàm `normalizeMarkdownForDisplay` trong `src/lib/markdownReadability.tsx` chuyển đổi các ký tự ASCII như `->`, `<->`, `<=>`, `<=`, `>=`, `+-` thành ký tự Unicode `→`, `↔`, `⇔`, `≤`, `≥`, `±`. Nếu công thức hóa học `$\ce{2H2 + O2 -> 2H2O}$` hoặc `$\ce{Fe^{2+} + e- <=> Fe^{3+}}$` bị biến đổi trước khi đưa vào KaTeX, engine KaTeX/mhchem sẽ báo lỗi parse failure do không nhận diện được ký tự Unicode thay cho macro mũi tên.
- **Va chạm 3 (Cloze Deletion vs Nested LaTeX Braces):** Parser thẻ ôn tập `{{c1::answer::hint}}` trong `src/lib/clozeParser.ts` dùng regex lười `\{\{c(\d+)::([\s\S]*?)\}\}`. Với các biểu thức toán lồng nhiều ngoặc nhọn như `{{c1::$\frac{1}{1 + \frac{a}{b}}$::Phân số liên tục}}` hay `{{c1::$\ce{Fe^{2+}}$}}`, regex sẽ bị dừng sớm tại cặp `}}` đầu tiên, làm cắt cụt biểu thức và phá vỡ cấu trúc thẻ flashcard.

---

## 3. Các Quyết Định Kiến Trúc (Architectural Decisions)

### Quyết định 1: KaTeX + mhchem Synchronous Engine với LRU Cache & Security Sandbox
- Sử dụng thư viện `katex` đi kèm `import "katex/contrib/mhchem"`.
- Thực thi hoàn toàn đồng bộ (synchronous rendering) để đảm bảo không làm giật layout (zero CLS) và không gây flicker khi cuộn danh sách ghi chú/flashcards.
- Thiết lập bộ nhớ đệm LRU cache trong bộ nhớ với giới hạn tối đa 500 entries (key là chuỗi TeX + cờ displayMode).
- Cấu hình bảo mật sandbox nghiêm ngặt:
  - `throwOnError: false`: Không bao giờ ném unhandled exception làm crash ứng dụng; thay vào đó render fallback với style báo lỗi tinh tế hoặc text thô.
  - `trust: false`: Ngăn chặn triệt để tấn công XSS thông qua các lệnh TeX độc hại như `\href{javascript:...}` hoặc raw HTML injection.
  - Hỗ trợ macros cơ bản.

### Quyết định 2: Tách Rời Tầng Parser & Mermaid Dynamic Import Contract
- Ở tầng lõi `src/lib/academicNotation.ts`, cung cấp hàm tokenizer và parser nhận diện và bóc tách các khối ```` ```mermaid ```` thành các token có cấu trúc (`type: 'mermaid'`).
- Tầng parser không nạp thư viện `mermaid` (vốn có dung lượng bundle lớn ~2MB).
- `mermaid` chỉ được nạp qua Dynamic Import (`import('mermaid')`) khi component giao diện thực sự render trên màn hình (ở Chặng 1C), giữ cho bundle khởi tạo ban đầu nhẹ và tối ưu tốc độ tải trang.

### Quyết định 3: Chốt Chặn Va Chạm 1 (Currency vs Inline Math Tokenizer)
- Regex nhận diện inline math áp dụng các quy tắc phân định chặt chẽ:
  1. Hỗ trợ escape `\$` để hiển thị thành ký tự `$` thường trong văn bản prose.
  2. Dấu `$` mở của inline math **không** được theo sau bởi khoảng trắng hoặc tab `(?!\s)`.
  3. Dấu `$` đóng **không** được đi trước bởi khoảng trắng hoặc tab `(?<!\s)`.
  4. Nội dung giữa hai dấu `$` nếu thuần túy là số tiền tệ (ví dụ `$100$`, `$50.50$`) hoặc dấu `$` đóng bị dính liền sau bởi chữ số/chữ cái không khoảng trắng thì **không** xem là toán học.
  5. Không match qua nhiều dòng cho inline math (inline math phải nằm trên cùng một dòng; công thức nhiều dòng phải dùng block math `$$...$$`).

### Quyết định 4: Chốt Chặn Va Chạm 2 (Bảo Vệ Math & Chem trong `normalizeMarkdownForDisplay`)
- Trong `src/lib/markdownReadability.tsx`, bổ sung bước bảo vệ công thức toán/hóa học:
  - Vị trí thực hiện: **Ngay sau Bước 2 (Inline Code)** và **Trước Bước 4 & 5e (Chuẩn hóa Section & Typography Arrows)**.
  - Bảo vệ cả khối Block Math `$$[\s\S]*?$$` và Inline Math hợp lệ vào mảng `protectedTokens` với placeholder dạng `\u0000TOKEN_x\u0000`.
  - Nhờ đó, các mũi tên phản ứng hóa học `->`, `<->`, `<=>` và toán tử `<=`, `>=`, `+-` bên trong `$\ce{...}$` được bảo toàn nguyên vẹn cho KaTeX render.

### Quyết định 5: Chốt Chặn Va Chạm 3 (Balanced Brace Scanner cho Cloze Deletion)
- Nâng cấp `parseClozeDeletions` trong `src/lib/clozeParser.ts` từ regex lười sang thuật toán quét cân bằng ngoặc nhọn (balanced brace scanner):
  - Tìm vị trí bắt đầu `{{c\d+::`.
  - Duy trì biến đếm `braceDepth = 2` (bắt đầu từ 2 dấu `{` mở).
  - Quét từng ký tự tiếp theo: gặp `{` thì tăng `braceDepth++`, gặp `}` thì giảm `braceDepth--`.
  - Khi `braceDepth === 0` và hai ký tự trước đó là `}}`, đó chính là điểm kết thúc thực sự của thẻ cloze.
  - Phân tách `hint` bằng cách tìm `::` ở cấp độ ngoặc ngoài cùng (ngoài các cặp `{...}` của LaTeX).
  - Đảm bảo các công thức phức tạp như `{{c1::$\frac{1}{1 + \frac{a}{b}}$::Phân số}}` hay `{{c1::$\ce{Fe^{2+}}$}}` được bóc tách chuẩn xác 100%.

---

## 4. Hệ Quả & Đánh Giá (Consequences)
- **Tích cực:**
  - Hỗ trợ toàn diện công thức Toán, Lý, Hóa và Sơ đồ kỹ thuật chất lượng cao.
  - Hoạt động 100% offline, không phụ thuộc CDN hay mạng Internet.
  - Không phá vỡ trải nghiệm văn bản tiếng Việt hay các tài liệu tài chính có ký hiệu tiền tệ `$`.
  - Khắc phục triệt để lỗi thẻ flashcard bị cắt cụt khi chứa công thức LaTeX.
- **Tiêu cực / Ràng buộc:**
  - Bundle size tăng thêm một lượng cho thư viện `katex` (~250KB gzipped) và font glyphs. Tuy nhiên KaTeX được import cục bộ nên chạy rất nhanh.
  - Mermaid được dynamic import nên sơ đồ sẽ có một độ trễ nhỏ khi tải lần đầu.

---

## 5. Tài Liệu Tham Chiếu (References)
- [`docs/adr/ADR-076-commercial-domain-neutralization.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/adr/ADR-076-commercial-domain-neutralization.md)
- [`docs/PROJECT_STATUS.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/PROJECT_STATUS.md)
- [`src/lib/markdownReadability.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/lib/markdownReadability.tsx)
- [`src/lib/clozeParser.ts`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/lib/clozeParser.ts)
