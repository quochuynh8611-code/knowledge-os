# ADR-022: Lưu Vết Tiến Độ Học Tập Bất Biến (Append-Only Knowledge Progress Snapshot Persistence)

- **Mã ADR:** ADR-022
- **Trạng thái:** PROPOSED (PLANNING ONLY)
- **Ngày tạo:** 2026-08-28
- **Đề xuất bởi:** Staff Software Engineer / Technical Architect
- **Phạm vi:** `src/server/routes/studyProgressRoutes.ts`, `src/lib/researchStorageHelpers.ts`, `prisma/schema.prisma`

---

## 1. Bối Cảnh (Context)
Theo ADR-015 (Quyết định D4), hệ thống áp dụng mô hình lưu vết tiến độ theo thời gian (Time-series Audit Trail) cho quá trình học tập và ôn tập SM-2. Bảng `KnowledgeProgressSnapshot` được thiết kế dưới dạng **Append-Only** (chỉ chèn thêm, không sửa đổi hay xóa) để bảo đảm tính toàn vẹn và khả năng phân tích chuỗi thời gian (time-series retention analytics).
Trước Phase P1.5, router `studyProgressRoutes.ts` chỉ ghi đè vào bảng `StudyProgress` mà chưa ghi nhận bản ghi nào vào `KnowledgeProgressSnapshot`.

---

## 2. Quyết Định Kiến Trúc (Architecture Decisions)

1. **Đồng Bộ Giao Dịch ACID (Prisma Interactive Transaction)**:
   - Khi gọi `POST /api/study-progress`:
     - Thực thi trong `prisma.$transaction`.
     - Cập nhật bản ghi `StudyProgress` hiện tại.
     - Tạo bản ghi mới trong `KnowledgeProgressSnapshot` chứa `progressData` (bản sao JSON bất biến của tiến độ), `capturedAt: new Date()`, và `triggerReason: req.body.triggerReason || 'review_completed'`.
2. **Endpoint Truy Vấn Lịch Sử Snapshot**:
   - Bổ sung `GET /api/study-progress/:topicId/snapshots` trả về danh sách lịch sử snapshot của một chủ đề, sắp xếp theo thời gian mới nhất trước (`orderBy: { capturedAt: "desc" }`).
3. **Bảo Toàn Tương Thích Ngược**:
   - `POST /api/study-progress` tiếp tục trả về đối tượng `StudyProgress` cập nhật như trước đây.

---

## 3. Đánh Giá Trade-offs (Two-Way Door)

- **Ưu điểm**:
  - Hỗ trợ lưu vết lịch sử ôn tập phục vụ cho các thuật toán dự báo quên và biểu đồ đường cong hồi ức SM-2.
  - Đảm bảo tính nguyên tử: không thể có trường hợp `StudyProgress` cập nhật mà snapshot thất bại (hoặc ngược lại).
- **Rủi ro kiểm soát**: Rất thấp (Không thay đổi schema DDL, hoàn toàn additive).
