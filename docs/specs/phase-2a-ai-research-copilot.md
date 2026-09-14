# Phase 2A Technical Specification: AI Research Copilot & Bounded Context

- **Status:** Implemented / Verified
- **Feature Code:** Phase 2A
- **Associated ADR:** [`ADR-074`](../adr/ADR-074-ai-research-copilot-bounded-context.md)
- **Associated Feature File:** [`ai-research-copilot.feature`](../gherkin/ai-research-copilot.feature)

---

## 1. Mục Tiêu & Phạm Vi

Đặc tả này quy định các giao diện, cấu trúc dữ liệu, cơ chế validation và tương tác người dùng của phân hệ **AI Research Copilot** trong Knowledge OS.

### Các Nguyên Tắc Bất Biến Cốt Lõi (Invariants)
1. **Bounded Knowledge Context**: Mọi khảo cứu của AI đều phải được bám sát trên các nguồn dữ liệu có sẵn trong Knowledge OS (ghi chú chủ đề, tài nguyên liên kết, tài liệu Obsidian đã chọn).
2. **Không Rò Rỉ Tuyệt Đối Đường Dẫn**: Toàn bộ đường dẫn tệp hệ thống (`/Users/...`) phải được lọc bỏ khỏi prompt, API payload và giao diện người dùng.
3. **Structured Attribution & Citations**: Kết quả trả về phải chứa các trích dẫn rõ ràng (title, snippet, relative path) để người dùng có thể đối chiếu.
4. **Không Tạo Ảo Giác Trích Dẫn (No Hallucinated Citations)**: Trường hợp phản hồi thô không chứa cấu trúc trích dẫn hợp lệ, hệ thống fallback về markdown thuần mà không tự sinh trích dẫn giả.

---

## 2. Data Transfer Objects (DTO) & Validation Schema

### 2.1. Request DTO (`GeminiResearchRequest`)

```typescript
export interface GeminiResearchRequest {
  topicId: string;
  prompt: string;
  researchDepth?: "brief" | "deep" | "synthesis";
  outputFormat?: "markdown_notes" | "flashcard_qa" | "concept_map";
  sourceScope?: {
    topicNotes?: boolean;
    topicResources?: boolean;
    obsidianVault?: boolean;
    externalWeb?: boolean; // Must be false (rejected with 400 if true)
  };
  obsidianSources?: {
    vaultProfileId: string;
    selectedRelativePaths: string[]; // Max 3 items
  };
}
```

### 2.2. Response DTO (`GeminiResearchResponse`)

```typescript
export interface GeminiResearchCitation {
  id: string;
  sourceType: "topic_note" | "topic_resource" | "obsidian_note";
  title: string;
  sourcePath?: string;
  snippet?: string;
}

export interface GeminiResearchResponse {
  answer: string;
  citations: GeminiResearchCitation[];
  uncertainties?: string[];
  obsidianSourceSummary?: {
    resolvedCount: number;
    missingCount: number;
    vaultId: string;
  };
}
```

---

## 3. UI Component: `AIResearchStudio.tsx`

### 3.1. Giao Diện Điều Khiển Nguồn Dữ Liệu (Source Scope Controls)
- Checkbox `Ghi chú trong chủ đề` (Topic Notes)
- Checkbox `Tài nguyên liên kết` (Topic Resources)
- Checkbox `Obsidian Vault` kèm bộ đếm `(x/3)` và nút `Chọn tài liệu...`
- Checkbox `Nghiên cứu Internet bên ngoài` (Vô hiệu hóa, có tooltip giải thích)

### 3.2. Mức Độ Nghiên Cứu (Research Depth)
- `brief`: Tóm tắt nhanh gọn, tập trung định nghĩa cốt lõi.
- `deep`: Phân tích chuyên sâu, so sánh đối chiếu và liên hệ thực chứng.
- `synthesis`: Tổng hợp hệ thống hóa tri thức toàn diện.

### 3.3. Định Dạng Kết Quả (Output Formats)
- `markdown_notes`: Ghi chú học thuật có cấu trúc phân mục.
- `flashcard_qa`: Bộ câu hỏi ôn tập Active Recall / Flashcard.
- `concept_map`: Sơ đồ khái niệm dạng Mermaid / Textual Topology.

---

## 4. Cơ Chế Lưu Trữ Bản Nháp & Trạng Thái (Persistence)

1. **Storage Key**: `knowledge_os_ai_research_draft_v2:<topicId>`
2. **Payload Lưu Trữ**:
   - `prompt`: Nội dung câu hỏi đang soạn thảo.
   - `researchDepth`: Lựa chọn độ sâu nghiên cứu.
   - `outputFormat`: Lựa chọn định dạng xuất.
   - `sourceScope`: Cấu hình phạm vi nguồn.
   - `selectedObsidianVaultId`: Vault Obsidian đang liên kết.
   - `selectedObsidianPaths`: Danh sách các tệp relative path đã chọn (tối đa 3).
   - `lastResponse`: Phản hồi nghiên cứu gần nhất.
