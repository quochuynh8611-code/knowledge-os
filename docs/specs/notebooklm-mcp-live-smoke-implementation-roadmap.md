# Lộ Trình Triển Khai: NotebookLM MCP Live Smoke Runner (Phase 4 Roadmap)

- **Trạng thái:** Proposed / Awaiting Human Approval
- **Khu vực kỹ thuật:** NotebookLM Direct MCP Runtime / Live Verification Tooling
- **Tài liệu tham chiếu:**
  - [`docs/specs/notebooklm-mcp-business-smoke-spec.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/notebooklm-mcp-business-smoke-spec.md)
  - [`docs/specs/notebooklm-mcp-business-smoke-test-plan.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/notebooklm-mcp-business-smoke-test-plan.md)
  - [`docs/adr/ADR-103-notebooklm-mcp-handshake-lifecycle.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/adr/ADR-103-notebooklm-mcp-handshake-lifecycle.md)
  - [`tests/unit/notebooklm-mcp-smoke-runner.test.ts`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/tests/unit/notebooklm-mcp-smoke-runner.test.ts)

---

## 1. Bối Cảnh & Nền Tảng Đã Xác Lập (Baseline Context)

Trước khi kích hoạt thực thi trực tiếp (live execution) với binary hoặc Google Cloud, hệ thống đã hoàn thành đầy đủ 4 cột mốc kỹ thuật nền móng:

1. **Phase 1 (Commit `2cccceb`):** Chuẩn hóa và đóng băng interface `NotebookLMClient`, loại bỏ trôi dạt kiểu dữ liệu, xác lập 10/10 contract tests.
2. **Phase 2 (Commit `07f73e5`):** Hiện thực hóa adapter runtime `NotebookLMMcpClient` và `StdioMcpTransport` (hỗ trợ newline-delimited JSON-RPC, correlation ID, timeout, process abort, khử nhạy cảm lỗi, fail-safe gates).
3. **Phase 3 (Commit `06eb74d`):** Cưỡng chế chu trình bắt tay MCP chuẩn: `initialize` -> `notifications/initialized` trước mọi lệnh `tools/call`. Thăm dò trực tiếp binary thật (`v3.4.0`) qua `tools/list`, phát hiện và ghi nhận đầy đủ schema inputs.
4. **Phase 4 — Giai đoạn 1 & 2:**
   - Hoàn thành Đặc tả nghiệp vụ (`notebooklm-mcp-business-smoke-spec.md`) và Kế hoạch kiểm thử (`notebooklm-mcp-business-smoke-test-plan.md`).
   - Hoàn thành Test-First Runner Skeleton (`notebooklm-mcp-smoke-runner.test.ts`) với **14/14 unit tests PASS** trên `InMemoryMcpTransport`, chứng minh logic state machine, khối `finally` dọn dẹp, và bộ lọc khử nhạy cảm secret.

---

## 2. Mục Tiêu của Implementation Roadmap

Tài liệu này xác định các bước cụ thể nhằm:
1. Đưa `NotebookLmMcpSmokeRunner` từ phạm vi test skeleton ra thành công cụ CLI điều phối độc lập trong thư mục `scripts/smoke/`.
2. Duy trì nguyên tắc **Zero Blast Radius**: Không mở cờ live mặc định trong server chính (`DEFAULT_RESEARCH_PROVIDER_CONFIG` giữ nguyên trạng thái đóng).
3. Ngăn chặn tuyệt đối việc phát sinh tài nguyên mồ côi (Orphan Workspaces) trên Google Cloud và ngăn ngừa hiện tượng báo kết quả ảo (False-Positive) do cơ chế tự sinh ID fallback ngầm.
4. Thiết lập quy trình kiểm soát tuần tự theo tầng: **T0 Read-Only $\rightarrow$ Bằng Chứng Duyệt $\rightarrow$ T1 Live Thử Nghiệm $\rightarrow$ Hậu Kiểm**.

---

## 3. Kiến Trúc Bộ Điều Phối Live Smoke Runner

Bộ công cụ kiểm thử trực tiếp được thiết kế chia tách rõ ràng giữa Core Logic và CLI Entrypoint:

```text
scripts/smoke/
├── notebooklm-mcp-smoke-core.ts   # Logic điều phối smoke run (tái sử dụng từ Stage 2)
│                                  # - Không chứa hardcoded token/secret
│                                  # - Đảm bảo try ... finally cleanup
│                                  # - Bộ lọc regex redaction
│                                  # - Chặn schema Audio Tier 2
└── notebooklm-mcp-smoke.ts        # CLI Entrypoint thực thi qua npx tsx
                                   # - Phân tích tham số dòng lệnh strict
                                   # - Bắt tín hiệu ngắt SIGINT, SIGTERM
                                   # - Xuất evidence log chuẩn hóa
```

### 3.1. Các Chế Độ Chạy CLI Được Thiết Kế

| Cờ Dòng Lệnh | Mục Đích | Tác Động Cloud | Yêu Cầu An Toàn |
| :--- | :--- | :--- | :--- |
| `--tier0` | Kiểm tra bắt tay MCP, `tools/list`, và `server_info` (Read-only) | **Zero (Không có)** | Binary khả dụng, token đã cấu hình |
| `--dry-run` | Chạy kiểm tra giả lập toàn bộ chuỗi CRUD với fake transport | **Zero (Không có)** | Không cần binary hay network |
| `--tier1 --live-sandbox --confirm-live` | Chạy live smoke tạo 1 workspace tạm, nạp text, query, reconcile và xóa ngay trong `finally` | **Tạm thời**, giải phóng 100% trong `finally` | **Bắt buộc đủ cả 3 cờ** + Human Approval |
| `--cleanup-only` | Quét dọn khẩn cấp toàn bộ các workspace có tiền tố `[SMOKE-TEST]` còn sót | **Xóa dữ liệu thừa** | Chỉ xóa notebook có tiền tố thử nghiệm |

---

## 4. Hàng Rào An Toàn Bắt Buộc (Mandatory Safety Guardrails)

Mọi bước triển khai phải tuân thủ nghiêm ngặt 6 nguyên tắc an toàn:

1. **Cleanup Contract Bất Biến (Inline + Emergency Sweeper):**
   - Khối `try ... finally` bắt buộc bọc toàn bộ chu kỳ sống của `workspaceId`.
   - Lệnh xóa `deleteWorkspace({ workspaceId })` luôn gửi kèm `confirm: true`.
   - Tiến trình CLI đăng ký lắng nghe sự kiện `process.on("SIGINT")`, `process.on("SIGTERM")` và `process.on("uncaughtException")` để kích hoạt dọn dẹp khẩn cấp trước khi tiến trình kết thúc.
2. **Cấm Fallback ID Giả (Anti-False-Positive):**
   - Nếu server trả về kết quả rỗng hoặc kích hoạt nhánh tự sinh ID (`nlm-src-*` hoặc `op-audio-*`), runner lập tức đánh dấu thất bại với mã lỗi `ANTI_FALSE_POSITIVE_VIOLATION`.
3. **Khử Nhạy Cảm Bằng Chứng (Evidence Redaction Policy):**
   - Mọi log ghi ra console hoặc xuất ra file đều chạy qua `redactSmokeEvidence()`:
     - `Bearer ya29\.[a-zA-Z0-9_\-]+` $\rightarrow$ `Bearer [REDACTED_OAUTH]`
     - `AIzaSy[a-zA-Z0-9_\-]{33}` $\rightarrow$ `[REDACTED_API_KEY]`
     - `(SID|HSID|SSID|OSID)=...` $\rightarrow$ `[REDACTED_COOKIE]`
4. **Quy Tắc Định Danh Workspace (Naming Guardrail):**
   - Tiêu đề workspace bắt buộc bắt đầu bằng: `[SMOKE-TEST] YYYY-MM-DD-HHmmss-<shortUuid>`.
5. **Dữ Liệu Thử Nghiệm Tối Thiểu (Synthetic Only):**
   - Sử dụng văn bản mẫu kỹ thuật trung tính, độ dài < 500 ký tự. Không nạp tài liệu cá nhân, PII hay file `.epub`, `.pdf` lớn trong smoke test.
6. **Tier 2 Audio Vẫn Bị BLOCKED:**
   - Do công cụ `studio_status` của binary yêu cầu bắt buộc trường `notebook_id` nhưng interface `NotebookLMClient` hiện tại chưa truyền tham số này, luồng Audio Generation giữ nguyên trạng thái **BLOCKED** để tránh phát sinh mã lỗi `-32602`.

---

## 5. Roadmap Checklist Từng Giai Đoạn

```text
┌────────────────────────────────────────────────────────┐
│ Giai Đoạn 4A: Chuẩn Bị Code Skeleton & CLI Tooling     │ (Chưa gọi cloud)
└───────────────────────────┬────────────────────────────┘
                            ▼
┌────────────────────────────────────────────────────────┐
│ Giai Đoạn 4B: Thực Thi T0 Read-Only Discovery Probe    │ (Zero cloud mutation)
└───────────────────────────┬────────────────────────────┘
                            ▼
┌────────────────────────────────────────────────────────┐
│ Giai Đoạn 4C: Trình Duyệt Bằng Chứng T0 (Human Gate)   │ (Xin phép chạy T1)
└───────────────────────────┬────────────────────────────┘
                            ▼
┌────────────────────────────────────────────────────────┐
│ Giai Đoạn 4D: Thực Thi Có Kiểm Soát T1 Live Smoke      │ (Tạo & dọn sạch)
└───────────────────────────┬────────────────────────────┘
                            ▼
┌────────────────────────────────────────────────────────┐
│ Giai Đoạn 4E: Kiểm Toán Hậu Kiểm (Post-Execution Audit)│ (Đóng Phase 4)
└────────────────────────────────────────────────────────┘
```

### Checklist Chi Tiết Từng Bước

- [ ] **Bước 4A.1:** Tách `NotebookLmMcpSmokeRunner` thành module `scripts/smoke/notebooklm-mcp-smoke-core.ts`.
- [ ] **Bước 4A.2:** Tạo entrypoint CLI `scripts/smoke/notebooklm-mcp-smoke.ts` hỗ trợ `--tier0`, `--dry-run`, `--tier1`, `--cleanup-only`.
- [ ] **Bước 4A.3:** Viết unit test xác minh parser CLI argument (`tests/unit/notebooklm-mcp-smoke-cli.test.ts`).
- [ ] **Bước 4A.4:** Chạy kiểm tra `--dry-run` để đảm bảo script biên dịch và chạy trơn tru với fake transport.
- [ ] **Bước 4B.1:** Chạy lệnh T0 Read-Only Probe trên binary thật:
  ```bash
  npx tsx scripts/smoke/notebooklm-mcp-smoke.ts --tier0
  ```
- [ ] **Bước 4B.2:** Kiểm tra output T0: Xác nhận handshake thành công, 8/8 tools có mặt, `auth_status: configured`.
- [ ] **Bước 4B.3:** Lưu trữ evidence sạch đã qua redaction vào `docs/session-logs/evidence/t0-discovery.json`.
- [ ] **Bước 4C.1:** Báo cáo kết quả T0 lên User / System Owner.
- [ ] **Bước 4C.2:** Thu thập xác nhận bằng văn bản (Human Approval) cho phép thực thi T1 Live Sandbox.
- [ ] **Bước 4D.1:** Thực thi T1 Live Smoke có kiểm soát:
  ```bash
  NOTEBOOKLM_SANDBOX_PERMITTED=true npx tsx scripts/smoke/notebooklm-mcp-smoke.ts --tier1 --live-sandbox --confirm-live
  ```
- [ ] **Bước 4D.2:** Giám sát vòng đời: Tạo workspace $\rightarrow$ Ingest source $\rightarrow$ Query $\rightarrow$ Reconcile Present $\rightarrow$ Xóa trong `finally` $\rightarrow$ Reconcile Absent.
- [ ] **Bước 4D.3:** Lưu trữ evidence sạch đã qua redaction vào `docs/session-logs/evidence/t1-live-smoke.json`.
- [ ] **Bước 4E.1:** Chạy lệnh rà soát orphan workspaces:
  ```bash
  npx tsx scripts/smoke/notebooklm-mcp-smoke.ts --cleanup-only
  ```
  Xác nhận trả về: `cleanedCount: 0` (chứng minh khối `finally` đã dọn sạch 100%).
- [ ] **Bước 4E.2:** Chạy kiểm toán toàn diện `npm run lint` và bộ test 127/127 PASS.
- [ ] **Bước 4E.3:** Lập báo cáo nghiệm thu Phase 4.

---

## 6. Phân Tích Rủi Ro Kỹ Thuật Còn Lại (Remaining Risks & Mitigations)

| STT | Rủi Ro Kỹ Thuật | Tác Động Tiềm Ẩn | Biện Pháp Kiểm Soát & Giảm Thiểu (Mitigation) |
| :---: | :--- | :--- | :--- |
| **R-1** | **Google OAuth Token Hết Hạn Giữa Chừng** | Lệnh gọi `notebook_create` hoặc `source_add` bị từ chối với lỗi HTTP 401 / RPC `-32000`. | **Preflight Gate T0:** Bắt buộc kiểm tra `auth_status === "configured"`. Nếu token stale hoặc not_configured, runner lập tức dừng lại, yêu cầu operator chạy `nlm login`. |
| **R-2** | **Quá Hạn Chờ Xử Lý Nguồn (Ingest Timeout)** | Cloud mất nhiều thời gian hơn dự kiến để lập chỉ mục source văn bản, gây timeout lệnh `source_add`. | Đặt cờ `wait: true` và `wait_timeout: 120`. Nếu bước này timeout, khối `finally` lập tức hủy và xóa notebook, không để orphan workspace tồn tại. |
| **R-3** | **Tiến Trình Bị Ngắt Đột Ngột (SIGINT/SIGTERM)** | Người vận hành bấm `Ctrl+C` hoặc máy tính mất mạng ngay sau khi vừa tạo xong workspace. | Đăng ký process listeners bắt các tín hiệu thoát để gửi lệnh xóa khẩn cấp, đồng thời cung cấp lệnh cứu hộ `--cleanup-only`. |
| **R-4** | **Schema Mismatch `studio_status`** | Yêu cầu `notebook_id` trong schema server khiến lệnh thăm dò Audio bị lỗi `-32602`. | **Giữ nguyên trạng thái BLOCKED cho Tier 2 Audio** cho đến khi seam của client được cập nhật ở pha sau. |
| **R-5** | **Báo Cáo Thành Công Ảo (False-Positive)** | Client tự sinh ID fallback (`nlm-src-*`) khi server trả về schema lạ. | Bộ điều phối kiểm tra nghiêm ngặt prefix của ID trả về; nếu phát hiện fallback giả lập thì cưỡng chế FAIL ngay lập tức. |
| **R-6** | **Rò Rỉ Token Trong Log Bằng Chứng** | Authorization header hoặc cookie bị in nguyên văn ra terminal hoặc ghi vào file evidence. | Mọi output bắt buộc phải đi qua hàm `redactSmokeEvidence()`. Tuyệt đối không bật cờ `--debug` ở mức in raw network payload. |

---

## 7. Điều Kiện Tiên Quyết Để Xin Duyệt Live Execution (Go / No-Go Gate)

Trước khi đề xuất người dùng phê duyệt chạy live lệnh T1, **tất cả** các điều kiện sau phải được thỏa mãn (100% Green):

```text
[ ] ĐIỀU KIỆN 1: File Roadmap này được người dùng đánh giá và xác nhận thông qua.
[ ] ĐIỀU KIỆN 2: Script thực thi scripts/smoke/notebooklm-mcp-smoke.ts đã hoàn thiện cấu trúc và đạt 100% PASS trên chế độ --dry-run.
[ ] ĐIỀU KIỆN 3: Lệnh T0 Read-Only Discovery (--tier0) đã chạy thực tế trên binary, xác nhận:
                 - Handshake hoàn tất (protocolVersion: 2024-11-05).
                 - Đủ 8/8 tools cốt lõi.
                 - auth_status = "configured" (chứng thực Google còn hiệu lực).
[ ] ĐIỀU KIỆN 4: Toàn bộ 127 unit/integration tests hiện có của repository vẫn giữ trạng thái PASS.
[ ] ĐIỀU KIỆN 5: TypeScript check (npm run lint) đạt 0 lỗi.
[ ] ĐIỀU KIỆN 6: Người dùng nhập lệnh phê duyệt trực tiếp trong phiên hội thoại:
                 "Phê duyệt chạy Tier 1 Live Smoke Test NotebookLM MCP".
```
