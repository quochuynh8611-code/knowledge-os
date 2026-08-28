# Technical Specification: Phase P2.2 — Offline-First Mutation Synchronization Queue

## 1. Problem Statement & Motivation
Hiện tại, `ApiDataRepository` trong `src/services/dataRepository.ts` thực hiện ghi vào `LocalStorageDataRepository` trước, sau đó gửi HTTP request đến REST API backend (`/api/topics`, `/api/notes`, `/api/resources`...).
Nếu mạng bị mất kết nối hoặc backend không khả dụng, khối `catch` trong `ApiDataRepository` bỏ qua lỗi âm thầm (`// Handled via local fallback`).

### Hệ quả:
1. **Silent Offline Mutation Drift**: Các thao tác tạo mới, sửa đổi, xóa bỏ entity (`Topic`, `Note`, `Resource`, `Category`) được thực hiện khi offline sẽ **không bao giờ** được đồng bộ lên cơ sở dữ liệu PostgreSQL khi có mạng trở lại.
2. **Thiếu hàng đợi đột biến (Mutation Journal)**: Không có cơ chế lưu vết các tác vụ chờ đồng bộ (pending mutations), dẫn đến nguy cơ lệch dữ liệu giữa LocalStorage và PostgreSQL.
3. **Thiếu cơ chế tự động phục hồi khi Online**: Ứng dụng không tự động kích hoạt tiến trình đồng bộ khi trình duyệt nhận sự kiện `online`.

---

## 2. Goals & Non-Goals

### 2.1. Goals
1. **Mô hình Hàng Đợi Đột Biến Thuần Túy (`src/lib/syncQueue.ts`)**:
   - Định nghĩa kiểu `SyncMutation`:
     ```typescript
     export interface SyncMutation {
       id: string;
       entityType: "category" | "topic" | "note" | "resource" | "studyProgress";
       action: "save" | "delete";
       entityId: string;
       payload?: any;
       clientTimestamp: string;
       retryCount: number;
       status: "pending" | "processing" | "failed";
       lastError?: string;
     }
     ```
   - Pure queue functions: `enqueueMutation`, `dequeueMutation`, `markMutationFailed`, `pruneCompletedMutations`, `serializeSyncQueue`, `deserializeSyncQueue`.
2. **Bộ Quản Lý Hàng Đợi Đồng Bộ (`src/services/syncQueue.ts`)**:
   - Lưu trữ hàng đợi bền vững trong `localStorage` với khóa `phat_hoc_huyen_hoc_sync_queue`.
   - Hàm `flushSyncQueue(apiClient)`: Duyệt và thực thi tuần tự các mutation còn tồn đọng với cơ chế retry an toàn.
   - Tự động kích hoạt khi có sự kiện `window.addEventListener('online')` hoặc khi một request API thành công.
3. **Tích hợp An Toàn Vào `ApiDataRepository`**:
   - Khi request `fetch()` thất bại do lỗi mạng hoặc offline, tự động đẩy mutation vào `SyncQueue`.
   - Giữ nguyên fallback tức thời vào `LocalStorageDataRepository` để UI phản hồi mượt mà không bị giật lag (Optimistic UI update).
4. **Bảo Toàn Tương Thích Ngược & Invariants**:
   - Khóa lưu trữ SSOT không đổi.
   - 100% test suites hiện tại giữ nguyên trạng thái GREEN.

### 2.2. Non-Goals
- Không xây dựng CRDT phức tạp (áp dụng cơ chế Last-Write-Wins trên từng entityId trong hàng đợi).
- Không thay đổi schema Prisma.

---

## 3. Architecture & Data Flow

```
     User Mutation (e.g. addNote / saveTopic / deleteResource)
                           │
                           ▼
              ┌──────────────────────────┐
              │   ApiDataRepository      │
              │   1. Write LocalStorage  │ (Optimistic local persistence)
              │   2. Try fetch(REST API) │
              └────────────┬─────────────┘
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
      [Network Success]           [Network Error / Offline]
             │                           │
             ▼                           ▼
   Mutation Completed             ┌─────────────────────────────┐
                                  │   SyncQueueManager          │
                                  │   - enqueueMutation()       │
                                  │   - Save to localStorage    │
                                  └──────────────┬──────────────┘
                                                 │
                                     [Event: window 'online'
                                      or manual trigger]
                                                 │
                                                 ▼
                                  ┌─────────────────────────────┐
                                  │   flushSyncQueue()          │
                                  │   - Replay REST API calls   │
                                  │   - Prune synced mutations  │
                                  └─────────────────────────────┘
```

---

## 4. File Changes Matrix

| File Path | Trạng thái | Nhiệm vụ |
| :--- | :---: | :--- |
| `src/lib/syncQueue.ts` | **NEW** | Module thuần túy quản lý cấu trúc dữ liệu và thao tác hàng đợi mutation. |
| `src/services/syncQueue.ts` | **NEW** | Service quản lý persistence của hàng đợi trên localStorage và hàm flush queue. |
| `src/services/dataRepository.ts` | **MODIFY** | Tích hợp hàng đợi mutation vào `ApiDataRepository` khi request gặp lỗi mạng. |
| `docs/specs/phase-p2-2-offline-sync-queue.md` | **NEW** | Bản đặc tả kỹ thuật này. |
| `docs/adr/ADR-024-offline-sync-queue.md` | **NEW** | Quyết định kiến trúc Offline Mutation Queue. |
| `docs/gherkin/phase-p2-2-offline-sync-queue.feature` | **NEW** | Kịch bản kiểm thử BDD. |
| `tests/unit/sync-queue-lib.test.ts` | **NEW** | Unit tests cho module pure functions `src/lib/syncQueue.ts`. |
| `tests/unit/sync-queue-service.test.ts` | **NEW** | Integration tests cho `SyncQueueManager` và `ApiDataRepository` offline replay. |

---

## 5. Rollback Strategy
Toàn bộ logic nằm ở service và pure helper của client (Two-Way Door). Có thể vô hiệu hóa tính năng queue trong `ApiDataRepository` bất kỳ lúc nào.
