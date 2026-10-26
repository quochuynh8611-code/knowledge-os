# ADR-115: Phase 11 — Obsidian & E-Ink Scholarly Round-Trip Bridge

## 1. Trạng Thái (Status)
- **Trạng thái:** 🟢 ACCEPTED & IMPLEMENTED (Complete & Verified: Phase 11A Engine + Phase 11B UI Integration & Round-Trip Ingestion)
- **Ngày quyết định:** 2026-10-26
- **Tác giả:** Staff Engineer & System Architect
- **Phạm vi:** Nâng cấp khả năng tương tác hai chiều (Round-Trip Interoperability) giữa Knowledge OS với Obsidian Vault và các thiết bị đọc E-Ink (Onyx Boox, Supernote, Kindle). Hỗ trợ chuẩn hóa YAML Frontmatter tương thích hoàn toàn với Obsidian Dataview plugin (`citekeys`, `doi`, `fsrs_avg_stability`, `fsrs_avg_difficulty`, `highlight_count`, `flashcard_count`), xuất trích đoạn nghiên cứu (`ResearchExcerpt`) dưới dạng Obsidian callout `> [!quote]` và thẻ nhớ FSRS dưới dạng `> [!question]`, biên dịch gói tài liệu đọc học thuật tối ưu hóa cho màn hình E-Ink phân tách rõ ràng câu hỏi ôn tập chủ động và đáp án đối chiếu, cùng parser Markdown + YAML hai chiều không làm mất mát định dạng toán học KaTeX hay trích dẫn Pandoc.

---

## 2. Bối Cảnh (Context)
Trong môi trường nghiên cứu học thuật của Knowledge OS:
1. **Sự gián đoạn mạch đọc giữa Desktop và E-Ink:** Học giả đọc và tra cứu tài liệu trên máy tính, nhưng thường xuyên mang thiết bị E-Ink (Boox, Kindle) ra ngoài để đọc sâu không xao nhãng. Hiện tại chưa có công cụ tổng hợp tài liệu chuyên khảo theo chủ đề thành một tập tin đọc duy nhất (Study Pack) với định dạng font chữ, bảng tổng quan tài liệu và cơ chế tự kiểm tra kiến thức (Self-Test Active Recall) phù hợp với cơ chế lật trang của màn hình mực điện tử E-Ink.
2. **Nhu cầu tương thích sâu với hệ sinh thái Obsidian Dataview:** Các học giả sử dụng Obsidian thường dựa vào plugin Dataview để lập bảng thống kê và truy vấn tài liệu theo các trường metadata. Các file Markdown xuất từ hệ thống trước đây mới chỉ có metadata cơ bản (`title`, `tags`), thiếu các trường học thuật quan trọng như `citekeys` (`[@vaswani2017]`), `doi`, và các chỉ số sức mạnh ghi nhớ FSRS (`fsrs_avg_stability`, `fsrs_avg_difficulty`).
3. **Mất mát dữ liệu khi đồng bộ hai chiều (Round-Trip Loss):** Khi học giả chỉnh sửa file Markdown trong Obsidian hoặc thêm ghi chú từ thiết bị E-Ink rồi nhập ngược lại vào Knowledge OS, các liên kết hai chiều `[[Wiki Links]]`, trích dẫn `> [!quote]` và metadata trong YAML frontmatter thường bị parse lỗi hoặc làm hỏng các công thức KaTeX (`$...$`) và hóa học `$\ce{...}$`.
4. **Tuân thủ quy chuẩn nghiêm ngặt:** Toàn bộ công cụ phải tuân thủ triệt để Zero-Default Universal Baseline (`ADR-076`) và Hermetic Test Guard (`ADR-077`), không phát sinh migration database hay phụ thuộc vào network.

---

## 3. Các Quyết Định Kiến Trúc (Architectural Decisions)

### Quyết định 1: Định Dạng Markdown Học Thuật Tương Thích Obsidian Dataview (`formatScholarlyTopicMarkdown` & `formatScholarlyLiteratureNote`)
- **Đối với Chủ đề (Topic Markdown):**
  - YAML Frontmatter mở rộng:
    ```yaml
    ---
    title: "Vật Lý Lượng Tử & Rối Lượng Tử"
    slug: "vat-ly-luong-tu"
    domain: "physics"
    category: "Vật Lý Hiện Đại"
    tags: ["quantum", "physics"]
    citekeys: ["@einstein1935", "@bell1964"]
    highlight_count: 5
    flashcard_count: 8
    fsrs_avg_stability: 14.2
    fsrs_avg_difficulty: 5.1
    progress: 75
    status: "in_progress"
    created: "2026-01-01"
    updated: "2026-10-26"
    ---
    ```
  - **Trích đoạn nghiên cứu (`ResearchExcerpt`):** Xuất dưới dạng callout chuẩn của Obsidian:
    ```markdown
    > [!quote] Trích đoạn (Trang 12)
    > Không có biến ẩn cục bộ nào có thể tái tạo toàn bộ các tiên đoán của cơ học lượng tử.
    > — *Nguồn: Bell (1964)*
    ```
  - **Thẻ nhớ FSRS (`Flashcard`):** Xuất dưới dạng callout câu hỏi:
    ```markdown
    > [!question] Thẻ nhớ FSRS (basic)
    > **Hỏi:** Điều kiện của bất đẳng thức Bell là gì?
    > **Đáp:** Tính định xứ (Locality) và tính thực tại (Realism).
    ```

- **Đối với Ghi chú Văn học Chuyên khảo (`formatScholarlyLiteratureNote` - `@citekey.md`):**
  - Tạo file riêng biệt đặt tại `Literature-Notes/@citekey.md`.
  - YAML frontmatter chứa `citekey`, `title`, `author`, `year`, `doi`, `type`, `stance`, `topic`.
  - Thân bài chứa danh sách toàn bộ trích dẫn đã đánh dấu trên tài liệu đó.

### Quyết định 2: Bộ Phân Tích Cú Pháp Hai Chiều (Lossless Round-Trip Markdown Parser - `parseScholarlyMarkdownNote`)
- Tiếp nhận file Markdown từ bên ngoài, bóc tách chính xác:
  - Khối YAML frontmatter (`--- ... ---`) thành dictionary có kiểu dữ liệu chuẩn (`title`, `slug`, `domain`, `tags`, `citekey`, `doi`, `author`, `year`, `stance`).
  - Danh sách liên kết `[[Wiki Links]]`, bao gồm cả typed link (`- **PREREQUISITE** (Trọng số 4/5): [[Toán Rời Rạc]]`) và inline link (`[[Chủ đề B]]`).
  - Khối trích dẫn callout `> [!quote] Trích đoạn (${locator})` thành mảng `ParsedExcerptCallout[]`.
  - Phần thân văn bản thuần túy (`bodyContent`), bảo toàn nguyên vẹn mọi ký tự toán học KaTeX (`$...$`, `$$...$$`) và trích dẫn Pandoc (`[@citekey]`).

### Quyết định 3: Trình Biên Dịch E-Ink Study Pack Đọc Không Xao Nhãng (`compileEInkStudyPackMarkdown`)
- Sinh một tập tin Markdown chuyên biệt dành cho thiết bị mực điện tử E-Ink:
  - Bố cục typographic độ tương phản cao, không phụ thuộc vào màu sắc (chỉ dùng đen/trắng/in nghiêng/đậm).
  - Có Trang Tiêu Đề, Mục Lục (`## Mục Lục`).
  - Nội dung bài học và bảng tổng quan Literature Review Matrix dạng bảng Markdown chuẩn.
  - **Phụ Lục Ôn Tập Chủ Động (Self-Test Active Recall):**
    - Nhằm phục vụ việc tự học trên máy đọc sách E-Ink mà không bị lộ đáp án ngay lập tức, toàn bộ câu hỏi ôn tập được gom vào phần `### Câu Hỏi Tự Đánh Giá`, còn phần đáp án được chuyển xuống cuối trang tại `### Đáp Án Đối Chiếu`.
    - Đối với thẻ Cloze (`{{c1::Đáp án}}`), phần câu hỏi sẽ tự động che phủ từ khóa thành `[...]`, và chỉ hiển thị đầy đủ trong phần đáp án.

### Quyết định 4: Tạo Cây Thư Mục Vault Ảo Hoàn Chỉnh (`buildScholarlyVaultFileMap`)
- Xây dựng cấu trúc thư mục logic chuẩn bị cho việc đóng gói ZIP tải về hoặc đồng bộ qua File System Access API:
  - `00_Map_Of_Content.md`: Bản đồ tổng quan liên kết mọi chủ đề.
  - `[Domain]/[Topic].md`: Các file chủ đề học thuật chuẩn Dataview.
  - `Literature-Notes/@citekey.md`: Thư mục chứa các ghi chú văn học theo mã trích dẫn.
  - `E-Ink-Study-Packs/[Title]-Study-Pack.md`: Thư mục chứa tài liệu học tập tối ưu cho máy đọc sách E-Ink.

---

## 4. Hậu Quả & Đảm Bảo (Consequences & Invariants)
- **Zero-Default Universal Baseline (`ADR-076`):** Không đưa bất kỳ danh mục hay chủ đề cố định nào vào logic đồng bộ. Nếu kho rỗng, trả về mảng rỗng an toàn.
- **Hermetic Test Guard (`ADR-077`):** Toàn bộ bộ chuyển đổi và parser là pure TypeScript, thực thi hermetic 100% trong môi trường test mà không gọi API máy chủ.
- **Tương thích ngược hoàn toàn:** Giữ nguyên các hàm tiện ích sẵn có trong `obsidian.ts`, bổ sung module chuyên biệt `academicVaultSync.ts` cho các tác vụ học thuật chuyên sâu.
