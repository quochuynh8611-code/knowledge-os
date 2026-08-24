# ADR-013: Sẵn Sàng Vận Hành Sản Phẩm, Rào Chắn Bảo Mật & Giám Sát Hệ Thống (Production Readiness, Security Guardrails & Operational Hardening)

- **Mã ADR:** ADR-013
- **Trạng thái:** PROPOSED / APPROVED FOR TEST-FIRST IMPLEMENTATION (PHASE 4)
- **Ngày tạo:** 2026-08-24
- **Đề xuất bởi:** Staff Software Engineer / Technical Architect
- **Phạm vi tác động:**
  - `server.ts` (Rate limiting middleware, structured JSON logging, payload boundary guards, resilient Gemini error handling)
  - `src/lib/validation.ts` (Payload size guards, boundary limits)
  - `tests/unit/phase-4-production-hardening.test.ts` (Toàn bộ 8 kịch bản Gherkin)
  - `docs/PROJECT_STATUS.md` & `docs/implementation-roadmap.md`

---

## 1. Bối Cảnh (Context)

Dự án **Knowledge OS (Dashboard Nghiên Cứu Phật Học & Huyền Học)** đã hoàn thành trọn vẹn các tính năng nghiên cứu cốt lõi:
1. Quản lý 35 chủ đề canonical với đồ thị liên kết, ghi chú và tài liệu tham khảo cục bộ (`filePath`).
2. Cầu nối đồng bộ đa nền tảng: Obsidian Bridge (`obsidian://`), Google NotebookLM Studio và Antigravity Handoff Bundle (6 phần chuẩn).
3. Cơ chế Dual-Tier Persistence: Ưu tiên PostgreSQL/Prisma, fallback an toàn sang LocalStorage khi offline.
4. Cơ chế sao lưu và phục hồi thảm họa với SHA-256 Bit-for-Bit Checksum.

Tuy nhiên, trước khi đưa vào vận hành thực tế ở môi trường sản xuất (Production), hệ thống cần được gia cố toàn diện về:
- **Bảo vệ ranh giới (Security Boundary):** Chặn các yêu cầu quá kích thước (Oversized payload) và giới hạn tần suất gọi API (Rate Limiting) trên các endpoint tốn tài nguyên (`/api/gemini/*`, `/api/backup/restore`).
- **Khả năng quan sát chuẩn hóa (Observability & Health):** Chuẩn hóa chính sách đo độ trễ cơ sở dữ liệu (`checkDbHealth`), bổ sung Structured JSON Logging ghi nhận vòng đời server, lỗi phục hồi, và sự cố AI retry.
- **Ranh giới chi phí và phục hồi AI (Gemini Resilience & Cost Boundary):** Phân định rạch ròi giữa lỗi có thể thử lại (Retryable: 503, 429, Overload) và lỗi không được phép thử lại (Non-retryable: 400, 401, Invalid Arg) để dừng ngay lập tức, tránh lãng phí tài nguyên và chi phí API.
- **Tính toàn vẹn phục hồi thảm họa (Disaster Recovery Integrity):** Đảm bảo tính nguyên tử (Atomicity), nếu snapshot lỗi hoặc sai checksum, giao dịch dừng ngay trước khi thực hiện bất kỳ thay đổi nào lên cơ sở dữ liệu hoặc state.

---

## 2. Quyết Định Kiến Trúc (Architecture Decisions)

### 2.1. Rào Chắn Tần Suất & Giới Hạn Tải (Security & Rate Limiting Guardrails)
1. **Rate Limiting theo Endpoint Nhạy Cảm:**
   - Áp dụng bộ đếm trượt (Sliding window / Token bucket) in-memory siêu nhẹ:
     - Nhóm AI (`/api/gemini/*`): Tối đa **10 requests / phút / client IP**. Vượt ngưỡng trả về HTTP 429 (`TOO_MANY_REQUESTS`).
     - Nhóm Quản trị dữ liệu (`/api/backup/restore`): Tối đa **5 requests / phút / client IP**. Vượt ngưỡng trả về HTTP 429.
   - Các route đọc dữ liệu thông thường (`/api/topics`, `/api/health`, v.v.) không bị áp rate limit cứng để không làm ảnh hưởng trải nghiệm tra cứu của học giả.
2. **Payload Size Guard tại Validation Boundary:**
   - Snapshot Backup tối đa **15MB** (đủ cho hàng trăm nghìn notes/metadata nhưng chặn đứng buffer overflow).
   - Text Prompt AI tối đa **20.000 ký tự**.
   - Handoff context & notes tối đa **100.000 ký tự**.
   - Từ chối ngay lập tức tại tầng validation trước khi gọi database hoặc AI model.

### 2.2. Chuẩn Hóa Đo Lường Độ Trễ & Health Probes (Health & Latency Policy)
Chính sách phân loại trạng thái cơ sở dữ liệu dựa trên thời gian phản hồi của truy vấn `SELECT 1`:
- **Healthy (`connected: true`):** `latencyMs < 100ms`.
- **Degraded (`connected: true`):** `100ms <= latencyMs < 1000ms`.
- **Unhealthy (`connected: true` hoặc `false`):** `latencyMs >= 1000ms` hoặc xảy ra lỗi kết nối Socket/PostgreSQL.
- Response payload bắt buộc luôn chứa đủ 5 trường:
  ```json
  {
    "status": "healthy" | "degraded" | "unhealthy",
    "latencyMs": 12,
    "database": "postgresql",
    "connected": true,
    "timestamp": "2026-08-24T10:00:00.000Z"
  }
  ```

### 2.3. Cải Tiến Cơ Chế Phục Hồi AI (Gemini Resilience & Non-Retryable Fast Fail)
1. **Lỗi Retryable (Thử lại có giới hạn):**
   - Mã HTTP: `429`, `503`, `UNAVAILABLE`, `RESOURCE_EXHAUSTED`.
   - Thông điệp chứa: `high demand`, `overloaded`, `rate limit`, `quota`, `resource has been exhausted`.
   - Hành vi: Thử lại tối đa 2 lần với backoff theo từng model trong danh sách ưu tiên (`gemini-3.6-flash` $\rightarrow$ `gemini-3.7-flash` $\rightarrow$ `gemini-3.1-pro-preview`).
2. **Lỗi Non-Retryable (Dừng ngay lập tức - Fast Fail):**
   - Mã HTTP: `400` (Bad Request), `401`/`403` (Invalid Key/Permission), `404` (Model not found), `INVALID_ARGUMENT`.
   - Hành vi: **Không thực hiện retry**, không chuyển model tiếp theo, ngắt ngay lập tức và ném lỗi có cấu trúc để thông báo cho người dùng hoặc UI layer.

### 2.4. Khả Năng Quan Sát Có Cấu Trúc (Structured Observability)
Xây dựng helper ghi log chuẩn JSON (`logEvent(level, event, metadata)`):
- Ghi log khi server khởi động (kèm port, node env, trạng thái API Key).
- Ghi log cảnh báo khi cơ sở dữ liệu mất kết nối.
- Ghi log cảnh báo khi giao dịch Restore thất bại do Checksum Mismatch hoặc Schema Error.
- Ghi log khi Gemini chuyển sang model dự phòng hoặc cạn kiệt số lần thử lại.
- **Bảo mật:** Tuyệt đối không log `GEMINI_API_KEY`, chuỗi kết nối chứa mật khẩu database hoặc nội dung văn bản nhạy cảm của người dùng.

---

## 3. Ranh Giới Bất Biến (Invariants & Non-Goals)

1. **Zero Binary Ingestion:** Toàn bộ tài liệu tham khảo cục bộ chỉ lưu `filePath` metadata (< 2KB), không bao giờ đọc binary hay nhúng base64 vào DB/Snapshot/Handoff.
2. **Backward Compatibility:** Giữ nguyên vẹn 100% cấu trúc `BackupSnapshotSchema` Semver 2.x và thuật toán băm `calculateBackupChecksum` SHA-256.
3. **Fail-Fast Restore:** Restore luôn là Validation-First và Checksum-First. Không bao giờ kích hoạt rehydrate hay ghi đè state nếu payload không đạt chuẩn.
4. **Non-Goals:**
   - Không triển khai đồng bộ 2 chiều (two-way sync) với Obsidian.
   - Không gọi private API của Google NotebookLM hoặc Antigravity.
   - Không thêm cơ chế AI token billing giả lập khi chưa có hạ tầng proxy thực tế.

---

## 4. Đánh Giá Rủi Ro & Chiến Lược Giảm Thiểu

| Rủi ro tiềm ẩn | Mức độ | Biện pháp giảm thiểu |
| :--- | :---: | :--- |
| Rate limiting chặn nhầm thao tác hợp lệ | Thấp | Chỉ áp dụng cho 2 endpoint nhạy cảm (`/api/gemini/*` và `/api/backup/restore`); đặt hạn mức vừa đủ cho thao tác nghiên cứu của học giả. |
| Treo kết nối khi database latency cao | Cực thấp | Truy vấn health check có timeout ngắt sau 2.000ms và đánh dấu `unhealthy`. |
| Làm hỏng các bài test hiện hữu | Cực thấp | Tuân thủ nghiêm ngặt Test-First, chạy full regression sau mỗi thay đổi. |
