# Technical Specification: Phase P2.3a — Offline Sync Queue: Category & Topic Extension

## 1. Problem Statement & Motivation
Phase P2.2 đã chứng minh tính ổn định của hàng đợi đột biến offline (`SyncQueueService` và `src/lib/syncQueue.ts`) cho đường dẫn `Note`.

Tuy nhiên, `Category` và `Topic` là cấu trúc phân loại tri thức cốt lõi của Knowledge OS (Taxonomy Backbone). Nếu người dùng tạo hoặc chỉnh sửa danh mục/chủ đề trong điều kiện offline hoặc mất kết nối mạng tạm thời, các thay đổi này hiện chỉ được lưu cục bộ trong LocalStorage mà chưa được xếp hàng đợi để đồng bộ lên PostgreSQL khi có mạng.

Để đảm bảo an toàn tuyệt đối và kiểm soát blast radius ở mức tối thiểu, Phase P2.3a chỉ tập trung mở rộng hàng đợi cho hai thực thể phân loại cấu trúc: **`Category`** và **`Topic`** (chưa mở rộng sang `Resource` hay `StudyProgress`).

---

## 2. Goals & Non-Goals

### 2.1. Goals
1. **Mở rộng `replayMutation` trong `src/services/syncQueue.ts` cho `Category` & `Topic`**:
   - `category`:
     - `action: "save"` $\rightarrow$ `POST /api/categories` (payload: `Category`)
     - `action: "delete"` $\rightarrow$ `DELETE /api/categories/:id`
   - `topic`:
     - `action: "save"` $\rightarrow$ `POST /api/topics` (payload: `Topic`)
     - `action: "delete"` $\rightarrow$ `DELETE /api/topics/:id`
2. **Tích hợp trong `ApiDataRepository` (`src/services/dataRepository.ts`)**:
   - `saveCategory` & `deleteCategory`: Tự động enqueue `category` mutation khi request `fetch` lỗi mạng hoặc `!res.ok`.
   - `saveTopic` & `deleteTopic`: Tự động enqueue `topic` mutation khi request `fetch` lỗi mạng hoặc `!res.ok`.
3. **Bảo Toàn Tính Thứ Tự FIFO**:
   - Replay tuần tự theo thời gian phát sinh, đảm bảo Category tạo trước Topic được replay trước lên backend.

### 2.2. Non-Goals
- **KHÔNG** đưa `Resource` vào phase này.
- **KHÔNG** đưa `StudyProgress` vào phase này.
- Không thay đổi schema cơ sở dữ liệu.
- Không thay đổi REST endpoints backend.

---

## 3. Architecture & Entity Replay Mapping (Scope: Category & Topic only)

| Entity Type | Action | HTTP Method | Endpoint | Payload |
| :--- | :---: | :---: | :--- | :--- |
| `category` | `save` | `POST` | `/api/categories` | `Category` |
| `category` | `delete` | `DELETE` | `/api/categories/:id` | — |
| `topic` | `save` | `POST` | `/api/topics` | `Topic` |
| `topic` | `delete` | `DELETE` | `/api/topics/:id` | — |
| `note` | `save`/`delete` | `POST`/`DELETE` | `/api/notes...` | *(Đã hoàn thành trong P2.2)* |

---

## 4. File Changes Matrix

| File Path | Trạng thái | Nhiệm vụ |
| :--- | :---: | :--- |
| `src/services/syncQueue.ts` | **MODIFY** | Bổ sung nhánh replay cho `category` và `topic`. |
| `src/services/dataRepository.ts` | **MODIFY** | Tích hợp enqueue khi offline cho `saveCategory`, `deleteCategory`, `saveTopic`, `deleteTopic`. |
| `docs/specs/phase-p2-3a-sync-queue-category-topic-rollout.md` | **NEW** | Bản đặc tả kỹ thuật này. |
| `docs/adr/ADR-025-sync-queue-category-topic-rollout.md` | **NEW** | Quyết định kiến trúc mở rộng hàng đợi cho Category & Topic. |
| `docs/gherkin/phase-p2-3a-sync-queue-category-topic-rollout.feature` | **NEW** | Kịch bản kiểm thử BDD. |
| `tests/unit/sync-queue-category-topic.test.ts` | **NEW** | Integration tests kiểm chứng offline enqueue và replay cho Category & Topic. |

---

## 5. Rollback Strategy
Toàn bộ logic nằm ở service client (Two-Way Door). Có thể khôi phục về trạng thái P2.2 bất kỳ lúc nào mà không ảnh hưởng đến cơ sở dữ liệu backend.
