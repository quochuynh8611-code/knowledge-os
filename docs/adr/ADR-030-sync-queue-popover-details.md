# ADR-030: Giao Diện Popover Xem Chi Tiết Hàng Đợi Đồng Bộ (Read-Only Sync Queue Details Popover)

- **Mã ADR:** ADR-030
- **Trạng thái:** PROPOSED (PLANNING ONLY)
- **Ngày tạo:** 2026-08-28
- **Đề xuất bởi:** Staff Software Engineer / Technical Architect
- **Phạm vi:** `src/components/ui/SyncStatusBadge.tsx`

---

## 1. Bối Cảnh (Context)
Sau Phase P2.5, người dùng có thể nhìn thấy số lượng đột biến ngoại tuyến hoặc lỗi trên `SyncStatusBadge`. Để nâng cao tính minh bạch, cần cung cấp khả năng xem chi tiết danh sách các đột biến đang chờ và thông điệp lỗi cụ thể (`lastError`).

---

## 2. Quyết Định Kiến Trúc (Architecture Decisions)

1. **Tách Biệt Minh Bạch Giữa Đọc Trạng Thái (Read-Only Inspection) và Thao Tác Phá Hủy (Destructive Control)**:
   - **Phase P2.6a (ADR-030)**: Chỉ tập trung vào hiển thị danh sách đột biến FIFO, lý do lỗi và nút kích hoạt `flush()`. Hoàn toàn không có thao tác xóa/hủy mutation.
   - **Phase P2.6b (ADR-031)**: Sẽ đánh giá và xử lý riêng việc loại bỏ mutation lỗi (Poison Pill Mitigation) với confirmation guardrails chặt chẽ.
2. **Tích Hợp Popover Trực Quan Trên `SyncStatusBadge`**:
   - Nhấp vào badge để bật/tắt (Toggle) bảng chi tiết.
   - Danh sách hiển thị theo thứ tự FIFO: `entityType`, `action`, `clientTimestamp`, `status`, `lastError`.
3. **Đóng Popover An Toàn**:
   - Bắt sự kiện phím `Escape` và sự kiện nhấp chuột bên ngoài vùng popover (Click Outside).

---

## 3. Đánh Giá Trade-offs (Two-Way Door)

- **Ưu điểm**:
  - Bảo vệ 100% tính nguyên vẹn của dữ liệu trong hàng đợi (Zero destructive actions).
  - Tăng tính minh bạch và khả năng chẩn đoán lỗi cho học giả.
  - Blast radius tối thiểu: đóng gói hoàn toàn trong `SyncStatusBadge.tsx`.
- **Rủi ro kiểm soát**: Cực thấp, 100% reversible.
