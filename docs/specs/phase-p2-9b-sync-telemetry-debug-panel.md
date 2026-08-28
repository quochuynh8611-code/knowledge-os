# Technical Specification: Phase P2.9b — Sync Telemetry Read Model & Debug Panel

## 1. Problem Statement & Motivation
Tại Phase P2.9a, hệ thống đã thiết lập nền tảng lưu trữ nhật ký sự kiện xoay vòng (Rolling Buffer 50 events) và các hàm thuần túy tính toán số liệu thống kê tổng hợp (`calculateSyncTelemetryStats`).

Tuy nhiên, **dữ liệu telemetry hiện tại chưa được trực quan hóa trên giao diện người dùng**:
1. Người vận hành/nhà nghiên cứu không thể xem nhanh tỉ lệ thành công của các lần đồng bộ hay lịch sử các lần phát sinh lỗi mạng.
2. Thiếu tab chẩn đoán (Diagnostics/Debug View) khiến việc kiểm tra hành vi đồng bộ ngoại tuyến trở nên trừu tượng.

Phase P2.9b cung cấp **Read Model & Debug Panel** ngay trong Popover của `SyncStatusBadge`:
- Mở rộng hook `useSyncQueue` để cung cấp `telemetryEvents` và `telemetryStats`.
- Bổ sung giao diện chuyển Tab mượt mà trong Popover: `[Hàng đợi]` (mặc định) và `[Nhật ký & Thống kê]`.
- Hiển thị bảng tổng hợp chỉ số (Tổng sự kiện, Thành công, Lỗi, Bỏ qua, Tỉ lệ thành công %).
- Hiển thị danh sách 10–20 sự kiện gần nhất với nhãn trạng thái và thời gian chi tiết.
- **Read-Only First**: Giữ nguyên tính minh bạch, không thêm thao tác phá hủy (destructive actions).

---

## 2. Invariants & Scope Boundaries

### 2.1. Invariants (Ràng buộc bất biến)
1. **Không Phá Vỡ Trải Nghiệm Mặc Định (Zero Popover Regression)**:
   - Tab mặc định khi mở Popover luôn là **`Hàng đợi` (Queue)**.
   - Giao diện xem hàng đợi hiện tại từ P2.6a–P2.7c (hiển thị retry count, countdown cooldown, nút bỏ qua mutation) được giữ nguyên 100%.
2. **Read-Only First (An Toàn Dữ Liệu)**:
   - Giao diện Telemetry chỉ đọc dữ liệu từ `SyncQueueService.getTelemetryStats()` và `SyncQueueService.getTelemetryEvents()`.
   - Không có nút xóa log hay chỉnh sửa log trong phase này.
3. **Phản Ứng Tức Thì Theo State Hook (Reactive Subscription)**:
   - Khi có đột biến mới được enqueue hoặc replay thành công/thất bại, tab Telemetry tự động cập nhật số liệu mà không cần đóng mở lại popover.
4. **Không Thêm Dependency Mới**:
   - Sử dụng các icon sẵn có từ `lucide-react` (`Activity`, `CheckCircle2`, `AlertCircle`, `Trash2`, `ListChecks`).

### 2.2. Non-Goals
- Không xây dựng cloud export hay gửi log ra webhook bên ngoài.
- Không thêm cấu hình cảnh báo ngưỡng lỗi (Alert Rules).

---

## 3. UI Wireframe & UX Architecture

```
┌────────────────────────────────────────────────────────┐
│ HÀNG ĐỢI ĐỒNG BỘ                       [X]             │
│ Trực tuyến • 0 đang chờ • 0 lỗi                        │
├────────────────────────────────────────────────────────┤
│ [ Hàng đợi (0) ]   [ Nhật ký & Thống kê (15) ]         │
├────────────────────────────────────────────────────────┤
│ ┌───────────────┐ ┌───────────────┐ ┌────────────────┐ │
│ │ Tỉ lệ t.công  │ │ Thành công    │ │ Lỗi          │ │
│ │ 85.7%         │ │ 12            │ │ 2            │ │
│ └───────────────┘ └───────────────┘ └────────────────┘ │
│                                                        │
│ LỊCH SỬ GẦN ĐÂY:                                       │
│ • [Thành công] Topic: Khái niệm tánh Không    14:50:02 │
│ • [Thất bại] Note: Trích dẫn kinh A-hàm       14:48:15 │
│   Lỗi: Network connection timeout                      │
│ • [Đã bỏ qua] Topic: Bản nháp cũ             14:30:10 │
└────────────────────────────────────────────────────────┘
```

---

## 4. File Changes Matrix

| File Path | Trạng thái | Nhiệm vụ |
| :--- | :---: | :--- |
| `src/hooks/useSyncQueue.ts` | **MODIFY** | Expose `telemetryEvents` và `telemetryStats` qua subscription. |
| `src/components/ui/SyncStatusBadge.tsx` | **MODIFY** | Thêm tab switcher `[Hàng đợi]` / `[Nhật ký]`, hiển thị thống kê metrics và danh sách recent events. |
| `docs/specs/phase-p2-9b-sync-telemetry-debug-panel.md` | **NEW** | Bản đặc tả kỹ thuật P2.9b này. |
| `docs/adr/ADR-037-sync-telemetry-debug-panel.md` | **NEW** | Quyết định kiến trúc hiển thị Telemetry Read Model & Debug Panel. |
| `docs/gherkin/phase-p2-9b-sync-telemetry-debug-panel.feature` | **NEW** | Kịch bản kiểm thử BDD cho P2.9b. |
| `tests/unit/sync-telemetry-debug-panel.test.tsx` | **NEW** | Unit tests cho giao diện chuyển tab và hiển thị telemetry stats/events. |

---

## 5. Rollback Strategy
Thay đổi hoàn toàn nằm ở tầng UI/Hook (Two-Way Door), dễ dàng rollback về P2.9a mà không ảnh hưởng cấu trúc dữ liệu lưu trữ.
