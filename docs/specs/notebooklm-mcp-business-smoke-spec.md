# Đặc Tả Kỹ Thuật: NotebookLM MCP Business Operations Smoke Test (Phase 4)

- **Trạng thái:** Proposed / Awaiting Human Approval
- **Khu vực kỹ thuật:** NotebookLM Direct MCP Runtime Adapter / Smoke Verification
- **Tài liệu liên quan:**
  - [`docs/adr/ADR-103-notebooklm-mcp-handshake-lifecycle.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/adr/ADR-103-notebooklm-mcp-handshake-lifecycle.md)
  - [`docs/specs/notebooklm-mcp-handshake-spec.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/notebooklm-mcp-handshake-spec.md)
  - [`docs/specs/notebooklm-mcp-handshake-test-plan.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/notebooklm-mcp-handshake-test-plan.md)
  - [`src/server/services/providers/notebooklmClient.ts`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/server/services/providers/notebooklmClient.ts)
  - [`src/server/services/providers/notebooklmMcpClient.ts`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/server/services/providers/notebooklmMcpClient.ts)
  - [`src/server/services/providers/notebooklmMcpTransport.ts`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/server/services/providers/notebooklmMcpTransport.ts)

---

## 1. Mục Tiêu & Non-Goals

### 1.1. Mục Tiêu (Goals)
1. Xác minh tính tương thích thực tế giữa adapter `NotebookLMMcpClient` và binary NotebookLM MCP thật (`/Users/mr.chem/.local/bin/notebooklm-mcp`, v3.4.0) thông qua chuỗi thao tác nghiệp vụ có kiểm soát.
2. Kiểm chứng luồng nghiệp vụ end-to-end:
   - `initialize` -> `notifications/initialized`
   - `tools/list`
   - `server_info`
   - `notebook_create`
   - `source_add`
   - `notebook_query`
   - `notebook_get` (reconcile)
   - `notebook_delete` (cleanup bắt buộc)
3. Thiết lập hàng rào an toàn (Safety Guardrails) chống rò rỉ dữ liệu, chống phát sinh tài nguyên mồ côi (Orphan Workspaces) trên Google Cloud và ngăn chặn false-positive do cơ chế fallback ngầm.

### 1.2. Non-Goals
1. **Không kích hoạt Live Execution mặc định:** Cấu hình `DEFAULT_RESEARCH_PROVIDER_CONFIG` và `DEFAULT_RESEARCH_EXECUTION_POLICY` tuyệt đối không bị bật trong mã nguồn máy chủ.
2. **Không thay đổi Schema Cơ sở dữ liệu:** Không migration, không can thiệp Prisma schema hay bảng `ResearchSession`.
3. **Không tự động sinh mã hoặc chạy lệnh ghi:** Không tạo workspace trên cloud trong pha đặc tả này.
4. **Không nhúng Secret vào Codebase:** Mọi thông tin xác thực đều nạp qua session môi trường của CLI (`nlm login`), không hardcode cookie hay bearer token.

---

## 2. Ghi Nhận Phát Hiện Schema & Rủi Ro Hợp Đồng (Mandatory Findings)

Dựa trên kết quả thăm dò trực tiếp `tools/list` từ binary thật, các điểm sau đây là **bắt buộc** phải ghi nhận vào đặc tả:

1. **`studio_status` yêu cầu bắt buộc `notebook_id`:**
   - *Thực tế Server Schema:* `studio_status` khai báo `"required": ["notebook_id"]` và `"additionalProperties": false`.
   - *Hiện trạng Client:* Interface `NotebookLMClient.getOperationStatus(operationId)` và hàm `notebooklmMcpClient.ts:460` hiện chỉ truyền `{ action: "status", artifact_id: operationId }`, thiếu hoàn toàn `notebook_id`.
   - *Kết luận:* Lời gọi `studio_status` sẽ thất bại với mã lỗi `-32602` nếu không có context `workspaceId`.
2. **`studio_create` có cờ `confirm: boolean`:**
   - *Thực tế Server Schema:* `confirm` mặc định là `false` với mô tả `"Must be True after user approval"`.
   - *Hiện trạng Client:* Client hiện chỉ truyền `notebook_id`, `artifact_type`, `audio_format` mà chưa truyền `confirm: true`. Mọi luồng live sau này phải có approval trước khi set `confirm: true`.
3. **`source_add` hỗ trợ `wait` và `wait_timeout`:**
   - *Thực tế Server Schema:* `wait` mặc định là `false`. Nếu không chờ nguồn hoàn tất xử lý trên cloud, lệnh `notebook_query` gọi ngay sau đó sẽ thất bại do tài liệu chưa được lập chỉ mục (indexed).
   - *Quy tắc:* Không được giả định source đã sẵn sàng khi chưa có cơ chế polling hoặc cờ `wait: true`.
4. **Nguy cơ False-Positive từ Auto-Fallback ID:**
   - *Hiện trạng Client:* `notebooklmMcpClient.ts` đang có các nhánh fallback tự sinh:
     - Dòng 308: `sourceId = unpacked.source_id || unpacked.id || "nlm-src-" + source.sourceId`
     - Dòng 434: `operationId = unpacked.artifact_id || ... || "op-audio-" + Date.now()`
   - *Rủi ro:* Nếu server trả về kết quả rỗng hoặc cấu trúc lỗi, client tự sinh ID giả và báo status "COMPLETED" / trả operation ID giả, che giấu lỗi giao thức thật.
5. **Audio Overview phải xếp Tier 2 (Optional):**
   - Do điểm nghẽn thiếu `notebook_id` của `studio_status`, luồng Audio Overview không thể chạy thành công tự động ở Tier 1 mà phải xếp vào Tier 2 (Optional) cho đến khi interface contract được mở rộng seam.
6. **Cleanup bắt buộc bằng khối `try ... finally`:**
   - Mọi tiến trình tạo workspace trên Cloud bắt buộc phải bọc trong `try ... finally` để thực thi `notebook_delete` ngay cả khi xảy ra assertion failure hoặc timeout.

---

## 3. Phân Tầng Phạm Vi (Scope Tiers)

Hệ thống smoke test được chia thành 3 cấp độ kiểm soát nghiêm ngặt:

| Cấp Độ | Tên Cấp Độ | Bản Chất Thao Tác | Side Effects trên Cloud | Điều Kiện Kích Hoạt |
| :--- | :--- | :--- | :--- | :--- |
| **Tier 0 (T0)** | **Read-Only Discovery** | Kiểm tra MCP handshake, `tools/list`, kiểm tra `server_info` (readiness). | **Không có (Zero)** | Chạy tự động trong CI sandbox hoặc local preflight. |
| **Tier 1 (T1)** | **Controlled Live Smoke** | Tạo 1 notebook tạm -> Ingest 1 inline text mẫu -> Query 1 câu -> Reconcile -> Xóa notebook. | **Tạm thời**, dọn dẹp sạch 100% trong `finally`. | **Bắt buộc Human Approval** + cờ `--live-sandbox`. |
| **Tier 2 (T2)** | **Optional Audio Smoke** | Gọi `studio_create` (Audio) -> Poll `studio_status` -> Xóa notebook. | **Tạm thời**, tiêu tốn quota Audio generation. | **Bắt buộc Human Approval** + cờ `--with-audio` (đang bị chặn bởi Schema mismatch). |

---

## 4. Hàng Rào An Toàn & Chính Sách Dữ Liệu (Safety & Data Policy)

### 4.1. Quy Tắc Định Danh Workspace (Naming Guardrail)
Mọi workspace tạo ra trong quá trình smoke test **bắt buộc** phải tuân thủ định dạng:
```text
[SMOKE-TEST] YYYY-MM-DD-HHmmss-<uuid-ngắn>
```
*Mục đích:* Giúp nhận diện lập tức các notebook do test sinh ra và phục vụ công cụ tự động dọn dẹp (orphan sweeper).

### 4.2. Chính Sách Dữ Liệu Thử Nghiệm (Test-Data Policy)
- Chỉ sử dụng văn bản giả lập (synthetic text), trung tính về mặt nội dung, dung lượng < 500 ký tự.
- *Ví dụ mẫu:*
  > `"Knowledge OS Architecture Verification: This document validates the NotebookLM MCP runtime adapter capabilities including source ingestion and grounded semantic retrieval."`
- Tuyệt đối không upload file cá nhân, tài liệu bí mật, thông tin định danh (PII) hay API keys.

### 4.3. Chính Sách Dọn Dẹp Tài Nguyên Cloud (Cleanup Policy)
1. **Dọn dẹp Nội dòng (Inline Cleanup):** Khối `finally` gọi `deleteWorkspace({ workspaceId })` với tham số `confirm: true`.
2. **Xử lý Ngắt đột ngột (Process Interrupts):** Bắt các tín hiệu hệ thống `SIGINT`, `SIGTERM`, `uncaughtException` để kích hoạt lệnh xóa trước khi tiến trình tắt.
3. **Cơ chế Cứu hộ (Orphan Sweeper):** Cung cấp chế độ `--cleanup-only` quét toàn bộ notebook hiện có qua `notebook_list`, lọc các tiêu đề bắt đầu bằng `[SMOKE-TEST]` và tiến hành xóa dọn dẹp.

---

## 5. State Machine & Deadlines của Smoke Run

### 5.1. Máy Trạng Thái (State Machine)
```text
[IDLE]
  │
  ▼
[INITIALIZING] ──(Lỗi handshake/auth)──► [ABORTED_PREFLIGHT]
  │
  ▼
[DISCOVERING]  ──(Thiếu tools/server_info fail)──► [ABORTED_DISCOVERY]
  │
  ▼
[CREATING]     ──(Lỗi tạo workspace)──► [FAILED_CREATION]
  │
  ▼
[INGESTING]    ──(Lỗi nạp source)──────┐
  │                                     │
  ▼                                     │
[QUERYING]     ──(Lỗi truy vấn)─────────┤
  │                                     │
  ▼                                     │ (Kích hoạt Cleanup bắt buộc)
[RECONCILING]  ──(Lỗi đối chiếu)────────┤
  │                                     │
  ▼                                     │
[CLEANING_UP]  ◄────────────────────────┘
  │
  ├─► [SUCCESS_CLEANED]
  └─► [FAILED_DIRTY] (Cảnh báo đỏ: Còn orphan workspace trên Cloud)
```

### 5.2. Thời Gian Chờ (Timeouts & Deadlines)
- Handshake `initialize`: Tối đa **10 giây**.
- Lệnh gọi `server_info`: Tối đa **10 giây**.
- Lệnh gọi `notebook_create`: Tối đa **30 giây**.
- Lệnh gọi `source_add` (kèm wait): Tối đa **60 giây**.
- Lệnh gọi `notebook_query`: Tối đa **60 giây**.
- Lệnh gọi `notebook_delete`: Tối đa **30 giây**.
- Tổng thời gian toàn bộ chuỗi T1: Tối đa **180 giây**.

---

## 6. Phân Loại Lỗi (Error Taxonomy)

| Mã Phân Loại | Ý Nghĩa Kỹ Thuật | Hành Động Xử Lý |
| :--- | :--- | :--- |
| `PREFLIGHT_AUTH_MISSING` | `auth_status !== "configured"` (stale, not_configured) | Hủy test ngay lập tức, hướng dẫn operator chạy `nlm login`. |
| `SCHEMA_DRIFT_ERROR` | Server MCP trả về lỗi `-32602` do sai trường dữ liệu | Ghi nhận lỗi schema drift, không cố gửi lại, báo cáo sửa client. |
| `INGEST_PROCESSING_TIMEOUT` | Nguồn thêm vào quá thời gian chờ xử lý trên Cloud | Kích hoạt cleanup xóa notebook, đánh dấu FAIL bước ingest. |
| `QUERY_UNGROUNDED_ERROR` | Query không trả về câu trả lời hoặc không trích dẫn nguồn | Đánh dấu FAIL bước query, tiến hành cleanup. |
| `CLEANUP_FAILURE_ALERT` | Không thể xóa notebook sau khi test xong | Báo động đỏ, in rõ `workspaceId` để operator xóa thủ công hoặc chạy sweeper. |

---

## 7. Kịch Bản Kiểm Thử Gherkin

### Scenario 1: T0 — Initialize + tools/list + server_info (Đã Xác Minh Contract)
```gherkin
Given binary NotebookLM MCP khả dụng tại đường dẫn cấu hình
And cờ skipInitialize là false
When transport thực hiện connect()
Then frame đầu tiên gửi đi phải là "initialize" và frame thứ hai là "notifications/initialized"
When client yêu cầu "tools/list" và "server_info"
Then danh sách tools phải chứa: server_info, notebook_create, source_add, notebook_query, notebook_get, notebook_delete, studio_create, studio_status
And kết quả server_info trả về status="success" và auth_status="configured"
And không có bất kỳ notebook nào được tạo mới trên Cloud
```
*(Trạng thái: Contract đã được chứng minh bằng runtime proof thực tế).*

---

### Scenario 2: T1 — Create -> Ingest -> Query -> Reconcile -> Delete (Cần Runtime Proof)
```gherkin
Given môi trường đạt chuẩn T0 và được người dùng phê duyệt chạy T1
When client gọi createWorkspace với title "[SMOKE-TEST] Verification Run"
Then server trả về workspaceId hợp lệ dạng UUID (không phải ID ngụy tạo)
When client gọi ingestSources với 1 inline text source
Then server trả về remoteSourceIds hợp lệ và status="COMPLETED"
When client gọi query với câu hỏi liên quan đến nội dung vừa nạp
Then server trả về answer không rỗng và citedSourceIds chứa sourceId vừa nạp
When client gọi reconcileWorkspace với expectedSources
Then kết quả đối chiếu phải là "CONFIRMED_PRESENT"
When client gọi deleteWorkspace với workspaceId vừa tạo
Then server thực thi thành công và trả về true
And khi gọi reconcileWorkspace lại trên workspaceId đó thì phải trả về "CONFIRMED_ABSENT"
```
*(Trạng thái: Cần runtime proof trong sandbox).*

---

### Scenario 3: T1 — Cleanup khi Ingest hoặc Query Thất Bại (Cần Runtime Proof)
```gherkin
Given một notebook thử nghiệm đã tạo thành công với workspaceId cụ thể
When bước ingestSources hoặc query bị timeout hoặc ném lỗi ngoại lệ
Then khối finally bắt buộc phải gọi deleteWorkspace(workspaceId)
And lệnh notebook_delete phải được truyền confirm=true
And workspace thử nghiệm phải được xác nhận đã xóa sạch khỏi Cloud
And mã lỗi ban đầu được ném ra ngoài nguyên vẹn để báo cáo
```
*(Trạng thái: Cần runtime proof).*

---

### Scenario 4: Auth / Configuration Failure Không Được Phép Tạo Workspace (Đã Xác Minh Contract)
```gherkin
Given trạng thái xác thực chưa sẵn sàng (auth_status là "not_configured" hoặc "stale")
When client thực hiện checkReadiness()
Then client phải trả về isReady=false và status="UNAVAILABLE" hoặc "DISABLED"
And smoke runner lập tức dừng lại, từ chối gọi createWorkspace
And không có bất kỳ request tạo dữ liệu nào được phát sinh
```
*(Trạng thái: Contract logic đã được xác minh bằng unit test).*

---

### Scenario 5: Malformed Response Không Được Sinh ID Giả (Cần Chuẩn Hóa Contract)
```gherkin
Given server MCP trả về payload tools/call rỗng hoặc không chứa trường identifier
When client xử lý kết quả bóc tách envelope
Then client phải ném lỗi NotebookLMClientError với mã "MALFORMED_RESPONSE"
And client không được tự động sinh ID giả kiểu "nlm-src-..." hay "op-audio-..."
And luồng smoke test phải phát hiện và ghi nhận thất bại do sai cấu trúc dữ liệu
```
*(Trạng thái: Cần refactor loại bỏ auto-fallback trong tương lai).*

---

### Scenario 6: Optional Audio Flow & Blocker notebook_id (Cần Thiết Kế Lại)
```gherkin
Given client gọi generateAudioOverview(workspaceId, "brief")
When client gửi request studio_create
Then lệnh gọi phải truyền kèm confirm=true sau khi có human approval
When client thăm dò tiến trình qua getOperationStatus(operationId)
Then client phải truyền được cả notebook_id kèm theo action="status"
And nếu interface client chưa hỗ trợ notebook_id thì luồng này phải bị chặn và cảnh báo BLOCKER
```
*(Trạng thái: Đang bị chặn bởi giới hạn Schema của studio_status).*

---

## 8. Bảng Phân Định Hợp Đồng: Đã Xác Minh vs. Cần Runtime Proof

| Khoản Mục Hợp Đồng | Trạng Thái Hiện Tại | Cơ Sở Bằng Chứng |
| :--- | :--- | :--- |
| **Initialize-first Handshake** | **ĐÃ XÁC MINH** | Test 18, 19, 20 PASS; Live smoke probe với binary thật trả về `auth_status: configured`. |
| **Secret Sanitization** | **ĐÃ XÁC MINH** | Test 11 PASS; `sanitizeProviderErrorMessage` che giấu bearer token/API key trong stderr và error envelopes. |
| **Tên Công cụ Thực tế** | **ĐÃ XÁC MINH** | Lệnh `tools/list` trên binary thực tế trả về đúng 8 công cụ được map. |
| **Schema `notebook_delete`** | **ĐÃ XÁC MINH** | Binary thực tế yêu cầu `confirm: true`, adapter hiện tại đã gửi đúng. |
| **Tạo & Xóa Workspace Thật** | **CẦN RUNTIME PROOF** | Chưa từng gọi `notebook_create` và `notebook_delete` thật trên Cloud trong repo này. |
| **Nạp Inline Text & Indexing** | **CẦN RUNTIME PROOF** | Cần chứng minh `source_add` hoàn tất indexing trước khi `notebook_query` có thể trả lời. |
| **Độ chính xác Grounded Query** | **CẦN RUNTIME PROOF** | Cần chứng minh response envelope từ `notebook_query` trả về trường `answer` và `cited_sources` thực tế. |
| **Schema `studio_status`** | **ĐÃ XÁC MINH (BLOCKER)** | Binary thực tế yêu cầu `notebook_id`, adapter client hiện tại thiếu tham số này. |
