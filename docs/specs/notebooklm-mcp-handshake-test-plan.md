# NotebookLM MCP Handshake Test Plan

- **Spec tham chiếu:** [`docs/specs/notebooklm-mcp-handshake-spec.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/notebooklm-mcp-handshake-spec.md)
- **ADR tham chiếu:** [`docs/adr/ADR-103-notebooklm-mcp-handshake-lifecycle.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/adr/ADR-103-notebooklm-mcp-handshake-lifecycle.md)
- **Khu vực kỹ thuật:** Stdio MCP Transport & NotebookLM Client Runtime Adapter
- **Trạng thái:** Active / Verified

---

## 1. Mục Tiêu Kế Hoạch Kiểm Thử

Kế hoạch này thiết lập ma trận kiểm thử tự động, hồ sơ giả lập server (fake server profiles), tiêu chí chuyển pha Đỏ/Xanh (Red/Green Criteria) và các lệnh xác minh bắt buộc nhằm bảo đảm:
1. `StdioMcpTransport` tuân thủ nghiêm ngặt **Initialize-First Lifecycle** theo chuẩn Model Context Protocol (MCP 2024-11-05).
2. Không bao giờ phát frame `tools/call` hay `tools/list` xuống stdio trước khi hoàn tất `initialize` và `notifications/initialized`.
3. Khả năng chống chịu trước các failure modes: server từ chối, timeout, process crash giữa chừng, và race condition giữa các concurrent callers.

---

## 2. Fake Server Profiles

Để kiểm thử cô lập trong unit test mà không phụ thuộc vào network hay cloud dependencies, `StdioMcpTransport` được ghép nối với các fake child process mô phỏng 5 hồ sơ hành vi của server MCP:

| Profile | Hành vi Mô phỏng | Kết quả Kỳ vọng ở Transport |
| :--- | :--- | :--- |
| **P1: Standard Strict Server** | Yêu cầu `initialize` trước; trả lời `initialize` hợp lệ, chấp nhận `notifications/initialized`, sau đó phản hồi `tools/*`. Nếu nhận `tools/*` trước khi handshake xong sẽ trả error `-32602`. | Transport hoàn tất handshake thành công, frame 1 là `initialize`, frame 2 là `notifications/initialized`, các tool calls sau đó được phục vụ bình thường. |
| **P2: Error / Reject Server** | Khi nhận `initialize`, lập tức trả về lỗi JSON-RPC (ví dụ code `-32600: Unsupported protocol version`). | `transport.connect()` bị reject với `NotebookLMClientError` (`PROTOCOL_ERROR`), `isAlive()` là `false`, không gửi thêm bất kỳ request nào. |
| **P3: Hung Server** | Nhận `initialize` nhưng treo vô hạn (không bao giờ đẩy dữ liệu vào `stdout`). | Sau `timeoutMs`, transport phát sinh lỗi `TIMEOUT`, reject connection promise, dọn dẹp timer và không để treo tiến trình. |
| **P4: Crash Server** | Thoát đột ngột (`close` / `exitCode !== 0`) ngay sau khi spawn hoặc ngay khi nhận `initialize`. | Transport bắt sự kiện `close`/`error`, reject handshake với mã lỗi `UNAVAILABLE`, dọn dẹp pending requests. |
| **P5: Concurrency / Delay Server** | Trì hoãn phản hồi `initialize` một khoảng thời gian ngắn (ví dụ 10-20ms) trong lúc nhiều caller đồng thời gọi `connect()`. | Transport gộp các caller vào chung 1 connection promise (`connectPromise`), chỉ gửi duy nhất 1 frame `initialize`, sau đó giải phóng toàn bộ caller. |

---

## 3. Test Matrix (Ma trận Kiểm thử)

| Mã Test | Kịch bản Kiểm thử | Profile Giả lập | Khẳng định Trọng tâm (Assertions) | Test Suite Tương ứng |
| :--- | :--- | :--- | :--- | :--- |
| **TM-01** | Handshake tuần tự hợp lệ | P1 (Strict) | Frame đầu tiên là `initialize` (id: 1, protocolVersion); Frame thứ hai là `notifications/initialized`; `isAlive() === true`. | `notebooklm-mcp-client.test.ts` (Test 18) |
| **TM-02** | Server từ chối `initialize` | P2 (Reject) | `transport.connect()` rejects với `NotebookLMClientError`; không treo; `isAlive() === false`. | `notebooklm-mcp-client.test.ts` (Test 19) |
| **TM-03** | Khử trùng lặp (Deduplication) khi nhiều caller gọi đồng thời | P5 (Delay) | `Promise.all([c.connect(), c.connect(), c.connect()])` chỉ gửi đúng 1 frame `initialize` duy nhất (`initCallCount === 1`). | `notebooklm-mcp-client.test.ts` (Test 20) |
| **TM-04** | Process close khi có in-flight pending requests | P4 (Crash) | Toàn bộ pending requests bị reject với mã lỗi `UNAVAILABLE`, timer được clear, không có unhandled rejection. | `notebooklm-mcp-client.test.ts` (Test 9, Test 17) |
| **TM-05** | Xử lý out-of-order response qua Correlation ID | P1 (Strict) | Gửi đồng thời req 1 và req 2; server trả resp 2 trước, resp 1 sau; mỗi promise nhận đúng payload theo `id`. | `notebooklm-mcp-client.test.ts` (Test 16) |
| **TM-06** | Re-throw lỗi timeout và unavailable trong `reconcileWorkspace` | P3 & P4 | Lỗi transport không bị nuốt thành `CONFIRMED_ABSENT`, caller nhận đúng exception gốc. | `notebooklm-mcp-client.test.ts` (Test 15) |
| **TM-07** | Idempotency của `close()` | Mọi profile | Gọi `close()` nhiều lần liên tiếp không văng ngoại lệ, tiến trình bị kill và `isAlive() === false`. | `notebooklm-mcp-client.test.ts` (Test 10) |
| **TM-08** | Lọc dữ liệu nhạy cảm (Secret Sanitization) | Error stream | Bearer tokens (`ya29...`) và Google API keys (`AIzaSy...`) trong stderr/error envelope bị thay thế bằng redaction tokens. | `notebooklm-mcp-client.test.ts` (Test 11) |
| **TM-09** | Tích hợp end-to-end với Provider Doanh nghiệp | InMemory | `NotebookLMEnterpriseProvider` gọi `healthCheck()` và `createWorkspace()` trơn tru qua `NotebookLMMcpClient`. | `notebooklm-mcp-client.test.ts` (Test 12) |
| **TM-10** | Smoke test với binary thực tế (Local Opt-in) | Real Binary | `/Users/mr.chem/.local/bin/notebooklm-mcp` phản hồi `initialize` -> `server_info` trả về `auth_status: "configured"`. | Manual / Diagnostic Script |

---

## 4. Tiêu Chí Chuyển Pha Đỏ/Xanh (Red/Green Criteria)

### A. Pha Đỏ (Red Criteria — Failing Verification)
- Một test case được coi là "Đỏ hợp lệ" khi:
  1. Mã nguồn production chưa có tính năng: ví dụ khi chưa có `performInitializeHandshake`, test assert số message gửi xuống `stdin >= 2` và fail với:
     `AssertionError: expected 0 to be greater than or equal to 2`.
  2. Test fail vì vi phạm đúng invariant của giao thức, không phải vì syntax error hay import error.

### B. Pha Xanh (Green Criteria — Passing Verification)
- Toàn bộ các tiêu chí sau phải thỏa mãn đồng thời:
  1. `tests/unit/notebooklm-mcp-client.test.ts` đạt **100% PASS** (20/20 tests).
  2. `tests/unit/notebooklm-client-contract.test.ts` đạt **100% PASS** (10/10 tests).
  3. Tất cả 7 test suites liên quan đến Provider/Orchestrator đạt **100% PASS** (105/105 tests).
  4. TypeScript typecheck (`tsc --noEmit`) đạt **0 errors**.
  5. `git diff --check` sạch hoàn toàn (không có trailing whitespace hay newline lỗi).

---

## 5. Lệnh Xác Minh Chuẩn Hóa (Verification Commands)

Các lệnh sau bắt buộc phải chạy theo đúng thứ tự trước khi nghiệm thu bất kỳ thay đổi nào liên quan đến MCP handshake:

```bash
# 1. Chạy suite kiểm thử đơn vị MCP Client & Transport
npx vitest run tests/unit/notebooklm-mcp-client.test.ts

# 2. Kiểm tra tính toàn vẹn kiểu dữ liệu
npx tsc --noEmit

# 3. Kiểm tra tính tương thích hợp đồng Client Pha 1
npx vitest run tests/unit/notebooklm-client-contract.test.ts

# 4. Kiểm tra toàn bộ 7 suite hồi quy Provider & Orchestration
npx vitest run \
  tests/unit/notebooklm-enterprise-provider.test.ts \
  tests/unit/research-provider-composition.test.ts \
  tests/unit/provider-registry.test.ts \
  tests/unit/research-orchestrator.test.ts \
  tests/unit/research-orchestrator-persistence.test.ts \
  tests/unit/research-provider-config.test.ts \
  tests/unit/research-session-routes-provider-diagnostics.test.ts

# 5. Kiểm tra định dạng diff và whitespace
git diff --check

# 6. Kiểm tra trạng thái git working tree
git status --short --branch
```
