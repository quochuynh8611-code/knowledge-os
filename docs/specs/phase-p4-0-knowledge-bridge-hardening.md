# Technical Specification: Phase P4.0 — Antigravity & NotebookLM Knowledge Bridge Hardening

## 1. Problem Statement & Motivation
Sau chuỗi 9 micro-phases liên tiếp (P2.7a $\rightarrow$ P3.2), hệ thống **Offline Sync & Observability Subsystem** đã phát triển từ một hàng đợi ngoại tuyến cơ bản thành một pipeline phức hợp bao gồm:
- Exponential Backoff & Cooldown Gating
- Background Auto-Reconnection Triggers
- Local-First Telemetry Buffer & Aggregation Read Model
- Multi-Tab Storage Event Synchronization
- 3-Tier Storage Quota Guard & Recovery

**Vấn đề rủi ro hiện tại (Knowledge Drift & Asymmetry)**:
1. **Tri thức phân mảnh giữa các Agent**: Khi bắt đầu một phiên làm việc mới (hoặc đổi chat context), các AI Agent khác có nguy cơ không nắm trọn vẹn các quy tắc bất biến (*Invariants*) và cơ chế phòng vệ ngầm (*Recovery Tiers*), dẫn đến nguy cơ "vibe coding" hoặc phá vỡ các hợp đồng đã được kiểm chứng.
2. **Thiếu Operator Runbook chuẩn**: Khi gặp sự cố thực tế (ví dụ: người dùng báo lỗi poison-pill kẹt nhiều ngày, hoặc quota localStorage bị đầy), lập trình viên / operator chưa có bảng hướng dẫn chẩn đoán và khắc phục nhanh (Runbook / Troubleshooting Matrix).
3. **Cầu nối tri thức với Antigravity & NotebookLM**: Cần chuẩn hóa bản đồ phân tầng (Subsystem Map), từ điển thuật ngữ (Glossary) và quy chuẩn bàn giao (Handoff Protocol) để các hệ thống AI (Antigravity Agent, NotebookLM RAG Studio) có thể đọc và đồng bộ chính xác.

---

## 2. Subsystem Architecture Map & Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          KNOWLEDGE OS CLIENT RUNTIME                         │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         Presentation Layer                          │   │
│   │  • SyncStatusBadge (Indicator, Health Banner, Telemetry Debug Tab)   │   │
│   │  • AntigravityHandoffModal (Job Tracker, CLI Command Builder)       │   │
│   │  • NotebookLMStudioModal (Source Pack, Task Prompt Generator)       │   │
│   └──────────────────────────────────▲──────────────────────────────────┘   │
│                                      │ (Subscribed via Hook)                │
│   ┌──────────────────────────────────┴──────────────────────────────────┐   │
│   │                          React Hooks Layer                          │   │
│   │  • useSyncQueue (Reactive state, syncHealth, operator actions)      │   │
│   └──────────────────────────────────▲──────────────────────────────────┘   │
│                                      │ (Observer Pattern)                   │
│   ┌──────────────────────────────────┴──────────────────────────────────┐   │
│   │                   Core Service & Orchestration                      │   │
│   │  • SyncQueueService (FIFO Flush, Reconnection Listeners, Lock Guard)│   │
│   └─────────────────────▲──────────────────────────▲────────────────────┘   │
│                         │                          │                        │
│   ┌─────────────────────┴──────────┐   ┌───────────┴────────────────────┐   │
│   │     Pure Storage Helpers       │   │    Pure Telemetry & Health     │   │
│   │  • enqueueMutation / dequeue   │   │  • calculateSyncTelemetryStats │   │
│   │  • markMutationFailed (Backoff)│   │  • evaluateSyncHealth (Rules)  │   │
│   │  • pruneExhaustedFailed        │   │  • sanitizeMutationError       │   │
│   └─────────────────────▲──────────┘   └───────────▲────────────────────┘   │
│                         │                          │                        │
│   ┌─────────────────────┴──────────────────────────┴────────────────────┐   │
│   │                   Durable Browser Storage (SSOT)                    │   │
│   │  • localStorage (Queue Key: phat_hoc_huyen_hoc_sync_queue)          │   │
│   │  • localStorage (Telemetry Key: ..._telemetry)                      │   │
│   │  • window.StorageEvent (Multi-tab real-time sync)                   │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Core System Invariants (Các Ràng Buộc Bất Biến)

1. **Bảo tồn Tuyệt đối Mutation Pending (Durable Pending Guarantee)**:
   - Các mutation `status === 'pending'` tuyệt đối **không bao giờ bị hệ thống tự động loại bỏ (evict/prune)**.
2. **Quyền ưu tiên Dữ liệu Nghiệp vụ (Data over Observability)**:
   - Khi bộ nhớ đầy, nhật ký quan sát (Telemetry Buffer) luôn bị cắt gọt trước để bảo vệ hàng đợi nghiệp vụ.
3. **Thứ bậc Loại bỏ Poison-Pill**:
   - Chỉ được loại bỏ các mutation có `status === 'failed'` và `retryCount >= 10` trong quy trình phục hồi khẩn cấp Tầng 2.
4. **Deterministic & Pure Read Models**:
   - Toàn bộ hàm tính toán trạng thái (`evaluateSyncHealth`, `calculateSyncTelemetryStats`, `isMutationEligibleForReplay`) là pure functions, độc lập với `Date.now()` bên trong hàm và không có side effects.
5. **Multi-Tab Idempotency & In-Flight Check**:
   - Vòng lặp `flushQueue` luôn kiểm tra sự tồn tại tức thời trong `localStorage` trước khi gửi request để ngăn chặn replay trùng lặp.

---

## 4. Failure Modes & Recovery Matrix (Bảng Chẩn Đoán & Khắc Phục)

| Triệu chứng / Mã lỗi | Nguyên nhân gốc rễ | Cơ chế tự phục hồi của Hệ thống | Hành động của Operator nếu cần can thiệp |
| :--- | :--- | :--- | :--- |
| **Huy hiệu hiển thị 'critical' (Poison-pill)** | Mutation bị lỗi cú pháp/backend từ chối $\ge 5$ lần. | Exponential backoff giãn cách tối đa 30s. | Mở Popover $\rightarrow$ Nhấn nút **Bỏ qua** mutation bị lỗi. |
| **Lỗi QuotaExceededError khi lưu dữ liệu** | `localStorage` vượt quá hạn mức 5MB. | Hệ thống tự động kích hoạt Tầng 1 (thu gọn telemetry) $\rightarrow$ Tầng 2 (xóa lỗi $\ge 10$ lần). | Không cần can thiệp; nếu vẫn lỗi, xuất file JSON và dọn cache. |
| **Hàng đợi không tự chạy sau khi có mạng lại** | Trình duyệt không gửi `online` event hoặc debounce 300ms chưa kích hoạt. | Timer auto-flush kiểm tra lại khi hết cooldown. | Nhấn nút **Đồng bộ ngay** trên Popover để bypass backoff. |
| **Hai tab hiển thị số lượng chờ khác nhau** | Trình duyệt cũ chặn `StorageEvent` giữa các iframes. | Khi tab được active hoặc có thao tác mới, state tự reload. | Chuyển đổi qua lại giữa các tab hoặc refresh trang. |

---

## 5. Scope Boundaries

### 5.1. Scope IN (Trong phạm vi)
- Tạo tài liệu đặc tả tổng hợp và bản đồ kiến trúc toàn hệ thống.
- Tạo quyết định kiến trúc `ADR-041` chuẩn hóa ranh giới tài liệu.
- Tạo kịch bản Gherkin cho quy trình Handoff / Audit / Runbook comprehension.
- Tạo tài liệu vận hành `docs/runbooks/offline-sync-subsystem-runbook.md`.

### 5.2. Scope OUT (Ngoài phạm vi)
- **Tạm dừng chỉnh sửa mã nguồn (Code Freeze)**: Không sửa đổi `src/lib/*`, `src/services/*`, `src/components/*` hay `src/server/*`.

---

## 6. Reversibility Classification (Phân Loại Tính Thuận Nghịch)

- **Reversible Decisions (Two-Way Doors)**:
  - Cấu trúc thư mục tài liệu `docs/runbooks/` và `docs/specs/`.
  - Từ điển thuật ngữ và bảng chẩn đoán lỗi.
- **Irreversible Decisions (One-Way Doors)**:
  - *Không có* trong Phase P4.0 (vì hoàn toàn là phase tài liệu hóa và hardening tri thức).
