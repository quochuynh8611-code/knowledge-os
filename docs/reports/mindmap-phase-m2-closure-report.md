# Phase M2 Closure Report — Inline Node Drawer for Saved Mind Map Documents

**Trạng thái**: Hoàn tất (Ready for Review)  
**Ngày**: 2026-10-11  
**Vai trò**: Staff Software Engineer / Technical Architect  
**Repo**: `/Users/mr.chem/Documents/Lap-trinh/Dashboard-update`  
**Phase liên quan**: Phase P7.C (Persistence & Export Parity), Phase M1 (Markdown Import to Saved Document), Phase M2 (Inline Node Drawer)  

---

## 1. Objective

Triển khai tính năng **Inline Node Drawer (title-only)** cho chế độ chỉnh sửa tài liệu đã lưu (`saved-document` mode) trong Mind Map view:
- Cho phép người dùng click chọn node trên canvas để mở drawer chỉnh sửa tiêu đề node.
- Giữ nguyên cơ chế dirty-state tracking, undo/redo history, và quy trình lưu phiên bản (`handleSaveVersion`).
- Đảm bảo Drawer được cô lập hoàn toàn khỏi `live-topics` mode, không auto-persist khi gõ, không xóa canvas selection khi đóng drawer, và không thay đổi schema lưu trữ.

---

## 2. Approved Scope & Architectural Decisions

Dựa trên baseline đã được duyệt:
- **ADR**: `docs/adr/ADR-094-phase-m2-title-only-inline-node-drawer.md`
- **Spec**: `docs/specs/mindmap-phase-m2-planning-spec-v1.md`

### Các ràng buộc cốt lõi:
1. **Title-only**: Drawer ở Phase M2 chỉ cho phép sửa tiêu đề node (`title`). Các trường khác (`id`, `nodeType`, `semanticBadge`, `sourceIdReference`) hoàn toàn là read-only badges.
2. **Saved-document mode only**: Trong chế độ `live-topics`, click node chỉ thực hiện highlight selection; drawer tuyệt đối không xuất hiện.
3. **State Isolation**: Drawer state (`activeDrawerNodeId`) tách biệt hoàn toàn khỏi `selectedNodeIds`. Đóng drawer không được xóa selection viền xanh của canvas.
4. **Tree Mutation Pipeline**: Thay đổi tiêu đề phải đi qua pure helper `renameNodeTitle(...)` và state coordinator `applyTreeMutation(...)`.
5. **No Keystroke Auto-persist**: Gõ phím chỉ cập nhật form state trong drawer; chỉ kích hoạt mutation khi submit/apply với title mới khác biệt. Dữ liệu chỉ persist xuống storage khi người dùng chủ động chọn "Lưu phiên bản".
6. **Zero Schema Modification**: Không chỉnh sửa schema database (`prisma`), backend APIs, hay cấu trúc file storage JSON.

---

## 3. Files Changed

| File | Trạng thái | Mô tả thay đổi |
| :--- | :--- | :--- |
| `src/components/mindmap/MindMapNodeDrawer.tsx` | Mới (`Untracked`) | Component drawer độc lập với testid: `mindmap-node-drawer`, `input-drawer-node-title`, `btn-drawer-apply-title`, `btn-close-node-drawer`, các badges read-only. |
| `src/components/mindmap/MindMapView.tsx` | Modified | Thêm state `activeDrawerNodeId`, helper `findDocumentNodeById`, handler `handleUpdateNodeTitleFromDrawer`, reset drawer khi đổi mode / đổi doc. |
| `tests/unit/mindmap-node-drawer.test.tsx` | Mới (`Untracked`) | 7 scenarios test-first cho Phase M2, bao phủ toàn bộ lifecycle và edge cases. |
| `docs/adr/ADR-094-phase-m2-title-only-inline-node-drawer.md` | Mới (`Untracked`) | Architecture Decision Record cho Phase M2. |
| `docs/specs/mindmap-phase-m2-planning-spec-v1.md` | Mới (`Untracked`) | Đặc tả kỹ thuật chi tiết Phase M2. |
| `docs/reports/mindmap-phase-m2-closure-report.md` | Mới (`Untracked`) | Báo cáo đóng phase và tổng hợp evidence. |

*Không có file nào ngoài scope bị thay đổi. Tuyệt đối không chạm vào `prisma/schema.prisma`, `server.ts`, hay `src/context/DataContext.tsx`.*

---

## 4. Acceptance Criteria -> Evidence Mapping

| ID | Acceptance Criteria | Test Scenario | Kết quả kiểm thử |
| :--- | :--- | :--- | :--- |
| **AC-1** | Node Drawer KHÔNG mở khi click node trong `live-topics` mode | Scenario 1 (`tests/unit/mindmap-node-drawer.test.tsx`) | **PASSED** (60ms) |
| **AC-2** | Mở Drawer trong `saved-document` mode & hiển thị đầy đủ read-only metadata (`id`, `nodeType`, `badge`, `sourceRef`) | Scenario 2 (`tests/unit/mindmap-node-drawer.test.tsx`) | **PASSED** (112ms) |
| **AC-3** | Sửa title trong drawer cập nhật `workingDocumentTree` và render node trên canvas | Scenario 3 (`tests/unit/mindmap-node-drawer.test.tsx`) | **PASSED** (91ms) |
| **AC-4** | `isDirty` chỉ bật khi title thay đổi thực sự; không dirty khi submit title cũ hoặc đóng drawer | Scenario 4 (`tests/unit/mindmap-node-drawer.test.tsx`) | **PASSED** (148ms) |
| **AC-5** | Luồng "Lưu phiên bản" persist title đã sửa vào storage và nạp lại chính xác | Scenario 5 (`tests/unit/mindmap-node-drawer.test.tsx`) | **PASSED** (92ms) |
| **AC-6** | Leave guard hiển thị cảnh báo unsaved changes nếu cố thoát khi dirty do sửa từ drawer | Scenario 6 (`tests/unit/mindmap-node-drawer.test.tsx`) | **PASSED** (49ms) |
| **AC-7** | Đóng drawer (`btn-close-node-drawer`) bảo toàn nguyên vẹn visual selection trên canvas | Scenario 7 (`tests/unit/mindmap-node-drawer.test.tsx`) | **PASSED** (36ms) |

---

## 5. Raw Verification Outputs

### 5.1. Targeted Suite: `mindmap-node-drawer.test.tsx`
```text
$ npm test -- tests/unit/mindmap-node-drawer.test.tsx

 RUN  v4.1.11 /Users/mr.chem/Documents/Lap-trinh/Dashboard-update

 ✓ tests/unit/mindmap-node-drawer.test.tsx (7 tests) 590ms
   ✓ Phase M2 — Inline Node Drawer for Saved Mind Map Documents (7)
     ✓ Scenario 1: Node drawer does NOT open in live-topic mode when clicking node 60ms
     ✓ Scenario 2: Drawer opens in saved-document mode and displays correct node metadata 112ms
     ✓ Scenario 3: Editing title in drawer updates workingDocumentTree and canvas node 91ms
     ✓ Scenario 4: isDirty only triggers on actual title change, not on unchanged submit or close 148ms
     ✓ Scenario 5: Save Version persists edited title from drawer and reopens correctly 92ms
     ✓ Scenario 6: Leave guard appears if attempting to leave when dirty from drawer edit 49ms
     ✓ Scenario 7: Closing drawer preserves visual selection on canvas 36ms

 Test Files  1 passed (1)
      Tests  7 passed (7)
   Start at  11:28:59
   Duration  1.93s
```

### 5.2. Regression Suite: `mindmap-document-lifecycle-parity.test.tsx` (Phase P7.C)
```text
$ npm test -- tests/unit/mindmap-document-lifecycle-parity.test.tsx

 RUN  v4.1.11 /Users/mr.chem/Documents/Lap-trinh/Dashboard-update

 ✓ tests/unit/mindmap-document-lifecycle-parity.test.tsx (7 tests) 743ms
   ✓ Phase P7.C — Document Persistence & Export Parity Hardening (7)
     ✓ Scenario 1: handleSaveVersion persists workingDocumentTree modifications (not stale projection)  307ms
     ✓ Scenario 2: handleSaveDocument persists active tree when initiated from Live topic canvas 110ms
     ✓ Scenario 3: Dirty state badge is preserved if save operation fails 139ms
     ✓ Scenario 4: Standalone document where projection is null is not disabled and allows saving 55ms
     ✓ Scenario 5: handleCopyMarkdown exports workingDocumentTree outline in edit mode 71ms
     ✓ Scenario 6: handleExportSvg exports workingDocumentTree in edit mode 48ms
     ✓ Scenario 7: Live topic read-only mode exports projection normally without regression 8ms

 Test Files  1 passed (1)
      Tests  7 passed (7)
   Start at  11:29:05
   Duration  2.64s
```

### 5.3. Regression Suite: `mindmap-import-file-to-document.test.tsx` (Phase M1)
```text
$ npm test -- tests/unit/mindmap-import-file-to-document.test.tsx

 RUN  v4.1.11 /Users/mr.chem/Documents/Lap-trinh/Dashboard-update

 ✓ tests/unit/mindmap-import-file-to-document.test.tsx (7 tests) 350ms
   ✓ Phase M1 — External Markdown Import to Saved Mind Map Document (7)
     ✓ Scenario 1: File picker loads .md file text into textarea without storage side-effect 98ms
     ✓ Scenario 2: Diagnostics and tree update after file loading 24ms
     ✓ Scenario 3 & 4: 'Lưu thành tài liệu' is enabled without category, while 'Nhập vào CSDL' requires category 28ms
     ✓ Scenario 5: Malformed markdown with syntax errors disables 'Lưu thành tài liệu' 15ms
     ✓ Scenario 6: 'Lưu thành tài liệu' creates document in storage with root heading title 17ms
     ✓ Scenario 7 & 8: Created document is opened immediately in MindMapView and reopenable 143ms
     ✓ Scenario 9: Storage failure surfaces error banner and keeps modal open 23ms

 Test Files  1 passed (1)
      Tests  7 passed (7)
   Start at  11:29:12
   Duration  2.38s
```

### 5.4. Regression Suite: `mindmap-persistence-ui.test.tsx` (Phase P1)
```text
$ npm test -- tests/unit/mindmap-persistence-ui.test.tsx

 RUN  v4.1.11 /Users/mr.chem/Documents/Lap-trinh/Dashboard-update

 ✓ tests/unit/mindmap-persistence-ui.test.tsx (10 tests) 147ms
   ✓ Mind Map Persistence UI Modals (Phase P1) (10)
     ✓ MindMapSaveModal (5)
       ✓ renders save new document form with prefilled default title 36ms
       ✓ rejects empty title and shows validation error message 12ms
       ✓ submits valid new document data 13ms
       ✓ displays volatile memory warning banner when isVolatile is true 6ms
       ✓ renders save version mode when activeDocument is provided 9ms
     ✓ MindMapDocumentBrowserModal (5)
       ✓ renders saved document cards with titles, versions and active indicator 26ms
       ✓ filters documents dynamically via search input 15ms
       ✓ triggers onOpenDocument when clicking a document card 6ms
       ✓ allows inline renaming and triggers onRenameDocument 15ms
       ✓ triggers onArchiveDocument when clicking archive icon 5ms

 Test Files  1 passed (1)
      Tests  10 passed (10)
   Start at  11:29:19
   Duration  1.27s
```

### 5.5. Typecheck Suite: `npx tsc --noEmit`
```text
$ npx tsc --noEmit
# Exit code: 0
# Stdout: (empty)
# Stderr: (empty)
```

---

## 6. Technical Deviations & Architectural Notes

### Phân định Runtime Field `type` vs Persisted Field `nodeType`
1. **Bản chất**:
   - Runtime tree (`MindMapTreeNode`): sử dụng thuộc tính `type: 'root' | 'category' | 'topic'`. Cấu trúc này tối ưu cho việc render canvas và tính toán layout tọa độ.
   - Persisted document tree (`MindMapDocumentNode`): sử dụng thuộc tính `nodeType: 'root' | 'category' | 'topic'`, đồng thời hỗ trợ `semanticBadge?: string` và `sourceIdReference?: { sourceTopicId?: string; originalCategoryId?: string }`.
2. **Giải pháp kiến trúc không gây ô nhiễm (Non-intrusive Seam)**:
   - Thay vì mở rộng runtime `MindMapTreeNode` bằng các trường persisted, `MindMapView.tsx` tạo helper nội bộ `findDocumentNodeById(nodeId, docTree)`.
   - Khi `activeDrawerNode` được tính toán, hệ thống lấy `id` và `title` từ `workingDocumentTree` (nguồn sống đang edit), đồng thời tra cứu bổ sung `nodeType`, `semanticBadge`, `sourceIdReference` từ `activeDocumentVersion.treeData`.
   - Nhờ đó:
     - Drawer hiển thị đầy đủ và chính xác metadata của tài liệu mà không cần chỉnh sửa engine chiếu (`mindmapProjection.ts`).
     - Việc sửa title trên runtime tree không làm sai lệch hay mất mát các trường metadata đã lưu của document version.

---

## 7. Blast Radius Review

- **No Regression on Live Mode**: Drawer hoàn toàn trơ/không hiển thị khi người dùng làm việc trong chế độ cây chuyên đề sống (`activeMode === "live-topics"`).
- **Selection Safety**: State `activeDrawerNodeId` là độc lập. Người dùng đóng drawer không gây deselect canvas node.
- **Data Integrity**: Gõ phím không gây trigger write storage hay dirty state giả. Toàn bộ thay đổi phải đi qua `applyTreeMutation` và được lưu phiên bản tường minh.
- **Rollback Safety**: Chỉ cần revert 1 file duy nhất (`src/components/mindmap/MindMapView.tsx`) và xóa component mới `src/components/mindmap/MindMapNodeDrawer.tsx` là có thể đưa hệ thống về đúng baseline Phase M1 mà không để lại tác dụng phụ.

---

## 8. Rollback Plan

Nếu cần rollback Phase M2:
```bash
# 1. Hủy bỏ thay đổi trong MindMapView.tsx
git checkout -- src/components/mindmap/MindMapView.tsx

# 2. Xóa component và tests mới của M2
rm src/components/mindmap/MindMapNodeDrawer.tsx
rm tests/unit/mindmap-node-drawer.test.tsx
rm docs/adr/ADR-094-phase-m2-title-only-inline-node-drawer.md
rm docs/specs/mindmap-phase-m2-planning-spec-v1.md
rm docs/reports/mindmap-phase-m2-closure-report.md
```

---

## 9. Git Status Audit

```text
On branch main
Your branch is ahead of 'origin/main' by 2 commits.
  (use "git push" to publish your local commits)

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   src/components/mindmap/MindMapView.tsx

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	docs/adr/ADR-094-phase-m2-title-only-inline-node-drawer.md
	docs/reports/mindmap-phase-m2-closure-report.md
	docs/specs/mindmap-phase-m2-planning-spec-v1.md
	src/components/mindmap/MindMapNodeDrawer.tsx
	tests/unit/mindmap-node-drawer.test.tsx

no changes added to commit (use "git add" and/or "git commit -a")
```

---

## 10. Explicit Confirmation

- [x] **No `git add` / stage**: Chưa thực hiện staging bất kỳ file nào.
- [x] **No `git commit`**: Chưa tạo commit mới.
- [x] **No `git push`**: Chưa push bất kỳ dữ liệu nào lên remote.
- [x] **Full Green Verification**: Toàn bộ unit tests mục tiêu, regression suites, và typecheck đều đạt 100% Pass.
