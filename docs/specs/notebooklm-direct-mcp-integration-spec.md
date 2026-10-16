# Đặc Tả Kỹ Thuật: Direct NotebookLM MCP Integration (Tích Hợp Trực Tiếp MCP)

- **Trạng thái:** Implemented / Live-Verified / Citation-Provenance-Verified (2026-10-16)
- **Khu vực kỹ thuật:** Backend Orchestration / Provider Gating / MCP Stdio Transport / Dashboard UI Integration / Citation Provenance
- **Tài liệu tham chiếu:**
  - [`docs/specs/notebooklm-mcp-business-smoke-spec.md`](notebooklm-mcp-business-smoke-spec.md)
  - [`docs/specs/notebooklm-mcp-business-smoke-test-plan.md`](notebooklm-mcp-business-smoke-test-plan.md)
  - [`docs/specs/phase-f8-4-notebooklm-verified-status-source-of-truth.md`](phase-f8-4-notebooklm-verified-status-source-of-truth.md)
  - [`src/server/services/providers/notebooklmMcpClient.ts`](../../src/server/services/providers/notebooklmMcpClient.ts)
  - [`src/server/services/providers/researchOrchestrator.ts`](../../src/server/services/providers/researchOrchestrator.ts)
  - [`src/server/services/providers/notebooklmEnterpriseProvider.ts`](../../src/server/services/providers/notebooklmEnterpriseProvider.ts)
  - [`src/server/routes/researchSessionRoutes.ts`](../../src/server/routes/researchSessionRoutes.ts)

---

## 1. Mục Tiêu & Ranh Giới Kỹ Thuật

### 1.1. Mục Tiêu Cốt Lõi
Xây dựng chuỗi liên thông trực tiếp 2 chiều từ Dashboard UI tới Google NotebookLM thông qua Model Context Protocol (MCP):

```text
Dashboard UI (NotebookLMStudioModal Step 2 Prompt)
  │
  ▼ [POST /api/research-sessions/:id/execute-live]
Backend của phần mềm (Express Route & ResearchOrchestrator)
  │
  ▼ (JSON-RPC 2.0 over Stdio)
NotebookLM MCP Client/Transport (NotebookLMMcpClient)
  │
  ▼ (stdio process spawn)
NotebookLM MCP Server (/Users/mr.chem/.local/bin/notebooklm-mcp)
  │
  ▼ (Google Cloud gRPC / Web backend API)
Google NotebookLM
  │
  ▼ (answer + citedSourceIds + citations/references)
Response về Backend (Tự động lưu GroundedArtifact & ArtifactCitation)
  │
  ▼ (HTTP 200: Flatten Execution Result DTO)
Dashboard UI (Tự động chuyển sang Step 3: Hiển thị kết quả & Review Drawer)
```

### 1.2. Ranh Giới (Non-Goals & Safety Guardrails)
1. **Không mở cờ live mặc định:** Biến môi trường `NOTEBOOKLM_DIRECT_EXECUTION=true` bắt buộc phải có để mở khóa live execution trên server (fail-closed by default).
2. **Ephemeral-by-Default Lifecycle:** Mọi workspace tạo ra trong phiên khảo cứu trực tiếp đều mặc định là tạm thời (ephemeral). Khối `try ... finally` **bắt buộc** thực thi `notebook_delete` kèm `confirm: true` ngay sau khi query xong hoặc khi xảy ra lỗi.
3. **Anti-False-Positive & Provenance Invariants:** Tuyệt đối không chấp nhận câu trả lời rỗng hoặc fallback ID ngụy tạo (`nlm-src-*`, `op-audio-*`). Nếu MCP không trả citation, không fallback về input sourceIds.
4. **Khử nhạy cảm Secret:** Tuyệt đối không để rò rỉ token `ya29`, API keys hoặc cookie trong error payload hay server logs.

### 1.3. Đối Chiếu Bằng Chứng Đã Xác Minh (Claim & Evidence Reconciliation)
- **Binary MCP & Phiên bản:** Package `notebooklm-mcp-cli` phiên bản `0.7.0` (cài qua `uv tool` tại `/Users/mr.chem/.local/bin/notebooklm-mcp`).
- **Tier 0 Discovery (T0):** **FAILED** (Bằng chứng: `docs/session-logs/evidence/t0-discovery.json` ghi nhận `passed: false`, bước SMK-03 `server_info` lỗi token).
- **Tier 1 Live Smoke (T1):** **PASSED** (Bằng chứng: `docs/session-logs/evidence/t1-live-smoke.json` ghi nhận `passed: true`, chạy 26.8s hoàn tất toàn bộ chuỗi CRUD, Ingest, Query và dọn dẹp sạch sẽ `cleanupStatus: "CLEANED"`).
- **Phân định rõ ràng:** Tuyệt đối không gộp thành "Tier 0/Tier 1 PASS", mà ghi nhận chính xác: T0 discovery = FAILED, T1 live smoke = PASSED.
- **Direct Live Verification:** **PASSED** (1-shot live run qua backend route trên session `28d2014a-530a-4e73-bf91-6914d0f22eef`, 200 OK, latency 30.1s, cleanup CLEANED).
- **Citation Provenance Hardening:** **PASSED** (Bảo toàn raw citations, fail-fast missing ID, loại bỏ fallback/synthetic IDs, ánh xạ real caller source ID, 36/36 targeted tests GREEN).


---

## 2. Thiết Kế Hợp Đồng Giao Tiếp (Contract Design)

### 2.1. Hợp Đồng Mở Rộng Cho Provider (`ResearchProvider`)
Mở rộng interface `ResearchProvider` để hỗ trợ năng lực truy vấn khảo cứu trực tiếp (`query`):

```typescript
export interface ResearchQueryInput {
  remoteWorkspaceId: string;
  prompt: string;
  signal?: AbortSignal;
}

export interface ResearchQueryResult {
  answer: string;
  citedSourceIds: string[];
  rawEnvelope?: Record<string, unknown>;
}
```

- `NotebookLMEnterpriseProvider.query(params, context)`: Ủy quyền trực tiếp cho `NotebookLMClient.query(params)`.
- `NotebookLMMcpClient.query(params)`: Gửi lệnh JSON-RPC `tools/call` với `name: "notebook_query"`.

### 2.2. Hợp Đồng Điều Phối Trực Tiếp (`ResearchOrchestrator.executeDirectResearch`)
Bổ sung phương thức điều phối khép kín trong `ResearchOrchestrator`:

```typescript
export interface DirectResearchJobParams {
  workspaceTitle: string;
  sources: SourcePayload[];
  queryPrompt: string;
  preferredProviderId?: string;
  ephemeralWorkspace?: boolean; // default: true
  correlationId?: string;
}

export interface DirectResearchJobResult {
  providerId: string;
  workspaceId: string;
  answer: string;
  citedSourceIds: string[];
  sourceCount: number;
  cleanupStatus: "CLEANED" | "RETAINED" | "FAILED_DIRTY";
  attemptRecords: ProviderAttemptRecord[];
}
```

#### Quy Trình Điều Phối 5 Bước:
1. **Khởi tạo ngữ cảnh:** `createExecutionContext({ correlationId })`.
2. **Tạo Workspace:** `provider.createWorkspace({ topicTitle })`.
3. **Nạp Nguồn:** `provider.ingestSources({ remoteWorkspaceId, sources })` (MCP adapter tự động bật `wait: true` để chờ lập chỉ mục).
4. **Truy Vấn Nghiên Cứu:** `provider.query({ remoteWorkspaceId, prompt: queryPrompt })`.
5. **Dọn dẹp Bắt buộc trong `finally`:**
   - Nếu `ephemeralWorkspace !== false`: Gọi `provider.deleteWorkspace({ remoteWorkspaceId, confirm: true })`.
   - Cập nhật `cleanupStatus: "CLEANED"`.

---

## 3. Chính Sách Quản Lý Vòng Đời Workspace (Workspace Lifecycle)

| Loại hình | Mục đích | Chính sách Dọn dẹp | Định danh (Naming convention) |
| :--- | :--- | :--- | :--- |
| **Ephemeral (Mặc định)** | Khảo cứu 1-shot: Nạp nguồn $\rightarrow$ Prompt $\rightarrow$ Lấy bài viết $\rightarrow$ Xóa workspace Cloud | Xóa 100% trong khối `finally` của backend runner | `[RESEARCH-LIVE] YYYY-MM-DD-HHmmss-<uuid>` |
| **Persistent (Tùy chọn)** | Người dùng muốn giữ lại Notebook trên cloud để tiếp tục tra cứu trực tiếp trên web | Giữ lại workspaceId, lưu vào metadata của `ResearchSession` | `[KNOWLEDGE-OS] <Topic Title>` |

---

## 4. Thiết Kế & Hợp Đồng REST API Endpoint (Phase 2 & Phase 3 Verified)

### 4.1. Request Contract
```http
POST /api/research-sessions/:sessionId/execute-live
Content-Type: application/json

{
  "promptArtifactType": "study_guide",
  "customInstructions": "Tập trung phân tích...",
  "ephemeralWorkspace": true,
  "sources": [
    {
      "type": "inline-text",
      "sourceId": "src-custom-01",
      "title": "Tài liệu chuyên đề",
      "mimeType": "text/markdown",
      "textContent": "...",
      "contentHash": "..."
    }
  ]
}
```

### 4.2. Exact Response Contracts

#### Phản Hồi Thành Công (HTTP 200 — Payload Flatten):
```json
{
  "sessionId": "<session-id>",
  "artifactId": "<grounded-artifact-uuid>",
  "artifactType": "study_guide",
  "title": "STUDY_GUIDE: <topic>",
  "content": "<answer>",
  "citedSourceIds": ["<real-source-id>"],
  "citations": {
    "1": "<real-source-id>"
  },
  "references": [
    {
      "sourceId": "<real-source-id>",
      "citationNumber": 1,
      "citedText": "<quote>",
      "sourceTitle": "<source-title>"
    }
  ],
  "cleanupStatus": "CLEANED",
  "executionDurationMs": 30130
}
```
*Ghi chú hợp đồng:*
- Payload flatten, **không có** trường `success`.
- **Không có** object `artifact` lồng bên trong.
- Nội dung văn bản khảo cứu nằm ở trường `content`.
- Khi dọn dẹp thành công, `cleanupStatus` là `"CLEANED"`.

#### Phản Hồi Gating Bị Tắt (HTTP 403 Forbidden):
```json
{
  "error": "Tính năng khảo cứu trực tiếp qua NotebookLM MCP chưa được kích hoạt trên hệ thống (Gating: NOTEBOOKLM_DIRECT_EXECUTION is off)",
  "code": "DIRECT_EXECUTION_DISABLED"
}
```

### 4.3. Quy Tắc Provenance Trích Dẫn (Citation Provenance Rules)
1. **Fail-fast khi thiếu ID**: Lời gọi `source_add` nếu không trả về `source_id` hoặc `id` hợp lệ phải ném `NotebookLMClientError` với mã `MALFORMED_RESPONSE`.
2. **Không fallback ngầm về input sourceIds**: Khi MCP `notebook_query` không trích dẫn nguồn hoặc trả về mảng rỗng, `citedSourceIds` trả về `[]`, cấm tự động fallback về `params.sourceIds`.
3. **Loại bỏ Synthetic IDs**: Mọi ID mang tiền tố giả lập `nlm-src-*` bị loại bỏ dứt điểm cả ở cấp Client và cấp Orchestrator.
4. **Ánh Xạ Định Danh Thực (Real-ID Mapping)**: Orchestrator duy trì `remoteToRealSourceMap` để chuyển đổi toàn bộ `remoteSourceId` từ MCP sang `realSourceId` ban đầu của phiên nghiên cứu.
5. **Làm Giàu Tham Chiếu Nguồn (Title Enrichment)**: Mảng `references` được bổ sung `sourceTitle` từ `realSourceTitleMap`.
6. **Lưu Trữ Cơ Sở Dữ Liệu**:
   - `GroundedArtifact.metadata` lưu giữ đồng thời: `rawCitations` (gốc từ MCP), `citations` (đã map real ID), và `references`.
   - Mỗi phần tử trong `references` được ghi vào bảng `ArtifactCitation` (gồm `artifactId`, `markerIndex`, `sourceTitle`, `quote`).

### 4.4. Bằng Chứng Xác Minh Trực Tiếp (Live Verification Evidence)
- **Session Thử Nghiệm**: `28d2014a-530a-4e73-bf91-6914d0f22eef`
- **Dữ liệu Nguồn**: 1 tài liệu `inline-text` phi nhạy cảm về Cơ học lượng tử (Tiên đề hàm sóng & toán tử Hermite).
- **Kết quả 1-Shot**: HTTP 200, thời gian thực thi 30,130ms.
- **Trạng thái Dọn dẹp**: `cleanupStatus: "CLEANED"` (xóa workspace cloud thành công trong `finally`).
- **Lưu trữ Thành công**: Ghi nhận 1 bản ghi `GroundedArtifact` và 1 sự kiện `ResearchTimelineEvent` (`eventType: "direct_research_executed"`).
- **Kiểm thử Hồi quy & Đơn vị**: 56/56 unit tests PASS (4 suites trọng tâm).

### 4.5. Giới Hạn Kỹ Thuật Đã Biết (Known Limitations)
- **Hiện tượng Marker Không Kèm Reference**: Trong lần chạy live thực tế, câu trả lời do model sinh ra có chứa ký hiệu trích dẫn `[1]` trong text, nhưng upstream MCP tool trả về `sources_used: []` (và không có object `references`). Hệ thống tuân thủ nguyên tắc trung thực tuyệt đối: ghi nhận `citedSourceIds: []` và `references: []`, tuyệt đối không tự suy diễn hay chế tạo provenance nhân tạo.

---

## 5. Thiết Kế Trải Nghiệm Người Dùng (Giai đoạn 3 — Đã Triển Khai)

1. **Step 2 (Prompt Step):**
   - Nút hành động chính (Primary Action):
     `[ ✨ Khảo cứu trực tiếp bằng NotebookLM ]` (`data-testid="btn-execute-live-notebooklm"`).
   - Nút thứ cấp: `[ 📋 Chuẩn bị Handoff Antigravity ]` (`data-testid="btn-prepare-antigravity-handoff"`, bảo tồn luồng offline handoff).
2. **Trạng thái Thực thi (Live Progress & Gating Feedback):**
   - Khi đang thực thi: Vô hiệu hóa các nút điều hướng, hiển thị spinner và nhãn `Đang khảo cứu trực tiếp qua NotebookLM MCP...`.
   - Khi gating tắt hoặc lỗi: Hiển thị banner cảnh báo trực quan với thông điệp giải thích từ backend.
3. **Step 3 (Results Step):**
   - Tự động nhận kết quả từ backend DTO, chuyển bước sang Results step.
   - Hiển thị nhãn nguồn gốc: `Nguồn: NotebookLM Direct MCP`.
   - Mở sẵn `ArtifactReviewDrawer` cho phép người dùng đọc và nhấn nút 1-click import vào Notes hoặc Flashcards.
