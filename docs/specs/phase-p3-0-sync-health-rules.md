# Technical Specification: Phase P3.0 — Sync Health Rules & Alerting Read Model

## 1. Problem Statement & Motivation
Sau khi hoàn thành Phase P2.9a (Telemetry Foundations) và P2.9b (Debug Panel UI), hệ thống hàng đợi ngoại tuyến đã có đầy đủ:
- Nhật ký lưu vết 50 sự kiện gần nhất (Rolling Buffer).
- Các chỉ số tổng hợp: tổng sự kiện, số lượng thành công, lỗi, bỏ qua, và tỉ lệ thành công `successRate`.
- Giao diện trực quan hóa trong Popover `SyncStatusBadge`.

Tuy nhiên, **người vận hành hiện tại phải tự đọc các con số thô để suy luận tình trạng hệ thống**:
1. Không có tiêu chuẩn định lượng rõ ràng: Tỉ lệ 80% có phải là bất thường không? Khi nào một hàng đợi bị coi là "nguy cấp" (Critical) do bị kẹt mutation (poison-pill / retry exhaustion)?
2. Thiếu mô hình đánh giá sức khỏe (Health Evaluation Read Model) thuần túy để tự động phân loại tình trạng hệ thống và đưa ra khuyến nghị xử lý nhanh.

Phase P3.0 cung cấp **Mô Hình Đánh Giá Sức Khỏe Đồng Bộ (Sync Health Rules & Alerting Read Model)**:
- Định nghĩa bộ quy tắc đánh giá sức khỏe tất định (Deterministic Pure Health Rules).
- Phân loại 4 mức trạng thái: `healthy`, `degraded`, `critical`, `unknown`.
- Cung cấp hàm thuần túy `evaluateSyncHealth(queue, telemetryStats, telemetryEvents)`.
- Tích hợp nhãn sức khỏe trực quan trong tab Telemetry của `SyncStatusBadge`.
- **100% Local-First & Low Blast Radius**: Không dùng push notification, không gửi dữ liệu ra bên ngoài.

---

## 2. Health Rules Matrix & Thresholds (Bộ Quy Tắc Đánh Giá)

| Mức độ (`level`) | Nhãn UI (`label`) | Điều kiện kích hoạt (Rules & Thresholds) | Màu sắc gợi ý |
| :--- | :--- | :--- | :--- |
| **`healthy`** | Hoạt động tốt | • `failedCount === 0` trong hàng đợi hiện tại<br>• `successRate >= 90%` (hoặc chưa có lỗi nào) | Xanh lá (`emerald`) |
| **`degraded`** | Gián đoạn nhẹ | • $1 \le \text{failedCount} < 5$ HOẶC<br>• $50\% \le \text{successRate} < 90\%$ (khi có $\ge 3$ lượt thử) | Vàng hổ phách (`amber`) |
| **`critical`** | Lỗi nghiêm trọng | • $\text{failedCount} \ge 5$ HOẶC<br>• $\text{successRate} < 50\%$ (khi có $\ge 3$ lượt thử) HOẶC<br>• Có ít nhất 1 mutation bị thử lại $\ge 5$ lần (`retryCount >= 5`) | Đỏ hồng (`rose`) |
| **`unknown`** | Chưa có dữ liệu | • Hàng đợi rỗng VÀ `totalEvents === 0` | Xám đá (`stone`) |

---

## 3. Data Interface & Pure Function Specification

```typescript
export type SyncHealthLevel = "healthy" | "degraded" | "critical" | "unknown";

export interface SyncHealthReport {
  level: SyncHealthLevel;
  label: string;
  score: number; // 0 - 100
  reasons: string[];
  summary: string;
  activeFailures: number;
  successRate: number;
}

/**
 * Pure deterministic health evaluation function.
 * Evaluates queue state and telemetry history to produce a structured health report.
 */
export function evaluateSyncHealth(
  queue: SyncMutation[],
  telemetryStats: SyncTelemetryStats,
  telemetryEvents?: SyncTelemetryEvent[]
): SyncHealthReport;
```

---

## 4. Invariants & Scope Boundaries

### 4.1. Invariants (Ràng buộc bất biến)
1. **Thuần Túy & Tất Định (Pure & Deterministic)**:
   - Hàm `evaluateSyncHealth` không phụ thuộc vào `Date.now()`, mạng hay API bên ngoài, hoàn toàn tính toán từ snapshot tham số truyền vào.
2. **Không Gây Phiền Nhiễu (Non-Intrusive & Zero Alarm Fatigue)**:
   - Cảnh báo chỉ hiển thị dưới dạng Health Badge/Card bên trong tab Telemetry của Popover.
   - Không hiển thị modal chặn màn hình (blocking alert), không phát âm thanh, không gửi push notification.
3. **Phản Ánh Đúng Thực Trạng Hiện Tại (Snapshot-Based Evaluation)**:
   - Nếu lỗi cũ trong telemetry đã được khắc phục và hàng đợi hiện tại đã rỗng (`failedCount === 0`), hệ thống sẽ hồi phục về `healthy` khi tỉ lệ thành công đạt chuẩn, không duy trì cảnh báo dính (sticky alert) giả tạo.

### 4.2. Non-Goals
- Không gửi cảnh báo về Telegram/Slack/Email webhook.
- Không thêm nút can thiệp phá hủy dữ liệu.

---

## 5. File Changes Matrix

| File Path | Trạng thái | Nhiệm vụ |
| :--- | :---: | :--- |
| `src/lib/syncTelemetry.ts` | **MODIFY** | Bổ sung type `SyncHealthLevel`, `SyncHealthReport` và hàm thuần túy `evaluateSyncHealth`. |
| `src/hooks/useSyncQueue.ts` | **MODIFY** | Expose `syncHealth: SyncHealthReport` tính từ state hiện tại. |
| `src/components/ui/SyncStatusBadge.tsx` | **MODIFY** | Hiển thị Health Status Banner/Pill ở đầu tab Telemetry. |
| `docs/specs/phase-p3-0-sync-health-rules.md` | **NEW** | Bản đặc tả kỹ thuật Phase P3.0 này. |
| `docs/adr/ADR-038-sync-health-rules.md` | **NEW** | Quyết định kiến trúc bộ quy tắc đánh giá sức khỏe. |
| `docs/gherkin/phase-p3-0-sync-health-rules.feature` | **NEW** | Kịch bản kiểm thử BDD cho P3.0. |
| `tests/unit/sync-health-rules.test.ts` | **NEW** | Unit tests cho pure function `evaluateSyncHealth` và UI Health Banner. |

---

## 6. Rollback Strategy
Thay đổi hoàn toàn nằm ở tầng logic tính toán thuần túy và hiển thị (Two-Way Door), dễ dàng rollback về P2.9b mà không ảnh hưởng bất kỳ luồng dữ liệu nào.
