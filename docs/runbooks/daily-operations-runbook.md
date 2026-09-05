# Knowledge OS — Daily Operations Runbook (Sổ Tay Vận Hành Hằng Ngày)

Tài liệu hướng dẫn vận hành cục bộ hệ thống **Knowledge OS** dành cho cá nhân trên macOS.

---

## 1. Khởi động ứng dụng (Start App)

### A. Chế độ Production Local (Khuyến nghị dùng hằng ngày — Nhanh, Tiết kiệm RAM)
```bash
# Tại thư mục gốc repository:
NODE_ENV=production npm run start
```
*Hoặc chạy nền ngầm (background):*
```bash
nohup npm run start > /tmp/knowledge_os.log 2>&1 &
```
* Truy cập ứng dụng tại: **[http://localhost:3000](http://localhost:3000)**

### B. Chế độ Development (Dùng khi cần chỉnh sửa mã nguồn với Hot Reload)
```bash
npm run dev
```

---

## 2. Dừng ứng dụng (Stop App)

Khi cần tắt server hoặc giải phóng cổng 3000:
```bash
# 1. Tìm PID đang lắng nghe trên cổng 3000
lsof -i :3000

# 2. Dừng tiến trình một cách an toàn (thay <PID> bằng mã PID tìm được)
kill $(lsof -ti :3000)
```

---

## 3. Build lại ứng dụng (Rebuild)

Mỗi khi có cập nhật mã nguồn frontend/backend, chạy lệnh đóng gói bản phát hành mới:
```bash
npm run build
```
*Thao tác này sẽ biên dịch React SPA vào `dist/` và bundle Backend thành `dist/server.cjs`.*

---

## 4. Sao lưu dữ liệu Snapshot (Backup & Restore)

Knowledge OS tích hợp sẵn cơ chế sao lưu Snapshot tự động với mã băm SHA-256:

### A. Tạo Snapshot mới (Tự động giữ 10 bản gần nhất)
```bash
npm run snapshot:create
```

### B. Mô phỏng tạo Snapshot (Dry-run không ghi đĩa)
```bash
npm run snapshot:dry-run
```

### C. Xác minh tính toàn vẹn của một file Snapshot
```bash
npx tsx scripts/backup-snapshot.ts --verify backups/<ten-file-snapshot>.json
```

### D. Dọn dẹp snapshot cũ theo số lượng chỉ định (ví dụ giữ 5 bản gần nhất)
```bash
npx tsx scripts/backup-snapshot.ts --prune --retention 5
```

---

## 5. Kiểm tra trạng thái hệ thống (Health Check)

Kiểm tra nhanh kết nối Backend, Database và API Key:
```bash
curl -s http://localhost:3000/api/health
```
*Kết quả chuẩn:*
```json
{"status":"ok","hasApiKey":true,"timestamp":"..."}
```

---

## 6. Các tệp tin & thư mục cấu hình quan trọng

| Tệp / Thư mục | Chức năng | Lưu ý bảo mật / Vận hành |
| :--- | :--- | :--- |
| **`.env`** | Chứa `GEMINI_API_KEY`, `DATABASE_URL`, `APP_URL` | Không commit lên Git public. |
| **`dist/`** | Thư mục chứa gói build Production đã biên dịch | Được tạo từ `npm run build`. |
| **`prisma/schema.prisma`** | Định nghĩa 11 bảng cơ sở dữ liệu PostgreSQL | Chạy `npm run db:generate` khi sửa schema. |
| **`backups/`** | Thư mục chứa các tệp Snapshot JSON | Chứa toàn bộ dữ liệu danh mục, thẻ, ghi chú, tiến độ học. |
| **`scripts/backup-snapshot.ts`**| Công cụ CLI quản lý sao lưu Snapshot | Hỗ trợ SHA-256 verification và prune tự động. |

---

## 7. Quản lý Auto-start (macOS LaunchAgent)

Dịch vụ chạy ngầm tự động cùng macOS: `com.knowledgeos.server`
* Tệp cấu hình: `~/Library/LaunchAgents/com.knowledgeos.server.plist`
* Log output: `logs/output.log`
* Log error: `logs/error.log`

### Các lệnh quản trị dịch vụ:
```bash
# Kiểm tra trạng thái dịch vụ (hiển thị PID nếu đang chạy)
launchctl list | grep com.knowledgeos.server

# Tạm dừng / Tắt auto-start (Unload)
launchctl unload ~/Library/LaunchAgents/com.knowledgeos.server.plist

# Bật lại auto-start (Load)
launchctl load ~/Library/LaunchAgents/com.knowledgeos.server.plist

# Xem log theo thời gian thực (realtime)
tail -f logs/output.log
```

