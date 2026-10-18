# Session Log — NotebookLM Direct MCP Query Timeout Separation & Error Contract Hardening

## 1. Thông Tin Phiên Làm Việc (Session Metadata)

- **Dự án:** Knowledge OS — Dashboard Nghiên Cứu Phật Học & Huyền Học
- **Thư mục dự án:** `/Users/mr.chem/Documents/Lap-trinh/Dashboard-update`
- **Chủ đề:** Triển khai và xác minh toàn diện **Fix 1** (Route Error Code Mapping `PROVIDER_TIMEOUT`) và **Fix 2** (Granular Timeout Separation: Control-Plane 30s vs LLM Query Inference 90s) cho hạ tầng Direct NotebookLM MCP Integration.
- **Thời gian thực hiện:** 2026-10-16
- **Branch:** `main` (Đồng bộ hoàn toàn với `origin/main` tại commit `486c617`)
- **Vai trò:** Staff Software Engineer kiêm Technical Architect
- **Trạng thái:** ✅ **HOÀN THÀNH TOÀN DIỆN, ĐÃ COMMIT & PUSH ORIGIN/MAIN (Exit Code 0, 56/56 Tests PASS, Git Working Tree Clean)**.

---

## 2. Bối Cảnh & Vấn Đề Kỹ Thuật (Context & Root Cause)

### 2.1. Vấn đề 1 (UI Error Ambiguity)
- **Hiện tượng:** Khi runtime xảy ra lỗi timeout từ phía MCP tool của provider, frontend UI nhận được mã lỗi HTTP 503 chung với chuỗi text `error: "<sanitized error>"`, thiếu thuộc tính phân loại mã máy `code: "PROVIDER_TIMEOUT"`.
- **Yêu cầu:** Tuyến `POST /api/research-sessions/:sessionId/execute-live` phải trả rõ ràng `code: "PROVIDER_TIMEOUT"` khi `ProviderException.errorCode === "PROVIDER_TIMEOUT"`, trong khi vẫn giữ nguyên các mapping mã lỗi khác (`INVALID_ARGUMENT` -> 400, `PERMISSION_DENIED` -> 403, `PROVIDER_UNAVAILABLE` -> 503 không gán nhầm code).

### 2.2. Vấn đề 2 (Granular Timeout Separation)
- **Hiện tượng:** Toàn bộ các lời gọi công cụ MCP qua `StdioMcpTransport` và `NotebookLMMcpClient` đều áp dụng chung một mức timeout là 30.000ms. Thao tác LLM Inference (`notebook_query`) đòi hỏi thời gian suy luận ngữ cảnh sâu và tổng hợp văn bản từ nhiều nguồn tài liệu, dẫn đến việc request id 4 thường xuyên bị ngắt sớm do cạn 30.000ms (`timed out after 30000ms`).
- **Yêu cầu:**
  1. Tách biệt timeout điều khiển (control-plane) và timeout suy luận (inference plane).
  2. Handshake `initialize`, readiness `server_info`, và các thao tác CRUD (`notebook_create`, `source_add`, `notebook_delete`, `notebook_get`) duy trì ở 30.000ms.
  3. LLM inference `notebook_query` mặc định sử dụng 90.000ms.
  4. Hỗ trợ ghi đè timeout per-call tại request options.
  5. Đảm bảo `timeoutMs` chỉ được truyền qua transport options, tuyệt đối không được đưa vào `arguments` của công cụ `notebook_query`.
  6. Xử lý an toàn các giá trị cấu hình sai (`0`, số âm, `NaN`), không dùng toán tử `||` lỏng lẻo làm mất default an toàn.

---

## 3. Kiến Trúc & Chi Tiết Triển Khai (Implementation Details)

### 3.1. Route Error Contract Hardening (`src/server/routes/researchSessionRoutes.ts`)
- Tại bộ xử lý lỗi `catch (error: unknown)` của endpoint `POST /api/research-sessions/:sessionId/execute-live`:
  ```typescript
  if (
    error.errorCode === "PROVIDER_UNAVAILABLE" ||
    error.errorCode === "PROVIDER_TIMEOUT"
  ) {
    return res.status(503).json({
      error: sanitizedMessage,
      ...(error.errorCode === "PROVIDER_TIMEOUT"
        ? { code: "PROVIDER_TIMEOUT" }
        : {}),
    });
  }
  ```
- Đảm bảo tính bất biến: Không rò rỉ credential, token, stack trace hay internal error details.

### 3.2. Granular Timeout & Safe Validation (`src/server/services/providers/notebooklmMcpClient.ts`)
- **Helper chuẩn hóa an toàn:**
  ```typescript
  export function resolveTimeoutMs(candidate: unknown, fallbackMs: number): number {
    if (
      typeof candidate === "number" &&
      Number.isFinite(candidate) &&
      candidate > 0
    ) {
      return candidate;
    }
    return fallbackMs;
  }
  ```
- **Khởi tạo Client:**
  - `this.defaultTimeoutMs = resolveTimeoutMs(options.requestTimeoutMs, 30000);`
  - `this.queryTimeoutMs = resolveTimeoutMs(options.queryTimeoutMs, 90000);`
- **Thực thi `query()`:**
  - `const effectiveTimeoutMs = resolveTimeoutMs(params.timeoutMs, this.queryTimeoutMs);`
  - `arguments` của tool `notebook_query` chỉ chứa `{ notebook_id, query, source_ids }`.
  - `timeoutMs: effectiveTimeoutMs` được truyền riêng biệt qua options của transport layer.

### 3.3. Ma Trận Timeout Toàn Hệ Thống

| Thao tác | MCP Tool / JSON-RPC Method | Timeout Mặc Định | Cơ Chế Xác Định & Ghi Đè |
| :--- | :--- | :---: | :--- |
| **Handshake** | `initialize` | 30.000ms | Transport config `defaultTimeoutMs` -> 30.000ms |
| **Readiness** | `server_info` | 30.000ms | Client config `requestTimeoutMs` -> 30.000ms |
| **CRUD: Create** | `notebook_create` | 30.000ms | Client config `requestTimeoutMs` -> 30.000ms |
| **CRUD: Ingest** | `source_add` | 30.000ms | Client config `requestTimeoutMs` -> 30.000ms |
| **CRUD: Reconcile** | `notebook_get` | 30.000ms | Client config `requestTimeoutMs` -> 30.000ms |
| **CRUD: Delete** | `notebook_delete` | 30.000ms | Client config `requestTimeoutMs` -> 30.000ms |
| **Inference: Query** | `notebook_query` | **90.000ms** | `params.timeoutMs` -> `options.queryTimeoutMs` -> **90.000ms** |

---

## 4. Bằng Chứng Kiểm Thử & Xác Minh Chất Lượng (Quality Gates)

### 4.1. Unit Test Kết Hợp
1. **Route Endpoint Suite (`tests/unit/research-session-routes-direct-execution.test.ts`):**
   - `maps PROVIDER_TIMEOUT to HTTP 503 with error and code: PROVIDER_TIMEOUT` -> **PASS**
   - `does not regress other ProviderException error mappings` -> **PASS** (kiểm tra 400, 403, 503 không có code)
   - Tổng cộng: **8/8 tests PASS** (36ms).

2. **MCP Client Suite (`tests/unit/notebooklm-mcp-client.test.ts`):**
   - Test 36: Kiểm tra ma trận timeout (readiness 30s, CRUD 30s, query 90s) & bảo đảm không rò rỉ `timeoutMs` vào tool arguments -> **PASS**
   - Test 37: Kiểm tra cấu hình `queryTimeoutMs` trong constructor và override qua `params.timeoutMs` -> **PASS**
   - Test 38: Kiểm tra Stdio handshake `initialize` giữ nguyên timeout 30.000ms -> **PASS**
   - Test 39: Kiểm tra fallback an toàn khi truyền các giá trị timeout không hợp lệ (`0`, số âm, `NaN`) -> **PASS**
   - Tổng cộng: **28/28 tests PASS** (132ms).

3. **Alignment & Contract Suites:**
   - `tests/unit/notebooklm-client-contract.test.ts` -> **10/10 tests PASS**
   - `tests/unit/notebooklm-studio-direct-execution-ui.test.tsx` -> **5/5 tests PASS**
   - `tests/unit/notebooklm-studio-direct-execution-alignment.test.tsx` -> **5/5 tests PASS**
   - Tổng cộng: **20/20 tests PASS** across 3 files (1.58s).

4. **Diff Hygiene & Code Quality:**
   - `git diff --check` -> **PASS** (0 whitespace/conflict errors).
   - Scoped TypeScript check -> **0 lỗi trên toàn bộ các file thuộc phạm vi**.

---

## 5. Lịch Sử Commit & Push (Audit Trail)

- **Commit SHA:** `486c6178aea62f62cea055c8276c2f2b1ce7caf0`
- **Commit Message:**
  ```text
  fix(notebooklm): separate query timeout and expose provider timeout code
  ```
- **Files Modified in Commit:**
  - `src/server/routes/researchSessionRoutes.ts` (+7, -1)
  - `src/server/services/providers/notebooklmMcpClient.ts` (+35, -2)
  - `tests/unit/notebooklm-mcp-client.test.ts` (+241, -0)
  - `tests/unit/research-session-routes-direct-execution.test.ts` (+73, -2)
- **Push Action:**
  - Lệnh thực thi: `git push origin main`
  - Kết quả: `06eb74d..486c617  main -> main` (Exit code 0)
  - Remote target: `https://github.com/quochuynh8611-code/knowledge-os.git`
  - Đồng bộ trạng thái: `HEAD (main) == origin/main == 486c617`
- **Ranh giới an toàn:** Thư mục `docs/books/` được giữ nguyên trạng thái untracked, không bị đụng chạm hay stage vào git index.

---

> [!NOTE]
> **KẾT LUẬN TOÀN BỘ PHIÊN LÀM VIỆC:**
> Cả Fix 1 và Fix 2 đã được triển khai, kiểm thử đa tầng (Test-First, Regression Protection, Argument Purity, Blast Radius Management), commit và đẩy lên remote kho lưu trữ chính thức thành công. Hệ thống Direct NotebookLM MCP hiện tại vận hành hoàn chỉnh với độ tin cậy và tính ổn định cao.
