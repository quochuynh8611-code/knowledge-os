# Hướng Dẫn Cấu Hình Giám Sát & Cảnh Báo Sức Khỏe (Health Alerting)

Tài liệu thiết lập hệ thống probe bên ngoài để theo dõi tính sẵn sàng (Availability) và gửi cảnh báo khi dịch vụ Knowledge OS gặp sự cố.

---

## 1. Thông Số Cấu Hình Monitor

- **Endpoint mục tiêu**: `GET /api/health`
- **Mã phản hồi mong đợi (Expected Status)**: `200 OK`
- **Payload phản hồi mong đợi**: `{"status":"ok"}`
- **Tần suất kiểm tra (Interval)**: Mỗi 60 giây (`60s`)
- **Thời gian chờ phản hồi (Timeout)**: 5 giây (`5s`)
- **Ngưỡng kích hoạt cảnh báo (Incident Threshold)**: Sau **2 lần thất bại liên tiếp** (Consecutive Failures = 2).
- **Ngưỡng phục hồi (Recovery Threshold)**: Sau **2 lần kiểm tra thành công liên tiếp** (Consecutive Successes = 2).

---

## 2. Các Nhà Cung Cấp Đề Xuất (Recommended Providers)

### Lựa chọn 1: UptimeRobot (Khuyến nghị cho Webhook/Slack/Telegram)
- **Loại monitor**: HTTP(s) Monitor.
- **URL**: `https://<YOUR_PRODUCTION_DOMAIN>/api/health`
- **Monitoring Interval**: 1 minute.
- **Alert Contacts**: Email, Slack channel hoặc Telegram bot.

### Lựa chọn 2: Better Stack (Better Uptime)
- **URL**: `https://<YOUR_PRODUCTION_DOMAIN>/api/health`
- **Check frequency**: 60 seconds.
- **Request timeout**: 5 seconds.
- **Incident Escalation**: SMS / Phone call / Webhook.

### Lựa chọn 3: Google Cloud Monitoring / AWS CloudWatch
- **Cloud Synthetics Uptime Check**:
  - Check type: HTTP
  - Path: `/api/health`
  - Period: 1 minute
  - Regions: Multi-region (ví dụ: Tokyo, Singapore, US-Central)
  - Notification Channels: PagerDuty / Webhook / Email.

---

## 3. Biến Môi Trường Cấu Hình (Environment Variables)

Khi tích hợp cảnh báo webhook tự động, cấu hình các biến sau vào môi trường bảo mật của máy chủ (tuyệt đối không commit vào mã nguồn):

```bash
# URL Webhook nhận thông báo khi có sự cố (Slack, Discord, Telegram Bot webhook)
ALERT_WEBHOOK_URL="https://hooks.slack.com/services/xxx/yyy/zzz"

# Môi trường báo cáo trong payload cảnh báo
ALERT_ENVIRONMENT="production"

# Ngưỡng thời gian phản hồi cảnh báo chậm (ms)
ALERT_LATENCY_THRESHOLD_MS="2000"
```

---

## 4. Quy Trình Ứng Phó Khi Nhận Cảnh Báo (Incident Runbook)

Khi nhận được cảnh báo `HEALTH_CHECK_FAILED` từ hệ thống monitor:
1. Kiểm tra trạng thái tiến trình:
   ```bash
   docker compose ps
   # hoặc
   pm2 status
   ```
2. Kiểm tra nhật ký lỗi gần nhất:
   ```bash
   docker compose logs --tail=100 app
   ```
3. Kiểm tra khả năng kết nối tới PostgreSQL:
   ```bash
   docker compose exec app npx prisma db execute --stdin <<< "SELECT 1;"
   ```
4. Nếu server bị treo hoặc OOM: Khởi động lại service và đối chiếu [Runbook Rollback](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/release/deploy-v0.1.0.md) nếu cần thiết.

