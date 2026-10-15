# Session Log — Reader Highlights Filtering & Quick Search (Phase R3c)

## 1. Thông Tin Phiên Làm Việc (Session Metadata)
- **Đường dẫn dự án:** `/Users/mr.chem/Documents/Lap-trinh/Dashboard-update`
- **Chủ đề:**
  1. Hiện thực hóa **Phase R3c — Reader Highlights Filtering & Quick Search** trong `ReaderSidebar` theo quy trình test-first OODA nghiêm ngặt.
  2. Bổ sung tính năng tìm kiếm nhanh trích đoạn nghiên cứu (`selectedText`) và ghi chú người dùng (`userNote`) với cơ chế chuẩn hóa không phân biệt hoa thường và dấu tiếng Việt.
  3. Bổ sung thanh chip lọc màu sắc tương ứng 4 màu highlight (`#fef08a`, `#bbf7d0`, `#bae6fd`, `#fbcfe8`) và tùy chọn "Tất cả" kèm số đếm thời gian thực.
  4. Hỗ trợ bộ lọc kết hợp (AND), trạng thái rỗng khi không có kết quả với nút "Đặt lại bộ lọc", và phím `Escape` xóa nội dung ô tìm kiếm mà không đóng sidebar.
  5. Giữ vững ranh giới kỹ thuật: Zero DB/Prisma migration, không lưu vết filter vào `localStorage`, không ảnh hưởng Mind Map subsystem.
  6. Đồng bộ toàn diện tài liệu điều hành dự án `docs/PROJECT_STATUS.md`.
- **Thời gian:** 2026-10-15
- **Branch:** `main` (đồng bộ hoàn toàn với `origin/main` tại commit `0d28941`)
- **Role:** Staff Software Engineer / Reader Subsystem Lead
- **Trạng thái:** ✅ Đã hoàn thành 100%, vượt qua toàn bộ Quality Gates (TypeScript 0 errors, Vitest 503/503 test suites passed), 2 commits pushed remote, 2 GitHub Actions CI runs SUCCESS.

---

## 2. Bối Cảnh & Mục Tiêu Kỹ Thuật (Context & Technical Scope)

### 2.1. Nhu Cầu Người Dùng Sau Phase R3b
- Ở **Phase R3b**, hệ thống đã hỗ trợ palette 4 màu highlight và trình soạn thảo ghi chú inline trong `UnifiedResearchReader`.
- Khi người dùng đọc các tài liệu dài (sách, bài báo nghiên cứu, tài liệu PDF/Markdown), số lượng đoạn trích (`excerpts`) và ghi chú tăng lên đáng kể. Việc cuộn thủ công tìm lại một trích đoạn cụ thể hoặc gom nhóm các điểm mấu chốt theo màu sắc (ví dụ: vàng = ý chính, hồng = câu hỏi mở) trở nên tốn thời gian.
- **Yêu cầu đặt ra:** Cần có công cụ tìm kiếm tức thời và bộ lọc màu sắc ngay trên đỉnh panel Highlights của `ReaderSidebar`.

### 2.2. Ranh Giới Kỹ Thuật (Boundaries & Non-Goals)
- **Chỉ tác động UI:** Giới hạn trong `src/components/reader/ReaderSidebar.tsx` và test file đi kèm.
- **Zero Database / Storage Changes:** Không thay đổi Prisma schema, không đổi DataContext API contracts.
- **Không localStorage Persistence:** Không lưu query tìm kiếm hay màu đang lọc vào `localStorage` để tránh gây bẩn trạng thái khi người dùng chuyển đổi giữa các tài liệu khác nhau.
- **Không Personal Preference Overrides:** Giữ nguyên quy tắc 1-click highlight mặc định màu vàng của Phase R3b, không ghi nhớ tùy chọn màu cá nhân hóa ngầm.
- **Isolation:** Đảm bảo phím tắt `Escape` trong ô search input không làm đóng `ReaderSidebar` hoặc các modal/drawer ngoài mong muốn.

---

## 3. Kiến Trúc & Giải Pháp Thực Hiện

### 3.1. Chuẩn Hóa Tìm Kiếm Đa Ngôn Ngữ (`normalizeSearchText`)
Để người dùng có thể tìm kiếm tự nhiên cả tiếng Việt có dấu và không dấu:
```typescript
export function normalizeSearchText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
```
- Chuẩn hóa Unicode `NFD` phân tách ký tự gốc và dấu thanh.
- Regex bóc tách các combining diacritical marks.
- Chuyển toàn bộ về chữ thường và cắt tỉa khoảng trắng thừa.
- So khớp đồng thời trên cả `excerpt.selectedText` và `excerpt.userNote`.

### 3.2. Color Filter Chips & Live Counts
- Tái sử dụng bảng màu hằng số chuẩn `HIGHLIGHT_COLOR_PALETTE` từ `src/components/reader/UnifiedSelectionToolbar.tsx`:
  - `yellow`: `#fef08a` (Vàng)
  - `green`: `#bbf7d0` (Xanh lá)
  - `blue`: `#bae6fd` (Xanh dương)
  - `pink`: `#fbcfe8` (Hồng)
- Xử lý tương thích ngược: Các trích đoạn legacy không có trường `highlightColor` được tự động gán fallback về màu vàng (`#fef08a`), bảo đảm số đếm trên chip luôn chính xác 100%.
- Chip "Tất cả" hiển thị tổng số trích đoạn; từng chip màu hiển thị chấm tròn màu và số lượng trích đoạn mang màu đó.
- Giao diện tuân thủ WAI-ARIA với `role="group"` và thuộc tính `aria-pressed`.

### 3.3. Bộ Lọc Kết Hợp (AND Filtering) & Empty State
- Logic lọc áp dụng đồng thời:
  ```typescript
  const matchesColor = !selectedColorFilter || color === selectedColorFilter;
  const matchesSearch = !normQuery || normSelectedText.includes(normQuery) || normNote.includes(normQuery);
  return matchesColor && matchesSearch;
  ```
- Khi không có trích đoạn nào thỏa mãn đồng thời cả 2 điều kiện:
  - Hiển thị khối `highlights-empty-filter-state` với biểu tượng tìm kiếm và hướng dẫn rõ ràng.
  - Cung cấp nút "Đặt lại bộ lọc" (`btn-reset-highlights-filter`) để xóa nhanh cả từ khóa tìm kiếm và bộ lọc màu sắc chỉ với 1 cú click.

### 3.4. Cô Lập Sự Kiện Bàn Phím (Keyboard Event Isolation)
- Khi đang gõ trong search input, nếu người dùng nhấn `Escape`:
  ```typescript
  onKeyDown={(e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      setSearchQuery('');
    }
  }}
  ```
- `e.stopPropagation()` ngăn chặn sự kiện nổi bọt lên các handler cấp cao hơn của Reader hoặc AppShell, bảo toàn trạng thái mở của sidebar.

---

## 4. Quy Trình Kiểm Thử Test-First & Quality Gates

### 4.1. Bộ Kiểm Thử Đơn Vị Mới (`tests/unit/reader-sidebar-highlights-filter.test.tsx`)
Triển khai 7 kịch bản kiểm thử hành vi người dùng:
1. `filter by color`: Lọc đúng các trích đoạn màu xanh lá và ẩn các màu khác.
2. `search in selectedText`: Tìm kiếm không dấu (`"kien truc"`) khớp trích đoạn có dấu (`"kiến trúc"`).
3. `search in userNote`: Tìm kiếm từ khóa nằm trong phần ghi chú cá nhân.
4. `combined filter (AND)`: Chỉ hiển thị trích đoạn vừa có màu chỉ định vừa khớp từ khóa tìm kiếm.
5. `empty filtered state & reset`: Hiển thị giao diện rỗng khi không khớp và nút đặt lại bộ lọc phục hồi toàn bộ danh sách.
6. `Escape key handling`: Nhấn `Escape` xóa nội dung search input và không đóng sidebar cha.
7. `color counts badge`: Kiểm tra tính chính xác của số đếm trên chip "Tất cả" và từng chip màu.

### 4.2. Giai Đoạn Đỏ (RED Phase)
- Trước khi can thiệp code sản phẩm, chạy `npx vitest run tests/unit/reader-sidebar-highlights-filter.test.tsx`: Thất bại **7/7 test cases** đúng lý do thiếu input, thiếu chips và thiếu logic filter.

### 4.3. Giai Đoạn Xanh (GREEN Phase) & Hồi Quy Toàn Diện
- Sau khi implement tối thiểu trong `ReaderSidebar.tsx`:
  - `tests/unit/reader-sidebar-highlights-filter.test.tsx`: **7/7 PASS**.
  - `tests/unit/reader-sidebar-annotations.test.tsx`: **8/8 PASS**.
  - `tests/unit/selection-toolbar-color-palette.test.tsx`: **5/5 PASS**.
  - `tests/unit/data-context-excerpt-update.test.tsx`: **3/3 PASS**.
  - TypeScript Typecheck: **0 errors** (`npm run typecheck`).
  - Full Test Suite: **503/503 test files PASS** (4.305 passed, 3 skipped, 0 failed).
  - Production Build: **PASS** (Vite + Node server esbuild).
  - Git Diff Check: **Clean** (0 trailing whitespace).

---

## 5. Lịch Sử Commit & Giám Sát Remote CI

### 5.1. Commit Tính Năng (Feature Commit)
- **Commit SHA:** `5bd554e`
- **Subject:** `feat(reader): add highlights filtering and quick search`
- **Body:**
  - add search across excerpt text and user notes
  - add highlight color filter chips with counts
  - support combined filtering, reset state, and Escape clear
  - cover feature with dedicated unit tests
- **Tập tin thay đổi:**
  - `src/components/reader/ReaderSidebar.tsx` (+202 / -9 lines)
  - `tests/unit/reader-sidebar-highlights-filter.test.tsx` (+233 lines)
- **GitHub Actions CI:**
  - Run ID: `38677532285`
  - Thời lượng: 6m52s
  - Kết quả: **`success`** (Typecheck, Test 503/503 suites, Build hoàn tất 100%).

### 5.2. Commit Tài Liệu Trạng Thái Dự Án (Documentation Commit)
- **Commit SHA:** `0d28941`
- **Subject:** `docs(status): close Phase R3c reader highlights upgrade`
- **Tập tin thay đổi:**
  - `docs/PROJECT_STATUS.md` (+50 / -11 lines)
  - Cập nhật baseline `5bd554e`, chuyển R3c sang Completed, bổ sung R3c Closure section, đồng bộ bảng ứng viên tiếp theo.
- **GitHub Actions CI:**
  - Run ID: `38681409556`
  - Thời lượng: 6m33s
  - Kết quả: **`success`** (Typecheck, Test 503/503 suites, Build hoàn tất 100%).

---

## 6. Trạng Thái Hiện Tại & Định Hướng Tiếp Theo

### 6.1. Trạng Thái Kho Mã Nguồn
- Nhánh `main` đồng bộ hoàn toàn với `origin/main` (`ahead 0, behind 0`).
- Working tree sạch hoàn toàn (`nothing to commit, working tree clean`).
- Toàn bộ pipeline CI GitHub Actions đang ở trạng thái **GREEN**.

### 6.2. Các Ứng Viên Tiếp Theo (Roadmap Candidates)
1. **Phase M8 — Multi-Edge Selection & Cross-Link Batch Operations (P1):**
   - Hỗ trợ chọn nhiều liên kết chéo cùng lúc trên Canvas Mind Map.
   - Xóa hàng loạt hoặc chuyển đổi hàng loạt quan hệ ngữ nghĩa trên đồ thị tri thức.
2. **Phase R3d — Persistent Color Highlight Layer (P2):**
   - Nghiên cứu khả năng render tô màu trực tiếp lên DOM text layer của Markdown / PDF khi mở lại tài liệu mà không làm chậm hiệu năng rendering.
