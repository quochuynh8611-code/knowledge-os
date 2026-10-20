# ADR-104: Persistent EPUB Highlight Layer via EpubJS Annotations API & Lifecycle Guard

## Status
Accepted (Đã triển khai & xác minh cho EPUB; Nhánh PDF chủ động hoãn lại / Deferred sang Future Milestone)

## Context
Phase R3d-A đã thiết lập thành công persistent highlights cho định dạng Markdown (text-layer trực tiếp, DOM mark/span injection kèm contextPrefix/contextSuffix disambiguation).
Giai đoạn Discovery Spike của Phase R3d-B đã xác định:
- **PDF**: Native `<embed>` viewer hoàn toàn không có text-layer DOM do ứng dụng kiểm soát -> **STOP**.
- **EPUB**: Ứng dụng sử dụng `react-reader` (`^2.0.15`) bọc `epubjs` (`^0.3.93`).
  + Cây DOM XHTML của EPUB nằm trong sandboxed iframe.
  + Chuẩn EPUB Canonical Fragment Identifier (CFI) là persistent anchor độc lập với layout, kích thước font, và chế độ trang đơn/đôi.
  + `epubjs` sở hữu native API `rendition.annotations` (`highlight`, `underline`, `mark`, `remove`) kết hợp với thư viện `marks-pane` (`^1.0.9`) để tạo lớp phủ SVG overlay không xâm lấn (non-destructive) lên trên văn bản sách.
  + Báo cáo Discovery Spike kết luận: **CONDITIONAL GREENLIGHT** — cần kiểm soát chặt chẽ lifecycle và xử lý fail-closed.

## Decision
1. **Persistent Anchor**:
   - Sử dụng `positionSelector.cfi` làm persistent anchor duy nhất và tối cao cho tài liệu EPUB.
   - Không áp dụng thuật toán regex offset của Markdown sang EPUB vì cấu trúc reflowable pagination và iframe DOM phân mảnh của EPUB hoàn toàn không tương thích với offset chuỗi thô.

2. **Component Interface & Prop Wiring**:
   - Mở rộng `EpubReaderAdapterProps` tại `src/components/reader/adapters/EpubReaderAdapter.tsx`:
     ```typescript
     excerpts?: ResearchExcerpt[];
     activeExcerptId?: string | null;
     onSelectExcerpt?: (excerpt: ResearchExcerpt) => void;
     ```
   - Nối dây (wiring) trong `src/components/reader/UnifiedResearchReader.tsx` để truyền:
     ```tsx
     <EpubReaderAdapter
       ...
       excerpts={documentHighlights}
       activeExcerptId={activeExcerptId}
       onSelectExcerpt={handleSelectExcerpt}
     />
     ```

3. **Lifecycle Synchronization & Annotation Management**:
   - Khi `rendition` được khởi tạo hoặc khi prop `excerpts` thay đổi, `EpubReaderAdapter` quản lý một annotation sync manager:
     - Duyệt danh sách `excerpts` có `positionSelector.cfi` hợp lệ.
     - Gọi `rendition.annotations.highlight(cfi, data, cb, className, styles)` với màu sắc tương ứng (`highlightColor` hoặc fallback `#fef08a`).
     - Gán callback `cb` kích hoạt `onSelectExcerpt(excerpt)`.
     - Lưu trữ danh sách CFI đã đăng ký để thực hiện diffing (recolor khi đổi màu, remove khi bị xóa khỏi danh sách excerpts).
   - Dọn dẹp (`cleanup`): Khi adapter unmount hoặc rendition đổi, tiến hành gỡ bỏ các annotations và event listeners để tránh memory leak và duplicate marks.

4. **Fail-Closed & Legacy Fallback Invariants**:
   - **Stale CFI**: Nếu một `cfi` bị lỗi cú pháp hoặc trỏ vào node không còn tồn tại trong file EPUB (khiến `rendition.annotations.highlight` ném ngoại lệ hoặc không tìm thấy Range), hệ thống bắt lỗi an toàn (catch error), ghi log warning nội bộ, bỏ qua highlight đó và **TUYỆT ĐỐI KHÔNG CRASH** rendition.
   - **Legacy Excerpt**: Excerpt không có `cfi` (chỉ có `headingId` hoặc `pageNumber`) sẽ không cố đoán vị trí trên EPUB DOM, nhưng vẫn hiển thị đầy đủ và nguyên vẹn trong `ReaderSidebar`.

5. **Aesthetics & Visual Feedback**:
   - Sử dụng CSS class `epubjs-hl` kèm inline styles:
     - `fill`: mã màu của excerpt (mặc định `#fef08a`).
     - `fill-opacity`: `0.35` (hoặc `0.6` khi active).
     - `mix-blend-mode`: `multiply`.
     - `cursor`: `pointer`.

## Consequences
- **Ưu điểm**:
  - Không phá vỡ pagination và reflow của `epubjs`.
  - Không thay đổi schema database / Prisma / backend contract.
  - Tận dụng 100% chuẩn quốc tế W3C EPUB CFI.
  - Tương thích 2 chiều hoàn hảo với `ReaderSidebar`.
- **Rủi ro & Giới hạn đã kiểm soát**:
  - `epubjs` có thể có edge case khi chapter chưa được nạp; việc đăng ký qua `rendition.annotations` đã tận dụng hook nội bộ của `epubjs` (`this.rendition.hooks.render.register`) để tự động re-inject khi chapter xuất hiện.
