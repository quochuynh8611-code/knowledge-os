# ADR-027: Kiến Trúc Cầu Nối Sự Kiện Ôn Tập (Review-Event Bridge) Cho Hàng Đợi StudyProgress

- **Mã ADR:** ADR-027
- **Trạng thái:** PROPOSED (PLANNING ONLY)
- **Ngày tạo:** 2026-08-28
- **Đề xuất bởi:** Staff Software Engineer / Technical Architect
- **Phạm vi:** `src/services/syncQueue.ts`, `src/services/dataRepository.ts`

---

## 1. Bối Cảnh (Context)
Khác với các thực thể CRUD thông thường (`Note`, `Category`, `Topic`, `Resource`) đồng bộ trạng thái thực thể đầy đủ (Full Entity-State Sync), `StudyProgress` trên backend được thiết kế là một **Review-Event Endpoint** nhận `SM2ReviewInputSchema` (`topicId`, `quality`, `triggerReason?`) để ghi nhận tiến trình ôn tập SM-2 và phát sinh `KnowledgeProgressSnapshot` bất biến (P1.5).

Trước P2.3c, `ApiDataRepository.saveStudyProgress` gặp hiện tượng lệch hợp đồng (contract drift): gửi body dạng `{ topicId, progress }` thiếu trường `quality`.

---

## 2. Quyết Định Kiến Trúc (Architecture Decisions)

1. **Mô Hình Hóa StudyProgress Như Một Cầu Nối Sự Kiện (Review-Event Bridge)**:
   - Client LocalStorage lưu trữ toàn bộ trạng thái thực thể (`StudyProgress`).
   - Đường dẫn online và hàng đợi ngoại tuyến gửi/lưu sự kiện ôn tập (`SM2ReviewInput`: `{ topicId, quality, triggerReason }`).
2. **Chuẩn Hóa Payload & Khắc Phục Contract Drift**:
   - `saveStudyProgress` chuẩn hóa payload sang `{ topicId, quality, triggerReason }`.
   - `quality` mặc định là `4` (hoặc lấy từ `progress.quality` nếu có).
   - `triggerReason` trên đường dẫn online là `"review_completed"`, trong hàng đợi replay là `"offline_replayed"`.
3. **Replay Dispatcher Trong `SyncQueueService`**:
   - `mutation.entityType === "studyProgress"` replay `POST ${origin}${apiBaseUrl}/study-progress` với payload `{ topicId, quality, triggerReason }`.

---

## 3. Đánh Giá Trade-offs (Two-Way Door)

- **Ưu điểm**:
  - Khắc phục triệt để contract drift giữa `dataRepository.ts` và `studyProgressRoutes.ts`.
  - Giữ vững tính bất biến và chuẩn mực của hệ thống Snapshot (P1.5).
  - Hoàn thiện 100% mục tiêu Offline-First cho cả 5 thực thể trong Knowledge OS.
