# ADR 078: Align NotebookLM Artifact Types with Backend Ingest Contract

- **Status**: Accepted
- **Date**: 2026-10-29
- **Scope**: Backend Ingest Validation (`IngestArtifactSchema`, `ArtifactTypeEnum`), `ArtifactType` DTO, and NotebookLM Studio
- **Related Issues**: Fix P2 — Ingest Schema Rejection (`mindmap_outline` and studio artifact types)

---

## 1. Bối Cảnh (Context)
Trong quá trình runtime smoke test (Phase 10), khi người dùng tạo hoặc đồng bộ artifact loại `mindmap_outline` từ NotebookLM Studio, backend endpoint `POST /api/artifacts/ingest` trả về mã lỗi:
`HTTP 400 Bad Request: "Invalid option: expected one of study_guide|briefing_doc|qa_pair|raw_markdown"`.

Hệ thống offline fallback ở client đã hoạt động đúng thiết kế:
- Ghi nhận `syncStatus: "pending"`.
- Lưu trữ an toàn trong `localStorage`.
- Hiển thị cảnh báo chưa đồng bộ và cung cấp nút Retry.

Tuy nhiên, nguyên nhân gốc rễ là sự lệch pha hợp đồng giao tiếp (Contract Mismatch) giữa:
- **Frontend NotebookLM Studio**: Hỗ trợ 8 loại artifact chuyên sâu phục vụ nghiên cứu đa phương thức (`source_pack`, `study_guide`, `briefing_doc`, `audio_overview_summary`, `faq`, `dialectic_matrix`, `socratic_inquiry`, `mindmap_outline`).
- **Backend Schema (`ArtifactTypeEnum` trong `src/lib/researchHubValidation.ts`)**: Chỉ giới hạn 4 loại sơ khai (`study_guide`, `briefing_doc`, `qa_pair`, `raw_markdown`).
- **Database (`GroundedArtifact.artifactType` trong Prisma / PostgreSQL)**: Là cột `String` thuần túy (`@default("study_guide")`), không có enum constraint ở tầng DB, hoàn toàn lưu được bất kỳ loại artifact nào.

---

## 2. Quyết Định Kiến Trúc (Decision)
Thay vì dùng giải pháp tạm bợ (workaround) là âm thầm ép kiểu (map) `mindmap_outline` hoặc các loại khác về `raw_markdown` (làm mất ngữ nghĩa nghiên cứu và gây cản trở các bộ xử lý chuyên biệt về sau như trình dựng Mindmap tự động), chúng tôi quyết định:

1. **Mở rộng `ArtifactTypeEnum`** trong `src/lib/researchHubValidation.ts` để tiếp nhận toàn bộ các loại artifact hợp lệ từ NotebookLM Studio.
2. **Cập nhật kiểu TypeScript `ArtifactType`** trong `src/types/researchHub.ts` để đồng bộ giữa client và server.
3. **Cập nhật hàm chuyển đổi `mapLocalArtifactTypeToDTO`** trong `src/components/integrations/notebooklm/utils.ts` để bảo toàn nguyên vẹn kiểu dữ liệu bản địa thay vì ép kiểu mất dữ liệu.
4. **Bảo toàn 100% các loại artifact cũ** (`qa_pair`, `raw_markdown`, `study_guide`, `briefing_doc`) để đảm bảo tính tương thích ngược hoàn hảo.

---

## 3. Danh Sách Artifact Type Chuẩn Hóa (Final Unified Types)
Tập hợp hợp nhất gồm 10 loại artifact hợp lệ:

| Artifact Type | Nguồn gốc | Ý nghĩa / Mục đích sử dụng |
|---|---|---|
| `study_guide` | Chung (Core) | Giáo trình / Tài liệu nghiên cứu có cấu trúc phân mục |
| `briefing_doc` | Chung (Core) | Tóm tắt điều hành cấp cao, cô đọng nội dung chính |
| `qa_pair` | Backend Legacy | Bộ câu hỏi và câu trả lời phục vụ ôn tập |
| `raw_markdown` | Backend Legacy | Tài liệu văn bản Markdown thô |
| `audio_overview_summary` | NotebookLM Studio | Kịch bản / Bản tóm tắt Audio Overview (Podcast 2 Hosts) |
| `faq` | NotebookLM Studio | Các câu hỏi thường gặp trích xuất từ tài liệu nguồn |
| `dialectic_matrix` | NotebookLM Studio | Ma trận đối chiếu trường phái / luận cứ phản biện |
| `socratic_inquiry` | NotebookLM Studio | Hệ thống câu hỏi truy vấn bản chất theo phương pháp Socratic |
| `mindmap_outline` | NotebookLM Studio | Dàn ý phân cấp để nhập trực tiếp vào trình duyệt Sơ đồ tư duy |
| `source_pack` | NotebookLM Studio | Gói tài liệu nguồn tổng hợp đã qua chuẩn hóa và gán nhãn |

---

## 4. Lý Do Không Map Mất Ngữ Nghĩa (Why Not Downcast)
- Nếu map `mindmap_outline` thành `raw_markdown`: Hệ thống sẽ mất khả năng nhận diện để cung cấp tính năng "Import sang Sơ đồ tư duy 1-click".
- Nếu map `audio_overview_summary` thành `study_guide`: Làm sai lệch cấu trúc podcast hội thoại, ảnh hưởng đến việc phát sinh audio hoặc kịch bản giọng đọc.
- Giữ đúng type giúp hệ thống Knowledge OS phân loại, tìm kiếm, lọc và xuất bản chính xác theo từng định dạng nghiên cứu.

---

## 5. Đánh Giá Rủi Ro & Tương Thích Ngược (Risk Assessment & Backward Compatibility)
- **Tương thích ngược**:
  - Toàn bộ dữ liệu artifact đã lưu trước đây (`study_guide`, `briefing_doc`, `qa_pair`, `raw_markdown`) vẫn hoàn toàn hợp lệ, không bị ảnh hưởng.
  - Các API client cũ gọi `qa_pair` hay `raw_markdown` tiếp tục được chấp nhận mà không có bất kỳ breaking change nào.
- **Rủi ro môi trường**:
  - Không yêu cầu database migration vì cột `artifactType` trong Prisma schema đã là `String`.
- **Kế hoạch Rollback**:
  - Revert commit thay đổi enum validation và type definition. Không cần rollback database.
- **Điều kiện dừng (Stop Boundary)**:
  - Nếu bất kỳ artifact type mới nào đòi hỏi thêm quan hệ hoặc cột mới trong database, phải dừng lại và trình bày kế hoạch migration riêng. Hiện tại tất cả đều sử dụng chung schema `rawContent`, `citations` và `metadata: Json`.

