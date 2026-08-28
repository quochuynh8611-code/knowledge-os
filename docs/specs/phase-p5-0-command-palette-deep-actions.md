# Technical Specification: Phase P5.0 — Command Palette Deep Actions & Recent History

## 1. Problem Statement & Motivation
Command Palette (`⌘K` / `Ctrl+K`) hiện tại cung cấp các lệnh điều hướng cơ bản và một số hành động nhanh tĩnh. Tuy nhiên:
1. **Thiếu Lịch Sử Thao Tác Gần Đây (Recent History)**: Người dùng mỗi khi mở Command Palette đều phải duyệt hoặc gõ tìm kiếm lại từ đầu, làm giảm tốc độ thao tác của operator.
2. **Cơ Chế Mở Rộng Deep Actions Chưa Chuẩn Hóa**: Các modal tích hợp chuyên sâu (NotebookLM Studio Modal, Antigravity Handoff Modal) do [`Navbar.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/layout/Navbar.tsx) sở hữu state hiển thị cục bộ. Cần xác định rõ `customItems` là extension seam chính để inject các deep actions này vào Command Palette.
3. **Thuật Toán Tìm Kiếm & Metadata Matching**: Cần đảm bảo thuật toán tìm kiếm (`normalizeScholarText`) đối soát toàn diện trên tất cả metadata thực tế có trên `CommandPaletteItem` (`title`, `description`, `category`, và `keywords`).

Phase P5.0 bổ sung cơ chế **Recent History (5 mục gần nhất bọc `safeStorage`)**, chuẩn hóa **`customItems` Extension Seam cho Deep Actions**, và tối ưu hóa **Deterministic Search Matching** với zero blast radius đối với backend và sync subsystem.

---

## 2. Architecture & Boundary Truths

### 2.1. Modal Ownership & `customItems` Extension Seam
- **Hiện trạng Codebase**: Các modal tích hợp (`NotebookLMStudioModal`, `AntigravityHandoffModal`, `StudyTimerModal`, `ObsidianBridgeModal`) thuộc quyền sở hữu và quản lý state cục bộ của `Navbar.tsx`.
- **Extension Seam Quyết Định**:
  - `useCommandPalette` cung cấp extension seam `customItems?: CommandPaletteItem[]` (kèm các callback slots tùy chọn).
  - Phía component sở hữu modal (`Navbar` hoặc caller) inject các deep actions trực tiếp qua `customItems` hoặc qua callback props.
  - `useCommandPalette` thực hiện merge `baseItems` cùng `customItems`, xử lý search filtering, điều phối `executeItem(item)` và lưu trữ recent history.
  - Hook và CommandPalette UI **tuyệt đối không giả định tự sở hữu modal visibility state**.

### 2.2. Command Item Read Model & Search Truth
- Cấu trúc dữ liệu của mỗi phần tử trong Command Palette:
  ```typescript
  export interface CommandPaletteItem {
    id: string;
    title: string;
    description?: string;
    category: "Điều hướng" | "Hành động nhanh" | "Chủ đề" | "Ghi chú";
    icon?: React.ComponentType<{ className?: string }>;
    action: () => void;
    keywords?: string[];
  }
  ```
- **Nguyên tắc Tìm kiếm (Search Truth)**:
  - Hàm `normalizeScholarText` chuẩn hóa chuỗi tiếng Việt (loại bỏ dấu và chuyển chữ thường).
  - Thuật toán tìm kiếm đối soát trên các trường metadata **thực tế tồn tại** trong `CommandPaletteItem`:
    1. `item.title`
    2. `item.description` (nếu có)
    3. `item.category`
    4. `item.keywords` (chứa các từ khóa tìm kiếm mở rộng, bao gồm tags và slug khi các mục chủ đề/ghi chú được nạp vào)

### 2.3. Recent History Storage Model
- **Storage Key**: `phat_hoc_recent_commands_v1`
- **Capacity**: Tối đa 5 mục gần nhất (LRU rolling buffer).
- **Deduplication**: Duy nhất theo `item.id`.
- **Fail-Closed & Resilience**: Sử dụng `safeGetLocalStorageItem` và `safeSetLocalStorageItem` từ `src/lib/storage.ts`. Nếu storage bị chặn hoặc quota đầy, palette vẫn hoạt động bình thường ở chế độ in-memory mà không throw error.
- **Display Rule**:
  - Khi `query === ""` (hộp tìm kiếm rỗng): Render nhóm danh mục `"Gần đây"` (Recent) ở vị trí đầu tiên của bảng kết quả chứa tối đa 5 lệnh/chủ đề đã thực thi.
  - Khi `query !== ""` (người dùng đang gõ tìm kiếm): Toàn bộ danh mục được lọc theo tiêu chuẩn tìm kiếm học thuật (`normalizeScholarText`), không hiển thị section "Gần đây" riêng biệt để tránh phân mảnh và trùng lặp kết quả gây ồn giao diện.

---

## 3. Deep Actions Extension Seam Details

Khi inject qua `customItems` hoặc khai báo trong hook:
1. **Mở NotebookLM Studio**:
   - `id`: `act-open-notebooklm`
   - `title`: `Mở NotebookLM Studio`
   - `description`: `Sinh bản đồ tri thức, podcast âm thanh và câu hỏi trắc nghiệm`
   - `category`: `"Hành động nhanh"`
   - `keywords`: `["notebooklm", "studio", "gemini", "ai podcast", "audio overview", "study guide", "tong hop"]`
   - `action`: Injected callback từ component sở hữu modal (`Navbar`).
2. **Chuẩn Bị Antigravity Handoff**:
   - `id`: `act-open-antigravity`
   - `title`: `Chuẩn Bị Antigravity Handoff`
   - `description`: `Đóng gói bối cảnh khảo cứu gửi Antigravity AI Scholar (.agents/handoffs/)`
   - `category`: `"Hành động nhanh"`
   - `keywords`: `["antigravity", "handoff", "ai scholar", "agent", "xuat goi", "chuyen giao"]`
   - `action`: Injected callback từ component sở hữu modal (`Navbar`).
3. **Mở Ma Trận Thắng Pháp (Abhidharma Matrix)**:
   - `id`: `nav-abhidharma`
   - `title`: `Ma trận phân tích`
   - `description`: `Khảo cứu 89 Tâm, 52 Tâm Sở, 28 Sắc Pháp, 24 Duyên Hệ`
   - `category`: `"Điều hướng"`
   - `keywords`: `["ma tran phan tich", "abhidharma", "vi dieu phap", "89 tam", "tam so", "thang phap"]`
   - `action`: `() => options.onNavigateTab?.("abhidharma_matrix")`
4. **Chuyển Đổi Giao Diện Sáng / Tối**:
   - `id`: `act-toggle-theme`
   - `title`: `Chuyển Đổi Giao Diện Sáng / Tối`
   - `description`: `Đổi chế độ Tối hoặc Sáng`
   - `category`: `"Hành động nhanh"`
   - `keywords`: `["theme", "dark mode", "light mode", "doi giao dien", "che do toi"]`
   - `action`: `options.onToggleTheme`

---

## 4. Boundaries & Invariants

| Thành phần | Trách nhiệm (Scope) | Ranh giới cấm (Out of Scope) |
| :--- | :--- | :--- |
| `useCommandPalette.ts` | Quản lý state `isOpen`, `query`, `selectedIndex`, `recentCommands` (max 5 items), merge `customItems`, search matching, execute wrapper. | Không can thiệp `syncQueue`, không gọi API backend trực tiếp, không tự quản lý modal visibility state. |
| `CommandPalette.tsx` | Render UI modal, focus management, keyboard loop (`↑`, `↓`, `Enter`, `Esc`), category grouping, empty state. | Không chứa business logic phân tích hay gọi storage trực tiếp. |
| `src/lib/storage.ts` | Đảm bảo safe read/write cho recent commands key. | Không throw exception ra UI. |

---

## 5. File Changes Matrix

| File Path | Trạng thái | Nhiệm vụ |
| :--- | :---: | :--- |
| `docs/specs/phase-p5-0-command-palette-deep-actions.md` | **UPDATE** | Đặc tả kỹ thuật Phase P5.0 chốt `customItems` extension seam. |
| `docs/adr/ADR-044-command-palette-deep-actions.md` | **UPDATE** | Quyết định kiến trúc chuẩn hóa. |
| `docs/gherkin/phase-p5-0-command-palette-deep-actions.feature` | **UPDATE** | Kịch bản BDD kiểm thử tính năng. |
| `src/hooks/useCommandPalette.ts` | **MODIFY** | Tích hợp safe storage recent history, mở rộng merge và execute cho `customItems`. |
| `src/components/search/CommandPalette.tsx` | **MODIFY** | Hỗ trợ hiển thị section "Gần đây" khi query rỗng. |
| `tests/unit/command-palette.test.tsx` | **MODIFY** | Mở rộng test suites kiểm tra recent history, safe fallback, merge & execute `customItems`, và search keywords matching. |
