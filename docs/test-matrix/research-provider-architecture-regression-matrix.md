# Ma Trận Kiểm Thử Hồi Quy: Research Provider Architecture & MCP Facade

Tài liệu này tổng hợp ma trận kiểm thử hồi quy (Regression Test Matrix) cho toàn bộ các phân hệ trong kiến trúc **Research Provider Architecture** và **Internal MCP Facade**.

---

## 1. Bảng Phân Bổ Ma Trận Kiểm Thử

| Phân hệ (Subsystem) | Tệp kiểm thử chính (Primary Test Files) | Danh mục hồi quy (Regression Category) | Các bất biến kỳ vọng (Expected Invariants) | Trạm kiểm soát (Owner / Checkpoint) |
| :--- | :--- | :--- | :--- | :--- |
| **1. Provider Contracts & Fixtures** | `tests/unit/research-provider-contract.test.ts`<br>`tests/fixtures/researchProviderFixtures.ts` | Contract Conformance & Polymorphism | - Mọi provider phải thỏa mãn contract `ResearchProvider`.<br>- Type guards phân biệt chính xác `text`, `file_ref`, `url`.<br>- Error taxonomy chuẩn hóa theo `ProviderException`. | Phase 3 Gate (26 tests) |
| **2. Secure Storage Boundary** | `tests/unit/secure-storage-resolver.test.ts` | Security & Path Sanitization | - Chặn tuyệt đối directory traversal (`../`).<br>- Chặn symlink trỏ ra ngoài thư mục gốc an toàn.<br>- Streaming SHA-256 hash chính xác mà không nạp toàn bộ file lớn vào bộ nhớ RAM.<br>- Chỉ chấp nhận MIME type và extension thuộc allowlist. | Phase 4.2 Gate (14 tests) |
| **3. Antigravity Adapter (Legacy)** | `tests/unit/antigravity-provider-adapter.test.ts` | Backward Compatibility | - Bọc 100% logic legacy mà không làm thay đổi `antigravityPipeline.ts`.<br>- CLI command manifest serialization đúng định dạng.<br>- Khai báo đúng capabilities (`supportsAudioOverview: false`). | Phase 4.3 Gate (17 tests) |
| **4. NotebookLM Enterprise Provider** | `tests/unit/notebooklm-enterprise-provider.test.ts` | Official API Boundary & Capability Gating | - Giữ ranh giới qua `NotebookLMClient`.<br>- Khóa chặt `supportsQuery: false`, `supportsInteractiveChat: false` cho đến khi có spec chính thức.<br>- Tự động sanitize thông điệp lỗi trước khi ném ngoại lệ. | Phase 4.4 Gate (20 tests) |
| **5. Provider Registry & Selection** | `tests/unit/provider-registry.test.ts` | Routing & Selection Policy | - Phân giải provider theo cấu hình và capability.<br>- Asymmetric fallback: cho phép `official -> legacy`; cấm `legacy -> official`.<br>- Trả về lỗi rõ ràng khi không có provider nào đáp ứng. | Phase 4.5 Gate (18 tests) |
| **6. Research Orchestrator** | `tests/unit/research-orchestrator.test.ts`<br>`tests/unit/research-orchestrator-persistence.test.ts` | Workflow Coordination & Atomic Steps | - Chuỗi thực thi nguyên tử: tạo workspace -> nạp source -> tạo audio.<br>- Thu thập đầy đủ `ProviderAttemptRecord`.<br>- Ghi nhận snapshot với `terminalStatus` chính xác (`COMPLETED` hoặc `FAILED`). | Phase 4.6 & 4.8 Gate (30 tests) |
| **7. Persistence Port** | `tests/unit/research-persistence-port.test.ts` | Data Integrity & Idempotency | - Lưu trữ và truy vấn snapshot theo `correlationId`.<br>- Serialization bất biến, không thất thoát metadata.<br>- Cổng độc lập sẵn sàng tích hợp database mà không cần migration schema. | Phase 4.7 Gate (10 tests) |
| **8. Service Layer Integration** | `tests/unit/research-session-service-provider-integration.test.ts` | Service Boundary & Event Storage | - Tích hợp orchestration vào `ResearchSessionService`.<br>- Ghi dữ liệu snapshot dạng JSON version 1 vào `researchTimelineEvent.eventData`.<br>- Cập nhật trạng thái session và `notebookId` an toàn. | Phase 5 Gate (18 tests) |
| **9. Internal MCP Facade** | `tests/unit/internal-research-mcp-server.test.ts` | Protocol Purity & Tool Dispatching | - Chuẩn JSON-RPC 2.0 (bắt buộc `jsonrpc: "2.0"`).<br>- Chỉ expose đúng 5 tools quy định.<br>- Fail-fast (-32004) khi gọi trực tiếp các bước đơn lẻ ngoài orchestration.<br>- `stdout` thuần khiết 100%, không lẫn log debug.<br>- Debug messages chuyển hướng đúng vào `stderr`. | Phase 4.9 Gate (12 tests) |

---

## 2. Tổng Hợp Số Lượng Kiểm Thử Nghiệm Thu

- **Tổng số test suites phân hệ Provider & MCP**: 10 suites
- **Tổng số test cases đã nghiệm thu**: **165 test cases (100% PASS)**
- **Số lượng test cases hồi quy legacy**: 127 test cases (100% PASS)
- **Lỗi biên dịch TypeScript (`tsc --noEmit`)**: **0 lỗi**

---

## 3. Quy Trình Kiểm Thử Tự Động Định Kỳ (CI Checkpoints)

Mỗi lần có thay đổi code liên quan đến tầng service hoặc routing, bắt buộc chạy theo thứ tự:
```bash
# 1. Typecheck toàn diện
npm run typecheck

# 2. Chạy toàn bộ test suites của Research Provider & MCP
npx vitest run tests/unit/internal-research-mcp-server.test.ts \
  tests/unit/research-session-service-provider-integration.test.ts \
  tests/unit/research-orchestrator-persistence.test.ts \
  tests/unit/research-persistence-port.test.ts \
  tests/unit/research-orchestrator.test.ts \
  tests/unit/provider-registry.test.ts \
  tests/unit/notebooklm-enterprise-provider.test.ts \
  tests/unit/antigravity-provider-adapter.test.ts \
  tests/unit/secure-storage-resolver.test.ts \
  tests/unit/research-provider-contract.test.ts

# 3. Chạy regression suite chung
npx vitest run tests/unit/antigravity-*.test.* tests/unit/notebooklm-*.test.*
```
