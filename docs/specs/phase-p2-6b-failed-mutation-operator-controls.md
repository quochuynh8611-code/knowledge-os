# Technical Specification: Phase P2.6b — Failed Mutation Operator Controls & Poison-Pill Mitigation

## 1. Problem Statement & Motivation
Sau khi hoàn thành P2.6a (Read-Only Inspection Popover), học giả có thể quan sát chi tiết danh sách mutation trong hàng đợi và nguyên nhân lỗi (`lastError`).

Tuy nhiên, trong kiến trúc hàng đợi FIFO bảo toàn thứ tự nghiêm ngặt (Strict FIFO Ordering):
- Khi một đột biến bị lỗi nghiêm trọng hoặc vĩnh viễn (ví dụ: server reject với mã lỗi 400 Bad Request, xung đột schema cục bộ, hoặc "Poison Pill"), tiến trình `flushQueue()` sẽ dừng lại ngay tại đột biến lỗi này để bảo vệ tính nhất quán dữ liệu.
- Hệ quả: **Toàn bộ các đột biến hợp lệ xếp sau nó sẽ bị nghẽn (Head-of-Line Blocking)**, không thể đẩy lên máy chủ.

Phase P2.6b bổ sung **Cơ chế can thiệp có kiểm soát của người vận hành (Operator Controls)**:
- Cho phép người dùng chủ động **Hủy bỏ / Gỡ bỏ (Discard)** từng đột biến lỗi cụ thể (`status === 'failed'`).
- Ngăn chặn hoàn toàn việc xóa nhầm các đột biến đang chờ (`status === 'pending'`).
- Tích hợp rào chắn xác nhận (Confirmation Guardrails) tránh thao tác nhầm lẫn.

---

## 2. Invariants & Scope Boundaries

### 2.1. Invariants (Ràng buộc bất biến)
1. **Chỉ tác động lên Failed Mutations**: Thao tác discard CHỈ hiển thị và khả dụng trên các mutation có `status === 'failed'`.
2. **Bảo vệ tuyệt đối Pending Mutations**: Các mutation `status === 'pending'` KHÔNG có nút xóa/discard.
3. **Bảo toàn trật tự FIFO phần tử còn lại**: Sau khi discard phần tử $k$, toàn bộ các phần tử còn lại $[0..k-1]$ và $[k+1..n]$ duy trì nguyên vẹn thứ tự FIFO và timestamp.
4. **Xác nhận an toàn (Confirmation UX)**: Thao tác discard yêu cầu bước xác nhận (Inline Confirm hoặc Confirmation Dialog) trước khi thực thi xóa khỏi storage.
5. **Zero Schema & API Drift**: Không thay đổi Prisma Schema hay REST API endpoints.

### 2.2. Non-Goals
- **KHÔNG hỗ trợ Bulk Clear toàn bộ queue**: Để ngăn chặn rủi ro xóa hàng loạt các pending mutations hợp lệ.
- **KHÔNG sửa đổi payload của mutation**: Chỉ hỗ trợ discard (bỏ qua) hoặc retry (thử lại).

---

## 3. Interaction & UX Design (Inline Confirmation)

```
┌──────────────────────────────────────────────────────────┐
│ Chi tiết Hàng Đợi Đồng Bộ (Sync Queue Details)      [✕] │
├──────────────────────────────────────────────────────────┤
│ • [Chủ đề] Xóa (topic-2) - 10:16:02         [Failed]    │
│   └ Lỗi: "HTTP 500: Internal Server Error"               │
│   └ [Bỏ qua mục lỗi này 🗑️]                              │
│       │ (User clicks)                                    │
│       ▼                                                  │
│   └ [Xác nhận bỏ qua]  [Hủy]                             │
└──────────────────────────────────────────────────────────┘
```

---

## 4. File Changes Matrix

| File Path | Trạng thái | Nhiệm vụ |
| :--- | :---: | :--- |
| `src/hooks/useSyncQueue.ts` | **MODIFY** | Bổ sung hàm `discardFailedMutation(mutationId: string): boolean`. |
| `src/components/ui/SyncStatusBadge.tsx` | **MODIFY** | Bổ sung nút Discard kèm inline confirmation trên failed items. |
| `docs/specs/phase-p2-6b-failed-mutation-operator-controls.md` | **NEW** | Bản đặc tả kỹ thuật P2.6b này. |
| `docs/adr/ADR-031-failed-mutation-operator-controls.md` | **NEW** | Quyết định kiến trúc kiểm soát mutation lỗi. |
| `docs/gherkin/phase-p2-6b-failed-mutation-operator-controls.feature` | **NEW** | Kịch bản kiểm thử BDD cho P2.6b. |
| `tests/unit/sync-queue-operator-controls.test.tsx` | **NEW** | Unit tests cho cơ chế discard failed mutation & confirmation. |

---

## 5. Rollback Strategy
100% Client-side logic (Two-Way Door), hoàn nguyên tức thời về P2.6a nếu cần.
