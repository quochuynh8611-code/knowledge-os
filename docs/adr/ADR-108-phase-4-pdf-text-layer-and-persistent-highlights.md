# ADR-108: Phase 4 — PDF Text-Layer Engine, Page-Scoped Persistent Highlights & Citation Deep-Linking

## 1. Trạng Thái (Status)
- **Trạng thái:** ✅ ACCEPTED & COMPLETED (Hoàn tất 100% Chặng 4A & Chặng 4B)
- **Ngày quyết định:** 2026-10-25
- **Tác giả:** Staff Engineer & System Architect
- **Phạm vi:** Core PDF Text-Layer Engine (`src/lib/pdfTextLayerEngine.ts`), Dynamic `pdfjs-dist` Extraction, Page-Scoped Persistent Highlight Reconciliation, Selection Context Window (Prefix/Suffix) Disambiguation, Deep-Link Navigation sang Note & Flashcard.

---

## 2. Bối Cảnh (Context)
Trước đây trong Phase R3d-B, nhánh PDF bị chủ động hoãn lại (Deferred trong [`docs/adr/ADR-104-phase-r3db-persistent-epub-highlight-layer.md`](ADR-104-phase-r3db-persistent-epub-highlight-layer.md)) vì trình đọc PDF gốc chỉ sử dụng thẻ `<embed src="...">` do trình duyệt quản lý, hoàn toàn không có cây DOM Text-Layer để ứng dụng Knowledge OS có thể truy cập, bọc thẻ `<mark>` hoặc phân tích tọa độ ngữ cảnh.

Trong môi trường trạm làm việc nghiên cứu học thuật (**Academic Research Workstation**), tài liệu PDF là định dạng quan trọng bậc nhất (chiếm hơn 70% tài liệu nghiên cứu, bài báo khoa học IEEE/ACM/arXiv, kinh điển dạng bản quét PDF OCR). Sinh viên và nhà nghiên cứu cần:
1. Đọc và trích dẫn trực tiếp từng câu/đoạn trên từng trang PDF cụ thể.
2. Lưu trữ các điểm highlight vĩnh viễn (Persistent Highlights) với 4 màu chuẩn (`#fef08a` vàng, `#bbf7d0` xanh lá, `#bae6fd` xanh dương, `#fecdd3` hồng).
3. Tự động phục hồi đúng các điểm highlight khi lật trang hoặc mở lại tài liệu mà không bị lệch hoặc đè chồng.
4. Trích xuất ngữ cảnh xung quanh (Selection Context Prefix & Suffix tối đa 60 ký tự) để phân biệt chính xác các cụm từ phổ biến xuất hiện lặp lại trên cùng một trang.
5. Tạo liên kết sâu (Deep-link) từ trích đoạn PDF sang Ghi chú (Note) và Thẻ nhớ (Flashcard) để học ngắt quãng qua FSRS v5.

---

## 3. Các Quyết Định Kiến Trúc (Architectural Decisions)

### Quyết định 1: Trích xuất Text-Layer động qua `pdfjs-dist` kèm Module Splitting
- Sử dụng dynamic import `await import('pdfjs-dist')` để không làm tăng kích thước bundle ban đầu và ngăn ngừa lỗi khi chạy trong môi trường SSR hoặc `jsdom` (Vitest).
- Tách `pdfjs-dist` vào vendor chunk độc lập `vendor-pdf` trong [`vite.config.ts`](../../vite.config.ts).
- Cung cấp hàm `extractPdfPageText(pdfUrl: string, pageNumber: number, loaderImpl?)` có cơ chế bộ nhớ đệm LRU cache theo key `${pdfUrl}::${pageNumber}`.
- Cung cấp hàm `extractPdfOutline(pdfUrl: string, loaderImpl?)` để đọc mục lục PDF sang `TocItem[]`.
- **Fail-Closed Invariant:** Nếu PDF không có text-layer (bản scan thuần túy chưa OCR) hoặc thư viện ném ngoại lệ mạng, engine chuyển hướng an toàn sang fallback (`sampleText` hoặc manual quote modal) mà tuyệt đối không làm crash giao diện đọc.

### Quyết định 2: Mô hình neo đậu theo trang (Page-Scoped Anchor Model)
- Cấu trúc neo trích đoạn PDF được định nghĩa qua `ResearchExcerpt.positionSelector`:
  ```typescript
  positionSelector?: {
    pageNumber?: number; // Số trang PDF (1-based)
    page?: number;       // Tương thích ngược
    headingId?: string;  // Dành cho Markdown
    cfi?: string;        // Dành cho EPUB
  }
  ```
- Hàm `filterExcerptsForPdfPage(excerpts, currentPage, pageText?)`:
  - Khớp trích đoạn có `pageNumber === currentPage`.
  - Hỗ trợ fallback cho trích đoạn cũ (legacy excerpts chưa gắn `pageNumber`) bằng cách kiểm tra sự xuất hiện của `selectedText` trong `pageText`.

### Quyết định 3: Tái sử dụng thuật toán Reconciliation từ Markdown
- Tái sử dụng `extractLinearTextFromDom`, `resolveMarkdownAnchor` và `clearDomHighlights` từ [`src/lib/markdownHighlightAnchor.ts`](../src/lib/markdownHighlightAnchor.ts).
- Hàm `applyPdfTextLayerHighlights` bọc các TextNode trong khoảng `[startIndex, endIndex]` bằng thẻ HTML:
  ```html
  <mark
    data-highlight-id="excerpt-id"
    data-highlight-color="#bbf7d0"
    data-pdf-page="2"
    data-active="true"
    class="research-highlight ring-2 ring-amber-500 shadow-xs"
    role="button"
    tabindex="0"
  >
    Nội dung trích đoạn
  </mark>
  ```
- Cơ chế dọn sạch hoàn toàn (`cleanup`) trước khi tiêm lại hoặc khi người dùng chuyển trang để triệt tiêu hiện tượng duplicate nodes và memory leak.

### Quyết định 4: Trích xuất cửa sổ ngữ cảnh (Context Window Extraction)
- Khi người dùng bôi đen văn bản trên text-layer, hàm `extractSelectionWithContextFromContainer(container, maxContextLen = 60)` lấy:
  - `selectedText`: Nội dung chính xác được chọn.
  - `contextPrefix`: Tối đa 60 ký tự văn bản nằm ngay trước vùng chọn trên cùng trang.
  - `contextSuffix`: Tối đa 60 ký tự văn bản nằm ngay sau vùng chọn trên cùng trang.
- Đảm bảo thuật toán `resolveMarkdownAnchor` giải quyết bài toán trùng lặp từ ngữ (homograph / repeated phrases) với tỷ lệ chính xác 100%.

---

## 4. Ràng Buộc & Tính Bất Biến (Invariants)
1. **Zero Database Migrations:** Không bổ sung bảng hay cột mới trong Prisma schema. Mọi trường ngữ cảnh đã được hỗ trợ sẵn trong bảng `ResearchExcerpt` (`selectedText`, `contextPrefix`, `contextSuffix`, `positionSelector`, `highlightColor`).
2. **Zero-Default Universal Workspace:** Không bổ sung danh mục hay chủ đề mặc định vào hệ thống.
3. **Hermetic Test Guard:** Không thực hiện HTTP call ra ngoài trong test.

---

## 5. Hệ Quả & Lợi Ích (Consequences)
- **Ưu điểm:**
  - Hoàn tất mảnh ghép lớn cuối cùng của hệ thống Research Reader (Markdown, EPUB, PDF).
  - Tận dụng lại 100% logic trích dẫn, sidebar highlights filter và sync queue đã hoàn thiện.
- **Rủi ro kiểm soát:**
  - File PDF kích thước lớn: Giải quyết bằng cơ chế trích xuất theo từng trang (page-by-page on demand) kèm LRU cache, tránh parse toàn bộ file vào RAM cùng lúc.
