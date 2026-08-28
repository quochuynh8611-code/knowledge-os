# ADR-029: Tích Hợp Huy Hiệu Trạng Thái Hàng Đợi Đồng Bộ Trên Thanh Điều Hướng (Sync Status Badge Navbar Integration)

- **Mã ADR:** ADR-029
- **Trạng thái:** PROPOSED (PLANNING ONLY)
- **Ngày tạo:** 2026-08-28
- **Đề xuất bởi:** Staff Software Engineer / Technical Architect
- **Phạm vi:** `src/components/ui/SyncStatusBadge.tsx`, `src/components/layout/Navbar.tsx`

---

## 1. Bối Cảnh (Context)
Sau khi hoàn thành P2.2 $\rightarrow$ P2.4, ứng dụng đã có hàng đợi ngoại tuyến tự động và React hook `useSyncQueue`. Cần cung cấp một điểm chạm trực quan duy nhất, rõ ràng trên giao diện để người dùng nắm bắt trạng thái đồng bộ và có thể chủ động kích hoạt đồng bộ khi cần.

---

## 2. Quyết Định Kiến Trúc (Architecture Decisions)

1. **Tạo Component `SyncStatusBadge` Tách Biệt**:
   - Sử dụng hook `useSyncQueue` để đọc dữ liệu: `pendingCount`, `failedCount`, `isFlushing`, `isOnline`, `flush`.
   - Đóng gói toàn bộ logic hiển thị biểu tượng, màu sắc trạng thái và xử lý click thử lại bên trong component này.
2. **Điểm Chạm Navbar Toàn Cục**:
   - Đặt `SyncStatusBadge` vào `Navbar.tsx` bên cạnh các tiện ích hệ thống (ThemeToggle, Timer) để người dùng ở bất kỳ tab nào cũng thấy được trạng thái đồng bộ thời gian thực.
3. **Phản Hồi Trực Quan Rõ Ràng**:
   - Hiển thị badge tinh tế khi online/đồng bộ xong; nổi bật khi offline hoặc có lỗi để học giả yên tâm dữ liệu đã được bảo lưu an toàn.

---

## 3. Đánh Giá Trade-offs (Two-Way Door)

- **Ưu điểm**:
  - Trải nghiệm người dùng trong suốt (UX Transparency).
  - Blast radius cực thấp: chỉ thêm 1 component UI và chèn vào Navbar.
- **Rủi ro kiểm soát**: Cực thấp, 100% reversible.
