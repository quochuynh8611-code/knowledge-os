# Báo Cáo Đóng Gói (Closure Report): Milestone M5a — Mind Map Multi-Parent / Cross-Link Editing UI

**Ngày lập báo cáo:** 2026-10-12\
**Phiên làm việc:** Step 6 — Documentation & Closure Only\
**Vai trò:** Staff Software Engineer kiêm Technical Architect\
**Trạng thái đề xuất:** 📋 **READY FOR REVIEW (Chờ xem xét và phê duyệt từ Tech Lead / Product Owner)**\
**Branch:** `main` (ahead 10 commits vs `origin/main`)

---

## 1. Phạm Vi Thực Hiện (Scope & Boundaries)

### 1.1. Trong Phạm Vi (In Scope)
- Triển khai pure validation & cascade pruning helpers cho liên kết chéo (`src/lib/mindmapCrossLinks.ts`).
- Mở rộng hệ thống quản lý lịch sử sang composite snapshot `{ tree, crossLinks }` với khả năng tương thích đa hình (`src/lib/mindmapHistory.ts`).
- Xây dựng giao diện Drawer-Centric trong `MindMapNodeDrawer.tsx` để xem danh sách liên kết, tạo liên kết mới với kiểm tra ràng buộc (self-link, duplicate edge, cycle), và gỡ liên kết.
- Tích hợp working runtime state `workingDocumentCrossLinks` trong `MindMapView.tsx`, đồng bộ lưu phiên bản bất biến (`appendMindMapVersion`), thu dọn liên kết khi xóa node, và hoàn tác/làm lại qua phím tắt `⌘Z` / `⇧⌘Z`.
- Tạo và vượt qua 100% bộ 13 test cases M5a được định nghĩa theo phong cách Test-First.

### 1.2. Ngoài Phạm Vi Tuyệt Đối (Out of Scope Guardrails)
- ❌ **Không làm Canvas Drag-to-Connect**: Hoãn sang Phase M5b để tránh rủi ro tương tác với viewport pan/zoom và marquee selection.
- ❌ **Không thay đổi Schema / Database Migration**: Không thay đổi schema PostgreSQL hay `MindMapDocumentEdge`.
- ❌ **Không tự động lưu ngầm (Auto-Persist)**: Toàn bộ đột biến chỉ lưu khi người dùng chủ động bấm "Lưu phiên bản", tôn trọng Leave Guard.
- ❌ **Không sửa các test fail có sẵn ngoài phạm vi**: Bảo toàn nguyên vẹn hiện trạng của repository.
- ❌ **Không can thiệp chế độ `live-topics`**: Các tính năng M5a chỉ kích hoạt trong chế độ `saved-document`.

---

## 2. Ma Trận Truy Xuất Yêu Cầu (Requirement Traceability Matrix)

| STT | Yêu Cầu / Kịch Bản | Đặc Tả / Gherkin | File Test Mới | Kết Quả | Bằng Chứng Kiểm Thử |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Thêm cross-link từ Drawer | Scenario 1: Add cross-link from drawer | [`tests/unit/mindmap-crosslink-drawer.test.tsx`](../../tests/unit/mindmap-crosslink-drawer.test.tsx) | **PASS** | `mockOnAddCrossLink` được gọi với target, edgeType, label chính xác |
| 2 | Chặn tự liên kết (self-link) | Scenario 2: Reject self-link | [`tests/unit/mindmap-crosslink-drawer.test.tsx`](../../tests/unit/mindmap-crosslink-drawer.test.tsx) | **PASS** | `CANNOT_LINK_SELF` hiển thị lỗi, không gọi callback |
| 3 | Chặn cạnh trùng lặp (duplicate edge) | Scenario 3: Reject duplicate edge | [`tests/unit/mindmap-crosslink-drawer.test.tsx`](../../tests/unit/mindmap-crosslink-drawer.test.tsx) | **PASS** | `DUPLICATE_CROSS_LINK` hiển thị banner lỗi |
| 4 | Chặn vòng lặp (cycle rejection) | Scenario 4: Reject cycle | [`tests/unit/mindmap-crosslink-drawer.test.tsx`](../../tests/unit/mindmap-crosslink-drawer.test.tsx) | **PASS** | BFS phát hiện đường đi ngược, trả về `CYCLE_DETECTED` |
| 5 | Gỡ cross-link từ Drawer | Scenario 5: Remove cross-link from drawer | [`tests/unit/mindmap-crosslink-drawer.test.tsx`](../../tests/unit/mindmap-crosslink-drawer.test.tsx) | **PASS** | Nút gỡ gọi `onRemoveCrossLink(edgeId)` |
| 6 | Xóa node & cascade prune | Scenario 6: Delete node and cascade prune | [`tests/unit/mindmap-crosslink-history.test.ts`](../../tests/unit/mindmap-crosslink-history.test.ts) | **PASS** | `pruneDanglingCrossLinks` loại bỏ cả edge có source hoặc target bị xóa |
| 7 | Undo thêm cross-link | Scenario 7: Undo add cross-link | [`tests/unit/mindmap-crosslink-history.test.ts`](../../tests/unit/mindmap-crosslink-history.test.ts) | **PASS** | `undoDocumentHistory` đưa `crossLinks` về trạng thái trước đó |
| 8 | Redo thêm cross-link | Scenario 8: Redo add cross-link | [`tests/unit/mindmap-crosslink-history.test.ts`](../../tests/unit/mindmap-crosslink-history.test.ts) | **PASS** | `redoDocumentHistory` khôi phục liên kết vừa thêm |
| 9 | Undo xóa node phục hồi cả cây & liên kết | Scenario 9: Undo delete node restores both | [`tests/unit/mindmap-crosslink-history.test.ts`](../../tests/unit/mindmap-crosslink-history.test.ts) | **PASS** | Undo khôi phục đồng thời cả node con trong tree và edge trong crossLinks |
| 10 | Lưu phiên bản chứa cross-links | Scenario 10: Save persists cross-links | [`tests/integration/mindmap-crosslink-save-workflow.test.tsx`](../../tests/integration/mindmap-crosslink-save-workflow.test.tsx) | **PASS** | `appendMindMapVersion` nhận đúng payload `crossLinks: [edge]` |
| 11 | Lưu sau khi prune không lỗi dangling | Scenario 11: Save after prune no dangling | [`tests/integration/mindmap-crosslink-save-workflow.test.tsx`](../../tests/integration/mindmap-crosslink-save-workflow.test.tsx) | **PASS** | `validateDocumentInput` trả về `{ valid: true }`, không gặp `DANGLING_EDGE_REFERENCE` |

---

## 3. Tóm Tắt Triển Khai (Implementation Summary)

| File Production | Trách Nhiệm Chính | Thay Đổi Cốt Lõi | Rủi Ro Tiềm Ẩn | Bằng Chứng Test |
| :--- | :--- | :--- | :--- | :--- |
| [`src/lib/mindmapCrossLinks.ts`](../../src/lib/mindmapCrossLinks.ts) *(Tạo mới)* | Pure validation & cascade pruning | - `validateCrossLinkMutation`: Kiểm tra self-link, duplicate edge, và chu trình chuỗi (BFS qua tree edges + cross-links).<br>- `pruneDanglingCrossLinks`: Lọc các cạnh có source/target nằm ngoài `validNodeIds`. | Rủi ro tính toán chu trình nếu cây có cấu trúc đồ thị lớn (đã kiểm soát qua giới hạn độ sâu BFS). | [`mindmap-crosslink-history.test.ts`](../../tests/unit/mindmap-crosslink-history.test.ts) (2 tests pure helper PASS). |
| [`src/lib/mindmapHistory.ts`](../../src/lib/mindmapHistory.ts) | Quản lý lịch sử hoàn tác | - Định nghĩa `MindMapDocumentSnapshot = { tree, crossLinks }`.<br>- Thêm `createMindMapDocumentHistory`, `pushDocumentHistoryMutation`, `undoDocumentHistory`, `redoDocumentHistory`.<br>- Polymorphic helpers cho `canUndo`, `canRedo`, `isHistoryDirty`, `commitHistorySave`, `resetHistoryToSavedBaseline`. | Rủi ro hồi quy test cũ của history (đã chạy suite cũ 11/11 PASS). | [`mindmap-history.test.ts`](../../tests/unit/mindmap-history.test.ts) (11 tests PASS) & [`mindmap-crosslink-history.test.ts`](../../tests/unit/mindmap-crosslink-history.test.ts) (5 tests PASS). |
| [`src/components/mindmap/MindMapNodeDrawer.tsx`](../../src/components/mindmap/MindMapNodeDrawer.tsx) | UI biên tập liên kết chéo tại Drawer | - Thêm props nhận `crossLinks`, `availableNodes`, `onAddCrossLink`, `onRemoveCrossLink`, `treeRoot`.<br>- Render danh sách liên kết gắn với node hiện tại.<br>- Form thêm liên kết kèm dropdown, type selector, nhãn, validation error banner. | Rủi ro layout bị tràn khi danh sách link dài (đã giải quyết qua `max-h-36 overflow-y-auto` và `max-h-[calc(100vh-2rem)]`). | [`mindmap-crosslink-drawer.test.tsx`](../../tests/unit/mindmap-crosslink-drawer.test.tsx) (6 tests PASS) & [`mindmap-node-drawer.test.tsx`](../../tests/unit/mindmap-node-drawer.test.tsx) (7 tests PASS). |
| [`src/components/mindmap/MindMapView.tsx`](../../src/components/mindmap/MindMapView.tsx) | Điều phối Studio State & Persistence | - State `workingDocumentCrossLinks`.<br>- Map `crossEdges` từ working state.<br>- Tích hợp `pruneDanglingCrossLinks` vào `applyMutation`.<br>- Gắn callback Drawer thêm/xóa link.<br>- Tích hợp `appendMindMapVersion` với payload crossLinks đã prune.<br>- Đồng bộ Undo/Redo cho toàn bộ composite snapshot. | Rủi ro lệch trạng thái giữa tree và crossLinks (đã bảo vệ bằng pure pruner và composite history). | [`mindmap-crosslink-save-workflow.test.tsx`](../../tests/integration/mindmap-crosslink-save-workflow.test.tsx) (2 tests PASS) & [`mindmap-document-lifecycle-parity.test.tsx`](../../tests/unit/mindmap-document-lifecycle-parity.test.tsx) (7 tests PASS). |

---

## 4. Kết Quả Xác Minh Hệ Thống (Verification Results)

| Hạng Mục Kiểm Tra | Lệnh Thực Thi | Kết Quả | Ghi Chú |
| :--- | :--- | :--- | :--- |
| **M5a Test Suite** | `npx vitest run tests/unit/mindmap-crosslink-drawer.test.tsx tests/unit/mindmap-crosslink-history.test.ts tests/integration/mindmap-crosslink-save-workflow.test.tsx` | **13/13 PASS** | Toàn bộ 3 file test M5a đạt 100% tỷ lệ vượt qua. |
| **Mind Map Regression Suite (Batch 1)** | `npx vitest run tests/unit/mindmap-node-drawer.test.tsx tests/unit/mindmap-history.test.ts tests/unit/mindmap-document-storage.test.ts tests/unit/mindmap-tree-mutations.test.ts tests/unit/mindmap-batch-mutations.test.ts tests/unit/mindmap-viewport-zoom.test.tsx tests/unit/mindmap-crosslinks-projection.test.ts tests/unit/mindmap-undo-redo.test.tsx` | **106/106 PASS** | Không có hồi quy trong các module cốt lõi của Mind Map. |
| **Mind Map Regression Suite (Batch 2)** | `npx vitest run tests/unit/mindmap-crosslinks-overlay.test.tsx tests/unit/mindmap-crosslinks-interaction.test.tsx tests/unit/mindmap-canvas-drag-drop.test.tsx tests/unit/mindmap-minimap.test.tsx tests/unit/mindmap-keyboard-nav.test.tsx tests/unit/mindmap-keyboard-authoring.test.tsx tests/unit/mindmap-document-lifecycle-parity.test.tsx` | **80/80 PASS** | Toàn bộ các suite liên quan đến Canvas, Minimap, Keyboard authoring, và Lifecycle Parity đều PASS. |
| **Git Diff Syntax & Whitespace** | `git diff --check` | **PASS (Code 0)** | Không có lỗi whitespace, không có xung đột, không có dòng trống dư thừa cuối file. |
| **TypeScript Typecheck** | `npx tsc --noEmit` | **3 Errors (Ghi nhận)** | Phát hiện 3 lỗi type annotation nhỏ cần gỡ (chi tiết tại Mục 5.2 bên dưới). |

---

## 5. Các Lỗi Đã Biết & Phát Hiện (Known Failures & Diagnostics)

### 5.1. Lỗi Test Cũ Ngoài Phạm Vi (`mindmap-canvas-editing.test.tsx:221`)
- **Lệnh thực thi:** `npx vitest run tests/unit/mindmap-canvas-editing.test.tsx`
- **Kết quả:** 11 passed, 1 failed.
- **Chi tiết lỗi chính xác:**
  ```text
  FAIL tests/unit/mindmap-canvas-editing.test.tsx > Mind Map Canvas Editing Affordances (Phase P2) > Keyboard Shortcuts & Focus Hardening (Phase P2.x) > handles Tab or Insert key to add child under focused node when isEditable is true
  AssertionError: expected "vi.fn()" to be called with arguments: [ 'node-kho-de' ]
  Received: [ 'node-kho-de', { 'title': 'New node' } ]
  ```
- **Xác nhận nguồn gốc:** Đây là lỗi đã tồn tại trước (pre-existing) từ các phase trước (Phase P7/M3 đã cập nhật `onAddChild` nhận thêm payload `{ title: "New node" }`, trong khi test P2 cũ vẫn mong đợi chữ ký 1 tham số `nodeId`).
- **Mức độ rủi ro:** Thấp, không ảnh hưởng đến tính năng runtime của Phase M5a.
- **Biện pháp:** Không sửa trong phạm vi closure này theo đúng quy tắc OODA; đưa vào danh mục theo dõi tiếp theo.

### 5.2. Các Lỗi Type Annotation do `tsc --noEmit` Phát Hiện
Khi chạy `npx tsc --noEmit`, TypeScript compiler báo 3 lỗi:
1. `src/components/mindmap/MindMapNodeDrawer.tsx:4:31` (error TS2459): `LinkType` được import từ `"../../types/mindmapDocument"`, trong khi `mindmapDocument.ts` import nội bộ từ `./index` nhưng không re-export. Nguồn export chuẩn là `"../../types"`.
2. `src/lib/mindmapCrossLinks.ts:6:10` (error TS2459): Tương tự, `LinkType` nên được import từ `"../types"`.
3. `src/components/mindmap/MindMapView.tsx:1301:25` (error TS2345): Trong hàm `handleCreateDocumentFromTopic`, lời gọi `setHistoryState` có nhánh fallback `createMindMapHistory(activeTree)` trả về kiểu `MindMapHistoryState`, trong khi state hiện tại là `MindMapDocumentHistoryState`. Lời gọi nên là `createMindMapDocumentHistory(activeTree)`.

> [!NOTE]
> Do quy tắc của Bước 6 yêu cầu: *"Chỉ được tạo `docs/planning/M5a-closure-report.md`, không sửa source code, không sửa test, nếu phát hiện lỗi mới chỉ ghi nhận và dừng"*, kiến trúc sư đã ghi nhận trung thực 3 lỗi type annotation trên vào báo cáo này để xử lý tại follow-up patch trước khi commit.

---

## 6. Đối Chiếu Tính Tuân Thủ Kiến Trúc (ADR & Spec Conformance)

| Tài Liệu Kiến Trúc | Nội Dung Cam Kết | Hiện Trạng Triển Khai | Kết Luận |
| :--- | :--- | :--- | :--- |
| [`ADR-M5-001`](../adr/ADR-M5-001-cross-link-working-state.md) | State độc lập `workingDocumentCrossLinks` trong `MindMapView.tsx`, không sửa schema DB, không auto-persist. | Đã triển khai chính xác: State độc lập trong bộ nhớ runtime, mapping trực tiếp vào `crossEdges`, chỉ persist khi gọi `appendMindMapVersion`. | ✅ **CONFORMANT** |
| [`ADR-M5-002`](../adr/ADR-M5-002-cross-link-history-and-pruning.md) | Snapshot lịch sử hợp nhất `{ tree, crossLinks }` cho Undo/Redo; Pure helper `pruneDanglingCrossLinks` dọn sạch cạnh rác. | Đã triển khai chính xác: Undo/Redo khôi phục đồng thời; Pure helper loại bỏ triệt để nguy cơ `DANGLING_EDGE_REFERENCE`. | ✅ **CONFORMANT** |
| [`m5-cross-link-editing.md`](../specs/m5-cross-link-editing.md) | Giao diện Drawer-Centric làm trọng tâm M5a; Canvas drag-to-connect hoãn sang M5b; Chặn self-link, duplicate, cycle. | Đã triển khai chính xác: Đầy đủ các input và bộ lọc kiểm tra hợp lệ tại `MindMapNodeDrawer.tsx`. | ✅ **CONFORMANT** |

---

## 7. Mức Độ Sẵn Sàng Phát Hành (Release Readiness)

- **Phân loại hiện tại:** 🟡 **READY FOR REVIEW**
- **Đánh giá:**
  - Về mặt chức năng và hành vi người dùng: Toàn bộ 11/11 kịch bản Gherkin và 13/13 test cases đều hoàn thành xuất sắc và vượt qua kiểm thử.
  - Về mặt an toàn hệ thống: Không có bất kỳ hồi quy nào trên toàn bộ các test suite liên quan của Mind Map.
  - Về mặt tiêu chuẩn xuất xưởng: Cần áp dụng một bản vá nhỏ (touch-up patch) cho 3 lỗi import/type annotation của `tsc` trước khi tạo commit chính thức.

---

## 8. Các Hạng Mục Cần Thực Hiện Tiếp Theo (Follow-up Items)

1. **Touch-up Type Annotations (Ưu tiên P0 trước khi commit):**
   - Chuyển import `LinkType` trong `MindMapNodeDrawer.tsx` và `mindmapCrossLinks.ts` sang `"../../types"`.
   - Cập nhật nhánh khởi tạo `handleCreateDocumentFromTopic` trong `MindMapView.tsx` sang `createMindMapDocumentHistory(activeTree)` để đạt `tsc --noEmit` hoàn hảo (0 error).
2. **Cập nhật Test Cũ Ngoài Scope (Ưu tiên P1):**
   - Đồng bộ assertion tại `tests/unit/mindmap-canvas-editing.test.tsx:221` để chấp nhận payload `{ title: "New node" }`.
3. **UX Feedback Toast khi Thu Dọn Cạnh Rác (Ưu tiên P2):**
   - Khi xóa node cha/nhánh kéo theo xóa nhiều liên kết chéo ngầm, hiển thị thông báo Toast: *"Đã xóa nút và dọn dẹp {n} liên kết chéo liên quan"*.
4. **Accessibility (A11y) Keyboard Flow cho Drawer (Ưu tiên P2):**
   - Tối ưu hóa focus trap và phím Tab chuyển đổi giữa các control trong form tạo liên kết chéo.
5. **Phase M5b — Canvas Direct Drag-to-Connect (Tương lai):**
   - Thiết kế tương tác kéo thả trực tiếp giữa các node trên canvas khi người dùng yêu cầu trải nghiệm vẽ trực quan.

---

## 9. Trạng Thái Git Cuối Cùng

```bash
git diff --stat
 src/components/mindmap/MindMapNodeDrawer.tsx | 221 ++++++++++++++++++++++++++-
 src/components/mindmap/MindMapView.tsx       | 198 ++++++++++++++++++------
 src/lib/mindmapHistory.ts                    | 198 ++++++++++++++++++++++--
 3 files changed, 558 insertions(+), 59 deletions(-)

git status --short --branch
## main...origin/main [ahead 10]
 M src/components/mindmap/MindMapNodeDrawer.tsx
 M src/components/mindmap/MindMapView.tsx
 M src/lib/mindmapHistory.ts
?? docs/adr/ADR-M5-001-cross-link-working-state.md
?? docs/adr/ADR-M5-002-cross-link-history-and-pruning.md
?? docs/planning/M5-observe-orient.md
?? docs/planning/M5a-closure-report.md
?? docs/session-logs/2026-10-11-mindmap-m2-closure-and-personal-knowledge-os-upgrade-plan.md
?? docs/specs/m5-cross-link-editing.md
?? src/lib/mindmapCrossLinks.ts
?? tests/integration/mindmap-crosslink-save-workflow.test.tsx
?? tests/unit/mindmap-crosslink-drawer.test.tsx
?? tests/unit/mindmap-crosslink-history.test.ts
```

🛑 **KẾT THÚC BƯỚC 6 (DOCUMENTATION & CLOSURE). DỪNG LẠI TẠI HUMAN APPROVAL GATE.**
Chưa commit, chưa push. Báo cáo hoàn tất và đang chờ quyết định từ bạn.
