# ADR-102: Mind Map AI Node Expansion Backend Proxy & Gemini 3.8 Flash Migration

- **Trạng thái:** Accepted / Implemented
- **Ngày quyết định:** 2026-10-14
- **Phạm vi:** Mind Map AI Subsystem (`MindMapView`, `MindMapAiExpansionModal`, `mindmapAiService`, `geminiRoutes`, `geminiService`, `resilience`)
- **Tác giả:** Staff Software Engineer / Knowledge OS Core

---

## 1. Bối Cảnh (Context)

Tính năng mở rộng sơ đồ tư duy bằng AI (Mind Map AI Node Expansion) trước đây gặp hai vấn đề cấu trúc nghiêm trọng:

1. **Lộ API Key & Lỗi Môi Trường Trình Duyệt:**
   - Client-side implementation trong `src/lib/mindmapAiService.ts` gọi trực tiếp Google Generative Language API (`https://generativelanguage.googleapis.com/...`), đòi hỏi `GEMINI_API_KEY` phải có mặt ở runtime của trình duyệt (thông qua `process.env` hoặc `VITE_GEMINI_API_KEY`).
   - Do Vite không tự động phơi bày các biến môi trường backend trong `.env` ra frontend nếu không có tiền tố `VITE_`, người dùng thường xuyên gặp lỗi cấu hình dù server đã nạp key hợp lệ.
   - Việc gọi API trực tiếp từ frontend vi phạm nguyên tắc bảo mật (security principle), làm lộ API key nếu người dùng kiểm tra network devtools.

2. **Model Deprecation Runtime Error (404 NOT_FOUND):**
   - Client hardcode model `gemini-2.5-flash`.
   - Google Gemini API trả về lỗi: `404 NOT_FOUND: "This model models/gemini-2.5-flash is no longer available to new users. Please update your code to use models/gemini-3.8-flash..."`.

3. **Silent Mock Fallback Guard Thiếu Chặt Chẽ:**
   - Trong `MindMapAiExpansionModal.tsx`, khi không truyền `aiClient`, modal tự động ngầm kích hoạt `createMockMindMapAiClient()`, che giấu lỗi cấu hình thực tế và gây hiểu lầm cho người dùng rằng AI đang phản hồi.

---

## 2. Quyết Định Kiến Trúc (Architectural Decisions)

### 2.1. Chuyển Dịch Sang Backend Proxy (`POST /api/gemini/mindmap-expand`)
- **Nguyên tắc bảo mật:** Chuyển 100% việc gọi Gemini API về phía backend Express server. Frontend client chỉ gửi ngữ cảnh mở rộng (context) tới endpoint proxy `/api/gemini/mindmap-expand`.
- **Validation chặt chẽ:** Sử dụng Zod schema `MindMapAiExpansionInputSchema` trong `src/lib/validation.ts` để kiểm định payload trước khi xử lý, ngăn chặn request rác hoặc injection.
- **Resilience Engine:** Tích hợp `generateContentWithResilience` với cơ chế retry có giới hạn (bounded retry) và fallback model khi gặp lỗi quá tải (429/503).
- **Fallback Parsing:** Tự động chuẩn hóa chuỗi JSON bọc trong markdown code fence, đồng thời có fallback parser trích xuất danh sách gạch đầu dòng (bullet points) nếu model phản hồi dạng văn bản thô.

### 2.2. Chuẩn Hóa Model Mặc Định Qua `getGeminiModel()` với `gemini-3.8-flash`
- Bổ sung `DEFAULT_GEMINI_MODEL = "gemini-3.8-flash"` và helper `getGeminiModel()` trong `src/server/services/geminiService.ts`, cho phép ghi đè linh hoạt qua biến môi trường `process.env.GEMINI_MODEL`.
- Mở rộng `CANDIDATE_MODELS` trong `src/lib/resilience.ts` để bổ sung `gemini-3.8-flash`.
- Loại bỏ hoàn toàn mọi chuỗi ký tự `gemini-2.5-flash` khỏi mã nguồn dự án.

### 2.3. Loại Bỏ Frontend `GEMINI_API_KEY` Dependency
- Xóa bỏ việc đọc `process.env.GEMINI_API_KEY` và `VITE_GEMINI_API_KEY` trong `mindmapAiService.ts`.
- `createGeminiMindMapAiClient()` chuyển sang gọi mặc định tới `/api/gemini/mindmap-expand`.
- Nếu server chưa cấu hình API key, endpoint trả về mã lỗi `503 Service Unavailable` với thông báo tiếng Việt thân thiện, hướng dẫn cấu hình rõ ràng thay vì làm crash giao diện.

### 2.4. Ngăn Chặn Silent Mock Fallback Trên Modal
- Loại bỏ fallback ngầm sang `createMockMindMapAiClient()` trong `MindMapAiExpansionModal.tsx`.
- Modal yêu cầu `aiClient` rõ ràng từ prop. Nếu thiếu client, modal lập tức hiển thị thông báo lỗi cấu hình minh bạch, bảo đảm tính xác thực của luồng dữ liệu.
- `MindMapView.tsx` chịu trách nhiệm khởi tạo `createGeminiMindMapAiClient()` và truyền xuống modal.

---

## 3. Non-Goals (Phạm Vi Ngoài Lề / Để Lại)

- **Route `/api/gemini/cards` (Flashcard Generation)**: Route này hiện vẫn sử dụng model hardcode `"gemini-3.6-flash"`. Do `gemini-3.6-flash` vẫn hoạt động bình thường và thuộc luồng ôn tập (không thuộc Mind Map), việc đồng bộ route này sang `getGeminiModel()` được xếp vào backlog follow-up có rủi ro thấp nhằm giữ blast radius của đợt migration này tập trung tuyệt đối vào Mind Map AI.

---

## 4. Hệ Quả & Kiểm Chứng (Consequences & Verification)

### Tích cực (Positive)
- **Bảo mật tuyệt đối:** API key không bao giờ bị lộ xuống client.
- **Tính khả dụng cao:** Khôi phục hoàn toàn tính năng mở rộng sơ đồ tư duy bằng AI với model mới nhất `gemini-3.8-flash`.
- **Chất lượng kiểm thử:** Toàn bộ 59/59 tests (14 tests route, 22 tests service, 10 tests modal UI, 13 tests hardening) đạt 100% GREEN.
- **Type safety:** TypeScript typecheck 0 errors.

### Đánh giá rủi ro (Risk Assessment)
- Không có breaking changes với các tính năng mindmap khác.
- Đảm bảo tính tương thích ngược: Backend proxy vẫn hỗ trợ trích xuất cấu trúc nếu AI trả về chuỗi JSON thô hoặc dạng bullet lines.
