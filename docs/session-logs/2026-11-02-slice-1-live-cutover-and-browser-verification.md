# Hồ Sơ Cutover & Kiểm Thử Trình Duyệt Thực Tế Slice 1 (Live DB & Browser Verification)

**Thời điểm thực thi cutover**: 2026-11-02 10:41:42 - 10:46:25 (UTC+7)
**Mục tiêu**: Áp dụng migration artifact cột `openTarget` lên PostgreSQL live database (`knowledge_os`), khởi động lại production server qua launchd, và kiểm thử trình duyệt thực tế 9 kịch bản trên `http://localhost:3000/#/resources`.
**Trạng thái**: HOÀN THÀNH 100% — Toàn bộ kịch bản và quality gates đạt chuẩn, dữ liệu test đã dọn dẹp sạch.

---

## 1. Migration Artifact & Biến Động Schema Live DB

### 1.1. Bằng chứng Identity Probe
Trước khi áp dụng bất kỳ mutation nào, câu lệnh xác thực danh tính kết nối đã được thực thi:
```sql
SELECT current_database(), current_schema(), current_user;
```
- **Kết quả trả về**: `knowledge_os | public | postgres`
- **Xác nhận**: Đảm bảo 100% thực thi trên đúng database sản xuất `knowledge_os`, schema `public`.

### 1.2. Trạng thái Schema Trước Migration
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'Resource' AND column_name = 'openTarget';
```
- **Kết quả trả về**: `0 rows` (Cột `openTarget` chưa tồn tại).

### 1.3. Áp dụng Migration Artifact Tường Minh
Thực thi đúng artifact duy nhất đã chuẩn bị:
- **Tập tin SQL**: `prisma/migrations/20261102100000_add_resource_open_target/migration.sql`
- **SHA-256 Checksum**: `2bb515ef0b37589c0cb736216f4a457e778542172707800f05124057f8b2aa6b`
- **Lệnh thực thi**: `psql -h localhost -p 5432 -U postgres -d knowledge_os -f prisma/migrations/20261102100000_add_resource_open_target/migration.sql`
- **Nội dung lệnh thực tế trong file**:
  ```sql
  -- AlterTable
  ALTER TABLE "Resource" ADD COLUMN "openTarget" TEXT;
  ```
- **Kết quả psql**: `ALTER TABLE`
*(Lưu ý về Provenance: Lệnh trong file là `ALTER TABLE "Resource" ADD COLUMN "openTarget" TEXT;` chuẩn Prisma migration format, KHÔNG có mệnh đề `IF NOT EXISTS`. Trong báo cáo nháp ban đầu có ghi nhầm `IF NOT EXISTS` theo phản xạ viết thủ công, đã được hiệu chỉnh chính xác 100% khớp với tập tin artifact)*.

### 1.4. Trạng thái Schema Sau Migration
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'Resource' AND column_name = 'openTarget';
```
- **Kết quả trả về**:
  ```text
  openTarget | text | YES
  ```
  *(Cột `openTarget` kiểu `text`, cho phép `NULL`, đã sẵn sàng tiếp nhận dữ liệu)*.

---

## 2. Server Soft Restart & Bundle Verification

- **Thư mục sao lưu dist**: `dist.backup-20261102104052/`
- **Lệnh build production**: `npm run build` (Hoàn tất trong 14.15s, xuất `dist/server.cjs` 479.6 kB).
- **Cơ chế quản lý daemon**: macOS launchd service `com.knowledgeos.server` (`~/Library/LaunchAgents/com.knowledgeos.server.plist`).
- **Lệnh restart**: `launchctl kickstart -k gui/$(id -u)/com.knowledgeos.server`
- **Tiến trình**:
  - PID trước khi restart: `1046`
  - PID sau khi restart: `7095`
- **Kiểm tra HTTP endpoint**: `curl -I http://localhost:3000` -> `HTTP/1.1 200 OK`
- **Client Bundle nạp**: `dist/assets/index-BJBn_5ww.js` (xác nhận chứa các logic `openTarget` mới nhất).

---

## 3. Nhật Ký 9 Kịch Bản Browser Verification (Chrome DevTools)

Tất cả các thao tác đều được ghi nhận trực tiếp trên giao diện `http://localhost:3000/#/resources`:

1. **Scenario 1 & 2 (Tạo Resource & Lưu `openTarget`)**:
   - Mở modal thêm tài liệu, nhập Tiêu đề: `Test Slice 1 Resource openTarget`, URL: `https://example.com/slice1-test`, openTarget: `archive://test-slice1-open-target-uuid`.
   - Bấm lưu. Bản ghi `res-1793591037462` được tạo thành công trên DB với đầy đủ `openTarget`.
   - Snapshot UI hiển thị link trực tiếp: `Ứng dụng ngoài (openTarget)`.
2. **Scenario 3 (F5/Reload & Hiển Thị Đích Mở)**:
   - Tải lại toàn bộ trang qua browser navigate.
   - Thẻ tài liệu vẫn hiển thị huy hiệu `Ứng dụng ngoài (openTarget)` trỏ vào `archive://test-slice1-open-target-uuid`, chứng minh tính bền vững sau reload (không bị xóa bởi server sync).
3. **Scenario 4 & 5 (Xóa Trắng `openTarget` & Fallback)**:
   - Gửi payload cập nhật với `openTarget: null`.
   - API trả về 200 OK. DB xác nhận cột `openTarget` chuyển thành `NULL`.
   - Tải lại trang (F5): UI tự động chuyển sang hiển thị `Liên kết tham chiếu (URL)` trỏ vào `https://example.com/slice1-test`.
4. **Scenario 6 (Omitted Preservation)**:
   - Cập nhật tiêu đề mà không gửi trường `openTarget` trong payload (omitted).
   - Kiểm tra DB: giá trị `openTarget` hiện tại trên DB được bảo toàn nguyên vẹn, không bị ghi đè thành `NULL`.
5. **Scenario 7 (External Viewer Fallback)**:
   - Kiểm chứng thứ tự fallback của bộ giải quyết viewer ngoài: `openTarget` (ưu tiên cao nhất) -> `url` -> `filePath` -> `none`.
6. **Scenario 8 (Internal Reader Fallback)**:
   - Kiểm chứng bộ đọc tích hợp: phân giải hash file `/api/archive/file/<hash>` hoặc `vault:<path>`, mở an toàn trong Reader nội bộ.
7. **Scenario 9 (Rapid Multi-click & Concurrency Gate)**:
   - Bắn 3 request `POST /api/resources` đồng thời với cùng stable ID `res-rapid-click-test-123`.
   - Kết quả phản hồi: `[201, 200, 200]` — **0 lỗi 500**.
   - Kiểm tra DB: Chỉ có duy nhất **1 bản ghi** được tạo ra (không trùng lặp).

---

## 4. Hồ Sơ Cleanup Dữ Liệu Test Trên Live DB

Để đảm bảo tính toàn vẹn của production database `knowledge_os`, toàn bộ các bản ghi sinh ra trong quá trình kiểm thử browser đã được thu dọn triệt để:

### 4.1. Thông Tin Bản Ghi Trước Khi Xóa
- **Bản ghi 1**:
  - `id`: `res-1793591037462`
  - `title`: `Test Slice 1 Resource openTarget (Preserved OK)`
  - `url`: `https://example.com/slice1-test`
  - `openTarget`: `archive://preserved-target`
- **Bản ghi 2**:
  - `id`: `res-rapid-click-test-123`
  - `title`: `Rapid Click Test Resource`
  - `url`: `https://example.com/rapid-test`
  - `openTarget`: `archive://rapid-target`

### 4.2. Lệnh DELETE Tường Minh
```sql
DELETE FROM "Resource"
WHERE id IN ('res-1793591037462', 'res-rapid-click-test-123');
```
- **Kết quả thực thi**: `DELETE 2` (Đúng chính xác 2 bản ghi test, không xóa nhầm bất kỳ bản ghi nào khác).

### 4.3. Đối Chiếu Số Lượng Bản Ghi (Resource Count)
- **Số Resource ban đầu trước kiểm thử**: 3 bản ghi (`Khảo Luận Cốt Lõi Phật Học Kinh Kim Cang`, `Notebook Lm Phương pháp học`, `Kỹ thuật trồng cà gai leo`).
- **Số Resource trong lúc kiểm thử**: 5 bản ghi (3 bản ghi gốc + 2 bản ghi test).
- **Số Resource sau khi dọn dẹp**: **3 bản ghi** (khớp 100% với trạng thái nguyên bản của người dùng).

---

## 5. Ghi Nhận Kiểm Tra Tĩnh & Bộ Nhớ Trình Biên Dịch TypeScript (Typecheck Memory Note)

- **Lần chạy đầu tiên**: `npx tsc --noEmit` gặp lỗi tiến trình bị hủy đột ngột với **exit code 134** (`FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory`, heap vượt mức mặc định ~2048 MB trên Node.js).
- **Lần chạy thứ hai**: Thực thi với tùy chọn tăng heap `NODE_OPTIONS="--max-old-space-size=4096" npx tsc --noEmit` -> **PASS 100% (exit code 0, không có lỗi type nào)**.
- **Đánh giá rủi ro (Risk Assessment)**:
  - Đây là giới hạn bộ nhớ phân bổ (memory ceiling) khi dự án phình to với số lượng lớn module và types.
  - Cần lưu ý khi chạy CI workflow (GitHub Actions) có thể cần bổ sung env `NODE_OPTIONS: "--max-old-space-size=4096"` vào job typecheck để tránh OOM. PR này chưa sửa cấu hình CI yaml nhằm giữ đúng phạm vi Slice 1.
