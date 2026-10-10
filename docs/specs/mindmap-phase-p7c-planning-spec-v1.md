# Phase P7.C Planning Spec — Document Persistence & Export Parity Hardening

Status: Implementation hoàn tất; đã kiểm chứng qua targeted tests, regression suites liên quan và TypeScript compile (Pending Commit)
Phase: P7.C
Track: Mind Map Persistence / Lifecycle & Export Parity
Depends on: Phase P7.B (commit `a850af3`)
Implementation mode: Test-first, approval-gated
Closure report: [mindmap-phase-p7c-closure-report.md](mindmap-phase-p7c-closure-report.md)

---

## 1. Problem Statement
Qua rà soát mã nguồn thực tế tại `src/components/mindmap/MindMapView.tsx`:
1. `handleSaveDocument` và `handleSaveVersion` (dòng 1011–1013 và 1062–1064) đang đọc trực tiếp từ `projection.tree` thay vì ưu tiên `workingDocumentTree`. Khi người dùng chỉnh sửa sơ đồ trên canvas (đổi tên, thêm nút, xóa nút, chuyển quan hệ cha con, hoặc mở rộng bằng AI), các hàm lưu trữ này có nguy cơ persist sai nguồn dữ liệu (lưu phiên bản từ cây chưa sửa đổi).
2. Khi mở một saved document độc lập mà topic gốc không thuộc `DataContext`, `projection` có thể là `null`. Điều kiện `if (!projection?.tree) return;` khiến lệnh lưu phiên bản không được thực thi (silent no-op).
3. Các hàm xuất bản `handleCopyMarkdown` (dòng 442), `handleExportSvg` (dòng 463), và `handleExportPng` (dòng 494) đều truyền trực tiếp `projection` vào các serializer, dẫn đến nguy cơ file xuất bản không phản ánh cấu trúc đang chỉnh sửa trên canvas.
4. Sổ cái `docs/PROJECT_STATUS.md` và `docs/specs/mindmap-next-phases.md` chưa ghi nhận đầy đủ chuỗi phát triển từ P1 đến P7.B (sẽ được reconcile sau khi hoàn tất kiểm thử mã nguồn).

---

## 2. Scope

### 2.1. Core Runtime Scope (Mục tiêu cốt lõi):
1. **Active Tree Resolution tối thiểu**:
   - Xác định nguồn cây hoạt động ưu tiên: `const activeTree = workingDocumentTree || projection?.tree;`.
   - Sử dụng `activeTree` cho `handleSaveDocument` và `handleSaveVersion` để đảm bảo `projectedTreeToDocumentTree` và `collectTreeNodeIds` xử lý trên đúng cây đang chỉnh sửa.
2. **Persistence Resilience cho Standalone Documents**:
   - Cho phép `handleSaveVersion` thực thi khi có `activeDocumentId` và `activeTree`, không phụ thuộc vào sự tồn tại của `projection` trong DataContext.
3. **Export Source Parity tối thiểu**:
   - Đảm bảo `handleCopyMarkdown`, `handleExportSvg`, và `handleExportPng` sử dụng `activeTree` làm nguồn cấu trúc xuất bản mà không tạo thêm abstraction dư thừa ngoài `MindMapView.tsx`.
4. **Trạng thái Dirty State chặt chẽ**:
   - `isDirty` chỉ được xóa (`setIsDirty(false)`) khi thao tác lưu trả về kết quả thành công (`result.success === true`).

### 2.2. Documentation & Ledger Scope (Follow-up sau khi code pass):
- Cập nhật mục Mind Map trong `docs/PROJECT_STATUS.md`.
- Đối chiếu trạng thái hoàn tất trong `docs/specs/mindmap-next-phases.md`.
- Soạn thảo `docs/specs/mindmap-phase-p7c-closure-report.md`.

---

## 3. Non-Goals
- Không tạo component UI mới trên toolbar hoặc canvas.
- Không sửa đổi logic kéo thả marquee selection hoặc cử chỉ canvas.
- Không thay đổi schema Prisma hay thêm endpoint REST backend.
- Không thay đổi observable contract của `DataContext.tsx`.
- Không tạo helper/adapter file mới ngoài `MindMapView.tsx` nếu giải pháp nội bộ đủ đáp ứng type safety.

---

## 4. Invariants (Ranh Giới Bất Biến)
1. Invariant 1 (Source Priority): Khi `workingDocumentTree` khác `null`, nó là nguồn dữ liệu ưu tiên cho mọi thao tác Save và Export.
2. Invariant 2 (Live Topic Safety): Khi ở chế độ Live Topic thuần túy (`workingDocumentTree === null`), mọi hành vi Save và Export giữ nguyên tính tương thích ngược với baseline hiện hành.
3. Invariant 3 (Atomic Dirty State): `isDirty` chỉ được chuyển sang `false` khi storage layer xác nhận lưu thành công.
4. Invariant 4 (Zero Backend Mutation): Toàn bộ xử lý duy trì Local-First, không làm thay đổi trạng thái backend.

---

## 5. Acceptance Criteria
- [x] AC-1: `handleSaveVersion` trên working document đã sửa đổi persist đúng cây mới vào storage.
- [x] AC-2: `handleSaveDocument` khi canvas đang có working copy đã chỉnh sửa khởi tạo document mới với đúng cây đó.
- [x] AC-3: `handleSaveVersion` trên document độc lập (`projection === null`) hoàn tất thành công khi `activeTree` hợp lệ.
- [x] AC-4: `handleCopyMarkdown` xuất outline chứa đúng các node đã chỉnh sửa.
- [x] AC-5: `handleExportSvg` và `handleExportPng` xuất file thể hiện đúng cây đã chỉnh sửa.
- [x] AC-6: `isDirty` giữ nguyên là `true` nếu quá trình lưu thất bại.
- [x] AC-7: Test suites hiện hữu không xuất hiện hồi quy bất ngờ (verified for related marquee suites).
- [x] AC-8: Sổ cái tài liệu được cập nhật đầy đủ sau khi runtime tests đạt GREEN.

---

## 6. Rollback Strategy
Nếu phát hiện lỗi hồi quy trong quá trình kiểm thử, tiến hành hoàn nguyên cục bộ thay đổi logic trong `MindMapView.tsx` về trạng thái nguyên bản sau khi có xác nhận từ Human Operator.
