# Technical Specification: Phase P2.7a — Sync Retry Visibility Lite

## 1. Problem Statement & Motivation
Trong `SyncMutation`, trường `retryCount: number` đã được tích lũy mỗi khi `SyncQueueService.flushQueue()` gặp lỗi và gọi `markFailed()`.

Tuy nhiên, trên giao diện Popover (`SyncStatusBadge.tsx`):
1. **Thiếu hiển thị số lần thử lại (No Retry Count Visibility)**: Học giả chỉ thấy nhãn "Lỗi" và nội dung lỗi `lastError` mà không biết đột biến này đã được hệ thống thử replay bao nhiêu lần (`retryCount`).

Phase P2.7a là một **phase thuần túy hiển thị số lần thử lại (Retry Visibility Only)**:
- Khai thác trực tiếp trường `retryCount` sẵn có trong `SyncMutation`.
- Hiển thị số lần thử lại trên tag trạng thái (`Lỗi (n lần)`) và trên dòng chi tiết (`• Đã thử n lần`).
- **Tuyệt đối không thay đổi shape của `SyncMutation`** (không thêm `nextRetryAt`, không thêm `backoffDelayMs`).
- Không thêm bất kỳ action destructive mới nào.

---

## 2. Invariants & Scope Boundaries

### 2.1. Invariants (Ràng buộc bất biến)
1. **Bảo tồn nguyên vẹn `SyncMutation` Interface**: Giữ nguyên 9 trường dữ liệu hiện tại (`id`, `entityType`, `action`, `entityId`, `payload`, `clientTimestamp`, `retryCount`, `status`, `lastError`).
2. **Read-Only Enhancement**: Chỉ bổ sung thông tin hiển thị trực quan trong popover, không thêm/bớt luồng xử lý lưu trữ.
3. **Bảo tồn toàn bộ hành vi P2.6a và P2.6b**: Giữ nguyên Popover toggle, Escape close, Click Outside, Discard failed item with inline confirmation, Manual `flush()`.
4. **Zero Schema & API Drift**: Không thay đổi Prisma Schema hay REST API backend.

### 2.2. Non-Goals (Dành cho P2.7b hoặc phase sau)
- **KHÔNG thêm scheduling metadata** (`nextRetryAt`, `backoffDelayMs`, `maxRetries`).
- **KHÔNG thêm tự động exponential backoff timer** trong phase này.

---

## 3. Interaction & UI Layout

```
┌──────────────────────────────────────────────────────────┐
│ Chi tiết Hàng Đợi Đồng Bộ (Sync Queue Details)      [✕] │
├──────────────────────────────────────────────────────────┤
│ • [Chủ đề] Xóa (topic-2) - 10:16:02         [Lỗi (2 lần)]│
│   ID: topic-2 • Đã thử 2 lần                            │
│   └ Lỗi: "HTTP 500: Internal Server Error"               │
│   └ Bỏ qua mục lỗi này                                   │
├──────────────────────────────────────────────────────────┤
│ [Đồng bộ ngay 🔄]                                        │
└──────────────────────────────────────────────────────────┘
```

---

## 4. File Changes Matrix

| File Path | Trạng thái | Nhiệm vụ |
| :--- | :---: | :--- |
| `src/components/ui/SyncStatusBadge.tsx` | **MODIFY** | Hiển thị `retryCount` và nhãn thông tin thử lại trên từng queue item. |
| `docs/specs/phase-p2-7a-sync-retry-visibility-lite.md` | **NEW** | Bản đặc tả kỹ thuật P2.7a này. |
| `docs/adr/ADR-032-sync-retry-visibility-lite.md` | **NEW** | Quyết định kiến trúc hiển thị số lần thử lại. |
| `docs/gherkin/phase-p2-7a-sync-retry-visibility-lite.feature` | **NEW** | Kịch bản kiểm thử BDD cho P2.7a. |
| `tests/unit/sync-retry-visibility.test.tsx` | **NEW** | Unit tests cho việc hiển thị retryCount và nhãn retry. |

---

## 5. Rollback Strategy
100% Presentation Layer (Two-Way Door), hoàn nguyên tức thời về P2.6b mà không ảnh hưởng dữ liệu.
