# Session Log — Mind Map AI Node Expansion Backend Proxy & Gemini 3.8 Flash Migration

## 1. Thông Tin Phiên Làm Việc (Session Metadata)
- **Đường dẫn dự án:** `/Users/mr.chem/Documents/Lap-trinh/Dashboard-update`
- **Chủ đề:** Chuyển đổi kiến trúc Mind Map AI Node Expansion sang Backend Express Proxy và Nâng cấp Gemini Model sang `gemini-3.8-flash`
- **Thời gian:** 2026-10-12 – 2026-10-13
- **Branch:** `main` (ahead `origin/main` 9 commits, local only)
- **Role:** Staff Software Engineer / Technical Architect
- **Trạng thái:** ✅ Hoàn tất 100% & Đã kiểm chứng (495/495 test files passed, 4.230 tests passed, TypeScript strict typecheck 0 errors, git diff --check sạch)

---

## 2. Bối Cảnh & Vấn Đề Kỹ Thuật (Root Causes)

1. **Client-Side Direct Gemini API Call & Rò Rỉ / Thiếu Key:**
   - Trong `src/lib/mindmapAiService.ts`, `createGeminiMindMapAiClient()` trước đây gọi trực tiếp URL Google Generative Language: `https://generativelanguage.googleapis.com/v1beta/models/...:generateContent`.
   - Client yêu cầu phải có `GEMINI_API_KEY` từ `process.env` hoặc `import.meta.env.VITE_GEMINI_API_KEY`.
   - Do Vite không tự động truyền biến môi trường từ backend `.env` ra client trừ khi có tiền tố `VITE_`, modal AI trên giao diện báo lỗi *"GEMINI_API_KEY chưa được cấu hình..."* dù backend thực tế đã nạp key thành công.
   - Ngoài ra, việc gọi trực tiếp từ client làm rò rỉ API key ra trình duyệt và thiếu cơ chế rate limit / audit logging tập trung.

2. **Lỗi Silent Mock Fallback (PA2 Context):**
   - Trước đó, `MindMapView.tsx` render `<MindMapAiExpansionModal />` nhưng không truyền prop `aiClient`, khiến modal âm thầm fallback sang mock data cố định thay vì gọi AI thật.

3. **Lỗi Runtime 404 NOT_FOUND Model Deprecation:**
   - Khi nối proxy backend ban đầu với `gemini-2.5-flash`, Google Gemini API trả về lỗi:
     `404 NOT_FOUND: "This model models/gemini-2.5-flash is no longer available to new users. Please update your code to use models/gemini-3.8-flash..."`.
   - Engine resilience `resilience.ts` phân loại lỗi 404 là `non-retryable` (fast-fail), dẫn đến lỗi hiển thị ngay trên UI của người dùng.

---

## 3. Kiến Trúc & Giải Pháp Thực Hiện (Architectural Changes)

### 3.1. Tầng Backend Express Proxy (`POST /api/gemini/mindmap-expand`)
- **Schema Validation (Zod):**
  - Khai báo `MindMapAiExpansionPresetEnum` và `MindMapAiExpansionInputSchema` trong `src/lib/validation.ts`.
  - Validate các trường: `targetNodeId`, `targetNodeTitle` (min 1), `rootTopicTitle` (min 1), `ancestorTitles`, `existingSiblingTitles`, `preset`, `customInstruction`, `language`, `maxCandidates`.
- **Route Handler:**
  - Mount endpoint `POST /gemini/mindmap-expand` trong `src/server/routes/geminiRoutes.ts` (được truy cập qua `/api/gemini/mindmap-expand` thông qua mount router trong `server.ts`).
  - Kiểm tra `getGenAI()`. Nếu server chưa có key, trả về HTTP 503 với JSON error rõ ràng.
  - Sử dụng resilience engine `generateContentWithResilience(ai, ...)` với `systemInstruction` và parse response linh hoạt (hỗ trợ cả JSON object lẫn fallback bullet points).
  - Không để lộ secret ra response; ghi nhận log qua `logStructuredEvent`.

### 3.2. Quản Lý Cấu Hình Gemini Model Tập Trung (`gemini-3.8-flash`)
- **Source of Truth:**
  - Bổ sung `DEFAULT_GEMINI_MODEL = "gemini-3.8-flash"` và helper `getGeminiModel()` trong `src/server/services/geminiService.ts`.
  - Hỗ trợ dynamic override qua biến môi trường `process.env.GEMINI_MODEL`.
- **Resilience Multi-Model Queue:**
  - Cập nhật `CANDIDATE_MODELS` trong `src/lib/resilience.ts` để bổ sung `"gemini-3.8-flash"`.
- **Loại bỏ hoàn toàn model cũ:**
  - Codebase được quét sạch 100% các tham chiếu tới `gemini-2.5-flash`.

### 3.3. Tầng Frontend Client (`src/lib/mindmapAiService.ts` & UI)
- **Tách Helper Prompt:**
  - Export `buildMindMapAiExpansionPrompt(context)` giúp server và client đồng nhất định dạng prompt và dễ dàng viết test độc lập.
- **Client Factory:**
  - `createGeminiMindMapAiClient()` chuyển sang gọi `fetch('/api/gemini/mindmap-expand')` (POST, JSON body).
  - Loại bỏ hoàn toàn kiểm tra bắt buộc `apiKey` ở frontend.
  - Xử lý status HTTP và mapping lỗi JSON từ server thành mã lỗi `API_ERROR` thân thiện trên modal.
  - Hỗ trợ cả payload proxy `{ candidates: [...], rawText: ... }` lẫn fallback parser `normalizeAiResponse(...)`.
- **Modal Guard & Wiring:**
  - `MindMapAiExpansionModal.tsx`: Kiểm tra prop `aiClient`, nếu thiếu sẽ hiển thị thông báo lỗi cấu hình thay vì âm thầm trả về dữ liệu mock.
  - `MindMapView.tsx`: Khởi tạo memoized `createGeminiMindMapAiClient()` và truyền trực tiếp vào `<MindMapAiExpansionModal aiClient={mindmapAiClient} ... />`.

---

## 4. Danh Sách Tập Tin Đã Thay Đổi (Files Modified)

| Tập tin | Phân loại | Mục đích thay đổi |
| :--- | :--- | :--- |
| `src/lib/validation.ts` | Source | Khai báo `MindMapAiExpansionInputSchema`, `MindMapAiExpansionPresetEnum` |
| `src/lib/mindmapAiService.ts` | Source | Export `buildMindMapAiExpansionPrompt`, chuyển client sang gọi proxy backend, bỏ phụ thuộc frontend key |
| `src/server/routes/geminiRoutes.ts` | Source | Thêm route `POST /gemini/mindmap-expand` sử dụng Zod schema và resilience engine |
| `src/server/services/geminiService.ts` | Source | Export `DEFAULT_GEMINI_MODEL = "gemini-3.8-flash"` và `getGeminiModel()` |
| `src/lib/resilience.ts` | Source | Thêm `"gemini-3.8-flash"` vào `CANDIDATE_MODELS` |
| `src/components/mindmap/MindMapAiExpansionModal.tsx` | Source | Chặn silent mock fallback, bắt buộc `aiClient` |
| `src/components/mindmap/MindMapView.tsx` | Source | Nối memoized `createGeminiMindMapAiClient()` sang modal |
| `tests/unit/gemini-routes.test.ts` | Test | Thêm 4 tests: validation 400, missing key 503, happy path 200, `gemini-3.8-flash` call & `GEMINI_MODEL` override |
| `tests/unit/mindmap-ai-service.test.ts` | Test | Thêm tests cho `buildMindMapAiExpansionPrompt`, default proxy endpoint, server error propagation |
| `tests/unit/mindmap-ai-expansion-ui.test.tsx` | Test | Tests cho modal guarding và live client wiring từ MindMapView |

---

## 5. Ma Trận Kiểm Thử & Xác Minh (Verification Matrix)

| Hạng mục kiểm thử | Lệnh thực thi | Kết quả | Ghi chú |
| :--- | :--- | :---: | :--- |
| **Mind Map & Gemini Routes** | `npm test -- tests/unit/gemini-routes.test.ts tests/unit/mindmap-ai-service.test.ts tests/unit/mindmap-ai-expansion-ui.test.tsx` | ✅ **46/46 PASS** | Bao gồm đầy đủ contract proxy, UI modal, và model assertion |
| **Production Resilience Hardening** | `npm test -- tests/unit/phase-4-production-hardening.test.ts` | ✅ **13/13 PASS** | Xác minh resilience engine và phân loại lỗi non-retryable |
| **TypeScript Typecheck** | `npm run typecheck` | ✅ **0 ERRORS** | `tsc --noEmit` hoàn thành sạch sẽ |
| **Toàn bộ Test Suite Repository** | `npm test` | ✅ **495/495 FILES PASS** | **4.230 tests passed**, 3 skipped, không có regression |
| **Whitespace & Formatting** | `git diff --check` | ✅ **CLEAN** | Không có trailing spaces hay whitespace conflict |
| **Deprecation Model Verification** | `grep "gemini-2.5-flash"` | ✅ **0 HITS** | Đã loại bỏ hoàn toàn model cũ khỏi toàn bộ repo |

---

## 6. Ghi Chú Quản Trị & Bước Tiếp Theo
- File untracked ngoài scope `docs/session-logs/2026-10-11-mindmap-m2-closure-and-personal-knowledge-os-upgrade-plan.md` được giữ nguyên vẹn không can thiệp.
- Các thay đổi hiện tại nằm trong working tree, sẵn sàng cho việc review và commit theo quy trình approval của người dùng.
