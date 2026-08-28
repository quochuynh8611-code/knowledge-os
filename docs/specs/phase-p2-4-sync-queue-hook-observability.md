# Technical Specification: Phase P2.4 — Sync Queue Observability & React Hook (`useSyncQueue`)

## 1. Problem Statement & Motivation
Sau khi hoàn thành P2.2, P2.3a, P2.3b, và P2.3c, hàng đợi đột biến ngoại tuyến (`SyncQueueService`) đã bảo vệ trọn vẹn 100% các đột biến dữ liệu của cả 5 thực thể cốt lõi (`Category`, `Topic`, `Note`, `Resource`, `StudyProgress`).

Tuy nhiên, hiện tại hàng đợi này hoạt động hoàn toàn ngầm (in the background):
1. **Thiếu khả năng phản ứng trong React (No React Reactivity)**: Các component React chưa thể lắng nghe các biến động của hàng đợi theo thời gian thực (real-time queue changes).
2. **Thiếu Hook chuẩn mực (`useSyncQueue`)**: Chưa có hook chuyên dụng để cung cấp trạng thái mạng (`isOnline`), số lượng đột biến đang chờ (`pendingCount`), số lượng lỗi (`failedCount`), cờ đang đồng bộ (`isFlushing`) và hàm kích hoạt thủ công (`flush()`).

Phase P2.4 bổ sung cơ chế đăng ký lắng nghe (Observer Pattern / Pub-Sub) vào `SyncQueueService` và cung cấp React hook `useSyncQueue`, giúp tầng UI dễ dàng theo dõi và kích hoạt đồng bộ mà không vi phạm nguyên tắc cách ly kiến trúc.

---

## 2. Goals & Non-Goals

### 2.1. Goals
1. **Bổ Sung Subscription API vào `SyncQueueService`**:
   - `subscribe(listener: () => void): () => void`
   - Tự động gọi `notifyListeners()` mỗi khi hàng đợi thay đổi (`enqueue`, `remove`, `markFailed`, bắt đầu/kết thúc `flushQueue`).
2. **Tạo React Hook `useSyncQueue` (`src/hooks/useSyncQueue.ts`)**:
   - Quản lý trạng thái phản ứng:
     - `queue: SyncMutation[]`
     - `pendingCount: number`
     - `failedCount: number`
     - `isFlushing: boolean`
     - `isOnline: boolean`
     - `flush: () => Promise<FlushResult>`
   - Tự động đồng bộ với sự kiện trình duyệt `online` và `offline`.
3. **Bảo Toàn 100% Invariants**:
   - Không thay đổi bất kỳ logic lưu trữ hay schema Prisma nào.
   - Giữ nguyên cơ chế FIFO và bảo toàn phần đuôi hàng đợi khi gặp lỗi.

### 2.2. Non-Goals
- Không sửa đổi Prisma schema hoặc REST API backend.
- Không gắn cứng UI vào một vị trí cụ thể trong phase này (chỉ cung cấp hook & service subscriber).

---

## 3. Architecture & Hook Interface

```typescript
export interface UseSyncQueueReturn {
  queue: SyncMutation[];
  pendingCount: number;
  failedCount: number;
  isFlushing: boolean;
  isOnline: boolean;
  flush: () => Promise<FlushResult>;
}

export function useSyncQueue(
  syncQueueService?: SyncQueueService,
  apiBaseUrl = "/api"
): UseSyncQueueReturn;
```

---

## 4. File Changes Matrix

| File Path | Trạng thái | Nhiệm vụ |
| :--- | :---: | :--- |
| `src/services/syncQueue.ts` | **MODIFY** | Thêm listener subscription (`subscribe`, `notifyListeners`). |
| `src/hooks/useSyncQueue.ts` | **NEW** | React hook `useSyncQueue` phản ứng thời gian thực. |
| `docs/specs/phase-p2-4-sync-queue-hook-observability.md` | **NEW** | Bản đặc tả kỹ thuật này. |
| `docs/adr/ADR-028-sync-queue-hook-observability.md` | **NEW** | Quyết định kiến trúc Observer Pattern cho Sync Queue. |
| `docs/gherkin/phase-p2-4-sync-queue-hook-observability.feature` | **NEW** | Kịch bản kiểm thử BDD. |
| `tests/unit/sync-queue-hook.test.ts` | **NEW** | Unit tests cho `useSyncQueue` hook và service subscription. |

---

## 5. Rollback Strategy
Toàn bộ thay đổi là thuần túy client-side logic (Two-Way Door), có thể hoàn nguyên tức thời nếu cần.
