# Technical Specification: Phase P3.2 — Storage Quota Guard & Proactive Payload Trimming

## 1. Problem Statement & Motivation
Trong môi trường trình duyệt, `localStorage` có giới hạn cứng (thường là 5MB cho mỗi domain/origin).
Khi người dùng hoạt động ngoại tuyến lâu dài hoặc thực hiện nhiều thao tác ghi dữ liệu lớn:
1. Lỗi `QuotaExceededError` có thể xảy ra khi gọi `localStorage.setItem`.
2. Dù `safeSetLocalStorageItem` đã bọc `try-catch` để chống crash ứng dụng, việc ghi dữ liệu thất bại trong im lặng (silent drop) có thể làm mất đột biến mới (`pending mutation`) của người dùng.
3. Nhật ký telemetry (50 sự kiện) và các chuỗi `lastError` dài (ví dụ HTML/stack trace từ server) có thể chiếm dụng không gian quý giá lẽ ra phải dành cho dữ liệu nghiệp vụ quan trọng.

Phase P3.2 cung cấp **Cơ Chế Phòng Vệ Hạn Mức Dung Lượng (Storage Quota Guard & Proactive Trimming)**:
- Cắt gọt chuỗi lỗi ngoại lệ (`lastError` max 500 ký tự) để chống phình to hàng đợi.
- Chiến lược phục hồi 3 tầng khi gặp sự cố Quota:
  - **Tầng 1 (Telemetry Trimming)**: Tự động thu gọn/dọn bớt telemetry log để nhường chỗ cho hàng đợi.
  - **Tầng 2 (Exhausted Poison-Pill Eviction)**: Loại bỏ các mutation lỗi đã vượt quá ngưỡng thử lại tối đa (`retryCount >= 10`), **tuyệt đối bảo vệ 100% các mutation đang chờ (`pending`)**.
  - **Tầng 3 (Explicit Return Status)**: Phương thức `enqueue()` và `saveQueue()` trả về boolean trạng thái để caller nhận biết.
- **100% Local-First & Zero Extra Network**: Hoàn toàn là logic nội bộ client-side.

---

## 2. Recovery Tiers Flowchart (Quy Trình Phục Hồi Hạn Mức)

```
  ┌────────────────────────────────────────────────────────┐
  │              safeSetLocalStorageItem() Fail            │
  │                  (QuotaExceededError)                  │
  └───────────────────────────┬────────────────────────────┘
                              │
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │  TẦNG 1: Thu gọn Telemetry Storage                     │
  │  - Giảm log telemetry xuống còn 5 items gần nhất       │
  │  - Thử lưu lại Queue                                   │
  └───────────────────────────┬────────────────────────────┘
                              │ (Nếu vẫn đầy)
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │  TẦNG 2: Thu dọn Poison-Pills cạn kiệt (Exhausted)     │
  │  - Loại bỏ mutations có status='failed' & retry >= 10  │
  │  - Bảo tồn toàn bộ status='pending'                    │
  │  - Thử lưu lại Queue                                   │
  └───────────────────────────┬────────────────────────────┘
                              │ (Nếu vẫn đầy)
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │  TẦNG 3: Báo trạng thái thất bại an toàn               │
  │  - Trả về false, không crash ứng dụng                  │
  └────────────────────────────────────────────────────────┘
```

---

## 3. Data Interface & Pure Function Specification

```typescript
/**
 * Truncates overly long error strings to prevent storage bloat.
 */
export function sanitizeMutationError(
  error?: string,
  maxLength = 500
): string | undefined;

/**
 * Pure function that prunes exhausted failed mutations from queue to reclaim storage.
 * Strictly preserves all 'pending' mutations.
 */
export function pruneExhaustedFailedMutations(
  queue: SyncMutation[],
  maxRetryThreshold = 10
): SyncMutation[];
```

---

## 4. Invariants & Scope Boundaries

### 4.1. Invariants (Ràng buộc bất biến)
1. **Tuyệt Đối Không Hủy Mutation Pending (Never Drop Pending Mutations)**:
   - Các đột biến chưa đồng bộ (`status === 'pending'`) đại diện cho công sức biên tập của người dùng, không bao giờ bị hệ thống tự ý thu dọn (evict).
2. **Ưu Tiên Dữ Liệu Nghiệp Vụ Hơn Nhật Ký Quan Sát (Queue Over Telemetry)**:
   - Khi thiếu dung lượng, telemetry log luôn bị cắt gọt hoặc xóa bỏ trước để bảo vệ hàng đợi dữ liệu nghiệp vụ.
3. **Giới Hạn Độ Dài Chuỗi Lỗi (Deterministic Error Capping)**:
   - `lastError` luôn được chuẩn hóa tối đa 500 ký tự.

### 4.2. Non-Goals
- Không chuyển sang IndexedDB trong phase này (IndexedDB sẽ được xem xét ở major phase riêng nếu dung lượng vượt 5MB).
- Không thêm popup cảnh báo ồn ào trên UI.

---

## 5. File Changes Matrix

| File Path | Trạng thái | Nhiệm vụ |
| :--- | :---: | :--- |
| `src/lib/syncQueue.ts` | **MODIFY** | Bổ sung `sanitizeMutationError` và `pruneExhaustedFailedMutations`. |
| `src/services/syncQueue.ts` | **MODIFY** | Triển khai cơ chế 2-phase fallback recovery trong `saveQueue()`, `enqueue()` trả về boolean. |
| `docs/specs/phase-p3-2-storage-quota-guard.md` | **NEW** | Bản đặc tả kỹ thuật Phase P3.2 này. |
| `docs/adr/ADR-040-storage-quota-guard.md` | **NEW** | Quyết định kiến trúc phòng vệ hạn mức dung lượng. |
| `docs/gherkin/phase-p3-2-storage-quota-guard.feature` | **NEW** | Kịch bản kiểm thử BDD cho Storage Quota Guard. |
| `tests/unit/sync-storage-quota.test.ts` | **NEW** | Unit tests kiểm thử tình huống QuotaExceededError và tự động thu dọn. |

---

## 6. Rollback Strategy
Toàn bộ thay đổi nằm trong pure helper và recovery fallback của service (Two-Way Door), không ảnh hưởng luồng nghiệp vụ thông thường.
