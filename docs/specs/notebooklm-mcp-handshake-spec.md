# Spec — NotebookLM MCP Handshake Lifecycle

## 1. Bối cảnh

Adapter NotebookLM hiện tại khởi tạo stdio process và gửi trực tiếp JSON-RPC request nghiệp vụ như `tools/call`, nhưng chưa có bằng chứng rằng transport đã thực hiện đầy đủ lifecycle handshake của Model Context Protocol (MCP). Từ việc đọc implementation hiện tại, `StdioMcpTransport.connect()` chỉ `spawn` process, gắn luồng `stdout`/`stderr`, và không gửi `initialize`; trong khi `NotebookLMMcpClient.checkReadiness()` gọi ngay `tools/call` với tool `server_info` sau `connect()`. [cite:3][cite:4][cite:5]

Khoảng trống này tạo ra một rủi ro kiến trúc: nếu server MCP phía Python yêu cầu strict initialize-first semantics, mọi lời gọi `tools/list` hoặc `tools/call` trước handshake có thể bị từ chối, treo timeout, hoặc làm sai lệch readiness signal. [cite:3][cite:4][cite:5]

## 2. Mục tiêu

- Thiết lập đặc tả hành vi thống nhất cho lifecycle MCP stdio theo hướng initialize-first.
- Định nghĩa rõ state machine, invariants, failure behavior, và readiness gating.
- Tạo nền cho integration tests kiểu test-first với fake MCP server.
- Giảm phụ thuộc vào giả định ngầm ở runtime bằng hợp đồng hành vi có thể kiểm chứng.

## 3. Phi mục tiêu

- Không thay đổi business semantics của các tool NotebookLM như `server_info`, `notebook_create`, `source_add`, `notebook_query`.
- Không triển khai browser automation, cloud API bridge, hay cơ chế xác thực NotebookLM mới.
- Không tối ưu hiệu năng ngoài phạm vi lifecycle handshake của transport/client.

## 4. Thuật ngữ

- **Transport**: lớp quản lý tiến trình stdio MCP và JSON-RPC framing.
- **Handshake**: chuỗi `initialize` request, `initialize` response, và `notifications/initialized` notification.
- **Initialized**: trạng thái mà sau đó client được phép gửi request nghiệp vụ như `tools/list` hay `tools/call`.
- **Readiness**: kết quả kiểm tra khả năng phục vụ của NotebookLM MCP sau khi handshake hợp lệ.

## 5. Hợp đồng hành vi

### 5.1 State machine

Transport phải tuân theo state machine sau:

- `DISCONNECTED`: chưa spawn process hoặc process đã chết.
- `CONNECTING`: đang spawn process và chuẩn bị luồng IO.
- `PROCESS_READY`: process sống, stdio writable/readable, nhưng handshake chưa hoàn tất.
- `INITIALIZING`: đã gửi `initialize` và đang chờ response hợp lệ.
- `INITIALIZED`: đã nhận `initialize` response hợp lệ và đã gửi `notifications/initialized`.
- `READY`: có thể phục vụ request nghiệp vụ.
- `CLOSED`: transport đã đóng có chủ đích và từ chối request mới.

Chuyển trạng thái chuẩn:

1. `DISCONNECTED -> CONNECTING` khi `connect()` được gọi.
2. `CONNECTING -> PROCESS_READY` khi child process và stream IO sẵn sàng.
3. `PROCESS_READY -> INITIALIZING` khi client gửi `initialize` đúng format.
4. `INITIALIZING -> INITIALIZED` khi nhận JSON-RPC response hợp lệ cho `initialize`.
5. `INITIALIZED -> READY` ngay sau khi client best-effort gửi `notifications/initialized`.
6. Bất kỳ trạng thái sống nào -> `DISCONNECTED` nếu process crash ngoài ý muốn.
7. Bất kỳ trạng thái nào -> `CLOSED` khi `close()` hoàn tất.

### 5.2 Handshake sequence

Khi một caller yêu cầu bất kỳ nghiệp vụ nào cần MCP, transport phải đảm bảo đúng chuỗi sau trước khi gửi request nghiệp vụ đầu tiên:

1. Spawn process stdio.
2. Gửi `initialize` request với `protocolVersion`, `capabilities`, và `clientInfo`.
3. Chờ `initialize` response có `jsonrpc: "2.0"`, `id` khớp, và `result` hợp lệ.
4. Gửi `notifications/initialized` notification theo cơ chế best-effort.
5. Chỉ sau đó mới cho phép `tools/list`, `tools/call`, hoặc các method nghiệp vụ khác.

### 5.3 Request gating

- Mọi request nghiệp vụ phải bị chặn cho tới khi handshake thành công.
- Nếu nhiều caller đồng thời gọi request khi transport chưa initialized, chỉ được có **một** handshake đang diễn ra; các caller còn lại phải await cùng một kết quả.
- Nếu handshake thất bại, mọi request đang chờ phải nhận cùng lỗi chuẩn hóa.

### 5.4 Idempotency

- `ensureInitialized()` phải idempotent trong một vòng đời process.
- Nếu transport đã ở `INITIALIZED` hoặc `READY`, không được gửi lại `initialize` lần hai.
- Nếu process chết và được spawn lại, handshake phải chạy lại từ đầu trên process mới.

## 6. Invariants bắt buộc

- Không bao giờ gửi `tools/call` trước `initialize` thành công.
- Không bao giờ đánh dấu readiness thành công nếu handshake chưa hoàn tất.
- Không bao giờ duy trì pending request sau khi process đã terminate.
- Không bao giờ cho phép `close()` để lại handshake promise treo.
- Mỗi process stdio sống tương ứng tối đa một handshake thành công.

## 7. Failure model

### 7.1 Nhóm lỗi

- **Process bootstrap failure**: binary không tồn tại, không executable, spawn lỗi.
- **Protocol timeout**: không nhận được `initialize` response trong thời gian cấu hình.
- **Malformed initialize response**: response không phải JSON-RPC 2.0 hợp lệ hoặc thiếu `result`.
- **Early process exit**: process đóng trước khi handshake hoàn tất.
- **Post-init request failure**: handshake thành công nhưng request nghiệp vụ lỗi.

### 7.2 Hành vi khi lỗi

- Mọi lỗi handshake phải được chuẩn hóa thành `NotebookLMClientError` với code phù hợp.
- Sau lỗi handshake, transport phải tự dọn pending state nội bộ để cho phép retry có kiểm soát ở lần gọi sau.
- Readiness API không được nuốt lỗi protocol nghiêm trọng thành trạng thái “ready giả”.

## 8. Tác động lên NotebookLMMcpClient

`checkReadiness()` không được tự giả định rằng `connect()` là đủ. Thay vào đó, lời gọi readiness phải dựa trên transport đã initialized rồi mới được gọi `tools/call(server_info)`. Điều này giữ cho readiness là một phép đo sau-handshake thay vì một side effect vừa connect vừa probe. [cite:5]

## 9. Gherkin scenarios

### Scenario 1 — Handshake thành công trước readiness

```gherkin
Given một NotebookLM MCP server chấp nhận chuẩn initialize-first
And transport đang ở trạng thái DISCONNECTED
When client gọi checkReadiness
Then transport phải spawn process
And transport phải gửi initialize trước mọi tools/call
And transport phải gửi notifications/initialized sau initialize response hợp lệ
And client mới được gọi tools/call với server_info
And kết quả readiness được suy ra từ response của server_info
```

### Scenario 2 — Direct tools/call trước initialize bị từ chối

```gherkin
Given một NotebookLM MCP server từ chối mọi tools/call trước initialize
And transport đang ở trạng thái DISCONNECTED
When client gọi request nghiệp vụ đầu tiên
Then transport không được gửi tools/call trực tiếp
And transport phải hoàn tất handshake trước
And request nghiệp vụ chỉ được phát đi sau khi transport INITIALIZED
```

### Scenario 3 — Handshake timeout

```gherkin
Given một MCP server nhận initialize nhưng không trả response
When transport bắt đầu handshake
Then transport phải fail với lỗi TIMEOUT hoặc PROTOCOL_ERROR phù hợp
And mọi caller đang chờ cùng handshake phải nhận lỗi đó
And transport không được đánh dấu READY
```

### Scenario 4 — Process chết trong handshake

```gherkin
Given transport đã spawn child process
And initialize đã được gửi
When child process thoát trước khi trả initialize response
Then transport phải reject handshake
And xóa toàn bộ pending requests liên quan
And trạng thái cuối cùng không được là INITIALIZED hoặc READY
```

### Scenario 5 — Concurrent callers dùng chung một handshake

```gherkin
Given transport chưa initialized
When hai caller đồng thời gọi request nghiệp vụ
Then chỉ một initialize request được gửi xuống stdio
And cả hai caller cùng chờ một handshake promise dùng chung
And sau khi handshake thành công cả hai request mới được xử lý tiếp
```

### Scenario 6 — Reconnect sau process restart

```gherkin
Given transport đã từng INITIALIZED thành công
And child process bị terminate ngoài ý muốn
When caller gửi request mới
Then transport phải spawn process mới
And transport phải handshake lại từ đầu
And không tái sử dụng trạng thái initialized của process cũ
```

## 10. Tiêu chí chấp nhận

- Có test chứng minh request đầu tiên luôn đi qua `initialize` trước khi `tools/*` được gửi.
- Có test chứng minh direct `tools/call(server_info)` không còn được phát ra trước handshake.
- Có test concurrent chứng minh không phát sinh nhiều `initialize` trùng lặp.
- Có test lỗi timeout / malformed response / process exit.
- `checkReadiness()` chỉ thành công sau khi transport initialized và `server_info` trả trạng thái hợp lệ. [cite:5]

## 11. Chiến lược kiểm thử

### 11.1 Integration tests ưu tiên

Dùng fake stdio MCP server để mô phỏng các profile sau:

- **Strict server**: reject `tools/*` trước `initialize`.
- **Lenient server**: vẫn accept direct call để chứng minh client mới không phụ thuộc hành vi nới lỏng.
- **Hung server**: treo ở bước `initialize`.
- **Malformed server**: trả response sai schema.
- **Crash server**: thoát ngay sau khi nhận `initialize`.

### 11.2 Assertion trọng tâm

- Thứ tự frame JSON-RPC thực tế đi qua stdio.
- Số lần `initialize` được gửi.
- Tình trạng resolve/reject của toàn bộ pending requests.
- Trạng thái nội bộ transport trước và sau reconnect.

## 12. Rollout notes

Thay đổi này là quyết định kiến trúc một chiều mức vừa: blast radius chủ yếu nằm ở transport/client layer, nhưng nếu làm đúng bằng test seam stdio thì khả năng rollback logic tương đối dễ. Triển khai nên đi theo thứ tự: spec -> ADR -> failing tests -> implementation -> regression matrix -> controlled rollout.
