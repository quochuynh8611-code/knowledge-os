# Technical Specification: Phase P2.9a — Sync Queue Telemetry & Failure Observability Foundations

## 1. Problem Statement & Motivation
Trải qua chuỗi Phase từ P2.2 đến P2.8, hệ thống hàng đợi đột biến ngoại tuyến (`SyncQueue`) đã có:
- Hàng đợi FIFO bền vững với cơ chế gộp và khử trùng lặp (P2.2, P2.3a-c).
- Quan sát trạng thái qua hook `useSyncQueue` (P2.4) và huy hiệu trạng thái (P2.5).
- Popover chi tiết (P2.6a) và loại bỏ đột biến lỗi (Poison-Pill Mitigation) (P2.6b).
- Hiển thị số lần thử lại (P2.7a), lập lịch Exponential Backoff (P2.7b), và đếm ngược Cooldown (P2.7c).
- Tự động đồng bộ khi kết nối mạng trở lại và hết hạn Cooldown (P2.8).

Tuy nhiên, **hệ thống hiện tại chưa có khả năng lưu vết lịch sử (Telemetry / Audit Log)**:
1. Khi các đột biến thành công, thất bại, hoặc bị hủy bỏ, thông tin chỉ được ghi đè tức thời mà không lưu lại nhật ký sự kiện để phục vụ việc chẩn đoán lỗi.
2. Không có số liệu thống kê tổng hợp (tỉ lệ thành công, số lần lỗi theo từng loại thực thể `note`, `topic`, `category`, `resource`, `studyProgress`).

Phase P2.9a xây dựng **nền tảng Telemetry & Observability Local-First**:
- Ghi nhận nhật ký sự kiện có giới hạn kích thước (Rolling Buffer tối đa 50 sự kiện).
- Cung cấp hàm tính toán số liệu thống kê tổng hợp (Aggregate Metrics).
- **100% Local-First**: Không gửi dữ liệu telemetry ra server bên ngoài.
- **Fault-Tolerant**: Lỗi ghi log tuyệt đối không bao giờ làm gián đoạn luồng đồng bộ chính.
- **Chưa thêm UI Panel** trong phase này (sẽ dành cho phase UI kế tiếp).

---

## 2. Invariants & Architecture Boundaries

### 2.1. Invariants (Ràng buộc bất biến)
1. **Non-Blocking & Fault-Tolerant (Không Ngắt Luồng)**:
   - Mọi thao tác ghi telemetry được bọc trong `try ... catch`.
   - Nếu `localStorage` bị đầy hoặc gặp lỗi serialize, hệ thống ghi nhận âm thầm (silent fallback) và luồng `enqueue`, `flushQueue`, `discardFailedMutation` vẫn hoạt động bình thường 100%.
2. **Bộ Nhớ Xoay Vòng Cố Định (Fixed 50-Event Rolling Buffer)**:
   - Chỉ lưu tối đa 50 sự kiện gần nhất trong khóa `phat_hoc_huyen_hoc_sync_telemetry`.
   - Khi vượt quá 50, sự kiện cũ nhất sẽ tự động bị loại bỏ (FIFO eviction).
3. **Phản Ánh Đúng Hành Vi Thực Tế (No Invented States)**:
   - Chỉ định nghĩa các Event Types tương ứng trực tiếp với các hành động hiện có trong `SyncQueueService`:
     - `MUTATION_ENQUEUED`
     - `REPLAY_SUCCESS`
     - `REPLAY_FAILED`
     - `MUTATION_DISCARDED`
     - `QUEUE_FLUSH_COMPLETED`
4. **Zero Network Overhead**:
   - Không thực hiện bất kỳ HTTP POST/GET request nào cho telemetry.
5. **Tách Biệt Tầng Pure Helpers & Service**:
   - `src/lib/syncTelemetry.ts`: Định nghĩa types, hàm thuần túy `appendTelemetryEvent`, `calculateSyncTelemetryStats`, serialization.
   - `src/services/syncQueue.ts`: Tích hợp phát sự kiện trong các phương thức của service.

### 2.2. Non-Goals (Dành cho phase sau)
- **KHÔNG thêm giao diện UI Debug/Telemetry Panel** trong phase này.
- **KHÔNG gửi dữ liệu về dịch vụ giám sát đám mây** (Cloud Monitoring / Sentry).

---

## 3. Data Interface & Pure Functions

```typescript
export type SyncTelemetryEventType =
  | "MUTATION_ENQUEUED"
  | "REPLAY_SUCCESS"
  | "REPLAY_FAILED"
  | "MUTATION_DISCARDED"
  | "QUEUE_FLUSH_COMPLETED";

export interface SyncTelemetryEvent {
  id: string;
  timestamp: string; // ISO string
  type: SyncTelemetryEventType;
  entityType?: "category" | "topic" | "note" | "resource" | "studyProgress";
  mutationId?: string;
  entityId?: string;
  action?: "save" | "delete";
  retryCount?: number;
  error?: string;
  metadata?: Record<string, any>;
}

export interface SyncTelemetryStats {
  totalEvents: number;
  enqueuedCount: number;
  successCount: number;
  failureCount: number;
  discardedCount: number;
  byEntityType: Record<
    string,
    { success: number; failure: number; discarded: number }
  >;
  successRate: number; // 0 - 100 (%)
}

export function appendTelemetryEvent(
  events: SyncTelemetryEvent[],
  newEvent: SyncTelemetryEvent,
  maxEvents = 50
): SyncTelemetryEvent[];

export function calculateSyncTelemetryStats(
  events: SyncTelemetryEvent[]
): SyncTelemetryStats;
```

---

## 4. File Changes Matrix

| File Path | Trạng thái | Nhiệm vụ |
| :--- | :---: | :--- |
| `src/lib/syncTelemetry.ts` | **NEW** | Định nghĩa cấu trúc `SyncTelemetryEvent`, `SyncTelemetryStats`, và các hàm thuần túy. |
| `src/services/syncQueue.ts` | **MODIFY** | Tích hợp ghi event telemetry khi enqueue, replay success, replay failure, discard và flush completed. |
| `docs/specs/phase-p2-9a-sync-telemetry-foundations.md` | **NEW** | Bản đặc tả kỹ thuật P2.9a này. |
| `docs/adr/ADR-036-sync-telemetry-foundations.md` | **NEW** | Quyết định kiến trúc hệ thống telemetry cục bộ. |
| `docs/gherkin/phase-p2-9a-sync-telemetry-foundations.feature` | **NEW** | Kịch bản kiểm thử BDD cho P2.9a. |
| `tests/unit/sync-telemetry-foundations.test.ts` | **NEW** | Unit tests cho logic telemetry và tích hợp service. |

---

## 5. Rollback Strategy
100% Local TypeScript/Storage logic (Two-Way Door), hoàn nguyên tức thời về P2.8 mà không ảnh hưởng bất kỳ luồng dữ liệu chính nào.
