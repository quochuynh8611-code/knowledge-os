# Báo Cáo Đóng Phase M4a: Mind Map Export UX Hardening

**Ngày hoàn thành:** 2026-10-11  
**Người phụ trách:** Staff Software Engineer kiêm Technical Architect  
**Trạng thái:** ✅ **HOÀN TẤT & ĐƯỢC XÁC MINH CỤC BỘ (LOCAL-ONLY / NOT PUSHED)**  
**Commit Policy:** Chưa stage, chưa commit, chưa push — đang dừng tại Human-Approval Gate.  

---

## 1. Tóm Tắt Kết Quả Triển Khai (Executive Summary)

Phase M4a tập trung củng cố toàn diện trải nghiệm xuất file sơ đồ tư duy (SVG/PNG) trong [`MindMapView.tsx`](../../src/components/mindmap/MindMapView.tsx) mà không thay đổi schema cơ sở dữ liệu hay thuật toán chiếu đồ thị:

1. **Chuẩn Hóa Quy Ước Đặt Tên File (Filename Resolution Contract)**:
   - Trong chế độ tài liệu đã lưu (`saved-document` mode), hệ thống ưu tiên sử dụng `activeDocumentSummary.title` thay vì tiêu đề của node gốc (`projection.rootTitle`).
   - Đảm bảo tính nhất quán tuyệt đối cho cả hai định dạng xuất SVG và PNG: tên file phản ánh chính xác đơn vị tri thức người dùng đang xem và lưu trữ bên ngoài.
   - Fallback an toàn về `projection.rootTitle` và `"Topic"` khi ở chế độ `live-topic` hoặc khi tiêu đề tài liệu trống.

2. **Phản Hồi Trực Quan Người Dùng (Success & Error Toast UX)**:
   - Tích hợp component thông báo chuẩn [`Toast`](../../src/components/ui/Toast.tsx) vào `MindMapView`:
     - **Xuất SVG thành công**: Hiển thị Toast màu xanh lá (`type="success"`) thông báo *"Đã xuất file SVG thành công!"*.
     - **Xuất SVG thất bại**: Hiển thị Toast màu đỏ (`type="error"`) thông báo *"Không thể xuất file SVG. Vui lòng thử lại."*.
     - **Xuất PNG thành công**: Hiển thị Toast màu xanh lá (`type="success"`) thông báo *"Đã xuất ảnh PNG thành công!"*.
     - **Xuất PNG thất bại**: Hiển thị Toast màu đỏ (`type="error"`) thông báo *"Không thể xuất file PNG. Vui lòng thử lại sau."*.
   - Khắc phục hoàn toàn hiện tượng nuốt ngoại lệ im lặng (`silent console.error`).

3. **Quản Lý Bộ Nhớ & Trạng Thái Xử Lý An Toàn (Safe Cleanup & Loading State)**:
   - Bổ sung khối `finally` cho quá trình rasterize PNG bất đồng bộ:
     - Luôn thu hồi URL tạm thời qua `URL.revokeObjectURL(url)`.
     - Luôn đặt lại cờ `setIsExportingPng(false)`, giải phóng nút bấm khỏi trạng thái disabled ngay cả khi xảy ra lỗi.

4. **Bảo Toàn Tính Bất Biến (State Invariants Preservation)**:
   - Thao tác xuất file hoàn toàn mang tính chất Read-Only.
   - Tuyệt đối không làm thay đổi trạng thái bẩn (`isDirty === false`).
   - Tuyệt đối không đẩy mutation vào ngăn xếp Undo/Redo (`historyState`).

---

## 2. Bằng Chứng Kiểm Thử & Xác Minh (Verification Evidence)

### 2.1. Targeted Integration Tests (7/7 PASS)
Tập tin kiểm thử: [`tests/integration/mindmap-export-workflow.test.tsx`](../../tests/integration/mindmap-export-workflow.test.tsx)
- ✓ `1. SVG export triggers download with sanitized filename matching active document title in saved-document mode`
- ✓ `2. PNG export manages loading state and disables button during rasterization`
- ✓ `3. Export triggers visible user feedback upon successful completion`
- ✓ `4. Export triggers error feedback when PNG rasterization fails without uncaught crash`
- ✓ `5. Export operations do not mark saved document as dirty`
- ✓ `6. Export operations do not pollute canvas undo/redo history stack`
- ✓ `7. Saved-document filename contract prioritizes document title over tree root node title for both SVG and PNG`

### 2.2. Core Regression Tests (66/66 PASS)
Lệnh thực thi:
```bash
npx vitest run tests/integration/mindmap-export-workflow.test.tsx \
  tests/unit/mindmap-svg-export.test.ts \
  tests/unit/mindmap-undo-redo.test.tsx \
  tests/unit/mindmap-document-storage.test.ts \
  tests/unit/mindmap-projection.test.ts
```
Kết quả:
- `tests/unit/mindmap-document-storage.test.ts`: 19/19 PASS
- `tests/unit/mindmap-projection.test.ts`: 14/14 PASS
- `tests/unit/mindmap-svg-export.test.ts`: 22/22 PASS
- `tests/unit/mindmap-undo-redo.test.tsx`: 4/4 PASS
- `tests/integration/mindmap-export-workflow.test.tsx`: 7/7 PASS
- **Tổng cộng**: 66/66 tests PASS.

### 2.3. TypeScript Strict Typecheck
Lệnh thực thi: `npx tsc --noEmit`
- **Kết quả**: Exit code 0, 0 errors, 0 warnings.

---

## 3. Danh Sách Tập Tin Đã Thay Đổi / Tạo Mới (Artifacts Inventory)

| Phân loại | Đường dẫn tập tin | Mô tả thay đổi |
| :--- | :--- | :--- |
| **Production Code** | [`src/components/mindmap/MindMapView.tsx`](../../src/components/mindmap/MindMapView.tsx) | Bổ sung Toast feedback, ưu tiên document title khi xuất file, cleanup an toàn trong finally |
| **Test Code** | [`tests/integration/mindmap-export-workflow.test.tsx`](../../tests/integration/mindmap-export-workflow.test.tsx) | Bộ kiểm thử tích hợp 7 kịch bản cho luồng xuất file |
| **Documentation** | [`docs/specs/mindmap-phase-m4a-export-ux-hardening-spec.md`](../specs/mindmap-phase-m4a-export-ux-hardening-spec.md) | Đặc tả kỹ thuật chi tiết Phase M4a |
| **Architecture** | [`docs/adr/ADR-099-mindmap-phase-m4a-export-ux-hardening.md`](../adr/ADR-099-mindmap-phase-m4a-export-ux-hardening.md) | Quyết định kiến trúc ADR-099 |
| **Closure** | [`docs/reports/mindmap-phase-m4a-closure-report.md`](mindmap-phase-m4a-closure-report.md) | Báo cáo hoàn tất phase M4a |

---

## 4. Các Rủi Ro Chưa Xử Lý & Kế Hoạch Chuyển Tiếp (Follow-up)

### 4.1. Hạng mục ngoài phạm vi (Non-goals)
- Không bổ sung menu tùy chọn độ phân giải tùy biến (1x/2x/4x) hoặc màu nền trong suốt cho PNG.
- Không sửa đổi mã nguồn chiếu cây [`src/lib/mindmapProjection.ts`](../../src/lib/mindmapProjection.ts).

### 4.2. Hạng mục chuyển tiếp sang Phase M4b (Deferred Follow-up)
- **Phase M4b — Mind Map Viewport Zoom Polish**:
  - Tinh chỉnh độ nhạy của thao tác cuộn chuột / pinch-to-zoom trên Canvas.
  - Cung cấp thanh trượt zoom trực quan (slider) trên toolbar với các mốc chuẩn (25%, 50%, 100%, 200%).
  - Bổ sung nút "Fit to Screen" (vừa vặn khung nhìn) và căn giữa cây tư duy.

---

## 5. Ghi Chú Trạng Thái Git (Git State Note)
- **HEAD hiện tại**: Commit `d6d5503` (`feat(capture): add global quick-capture modal`).
- **Working tree**: Đang chứa các thay đổi chưa stage của Phase M4a (`MindMapView.tsx`, test suite mới, và 3 tài liệu docs).
- **Remote Policy**: LOCAL-ONLY / NOT PUSHED. Tuyệt đối không stage hoặc commit khi chưa có lệnh phê duyệt explicit từ người điều hành.
