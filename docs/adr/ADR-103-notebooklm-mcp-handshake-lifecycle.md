# ADR-103 — NotebookLM MCP Handshake Lifecycle

- Status: Proposed
- Date: 2026-10-15
- Deciders: Product owner, runtime integration maintainer
- Technical area: NotebookLM provider / MCP stdio transport

## Bối cảnh

Implementation hiện tại của NotebookLM MCP adapter cho thấy `StdioMcpTransport.connect()` chỉ spawn process và thiết lập stream IO, nhưng không gửi MCP `initialize`; trong khi `NotebookLMMcpClient.checkReadiness()` gọi trực tiếp `tools/call(server_info)` ngay sau `connect()`. [cite:3][cite:4][cite:5]

Thiết kế này chỉ an toàn nếu MCP server chấp nhận direct tool invocation trước handshake. Hiện chưa có bằng chứng runtime trong repository xác nhận giả định đó, và vì vậy adapter đang phụ thuộc vào hành vi ngầm của server thay vì hợp đồng protocol được kiểm chứng. [cite:3][cite:4][cite:5]

## Quyết định

Áp dụng mô hình **initialize-first lifecycle** cho NotebookLM MCP transport.

Cụ thể:

1. Transport phải có cơ chế `ensureInitialized()` hoặc tương đương.
2. Request nghiệp vụ (`tools/list`, `tools/call`, các MCP method khác) chỉ được gửi sau khi handshake hoàn tất.
3. Handshake gồm đúng chuỗi: spawn process -> `initialize` request -> nhận `initialize` response hợp lệ -> gửi `notifications/initialized` -> mở cổng request nghiệp vụ.
4. `checkReadiness()` phải dựa trên transport đã initialized rồi mới gọi `server_info`. [cite:5]
5. Concurrent callers phải dùng chung một handshake promise để tránh duplicate `initialize` frames.

## Động lực quyết định

- Loại bỏ giả định protocol ngầm ở runtime.
- Đồng bộ hành vi adapter với lifecycle MCP chuẩn hóa.
- Giảm xác suất lỗi treo/timeout khó chẩn đoán ở bước readiness.
- Biến yêu cầu giao thức thành invariant có test thay vì comment hoặc prompt-level discipline.

## Các phương án đã cân nhắc

| Phương án | Mô tả | Ưu điểm | Nhược điểm |
|---|---|---|---|
| A. Initialize-first bắt buộc | Luôn handshake trước mọi request nghiệp vụ | Rõ ràng, deterministic, dễ test, phù hợp protocol | Cần refactor transport state |
| B. Lazy fallback | Thử direct `tools/call`, nếu fail mới handshake | Có thể tương thích với server kỳ quặc | Tăng nhánh trạng thái, khó test, readiness mơ hồ |
| C. Giữ nguyên hiện trạng | Chấp nhận direct tool call sau connect | Không cần sửa code trước mắt | Dựa vào giả định chưa được chứng minh, rủi ro protocol drift |

## Phương án được chọn

Chọn **A. Initialize-first bắt buộc**.

Lý do:

- Đây là phương án ít mơ hồ nhất.
- Nó thu hẹp blast radius nhận thức: mọi developer biết rằng “process sống” chưa đồng nghĩa với “MCP ready”.
- Nó cho phép viết integration test có tính xác minh tuyệt đối theo frame ordering.
- Nó phòng thủ tốt hơn nếu server Python trở nên strict hơn trong tương lai.

## Hệ quả kiến trúc

### Hệ quả tích cực

- Readiness semantics rõ ràng hơn: readiness là post-handshake probe thay vì mixed concern connect-plus-probe. [cite:5]
- Transport có state machine minh bạch, thuận lợi cho debugging và logging.
- Dễ xây regression tests cho reconnect, timeout, malformed response, concurrent calls.

### Hệ quả tiêu cực

- Tăng độ phức tạp nội bộ của transport do phải quản lý handshake promise và state transitions.
- Cần sửa test doubles / in-memory transport nếu các test hiện tại đang ngầm giả định không có handshake.
- Có khả năng lộ ra bug cũ bị che giấu bởi lenient behavior của server.

## Blast radius

Phạm vi ảnh hưởng trực tiếp:

- `src/server/services/providers/notebooklmMcpTransport.ts` [cite:3][cite:4]
- `src/server/services/providers/notebooklmMcpClient.ts` [cite:5]
- Bộ integration/unit tests liên quan transport/client
- Tài liệu vận hành và regression matrix nếu có

Phạm vi không nên bị ảnh hưởng trực tiếp:

- UI NotebookLM Studio
- Domain contract của NotebookLMClient
- Business flow ingest/query/audio ngoài readiness gating

## Hướng dẫn triển khai

1. Bổ sung state machine tường minh cho transport.
2. Tách `connect()` khỏi khái niệm “ready”; `connect()` chỉ đảm bảo process + IO.
3. Thêm `ensureInitialized()` làm cổng trước `request()` hoặc trước nhóm method nghiệp vụ.
4. Gửi `notifications/initialized` bằng `notify()` sau khi parse thành công `initialize` response. [cite:4]
5. Viết failing tests trước khi sửa implementation thực tế.
6. Bổ sung regression test cho reconnect và concurrent callers.

## Chỉ số thành công

- Không còn frame `tools/call(server_info)` nào xuất hiện trước `initialize` trong integration test traces.
- Tất cả scenario strict-server đều pass.
- Không tăng false positive readiness khi server không hoàn tất handshake.
- Reconnect sau crash vẫn hoạt động và handshake lại đúng một lần cho mỗi process mới.

## Quyết định mở

Các điểm cần xác nhận thêm bằng test seam runtime ngoài repository:

- Server `notebooklm-mcp` thực tế yêu cầu strict initialize-first hay chỉ khuyến nghị.
- Tool names thực tế từ `tools/list` có khớp hoàn toàn với mapping hiện tại hay không.
- Response schema của `initialize` từ binary production có khác gì so với fake server test hay không.

## Trạng thái tiếp theo

ADR này chỉ mở đường cho Bước 3: viết failing tests và implementation roadmap. Chưa nên sửa runtime production trước khi có evidence từ test seam stdio và bộ kiểm thử đỏ chứng minh khoảng trống hiện tại.
