# Đặc Tả Tính Năng Phase 4: PDF Text-Layer Engine & Persistent Highlights

## Feature: Trích xuất Text-Layer PDF, Quản lý Điểm Nhấn Bền Vững (Persistent Highlights) & Ngữ Cảnh Trích Đoạn

### Kịch bản 1: Lọc trích đoạn theo trang PDF (filterExcerptsForPdfPage)
- **Cho trước (Given):** Tài liệu PDF có 3 trích đoạn đã lưu:
  - Excerpt A ở trang 2 (`positionSelector.pageNumber = 2`)
  - Excerpt B ở trang 1 (`positionSelector.pageNumber = 1`)
  - Excerpt C là legacy không có `positionSelector.pageNumber` nhưng chứa văn bản "Năng lượng bảo toàn"
- **Khi (When):** Hệ thống gọi `filterExcerptsForPdfPage(excerpts, 2, page2Text)` với văn bản trang 2 chứa "Năng lượng bảo toàn"
- **Thì (Then):** Kết quả trả về gồm Excerpt A và Excerpt C, loại bỏ hoàn toàn Excerpt B.

### Kịch bản 2: Bọc thẻ highlight bền vững lên DOM Text-Layer (applyPdfTextLayerHighlights)
- **Cho trước (Given):** Một container DOM chứa các thẻ span text-layer của trang 2
- **Và (And):** Danh sách gồm 2 trích đoạn hợp lệ cho trang 2 với màu `#bbf7d0` và `#fef08a`
- **Khi (When):** Gọi `applyPdfTextLayerHighlights({ container, excerpts, activeExcerptId: 'ex-1' })`
- **Thì (Then):** Các TextNode tương ứng được bọc trong thẻ `<mark data-highlight-id="..." data-highlight-color="..." data-pdf-page="2">`
- **Và (And):** Thẻ mark ứng với `ex-1` có thuộc tính `data-active="true"` và class `ring-2 ring-amber-500`
- **Khi (When):** Gọi hàm cleanup trả về
- **Thì (Then):** Tất cả thẻ mark được gỡ bỏ và cây TextNode được nối liền (normalized) sạch sẽ.

### Kịch bản 3: Phân biệt cụm từ lặp lại nhờ Context Window (resolveMarkdownAnchor)
- **Cho trước (Given):** Trang PDF chứa hai cụm từ giống hệt "Đạo Đế" ở hai đoạn văn khác nhau
- **Và (And):** Excerpt chỉ định rõ `contextPrefix: "Khổ, Tập, Diệt, và"` và `contextSuffix: "là con đường tám nhánh"`
- **Khi (When):** Áp dụng highlight lên DOM
- **Thì (Then):** Chỉ cụm từ "Đạo Đế" thứ hai có ngữ cảnh khớp mới được bọc thẻ `<mark>`, không làm đổi màu nhầm cụm từ thứ nhất.

### Kịch bản 4: Trích xuất vùng chọn đi kèm cửa sổ ngữ cảnh (extractSelectionWithContextFromContainer)
- **Cho trước (Given):** Người dùng bôi đen cụm từ "Vô thường" nằm giữa câu văn trên container text-layer
- **Khi (When):** Gọi `extractSelectionWithContextFromContainer(container, 60)`
- **Thì (Then):** Kết quả trả về gồm `selectedText: "Vô thường"`, `contextPrefix` chứa tối đa 60 ký tự trước đó, và `contextSuffix` chứa tối đa 60 ký tự sau đó.

### Kịch bản 5: Fail-Closed khi tệp PDF lỗi hoặc môi trường không hỗ trợ Canvas/Worker
- **Cho trước (Given):** Đường dẫn tệp PDF 404 hoặc môi trường không có Worker
- **Khi (When):** Gọi `extractPdfPageText(invalidUrl, 1)`
- **Thì (Then):** Hàm trả về `{ pageNumber: 1, fullText: '', paragraphs: [], totalPages: 0 }` an toàn mà không ném unhandled error.
