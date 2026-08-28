# ADR-035: Cơ Chế Tự Động Kích Hoạt Đồng Bộ Khi Có Mạng & Hết Cooldown (Background Auto-Sync & Network Reconnect Trigger)

- **Mã ADR:** ADR-035
- **Trạng thái:** PROPOSED (PLANNING ONLY)
- **Ngày tạo:** 2026-08-28
- **Đề xuất bởi:** Staff Software Engineer / Technical Architect
- **Phạm vi:** `src/hooks/useSyncQueue.ts`, `src/services/syncQueue.ts`

---

## 1. Bối Cảnh (Context)
Từ P2.2 đến P2.7c, hệ thống hàng đợi đã hoàn thiện đầy đủ các lớp: lưu trữ ngoại tuyến, chống độc hàng đợi (poison-pill discard), lũy thừa trễ (exponential backoff) và giao diện trực quan. Tuy nhiên, hành động replay hiện tại vẫn hoàn toàn phụ thuộc vào thao tác thủ công của người dùng trên giao diện.

Khi thiết bị khôi phục kết nối Internet sau thời gian dài ngoại tuyến, hoặc khi một mutation lỗi đã qua thời gian chờ backoff, người dùng kỳ vọng hệ thống tự động hoàn tất việc đồng bộ mà không cần phải mở popover và bấm nút.

---

## 2. Quyết Định Kiến Trúc (Architecture Decisions)

1. **Trigger Kết Nối Mạng Lại (`window.online` Reconnect)**:
   - Khi nhận sự kiện `online`, hệ thống áp dụng debounce 300ms nhằm chống rung mạng (flapping).
   - Sau debounce, tự động gọi `syncQueueService.flushQueue(apiBaseUrl, { bypassBackoff: false })`.
2. **Trigger Hết Hạn Cooldown (Earliest Cooldown Timeout)**:
   - Quét các mutation lỗi có `nextRetryAt` trong tương lai.
   - Tìm thời điểm sớm nhất `earliestNextRetryAt = min(...nextRetryAt)`.
   - Thiết lập `setTimeout` đến thời điểm đó để kích hoạt `flushQueue(apiBaseUrl, { bypassBackoff: false })`.
   - Dọn dẹp timer (`clearTimeout`) khi hàng đợi thay đổi hoặc hook unmount.
3. **Bảo Vệ Đơn Tuyến (Single Flight & Anti-Hammering)**:
   - Các luồng tự động luôn truyền `{ bypassBackoff: false }` để tôn trọng rào chắn backoff P2.7b.
   - Tận dụng cờ `isFlushing` của `SyncQueueService` để chống chạy trùng lặp khi người dùng vừa bấm nút thủ công.
4. **Vị Trí Đặt Trigger**:
   - Quản lý vòng đời listener và timer bên trong hook `useSyncQueue`, đảm bảo tự động chạy khi ứng dụng đang mở và tự hủy khi component unmount.

---

## 3. Đánh Giá Trade-offs (Two-Way Door)

- **Ưu điểm**:
  - Trải nghiệm ngoại tuyến - trực tuyến liền mạch (True Offline-First Sync).
  - Tự động chữa lành (Self-Healing) khi backend phục hồi sau sự cố gián đoạn.
  - Không gây tải ảo nhờ cơ chế hướng sự kiện và debounce.
- **Rủi ro kiểm soát**:
  - Được bảo vệ 2 lớp: lớp debounce 300ms tại hook và lớp `isFlushing` lock tại service.
