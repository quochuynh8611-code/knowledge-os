# ADR-045: Tích Hợp Caller Command Palette & Thứ Tự Danh Mục Tất Định

- **Mã ADR:** ADR-045
- **Trạng thái:** APPROVED
- **Ngày tạo:** 2026-08-28
- **Đề xuất bởi:** Lead Frontend Architect / Product Experience Lead
- **Phạm vi:** `src/App.tsx`, `src/components/layout/Navbar.tsx`, `src/components/search/CommandPalette.tsx`

---

## 1. Bối Cảnh (Context)
Tại Phase P5.0, hook `useCommandPalette` đã chuẩn hóa extension seam `customItems`. Tuy nhiên, các modal tích hợp (`NotebookLMStudioModal`, `AntigravityHandoffModal`) hiện đang nằm kín trong state nội bộ của `Navbar.tsx`, khiến `App.tsx` chưa thể kết nối các hành động này vào thanh lệnh `⌘K`. Đồng thời, thứ tự các section danh mục trong `CommandPalette.tsx` khi tìm kiếm đang phụ thuộc vào vị trí kết quả đầu tiên, gây xáo trộn trải nghiệm thị giác.

---

## 2. So Sánh Hai Phương Án Kiến Trúc (Options Comparison)

### Phương Án 1 (Được Chọn): Nâng Modal State Lên `App.tsx` (Lifting State to App.tsx)
- **Mô tả**: Chuyển quyền quản lý `showNotebookLMModal` và `showAntigravityModal` lên component gốc `App.tsx` (ngang hàng với `showShortcutsModal` và `CommandPalette`). `App.tsx` truyền hàm mở modal xuống `Navbar` qua props, đồng thời inject vào `useCommandPalette({ customItems })`.
- **Ưu điểm**:
  - Kiến trúc rõ ràng: Toàn bộ các modal ứng dụng toàn cục (Global Modals) được quản lý tập trung tại một nơi duy nhất (`App.tsx`).
  - Trực tiếp và tự nhiên: `App.tsx` là nơi khởi tạo `useCommandPalette`, nên việc inject `action: () => setShowNotebookLMModal(true)` không cần qua tầng trung gian nào.
  - Loại bỏ việc `Navbar` phải đóng vai trò "kho chứa modal" không đúng với trách nhiệm điều hướng chính của nó.
- **Nhược điểm**: Cần cập nhật `NavbarProps` để nhận các handler mở modal.

---

### Phương Án 2 (Bác Bỏ): Giữ Nguyên Modal State Trong `Navbar.tsx` & Truyền Callback Ngược Lên
- **Mô tả**: Giữ `useState(showNotebookLMModal)` trong `Navbar.tsx`. `Navbar` nhận một prop `onRegisterCustomItems` hoặc truyền callback ngược lên `App.tsx` khi mount để `App.tsx` nạp vào palette.
- **Ưu điểm**: Không cần di chuyển vị trí render của các component modal.
- **Nhược điểm**:
  - Dòng dữ liệu ngược (Inverted Data Flow): Việc component con (`Navbar`) truyền hàm setter ngược lên component cha (`App`) trong lifecycle `useEffect` gây re-render không cần thiết và tiềm ẩn race conditions.
  - Phân mảnh quản lý modal: Một số modal nằm ở `App.tsx`, một số modal lại nằm ở `Navbar.tsx`.

---

## 3. Quyết Định Kiến Trúc (Architecture Decisions)

1. **Áp Dụng Phương Án 1 (Lifting State to `App.tsx`)**:
   - Quản lý `showNotebookLMModal` và `showAntigravityModal` tại `App.tsx`.
   - `NavbarProps` nhận thêm `onOpenNotebookLMModal?: () => void` và `onOpenAntigravityModal?: () => void`.
   - `App.tsx` truyền `customItems` chứa 2 hành động mở NotebookLM và Antigravity vào `useCommandPalette`.
2. **Thiết Lập Thứ Tự Danh Mục Tất Định (Deterministic Category Ordering)**:
   - Trong `CommandPalette.tsx`, các nhóm danh mục luôn được hiển thị theo thứ tự cố định:
     `CATEGORY_ORDER = ["Gần đây", "Hành động nhanh", "Điều hướng", "Chủ đề", "Ghi chú"]`.
3. **Zero Impact To Core Subsystems**:
   - Không thay đổi bất kỳ thành phần nào của Offline Sync Subsystem hay Antigravity Pipeline.
