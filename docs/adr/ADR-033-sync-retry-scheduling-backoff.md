# ADR-033: Cơ Chế Lên Lịch Thử Lại & Khoảng Trễ Lũy Thừa (Sync Retry Scheduling & Exponential Backoff Metadata)

- **Mã ADR:** ADR-033
- **Trạng thái:** PROPOSED (PLANNING ONLY)
- **Ngày tạo:** 2026-08-28
- **Đề xuất bởi:** Staff Software Engineer / Technical Architect
- **Phạm vi:** `src/lib/syncQueue.ts`, `src/services/syncQueue.ts`

---

## 1. Bối Cảnh (Context)
Hiện tại khi một mutation gặp lỗi trong `SyncQueueService.flushQueue()`, hệ thống chỉ tăng `retryCount` mà chưa tính toán khoảng trễ thử lại (Backoff Delay). Nếu có sự kiện `online` hoặc luồng tự động kích hoạt liên tục, hệ thống có thể gửi request dồn dập vào server đang quá tải.

Cần bổ sung metadata lịch trình và thuật toán Exponential Backoff để bảo vệ backend và tối ưu hóa việc tự phục hồi mạng.

---

## 2. Quyết Định Kiến Trúc (Architecture Decisions)

1. **Mở Rộng `SyncMutation` Tương Thích Ngược**:
   - Thêm 3 trường tùy chọn:
     - `lastAttemptAt?: string` (Thời điểm replay gần nhất).
     - `nextRetryAt?: string` (Thời điểm sớm nhất cho phép replay tự động).
     - `backoffDelayMs?: number` (Độ trễ tính bằng ms).
2. **Thuật Toán Exponential Backoff Có Chặn Trên (Capped Exponential Backoff)**:
   - Cơ sở: $1000\text{ms}$ (1 giây).
   - Trần tối đa: $60000\text{ms}$ (60 giây / 1 phút).
   - Công thức: $\text{delay} = \min(1000 \times 2^{\text{retryCount} - 1}, 60000)$.
3. **Quy Tắc Bỏ Qua Backoff Khi Thao Tác Thủ Công (Manual Override)**:
   - Replay tự động (Background/Auto-sync): Kiểm tra `Date.now() >= nextRetryAt` mới thực thi.
   - Replay thủ công (User clicks "Đồng bộ ngay"): Bỏ qua kiểm tra `nextRetryAt` (`bypassBackoff = true`) để tôn trọng chủ ý tức thì của người dùng.
4. **Không Áp Dụng Hard Drop (Zero Data Loss Policy)**:
   - Không tự động xóa bỏ mutation khi `retryCount` đạt mức cao. Khi đạt ngưỡng trần (60s), mutation tiếp tục được giữ lại cho đến khi người dùng quyết định bỏ qua (P2.6b) hoặc backend kết nối thành công.

---

## 3. Đánh Giá Trade-offs (Two-Way Door)

- **Ưu điểm**:
  - Chống dội request (Thundering Herd / Request Hammering) lên server.
  - Người dùng vẫn có quyền can thiệp tức thì qua nút "Đồng bộ ngay".
  - Tương thích ngược 100% với dữ liệu hiện có trong `localStorage`.
- **Rủi ro kiểm soát**:
  - Cực thấp, toàn bộ logic là pure client-side functions và optional fields.
