# ADR-082: Research Provider Architecture Hardening, Protocol Purity & Rollout Governance

- **Status**: Accepted / Implemented
- **Date**: 2026-09-24
- **Deciders**: Core Architecture Team, Backend Team
- **Context**: Bổ sung cơ chế Research Provider Architecture và Internal MCP Facade phục vụ tích hợp NotebookLM Enterprise API và kế thừa Antigravity CLI legacy.

---

## 1. Context (Bối cảnh)

Hệ thống Knowledge OS trước đây xử lý tác vụ nghiên cứu thông qua pipeline Antigravity CLI mang tính chất batch script cục bộ (`src/lib/antigravityPipeline.ts`). Để đáp ứng tiêu chuẩn doanh nghiệp, hệ thống cần hỗ trợ trực tiếp Google NotebookLM Enterprise API thông qua Provider Adapter Pattern, đồng thời duy trì khả năng fallback ngược về Antigravity CLI và cung cấp giao diện JSON-RPC 2.0 (Internal MCP Facade) chuẩn hóa qua Stdio.

Việc tích hợp này đòi hỏi bảo đảm an toàn dữ liệu, tính thuần khiết của giao thức (protocol purity), zero schema migrations, và zero credential leak.

---

## 2. Decision (Quyết định kiến trúc)

Chúng tôi thiết lập kiến trúc Research Provider đa tầng phân tách rõ ràng trách nhiệm:

1. **Contract & Error Layer**: `ResearchProvider` interface, `ProviderCapabilities`, `SourcePayload`, `ExecutionContext`, taxonomy `ProviderException` với cơ chế sanitize bắt buộc (bóc tách AIzaSy API keys, bearer tokens, private keys).
2. **Secure Storage Boundary**: `SecureStorageResolver` quản lý truy cập tệp an toàn (ngăn chặn directory traversal, symlink escape, stream hashing SHA-256, kiểm tra mime/ext allowlist).
3. **Provider Adapters**:
   - `AntigravityProvider`: Adapter bọc thuần logic legacy, chỉ hỗ trợ ingestion/query command manifest.
   - `NotebookLMEnterpriseProvider`: Adapter kết nối qua `NotebookLMClient` boundary, hỗ trợ notebook management, source ingestion, audio overview.
4. **Registry & Selection Policy**: `ProviderRegistry` quản lý cấu hình, giải quyết provider hợp lệ, áp dụng asymmetric fallback (`official` -> `legacy` cho phép; `legacy` -> `official` bị cấm).
5. **Orchestration & Persistence**:
   - `ResearchOrchestrator`: Điều phối chuỗi tác vụ nguyên tử (workspace creation -> source ingestion -> audio generation preflight & trigger) và thu thập `ProviderAttemptRecord`.
   - `ResearchPersistencePort`: Lưu trữ `ResearchExecutionSnapshot` qua in-memory port và adapter Prisma.
6. **Service Layer Integration**: `ResearchSessionService` tích hợp orchestration vào session lifecycle, lưu trữ snapshot phiên bản `schemaVersion: 1` bên trong trường JSON `researchTimelineEvent.eventData` hiện hữu.
7. **Internal MCP Facade**: `InternalResearchMcpServer` cung cấp dispatcher JSON-RPC 2.0 thuần túy, bảo đảm tuyệt đối stdout purity (stdout chỉ chứa JSON-RPC responses, debug/log đi vào stderr).

---

## 3. Completed Scope (Phạm vi đã hoàn tất)

| Hạng mục | Thành phần code | Test suites nghiệm thu | Trạng thái |
| :--- | :--- | :--- | :--- |
| Provider Contracts & Errors | `types.ts`, `errors.ts` | `research-provider-contract.test.ts` | Đã nghiệm thu (100% Pass) |
| Secure Storage Resolver | `secureStorageResolver.ts` | `secure-storage-resolver.test.ts` | Đã nghiệm thu (100% Pass) |
| Antigravity Adapter | `antigravityProvider.ts` | `antigravity-provider-adapter.test.ts` | Đã nghiệm thu (100% Pass) |
| NotebookLM Enterprise Provider | `notebooklmEnterpriseProvider.ts`, `notebooklmClient.ts` | `notebooklm-enterprise-provider.test.ts` | Đã nghiệm thu (100% Pass) |
| Provider Registry | `providerRegistry.ts` | `provider-registry.test.ts` | Đã nghiệm thu (100% Pass) |
| Research Orchestrator | `researchOrchestrator.ts` | `research-orchestrator.test.ts`, `research-orchestrator-persistence.test.ts` | Đã nghiệm thu (100% Pass) |
| Persistence Port | `researchPersistencePort.ts` | `research-persistence-port.test.ts` | Đã nghiệm thu (100% Pass) |
| Service Layer Integration | `researchSessionService.ts` | `research-session-service-provider-integration.test.ts` | Đã nghiệm thu (100% Pass) |
| Internal MCP Facade | `internalResearchMcpServer.ts` | `internal-research-mcp-server.test.ts` | Đã nghiệm thu (100% Pass) |

---

## 4. Explicitly Out of Scope (Phạm vi chưa triển khai)

- **HTTP Route Exposure**: Chưa thêm endpoint REST mới trong `src/server/routes/researchSessionRoutes.ts`.
- **MCP Stdio Process Bootstrap**: Chưa gắn `process.stdin` listener runtime trong tiến trình server.
- **Production Cloud Connectivity**: Chưa thực hiện network call thật hoặc inject credentials thật vào `HttpNotebookLMClient`.
- **UI Feature Rollout**: Chưa sửa đổi các React components trong `src/components/**`.
- **Prisma Schema Migration**: Tuyệt đối không thay đổi `schema.prisma`.

---

## 5. Provider Precedence & Selection Policy

1. **Explicit Request Precedence**: Nếu payload chỉ định `preferredProviderId`, hệ thống ưu tiên kiểm tra provider đó.
2. **Capability Precedence**: Provider được chọn phải đáp ứng đầy đủ yêu cầu (ví dụ: `supportsAudioOverview` khi có yêu cầu audio).
3. **Environment/Flag Precedence**: Nếu không chỉ định, provider mặc định được cấu hình trong `ProviderRegistryConfig.defaultProviderId` sẽ được chọn.
4. **Asymmetric Fallback Rule**:
   - Cho phép fallback từ `notebooklm-enterprise` (official) sang `antigravity-legacy` nếu provider chính gặp lỗi và task chỉ yêu cầu các tính năng legacy hỗ trợ (như ingestion).
   - Nghiêm cấm fallback từ `antigravity-legacy` sang `notebooklm-enterprise` để tránh phát sinh chi phí hoặc hành vi ngoài ý muốn.

---

## 6. Feature Flag Strategy

- Flag name dự kiến: `ENABLE_NOTEBOOKLM_ENTERPRISE_PROVIDER` (mặc định: `false`).
- Flag name dự kiến cho MCP Facade: `ENABLE_RESEARCH_MCP_SERVER` (mặc định: `false`).
- Nguyên tắc: Mọi thành phần mới hoạt động ở chế độ opt-in. Khi cờ tắt, hệ thống hoạt động 100% theo luồng legacy `antigravity-legacy`.

---

## 7. Error Taxonomy & Sanitization Summary

| Mã lỗi `ProviderErrorCode` | HTTP Status tương đương | JSON-RPC Code tương đương | Hành vi xử lý |
| :--- | :--- | :--- | :--- |
| `INVALID_ARGUMENT` | 400 | -32602 | Client sửa payload, không retry tự động |
| `CAPABILITY_UNSUPPORTED`| 422 | -32004 | Chọn provider khác hoặc tắt feature flag |
| `STORAGE_ACCESS_DENIED` | 403 | -32003 | Kiểm tra phân quyền file/path resolver |
| `RATE_LIMITED` | 429 | -32002 | Exponential backoff retry |
| `TRANSIENT_NETWORK_ERROR`| 503 | -32001 | Retry với jitter |
| `INTERNAL_ERROR` | 500 | -32603 | Ghi log stderr đã sanitize, fail-fast |

Tất cả thông điệp lỗi trước khi trả về client hoặc ghi log đều phải qua hàm `sanitizeProviderErrorMessage()` để triệt tiêu tokens/credentials.

---

## 8. Blast Radius & Door Decisions

### Blast Radius Analysis
- **Service Layer**: Cục bộ trong `researchSessionService.ts` qua 2 public methods mới `startProviderResearchForSession` và `getProviderExecutionSnapshot`. Các method cũ giữ nguyên 100%.
- **Database**: Không có migration. Dữ liệu snapshot được đóng gói dạng JSON event version 1 trong bảng `ResearchTimelineEvent`.
- **Legacy Pipeline**: `src/lib/antigravityPipeline.ts` và `src/lib/notebooklm.ts` không bị sửa đổi.

### One-Way Doors vs Two-Way Doors
- **Two-Way Doors (Reversible)**:
  - Tất cả Provider Adapters, Orchestrator, Storage Resolver, MCP Facade đều là các module rời độc lập.
  - Việc bật/tắt qua feature flag hoặc xóa bỏ các file mới không ảnh hưởng đến bất kỳ code cũ nào.
- **One-Way Doors (Cần thận trọng khi triển khai tương lai)**:
  - Thay đổi schema Prisma (nếu có sau này).
  - Đưa credentials thật vào môi trường production.

---

## 9. Rollback Strategy (Chiến lược hoàn tác)

Trong trường hợp cần rollback tức thời:
1. Đặt `ENABLE_NOTEBOOKLM_ENTERPRISE_PROVIDER=false`.
2. Đặt `ENABLE_RESEARCH_MCP_SERVER=false`.
3. Hoàn tác file `src/server/services/researchSessionService.ts` về commit trước đó nếu cần:
   ```bash
   git checkout HEAD~1 -- src/server/services/researchSessionService.ts
   ```

---

## 10. Consequences & Follow-up Phases

- **Tích cực**:
  - Hệ thống sẵn sàng kết nối chính thức với NotebookLM Enterprise API khi có credentials.
  - Có sẵn MCP facade chuẩn JSON-RPC 2.0 phục vụ tooling và AI agents qua stdio.
  - Đạt 100% test coverage trên toàn bộ 10 test suites mới (165 test cases).
- **Kế hoạch tiếp theo**:
  - Phase tiếp theo sẽ tập trung vào lộ trình: (1) REST Route wiring, (2) MCP Stdio runtime listener, hoặc (3) Application layer feature-flag wiring.
