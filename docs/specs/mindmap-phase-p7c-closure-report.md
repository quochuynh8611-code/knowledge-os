# Phase P7.C Closure Report — Document Persistence & Export Parity Hardening

**Trạng thái**: Implementation hoàn tất; đã kiểm chứng qua targeted tests, regression suites liên quan và TypeScript compile (Pending Commit)  
**Tác giả**: Staff Software Engineer / Technical Architect  
**Ngày hoàn tất**: 2026-10-10  
**Giai đoạn trước**: Phase P7.B (Commit `a850af3`)  
**Tài liệu tham chiếu**:
- [mindmap-phase-p7c-planning-spec-v1.md](mindmap-phase-p7c-planning-spec-v1.md)
- [ADR-093-phase-p7c-active-tree-lifecycle-parity.md](../adr/ADR-093-phase-p7c-active-tree-lifecycle-parity.md)

---

## 1. Problem Statement Thực Tế Đã Xử Lý

Qua kiểm tra mã nguồn và kiểm thử hành vi thực tế trên `src/components/mindmap/MindMapView.tsx`:

### 1.1. Lỗi đã được chứng minh trực tiếp (Directly Proven Bugs):
1. **Nút Lưu bị vô hiệu hóa trên Standalone Document**: Khi mở một tài liệu độc lập đã lưu (không liên kết với bất kỳ topic nào trong `DataContext`), `projection` ban đầu có thể là `null`. Nút hành động Lưu (`btn-save-mindmap`) có ràng buộc cứng `disabled={!projection}`, dẫn đến việc người dùng bị khóa nút Lưu mặc dù trên canvas đang có cây tài liệu (`workingDocumentTree`) hợp lệ.
2. **Silent No-op trong Guard của Save Handlers**: Hàm `handleSaveVersion` có điều kiện thoát cứng `if (!activeDocumentId || !projection?.tree) return;` và `handleSaveNewDocument` có `if (!projection?.tree) return;`. Khi `projection?.tree` là `null`, thao tác bấm xác nhận lưu sẽ bị bỏ qua trong im lặng (silent no-op), không thể lưu phiên bản mới của tài liệu độc lập.

### 1.2. Biện pháp phòng vệ chống hồi quy (Regression Guards):
- Kiểm chứng `handleSaveVersion` trên working document đã chỉnh sửa phải persist đúng cây đã sửa đổi (`workingDocumentTree`) vào storage thay vì cây chưa sửa đổi.
- Kiểm chứng `handleSaveDocument` khởi tạo từ Live topic canvas phản ánh đúng cây hoạt động.
- Kiểm chứng trạng thái dirty (`isDirty` badge) được bảo toàn nếu lưu thất bại (atomic dirty state).
- Kiểm chứng chế độ Live Topic thuần túy (read-only) tiếp tục hoạt động và xuất bản bình thường mà không bị ảnh hưởng trong các test hiện có.

### 1.3. Tăng cường tính nhất quán (Consistency Hardening):
- Đồng bộ hóa điều kiện disabled trên các nút xuất bản (`btn-export-svg`, `btn-export-png`, `handleCopyMarkdown`) sang `disabled={!(workingDocumentTree || projection)}`.
- Cập nhật hook `projection` (`useMemo`) để đưa `workingDocumentTree` vào danh sách dependencies và hỗ trợ fallback derivation khi `(workingDocumentTree || activeDocumentVersion)`, cải thiện và duy trì parity giữa projection và working document tree trên canvas trong các scenario được kiểm thử.

---

## 2. Files Changed Thực Tế

### Runtime Files:
1. `src/components/mindmap/MindMapView.tsx`:
   - Dòng 240–289: Cập nhật `projection` `useMemo` để tính toán dựa trên `(workingDocumentTree || activeDocumentVersion)` và bổ sung `workingDocumentTree` vào dependencies.
   - Dòng 1012 & 1062: Áp dụng active tree resolution tối thiểu: `const activeTree = workingDocumentTree || projection?.tree;` cho `handleSaveNewDocument` và `handleSaveVersion`.
   - Dòng 1412, 1425, 1455, 1563: Chuyển điều kiện vô hiệu hóa các nút Export và Save sang `disabled={!(workingDocumentTree || projection)}`.

### Test Files:
1. `tests/unit/mindmap-document-lifecycle-parity.test.tsx` (Mới):
   - Xây dựng 7 kịch bản kiểm thử toàn diện bao gồm cả proof of RED và regression guards.

### Specification & ADR Files:
1. `docs/specs/mindmap-phase-p7c-planning-spec-v1.md`
2. `docs/adr/ADR-093-phase-p7c-active-tree-lifecycle-parity.md`
3. `docs/specs/mindmap-phase-p7c-closure-report.md` (Tài liệu này)

---

## 3. Những Gì Được Sửa và Không Sửa

### Những gì ĐÃ SỬA:
- Sử dụng `activeTree = workingDocumentTree || projection?.tree` làm nguồn duy nhất cho các tác vụ lưu trữ (`handleSaveNewDocument`, `handleSaveVersion`).
- Thay thế điều kiện disable của `btn-save-mindmap` và các nút export (`SVG`, `PNG`, `Markdown`) từ `!projection` sang `!(workingDocumentTree || projection)`.
- Đưa `workingDocumentTree` vào dependency array của hook `projection` derivation.

### Những gì KHÔNG SỬA (Giữ nguyên blast radius tối thiểu):
- **Không sửa `src/context/DataContext.tsx`**: Giữ nguyên toàn bộ observable contract và cách thức cung cấp topics/notes.
- **Không sửa `src/lib/mindmapProjection.ts`**: Giữ nguyên thuật toán chiếu `projectToMindMapTree`.
- **Không thay đổi backend / schema**: Không có route API mới, không có Prisma schema migration.
- **Không can thiệp cử chỉ Canvas**: Giữ nguyên logic pan/zoom, marquee selection (Phase P7.A & P7.B), kéo thả node và các overlay đồ thị.

---

## 4. Tests Đã Chạy & Evidence Kết Quả

### 4.1. Targeted Test Suite — Document Lifecycle Parity
```bash
npm test -- tests/unit/mindmap-document-lifecycle-parity.test.tsx
```
**Kết quả: 7/7 tests PASSED (Exit code: 0, Thời gian: 421ms)**
- `Scenario 1`: handleSaveVersion persists workingDocumentTree modifications (not stale projection) — **PASS**
- `Scenario 2`: handleSaveDocument persists active tree when initiated from Live topic canvas — **PASS**
- `Scenario 3`: Dirty state badge is preserved if save operation fails — **PASS**
- `Scenario 4`: Standalone document where projection is null is not disabled and allows saving — **PASS** (Đã chuyển từ RED sang GREEN)
- `Scenario 5`: handleCopyMarkdown exports workingDocumentTree outline in edit mode — **PASS**
- `Scenario 6`: handleExportSvg exports workingDocumentTree in edit mode — **PASS**
- `Scenario 7`: Live topic read-only mode exports projection normally without regression — **PASS**

### 4.2. Regression Test Suites — Marquee Selection
```bash
npm test -- tests/unit/mindmap-marquee-modifiers.test.tsx tests/unit/mindmap-marquee-selection.test.tsx
```
**Kết quả: 21/21 tests PASSED (Exit code: 0, Thời gian: 1.23s)**
- `mindmap-marquee-selection.test.tsx`: 11/11 tests pass.
- `mindmap-marquee-modifiers.test.tsx`: 10/10 tests pass.

### 4.3. Type Safety Verification
```bash
npx tsc --noEmit
```
**Kết quả: Clean, 0 errors (Exit code: 0)**

---

## 5. Blast Radius & Đánh Giá Rủi Ro

| Tiêu chí | Đánh giá | Ghi chú |
| :--- | :--- | :--- |
| **Phạm vi mã nguồn** | Rất hẹp (Tối thiểu) | Chỉ sửa đổi cục bộ trong component `MindMapView.tsx`. |
| **Tính tương thích ngược** | Duy trì | Bảo toàn baseline cho Live topic mode (`activeMode === "topic"`) trong các scenario được kiểm thử. |
| **Local-First Safety** | An toàn | Không gửi request ra mạng, không thay đổi storage key format `knowledge_os_mindmap_docs_v1`. |
| **Residual Risks** | Thấp trong phạm vi kiểm thử | Các tương tác UI chính liên quan đến lưu trữ và xuất bản đã được bao phủ bởi 7 scenarios kiểm thử tự động; full repository verification chưa chạy trong vòng này. |

---

## 6. Kết Luận
Phase P7.C đã hoàn tất implementation tối thiểu và củng cố parity cho vòng đời lưu trữ và xuất bản tài liệu Mind Map trong phạm vi các scenario kiểm thử. Các regression test liên quan (Marquee suites) và TypeScript check đạt kết quả sạch (0 error). Giai đoạn này đã sẵn sàng để chuyển sang bước kiểm tra staged diff và phê duyệt commit.
