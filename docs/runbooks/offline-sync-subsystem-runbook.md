# 📘 Runbook Vận Hành: Offline Sync & Observability Subsystem

> **Dành cho:** Lập trình viên, System Operator & AI Agents  
> **Phiên bản:** v1.0 (Hoàn thiện sau Phase P3.2 / P4.0)  
> **Trạng thái hệ thống:** Production Ready (18 test files, 123/123 PASS)

---

## 1. Bản Đồ Thành Phần & Trách Nhiệm (Component Map)

| Module File | Vai trò kiến trúc | Nguyên tắc cốt lõi |
| :--- | :--- | :--- |
| [`src/lib/syncQueue.ts`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/lib/syncQueue.ts) | **Pure Storage & Mutation Helpers** | Hoàn toàn pure, tính toán backoff, sanitize lỗi $\le 500$ ký tự, lọc poison-pill cạn kiệt. |
| [`src/lib/syncTelemetry.ts`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/lib/syncTelemetry.ts) | **Pure Telemetry & Health Rules** | Rolling buffer 50 sự kiện, tính toán chỉ số và 4 cấp độ sức khỏe (`healthy`, `degraded`, `critical`, `unknown`). |
| [`src/services/syncQueue.ts`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/services/syncQueue.ts) | **Stateful Service & I/O Orchestration** | Quản lý observer listeners, tự động kết nối lại (`window.online`), đa tab `StorageEvent`, thu hồi bộ nhớ 3 tầng. |
| [`src/hooks/useSyncQueue.ts`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/hooks/useSyncQueue.ts) | **React Integration Hook** | Đăng ký subscriber vào service, expose reactive state: `queue`, `pendingCount`, `failedCount`, `syncHealth`, `isFlushing`. |
| [`src/components/ui/SyncStatusBadge.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/ui/SyncStatusBadge.tsx) | **Operator Presentation UI** | Hiển thị badge, đếm ngược thời gian chờ, Health Banner, Telemetry Debug Tab, nút Bỏ qua mutation lỗi. |

---

## 2. Các Ràng Buộc Bất Biến (System Invariants)

1. **Durable Pending Guarantee**: Tuyệt đối không bao giờ tự động xóa mutation có `status === 'pending'`.
2. **Telemetry First Eviction**: Khi hết hạn mức `localStorage`, nhật ký telemetry luôn bị thu dọn trước hàng đợi nghiệp vụ.
3. **Exhausted Poison-Pill Threshold**: Chỉ thu dọn các mutation lỗi khi `retryCount >= 10` trong cơ chế phục hồi Tầng 2.
4. **Pre-Replay Concurrency Check**: Trong vòng lặp `flushQueue`, luôn kiểm tra lại `this.getQueue().some(...)` để chống replay trùng lặp giữa nhiều tab.

---

## 3. Bảng Chẩn Đoán Sự Cố & Hướng Dẫn Xử Lý (Troubleshooting Matrix)

### Sự cố 1: Huy hiệu báo "Cảnh báo (critical)" kèm lý do Poison-Pill
- **Hiện tượng**: Popover hiển thị banner đỏ `Cực kỳ nguy cấp`, mutation có `retryCount >= 5`.
- **Nguyên nhân**: Server từ chối request liên tục do dữ liệu không hợp lệ hoặc lỗi phân quyền.
- **Cách khắc phục**:
  1. Mở Popover trên thanh Navbar.
  2. Tại mutation lỗi đầu tiên, nhấn nút **Bỏ qua**.
  3. Xác nhận trên popup inline **Xác nhận bỏ qua**.
  4. Hàng đợi sẽ tự động giải tỏa và tiếp tục đồng bộ các mục kế tiếp.

### Sự cố 2: Trình duyệt cảnh báo QuotaExceededError
- **Hiện tượng**: `safeSetLocalStorageItem` trả về `false`.
- **Nguyên nhân**: `localStorage` của trình duyệt bị đầy do các ứng dụng khác cùng domain hoặc dữ liệu quá lớn.
- **Cách khắc phục**:
  - Hệ thống tự động kích hoạt Tầng 1 (thu gọn telemetry) và Tầng 2 (xóa lỗi $\ge 10$).
  - Nếu vẫn đầy, operator có thể hướng dẫn người dùng dọn bớt cache hoặc kiểm tra các key lưu trữ lớn khác.

### Sự cố 3: Hàng đợi không tự chạy khi có mạng lại
- **Hiện tượng**: Đã kết nối WiFi nhưng trạng thái vẫn đứng yên.
- **Nguyên nhân**: Sự kiện `window.online` bị trình duyệt trì hoãn hoặc mutation đang trong khoảng thời gian chờ backoff.
- **Cách khắc phục**:
  - Nhấn nút **Đồng bộ ngay** trên Popover để bỏ qua thời gian chờ backoff (`bypassBackoff: true`).

---

## 4. Từ Điển Thuật Ngữ (Glossary)

- **Sync Mutation**: Đơn vị thay đổi dữ liệu ngoại tuyến gồm `id`, `entityType`, `action` (`save`/`delete`), `payload`, `retryCount`, `status`.
- **Poison-Pill**: Đột biến bị lỗi nghiêm trọng, liên tục thất bại khi thử lại và chặn toàn bộ các mutation phía sau trong hàng đợi FIFO.
- **Exponential Backoff**: Thuật toán giãn cách thời gian thử lại: $\text{delay} = \min(1000 \times 2^{\text{retryCount}-1}, 30000)\text{ ms}$.
- **Storage Quota Guard**: Cơ chế phục hồi 3 tầng tự động ngăn ngừa lỗi tràn bộ nhớ `localStorage`.
