# Runbook Triển Khai Sản Xuất: Phiên Bản v0.1.0

Tài liệu hướng dẫn chi tiết quy trình triển khai phiên bản `v0.1.0` (commit `28f030343df7503a3abda8ef4df2813a3aaa5562`) lên môi trường sản xuất (Production).

---

## Tổng Quan Phiên Bản v0.1.0
- **Tag**: `v0.1.0`
- **Target Commit**: `28f030343df7503a3abda8ef4df2813a3aaa5562`
- **Các thay đổi cốt lõi**:
  1. Thêm `Flashcard.idempotencyKey` nullable unique index (Migration `20261028134700_add_flashcard_idempotency_key`).
  2. Mở rộng `ArtifactTypeEnum` và DTO của NotebookLM Ingest Contract lên 10 loại (không migration DB).
  3. Cập nhật `CHANGELOG.md` và bump version `0.1.0`.

---

## Phase A: Chuẩn Bị Trước Triển Khai (Pre-deploy)

1. **Xác nhận trạng thái Release**:
   - Kiểm tra GitHub Release `v0.1.0` đã ở trạng thái **Published**:
     ```bash
     gh release view v0.1.0
     ```
2. **Xác nhận Target Commit**:
   - Nhánh `main` trên production host phải ở đúng commit `28f030343df7503a3abda8ef4df2813a3aaa5562`:
     ```bash
     git rev-parse HEAD
     ```
3. **Tạo Bản Sao Lưu Dự Phòng (Database Backup Snapshot)**:
   - **Cách 1: PostgreSQL pg_dump (Khuyến nghị cấp hạ tầng)**:
     ```bash
     TIMESTAMP=$(date +%Y%m%d_%H%M%S)
     # Nếu dùng Docker:
     docker exec -t knowledge-os-postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -F c > "backups/prod_dump_${TIMESTAMP}.dump"
     # Nếu kết nối trực tiếp qua DATABASE_URL:
     pg_dump "$DATABASE_URL" -F c -b -v -f "backups/prod_dump_${TIMESTAMP}.dump"
     ```
   - **Cách 2: Ứng dụng Application-level Snapshot**:
     ```bash
     npx tsx scripts/backup-snapshot.ts
     # Hoặc gọi qua API:
     curl -s -X POST http://localhost:3000/api/backup/export > "backups/snapshot_prod_${TIMESTAMP}.json"
     ```
4. **Ghi lại Metadata của Snapshot**:
   - Ghi lại đường dẫn tệp, timestamp, kích thước byte:
     ```bash
     ls -lh backups/prod_dump_${TIMESTAMP}.dump
     ```
   - Tính toán và lưu trữ mã băm SHA-256:
     ```bash
     shasum -a 256 "backups/prod_dump_${TIMESTAMP}.dump"
     ```
5. **Xác nhận Tài Nguyên Hệ Thống**:
   - Đảm bảo dung lượng ổ đĩa còn trống ít nhất 20%:
     ```bash
     df -h
     ```
   - Đảm bảo RAM còn trống tối thiểu 1GB cho quá trình build/migration.
6. **Xác nhận Biến Môi Trường (Secret/ENV)**:
   - Kiểm tra các biến bắt buộc: `DATABASE_URL`, `NODE_ENV=production`, `PORT` (hoặc `APP_PORT`).
   - Kiểm tra kết nối tới cơ sở dữ liệu:
     ```bash
     npx prisma migrate status
     ```
7. **Thông Báo Bảo Trì (Maintenance Window)**:
   - Thông báo cửa sổ bảo trì dự kiến 5-10 phút (thời gian restart container/process).

---

## Phase B: Thực Hiện Triển Khai (Deploy)

1. **Kéo mã nguồn chính thức**:
   ```bash
   git fetch origin --tags
   git checkout v0.1.0
   git rev-parse HEAD
   # Phải in ra: 28f030343df7503a3abda8ef4df2813a3aaa5562
   ```

2. **Cài đặt dependencies hoặc Build Docker Image**:
   - **Trường hợp A: Chạy Native Host (Node.js)**:
     ```bash
     npm ci --prefer-offline --no-audit
     npm run build
     ```
   - **Trường hợp B: Chạy qua Docker Compose**:
     ```bash
     docker compose build app
     ```

3. **Chạy Migration Cơ Sở Dữ Liệu**:
   > [!CAUTION]
   > Tuyệt đối KHÔNG chạy `prisma db push` trên production. BẮT BUỘC dùng `prisma migrate deploy`.
   
   - **Chạy lệnh migration**:
     ```bash
     # Nếu chạy native:
     npx prisma migrate deploy

     # Nếu chạy qua Docker container:
     docker compose run --rm app npx prisma migrate deploy
     ```
   - Xác nhận output báo: `The following migration have been applied: 20261028134700_add_flashcard_idempotency_key`.

4. **Khởi động lại Ứng Dụng (Restart Server)**:
   - **Native (Node.js / PM2)**:
     ```bash
     # Nếu dùng PM2:
     pm2 restart knowledge-os || pm2 start dist/server.cjs --name knowledge-os
     # Nếu chạy background service / systemd:
     sudo systemctl restart knowledge-os
     ```
   - **Docker Compose**:
     ```bash
     docker compose up -d --no-deps app
     ```

5. **Chờ Kiểm Tra Sức Khỏe Khởi Động**:
   - Đợi 10-15 giây để tiến trình lắng nghe port 3000.

---

## Phase C: Xác Minh Sau Triển Khai (Post-deploy Verification)

1. **Kiểm tra Health Endpoint**:
   ```bash
   curl -I http://localhost:3000/api/health
   # Phải trả về HTTP/1.1 200 OK
   ```

2. **Xác nhận Trạng Thái Migration**:
   ```bash
   npx prisma migrate status
   # Phải hiển thị: "Database schema is up to date!"
   ```

3. **Kiểm tra Schema Cơ Sở Dữ Liệu Thực Tế**:
   - Xác nhận cột `idempotencyKey` tồn tại:
     ```sql
     SELECT column_name, data_type, is_nullable 
     FROM information_schema.columns 
     WHERE table_name = 'Flashcard' AND column_name = 'idempotencyKey';
     ```
     *(Kết quả: `data_type = text`, `is_nullable = YES`)*
   - Xác nhận unique index tồn tại:
     ```sql
     SELECT indexname, indexdef 
     FROM pg_indexes 
     WHERE tablename = 'Flashcard' AND indexname = 'Flashcard_idempotencyKey_key';
     ```

4. **Smoke Test MindMap Flashcard Creation**:
   - Mở MindMap, click tạo flashcard từ 1 node. Card phải được tạo thành công với key `node-fc-${nodeId}`.

5. **Smoke Test Flashcard Idempotency**:
   - Thử click liên tục 2 lần (double-click) hoặc gửi đồng thời request tạo card với cùng `idempotencyKey`.
   - Xác nhận hệ thống trả về HTTP 200/201 với cùng một ID thẻ, không tạo 2 thẻ trùng.

6. **Smoke Test NotebookLM MindMap Outline Sync**:
   - Lưu hoặc sync artifact loại `mindmap_outline`.
   - Xác nhận backend trả về HTTP 201 Created (không còn lỗi 400 "Invalid option").

7. **Smoke Test Retry Pending Artifacts**:
   - Thử retry một artifact pending trước đó.
   - Xác nhận sync thành công và không bị duplicate.

8. **Giám Sát Nhật Ký Ứng Dụng (Log Monitoring)**:
   - Theo dõi log liên tục trong 30 phút:
     ```bash
     # Docker:
     docker compose logs -f --tail=100 app
     # Native:
     tail -f logs/app.log
     ```
   - Đảm bảo không có exception chưa được xử lý, không có lỗi Prisma connection pool.

---

## Phase D: Kế Hoạch Rollback Khẩn Cấp (Emergency Rollback)

1. **Tiêu Chí Kích Hoạt Rollback**:
   - Endpoint `/api/health` trả về 5xx liên tục > 2 phút sau khi restart.
   - Phát sinh lỗi nghiêm trọng P0 (crash ứng dụng, hỏng dữ liệu người dùng).

2. **Quy Trình Rollback Mã Nguồn (Code Rollback)**:
   ```bash
   # Quay về commit trước release
   git checkout 944ad9c   # Commit PR #1 trước v0.1.0
   npm ci
   npm run build
   # Restart lại server ngay lập tức
   pm2 restart knowledge-os # hoặc docker compose restart app
   ```

3. **Chính Sách Cơ Sở Dữ Liệu Khi Rollback**:
   > [!IMPORTANT]
   > Do cột `idempotencyKey` là **nullable** và migration là additive, code cũ (`944ad9c`) vẫn đọc/ghi bình thường với database hiện tại mà KHÔNG bị lỗi. **KHÔNG CẦN DROP CỘT HAY INDEX KHI ROLLBACK CODE**.

4. **Chỉ Khôi Phục Snapshot Dữ Liệu Khi Có Hỏng Dữ Liệu (Data Corruption)**:
   - Nếu phát hiện dữ liệu người dùng bị sửa đổi sai:
     ```bash
     # Dừng server tạm thời
     docker compose stop app
     # Restore database từ file dump đã tạo ở Phase A:
     pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists "backups/prod_dump_${TIMESTAMP}.dump"
     # Khởi động lại
     docker compose start app
     ```

5. **Ghi Nhận Sự Cố (Incident Report)**:
   - Ghi lại timestamp, nguyên nhân gốc, các bước đã thực hiện và bài học kinh nghiệm vào `docs/incidents/`.

