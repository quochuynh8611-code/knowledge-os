# ADR-036: Nền Tảng Lưu Vết Sự Kiện & Khả Năng Quan Sát Hàng Đợi Đồng Bộ (Sync Queue Telemetry & Observability Foundations)

- **Mã ADR:** ADR-036
- **Trạng thái:** PROPOSED (PLANNING ONLY)
- **Ngày tạo:** 2026-08-28
- **Đề xuất bởi:** Staff Software Engineer / Technical Architect
- **Phạm vi:** `src/lib/syncTelemetry.ts`, `src/services/syncQueue.ts`

---

## 1. Bối Cảnh (Context)
Hệ thống hàng đợi đột biến ngoại tuyến (`SyncQueue`) đã vận hành ổn định qua các phase P2.2–P2.8. Tuy nhiên, toàn bộ thông tin trạng thái thành công, thất bại, và loại bỏ đột biến hiện chỉ tồn tại tức thời trong RAM/UI.

Cần một cơ chế lưu vết có cấu trúc (Structured Audit Event Log) cục bộ để hỗ trợ việc chẩn đoán lỗi, tính toán tỉ lệ thành công theo từng loại thực thể mà không phụ thuộc vào dịch vụ máy chủ bên ngoài.

---

## 2. Quyết Định Kiến Trúc (Architecture Decisions)

1. **Bộ Nhớ Xoay Vòng Cố Định 50 Sự Kiện (Fixed 50-Event Rolling Buffer)**:
   - Lưu trữ tại `localStorage` dưới khóa `phat_hoc_huyen_hoc_sync_telemetry`.
   - Giới hạn cứng tối đa 50 sự kiện gần nhất (FIFO Eviction) để triệt tiêu nguy cơ chiếm dụng bộ nhớ trình duyệt.
2. **Bộ Danh Mục Sự Kiện Chuẩn Xác (5 Event Types)**:
   - `MUTATION_ENQUEUED`: Khi một mutation được đưa vào hàng đợi.
   - `REPLAY_SUCCESS`: Khi một mutation được replay thành công qua REST API.
   - `REPLAY_FAILED`: Khi một mutation replay thất bại và được chuyển sang trạng thái chờ thử lại với backoff.
   - `MUTATION_DISCARDED`: Khi người dùng chủ động bỏ qua mutation lỗi (Poison-pill).
   - `QUEUE_FLUSH_COMPLETED`: Khi tiến trình `flushQueue()` hoàn thành 1 lượt (lưu `syncedCount`, `failedCount`).
3. **Nguyên Tắc Bất Biến: Fault-Tolerant & Fire-and-Forget**:
   - Mọi thao tác ghi telemetry là thứ yếu (secondary concern). Nếu ghi telemetry thất bại do đầy bộ nhớ hoặc lỗi JSON, tiến trình đồng bộ chính (`enqueue`, `flushQueue`, `remove`) vẫn tiếp tục hoàn thành bình thường.
4. **100% Local-First & Zero Server Drift**:
   - Dữ liệu telemetry chỉ lưu tại thiết bị người dùng, không tạo thêm endpoint REST API hay Prisma model.

---

## 3. Đánh Giá Trade-offs (Two-Way Door)

- **Ưu điểm**:
  - Minh bạch hóa lịch sử đồng bộ, dễ dàng tích hợp UI Diagnostics / Health Panel ở phase sau.
  - An toàn tuyệt đối, không ảnh hưởng hiệu năng và không gửi dữ liệu ra ngoài.
- **Rủi ro kiểm soát**:
  - Giới hạn 50 sự kiện đảm bảo dung lượng lưu trữ chỉ chiếm vài kilobytes trong `localStorage`.
