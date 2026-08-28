# Technical Specification: Phase P3.1 — Multi-Tab Sync Queue Synchronization

## 1. Problem Statement & Motivation
Hiện tại, ứng dụng Knowledge OS hoạt động theo mô hình Local-First với hàng đợi ngoại tuyến lưu trữ trong `localStorage`.
Khi người dùng mở ứng dụng trên **nhiều tab trình duyệt đồng thời (Multi-Tab)**:
1. Nếu Tab A thêm một mutation mới vào hàng đợi, Tab B không nhận được thông báo thời gian thực và vẫn hiển thị số lượng hàng đợi cũ cho đến khi người dùng tương tác hoặc tải lại trang.
2. Tương tự, khi Tab A đồng bộ thành công hoặc xóa/bỏ qua một mutation, Tab B không cập nhật telemetry và danh sách sự kiện gần đây.
3. Có nguy cơ chạy trùng lặp (Duplicate Replay) nếu cả 2 tab cùng thực hiện flush một hàng đợi tại cùng một thời điểm mà không kiểm tra sự tồn tại của mutation trong storage thực tế.

Phase P3.1 giải quyết bài toán này bằng cơ chế **Đồng Bộ Đa Tab Thời Gian Thực (Multi-Tab Sync via Storage Event & Optimistic Re-check)**:
- Tự động phản hồi sự kiện `window.addEventListener('storage')` trong `SyncQueueService`.
- Tự động kích hoạt `notifyListeners()` để cập nhật tức thì React Hook `useSyncQueue` và UI `SyncStatusBadge` ở mọi tab đang mở.
- Bổ sung bước kiểm tra tồn tại tức thời (`currentQueue.some(m => m.id === mutation.id)`) trong vòng lặp `flushQueue` để tránh replay trùng lặp giữa các tab.
- **100% Local-First & Zero Extra Network**: Hoàn toàn dựa vào native browser Storage Event API.

---

## 2. Architecture & Multi-Tab Synchronization Flow

```
  ┌────────────────────────────────────────────────────────┐
  │                         TAB A                          │
  │  1. User enqueues mutation / flushes queue             │
  │  2. safeSetLocalStorageItem(storageKey, serialized)    │
  └───────────────────────────┬────────────────────────────┘
                              │
                    Browser Storage Event
                (Dispatched to all other tabs)
                              │
  ┌───────────────────────────▼────────────────────────────┐
  │                         TAB B                          │
  │  3. window.on('storage') triggered                     │
  │  4. Filters e.key === storageKey || telemetryKey       │
  │  5. syncQueueService.notifyListeners()                 │
  │  6. useSyncQueue Hook updates state (queue, stats, UI) │
  └────────────────────────────────────────────────────────┘
```

---

## 3. Concurrency & Collision Mitigation (Chống Xung Đột)

1. **Ngăn Chặn Vòng Lặp Vô Hạn (No Infinite Ping-Pong Loop)**:
   - Trình duyệt chỉ gửi `storage` event tới các tab khác, không gửi lại tab thực hiện ghi.
   - Khi nhận `storage` event, `SyncQueueService` chỉ thực hiện hành động ĐỌC (`getQueue()`, `getTelemetryEvents()`) và thông báo subscribers, tuyệt đối KHÔNG thực hiện ghi ngược lại vào `localStorage`.
2. **Kiểm Tra Trùng Lặp Trước Khi Replay (In-Flight Existence Check)**:
   - Trong vòng lặp `flushQueue`, trước khi gửi HTTP request của từng mutation, service đọc snapshot mới nhất từ `localStorage`. Nếu mutation đã được xử lý và dequeue bởi tab khác, nó sẽ bị bỏ qua (`continue`).

---

## 4. Invariants & Scope Boundaries

### 4.1. Invariants (Ràng buộc bất biến)
1. **Zero External Dependency**: Không sử dụng thêm thư viện ngoài (BroadcastChannel / SharedWorker / WebSocket), dùng native `StorageEvent`.
2. **Chính Xác Theo Khóa (Key-Specific Filtering)**: Chỉ lắng nghe và phản hồi khi `event.key` trùng khớp với `storageKey` hoặc `telemetryStorageKey` của instance.
3. **Dọn Dẹp Đầy Đủ (Lifecycle Cleanup)**: Hỗ trợ hàm `destroy()` / `disconnect()` hoặc unbind listener khi cần thiết để tránh rò rỉ bộ nhớ trong môi trường kiểm thử và ứng dụng.

### 4.2. Non-Goals
- Không xây dựng cơ chế Distributed Distributed Lock phức tạp qua server.
- Không thay đổi REST API payload hay backend schema.

---

## 5. File Changes Matrix

| File Path | Trạng thái | Nhiệm vụ |
| :--- | :---: | :--- |
| `src/services/syncQueue.ts` | **MODIFY** | Đăng ký `storage` event listener trong constructor/init, bổ sung in-loop existence check trong `flushQueue`, cung cấp `destroy()`. |
| `docs/specs/phase-p3-1-multi-tab-sync.md` | **NEW** | Bản đặc tả kỹ thuật Phase P3.1 này. |
| `docs/adr/ADR-039-multi-tab-sync.md` | **NEW** | Quyết định kiến trúc cho đồng bộ đa tab. |
| `docs/gherkin/phase-p3-1-multi-tab-sync.feature` | **NEW** | Kịch bản kiểm thử BDD cho Multi-Tab synchronization. |
| `tests/unit/sync-multi-tab.test.ts` | **NEW** | Unit tests mô phỏng đa tab thông qua `StorageEvent`. |

---

## 6. Rollback Strategy
Thay đổi hoàn toàn khép kín trong `SyncQueueService` (Two-Way Door), dễ dàng tắt bỏ listener mà không ảnh hưởng bất kỳ luồng nghiệp vụ hiện có nào.
