# ADR: Production Migration Safety & Prisma Guard

## Trạng Thái
Đã duyệt (Accepted) - 2026-10-29

## Bối Cảnh
Trong cấu hình `docker-compose.yml`, service phụ trợ `db-schema` được cấu hình để đồng bộ schema cơ sở dữ liệu bằng lệnh `npx prisma db push`.
- Lệnh `prisma db push` rất hữu ích và tiện lợi cho việc phát triển cục bộ (local development / prototyping) vì nó đồng bộ trực tiếp schema mà không yêu cầu tạo tệp migration.
- Tuy nhiên, trên môi trường sản xuất (Production) hoặc môi trường có dữ liệu thật:
  1. `prisma db push` bỏ qua cơ chế theo dõi lịch sử di chuyển trong bảng `_prisma_migrations`.
  2. Nếu có schema drift hoặc xung đột cấu trúc, `db push` có thể tự động xóa (drop) bảng, cột hoặc dữ liệu người dùng mà không có cảnh báo rõ ràng.
  3. Nếu kỹ sư vận hành vô tình chạy `docker compose --profile tools up` hoặc `docker compose run db-schema` trên production server, nguy cơ phá hủy hoặc làm mất đồng bộ dữ liệu là cực kỳ cao.

## Quyết Định
1. **Duy trì cô lập Profile**: Service `db-schema` trong `docker-compose.yml` bắt buộc phải duy trì `profiles: ["tools"]`, tuyệt đối không bao giờ nằm trong profile mặc định (default profile) của docker-compose.
2. **Triển khai Guard Script (`scripts/safe-prisma-db-push.mjs`)**:
   - Thay thế trực tiếp lệnh `npx prisma db push` trong `db-schema` bằng lệnh gọi qua script bảo vệ: `node scripts/safe-prisma-db-push.mjs`.
   - **Quy tắc chặn nghiêm ngặt**:
     - Nếu `NODE_ENV === "production"` và `ALLOW_PRISMA_DB_PUSH !== "true"`, script sẽ ngay lập tức **từ chối thực thi** (fail-fast), xuất thông báo lỗi rõ ràng hướng dẫn chuyển sang dùng `npx prisma migrate deploy`, và thoát với mã lỗi khác 0 (`exit 1`).
     - Chỉ khi `NODE_ENV !== "production"` (ví dụ `development`, `test` hoặc không đặt), hoặc khi biến môi trường `ALLOW_PRISMA_DB_PUSH === "true"` được gán tường minh, script mới cho phép thực thi `npx prisma db push`.
3. **Quy Chuẩn Bắt Buộc Khi Triển Khai Production**:
   - Mọi thao tác cập nhật cấu trúc cơ sở dữ liệu trên môi trường Staging/Production **bắt buộc phải sử dụng `npx prisma migrate deploy`**.
   - Tuyệt đối cấm sử dụng `prisma db push` trong pipeline CI/CD hoặc runbook triển khai production.
4. **Quy Tắc Backup Tiền Triển Khai**:
   - Mọi đợt chạy `npx prisma migrate deploy` trên production đều phải được bắt đầu bằng việc tạo snapshot dự phòng (logical snapshot hoặc `pg_dump`) và lưu trữ mã băm SHA-256.

## Đánh Đổi (Trade-offs)
- **Ưu điểm**:
  - Bảo vệ tuyệt đối cơ sở dữ liệu sản xuất khỏi các thao tác phá hủy ngẫu nhiên do con người hoặc lệnh tự động hóa.
  - Vẫn duy trì trọn vẹn trải nghiệm phát triển nhanh chóng, tiện lợi cho lập trình viên ở môi trường local development (khi `NODE_ENV` không phải production).
- **Nhược điểm**:
  - Thêm một bước kiểm tra nhỏ thông qua script wrapper.

## Kế Hoạch Rollback
- Nếu phát sinh vấn đề không mong muốn, chỉ cần revert script wrapper và cấu hình `docker-compose.yml`.
- Việc rollback không làm thay đổi hay ảnh hưởng đến bất kỳ dữ liệu nào trong cơ sở dữ liệu.

