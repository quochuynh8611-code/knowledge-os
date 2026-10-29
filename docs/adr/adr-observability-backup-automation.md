# ADR: Observability and Backup Automation

## Trạng Thái
Đã duyệt (Accepted) - 2026-10-29

## Bối Cảnh
Sau khi phát hành phiên bản `v0.1.0` và tích hợp các biện pháp phòng vệ an toàn migration trong `v0.1.1` (PR #5), hệ thống Knowledge OS vẫn còn những khoảng trống vận hành (operational gaps):
1. **Khả năng quan sát (Observability)**:
   - Khi xảy ra xung đột đồng thời (race condition) và Prisma ném lỗi `P2002`, `flashcardService.ts` đã phục hồi an toàn nhưng chưa phát ra structured log `FLASHCARD_P2002_RECOVERED`.
   - Khi `POST /api/artifacts/ingest` phát hiện artifact đã tồn tại (`isDuplicate = true`), chưa có log `ARTIFACT_INGEST_DUPLICATE`.
   - Khi NotebookLM client gặp sự cố mạng hoặc lỗi backend và chuyển sang offline fallback (pending), chưa có structured log `ARTIFACT_INGEST_FALLBACK`.
2. **Tự động hóa sao lưu (Backup Automation)**:
   - Chưa có kịch bản chạy sao lưu tự động định kỳ kèm xác thực mã băm SHA-256 và cơ chế dọn dẹp theo thời hạn lưu trữ (retention policy).
3. **Cảnh báo sức khỏe (Health Probe)**:
   - Cần một script kiểm tra sức khỏe độc lập (health probe) có khả năng kích hoạt webhook thông báo khi `/api/health` gặp sự cố.

## Quyết Định
1. **Tận dụng Structured Logging Hiện Hữu**:
   - Sử dụng trực tiếp `logStructuredEvent` và `formatStructuredLog` từ `src/lib/security.ts`.
   - Không cài đặt thêm logging framework nặng nề (như Winston, Bunyan hay Morgan) để giữ runtime nhẹ và tinh gọn.
   - Bổ sung quy tắc cho phép ghi nhận `idempotencyKey` trong metadata của structured log mà vẫn che giấu (redact) tuyệt đối các bí mật như `apiKey`, `password`, `token`, `secret`, và `DATABASE_URL`.
2. **Tự Động Hóa Sao Lưu Ngoài Luồng (Out-of-band Backup Automation)**:
   - Các tác vụ sao lưu, xác minh và dọn dẹp backup được triển khai dưới dạng các script độc lập (`scripts/backup-database.mjs`, `scripts/verify-backup.mjs`, `scripts/prune-backups.mjs`).
   - Tuyệt đối **không chạy backup bên trong luồng xử lý request HTTP** của ứng dụng để tránh gây nghẽn I/O và tăng độ trễ (latency).
   - Tích hợp service `backup` vào `docker-compose.yml` thuộc profile `maintenance`. Service này **không thuộc default profile**, chỉ chạy theo yêu cầu hoặc qua cron/scheduler bên ngoài host: `docker compose --profile maintenance run --rm backup`.
   - Mỗi bản backup phải đi kèm tệp `checksum.sha256` và `metadata.json`.
   - Cơ chế retention tuân thủ nguyên tắc an toàn: **Tuyệt đối không bao giờ xóa bản backup mới nhất** dù nó đã vượt quá số ngày quy định.
3. **Health Probe Độc Lập**:
   - Viết `scripts/health-probe.mjs` kiểm tra định kỳ `GET /api/health`.
   - Nếu thất bại và có cấu hình `ALERT_WEBHOOK_URL`, script sẽ tự động gửi webhook payload cảnh báo. Script hoàn toàn độc lập, không làm ảnh hưởng đến mã nguồn runtime.

## Đánh Đổi (Trade-offs)
- **Ưu điểm**:
  - Không làm phình to dependencies của dự án.
  - Dễ dàng cấu hình và vận hành trên bất kỳ môi trường nào (Docker, PM2, Cron, Systemd).
  - Bảo vệ dữ liệu với chi phí tài nguyên tối thiểu.
- **Nhược điểm**:
  - Chưa có bảng điều khiển trực quan (như Grafana / Prometheus). Sẽ xem xét tích hợp ở các phase sau nếu quy mô mở rộng yêu cầu.

## Kế Hoạch Rollback
- Revert code và vô hiệu hóa cron / maintenance container.
- Không gây ảnh hưởng đến dữ liệu người dùng hay cấu trúc CSDL hiện hữu.

