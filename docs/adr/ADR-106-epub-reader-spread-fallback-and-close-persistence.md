# ADR-106: EPUB Reader Spread Fallback & Close Persistence

## 1. Bối cảnh (Context)
Trong tab Thư viện Sách của Knowledge OS, người dùng gặp 2 lỗi nghiêm trọng khi đọc sách EPUB:
1. Khi đang đọc dở một chương sách, nếu bấm chuyển đổi giữa chế độ "Trang đôi" và "Trang đơn", cuốn sách lập tức bị nhảy ngược về trang 0 (trang bìa đầu sách).
2. Khi đóng trình đọc (bấm nút đóng hoặc phím `Esc`), tiến trình đọc trang cuối cùng thỉnh thoảng bị mất, sách mở lại không đúng vị trí.

## 2. Nguyên nhân kỹ thuật (Root-Cause Analysis)
1. Trong `EpubReaderAdapter.tsx`, hàm `handleRendition` bọc `rendition.display` với một khối `try/catch` có hành vi fallback lỗi thời: khi `display(target)` gặp lỗi trong quá trình re-layout bất đồng bộ của `rendition.spread()`, catch block tự động gọi `setLocation(0); return await originalDisplay(0);`.
2. Trong `UnifiedResearchReader.tsx`, khi người dùng bấm đóng reader (`handleCloseReader`), hàm gọi `persistPositionAsync()` rồi ngay lập tức gọi `onClose()`. Việc `onClose()` unmount component React khiến trình duyệt hủy bỏ request `fetch(..., { method: 'PATCH' })` đang gửi dở nếu chưa kịp thiết lập xong kết nối TCP/HTTP.

## 3. Quyết định đã áp dụng (Decisions)
1. **Loại bỏ hoàn toàn fallback mù về trang 0 trong `EpubReaderAdapter.tsx`**:
   - Khi `rendition.display(target)` thất bại do layout reflow của `spread`, hệ thống ghi log cảnh báo và **tuyệt đối không gọi `setLocation(0)` hay `originalDisplay(0)`**.
   - Vị trí đọc hiện tại của người dùng được bảo vệ nguyên vẹn trên state và ref.
2. **Bổ sung cờ `keepalive: true` khi đóng reader trong `UnifiedResearchReader.tsx`**:
   - Khi gọi `persistPositionAsync` từ `handleCloseReader`, bổ sung tùy chọn `{ keepalive: true }` vào request `fetch`.
   - Cờ này cho phép request PATCH tồn tại độc lập trong background của trình duyệt ngay cả khi component reader đã unmount hoàn toàn.

## 4. Những gì đã hoãn và Lý do (Deferred Scope & Rationale)
- **Hoãn can thiệp vào Auto-Registration cho Local Docs EPUB**:
  - *Lý do*: Luồng lưu vị trí và highlights cho tài liệu Obsidian Vault và các tài liệu đã nạp archive đã hoạt động ổn định. Việc bổ sung JIT auto-register cho thư mục `docs/books` đòi hỏi can thiệp vào tầng backend `archiveRoutes.ts` và cơ chế tính content hash trên Express server, tiềm ẩn nguy cơ mở rộng blast radius không cần thiết ở phase này.
- **Hoãn can thiệp vào Keyboard Navigation & Z-Index Pointer Events**:
  - *Lý do*: Qua phân tích mã nguồn `react-reader` (`EpubView.tsx`), thư viện đã có sẵn các trình lắng nghe sự kiện phím `keyup`. Chưa có bằng chứng lỗi phần cứng/DOM cụ thể, cần quan sát thêm qua manual testing trước khi can thiệp.

> **Lưu ý về phạm vi Acceptance**: Acceptance hiện tại đã đạt cho 2 lỗi production đã patch (loại bỏ fallback mù về trang 0 và đảm bảo persist khi đóng reader với keepalive); riêng local docs EPUB archive identity chưa được tuyên bố hoàn tất trong ADR này.

## 5. Phân tích Blast Radius (Blast Radius & Safety)
- **Mức độ rủi ro**: Cực kỳ thấp (**Minimal Blast Radius**).
- **Phạm vi tác động**:
  - Sửa đổi 12 dòng code cục bộ tại `EpubReaderAdapter.tsx` (xóa bỏ fallback 0).
  - Sửa đổi 6 dòng code cục bộ tại `UnifiedResearchReader.tsx` (bổ sung tùy chọn `keepalive: true`).
- **Phạm vi an toàn (Không bị ảnh hưởng)**:
  - Markdown reader: Độc lập 100%, bộ test 10/10 vẫn PASS.
  - PDF reader & Audio: Không bị ảnh hưởng.
  - Database & Prisma Schema: Không thay đổi bất kỳ trường dữ liệu nào.
  - Zero-Default Invariant: `INITIAL_CATEGORIES = []` được bảo toàn tuyệt đối.
