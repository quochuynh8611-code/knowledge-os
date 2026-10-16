# SPECIFICATION: NOTEBOOKLM DIRECT MCP UI-TO-BACKEND EXECUTION ALIGNMENT

- **Tài liệu**: `docs/specs/notebooklm-direct-mcp-ui-execution-alignment.md`
- **Phiên bản**: 1.0.0
- **Trạng thái**: Draft / In Alignment
- **Ngày**: 2026-10-16

---

## 1. Mục Đích & Bối Cảnh (Context & Purpose)

Sau khi kiểm tra UI-to-backend wiring của tính năng **Direct NotebookLM MCP Execution**, hệ thống đã ghi nhận 4 điểm lệch (mismatches) giữa Dashboard UI (`NotebookLMStudioModal.tsx`) và Backend Route (`POST /api/research-sessions/:sessionId/execute-live`):

1. **Khuyết nguồn tài liệu (Source Gap)**:
   - Nếu người dùng chuyển trực tiếp từ Bước 1 sang Bước 2 (Prompt) mà chưa bấm "Sao chép" hay "Tải file", `session.sourcePackages` trong cơ sở dữ liệu bị rỗng (`[]`).
   - UI không truyền `sources` hay `sourceIds` trong request body của `execute-live`, khiến Backend gửi `sources: []` sang NotebookLM MCP Server.
2. **Bỏ qua payload Flatten (Response Gap)**:
   - Backend HTTP 200 trả về payload flatten đầy đủ (`sessionId`, `artifactId`, `title`, `content`, `citedSourceIds`, `references`, `cleanupStatus`, `executionDurationMs`).
   - UI hiện tại bỏ qua dữ liệu này, tốn thêm 1 roundtrip network `syncSession` re-fetch từ cơ sở dữ liệu.
3. **Lệch mã lỗi và diễn giải (Error Mapping Gap)**:
   - UI gộp chung mọi mã `403` thành thông báo "gating flag OFF", bỏ qua trường hợp `403` do `AUTHENTICATION_FAILED` hoặc `PERMISSION_DENIED`.
   - UI chưa phân biệt theo mã lỗi `code` chuẩn hóa (`DIRECT_EXECUTION_DISABLED`, `AUTHENTICATION_FAILED`, `ORCHESTRATOR_UNAVAILABLE`, `PROVIDER_TIMEOUT`).
4. **Trải nghiệm thẩm định tức thì (Instant Review UX)**:
   - Khi có kết quả từ live execution, UI chưa tự động đưa artifact mới vào state thẩm định (`reviewingArtifact`) để người dùng có thể duyệt ngay kết quả.

---

## 2. Thiết Kế Chi Tiết (Detailed Design)

### 2.1. Nguồn Bắt Buộc Cho Live Execution (Mandatory Sources)

- **Nguyên tắc**: Live execution KHÔNG được phép chạy mù (không có tài liệu nguồn).
- **Phía Client (UI Pre-check)**:
  - Nếu `!sourceDocument || sourceDocument.trim().length === 0`:
    - Chặn nút thực thi live execution.
    - Hiển thị thông báo yêu cầu người dùng chuẩn bị tài liệu nguồn ở Bước 1.
- **Phía Request Payload**:
  - UI đóng gói tài liệu nguồn hiện tại và gửi kèm trong `overrideSources`:
    ```json
    {
      "promptArtifactType": "study_guide",
      "customInstructions": "string",
      "ephemeralWorkspace": true,
      "sources": [
        {
          "type": "inline-text",
          "sourceId": "client-source-<hash>",
          "title": "Tài liệu nguồn tổng hợp",
          "mimeType": "text/markdown",
          "textContent": "<sourceDocument>"
        }
      ]
    }
    ```
  - Backend route ưu tiên `overrideSources`. Nếu UI đã gửi nguồn trực tiếp, backend ingest ngay lập tức vào ephemeral workspace của NotebookLM. Đồng thời backend tự động đồng bộ snapshot nguồn này vào session nếu chưa có.

### 2.2. Tiêu Thụ Trực Tiếp Response Flatten (Direct Flatten Consumption)

- **Hợp Đồng HTTP 200 Flatten Response DTO**:
  ```typescript
  export interface DirectExecutionResponseDTO {
    sessionId: string;
    artifactId: string;
    artifactType: NotebookLMArtifactType;
    title: string;
    content: string;
    citedSourceIds: string[];
    citations?: Record<string, string>;
    references?: Array<{
      sourceId: string;
      citationNumber: number;
      citedText?: string;
      sourceTitle?: string;
    }>;
    cleanupStatus: 'CLEANED' | 'RETAINED';
    executionDurationMs: number;
  }
  ```
- **Hành Vi UI Khi Nhận HTTP 200**:
  1. Chuyển đổi payload flatten thành `GroundedArtifactDTO`:
     ```typescript
     const liveArtifact: GroundedArtifactDTO = {
       id: data.artifactId,
       sessionId: data.sessionId,
       topicId: currentTopic.id,
       artifactType: data.artifactType,
       title: data.title,
       rawContent: data.content,
       status: 'received',
       citationCount: data.citedSourceIds?.length || 0,
       sourcePackageVersion: currentSession.sourcePackages?.[0]?.version || 1,
       createdAt: new Date().toISOString(),
       metadata: {
         cleanupStatus: data.cleanupStatus,
         citedSourceIds: data.citedSourceIds,
         citations: data.citations,
         references: data.references,
         executionDurationMs: data.executionDurationMs,
       },
     };
     ```
  2. Nạp ngay `liveArtifact` vào danh sách `sessionArtifacts` của UI state.
  3. Mở sẵn `setReviewingArtifact(liveArtifact)` nếu người dùng cần xem xét ngay lập tức.
  4. Chuyển sang Bước 3 (`setActiveStep('results')`).
  5. Kích hoạt `syncSession(currentTopic.id)` như một tiến trình ngầm (secondary reconciliation) để bảo đảm tính nhất quán với database, nhưng **không khóa luồng hiển thị**.

### 2.3. Bảng Ánh Xạ Lỗi Chuẩn Hóa Theo Error Code (Error Mapping Table)

| HTTP Status | Error Code (`data.code`) | Thông Báo Hiển Thị Trên UI |
| :--- | :--- | :--- |
| **403 Forbidden** | `DIRECT_EXECUTION_DISABLED` | 🔒 Tính năng Khảo cứu trực tiếp qua MCP chưa được kích hoạt trên hệ thống (Gating: NOTEBOOKLM_DIRECT_EXECUTION=false). Bạn có thể tiếp tục bằng cách bấm "Chuẩn bị Handoff Antigravity". |
| **403 Forbidden** | `AUTHENTICATION_FAILED` hoặc `PERMISSION_DENIED` | 🔑 Xác thực NotebookLM thất bại hoặc phiên đăng nhập hết hạn. Vui lòng kiểm tra cấu hình cookie hoặc chạy `nlm login`. |
| **404 Not Found** | `SESSION_NOT_FOUND` | ⚠️ Phiên nghiên cứu không tồn tại hoặc đã bị xóa. Vui lòng tải lại trang. |
| **409 Conflict** | `INVALID_SESSION_STATE` | ⚠️ Trạng thái phiên nghiên cứu không hợp lệ để thực thi khảo cứu trực tiếp. |
| **502 Bad Gateway** / **503 Unavailable** | `ORCHESTRATOR_UNAVAILABLE` hoặc `PROVIDER_UNAVAILABLE` | ⚙️ Dịch vụ điều phối NotebookLM MCP hiện không khả dụng. Vui lòng thử lại sau hoặc dùng Handoff Antigravity. |
| **503 Gateway Timeout** | `PROVIDER_TIMEOUT` | ⏱️ Yêu cầu khảo cứu trực tiếp vượt quá thời gian phản hồi (timeout). Vui lòng thử lại với tài liệu ngắn hơn. |
| **Network Error / Client Timeout** | (Client Exception) | 🌐 Lỗi kết nối khi gửi yêu cầu khảo cứu trực tiếp. Vui lòng kiểm tra mạng và thử lại. |

---

## 3. Secondary Reconciliation (Hòa Giải Ngầm)

- **Nguyên lý độc lập**: Trải nghiệm UI không phụ thuộc vào độ trễ của database query roundtrip.
- Khi direct render thành công:
  - Artifact hiển thị ngay trên UI Locker.
  - Gọi ngầm `syncSession(currentTopic.id).catch(console.warn)`.
  - Khi `syncSession` trả về: Hợp nhất (merge/dedup) các artifact từ DB với artifact vừa render trực tiếp, tránh trùng lặp qua `artifactId`.

---

## 4. Phạm Vi & Ranh Giới (Non-goals & Blast Radius)

### 4.1. Non-goals (Không thuộc phạm vi)
- Không thay đổi default provider (`notebooklm-enterprise` hoặc cấu hình bootstrap).
- Không gỡ bỏ hoặc làm ảnh hưởng luồng offline Antigravity Handoff.
- Không sửa đổi database schema Prisma.
- Không thực hiện bất kỳ lệnh gọi live nào ra ngoài server Google NotebookLM trong quá trình sửa mã nguồn.

### 4.2. Blast Radius (Bán kính tác động)
- **Giới hạn strictly trong UI component layer**:
  - `src/components/integrations/NotebookLMStudioModal.tsx`
  - `src/components/integrations/notebooklm/NotebookLMPromptStep.tsx` (nếu cần tinh chỉnh validation prop)
  - `src/components/integrations/notebooklm/types.ts`
- **Tác động tới luồng khác**: 0. Tất cả các luồng khác (Thủ công, CLI command, Antigravity Handoff, Markdown import) được bảo toàn nguyên vẹn 100%.
