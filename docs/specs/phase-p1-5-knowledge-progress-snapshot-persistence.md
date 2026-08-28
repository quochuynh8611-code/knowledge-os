# Technical Specification: Phase P1.5 — Append-Only Knowledge Progress Snapshot Persistence & Audit Trail

## 1. Problem Statement & Motivation
Theo ADR-015 (Quyết định D4), hệ thống được thiết kế để theo dõi lịch sử tiến độ học tập và ôn tập ngắt quãng (SM-2) theo mô hình **Append-Only Progress Snapshot** mà không làm biến đổi cấu trúc bảng `StudyProgress` hiện có.
Model `KnowledgeProgressSnapshot` (`id`, `topicId`, `capturedAt`, `progressData: Json`, `triggerReason?: string`) đã được khai báo trong `prisma/schema.prisma` và helper thuần túy `captureProgressSnapshot` đã có sẵn trong `src/lib/researchStorageHelpers.ts`.

Tuy nhiên, tại tầng Backend Server (`src/server/routes/studyProgressRoutes.ts` và `src/server/routes/syncRoutes.ts`):
1. **Thiếu lưu vết Snapshot khi ghi nhận tiến độ**:
   - `POST /api/study-progress` chỉ thực hiện `upsert` vào `StudyProgress` mà chưa tạo bản ghi bất biến trong `KnowledgeProgressSnapshot`.
2. **Thiếu Transaction Protection**:
   - Thao tác cập nhật `StudyProgress` chưa được bọc trong `prisma.$transaction`.
3. **Thiếu Endpoint truy vấn lịch sử Snapshot**:
   - Chưa có endpoint `GET /api/study-progress/:topicId/snapshots` để client hoặc analytics view truy vấn chuỗi lịch sử tiến độ của một chủ đề.

---

## 2. Goals & Non-Goals

### 2.1. Goals
1. **Giao dịch nguyên tử & Lưu vết Append-Only (Transactional Snapshot Capture)**:
   - Khi nhận yêu cầu cập nhật tiến độ học tập / ôn tập SM-2 qua `POST /api/study-progress`, thực thi trong `prisma.$transaction`:
     - Upsert bản ghi `StudyProgress`.
     - Tạo bản ghi mới trong `KnowledgeProgressSnapshot` với dữ liệu snapshot bất biến (`progressData`), thời gian `capturedAt` và `triggerReason: 'review_completed' | 'manual'`.
2. **Endpoint Truy Vấn Lịch Sử Tiến Độ (`GET /api/study-progress/:topicId/snapshots`)**:
   - Cung cấp API trả về danh sách các snapshot tiến độ của một `topicId`, sắp xếp giảm dần theo thời gian (`capturedAt: 'desc'`).
3. **Bảo Toàn Tương Thích Ngược 100%**:
   - Định dạng phản hồi của `POST /api/study-progress` vẫn trả về bản ghi `StudyProgress` đầy đủ như trước đây.

### 2.2. Non-Goals
- Không thay đổi cấu trúc bảng `StudyProgress` hay `KnowledgeProgressSnapshot` trong `prisma/schema.prisma`.
- Không lưu dữ liệu nhị phân (Zero Binary Ingestion: `progressData` chỉ chứa JSON metadata số).
- Không sửa đổi thuật toán tính toán SM-2 ở client.

---

## 3. Architecture & Data Flow

```
                      Client Request: POST /api/study-progress
                      Payload: { topicId: "top-1", quality: 4, triggerReason?: "session_complete" }
                                          │
                                          ▼
                      ┌────────────────────────────────────────┐
                      │    Study Progress Controller           │
                      │    (studyProgressRoutes.ts)            │
                      └───────────────────┬────────────────────┘
                                          │
                                          ▼
                      ┌────────────────────────────────────────┐
                      │      Prisma Interactive Transaction    │
                      │      tx.$transaction(async (tx) => {   │
                      ├────────────────────────────────────────┤
                      │ [Step 1] tx.studyProgress.upsert(...)  │
                      │          -> Cập nhật tiến độ hiện tại  │
                      │                                        │
                      │ [Step 2] tx.knowledgeProgressSnapshot  │
                      │          .create(...)                  │
                      │          -> Lưu snapshot bất biến mới  │
                      └───────────────────┬────────────────────┘
                                          │
                                          ▼
                      HTTP 200 Response (Updated StudyProgress object)
```

---

## 4. File Changes Matrix

| File Path | Trạng thái | Nhiệm vụ |
| :--- | :---: | :--- |
| `src/server/routes/studyProgressRoutes.ts` | **MODIFY** | Bọc trong `$transaction`, tự động tạo snapshot trong `KnowledgeProgressSnapshot`, và bổ sung `GET /study-progress/:topicId/snapshots`. |
| `docs/specs/phase-p1-5-knowledge-progress-snapshot-persistence.md` | **NEW** | Bản đặc tả kỹ thuật này. |
| `docs/adr/ADR-022-knowledge-progress-snapshot-persistence.md` | **NEW** | Quyết định kiến trúc lưu vết tiến độ bất biến. |
| `docs/gherkin/phase-p1-5-knowledge-progress-snapshot-persistence.feature` | **NEW** | Kịch bản kiểm thử BDD. |
| `tests/unit/study-progress-snapshot-sync.test.ts` | **NEW** | Unit test suite kiểm chứng tính đồng bộ nguyên tử của snapshot và truy vấn lịch sử. |

---

## 5. Rollback Strategy
Toàn bộ logic nằm ở router backend (Two-Way Door). Có thể khôi phục lại mã nguồn trước đó mà không ảnh hưởng cấu trúc cơ sở dữ liệu.
