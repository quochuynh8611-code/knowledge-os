# Kế Hoạch Đặc Tả Kỹ Thuật: Phase 12 — Global Academic Command Palette & Workflow Router

**Mục tiêu:** Xây dựng Động cơ Điều phối Luồng Công việc Học thuật và Tìm kiếm Đa Thực thể Toàn cục qua phím tắt `⌘K` / `Ctrl+K`.

---

## 1. Cấu Trúc File & Module
- **Engine Core:** `src/lib/academicCommandPaletteEngine.ts`
- **Unit Test Suite (Engine):** `tests/unit/academic-command-palette-engine.test.ts`
- **Hook & UI Integration (Phase 12B):** `src/hooks/useCommandPalette.ts`, `src/components/search/CommandPalette.tsx`, `src/App.tsx`

---

## 2. Mô Hình Dữ Liệu & Giao Diện TypeScript

```typescript
export type AcademicCommandMode = 'general' | 'citekey' | 'doi' | 'command' | 'semantic';

export interface ParsedAcademicQuery {
  rawQuery: string;
  mode: AcademicCommandMode;
  cleanQuery: string;
  extractedDoi?: string;
}

export interface AcademicPaletteResultItem extends CommandPaletteItem {
  badge?: string;
  entityType?: 'command' | 'topic' | 'note' | 'resource' | 'flashcard' | 'excerpt' | 'doi-action';
  entityId?: string;
  citekey?: string;
  score?: number;
}

export interface ScholarlyWorkflowCallbacks {
  onNavigateTab?: (tab: string) => void;
  onOpenTopic?: (topicId: string) => void;
  onOpenNote?: (noteId: string) => void;
  onSelectResource?: (resource: Resource) => void;
  onCopyCitekey?: (citekey: string) => void;
  onLookupDoi?: (doi: string) => void;
  onOpenLiteratureMatrix?: () => void;
  onOpenManuscriptStudio?: () => void;
  onOpenObsidianBridge?: () => void;
  onTriggerQuickBackup?: () => void;
  onOpenFlashcardReview?: () => void;
}
```

---

## 3. Các Hàm Cốt Lõi Cần Cài Đặt

### 1. `parseAcademicCommandQuery(query: string): ParsedAcademicQuery`
- Kiểm tra chuỗi rỗng / khoảng trắng.
- Kiểm tra tiền tố `@`: `mode: 'citekey'`. `cleanQuery = query.slice(1).trim()`.
- Kiểm tra tiền tố `doi:` hoặc regex `\b(10\.\d{4,9}/[-._;()/:A-Za-z0-9]+)\b`: `mode: 'doi'`. `extractedDoi = normalizeDoi(query)`.
- Kiểm tra tiền tố `>`: `mode: 'command'`. `cleanQuery = query.slice(1).trim()`.
- Kiểm tra tiền tố `?`: `mode: 'semantic'`. `cleanQuery = query.slice(1).trim()`.
- Mặc định: `mode: 'general'`.

### 2. `buildScholarlyWorkflowActions(callbacks: ScholarlyWorkflowCallbacks): AcademicPaletteResultItem[]`
- Danh sách lệnh thao tác hành động nhanh với icon, từ khóa và mô tả chi tiết:
  - `act-literature-matrix`
  - `act-manuscript-studio`
  - `act-graph-insights`
  - `act-obsidian-eink-bridge`
  - `act-guarded-backup-snapshot`
  - `act-fsrs-review-studio`
  - `act-ai-grounded-rag`
  - và các lệnh điều hướng tab chính.

### 3. `searchAcademicCommandPalette(...)`
- Xử lý các chế độ tìm kiếm:
  - **`'citekey'`:** Dùng `buildCitekeyRegistry` và `searchCitekeySuggestions`. Trả về các mục có `badge: '@' + citekey`, hành động gọi `onSelectResource` hoặc `onCopyCitekey`.
  - **`'doi'`:** Nếu có `extractedDoi`, tạo action item ưu tiên cao nhất `act-doi-lookup-${extractedDoi}` với tiêu đề "Tra cứu & Nạp Siêu Dữ Liệu DOI: ${extractedDoi}", gắn badge `DOI: ${extractedDoi}`. Nếu tài liệu đã có trong kho, hiển thị thêm action mở tài liệu đó.
  - **`'command'`:** Lọc danh sách `workflowActions` theo `cleanQuery`.
  - **`'semantic'`:** Sử dụng `buildSearchableKnowledgeDocuments` và `HybridKnowledgeSearchEngine.search(cleanQuery, { mode: 'semantic' })`. Trả về danh sách thực thể kèm badge `RRF ${score}%`.
  - **`'general'`:** Kết hợp so khớp từ khóa trên workflow actions và các thực thể Topics, Notes, Resources (với `@citekey`), Flashcards, Excerpts, sắp xếp theo độ phù hợp.
  - Khi query rỗng: Trả về danh sách workflow actions mặc định.

---

## 4. Kịch Bản Kiểm Thử Bắt Buộc (Test Plan)
1. **Prefix Query Intent Detection:** Đảm bảo 5 chế độ phân loại chính xác tuyệt đối.
2. **Citekey Mode (`@key`) Lookup:** Tìm theo mã citekey, tác giả, năm và kiểm tra callback thực thi.
3. **Direct DOI Detection & Action Synthesis:** Nhận diện chuỗi DOI thô, sinh action nạp siêu dữ liệu.
4. **Command Prefix (`>`) Filtering:** Chỉ hiển thị action phòng thu, không lẫn ghi chú/chủ đề.
5. **Semantic Mode (`?`) Retrieval:** Gọi dynamic hybrid semantic search dựa trên vector 128 chiều.
6. **General Multi-Entity Omnibox Search:** Tìm kiếm từ khóa hỗn hợp qua nhiều loại thực thể.
7. **One-Click Guarded Snapshot Action:** Kích hoạt sao lưu snapshot an toàn từ palette.
8. **Empty & Whitespace Query Safety:** Trả về danh mục mặc định an toàn, không ném ngoại lệ.
