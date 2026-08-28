# Technical Specification: Phase P2.3b — Offline Sync Queue: Resource Extension

## 1. Problem Statement & Motivation
Sau khi hoàn thành P2.2 (Note) và P2.3a (Category & Topic), hàng đợi đột biến offline (`SyncQueueService`) đã bảo vệ thành công toàn bộ hệ thống phân loại tri thức và ghi chú.

Thực thể **`Resource`** (tài liệu nghiên cứu, sách, bài viết, video, tệp cục bộ) hiện vẫn đang xử lý qua cơ chế cũ trong `ApiDataRepository` (bỏ qua âm thầm khi `fetch` gặp lỗi mạng hoặc offline).

Để tuân thủ triệt để nguyên tắc lát cắt nhỏ (micro-slicing) và giữ blast radius cực thấp, Phase P2.3b **chỉ tập trung vào `Resource`** (hoàn toàn tách biệt khỏi `StudyProgress`).

---

## 2. Goals & Non-Goals

### 2.1. Goals
1. **Mở rộng `replayMutation` trong `src/services/syncQueue.ts` cho `Resource`**:
   - `resource`:
     - `action: "save"` $\rightarrow$ `POST ${origin}${apiBaseUrl}/resources` (payload: `Resource`)
     - `action: "delete"` $\rightarrow$ `DELETE ${origin}${apiBaseUrl}/resources/:id`
2. **Tích hợp trong `ApiDataRepository` (`src/services/dataRepository.ts`)**:
   - `saveResource` & `deleteResource`: Tự động enqueue `resource` mutation khi request `fetch` lỗi mạng hoặc `!res.ok`.
3. **Bảo Toàn Tương Thích Ngược & Optimistic UI**:
   - Ghi vào LocalStorage diễn ra tức thời trước khi gửi mạng / enqueue.
   - Zero Prisma Schema Drift, Zero REST Contract Drift.

### 2.2. Non-Goals
- **KHÔNG** đưa `StudyProgress` vào phase này (được bảo lưu riêng cho Phase P2.3c).
- Không thay đổi schema cơ sở dữ liệu.
- Không thay đổi các hợp đồng API REST backend.

---

## 3. Architecture & Entity Replay Mapping (Resource Scope)

| Entity Type | Action | HTTP Method | Endpoint | Payload | Phase |
| :--- | :---: | :---: | :--- | :--- | :---: |
| `note` | `save`/`delete` | `POST`/`DELETE` | `/api/notes...` | `Note` | **P2.2 (Done)** |
| `category` | `save`/`delete` | `POST`/`DELETE` | `/api/categories...` | `Category` | **P2.3a (Done)** |
| `topic` | `save`/`delete` | `POST`/`DELETE` | `/api/topics...` | `Topic` | **P2.3a (Done)** |
| `resource` | `save` | `POST` | `/api/resources` | `Resource` | **P2.3b (Now)** |
| `resource` | `delete` | `DELETE` | `/api/resources/:id` | — | **P2.3b (Now)** |
| `studyProgress` | `save` | `POST` | `/api/study-progress` | `SM2ReviewInput` | *P2.3c (Reserved)* |

---

## 4. Ghi Chú & Câu Hỏi Mở Cho Phase P2.3c (StudyProgress Open Questions)
`StudyProgress` có đặc thù nghiệp vụ phức tạp hơn các CRUD entity thông thường:
1. **Payload Schema Alignment**: Server `POST /api/study-progress` nhận schema `SM2ReviewInputSchema` (`topicId`, `rating`, `repetitions`, `interval`, `easeFactor`, `timeSpent`, `triggerReason`), trong khi `ApiDataRepository.saveStudyProgress` nhận đối tượng `(topicId, progress: StudyProgress)`. Cần xác định chính xác cách mapper payload khi enqueue mutation offline.
2. **Snapshot Immutability Alignment**: Từ Phase P1.5, mỗi lần gọi `POST /api/study-progress` sẽ ghi một bản ghi snapshot append-only vào `KnowledgeProgressSnapshot`. Cần bảo đảm khi replay offline progress, snapshot được gắn đúng `triggerReason: 'offline_replayed'` hoặc giữ nguyên lý do kích hoạt ban đầu.

---

## 5. File Changes Matrix

| File Path | Trạng thái | Nhiệm vụ |
| :--- | :---: | :--- |
| `src/services/syncQueue.ts` | **MODIFY** | Bổ sung nhánh replay cho `resource`. |
| `src/services/dataRepository.ts` | **MODIFY** | Tích hợp enqueue khi offline cho `saveResource`, `deleteResource`. |
| `docs/specs/phase-p2-3b-sync-queue-resource-rollout.md` | **NEW** | Bản đặc tả kỹ thuật này. |
| `docs/adr/ADR-026-sync-queue-resource-rollout.md` | **NEW** | Quyết định kiến trúc hoàn tất hàng đợi cho Resource. |
| `docs/gherkin/phase-p2-3b-sync-queue-resource-rollout.feature` | **NEW** | Kịch bản kiểm thử BDD. |
| `tests/unit/sync-queue-resource.test.ts` | **NEW** | Integration tests kiểm chứng offline enqueue và replay cho Resource. |

---

## 6. Rollback Strategy
Toàn bộ logic nằm ở service client (Two-Way Door). Có thể khôi phục về trạng thái P2.3a bất kỳ lúc nào mà không ảnh hưởng đến cơ sở dữ liệu backend.
