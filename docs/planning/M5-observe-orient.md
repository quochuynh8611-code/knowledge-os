# M5 Planning — Observe & Orient Report

**Ngày lập báo cáo:** 2026-10-12\
**Người phụ trách:** Staff Software Engineer kiêm Technical Architect\
**Trạng thái:** ✅ **OBSERVE & ORIENT COMPLETE (NO CODE / TEST MODIFIED)**\
**Phạm vi:** Milestone M5 — Mind Map Multi-Parent / Cross-Link Editing UI\
**Nguyên tắc tuân thủ:** Read before write; Evidence before assumptions; Zero side-effects; Local-Only.

---

## 1. Repository Inventory (Kiểm Kê Kho Mã Nguồn & Hạ Tầng)

### 1.1. Cấu trúc thư mục cấp cao
Repository là một ứng dụng web fullstack TypeScript tổ chức theo mô hình hybrid client-first / fullstack monolith:
- `src/`: Mã nguồn giao diện React 19, hooks, domain services, local storage engines, và UI components.
  - `src/components/mindmap/`: Bounded context chuyên biệt cho sơ đồ tư duy (Canvas, View, Layers, Drawers, Modals, Minimap).
  - `src/lib/`: Logic nghiệp vụ thuần túy, thuật toán đồ thị (`knowledgeGraph.ts`), chiếu cây (`mindmapProjection.ts`), đột biến cây (`mindmapTreeMutations.ts`), lưu trữ tài liệu (`mindmapDocumentStorage.ts`), lịch sử Undo/Redo (`mindmapHistory.ts`), xuất file (`mindmapExport.ts`).
  - `src/types/`: Khai báo kiểu TypeScript trung tâm (`index.ts`, `mindmapDocument.ts`).
  - `src/context/`: `DataContext.tsx` điều phối dữ liệu live topics, categories, notes, flashcards.
- `server.ts`: Node.js / Express backend server cung cấp REST API cho topics, notes, flashcards, exports, AI chat.
- `prisma/`: Định nghĩa CSDL PostgreSQL (`schema.prisma`), seed script (`seed.ts`), migration history.
- `tests/`: Hệ thống kiểm thử tự động với Vitest:
  - `tests/unit/`: Hơn 50 bộ unit test kiểm thử logic nghiệp vụ, UI components và hooks.
  - `tests/integration/`: Các luồng tích hợp phức tạp (như `mindmap-export-workflow.test.tsx`).
  - `tests/e2e/`: Playwright config và end-to-end tests.
- `docs/`: Hệ thống tài liệu quản trị kỹ thuật, ADRs (`docs/adr/`), specs (`docs/specs/`), reports (`docs/reports/`), và bảng điều hành dự án (`docs/PROJECT_STATUS.md`).

### 1.2. Application Entry Points
- **Client Web SPA**: `index.html` -> `src/main.tsx` -> `src/App.tsx`.
- **Backend API Server**: `server.ts` (lắng nghe cổng mặc định `3000`, phục vụ API `/api/*` và static assets trong production).
- **Mind Map Canonical Routing**: Hash route `#/mindmap?topicId=<id>&layout=<mode>` điều phối bởi `src/lib/urlRouting.ts`.

### 1.3. Các Bounded Context Chính
1. **Live Knowledge Graph**: Topics, Categories, Notes, KnowledgeLinks (PostgreSQL via Prisma & DataContext).
2. **Mind Map Studio**:
   - Chế độ `live-topics`: Đồ thị suy diễn chỉ đọc (Derived Read-Model) chiếu từ Knowledge Graph qua `projectToMindMapTree`.
   - Chế độ `saved-document`: Mô hình tài liệu sơ đồ tư duy độc lập (Local-First Documents) lưu trữ client-side với lịch sử phiên bản bất biến và Undo/Redo cục bộ.
3. **Research Reader & Excerpt Capture**: Đọc tài liệu, trích xuất highlight vào inbox flashcard / note.
4. **Spaced Repetition Flashcards**: Thuật toán SM-2, Daily Due Review Widget, Flashcard Review Studio.
5. **Global Utilities**: Command Palette (`⌘K`), Quick Capture (`⌘N`), Toast notifications.

### 1.4. Cách Build, Chạy và Kiểm Thử
- **Chạy development**: `npm run dev` (`tsx server.ts`).
- **Build production**: `npm run build` (`vite build && esbuild server.ts ...`).
- **Kiểm tra kiểu dữ liệu**: `npx tsc --noEmit` hoặc `npm run typecheck`.
- **Kiểm thử tự động**: `npm test` hoặc `npx vitest run`.

---

## 2. Specification Discovery & Source-of-Truth Audit

### 2.1. Đánh giá nguồn sự thật (Source of Truth Audit)
- **Tài liệu nguồn sự thật cao nhất (Living Source of Truth)**:
  - [`docs/PROJECT_STATUS.md`](../PROJECT_STATUS.md): Ghi nhận baseline HEAD hiện tại (`d561e38` sau khi merge docs status), khóa trạng thái, và ứng viên tiếp theo là M5.
  - [`docs/specs/mindmap-next-phases.md`](../specs/mindmap-next-phases.md): Tài liệu meta-roadmap tổng kết từ v1.0, v1.1, v1.2, v2.0 đến v2.5.
  - Các báo cáo đóng phase gần nhất:
    - [`docs/reports/mindmap-phase-m4b-closure-report.md`](../reports/mindmap-phase-m4b-closure-report.md) (M4b-A Viewport Zoom Polish).
    - [`docs/reports/mindmap-phase-m4a-closure-report.md`](../reports/mindmap-phase-m4a-closure-report.md) (M4a Export UX Hardening).
    - [`docs/reports/mindmap-phase-m3-closure-report.md`](../reports/mindmap-phase-m3-closure-report.md) (M3 Keyboard Authoring).
    - [`docs/reports/mindmap-phase-m2-closure-report.md`](../reports/mindmap-phase-m2-closure-report.md) (M2 Inline Node Drawer).
    - [`docs/specs/mindmap-phase-m1-closure-report.md`](../specs/mindmap-phase-m1-closure-report.md) (M1 Markdown Import to Saved Document).
- **Tài liệu lịch sử / Đã lỗi thời hoặc có độ lệch (Deprecated / Drifted)**:
  - [`docs/session-logs/2026-10-11-mindmap-m2-closure-and-personal-knowledge-os-upgrade-plan.md`](../session-logs/2026-10-11-mindmap-m2-closure-and-personal-knowledge-os-upgrade-plan.md): Một phiên thảo luận nháp cũ từng gọi "Phase M5" là "Drag-and-Drop Reparenting" (trong khi drag reparenting thực tế đã được xây dựng và verify từ Phase P2/M2 trước đó). Tài liệu này là uncommitted session log ngoài scope và không đại diện cho lộ trình chính thức.
  - [`docs/implementation-roadmap.md`](../implementation-roadmap.md): Bản lộ trình cũ của toàn bộ dự án từ các giai đoạn đầu, không phản ánh chi tiết phân nhánh M1-M5 của Mind Map.

---

## 3. M1–M4 State Verification (Xác Minh Trạng Thái Milestones M1–M4)

Đối chiếu tài liệu với source code và test suites thực tế (chạy 5 bộ test đạt **50/50 PASS**):

| Milestone | Tên & Trọng Tâm | Phân Loại Trạng Thái | Bằng Chứng Mã Nguồn & Kiểm Thử |
| :--- | :--- | :---: | :--- |
| **M1** | External Markdown Import to Saved Mind Map Document | **Verified complete** | - Code: `MindMapImportPreviewModal.tsx`, `MindMapView.tsx`<br>- Tests: `tests/unit/mindmap-import-file-to-document.test.tsx` (7/7 PASS)<br>- Commit: `08e9799` |
| **M2** | Title-only Inline Node Drawer for Saved Documents | **Verified complete** | - Code: `MindMapNodeDrawer.tsx`, `MindMapView.tsx`<br>- Tests: `tests/unit/mindmap-node-drawer.test.tsx` (7/7 PASS)<br>- ADR: `ADR-094`, Commit: `7d288fb` |
| **M3** | Mind Map Keyboard Authoring (`Tab`, `Enter`, `Delete`) | **Verified complete** | - Code: `mindmapTreeMutations.ts`, `MindMapTreeCanvas.tsx`, `MindMapView.tsx`<br>- Tests: `tests/unit/mindmap-keyboard-authoring.test.tsx` (11/11 PASS)<br>- ADR: `ADR-096`, Commit: `5bfe56a` |
| **M4a** | Mind Map Export UX Hardening (Title & Toast) | **Verified complete** | - Code: `MindMapView.tsx`<br>- Tests: `tests/integration/mindmap-export-workflow.test.tsx` (7/7 PASS)<br>- ADR: `ADR-099`, Commit: `fb8bc42` |
| **M4b-A** | Viewport Zoom Polish & Pointer Isolation | **Verified complete** | - Code: `MindMapTreeCanvas.tsx` (pure helpers, fail-closed geometry)<br>- Tests: `tests/unit/mindmap-viewport-zoom.test.tsx` (18/18 PASS)<br>- ADR: `ADR-100`, Commit: `9b80e0c` |

---

## 4. M5 Surface-Area Analysis (Phân Tích Bề Mặt Ảnh Hưởng Cho Milestone M5)

### 4.1. Định nghĩa mục tiêu của M5
Theo [`docs/PROJECT_STATUS.md`](../PROJECT_STATUS.md) và [`docs/reports/mindmap-phase-m4b-closure-report.md`](../reports/mindmap-phase-m4b-closure-report.md):
> **Phase M5 — Mind Map Multi-Parent / Cross-Link Editing UI**:
> Cho phép người dùng tạo, chỉnh sửa và gỡ bỏ liên kết chéo (Cross-Links) trực tiếp trên giao diện tương tác giữa các nhánh kiến thức. Biểu diễn mối quan hệ đa chiều (DAG / Multi-parent) trong sơ đồ tư duy.

### 4.2. Bề mặt mô hình dữ liệu hiện có (Data Models & Storage)
1. **Schema lưu trữ tài liệu (`src/types/mindmapDocument.ts`)**:
   - Đã có sẵn định nghĩa `MindMapDocumentEdge`:
     ```ts
     export interface MindMapDocumentEdge {
       id: string;
       sourceNodeId: string;
       targetNodeId: string;
       edgeType: LinkType; // 'prerequisite' | 'related' | 'advanced' | 'contradicts'
       label?: string;
     }
     ```
   - Trong `MindMapVersion`: Đã có trường `crossLinks: MindMapDocumentEdge[]`.
   - Trong `mindmapDocumentStorage.ts`: Validator `validateDocumentInput` đã kiểm tra dangling edges (`DANGLING_EDGE_REFERENCE`) nhưng **chưa có các helper mutation** để thêm/sửa/xóa edge trong payload tài liệu đang soạn thảo.
2. **Runtime Projection Models (`src/lib/mindmapProjection.ts`)**:
   - `MindMapCrossEdge` chứa thông tin hiển thị:
     ```ts
     export interface MindMapCrossEdge {
       id: string;
       sourceNodeId: string;
       sourceTitle: string;
       targetNodeId: string;
       targetTitle: string;
       type: SemanticEdgeType;
       strength: number;
       label: string;
       isCycle: boolean;
       isMultiParent?: boolean;
     }
     ```
   - Trong chế độ `live-topics`, cross edges được trích xuất tự động từ `KnowledgeLink` trong CSDL qua thuật toán đồ thị.
   - Trong chế độ `saved-document`, cross edges được map tĩnh từ `activeDocumentVersion?.crossLinks || []`.
3. **Khoảng trống thông tin lớn (Critical Gap)**:
   - Trong `MindMapView.tsx`, `workingDocumentTree` hiện chỉ lưu cây phân cấp (`MindMapTreeNode`).
   - **Chưa có state** `workingDocumentCrossLinks: MindMapDocumentEdge[]` trong memory để hỗ trợ chỉnh sửa không phá hủy (non-destructive) trước khi bấm "Lưu phiên bản".
   - Ngăn xếp Undo/Redo (`mindmapHistory.ts`) hiện chỉ theo dõi snapshots của `MindMapTreeNode` (`tree`), **hoàn toàn chưa hỗ trợ lưu snapshot danh sách `crossLinks`**!

### 4.3. Bề mặt giao diện hiện có (UI Components & Interaction Layers)
1. **`MindMapCrossLinksLayer.tsx`**:
   - Render SVG overlay chứa các đường cong Bézier nét đứt nối các node.
   - Thuộc tính container hiện tại: `pointer-events-none` (hoàn toàn không bắt click/hover trực tiếp trên đường nối SVG; click tương tác hiện dựa trên việc click node để highlight peer edges).
2. **`MindMapNodeDrawer.tsx`**:
   - Hiện là Drawer Title-Only (chỉ cho phép sửa `title`).
   - Có thể là bề mặt lý tưởng để hiển thị danh sách các Cross-Links gắn với node đang chọn, kèm nút thêm/xóa liên kết chéo.
3. **`MindMapTreeCanvas.tsx`**:
   - Chứa state cục bộ `focusedCrossLinkNodeId`, tính toán `peerNodeIds`.
   - Có cơ chế kéo thả reparenting (`onReparentNode`), nhưng chưa có cơ chế kéo thả để nối dây (wire connection) hoặc nút CTA để tạo liên kết chéo giữa 2 node.

---

## 5. Sensitivity & Blast-Radius Analysis (Phân Tích Độ Nhạy Cảm & Vùng Ảnh Hưởng)

| Vị trí / Thành phần | Mức độ nhạy cảm | Lý do nhạy cảm | Blast Radius dự kiến | Bằng chứng từ repo | Câu hỏi mở cần làm rõ trước khi thiết kế |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **Prisma Schema & Backend DB** | 🔴 **CỰC KỲ CAO** | Không được thay đổi CSDL production. Sơ đồ tư duy đang hoạt động thuần Local-First. | Zero blast radius (phải giữ nguyên 100%) | `prisma/schema.prisma` không chứa bảng MindMap | M5 chỉ áp dụng cho `saved-document` mode hay có tính năng sync sang `KnowledgeLink` trong live topics? *(Khuyến nghị: Chỉ áp dụng `saved-document`)* |
| **Undo/Redo History Stack (`mindmapHistory.ts`)** | 🟠 **CAO** | Nếu bổ sung/xóa cross-link mà không tích hợp vào history stack thì tính năng Undo (`⌘Z`) sẽ làm mất đồng bộ giữa cây và danh sách liên kết chéo. | Ảnh hưởng tới toàn bộ trải nghiệm soạn thảo | `createMindMapHistory` hiện chỉ nhận `MindMapTreeNode` | Làm thế nào để mở rộng history stack để lưu cả `tree` và `crossLinks` mà không phá vỡ 10+ unit tests của `mindmap-history.test.ts`? |
| **Validation Dangling Edges (`mindmapDocumentStorage.ts`)** | 🟠 **CAO** | Khi người dùng xóa một node con (qua phím `Delete` hoặc drawer), các cross-link trỏ vào node đó sẽ trở thành "dangling edges", dẫn đến lỗi `DANGLING_EDGE_REFERENCE` khi lưu phiên bản. | Nguy cơ chặn không cho lưu tài liệu (Save Version Failure) | `validateDocumentInput` dòng 133-135 | Khi xóa node, hệ thống phải tự động dọn dẹp các cross-links liên quan (cascade prune) hay cảnh báo người dùng? |
| **Node Deletion Mutations (`mindmapTreeMutations.ts`)** | 🟡 **TRUNG BÌNH** | Hàm `deleteNode` hiện tại chỉ cắt nhánh cây, không biết về danh sách cross-links tách biệt. | Giới hạn trong context Mind Map | `mindmapTreeMutations.ts` không chứa từ khóa `cross` | Cần một helper thuần túy mới cấp module (ví dụ `pruneDanglingEdges`) để loại bỏ các cạnh mất đầu mút. |
| **SVG CrossLinks Layer Interaction (`MindMapCrossLinksLayer.tsx`)** | 🟡 **TRUNG BÌNH** | SVG layer hiện có `pointer-events-none`. Nếu biến đường nối thành clickable để gỡ liên kết (delete edge), có thể xung đột với drag-to-pan trên canvas backdrop. | Gây giật lag hoặc rò rỉ sự kiện pointer xuống canvas | Lớp overlay nằm ở `z-10` ngay trên canvas | Nên cho phép xóa cross-link qua click trực tiếp vào nhãn đường nối trên canvas hay qua danh sách trong `MindMapNodeDrawer`? |
| **Tương thích Chế độ Live vs Saved (`MindMapView.tsx`)** | 🟡 **TRUNG BÌNH** | Chế độ `live-topics` là chỉ đọc, trích xuất từ database. Mọi khả năng tạo/gỡ liên kết chéo phải bị khóa chặt trong `live-topics`. | Bảo vệ tính toàn vẹn của Knowledge Graph | M2 và M3 đã thiết lập rào chắn `activeMode === "saved-document"` | Cần tái sử dụng nghiêm ngặt guard `activeMode === "saved-document"` cho toàn bộ UI và handlers của M5. |

---

## 6. Test & Verification State (Hiện Trạng Kiểm Thử & Các Phát Hiện Lỗi Tồn Đọng)

### 6.1. Tổng quan kiểm thử
- **Framework**: Vitest v4.1.11, Testing Library React, jsdom.
- **TypeScript strict check**: `npx tsc --noEmit` đạt **0 lỗi** trên toàn codebase.
- **Trạng thái bộ test M1–M4**: Toàn bộ 5 test suites đại diện đạt **50/50 PASS**.
- **Bộ test Mindmap tổng thể**: Khi chạy 36 file test liên quan đến Mind Map, đạt **417/422 tests PASS** (34/36 test files hoàn toàn xanh).

### 6.2. Các phát hiện tồn đọng (Pre-existing Findings / Regressions)
Trong quá trình chạy quan sát toàn diện, phát hiện **2 file test cũ bị fail** do sự thay đổi logic từ các phase trước (P6b và M3) chưa được reconcile:
1. **`tests/unit/mindmap-canvas-editing.test.tsx` (1 failing test)**:
   - *Test*: `handles Tab or Insert key to add child under focused node when isEditable is true`.
   - *Nguyên nhân*: Test cũ từ Phase P2 mong đợi `onAddChild('node-kho-de')`, trong khi Phase M3 đã nâng cấp chữ ký truyền object `{ title: 'New node' }`.
2. **`tests/unit/mindmap-multi-selection.test.tsx` (4 failing tests)**:
   - *Test*: Các test liên quan đến `Keyboard Delete / Backspace` với selection nhiều nút cùng lúc.
   - *Nguyên nhân*: Phase M3 đã tái cấu trúc `Delete`/`Backspace` trên `MindMapTreeCanvas.tsx` thành `onDeleteNodeDirectly` cho single focused node, dẫn đến hành vi xóa đa nút (multi-node batch delete) của Phase P6b không còn được gọi qua bàn phím canvas theo cách cũ.

*(Theo nguyên tắc OODA Observe & Orient, các lỗi trên được ghi nhận chính xác làm finding kỹ thuật; KHÔNG được tự ý sửa đổi code hoặc test trong bước này).*

---

## 7. Dependency & Constraint Review (Ràng Buộc Kỹ Thuật & Môi Trường)

### 7.1. Runtime & Thư viện
- **Node.js**: v20+ / Bun support.
- **Frontend Stack**: React 19 (`^19.0.0`), Vite (`^6.2.0`), Tailwind CSS (`^4.0.0`), Lucide React (`^1.16.0`).
- **Database Engine**: PostgreSQL, Prisma ORM (`^6.4.1`).
- **Testing**: Vitest (`^4.1.11`), `@testing-library/react` (`^16.2.0`).

### 7.2. Ràng buộc bất biến cho Milestone M5
1. **Không thay đổi Schema CSDL**: Tuyệt đối không can thiệp vào `prisma/schema.prisma` hay tạo migration mới. M5 phải là giải pháp Local-First trong phạm vi `saved-document`.
2. **Bảo toàn Tính Bất Biến Lịch Sử**: Thao tác thêm/xóa cross-link phải đồng bộ với dirty state (`isDirty = true`), Undo/Redo stack và quy trình lưu phiên bản (`handleSaveVersion`).
3. **Phòng chống Dangling Edges**: Khi xóa node, bắt buộc phải loại bỏ mọi cross-link tham chiếu tới node đó trước khi lưu để thỏa mãn validator `validateDocumentInput`.
4. **Hiệu năng Canvas**: Không làm suy giảm tốc độ render của `MindMapCrossLinksLayer` (giữ nguyên memoization Bézier curves và debounce cập nhật tọa độ khi zoom/pan).

---

## 8. Danh Mục Câu Hỏi Mở & Định Hướng Cho Bước Tiếp Theo (Open Questions for M5)

Trước khi chuyển sang bước lập đặc tả (Specs) và quyết định kiến trúc (ADR), cần người điều hành/Product Owner định hướng 3 câu hỏi kiến trúc cốt lõi:

1. **Phương thức tương tác UI để tạo liên kết chéo (Creation UX)**:
   - *Lựa chọn A (Drawer-centric - Khuyến nghị)*: Mở `MindMapNodeDrawer`, bổ sung tab/section "Liên kết chéo", chọn node đích từ dropdown/autocomplete các node trong cây và chọn loại liên kết (`prerequisite`, `related`, v.v.). Ưu điểm: Blast radius nhỏ, dễ kiểm thử a11y, không xung đột với pointer gestures trên canvas.
   - *Lựa chọn B (Canvas Connection Gesture)*: Kéo thả từ điểm nối (connector handle) trên node card nguồn sang node card đích. Nhược điểm: Phức tạp cao, xung đột với Drag-to-Pan, Drag-to-Reparent và Marquee Selection.
2. **Phương thức tương tác UI để gỡ liên kết chéo (Deletion UX)**:
   - *Lựa chọn A*: Nút xóa (thùng rác) trực tiếp bên cạnh từng liên kết chéo trong `MindMapNodeDrawer`.
   - *Lựa chọn B*: Click vào nhãn (label badge) của đường nối SVG trên canvas hiển thị popover xóa.
3. **Phạm vi Undo/Redo**:
   - Có nên mở rộng `MindMapHistoryState` để lưu cả `crossLinks` song song với `tree` không, hay chỉ lưu snapshot khi lưu phiên bản? *(Khuyến nghị: Phải lưu cả `crossLinks` vào history stack để `⌘Z` hoàn tác được thao tác thêm/xóa liên kết chéo)*.

---
*Báo cáo kết thúc tại đây. Hệ thống giữ nguyên trạng thái làm việc sạch và dừng tại Human Approval Gate.*
