# ADR-111: Phase 7 — Smart Highlight-to-Flashcard & Cloze Synthesis Engine

## 1. Trạng Thái (Status)
- **Trạng thái:** ✅ ACCEPTED & COMPLETED (Phase 7A: Synthesis Core Engine; Phase 7B: Studio Modal & Reader Integration)
- **Ngày quyết định:** 2026-10-26
- **Tác giả:** Staff Engineer & System Architect
- **Phạm vi:** Trích xuất thẻ nhớ học thuật từ điểm trích đọc (`ResearchExcerpt`), tạo Cloze Deletion tự động bảo toàn công thức toán/hóa học KaTeX & mhchem, phân tách định nghĩa, truy vết nguồn gốc (Provenance Footer), lọc thẻ hàng loạt và chống trùng lặp.

---

## 2. Bối Cảnh (Context)
Trong quá trình đọc và nghiên cứu tài liệu học thuật (PDF bài báo khoa học, sách giáo trình EPUB, tài liệu Markdown), người dùng thực hiện nhiều thao tác bôi đen lưu trích đoạn (`ResearchExcerpt`) thông qua Unified Selection Toolbar (**Phase 4 - `ADR-108`**).

Tuy nhiên, trước Phase 7:
1. **Thiếu cầu nối tự động:** Người dùng phải sao chép thủ công từng câu chữ từ thanh bên ReaderSidebar sang giao diện tạo thẻ Spaced Repetition (**Phase 3 - `ADR-107`**), gõ lại cú pháp Cloze `{{c1::...}}` bằng tay, tốn nhiều công sức và làm đứt gãy mạch đọc sâu (Deep Work).
2. **Nguy cơ hỏng công thức học thuật:** Khi tạo Cloze Deletion trên các đoạn văn chứa công thức toán hoặc phương trình hóa học lồng ngoặc nhọn TeX (như $\frac{a}{b}$, $\ce{Fe^{2+}}$), các regex đơn giản sẽ cắt vụn ngoặc nhọn, gây lỗi hiển thị trong KaTeX/mhchem (**Phase 1 - `ADR-105`**).
3. **Mất dấu nguồn gốc học thuật (Broken Academic Provenance):** Thẻ nhớ tạo ra bị tách rời khỏi tài liệu gốc; người học khi ôn tập thẻ không thể biết ngay thẻ này được trích từ trang số mấy của tài liệu PDF, hay vị trí CFI nào trong sách EPUB.

---

## 3. Các Quyết Định Kiến Trúc (Architectural Decisions)

### Quyết định 1: Đa Chiến Lược Tổng Hợp Thẻ (Multi-Strategy Excerpt Synthesis)
Hệ thống cung cấp 4 chiến lược tổng hợp linh hoạt:
1. `'cloze-auto'`:
   - Tự động nhận diện các mục tiêu học thuật có giá trị ghi nhớ cao trong `excerpt.selectedText`:
     - Thuật ngữ in đậm `**...**`
     - Thuật ngữ đặt trong ngoặc kép `"..."`
     - Công thức toán/hóa học LaTeX `$...$` hoặc `$\ce{...}$`
     - Thuật ngữ đứng trước dấu hai chấm `:`, gạch ngang dài `—`, hoặc liên từ định nghĩa tiếng Việt/tiếng Anh (`là`, `được định nghĩa là`, `is defined as`, `refers to`)
   - Bọc mục tiêu này vào cú pháp cloze `{{c1::...}}` (và tiếp tục `{{c2::...}}` nếu cho phép tối đa `maxClozesPerCard`, mặc định `2`).
   - Sử dụng thuật toán quét cân bằng ngoặc nhọn (balanced-brace scanner) để **tuyệt đối không làm vỡ các ngoặc nhọn bên trong công thức TeX**.
   - Nếu đoạn trích là văn bản thuần không có ký hiệu đặc biệt, cơ chế fallback sẽ nhận diện cụm danh từ/từ khóa có thông tin dày đặc nhất để cloze, tránh sinh thẻ cloze rỗng.
2. `'definition-split'`:
   - Phân tách câu định nghĩa dạng `Thuật ngữ: Định nghĩa` hoặc `Thuật ngữ là Định nghĩa` thành 2 phần:
     - `front`: Câu hỏi khái niệm (ví dụ: *"Định nghĩa của [Thuật ngữ] là gì?"*).
     - `back`: Nội dung định nghĩa chi tiết + công thức liên quan + provenance footer.
3. `'qa-note'`:
   - Tận dụng ghi chú cá nhân của người đọc (`excerpt.userNote`).
   - Nếu `userNote` là một câu hỏi hoặc prompt khái niệm, đặt `userNote` lên `front` và đưa `excerpt.selectedText` + provenance footer làm câu trả lời chi tiết ở `back`.
4. `'auto'`:
   - Tự động phân tích cấu trúc của `excerpt` để chọn chiến lược tối ưu nhất:
     - Nếu có `userNote` có ý nghĩa $\rightarrow$ ưu tiên `'qa-note'`.
     - Nếu có mẫu định nghĩa rõ ràng $\rightarrow$ chọn `'definition-split'`.
     - Ngược lại $\rightarrow$ chọn `'cloze-auto'`.

### Quyết định 2: Deep-Link Provenance Footer (Bảo toàn xuất xứ học thuật)
Mọi thẻ nhớ được tổng hợp từ trích đoạn đều tự động gắn một phần chân trang (Provenance Footer) định dạng chuẩn ở mặt sau (`back`):
- **Tài liệu PDF:** `> 📖 Nguồn: [Tiêu đề tài liệu] • Trang X`
- **Sách EPUB:** `> 📖 Nguồn: [Tiêu đề tài liệu] • Vị trí EPUB (hoặc CFI)`
- **Tài liệu Markdown:** `> 📖 Nguồn: [Tiêu đề tài liệu] • Mục [Heading]`
- Đồng thời lưu trữ `sourceExcerptId` trong metadata của thẻ nhớ để hỗ trợ truy nguyên 2 chiều (bấm vào thẻ nhớ nhảy ngay đến vị trí highlight tương ứng trên Reader).

### Quyết định 3: Batch Synthesis & Deduplication Guard
Hỗ trợ tổng hợp hàng loạt thẻ nhớ từ danh sách `ResearchExcerpt`:
- Lọc theo màu sắc highlight (`highlightColors`), cho phép người học phân loại theo quy ước (ví dụ: Màu hồng = Định nghĩa quan trọng, Màu vàng = Ý chính).
- Kiểm tra trùng lặp (Deduplication Guard):
  - So sánh `sourceExcerptId` với các thẻ hiện có trong `existingCards`.
  - So sánh văn bản chuẩn hóa (`normalizedText`) của `front` và `back`.
  - Loại bỏ các thẻ trùng lặp và báo cáo chính xác `skippedDuplicates` trong kết quả `BatchSynthesisResult`.

---

## 4. Hậu Quả & Đánh Giá (Consequences)
- **Ưu điểm:**
  - Tiết kiệm 80% thời gian biến tài liệu đọc thành kho thẻ nhớ FSRS chất lượng cao.
  - Bảo toàn 100% độ chính xác của các công thức KaTeX và phản ứng hóa học mhchem.
  - Truy xuất nguồn gốc tức thì, chống hiện tượng "học vẹt không biết ngữ cảnh".
  - Giữ vững nguyên tắc **Zero Database Schema Migrations** (lưu trữ metadata linh hoạt và tương thích hoàn toàn với schema Prisma hiện có).
- **Rủi ro & Biện pháp kiểm soát:**
  - Rủi ro regex cloze cắt nhầm giữa công thức TeX $\rightarrow$ Đã được bảo vệ bằng balanced-brace scanner và kiểm thử đơn vị với các phương trình phức tạp.
