# Runbook: Research Provider Architecture Rollout & Rollback Guide

Tài liệu này hướng dẫn quy trình kiểm tra, bật tính năng (rollout) và hoàn tác (rollback) cho phân hệ **Research Provider Architecture** và **Internal Research MCP Facade** trong Knowledge OS.

---

## 1. No-Cloud & No-Credential Policy (Chính sách hiện tại)

> **QUAN TRỌNG**: Ở trạng thái hiện tại (Phase 5.1):
> 1. Không có bất kỳ kết nối mạng thực tế nào đến Google Cloud được kích hoạt.
> 2. Tuyệt đối không lưu trữ, commit hoặc truyền API keys/tokens thật vào codebase.
> 3. Toàn bộ kiểm thử và kiểm tra hoạt động dựa trên `MockNotebookLMClient` và fixture dữ liệu nội bộ.

---

## 2. Preconditions Before Rollout (Điều kiện tiên quyết)

Trước khi kích hoạt bất kỳ cờ tính năng nào hoặc chuyển giao sang môi trường thử nghiệm:

- [ ] Toàn bộ mã nguồn đã qua kiểm tra TypeScript compilation không có lỗi (`npm run typecheck`).
- [ ] 100% các bài test unit & contract pass hoàn toàn (`165/165 tests`).
- [ ] Không có file nào ngoài phạm vi được phép bị chỉnh sửa (`git status --porcelain`).
- [ ] Môi trường lưu trữ an toàn `SecureStorageResolver` được cấu hình với thư mục gốc hợp lệ và các đường dẫn symlink được xác minh an toàn.
- [ ] Hệ thống ghi log đảm bảo `stdout` chỉ nhận dữ liệu JSON-RPC và toàn bộ debug/error logs được chuyển sang `stderr`.

---

## 3. Verification Checklist (Danh mục kiểm tra trước khi kích hoạt)

| Bước | Lệnh kiểm tra | Kết quả kỳ vọng |
| :--- | :--- | :--- |
| 1. TypeScript Build | `npm run typecheck` | 0 errors |
| 2. Provider Unit Tests | `npx vitest run tests/unit/research-provider-contract.test.ts tests/unit/notebooklm-enterprise-provider.test.ts tests/unit/antigravity-provider-adapter.test.ts` | All PASS |
| 3. Storage & Registry Tests | `npx vitest run tests/unit/secure-storage-resolver.test.ts tests/unit/provider-registry.test.ts` | All PASS |
| 4. Orchestration & Persistence Tests | `npx vitest run tests/unit/research-orchestrator.test.ts tests/unit/research-orchestrator-persistence.test.ts tests/unit/research-persistence-port.test.ts` | All PASS |
| 5. Service Integration Tests | `npx vitest run tests/unit/research-session-service-provider-integration.test.ts` | All PASS |
| 6. MCP Facade Tests | `npx vitest run tests/unit/internal-research-mcp-server.test.ts` | All PASS |
| 7. Full Regression Tests | `npx vitest run` | All PASS |

---

## 4. Feature Flag Enable Sequence (Trình tự bật tính năng)

Khi tiến hành rollout từng bước trong ứng dụng:

```
[Mặc định: Toàn bộ tắt]
  │
  ├── BƯỚC 1: Bật ENABLE_RESEARCH_MCP_SERVER (Chỉ bật Internal Facade JSON-RPC cho tooling)
  │     └── Xác minh listTools() và get_status qua Stdio.
  │
  ├── BƯỚC 2: Bật ENABLE_PROVIDER_ROUTING (Bật routing qua ProviderRegistry)
  │     └── Provider mặc định vẫn là "antigravity-legacy".
  │
  └── BƯỚC 3: Bật ENABLE_NOTEBOOKLM_ENTERPRISE_PROVIDER (Cho phép chọn Enterprise Provider)
        └── Khi có credentials hợp lệ, cấu hình HttpNotebookLMClient.
```

---

## 5. Smoke Tests (Kiểm thử nhanh sau khi kích hoạt)

1. **Smoke Test MCP Dispatcher**:
   - Gửi yêu cầu JSON-RPC: `{"jsonrpc":"2.0","id":1,"method":"tools/list"}`
   - Xác minh response trả về đúng 5 tools: `research_create_workspace`, `research_ingest_sources`, `research_generate_audio`, `research_get_status`, `research_list_providers`.
   - Xác minh không có ký tự lạ nào xuất hiện trên `stdout`.

2. **Smoke Test Provider Listing**:
   - Gửi yêu cầu: `{"jsonrpc":"2.0","id":2,"method":"research_list_providers"}`
   - Nhận danh sách 2 providers: `notebooklm-enterprise` và `antigravity-legacy`.

3. **Smoke Test Session Service Execution**:
   - Khởi tạo session và gọi `startProviderResearchForSession`.
   - Kiểm tra `ResearchTimelineEvent` được tạo với `eventData.schemaVersion = 1` và `eventData.terminalStatus` tương ứng.

---

## 6. Failure Indicators (Dấu hiệu sự cố cần chú ý)

- **Stdout Pollution**: Có log dạng plain text hoặc exception stack trace in ra `stdout` làm hỏng JSON-RPC stream.
- **Credential Leak Warning**: Phát hiện chuỗi khóa (ví dụ `AIzaSy...`) trong log hoặc snapshot JSON.
- **Symlink / Traversal Violation**: Xuất hiện mã lỗi `STORAGE_ACCESS_DENIED` từ `SecureStorageResolver`.
- **Database Serialization Failure**: Lỗi parse JSON khi đọc `researchTimelineEvent.eventData`.

---

## 7. Rollback Procedure (Quy trình hoàn tác khẩn cấp)

Nếu phát hiện bất kỳ dấu hiệu sự cố nào trong quá trình thử nghiệm:

### Bước 1: Tắt Feature Flags ngay lập tức
Tắt các biến môi trường hoặc cấu hình:
```bash
export ENABLE_NOTEBOOKLM_ENTERPRISE_PROVIDER=false
export ENABLE_PROVIDER_ROUTING=false
export ENABLE_RESEARCH_MCP_SERVER=false
```

### Bước 2: Khôi phục mã nguồn (nếu có sự cố code)
Nếu cần đưa codebase về trạng thái nguyên bản trước khi tích hợp:
```bash
# Hoàn tác thay đổi service integration
git checkout HEAD -- src/server/services/researchSessionService.ts
```

### Bước 3: Xác minh trạng thái sau rollback
Chạy lại bộ test regression để đảm bảo hệ thống legacy hoạt động bình thường:
```bash
npx vitest run tests/unit/antigravity-*.test.* tests/unit/notebooklm-*.test.*
```

---

## 8. "Do Not Proceed If..." (Các điều kiện DỪNG BẮT BUỘC)

Nghiêm cấm tiếp tục triển khai hoặc chuyển phase nếu gặp bất kỳ điều kiện nào sau đây:
1. Có bất kỳ bài test nào trong 10 test suites của Research Provider bị fail hoặc bị skip không rõ lý do.
2. Có yêu cầu thay đổi `prisma/schema.prisma` hoặc tạo database migration mới mà chưa có ADR phê duyệt riêng.
3. Có code cố tình ghi log trực tiếp ra `console.log` trong luồng xử lý MCP mà không qua `stderr`.
4. Phát hiện mock client bị thay thế bằng production network client khi chưa có cơ chế quản lý secret an toàn.
