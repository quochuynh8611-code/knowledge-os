# UI Architecture & Design System Specification (v2 - Professional Research Workbench)

- **Version**: 2.0.0
- **Target Platform**: React 19 + TypeScript + Vite + Tailwind CSS 4
- **Scope**: Toàn bộ App Shell, Workspaces, Shared Components, Modals & Navigation

---

## 1. Mục Tiêu & Nguyên Tắc Thiết Kế

### 1.1. Mục Tiêu Cốt Lõi
1. **Professional Research Workbench**: Đưa toàn bộ giao diện về chuẩn học thuật, trung tính, cấu trúc thứ bậc thị giác mạch lạc, giảm mỏi mắt khi nghiên cứu dài phiên.
2. **Zero Logic Regression**: Bảo toàn 100% logic nghiệp vụ, state orchestration (`DataContext`, `NavigationContext`, `StudyTimerContext`), phím tắt bàn phím và modal flows.
3. **Design System Nhất Quán**: Một bộ design tokens và shared component contract áp dụng bình đẳng cho mọi workspace tab. Không còn hiện tượng mỗi tab tự tạo card, panel, button hay modal theo cách riêng.

### 1.2. Design Principles (Nguyên Tắc)
- **Neutral First, Single Academic Accent**:
  - Nền & card phân cấp theo dải màu đá trầm (`Stone/Slate`), không dùng màu neon, gradient sặc sỡ hay hiệu ứng SaaS bóng bẩy.
  - 1 màu nhấn duy nhất: **Academic Amber/Ochre** (`amber-700` light / `amber-400` dark) dành cho trạng thái active, focus ring, timer cue và primary action.
- **Typography Phân Tầng Rõ Ràng**:
  - Tiêu đề cấp trang & chuyên khảo: `Newsreader` (`font-serif-title`) trang nhã, học thuật.
  - Giao diện điều khiển & nội dung văn bản: `Be Vietnam Pro` / `system-ui` sắc nét.
  - Số liệu, thời gian & mã định danh: `font-mono` với `tabular-nums`.
- **Crisp Micro-Surfaces**:
  - Thay thế shadow mờ đục bằng viền sắc nét `border border-stone-200/80 dark:border-stone-800` và vi mô đổ bóng `shadow-2xs` / `shadow-xs`.
- **High Information Density with Generous Reading Breathing Room**:
  - Các thanh điều khiển, danh sách chọn, bộ lọc có mật độ thông tin cao (dense & compact).
  - Khung đọc tài liệu, ghi chú và chi tiết chủ đề có lề thoáng đãng, tối ưu cho mắt khi đọc văn bản dài.

---

## 2. Design Tokens V2 (CSS Custom Properties & Tailwind Tokens)

### 2.1. Semantic Color Tokens
```css
:root {
  /* Surfaces */
  --wb-canvas: #fafaf9;          /* stone-50 */
  --wb-surface-subtle: #f5f5f4;  /* stone-100 */
  --wb-surface-card: #ffffff;    /* white */
  --wb-surface-elevated: #ffffff;
  --wb-surface-active: #fef3c7;  /* amber-100 */
  
  /* Borders */
  --wb-border-subtle: #e7e5e4;   /* stone-200 */
  --wb-border-strong: #d6d3d1;   /* stone-300 */
  --wb-border-focus: #b45309;    /* amber-700 */

  /* Text & Foreground */
  --wb-text-primary: #1c1917;    /* stone-900 */
  --wb-text-secondary: #57534e;  /* stone-600 */
  --wb-text-muted: #78716c;      /* stone-500 */
  --wb-text-accent: #92400e;     /* amber-800 */

  /* Academic Accent */
  --wb-accent: #b45309;          /* amber-700 */
  --wb-accent-hover: #92400e;    /* amber-800 */
  --wb-accent-surface: #fef3c7;  /* amber-100 */

  /* Status Colors */
  --wb-status-success: #059669;  /* emerald-600 */
  --wb-status-warning: #d97706;  /* amber-600 */
  --wb-status-danger: #e11d48;   /* rose-600 */
  --wb-status-info: #0284c7;     /* sky-600 */
  --wb-status-purple: #7c3aed;   /* violet-600 (Obsidian) */
}

.dark {
  /* Surfaces */
  --wb-canvas: #0c0a09;          /* stone-950 */
  --wb-surface-subtle: #1c1917;  /* stone-900 */
  --wb-surface-card: #1c1917;    /* stone-900/90 */
  --wb-surface-elevated: #292524;/* stone-800 */
  --wb-surface-active: #451a03;  /* amber-950 */

  /* Borders */
  --wb-border-subtle: #292524;   /* stone-800 */
  --wb-border-strong: #44403c;   /* stone-700 */
  --wb-border-focus: #f59e0b;    /* amber-500 */

  /* Text & Foreground */
  --wb-text-primary: #f5f5f4;    /* stone-100 */
  --wb-text-secondary: #d6d3d1;  /* stone-300 */
  --wb-text-muted: #a8a29e;      /* stone-400 */
  --wb-text-accent: #fbbf24;     /* amber-400 */

  /* Academic Accent */
  --wb-accent: #f59e0b;          /* amber-500 */
  --wb-accent-hover: #fbbf24;    /* amber-400 */
  --wb-accent-surface: rgba(120, 53, 15, 0.4);
}
```

---

## 3. Page Archetypes Architecture

Toàn bộ các tab trong ứng dụng được phân vào 5 nhóm archetype chuẩn mực:

```
+-------------------------------------------------------------------------------+
|                               TOP COMMAND BAR                                 |
| [Brand & Title] [Global Search ⌘K] [Timer Cue] [Sync] [Theme] [Quick Actions] |
+-----------------------+-------------------------------------------------------+
| SIDEBAR (3-Tier)      | MAIN WORKSPACE STAGE                                  |
| 1. Học tập (Learning) |                                                       |
| 2. Tri thức (Knowledge)| [PageHeader: Title (Serif) + Context Badges + Actions] |
| 3. Công cụ (Tools)    |-------------------------------------------------------|
| --------------------- | [Workspace Archetype Content: SplitPane / Cards /     |
| Lĩnh vực nghiên cứu   |  Panels / Canvas / Reader]                            |
| --------------------- |                                                       |
| Study Habit Progress  |                                                       |
+-----------------------+-------------------------------------------------------+
| [FLOATING PORTAL: ActiveLearningSessionBar (Non-intrusive bottom pill/bar)]    |
+-------------------------------------------------------------------------------+
```

### 3.1. Overview Archetype (`DashboardHome`, `StudyProgressView`, `FlashcardAnalyticsDashboard`)
- **Đặc điểm**: Bố cục dạng lưới metric cards + hàng đợi hành động tiếp theo (`ResumeStudyQueue`) + biểu đồ nhịp độ (`WeeklyCadenceBar`).
- **Components cốt lõi**: `PageHeader`, `MetricCard`, `SurfaceCard`, `WorkbenchPanel`, `SectionHeader`.

### 3.2. Explorer Archetype (`TopicTree`, `ResourcesManager`, `AdvancedSearch`, `CardBrowser`)
- **Đặc điểm**: Thanh tìm kiếm & lọc đa tiêu chí trên đầu (`FilterBar`), danh sách thẻ/dòng phân cấp, hành động theo ngữ cảnh (preview, trích dẫn, sửa, xóa an toàn).
- **Components cốt lõi**: `PageHeader`, `FilterBar`, `SurfaceCard`, `StatusPill`, `Badge`, `EmptyState`.

### 3.3. Workbench Archetype (`TopicDetail`, `NotesManager`, `DocsExplorerView`, `AIResearchStudio`, `FlashcardReviewStudio`)
- **Đặc điểm**: 2-3 cột linh hoạt hoặc tabs con chuyên sâu. Tối ưu hóa tối đa cho việc đọc, trích dẫn, viết ghi chú và tương tác AI / Flashcards.
- **Components cốt lõi**: `PageHeader`, `SplitPane`, `ActionBar`, `ToolbarButton`, `InspectorPanel`, `MarkdownReadabilityRenderer`.

### 3.4. Analysis Archetype (`KnowledgeGraph`, `DuplicateDetectionDashboard`)
- **Đặc điểm**: Canvas toàn diện hoặc bảng so sánh đối soát trùng lặp thông minh.
- **Components cốt lõi**: `WorkbenchPanel`, `ToolbarButton`, `Badge`, `SurfaceCard`.

### 3.5. Modal Studio Archetype (`NotebookLMStudioModal`, `AntigravityHandoffModal`, `NoteReaderModal`, `ExportImportModal`)
- **Đặc điểm**: Khung modal chuẩn với `ModalFrame`, focus trap, header rõ ràng, thân cuộn mượt mà, chân trang nút hành động phân cấp.

---

## 4. Shared UI Components Contract (`src/components/workbench/`)

Mỗi component được thiết kế dạng stateless hoặc controlled, hỗ trợ đầy đủ `className`, `dark mode` và keyboard focus:

1. **`AppShell`**: Khung bao quanh ứng dụng (Top command bar + Sidebar + Workspace stage + Floating bar portal + Mobile nav).
2. **`PageHeader`**: Tiêu đề trang, breadcrumb slot, domain badge, subtitle, actions toolbar.
3. **`SectionHeader`**: Phân đoạn nội dung có counter badge & action slot.
4. **`SurfaceCard`**: Thẻ nền chuẩn (`default`, `elevated`, `outlined`, `interactive`, `active`).
5. **`WorkbenchPanel`**: Khung chứa có Header, Content, Footer với viền sắc sảo.
6. **`ActionBar` & `ToolbarButton`**: Nút bấm chuẩn workbench (`primary`, `secondary`, `outline`, `ghost`, `danger`), hiển thị phím tắt phím nóng.
7. **`FilterBar`**: Thanh tìm kiếm kết hợp dropdowns lọc và nút xóa bộ lọc.
8. **`MetricCard`**: Thống kê số liệu có icon, label, giá trị mono và context badge.
9. **`StatusPill` & `Badge`**: Huy hiệu trạng thái semantic (`neutral`, `accent`, `success`, `warning`, `danger`, `info`).
10. **`ModalFrame`**: Khung modal đồng nhất có backdrop blur, header, body cuộn mượt, footer và phím `Esc`.
11. **`SplitPane`**: Bố cục 2 cột (Master-Detail hoặc Inspector).
12. **`AlertBanner`**: Băng thông báo trạng thái gọn gàng.
