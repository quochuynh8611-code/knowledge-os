# Technical Specification: Phase P5.1 — Command Palette Caller Wiring & Deterministic Ordering

## 1. Problem Statement & Motivation
Tại Phase P5.0, `useCommandPalette` đã được trang bị cơ chế **Hardened Recent History** (LRU max-5) và extension seam `customItems`. Tuy nhiên, qua audit hiện trạng ở tầng caller:
1. **Lối Tắt Modal Chuyên Sâu Bị Ngắt Kết Nối**: `Navbar.tsx` đang cô lập state `showNotebookLMModal` và `showAntigravityModal` trong phạm vi nội bộ của nó. Do đó, `App.tsx` chưa thể inject `customItems` cho **Mở NotebookLM Studio** và **Chuẩn Bị Antigravity Handoff** vào Command Palette (`⌘K`).
2. **Thứ Tự Danh Mục Chưa Ổn Định (Non-deterministic Category Ordering)**: Khi người dùng tìm kiếm (`query !== ""`), các nhóm danh mục trong [`CommandPalette.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/search/CommandPalette.tsx) xuất hiện theo thứ tự của kết quả khớp đầu tiên thay vì thứ tự ưu tiên giao diện cố định.

Phase P5.1 giải quyết việc kết nối các Deep Actions tại tầng caller (`App.tsx` / `Navbar.tsx`) và thiết lập thứ tự hiển thị danh mục có tính tất định (Deterministic Category Ordering).

---

## 2. Architecture & Design Specification

### 2.1. Modal Ownership & Caller Wiring Strategy
- **Lựa Chọn Kiến Trúc (Lifting Modal State to `App.tsx`)**:
  - Di chuyển việc quản lý state hiển thị `showNotebookLMModal` và `showAntigravityModal` từ `Navbar.tsx` lên `App.tsx` (cùng cấp với `showShortcutsModal` và `palette`).
  - `App.tsx` truyền các callbacks mở modal (`openNotebookLMModal`, `openAntigravityModal`) xuống `Navbar` thông qua props, đồng thời inject 2 custom items tương ứng vào `useCommandPalette({ customItems: [...] })`.
  - Các component modal (`NotebookLMStudioModal`, `AntigravityHandoffModal`) được render tại `App.tsx` (dưới khối `<React.Suspense>`).

### 2.2. Injected Custom Deep Actions Definition
```typescript
const customPaletteItems: CommandPaletteItem[] = useMemo(() => [
  {
    id: "act-open-notebooklm",
    title: "Mở NotebookLM Studio",
    description: "Sinh bản đồ tri thức, podcast âm thanh và câu hỏi trắc nghiệm",
    category: "Hành động nhanh",
    icon: Sparkles,
    keywords: ["notebooklm", "studio", "gemini", "ai podcast", "audio overview", "study guide", "tong hop"],
    action: () => setShowNotebookLMModal(true),
  },
  {
    id: "act-open-antigravity",
    title: "Chuẩn Bị Antigravity Handoff",
    description: "Đóng gói bối cảnh khảo cứu gửi Antigravity AI Scholar (.agents/handoffs/)",
    category: "Hành động nhanh",
    icon: Brain,
    keywords: ["antigravity", "handoff", "ai scholar", "agent", "xuat goi", "chuyen giao"],
    action: () => setShowAntigravityModal(true),
  },
], []);
```

### 2.3. Deterministic Category Ordering in UI (`CommandPalette.tsx`)
- Thay vì lấy danh mục ngẫu nhiên theo thứ tự item khớp đầu tiên (`Array.from(new Set(items.map(it => it.category)))`), danh sách danh mục được sắp xếp theo thứ tự ưu tiên chuẩn định trước:
  ```typescript
  const CATEGORY_ORDER: CommandPaletteDisplayCategory[] = [
    "Gần đây",
    "Hành động nhanh",
    "Điều hướng",
    "Chủ đề",
    "Ghi chú",
  ];
  ```
- Các danh mục xuất hiện trong kết quả tìm kiếm sẽ được sắp xếp dựa trên chỉ số vị trí trong `CATEGORY_ORDER`.

---

## 3. Boundaries & Invariants

| Thành phần | Trách nhiệm (Scope) | Ranh giới cấm (Out of Scope) |
| :--- | :--- | :--- |
| `App.tsx` | Quản lý state mở modal toàn cục (`showNotebookLMModal`, `showAntigravityModal`), truyền setter xuống `Navbar`, inject `customItems` vào `useCommandPalette`. | Không sửa đổi business logic của các modal. |
| `Navbar.tsx` | Nhận callbacks mở modal qua props (`onOpenNotebookLMModal`, `onOpenAntigravityModal`), loại bỏ state cục bộ trùng lặp. | Không gọi `useCommandPalette` trực tiếp. |
| `CommandPalette.tsx` | Áp dụng `CATEGORY_ORDER` để hiển thị các section theo thứ tự cố định. | Không chứa logic storage hay state ngoài palette. |

---

## 4. File Changes Matrix

| File Path | Trạng thái | Nhiệm vụ |
| :--- | :---: | :--- |
| `docs/specs/phase-p5-1-command-palette-caller-wiring.md` | **NEW** | Đặc tả kỹ thuật Phase P5.1. |
| `docs/adr/ADR-045-command-palette-caller-wiring.md` | **NEW** | Quyết định kiến trúc nâng state modal và chuẩn hóa thứ tự danh mục. |
| `docs/gherkin/phase-p5-1-command-palette-caller-wiring.feature` | **NEW** | Kịch bản BDD kiểm thử tích hợp caller và thứ tự danh mục. |
| `src/App.tsx` | **MODIFY** | Nâng modal state, truyền props vào Navbar và inject custom items vào palette. |
| `src/components/layout/Navbar.tsx` | **MODIFY** | Tiếp nhận props mở modal từ App.tsx. |
| `src/components/search/CommandPalette.tsx` | **MODIFY** | Sắp xếp danh mục hiển thị theo `CATEGORY_ORDER`. |
| `tests/unit/command-palette-caller-wiring.test.tsx` | **NEW** | Bộ kiểm thử tích hợp cho caller wiring và category ordering. |
