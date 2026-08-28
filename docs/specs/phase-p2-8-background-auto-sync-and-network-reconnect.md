# Technical Specification: Phase P2.8 — Background Auto-Sync & Network Reconnect Trigger

## 1. Problem Statement & Motivation
Trải qua các Phase P2.2 đến P2.7c, hệ thống Sync Queue đã có:
- Hàng đợi mutation ngoại tuyến (`SyncMutation`) với cơ chế gộp và khử trùng lặp.
- Quan sát trạng thái qua hook `useSyncQueue`.
- Quản lý lỗi, poison-pill mitigation (P2.6b) và hiển thị số lần thử lại (P2.7a).
- Thuật toán Exponential Backoff và metadata lập lịch (`nextRetryAt`) (P2.7b).
- Trực quan hóa trạng thái cooldown/ready trên UI (P2.7c).

Tuy nhiên, **tiến trình Replay hiện tại vẫn yêu cầu người dùng phải chủ động nhấp nút "Đồng bộ ngay" hoặc "Thử lại"**.
Khi người dùng chuyển từ trạng thái ngoại tuyến (`offline`) sang trực tuyến (`online`), hoặc khi một mutation lỗi đã hết thời gian chờ cooldown (`nextRetryAt` trôi qua), hệ thống chưa tự động kích hoạt `flushQueue()`.

Phase P2.8 bổ sung cơ chế **Tự Động Đồng Bộ Dựa Trên Sự Kiện (Event-Driven Auto-Sync)**:
1. Tự động kích hoạt đồng bộ khi trình duyệt bắt được sự kiện `online`.
2. Tự động kích hoạt đồng bộ khi khoảng trễ backoff sớm nhất của các mutation lỗi kết thúc.
3. Chống dội request (Debounce & Flapping Guard) khi mạng chập chờn bật/tắt liên tục.

---

## 2. Invariants & Scope Boundaries

### 2.1. Invariants (Ràng buộc bất biến)
1. **Tuân Thủ Backoff Gating (P2.7b Compliance)**:
   - Các trigger tự động (`online` event, timer cooldown) gọi `flushQueue(apiBaseUrl, { bypassBackoff: false })`.
   - Chỉ mutation `pending` hoặc mutation `failed` đã hết cooldown mới được gửi lên server.
2. **Khóa Đơn Tiến Trình (Single Flight Guarantee)**:
   - Nếu `isFlushing === true`, mọi trigger tự động đều trả về kết quả rỗng và không tạo luồng replay đồng thời.
3. **Chống Rung Mạng (Debounce Network Flapping)**:
   - Sự kiện `online` được debounce 300ms để tránh tình trạng gửi nhiều request khi mạng kết nối lại không ổn định.
4. **Không Thăm Dò Liên Tục (No Continuous Polling)**:
   - Hệ thống thuần túy hướng sự kiện: lắng nghe `window.online` và tính toán `setTimeout` đúng vào thời điểm `earliestNextRetryAt`, tuyệt đối không dùng vòng lặp polling vô hạn.
5. **Zero Backend & Schema Drift**:
   - 100% Client-side React Hook / Service logic.

### 2.2. Non-Goals
- Không thay đổi giao diện Popover (`SyncStatusBadge.tsx`).
- Không can thiệp cơ chế thủ công (`bypassBackoff: true` của nút "Đồng bộ ngay").

---

## 3. Architecture & Trigger Mechanics

```
                  ┌────────────────────────────────────────┐
                  │          Trình duyệt Online           │
                  └──────────────────┬─────────────────────┘
                                     │
                             (debounce 300ms)
                                     ▼
┌──────────────────────┐    ┌─────────────────┐    ┌──────────────────────┐
│  Cooldown Hết Hạn    ├───►│  useSyncQueue   ├───►│  flushQueue(api, {   │
│ (earliestNextRetryAt)│    │   Auto-Trigger  │    │  bypassBackoff:false │
└──────────────────────┘    └─────────────────┘    │          })          │
                                                   └──────────┬───────────┘
                                                              ▼
                                                   Kiểm tra isFlushing?
                                                   ├─ Yes: Bỏ qua (No-op)
                                                   └─ No:  Replay eligible FIFO
```

---

## 4. File Changes Matrix

| File Path | Trạng thái | Nhiệm vụ |
| :--- | :---: | :--- |
| `src/hooks/useSyncQueue.ts` | **MODIFY** | Tích hợp event listener `online` có debounce và timeout timer cho `earliestNextRetryAt`. |
| `docs/specs/phase-p2-8-background-auto-sync-and-network-reconnect.md` | **NEW** | Bản đặc tả kỹ thuật P2.8 này. |
| `docs/adr/ADR-035-background-auto-sync-and-network-reconnect.md` | **NEW** | Quyết định kiến trúc cơ chế tự động kích hoạt đồng bộ. |
| `docs/gherkin/phase-p2-8-background-auto-sync-and-network-reconnect.feature` | **NEW** | Kịch bản kiểm thử BDD cho P2.8. |
| `tests/unit/sync-auto-trigger.test.ts` | **NEW** | Unit tests cho reconnect trigger và scheduled auto-retry. |

---

## 5. Rollback Strategy
Toàn bộ logic nằm ở React hook `useSyncQueue.ts` (Two-Way Door), hoàn nguyên tức thời về P2.7c mà không ảnh hưởng cấu trúc dữ liệu.
