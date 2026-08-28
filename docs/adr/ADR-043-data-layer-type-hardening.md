# ADR-043: Chuẩn Hóa Kiểu Dữ Liệu Tầng Khảo Cứu (Data Layer & Type Hardening)

- **Mã ADR:** ADR-043
- **Trạng thái:** PROPOSED (PLANNING ONLY)
- **Ngày tạo:** 2026-08-28
- **Đề xuất bởi:** Staff Software Engineer / TypeScript Lead
- **Phạm vi:** `src/types/index.ts`, `tests/unit/*`

---

## 1. Bối Cảnh (Context)
Dự án tồn tại 6 cảnh báo lỗi TypeScript cũ tại `tsc --noEmit` do sự không tương thích nhẹ giữa kiểu thực thể (`Topic`, `KnowledgeLink`) và Zod validation schema / test mocks. Cần giải quyết triệt để nhằm đạt chuẩn 0 diagnostics.

---

## 2. Quyết Định Kiến Trúc (Architecture Decisions)

1. **Đồng Bộ Optionality Của `KnowledgeLink` & `Topic`**:
   - `KnowledgeLink.id`: Cho phép `id?: string` vì các liên kết sinh tự động từ đồ thị hoặc chưa lưu DB có thể chưa được cấp ID trước khi persist.
   - `Topic.links` & `Topic.studyProgress`: Cho phép optional `links?: KnowledgeLink[]` và `studyProgress?: StudyProgress`.
2. **Cập Nhật Mock Data Trong Test Suites**:
   - Cung cấp đầy đủ các trường `categoryId`, `links`, `studyProgress` và mock method `resetAllData` trong các file test đơn vị.
3. **Mục Tiêu Đạt 0 Lỗi Kiểm Tra Tĩnh (`tsc --noEmit`)**:
   - Sau khi cập nhật, lệnh `npm run lint` phải thoát với mã 0 (0 errors, 0 warnings).

---

## 3. Đánh Giá Trade-offs (Two-Way Door)

- **Ưu điểm**:
  - Không có bất kỳ rủi ro runtime nào (100% Type-only & test mock fix).
  - Tăng tính linh hoạt và chính xác khi làm việc với TypeScript.
  - Loại bỏ hoàn toàn nợ kỹ thuật kiểm tra kiểu.
