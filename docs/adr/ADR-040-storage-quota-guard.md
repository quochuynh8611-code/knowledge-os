# ADR-040: Cơ Chế Phòng Vệ Hạn Mức Dung Lượng Hàng Đợi (Storage Quota Guard & Proactive Trimming)

- **Mã ADR:** ADR-040
- **Trạng thái:** PROPOSED (PLANNING ONLY)
- **Ngày tạo:** 2026-08-28
- **Đề xuất bởi:** Staff Software Engineer / Technical Architect
- **Phạm vi:** `src/lib/syncQueue.ts`, `src/services/syncQueue.ts`

---

## 1. Bối Cảnh (Context)
Dung lượng `localStorage` bị giới hạn ~5MB per origin. Khi người dùng offline lâu hoặc server trả về các thông điệp lỗi HTML/stack trace dài, hàng đợi và telemetry có thể chạm ngưỡng hạn mức gây ra `QuotaExceededError`. Cần một chiến lược phòng vệ có thứ bậc rõ ràng để đảm bảo dữ liệu `pending` không bị mất.

---

## 2. Quyết Định Kiến Trúc (Architecture Decisions)

1. **Chuẩn Hóa Độ Dài Lỗi (Error Sanitization)**:
   - Mọi chuỗi lỗi `error` lưu vào mutation đều được cắt ngắn tối đa 500 ký tự qua `sanitizeMutationError(error)`.
2. **Chiến Lược Thu Dọn Có Thứ Bậc (Hierarchical Storage Recovery)**:
   - **Giai đoạn 1**: Thu dọn nhật ký Telemetry (rút gọn từ 50 xuống 5 sự kiện) vì telemetry chỉ mang tính hỗ trợ quan sát, hàng đợi dữ liệu người dùng là ưu tiên hàng đầu.
   - **Giai đoạn 2**: Thu dọn các mutation lỗi cạn kiệt số lần thử lại (`status === 'failed'` và `retryCount >= 10`).
   - **Quy tắc bất biến**: Tuyệt đối không xóa bất kỳ mutation nào có `status === 'pending'`.
3. **Phản Hồi Trạng Thái Lưu (Explicit Boolean Feedback)**:
   - `saveQueue(queue)` và `enqueue(mutation)` trả về `boolean` thể hiện việc ghi storage thành công hay thất bại sau các nỗ lực phục hồi.

---

## 3. Đánh Giá Trade-offs (Two-Way Door)

- **Ưu điểm**:
  - Bảo vệ 100% dữ liệu biên tập của người dùng.
  - Tự động dọn dẹp dữ liệu rác/lỗi cũ mà không cần người dùng thao tác thủ công.
- **Rủi ro kiểm soát**:
  - Các mutation lỗi nghiêm trọng (`retryCount >= 10`) có thể bị thu dọn nếu bộ nhớ quá đầy, tuy nhiên những mutation này trên thực tế đã là poison-pill không thể đồng bộ tự động.
