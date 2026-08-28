# Technical Specification: Phase P2.7c — Sync Backoff Indicator UI

## 1. Problem Statement & Motivation
Tại Phase P2.7b, hệ thống đã cài đặt cơ chế tính toán Exponential Backoff và lưu trữ các metadata:
- `lastAttemptAt?: string`
- `nextRetryAt?: string`
- `backoffDelayMs?: number`

Tuy nhiên, giao diện Popover (`SyncStatusBadge.tsx`) hiện chỉ hiển thị số lần đã thử (`• Đã thử N lần`) mà chưa cho người dùng biết:
1. Đột biến này có đang bị chặn bởi khoảng trễ backoff (cooldown) hay không.
2. Còn bao lâu nữa hệ thống mới tự động thử lại (ví dụ: "Thử lại sau 4s" hoặc "Thử lại sau 1 phút").
3. Khi khoảng trễ đã kết thúc, mutation đã ở trạng thái "Sẵn sàng thử lại" hay chưa.

Phase P2.7c là một **phase thuần túy hiển thị (Presentation-Only)** nhằm trực quan hóa trạng thái backoff cooldown dựa trên metadata P2.7b.

---

## 2. Invariants & Scope Boundaries

### 2.1. Invariants (Ràng buộc bất biến)
1. **Presentation-Only**: Tiêu thụ 100% metadata sẵn có từ P2.7b (`nextRetryAt`, `backoffDelayMs`), tuyệt đối không thay đổi engine logic trong `src/lib/syncQueue.ts` hay `src/services/syncQueue.ts`.
2. **Zero Blast Radius ngoài Popover**: Bộ đếm thời gian (live countdown) chỉ kích hoạt khi Popover đang mở (`isOpen === true`) và có mutation lỗi. Khi Popover đóng, timer bị hủy hoàn toàn (`clearInterval`), không tiêu tốn CPU ngầm.
3. **Bảo tồn hành vi P2.6a, P2.6b, P2.7a, P2.7b**:
   - Giữ nguyên hiển thị FIFO, `lastError`, `retryCount`.
   - Giữ nguyên nút Discard kèm inline confirmation.
   - Nút "Đồng bộ ngay" tiếp tục bypass backoff và replay tức thì.
4. **Bảo toàn trạng thái Pending Mutations**: Mutation `pending` tuyệt đối không hiển thị nhãn cooldown.

### 2.2. Non-Goals
- Không thêm controls mới ngoài những gì đã có.
- Không thay đổi Prisma Schema hay REST API.

---

## 3. UX States & Formatting Rules

### 3.1. Trạng thái Cooldown (`now < nextRetryAt`)
- Khi mutation bị lỗi và còn thời gian chờ:
  - Tính thời gian còn lại: `remainingSec = Math.max(1, Math.ceil((nextRetryTime - now) / 1000))`.
  - Hiển thị text: `Thử lại sau ${remainingSec}s` (nếu < 60s) hoặc `Thử lại sau ${Math.ceil(remainingSec / 60)} phút` (nếu $\ge 60\text{s}$).
  - Vị trí: Hiển thị nổi bật kèm icon đồng hồ/chờ (hoặc text inline) ngay cạnh số lần thử.

### 3.2. Trạng thái Sẵn sàng (`now >= nextRetryAt` hoặc không có `nextRetryAt`)
- Khi mutation đã hết thời gian cooldown nhưng chưa được replay:
  - Hiển thị nhãn: `Sẵn sàng thử lại`.

---

## 4. File Changes Matrix

| File Path | Trạng thái | Nhiệm vụ |
| :--- | :---: | :--- |
| `src/components/ui/SyncStatusBadge.tsx` | **MODIFY** | Tích hợp hiển thị cooldown `Thử lại sau Xs` / `Sẵn sàng thử lại` và ticker khi popover mở. |
| `docs/specs/phase-p2-7c-sync-backoff-indicator-ui.md` | **NEW** | Bản đặc tả kỹ thuật P2.7c này. |
| `docs/adr/ADR-034-sync-backoff-indicator-ui.md` | **NEW** | Quyết định kiến trúc hiển thị trạng thái backoff. |
| `docs/gherkin/phase-p2-7c-sync-backoff-indicator-ui.feature` | **NEW** | Kịch bản kiểm thử BDD cho P2.7c. |
| `tests/unit/sync-backoff-indicator.test.tsx` | **NEW** | Unit tests cho việc hiển thị cooldown và ready state. |

---

## 5. Rollback Strategy
100% UI component presentation (Two-Way Door), hoàn nguyên tức thời về P2.7b mà không ảnh hưởng bất kỳ dữ liệu nào.
