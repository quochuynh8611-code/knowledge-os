# Technical Specification: Phase P2.6a — Sync Queue Read-Only Details Popover

## 1. Problem Statement & Motivation
Sau khi hoàn thành P2.5, thanh điều hướng `Navbar` đã có huy hiệu `SyncStatusBadge` phản ánh trạng thái hàng đợi đồng bộ thời gian thực (`Synced`, `Offline`, `Flushing`, `Failed`).

Tuy nhiên, khi hàng đợi có nhiều đột biến đang chờ hoặc gặp lỗi (Failed):
1. **Thiếu khả năng xem chi tiết (No Mutation Visibility)**: Học giả không biết cụ thể ghi chú, chủ đề hay tài liệu nào đang nằm trong hàng đợi.
2. **Thiếu thông tin lỗi chi tiết (No Error Transparency)**: Khi xuất hiện lỗi, người dùng không xem được nguyên nhân lỗi cụ thể (`lastError` như Timeout, 404, 500) mà chỉ thấy con số đếm.

Phase P2.6a mở rộng `SyncStatusBadge` với một **Popover xem chi tiết hàng đợi thuần túy đọc (Read-Only Inspection UI)** và nút kích hoạt đồng bộ lại `flush()`.

> **Lưu ý tách biệt kiến trúc (Architectural Separation)**:
> Mọi thao tác hủy bỏ/xóa đột biến (Mutation Discard / Poison-Pill Mitigation) là hành vi can thiệp phá hủy dữ liệu (destructive operator action), do đó được tách hoàn toàn sang **Phase P2.6b** với ADR độc lập.

---

## 2. Goals & Non-Goals

### 2.1. Goals
1. **Mở Popover Chi Tiết khi nhấp vào `SyncStatusBadge`**:
   - Hiển thị danh sách các mutation trong hàng đợi theo đúng thứ tự FIFO:
     - Loại thực thể (`note`, `topic`, `category`, `resource`, `studyProgress`).
     - Hành động (`save` / `delete`) và thời gian ghi nhận `clientTimestamp`.
     - Trạng thái (`pending` / `failed`).
     - Thông báo lỗi chi tiết (`lastError`) cho các mutation gặp sự cố.
2. **Kích hoạt Đồng Bộ Thủ Công**:
   - Nút **"Đồng bộ ngay" (Sync Now)**: Kích hoạt `flush()` khi online.
3. **Đóng Mở Thân Thiện & Trợ Năng (A11y & UX)**:
   - Nhấp vào badge để bật/tắt (Toggle).
   - Tự động đóng khi nhấn phím `Escape` hoặc nhấp chuột ra ngoài (Click Outside).
4. **Bảo Toàn 100% Invariants**:
   - Giữ nguyên FIFO replay và failed-tail semantics của `SyncQueueService`.
   - Zero Prisma Schema Drift, Zero REST API Contract Drift.

### 2.2. Non-Goals (Dành cho P2.6b)
- **KHÔNG có nút xóa / loại bỏ mutation (No mutation discard/deletion)** trong Phase P2.6a.
- Không thay đổi cấu trúc dữ liệu `SyncMutation`.

---

## 3. Architecture & UI Flow

```
[SyncStatusBadge in Navbar]
       │ (User clicks badge)
       ▼
┌──────────────────────────────────────────────────────────┐
│ Chi tiết Hàng Đợi Đồng Bộ (Sync Queue Details)      [✕] │
├──────────────────────────────────────────────────────────┤
│ Trạng thái: Trực tuyến | 2 đang chờ | 1 lỗi             │
├──────────────────────────────────────────────────────────┤
│ • [Ghi chú] Lưu (note-1) - 10:15:30         [Pending]   │
│ • [Chủ đề] Xóa (topic-2) - 10:16:02         [Failed]    │
│   └ Lỗi: "HTTP 500: Internal Server Error"               │
├──────────────────────────────────────────────────────────┤
│ [Đồng bộ ngay 🔄]                                        │
└──────────────────────────────────────────────────────────┘
```

---

## 4. File Changes Matrix

| File Path | Trạng thái | Nhiệm vụ |
| :--- | :---: | :--- |
| `src/components/ui/SyncStatusBadge.tsx` | **MODIFY** | Tích hợp popover đọc chi tiết mutation, hiển thị lỗi và nút "Đồng bộ ngay". |
| `docs/specs/phase-p2-6a-sync-queue-popover-details.md` | **NEW** | Bản đặc tả kỹ thuật P2.6a này. |
| `docs/adr/ADR-030-sync-queue-popover-details.md` | **NEW** | Quyết định kiến trúc Popover kiểm tra hàng đợi (Read-Only). |
| `docs/gherkin/phase-p2-6a-sync-queue-popover-details.feature` | **NEW** | Kịch bản kiểm thử BDD cho P2.6a. |
| `tests/unit/sync-queue-popover.test.tsx` | **NEW** | Unit tests cho P2.6a. |

---

## 5. Rollback Strategy
Toàn bộ logic thuộc Presentation Layer (Two-Way Door), hoàn nguyên tức thời về P2.5 mà không ảnh hưởng bất kỳ luồng dữ liệu nào.
