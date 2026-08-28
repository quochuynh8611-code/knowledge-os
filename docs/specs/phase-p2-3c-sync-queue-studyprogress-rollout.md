# Technical Specification: Phase P2.3c — Offline Sync Queue: StudyProgress Review-Event Bridge

## 1. Problem Statement & Motivation
Trong hệ sinh thái Knowledge OS:
1. Các thực thể `Note`, `Category`, `Topic`, `Resource` (từ P2.2, P2.3a, P2.3b) là các **Entity-State CRUD models**, lưu trữ và replay toàn bộ trạng thái thực thể.
2. Ngược lại, **`StudyProgress`** trên server (`POST /api/study-progress`) là một **Review-Event Bridge**: server kỳ vọng `SM2ReviewInputSchema` (`{ topicId, quality, triggerReason? }`) để tính toán cộng dồn lặp lại (`repetitions + 1`, `timeSpent + 15`) và tạo bản ghi lịch sử `KnowledgeProgressSnapshot` (P1.5).
3. **Phát hiện Drift Hiện Tại**: Trước Phase P2.3c, phương thức `ApiDataRepository.saveStudyProgress` trên client gửi payload dạng `{ topicId, progress }`, không tương thích với `SM2ReviewInputSchema` (thiếu `quality`), dẫn đến lỗi tiềm ẩn.

Phase P2.3c chuẩn hóa toàn diện cả đường dẫn trực tuyến (online path) lẫn hàng đợi ngoại tuyến (offline queue) theo đúng mô hình **Review-Event Bridge**, đạt 100% độ bao phủ ngoại tuyến cho toàn bộ hệ thống.

---

## 2. Goals & Non-Goals

### 2.1. Goals
1. **Chuẩn Hóa Payload Đường Dẫn Online**:
   - `ApiDataRepository.saveStudyProgress(topicId, progress)`:
     - Ghi nhận trạng thái đầy đủ tức thời vào `localFallback.saveStudyProgress(topicId, progress)`.
     - Chuẩn hóa payload gửi lên `POST /api/study-progress`: `{ topicId, quality: (progress as any).quality ?? 4, triggerReason: (progress as any).triggerReason || "review_completed" }`.
2. **Hàng Đợi Ngoại Tuyến Cho Study Progress Review Events**:
   - Khi mạng bị ngắt kết nối hoặc server trả về lỗi `!res.ok`, enqueue mutation với payload chuẩn hóa:
     `{ topicId, quality: (progress as any).quality ?? 4, triggerReason: "offline_replayed" }`.
3. **Mở Rộng `replayMutation` trong `src/services/syncQueue.ts`**:
   - Replay mutation `studyProgress` lên `POST ${origin}${apiBaseUrl}/study-progress` với payload `{ topicId, quality, triggerReason: "offline_replayed" }`.
4. **Quy Ước Định Danh Hành Vi Mới (Behavioral Convention)**:
   - `triggerReason="offline_replayed"` được gắn cho mọi mutation được replay từ hàng đợi ngoại tuyến để phân định rõ ràng trong bảng `KnowledgeProgressSnapshot`.

### 2.2. Non-Goals
- Không thay đổi schema Prisma.
- Không thay đổi hợp đồng REST API của server.
- Không mô hình hóa StudyProgress như một CRUD entity-state sync thông thường.

---

## 3. Review-Event Replay Mapping

| Entity Type | Action | HTTP Method | Endpoint | Payload Schema | Trigger Reason |
| :--- | :---: | :---: | :--- | :--- | :--- |
| `studyProgress` (online) | `save` | `POST` | `/api/study-progress` | `SM2ReviewInputSchema` | `"review_completed"` |
| `studyProgress` (offline replay) | `save` | `POST` | `/api/study-progress` | `SM2ReviewInputSchema` | `"offline_replayed"` |

---

## 4. File Changes Matrix

| File Path | Trạng thái | Nhiệm vụ |
| :--- | :---: | :--- |
| `src/services/syncQueue.ts` | **MODIFY** | Bổ sung nhánh replay cho `studyProgress` review-event. |
| `src/services/dataRepository.ts` | **MODIFY** | Chuẩn hóa payload online & tích hợp enqueue khi offline cho `saveStudyProgress`. |
| `docs/specs/phase-p2-3c-sync-queue-studyprogress-rollout.md` | **NEW** | Bản đặc tả kỹ thuật này. |
| `docs/adr/ADR-027-sync-queue-studyprogress-rollout.md` | **NEW** | Quyết định kiến trúc Review-Event Bridge cho StudyProgress. |
| `docs/gherkin/phase-p2-3c-sync-queue-studyprogress-rollout.feature` | **NEW** | Kịch bản kiểm thử BDD. |
| `tests/unit/sync-queue-studyprogress.test.ts` | **NEW** | Integration tests kiểm chứng enqueue và replay cho StudyProgress review events. |

---

## 5. Rollback Strategy
Toàn bộ logic nằm ở tầng client service (Two-Way Door). Có thể rollback an toàn về P2.3b bất kỳ lúc nào.
