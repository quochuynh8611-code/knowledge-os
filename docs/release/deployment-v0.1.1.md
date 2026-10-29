# Deployment Record: Phiên Bản v0.1.1 (Draft)

Tài liệu ghi nhận kế hoạch triển khai chi tiết cho phiên bản **v0.1.1** (Commit đích: `228c17d82b210bd6a80f6133df142e050573ddc0`) theo **Option A**.

---

## 1. Thông Tin Tổng Quan (Metadata)

| Thuộc Tính | Giá Trị | Ghi Chú |
| :--- | :--- | :--- |
| **Target Release Version** | `v0.1.1` (Dự kiến tạo sau khi deploy thành công) | Patch release bổ sung Safety Guard & Health Alerting |
| **Target Commit SHA** | `228c17d82b210bd6a80f6133df142e050573ddc0` | `main` HEAD |
| **Commit Liền Trước** | `28f030343df7503a3abda8ef4df2813a3aaa5562` | Tag `v0.1.0` hiện hữu (giữ nguyên bất biến) |
| **Trạng Thái Hiện Tại** | ⏳ **DRAFT — CHỜ THÔNG TIN MÔI TRƯỜNG & PHÊ DUYỆT** | Tuyệt đối chưa thực thi trên production |
| **Thời Gian Dự Kiến** | `2026-10-29` | Thời lượng bảo trì dự kiến: 5 - 10 phút |

---

## 2. Thông Số Môi Trường Đích (Target Environment)

> [!IMPORTANT]
> Toàn bộ các thông số dưới đây hiện đang ở trạng thái **NOT CONFIGURED** và sẽ được điền đầy đủ trước khi thực thi.

| Thông Số Kỹ Thuật | Trạng Thái Hiện Tại | Giá Trị Cần Cung Cấp |
| :--- | :---: | :--- |
| **Nền Tảng Máy Chủ (Host/Platform)** | **NOT CONFIGURED** | *(Ví dụ: VPS Ubuntu 24.04 / Docker Compose / PM2 / Cloud VM)* |
| **Địa Chỉ IP / Tên Miền (Host/Domain)** | **NOT CONFIGURED** | *(Ví dụ: `api.knowledge-os.internal` hoặc IP cụ thể)* |
| **Phương Thức Truy Cập (Access Method)** | **NOT CONFIGURED** | *(Ví dụ: SSH key / Bastion host / Web Terminal / Local console)* |
| **Người / Đại Diện Thực Thi (Executor)** | **NOT CONFIGURED** | *(Người dùng tự chạy lệnh / Antigravity thực thi qua quyền được cấp)* |
| **Cơ Sở Dữ Liệu PostgreSQL (DB Host)** | **NOT CONFIGURED** | *(Ví dụ: Docker service `postgres:5432` / Managed Cloud PostgreSQL)* |
| **Quyền Thực Thi `pg_dump`** | **NOT CONFIGURED** | *(Xác nhận user DB có quyền SELECT và dump bảng)* |
| **Đường Dẫn Lưu Bản Sao Lưu (Backup Path)** | **NOT CONFIGURED** | *(Đường dẫn thư mục lưu file `.dump` trên server)* |
| **Mã Băm SHA-256 Bản Sao Lưu** | **NOT CONFIGURED** | *(Được tính toán tự động ngay sau khi tạo dump)* |
| **Hệ Thống Giám Sát Sức Khỏe (Monitor)** | **NOT CONFIGURED** | *(UptimeRobot / Better Stack / Custom Webhook)* |

---

## 3. Checklist Thực Thi Chuẩn Hóa (Option A — Commit `228c17d`)

### Checkpoint 0: Phê Duyệt & Tiếp Nhận Thông Tin Môi Trường
- [ ] Người dùng cung cấp đầy đủ các thông số ở Mục 2.
- [ ] Người dùng phê duyệt cửa sổ triển khai (Maintenance window 5–10 phút).
- [ ] **Điều kiện dừng**: Thiếu bất kỳ thông số nào ở Mục 2 -> **DỪNG LẠI NGAY**.

---

### Checkpoint 1: Kiểm Tra Tiền Khả Thi (Pre-flight Checks)
- **Lệnh thực thi**:
  ```bash
  # 1. Kiểm tra dung lượng ổ đĩa
  df -h .
  
  # 2. Kiểm tra health hiện tại
  curl -s -f http://localhost:3000/api/health || echo "SERVER_CURRENTLY_DOWN_OR_FIRST_DEPLOY"
  
  # 3. Ghi nhận commit đang chạy trước khi deploy
  git rev-parse HEAD
  ```
- **Điều kiện Pass**:
  - Dung lượng đĩa trống $\ge 2$ GB.
  - Kết nối DB hoạt động bình thường.
  - Ghi lại mã commit hiện tại (để phục vụ rollback nếu cần).
- **Điều kiện Fail**: Đĩa đầy ($< 2$ GB), môi trường lỗi kết nối DB.
- **Hành động**: **DỪNG LẠI**, giải phóng dung lượng trước khi tiếp tục.

---

### Checkpoint 2: Tạo Bản Sao Lưu Dự Phòng Bắt Buộc (Full Database Backup)
> [!CAUTION]
> Tuyệt đối không thực hiện bất kỳ bước nào tiếp theo nếu bản backup chưa được xác minh toàn vẹn.

- **Lệnh thực thi**:
  ```bash
  TIMESTAMP=$(date +%Y%m%d_%H%M%S)
  mkdir -p backups
  
  # Cách 1: Docker Compose Postgres
  docker exec -t knowledge-os-postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -F c > "backups/prod_backup_${TIMESTAMP}.dump"
  
  # Cách 2: PostgreSQL kết nối trực tiếp qua DATABASE_URL
  pg_dump "$DATABASE_URL" -F c -b -v -f "backups/prod_backup_${TIMESTAMP}.dump"
  
  # Xác minh kích thước file:
  ls -lh "backups/prod_backup_${TIMESTAMP}.dump"
  
  # Tính toán mã băm SHA-256:
  shasum -a 256 "backups/prod_backup_${TIMESTAMP}.dump" | tee "backups/prod_backup_${TIMESTAMP}.dump.sha256"
  ```
- **Điều kiện Pass**:
  - File `.dump` tồn tại, kích thước $> 0$ bytes.
  - File `.sha256` được tạo thành công.
- **Điều kiện Fail**: Lệnh `pg_dump` lỗi (exit code $\ne 0$) hoặc kích thước 0 byte.
- **Hành động**: **DỪNG LẠI TUYỆT ĐỐI**, không sửa mã nguồn hay chạy migration.

---

### Checkpoint 3: Triển Khai Mã Nguồn (Code Deployment - Commit `228c17d`)
- **Lệnh thực thi**:
  ```bash
  # 1. Kéo commit chính xác từ remote
  git fetch origin main
  git checkout 228c17d82b210bd6a80f6133df142e050573ddc0
  
  # 2. Xác nhận đúng commit đích
  CURRENT_COMMIT=$(git rev-parse HEAD)
  if [ "$CURRENT_COMMIT" != "228c17d82b210bd6a80f6133df142e050573ddc0" ]; then
    echo "ERROR: Sai commit target! Hiện tại: $CURRENT_COMMIT"
    exit 1
  fi
  
  # 3. Cài đặt dependencies và build
  # Nếu chạy Docker Compose:
  docker compose build app
  
  # Nếu chạy Native:
  npm ci --prefer-offline --no-audit
  npm run build
  ```
- **Điều kiện Pass**: `git rev-parse HEAD` khớp `228c17d82b210bd6a80f6133df142e050573ddc0` và build thành công (exit code 0).
- **Điều kiện Fail**: Lỗi build, lỗi npm ci, hoặc sai commit.
- **Hành động Rollback**: `git checkout <PREVIOUS_COMMIT>`.

---

### Checkpoint 4: Thực Thi Migration Cơ Sở Dữ Liệu
> [!IMPORTANT]
> Chỉ dùng `prisma migrate deploy`. Script `scripts/safe-prisma-db-push.mjs` sẽ chủ động chặn nếu ai đó vô tình chạy `prisma db push`.

- **Lệnh thực thi**:
  ```bash
  # Nếu chạy Native:
  npx prisma migrate deploy

  # Nếu chạy qua Docker:
  docker compose run --rm app npx prisma migrate deploy
  ```
- **Điều kiện Pass**:
  - Console thông báo: `Applying migration 20261028134700_add_flashcard_idempotency_key` -> `The following migration have been applied`.
  - Kiểm tra trạng thái: `npx prisma migrate status` hiển thị `Database schema is up to date!`.
- **Điều kiện Fail**: Exit code $\ne 0$, lỗi kết nối, hoặc timeout.
- **Hành động Rollback**:
  - Khôi phục CSDL từ file dump ở Checkpoint 2:
    ```bash
    pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists "backups/prod_backup_${TIMESTAMP}.dump"
    ```
  - **DỪNG LẠI**, không restart server mới.

---

### Checkpoint 5: Khởi Động Lại Dịch Vụ (Server Restart)
- **Lệnh thực thi**:
  ```bash
  # Nếu dùng Docker Compose:
  docker compose up -d --no-deps app
  
  # Nếu dùng PM2:
  pm2 restart knowledge-os
  ```
- **Điều kiện Pass**: Container / Process chuyển sang trạng thái running, lắng nghe cổng 3000.
- **Điều kiện Fail**: Container crash loop hoặc không khởi động được sau 60s.
- **Hành động Rollback**: Revert code về commit cũ và restart phiên bản cũ.

---

### Checkpoint 6: Kiểm Thử Xác Minh Sau Triển Khai (Post-deploy Verification)
- **Lệnh & Kịch bản thực thi**:
  1. **Kiểm tra Health Endpoint**:
     ```bash
     curl -s -f http://localhost:3000/api/health
     # Kỳ vọng trả về: {"status":"ok"} HTTP 200
     ```
  2. **Xác minh Schema Database**:
     ```sql
     -- Cột idempotencyKey phải tồn tại:
     SELECT column_name, data_type, is_nullable 
     FROM information_schema.columns 
     WHERE table_name = 'Flashcard' AND column_name = 'idempotencyKey';
     
     -- Unique Index phải tồn tại:
     SELECT indexname FROM pg_indexes 
     WHERE tablename = 'Flashcard' AND indexname = 'Flashcard_idempotencyKey_key';
     ```
  3. **Smoke Test Runtime**:
     - Tạo 1 flashcard từ MindMap: Node sinh thẻ với `node-fc-${nodeId}`.
     - Thử gửi request lặp (double-click / duplicate): Trả về thẻ cũ, không tạo 2 thẻ trùng.
     - Sync artifact `mindmap_outline` từ NotebookLM: Backend trả về HTTP 201 Created (không còn lỗi 400).
- **Điều kiện Pass**: 100% các bước xác minh trên đạt kết quả đúng; không phát sinh log ngoại lệ 5xx.
- **Điều kiện Fail**: Endpoint `/api/health` trả về 5xx hoặc phát hiện lỗi P0.
- **Hành động Rollback**: Thực hiện quy trình Rollback khẩn cấp ở Mục 4.

---

### Checkpoint 7: Tạo Tag v0.1.1 & Đóng Đợt Triển Khai (Post-deploy Tagging & Closure)
- **Lệnh thực thi** *(Chỉ chạy sau khi Checkpoint 6 PASS 100%)*:
  ```bash
  git tag -a v0.1.1 228c17d82b210bd6a80f6133df142e050573ddc0 -m "v0.1.1 — Production Migration Safety Guard & Health Alerting"
  git push origin v0.1.1
  gh release create v0.1.1 --title "v0.1.1 — Production Migration Safety Guard & Health Alerting" --notes "Patch release adding production migration safety guards and health alerting documentation."
  ```
- **Hành động hoàn tất**:
  - Ghi nhận thời gian hoàn tất, lưu đường dẫn file backup và SHA-256 vào tài liệu release.
  - Duy trì giám sát nhật ký ứng dụng liên tục trong 30 phút.

---

## 4. Runbook Phục Hồi Sự Cố Khẩn Cấp (Emergency Rollback Runbook)

Nếu xảy ra sự cố nghiêm trọng (P0) tại bất kỳ thời điểm nào sau khi restart:

1. **Rollback Ứng Dụng (Code Level)**:
   ```bash
   git checkout 28f030343df7503a3abda8ef4df2813a3aaa5562 # Quay về v0.1.0 hoặc commit trước đó
   npm ci
   npm run build
   # Restart lại dịch vụ ngay:
   docker compose up -d --no-deps app # hoặc pm2 restart knowledge-os
   ```
2. **Xử lý CSDL**:
   - Do migration `idempotencyKey` là **nullable** và additive, CSDL giữ nguyên cột này vẫn tương thích 100% với code cũ (`28f0303` hoặc `944ad9c`). **Không cần drop cột trong tình huống thông thường**.
3. **Chỉ Phục Hồi Dump Khi Có Hư Hại Dữ Liệu (Data Corruption)**:
   ```bash
   docker compose stop app
   pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists "backups/prod_backup_${TIMESTAMP}.dump"
   docker compose start app
   ```

