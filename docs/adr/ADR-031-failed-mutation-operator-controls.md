# ADR-031: Cơ Chế Can Thiệp Người Vận Hành & Gỡ Bỏ Đột Biến Lỗi (Failed Mutation Operator Controls & Poison-Pill Mitigation)

- **Mã ADR:** ADR-031
- **Trạng thái:** PROPOSED (PLANNING ONLY)
- **Ngày tạo:** 2026-08-28
- **Đề xuất bởi:** Staff Software Engineer / Technical Architect
- **Phạm vi:** `src/hooks/useSyncQueue.ts`, `src/components/ui/SyncStatusBadge.tsx`

---

## 1. Bối Cảnh (Context)
Trong kiến trúc hàng đợi ngoại tuyến FIFO, khi một đột biến gặp lỗi (ví dụ: HTTP 500 từ server, vi phạm ràng buộc dữ liệu hoặc payload không hợp lệ), cơ chế bảo toàn phần đuôi lỗi (Failed-tail preservation) sẽ dừng việc gửi các đột biến tiếp theo để tránh làm sai lệch thứ tự.

Nếu không có cơ chế can thiệp thủ công:
- Một đột biến lỗi vĩnh viễn (Poison Pill) sẽ làm tắc nghẽn toàn bộ hàng đợi vô thời hạn.
- Người dùng chỉ có cách duy nhất là xóa sạch toàn bộ `localStorage`, dẫn đến mất luôn cả các đột biến hợp lệ chưa được đồng bộ.

---

## 2. Quyết Định Kiến Trúc (Architecture Decisions)

1. **Thao Tác Discard Từng Phần Tử Có Điều Kiện (Conditional Per-Item Discard)**:
   - Chỉ cho phép gỡ bỏ đột biến khi và chỉ khi `mutation.status === 'failed'`.
   - Các mutation `status === 'pending'` được bảo vệ 100%, không hiển thị nút xóa.
2. **Cơ Chế Xác Nhận Trực Quan (Inline Confirmation Guardrail)**:
   - Khi nhấp "Bỏ qua mục lỗi này", giao diện chuyển sang trạng thái chờ xác nhận: `[Xác nhận bỏ qua]` và `[Hủy]`.
   - Thao tác chỉ thực thi khi người dùng bấm xác nhận rõ ràng.
3. **Bảo Toàn Trật Tự Hàng Đợi Sau Khi Xóa**:
   - Sử dụng `dequeueMutation(queue, mutationId)` giữ nguyên tuyệt đối thứ tự và tính toàn vẹn của các mutation còn lại.
4. **Cung Cấp API Qua Hook `useSyncQueue`**:
   - Bổ sung `discardFailedMutation(mutationId: string): boolean`:
     - Kiểm tra nếu `mutation.status !== 'failed'` $\rightarrow$ trả về `false` (từ chối xóa).
     - Nếu `mutation.status === 'failed'` $\rightarrow$ gọi `syncQueueService.remove(mutationId)` và trả về `true`.

---

## 3. Đánh Giá Trade-offs & Rủi ro

- **Ưu điểm**:
  - Khơi thông hàng đợi bị kẹt bởi lỗi poison-pill mà không làm mất dữ liệu của các mutation hợp lệ khác.
  - An toàn tối đa nhờ rào chắn 2 lớp (chỉ failed + confirmation).
- **Rủi ro kiểm soát**:
  - Việc bỏ qua mutation đồng nghĩa với việc thay đổi cục bộ đó sẽ không bao giờ được gửi lên server. Tuy nhiên, người dùng đã nhận thông báo lỗi chi tiết trước khi quyết định bỏ qua.
