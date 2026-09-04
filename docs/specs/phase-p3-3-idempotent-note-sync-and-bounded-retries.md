# Technical Specification: Phase P3.3 — Idempotent Note Synchronization & Bounded Retries

## 1. Problem Statement & Root Cause Context
Trong hệ thống Knowledge OS, khi client thực hiện lưu hoặc đồng bộ ghi chú (`Note`), `dataRepository.saveNote()` gửi `POST /notes` kèm theo `Note.id` do client sinh trước (dạng `note-<timestamp>`).

Trước Phase P3.3:
1. **Server `POST /notes` không có tính Idempotency**: `noteRoutes.ts` gọi trực tiếp `tx.note.create({ data: { id: req.body.id, ... } })`. Khi một request được gửi lại (replay do timeout, mạng chập chờn, hoặc lưu cập nhật), Prisma ném lỗi `P2002: Unique constraint failed on the fields: (id)`, dẫn đến lỗi HTTP 500.
2. **Retry Queue không giới hạn và thiếu phân loại lỗi**: `SyncQueueService` đối xử với mọi lỗi (kể cả lỗi vi phạm ràng buộc vĩnh viễn hoặc lỗi 4xx) như lỗi mạng tạm thời, không có trần số lần retry (`MAX_RETRY_COUNT`), dẫn đến việc một mutation bị retry hàng trăm lần (ví dụ: 226 lần).
3. **Chặn hàng đợi FIFO (Head-of-Line Blocking)**: Khi mutation đầu hàng đợi gặp lỗi vĩnh viễn (permanent failure), vòng lặp `flushQueue` dừng lại (`break`), khiến toàn bộ các mutation hợp lệ phía sau bị phong tỏa.

Phase P3.3 giải quyết triệt để 3 vấn đề trên nhằm bảo toàn dữ liệu, ngăn chặn retry vô hạn và duy trì luồng đồng bộ trơn tru.

---

## 2. Invariants & Architectural Contracts

### 2.1. Invariants
1. **Zero Prisma Schema / DB Migration Drift**: Không thay đổi schema Prisma, không thêm migration hay reset database. Cột `Note.id` giữ nguyên kiểu `String @id @default(uuid())`.
2. **Idempotent Note Creation/Replay Policy**:
   - Khi `POST /notes` nhận một `id` đã tồn tại trong database:
     - Nếu payload tương đương hoặc là bản cập nhật hợp lệ từ client, server xử lý an toàn (upsert/update trong transaction kèm `NoteTopicLink`), trả về `HTTP 200 OK` hoặc `201 Created` với dữ liệu note đã xử lý.
     - Lỗi Prisma `P2002` do trùng ID không bao giờ làm sập transaction thành `HTTP 500`.
3. **Bounded Retries & Error Classification**:
   - `MAX_RETRY_COUNT = 5` (hằng số cấu hình tập trung).
   - **Transient Errors** (Network failure, timeout, 408, 429, 5xx): Được lập lịch retry với Exponential Backoff có chặn trên. Khi `retryCount >= MAX_RETRY_COUNT`, chuyển sang trạng thái `exhausted` (hoặc `failed` nhưng không auto-retry).
   - **Permanent Errors** (Validation errors, 400, 401, 403, 404, 409, 422, P2002 không thể giải quyết): Được đánh dấu `isPermanent = true` / chuyển sang `exhausted`, không tự động retry để tránh lãng phí tài nguyên.
4. **Không Block Hàng Đợi (Non-blocking FIFO on Permanent Failure)**:
   - Khi gặp một permanent/exhausted mutation, `flushQueue` ghi nhận lỗi, bỏ qua mutation này và tiếp tục xử lý các mutation hợp lệ tiếp theo trong queue.
   - Khi gặp transient network error (mất kết nối mạng), queue vẫn dừng lại (`break`) để bảo toàn thứ tự FIFO của các thao tác dữ liệu.
5. **Bảo tồn dữ liệu người dùng (No Auto-Deletion)**:
   - Các job thất bại / exhausted được giữ nguyên trong queue kèm mã lỗi và thời điểm để người dùng xem và quyết định Bỏ qua (Discard) hoặc Thử lại có kiểm soát (Manual Retry).
   - Các job có `retryCount >= 5` hiện hữu (như job 226 lần) tự động được chuẩn hóa sang trạng thái `exhausted` khi khởi tạo / nạp dữ liệu, ngăn chặn vòng lặp retry vô hạn ngay lập tức.

---

## 3. Data Interface & Component Changes

### 3.1. Sync Queue Models & Functions (`src/lib/syncQueue.ts`)
```typescript
export const DEFAULT_MAX_RETRY_COUNT = 5;

export interface SyncMutation {
  id: string;
  entityType: "category" | "topic" | "note" | "resource" | "studyProgress";
  action: "save" | "delete";
  entityId: string;
  payload?: any;
  clientTimestamp: string;
  retryCount: number;
  status: "pending" | "processing" | "failed" | "exhausted";
  lastError?: string;
  lastAttemptAt?: string;
  nextRetryAt?: string;
  backoffDelayMs?: number;
  isPermanent?: boolean;
  httpStatus?: number;
}

export function isPermanentHttpStatus(status: number): boolean;
export function isMutationEligibleForReplay(
  mutation: SyncMutation,
  currentTimeMs?: number,
  bypassBackoff?: boolean,
  maxRetries?: number
): boolean;
export function normalizeExhaustedMutations(
  queue: SyncMutation[],
  maxRetries?: number
): SyncMutation[];
```

### 3.2. Server Router (`src/server/routes/noteRoutes.ts`)
- Khi nhận `POST /notes` với `req.body.id`:
  - Kiểm tra nếu `id` đã tồn tại trong DB, thực hiện cập nhật nội dung và đồng bộ `NoteTopicLink`.
  - Nếu chưa tồn tại, thực hiện tạo mới.
  - Bọc trong `try-catch` kiểm tra mã lỗi Prisma `P2002`, phân loại đúng HTTP status code thay vì 500 không xác định.
