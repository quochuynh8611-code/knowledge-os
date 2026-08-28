# ADR-044: Mở Rộng Hành Động Chuyên Sâu & Lịch Sử Lệnh Gần Đây Cho Command Palette

- **Mã ADR:** ADR-044
- **Trạng thái:** PROPOSED (PLANNING ONLY)
- **Ngày tạo:** 2026-08-28
- **Đề xuất bởi:** Lead Frontend Architect / Product Experience Lead
- **Phạm vi:** `src/hooks/useCommandPalette.ts`, `src/components/search/CommandPalette.tsx`

---

## 1. Bối Cảnh & Ranh Giới Thực Tế (Context & Boundary Truths)
Knowledge OS đang phát triển nhanh chóng với các studio và modal chuyên sâu (NotebookLM Studio, Antigravity Handoff, Abhidharma Matrix, Theme Toggle).
- **Modal Ownership & Extension Seam Truth**: Các modal tích hợp (`NotebookLMStudioModal`, `AntigravityHandoffModal`) hiện do `Navbar.tsx` sở hữu và quản lý state hiển thị cục bộ. `useCommandPalette` sử dụng extension seam `customItems?: CommandPaletteItem[]` (hoặc callback slots) để tiếp nhận và merge các deep actions từ caller mà không tự sở hữu modal visibility state.
- **Search Metadata Truth**: Tìm kiếm trong Command Palette hoạt động trên các trường dữ liệu có thực của `CommandPaletteItem` (`title`, `description`, `category`, `keywords`). Mọi metadata mở rộng như tags và slug được đưa vào mảng `keywords`.

---

## 2. Quyết Định Kiến Trúc (Architecture Decisions)

1. **Lịch Sử Lệnh Gần Đây Có Giới Hạn (LRU 5 Items via Safe Storage)**:
   - Lưu trữ tối đa 5 ID lệnh gần nhất trong khóa `phat_hoc_recent_commands_v1`.
   - Mỗi lần lệnh được thực thi (`executeItem`), ID của lệnh được đẩy lên đầu danh sách và loại bỏ trùng lặp.
   - Bọc toàn bộ thao tác I/O bằng `safeGetLocalStorageItem` và `safeSetLocalStorageItem` để đảm bảo không bao giờ ném ngoại lệ khi storage bị chặn hoặc quota đầy.
2. **Nguyên Tắc Hiển Thị Section "Gần Đây"**:
   - Khi `query === ""` (chưa gõ tìm kiếm): Hiển thị nhóm `"Gần đây"` ở đầu bảng kết quả.
   - Khi `query !== ""` (đang tìm kiếm): Ẩn section `"Gần đây"` để danh sách kết quả được gom nhóm tự nhiên theo danh mục thực thể, tránh làm giao diện bị rối và tránh kết quả bị lặp 2 lần.
3. **`customItems` Extension Seam Cho Deep Actions**:
   - Component sở hữu modal inject các deep actions (`act-open-notebooklm`, `act-open-antigravity`, ...) thông qua `customItems` hoặc callback slots.
   - `useCommandPalette` chịu trách nhiệm merge, index, filter và dispatch `executeItem(item)`.
4. **Không Can Thiệp Sync Subsystem & Backend**:
   - Kiến trúc thuần túy nằm ở tầng Client UI/Hook.

---

## 3. Đánh Giá Trade-offs (Trade-offs & Alternatives)

| Tiêu chí | Quyết định chọn | Lựa chọn thay thế bị bác bỏ | Lý do |
| :--- | :--- | :--- | :--- |
| **Extension Seam cho Modal Deep Actions** | Inject qua `customItems` / callback slots | Hook tự quản lý modal visibility states | Tuân thủ Single Responsibility: Navbar giữ quyền sở hữu modal lifecycle, hook chỉ điều phối action. |
| **Lưu Recent Commands vs Recent Search Queries** | Lưu **Recent Commands / Items** đã thực thi | Lưu chuỗi text truy vấn | Lưu command cho phép người dùng ấn `Enter` thực thi ngay lập tức mà không cần gõ lại. |
| **Section "Gần Đây" khi đang tìm kiếm** | Chỉ hiển thị khi `query === ""` | Luôn hiển thị section "Gần đây" ở mọi query | Hiển thị khi đang tìm kiếm gây trùng lặp kết quả (1 item xuất hiện 2 lần ở cả mục Gần đây và mục gốc). |
| **Dung lượng bộ đệm** | Giới hạn cứng 5 mục | Không giới hạn hoặc 20 mục | 5 mục là kích thước tối ưu vừa vặn chiều cao viewport của modal không gây tràn màn hình. |
