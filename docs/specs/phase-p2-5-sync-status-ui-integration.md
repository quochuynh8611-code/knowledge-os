# Technical Specification: Phase P2.5 — Sync Queue Status Indicator & Navbar UI Integration

## 1. Problem Statement & Motivation
Sau khi hoàn thành P2.2 $\rightarrow$ P2.4, toàn bộ hệ thống hàng đợi đột biến ngoại tuyến (`SyncQueueService`) và React hook (`useSyncQueue`) đã sẵn sàng và kiểm chứng vững chắc qua 82 unit tests.

Tuy nhiên, trên giao diện người dùng (UI), học giả hiện chưa có điểm chạm trực quan nào để:
1. Biết được ứng dụng đang chạy ở chế độ trực tuyến (Online) hay ngoại tuyến (Offline).
2. Theo dõi số lượng đột biến đang chờ đẩy lên server (`pendingCount`) hoặc số lượng thất bại (`failedCount`).
3. Chủ động kích hoạt đồng bộ lại (1-click Manual Sync Retry) khi vừa có kết nối mạng.

Phase P2.5 hiện thực hóa điểm chạm giao diện đầu tiên thông qua component **`SyncStatusBadge`** tích hợp tinh gọn trên thanh điều hướng **`Navbar.tsx`**.

---

## 2. Goals & Non-Goals

### 2.1. Goals
1. **Tạo Component `SyncStatusBadge` (`src/components/ui/SyncStatusBadge.tsx`)**:
   - Sử dụng hook `useSyncQueue` để hiển thị trạng thái động theo 4 chế độ:
     - **Đã đồng bộ (Online & 0 pending)**: Huy hiệu xanh ngọc tinh tế / biểu tượng đám mây sẵn sàng (`CloudCheck`).
     - **Ngoại tuyến (Offline)**: Huy hiệu màu hổ phách/xám (`CloudOff`) hiển thị số lượng đột biến đang lưu trữ cục bộ (`{pendingCount} chờ đồng bộ`).
     - **Đang đồng bộ (Flushing)**: Huy hiệu màu lam với icon xoay (`RefreshCw animate-spin`) hiển thị `"Đang đồng bộ..."`.
     - **Có lỗi đồng bộ (Failed)**: Huy hiệu màu đỏ/rose (`AlertCircle`) kèm nút 1-click `"Thử lại"` khi có mạng trở lại.
2. **Tích hợp Tinh Gọn Trên `Navbar.tsx`**:
   - Đặt cạnh các nút công cụ tiện ích (ThemeToggle, Timer, Shortcuts).
   - Tương thích tốt trên cả Desktop và thiết bị di động (responsive compact mode).
3. **Bảo Toàn 100% Invariants**:
   - Zero Prisma Schema Drift, Zero REST API Drift.
   - Không can thiệp vào logic lưu trữ backend hay service queue.

### 2.2. Non-Goals
- Không mở rộng đồng bộ hàng loạt lên các modal khác trong phase này.
- Không sửa đổi Prisma schema hoặc REST API backend.

---

## 3. Component Architecture & Props

```typescript
export interface SyncStatusBadgeProps {
  syncQueueService?: SyncQueueService;
  apiBaseUrl?: string;
  className?: string;
}
```

---

## 4. File Changes Matrix

| File Path | Trạng thái | Nhiệm vụ |
| :--- | :---: | :--- |
| `src/components/ui/SyncStatusBadge.tsx` | **NEW** | Component hiển thị huy hiệu trạng thái đồng bộ và nút bấm thử lại. |
| `src/components/layout/Navbar.tsx` | **MODIFY** | Tích hợp `SyncStatusBadge` vào thanh điều hướng. |
| `docs/specs/phase-p2-5-sync-status-ui-integration.md` | **NEW** | Bản đặc tả kỹ thuật này. |
| `docs/adr/ADR-029-sync-status-ui-integration.md` | **NEW** | Quyết định kiến trúc tích hợp Sync Status UI. |
| `docs/gherkin/phase-p2-5-sync-status-ui-integration.feature` | **NEW** | Kịch bản kiểm thử BDD. |
| `tests/unit/sync-status-badge.test.tsx` | **NEW** | Unit & Integration tests cho `SyncStatusBadge` và `Navbar`. |

---

## 5. Rollback Strategy
Toàn bộ logic là tầng hiển thị Presentation Layer (Two-Way Door), hoàn nguyên tức thời về P2.4 mà không ảnh hưởng bất kỳ dữ liệu nào.
