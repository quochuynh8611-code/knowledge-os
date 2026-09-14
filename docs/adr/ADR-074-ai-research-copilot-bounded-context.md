# ADR-074: AI Research Copilot Bounded Context & Source Registry Architecture

## Status
**Accepted / Implemented** (Phase 2A)

## Context & Problem Statement
Trong Knowledge OS, việc tích hợp AI để hỗ trợ nghiên cứu kiến thức đa lĩnh vực (Phật học, Đông y, v.v.) trước đây phụ thuộc vào giao tiếp một chiều qua Google Gemini API mà không có ranh giới ngữ cảnh rõ ràng. Khi người dùng muốn khảo cứu sâu một chủ đề, hệ thống gặp phải các vấn đề:
1. **Unbounded Context / Hallucination**: AI có xu hướng tổng hợp từ tri thức chung ngoài internet mà không bám sát ghi chú, trích dẫn và tài nguyên đã có trong hệ thống kiến thức cá nhân.
2. **Thiếu khả năng kiểm soát phạm vi nguồn (Source Scope)**: Người dùng không thể linh hoạt chọn lọc xem AI nên sử dụng ghi chú trong Topic hiện tại, tài nguyên liên kết hay mở rộng sang các nguồn cục bộ.
3. **Mất dấu nguồn gốc (Provenance & Citations)**: Kết quả sinh ra từ AI không có cấu trúc trích dẫn tham chiếu cụ thể (Grounding & Source Attribution), khiến người dùng khó kiểm chứng độ chính xác học thuật.
4. **Bảo mật & Rò rỉ thông tin cá nhân**: Cần đảm bảo dữ liệu gửi lên AI Model không chứa các đường dẫn tệp tuyệt đối trên hệ thống tệp cục bộ (`/Users/...`).

## Decision Drivers
- **Bounded Context**: Giới hạn ngữ cảnh nghiên cứu chặt chẽ vào các nguồn dữ liệu đã được người dùng phê duyệt trong kho lưu trữ nội bộ.
- **Pure Source Registry Adapter**: Tách biệt logic tổng hợp và định dạng ngữ cảnh thành một bộ chuyển đổi thuần túy (pure functional module) để dễ dàng kiểm thử và tái sử dụng.
- **Structured Provenance**: Kết quả trả về từ AI phải có cấu trúc phân tách rõ ràng: câu trả lời tổng hợp (Markdown), danh sách trích dẫn (Citations) và các điểm chưa chắc chắn (Uncertainties).
- **Backward Compatibility**: Endpoint `/api/gemini/research` phải tương thích ngược hoàn toàn với các client và payload cũ.

## Decision Details

### 1. Kiến trúc Bounded Context & Pure Adapter
Chúng tôi triển khai `src/server/services/sourceRegistryAdapter.ts` dưới dạng pure functions:
- Nhận cấu hình `SourceScopeOptions` gồm: `topicNotes`, `topicResources`, `obsidianVault`, `externalWeb` (mặc định luôn `false`).
- Tổng hợp và định dạng các đoạn văn bản thành cấu trúc ngữ cảnh chuẩn mực:
  - Header rõ ràng cho từng nguồn: `[Nguồn Ghi Chú: <title>]`, `[Tài Nguyên: <title>]`, `[Tài Liệu Obsidian: <relativePath>]`.
  - Giới hạn số lượng ký tự và số lượng file tối đa để tránh tràn Context Window của mô hình.
  - Loại bỏ hoàn toàn đường dẫn tệp tuyệt đối khỏi ngữ cảnh gửi cho AI.

### 2. Định nghĩa DTO & Validation Schema
Trong `src/lib/validation.ts`, bổ sung schema `GeminiResearchRequestSchema` và `GeminiResearchResponseSchema`:
- `topicId`: ID chủ đề bắt buộc.
- `prompt`: Câu hỏi nghiên cứu của người dùng.
- `researchDepth`: Mức độ phân tích (`brief` | `deep` | `synthesis`).
- `outputFormat`: Định dạng xuất (`markdown_notes` | `flashcard_qa` | `concept_map`).
- `sourceScope`: Bộ cờ boolean kiểm soát các nguồn được phép đưa vào context.
- `obsidianSources`: Danh sách tài liệu Obsidian được chọn (tối đa 3 file).

### 3. Topic-Scoped Research Persistence
Trong `src/lib/aiResearchStorage.ts`, dữ liệu bản nháp nghiên cứu và lịch sử phản hồi được lưu trữ trong LocalStorage theo từng chủ đề độc lập (`topicId`), sử dụng versioned key `knowledge_os_ai_research_draft_v2:<topicId>`.

## Architectural Consequences & Trade-offs

### Positive
- **Độ tin cậy cao**: Phản hồi của AI bám sát dữ liệu thực tế trong Knowledge OS, giảm thiểu hiện tượng ảo giác (hallucination).
- **Trải nghiệm kiểm chứng tốt**: Người dùng có thể đối chiếu câu trả lời với các trích dẫn tài liệu cụ thể được liệt kê bên dưới.
- **An toàn bảo mật**: Tuyệt đối không rò rỉ absolute path hay thông tin hệ thống ra bên ngoài.
- **Lưu trữ độc lập**: Bản nháp và kết quả khảo cứu của từng chủ đề không bị ghi đè hoặc xung đột lẫn nhau.

### Negative & Mitigations
- **Giới hạn số lượng nguồn**: Giới hạn tối đa 3 tài liệu Obsidian và độ dài ngữ cảnh để đảm bảo latency và chi phí token.
  - *Mitigation*: Cung cấp cơ chế chọn lọc tài liệu chính xác qua modal tìm kiếm có scoped index.
