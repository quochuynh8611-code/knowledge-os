# Technical Specification: Phase P2.7b — Sync Retry Scheduling & Backoff Metadata

## 1. Problem Statement & Motivation
Sau khi hoàn thành P2.7a, giao diện người dùng đã hiển thị rõ ràng số lần thử lại (`retryCount`).

Tuy nhiên, trong cơ chế replay tự động hiện tại:
1. **Thiếu khoảng thời gian chờ phục hồi (No Backoff Delay)**: Khi server gặp sự cố quá tải hoặc mạng chập chờn, nếu hệ thống tự động thử lại ngay lập tức (hammering) có thể làm trầm trọng thêm tình trạng lỗi và tiêu tốn tài nguyên.
2. **Thiếu Metadata Lịch Trình (No Scheduling Timestamps)**: Hệ thống chưa lưu vết thời điểm thử gần nhất (`lastAttemptAt`), thời điểm dự kiến thử lại (`nextRetryAt`) và độ trễ backoff (`backoffDelayMs`).
3. **Cần phân định giữa Thử lại tự động (Automatic Scheduled Retry) và Thử lại chủ động (Manual User Override)**: Khi người dùng bấm nút "Đồng bộ ngay", hệ thống cần cho phép bỏ qua (bypass) khoảng trễ backoff để thực thi ngay lập tức theo chủ ý của người dùng.

Phase P2.7b bổ sung các metadata lập lịch thử lại (`lastAttemptAt`, `nextRetryAt`, `backoffDelayMs`) và hàm tính toán Exponential Backoff lũy thừa có chặn trên (capped exponential backoff) vào hàng đợi `SyncQueue`.

---

## 2. Invariants & Architecture Decisions

### 2.1. Invariants (Ràng buộc bất biến)
1. **Tương Thích Ngược Tuyệt Đối (Backward Compatibility)**:
   - Các trường metadata mới (`lastAttemptAt?`, `nextRetryAt?`, `backoffDelayMs?`) đều là **optional** trên `SyncMutation`.
   - Hàm `deserializeSyncQueue` xử lý an toàn các mutation cũ đã lưu trong `localStorage` mà không có các trường này.
2. **Thuật Toán Exponential Backoff Có Chặn Trên (Capped Exponential Backoff)**:
   - `BASE_DELAY_MS = 1000` (1 giây).
   - `MAX_DELAY_MS = 60000` (60 giây / 1 phút).
   - Công thức: $\text{delay} = \min(1000 \times 2^{\text{retryCount} - 1}, 60000)$.
   - `nextRetryAt = new Date(Date.now() + delay).toISOString()`.
3. **Không Tự Động Xóa Bỏ Dữ Liệu (No Automatic Drop / No Hard Drop)**:
   - Tuyệt đối **KHÔNG** tự ý xóa bỏ mutation sau $N$ lần thất bại (`maxRetries` không dẫn đến drop). Khi vượt ngưỡng, độ trễ dừng lại ở mức trần 60 giây và giữ nguyên trạng thái `failed` cho đến khi người dùng quyết định bỏ qua (P2.6b) hoặc backend phục hồi.
4. **Manual Override (Bỏ Qua Backoff Khi Bấm Đồng Bộ Thủ Công)**:
   - Khi người dùng nhấp "Đồng bộ ngay" (`flushQueue({ bypassBackoff: true })`), hệ thống lập tức replay mutation bất kể `nextRetryAt` trong tương lai.
5. **Zero Server API / Prisma Drift**:
   - Toàn bộ cơ chế backoff nằm ở Client-side Engine (`src/lib/syncQueue.ts` và `src/services/syncQueue.ts`).

---

## 3. Data Interface & Pure Functions

```typescript
export interface SyncMutation {
  id: string;
  entityType: "category" | "topic" | "note" | "resource" | "studyProgress";
  action: "save" | "delete";
  entityId: string;
  payload?: any;
  clientTimestamp: string;
  retryCount: number;
  status: "pending" | "processing" | "failed";
  lastError?: string;
  // ─── P2.7b New Scheduling Metadata ───
  lastAttemptAt?: string;
  nextRetryAt?: string;
  backoffDelayMs?: number;
}

export function calculateBackoffDelay(
  retryCount: number,
  baseDelayMs = 1000,
  maxDelayMs = 60000
): number;

export function isMutationEligibleForReplay(
  mutation: SyncMutation,
  currentTimeMs = Date.now(),
  bypassBackoff = false
): boolean;
```

---

## 4. File Changes Matrix

| File Path | Trạng thái | Nhiệm vụ |
| :--- | :---: | :--- |
| `src/lib/syncQueue.ts` | **MODIFY** | Mở rộng `SyncMutation`, thêm `calculateBackoffDelay`, `isMutationEligibleForReplay`, cập nhật `markMutationFailed` tính `nextRetryAt` & `backoffDelayMs`. |
| `src/services/syncQueue.ts` | **MODIFY** | `flushQueue(apiBaseUrl, options?)` hỗ trợ kiểm tra `isMutationEligibleForReplay` và cờ `bypassBackoff`. |
| `docs/specs/phase-p2-7b-sync-retry-scheduling-backoff.md` | **NEW** | Bản đặc tả kỹ thuật P2.7b này. |
| `docs/adr/ADR-033-sync-retry-scheduling-backoff.md` | **NEW** | Quyết định kiến trúc lên lịch thử lại và backoff. |
| `docs/gherkin/phase-p2-7b-sync-retry-scheduling-backoff.feature` | **NEW** | Kịch bản kiểm thử BDD cho P2.7b. |
| `tests/unit/sync-retry-scheduling.test.ts` | **NEW** | Unit tests cho thuật toán backoff và replay eligibility. |

---

## 5. Non-Goals (Dành cho phase sau)
- **KHÔNG thay đổi giao diện UI** (`SyncStatusBadge.tsx` hoặc popover UI) trong phase này. Mọi hiển thị đếm ngược/thời gian chờ thử lại sẽ được thực hiện trong phase presentation kế tiếp.

---

## 6. Rollback Strategy
Toàn bộ thay đổi là pure client-side TypeScript logic (Two-Way Door), hoàn nguyên tức thời về P2.7a nếu cần.
