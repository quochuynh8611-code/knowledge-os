# Spec: Phase 7A - Nghiên Cứu Rebrand, Neutralized Copywriting & Focus Note Reading UX

## 1. Context & Rationale

Ứng dụng đang có nền tảng cấu trúc rất tốt (App shell, DataProvider, SQLite/localStorage repository, Knowledge Graph, AI Research Studio, v.v.) nhưng giao diện bề mặt còn mang màu sắc quá chuyên biệt về Phật học / huyền học cổ truyền (như `Knowledge OS`, `Kho Ghi Chú & Chiêm Nghiệm`, `Ma Trận Vi Diệu Pháp`, `Dịch Học & Kỳ Môn`, `Từ Điển Đa Ngữ Pali/Hán`). Điều này khiến người dùng phổ thông hoặc người nghiên cứu các lĩnh vực khoa học, xã hội, liên ngành khó tiếp cận.

Đồng thời:
1. **Ghi chú (Notes)**: Thiếu chế độ đọc tập trung (Focus Reading View). Khi click vào card ghi chú, người dùng bị giới hạn trong khung card nhỏ, khó đọc các ghi chép dài hoặc định dạng markdown chi tiết.
2. **Typography / Readability**: Mật độ chữ dày, nhiều nhãn hoa và cỡ chữ nhỏ (`text-xs`, `text-[10px]`) làm trải nghiệm đọc bị gò bó.

Phase 7A tập trung tái định vị bề mặt hiển thị thành **Không Gian Nghiên Cứu Đa Lĩnh Vực**, trung tính hóa copywriting, nâng cao tính khả dụng của việc đọc ghi chú, đồng thời **tuyệt đối giữ nguyên tầng dữ liệu, storage key và domain data logic**.

---

## 2. Scope & In-Scope Changes

### A. Surface Branding & Copywriting Neutralization
1. **Header / Navbar Branding**:
   - Chuyển `Knowledge OS` và `Nghiên Cứu Phật Học & Huyền Học` thành `Nghiên Cứu` / `Hệ thống Không Gian Nghiên Cứu Đa Lĩnh Vực`.
   - Giữ nguyên các chức năng (Timer, Export/Import, Obsidian, NotebookLM, Handoff, Theme).
2. **Sidebar Navigation**:
   - Trung tính hóa nhãn điều hướng:
     - `Tổng Quan Nghiên Cứu` -> `Tổng quan`
     - `Antigravity AI Scholar` -> `AI hỗ trợ`
     - `Quản Lý & Cây Chủ Đề` -> `Chủ đề`
     - `Biểu Đồ Tri Thức (Graph)` -> `Bản đồ tri thức`
     - `Tiến Độ & Ôn Tập (SM-2)` -> `Tiến độ`
     - `Ghi Chú & Wiki Link` -> `Ghi chú`
     - `Tài Liệu & Thư Viện` -> `Tài liệu`
     - `Tra Cứu Chuyên Sâu` -> `Tìm kiếm`
   - Gom các công cụ chuyên biệt vào nhóm **Công cụ mở rộng**:
     - `Ma Trận Vi Diệu Pháp` -> `Ma trận phân tích` (badge `Abhidharma`)
     - `Dịch Học & Kỳ Môn` -> `Mô hình hệ thống` (badge `Dịch học`)
     - `Từ Điển Đa Ngữ Pali/Hán` -> `Từ điển thuật ngữ` (badge `Từ điển`)
   - Tên section lĩnh vực: `Lĩnh Vực Khảo Cứu` -> `Lĩnh vực nghiên cứu`.
3. **Shortcuts Modal**:
   - Đổi `Knowledge OS • SuperMemo-2 Ready` thành `Nghiên Cứu • Hỗ trợ ghi nhớ khoa học`.
   - Cập nhật mô tả phím tắt rõ ràng, trung tính.
4. **Command Palette & Hooks**:
   - Cập nhật placeholder và category title trung tính, dễ tiếp cận hơn cho mọi đối tượng.
5. **Dashboard & Topic Detail**:
   - Đổi các copy hoa mỹ/huyền học sang văn phong học thuật trung tính, gãy gọn.

### B. Focus Note Reading UX (Chế độ đọc ghi chú chuyên sâu)
1. **Note Card Click Interaction**:
   - Khi nhấp vào thân card hoặc nút "Đọc ghi chú" trên card ghi chú trong `NotesManager`, mở một **Focus Note Reader Modal** (hoặc side panel) thoáng đãng, dễ đọc.
2. **Focus Note Reader Spec**:
   - Tiêu đề nổi bật, phân loại rõ ràng (Học tập, Phát hiện / Ý tưởng, Thắc mắc, Tóm tắt).
   - Nội dung markdown hiển thị với cỡ chữ chuẩn (`text-sm` / `text-base`), line-height thoáng (`leading-relaxed`), padding rộng rãi.
   - Hỗ trợ đầy đủ Wiki Links `[[Tên chủ đề]]` có thể nhấp để điều hướng.
   - Hỗ trợ hiển thị và sao chép `sourcePath` nếu có.
   - Hỗ trợ chuyển nhanh sang chế độ Chỉnh sửa (`Sửa`) hoặc Đóng (`Esc` / nút `Đóng`).

### C. Typography & Readability Improvements
1. Tăng cỡ chữ tối thiểu ở mobile nav từ `text-[10px]` lên `text-xs` vừa vặn.
2. Giảm bớt các badge màu sắc rối mắt, tăng tương phản đọc text trên nền sáng/tối.

---

## 3. Out of Scope (Tuyệt đối không làm trong Phase 7A)

1. **Storage Keys & Persistence**:
   - Không đổi key `phat_hoc_huyen_hoc_topics`, `phat_hoc_huyen_hoc_notes`, `phat_hoc_huyen_hoc_categories`, v.v.
   - Không migrate database schema SQLite hay localStorage key để tránh phá vỡ tương thích dữ liệu cũ.
2. **Domain Data Logic**:
   - Không xóa hay thay đổi cấu trúc dữ liệu của 89 Tâm, 64 Quẻ, Từ điển hay 35 topics mẫu.
   - Mọi data query và category filtering vẫn hoạt động bình thường.
3. **Untracked Artifacts 6k.c**:
   - Tuyệt đối không chạm vào 3 tệp 6k.c đã nêu trong quy tắc an toàn.

---

## 4. Blast Radius Analysis & Mitigation

| Vùng ảnh hưởng | Rủi ro tiềm ẩn | Biện pháp kiểm soát & Kiểm thử |
|---|---|---|
| `Navbar.tsx` | Đổi title/badge có thể ảnh hưởng tests tìm kiếm text | Kiểm tra và cập nhật test assertions tương ứng trong `tests/unit/phase1a-components.test.tsx` |
| `Sidebar.tsx` | Đổi label có thể làm test navigation bị miss label cũ | Thêm test case cho các label mới trong sidebar/command palette |
| `ShortcutsModal.tsx` | Đổi copy footer và shortcut descriptions | Cập nhật `tests/unit/keyboard-shortcuts.test.tsx` |
| `NotesManager.tsx` | Đổi header & thêm Focus Reading Mode | Viết test riêng cho Focus Note Reader modal & đóng modal |
| `useCommandPalette.ts` | Thay đổi keywords/titles | Kiểm tra `tests/unit/command-palette.test.tsx` đảm bảo vẫn tìm được các lệnh |

---

## 5. Architectural Decision Record (ADR)

- **Quyết định 1**: Dùng Modal đọc ghi chú (`FocusNoteReaderModal` hoặc tích hợp modal reading state trong `NotesManager`) thay vì side panel để tối ưu cho cả desktop lẫn mobile mà không gây giật layout (layout shift) của danh sách 2 cột hiện tại.
- **Quyết định 2**: Giữ nguyên toàn bộ ID của `ActiveTab` (`dashboard`, `topics`, `abhidharma_matrix`, `divination_matrix`, `lexicon`, `graph`, `progress`, `notes`, `resources`, `search`, `ai_studio`) để đảm bảo các router, shortcut phím tắt và persistence không bị gãy.
